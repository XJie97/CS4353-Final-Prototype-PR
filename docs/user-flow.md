# How to use the community lending app

This guide follows the styled app in `frontend/`, available at
http://localhost:3001 when running locally. It explains the current preview's
screens and actions. The separate Supabase functionality frame on port 3000 has
a different handover process; its instructions are in the repository README.

## Start with an account

Choose Eric, Sarah, Ben or Maya using **Preview account** above the bottom
navigation. Switching accounts lets you experience both sides of an exchange:
the owner shares an item, and the borrower receives and returns it.

Your changes are saved in this browser. Reloading normally restores your progress.
Another device or browser will have its own preview. If a storage warning appears,
keep the tab open because your latest changes may only last for that session.

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

Chats show messages with the other person and cards for your shared loans.
Those cards provide shortcuts to loan details and eligible plan changes.
Unread indicators help you find new messages; opening a thread marks incoming
messages as read. Notifications direct you to the related conversation, loan or
friend requests. Messages and notices are local preview activity, so use account
switching in this browser to see the recipient's view.

## Update your profile or start again

In **Me**, press **Edit profile** to change your display name, username, community,
bio and optional profile photo. Save to update the profile. The page also shows
your item, completed-loan and friend counts, with shortcuts to your loans and shelf.

To restart the demonstration, choose **Reset preview data** in Me and confirm.
This restores the sample accounts and removes the listings, photos, messages,
reviews and loan changes saved in this browser's preview. This cannot be undone.

## A suggested first walkthrough

Try Eric borrowing Sarah's Cake stand:

1. As Eric, find Cake stand in Borrow and request future dates and a locker.
2. Switch to Sarah and accept the request in Loans → Pending → Sharing.
3. As Sarah, complete the owner dropoff using the preview code and a photo.
4. Switch to Eric and complete pickup, then return, with a photo for each.
5. Switch to Sarah, collect the return and verify its condition.
6. Switch to Eric and leave an optional review under Loans → Complete.

You can pause after any completed action and reopen the loan later. Its details
show the current stage and the participant responsible for the next step.
