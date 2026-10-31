# Complete lending prototype implementation plan

> Execute inline, in feature order, and make a separate commit for each completed feature.

**Goal:** Complete the app's borrower/lender flows in the existing frontend.
**Architecture:** Pure typed domain commands, IndexedDB persistence, shared React context, hash navigation, reusable dialogs, feature pages.
**Tech stack:** Existing React 19, TypeScript 6, Vite 8; no framework change.
**Spec:** docs/superpowers/specs/2026-10-31-complete-app-design.md

## Global constraints
- Preserve prefix search, the Borrow design, and the root Supabase app.
- No live messages, accounts, database migrations or physical locker operations.
- Preview state persists across reloads; actor and stage checks apply equally to all UI entry points.
- Keep each feature in a separate commit, with passing frontend checks before committing.

## Review focus
Date boundaries/overlaps; invalid actor or skipped handovers; storage corruption or unavailability; user-uploaded image failures; navigation restoration and stale dialogs.

## Tasks
- [x] Foundation: add app/domain.ts, seed.ts, storage.ts and domain tests. Cover request/plan/role/date transitions first; test serialization and storage errors.
- [x] Borrowing: add app/context.tsx, App.tsx, navigation and shared UI, LoanForm and LoansPage. Wire existing ItemDetails, search and BorrowHome to the shared catalog.
- [x] Communication: add ChatsPage and NotificationsPage with persisted local messages and loan updates; test unread/read behavior and membership.
- [x] Handover: add LockerFlow and condition verification, actor-specific next actions, photo validation and valid preview-code checks. Test all four stages, mismatch and out-of-order actions.
- [x] Community: add ReviewForm, SharePage, FriendsPage and ProfilePage. Test ratings/compliments, listing ownership, edits, friendship transitions and persisted profile changes.
- [x] Integration: run all tests/build, rendered UI checks and available browser verification. Review the whole branch, fix material issues, document demo walkthrough and real-system limitations.


## Verification record
32 frontend tests passed, including the complete two-person lifecycle; eight routed server-rendered views, local assets and QR generation passed. TypeScript and production build passed. Independent review identified routing and corrupt-state defects; both were fixed and regression checks added. The local browser binary is unavailable, so interactive visual/camera verification is still outstanding.
