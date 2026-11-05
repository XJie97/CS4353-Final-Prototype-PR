# Current project guide

Updated 5 November 2026 for connected styled candidate `4e7afab`.

## Application boundaries

The root `src/` application is the plain Supabase functionality frame. The
`frontend/src/` application is a styled, connected community lending preview. Starting
one does not start the other. They have separate package manifests, lockfiles, models,
accounts, routes and persistence. The styled app uses separate `demo_*` tables in the
same Supabase project.

| Task | Supabase frame, repository root | Styled preview, `frontend/` |
| --- | --- | --- |
| Install | `pnpm install` | `npm ci` |
| Start | `pnpm dev` (port 3000) | `npm run dev` (port 3001) |
| Configure | `.env` URL and publishable key | `frontend/.env` URL and publishable key |
| Identity | Real Supabase sessions; private demo credentials | Real Supabase sessions; Eric/Sarah/Ben/Maya credentials |
| Tests | `pnpm test` | `npm test` and `npm run test:rendered` |
| Build | `pnpm build` | `npm run build` |

Use Node.js 24 for both. Root dependencies use pnpm; the preview uses npm's
committed `package-lock.json`. Never place a privileged key in browser configuration.

## Styled preview code map

| Location under `frontend/src/` | Responsibility |
| --- | --- |
| `App.tsx`, `app/routes.ts` | Hash routing, five primary tabs, chats/notifications and modal flows |
| `app/domain.ts` | Types, commands, permission checks, booking and handover rules |
| `app/context.tsx` | Loads shared state, submits commands, observes sessions and Realtime |
| `app/storage.ts` | Legacy local snapshot utilities; not connected runtime persistence |
| `services/demo.ts` | Supabase session, command RPC, signed images, uploads and Realtime adapter |
| `app/seed.ts` | Eric, Sarah, Ben, Maya and initial examples |
| `app/images.ts` | Local photo validation/resizing |
| `pages/borrow/` | Catalog, prefix search, filters, item details and schematic map |
| `features/` | Listings, friends, profiles, loans, reviews, chats, notifications and locker interactions |
| `components/ui/` | Shared controls, photo input and QR rendering |
| `vendor/qrcodegen.ts` | Vendored QR encoder; license in `public/third-party-licenses.txt` |

Change pure domain behavior and its tests together. Connected authorization and
lifecycle transitions are also enforced by `demo_command` in migration
`20261105000100_shared_demo.sql`; a client-only change does not update server rules. The
adapter calls `demo_state` and `demo_command` and refreshes on Realtime changes. Photos
upload to private `demo-images` Storage and display through signed URLs.

Auth uses sessionStorage per tab, but Supabase auth events currently broadcast across
same-profile tabs under the common storage key. Use separate browser profiles or devices
for independent accounts until that isolation issue is fixed. All builds configured with
the same backend share activity; sign-out ends a tab’s session and does not erase shared
records. No browser-only reset exists.

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
| Chat | Separate two-person chat records, images and Realtime | Shared person-to-person text threads with Realtime; optional loan references |
| Date conflicts | Inclusive reservations retained except cancelled loans | Inclusive conflicts exclude complete, declined and cancelled loans |

These lifecycles remain separate and are enforced in their corresponding server
commands. QR codes simulate handovers; physical locker hardware is not connected.

## Verification and further work

Run each application's commands in its own directory. Preview tests cover domain,
community, communication, routing, handover and serialized complete journeys. Rendered
checks render routes, check asset references and generate a QR matrix; they do not
establish browser layout or physical camera compatibility. For a manual journey, follow
`frontend/README.md` using separate Eric and Sarah signed-in sessions.

Root database coverage lives in `supabase/tests/feature_frame.sql` and rolls back
its fixtures. `docs/database.md` documents that schema and its existing deployment;
pulling frontend changes does not deploy a database migration. The historical
`supabase/tests/lending.sql` targets the earlier workflow.

The connected styled migration is applied and the hosted happy path at `4e7afab` passed
in separate Eric/Sarah Chrome tabs. See [hosting](hosting.md) for deployment,
verification evidence and remaining camera/mobile checks. Production remains the older
demo until an explicitly approved promotion to main.
