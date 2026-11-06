# Group testing: connected community lending demo

## Open the current demo

**Public demo:** https://cs4353-demo.pages.dev/

Cloudflare builds the connected styled app in `frontend/` from `main`. The feature
branch was merged as `8f7b006`, including the external-scanner QR flow in `1692347`.
No installation, Cloudflare login or local environment file is needed. Record the
actual version shown under **Me → About this preview** when testing; deployment
completion is separate from the Git merge.

Use branch preview URLs when testing future unmerged changes. The fixed
https://5d8e7fa9.cs4353-demo.pages.dev/ (`4e7afab`) is a historical verification build,
not the current team-testing destination.

## Get your account

Ask Colin privately for your assigned Eric, Sarah, Ben or Maya email and password. Sign
in with that login; there is no account selector or public signup. Do not paste
passwords into issues, screenshots or shared documents.

Eric, Sarah, Ben and Maya are the four seeded characters. To test both sides,
sign in to separate tabs, browser profiles or devices. Each current tab stores its
own session and uses an isolated auth channel. Sign out under **Me** when finished.
The older `4e7afab` build had a cross-tab auth issue; that warning applies to the
historical build, not the implementation now merged into `main`.

Coordinate account use and borrowing dates with the group. Everyone shares the same
data, including listings, messages, photos and loans. Changing URLs, clearing browser
storage or signing out does not reset that data. Existing `[smoke]` messages/reviews and
placeholder photos belong to the previous verification runs.

## Try the Eric/Sarah journey

Have one person use Eric and another use Sarah, or use separate browser profiles. Use
future dates that do not conflict with another tester’s reservation.

1. **Eric:** in Borrow, search for **Cake stand**, open Sarah’s listing, choose
   dates and a locker, then send the request.
2. **Sarah:** open **Loans → Pending → Sharing** and accept Eric’s request.
   If either person edits the dates or locker, the other must approve again.
3. **Sarah:** open the active loan, select **Show QR → Simulate locker scan**, record a locker number, add an item photo and confirm drop-off.
4. **Eric:** complete pickup, then return, through the same flow. Each handover
   needs its own photo; the pickup locker number comes from the prior drop-off.
5. **Sarah:** collect the returned item, then verify its condition. If reporting
   an issue, add notes; add a resolution note and select **Mark resolved** once
   it is settled.
6. **Eric:** open the completed loan and leave an optional rating and review.
7. Send messages both ways and reload to confirm your completed actions remain.

Use a non-sensitive test photo (JPEG, PNG or WebP, up to 5 MB). Locker actions are
simulated: no physical locker opens, and you can advance without waiting for the
scheduled day. The app displays the QR for an external locker scanner;
**Simulate locker scan** bypasses that device in this preview.

For other screens and actions, see the [full walkthrough](user-flow.md).

## Other useful things to try

- Browse and filter items; check the page on your usual phone/browser.
- Add a clearly named test listing, upload a photo, edit it, and hide it afterward.
- Send a friend request and accept or decline it from the other account.
- Change a loan plan and check that reapproval is required.
- Cancel before the owner drops off the item and check the other account’s view.

Avoid changing another tester’s in-progress loan. Label test listings and messages with
`[test]` so the group can identify them later. There is no self-service data reset;
coordinate cleanup with Colin.

## Report what happened

Use the repository’s **Demo bug report** issue template. Include:

- The exact preview URL and version.
- Your account name (Eric/Sarah/Ben/Maya), browser, device and screen size.
- The steps, expected result and actual result.
- The item/loan and dates involved, plus a screenshot if useful.

Do not include passwords, session tokens or private image links copied from network
tools. Record successful checks too, so the group knows what was covered.

## What has already been checked

On the historical `4e7afab` version, the hosted happy path passed: request/approval, four photo
handovers, good-condition return, review, live messages and reload persistence.
Follow-up checks passed for booking conflicts, plan reapproval, cancellation/date
release, issue resolution and photo upload at a 390 × 844 Chrome responsive viewport.

Same-profile tab auth isolation failed on `4e7afab`; use separate profiles/devices for that historical build. The merged demo includes a fix verified with real Supabase Auth clients in local DOM tests. Your hosted acceptance test must still confirm it in a browser. Physical
phone behavior and integration with a physical locker scanner remain unverified.
See the [hosting record](hosting.md#focused-preview-checks) for detailed evidence and
remaining limitations.


## Production acceptance checks for the release owner

The release owner reported that the feature preview looked good and merged it to
`main`. The checklist below remains useful for confirming the resulting production
deployment and future releases; individual results have not been separately recorded.

The 6 November release adds shared Help requests/offers, borrower review
editing (including replacement/removal of photos), and isolated tab auth channels.
The database migration is applied and the frontend changes are merged into `main`.
Use the public demo after its production build passes, or a branch preview for
future changes. Record the exact displayed version before testing.

- [ ] Confirm the deployment version matches the deployed `main` commit.
- [ ] Repeat the Eric/Sarah journey, chat, reload and phone layout checks above.
- [ ] Post a Help request; offer a listed item from another account; select it.
      Confirm exactly one pending loan and selected request history after reload.
- [ ] Withdraw an offer and offer again; close a request; reject an overlapping booking.
- [ ] Edit a completed review; retain, replace and remove its photo; reload each result.
- [ ] Sign different accounts into two same-profile tabs. Sign out of one and confirm
      the other retains its account and can load/save. Reload both tabs.
- [ ] Exercise a failed save and retry; confirm the draft survives and no duplicate
      request/offer/loan appears.

Hosted browser acceptance is intentionally reserved for the release owner. The local
and database checks do not mark these boxes complete.
