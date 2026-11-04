# CS4353 - Final Prototype

For a screen-by-screen explanation, read [How to use the app](docs/user-flow.md).

## Choose an application

The repository contains two independent React applications. Run commands from
the directory of the application you want. Their accounts and data are separate.

| Application | Directory | Local address | Data and identity |
| --- | --- | --- | --- |
| Styled community preview | `frontend/` | http://localhost:3001 | IndexedDB; switch between Eric, Sarah, Ben and Maya |
| Supabase functionality frame | Repository root | http://localhost:3000 | Hosted database, private Storage and real email/password sessions |

For the styled preview, run `cd frontend`, `npm ci`, then `npm run dev`. No
environment variables are needed. See [preview setup and walkthrough](frontend/README.md).
For the connected frame, follow the instructions below. The preview does not sync
with Supabase. See [current project guide](docs/project-guide.md) for code locations,
workflow differences and verification commands.


A deliberately plain React + TypeScript frame connected to Supabase. The app has
exactly five pages: **Borrow, Share, Loans, Friends, Me**. Item details, chats, QR
handoffs, photos and reviews open within those pages.

## Run locally

Use Node.js 24 (or >=22.12) and pnpm 11.

```sh
pnpm install
cp .env.example .env
# Fill in VITE_SUPABASE_PUBLISHABLE_KEY using the project's publishable key.
pnpm dev
```

Open **http://localhost:3000**. This machine already has the connection in its
ignored `.env`. Groupmates need their own copy. Only the publishable key belongs
in `VITE_` settings; administrator keys and passwords must stay out of the app and Git.

Sign in with one of the administrator-provisioned accounts:
`alice@cs4353.example.test`, `bob@cs4353.example.test`,
`charlie@cs4353.example.test`, or `dana@cs4353.example.test`.
Passwords are supplied privately. These use real Supabase sessions and permissions.
Public signup is disabled in Supabase and is not offered by the app.

For another development project, an administrator can provision the four accounts:

```sh
node scripts/seed-demo-users.mjs --key-file /absolute/path/to/private-key
```

The script writes `.demo-accounts.txt` with private file permissions and does not
reset existing users' passwords. Never commit this file or the administrator key.
Configure Auth's Site URL/allowed redirects for your local or hosted origin.

## Try the frame

1. Sign in as Alice. In **Share**, create an item with category tags and allowed
   lockers. Photos and sprite settings are optional.
2. In **Friends**, send Bob a request. Sign in as Bob and accept it.
3. Bob finds Alice's item in **Borrow** and requests dates and one allowed locker.
   Pending requests reserve those dates immediately; overlapping bookings fail.
4. Alice approves in **Loans**. Use **Get QR → Bypass: simulate locker scan** for
   the owner's dropoff. Save the required photo of the item inside the locker.
5. Bob repeats the bypass and photo for collection, then for return. Alice performs
   the final collection. The loan becomes Returned/Past immediately; her final photo
   and checklist remain required before a review or the next physical handoff.
6. Bob can optionally create, edit or delete a review. In **Friends**, either person
   can start a two-person conversation and send text or an image.
7. **Me** saves profile/avatar and placeholder sprite asset settings.

A borrower may modify a plan before collection; this clears approval and invalidates
old QR challenges. Either participant may cancel before collection, keeping history
and releasing the dates. These rules are also enforced by the database.

## Develop and verify

```sh
pnpm test    # Local unit/component tests; no hosted writes.
pnpm build   # Typecheck and production build.
pnpm preview # Local production preview.
pnpm format
```

Feature services are separate from page components and from the Supabase adapter.
See [architecture and extension points](docs/architecture.md) before changing a
workflow, and [database operations](docs/database.md) for server commands and access rules.

The deployed project is **CS4353 Final Project** (`ejgvfgvrmcwrixxdvwwt`). Migration
`20261030000300_feature_frame.sql` adds this frame without discarding earlier data.
The locker interaction is simulated; real hardware and sprite rendering are future work.

## Collaborate

Create a branch per feature, open a pull request to `main`, and keep changes within
the relevant feature service and subview. Never put real credentials in source code.

## Hosted group testing

See [Cloudflare hosting and preview workflow](docs/hosting.md) for deployment setup,
pull-request testing and bug reports. Try the public demo at **https://cs4353-demo.pages.dev/**.
