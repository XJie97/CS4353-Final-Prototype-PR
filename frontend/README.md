# CS4353 community lending prototype

A complete local browser prototype of the borrowing and lending flows in
[CS4353 PROJECT](https://www.figma.com/design/PNW1tzgY932Re3gpPiplcf/CS4353-PROJECT).
The existing Supabase application in the repository root is independent.

For a user-facing walkthrough of the screens and exchange journey, see
[How to use the app](../docs/user-flow.md).

## Run

Use Node.js 24 or newer:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:3001. No environment variables or accounts are required.
The interface stays centered at the Figma mobile width on desktop and fits
narrower phones. Content scrolls while navigation remains in place.

## What works

- **Borrow:** prefix search, suggested items, category/location/friends filters,
  item details, dates, calendar range selection, locker choice and loan requests.
- **Loans:** Pending/Active/Complete lists for borrowing and sharing, owner
  acceptance/decline, cancellation before handover, counterproposals, and renewed
  approval when dates or location change. Date overlaps are rejected.
- **Chat:** local conversations, unread/read state, loan cards and plan editing.
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
  and a confirmed reset of the preview data.

The left search control is a back arrow; the right control clears the draft.
Suggestions and results use case-insensitive **starts with** matching on full
item names. `W` suggests Waffle maker, Watering can, Weighing scale, Wheelbarrow,
Wireless microphone and Wrench set. Canceling a search preserves the last
submitted query. Returning from item details preserves filters and scroll.

## Test the complete journey

The **Preview account** selector above the bottom navigation switches between
Eric, Sarah, Ben and Maya. Each account has its own loans, messages and notices,
held together in this browser's preview state.

1. As **Eric**, search for `Cake stand`. Open Sarah's **Cake stand** in Clementi,
   press **Borrow**, select future dates and a locker, and send the request.
2. Switch to **Sarah**, open **Loans → Pending**, and open Eric's request.
   Accept it, or edit the plan. An edit requires Eric's approval in his account.
3. Once both approve, Sarah can use **Show QR** to drop off the item. Press
   **Use preview code**, then **Verify code**; record a locker number and photo.
4. Switch to **Eric** and open **Loans → Active**. Complete pickup with the same
   locker number and another photo. Repeat the flow to return the item.
5. As **Sarah**, collect the returned item, add a photo, and verify its condition.
   If an issue is recorded, discuss it in chat and add a resolution note.
6. As **Eric**, find the loan under **Complete** and leave a rating and review.
7. Reload to check persistence. Use **Me → Reset preview data** to start again.

Seed examples also include an incoming request for Eric's projector, an item
ready for Eric to collect, a completed loan awaiting review, Sarah's welcome
message, and Ben's friend request. These are illustrative records. Dates are
relative to the day the preview is first created (Asia/Singapore).

## Persistence and boundaries

All new data, photos and messages stay in IndexedDB on **this browser and
origin**. They are not shared with another device, synced across open tabs, or
sent to Supabase. Storage errors are shown; in that case keep the tab open
because changes may last only for the session. A reset replaces the saved
preview after confirmation. There is no production authentication in this app.

QRs encode the preview loan and handover step; the codes are **not secure access
credentials**. No physical locker opens and no real message is sent. Preview
handovers can advance without waiting for the scheduled day. Camera scanning
requires browser support, permission, and a secure context (HTTPS or localhost);
manual code entry always remains available. Uploads accept JPEG/PNG/WebP up to
5 MB and are resized for local storage. The app does not include a production
camera/locker backend, realtime delivery, or deployed account system.

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

The tests cover permissions, approval changes, overlapping dates, all four
handover steps, messages, friendship/listing/profile changes, review rules,
corrupt saved state and a complete two-person flow serialized after every step.
Rendered checks exercise the actual page router for eight views, ensure local
assets exist, and generate a QR matrix. Browser visual verification and physical
camera/device checks remain outstanding: this environment has no installed local
browser binary and its remote browser could not reach the local dev server.

## Hosted group testing

See [Cloudflare hosting and preview workflow](../docs/hosting.md) for deployment setup,
pull-request testing and bug reports. Try the public demo at **https://cs4353-demo.pages.dev/**.

## Direction B completion branch

CHG-015 keeps the Friends component mounted while opening an item and records the friend origin in browser history. Item Back uses history for that origin; marketplace Back is unchanged. Friend filters/profile state remain in memory. Reloading a directly opened item has no friend origin and returns to Borrow.

CHG-009 adds borrower-only `edit-review`, sharing creation validation. Existing fields prepopulate, including the photo. An edit preserves completed loan status. Review deletion is deliberately absent.

CHG-002 stores the immediate prior plan as optional `Loan.previousPlan`. The participant whose approval is needed sees receive/return/locker before and after, with changed fields marked. This is not full revision history. Chat does not change agreement terms.

CHG-008 is provisional and browser-local. Borrow and Share expose Ask for help / offers. Requests have title, description, dates and open/closed/selected state. Any other preview owner may offer their listed item; suitability is manually assessed. Owners can withdraw active offers; requesters can close open requests. Selection atomically invokes the existing request-loan command, rechecking availability, dates, locker and overlap. It closes selection and links an ordinary pending loan; later approval, handover and review remain unchanged. Offer arrival notifies the requester; ordinary loan creation notifies the selected owner. Unchosen offers are retained for history but cannot be selected after closure. No reference images or matching algorithm are included.

Persistence remains IndexedDB database version 1, with an additive snapshot mapping: legacy missing helpRequests/offers become empty arrays, and missing previousPlan remains absent. Existing people, items, messages, loans and reviews are preserved. New seed states initialize the arrays. The old application can read the version-1 extension, but must not be used to mutate new help data because it does not understand those records. Back up the current IndexedDB snapshot before reverting a deployed application. There is no automatic destructive data downgrade.

Tests: completion.test.ts covers legacy mapping, malformed extensions, multiple offers, two-account selection, duplicate/role/date failures, withdrawal, closure, intervening bookings, review ownership/reload and plan comparison persistence. Existing 32 tests remain intact. Real mobile/camera, concurrent-tab saves and interactive navigation acceptance remain manual checks. The existing save queue warns on persistence failure; changes remain available in that session. This branch does not introduce multi-tab synchronization.

Deferred: CHG-007 contextual inquiry, CHG-023 comments, CHG-003 pickup disputes, review Delete, attachments, gamification and connected Supabase business rules. No upstream, root app, SQL or deployment changes.
