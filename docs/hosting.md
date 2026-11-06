# Cloudflare Pages demo hosting

**Public demo:** https://cs4353-demo.pages.dev/

The connected demo is merged into `main`; Cloudflare builds the app in `frontend/`
for this address. Start with [Group testing](team-testing.md). Historical preview
evidence below remains tied to its original commit and deployment.

Cloudflare Pages project `cs4353-demo` is connected to the private GitHub repository.
Production deploys from `main`; branch builds provide separate preview URLs that share
the configured backend.

## Existing Cloudflare configuration

The Git-connected Pages project already exists. Keep its GitHub integration scoped to
`colinhia/CS4353-Final-Prototype` and use these settings (Production reconfirmed by the release owner on 6 November 2026):

| Setting | Value |
| --- | --- |
| Project name | `cs4353-demo` |
| Production branch | `main` |
| Root directory | `frontend` |
| Framework | Vite |
| Node | 24, from `frontend/.node-version` |
| Build command | `npm ci && npm test && npm run test:rendered && npm run build` |
| Build output | `dist` (relative to the root directory) |
| Preview branches | All non-production branches |
| Access | Public production and preview URLs |

The build command runs `npm ci` explicitly against the frontend lockfile. Cloudflare may
first auto-detect pnpm from the root application; the clean npm install replaces that
dependency tree before testing and building. Both Production and Preview require
`NODE_VERSION=24`, `VITE_SUPABASE_URL=https://ejgvfgvrmcwrixxdvwwt.supabase.co` and
`VITE_SUPABASE_PUBLISHABLE_KEY` matching the ignored `frontend/.env`. Use only the
browser-safe publishable key; never add admin keys or credentials. These are build-time
variables; changes require a new build. Cloudflare supplies `CF_PAGES_COMMIT_SHA`; Vite
embeds its first seven characters in **Me → About this preview**. Local builds without
that metadata show `local`.

## Team workflow

Create a feature branch, push it and open a pull request. Cloudflare must run both
test commands and the production build before publishing its preview. Find the
preview link and deployment status on the pull request. Test that link, then merge
only after checks pass. A push to main runs the same pipeline and updates the
stable production address. A failed build leaves the previous deployment online.
There is no separate GitHub Actions deployment workflow.

Report bugs through GitHub's **Demo bug report** template, including the exact URL and
version. Build errors are in Cloudflare's deployment logs; runtime errors can be
inspected in browser developer tools. Revert a broken release commit through GitHub to
trigger another deployment. Reverting app code does not revert shared database activity.

## Release verification

After initial deployment, verify public access without a hosting account, all five tabs,
direct hash URLs and refresh, static assets and mobile layout. Follow the Eric/Sarah
journey in user-flow.md, reload to check persistence, and compare two independently
signed-in sessions to confirm shared data and realtime updates. Check the deployed
version against the GitHub commit.

Create a disposable test branch and PR, confirm its preview and version, introduce
a deliberately failing test only on that branch, and verify that deployment fails.
Remove the deliberate failure, confirm a successful preview, then merge the
passing change and verify the stable URL updates. Do not introduce a failing test
on main. Record these hosted checks after running them; local tests alone do not
verify the Git integration.

## Shared data and sessions

The connected styled app uses Supabase `demo_*` tables and private `demo-images`
Storage. Production and previews configured with the same project share data. A preview
URL does not isolate its database. Sign in with assigned credentials in separate browser
profiles or devices. The old `4e7afab` build shares auth events between same-profile tabs. The
6 November candidate isolates each client channel while retaining tab-scoped tokens
across reloads. Until that candidate passes hosted acceptance, use separate profiles
or devices for independent accounts. Use **Me → Sign out** when finished. There is no
browser-only reset. Coordinate test dates with teammates; existing reservations block
overlapping dates. Passwords remain in the ignored repository-root `.demo-accounts.txt`
and must be shared privately, never in bug reports or committed guides.

## Current release status

The feature branch was merged into `main` through pull request #6 as `8f7b006`,
including `1692347` (external-scanner QR presentation and preview bypass).
The release owner confirmed Production settings and reported that the feature
preview looked good. The public demo is https://cs4353-demo.pages.dev/.
Check Cloudflare's production build status and the displayed app version to confirm
which commit is live; a Git merge alone is not a deployment-success check.

Both connected migrations are applied, including shared Help requests/offers and
review editing. The four provisioned characters are Eric, Sarah, Ben and Maya.
A main deployment does not reset their shared activity.

### Historical preview deployment: 5 November 2026

Cloudflare settings for both environments were verified on 5 November. Candidate
`4e7afab` deployed successfully at https://5d8e7fa9.cs4353-demo.pages.dev/ in 39 seconds.
Production was then on `6173917`; this is historical context, not the current release
status. The following browser verification records apply to that fixed preview.


## Hosted browser verification: 5 November 2026

Candidate `4e7afab`, deployment `5d8e7fa9`, passed in independently opened Chrome tabs
signed in as Eric and Sarah. Verified Cake stand request (6–8 November, Clementi locker
12), Sarah approval, all four handovers with real private Storage uploads of
`item-placeholder.png`, good-condition verification, and Eric’s review. Loan ID:
`1626b6ba-e8b2-47dd-94bc-7afb1cd8d583`.

Both sessions received shared lifecycle/review changes without manual reloads. Eric’s
message and Sarah’s reply arrived in the other session, with read state. Reloading both
tabs retained identity and messages; Eric’s completed loan, review and signed handover
images remained available and rendered. **Me → About this preview** displayed `4e7afab`.
Synthetic review/messages are marked `[smoke]`; the completed loan and four placeholder
proofs remain in shared test data.

This initial pass verified the successful happy path in desktop Chrome. The follow-up
below covers additional branches. Physical lockers, camera scanning, physical mobile
devices and network failure recovery remain unverified. Production was not promoted.


## Focused preview checks

The follow-up pass used the fixed `4e7afab` deployment above, not production.

| Check | Result |
| --- | --- |
| Phone-sized layout | Profile, item details, request/locker dialogs, conflict error and photo form fit Chrome’s 390 × 844 responsive viewport; physical phone untested |
| Booking conflict | A second Cake stand request for 6–8 November was rejected with “These dates overlap another loan. Choose different dates.” |
| Plan reapproval | After approval, Eric changed Clementi to Toa Payoh; prior approval cleared and Sarah saw Approve plan with no handover action |
| Cancellation | Sarah confirmed cancellation; the loan displayed Loan cancelled, and a new request for the same dates succeeded |
| Sign-out isolation | Reproduced twice: Sarah signed out, Eric remained signed in, then returning to Sarah’s tab showed a load error; reload restored Sign in. Same-profile auth-event isolation is not passed |
| Phone-sized photo upload | Passed file selection, preview and real Storage upload at 390 × 844; Pickup verified shown after recovering the desktop file picker |
| Issue resolution | Passed: owner recorded a synthetic issue, borrower had no review action, owner added resolution, borrower then saw Leave a review |

Focused cancellation loan: `72cff5fe-3880-4f04-9485-62e53ca58720`. Issue-resolution test
loan: `858b4340-65aa-456b-a520-456e3c1751e4` (6–8 November, Clementi locker 12). All
four proofs use the synthetic placeholder. The loan is complete with a `[smoke]`
condition issue and resolution; no review was submitted for this loan. Test records
remain in shared data; no database reset or cleanup was performed.

### Historical auth-event isolation issue (`4e7afab`)

`frontend/src/services/demo.ts` uses `sessionStorage` with the fixed key
`cs4353-connected-auth`. The installed Supabase Auth client also uses that key for its
cross-tab BroadcastChannel and forwards incoming auth events to subscribers. Separate
stored tokens therefore do not guarantee independent auth UI state in tabs from the same
browser profile. Use separate profiles or devices for team testing until the app
isolates those events. Reloading the affected tab restores its own stored session/login
screen. This follow-up does not change app code.


## Release checklist: 6 November 2026

- [x] Implement shared Help post/close/offer/withdraw/select commands, state reads,
      row policies and Realtime publication in a new migration.
- [x] Implement borrower-only review edits with revision checks and retry keys;
      support retained/replacement/removed photos.
- [x] Isolate each auth client's BroadcastChannel while keeping a stable token
      location inside its own sessionStorage. Local tests exercise real Supabase
      Auth clients through independent login, sign-out and reload.
- [x] Retain Help record IDs across uncertain save retries; verify draft preservation,
      pending-state controls and one-record recovery after a lost response.
- [x] Run both app test suites/builds, connected DOM interactions and static rendered checks.
- [x] Rehearse every migration on a disposable Supabase PostgreSQL 17.11 container.
      Its Storage SQL fixture models the tables/functions needed by the migrations;
      managed Supabase rollback tests provide verification against actual Storage RLS.
- [x] Run `shared_demo.sql` and `feature_frame.sql` locally and on managed Supabase;
      all synthetic fixtures roll back.
- [x] Deploy `20261106000100_connected_completion` with its exact source recorded
      atomically in migration history. Existing demo records are preserved.
- [x] Remove branch-added trailing whitespace and fix frontend dependency advisories
      by updating Vite to 8.3.6 and the transitive source-map dependency.
- [x] Release owner confirmed the Cloudflare Production settings and variables on
      6 November 2026. This confirmation was provided by the owner; no browser
      integration or authenticated Cloudflare API was used in this session.
- [x] Release owner reported that the feature preview looked good before merging.
- [ ] Record detailed production results using the [acceptance
      checklist](team-testing.md#production-acceptance-checks-for-the-release-owner).
- [x] Feature branch merged into `main` as `8f7b006`.
- [ ] Confirm the resulting production deployment succeeds and displays the expected version.

`npm test` in `frontend/` now includes connected DOM interactions, so the existing
Cloudflare build command also gates these regressions. These tests use jsdom and
mocked HTTP responses, not a browser or a live database. Database tests remain a
separate rollback-only release check. No browser integration was used for this pass.

Reverting frontend code does not remove Help history, offers or edited reviews from
the shared backend. The new RPCs remain compatible with the previous connected app;
keep additive schema changes in place when reverting frontend code.
