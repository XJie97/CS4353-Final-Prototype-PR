-- Run after both migrations as postgres. Storage objects below are metadata-only
-- test fixtures, never actual uploaded files. All fixtures are rolled back.
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
end $$;
create function pg_temp.expect_error(statement text, expected_state text default 'P0001') returns void
language plpgsql as $$ begin
  begin execute statement;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'FAIL: expected %, received %: %', expected_state, sqlstate, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FAIL: statement unexpectedly succeeded: %', statement;
end $$;
create temporary table test_ids(key text primary key, value uuid);
grant all on test_ids to authenticated;
create function pg_temp.proof(target uuid, milestone text, filename text default 'image.jpg') returns void
language sql as $$
  insert into storage.objects(bucket_id, name, owner_id, metadata)
  values ('loan-verification', target::text || '/' || milestone || '/' || filename,
    auth.uid()::text, '{"mimetype":"image/jpeg","size":10}'::jsonb);
$$;

insert into auth.users(id, raw_user_meta_data) values
 ('20000000-0000-0000-0000-000000000001', '{"display_name":"Owner"}'),
 ('20000000-0000-0000-0000-000000000002', '{"display_name":"Borrower"}'),
 ('20000000-0000-0000-0000-000000000003', '{"display_name":"Friend"}'),
 ('20000000-0000-0000-0000-000000000004', '{"display_name":"Stranger"}');
select pg_temp.assert_true((select count(*)=4 from public.profiles p
  join public.sprites s on s.id=p.sprite_id where p.id::text like '20000000-%'
  and s.category='user' and s.level=0), 'each signup creates one user sprite');

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into public.items(name) values ('Model test camera');
insert into test_ids select 'item', id from public.items where name='Model test camera';
select pg_temp.assert_true((select s.category='item' and s.head_asset_id is null
  and s.torso_asset_id is null and s.level is null from public.sprites s
  join public.items i on i.sprite_id=s.id where i.id=(select value from test_ids where key='item')),
  'items have their own item sprite');
update public.sprites set colour='#ABCDEF' where id=(select sprite_id from public.items
  where id=(select value from test_ids where key='item'));
select pg_temp.expect_error($q$update public.sprites set head_asset_id='invalid'
  where id=(select sprite_id from public.items where id=(select value from test_ids where key='item'))$q$,'23514');
select pg_temp.expect_error($q$update public.items set sprite_id=null$q$,'42501');
insert into public.item_locations(item_id,name,latitude,longitude) values
 ((select value from test_ids where key='item'),'Campus',1.2966,103.7764),
 ((select value from test_ids where key='item'),'Home',1.35,103.82);
select pg_temp.assert_true((select count(*)=2 from public.user_locations where user_id=auth.uid()),
  'user locations inherit multiple item locations');

insert into public.chats(user_one_id,user_two_id) values
 (auth.uid(),'20000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000002',auth.uid());
select pg_temp.assert_true((select count(*)=2 from public.chats), 'pair may have multiple chats');
select pg_temp.expect_error($q$insert into public.chats(user_one_id,user_two_id)
  values(auth.uid(),auth.uid())$q$,'23514');
select pg_temp.expect_error($q$insert into public.chats(user_one_id,user_two_id)
  values(auth.uid(),null)$q$,'23502');

insert into public.friendships(requester_id,recipient_id) values
 (auth.uid(),'20000000-0000-0000-0000-000000000002'),
 (auth.uid(),'20000000-0000-0000-0000-000000000002'),
 (auth.uid(),'20000000-0000-0000-0000-000000000003');
update public.friendships set status='accepted';
select pg_temp.assert_true((select count(*)=3 from public.friendships where status='pending'),
  'requester cannot self-accept');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.items), 'pending friend cannot see items');
update public.friendships set status='accepted' where recipient_id=auth.uid();
select pg_temp.assert_true((select count(*)=2 from public.friendships where status='accepted'),
  'pair may have multiple accepted friendship records');
select pg_temp.assert_true((select count(*)=2 from public.item_locations), 'accepted friend sees item locations');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
update public.friendships set status='accepted' where recipient_id=auth.uid();

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into test_ids select 'overdue',id from public.start_loan(
 (select value from test_ids where key='item'),'20000000-0000-0000-0000-000000000002',current_date-10,current_date-5);
insert into test_ids select 'future',id from public.start_loan(
 (select value from test_ids where key='item'),'20000000-0000-0000-0000-000000000002',current_date+5,current_date+10);
select pg_temp.expect_error($q$select public.start_loan((select value from test_ids where key='item'),
 '20000000-0000-0000-0000-000000000002',current_date+10,current_date+12)$q$,'23P01');
insert into test_ids select 'adjacent',id from public.start_loan(
 (select value from test_ids where key='item'),'20000000-0000-0000-0000-000000000002',current_date+11,current_date+11);
select pg_temp.assert_true((select temporal_status='upcoming' and specific_status='pre_collection'
 from public.loan_catalog where id=(select value from test_ids where key='future')), 'future booking is upcoming/pre-collection');
select pg_temp.assert_true((select temporal_status='current' from public.loan_catalog
 where id=(select value from test_ids where key='overdue')), 'due date alone never makes a loan past');
select pg_temp.assert_true((select status='available' from public.item_catalog
 where id=(select value from test_ids where key='item')), 'pre-collection item remains available');
select pg_temp.expect_error($q$update public.loans set returned_at=now()$q$,'42501');
select pg_temp.expect_error($q$select public.start_loan((select value from test_ids where key='item'),
 '20000000-0000-0000-0000-000000000002',current_date,current_date-1)$q$);
select pg_temp.expect_error($q$select pg_temp.proof((select value from test_ids where key='overdue'),'borrower_pickup')$q$,'42501');
select pg_temp.proof((select value from test_ids where key='overdue'),'owner_dropoff');
select pg_temp.expect_error($q$select pg_temp.proof((select value from test_ids where key='overdue'),'owner_dropoff','second.jpg')$q$,'42501');
select pg_temp.expect_error($q$select pg_temp.proof((select value from test_ids where key='overdue'),'borrower_pickup')$q$,'42501');
select pg_temp.proof((select value from test_ids where key='future'),'owner_dropoff');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select pg_temp.expect_error($q$select public.submit_loan_review((select value from test_ids where key='overdue'),'Too early')$q$);
select pg_temp.proof((select value from test_ids where key='overdue'),'borrower_pickup');
select pg_temp.assert_true((select specific_status='on_loan' and temporal_status='current' from public.loan_catalog
 where id=(select value from test_ids where key='overdue')), 'borrower image automatically marks on-loan');
select pg_temp.assert_true((select status='on_loan' from public.item_catalog
 where id=(select value from test_ids where key='item')), 'item status follows physical custody');
select pg_temp.expect_error($q$select pg_temp.proof((select value from test_ids where key='future'),'borrower_pickup')$q$,'23505');
select pg_temp.proof((select value from test_ids where key='overdue'),'borrower_dropoff');
select pg_temp.assert_true((select specific_status='on_loan' from public.loan_catalog
 where id=(select value from test_ids where key='overdue')), 'borrower dropoff does not complete loan');
select pg_temp.expect_error($q$select pg_temp.proof((select value from test_ids where key='overdue'),'owner_pickup')$q$,'42501');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.loans), 'other friends cannot see loan details');
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='loan-verification'),
 'other friends cannot see verification images');
select pg_temp.assert_true((select status='on_loan' from public.item_catalog
 where id=(select value from test_ids where key='item')), 'other friends see correct item state');
select pg_temp.assert_true((select count(*)=0 from public.chats), 'chats only visible to their two users');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select pg_temp.proof((select value from test_ids where key='overdue'),'owner_pickup');
select pg_temp.assert_true((select specific_status='returned' and temporal_status='past' from public.loan_catalog
 where id=(select value from test_ids where key='overdue')), 'owner image automatically verifies returned/past');
select pg_temp.assert_true((select status='available' from public.item_catalog
 where id=(select value from test_ids where key='item')), 'owner pickup makes item available');
select pg_temp.assert_true((select count(*)=4 from storage.objects where bucket_id='loan-verification'
 and split_part(name,'/',1)=(select value::text from test_ids where key='overdue')), 'completed loan has exactly four proofs');
select pg_temp.expect_error($q$delete from storage.objects where bucket_id='loan-verification'$q$,'42501');
select pg_temp.assert_true((select count(*)=4 from storage.objects where bucket_id='loan-verification'
 and split_part(name,'/',1)=(select value::text from test_ids where key='overdue')), 'verification proof cannot be deleted');
select pg_temp.expect_error($q$select public.start_loan((select value from test_ids where key='item'),
 '20000000-0000-0000-0000-000000000002',current_date-9,current_date-7)$q$,'23P01');
select pg_temp.expect_error($q$select public.submit_loan_review((select value from test_ids where key='overdue'),'Owner cannot review')$q$);

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select pg_temp.expect_error($q$select public.submit_loan_review((select value from test_ids where key='overdue'),
 'Review',array['Unknown'])$q$);
select public.submit_loan_review((select value from test_ids where key='overdue'),
 'Great item',array['Compliment 1','Compliment 3','Compliment 1']);
select pg_temp.assert_true((select review_image_path is null and cardinality(review_compliments)=2
 from public.loans where id=(select value from test_ids where key='overdue')), 'image optional and compliments deduplicated');
insert into storage.objects(bucket_id,name,owner_id,metadata) values ('loan-review-images',
 (select value::text from test_ids where key='overdue')||'/review.jpg',auth.uid()::text,
 '{"mimetype":"image/jpeg","size":10}'::jsonb);
select public.submit_loan_review((select value from test_ids where key='overdue'),
 'Great item',array['Compliment 1','Compliment 3'],(select value::text from test_ids where key='overdue')||'/review.jpg');
select pg_temp.assert_true((select review_image_path is not null from public.loans
 where id=(select value from test_ids where key='overdue')), 'optional uploaded review image is linked');
select pg_temp.proof((select value from test_ids where key='future'),'borrower_pickup');
select pg_temp.assert_true((select specific_status='on_loan' and temporal_status='upcoming' from public.loan_catalog
 where id=(select value from test_ids where key='future')), 'temporal and specific statuses stay independent');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select pg_temp.assert_true((select count(*)=2 and sum(total)=2 from public.user_compliments
 where user_id='20000000-0000-0000-0000-000000000001'), 'user inherits compliments via owned items');
select pg_temp.assert_true((select cardinality(compliments)=2 from public.item_catalog
 where id=(select value from test_ids where key='item')), 'items inherit loan review compliments');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
select pg_temp.assert_true((select count(*)=0 from public.items), 'stranger cannot see items');
select pg_temp.assert_true((select count(*)=0 from public.user_locations), 'stranger cannot see inherited locations');
select pg_temp.assert_true((select count(*)=0 from public.user_compliments), 'stranger cannot see inherited compliments');
select pg_temp.assert_true((select count(*)=0 from public.chats), 'stranger cannot see chats');
select pg_temp.expect_error($q$select pg_temp.proof((select value from test_ids where key='future'),'borrower_dropoff')$q$,'42501');
reset role;
set local role anon;
select pg_temp.expect_error('select * from public.loan_catalog','42501');
reset role;
rollback;
select 'Prototype model integration checks passed; all test data rolled back.' as result;
