# Remaining security risks

These are open after the code change. Production database permissions, the leaked password, stored Shopify tokens, and deployed behavior have not been verified live. Production is not secure until the deployment plan has been executed and checked.

## Operator actions still required

- Rotate the production database password and prove the retired password fails.
- Apply the staging RLS script, then the production RLS script.
- Rotate the staff password, `JWT_SECRET`, and both `MERCHANT_SYNC_SECRET` values.
- Decide whether to rewrite Git history. The leaked URL remains in commit `cfd6032a` until that decision.
- Confirm staging Railway variable names, then push `staging-setup`.
- Publish Shopify scopes and the theme, then enable strict storefront auth.
- Generate an encryption key and backfill only after the staging round-trip.

## Accepted until a follow-up change

- Express 4 / `body-parser` denial-of-service advisories, Remix `path-to-regexp`, Prisma's advisory chain, and nodemailer. `proxy-addr` is not consulted because `trust proxy` is off. Upgrades were not applied in this change.
- Staff login rate limiting is per process and per connecting address. On Railway that address may be shared. It slows online guessing; it is not a per-account lockout.
- Compat mode still accepts an unsigned storefront read and an unsigned analytics post from anyone who can name a shop. That preserves the published theme. Strict mode closes it after the theme ships.
- The staff dashboard is global for the `admin` role. A signed-in Implux operator can see every merchant. Merchant-level dashboard accounts were not added.
- Recommendation GET still accepts cart fields in the query string for the published theme. The new theme posts JSON. Query logging on the old path continues until that theme is the one in stores.
- Railway private networking between the Shopify service and the backend was not enabled. The sync secret is the control.

## Needs a person, not a code change

- Privacy counsel: order ids kept after customer redact, 30-day webhook delivery retention, and whether the removed spin-wheel email field needs a merchant notice.
- Whether each installed merchant must be asked to reapprove immediately or at next launch.
- Backup restore drill for a single shop after `shop/redact`.

## Not claimed

Live anon privileges, the production password, token ciphertext, strict proxy enforcement, and the published theme were not changed from this session. Do not describe those controls as in effect.
