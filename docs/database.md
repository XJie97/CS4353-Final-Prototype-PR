# Supabase database

Project: **CS4353 Final Project**, reference `ejgvfgvrmcwrixxdvwwt`.
The ignored `.env` contains the URL and browser-safe publishable key. Privileged
keys and database passwords must never enter frontend code or Git. Do not expose
the `private` or `supabase_migrations` schemas through the Data API.

## Current model

| Entity                       | Purpose                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `profiles`, `sprites`        | Auth-backed users, avatar image, one sprite per user/item                                               |
| `items`, `item_images`       | Owner, name, description, normalized category tags, photos                                              |
| `lockers`, `item_lockers`    | `location1` through `location10`; an item allows multiple lockers                                       |
| `friendships`                | Two distinct users; each request needs recipient acceptance; duplicate pairs allowed                    |
| `chats`, `messages`          | Exactly two users per chat; text/optional image messages; duplicate chat pairs allowed                  |
| `loans`                      | Borrower, item, inclusive dates, chosen locker, revision, approval, cancellation and four handoff slots |
| `reviews`                    | One optional borrower review per completed loan, editable/deletable by its author                       |
| `private.handoff_challenges` | Actor/revision/step-bound simulated scan challenges                                                     |
| `private.prototype_config`   | Versioned return checklist template, snapshotted into each loan                                         |

Legacy coordinate locations remain in `item_locations` and inherited
`user_locations`; the new UI uses the fixed locker catalog. Existing loans are
preserved with their old approval and evidence. No locker is fabricated for them.
A legacy loan without a locker must be updated by its borrower before using the
new handoff workflow. Old embedded review columns remain for compatibility/history;
new review reads and writes use `reviews`, including migrated earlier reviews.

Profiles and item photos coexist with their sprites. User sprites have hex colour,
head/torso asset IDs and integer level; item sprites have category and hex colour.
The database creates sprites automatically and enforces one matching sprite each.

## Loan rules

A borrower requests a friend's item and chooses one allowed locker. Dates reserve
immediately, including pending requests. The exclusion constraint rejects overlapping
inclusive ranges under concurrency; an end date blocks a booking starting that day.
Cancellation before borrower collection releases dates and keeps the history.
The borrower can modify a plan before collection, clearing approval and increasing
the revision. Either participant can cancel before collection. Editing and cancelling
are blocked after borrower collection. The owner must approve before the first scan.

`loan_catalog.lifecycle_status` is `created`, `plan_approved`, `on_loan`, `returned`,
or `cancelled`. Review state is independent. Temporal status is `upcoming` when the
planned start is in the future, otherwise `current`, until final owner collection
makes it `past`. Overdue loans remain current until collected by the owner.

| Simulated scan     | Actor    | Immediate state               | Required follow-up                       |
| ------------------ | -------- | ----------------------------- | ---------------------------------------- |
| `owner_dropoff`    | Owner    | Ready for borrower collection | One locker photo                         |
| `borrower_pickup`  | Borrower | On loan                       | One locker photo                         |
| `borrower_dropoff` | Borrower | Ready for owner collection    | One locker photo                         |
| `owner_pickup`     | Owner    | Returned/Past                 | One locker photo + snapshotted checklist |

Each scan advances state before photo upload. A pending photo blocks the next scan.
A separate physical-custody check prevents starting another handoff while the prior
handoff/final evidence is unfinished, even when its dates do not overlap.
The item read model reports `available`, `ready_for_collection`, or `on_loan`.
This status is independent of whether the viewer can read the private loan.

## Commands and read models

Use the feature services in `src/features/` from UI code. Those call the following
trusted commands; the database derives the actor from the authenticated session.

| Command                       | Inputs                                                                     |
| ----------------------------- | -------------------------------------------------------------------------- |
| `create_item`                 | `item_name`, `description_text`, `tags`, `locker_ids`                      |
| `set_item_lockers`            | `target`, `locker_ids`                                                     |
| `create_loan`                 | `target_item`, `start_date`, `end_date`, `selected_locker`                 |
| `modify_loan`                 | `target`, `start_date`, `end_date`, `selected_locker`, `expected_revision` |
| `approve_loan`, `cancel_loan` | `target`, `expected_revision`                                              |
| `get_handoff_qr`              | `target`, `expected_revision`                                              |
| `simulate_locker_scan`        | `challenge`                                                                |
| `record_handoff_photo`        | `target`, `step`, `image_path`, `answers`                                  |
| `save_review`                 | `target_loan`, `body_text`, `selected_compliments`, `image_path_value`     |
| `delete_review`               | `target`                                                                   |
| `get_reviews`                 | Optional `target_item`, `received_by`                                      |
| `send_message`                | `target_chat`, `text_body`, `request_id`, optional `image_path_value`      |
| `get_chat_summaries`          | None                                                                       |

Read `item_catalog` for public item state, `loan_catalog` for participant-only
loan state, and `get_reviews` for public safe review fields. Public reviews omit
loan dates, locker, loan ID and evidence. The borrower can write a review only after
all final evidence; deleting one leaves the completed loan intact. Compliments are
fixed to `Compliment 1`, `Compliment 2`, `Compliment 3` and inherited by item/owner.

Friendships, chats, profiles and sprites use narrow table grants plus row policies.
Direct client writes to loan lifecycle/evidence and reviews/messages are denied;
commands enforce actor, plan revision and transition rules. Errors have a readable
code prefix such as `STALE_PLAN`, `INVALID_TRANSITION` or `EVIDENCE_REQUIRED`.

## Files and privacy

All buckets are private and restrict JPEG/PNG/WebP uploads to 5 MB.

| Bucket               | Stored path                  | Read access                                                      |
| -------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `profile-images`     | `<user>/<filename>`          | Signed-in users                                                  |
| `item-images`        | `<owner>/<item>/<filename>`  | Signed-in users                                                  |
| `loan-verification`  | `<loan>/<step>/<filename>`   | Loan participants only                                           |
| `loan-review-images` | `<loan>/<filename>`          | Signed-in users after review references it; uploader can preview |
| `chat-images`        | `<chat>/<sender>/<filename>` | Chat participants only                                           |

Upload through Storage first, then attach through the relevant command. Verification
uploads no longer change loan state through a Storage trigger. The command verifies
the stored object belongs to the actor and matches the loan/step. Recorded proof
cannot be overwritten or deleted by clients. Unreferenced own proof uploads may be
removed. Use short-lived signed URLs; an already issued URL remains usable until expiry.

Realtime publishes `messages`; row policies restrict deliveries to participants.
No chat-to-item or chat-to-loan relationship is introduced.

## Migration and verification

Apply migrations in filename order on a new project. This hosted project already
has versions `20261030000100`, `20261030000200`, `20261030000300` recorded; do not
reapply them. `20261030000300_feature_frame.sql` was rehearsed with rollback tests,
then deployed on 30 October 2026 with its exact source recorded in migration history.

Run **`supabase/tests/feature_frame.sql`** as postgres in a development database.
It rolls back all synthetic users, rows and Storage metadata. It covers access
policies, reservations, approval/revision checks, all four scan/photo transitions,
final checklist/review gates, safe public reviews and chat retry/privacy rules.
`supabase/tests/lending.sql` is retained as historical coverage for migration 002;
it exercises the superseded automatic-upload workflow and is not the current suite.

A separate live HTTP check verified real demo sign-ins, friend acceptance, item
creation, reservations/overlap rejection, all four scans with real Storage uploads,
review create/edit/delete, chat messages/image uploads, Realtime and outsider privacy.
Live checks create temporary `[smoke]` rows; an administrator can remove these
after reviewing the results. Uploaded test files are removed by the test workflow.
Frontend unit/component tests and `pnpm build` provide local checks without hosted
writes.
