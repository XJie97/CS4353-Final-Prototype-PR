begin;
set local search_path=public,extensions;

-- Preserve the existing tables and evidence. New commands own all transitions.
drop trigger record_lending_verification on storage.objects;
drop function public.start_loan(uuid,uuid,date,date);
drop function public.submit_loan_review(uuid,text,text[],text);
drop view public.item_catalog;
drop view public.loan_catalog;
alter table public.loans drop constraint loans_milestone_sequence;
alter table public.loans drop constraint loans_no_overlapping_dates;
drop index public.loans_one_physical_custody;

create table public.lockers(id integer primary key, name text not null unique);
insert into public.lockers select n,'location'||n from generate_series(1,10) n;
create table public.item_lockers(
 item_id uuid references public.items(id) on delete cascade,
 locker_id integer references public.lockers(id), primary key(item_id,locker_id));
alter table public.items add column category_tags text[] not null default '{}';
create index items_category_tags on public.items using gin(category_tags);
create table private.prototype_config(key text primary key, value jsonb not null);
insert into private.prototype_config values ('return_checklist','{"version":1,"items":[{"id":"item","label":"Correct item inspected"},{"id":"parts","label":"Included parts inspected"},{"id":"condition","label":"Item condition inspected"}]}');
alter table public.loans add column locker_id integer references public.lockers(id),
 add column approved_at timestamptz,
 add column cancelled_at timestamptz,
 add column revision integer not null default 1,
 add column return_checklist jsonb,
 add column return_answers text[] not null default '{}';
-- Existing loans retain their approved behaviour, with no invented locker mapping.
update public.loans set approved_at=created_at,
 return_checklist=(select value from private.prototype_config where key='return_checklist');
alter table public.loans alter column return_checklist set not null;
alter table public.loans add constraint loans_date_reservations exclude using gist
 (item_id with =,date_range with &&) where(cancelled_at is null);
alter table public.loans add constraint loans_scan_sequence check(
 (borrower_pickup_at is null or owner_dropoff_at is not null) and
 (borrower_dropoff_at is null or borrower_pickup_at is not null) and
 (returned_at is null or borrower_dropoff_at is not null));

create table private.handoff_challenges(
 id uuid primary key default gen_random_uuid(),loan_id uuid not null references public.loans(id),
 step text not null,revision integer not null,actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),consumed_at timestamptz);

alter table private.prototype_config enable row level security;
alter table private.handoff_challenges enable row level security;
revoke all on private.prototype_config,private.handoff_challenges from public,anon,authenticated;

create function private.is_friend(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.friendships f where status='accepted' and
 ((requester_id=a and recipient_id=b) or(requester_id=b and recipient_id=a)));
$$;
create function private.loan_owner(target uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select i.owner_id from public.loans l join public.items i on i.id=l.item_id where l.id=target;
$$;
create function private.pending_photo(l public.loans) returns text
language sql immutable set search_path='' as $$
 select case when l.owner_dropoff_at is not null and l.owner_dropoff_image is null then 'owner_dropoff'
 when l.borrower_pickup_at is not null and l.borrower_pickup_image is null then 'borrower_pickup'
 when l.borrower_dropoff_at is not null and l.borrower_dropoff_image is null then 'borrower_dropoff'
 when l.returned_at is not null and l.owner_pickup_image is null then 'owner_pickup' end;
$$;
create function private.next_scan(l public.loans) returns text
language sql immutable set search_path='' as $$
 select case when l.cancelled_at is not null or l.approved_at is null or private.pending_photo(l) is not null then null
 when l.owner_dropoff_at is null then 'owner_dropoff'
 when l.borrower_pickup_at is null then 'borrower_pickup'
 when l.borrower_dropoff_at is null then 'borrower_dropoff'
 when l.returned_at is null then 'owner_pickup' end;
$$;
create function private.step_actor(l public.loans,step text) returns uuid
language sql stable security definer set search_path='' as $$
 select case when step in('owner_dropoff','owner_pickup') then private.loan_owner(l.id)
 when step in('borrower_pickup','borrower_dropoff') then l.borrower_id end;
$$;

create function public.create_item(item_name text,description_text text, tags text[],locker_ids integer[])
returns public.items language plpgsql security definer set search_path='' as $$
declare result public.items; begin
 if auth.uid() is null then raise exception 'FORBIDDEN: Sign in first'; end if;
 if cardinality(locker_ids) is null or cardinality(locker_ids)=0 then raise exception 'VALIDATION: Choose at least one locker'; end if;
 insert into public.items(owner_id,name,description,category_tags)
 values(auth.uid(),btrim(item_name),coalesce(description_text,''),array(select distinct lower(btrim(t)) from unnest(tags)t where btrim(t)<>'')) returning * into result;
 insert into public.item_lockers select result.id,x from (select distinct unnest(locker_ids) x) q;
 return result;
end $$;
create function public.set_item_lockers(target uuid,locker_ids integer[]) returns void
language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.items where id=target and owner_id=auth.uid() for update;
 if not found then raise exception 'FORBIDDEN: Only the owner can edit lockers'; end if;
 if coalesce(cardinality(locker_ids),0)=0 then raise exception 'VALIDATION: Choose at least one locker'; end if;
 if exists(select 1 from public.loans where item_id=target and cancelled_at is null and returned_at is null and not locker_id=any(locker_ids)) then
 raise exception 'INVALID_TRANSITION: A current reservation still uses a removed locker'; end if;
 delete from public.item_lockers where item_id=target;
 insert into public.item_lockers select target,x from(select distinct unnest(locker_ids)x)q;
end $$;

create function public.create_loan(target_item uuid,start_date date,end_date date,selected_locker integer)
returns public.loans language plpgsql security definer set search_path='' as $$
declare owner uuid; result public.loans; begin
 select owner_id into owner from public.items where id=target_item for update;
 if auth.uid() is null or owner is null or owner=auth.uid() or not private.is_friend(owner,auth.uid()) then
 raise exception 'FORBIDDEN: Request an accepted friend''s item'; end if;
 if start_date is null or end_date is null or end_date<start_date or not isfinite(start_date) or not isfinite(end_date) then raise exception 'VALIDATION: Invalid dates'; end if;
 if not exists(select 1 from public.item_lockers where item_id=target_item and locker_id=selected_locker) then raise exception 'VALIDATION: Choose an allowed locker'; end if;
 insert into public.loans(item_id,borrower_id,starts_on,due_on,locker_id,return_checklist)
 values(target_item,auth.uid(),start_date,end_date,selected_locker,(select value from private.prototype_config where key='return_checklist')) returning * into result;
 return result;
end $$;
create function public.modify_loan(target uuid,start_date date,end_date date,selected_locker integer,expected_revision integer)
returns public.loans language plpgsql security definer set search_path='' as $$
declare l public.loans; begin
 select * into l from public.loans where id=target for update;
 if auth.uid() is null or l.borrower_id is distinct from auth.uid() then raise exception 'FORBIDDEN: Only the borrower can modify this plan'; end if;
 if l.revision is distinct from expected_revision then raise exception 'STALE_PLAN: Refresh the loan'; end if;
 if l.cancelled_at is not null or l.borrower_pickup_at is not null then raise exception 'INVALID_TRANSITION: This loan cannot be edited'; end if;
 if start_date is null or end_date is null or end_date<start_date or not isfinite(start_date) or not isfinite(end_date) then raise exception 'VALIDATION: Invalid dates'; end if;
 if not exists(select 1 from public.item_lockers where item_id=l.item_id and locker_id=selected_locker) then raise exception 'VALIDATION: Choose an allowed locker'; end if;
 update public.loans set starts_on=start_date,due_on=end_date,locker_id=selected_locker,
 approved_at=null,revision=revision+1 where id=target returning * into l;
 return l;
end $$;
create function public.approve_loan(target uuid,expected_revision integer) returns public.loans
language plpgsql security definer set search_path='' as $$
declare l public.loans; begin
 select * into l from public.loans where id=target for update;
 if auth.uid() is null or private.loan_owner(target) is distinct from auth.uid() then raise exception 'FORBIDDEN: Only the owner can approve'; end if;
 if l.revision is distinct from expected_revision then raise exception 'STALE_PLAN: Refresh the loan'; end if;
 if l.cancelled_at is not null or l.borrower_pickup_at is not null then raise exception 'INVALID_TRANSITION: Cannot approve'; end if;
 if l.locker_id is null then raise exception 'LOCKER_REQUIRED: Legacy loan needs a locker assignment'; end if;
 if not private.is_friend(auth.uid(),l.borrower_id) then raise exception 'FORBIDDEN: Borrower is no longer a friend'; end if;
 update public.loans set approved_at=coalesce(approved_at,clock_timestamp()) where id=target returning * into l;
 return l;
end $$;
create function public.cancel_loan(target uuid,expected_revision integer) returns public.loans
language plpgsql security definer set search_path='' as $$
declare l public.loans; begin
 select * into l from public.loans where id=target for update;
 if l.id is null or auth.uid() is null or auth.uid() not in(l.borrower_id,private.loan_owner(target)) then raise exception 'FORBIDDEN: Not a participant'; end if;
 if l.revision is distinct from expected_revision then raise exception 'STALE_PLAN: Refresh the loan'; end if;
 if l.borrower_pickup_at is not null then raise exception 'INVALID_TRANSITION: Cannot cancel after pickup'; end if;
 update public.loans set cancelled_at=coalesce(cancelled_at,clock_timestamp()),revision=revision+1 where id=target returning * into l;
 return l;
end $$;

create function public.get_handoff_qr(target uuid,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.loans; step text; token uuid; begin
 select * into l from public.loans where id=target for update;
 if l.id is null or auth.uid() is null then raise exception 'FORBIDDEN: Loan not found'; end if;
 if l.revision is distinct from expected_revision then raise exception 'STALE_PLAN: Refresh the loan'; end if;
 if l.locker_id is null then raise exception 'LOCKER_REQUIRED: No locker assigned'; end if;
 step:=private.next_scan(l);
 if step is null then raise exception 'INVALID_TRANSITION: Approval or a photo is pending, or the loan is complete'; end if;
 if private.step_actor(l,step) is distinct from auth.uid() then raise exception 'FORBIDDEN: It is the other participant''s turn'; end if;
 insert into private.handoff_challenges(loan_id,step,revision,actor_id) values(target,step,l.revision,auth.uid()) returning id into token;
 return jsonb_build_object('id',token,'loanId',target,'step',step,'lockerId',l.locker_id,'payload','cs4353-demo:'||token);
end $$;
create function public.simulate_locker_scan(challenge uuid) returns public.loans
language plpgsql security definer set search_path='' as $$
declare c private.handoff_challenges; l public.loans; asset uuid; begin
 select * into c from private.handoff_challenges where id=challenge;
 if c.id is null or auth.uid() is null or c.actor_id is distinct from auth.uid() then raise exception 'FORBIDDEN: Invalid scan challenge'; end if;
 select item_id into asset from public.loans where id=c.loan_id;
 perform 1 from public.items where id=asset for update;
 select * into l from public.loans where id=c.loan_id for update;
 select * into c from private.handoff_challenges where id=challenge for update;
 if l.revision is distinct from c.revision or l.cancelled_at is not null then raise exception 'STALE_PLAN: Scan was invalidated'; end if;
 if c.consumed_at is not null then return l; end if;
 if private.next_scan(l) is distinct from c.step then raise exception 'INVALID_TRANSITION: Wrong step or a photo is pending'; end if;
 if c.step='owner_dropoff' and exists(select 1 from public.loans other where other.item_id=asset and other.id<>l.id and other.cancelled_at is null and other.owner_dropoff_at is not null and (other.returned_at is null or other.owner_pickup_image is null)) then
 raise exception 'ITEM_BUSY: Finish the previous handoff and photo first'; end if;
 update public.loans set
 owner_dropoff_at=case when c.step='owner_dropoff' then clock_timestamp() else owner_dropoff_at end,
 borrower_pickup_at=case when c.step='borrower_pickup' then clock_timestamp() else borrower_pickup_at end,
 borrower_dropoff_at=case when c.step='borrower_dropoff' then clock_timestamp() else borrower_dropoff_at end,
 returned_at=case when c.step='owner_pickup' then clock_timestamp() else returned_at end
 where id=l.id returning * into l;
 update private.handoff_challenges set consumed_at=clock_timestamp() where id=challenge;
 return l;
end $$;
create or replace function private.can_upload_verification(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.loans l where l.id::text=split_part(object_name,'/',1)
 and l.cancelled_at is null and cardinality(string_to_array(object_name,'/'))=3
 and split_part(object_name,'/',3)<>'' and private.pending_photo(l)=split_part(object_name,'/',2)
 and private.step_actor(l,split_part(object_name,'/',2))=auth.uid());
$$;
create function public.record_handoff_photo(target uuid,step text,image_path text,answers text[] default '{}')
returns public.loans language plpgsql security definer set search_path='' as $$
declare l public.loans; previous text; required_answers text[]; begin
 select * into l from public.loans where id=target for update;
 if l.id is null or auth.uid() is null or private.step_actor(l,step) is distinct from auth.uid() then raise exception 'FORBIDDEN: Wrong photo participant'; end if;
 previous:=case step when 'owner_dropoff' then l.owner_dropoff_image when 'borrower_pickup' then l.borrower_pickup_image when 'borrower_dropoff' then l.borrower_dropoff_image when 'owner_pickup' then l.owner_pickup_image end;
 if previous=image_path then return l; end if;
 if l.cancelled_at is not null or private.pending_photo(l) is distinct from step then raise exception 'INVALID_TRANSITION: No matching pending scan'; end if;
 if not exists(select 1 from storage.objects where bucket_id='loan-verification' and name=image_path and owner_id=auth.uid()::text and split_part(name,'/',1)=target::text and split_part(name,'/',2)=step) then raise exception 'VALIDATION: Upload this step''s image first'; end if;
 if step='owner_pickup' then
 select array_agg(x->>'id') into required_answers from jsonb_array_elements(l.return_checklist->'items')x;
 if answers is null or not required_answers<@answers then raise exception 'CHECKLIST_REQUIRED: Complete all return checks'; end if;
 end if;
 update public.loans set
 owner_dropoff_image=case when step='owner_dropoff' then image_path else owner_dropoff_image end,
 borrower_pickup_image=case when step='borrower_pickup' then image_path else borrower_pickup_image end,
 borrower_dropoff_image=case when step='borrower_dropoff' then image_path else borrower_dropoff_image end,
 owner_pickup_image=case when step='owner_pickup' then image_path else owner_pickup_image end,
 return_answers=case when step='owner_pickup' then answers else return_answers end
 where id=target returning * into l; return l;
end $$;

create table public.reviews(
 id uuid primary key default gen_random_uuid(),loan_id uuid not null unique references public.loans(id),
 body text not null check(char_length(btrim(body)) between 1 and 5000),image_path text,
 compliments text[] not null default '{}' check(compliments<@array['Compliment 1','Compliment 2','Compliment 3']::text[] and array_position(compliments,null) is null),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
insert into public.reviews(loan_id,body,image_path,compliments,created_at,updated_at)
 select id,review_text,review_image_path,review_compliments,reviewed_at,reviewed_at from public.loans where reviewed_at is not null;
create function public.save_review(target_loan uuid,body_text text,selected_compliments text[],image_path_value text default null)
returns public.reviews language plpgsql security definer set search_path='' as $$
declare l public.loans; r public.reviews; begin
 select * into l from public.loans where id=target_loan for update;
 if auth.uid() is null or l.borrower_id is distinct from auth.uid() then raise exception 'FORBIDDEN: Only the borrower can write this review'; end if;
 if l.returned_at is null or private.pending_photo(l) is not null then raise exception 'EVIDENCE_REQUIRED: Finish the handoff photo first'; end if;
 if image_path_value is not null and not exists(select 1 from storage.objects where bucket_id='loan-review-images' and name=image_path_value and owner_id=auth.uid()::text and split_part(name,'/',1)=target_loan::text) then raise exception 'VALIDATION: Upload the review image first'; end if;
 if selected_compliments is null then raise exception 'VALIDATION: Invalid compliments'; end if;
 insert into public.reviews(loan_id,body,image_path,compliments) values(target_loan,btrim(body_text),image_path_value,array(select distinct c from unnest(selected_compliments)c))
 on conflict(loan_id) do update set body=excluded.body,image_path=excluded.image_path,compliments=excluded.compliments,updated_at=clock_timestamp() returning * into r;
 return r;
end $$;
create function public.delete_review(target uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not exists(select 1 from public.reviews r join public.loans l on l.id=r.loan_id where r.id=target and l.borrower_id=auth.uid()) then raise exception 'FORBIDDEN: Only the author can delete'; end if;
 delete from public.reviews where id=target;
end $$;
create function public.get_reviews(target_item uuid default null,received_by uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'item_id',i.id,'owner_id',i.owner_id,'author_id',l.borrower_id,'author_name',p.display_name,
 'body',r.body,'image_path',r.image_path,'compliments',r.compliments,'created_at',r.created_at,'updated_at',r.updated_at) order by r.created_at desc),'[]'::jsonb)
 from public.reviews r join public.loans l on l.id=r.loan_id join public.items i on i.id=l.item_id join public.profiles p on p.id=l.borrower_id
 where auth.uid() is not null and(target_item is null or i.id=target_item) and(received_by is null or i.owner_id=received_by);
$$;
create or replace function private.item_compliments(target uuid) returns text[]
language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(c order by c),'{}'::text[]) from public.reviews r join public.loans l on l.id=r.loan_id
 cross join lateral unnest(r.compliments)c where l.item_id=target and auth.uid() is not null;
$$;

create function private.chat_member(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chats where id=target and auth.uid() in(user_one_id,user_two_id));
$$;
create table public.messages(
 id uuid primary key default gen_random_uuid(),chat_id uuid not null references public.chats(id) on delete cascade,
 sender_id uuid not null references public.profiles(id),client_id uuid not null,body text not null default '',image_path text,
 created_at timestamptz not null default now(),unique(chat_id,sender_id,client_id),
 check(char_length(body)<=5000 and(char_length(btrim(body))>0 or image_path is not null)));
create index messages_chat_time on public.messages(chat_id,created_at,id);
create function public.send_message(target_chat uuid,text_body text,request_id uuid,image_path_value text default null)
returns public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages; begin
 if auth.uid() is null or not private.chat_member(target_chat) then raise exception 'FORBIDDEN: Not a chat participant'; end if;
 if image_path_value is not null and not exists(select 1 from storage.objects where bucket_id='chat-images' and name=image_path_value and owner_id=auth.uid()::text and split_part(name,'/',1)=target_chat::text and split_part(name,'/',2)=auth.uid()::text) then raise exception 'VALIDATION: Upload your chat image first'; end if;
 insert into public.messages(chat_id,sender_id,client_id,body,image_path) values(target_chat,auth.uid(),request_id,coalesce(btrim(text_body),''),image_path_value)
 on conflict(chat_id,sender_id,client_id) do nothing returning * into result;
 if result.id is null then select * into result from public.messages where chat_id=target_chat and sender_id=auth.uid() and client_id=request_id; end if;
 return result;
end $$;
create function public.get_chat_summaries() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'other_user_id',case when c.user_one_id=auth.uid() then c.user_two_id else c.user_one_id end,
 'last_message',m.body,'has_image',m.image_path is not null,'last_at',coalesce(m.created_at,c.created_at)) order by coalesce(m.created_at,c.created_at) desc),'[]'::jsonb)
 from public.chats c left join lateral(select * from public.messages where chat_id=c.id order by created_at desc,id desc limit 1)m on true
 where auth.uid() in(c.user_one_id,c.user_two_id);
$$;

-- Read models expose computed state, not client-writable lifecycle fields.
create view public.loan_catalog with(security_invoker=true) as
 select l.*,i.owner_id,
 case when l.cancelled_at is not null then 'cancelled' when l.returned_at is not null then 'returned'
 when l.borrower_pickup_at is not null then 'on_loan' when l.approved_at is not null then 'plan_approved' else 'created' end as lifecycle_status,
 case when l.returned_at is not null then 'past' when l.starts_on>current_date then 'upcoming' else 'current' end as temporal_status,
 case when l.returned_at is not null then 'complete' when l.borrower_dropoff_at is not null then 'ready_for_owner_collection'
 when l.borrower_pickup_at is not null then 'on_loan' when l.owner_dropoff_at is not null then 'ready_for_borrower_collection' else 'not_started' end as handoff_phase,
 private.pending_photo(l) as pending_photo,private.next_scan(l) as next_scan
 from public.loans l join public.items i on i.id=l.item_id;
create view public.item_catalog with(security_invoker=true) as
 select i.*,
 case when exists(select 1 from public.loans l where l.item_id=i.id and l.cancelled_at is null and l.owner_dropoff_at is not null and l.returned_at is null and (l.borrower_pickup_at is null or l.borrower_dropoff_at is not null)) then 'ready_for_collection'
 when private.item_on_loan(i.id) then 'on_loan' else 'available' end as status,
 private.item_compliments(i.id) as compliments from public.items i;
-- Public item status must not depend on a viewer's private loan visibility.
create function private.item_status(target uuid) returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.loans l where l.item_id=target and cancelled_at is null and owner_dropoff_at is not null and returned_at is null and(borrower_pickup_at is null or borrower_dropoff_at is not null)) then 'ready_for_collection'
 when exists(select 1 from public.loans l where l.item_id=target and cancelled_at is null and borrower_pickup_at is not null and returned_at is null) then 'on_loan' else 'available' end;
$$;
create or replace view public.item_catalog with(security_invoker=true) as
 select i.*,private.item_status(i.id) as status,private.item_compliments(i.id) as compliments from public.items i;

drop policy items_read on public.items;
create policy items_read on public.items for select to authenticated using(true);
drop policy item_locations_read on public.item_locations;
create policy item_locations_read on public.item_locations for select to authenticated using(exists(select 1 from public.items i where i.id=item_id and private.can_view_owner(i.owner_id)));
alter table public.lockers enable row level security;
alter table public.item_lockers enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
create policy lockers_read on public.lockers for select to authenticated using(true);
create policy item_lockers_read on public.item_lockers for select to authenticated using(true);
create policy reviews_participants on public.reviews for select to authenticated using(exists(select 1 from public.loans l where l.id=loan_id));
create policy messages_participants on public.messages for select to authenticated using(private.chat_member(chat_id));
revoke all on public.lockers,public.item_lockers,public.reviews,public.messages from public,anon,authenticated;
grant select on public.lockers,public.item_lockers,public.reviews,public.messages,public.loan_catalog,public.item_catalog to authenticated;
revoke insert on public.items from authenticated;
revoke insert(owner_id,name,description) on public.items from authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-images','chat-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy chat_image_upload on storage.objects for insert to authenticated with check(bucket_id='chat-images' and owner_id=auth.uid()::text and split_part(name,'/',2)=auth.uid()::text and exists(select 1 from public.chats c where c.id::text=split_part(name,'/',1) and private.chat_member(c.id)));
create policy chat_image_read on storage.objects for select to authenticated using(bucket_id='chat-images' and exists(select 1 from public.chats c where c.id::text=split_part(name,'/',1) and private.chat_member(c.id)));
-- Safe helper exposes only whether a review image is referenced, not its loan.
create function private.review_image_visible(path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.reviews where image_path=path);
$$;
drop policy review_image_read on storage.objects;
create policy review_image_read on storage.objects for select to authenticated using(bucket_id='loan-review-images' and (owner_id=auth.uid()::text or private.review_image_visible(name)));
create policy unused_proof_delete on storage.objects for delete to authenticated using(bucket_id='loan-verification' and owner_id=auth.uid()::text and not exists(select 1 from public.loans l where name in(l.owner_dropoff_image,l.borrower_pickup_image,l.borrower_dropoff_image,l.owner_pickup_image)));

-- Explicit function permissions; no public default execute on feature commands.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('create_item','set_item_lockers','create_loan','modify_loan','approve_loan','cancel_loan','get_handoff_qr','simulate_locker_scan','record_handoff_photo','save_review','delete_review','get_reviews','send_message','get_chat_summaries') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function private.is_friend(uuid,uuid),private.loan_owner(uuid),private.pending_photo(public.loans),private.next_scan(public.loans),private.step_actor(public.loans,text),private.can_upload_verification(text),private.item_status(uuid),private.item_compliments(uuid),private.can_view_owner(uuid),private.chat_member(uuid),private.review_image_visible(text) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
end $$;
commit;
