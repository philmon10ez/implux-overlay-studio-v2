# Security verification checklist

Use this before a new real merchant is installed and before any production customer or order data is retained. Synthetic shops only. Do not paste tokens, passwords, or live customer payloads into tickets.

Status column is for the team after remediation. This audit’s result is in the “Audit” column.

## Identity and secrets

| Check | Audit result | Pass condition |
| --- | --- | --- |
| Production database password rotated after git history exposure | Not done | Old password fails. New password works from production Railway only. |
| Staging database password is long, random, and not the production password | Not verified beyond “different project ref” | Host markers differ. Passwords differ. |
| `JWT_SECRET` rotated with the admin password | Not done | Old admin cookies receive 401. |
| `MERCHANT_SYNC_SECRET` different in staging and production | Not read | Each environment rejects the other environment’s secret. |
| Shopify API secrets not in git | Toml has client ids only. Secrets not found in tracked files. | `git log -S` style search stays clean after the database password rotation, without printing matches. |
| Seed password rejected | Not tested against the live hash | Login with the seed value returns 401 in both environments. |
| Service-role key absent from frontend and theme bundles | Not found in source | Built `dist` and `overlay-engine.js` contain no service-role JWT. |

## Database

| Check | Audit result | Pass condition |
| --- | --- | --- |
| Staging RLS enabled on every `public` table | Failed. RLS off. | Advisor `rls_disabled_in_public` is clear. |
| `anon` cannot select `User`, `Merchant`, or `Session` in either project | Failed in staging. Production reads return 0 rows but grants remain. | `SET ROLE anon` raises insufficient privilege. |
| No `anon` `TRUNCATE` grant | Failed in both | Grant query returns no rows for `anon`. |
| Production and staging refs differ in the live URLs | Local files and code markers differ. Railway values not read. | Operator check in the infrastructure report passes. |
| No production dump restored into staging | Not observed as a copy. Staging merchant count is 0. Production merchant count is 4. | Stay that way. |
| Token columns not selected into logs or chat | Respected in this audit | Remains true during fixes. |

## Shopify

| Check | Audit result | Pass condition |
| --- | --- | --- |
| Embedded app loads only the session shop’s campaigns | Code review passed | Two development stores: each UI shows only its rows. |
| Unsigned `/proxy/campaigns` rejected | Currently allowed | 401 without a valid signature. |
| Shop A signature cannot fetch shop B | Not live-tested | 401 or empty, and no shop B promo code. |
| Uninstall deletes sessions and blanks the merchant token | Code does this | Fixture uninstall: 0 session rows, empty token. |
| Shop redact deletes sessions and submissions | Code does not | After the fix, 0 session rows and 0 submissions for that shop. Other shop remains. |
| Customer redact removes order ids for that shop only | Code nulls matching rows. Table is empty. | Fixture event is cleared. Other shop’s event remains. |
| Data request produces an internal inventory and HTTP 200 | HTTP path exists. Inventory is a TODO. | Test double shows a recorded search and no customer body in logs. |
| Compliance HMAC rejects a modified body | Unit tests exist | `npm test` in the backend includes `shopify-compliance-webhooks`. |
| Order webhook uses the raw body | Code does not | New test: raw HMAC accepted, re-serialized body rejected, duplicate order ignored. |
| Scopes match the toml and omit unused theme and script-tag writes | Not yet reduced | Partner Dashboard matches the slimmer list. |

## Admin API

| Check | Audit result | Pass condition |
| --- | --- | --- |
| Unauthenticated `GET /api/merchants` is 401 | Code requires the cookie. Not called against production. | 401 with no cookie. |
| Unauthenticated `GET /api/campaigns/1` is 401 | Same | 401. |
| Login rate limit | Absent | 429 after the threshold. Same error text for unknown user and bad password. |
| Deleted user cookie rejected | Not implemented | 401. |
| Dashboard hiding a page is not treated as authorization | Confirmed client-only | API tests above pass without using the UI. |

## Storefront

| Check | Audit result | Pass condition |
| --- | --- | --- |
| Campaign text cannot break out of HTML | Text is escaped. Styles and URLs are not. | Fixture XSS strings do not create elements or navigate to `javascript:`. |
| Cart SKUs are not in the query string | They are today | A test request’s URL and access log have no SKU list. |
| Spin wheel does not ask for email until a real collection purpose exists | It asks and does not send | Field removed, or a documented store-and-delete path exists. |
| Theme Editor preview does not call production API from a staging theme | Build script separates proxy URLs | Staging theme’s `PROXY_URL` host is the staging API. |

## Infrastructure

| Check | Audit result | Pass condition |
| --- | --- | --- |
| Staging boot fails if `DATABASE_URL` contains the production ref | Only when the marker or local sentinel is set | Boot test with a fake URL exits before listen. |
| Missing `APP_ENV` does not default to production on Railway | It does today | Process exits. |
| Vercel admin previews are access-controlled | Not inspected | Dashboard setting recorded by a human. |
| Security headers present on admin and API | Not set in repo | `curl -I` shows HSTS, nosniff, and no-store on API JSON. |
| `npm audit` runtime items reviewed | Reported, not upgraded | Chosen packages upgraded or formally accepted. |
| Backups and PITR confirmed | Not inspected | Supabase plan screen recorded. Restore drill done into an empty project, then destroyed. |

## Tests to add in the repo

These were not added during the audit.

1. Backend: login lockout and identical failure bodies.
2. Backend: auth middleware rejects a JWT whose user row is gone.
3. Backend: `/proxy/*` without signature is 401, once that becomes the rule.
4. Backend: conversion webhook raw HMAC, tamper, and duplicate order.
5. Backend: shop redact fixture deletes sessions for shop A only.
6. Shared: `validateDatabaseUrl` throws when staging lacks `DATABASE_ENV_ID`.
7. Storefront: color and URL sanitizer cases in `overlay-engine-storefront.test.mjs`.
8. Shopify: merchant sync from `APP_ENV=staging` to `api.implux.io` is refused (a test like this already exists in `merchantSync.server.test.js`; keep it).

Run backend tests with `node scripts/run-tests.mjs` from `overlay-studio/backend`. Run Shopify tests with `npm test` from `overlay-studio/shopify-app`. Do not point those tests at production `DATABASE_URL`.

## Explicitly out of bounds

- Password spraying the live admin.
- Calling the Data API with the anonymous key to download the hash.
- Sending live webhook fixtures that contain real customer data.
- `npm audit fix`, deploys, migrations, or credential rotation as part of the audit.
