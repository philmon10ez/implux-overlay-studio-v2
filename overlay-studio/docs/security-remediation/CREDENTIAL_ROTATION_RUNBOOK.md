# Credential rotation runbook

Do not paste connection strings, passwords, tokens, or hashes into tickets, logs, or chat.

The historical production database URL was committed and later removed. The password from that commit must be treated as public. This runbook does not read that commit and does not print the value.

## 1. Production database password (F-001)

Do this before the production RLS script. The application owner bypasses row level security, so a known password is full database access.

1. In the Supabase production project `rpggayuuxnzdqybnmxyu`, reset the database password. Use the dashboard control that generates a new password. Do not reuse the old one.
2. Copy the new URI into a password manager. Do not commit it.
3. Update `DATABASE_URL` on the production Railway backend (`api.implux.io`) and the production Shopify Railway service. Update both the direct URL and any pooler URL the service uses. Restart those two services only.
4. Confirm the services become healthy and a known storefront still loads campaigns.
5. Prove the old password no longer works: from a machine that is allowed to reach Supabase, attempt one connection with the retired password. The expected result is authentication failure. Discard the retired password after that single attempt. Do not record the attempt body.
6. If the new password was mistyped and the app cannot connect, put the previous Railway variable back only if it is the newly generated password, not the leaked one. If the new password is lost, reset it again in Supabase and repeat step 3.

Staging uses project `draguoqqidihfxovxfss`. Do not paste the production URI into staging. Staging must keep `APP_ENV=staging` and `DATABASE_ENV_ID=staging`.

## 2. Staff administrator password and JWT secret (F-003)

The seed file no longer contains a password and will not overwrite an existing user.

1. Choose a new administrator password of at least 16 characters. Store it in the password manager.
2. Set it with a one-off bcrypt update against the production `User` row for the Implux operator, or sign in once with a bootstrap only on a database where that user does not exist. `ADMIN_BOOTSTRAP_PASSWORD` plus `ALLOW_ADMIN_BOOTSTRAP=YES` creates the user only when the email is absent. Remove both variables after the user exists.
3. Generate a new `JWT_SECRET` (32 random bytes, hex or base64). Set it on the production backend and restart.
4. Every existing staff cookie becomes invalid. That is the session-invalidation mechanism: the token carries a hash prefix of the password (`pv`) and is signed with `JWT_SECRET`. Changing either value logs everyone out. Sessions also expire after 8 hours.
5. Sign in again and confirm `/api/auth/me` returns the admin user and does not return a password hash.

## 3. Merchant sync and Shopify secrets (F-010)

Generate a distinct `MERCHANT_SYNC_SECRET` for staging and for production (32 random bytes). Set the same value on the Shopify service and the backend in that environment only. Restart both. Confirm a staging app load still upserts the staging merchant. Do not log the secret.

`SHOPIFY_API_SECRET` and `SHOPIFY_API_KEY` rotate only in the Partner Dashboard. That invalidates webhook HMAC until both services are updated. Do that in the same window as a Shopify app release, not during the database password change.

## 4. Shopify access tokens (F-004)

If the database password was unchanged from the date of the historical commit through this rotation, assume stored Shopify offline tokens were exposed with the database. After the password rotation:

1. Deploy the encryption code with no `TOKEN_ENCRYPTION_KEY` first (plaintext still works).
2. In the Partner Dashboard, rotate or reinstall so merchants issue new offline tokens, or ask each merchant to open the app so OAuth refreshes the session.
3. Then follow `TOKEN_ENCRYPTION_MIGRATION_PLAN.md`.

Opening the app is enough for new sessions to be written. Existing rows stay valid until the merchant reauthorizes or Shopify revokes the old token. Do not delete `Merchant.accessToken` as part of this runbook.

## 5. What this runbook does not do

- It does not rewrite Git history. History rewrite needs a separate owner decision because it breaks every clone.
- It does not print or recover the retired password.
- It does not change Shopify scopes.
