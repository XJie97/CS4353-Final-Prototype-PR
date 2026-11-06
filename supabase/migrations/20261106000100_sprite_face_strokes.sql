-- Optional hand-drawn face for user sprites (avatar editor).
--
-- Additive only: one new nullable column, a validator and a column grant.
-- Existing sprite rows keep face_strokes = null, the assign_sprite() trigger is
-- unchanged, and clients that never select or write the column are unaffected.
--
-- Format (matches the preview app's saved avatar): an array of strokes, each an
-- array of [x, y] points in face-box units (0-1, allowed overshoot -0.5..1.5).
-- Colour and stroke width are not stored; they follow the sprite colour.
-- Convention: head_asset_id = 'face-drawn' shows these strokes,
-- 'face-default' (or any other asset id) shows the default face.

create function private.valid_face_strokes(strokes jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  stroke jsonb;
  point jsonb;
begin
  if jsonb_typeof(strokes) <> 'array' or jsonb_array_length(strokes) not between 1 and 40 then
    return false;
  end if;
  for stroke in select value from jsonb_array_elements(strokes) loop
    if jsonb_typeof(stroke) <> 'array' or jsonb_array_length(stroke) not between 1 and 400 then
      return false;
    end if;
    for point in select value from jsonb_array_elements(stroke) loop
      if jsonb_typeof(point) <> 'array' or jsonb_array_length(point) <> 2
        or jsonb_typeof(point -> 0) <> 'number' or jsonb_typeof(point -> 1) <> 'number'
        or (point ->> 0)::numeric not between -0.5 and 1.5
        or (point ->> 1)::numeric not between -0.5 and 1.5 then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end
$$;

comment on function private.valid_face_strokes(jsonb) is
  'Shape check for sprites.face_strokes: 1-40 strokes of 1-400 [x, y] number pairs within -0.5..1.5.';

alter table public.sprites add column face_strokes jsonb;

-- Only user sprites can have a face; null always passes, so existing rows are valid.
alter table public.sprites add constraint sprites_face_strokes_valid check (
  face_strokes is null or (category = 'user' and private.valid_face_strokes(face_strokes))
);

comment on column public.sprites.face_strokes is
  'Optional hand-drawn face (array of strokes of [x, y] points). Shown when head_asset_id = ''face-drawn''.';

-- Same narrow access as the other editable sprite columns (row policies still apply).
grant update (face_strokes) on public.sprites to authenticated;
