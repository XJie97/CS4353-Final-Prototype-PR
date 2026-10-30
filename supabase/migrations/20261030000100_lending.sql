begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_path text check (avatar_path is null or avatar_path like id::text || '/%'),
  created_at timestamptz not null default now()
);

-- One current location per user; items inherit this through the catalog view.
create table public.user_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  check ((latitude is null) = (longitude is null))
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index friendships_pair on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friendships_recipient on public.friendships(recipient_id);
create index friendships_requester on public.friendships(requester_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id),
  name text not null check (char_length(name) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  created_at timestamptz not null default now()
);
create index items_owner on public.items(owner_id);

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0)
);
create index item_images_item on public.item_images(item_id);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  borrower_id uuid not null references public.profiles(id),
  starts_on date not null,
  due_on date not null,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  check (due_on >= starts_on),
  check (returned_at is null or returned_at >= created_at)
);
-- A late item stays on loan; reaching the due date never makes it available.
create unique index loans_one_active_per_item on public.loans(item_id)
  where returned_at is null;
create index loans_borrower on public.loans(borrower_id);

create function private.can_view_owner(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    owner = auth.uid() or exists (
      select 1 from public.friendships f
      where f.status = 'accepted' and (
        (f.requester_id = auth.uid() and f.recipient_id = owner) or
        (f.recipient_id = auth.uid() and f.requester_id = owner)
      )
    )
  );
$$;

create function private.item_on_loan(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.items i join public.loans l on l.item_id = i.id
    where i.id = target and l.returned_at is null
      and private.can_view_owner(i.owner_id)
  );
$$;

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 100));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.create_profile();
-- Include users created before this migration.
insert into public.profiles(id, display_name)
select id, left(coalesce(raw_user_meta_data->>'display_name', ''), 100)
from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_locations enable row level security;
alter table public.friendships enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.loans enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_edit on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy locations_read on public.user_locations for select to authenticated
  using (private.can_view_owner(user_id));
create policy locations_insert on public.user_locations for insert to authenticated
  with check (user_id = auth.uid());
create policy locations_edit on public.user_locations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy locations_delete on public.user_locations for delete to authenticated
  using (user_id = auth.uid());

create policy friendships_read on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));
create policy friendships_request on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
create policy friendships_accept on public.friendships for update to authenticated
  using (recipient_id = auth.uid() and status = 'pending')
  with check (recipient_id = auth.uid() and status = 'accepted');
create policy friendships_remove on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, recipient_id));

create policy items_read on public.items for select to authenticated
  using (private.can_view_owner(owner_id));
create policy items_insert on public.items for insert to authenticated
  with check (owner_id = auth.uid());
create policy items_edit on public.items for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy items_delete on public.items for delete to authenticated
  using (owner_id = auth.uid());

create policy item_images_read on public.item_images for select to authenticated
  using (exists (select 1 from public.items i where i.id = item_id));
create policy item_images_insert on public.item_images for insert to authenticated
  with check (storage_path like auth.uid()::text || '/' || item_id::text || '/%'
    and exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));
create policy item_images_delete on public.item_images for delete to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));

create policy loans_read on public.loans for select to authenticated
  using (borrower_id = auth.uid() or exists (
    select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()
  ));

-- Write loans only through these functions, which validate the complete operation.
create function public.start_loan(target_item uuid, borrower uuid, start_date date, due_date date)
returns public.loans language plpgsql security definer set search_path = '' as $$
declare
  item_owner uuid;
  result public.loans;
begin
  select owner_id into item_owner from public.items where id = target_item for update;
  if auth.uid() is null or item_owner is distinct from auth.uid() then
    raise exception 'Only the item owner can start a loan';
  end if;
  if borrower is null or borrower = item_owner or not exists (
    select 1 from public.friendships f where f.status = 'accepted' and (
      (f.requester_id = item_owner and f.recipient_id = borrower) or
      (f.recipient_id = item_owner and f.requester_id = borrower)
    )
  ) then
    raise exception 'Borrower must be an accepted friend';
  end if;
  if start_date is null or due_date is null or start_date > current_date or due_date < start_date then
    raise exception 'Provide a start date no later than today and a due date on or after it';
  end if;
  insert into public.loans(item_id, borrower_id, starts_on, due_on)
  values (target_item, borrower, start_date, due_date) returning * into result;
  return result;
end;
$$;

create function public.return_loan(target_loan uuid) returns public.loans
language plpgsql security definer set search_path = '' as $$
declare result public.loans;
begin
  update public.loans l set returned_at = now()
  where l.id = target_loan and l.returned_at is null and exists (
    select 1 from public.items i where i.id = l.item_id and i.owner_id = auth.uid()
  ) returning l.* into result;
  if result.id is null then
    raise exception 'Active loan not found or caller is not the item owner';
  end if;
  return result;
end;
$$;

-- security_invoker retains the underlying tables' RLS rules.
create view public.item_catalog with (security_invoker = true) as
select i.*, loc.label as location_label, loc.latitude, loc.longitude,
  case when private.item_on_loan(i.id) then 'on_loan' else 'available' end as status
from public.items i left join public.user_locations loc on loc.user_id = i.owner_id;

revoke all on public.profiles, public.user_locations, public.friendships,
  public.items, public.item_images, public.loans, public.item_catalog from anon, authenticated;
grant select on public.profiles, public.user_locations, public.friendships,
  public.items, public.item_images, public.loans, public.item_catalog to authenticated;
grant update (display_name, username, avatar_path) on public.profiles to authenticated;
grant insert, delete on public.user_locations to authenticated;
-- PostgREST upserts include the conflict key; RLS still requires the same owner.
grant update (user_id, label, latitude, longitude) on public.user_locations to authenticated;
grant insert (requester_id, recipient_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
grant delete on public.friendships to authenticated;
grant insert (owner_id, name, description) on public.items to authenticated;
grant update (name, description) on public.items to authenticated;
grant delete on public.items to authenticated;
grant insert (item_id, storage_path, sort_order), delete on public.item_images to authenticated;

revoke all on function private.can_view_owner(uuid), private.item_on_loan(uuid),
  private.create_profile(), public.start_loan(uuid, uuid, date, date), public.return_loan(uuid)
  from public, anon, authenticated;
grant execute on function private.can_view_owner(uuid), private.item_on_loan(uuid),
  public.start_loan(uuid, uuid, date, date), public.return_loan(uuid) to authenticated;

-- Keep images private. Save paths in the database; generate temporary signed URLs in the app.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('item-images', 'item-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy lending_images_read on storage.objects for select to authenticated using (
  (bucket_id = 'profile-images' and exists (
    select 1 from public.profiles p where p.avatar_path = name
  )) or
  (bucket_id = 'item-images' and exists (
    select 1 from public.item_images img where img.storage_path = name
  )) or
  (bucket_id in ('profile-images', 'item-images') and (storage.foldername(name))[1] = auth.uid()::text)
);
create policy lending_images_upload on storage.objects for insert to authenticated with check (
  (storage.foldername(name))[1] = auth.uid()::text and (
    bucket_id = 'profile-images' or
    (bucket_id = 'item-images' and exists (
      select 1 from public.items i
      where i.id::text = (storage.foldername(name))[2] and i.owner_id = auth.uid()
    ))
  )
);
create policy lending_images_delete on storage.objects for delete to authenticated using (
  bucket_id in ('profile-images', 'item-images') and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
