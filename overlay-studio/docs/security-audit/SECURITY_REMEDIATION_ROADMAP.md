# Security remediation roadmap

Fixes are listed for later implementation. This audit did not change code, data, or credentials.

Each item says what can break and how to prove the fix. Do them in order inside a priority. P0 item 1 before P0 item 4, because token rotation is only necessary if the database password was actually exposed and still works.

## P0 — Immediate

### 1. Rotate the production database password

- **Problem:** A production connection string is in git history (F-001).
- **Why it matters:** That login bypasses Row Level Security and can read every Shopify token.
- **Fix:** In the Supabase `implux-overlay` project, reset the database password. Update `DATABASE_URL` on the production Railway backend and the production Shopify service only. Update the local gitignored `backend/.env` the same way. Do not commit it.
- **Files:** none in git. Railway variables and Supabase dashboard.
- **Regression:** Both production services fail health checks until they restart with the new URL. Staging must be left untouched.
- **Test:** Production `/health` returns ok. A connection that still uses the old password fails. Staging merchant count stays 0 and its host ref is unchanged.
- **Migration / downtime:** No migration. Short connection drop during restart.

### 2. Close the staging Data API

- **Problem:** Anonymous and authenticated roles can read and write every staging table (F-002).
- **Why it matters:** The admin password hash is already there. The first staging install would publish that shop’s token to anyone with the anonymous key.
- **Fix:** For every table in `public` on staging: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `REVOKE ALL ON TABLE ... FROM anon, authenticated`. Do the same `REVOKE` on production even though RLS is already on (F-011). Do not grant `anon` back.
- **Files:** a reviewed SQL script later. Not a Prisma migration that the app needs in order to boot. Apply with a human in the Supabase SQL editor, not from the app.
- **Regression:** Any future experiment that uses the Supabase client with the anonymous key will fail. The Node app uses `postgres` and should not notice.
- **Test:** As `anon`, selecting from `User` is denied. The staff login against staging still works. Prisma queries from the backend still work.
- **Migration / downtime:** No Prisma migration. No downtime if the app role is unchanged.

### 3. Replace the admin password and stop seeding it

- **Problem:** `prisma/seed.js` contains a short password for `admin@implux.io` (F-003). Login is unlimited (F-005).
- **Why it matters:** One password is the key to every merchant.
- **Fix:** Set a new long password directly in staging and production `User` rows using a one-off bcrypt hash that is not written into the repo. Then delete or neutralize the literal in `seed.js` in a later code change. Add a rate limit on `POST /api/auth/login`.
- **Files:** `overlay-studio/backend/prisma/seed.js`, `overlay-studio/backend/routes/auth.js`, `overlay-studio/backend/app.js`.
- **Regression:** The known seed login stops working. Document the new password in a password manager, not in git.
- **Test:** Old password returns 401. New password returns a cookie. More than the chosen number of failures returns 429. Response text is identical for unknown user and bad password (F-021).
- **Migration / downtime:** No schema migration. Users must sign in again if sessions are also revoked (recommended: change `JWT_SECRET` at the same time so old cookies die).

### 4. Decide whether to rotate Shopify tokens

- **Problem:** Tokens are plaintext (F-004). They were protected by the database password that entered git.
- **Why it matters:** If that password still worked after 14 March 2026, the tokens should be treated as exposed even though this audit did not read them.
- **Fix:** After item 1, if the password had not been rotated since the commit, reinstall or refresh offline sessions so Shopify issues new tokens. Uninstall-and-reinstall is the blunt version. Opening the app so `afterAuth` writes a new offline token is the gentler version, and it only helps if the old token is revoked in Shopify too.
- **Files:** no code required for a manual reinstall. Optional later: encrypt the column.
- **Regression:** Stores show as disconnected until the merchant opens the app.
- **Test:** Old token receives 401 from the Admin API. New session row exists. Merchant screen shows the store connected.
- **Downtime:** Per shop, during reinstall. No database migration.

## P1 — Before real merchants

### 5. Make privacy jobs complete

- **Problem:** Data request is a log line. Shop redact leaves `Session` and `OverlaySubmission` (F-009).
- **Why it matters:** `read_orders` means Shopify expects those jobs to be real. Staff emails and access tokens would otherwise survive redact.
- **Fix:** In `shopifyComplianceService.js`, delete sessions and overlay submissions for the shop on shop redact. Delete sessions on uninstall (already done) and on redact. Normalize shop domains before matching. Implement data request as an internal report of matching `CampaignEvent` order ids, delivered privately, with no payload logging.
- **Files:** `overlay-studio/backend/services/shopifyComplianceService.js`, uninstall route if the domain normalize helper should be shared, tests in `backend/test/shopify-compliance-webhooks.test.js`.
- **Regression:** A redact on a mistyped domain must not delete a different shop. Test with two fixture domains.
- **Test:** After shop redact, session count for that shop is 0 and `accessToken` is empty. The other fixture shop is unchanged.
- **Migration:** None unless a new index is added. Deploy only.

### 6. Authenticate the storefront API

- **Problem:** `/proxy` skips HMAC when the theme does not send one (F-006), and tracking is a GET (F-022).
- **Why it matters:** Promo codes and analytics are writable and readable by anyone who knows the shop domain.
- **Fix:** Move the theme to the Shopify app proxy, or require a signature the theme can produce without embedding the Admin token. Reject missing signatures. Change track to POST. Add a per-shop rate limit.
- **Files:** `optionalProxyHmac.js`, `routes/proxy.js`, `app.js` CORS for `/proxy`, `extensions/overlay-engine`, `scripts/build-overlay-engine-asset.mjs`.
- **Regression:** Overlays disappear if the theme and API disagree. Ship both in one release. Theme Editor preview needs a test store.
- **Test:** Unsigned request is 401. Shop A’s signature cannot read shop B. Burst tracking returns 429.
- **Migration:** None.

### 7. Sanitize overlay rendering

- **Problem:** Colors and `ctaUrl` are written into HTML (F-007).
- **Why it matters:** A bad campaign becomes script on the merchant’s storefront.
- **Fix:** Set styles in JavaScript properties. Allow only `https` URLs. Keep `escapeHtml` for text.
- **Files:** `storefront/overlay-engine-storefront.mjs` and the generated `extensions/overlay-engine/assets/overlay-engine.js`. There is already `overlay-engine-storefront.test.mjs`.
- **Regression:** Visual changes to wheels, bars, and welcome mats. Compare a fixture campaign before and after.
- **Test:** Quote characters in a color are inert. `javascript:` URLs do not run.
- **Migration:** None. Theme extension publish.

### 8. Shrink Shopify scopes

- **Problem:** `write_themes` and `write_script_tags` are granted and unused (F-008).
- **Why it matters:** A stolen token can inject storefront script.
- **Fix:** Remove unused scopes from both toml files and `shopify.server.js`. Have installed shops reapprove.
- **Files:** `shopify.app.production.toml`, `shopify.app.staging.toml`, `shopify.app.toml`, `app/shopify.server.js`.
- **Regression:** If a hidden feature did use theme writes, it will start failing. Search the repo again before the change. This audit did not find those calls.
- **Test:** New install token’s scope string omits script tags and theme writes. Overlay embed still toggles.
- **Migration:** None. Merchant reconsent.

### 9. Fail closed on environment mix-ups

- **Problem:** Missing `APP_ENV` becomes production. Missing `DATABASE_ENV_ID` only warns (F-016).
- **Why it matters:** Staging can write tokens into production.
- **Fix:** Refuse to boot deployed staging or production when `APP_ENV`, `DATABASE_ENV_ID`, or the host marker is missing or inconsistent.
- **Files:** `shared/appEnv.js`, `shared/databaseGuard.js`, `backend/lib/startupValidation.js`, Shopify `startupValidation.server.js`.
- **Regression:** A service with incomplete variables will crash on boot. Set the variables first, in staging, and watch it boot. Then production.
- **Test:** Unit tests already exist around `stagingProcessGuard` and `serviceUrlGuard`. Add the fatal database-guard cases.
- **Migration:** None.

### 10. Preserve raw bodies for order webhooks

- **Problem:** `/proxy/conversion` HMACs a re-serialized body (F-012).
- **Fix:** Same pattern as `/webhooks/compliance`. Unique constraint or dedupe key on shop plus order id.
- **Files:** `backend/app.js`, `services/shopifyService.js`, `routes/proxy.js`, a Prisma migration for the unique key.
- **Regression:** Legitimate orders that were previously rejected will start to count. Confirm finance wants that before enabling it.
- **Test:** Valid raw signature once. Duplicate ignored. Mutated JSON 401.
- **Migration:** Yes, for the unique delivery key. Deploy the migration before the code that depends on it.

### 11. Staff session hardening

- **Problem:** JWT is not checked against the database. It lives 7 days. Role is unused (F-005).
- **Fix:** On each request, load the user. Reject missing users. Shorten the lifetime. Rotate `JWT_SECRET` when the password changes. Keep this dashboard staff-only.
- **Files:** `middleware/auth.js`, `routes/auth.js`.
- **Regression:** Users are signed out more often.
- **Test:** Deleted user cookie returns 401. Expired token returns 401.
- **Migration:** None.

## P2 — Hardening

### 12. Generic errors and quieter logs

F-013. Stop returning `err.message` on 500s. Remove the API-key suffix log. Keep compliance body debug off.

### 13. Security headers and preview access

F-014. Add headers on the API and on Vercel. Confirm production and staging admin previews are not world-readable. Set `Cache-Control: no-store` on `/api/auth` and other JSON.

### 14. Timing-safe secrets

F-019. Small code change in the two header checks. Deploy staging and production with the same secret value they already have, or rotate both together.

### 15. Image type check

F-020. Magic-byte allowlist in the overlay form.

### 16. Dependency upgrades

F-017. Separate pull requests: Express line for the backend, nodemailer for the Shopify app, then Remix. Do not use a blind `npm audit fix`. Re-run the Shopify embedded flow and an overlay email in staging.

### 17. OpenAI switch

F-018. Leave the key unset until there is a written decision. Staging should boot without it.

### 18. Cart data off the query string

F-015. Do this with item 6 so the theme changes once.

### 19. Webhook delivery retention

Delete `ShopifyWebhookDelivery` rows older than the replay window (for example 30 days). Prevents unbounded growth. Not a privacy emergency while payloads are not stored.

## P3 — Maturity

- Encrypt token columns or move them to a secrets manager. Backfill in a migration. Dual-read during the deploy.
- Per-merchant users only if merchants will log into the dashboard. Until then, do not create those accounts.
- CI: dependency review and a secret scanner that never uploads the repo to a new vendor without approval. GitHub secret scanning on the existing private repo is the least new exposure.
- Railway: private networking between the Shopify app and the backend for the sync route, so the sync secret is not the only control.
- Database: confirm PITR, backup access, and restore once into an isolated project. Do not restore production into staging.
- Alert on compliance webhook failures and on repeated login failures.
- Write an incident note for the historical database password: when it was rotated, and whether Shopify tokens were rotated.
- Remove or quarantine `backend/src/index.js` so nobody deploys the open-CORS stub.
- Drop unused Prisma models’ privileges and the `write_*` scopes together so a new engineer does not “turn RLS off to debug.”

## Suggested sequence

```text
P0.1 rotate production DB password
P0.2 revoke anon grants and enable staging RLS
P0.3 new admin password and new JWT secret
P0.4 Shopify token rotation if the DB password had not changed since March 2026
P1.5 privacy deletion
P1.9 boot-time environment checks
P1.6 and P1.7 and P2.18 storefront auth plus HTML safety, one theme release
P1.8 scopes
P1.10 order webhook raw body
P1.11 staff session checks
P2 the rest
```

No item in this list should be applied by an automated sweep. Each one needs a human to confirm staging first.
