# Rollback plan

## Code

- Staging: redeploy the previous Railway deployment of `staging-setup` (`10f82e2e` until this branch is pushed). Do not force-push.
- Production backend and Shopify: redeploy the previous Railway deployment. The new code does not migrate the schema, so the old code can read the same tables.
- Dashboard: redeploy the previous Vercel deployment if the security headers blank the app. Shopify's own embedded-app CSP was not edited.
- Theme: publish the previous extension version in the Partner Dashboard. Leave `STOREFRONT_AUTH_MODE` unset so the older asset's absolute `https://api.implux.io/proxy` calls work.

## Authentication

- A bad `JWT_SECRET` locks staff out. Put the previous secret back and restart the backend. If the secret was rotated on purpose, issue a new password rather than restoring a retired secret that may have leaked.
- Login rate limit is in memory, per process, default 20 failures per 60 seconds per client address. Restarting the backend clears it. A shared Railway edge address can make the limit coarse; raise `LOGIN_RATE_LIMIT` if staff lock themselves out during a deploy.

## Database grants

- If the application cannot read after the RLS script, the process is not using the table owner. Restore access for the application role specifically. Do not grant `anon` back except as a temporary incident response, and remove that grant in the same incident.
- The scripts do not delete rows. There is no data restore step for the grant change.

## Encryption

- Before the backfill writes, unset `TOKEN_ENCRYPTION_KEY` and restart. Existing plaintext is still valid.
- After the backfill writes, the key must stay available. Unsetting it makes those merchants fail Shopify calls until they reinstall or the key returns. Keep the key in the password manager before the write.

## Storefront auth

- 401s on live overlays after `strict`: set `STOREFRONT_AUTH_MODE=compat` and restart the backend. The published theme's signed path can stay in place. Compat still rejects a bad signature.

## Credentials

- Database: if the new password was not saved, reset it again in Supabase and update Railway. Do not restore the password that was in Git history.
- Sync secret mismatch returns 401 on install sync and does not delete merchants. Set the same value on both services.

## Privacy jobs

- Shop redact deletes one shop's campaigns and sessions. It is not reversible from the application. Restore that shop from a Supabase backup taken before the webhook, scoped to that shop's keys, if a webhook was wrong. The handler refuses a shop string that is not a hostname, which is the control against a wide delete.
