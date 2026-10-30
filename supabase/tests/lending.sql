-- Run as postgres in a disposable Supabase development project after the migration.
-- Everything, including test accounts, is rolled back.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
end;
$$;

create function pg_temp.expect_error(statement text, expected_state text default 'P0001') returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'FAIL: expected SQLSTATE %, received %: %', expected_state, sqlstate, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FAIL: statement unexpectedly succeeded: %', statement;
end;
$$;

insert into auth.users(id, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000001', '{"display_name":"Owner"}'),
  ('10000000-0000-0000-0000-000000000002', '{"display_name":"Borrower"}'),
  ('10000000-0000-0000-0000-000000000003', '{"display_name":"Other friend"}'),
  ('10000000-0000-0000-0000-000000000004', '{"display_name":"Stranger"}');
select pg_temp.assert_true((select count(*) = 4 from public.profiles
  where id::text like '10000000-%'), 'signup creates profiles');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.items(name) values ('Test camera');
insert into public.user_locations(user_id, label)
values (auth.uid(), 'Campus');
insert into public.friendships(requester_id, recipient_id) values
  (auth.uid(), '10000000-0000-0000-0000-000000000002'),
  (auth.uid(), '10000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($q$
  update public.items set owner_id = '10000000-0000-0000-0000-000000000002'
$q$, '42501');
select pg_temp.assert_true((select status = 'available' from public.item_catalog
  where name = 'Test camera'), 'new items are available');
update public.friendships set status = 'accepted';
select pg_temp.assert_true((select count(*) = 2 from public.friendships where status = 'pending'),
  'requester cannot accept their own requests');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true((select count(*) = 0 from public.items), 'pending friends cannot see items');
update public.friendships set status = 'accepted' where recipient_id = auth.uid();
select pg_temp.assert_true((select count(*) = 1 from public.items), 'accepted friends see items');
select pg_temp.expect_error($q$
  select public.start_loan((select id from public.items limit 1),
    '10000000-0000-0000-0000-000000000002', current_date, current_date + 7)
$q$);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
update public.friendships set status = 'accepted' where recipient_id = auth.uid();

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select pg_temp.expect_error($q$
  select public.start_loan((select id from public.items limit 1),
    '10000000-0000-0000-0000-000000000004', current_date, current_date + 7)
$q$);
select pg_temp.expect_error($q$
  select public.start_loan((select id from public.items limit 1),
    '10000000-0000-0000-0000-000000000002', current_date, current_date - 1)
$q$);
select pg_temp.expect_error($q$
  select public.start_loan((select id from public.items limit 1),
    '10000000-0000-0000-0000-000000000002', current_date + 1, current_date + 7)
$q$);
select public.start_loan((select id from public.items limit 1),
  '10000000-0000-0000-0000-000000000002', current_date - 7, current_date - 1);
select pg_temp.expect_error($q$
  select public.start_loan((select id from public.items limit 1),
    '10000000-0000-0000-0000-000000000003', current_date, current_date + 7)
$q$, '23505');
update public.user_locations set label = 'Home' where user_id = auth.uid();
select pg_temp.assert_true((select location_label = 'Home' and status = 'on_loan'
  from public.item_catalog), 'location inherits live and overdue items stay on loan');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.loans), 'other friends cannot see loan details');
select pg_temp.assert_true((select status = 'on_loan' from public.item_catalog),
  'other friends still see correct availability');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.item_catalog), 'strangers cannot see items');
select pg_temp.assert_true((select count(*) = 0 from public.user_locations), 'strangers cannot see locations');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true((select count(*) = 1 from public.loans), 'borrower sees their loan');
select pg_temp.expect_error($q$
  select public.return_loan((select id from public.loans limit 1))
$q$);
delete from public.friendships where recipient_id = auth.uid();
select pg_temp.assert_true((select count(*) = 1 from public.loans), 'borrower retains history after unfriending');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select public.return_loan((select id from public.loans limit 1));
select pg_temp.assert_true((select status = 'available' from public.item_catalog), 'return restores availability');

reset role;
set local role anon;
select pg_temp.expect_error('select * from public.items', '42501');
reset role;

rollback;
select 'Lending integration checks passed; all test data rolled back.' as result;
