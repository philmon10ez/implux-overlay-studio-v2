# Infrastructure security audit

**Date:** 11 November 2026  
**Limit:** Railway service inventory was read. Variable **values** were not requested. Vercel project settings were not opened through the Vercel API. GitHub Actions are absent. No deploys were performed.

## Railway

Three projects are visible in the connected account.

### Production — project `adventurous-inspiration`

Environment `production` only.

| Service | Role inferred from repo URLs and names | Source | Region | Latest deployment seen |
| --- | --- | --- | --- | --- |
| `stunning-friendship` | Shopify app. Public host in toml: `stunning-friendship-production.up.railway.app` | `philmon10ez/implux-overlay-studio-v2` branch `main` | us-east4 | 23 July 2026, success |
| `implux-overlay-studio` | Backend. Public API name in code: `api.implux.io` | same repo, `main` | us-west2 | 23 July 2026, success |

No volumes, buckets, or shared variables in that environment. One replica each. Both services are on the public internet. That is required for Shopify and for the admin API. The database is not a Railway service; it is Supabase.

### Staging — project `stunning-essence`

| Environment | Services |
| --- | --- |
| `staging` | `implux-overlay-studio-v2` from branch `staging-setup`, us-west2, deployment 7 November 2026, success. `poptek-shopify-staging`, us-west2, no deployment status returned. |
| `production` inside this same project | Empty. No services. |

Staging backend host used by the Vercel rewrite and by `stagingProcessGuard.server.js`: `implux-overlay-studio-v2-staging.up.railway.app`.

Staging Shopify host in toml: `poptek-shopify-staging-staging.up.railway.app`.

The empty production environment inside the staging project is a foot-gun if someone later adds a service there and points it at production secrets. It is empty today.

### Other — project `overflowing-growth`

Service `implux-commission-tracker` in that project’s production environment. It is not part of the overlay schema that was audited. It should not share the overlay database password. That separation was **not** verified, because variable values were not read.

## Process model

Backend `railway.json` / `nixpacks`: start `node backend/server.js`, restart on failure. That file loads `createApp()` from `app.js`, not `src/index.js`.

`backend/src/index.js` is an old stub with `cors({ origin: true, credentials: true })` and no routes beyond `/health`. It is not the start command. Do not point a service at it.

Shopify `railway.json` uses a Dockerfile. The package start script runs Prisma generate and `@remix-run/serve`. Node engine on the Shopify app is `>=20`. The backend `package.json` does not pin Node. The live Node image was not read from Railway.

No container runs as a declared non-root user in the Railway JSON. The Dockerfile was not fully reviewed for `USER`. Treat container hardening as unverified.

Health: backend `GET /health` returns `{ ok: true, service: 'implux-backend' }` with no authentication. Shopify has a `health` route. These are appropriate for a load balancer and should not grow to return env or database state.

## Environment separation

Code intent is sound:

- `APP_ENV` is `development`, `preview`, `staging`, or `production`. If it is missing on Railway, `resolveAppEnv` **defaults to production** and logs a warning. A staging service with a forgotten `APP_ENV` will think it is production and will enable Rakuten sync and email by default.
- `databaseGuard` refuses a `DATABASE_ENV_ID` that disagrees with `APP_ENV`. If the id is missing, staging only warns (F-016).
- Merchant sync and compliance forward refuse the production API host when `APP_ENV` is staging or preview.
- Frontend staging builds refuse `VITE_API_URL` that contains `api.implux.io`, and they call same-origin `/api` so the cookie stays first-party.
- Local staging Shopify process (`POPTEK_STAGING_LOCAL=1`) checks the staging client id, staging database ref, and staging origins.

What was not verified: the actual Railway variables. Operator checklist (read names and host markers only; do not paste values into chat):

1. On production backend and production Shopify: `APP_ENV=production`, `DATABASE_ENV_ID=production`, `DATABASE_URL` host contains `rpggayuuxnzdqybnmxyu` and does not contain `draguoqqidihfxovxfss`.
2. On staging backend and staging Shopify: `APP_ENV=staging`, `DATABASE_ENV_ID=staging`, `EXPECTED_DATABASE_HOST_MARKER=draguoqqidihfxovxfss`, URL contains that ref and not the production ref.
3. `MERCHANT_SYNC_SECRET`, `JWT_SECRET`, `SHOPIFY_API_SECRET`, and `SMTP_PASS` differ between staging and production.
4. `SHOPIFY_API_KEY` on staging is the staging client id, not `bfcae2d7ecd83eb4fc96749fb543380c`.
5. Production `FRONTEND_URL` is `https://admin.implux.io` (or the real admin origin), not a `*.vercel.app` preview.
6. Staging `IMPLUX_BACKEND_URL` is the staging Railway host, not `https://api.implux.io`.
7. `OPENAI_API_KEY` is unset on staging until F-018 is accepted.
8. `COMPLIANCE_WEBHOOK_DEBUG` is unset or false.

Rollback: Railway keeps previous deployments. This audit did not perform a rollback. There is no documented infra runbook in the repo beyond deploy scripts.

## Vercel

`overlay-studio/frontend/vercel.json` builds the Vite app and rewrites `/api/*` to `https://implux-overlay-studio-v2-staging.up.railway.app/api/*`. That file is a **staging** proxy. It has no security headers.

Admin origins in code:

- Production: `https://admin.implux.io`
- Staging: `https://admin-staging.implux.io`
- Staging also allows `https://implux-overlay-studio-staging` and preview hashes on `vercel.app` (`app.js` `STAGING_VERCEL_ADMIN_ORIGIN`)

The production Vercel project’s password protection, preview exposure, and headers were **not** inspected. Source maps are not enabled in `frontend/vite.config.js`. `VITE_*` variables are the only ones the client bundle can see. No Supabase or Shopify secret prefix is referenced from `frontend/src`.

Caching: the SPA rewrite serves `index.html` for non-asset routes. API responses are proxied. There is no cache-control override in the repo. Authenticated JSON should be sent with `Cache-Control: no-store` from the API. That header is not set today (related to F-014).

## GitHub

Remotes:

- `origin`: `https://github.com/philmon10ez/implux-overlay-studio-v2.git` (`main`, `staging`, `staging-setup`)
- `old-implux-overlay-studio`: `https://github.com/philmon10ez/implux-overlay-studio.git`

No workflow files, so there are no unpinned third-party actions and no `GITHUB_TOKEN` workflow permissions to review. There is also no CI secret scanning. Railway deploys on push to the tracked branch. A merge to `main` deploys production. That is the change-control risk.

Finding **F-001**: `overlay-studio/shopify-app/.env` was added in `cfd6032a` (14 March 2026) and removed in `b10ceaa2` (11 April 2026). The add commit is contained in `origin/main`. The file held a production database URL. It is not in `HEAD`. Rotating the password matters more than rewriting history. If the old GitHub repo `implux-overlay-studio` was ever pushed with the same commit, rotate on that assumption too. This audit did not walk the old remote’s objects.

Current gitignore:

- `overlay-studio/backend/.gitignore` ignores `.env`
- `overlay-studio/shopify-app/.gitignore` ignores `.env`, `.env.staging`, and `env/staging/.env`
- `overlay-studio/frontend/.gitignore` ignores `.env*.local`

`git ls-files` tracks only the three `.env.example` templates. Those templates use placeholders.

Local untracked env files exist and contain real project refs (see the database report). They must stay untracked.

## Secrets inventory (no values)

| Category | Where | Exposure | Action |
| --- | --- | --- | --- |
| Production database URL | Git history `cfd6032a` `shopify-app/.env` | Confirmed committed, later removed from the tree, still in history | Rotate. F-001. |
| Production database URL | Local `overlay-studio/backend/.env` | Gitignored, present on disk | Keep untracked. Replace after rotation. |
| Staging database URL | Local `shopify-app/.env.staging` and `env/staging/.env` | Gitignored | Keep untracked. Use a long random password if the current one is human-chosen. |
| Shopify API secret, JWT, merchant sync secret, SMTP, OpenAI, Rakuten | Env templates only, as `replace_me` or empty | Not in git templates | Confirm they exist only in Railway, split by environment. Values not read. |
| Admin seed password | `backend/prisma/seed.js` | In source | F-003. Rotate the live user. |
| Shopify client ids | Toml files | Public by design | None. |
| Test tokens `shpat_test`, `shpat_old` | Unit tests | Fake | None. |
| Supabase service-role key | Source search | Not found | Confirm it is not in Railway frontend or the theme bundle. |

Do not send these values to an external scanner. The classification above used local git and file-host checks that printed only match categories. One command accidentally echoed a URL because PowerShell’s `-match` on an array returns the line; that value is omitted here and is a reason to rotate rather than a value to copy.

## Dependency and supply chain

`npm audit` was run read-only on 11 November 2026. Nothing was upgraded or rewritten.

| Package tree | Critical | High | Moderate | Low | Runtime note |
| --- | --- | --- | --- | --- | --- |
| `overlay-studio/backend` | 2 | 7 | 6 | 0 | Express `body-parser` is on the request path. `proxy-addr` is not, because `trust proxy` is unset. `tar` is install-time via bcrypt’s native build. |
| `overlay-studio/shopify-app` | 2 | 31 | 16 | 5 | Remix, Prisma 6, and nodemailer run in production. Vite advisories are dev or build. |
| `overlay-studio/frontend` | 2 | 10 | 9 | 1 | Critical findings are Vitest and tinypool, dev-only. The deployed site is static. |

Details and the “do not call this RCE” limit are in finding **F-017**.

There is no Dependabot config in the application repo (only inside `node_modules`, which does not count). Lockfiles are present for the three apps. Shopify postinstall and start run `prisma generate`. Backend postinstall runs `prisma generate`. Those scripts are expected and are not a third-party install hook beyond npm’s own lifecycle.

## Logging and recovery

- Sync and compliance logs include shop domains, not tokens, in the code that was read.
- Startup logs the last four characters of the Shopify API key (F-013).
- No central audit log, alerting, or on-call runbook was found in the repo.
- Database backup restoration was not tested.
- Railway rollback was not tested.

## Public exposure to reduce later

Not a reason to take the API offline. These are restrictions to add after P0:

- Revoke Data API grants (database report) so the public Supabase URL is useless even if RLS is toggled.
- Put the backend and Shopify app on the existing custom domains only, and avoid sharing `*.up.railway.app` more widely than Shopify’s redirect list requires. The railway host is already the OAuth callback, so it stays public.
- Do not publish the commission-tracker service on the same database.
- Turn off Vercel preview comments and public preview URLs for the admin project until previews are access-controlled. Unverified in the dashboard.
