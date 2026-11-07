--  Run as postgres after all migrations (including 20261107000200). Everything rolls back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAIL: %',label;end if;end$$;

--  After the backfill, no user sprite is left on the grey placeholder.
select pg_temp.ok((select count(*)=0 from public.sprites s join public.profiles p on p.sprite_id=s.id where upper(s.colour)='#808080'),'existing users have palette colours');

--  New users get a palette colour, and the same id always maps to the same colour.
insert into auth.users(id,raw_user_meta_data) values
 ('50000000-0000-0000-0000-000000000001','{"display_name":"Palette owner"}'),
 ('50000000-0000-0000-0000-000000000002','{"display_name":"Palette other"}');
select pg_temp.ok((select bool_and(s.colour=any(private.sprite_palette())) from public.profiles p join public.sprites s on s.id=p.sprite_id
 where p.id in ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002')),'new users get a palette colour');
select pg_temp.ok(private.palette_colour_for('50000000-0000-0000-0000-000000000001')=private.palette_colour_for('50000000-0000-0000-0000-000000000001'),'colour choice is stable');

--  A new item's TV sprite matches its owner's colour.
insert into public.items(owner_id,name) values ('50000000-0000-0000-0000-000000000001','Palette test lamp');
select pg_temp.ok((select si.colour=su.colour from public.items i
 join public.sprites si on si.id=i.sprite_id
 join public.profiles p on p.id=i.owner_id join public.sprites su on su.id=p.sprite_id
 where i.name='Palette test lamp'),'item sprite takes the owner''s colour');

--  Nothing new is enforced: a custom colour still saves (the live sprite editor relies on this).
update public.sprites set colour='#123456' where id=(select sprite_id from public.profiles where id='50000000-0000-0000-0000-000000000002');
select pg_temp.ok((select colour='#123456' from public.sprites where id=(select sprite_id from public.profiles where id='50000000-0000-0000-0000-000000000002')),'custom colours still allowed');

select 'sprite palette checks passed' as result;
rollback;
