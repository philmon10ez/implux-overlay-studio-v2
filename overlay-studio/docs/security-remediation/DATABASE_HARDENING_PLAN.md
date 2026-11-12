# Database hardening plan

Two Supabase projects share one Prisma schema. The application connects as the table owner. `anon` and `authenticated` are the Data API roles and are the roles this plan removes.

| Environment | Project | Ref | Script |
| --- | --- | --- | --- |
| Staging | Poptek Staging | `draguoqqidihfxovxfss` | `sql/staging-rls-and-grants.sql` |
| Production | implux-overlay | `rpggayuuxnzdqybnmxyu` | `sql/production-rls-and-grants.sql` |

## What the scripts change

- `ENABLE ROW LEVEL SECURITY` on `User`, `Merchant`, `Session`, `Campaign`, `CampaignEvent`, `RakutenCredentials`, `RakutenTransaction`, `Product`, `RecommendationSet`, `RecommendationSetProduct`, `OverlaySubmission`, `ShopifyWebhookDelivery`, and `_prisma_migrations`.
- No `FORCE ROW LEVEL SECURITY`. The owner used by Prisma keeps working.
- `REVOKE ALL` on tables, sequences, and functions in `public` from `anon` and `authenticated`.
- Default privileges revoked for those two roles.
- No policies, so there is no `USING (true)` grant.
- No ownership change and no new role.

## What they do not change

- `DATABASE_URL` passwords.
- Shopify access tokens.
- Campaign rows, merchants, or sessions.
- Prisma migration history, other than enabling RLS on `_prisma_migrations`.

## Order

1. Rotate the production database password (see the credential runbook). A leaked password makes RLS irrelevant for anyone who can still log in as the owner.
2. Apply the staging script. Confirm `SET ROLE anon` gets `42501` on `Merchant`, and the Prisma role can still `SELECT`.
3. Exercise the staging backend and Shopify app.
4. Apply the production script in a window. Repeat the same two checks.
5. Open one live storefront and the staff login.

## Application impact

Prisma calls continue. A future feature that used `@supabase/supabase-js` with the anon key would fail closed. No such client is in the current storefront or dashboard.

## Rollback

The commented `GRANT` blocks restore the Data API exposure. Use them only to recover from an unexpected application failure, then remove them again. Disabling RLS on production would undo a control that is already on.
