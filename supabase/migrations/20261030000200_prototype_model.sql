begin;

-- This deployed prototype is empty. Refuse to silently reinterpret legacy loans
-- (which have no milestone evidence) or discard any legacy location records.
do $$ begin
  if exists (select 1 from public.loans) or exists (select 1 from public.user_locations) then
    raise exception 'Legacy loans/locations require an explicit data migration';
  end if;
end $$;

create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

drop view public.item_catalog;
drop function public.return_loan(uuid);
drop table public.user_locations;
drop index public.friendships_pair;

create table public.sprites (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('user', 'item')),
  colour text not null default '#808080'
    check (colour ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$'),
  head_asset_id text,
  torso_asset_id text,
  level integer,
  unique (id, category),
  check ((category = 'user' and head_asset_id is not null and torso_asset_id is not null
    and char_length(head_asset_id) between 1 and 128
    and char_length(torso_asset_id) between 1 and 128 and level is not null and level >= 0)
    or (category = 'item' and head_asset_id is null and torso_asset_id is null and level is null))
);
alter table public.profiles add column sprite_id uuid unique,
  add column sprite_category text not null default 'user' check (sprite_category = 'user');
alter table public.items add column sprite_id uuid unique,
  add column sprite_category text not null default 'item' check (sprite_category = 'item');

create function private.assign_sprite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sprite_id is null then
    if tg_table_name = 'profiles' then
      insert into public.sprites(category, head_asset_id, torso_asset_id, level)
      values ('user', 'head-placeholder', 'torso-placeholder', 0) returning id into new.sprite_id;
    else
      insert into public.sprites(category) values ('item') returning id into new.sprite_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_assign_sprite before insert on public.profiles
  for each row execute function private.assign_sprite();
create trigger items_assign_sprite before insert on public.items
  for each row execute function private.assign_sprite();
do $$ declare p record; s uuid; begin
  for p in select id from public.profiles loop
    insert into public.sprites(category, head_asset_id, torso_asset_id, level)
    values ('user', 'head-placeholder', 'torso-placeholder', 0) returning id into s;
    update public.profiles set sprite_id = s where id = p.id;
  end loop;
  for p in select id from public.items loop
    insert into public.sprites(category) values ('item') returning id into s;
    update public.items set sprite_id = s where id = p.id;
  end loop;
end $$;
alter table public.profiles alter column sprite_id set not null,
  add foreign key (sprite_id, sprite_category) references public.sprites(id, category);
alter table public.items alter column sprite_id set not null,
  add foreign key (sprite_id, sprite_category) references public.sprites(id, category);

create function private.remove_sprite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.sprites where id = old.sprite_id;
  return old;
end;
$$;
create trigger profiles_remove_sprite after delete on public.profiles
  for each row execute function private.remove_sprite();
create trigger items_remove_sprite after delete on public.items
  for each row execute function private.remove_sprite();

create table public.item_locations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180)
);
create index item_locations_item on public.item_locations(item_id);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles(id) on delete cascade,
  user_two_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_one_id <> user_two_id)
);
create index chats_user_one on public.chats(user_one_id);
create index chats_user_two on public.chats(user_two_id);

drop index public.loans_one_active_per_item;
alter table public.loans
  add column date_range daterange generated always as (daterange(starts_on, due_on, '[]')) stored,
  add column sprite_colour text not null default '#808080'
    check (sprite_colour ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$'),
  add column owner_dropoff_image text unique,
  add column owner_dropoff_at timestamptz,
  add column borrower_pickup_image text unique,
  add column borrower_pickup_at timestamptz,
  add column borrower_dropoff_image text unique,
  add column borrower_dropoff_at timestamptz,
  add column owner_pickup_image text unique,
  add column specific_status text generated always as (
    case when returned_at is not null then 'returned'
      when borrower_pickup_at is not null then 'on_loan' else 'pre_collection' end) stored,
  add column review_text text check (review_text is null or char_length(review_text) between 1 and 5000),
  add column review_image_path text,
  add column review_compliments text[] not null default '{}',
  add column reviewed_at timestamptz,
  add constraint loans_finite_dates check (isfinite(starts_on) and isfinite(due_on)),
  add constraint loans_milestone_sequence check (
    ((owner_dropoff_at is null) = (owner_dropoff_image is null)) and
    ((borrower_pickup_at is null) = (borrower_pickup_image is null)) and
    ((borrower_dropoff_at is null) = (borrower_dropoff_image is null)) and
    ((returned_at is null) = (owner_pickup_image is null)) and
    (borrower_pickup_at is null or owner_dropoff_at is not null) and
    (borrower_dropoff_at is null or borrower_pickup_at is not null) and
    (returned_at is null or borrower_dropoff_at is not null) and
    (owner_dropoff_at is null or owner_dropoff_at >= created_at) and
    (borrower_pickup_at is null or borrower_pickup_at >= owner_dropoff_at) and
    (borrower_dropoff_at is null or borrower_dropoff_at >= borrower_pickup_at) and
    (returned_at is null or returned_at >= borrower_dropoff_at)),
  add constraint loans_fixed_compliments check (
    review_compliments <@ array['Compliment 1','Compliment 2','Compliment 3']::text[]
    and array_position(review_compliments, null) is null),
  add constraint loans_completed_review check (
    (reviewed_at is null and review_text is null and review_image_path is null
      and cardinality(review_compliments) = 0) or
    (reviewed_at is not null and returned_at is not null and review_text is not null)),
  add constraint loans_no_overlapping_dates exclude using gist
    (item_id with =, date_range with &&);

-- Separate scheduled date overlap from physical custody. An overdue loan blocks
-- another pickup, even when the next reservation's planned dates do not overlap.
create unique index loans_one_physical_custody on public.loans(item_id)
  where borrower_pickup_at is not null and returned_at is null;

create or replace function public.start_loan(target_item uuid, borrower uuid, start_date date, due_date date)
returns public.loans language plpgsql security definer set search_path = '' as $$
declare item_owner uuid; result public.loans;
begin
  select owner_id into item_owner from public.items where id = target_item for update;
  if auth.uid() is null or item_owner is distinct from auth.uid() then
    raise exception 'Only the item owner can create a loan';
  end if;
  if borrower is null or borrower = item_owner or not exists (
    select 1 from public.friendships f where f.status = 'accepted' and (
      (f.requester_id = item_owner and f.recipient_id = borrower) or
      (f.recipient_id = item_owner and f.requester_id = borrower))) then
    raise exception 'Borrower must be an accepted friend';
  end if;
  if start_date is null or due_date is null or not isfinite(start_date)
    or not isfinite(due_date) or due_date < start_date then
    raise exception 'Provide finite start and end dates in order';
  end if;
  insert into public.loans(item_id, borrower_id, starts_on, due_on)
  values (target_item, borrower, start_date, due_date) returning * into result;
  return result;
end;
$$;

create function private.can_upload_verification(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.loans l join public.items i on i.id = l.item_id
    where l.id::text = split_part(object_name, '/', 1)
    and cardinality(string_to_array(object_name, '/')) = 3
    and split_part(object_name, '/', 3) <> '' and case split_part(object_name, '/', 2)
      when 'owner_dropoff' then auth.uid() = i.owner_id and l.owner_dropoff_at is null
      when 'borrower_pickup' then auth.uid() = l.borrower_id
        and l.owner_dropoff_at is not null and l.borrower_pickup_at is null
      when 'borrower_dropoff' then auth.uid() = l.borrower_id
        and l.borrower_pickup_at is not null and l.borrower_dropoff_at is null
      when 'owner_pickup' then auth.uid() = i.owner_id
        and l.borrower_dropoff_at is not null and l.returned_at is null
      else false end);
$$;

-- A successful Storage metadata insert records the milestone in the same
-- transaction. Direct loan writes, overwrites, and proof deletion are denied.
create function private.record_loan_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; asset uuid; l public.loans; stamp timestamptz := clock_timestamp();
begin
  select id, item_id into target, asset from public.loans
    where id::text = split_part(new.name, '/', 1);
  if target is null then raise exception 'Loan not found'; end if;
  perform 1 from public.items where id = asset for update;
  select * into l from public.loans where id = target for update;
  if auth.uid() is null or new.owner_id is distinct from auth.uid()::text
    or not private.can_upload_verification(new.name) then
    raise exception 'Invalid actor, duplicate image, or out-of-order milestone';
  end if;
  case split_part(new.name, '/', 2)
    when 'owner_dropoff' then
      update public.loans set owner_dropoff_image = new.name, owner_dropoff_at = stamp where id = target;
    when 'borrower_pickup' then
      update public.loans set borrower_pickup_image = new.name, borrower_pickup_at = stamp where id = target;
    when 'borrower_dropoff' then
      update public.loans set borrower_dropoff_image = new.name, borrower_dropoff_at = stamp where id = target;
    when 'owner_pickup' then
      update public.loans set owner_pickup_image = new.name, returned_at = stamp where id = target;
    else raise exception 'Unknown verification milestone';
  end case;
  return new;
end;
$$;
create trigger record_lending_verification after insert on storage.objects
  for each row when (new.bucket_id = 'loan-verification')
  execute function private.record_loan_verification();

create function public.submit_loan_review(target_loan uuid, body text,
  compliments text[] default '{}', image_path text default null)
returns public.loans language plpgsql security definer set search_path = '' as $$
declare l public.loans;
begin
  select * into l from public.loans where id = target_loan for update;
  if auth.uid() is null or l.borrower_id is distinct from auth.uid() or l.returned_at is null then
    raise exception 'Only the borrower can review a completed loan';
  end if;
  if body is null or char_length(btrim(body)) not between 1 and 5000 then
    raise exception 'Review text is required (1-5000 characters)';
  end if;
  if compliments is null or array_position(compliments, null) is not null
    or not compliments <@ array['Compliment 1','Compliment 2','Compliment 3']::text[] then
    raise exception 'Choose compliments from the fixed list';
  end if;
  if image_path is not null and not exists (
    select 1 from storage.objects o where o.bucket_id = 'loan-review-images'
      and o.name = image_path and o.owner_id = auth.uid()::text
      and split_part(o.name, '/', 1) = target_loan::text) then
    raise exception 'Review image must be uploaded by this borrower for this loan';
  end if;
  update public.loans set review_text = btrim(body), review_image_path = image_path,
    review_compliments = array(select distinct c from unnest(compliments) c order by c),
    reviewed_at = clock_timestamp() where id = target_loan returning * into l;
  return l;
end;
$$;

create or replace function private.item_on_loan(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.items i join public.loans l on l.item_id = i.id
    where i.id = target and l.borrower_pickup_at is not null and l.returned_at is null
      and private.can_view_owner(i.owner_id));
$$;
create function private.item_compliments(target uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(c order by c), '{}'::text[])
  from public.items i join public.loans l on l.item_id = i.id
  cross join lateral unnest(l.review_compliments) c
  where i.id = target and l.reviewed_at is not null and private.can_view_owner(i.owner_id);
$$;

create view public.loan_catalog with (security_invoker = true) as
select l.*, case when returned_at is not null then 'past'
  when starts_on > current_date then 'upcoming' else 'current' end as temporal_status
from public.loans l;
create view public.item_catalog with (security_invoker = true) as
select i.*, case when private.item_on_loan(i.id) then 'on_loan' else 'available' end as status,
  private.item_compliments(i.id) as compliments from public.items i;
create view public.user_locations with (security_invoker = true) as
select i.owner_id as user_id, loc.item_id, loc.id as location_id,
  loc.name, loc.latitude, loc.longitude
from public.item_locations loc join public.items i on i.id = loc.item_id;
create view public.user_compliments with (security_invoker = true) as
select i.owner_id as user_id, c.compliment, count(*) as total
from public.items i cross join lateral unnest(private.item_compliments(i.id)) c(compliment)
group by i.owner_id, c.compliment;

alter table public.sprites enable row level security;
alter table public.item_locations enable row level security;
alter table public.chats enable row level security;
create policy sprites_read on public.sprites for select to authenticated using (
  exists (select 1 from public.profiles p where p.sprite_id = sprites.id) or
  exists (select 1 from public.items i where i.sprite_id = sprites.id));
create policy sprites_edit on public.sprites for update to authenticated using (
  exists (select 1 from public.profiles p where p.sprite_id = sprites.id and p.id = auth.uid()) or
  exists (select 1 from public.items i where i.sprite_id = sprites.id and i.owner_id = auth.uid()))
with check (
  exists (select 1 from public.profiles p where p.sprite_id = sprites.id and p.id = auth.uid()) or
  exists (select 1 from public.items i where i.sprite_id = sprites.id and i.owner_id = auth.uid()));
create policy item_locations_read on public.item_locations for select to authenticated
  using (exists (select 1 from public.items i where i.id = item_id));
create policy item_locations_write on public.item_locations for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));
create policy chats_read on public.chats for select to authenticated
  using (auth.uid() in (user_one_id, user_two_id));
create policy chats_insert on public.chats for insert to authenticated
  with check (auth.uid() in (user_one_id, user_two_id));

revoke all on public.sprites, public.item_locations, public.chats,
  public.loan_catalog, public.item_catalog, public.user_locations, public.user_compliments
  from public, anon, authenticated;
grant select on public.sprites, public.item_locations, public.chats,
  public.loan_catalog, public.item_catalog, public.user_locations, public.user_compliments to authenticated;
grant update (colour, head_asset_id, torso_asset_id, level) on public.sprites to authenticated;
grant insert (item_id, name, latitude, longitude), delete on public.item_locations to authenticated;
grant update (name, latitude, longitude) on public.item_locations to authenticated;
grant insert (user_one_id, user_two_id) on public.chats to authenticated;
-- The loan owner may select a display colour, but cannot directly edit lifecycle/review fields.
create policy loans_colour_edit on public.loans for update to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));
grant update (sprite_colour) on public.loans to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('loan-verification', 'loan-verification', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('loan-review-images', 'loan-review-images', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy verification_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'loan-verification' and owner_id = auth.uid()::text and private.can_upload_verification(name));
create policy verification_read on storage.objects for select to authenticated using (
  bucket_id = 'loan-verification' and exists (select 1 from public.loans l
    where l.id::text = split_part(name, '/', 1)));
create policy review_image_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'loan-review-images' and owner_id = auth.uid()::text
  and cardinality(string_to_array(name, '/')) = 2 and split_part(name, '/', 2) <> ''
  and exists (select 1 from public.loans l where l.id::text = split_part(name, '/', 1)
    and l.borrower_id = auth.uid() and l.returned_at is not null));
create policy review_image_read on storage.objects for select to authenticated using (
  bucket_id = 'loan-review-images' and exists (select 1 from public.loans l
    where l.id::text = split_part(name, '/', 1)));

revoke all on function private.assign_sprite(), private.remove_sprite(),
  private.can_upload_verification(text),
  private.record_loan_verification(), private.item_compliments(uuid),
  public.submit_loan_review(uuid, text, text[], text) from public, anon, authenticated;
grant execute on function private.can_upload_verification(text),
  private.item_compliments(uuid), public.submit_loan_review(uuid, text, text[], text) to authenticated;

commit;
