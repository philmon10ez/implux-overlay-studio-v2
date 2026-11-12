# Production deployment plan

Do not run this plan until the staging environment variables in `STAGING_VERIFICATION_RESULTS.md` are confirmed and staging has booted this code.

Production is not ready to release until those staging checks pass and the operator completes the credential steps. The code in this branch is ready to deploy to staging after that confirmation.

## Order

1. **Database password.** Reset the production Supabase password. Update production Railway `DATABASE_URL` on the backend and the Shopify service. Prove the old password fails. See `CREDENTIAL_ROTATION_RUNBOOK.md`.
2. **Staff secrets.** Set a new administrator password and a new `JWT_SECRET` on the production backend. Existing staff sessions end.
3. **Sync secret.** Set a new production `MERCHANT_SYNC_SECRET` on both production services in one restart.
4. **Staging rehearsal.** Confirm staging variable names, push `staging-setup`, and check the staging backend health and one staging shop.
5. **Production backend.** Deploy this backend to the production Railway service with `STOREFRONT_AUTH_MODE` unset, `TOKEN_ENCRYPTION_KEY` unset, and `AI_FEATURES_ENABLED` unset. No database migration runs.
6. **Production Shopify service.** Deploy the Remix app with the same rules. `SCOPES` on Railway must not force the old scope list.
7. **Smoke.** Staff login, one live campaign fetch (unsigned, compat mode), one `POST /proxy/track`, one compliance webhook HMAC rejection in logs without a body.
8. **Supabase grants.** Run `sql/production-rls-and-grants.sql` in project `rpggayuuxnzdqybnmxyu`. Confirm anon receives permission denied and the app role can still read.
9. **Shopify version.** Publish the app with the app proxy and scopes `read_orders,read_themes`. Merchants reapprove on next open. Campaigns are not deleted.
10. **Theme.** Publish the extension. Confirm a development store uses `/apps/poptek` and the signature matches.
11. **Strict mode.** Set `STOREFRONT_AUTH_MODE=strict` only after step 10 is verified on a real storefront. Watch for a rise in 401s before leaving it on.
12. **Encryption.** After a staging backfill round-trip, set the production key on both services and run the dry-run backfill, then the confirmed write. See `TOKEN_ENCRYPTION_MIGRATION_PLAN.md`.
13. **Token rotation.** If the database password was the one exposed in Git history, have merchants reopen the app so offline tokens are reissued, then backfill.

## Health checks after step 5

- `https://api.implux.io` responds.
- A production storefront overlay still renders.
- Theme editor preview still renders.
- Staff login succeeds with the new password and fails closed for a deleted user.

## Do not

- Merge to `main` until this sequence is approved.
- Force-push.
- Set `strict` before the theme is published.
- Set the encryption key on only one of the two production services.
- Run the RLS script before the password rotation.
