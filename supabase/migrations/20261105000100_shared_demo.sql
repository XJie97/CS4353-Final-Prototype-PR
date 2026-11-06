begin;
set local search_path=public,extensions;
create table public.demo_seed_versions(id text primary key, created_at timestamptz not null default now());
alter table public.demo_seed_versions enable row level security;
revoke all on public.demo_seed_versions from public,anon,authenticated;
create table public.demo_profiles(id uuid primary key references auth.users(id), data jsonb not null, revision integer not null default 1);
create unique index demo_unique_username on public.demo_profiles(lower(data->>'username'));
create table public.demo_items(id text primary key, owner_id uuid not null references public.demo_profiles(id), data jsonb not null, revision integer not null default 1);
create table public.demo_loans(id text primary key, item_id text not null references public.demo_items(id), owner_id uuid not null references public.demo_profiles(id), borrower_id uuid not null references public.demo_profiles(id), starts_on date not null, ends_on date not null, status text not null check(status in('requested','arranging','ready','active','returning','verifying','complete','cancelled','declined')), data jsonb not null, revision integer not null default 1, check(owner_id<>borrower_id), check(ends_on>=starts_on));
alter table public.demo_loans add constraint demo_no_overlap exclude using gist(item_id with =, daterange(starts_on,ends_on,'[]') with &&) where(status not in('cancelled','declined','complete'));
create table public.demo_approvals(loan_id text references public.demo_loans(id) on delete cascade, user_id uuid references public.demo_profiles(id), primary key(loan_id,user_id));
create table public.demo_proofs(loan_id text references public.demo_loans(id) on delete cascade, step text check(step in('ownerDropoff','borrowerPickup','borrowerDropoff','ownerPickup')), actor uuid not null references public.demo_profiles(id), data jsonb not null, primary key(loan_id,step));
create table public.demo_conditions(loan_id text primary key references public.demo_loans(id), data jsonb not null);
create table public.demo_reviews(loan_id text primary key references public.demo_loans(id), data jsonb not null);
create table public.demo_friendships(id text primary key, sender uuid not null references public.demo_profiles(id), recipient uuid not null references public.demo_profiles(id), status text not null check(status in('pending','accepted')), check(sender<>recipient));
create unique index demo_unique_pair on public.demo_friendships(least(sender,recipient),greatest(sender,recipient));
create table public.demo_messages(id text primary key, sender uuid not null references public.demo_profiles(id), recipient uuid not null references public.demo_profiles(id), data jsonb not null, check(sender<>recipient));
create table public.demo_notices(id text primary key, recipient uuid not null references public.demo_profiles(id), data jsonb not null);
create table public.demo_requests(actor uuid references public.demo_profiles(id), id uuid, payload jsonb not null, primary key(actor,id));
create function public.demo_participant(target text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.demo_loans where id=target and auth.uid() in(owner_id,borrower_id)); $$;
create function public.demo_member() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.demo_profiles where id=auth.uid()); $$;
alter table public.demo_profiles enable row level security;
revoke all on public.demo_profiles from public,anon,authenticated;
grant select on public.demo_profiles to authenticated;
create policy demo_read on public.demo_profiles for select to authenticated using(public.demo_member());
alter table public.demo_items enable row level security;
revoke all on public.demo_items from public,anon,authenticated;
grant select on public.demo_items to authenticated;
create policy demo_read on public.demo_items for select to authenticated using(public.demo_member() and ((data->>'listed')::boolean or owner_id=auth.uid() or exists(select 1 from public.demo_loans l where l.item_id=demo_items.id and auth.uid() in(l.owner_id,l.borrower_id))));
alter table public.demo_loans enable row level security;
revoke all on public.demo_loans from public,anon,authenticated;
grant select on public.demo_loans to authenticated;
create policy demo_read on public.demo_loans for select to authenticated using(auth.uid() in(owner_id,borrower_id));
alter table public.demo_approvals enable row level security;
revoke all on public.demo_approvals from public,anon,authenticated;
grant select on public.demo_approvals to authenticated;
create policy demo_read on public.demo_approvals for select to authenticated using(public.demo_participant(loan_id));
alter table public.demo_proofs enable row level security;
revoke all on public.demo_proofs from public,anon,authenticated;
grant select on public.demo_proofs to authenticated;
create policy demo_read on public.demo_proofs for select to authenticated using(public.demo_participant(loan_id));
alter table public.demo_conditions enable row level security;
revoke all on public.demo_conditions from public,anon,authenticated;
grant select on public.demo_conditions to authenticated;
create policy demo_read on public.demo_conditions for select to authenticated using(public.demo_participant(loan_id));
alter table public.demo_reviews enable row level security;
revoke all on public.demo_reviews from public,anon,authenticated;
grant select on public.demo_reviews to authenticated;
create policy demo_read on public.demo_reviews for select to authenticated using(public.demo_participant(loan_id));
alter table public.demo_friendships enable row level security;
revoke all on public.demo_friendships from public,anon,authenticated;
grant select on public.demo_friendships to authenticated;
create policy demo_read on public.demo_friendships for select to authenticated using(auth.uid() in(sender,recipient));
alter table public.demo_messages enable row level security;
revoke all on public.demo_messages from public,anon,authenticated;
grant select on public.demo_messages to authenticated;
create policy demo_read on public.demo_messages for select to authenticated using(auth.uid() in(sender,recipient));
alter table public.demo_notices enable row level security;
revoke all on public.demo_notices from public,anon,authenticated;
grant select on public.demo_notices to authenticated;
create policy demo_read on public.demo_notices for select to authenticated using(recipient=auth.uid());
alter table public.demo_requests enable row level security;
revoke all on public.demo_requests from public,anon,authenticated;

create function public.demo_public_reviews() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',md5(r.loan_id),'ownerId',l.owner_id,'review',r.data)),'[]') from public.demo_reviews r join public.demo_loans l on l.id=r.loan_id where public.demo_member();
$$;
create function public.demo_review_image_visible(path text) returns boolean language sql stable security definer set search_path='' as $$ select public.demo_member() and exists(select 1 from public.demo_reviews where data->>'photo'=path); $$;
create function public.demo_state() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('version',1,'activeUserId',auth.uid(),'receivedReviews',public.demo_public_reviews(),
'people',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'revision',revision)) from public.demo_profiles),'[]'),
'items',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'ownerId',owner_id,'revision',revision)) from public.demo_items),'[]'),
'loans',coalesce((select jsonb_agg(l.data||jsonb_build_object('id',l.id,'itemId',l.item_id,'ownerId',l.owner_id,'borrowerId',l.borrower_id,'start',l.starts_on,'end',l.ends_on,'status',l.status,'revision',l.revision,
'approvals',coalesce((select jsonb_agg(user_id) from public.demo_approvals where loan_id=l.id),'[]'),
'proofs',coalesce((select jsonb_object_agg(step,data||jsonb_build_object('actor',actor)) from public.demo_proofs where loan_id=l.id),'{}'))||
coalesce((select jsonb_build_object('condition',data) from public.demo_conditions where loan_id=l.id),'{}')||coalesce((select jsonb_build_object('review',data) from public.demo_reviews where loan_id=l.id),'{}')) from public.demo_loans l),'[]'),
'friends',coalesce((select jsonb_agg(jsonb_build_object('id',id,'from',sender,'to',recipient,'status',status)) from public.demo_friendships),'[]'),
'messages',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'from',sender,'to',recipient) order by data->>'at',id) from public.demo_messages),'[]'),
'notices',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'to',recipient) order by data->>'at' desc,id) from public.demo_notices),'[]'));
$$;
create function public.demo_notify(target uuid,body text,loan text default null,peer uuid default null) returns void language sql security definer set search_path='' as $$
insert into public.demo_notices values(gen_random_uuid()::text,target,jsonb_strip_nulls(jsonb_build_object('text',body,'loanId',loan,'peerId',peer,'at',clock_timestamp(),'read',false)));
$$;
create function public.demo_image_allowed(path text, loan text default null) returns boolean language sql stable security definer set search_path='' as $$
select path in('/assets/item-placeholder.png','/assets/denim-jacket.png') or exists(select 1 from storage.objects where bucket_id='demo-images' and name=path and owner_id=auth.uid()::text and
 ((loan is null and split_part(path,'/',2)='public') or (loan is not null and split_part(path,'/',2)='proof' and split_part(path,'/',3)=loan)));
$$;
create function public.demo_command(command jsonb,request_id uuid,expected_revision integer default null) returns void
language plpgsql security definer set search_path='' as $$
<<cmd>>
declare actor uuid:=auth.uid(); kind text:=command->>'type'; target text:=coalesce(command->>'loanId',command->>'id'); l public.demo_loans; i public.demo_items; f public.demo_friendships; person public.demo_profiles;
start_day date; end_day date; step text; next_step text; assigned uuid; photo text; prior jsonb; now_text text:=clock_timestamp()::text; body text; other uuid; existing jsonb; stage text;
begin
if not public.demo_member() then raise exception 'Sign in with an assigned demo account.'; end if;
if request_id is null then raise exception 'Request ID required.'; end if;
perform pg_advisory_xact_lock(hashtextextended(actor::text||request_id::text,0));
select payload into existing from public.demo_requests where demo_requests.actor=auth.uid() and id=request_id;
if found then if existing is distinct from command then raise exception 'Request ID already used.'; end if; return; end if;
select * into person from public.demo_profiles where id=actor;
if kind in('edit-plan','approve-plan','cancel-loan','decline-loan','record-proof','verify-condition','resolve-condition','submit-review') then
select * into l from public.demo_loans where id=target for update;
if l.id is null or actor not in(l.owner_id,l.borrower_id) then raise exception 'Only a loan participant can do this.'; end if;
if expected_revision is distinct from l.revision then raise exception 'This loan changed. Refresh and review it before trying again.'; end if;
end if;
if kind in('request-loan','edit-plan') then
start_day:=(command->>'start')::date; end_day:=(command->>'end')::date;
if start_day is null or end_day is null or not isfinite(start_day) or not isfinite(end_day) or start_day<(now() at time zone 'Asia/Singapore')::date or end_day<start_day then raise exception 'Choose valid receive and return dates.'; end if;
if coalesce(command->>'lockerId','') not in('clementi','toa-payoh','kent-ridge') then raise exception 'Choose a locker location.'; end if;
end if;
case kind
when 'request-loan' then
select * into i from public.demo_items where id=command->>'itemId' for update;
if i.id is null or not (i.data->>'listed')::boolean or i.owner_id=actor then raise exception 'This item is not available to borrow.'; end if;
insert into public.demo_loans values(target,i.id,i.owner_id,actor,start_day,end_day,'requested',jsonb_build_object('lockerId',command->>'lockerId','code',upper(substr(gen_random_uuid()::text,1,8)),'createdAt',now_text),1);
insert into public.demo_approvals values(target,actor);
perform public.demo_notify(i.owner_id,(person.data->>'name')||' requested '||(i.data->>'name')||'.',target);
when 'edit-plan' then
if l.status not in('requested','arranging','ready') or exists(select 1 from public.demo_proofs where loan_id=l.id) then raise exception 'The exchange plan can no longer be edited.'; end if;
if l.starts_on=start_day and l.ends_on=end_day and l.data->>'lockerId'=command->>'lockerId' then return; end if;
update public.demo_loans set starts_on=start_day,ends_on=end_day,status='arranging',data=jsonb_set(data,'{lockerId}',command->'lockerId'),revision=revision+1 where id=l.id;
delete from public.demo_approvals where loan_id=l.id; insert into public.demo_approvals values(l.id,actor);
perform public.demo_notify(case when actor=l.owner_id then l.borrower_id else l.owner_id end,(person.data->>'name')||' proposed a new exchange plan.',l.id);
when 'approve-plan' then
if l.status not in('requested','arranging','ready') or exists(select 1 from public.demo_proofs where loan_id=l.id) or (l.status='requested' and actor<>l.owner_id) then raise exception 'This plan cannot be approved.'; end if;
insert into public.demo_approvals values(l.id,actor) on conflict do nothing;
update public.demo_loans set status=case when (select count(*) from public.demo_approvals where loan_id=l.id)=2 then 'ready' else 'arranging' end,revision=revision+1 where id=l.id;
perform public.demo_notify(case when actor=l.owner_id then l.borrower_id else l.owner_id end,(person.data->>'name')||' approved the exchange plan.',l.id);
when 'cancel-loan','decline-loan' then
if l.status not in('requested','arranging','ready') or exists(select 1 from public.demo_proofs where loan_id=l.id) or (kind='decline-loan' and (actor<>l.owner_id or l.status<>'requested')) then raise exception 'This loan cannot be cancelled or declined now.'; end if;
stage:=case kind when 'cancel-loan' then 'cancelled' else 'declined' end;
update public.demo_loans set status=stage,revision=revision+1 where id=l.id;
perform public.demo_notify(case when actor=l.owner_id then l.borrower_id else l.owner_id end,(person.data->>'name')||' '||stage||' the loan.',l.id);
when 'record-proof' then
select x into next_step from unnest(array['ownerDropoff','borrowerPickup','borrowerDropoff','ownerPickup']) with ordinality as steps(x,n) where not exists(select 1 from public.demo_proofs where loan_id=l.id and demo_proofs.step=x) order by n limit 1;
step:=command->>'step'; assigned:=case when step in('ownerDropoff','ownerPickup') then l.owner_id else l.borrower_id end;
if l.status not in('ready','active','returning') or next_step is distinct from step or assigned<>actor then raise exception 'Only the next participant can complete this handover.'; end if;
if command->>'code' is distinct from 'CS4353:'||l.id||':'||step||':'||(l.data->>'code') then raise exception 'That code does not match this handover.'; end if;
if coalesce(command->>'assignmentVerified','')<>'true' then raise exception 'The locker scan must be completed before recording a handover.'; end if;
if coalesce(command->>'lockerNumber','') !~ '^[0-9]{1,2}$' or (command->>'lockerNumber')::int<1 then raise exception 'The locker scan did not assign a valid locker.'; end if;
photo:=command->>'photo'; if photo is null or not public.demo_image_allowed(photo,l.id) or photo like '/assets/%' then raise exception 'Upload an item photo first.'; end if;
insert into public.demo_proofs values(l.id,step,actor,jsonb_build_object('at',now_text,'photo',photo,'lockerNumber',command->>'lockerNumber'));
update public.demo_loans set status=case step when 'ownerDropoff' then 'ready' when 'borrowerPickup' then 'active' when 'borrowerDropoff' then 'returning' else 'verifying' end,revision=revision+1 where id=l.id;
perform public.demo_notify(case when actor=l.owner_id then l.borrower_id else l.owner_id end,(person.data->>'name')||' completed a handover.',l.id);
when 'verify-condition' then
if actor<>l.owner_id or l.status<>'verifying' or coalesce(command->>'condition','') not in('good','issue') then raise exception 'Only the owner can verify this returned item.'; end if;
if exists(select 1 from public.demo_conditions where loan_id=l.id) then raise exception 'Resolve the recorded issue instead.'; end if;
if command->>'condition'='issue' and length(btrim(coalesce(command->>'note','')))<5 then raise exception 'Describe the condition issue.'; end if;
insert into public.demo_conditions values(l.id,jsonb_build_object('result',command->>'condition','note',left(btrim(command->>'note'),2000),'at',now_text));
update public.demo_loans set status=case when command->>'condition'='good' then 'complete' else 'verifying' end,revision=revision+1 where id=l.id;
perform public.demo_notify(l.borrower_id,'The owner updated the return condition.',l.id);
when 'resolve-condition' then
if actor<>l.owner_id or l.status<>'verifying' or not exists(select 1 from public.demo_conditions where loan_id=l.id and data->>'result'='issue') then raise exception 'Only the owner can resolve this issue.'; end if;
if length(btrim(coalesce(command->>'note','')))<5 then raise exception 'Add a short resolution note.'; end if;
update public.demo_conditions set data=jsonb_set(data,'{resolution}',to_jsonb(left(btrim(command->>'note'),2000))) where loan_id=l.id;
update public.demo_loans set status='complete',revision=revision+1 where id=l.id;
perform public.demo_notify(l.borrower_id,'The condition issue has been resolved.',l.id);
when 'submit-review' then
if actor<>l.borrower_id or l.status<>'complete' then raise exception 'Only the borrower can review a completed loan.'; end if;
if coalesce(command->>'rating','') !~ '^[1-5]$' or length(btrim(coalesce(command->>'text',''))) not between 1 and 2000 then raise exception 'Choose a rating and write a review of up to 2000 characters.'; end if;
if jsonb_typeof(command->'compliments') is distinct from 'array' or exists(select 1 from jsonb_array_elements_text(command->'compliments') x where x not in('Great communication','Easy collection','As described')) then raise exception 'Choose a valid compliment.'; end if;
if command ? 'photo' and not public.demo_image_allowed(command->>'photo') then raise exception 'Upload the review photo first.'; end if;
insert into public.demo_reviews values(l.id,jsonb_strip_nulls(jsonb_build_object('rating',(command->>'rating')::int,'text',btrim(command->>'text'),'compliments',command->'compliments','photo',command->>'photo','at',now_text)));
update public.demo_loans set revision=revision+1 where id=l.id;
perform public.demo_notify(l.owner_id,(person.data->>'name')||' left a review.',l.id);
when 'create-item','edit-item' then
if length(btrim(coalesce(command->>'name',''))) not between 1 and 100 or length(btrim(coalesce(command->>'description',''))) not between 1 and 2000 then raise exception 'Enter an item name and description.'; end if;
if coalesce(command->>'category','') not in('Home','Electronics','Party Supplies','Outdoors','Clothing','Tools','Sports') or coalesce(command->>'location','') not in('Clementi','Toa Payoh','Kent Ridge') then raise exception 'Choose a valid category and community.'; end if;
if jsonb_typeof(command->'images') is distinct from 'array' or jsonb_array_length(command->'images')>4 or exists(select 1 from jsonb_array_elements_text(command->'images') x where not public.demo_image_allowed(x) and not exists(select 1 from public.demo_items where id=target and owner_id=actor and data->'images' ? x)) then raise exception 'Choose valid listing photos.'; end if;
prior:=jsonb_build_object('name',btrim(command->>'name'),'title',btrim(command->>'name'),'description',btrim(command->>'description'),'category',command->>'category','location',command->>'location','owner',person.data->>'name','images',case when jsonb_array_length(command->'images')=0 then '["/assets/item-placeholder.png"]'::jsonb else command->'images' end,'image',coalesce(command->'images'->>0,'/assets/item-placeholder.png'),'isFriend',false);
if kind='create-item' then insert into public.demo_items values(target,actor,prior||'{"listed":true}',1);
else select * into i from public.demo_items where id=target for update; if i.owner_id is distinct from actor or i.revision is distinct from expected_revision then raise exception 'Listing changed or is not yours. Refresh before editing.'; end if;
update public.demo_items set data=prior||jsonb_build_object('listed',i.data->'listed'),revision=revision+1 where id=target; end if;
when 'toggle-item' then
select * into i from public.demo_items where id=target for update;
if i.owner_id is distinct from actor or i.revision is distinct from expected_revision then raise exception 'Listing changed or is not yours. Refresh before editing.'; end if;
update public.demo_items set data=jsonb_set(data,'{listed}',to_jsonb(not (data->>'listed')::boolean)),revision=revision+1 where id=target;
when 'request-friend' then
other:=(command->>'to')::uuid; if other=actor then raise exception 'Choose another person.'; end if;
insert into public.demo_friendships values(target,actor,other,'pending'); perform public.demo_notify(other,(person.data->>'name')||' sent you a friend request.');
when 'accept-friend','decline-friend','remove-friend' then
select * into f from public.demo_friendships where id=target for update;
if f.id is null or actor not in(f.sender,f.recipient) then raise exception 'This friendship is unavailable.'; end if;
if kind='accept-friend' then if f.recipient<>actor or f.status<>'pending' then raise exception 'Only the recipient can accept a pending request.'; end if;
update public.demo_friendships set status='accepted' where id=target; perform public.demo_notify(f.sender,(person.data->>'name')||' accepted your friend request.');
else if kind='decline-friend' and f.status<>'pending' then raise exception 'This request was already accepted.'; end if; delete from public.demo_friendships where id=target; end if;
when 'update-profile' then
select * into person from public.demo_profiles where id=actor for update;
if person.revision is distinct from expected_revision then raise exception 'Your profile changed. Refresh before editing.'; end if;
if length(btrim(coalesce(command->>'name',''))) not between 1 and 80 or lower(coalesce(command->>'username','')) !~ '^[a-z0-9_]{3,24}$' or length(coalesce(command->>'bio',''))>500 or coalesce(command->>'location','') not in('Clementi','Toa Payoh','Kent Ridge') then raise exception 'Check your profile name, username, bio and community.'; end if;
if command ? 'avatar' and not public.demo_image_allowed(command->>'avatar') and command->>'avatar' is distinct from person.data->>'avatar' then raise exception 'Upload your avatar first.'; end if;
update public.demo_profiles set data=(data-'avatar')||jsonb_strip_nulls(jsonb_build_object('name',btrim(command->>'name'),'username',lower(command->>'username'),'location',command->>'location','bio',btrim(command->>'bio'),'avatar',command->>'avatar')),revision=revision+1 where id=actor;
when 'send-message' then
other:=(command->>'to')::uuid; body:=btrim(command->>'text'); if other=actor or coalesce(length(body),0) not between 1 and 2000 then raise exception 'Write a message to another person (up to 2000 characters).'; end if;
if command ? 'loanId' and not exists(select 1 from public.demo_loans where id=command->>'loanId' and actor in(owner_id,borrower_id) and other in(owner_id,borrower_id)) then raise exception 'Only loan participants can discuss this loan.'; end if;
insert into public.demo_messages values(request_id::text,actor,other,jsonb_strip_nulls(jsonb_build_object('text',body,'at',now_text,'read',false,'loanId',command->>'loanId')));
perform public.demo_notify(other,(person.data->>'name')||' sent you a message.',null,actor);
when 'read-thread' then
other:=(command->>'peerId')::uuid;
update public.demo_messages set data=jsonb_set(data,'{read}','true') where recipient=actor and sender=other and data->>'read'='false';
update public.demo_notices set data=jsonb_set(data,'{read}','true') where recipient=actor and data->>'peerId'=other::text and data->>'read'='false';
when 'read-notices' then
update public.demo_notices set data=jsonb_set(data,'{read}','true') where recipient=actor and (not(command ? 'id') or id=target) and data->>'read'='false';
else raise exception 'This action is not available.';
end case;
insert into public.demo_requests values(actor,request_id,command);
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('demo-images','demo-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy demo_image_upload on storage.objects for insert to authenticated with check(bucket_id='demo-images' and public.demo_member() and owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text and (split_part(name,'/',2)='public' or (split_part(name,'/',2)='proof' and public.demo_participant(split_part(name,'/',3)))));
create policy demo_image_read on storage.objects for select to authenticated using(bucket_id='demo-images' and public.demo_member() and (owner_id=auth.uid()::text or (split_part(name,'/',2)='proof' and public.demo_participant(split_part(name,'/',3))) or (split_part(name,'/',2)='public' and (exists(select 1 from public.demo_profiles where data->>'avatar'=name) or exists(select 1 from public.demo_items where data->'images' ? name) or public.demo_review_image_visible(name)))));
create policy demo_unused_image_delete on storage.objects for delete to authenticated using(bucket_id='demo-images' and owner_id=auth.uid()::text and not exists(select 1 from public.demo_profiles where data->>'avatar'=name) and not exists(select 1 from public.demo_items where data->'images' ? name) and not exists(select 1 from public.demo_proofs where data->>'photo'=name) and not public.demo_review_image_visible(name));
revoke all on function public.demo_public_reviews(),public.demo_review_image_visible(text) from public,anon,authenticated;
grant execute on function public.demo_public_reviews(),public.demo_review_image_visible(text) to authenticated;
revoke all on function public.demo_notify(uuid,text,text,uuid),public.demo_command(jsonb,uuid,integer),public.demo_state(),public.demo_image_allowed(text,text),public.demo_participant(text),public.demo_member() from public,anon,authenticated;
grant execute on function public.demo_command(jsonb,uuid,integer),public.demo_state(),public.demo_participant(text),public.demo_member() to authenticated;
alter publication supabase_realtime add table public.demo_profiles;
alter publication supabase_realtime add table public.demo_items;
alter publication supabase_realtime add table public.demo_loans;
alter publication supabase_realtime add table public.demo_approvals;
alter publication supabase_realtime add table public.demo_proofs;
alter publication supabase_realtime add table public.demo_conditions;
alter publication supabase_realtime add table public.demo_reviews;
alter publication supabase_realtime add table public.demo_friendships;
alter publication supabase_realtime add table public.demo_messages;
alter publication supabase_realtime add table public.demo_notices;
commit;
