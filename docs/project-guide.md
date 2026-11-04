# Current project guide

Updated 4 November 2026 after pulling main at `25ddeaa`.

## Application boundaries

The root `src/` application is the plain Supabase functionality frame. The
`frontend/src/` application is a styled, local community lending preview. Starting
one does not start the other. They have separate package manifests, lockfiles,
models, accounts, routes and persistence. Preview activity never reaches Supabase.

| Task | Supabase frame, repository root | Styled preview, `frontend/` |
| --- | --- | --- |
| Install | `pnpm install` | `npm ci` |
| Start | `pnpm dev` (port 3000) | `npm run dev` (port 3001) |
| Configure | `.env` URL and publishable key | No environment variables |
| Identity | Real Supabase sessions; private demo credentials | Preview account selector |
| Tests | `pnpm test` | `npm test` and `npm run test:rendered` |
| Build | `pnpm build` | `npm run build` |

Use Node.js 24 for both. Root dependencies use pnpm; the preview uses npm's
committed `package-lock.json`. Never place a privileged key in browser configuration.

## Styled preview code map

| Location under `frontend/src/` | Responsibility |
| --- | --- |
| `App.tsx`, `app/routes.ts` | Hash routing, five primary tabs, chats/notifications and modal flows |
| `app/domain.ts` | Types, commands, permission checks, booking and handover rules |
| `app/context.tsx` | Applies commands, publishes state and serializes saves |
| `app/storage.ts` | Validates saved state; IndexedDB database `cs4353-preview`, store `state`, key `current` |
| `app/seed.ts` | Eric, Sarah, Ben, Maya and initial examples |
| `app/images.ts` | Local photo validation/resizing |
| `pages/borrow/` | Catalog, prefix search, filters, item details and schematic map |
| `features/` | Listings, friends, profiles, loans, reviews, chats, notifications and locker interactions |
| `components/ui/` | Shared controls, photo input and QR rendering |
| `vendor/qrcodegen.ts` | Vendored QR encoder; license in `public/third-party-licenses.txt` |

Change business rules in `applyCommand` and cover the changed behavior in domain
or integration tests. Change layout in the relevant feature and CSS file. Changing
stored fields requires updating the Store type, decoder, seed and persistence
compatibility together. The decoder currently accepts version 1; invalid saved
state opens a fresh preview with a warning.

The preview saves a whole state snapshot through a queued IndexedDB write. It
has no cross-device or cross-tab synchronization. Browser storage failure leaves
session-only state and a visible warning. Reset replaces that origin's preview
state after confirmation.

## Workflow differences to preserve explicitly

| Behavior | Supabase frame | Styled preview |
| --- | --- | --- |
| Locations | Ten fixed lockers; multiple allowed per item | Clementi, Toa Payoh and Kent Ridge |
| Requests | Accepted friendship required | Listed items from another owner |
| Plan changes | Borrower edits before pickup; owner reapproves | Either participant edits before owner dropoff; other participant reapproves |
| Cancel | Before borrower pickup | Before owner dropoff |
| Handover | Scan advances state, then a separate pending photo | Matching preview code, locker number and photo recorded together |
| Final return | Owner scan immediately marks Returned/Past; evidence still required | Owner pickup enters verifying; good condition or issue resolution completes loan |
| Review | Optional text/compliments/image; author edit/delete | One borrower submission with rating 1–5, text, compliments and optional photo |
| Chat | Separate two-person chat records, images and Realtime | Local person-to-person text threads; optional loan references |
| Date conflicts | Inclusive reservations retained except cancelled loans | Inclusive conflicts exclude complete, declined and cancelled loans |

These are implemented differences, not a shared contract. A future integration
must reconcile them before replacing local commands with server calls. In
particular, account switching is not authentication, and preview permission checks
are not a server security boundary. QR codes are simulated handover identifiers;
physical locker hardware is not connected.

## Verification and further work

Run each application's commands in its own directory. Preview tests cover domain,
community, communication, routing, handover and serialized complete journeys.
Rendered checks render routes, check asset references and generate a QR matrix;
they do not establish browser layout or physical camera compatibility. For a manual
journey, follow `frontend/README.md` using its Preview account selector.

Root database coverage lives in `supabase/tests/feature_frame.sql` and rolls back
its fixtures. `docs/database.md` documents that schema and its existing deployment;
pulling frontend changes does not deploy a database migration. The historical
`supabase/tests/lending.sql` targets the earlier workflow.

Before connecting the styled preview to Supabase, agree on one lifecycle and data
model, introduce an API adapter for its commands, replace account switching with
real sessions, migrate local image handling to private Storage, and verify access
rules on the server. The current task updates documentation only.
