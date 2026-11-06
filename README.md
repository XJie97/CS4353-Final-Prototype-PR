# CS4353 - Final Prototype

The public community lending demo is **https://cs4353-demo.pages.dev/**.
Cloudflare builds the app in `frontend/` from `main`.

The four seeded characters are **Eric, Sarah, Ben and Maya**. Sign in with your
assigned demo account; passwords are distributed privately. Start with
[Group testing](docs/team-testing.md) for account setup and acceptance checks, or
[How to use the app](docs/user-flow.md) for a screen-by-screen walkthrough.

## Run the current demo locally

Use Node.js 24 or newer:

```sh
cd frontend
npm ci
cp .env.example .env
# Fill in VITE_SUPABASE_URL and the browser-safe VITE_SUPABASE_PUBLISHABLE_KEY.
npm run dev
```

Open **http://localhost:3001**. The current accounts are
`eric@cs4353.example.test`, `sarah@cs4353.example.test`,
`ben@cs4353.example.test` and `maya@cs4353.example.test`.
Public signup is disabled. Never put passwords or privileged keys in Git or
browser configuration. Local and hosted builds configured with the same Supabase
project share records, photos and messages.

## Try Eric and Sarah's journey

1. **Eric:** search for Sarah's **Cake stand** in Borrow, select future dates and
   a locker, then send the request.
2. **Sarah:** accept it under **Loans → Pending → Sharing**. If either person
   edits the dates or locker, the other must approve the new plan.
3. **Sarah:** select **Show QR**. The app displays the code for an external locker
   scanner. Use **Simulate locker scan** to bypass the unimplemented device. The
   scan assigns an available locker, which the app displays; add an
   item-condition photo and confirm drop-off.
4. **Eric:** complete pickup and return through the same flow, with a photo for
   each handover. Each scan assigns the locker to use.
5. **Sarah:** collect the return and verify its condition. Resolve any reported
   issue before the review becomes available.
6. **Eric:** leave an optional review under Complete. You can edit the review and
   retain, replace or remove its photo.
7. Send messages between the accounts and reload to check shared persistence.

Ben and Maya are also provisioned community members with listings and seeded
activity. Existing examples may have changed through team testing. Sign out under
**Me** when finished; signing out does not reset shared data.

## Verify and contribute

Run these commands from `frontend/`:

```sh
npm test              # Domain/service, connected UI and auth checks; no hosted writes.
npm run test:rendered # Route, asset and QR rendering checks.
npm run build         # Typecheck and production build.
```

Create a feature branch and pull request to `main`. Test its Cloudflare preview
before merging. A successful build on `main` updates the public demo.

- [Frontend setup and behavior](frontend/README.md)
- [Project guide and application boundaries](docs/project-guide.md)
- [Database migrations, provisioning and access rules](docs/database.md)
- [Hosting, release checks and historical verification](docs/hosting.md)

## Legacy functionality frame

The root `src/` app is a separate, deliberately plain Supabase functionality frame
on **http://localhost:3000**. It is retained for reference and has its own tables,
loan lifecycle and legacy provisioning script. It is not the public demo.
The Eric/Sarah/Ben/Maya shared dataset belongs to the `frontend/` app's `demo_*`
tables; the root frame does not read those records.

To work on the legacy frame, use Node.js 24 and pnpm 11 from the repository root:

```sh
pnpm install
cp .env.example .env
# Configure the browser-safe Supabase URL and publishable key.
pnpm dev
```

Its architecture is documented in [Feature frame architecture](docs/architecture.md).
Scripts in the root and frontend are not interchangeable: use
`frontend/scripts/provision-demo.ts` for the current shared demo and retain
`scripts/seed-demo-users.mjs` only for legacy-frame development. Provisioning is an
administrator operation; credentials and privileged keys must remain private.
