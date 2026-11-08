--  Run as postgres after all migrations (including 20261107000400). All test records roll back.
-- Checks the connected demo's avatar API, public.demo_update_sprite.
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAIL: %',label; end if; end$$;
create function pg_temp.denied(statement text,expected text default null) returns void language plpgsql as $$begin begin execute statement;exception when others then if expected is not null and position(expected in sqlerrm)=0 then raise exception 'FAIL: expected "%", got: %',expected,sqlerrm;end if;return;end;raise exception 'FAIL: unexpectedly allowed: %',statement;end$$;
create function pg_temp.me() returns jsonb language sql as $$select data->'sprite' from public.demo_profiles where id=auth.uid()$$;
insert into auth.users(id,raw_user_meta_data) values('70000000-0000-0000-0000-000000000001','{"display_name":"Sprite tester"}'),('70000000-0000-0000-0000-000000000002','{"display_name":"Sprite outsider"}');
insert into public.demo_profiles select id,jsonb_build_object('name','Sprite tester','username','sprite_'||right(id::text,4),'bio','','location','Clementi','colour','#808080'),1
 from auth.users where id='70000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true);

--  A profile without a saved avatar has no sprite key; demo_state still loads.
select pg_temp.ok(pg_temp.me() is null,'no sprite until one is saved');

--  Colour + default face, stored upper-case with the default torso/level, and the revision moves on.
select public.demo_update_sprite('{"colour":"blue","face":"default"}','71000000-0000-0000-0000-000000000001');
select pg_temp.ok(pg_temp.me()='{"colour":"blue","headAssetId":"face-default","torsoAssetId":"plant","level":0}'::jsonb,'default face saved');
select pg_temp.ok((select revision=2 from public.demo_profiles where id=auth.uid()),'revision increments');
select pg_temp.ok((select p->'sprite'->>'colour'='blue' from jsonb_array_elements(public.demo_state()->'people') p where p->>'id'=auth.uid()::text),'demo_state returns the sprite on the person');

--  The same request again is a no-op; reusing its id for different content is refused.
select public.demo_update_sprite('{"colour":"blue","face":"default"}','71000000-0000-0000-0000-000000000001');
select pg_temp.ok((select revision=2 from public.demo_profiles where id=auth.uid()),'retry is not applied twice');
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"default"}','71000000-0000-0000-0000-000000000001')$q$,'Request ID already used');

--  A drawn face keeps its strokes; switching back to the default face drops them.
select public.demo_update_sprite('{"colour":"green","face":"drawn","strokes":[[[0.2,0.3],[0.25,0.4]],[[0.7,0.3]]]}','71000000-0000-0000-0000-000000000002');
select pg_temp.ok(pg_temp.me()->>'headAssetId'='face-drawn' and pg_temp.me()->'faceStrokes'='[[[0.2,0.3],[0.25,0.4]],[[0.7,0.3]]]'::jsonb,'drawn face saved');
select public.demo_update_sprite('{"colour":"green","face":"default"}','71000000-0000-0000-0000-000000000003');
select pg_temp.ok(not (pg_temp.me() ? 'faceStrokes'),'default face drops the drawing');

--  Editing the profile through upstream's demo_command keeps the avatar.
select public.demo_command('{"type":"update-profile","name":"Renamed","username":"sprite_0001","location":"Clementi","bio":""}','71000000-0000-0000-0000-000000000004',(select revision from public.demo_profiles where id=auth.uid()));
select pg_temp.ok(pg_temp.me()->>'colour'='green' and (select data->>'name'='Renamed' from public.demo_profiles where id=auth.uid()),'profile edit keeps the sprite');

--  Validation.
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"#F7C8FF","face":"default"}',gen_random_uuid())$q$,'valid colour');
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"smile"}',gen_random_uuid())$q$,'default face');
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"drawn","strokes":[]}',gen_random_uuid())$q$,'Draw a face');
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"drawn","strokes":[[[5,5]]]}',gen_random_uuid())$q$,'Draw a face');
select pg_temp.denied($q$select public.demo_update_sprite('"grey"',gen_random_uuid())$q$,'valid colour');
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"default"}',null)$q$,'Request ID required');

--  Only provisioned demo members can save, and only their own avatar.
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',true);
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"default"}',gen_random_uuid())$q$,'Sign in');
reset role;
set local role anon;
select pg_temp.denied($q$select public.demo_update_sprite('{"colour":"grey","face":"default"}',gen_random_uuid())$q$);
reset role;
select pg_temp.ok((select data->'sprite'->>'colour'='green' from public.demo_profiles where id='70000000-0000-0000-0000-000000000001'),'nothing else changed it');
select 'demo sprite checks passed' as result;
rollback;
