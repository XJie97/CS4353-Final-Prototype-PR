# Group testing: connected community lending demo

## Open this version

**Test link:** https://5d8e7fa9.cs4353-demo.pages.dev/  
**Version:** `4e7afab` under **Me → About this preview**.

This is the styled app in `frontend/`, connected to shared Supabase data. No
installation, Cloudflare login or local environment file is needed to use the hosted
preview. The production URL, https://cs4353-demo.pages.dev/, still serves the older
demo; use the test link above for this round.

The [branch preview](https://feature-database-integration.cs4353-demo.pages.dev/)
follows later successful builds. Use the fixed test link above when reporting results so
everyone is testing the same version.

## Get your account

Ask Colin privately for your assigned Eric, Sarah, Ben or Maya email and password. Sign
in with that login; there is no account selector or public signup. Do not paste
passwords into issues, screenshots or shared documents.

Use one account per browser profile or device. To test both sides yourself, use two
separate browser profiles, two different browsers, or two devices. Avoid two tabs in the
same browser profile: there is a known auth-event isolation issue that can show a load
error after another tab signs in or out. If that happens, reload the affected tab and
sign in again if needed. Sign out under **Me** when finished.

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
3. **Sarah:** open the active loan, select **Show QR → Use preview code → Verify
   code**, record a locker number, add an item photo and confirm drop-off.
4. **Eric:** complete pickup, then return, through the same flow. Each handover
   needs its own photo; the pickup locker number comes from the prior drop-off.
5. **Sarah:** collect the returned item, then verify its condition. If reporting
   an issue, add notes; add a resolution note and select **Mark resolved** once
   it is settled.
6. **Eric:** open the completed loan and leave an optional rating and review.
7. Send messages both ways and reload to confirm your completed actions remain.

Use a non-sensitive test photo (JPEG, PNG or WebP, up to 5 MB). Locker actions are
simulated: no physical locker opens, and you can advance without waiting for the
scheduled day. The manual preview code is sufficient; camera scanning is optional.

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

On the fixed version above, the hosted happy path passed: request/approval, four photo
handovers, good-condition return, review, live messages and reload persistence.
Follow-up checks passed for booking conflicts, plan reapproval, cancellation/date
release, issue resolution and photo upload at a 390 × 844 Chrome responsive viewport.

Same-profile tab auth isolation has a known issue; use the workaround above. Physical
phone behavior and camera scanning are not established by the desktop responsive checks.
See the [hosting record](hosting.md#focused-preview-checks) for detailed evidence and
remaining limitations.
