--  Avatar editing for the connected demo (upstream's demo_* tables).
--
-- New RPC public.demo_update_sprite(sprite, request_id): the signed-in demo member
-- saves their own avatar (a palette colour, and the default or a hand-drawn face).
-- It is stored as "sprite" inside their demo_profiles.data, so demo_state() returns
-- it on each person with no other change. Same shape as the app's PersonSprite:
--   {"colour":"#BFE3FF","headAssetId":"face-default"|"face-drawn","torsoAssetId":"plant","level":0,"faceStrokes":[...]}
--
-- Additive and data-safe:
--  * No table, column, policy or existing function is changed. demo_command and
--    demo_state are untouched, so upstream's client keeps working as before.
--  * Profiles without a saved sprite are unchanged (the app shows a default).
--  * update-profile in demo_command keeps other keys in data, so it never removes the sprite.
--  * Reuses private.valid_face_strokes() (20261107000100) for drawn faces, and
--    upstream's demo_requests table so a retried request isn't applied twice.
-- Input from the client: {"colour":"#RRGGBB","face":"default"|"drawn","strokes":[[[x,y],...],...]}

create function public.demo_update_sprite(sprite jsonb, request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  colour text := sprite->>'colour';
  face text := sprite->>'face';
  payload jsonb := jsonb_build_object('type', 'update-sprite', 'sprite', sprite);
  existing jsonb;
begin
  if not public.demo_member() then raise exception 'Sign in with an assigned demo account.'; end if;
  if request_id is null then raise exception 'Request ID required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text || request_id::text, 0));
  --  Same request again (a retry after a dropped connection): already applied, nothing to do.
  select r.payload into existing from public.demo_requests r where r.actor = me and r.id = request_id;
  if found then
    if existing is distinct from payload then raise exception 'Request ID already used.'; end if;
    return;
  end if;
  if jsonb_typeof(sprite) is distinct from 'object' then raise exception 'Choose a valid colour.'; end if;
  if colour is null or colour !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Choose a valid colour.'; end if;
  if face is null or face not in ('default', 'drawn') then raise exception 'Choose the default face or draw one.'; end if;
  if face = 'drawn' and not coalesce(private.valid_face_strokes(sprite->'strokes'), false) then
    raise exception 'Draw a face, or choose the default face.';
  end if;
  --  Keeps any torso/level already saved; a default face drops the old drawing.
  update public.demo_profiles p
  set data = jsonb_set(p.data, '{sprite}', jsonb_build_object(
        'colour', upper(colour),
        'headAssetId', case when face = 'drawn' then 'face-drawn' else 'face-default' end,
        'torsoAssetId', coalesce(p.data #>> '{sprite,torsoAssetId}', 'plant'),
        'level', coalesce((p.data #>> '{sprite,level}')::integer, 0))
      || case when face = 'drawn' then jsonb_build_object('faceStrokes', sprite->'strokes') else '{}'::jsonb end),
      revision = p.revision + 1
  where p.id = me;
  insert into public.demo_requests values (me, request_id, payload);
end $$;

comment on function public.demo_update_sprite(jsonb, uuid) is
  'Connected demo: save the caller''s avatar into demo_profiles.data.sprite (colour + default or drawn face).';

--  Same narrow access as demo_command: signed-in users only.
revoke all on function public.demo_update_sprite(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.demo_update_sprite(jsonb, uuid) to authenticated;
