# Remaining app design
Implement the remaining CS4353 browser prototype, preserving the existing Borrow screen and prefix-search behavior.

The user authorizes inferring missing interactions and requests separate feature commits. Continue directly from merged main (8508850). Use React/TypeScript/plain CSS and existing exported icons. Figma frame inventory includes borrow/date/locker dialogs, pending/active loans, exchange-plan editing, chat list/Sarah conversations, pickup/return QR and locker photos, condition verification, and reviews. Two additional Figma renders were readable (active loans and exchange plan); the remaining new context calls are blocked by the Starter-plan quota. Infer their layouts from those renders, node names, and established tokens; do not claim exact visual matching for blocked frames.

## Scope and architecture
Complete the local browser prototype; keep the pre-existing Supabase application and database untouched. Provide a clear preview account selector so borrower and lender actions can be tested in the same browser. Persist prototype state with IndexedDB, report failures without pretending data was saved, and provide a confirmed reset.

Use a pure command model for catalog items, profiles, friendships, messages, notifications, loan requests, plan approvals, four handover proofs, condition verification and reviews. Reject invalid actor/status transitions, self-borrowing, date conflicts, past/reversed dates, blank messages/reviews, and oversized/invalid images. Do not mutate dates on accepted loans without resetting the other person's approval.

Keep navigation, dialogs, status text, and form validation accessible. Preserve search filters and result scroll on item back-navigation. Use real browser file inputs; locker/QR handovers are explicitly preview interactions and must never imply a physical locker was opened. Generate valid QR if a suitable licensed encoder can be obtained; manual preview-code entry must always work.

## Feature order
1. Typed, tested state and persistence.
2. App shell, navigation, borrowing/date/location requests, loan lists and plan negotiation.
3. In-app chat and notifications linked to loans; no real messages are sent.
4. Four photo-backed handover steps, locker codes, return and condition verification.
5. Reviews, personal listings with photos, friends and profile/account switching.
6. Integration verification and documentation.

## Inferred choices
Share/Friends/Me have no composed screens in the inventory: extend the purple/green design, using existing item cards and profile icons. Use an explicit preview account switch rather than auto-approving another person's actions. Seed examples for pending, ready-to-pick-up and completed loans; new requests remain pending until their owner accepts. Photos and messages stay in this browser. Include clear empty states and recoverable validation errors.

