--  Run as postgres after all migrations (including 20261107000100). Everything rolls back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.denied(statement text,state text default '23514') returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate<>state then raise exception 'FAIL: expected %, got %: %',state,sqlstate,sqlerrm;end if;return;end;raise exception 'FAIL: unexpectedly allowed: %',statement;end$$;

--  Existing data is untouched: every sprite starts without a drawn face.
select pg_temp.ok((select count(*)=0 from public.sprites where face_strokes is not null),'existing sprites have no drawn face');

insert into auth.users(id,raw_user_meta_data) values
 ('40000000-0000-0000-0000-000000000001','{"display_name":"Face owner"}'),
 ('40000000-0000-0000-0000-000000000002','{"display_name":"Face outsider"}');
create temporary table face_ids as select p.id as user_id,p.sprite_id from public.profiles p
 where p.id in ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002');
grant select on face_ids to authenticated;
select pg_temp.ok((select count(*)=2 from face_ids),'new profiles get sprites as before');
select pg_temp.ok((select bool_and(s.face_strokes is null) from public.sprites s join face_ids f on f.sprite_id=s.id),'new sprites default to no drawn face');

set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);

--  The owner can save a drawn face together with the usual columns.
update public.sprites set colour='blue',head_asset_id='face-drawn',face_strokes='[[[0.2,0.3],[0.25,0.4]],[[0.7,0.3]]]'
 where id=(select sprite_id from face_ids where user_id=auth.uid());
select pg_temp.ok((select jsonb_array_length(face_strokes)=2 and head_asset_id='face-drawn' from public.sprites where id=(select sprite_id from face_ids where user_id=auth.uid())),'owner saves a drawn face');

--  Malformed drawings are rejected by the shape check.
select pg_temp.denied($q$update public.sprites set face_strokes='[]' where id=(select sprite_id from face_ids where user_id=auth.uid())$q$);
select pg_temp.denied($q$update public.sprites set face_strokes='{"a":1}' where id=(select sprite_id from face_ids where user_id=auth.uid())$q$);
select pg_temp.denied($q$update public.sprites set face_strokes='[[[5,5]]]' where id=(select sprite_id from face_ids where user_id=auth.uid())$q$);
select pg_temp.denied($q$update public.sprites set face_strokes='[[["0.1",0.2]]]' where id=(select sprite_id from face_ids where user_id=auth.uid())$q$);
select pg_temp.denied($q$update public.sprites set face_strokes='[[[0.1,0.2,0.3]]]' where id=(select sprite_id from face_ids where user_id=auth.uid())$q$);

--  Switching back to the default face clears the drawing.
update public.sprites set head_asset_id='face-default',face_strokes=null where id=(select sprite_id from face_ids where user_id=auth.uid());
select pg_temp.ok((select face_strokes is null from public.sprites where id=(select sprite_id from face_ids where user_id=auth.uid())),'owner clears the drawn face');

--  Another user cannot change it (row policy filters the update to zero rows).
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',true);
update public.sprites set face_strokes='[[[0.5,0.5]]]' where id=(select sprite_id from face_ids where user_id='40000000-0000-0000-0000-000000000001');
reset role;
select pg_temp.ok((select face_strokes is null from public.sprites where id=(select sprite_id from face_ids where user_id='40000000-0000-0000-0000-000000000001')),'outsider cannot draw on someone else''s sprite');

--  Item sprites never carry a face.
do $$begin if exists(select 1 from public.sprites where category='item') then
 perform pg_temp.denied($q$update public.sprites set face_strokes='[[[0.5,0.5]]]' where id=(select id from public.sprites where category='item' limit 1)$q$);
end if;end$$;

select 'sprite face checks passed' as result;
rollback;
