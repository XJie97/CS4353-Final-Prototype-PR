--  Review cards: a 1-5 star rating on reviews.
-- (Renumbered after upstream's 20261106000100 migration. Anonymous reviews were
-- dropped: reviewers' names are only shown to the item's owner, so they aren't needed.)
--
-- Additive and data-safe:
--  * One new nullable column on public.reviews. Existing reviews keep rating = null
--    (shown without stars).
--  * New function public.save_review_v2(...) saves a review with its rating. The
--    existing public.save_review(...) is unchanged, so clients that call it keep
--    working, and it leaves the rating untouched when a review is edited.
--  * public.get_reviews(...) keeps its signature and return type, and adds
--    "rating" to each review.

alter table public.reviews
  add column rating smallint check (rating between 1 and 5);

comment on column public.reviews.rating is 'Star rating 1-5. Null for reviews written before ratings existed.';

--  Same rules as save_review, plus the rating (required).
create function public.save_review_v2(target_loan uuid, body_text text, selected_compliments text[],
  rating_value integer, image_path_value text default null)
returns public.reviews language plpgsql security definer set search_path = '' as $$
declare l public.loans; r public.reviews; begin
 select * into l from public.loans where id = target_loan for update;
 if auth.uid() is null or l.borrower_id is distinct from auth.uid() then raise exception 'FORBIDDEN: Only the borrower can write this review'; end if;
 if l.returned_at is null or private.pending_photo(l) is not null then raise exception 'EVIDENCE_REQUIRED: Finish the handoff photo first'; end if;
 if image_path_value is not null and not exists(select 1 from storage.objects where bucket_id = 'loan-review-images' and name = image_path_value and owner_id = auth.uid()::text and split_part(name, '/', 1) = target_loan::text) then raise exception 'VALIDATION: Upload the review image first'; end if;
 if selected_compliments is null then raise exception 'VALIDATION: Invalid compliments'; end if;
 if rating_value is null or rating_value not between 1 and 5 then raise exception 'VALIDATION: Choose a rating from 1 to 5'; end if;
 insert into public.reviews(loan_id, body, image_path, compliments, rating)
 values(target_loan, btrim(body_text), image_path_value, array(select distinct c from unnest(selected_compliments) c), rating_value)
 on conflict(loan_id) do update set body = excluded.body, image_path = excluded.image_path, compliments = excluded.compliments,
   rating = excluded.rating, updated_at = clock_timestamp()
 returning * into r;
 return r;
end $$;

--  Same signature and shape as before, with the rating added.
create or replace function public.get_reviews(target_item uuid default null, received_by uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'item_id', i.id, 'owner_id', i.owner_id,
   'author_id', l.borrower_id, 'author_name', p.display_name, 'rating', r.rating,
   'body', r.body, 'image_path', r.image_path, 'compliments', r.compliments, 'created_at', r.created_at, 'updated_at', r.updated_at)
   order by r.created_at desc), '[]'::jsonb)
 from public.reviews r join public.loans l on l.id = r.loan_id join public.items i on i.id = l.item_id join public.profiles p on p.id = l.borrower_id
 where auth.uid() is not null and (target_item is null or i.id = target_item) and (received_by is null or i.owner_id = received_by);
$$;

--  Same narrow access as the other feature commands.
revoke all on function public.save_review_v2(uuid, text, text[], integer, text) from public, anon, authenticated;
grant execute on function public.save_review_v2(uuid, text, text[], integer, text) to authenticated;
