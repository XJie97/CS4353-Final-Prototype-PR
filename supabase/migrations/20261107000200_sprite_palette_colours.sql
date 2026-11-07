-- Fixed sprite palette: users pick their sprite colour from eight preset colours
-- (no custom colours), so every item's TV sprite can match its owner's colour.
--
-- Additive and data-safe:
--  * Two new helper functions; assign_sprite() is replaced with a version that
--    gives new sprites a palette colour instead of the grey placeholder.
--  * Backfill only touches sprites still on the default grey (#808080). Any
--    colour someone has already set is left exactly as it is.
--  * No new constraints and no grants removed, so existing clients (including
--    the live sprite editor, which saves any hex colour) keep working. The
--    preview app shows any off-palette colour as its nearest palette colour.

-- Same eight colours as SPRITE_SWATCHES in frontend/src/components/sprites/palette.ts.
create function private.sprite_palette() returns text[]
language sql immutable set search_path = '' as $$
  select array['#F7C8FF', '#C6F3A2', '#BFE3FF', '#FFE6A3', '#FFC9B8', '#D9CCFF', '#B8F0E6', '#E5E5E5']
$$;

-- A stable palette colour for a user: the same id always gets the same colour.
create function private.palette_colour_for(seed uuid) returns text
language sql immutable set search_path = '' as $$
  select (private.sprite_palette())[1 + ((pg_catalog.hashtext(seed::text)::bigint % 8) + 8) % 8]
$$;

comment on function private.sprite_palette() is 'The fixed user sprite colours (matches the app''s SPRITE_SWATCHES).';
comment on function private.palette_colour_for(uuid) is 'Stable palette colour for a user sprite, chosen from their id.';

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
        '#808080'))
      returning id into new.sprite_id;
    end if;
  end if;
  return new;
end;
$$;

-- Backfill: user sprites still on the grey placeholder get their palette colour...
update public.sprites s
set colour = private.palette_colour_for(p.id)
from public.profiles p
where p.sprite_id = s.id and upper(s.colour) = '#808080';

-- ...then item sprites still on grey take their owner's colour.
update public.sprites s
set colour = us.colour
from public.items i
join public.profiles p on p.id = i.owner_id
join public.sprites us on us.id = p.sprite_id
where i.sprite_id = s.id and upper(s.colour) = '#808080';

revoke all on function private.sprite_palette(), private.palette_colour_for(uuid) from public, anon, authenticated;
