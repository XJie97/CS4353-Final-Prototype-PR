--  Run as postgres after all migrations (including 20261107000300). Everything rolls back.
-- Walks one loan through to a completed return (same flow as feature_frame.sql), then
-- checks star ratings.
begin;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
create function pg_temp.denied(statement text,state text default 'P0001') returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate<>state then raise exception 'FAIL: expected %, got %: %',state,sqlstate,sqlerrm;end if;return;end;raise exception 'FAIL: unexpectedly allowed: %',statement;end$$;
create temporary table ids(key text primary key,id uuid);
grant all on ids to authenticated;
create function pg_temp.scan(target uuid) returns uuid language plpgsql as $$declare q jsonb;begin q:=public.get_handoff_qr(target,(select revision from public.loans where id=target));perform public.simulate_locker_scan((q->>'id')::uuid);return(q->>'id')::uuid;end$$;
create function pg_temp.photo(target uuid,stage text,checks text[] default '{}') returns void language plpgsql as $$declare path text:=target::text||'/'||stage||'/proof.jpg';begin
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('loan-verification',path,auth.uid()::text,'{"mimetype":"image/jpeg","size":1}') on conflict do nothing;
 perform public.record_handoff_photo(target,stage,path,checks);
end$$;

--  Existing reviews are untouched: no rating.
select pg_temp.ok((select count(*)=0 from public.reviews where rating is not null),'existing reviews keep no rating');

insert into auth.users(id,raw_user_meta_data) values
 ('60000000-0000-0000-0000-000000000001','{"display_name":"Card owner"}'),
 ('60000000-0000-0000-0000-000000000002','{"display_name":"Card borrower"}'),
 ('60000000-0000-0000-0000-000000000003','{"display_name":"Card outsider"}');
set local role authenticated;

--  A completed loan, as in feature_frame.sql.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
insert into ids select 'item',id from public.create_item('Review card test','description',array['Tools'],array[1]);
insert into public.friendships(requester_id,recipient_id) values(auth.uid(),'60000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
update public.friendships set status='accepted' where recipient_id=auth.uid() and requester_id='60000000-0000-0000-0000-000000000001';
insert into ids select 'loan',id from public.create_loan((select id from ids where key='item'),current_date,current_date+2,1);
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
select public.approve_loan((select id from ids where key='loan'),1);
select pg_temp.scan((select id from ids where key='loan'));
select pg_temp.photo((select id from ids where key='loan'),'owner_dropoff');
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
select pg_temp.scan((select id from ids where key='loan'));
select pg_temp.photo((select id from ids where key='loan'),'borrower_pickup');
select pg_temp.scan((select id from ids where key='loan'));
select pg_temp.photo((select id from ids where key='loan'),'borrower_dropoff');
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
select pg_temp.scan((select id from ids where key='loan'));
select pg_temp.photo((select id from ids where key='loan'),'owner_pickup',array['item','parts','condition']);

--  Only the borrower can review, and the rating must be 1-5.
select pg_temp.denied($q$select public.save_review_v2((select id from ids where key='loan'),'Nope',array[]::text[],5)$q$);
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
select pg_temp.denied($q$select public.save_review_v2((select id from ids where key='loan'),'Great',array[]::text[],6)$q$);
select pg_temp.denied($q$select public.save_review_v2((select id from ids where key='loan'),'Great',array[]::text[],null)$q$);
select public.save_review_v2((select id from ids where key='loan'),'Great tool',array['Compliment 1'],4);
select pg_temp.ok((select rating=4 from public.reviews where loan_id=(select id from ids where key='loan')),'rating saved');

--  get_reviews returns the rating alongside the same fields as before.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000003',true);
select pg_temp.ok((select (r->>'rating')::int=4 and r->>'author_name'='Card borrower' and r->>'body'='Great tool'
 from (select public.get_reviews((select id from ids where key='item'))->0 r) x),'get_reviews includes the rating');

--  Editing through the original save_review keeps the rating.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
select public.save_review((select id from ids where key='loan'),'Edited',array[]::text[]);
select pg_temp.ok((select body='Edited' and rating=4 from public.reviews where loan_id=(select id from ids where key='loan')),'old save_review leaves the rating alone');

--  save_review_v2 can change the rating.
select public.save_review_v2((select id from ids where key='loan'),'Edited',array[]::text[],5);
select pg_temp.ok((select rating=5 from public.reviews where loan_id=(select id from ids where key='loan')),'rating updated');

reset role;
set local role anon;
select pg_temp.denied($q$select public.save_review_v2(gen_random_uuid(),'x',array[]::text[],5)$q$,'42501');
reset role;
select 'review card checks passed' as result;
rollback;
