# Finding status matrix

Statuses describe the repository and the live systems as of 11 November 2026, after local tests. A script or runbook is not a live fix. Nothing below is labeled fixed on production.

| ID | Severity | Status | What changed | What is still required |
| --- | --- | --- | --- | --- |
| F-001 | Critical | PREPARED — REQUIRES OPERATOR ACTION | Secret scanner, gitignore coverage, CI scan, rotation runbook. Git history was not rewritten. | Rotate the production database password, update Railway production `DATABASE_URL`, prove the old password fails. |
| F-002 | Critical | PREPARED — REQUIRES OPERATOR ACTION | `sql/staging-rls-and-grants.sql` written and not executed. | Operator runs it on staging Supabase `draguoqqidihfxovxfss` and saves the permission-denied proof. |
| F-003 | Critical | IMPLEMENTED BUT NOT DEPLOYED | Seed no longer contains a password. Login rate limit, identical failures, 8-hour staff session, password-version revocation, secure cookie, database user check. | Deploy backend. Rotate the live administrator password and `JWT_SECRET` out of band. |
| F-004 | High | IMPLEMENTED BUT NOT DEPLOYED | AES-256-GCM helper, Prisma session wrapper, merchant/Rakuten write encryption, dry-run backfill. Inactive unless `TOKEN_ENCRYPTION_KEY` is set. | Operator generates a key, stores it only on Railway, dry-runs, then backfills. Do not turn the key on in production until approved. |
| F-005 | High | IMPLEMENTED BUT NOT DEPLOYED | Staff routes require a live admin row. Password change and `JWT_SECRET` rotation revoke sessions. Shopify merchant sessions are not staff sessions. | Deploy. The dashboard remains a global Implux staff console by design. |
| F-006 | High | IMPLEMENTED BUT NOT DEPLOYED | Signed app-proxy verification. Default mode is `compat` so the published theme keeps working. Invalid signatures are rejected. | Publish the theme and app proxy together, verify, then set `STOREFRONT_AUTH_MODE=strict`. |
| F-007 | High | IMPLEMENTED BUT NOT DEPLOYED | Overlay colors, lengths, opacity, and URLs are allowlisted. Tests cover quote-breaking values and `javascript:` URLs. | Publish the theme extension. Browser visual check after publish. |
| F-008 | High | IMPLEMENTED BUT NOT DEPLOYED | TOML and server default scopes are `read_orders,read_themes`. Not published to Shopify. | Operator publishes the new version. Existing installs keep old grants until the merchant reapproves. |
| F-009 | High | IMPLEMENTED BUT NOT DEPLOYED | Compliance handlers redact by shop, delete sessions and overlay submissions for that shop only, dedupe, and avoid payload logs. | Deploy. Counsel reviews retention of order ids. Do not treat this as a legal sign-off. |
| F-010 | High | IMPLEMENTED BUT NOT DEPLOYED | Sync and compliance secrets use a length-safe compare. Tests reject a forged uninstall and a token overwrite without the secret. | Rotate `MERCHANT_SYNC_SECRET` per environment. Private networking is documented, not changed. |
| F-011 | Critical | PREPARED — REQUIRES OPERATOR ACTION | `sql/production-rls-and-grants.sql` written and not executed. Production RLS is unchanged. | Run only after F-001 rotation, in the production project `rpggayuuxnzdqybnmxyu`. |
| F-012 | Medium | IMPLEMENTED BUT NOT DEPLOYED | Order webhook requires the raw body. Duplicates use the existing delivery table. No new migration. | Deploy backend. |
| F-013 | Medium | IMPLEMENTED BUT NOT DEPLOYED | 500 responses are generic. Logs pass through a redaction helper. Startup no longer prints a key suffix. | Deploy all three services and confirm log drains. |
| F-014 | Medium | IMPLEMENTED BUT NOT DEPLOYED | API security headers, `Cache-Control: no-store` on `/api`, dashboard CSP in `vercel.json`. Shopify embedded-app CSP was left to Shopify. | Deploy and load the dashboard and the embedded app. |
| F-015 | Medium | IMPLEMENTED BUT NOT DEPLOYED | New theme posts recommendation context in JSON. The published theme still uses the query string until that version is released. | Publish the theme extension. |
| F-016 | Medium | IMPLEMENTED BUT NOT DEPLOYED | Deployed processes throw if `APP_ENV` or `DATABASE_ENV_ID` is missing, and staging refuses the production database ref. | Confirm Railway variable names before pushing `staging-setup`. This was not confirmed, so the branch was not pushed. |
| F-017 | Medium | ACCEPTED RISK — REQUIRES OWNER APPROVAL | Production `npm audit` reviewed. No `npm audit fix --force`. No framework upgrades in this change. | Separate upgrade for Express/body-parser, Remix, Prisma, and nodemailer, with a full retest. |
| F-018 | Medium | IMPLEMENTED BUT NOT DEPLOYED | OpenAI is used only when `AI_FEATURES_ENABLED` and `OPENAI_API_KEY` are both set. Shop domain is not sent. | Deploy. Keep the flag off until a processing agreement exists. |
| F-019 | Low | IMPLEMENTED BUT NOT DEPLOYED | Same service-secret compare as F-010. Staging sync still refuses `api.implux.io`. | Rotate secrets. Do not change Railway networking without approval. |
| F-020 | Low | IMPLEMENTED BUT NOT DEPLOYED | Uploaded images must match JPEG, PNG, or WebP signatures. | Deploy the Shopify app. |
| F-021 | Low | IMPLEMENTED BUT NOT DEPLOYED | Login failures share one message. Unknown users still pay a hash comparison. | Deploy backend. |
| F-022 | Low | IMPLEMENTED BUT NOT DEPLOYED | Tracking mutation is `POST /proxy/track`. `GET /track` returns 405. | Deploy backend. Published `sendBeacon` calls are POST and start persisting after deploy. |
| F-023 | Info | NOT APPLICABLE — WITH EVIDENCE | Informational: production RLS already returns no rows to anon. The grants in F-011 are the remaining exposure. | None until F-011 is applied. |
| F-024 | Info | NOT APPLICABLE — WITH EVIDENCE | Documents that the app role bypasses RLS. That remains true and is required for Prisma. | Keep the Data API roles revoked. |
| F-025 | Info | NOT APPLICABLE — WITH EVIDENCE | Positive control: Shopify OAuth and session storage already exist. | Preserve them during the scope publish. |
| F-026 | Info | NOT APPLICABLE — WITH EVIDENCE | Positive control: merchant sync already refused the production API from staging. | Keep `APP_ENV=staging` on the staging services. |
| F-027 | Info | NOT APPLICABLE — WITH EVIDENCE | Positive control: staff and merchant sessions were already different cookies. | Do not add a merchant login to the staff dashboard. |
| F-028 | Info | IMPLEMENTED BUT NOT DEPLOYED | `.github/workflows/security.yml` runs the secret scan and unit tests that do not need a database. | Push the branch for GitHub to run it. Audit findings stay report-only until F-017 is upgraded. |
