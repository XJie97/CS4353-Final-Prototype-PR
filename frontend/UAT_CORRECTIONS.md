# Localhost acceptance corrections

Base: 65875dd416cf3cb3259d025a0e2184bf2eef107b. Remote fork branch was checked and matched that commit before editing. No history was rewritten. No main, upstream, SQL, root-app or deployment files changed.

## Item pages and native dialogs

The user recording task flow 1 shows the rendered Denim Jacket detail page during the reported click failure. Source confirms FriendsPage remained mounted with its profile Modal inside an ancestor hidden by App. Native showModal dialogs enter the top layer and make the remainder of the document inert. Hiding an ancestor did not close the mounted dialog. This is the identified mechanism; an automated browser reproduction was unavailable.

App now passes route activity into FriendsPage. Profile and removal dialogs render only while Friends is active. Leaving Friends unmounts the Modal and its existing cleanup closes the native dialog. Profile ID, search query and mounted list remain in memory; Back/Forward can restore the profile. Marketplace navigation is untouched. No global dialog teardown or accessibility bypass was introduced.

Affected: App.tsx and features/FriendsPage.tsx. Browser acceptance remains required for dialog cleanup/focus restoration and item controls; unit/build results alone do not establish it.

## Help history

HelpPage now defaults to open Community requests. Your request history contains only the active requester's closed/selected records. help-view.ts derives labels from the linked loan: requested, cancelled, declined, active, complete, etc. Closing a request remains distinct from cancelling a loan. Selection/closure remove the request from the feed; cancellation never reopens it. Offers and loan records are retained. Rendering history emits no notifications. Existing domain restrictions still reject late offers, duplicate selections and unauthorized actions atomically.

Affected: features/HelpPage.tsx, app/help-view.ts, app/uat.test.ts. No new persisted fields or migration required.

## Saved-state recovery

Existing loadStore returned fresh preview fallback when decoding failed, after which a new command could overwrite the unreadable snapshot. loadStore now marks recoveryRequired; AppProvider rejects commands and preview reset while this flag is set. The original IndexedDB record remains untouched. Users see a persistent recovery warning. This intentionally does not invent a destructive migration or automatic repair. Export through browser developer tools before manual recovery.

Affected: app/storage.ts and app/context.tsx. Tests cover legacy and extended snapshots, record preservation, invalid decode and the loadStore recovery signal with a controlled IndexedDB test double. Actual browser IndexedDB testing is still unverified.

## Validation and limits

Node 24.22.1: npm test (46 tests), npm run test:rendered, npm run build, git diff --check. See delivered logs for final results. Existing review edit and plan approval tests remain intact; neither feature was rewritten. New tests cover feed/history isolation, owner decline/cancel, borrower cancel, reload, denied selection/withdrawal, unchanged records after failures, and recovery signaling. No dependencies or lockfiles changed.

The existing available browser could not connect to workspace Vite in earlier attempts. No new browser pass is claimed. The recordings are user acceptance evidence of the pre-fix implementation, not proof of the correction. Real phone/camera, focus behavior, all item entry paths and actual IndexedDB reload remain manual acceptance gates.

## Windows localhost retest

1. In the extracted real-fork/frontend directory use Node 24, npm ci, then npm run dev. Type http://127.0.0.1:3001/ directly into the address bar.
2. Eric → Friends → Sarah → Denim Jacket: Back returns to Sarah; open it again and Borrow opens LoanForm. Repeat Cake Stand. Test browser Back/Forward, direct item URL, marketplace grid/map/search entry, keyboard Tab and Escape. No inactive modal should remain in the top layer.
3. Eric posts help; Sarah and another preview owner offer listed items. Eric selects an offer: request leaves Community and appears in Eric's history with linked loan. Cancel as borrower; separately repeat owner decline and owner cancel. Refresh: correct outcome remains, no request returns to the feed, no duplicate notice is generated. Other accounts cannot see Eric's request history.
4. Edit an existing Eric completed-loan review; reload and inspect rating/body. Sarah cannot edit it. Completed status stays unchanged.
5. Eric requests Sarah's Cake Stand; Sarah edits date/locker; Eric sees old/new values and reapproves. Reversed/past dates must be rejected.
6. Use a separate browser profile for storage tests. Run pre-extension version-1 data at the same origin/port, then this version without clearing storage: compare existing loans, review and messages before/after refresh. Add help/offers, reload and compare. With a deliberately corrupt snapshot only in this isolated profile, verify recovery warning, blocked changes and unchanged raw IndexedDB current record. Do not corrupt or reset the user's ordinary profile.

## Git delivery

Remote feature branch matched the base at preflight. Shell push authentication was previously unavailable; per instructions, it was not retried. Apply the delivered correction patches with git am on the existing feature branch at 65875dd, or use this complete checkout. Do not reapply the older implementation patches. Fetch and inspect remote changes before a normal push from an authenticated laptop. No upstream PR was created or updated.
