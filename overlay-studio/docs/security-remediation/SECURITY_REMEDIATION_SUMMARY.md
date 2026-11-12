# Security remediation summary

Date: 11 November 2026. Branch `staging-setup`, base `10f82e2e890a03ff24eac035153821e268cb1683`. This change hardens the existing Poptek services. It does not replace them.

## Result

The critical code paths that could be fixed without touching production are implemented and covered by unit tests. The critical live issues are not fixed yet: the production database password, staging and production Data API grants, and encryption of tokens already stored in production. Those have scripts and runbooks and were not executed.

`staging-setup` was not pushed. Staging Railway is expected to deploy that branch, and the new process exits unless `APP_ENV` and `DATABASE_ENV_ID` are set. Those names were not confirmed, because reading Railway variables would pull secret values into this session.

## Code now in the working tree

- Staff login: no seeded password, identical failure text, rate limit, 8-hour cookie, `httpOnly` / `secure` outside development, `SameSite=Lax`. Every request reloads the user. A password change or a new `JWT_SECRET` invalidates the cookie.
- Shopify tokens: AES-256-GCM with a versioned prefix, optional key, previous keys for rotation, dry-run backfill. Off when the key is absent.
- Storefront: Shopify app-proxy signature check. Default `compat` keeps the published theme working. `strict` is implemented and tested. Tracking writes are POST. Overlay HTML values and URLs are allowlisted.
- Privacy webhooks: HMAC on the raw body, shop-scoped redact, session and overlay-submission deletion, no customer payload in logs.
- Sync secret compare is length-safe. Staging still refuses `https://api.implux.io`.
- Order webhooks require a raw body and ignore duplicate order ids.
- Deployed apps fail closed when environment identity or the database project ref does not match.
- OpenAI stays off unless a flag and a key are both set.
- Scopes in TOML and the server default are `read_orders,read_themes`. Not published.
- Theme package includes `locales/en.default.json` and no `.mjs` tests inside the extension.
- CI workflow runs the secret scanner and the database-free unit tests.

## Tests

Backend 93 passed, 4 skipped, 0 failed. Shopify app 58 passed. Frontend 16 passed. Secret scan passed. Details are in `STAGING_VERIFICATION_RESULTS.md`.

## Not done from this session

- No production or staging database statements were executed.
- No password, token, or Shopify scope was rotated or published.
- No production deploy, no theme publish, no merge to `main`.
- Dependency major upgrades were reviewed and deferred.

The finding-by-finding table is `FINDING_STATUS_MATRIX.md`. The production sequence is `PRODUCTION_DEPLOYMENT_PLAN.md`.
