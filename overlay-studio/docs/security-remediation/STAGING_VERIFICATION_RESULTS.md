# Staging verification results

Date: 11 November 2026. Branch: `staging-setup`. Starting commit: `10f82e2e890a03ff24eac035153821e268cb1683`. No push was made.

## Automated tests

| Suite | Result |
| --- | --- |
| `overlay-studio/backend` `npm test` | 93 passed, 0 failed, 4 skipped. The skipped tests are Prisma HTTP integration tests and run only with `RUN_INTEGRATION_TESTS=1` on a non-production database. |
| `overlay-studio/shopify-app` `npm test` | 58 passed, 0 failed. Includes the overlay sync, sanitizer, image signature, theme-editor preview, and production asset URL checks. |
| `overlay-studio/frontend` `npm test` | 16 passed, 0 failed. |
| `node overlay-studio/scripts/scan-secrets.mjs` | Passed. Prints file and rule names only. |

No production customer data was used. Compliance HTTP tests set `POPTEK_DISABLE_COMPLIANCE_SIDE_EFFECTS=1`.

## Boot safety of this code

- Missing `TOKEN_ENCRYPTION_KEY` leaves tokens in plaintext. Covered by unit test.
- `STOREFRONT_AUTH_MODE` defaults to `compat`.
- No new Prisma migration is required. Order idempotency uses `ShopifyWebhookDelivery`.
- A deployed process with Railway or Vercel markers and no `APP_ENV` exits. Staging and production refuse the other project's database ref when `DATABASE_ENV_ID` is set.

## Staging environment isolation

Railway variable values were not read. The Railway variable API can return plaintext secrets into this session, and the audit constraint is to keep credentials out of logs and model context.

Because of that, these names were not confirmed on the staging services:

- `APP_ENV=staging`
- `DATABASE_ENV_ID=staging`
- `DATABASE_URL` containing `draguoqqidihfxovxfss` and not `rpggayuuxnzdqybnmxyu`
- `IMPLUX_BACKEND_URL` not equal to `https://api.implux.io`
- `SHOPIFY_API_KEY` equal to the staging client id, not `bfcae2d7ecd83eb4fc96749fb543380c`
- `MERCHANT_SYNC_SECRET` present and different from production
- `AI_FEATURES_ENABLED` unset
- `STOREFRONT_AUTH_MODE` unset or `compat`
- `TOKEN_ENCRYPTION_KEY` unset until a staging key is deliberately created

The staging Railway backend tracks `staging-setup`. A push is expected to deploy that service. If `APP_ENV` or `DATABASE_ENV_ID` is missing, the new process exits on boot and staging goes down. The push was stopped for that reason.

## Dependency audit (not upgraded)

`npm audit --omit=dev` on 11 November 2026:

- Backend: 2 critical, 5 high, 3 moderate. Highest: `proxy-addr` (not reached while `trust proxy` is unset), `tar` via `bcrypt` install, `body-parser` via Express 4.
- Shopify app: 1 critical, 18 high, 5 moderate, 3 low. Highest: `proxy-addr`, Remix/`path-to-regexp`, `nodemailer`, Prisma config chain, `undici`.

`npm audit fix --force` was not run. Framework upgrades need their own change and a full retest.

## Deploy blockers from the last Shopify release

- Locales directory is present: `extensions/overlay-engine/locales/en.default.json`.
- The `.mjs` tests are outside the extension assets.
- Production asset still points at `https://api.implux.io/proxy`.

The extension was not published.
