# Supabase database

Project: **CS4353 Final Project**, reference `ejgvfgvrmcwrixxdvwwt`.
The local ignored `.env` contains its project URL and publishable client key.
The hosted project remains on the Free plan in Frankfurt (`eu-central-1`).

## Model

| Entity | Fields and relationships |
| --- | --- |
| `profiles` | Supabase Auth user ID, display name, username, avatar image, exactly one user sprite |
| `items` | One owner, name, description, exactly one item sprite; multiple item images, locations, and loans |
| `item_locations` | One item, location name, latitude, longitude |
| `friendships` | Exactly two distinct users (`requester_id`, `recipient_id`); pending/accepted |
| `chats` | Exactly two distinct users (`user_one_id`, `user_two_id`); no messages yet |
| `sprites` | Category and hex colour; user sprites additionally have head/torso asset IDs and an integer level |
| `loans` | One item and borrower, inclusive start/end dates, sprite colour, four verification image slots and timestamps, one embedded borrower review |

A user acts as owner through `items.owner_id` and as borrower through
`loans.borrower_id`. Their item list, loan list, chat list, and friend list use those
relationships; they are not duplicated in array columns. A pair can have multiple
chat records and multiple friendship records. A recipient must accept each friendship
request. Any remaining accepted record keeps the pair connected.

Profiles keep their earlier avatar images; items keep their earlier item photos.
Every user/item receives its own sprite automatically. The unique, non-null sprite
reference and category foreign key prevent missing, shared, or mismatched sprites.
User defaults are `head-placeholder`, `torso-placeholder`, and level `0`; all default
colours are `#808080`. Colours accept `#RGB`, `#RRGGBB`, or `#RRGGBBAA` hex codes.
Item sprites cannot contain head, torso, or level fields.

Locations belong only to items. `user_locations` is now a read-only view that derives
a user's location list through their owned items. It includes the source item ID so
multiple item locations are not silently merged. This replaces the former writable
user location table. No chat-to-item or chat-to-loan relationships are introduced.

## Loan dates and states

`date_range` is a generated PostgreSQL date range containing both `starts_on` and
`due_on`. A database exclusion constraint rejects overlapping ranges for the same
item, including under concurrent writes. Ranges remain reserved in historical
records after return. A loan ending on a date blocks another loan starting on that
same date; the next loan may start the following day. Single-day loans are valid.

`loan_catalog` adds a derived temporal status independent of the loan stage:

- `upcoming`: start date is later than the database's current date, and owner pickup has not occurred.
- `current`: start date has arrived, and owner pickup has not occurred, even if overdue.
- `past`: owner pickup is verified, regardless of the planned dates.

`specific_status` is generated from verification milestones:

| Uploaded milestone | Required uploader | Resulting specific status |
| --- | --- | --- |
| `owner_dropoff` | Item owner | `pre_collection` |
| `borrower_pickup` | Borrower | `on_loan` |
| `borrower_dropoff` | Borrower | `on_loan` |
| `owner_pickup` | Item owner | `returned`; temporal status becomes `past` |

A new loan is `pre_collection` even before the first image. Exactly one image is
permitted for each milestone, in this order. Completion therefore requires four
images. A Storage insert trigger marks each step automatically in the same database
transaction as its upload metadata. The client cannot directly write statuses,
verification fields, or return timestamps. Uploaded verification images cannot be
overwritten or deleted through client credentials.

`item_catalog.status` is `on_loan` from verified borrower pickup until verified owner
pickup; otherwise it is `available`. Availability does not promise that every date is
free: future reservations still block their date ranges. An additional unique index
prevents a second borrower pickup while the item is still physically on loan, even
if that earlier loan is overdue and the planned date ranges do not overlap.

## Reviews and inherited compliments

The borrower may submit or edit one review embedded in their completed loan. Text
is required (1–5000 characters); an image is optional. Compliments are selected from
`Compliment 1`, `Compliment 2`, and `Compliment 3`. Duplicate selections in one review
are removed, and values outside this list are rejected.

`item_catalog.compliments` derives the item's compliment list from its loan reviews.
`user_compliments` derives counts for each owner via their items. Repeated compliments
across separate reviews count separately. These views expose compliments, not private
borrower identities, review text, or verification images, to accepted friends.

## App operations

The examples assume an authenticated `@supabase/supabase-js` client. Check every
returned `error`. The repository has no frontend implementation yet.

```js
// User lists: owner items, borrowed loans, chats, friendships.
await supabase.from('item_catalog').select('*').eq('owner_id', user.id)
await supabase.from('loan_catalog').select('*').eq('borrower_id', user.id)
await supabase.from('chats').select('*') // RLS restricts to participant records.
await supabase.from('friendships').select('*') // RLS restricts to participant records.
await supabase.from('user_locations').select('*').eq('user_id', user.id)
await supabase.from('user_compliments').select('*').eq('user_id', user.id)

// New items and users automatically receive their sprite.
await supabase.from('items').insert({ name: 'Camera', description: 'With charger' })
await supabase.from('item_locations').insert({
  item_id: itemId, name: 'Campus', latitude: 1.2966, longitude: 103.7764
})
await supabase.from('sprites').update({ colour: '#ABCDEF' }).eq('id', spriteId)

// Chat participants are immutable; each insert creates a new two-user chat.
await supabase.from('chats').insert({ user_one_id: user.id, user_two_id: friendId })
await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: friendId })
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId)

// Only the owner creates loans, to an accepted friend. Future dates are supported.
await supabase.rpc('start_loan', {
  target_item: itemId, borrower: friendId,
  start_date: '2026-11-01', due_date: '2026-11-06'
})
await supabase.from('loans').update({ sprite_colour: '#AABBCC' }).eq('id', loanId)

// The relevant participant uploads one image at the next milestone.
// Successful upload automatically updates the database; no return/status RPC is needed.
await supabase.storage.from('loan-verification')
  .upload(`${loanId}/${milestone}/${crypto.randomUUID()}.jpg`, imageFile, { upsert: false })

// After verified owner pickup, the borrower submits their review.
await supabase.rpc('submit_loan_review', {
  target_loan: loanId, body: 'Great item', compliments: ['Compliment 1'], image_path: null
})
```

To include a review image, first upload to `loan-review-images/<loan-id>/<filename>`
as the borrower, then pass `<loan-id>/<filename>` to `submit_loan_review.image_path`.
Use `.createSignedUrl(path, 60)` for private image display. Issued links work until
expiry even if access subsequently changes.

For avatars, upload to `profile-images/<user-id>/<filename>` and update
`profiles.avatar_path` with `<user-id>/<filename>`. Item photos use
`item-images/<user-id>/<item-id>/<filename>` and an `item_images` metadata row.
Bucket names are not part of stored paths. All four image buckets are private and
limit JPEG/PNG/WebP images to 5 MB. Verification/review images are private to the
loan's owner and borrower. Basic profiles and avatars are discoverable by signed-in
users; items, their photos, locations, and inherited compliments are visible to their
owner and accepted friends. Only chat participants can read their chat records.

Do not expose the `private` or `supabase_migrations` schemas through the Data API.
Do not put service-role keys or database passwords in frontend code or Git.

## Deployment and verification

The revised model was deployed on 30 October 2026 as migration `20261030000200`
(`prototype_model`), following a successful rollback-only rehearsal. Its exact SQL
source is recorded in restricted migration history.

For a new project, apply migrations in filename order. For this existing project,
apply only the new migration `20261030000200_prototype_model.sql` after the recorded
initial migration `20261030000100_lending.sql`. The new migration refuses to silently
reinterpret legacy loans or discard nonempty legacy user locations.

Run `supabase/tests/lending.sql` as postgres against a development database. It rolls
back all synthetic users, rows, and Storage metadata fixtures. These tests verify
schema constraints, RLS, sprite defaults and categories, duplicate chat/friend pairs,
location/compliment inheritance, date overlap rejection, automatic milestone
transitions, and loan/review privacy. Storage fixtures exercise the database trigger
and policies without uploading physical files; real Storage API uploads and frontend
flows require separate integration testing.
