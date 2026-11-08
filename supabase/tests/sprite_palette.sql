--  Run as postgres after all migrations (including 20261107000200). Everything rolls back.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAIL: %',label;end if;end$$;

-- Every existing user sprite has its stable palette colour, and items match their owners.
select pg_temp.ok((select coalesce(bool_and(s.colour=private.palette_colour_for(p.id)),true) from public.sprites s join public.profiles p on p.sprite_id=s.id),'existing users have their palette colour');
select pg_temp.ok((select coalesce(bool_and(si.colour=su.colour),true) from public.items i join public.sprites si on si.id=i.sprite_id
 join public.profiles p on p.id=i.owner_id join public.sprites su on su.id=p.sprite_id),'existing items match their owners');

--  New users get a palette colour, and the same id always maps to the same colour.
insert into auth.users(id,raw_user_meta_data) values
 ('50000000-0000-0000-0000-000000000001','{"display_name":"Palette owner"}'),
 ('50000000-0000-0000-0000-000000000002','{"display_name":"Palette other"}');
select pg_temp.ok((select bool_and(s.colour is not null) from public.profiles p join public.sprites s on s.id=p.sprite_id
 where p.id in ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002')),'new users get a palette colour');
select pg_temp.ok(private.palette_colour_for('50000000-0000-0000-0000-000000000001')=private.palette_colour_for('50000000-0000-0000-0000-000000000001'),'colour choice is stable');

--  A new item's TV sprite matches its owner's colour.
insert into public.items(owner_id,name) values ('50000000-0000-0000-0000-000000000001','Palette test lamp');
select pg_temp.ok((select si.colour=su.colour from public.items i
 join public.sprites si on si.id=i.sprite_id
 join public.profiles p on p.id=i.owner_id join public.sprites su on su.id=p.sprite_id
 where i.name='Palette test lamp'),'item sprite takes the owner''s colour');

-- Colours are one of the named options: a name saves, a hex code is refused.
update public.sprites set colour='purple' where id=(select sprite_id from public.profiles where id='50000000-0000-0000-0000-000000000002');
select pg_temp.ok((select colour='purple' from public.sprites where id=(select sprite_id from public.profiles where id='50000000-0000-0000-0000-000000000002')),'a colour name saves');
do $$begin begin update public.sprites set colour='#123456' where id=(select sprite_id from public.profiles where id='50000000-0000-0000-0000-000000000002');
 raise exception 'FAIL: a hex colour was accepted';exception when invalid_text_representation then null;end;end$$;

select 'sprite palette checks passed' as result;
rollback;
