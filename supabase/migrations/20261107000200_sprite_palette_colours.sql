-- Sprite colours become a choice of eight named options instead of free hex codes,
-- so every user's sprite (and their items' TV sprites) uses one of the app's palette colours.
-- The app maps each name to its hex value (SWATCH_HEX in frontend/src/components/sprites/palette.ts).
--
-- What changes:
--  * New type public.sprite_colour: pink, green, blue, yellow, peach, purple, turquoise, grey.
--  * public.sprites.colour changes from hex text to that type (default 'grey').
--  * Existing sprite colours are replaced, not converted: every user sprite gets a stable
--    palette colour from their id, and each item's sprite takes its owner's colour.
--    (Existing data is artificial demo data, so earlier custom colours aren't kept.)
--  * private.assign_sprite() gives new sprites a palette colour instead of grey.
-- Clients that saved hex codes into sprites.colour will now be refused; send a colour name instead.

create type public.sprite_colour as enum ('pink', 'green', 'blue', 'yellow', 'peach', 'purple', 'turquoise', 'grey');
comment on type public.sprite_colour is 'Sprite colour options (the app maps each to a hex value).';

-- A stable palette colour for a user: the same id always gets the same colour.
create function private.palette_colour_for(seed uuid) returns public.sprite_colour
language sql immutable set search_path = '' as $$
  select (pg_catalog.enum_range(null::public.sprite_colour))[1 + ((pg_catalog.hashtext(seed::text)::bigint % 8) + 8) % 8]
$$;
comment on function private.palette_colour_for(uuid) is 'Stable palette colour for a user sprite, chosen from their id.';
revoke all on function private.palette_colour_for(uuid) from public, anon, authenticated;

-- Hex text -> colour name. Old values are temporarily mapped to grey, then replaced below.
alter table public.sprites drop constraint sprites_colour_check;
alter table public.sprites alter column colour drop default;
alter table public.sprites alter column colour type public.sprite_colour using 'grey'::public.sprite_colour;
alter table public.sprites alter column colour set default 'grey';

-- Every user sprite gets its palette colour...
update public.sprites s
set colour = private.palette_colour_for(p.id)
from public.profiles p
where p.sprite_id = s.id;

-- ...then every item sprite takes its owner's colour.
update public.sprites s
set colour = us.colour
from public.items i
join public.profiles p on p.id = i.owner_id
join public.sprites us on us.id = p.sprite_id
where i.sprite_id = s.id;

-- Same trigger as before; only the colours of the new sprites change.
-- New user sprites get a palette colour; new item sprites get their owner's colour.
create or replace function private.assign_sprite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sprite_id is null then
    if tg_table_name = 'profiles' then
      insert into public.sprites(category, colour, head_asset_id, torso_asset_id, level)
      values ('user', private.palette_colour_for(coalesce(new.id, gen_random_uuid())),
        'head-placeholder', 'torso-placeholder', 0)
      returning id into new.sprite_id;
    else
      insert into public.sprites(category, colour)
      values ('item', coalesce(
        (select s.colour from public.profiles p join public.sprites s on s.id = p.sprite_id where p.id = new.owner_id),
        'grey'))
      returning id into new.sprite_id;
    end if;
  end if;
  return new;
end;
$$;
