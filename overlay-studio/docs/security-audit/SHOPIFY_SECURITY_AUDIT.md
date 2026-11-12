# Shopify security audit

**Date:** 11 November 2026  
**Scope:** `overlay-studio/shopify-app`, theme extension `overlay-engine`, and the backend routes those components call.  
**Distribution intent:** Private or custom distribution, not a broad App Store launch. Private distribution is not treated as a security boundary.

## Applications

| | Production | Staging |
| --- | --- | --- |
| Config | `shopify.app.production.toml` | `shopify.app.staging.toml` |
| Name | Poptek by Implux | Poptek by Implux (Staging) |
| Client id | `bfcae2d7ecd83eb4fc96749fb543380c` | `786f52ea5cd6c4e9c95a835dfecd2ecb` |
| Application URL | `https://stunning-friendship-production.up.railway.app` | `https://poptek-shopify-staging-staging.up.railway.app` |
| Embedded | yes | yes |
| API version in toml | 2026-01 | 2026-01 |
| Library API version | `@shopify/shopify-app-remix` January25 | same code |
| Install flow | managed (`use_legacy_install_flow = false`) | same |
| Auth strategy | `unstable_newEmbeddedAuthStrategy: true` plus token exchange | same |

`shopify.app.toml` and `shopify.app.implux.toml` mirror production and are marked deprecated. A bare `npm run deploy` is refused by `scripts/refuse-generic-deploy.mjs`. Production deploy requires `CONFIRM_PRODUCTION_DEPLOY=YES`.

Client ids are public identifiers. API secrets were not printed and were not found in the toml files.

## Scopes

Requested: `read_products`, `write_script_tags`, `read_orders`, `write_themes`, `read_themes`.

The running features are a theme app extension, an overlay-request form, and a campaign list for the current shop. `pushCampaignToStore` does not call the Admin API. Finding **F-008**.

`read_orders` is protected customer data under Shopify’s platform rules. Custom distribution does not waive the privacy webhooks or the requirement that they actually delete or report data. Finding **F-009**.

## OAuth and sessions

`app/shopify.server.js` uses the official Remix helper:

- Session storage: `PrismaSessionStorage` in the shared Postgres `Session` table.
- Offline tokens are what merchant sync persists (`resolveOfflineAccessToken` prefers `isOnline === false`).
- `afterAuth` registers the uninstall webhook and syncs the merchant.
- Embedded admin routes call `authenticate.admin` (`app.jsx`, `app._index.jsx`).
- Uninstall webhook uses `authenticate.webhook`.
- Compliance webhook uses `authenticate.webhook` and returns the library’s error response on HMAC failure.

Tokens are stored as plain strings (F-004). Session expiry columns exist (`expires`, `refreshTokenExpires`). No application job deletes expired sessions. Uninstall deletes rows for that shop. Shop redact does not.

There is no custom OAuth implementation to audit for state mismatch. The risk is the library’s storage and the scopes, not a hand-rolled redirect.

## Merchant sync

After admin load and after auth, the app POSTs the offline token to the backend with `x-implux-merchant-sync-secret`.

Protections that exist:

- Secret required.
- Staging and preview refuse `IMPLUX_BACKEND_URL` when it contains `api.implux.io`.
- Sync response does not echo the token. Logs include the shop domain and merchant id.

Gaps:

- The secret is the only authorization (F-010).
- Comparison is not timing-safe (F-019).
- The backend trusts the shop string in the body. A caller who has the secret can attach a token to any domain.
- Uninstall blanks the merchant token and deletes sessions. Campaigns remain until shop redact.

## Webhooks

| Route | Signature | Raw body | Replay |
| --- | --- | --- | --- |
| Shopify app `POST /webhooks/app/uninstalled` | `authenticate.webhook` | Library | Not separately deduped; delete is idempotent |
| Shopify app `POST /webhooks/compliance` | `authenticate.webhook` | Library | Forwards to backend, which dedupes on webhook id |
| Backend `POST /webhooks/compliance` | `verifyShopifyWebhookHmac` | `express.raw` before JSON | `ShopifyWebhookDelivery` id |
| Backend `POST /proxy/conversion` | HMAC of `JSON.stringify(body)` when raw body is missing | Lost | No order idempotency |

Finding **F-012** for conversion. Finding **F-027** for the compliance path, which is the one Shopify’s automated check hits on the app URL.

Compliance topics subscribed in toml: `customers/data_request`, `customers/redact`, `shop/redact`.

Processing gaps are F-009. Debug logging of the body is F-013 and is off unless `COMPLIANCE_WEBHOOK_DEBUG` is true. That flag’s live value was not read.

## App proxy and the theme

There is no `[app_proxy]` block. The theme does not go through Shopify’s signed app proxy.

`extensions/overlay-engine/blocks/app-embed.liquid` sets `window.__POPTEK__.shop` from `shop.permanent_domain` and loads `overlay-engine.js`. The script’s `PROXY_URL` is baked at build time (`scripts/build-overlay-engine-asset.mjs`): production default `https://api.implux.io/proxy`, staging from `POPTEK_PROXY_URL`.

The backend treats a missing signature as success (F-006). Campaign HTML sinks are F-007. Cart query strings are F-015.

Theme Editor preview skips cart-gated and upsell campaigns (`poptekShouldInstantTriggerInEditor`). That is a product behavior, not an auth bypass. Preview still runs in the merchant’s theme editor session.

## Can merchant A touch merchant B?

| Action | Result |
| --- | --- |
| Open the embedded app | Shopify session is shop A only. Loaders query campaigns with that domain. |
| Submit an overlay request | Row is stored with shop A’s domain. Email goes to Implux recipients. |
| Call `/proxy/campaigns?shop=B` | Receives shop B’s **active** campaign JSON, including promo codes, without being shop B. This is unauthenticated, not a session bug. |
| Call staff `/api/campaigns` | Not available to the merchant session. A staff cookie sees every shop. |
| Guess a campaign id on `/proxy/track` | The campaign’s merchant domain must equal the `shop` parameter. A mismatch returns 404. Counters for the matching pair still increment without a signature. |
| Read another shop’s Admin token through the app | Not through the embedded UI. Possible through the database (F-001, F-004) or the staff API if the caller is staff. |

## Content security and XSS

The embedded app is Polaris and Remix. `boundary.headers` supplies Shopify’s embedded-app headers, including the frame policy Shopify expects. That is appropriate for an admin iframe. It is not a storefront CSP.

The storefront script injects a `<style>` tag via `textContent` (safe) and overlay markup via `innerHTML` (F-007). Text fields are escaped. Style and URL fields are not.

No `dangerouslySetInnerHTML` in the staff React dashboard was found outside dependency bundles.

## CSRF

Staff cookies are `httpOnly`, `secure` outside development, `sameSite: 'lax'`. Cross-site POSTs from another site will not include that cookie on current browsers. The dashboard sends `credentials: 'include'`.

`GET /proxy/track` is a state change that does not use the staff cookie (F-022).

The embedded app uses Shopify’s session token flow through `authenticate.admin`. A merchant site cannot call those loaders without Shopify’s signature.

## Onboarding email

`sendOverlayRequestEmail.server.js` escapes HTML in the message body. Recipients default to two Implux addresses, overridable by `OVERLAY_REQUEST_TO`. SMTP credentials come from the environment (`SMTP_USER`, `SMTP_PASS`, host default `smtp.zoho.com`). Images are size-capped and filename-sanitized, not type-checked (F-020). Email is enabled by default only when `APP_ENV=production`, unless `EMAIL_ENABLED` is set.

Page URLs are checked for `http:` or `https:` before they are stored in the email. They are not fetched by the server, so this is not an SSRF sink.

## What private distribution still requires

Confirmed from platform behavior and from the scopes in this repo, not from a law firm:

- Embedded apps still use OAuth or token exchange, session tokens, and HMAC on webhooks. This app does that through Shopify’s library.
- If the app is custom or unlisted, App Store listing, billing, and review checklists may not apply. The API license and protected-customer-data rules still apply while `read_orders` is on the grant.
- Privacy webhooks must be subscribed and must do the work. Subscription and HMAC are in place. Deletion and data request are not complete (F-009).
- A stolen custom-app token is still an Admin API credential. Private distribution does not hide the token that is stored in `Merchant` and `Session`.
- Merchants must not be told that “it is not on the App Store” means their customers’ data is outside Shopify’s privacy terms.

Items that need legal review rather than a code claim: which privacy statute applies to order ids, cart SKUs in logs, and staff emails; whether the spin-wheel email box is a deceptive collection even though it is not transmitted; contract language with merchants for a private install.

## Positive observations

- Production and staging are different Shopify client ids and different application URLs.
- Generic deploy is refused.
- Compliance HMAC failure returns 401 without a body that echoes the payload.
- Uninstall clears the stored merchant token and session rows.
- Campaign list SQL is parameterized and shop-scoped.
- Staging sync cannot target `api.implux.io` when `APP_ENV` is staging or preview.
