# CS4353 community lending prototype

A connected team-testing prototype of the borrowing and lending flows in [CS4353
PROJECT](https://www.figma.com/design/PNW1tzgY932Re3gpPiplcf/CS4353-PROJECT). The
existing Supabase application in the repository root is independent.

For the hosted preview link, private-login setup and reporting instructions, start with
[Group testing](../docs/team-testing.md).

For a user-facing walkthrough of the screens and exchange journey, see
[How to use the app](../docs/user-flow.md).

## Run

Use Node.js 24 or newer:

```sh
cd frontend
npm ci
cp .env.example .env
# Fill in the browser-safe publishable key in .env.
npm run dev
```

Create an ignored `frontend/.env` with `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` for the provisioned Supabase project. Use only the
browser-safe publishable key. Open http://localhost:3001 and sign in with your assigned
demo login; credentials are distributed privately. The interface stays centered at the
Figma mobile width on desktop and fits narrower phones. Content scrolls while navigation
remains in place.

## What works

- **Borrow:** prefix search, suggested items, category/location/friends filters,
  item details, dates, calendar range selection, locker choice and loan requests.
- **Loans:** Pending/Active/Complete lists for borrowing and sharing, owner
  acceptance/decline, cancellation before handover, counterproposals, and renewed
  approval when dates or location change. Date overlaps are rejected.
- **Chat:** shared conversations, unread/read state, loan cards and plan editing.
  Notifications link to the correct conversation, loan or friend requests.
- **Handover:** valid QR generation; optional camera scanning in supported
  browsers; manual-code fallback; locker number and item-photo confirmation.
  The sequence is owner drop-off → borrower pickup → borrower return → owner
  pickup. The next step is only available to its designated account.
- **Returns and reviews:** owner condition checks, issue notes/resolution,
  borrower ratings, written reviews, compliments and optional review photos.
- **Share:** create/edit personal listings, upload a photo, hide/relist an item,
  and open its outstanding loan. Hidden items keep their existing loan history.
- **Friends:** requests, acceptance, decline, cancellation, removal, public
  profiles, shared listings and conversations.
- **Me:** profile name, username, bio, location and avatar, activity summaries,
  and sign-out for the current tab.

The left search control is a back arrow; the right control clears the draft.
Suggestions and results use case-insensitive **starts with** matching on full
item names. `W` suggests Waffle maker, Watering can, Weighing scale, Wheelbarrow,
Wireless microphone and Wrench set. Canceling a search preserves the last
submitted query. Returning from item details preserves filters and scroll.

## Test the complete journey

Sign in as Eric and Sarah in separate browser profiles or devices. Changes are shared
through Supabase. Avoid same-profile tabs for independent accounts until the auth event
isolation issue documented in the hosting guide is fixed. Use the private
repository-root `.demo-accounts.txt` for assigned credentials; never commit it or
include passwords in reports.

1. As **Eric**, search for `Cake stand`. Open Sarah's **Cake stand** in Clementi,
   press **Borrow**, select future dates and a locker, and send the request.
2. In Sarah’s session, open **Loans → Pending**, and open Eric's request.
   Accept it, or edit the plan. An edit requires Eric's approval in his account.
3. Once both approve, Sarah can use **Show QR** to drop off the item. Press
   **Use preview code**, then **Verify code**; record a locker number and photo.
4. In Eric’s session, open **Loans → Active**. Complete pickup with the same
   locker number and another photo. Repeat the flow to return the item.
5. As **Sarah**, collect the returned item, add a photo, and verify its condition.
   If an issue is recorded, discuss it in chat and add a resolution note.
6. As **Eric**, find the loan under **Complete** and leave a rating and review.
7. Reload both sessions to check persistence. Sign out under **Me** when finished.
   Test activity is shared; there is no browser-only reset. Coordinate another
   run with teammates and choose dates that do not overlap existing reservations.

Seed examples also include an incoming request for Eric's projector, an item ready for
Eric to collect, a completed loan awaiting review, Sarah's welcome message, and Ben's
friend request. These are illustrative records. Dates are set when the shared dataset is
provisioned (Asia/Singapore); existing records may have been advanced by other testers.

## Persistence and boundaries

Data, photos and messages are saved to the shared Supabase project. Realtime
subscriptions refresh other signed-in sessions. Production and preview builds configured
with this project share the same backend; a different URL does not create an isolated
test database. Sign-out clears the current tab’s session, without deleting shared
activity. Closing the tab normally ends its stored session; browser session restore can
restore tab storage. Sign out explicitly when finished.

QRs encode the preview loan and handover step; the codes are **not secure access
credentials**. No physical locker opens. In-app messages are saved and delivered to
other testers; no external SMS or email is sent. Preview handovers can advance without
waiting for the scheduled day. Camera scanning requires browser support, permission, and
a secure context (HTTPS or localhost); manual code entry always remains available.
Uploads accept JPEG/PNG/WebP up to 5 MB and are resized before upload to private
Storage. The app uses provisioned Supabase accounts and private signed image URLs.
Locker operations remain simulated; camera scanning depends on browser support.

The map remains schematic; location filters do not calculate real distances.
Share/Friends/Me and interactions absent from the design are inferred using the
existing purple/green style. Figma's Starter-plan tool quota blocked most new
screen reads, so those inferred screens have not been verified pixel for pixel.
The already exported Figma assets remain in `public/assets/`. Inter/SF Pro fall
back to Arial/Apple system fonts when unavailable. QR encoding uses Project
Nayuki's MIT-licensed generator; see `public/third-party-licenses.txt`.

## Checks

```sh
npm test
npm run test:rendered
npm run build
npm run preview
```

The tests cover permissions, approval changes, overlapping dates, all four handover
steps, messages, friendship/listing/profile changes, review rules, service failure
handling and a complete two-person flow. Rendered checks exercise the actual page router
for eight views, ensure local assets exist, and generate a QR matrix. Hosted browser
journey verification is recorded separately from these local checks; physical
camera/device checks remain separate.

## Hosted group testing

See [Cloudflare hosting and preview workflow](../docs/hosting.md) for deployment setup,
pull-request testing and bug reports. Production at **https://cs4353-demo.pages.dev/**
remains the old demo until promotion. For connected team testing, use the verified
feature-branch deployment link. The candidate deployment for commit `4e7afab` is
https://5d8e7fa9.cs4353-demo.pages.dev/; Cloudflare deployment succeeded and the
two-account hosted journey passed.


The [hosting verification
record](../docs/hosting.md#hosted-browser-verification-5-november-2026)
contains the exact deployment, test data, results and remaining limitations.

## Direction B completion branch

CHG-015 keeps the Friends component mounted while opening an item and records the friend origin in browser history. Item Back uses history for that origin; marketplace Back is unchanged. Friend filters/profile state remain in memory. Reloading a directly opened item has no friend origin and returns to Borrow.

CHG-009 adds borrower-only `edit-review`, sharing creation validation. Existing fields prepopulate, including the photo. An edit preserves completed loan status. Review deletion is deliberately absent.

CHG-002 stores the immediate prior plan as optional `Loan.previousPlan`. The participant whose approval is needed sees receive/return/locker before and after, with changed fields marked. This is not full revision history. Chat does not change agreement terms.

CHG-008 is provisional and browser-local. Borrow and Share expose Ask for help / offers. Requests have title, description, dates and open/closed/selected state. Any other preview owner may offer their listed item; suitability is manually assessed. Owners can withdraw active offers; requesters can close open requests. Selection atomically invokes the existing request-loan command, rechecking availability, dates, locker and overlap. It closes selection and links an ordinary pending loan; later approval, handover and review remain unchanged. Offer arrival notifies the requester; ordinary loan creation notifies the selected owner. Unchosen offers are retained for history but cannot be selected after closure. No reference images or matching algorithm are included.

Persistence remains IndexedDB database version 1, with an additive snapshot mapping: legacy missing helpRequests/offers become empty arrays, and missing previousPlan remains absent. Existing people, items, messages, loans and reviews are preserved. New seed states initialize the arrays. The old application can read the version-1 extension, but must not be used to mutate new help data because it does not understand those records. Back up the current IndexedDB snapshot before reverting a deployed application. There is no automatic destructive data downgrade.

Tests: completion.test.ts covers legacy mapping, malformed extensions, multiple offers, two-account selection, duplicate/role/date failures, withdrawal, closure, intervening bookings, review ownership/reload and plan comparison persistence. Existing 32 tests remain intact. Real mobile/camera, concurrent-tab saves and interactive navigation acceptance remain manual checks. The existing save queue warns on persistence failure; changes remain available in that session. This branch does not introduce multi-tab synchronization.

Deferred: CHG-007 contextual inquiry, CHG-023 comments, CHG-003 pickup disputes, review Delete, attachments, gamification and connected Supabase business rules. No upstream, root app, SQL or deployment changes.

> Note: the Direction B notes above predate this branch's connected Supabase
> persistence; in this branch help requests and offers are stored through the
> shared Supabase backend instead of IndexedDB.
