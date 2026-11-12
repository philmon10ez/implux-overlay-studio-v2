# Token encryption migration plan

## Design

`overlay-studio/shared/tokenCipher.js` encrypts with AES-256-GCM.

Ciphertext format: `ptk1.<keyId>.<iv>.<tag>.<ciphertext>` (base64url).

| Variable | Purpose |
| --- | --- |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes, base64 or 64 hex characters. Required to encrypt. |
| `TOKEN_ENCRYPTION_KEY_ID` | Label stored in the ciphertext. Default `v1`. |
| `TOKEN_ENCRYPTION_PREVIOUS_KEYS` | `id:material` pairs, comma-separated, decrypt only. |

Covered fields: `Merchant.accessToken`, `Session.accessToken`, `Session.refreshToken`, `RakutenCredentials.clientSecret`, `RakutenCredentials.securityToken`.

If the key is unset, plaintext is stored and returned unchanged. A value that already starts with `ptk1.` is never returned as a Shopify token when the key is missing or the tag is wrong. Deploying this code without a key does not change current rows and does not require a migration.

Keys live only in the Railway service environment. They are not in the database, the browser, the theme, or git.

## When a key is safe to enable

1. Production database password has been rotated.
2. The same key is set on the production backend and the production Shopify service before either process restarts.
3. A copy of the key is in the team password manager. Losing it makes existing ciphertext unreadable. There is no recovery from the database.

## Backfill

`overlay-studio/backend/scripts/backfill-token-encryption.mjs`

- Default is a dry run. It counts plaintext rows and writes nothing.
- `CONFIRM_TOKEN_BACKFILL=YES` writes on staging.
- Production also requires `CONFIRM_PRODUCTION_TOKEN_BACKFILL=YES`.
- It does not print token values.
- It does not rewrite `Session` rows. Those encrypt the next time Shopify session storage saves the session. Merchants stay installed; the next authenticated admin load rewrites the session.

Run the dry run on staging first. Then the confirmed staging write. Read one merchant through the app and confirm the Shopify Admin call still succeeds. Repeat for production only after that.

## Rotation

1. Generate key `v2`.
2. Set `TOKEN_ENCRYPTION_KEY` to v2 and `TOKEN_ENCRYPTION_KEY_ID=v2`.
3. Set `TOKEN_ENCRYPTION_PREVIOUS_KEYS` to the old `v1:<material>` value.
4. Restart backend and Shopify together.
5. Re-run the backfill. New writes use v2. Old ciphertext still decrypts.
6. After the dry run shows zero v1 rows, remove the previous key.

## Rollback limits

- Before any write backfill, rollback is removing the env key. Plaintext rows are unchanged.
- After a write, the application cannot read those rows without the key. Rolling back the code while leaving ciphertext in the database logs `session_decrypt_failed` and forces Shopify reauthentication. Merchant rows that contain ciphertext will fail Admin API calls until the key is restored or the merchant reinstalls.
- Do not run the production backfill until the key is stored outside the database and the staging write has been read back successfully.
