# Cloudflare Pages demo hosting

Public demo: **https://cs4353-demo.pages.dev/**.

Cloudflare Pages project `cs4353-demo` is connected to the private GitHub repository.
Production deploys from `main`; branch builds provide independent preview URLs.

## One-time setup

In Cloudflare, create a **Pages** project using **Connect to Git** (not Direct
Upload). Install/authorize its GitHub integration for only
`colinhia/CS4353-Final-Prototype`. Use the Free plan and these settings:

| Setting | Value |
| --- | --- |
| Project name | `cs4353-demo`, if available |
| Production branch | `main` |
| Root directory | `frontend` |
| Framework | Vite |
| Node | 24, from `frontend/.node-version` |
| Build command | `npm test && npm run test:rendered && npm run build` |
| Build output | `dist` (relative to the root directory) |
| Preview branches | All non-production branches |
| Access | Public production and preview URLs |

Use npm and the committed package-lock.json for automatic dependency installation.
No Supabase variables or secrets are required. Cloudflare supplies
`CF_PAGES_COMMIT_SHA`; Vite embeds its first seven characters in **Me → About this
preview**. Local builds without that metadata show `local`.

## Team workflow

Create a feature branch, push it and open a pull request. Cloudflare must run both
test commands and the production build before publishing its preview. Find the
preview link and deployment status on the pull request. Test that link, then merge
only after checks pass. A push to main runs the same pipeline and updates the
stable production address. A failed build leaves the previous deployment online.
There is no separate GitHub Actions deployment workflow.

Report bugs through GitHub's **Demo bug report** template, including the exact URL
and version. Build errors are in Cloudflare's deployment logs; runtime errors can
be inspected in browser developer tools. Revert a broken release commit through
GitHub to trigger another deployment. Reverting app code does not revert local
browser data.

## Release verification

After initial deployment, verify public access without a hosting account, all five
tabs, direct hash URLs and refresh, static assets and mobile layout. Follow the
Eric/Sarah journey in user-flow.md, reload to check persistence, and compare two
browsers to confirm independent data. Check the deployed version against the
GitHub commit.

Create a disposable test branch and PR, confirm its preview and version, introduce
a deliberately failing test only on that branch, and verify that deployment fails.
Remove the deliberate failure, confirm a successful preview, then merge the
passing change and verify the stable URL updates. Do not introduce a failing test
on main. Record these hosted checks after running them; local tests alone do not
verify the Git integration.

## Browser data

Each origin has its own IndexedDB state. Production, branch previews and individual
preview URLs may show different progress. Deploying does not reset saved data.
Use **Me → Reset preview data** and confirm only when you want to erase that
browser origin's demo changes. Other groupmates' data is independent.
