# Poptek staging environment

This document describes how **production** and **staging** are separated for the Poptek (Implux Overlay Studio) platform, and what remains to be done in **Phase 2B** (infrastructure).

Phase 2A changed **repository files only**. Nothing has been deployed, pushed, or merged as part of that work unless you do so explicitly afterward.

---

## Architecture

Poptek is a three-service monorepo under `overlay-studio/`:

| Service | Folder | Production host (planned) | Staging host (Phase 2B) |
|---------|--------|---------------------------|-------------------------|
| Admin API | `backend/` | `https://api.implux.io` | `https://api-staging.implux.io` |
| Admin UI | `frontend/` | `https://admin.implux.io` | `https://admin-staging.implux.io` |
| Shopify embedded app | `shopify-app/` | Railway (`stunning-friendship-production…`) | New Railway service (URL TBD) |

Both backend and Shopify app share **one PostgreSQL database per environment** (`DATABASE_URL` must match within an environment, never across environments).

---

## Shopify apps

Two separate Shopify Partner applications exist:

| | Production | Staging |
|---|------------|---------|
| **Name** | Poptek by Implux (App Store) | Existing custom/staging app |
| **Client ID** | `bfcae2d7ecd83eb4fc96749fb543380c` | `786f52ea5cd6c4e9c95a835dfecd2ecb` |
| **CLI config** | `shopify.app.production.toml` | `shopify.app.staging.toml` |
| **API secret** | Set only in Railway (never committed) | Set only in Railway (never committed) |

Legacy files `shopify.app.toml` and `shopify.app.implux.toml` are **deprecated mirrors** of production. Use the environment-specific TOML files for deploys.

### Scopes

Production and staging TOML files include:

`read_products, write_script_tags, read_orders, write_themes, read_themes`

These match the current production TOML. The optional feature **Open Campaigns** (`IMPLUX_DASHBOARD_ALLOWED_EMAILS`) uses the GraphQL `currentStaffMember` query, which requires the additional scope `read_users`. Add it to **both** TOML files and reinstall the app if you enable that allowlist.

### Staging TOML placeholders

Until Phase 2B creates the staging Railway Shopify service, `shopify.app.staging.toml` uses non-routable placeholder URLs (`STAGING-SHOPIFY-APP-URL-NOT-CONFIGURED.invalid`). Update this file with real staging URLs before running `npm run deploy:staging`.

---

## Git workflow (intended)

```
feature/*  →  PR  →  staging  →  test on staging  →  PR  →  main  →  production
```

- **`staging-setup` / feature branches**: repository isolation work and new features.
- **`staging`**: deploy branch for staging infrastructure (Phase 2B).
- **`main`**: production deploy branch.

Never run generic `npm run deploy`. Always choose an explicit environment.

---

## Deployment commands

All commands below are run from `overlay-studio/shopify-app/` unless noted.

### Shopify theme extension (build only — does not deploy)

Production proxy URL (for local verification / pre-deploy build):

```bash
npm run build:extension:production
```

Staging proxy URL (**requires** explicit URL):

```bash
POPTEK_PROXY_URL=https://api-staging.implux.io/proxy npm run build:extension:staging
```

Theme extensions cannot read runtime environment variables on the storefront. The build script injects `PROXY_URL` into `extensions/overlay-engine/assets/overlay-engine.js`. Staging builds **fail** if `POPTEK_PROXY_URL` targets `api.implux.io`.

### Shopify app deploy

**Staging:**

```bash
npm run deploy:staging
```

**Production (LIVE App Store app — requires deliberate confirmation):**

```bash
CONFIRM_PRODUCTION_DEPLOY=YES npm run deploy:production
```

### Blocked generic deploy

```bash
npm run deploy
```

This **always fails** with instructions to use `deploy:staging` or `deploy:production`.

### ⚠️ Production warning

`deploy:production` updates the **live** Poptek Shopify application used by real merchants. Coordinate with your partner before running it. Phase 2B staging work should use **`deploy:staging` only**.

---

## Environment variables

Set `APP_ENV` on every deployed service (`development` | `preview` | `staging` | `production`). Do not rely on `NODE_ENV` alone.

### Must differ between production and staging

| Variable | Production | Staging |
|----------|------------|---------|
| `APP_ENV` | `production` | `staging` |
| `DATABASE_URL` | Production PostgreSQL | **Separate** staging PostgreSQL |
| `DATABASE_ENV_ID` | `production` | `staging` |
| `JWT_SECRET` | Production value | **New** rotated value |
| `MERCHANT_SYNC_SECRET` | Production value | **New** rotated value |
| `SHOPIFY_API_KEY` | `bfcae2d7…` | `786f52ea…` |
| `SHOPIFY_API_SECRET` | Production secret | Staging secret (secure store only) |
| `FRONTEND_URL` | `https://admin.implux.io` | `https://admin-staging.implux.io` |
| `VITE_API_URL` | `https://api.implux.io` | `https://api-staging.implux.io` |
| `VITE_APP_ENV` | `production` | `staging` |
| `IMPLUX_BACKEND_URL` | `https://api.implux.io` | `https://api-staging.implux.io` |
| `APP_URL` / `SHOPIFY_APP_URL` | Production Railway Shopify URL | Staging Railway Shopify URL |

See each service’s `.env.example` for the full list.

### Side-effect toggles

| Variable | Production default | Staging default |
|----------|-------------------|-----------------|
| `RAKUTEN_SYNC_ENABLED` | `true` (when unset) | `false` |
| `EMAIL_ENABLED` | `true` (when unset) | `false` |
| `OPENAI_API_KEY` | Optional | Omit on staging; heuristics still work |

---

## Database

- Staging must use its **own** PostgreSQL instance (Supabase project or Railway Postgres).
- Set `DATABASE_ENV_ID=staging` on **both** backend and Shopify app staging services once the DB exists.
- Optionally set `EXPECTED_DATABASE_HOST_MARKER` to a non-secret substring of the staging connection host (e.g. Supabase project ref) for extra validation.
- **Never** point staging `DATABASE_URL` at the production database.

Migrations (Phase 2B only, against staging DB):

```bash
cd overlay-studio/backend && npm run db:migrate
cd overlay-studio/shopify-app && npm run migrate:deploy
```

---

## Railway (Phase 2B)

Create **new** Railway services — do not reconfigure production services:

1. Staging backend (`overlay-studio/backend`, root directory `backend`)
2. Staging Shopify Remix app (`overlay-studio/shopify-app`)

Assign custom domains:

- `api-staging.implux.io` → staging backend
- Staging Shopify service URL → update `shopify.app.staging.toml`, `APP_URL`, OAuth redirects

---

## Vercel (Phase 2B)

Create a **separate** Vercel project (or environment) for staging:

- Root directory: `overlay-studio/frontend`
- Domain: `admin-staging.implux.io`
- Variables: `VITE_APP_ENV=staging`, `VITE_API_URL=https://api-staging.implux.io`

Preview deployments should use `VITE_APP_ENV=preview` and a **non-production** API URL.

---

## Side effects and isolation

### Rakuten cron

The backend schedules Rakuten sync every six hours **only when** `RAKUTEN_SYNC_ENABLED` is true (default true in production, false in staging).

### Email

The Shopify app sends overlay request emails only when `EMAIL_ENABLED` is true (default true in production, false in staging). Set `OVERLAY_REQUEST_TO` to staging-only addresses before enabling email in staging.

### OpenAI

Conversion Intelligence uses heuristics when `OPENAI_API_KEY` is unset. Staging does not need a production OpenAI key.

### Compliance webhooks

Production compliance processing is unchanged. The staging Shopify app refuses to forward compliance events to `api.implux.io` when `APP_ENV` is `staging` or `preview`.

### Merchant sync

The staging Shopify app refuses to call `IMPLUX_BACKEND_URL` if it targets `api.implux.io` while `APP_ENV` is staging/preview.

---

## Testing features safely (after Phase 2B)

1. Install the **staging** Shopify app on a development store.
2. Log into `https://admin-staging.implux.io` (look for the **STAGING** banner).
3. Create campaigns and verify overlays call `https://api-staging.implux.io/proxy`.
4. Confirm Rakuten cron and outbound email remain disabled unless explicitly enabled.

---

## Phase 2B Infrastructure Checklist

- [ ] Create staging PostgreSQL database
- [ ] Create staging Railway backend service
- [ ] Create staging Railway Shopify service
- [ ] Create staging Vercel frontend
- [ ] Configure `api-staging.implux.io`
- [ ] Configure `admin-staging.implux.io`
- [ ] Configure staging environment variables (`APP_ENV`, secrets, URLs)
- [ ] Add rotated staging `SHOPIFY_API_SECRET` (secure store only)
- [ ] Configure staging Shopify app URL in Railway + `shopify.app.staging.toml`
- [ ] Configure staging OAuth redirects
- [ ] Configure staging compliance webhook URLs
- [ ] Verify staging theme extension registration/UID
- [ ] Run migrations against **STAGING DB ONLY**
- [ ] Seed fake staging data
- [ ] Test Shopify OAuth on staging store
- [ ] Test merchant synchronization
- [ ] Test compliance forwarding against staging DB
- [ ] Test overlay engine against staging API
- [ ] Verify Rakuten cron disabled on staging
- [ ] Verify staging email disabled/contained
- [ ] Verify staging cannot contact production DB
- [ ] Verify staging cannot contact production backend
- [ ] Verify staging frontend cannot contact production API
