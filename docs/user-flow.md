# How to use the community lending app

This guide follows the styled app in `frontend/`, available at
http://localhost:3001 when running locally. It explains the current preview's
screens and actions. The separate Supabase functionality frame on port 3000 has
a different handover process; its instructions are in the repository README.

For the hosted link, account setup and reporting instructions, start with [Group
testing](team-testing.md).

## Start with an account

Sign in with your assigned Eric, Sarah, Ben or Maya demo email and password. Credentials
are distributed privately; do not put them in bug reports. For a two-person walkthrough,
use separate browser profiles or devices and sign in as Eric in one and Sarah in the
other. Avoid same-profile tabs for independent accounts until the auth event isolation
issue in the [hosting guide](hosting.md) is fixed.

Changes are saved to Supabase and shared with other testers. Realtime updates refresh
connected sessions. Reload to verify persistence. Login storage is tab-scoped; use
separate browser profiles for different accounts because of the known auth-event issue.
Use **Me → Sign out** when finished. Different deployment URLs can share the same
backend and activity.

## Find your way around

| Tab | What you do here |
| --- | --- |
| Borrow | Find someone else's item and request to borrow it |
| Share | Create and manage your own listings |
| Loans | Follow borrowing and sharing requests through to completion |
| Friends | Manage friend requests, see profiles and open conversations |
| Me | Edit your profile and see your activity summary |

Chats and notifications provide shortcuts to conversations, friend requests and
loan details. You can return to Loans whenever you need to see what happens next.

## Borrow an item

Open **Borrow** and explore the catalog. Search matches the beginning of item
names: for example, `W` suggests items such as Waffle maker and Watering can.
Use category, location and friends filters to narrow your choices. The map is a
schematic overview of the communities, rather than a distance calculation.

Open an item to see its photo, owner, location and description. Press **Borrow**,
choose your receive and return dates, then select a locker location and send the
request. Available communities are Clementi, Toa Payoh and Kent Ridge.

The receive date must be today or later, and the return date must be on or after
it. A conflicting reservation produces a message asking you to choose different
dates. Both endpoints count: a loan ending on a day conflicts with another active
reservation starting that day.

The request appears in **Loans → Pending → Borrowing**. Sending a request does
not immediately give you permission to collect the item; the owner must accept.

## Agree on the exchange plan

The owner finds the incoming request in **Loans → Pending → Sharing**. Opening it
shows the item, dates, duration, location and the other participant. The owner can
**Accept request**, decline it, or edit the plan.

Either participant can propose different dates or a different locker location
before the first owner dropoff. The person making the change approves their own
proposal; the other person must review and approve it. The loan becomes active
once both agree. You can also discuss and modify the plan from its chat card.

Before the owner has dropped off the item, either participant can cancel the
loan. Cancellation asks for confirmation and notifies the other person. Declined
and cancelled requests remain in the Complete section as history. A new request
can be made later.

## Collect and return the item

Open the loan in **Loans → Active**. Its details tell you whose turn it is. The
**Show QR** action appears for the participant responsible for the next handover.
There are four handovers, always in this order:

| Turn | Person | Action | What happens after confirmation |
| --- | --- | --- | --- |
| 1 | Owner | Drop the item off | Borrower can collect it |
| 2 | Borrower | Pick the item up | Item is on loan |
| 3 | Borrower | Return the item | Owner can collect the return |
| 4 | Owner | Collect the returned item | Owner checks its condition |

For each handover:

1. Press **Show QR**. In this preview, select **Use preview code**, then
   **Verify code**. Alternatively, enter the matching handover code or use
   **Scan QR** if your browser supports camera scanning.
2. Check the locker location and number. For dropoff, record the locker number;
   for pickup, the number is taken from the preceding dropoff.
3. Press **Continue to item photo** and add a photo showing the item's condition.
4. Press **Confirm drop-off** or **Confirm pickup**. The success screen confirms
   the recorded handover. Press **Back to loan** to follow its progress.

The code must match this loan and this handover step. Each step needs its own
photo, and the next participant cannot skip ahead. In this styled preview, the
handover is recorded when you confirm the photo; verifying a code alone does
not complete it. Closing an unfinished handover means you need to start that
step again.

Photos accept JPEG, PNG or WebP files up to 5 MB. Camera scanning depends on
browser support and permission; the preview-code/manual-entry option is always
available. These actions simulate the exchange: no physical locker opens.

## Verify the return and leave a review

After the owner's final pickup, the loan shows **Verify condition**. The owner
checks the returned item and chooses either **Returned in good condition** or
**There is an issue to discuss**.

For a good return, press **Verify return** to complete the loan. If there is an
issue, describe it in the notes and verify the return to record the issue. Discuss
it with the borrower in chat, then add a resolution note and press **Mark
resolved**. The loan stays in verification until the issue is resolved.

Once complete, the borrower can choose **Leave a review** in the loan details.
Select a rating from one to five stars and write a review. You may also select
compliments—Great communication, Easy collection and As described—and add an
optional photo. Press **Submit review** to save it. Reviewing is optional; the
completed loan remains complete without one. The current preview accepts one
review per loan and displays it in the loan details.

## Share your own items

Use **Share** to create a listing with its name, description, category, community
location and optional photos. Your listing becomes available for other preview
accounts to discover in Borrow.

You can edit a listing, hide it from the catalog, or relist it later. Hiding a
listing preserves its existing loan history. Incoming requests and the next steps
for lending your items appear under **Sharing** in Loans.

## Stay in touch

In **Friends**, send a request to another person. The recipient can accept or
decline it; the sender can cancel a pending request. You can also remove an
accepted friendship, view another person's profile and listings, or open a chat.

Chats show messages with the other person and cards for your shared loans. Those cards
provide shortcuts to loan details and eligible plan changes. Unread indicators help you
find new messages; opening a thread marks incoming messages as read. Notifications
direct you to the related conversation, loan or friend requests. Messages and notices
are shared activity. Check the recipient’s separate signed-in session to verify
delivery.

## Update your profile or sign out

In **Me**, press **Edit profile** to change your display name, username, community,
bio and optional profile photo. Save to update the profile. The page also shows
your item, completed-loan and friend counts, with shortcuts to your loans and shelf.

Use **Me → Sign out** to end the current tab’s session. Shared listings, messages,
photos and loans remain saved. There is no browser-only reset; coordinate new runs with
teammates and select available dates.

## A suggested first walkthrough

Try Eric borrowing Sarah's Cake stand:

1. As Eric, find Cake stand in Borrow and request future dates and a locker.
2. In Sarah’s session, accept the request in Loans → Pending → Sharing.
3. As Sarah, complete the owner dropoff using the preview code and a photo.
4. In Eric’s session, complete pickup, then return, with a photo for each.
5. In Sarah’s session, collect the return and verify its condition.
6. In Eric’s session, leave an optional review under Loans → Complete.

You can pause after any completed action and reopen the loan later. Its details
show the current stage and the participant responsible for the next step.

## Testing a hosted version

Use https://5d8e7fa9.cs4353-demo.pages.dev/ for the connected candidate at commit
`4e7afab`. The branch alias is
https://feature-database-integration.cs4353-demo.pages.dev/ and follows later successful
branch builds. Production https://cs4353-demo.pages.dev/ remains the older demo until
promotion. See the [hosting guide](hosting.md).

All connected builds using the same Supabase project share activity. Deployments and URL
changes do not reset it.

For a bug report, copy the URL and the version under **Me → About this preview**,
then use the repository's **Demo bug report** template. Include your preview account,
steps, expected and actual results, browser/device and a screenshot if possible.
