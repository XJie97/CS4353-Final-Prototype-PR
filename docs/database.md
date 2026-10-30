# Supabase database

This database is deployed to **CS4353 Final Project** (project reference
`ejgvfgvrmcwrixxdvwwt`, project URL `https://ejgvfgvrmcwrixxdvwwt.supabase.co`).
The project uses the Free plan in Frankfurt (`eu-central-1`).

## Model

| Entity | Purpose |
| --- | --- |
| `auth.users` | Supabase-managed accounts and login credentials |
| `profiles` | Display name, optional unique username, and one avatar path |
| `user_locations` | One current location per user, with optional coordinates |
| `friendships` | A pending request that the recipient can accept; either person can remove it |
| `items` | A physical asset owned by one user |
| `item_images` | Multiple ordered images for an item |
| `loans` | Borrower, start date, due date, and actual return timestamp |
| `item_catalog` | Items with their owner's current location and derived availability |

Items inherit location through a join, so moving a user changes all their items' displayed locations. This represents the owner's pickup location, not the item's live physical location while borrowed. Items have one owner; ownership cannot be changed by the client.

An item is `on_loan` while any loan has no return timestamp, otherwise `available`. An overdue loan stays active until its owner confirms return. The database permits only one active loan per item. Start and due dates are inclusive calendar dates; a loan may last one day. Start dates cannot be in the future. Reservations and a separate borrow-request approval flow are outside this initial model.

The owner starts a loan to an accepted friend and confirms its return. Loan records remain as history. An item with loan history cannot be deleted; add an archive field later if needed. Removing a friendship does not erase loan history or prevent the owner from confirming return. Account deletion needs a separate history-retention workflow because items and loans reference profiles.

## Access rules

- Signed-in users can discover basic profiles and avatars, so they can find friends. Email addresses and passwords stay in Supabase Auth.
- Only the user can edit their profile and location. Locations and items are visible to their owner and accepted friends.
- Only the recipient can accept a pending friendship request. Either participant can cancel, reject, or remove the relationship by deleting the row.
- Only an item's owner can edit it, attach images, or create and return its loans.
- Loan details are visible only to the borrower and owner. Other friends see availability without seeing the borrower's identity.
- Images use private Storage buckets, with a 5 MB limit per JPEG, PNG, or WebP file. Database and Storage access both use row-level policies.

Do not expose the `private` schema through the Supabase Data API. It contains policy helper functions. The migration explicitly sets function permissions and uses invoker security for the catalog view.

## Create the free hosted database

1. Sign in at https://supabase.com/dashboard and create a project in a **Free** organization. Choose a suitable region and create the database password privately.
2. Open SQL Editor and run `supabase/migrations/20261030000100_lending.sql` once in a new project. It creates the tables, access policies, signup trigger, functions, and image buckets in a transaction. Use migrations rather than rerunning the initial file on an existing schema.
3. In a disposable development project, run `supabase/tests/lending.sql`. It rolls back its test users and rows. This verifies database behavior; it does not exercise real Storage uploads or authentication emails.
4. Configure Supabase Auth's site URL, redirect URLs, and desired sign-in provider when a frontend exists.
5. Copy `.env.example` to `.env` and supply the project URL and publishable key locally. Adapt the environment variable names to the frontend framework when chosen.

The Free plan has usage limits and can pause inactive projects. Check the dashboard before a demo. See https://supabase.com/pricing for current limits.

## App operations

These JavaScript examples assume an authenticated `supabase` client created with `@supabase/supabase-js`. Check `error` after every operation. No frontend framework or SDK dependency has been added yet.

```js
// Signup creates the profile automatically. Edit the display name afterward.
await supabase.from('profiles').update({ display_name: 'Alice', username: 'alice' })
  .eq('id', user.id)

// Set or update the user's current pickup location.
await supabase.from('user_locations').upsert({ user_id: user.id, label: 'Campus' })

// Send a request; only the recipient can accept it.
await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: friendId })
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId)

// Create an item, then read items with inherited locations and availability.
await supabase.from('items').insert({ name: 'Camera', description: 'With charger' })
await supabase.from('item_catalog').select('*')

// Owner records a handover. Use YYYY-MM-DD date strings.
await supabase.rpc('start_loan', {
  target_item: itemId, borrower: friendId,
  start_date: '2026-10-30', due_date: '2026-11-06'
})
await supabase.rpc('return_loan', { target_loan: loanId })
```

For an avatar, upload a new unique filename to `profile-images/<user-id>/<filename>`, then set `profiles.avatar_path` to `<user-id>/<filename>`. For an item image, upload to `item-images/<user-id>/<item-id>/<filename>`, then insert an `item_images` row with that path and its `item_id`. Bucket names are not part of the stored path. Use UUID filenames and avoid overwriting objects; no Storage update policy is provided. To replace an image, upload a new object, update its database reference, and delete the old object through the Storage API. Reorder item images by deleting and reinserting their metadata with a new `sort_order`.

Read images with `storage.from(bucket).createSignedUrl(path, 60)`. An issued URL remains usable until its expiry even if friendship or image visibility changes. Remove image metadata before deleting the underlying object. Database deletions do not remove Storage objects automatically; delete files through the Storage API, not SQL.

If "asset" means a downloadable digital file rather than the physical object, add a separate private bucket and file metadata after defining who can download it.

## Validation status

The initial migration was applied through the authenticated Supabase SQL Editor on
30 October 2026 and recorded as version `20261030000100` (`lending`) in
`supabase_migrations.schema_migrations`. Migration metadata is restricted from client
roles. All six application tables have RLS enabled, and both image buckets are private.
The local ignored `.env` contains the project URL and client publishable key; no
database password or privileged key was retrieved or saved.

The integration tests passed against the hosted database, including
profile creation, friend visibility, owner-only operations, date validation, duplicate
active loans, overdue availability, inherited locations, loan-detail privacy, returns,
and anonymous access denial. All synthetic test users and rows were rolled back.

The tests exercise PostgreSQL permissions and RLS with simulated authenticated roles;
they do not verify real authentication emails or file uploads through the Storage API.
The frontend and its Supabase SDK still need to be implemented.
