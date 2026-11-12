# Security findings

**Date:** 11 November 2026  
**Rule:** No secret values and no customer or merchant record contents appear in this document.

Severity is based on realistic impact. “Confirmed” means the code, git object, or database setting was observed. “Hypothesized” means the impact follows from that evidence but the attack was not executed.

## Summary

| ID | Severity | Title | Exploitation |
| --- | --- | --- | --- |
| F-001 | Critical | Production database credential in git history | Confirmed in history. Live reuse not verified. |
| F-002 | Critical | Staging database is world-writable through the anonymous role | Confirmed at the database. HTTP call not made. |
| F-003 | Critical | Hardcoded administrator seed password | Confirmed in source. Live hash not compared. |
| F-004 | High | Shopify tokens stored in plaintext | Confirmed. |
| F-005 | High | One global admin session protects every merchant | Confirmed. |
| F-006 | High | Storefront API does not require a Shopify signature | Confirmed. |
| F-007 | High | Storefront renders campaign config into HTML unsafely | Confirmed in code. Not exploited. |
| F-008 | High | Shopify scopes exceed what the app uses | Confirmed. |
| F-009 | High | Privacy webhooks do not finish deletion or data requests | Confirmed. |
| F-010 | High | Merchant-sync secret can replace any store token | Confirmed in code. Secret strength not tested. |
| F-011 | Medium | Production RLS is default-deny only | Confirmed. |
| F-012 | Medium | Order webhook loses the raw body used for HMAC | Confirmed in code. Live webhook not sent. |
| F-013 | Medium | Errors and debug logs can expose sensitive detail | Confirmed in code. |
| F-014 | Medium | No rate limits, security headers, or CSP | Confirmed. |
| F-015 | Medium | Cart details are sent on the query string | Confirmed. Log retention not verified. |
| F-016 | Medium | Deployed staging can still point at production | Confirmed in code. Railway env values not read. |
| F-017 | Medium | Runtime dependency advisories | Reported by npm audit. Not exploited. |
| F-018 | Medium | Catalog text can be sent to OpenAI | Confirmed in code. Key presence not verified. |
| F-019 | Low | Shared-secret checks are not timing-safe | Confirmed. |
| F-020 | Low | Overlay images are not type-checked | Confirmed. |
| F-021 | Low | Login errors differ for unknown user and bad password | Confirmed. |
| F-022 | Low | Analytics use state-changing GET requests | Confirmed. |
| F-023 | Informational | Production anonymous reads currently return no rows | Confirmed. |
| F-024 | Informational | No abandoned-cart store and no customer email column | Confirmed. |
| F-025 | Informational | No storage buckets, public functions, or Supabase Auth users | Confirmed. |
| F-026 | Informational | Embedded Shopify UI is limited to the signed-in shop | Confirmed. |
| F-027 | Informational | Compliance HMAC uses the raw body | Confirmed. |
| F-028 | Informational | No GitHub Actions workflows | Confirmed. |

---

## F-001 — Production database credential in git history

- **Severity:** Critical
- **Service:** Supabase project `implux-overlay` (ref `rpggayuuxnzdqybnmxyu`), git repo `philmon10ez/implux-overlay-studio-v2`
- **Location:** Historical file `overlay-studio/shopify-app/.env` in commit `cfd6032a` (14 March 2026). Removed from the tree in `b10ceaa2` (11 April 2026). The adding commit is an ancestor of `origin/main`.
- **Evidence:** The historical file contains one non-placeholder `DATABASE_URL`. Its host is the production pooler for `rpggayuuxnzdqybnmxyu`, and it requests TLS. The file is not in `HEAD`. Current `git ls-files` does not track `.env` files. A local gitignored `overlay-studio/backend/.env` also points at the production project ref.
- **Exploitation:** Anyone with a clone or GitHub read access to that history can recover the connection string. The production database holds 4 merchant rows with non-empty access tokens and 13 session rows with non-empty access tokens. The table owner is `postgres`, which bypasses Row Level Security.
- **Impact:** Full read and write of merchant tokens, staff session fields, campaigns, and the admin password hash, if the password was not changed after it was committed.
- **Confidence:** High that the secret was committed and is production. Not verified whether Railway’s current password is still the same one. Railway variable values were intentionally not downloaded.
- **Remediation:** Rotate the production database password in Supabase. Update Railway production services only. Confirm staging URLs do not use the new production password. Treat the old password as compromised even after a history rewrite. History rewrite is optional and disruptive; rotation is what stops the credential.
- **Complexity:** Low for rotation, high for a history purge.
- **Downtime:** Brief if connections drop during the password change. No schema migration.
- **Verify:** New connections from Railway succeed. The historical password is rejected. Staging `DATABASE_URL` still contains only `draguoqqidihfxovxfss`.

## F-002 — Staging database is world-writable through the anonymous role

- **Severity:** Critical
- **Service:** Supabase project `Poptek Staging` (ref `draguoqqidihfxovxfss`)
- **Location:** All 13 tables in `public`, including `User`, `Merchant`, `Session`, and `RakutenCredentials`
- **Evidence:** Supabase security advisor `rls_disabled_in_public` (error, external). `relrowsecurity` is false and `relforcerowsecurity` is false on every public table. `anon` and `authenticated` have `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`. `has_column_privilege` is true for `anon` on `Merchant.accessToken`, `Session`, and `User.password`. There are zero RLS policies and zero storage buckets.
- **Current rows:** `User` 1 (password hash looks like bcrypt). `Merchant`, `Session`, `Campaign`, `CampaignEvent`, `RakutenCredentials`, and `OverlaySubmission` are 0.
- **Exploitation:** The Supabase Data API treats the anonymous key as a client key. With RLS off, that key can read the admin hash and overwrite it, and can insert tokens as soon as a staging shop is installed. The HTTP call was not made, so the hash was not downloaded.
- **Impact:** Staging admin takeover and, after the first install, theft or replacement of staging shop tokens. If the staging admin password is reused in production, the blast radius includes production.
- **Confidence:** High for the database privileges. Medium for immediate internet exploitability, because the anonymous key was not found in application source. Supabase’s model is that this key is not a secret.
- **Remediation:** `ENABLE ROW LEVEL SECURITY` on every `public` table, then `REVOKE ALL` from `anon` and `authenticated`. Do not add broad policies. The Prisma connection uses a privileged role and will keep working. Repeat the revoke in production (see F-011).
- **Complexity:** Low. No data migration.
- **Downtime:** None expected if only `anon` and `authenticated` are revoked.
- **Verify:** `SET ROLE anon; SELECT count(*) FROM "User";` fails or returns no privilege. Advisor `rls_disabled_in_public` clears.

## F-003 — Hardcoded administrator seed password

- **Severity:** Critical
- **Service:** Backend admin API
- **Location:** `overlay-studio/backend/prisma/seed.js` line 7. Account identity in that file: username `admin`, email `admin@implux.io`, role `admin`.
- **Evidence:** The seed hashes a short literal password with bcrypt and upserts that user. Production and staging each have exactly one `User` row whose password starts with the bcrypt prefix. Login (`overlay-studio/backend/routes/auth.js`) has no rate limit, lockout, or MFA. The JWT lasts 7 days (`expiresIn: '7d'`, cookie `maxAge` 7 days).
- **Exploitation:** If the live password is still the seed value, anyone can log in as the only administrator and then use F-005. The live hash was **not** compared, on purpose.
- **Impact:** Full control of every merchant, campaign, and stored token through the admin API.
- **Confidence:** High that the password is in source. Medium that production still uses it.
- **Remediation:** Set a long unique password out of band. Do not run this seed on staging or production. Remove the literal from the repository in a later change. Add rate limiting in the same window.
- **Complexity:** Low.
- **Downtime:** None. Password change only.
- **Verify:** Seed password is rejected. A new password works. Repeated failures are throttled.

## F-004 — Shopify tokens stored in plaintext

- **Severity:** High
- **Service:** Shared Postgres used by the backend and the Shopify app
- **Location:** `Merchant.accessToken` in `overlay-studio/backend/prisma/schema.prisma` lines 28–39. `Session.accessToken` and `Session.refreshToken` in `overlay-studio/shopify-app/prisma/schema.prisma` lines 12–30. Writes in `overlay-studio/backend/routes/shopifySync.js` lines 50–61 and `overlay-studio/backend/routes/merchants.js` lines 42–47.
- **Evidence:** Production counts, values not read: 4 of 4 merchants have a non-empty access token; 13 of 16 sessions have a non-empty access token. No application encryption, vault, or column-level encryption is present. `RakutenCredentials` stores client secret and security token in plaintext columns; that table is empty in both databases.
- **Exploitation:** Any holder of the database password (F-001), the service-role key, or a Railway environment export receives usable Admin API tokens. Uninstall sets the merchant token to an empty string (`markMerchantUninstalled`) but shop redact does not delete `Session` (F-009).
- **Impact:** A stolen offline token can call the Admin API with the granted scopes (F-008), including theme and script-tag writes and order reads.
- **Confidence:** High.
- **Remediation:** After F-001 rotation, plan token encryption or a dedicated secrets store. At minimum, delete session rows on uninstall and shop redact, and rotate tokens if the database password was exposed. Do not log tokens. Current sync logs the shop domain and merchant id only, which is acceptable.
- **Complexity:** Medium for encryption (migration plus dual-read). Low for session deletion.
- **Downtime:** Encryption migration needs a deploy. Token rotation requires merchants to reopen the app or reinstall.
- **Verify:** Database dump of token columns shows ciphertext or the columns are gone from backups taken after rotation. Uninstall leaves no `Session` row for that shop.

## F-005 — One global admin session protects every merchant

- **Severity:** High
- **Service:** Backend API and Vercel admin dashboard
- **Location:** `overlay-studio/backend/middleware/auth.js` lines 15–29. Routes under `overlay-studio/backend/routes/` for merchants, campaigns, analytics, products, recommendation sets, Rakuten, and conversion intelligence call `router.use(auth)` and then query by id with no link to the caller. `User.role` defaults to `admin` and is copied into the JWT, but no route checks it. `attachUser` exists and is not used by those routes.
- **Evidence:** A valid cookie is enough. The middleware does not load the user from the database, so a deleted user keeps access until the JWT expires. The dashboard (`frontend/src/App.jsx`) hides pages until `/api/auth/me` succeeds. That is a client check. Direct API calls with the cookie are the real control, and they are all-or-nothing.
- **Exploitation:** One phished or guessed staff password (F-003), or one stolen 7-day cookie, reads and edits every merchant. `PUT /api/merchants/:id` accepts a new `accessToken`. `GET /api/campaigns` returns every campaign, including promo codes and design JSON. There is no per-merchant user.
- **Impact:** Cross-merchant data access for anyone who is supposed to be “just” a staff user, and total compromise if the single password is weak.
- **Confidence:** High. This matches an internal console, and it is unsafe the moment a second person or a merchant receives a login.
- **Remediation:** Keep the dashboard staff-only. Enforce rate limits, short sessions, server-side session revocation, and a check that the user row still exists. Do not give merchants these accounts. If merchants ever need a login, add a merchant id on the user and filter every query.
- **Complexity:** Low for revocation and rate limits. High for real multi-tenant accounts.
- **Downtime:** None for rate limits and a DB lookup. Session-store migration is a deploy.
- **Verify:** A deleted user’s old cookie returns 401. Merchant A’s user cannot read merchant B’s campaign id. Login attempts past the limit return 429.

## F-006 — Storefront API does not require a Shopify signature

- **Severity:** High
- **Service:** Backend `/proxy`
- **Location:** `overlay-studio/backend/middleware/optionalProxyHmac.js` lines 8–12. `overlay-studio/backend/app.js` lines 71–85 and 122–127. `overlay-studio/backend/routes/proxy.js`.
- **Evidence:** The comment says theme calls cannot sign requests, so missing `hmac` or `signature` skips verification. `hmacVerify.js` is correct when a signature is present (timing-safe HMAC). CORS for `/proxy` reflects any `https://` origin. There is no rate limit.
- **Exploitation:** Anyone who knows a shop domain can `GET /proxy/campaigns?shop=` and receive active campaign design, promo codes, and frequency rules. `GET /proxy/track` increments impressions or clicks when the campaign belongs to that shop. `GET /proxy/recommendations` accepts cart subtotal and SKUs. This is not cross-tenant token access: the shop parameter only returns that shop’s public campaign config. It is unauthorized access to promo configuration and a way to poison analytics.
- **Impact:** Promo-code disclosure before a shopper sees the overlay, inflated conversion reports, and a cheap write load on `CampaignEvent`.
- **Confidence:** High from code. Live calls against production were not made.
- **Remediation:** Prefer the Shopify app proxy, which signs requests, or a per-shop public token that is not the Admin API token. Require the signature. Cap track events per shop and campaign. Stop putting cart contents in the query string (F-015).
- **Complexity:** Medium. The theme script and the API must change together.
- **Downtime:** A bad deploy can hide overlays. Ship the signature check behind a compatible release of the theme extension.
- **Verify:** A request without a valid signature returns 401. A request signed for shop A cannot read shop B. Track requests over the cap return 429 and do not increment counters.

## F-007 — Storefront renders campaign config into HTML unsafely

- **Severity:** High
- **Service:** Theme app extension `overlay-engine.js`
- **Location:** `buildOverlayDOM`, `buildWelcomeMatOverlay`, `buildPersistentBar`, and `buildSpinWheelDOM` in `overlay-studio/shopify-app/extensions/overlay-engine/assets/overlay-engine.js` (innerHTML around lines 1616, 1647, 1852, and 1921). `escapeHtml` is used for text nodes (line 2098). Color, opacity, radius, and `ctaUrl` are concatenated into HTML or assigned to `window.location.href` (lines 1891 and 2076).
- **Evidence:** Text is escaped. Attribute and URL values are not restricted to a color grammar or an `https` URL. A `designConfig` value such as a quote-breaking string in `bgColor`, or a `javascript:` `ctaUrl`, is rendered on the merchant’s storefront.
- **Exploitation:** Who can write `designConfig` today is an authenticated admin (F-005) or, on staging, the anonymous database role (F-002). A merchant cannot write another merchant’s campaign through the embedded app (F-026). Once a bad config is stored, every shopper of that store runs it.
- **Impact:** Script execution in the shopper’s browser on the merchant store, using the campaign as the delivery path.
- **Confidence:** High for the sink. Not executed against a store.
- **Remediation:** Build the DOM with `textContent` and `style` properties, or allow only hex colors and `https` URLs. Reject other `ctaUrl` schemes.
- **Complexity:** Medium. Needs visual regression on each overlay type.
- **Downtime:** None if the theme extension is published carefully.
- **Verify:** A campaign whose color field contains a quote and a tag renders as text, not as an element. A `javascript:` URL does not navigate.

## F-008 — Shopify scopes exceed what the app uses

- **Severity:** High
- **Service:** Shopify apps, production client id `bfcae2d7ecd83eb4fc96749fb543380c` and staging client id `786f52ea5cd6c4e9c95a835dfecd2ecb`
- **Location:** `shopify.app.production.toml` and `shopify.app.staging.toml` `[access_scopes]`. Default in `overlay-studio/shopify-app/app/shopify.server.js` line 15: `read_products,write_script_tags,read_orders,write_themes,read_themes`.
- **Evidence:** The storefront is a theme app extension (`extensions/overlay-engine`). `pushCampaignToStore` in `shopifyService.js` is an empty placeholder. GraphQL use in the embedded app is shop settings and embed status, not script-tag installation. `read_orders` is a protected customer-data scope even if order payloads are only handled by the conversion webhook.
- **Exploitation:** Token theft (F-004) inherits theme write, script-tag write, and order read, not only “show an overlay.”
- **Impact:** Storefront defacement or script injection, and order data access, beyond the product’s behavior.
- **Confidence:** High that the scopes are requested. Medium that every scope is unused, because a full Admin API call graph was not traced beyond the app routes that were read.
- **Remediation:** Drop `write_script_tags` and `write_themes` unless a reviewed feature needs them. Keep `read_orders` only if order webhooks or order reads stay, and then finish F-009. Re-consent installed shops after the scope change.
- **Complexity:** Low to edit the toml. Medium operationally because installed shops must accept new scopes.
- **Downtime:** Merchants may need to reopen the app. No database migration.
- **Verify:** Partner Dashboard scope list matches the toml. A token from a fresh install cannot create a script tag.

## F-009 — Privacy webhooks do not finish deletion or data requests

- **Severity:** High
- **Service:** Shopify app and backend compliance handler
- **Location:** `overlay-studio/backend/services/shopifyComplianceService.js` lines 86–162. `overlay-studio/shopify-app/app/routes/webhooks.app.uninstalled.jsx`. `overlay-studio/shopify-app/app/routes/webhooks.compliance.jsx`.
- **Evidence:**
  - `customers/data_request` logs an acknowledgement and has a TODO. It does not search or export data.
  - `customers/redact` nulls `orderId` and `orderValue` on `CampaignEvent` only when the shop domain and order id both match. It does not delete the event row.
  - `shop/redact` deletes campaign events, campaigns, recommendations, and products, blanks the merchant token, and renames the store to “Redacted.” It does not delete `Session`, `OverlaySubmission`, or `ShopifyWebhookDelivery`.
  - Uninstall does delete `Session` rows and blanks the merchant token. It keeps campaigns until a later shop redact.
  - Production currently has 0 `CampaignEvent` rows and 0 stored order ids, 16 `Session` rows, and 14 `OverlaySubmission` rows.
- **Exploitation:** A shop redact completes from Shopify’s point of view (HTTP 200) while staff names, emails, and access tokens can remain in `Session`. A customer data request gets no inventory of held data.
- **Impact:** Tokens and staff profile fields survive the privacy workflow. This conflicts with Shopify’s protected-customer-data expectations while `read_orders` is requested, and with a merchant’s expectation that uninstall or redact removes their credentials.
- **Confidence:** High for the code paths. Legal sufficiency needs counsel.
- **Remediation:** On shop redact and uninstall, delete sessions for that shop and overlay submissions. On customer redact, delete or irreversibly strip matching events even if the domain format varies (`shop` vs `https://shop`). On data request, produce an internal inventory (order ids, if any) through a private channel. Do not log the payload.
- **Complexity:** Medium.
- **Downtime:** Deploy only.
- **Verify:** Fixture shop redact leaves zero `Session` and `Merchant.accessToken` rows for that domain. A data-request fixture records what was searched.

## F-010 — Merchant-sync secret can replace any store token

- **Severity:** High
- **Service:** `POST /api/shopify/sync-merchant` and `POST /api/shopify/mark-uninstalled`
- **Location:** `overlay-studio/backend/routes/shopifySync.js` lines 18–31 and 91–112. The same secret forwards compliance events in `webhooks.compliance.jsx` and `complianceInternalForwardHandler`.
- **Evidence:** Authentication is a shared header compared with `!==`. The body supplies `shop` and `accessToken`. The handler upserts that token and sets the merchant active. Staging refuses to call `api.implux.io` (`merchantSync.server.js` `assertSafeBackendUrlForSync`). The secret value was not read.
- **Exploitation:** Anyone who learns the secret can store an arbitrary token for any shop domain, deactivate a shop, or submit a forged compliance payload to the internal forwarder.
- **Impact:** Persistent Admin API credential replacement, or deletion of a shop’s campaigns through a forged shop redact.
- **Confidence:** High for the design. Secret entropy was not inspected.
- **Remediation:** Keep the secret long and different per environment. Compare it with `crypto.timingSafeEqual` (F-019). Restrict the route to the Shopify app’s Railway network if Railway private networking is available. Do not log the header.
- **Complexity:** Low for the compare and the per-environment secret. Medium for private networking.
- **Downtime:** Deploy. Both services must receive the new secret together.
- **Verify:** Wrong secret returns 401. Staging process cannot call the production host. A sync for shop A does not change shop B’s row.

## F-011 — Production RLS is default-deny only

- **Severity:** Medium
- **Service:** Supabase `implux-overlay`
- **Location:** Public tables listed in `DATABASE_SECURITY_AUDIT.md`
- **Evidence:** RLS is enabled, force is off, and there are zero policies. `anon` still has full grants, including `TRUNCATE`. `service_role` and `postgres` have `rolbypassrls = true`. Table owner is `postgres`. As `anon`, `SELECT count(*)` on `Merchant` returned 0 while the table contains 4 rows. That is RLS hiding rows, not an empty table. Writes were not tested, to avoid changing data. Postgres denies inserts when no policy exists, for roles that do not bypass RLS.
- **Exploitation:** The Data API anonymous key should not see rows today. Disabling RLS, adding `USING (true)`, or leaking the service-role key removes that protection. The application itself never asks RLS for help, because Prisma connects as a bypass role.
- **Impact:** A one-line policy or grant mistake exposes tokens the way staging is exposed now.
- **Confidence:** High.
- **Remediation:** Revoke `anon` and `authenticated` privileges on application tables. Leave RLS enabled. Do not put tenant policies in `public` until there is a real Supabase Auth model. Keep using the backend as the only tenant gate.
- **Complexity:** Low.
- **Downtime:** None if the app role is not `anon`.
- **Verify:** Advisor no longer reports tables with RLS and no policy solely because `anon` has no grant. Anonymous REST requests return permission denied rather than an empty array that looks like success.

## F-012 — Order webhook loses the raw body used for HMAC

- **Severity:** Medium
- **Service:** `POST /proxy/conversion`
- **Location:** `overlay-studio/backend/app.js` lines 92–127. `overlay-studio/backend/services/shopifyService.js` lines 10–17.
- **Evidence:** Global `express.json()` runs before the `/proxy` parser that saves `req.rawBody`. Body-parser skips a second parse, so `rawBody` is unset. `verifyWebhook` then HMACs `JSON.stringify(req.body)`, which is not Shopify’s raw bytes. The compliance route is mounted **before** `express.json()` and does this correctly (F-027).
- **Exploitation:** Forged order webhooks should fail closed, because the digest will not match. Real Shopify order webhooks are also likely to fail, so revenue attribution does not run. If a future change accepts a missing HMAC, the fallback becomes a bypass. There is no order-id idempotency, so a replay would double-count once verification works.
- **Impact:** Broken attribution today. Integrity bug if the check is “fixed” by skipping it.
- **Confidence:** High from code review. A live webhook was not sent.
- **Remediation:** Mount this route with `express.raw` the same way as `/webhooks/compliance`. Use `verifyShopifyWebhookHmac` only on that buffer. Record `orderId` uniquely per shop.
- **Complexity:** Low.
- **Downtime:** Deploy only.
- **Verify:** Existing unit style in `shopify-compliance-webhooks.test.js`: valid raw HMAC returns 200 once; a second delivery does not double revenue; a re-serialized body returns 401.

## F-013 — Errors and debug logs can expose sensitive detail

- **Severity:** Medium
- **Service:** Backend
- **Location:** `overlay-studio/backend/app.js` lines 139–150. `shopifyComplianceWebhooks.js` `logComplianceDebug` lines 29–51. `server.js` lines 16–18.
- **Evidence:** The error handler returns `err.message` to the client and logs the full error object. Prisma errors can include field names and, in some cases, values. `COMPLIANCE_WEBHOOK_DEBUG` logs up to 500 characters of the webhook body, which for a customer payload can be personal data. Startup logs the last four characters of `SHOPIFY_API_KEY`.
- **Impact:** Schema and secret fragments in client responses or log drains.
- **Confidence:** High for the code. Production log settings were not opened.
- **Remediation:** Return a generic message for 500s. Leave debug body logging off. Do not log key suffixes.
- **Complexity:** Low.
- **Downtime:** Deploy only.
- **Verify:** A forced Prisma error returns `{ "error": "Internal server error" }` and the server log does not include token fields.

## F-014 — No rate limits, security headers, or CSP

- **Severity:** Medium
- **Service:** Backend, Vercel admin, Shopify app
- **Location:** `overlay-studio/backend/app.js` has no `helmet` and no rate limiter. `overlay-studio/frontend/vercel.json` sets rewrites only. Vite config does not enable production source maps (a positive). `backend/src/index.js` sets `cors({ origin: true, credentials: true })` but Railway’s start command is `node backend/server.js`, which uses `createApp()`. The loose file is unused by the documented start path.
- **Evidence:** Login, track, sync, and AI routes accept unlimited requests. Admin CORS is an allowlist plus, in staging, `https://implux-overlay-studio-staging(-hash)?.vercel.app`. That preview pattern is intentional and means every staging Vercel preview may send credentialed admin requests.
- **Impact:** Password guessing, analytics inflation, and a missing browser control if an XSS bug appears in the dashboard.
- **Confidence:** High.
- **Remediation:** Rate-limit login and `/proxy/track`. Add `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, and a tight CSP on the admin host. Confirm Vercel preview deployments are not public.
- **Complexity:** Low to medium.
- **Downtime:** None. A bad CSP can blank the dashboard; test in staging.
- **Verify:** Response headers on `admin` and the API include the set above. The 21st login failure in a minute returns 429.

## F-015 — Cart details are sent on the query string

- **Severity:** Medium
- **Service:** Theme extension and `/proxy/recommendations`
- **Location:** `overlay-engine.js` cart fetch around lines 1068–1086. `proxy.js` `GET /recommendations`.
- **Evidence:** The script reads `/cart.js` and appends `cartSubtotal` and `cartSkus` to the API URL. Those fields are used to choose recommendations. They are not written to a table in the route that was read. Query strings are commonly stored in HTTP access logs. The spin wheel asks for an email in the browser (line 1946) and does not put that email in the beacon (lines 2022–2036). That email is not stored. There is no abandoned-cart table.
- **Impact:** Cart contents can land in logs and in browser history. The email field can confuse shoppers into thinking an address was collected.
- **Confidence:** High for the request shape. Log retention was not verified.
- **Remediation:** POST the cart context with the same authentication as F-006. Drop the email field until there is a disclosed, stored, deletable purpose.
- **Complexity:** Medium with F-006.
- **Downtime:** Theme release.
- **Verify:** Access logs for a test request do not contain SKUs. The spin UI has no email input.

## F-016 — Deployed staging can still point at production

- **Severity:** Medium
- **Service:** Railway staging and local Shopify process
- **Location:** `overlay-studio/shared/databaseGuard.js` lines 45–49. `overlay-studio/shopify-app/app/lib/stagingProcessGuard.server.js`.
- **Evidence:** If `DATABASE_ENV_ID` is unset, staging only logs a warning. The strict host check runs when `EXPECTED_DATABASE_HOST_MARKER` is set, or when `POPTEK_STAGING_LOCAL=1` for the Shopify process. Railway variable values were not read, so it is not confirmed that production Railway has `APP_ENV=production` and staging has the staging marker. Local files that were classified without printing values: `backend/.env` points at the production ref; `shopify-app/.env.staging` and `env/staging/.env` point at the staging ref; `shopify-app/.env` contains neither ref.
- **Impact:** A mistaken Railway variable sends staging traffic, including new access tokens, into production, or the reverse.
- **Confidence:** High for the code gap. The live Railway values are an unverified residual.
- **Remediation:** Make missing `DATABASE_ENV_ID` and a missing host marker fatal in staging and production. Set them on each Railway service. See the operator checks in `INFRASTRUCTURE_SECURITY_AUDIT.md`.
- **Complexity:** Low.
- **Downtime:** Staging will fail to boot until the variables are set. That is the desired failure.
- **Verify:** Boot with a production ref and `APP_ENV=staging` exits before listen.

## F-017 — Runtime dependency advisories

- **Severity:** Medium
- **Service:** Backend, Shopify app, and frontend lockfiles
- **Location:** `npm audit` on 11 November 2026. No packages were upgraded.
- **Evidence and reachability:**
  - Backend: 2 critical, 7 high, 6 moderate. `proxy-addr` is critical only when `trust proxy` is on. It is not set, so this is not currently reachable. `tar` arrives through `bcrypt`’s install tooling, not through request handling. `body-parser`, pulled in by Express 4.21, is on the public request path; the trailing-byte and limit advisories are the ones to treat as real. `qs` is reachable if query parsing hits the affected options.
  - Shopify app: 2 critical, 31 high, 16 moderate, 5 low. `nodemailer` 6.x is a direct dependency used to send overlay requests. `@remix-run/node`, `@remix-run/serve`, and `prisma` 6 are on the production runtime. Vite and esbuild issues are build or dev-server issues unless the dev server is exposed. `tar` is transitive through the install toolchain.
  - Frontend: 2 critical (`vitest`, `tinypool`) are dev-only. `vite` / `esbuild` matter if the dev server is exposed. The shipped dashboard is static files. `postcss` is build-time.
- **Impact:** Denial of service on the API is the credible backend issue. Email header injection is the credible Shopify-app issue if the installed nodemailer advisory covers address fields. Remix advisories were not reproduced one by one and must not be described as a confirmed remote code execution.
- **Confidence:** High that the advisories are reported. Low that any specific CVE is exploitable until the affected version and call path are matched.
- **Remediation:** Review and upgrade in a dedicated change. Do not run `npm audit fix` blindly. Prioritize Express/body-parser, nodemailer, and current Remix security releases.
- **Complexity:** Medium. Remix and Prisma upgrades can break the Shopify app.
- **Downtime:** Deploy and regression test.
- **Verify:** `npm audit` no longer lists the chosen runtime packages. Overlay email and embedded admin still work.

## F-018 — Catalog text can be sent to OpenAI

- **Severity:** Medium
- **Service:** `POST /api/conversion-intelligence/recommendation-assistant`
- **Location:** `overlay-studio/backend/routes/conversionIntelligence.js` lines 35–58. `openaiChatJsonCompletion.js`.
- **Evidence:** The route is behind staff auth. When `OPENAI_API_KEY` is set, the provider posts product titles, SKUs, categories, and the store name to `api.openai.com`. Without a key, a local heuristic is used. Provider HTTP bodies are not returned to the client; the orchestrator logs the error string only. Whether the key is set on Railway was not checked.
- **Impact:** Merchant catalog text leaves the Implux network. This is not customer checkout data in the code that was read. It still needs a disclosure and a way to turn it off per environment.
- **Confidence:** High for the code path. Key presence unverified.
- **Remediation:** Keep the key unset until a data-processing decision is made. Default it off in staging. Do not send shop domains if the model does not need them.
- **Complexity:** Low.
- **Downtime:** None.
- **Verify:** With the key unset, responses report `usedOpenAI: false`. Staging boot warns or refuses a production OpenAI key if one is ever shared.

## F-019 — Shared-secret checks are not timing-safe

- **Severity:** Low
- **Service:** Merchant sync and compliance forward
- **Location:** `shopifySync.js` line 26. `shopifyComplianceWebhooks.js` line 197. Contrast with `shopifyWebhookHmac.js`, which uses `timingSafeEqual`.
- **Evidence:** The code uses string inequality on the raw secret.
- **Impact:** A network timing attack against a long random secret is impractical. It becomes more realistic if the secret is short (F-003’s class of problem).
- **Confidence:** High for the code. Not exploited.
- **Remediation:** Compare equal-length buffers with `crypto.timingSafeEqual` after a length check.
- **Complexity:** Low.
- **Downtime:** Deploy.
- **Verify:** Unit test: wrong length and wrong bytes both return 401 and do not throw.

## F-020 — Overlay images are not type-checked

- **Severity:** Low
- **Service:** Shopify embedded app email
- **Location:** `app._index.jsx` lines 150–176. `safeFilename` strips path characters. Limit is 5 MB and 5 rows. The file is attached to email, not stored in Supabase.
- **Evidence:** Size is checked. Content type and magic bytes are not.
- **Impact:** A merchant can email a non-image file to the Implux recipients. This is not a server-side file write.
- **Confidence:** High.
- **Remediation:** Allow only JPEG, PNG, and WebP by signature, not by file name.
- **Complexity:** Low.
- **Downtime:** Deploy.
- **Verify:** A renamed executable is rejected. A real PNG is accepted.

## F-021 — Login errors differ for unknown user and bad password

- **Severity:** Low
- **Service:** `POST /api/auth/login`
- **Location:** `auth.js` lines 52 and 57
- **Evidence:** Unknown user returns “Invalid username or password.” A known user with a bad password returns “Invalid email or password.”
- **Impact:** Confirms whether an account exists. With a single known admin, this adds little. It matters if more users are added.
- **Remediation:** Use one message.
- **Complexity:** Low.
- **Downtime:** None.
- **Verify:** Both failures return the same JSON and similar timing.

## F-022 — Analytics use state-changing GET requests

- **Severity:** Low
- **Service:** `GET /proxy/track`
- **Location:** `proxy.js` lines 97–131. The theme uses `navigator.sendBeacon`, which is a POST, against a route that is registered as GET. Browsers send beacons as POST. The GET handler may not run for those beacons.
- **Evidence:** The route mutates `Campaign` counters and inserts `CampaignEvent` on GET. POST `/track` is not defined.
- **Impact:** Cache prefetch or an embedded image can inflate metrics if the client uses GET. Beacon-based tracking may silently fail, which is an integrity bug more than an exposure bug.
- **Confidence:** High for the route. Browser beacon behavior was not retested in this audit.
- **Remediation:** Accept POST only, with the authentication from F-006.
- **Complexity:** Low once F-006 is scheduled.
- **Downtime:** Theme and API must ship together.
- **Verify:** GET returns 405. POST increments once.

## Informational notes

### F-023 — Production anonymous reads currently return no rows

`SET ROLE` to `anon` and `count(*)` on `Merchant` returned 0. A privileged count returned 4. RLS is doing the default-deny job. See F-011 for why that is not sufficient by itself.

### F-024 — No abandoned-cart store and no customer email column

`CampaignEvent` can store `shopDomain`, `orderId`, and `orderValue`. Production has zero such rows. The spin email never leaves the browser. Cart SKUs are request parameters (F-015), not a retention table. There is no abandoned-cart product in this repository.

### F-025 — No storage buckets, public functions, or Supabase Auth users

Both active projects: 0 storage buckets, 0 public `SECURITY DEFINER` functions, 0 rows in `auth.users`, 0 public tables in the realtime publication. Inactive projects `email_test_db` and `Commission Tracker v.1` were not schema-audited.

### F-026 — Embedded Shopify UI is limited to the signed-in shop

`app.jsx` and `app._index.jsx` call `authenticate.admin`. Campaign queries bind `shopifyDomain` to the session shop. A merchant does not get another merchant’s campaigns through this UI. They also do not get a safe multi-tenant API: the staff API is global (F-005), and the public API is keyed by shop domain (F-006).

### F-027 — Compliance HMAC uses the raw body

`/webhooks/compliance` is registered with `express.raw` before JSON parsing. `verifyShopifyWebhookHmac` requires a Buffer and compares base64 digests in constant time. Duplicate webhook ids are stored in `ShopifyWebhookDelivery`. Tests exist in `backend/test/shopify-compliance-webhooks.test.js`.

### F-028 — No GitHub Actions workflows

No `.github/workflows` in the application tree. Railway deploys from GitHub: production services track `main`; the staging backend tracks `staging-setup`. There is no CI security scan. Shopify production deploy is gated in `scripts/deploy-shopify-app.mjs` by `CONFIRM_PRODUCTION_DEPLOY=YES`.

## Entry points

| Entry | Auth | Data |
| --- | --- | --- |
| `POST /api/auth/login` | Password | Sets staff cookie |
| `/api/merchants`, `/api/campaigns`, `/api/analytics`, `/api/products`, `/api/recommendation-sets`, `/api/rakuten`, `/api/recommendations`, `/api/conversion-intelligence` | Staff JWT cookie | All merchants |
| `POST /api/shopify/sync-merchant`, `mark-uninstalled` | Shared secret | Writes tokens |
| `POST /webhooks/compliance` | Shopify HMAC | Privacy jobs |
| `POST /api/shopify/webhooks/compliance/internal` | Shared secret | Same jobs |
| `GET /proxy/campaigns`, `/recommendations`, `/track` | Optional HMAC, skipped if absent | Public campaign config and metrics |
| `POST /proxy/conversion` | HMAC against the wrong body | Order id and value |
| `GET /health` | None | `{ ok: true }` |
| Shopify `/auth/*`, `/app`, webhooks | Shopify session or HMAC | That shop |
| Theme extension | Runs on the storefront | Calls `/proxy` |
| Supabase Data API | Anonymous key | Staging: open. Production: RLS default-deny |
| Direct Postgres | Database password | Bypasses RLS |
