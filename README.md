# CS4353 - Final Prototype

Shared repository for the CS4353 final prototype.

## Getting started

The starter is a React + TypeScript app built with Vite and connected to Supabase.
Use Node.js 24 (or a supported version >=22.12) and pnpm 11.

```sh
pnpm install
cp .env.example .env
# Fill in VITE_SUPABASE_PUBLISHABLE_KEY in .env using the project's publishable key.
pnpm dev
```

Open **http://localhost:3000**. This machine already has the connection configured
in the ignored `.env`. Groupmates need their own copy of that configuration. Only
the publishable client key belongs in `VITE_` settings; privileged keys stay out of
the app. Configure Supabase Auth's Site URL/allowed redirects for
`http://localhost:3000` during local development and your actual origin before hosting.

Create an account, confirm the email if requested, and sign in. A second groupmate
can create an account so you can send/accept friend requests and try lending.

## React starter

- Community shelf and personal shelf, with search and availability filters.
- Supabase email/password signup, confirmation guidance, sign-in, and sign-out.
- Item creation, photo uploads, and named locations with coordinates.
- Friend discovery, request acceptance, and two-person chat records.
- Loan booking with date-overlap feedback, temporal filters, four verification
  uploads, and borrower reviews with optional images and fixed compliments.
- Profile/avatar editing and placeholder user/item sprite configuration.

Chat messaging and actual sprite artwork are intentionally left for the next
iteration. Data is loaded from the existing schema; the UI has no seeded demo
records. Use the refresh button to pick up changes made in another session.

```sh
pnpm test    # Frontend unit/component tests; does not write to Supabase.
pnpm build   # Typecheck and production build.
pnpm preview # Preview the production build locally.
```

The frontend tests mock Supabase for auth/form behaviour. The browser smoke check
verifies the live connection and signed-out desktop/mobile layouts. A full
authenticated, two-account handover with real image uploads still needs to be run
with your own accounts. No user accounts are created automatically by the app setup.

## Database

The Supabase schema supports profiles, sprites, two-user chats and friendships,
item locations and images, and non-overlapping dated loans with four verification
images and borrower reviews. See [database setup and app operations](docs/database.md).
The schema is deployed to the **CS4353 Final Project** Supabase project
(`ejgvfgvrmcwrixxdvwwt`). Migration `20261030000200` implements the revised model;
database integration checks passed on 30 October 2026.

## Collaboration

- Create a branch for each feature or fix.
- Open a pull request to merge changes into `main`.
- Use GitHub Issues to track tasks and bugs.
- Keep passwords, API keys, and other secrets out of the repository.
