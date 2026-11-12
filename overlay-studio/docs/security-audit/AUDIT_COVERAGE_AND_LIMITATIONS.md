# Audit coverage and limitations

**Date:** 11 November 2026  
**Mode:** Read-only. Reports in this folder are the only files added.

## Inspected

### Application code

- `overlay-studio/backend` — `app.js`, `server.js`, `src/index.js`, auth middleware, HMAC helpers, routes for auth, merchants, campaigns, analytics, Rakuten, proxy, Shopify sync, compliance, products, recommendation sets, recommendation preview, and conversion intelligence.
- Prisma schema and the seed script. Migration SQL files were not opened line by line; the live database was used as the source of truth for what exists.
- `overlay-studio/shopify-app` — Shopify server setup, admin index, uninstall and compliance routes, merchant sync, onboarding email, staging guard, database boot SQL, theme embed Liquid, and the overlay engine’s HTML construction.
- `overlay-studio/frontend/src` — router guard, API client, environment URL rules. Individual campaign-builder components were not reviewed for business logic beyond the auth and HTML-sink search.
- `overlay-studio/shared` — `appEnv.js`, `databaseGuard.js`, `serviceUrlGuard.js`.
- Shopify toml files, Railway JSON, Nixpacks, Vercel rewrite, gitignore files, and env **examples**.

### Live systems, read-only

- Supabase projects listed for the connected account. Full advisor and grant review of **Poptek Staging** and **implux-overlay**.
- Counts and privilege checks only. No `SELECT` of tokens, passwords, emails, order ids, or shop names.
- Railway project and environment inventory for three projects. No variable values.
- Git history for tracked env files: commit ids, dates, and which database **ref** a historical URL pointed at.

### Automated checks

- `npm audit` in `backend`, `shopify-app`, and `frontend`. No fixes applied.
- Existing test files were read for what they cover. The suite was not executed against a database.

## Not inspected, or only partly inspected

| Item | Why it is still open |
| --- | --- |
| Railway variable values | Reading them would pull secrets into the audit session. A human must compare names and host markers using the infrastructure report. |
| Whether the historical database password is still the live one | Not tested, so it is treated as live until rotation fails the old password. |
| Whether the seed password matches the live bcrypt hash | Not compared. |
| Supabase backup, PITR, network allow-list, and billing plan | Not on the SQL surface that was queried. |
| Vercel project settings, preview protection, and production headers | The repo only contains `vercel.json` rewrites for the staging API. |
| GitHub repository visibility and the old remote `implux-overlay-studio` | History on `origin/main` was confirmed. The old remote’s objects were not walked. |
| Inactive Supabase projects `email_test_db` and `Commission Tracker v.1` | Left alone. Commission-tracker Railway service was named and not reviewed. |
| `user-postgreslocal` connector | Error state. Unused. |
| Live HTTP calls to production or staging APIs | Not sent. They would either be a password guess or a download of secrets. |
| Anonymous-key HTTP call to the Data API | Not sent. Database grants already prove staging access. |
| Shopify Partner Dashboard, active installs, and actual granted scopes on live shops | Toml and code were reviewed. Dashboard can drift from toml. |
| Log drain contents | Not opened. Code shows what would be logged. |
| Container `USER`, Node version on Railway, and the Shopify Dockerfile body | Railway JSON was read. Image hardening was not. |
| Legal conclusions | Privacy observations are engineering facts. Counsel needs to decide statutes and Shopify protected-data paperwork. |
| Penetration test, load test, brute force | Out of scope and not performed. |

## Tools

- Repository search and file reads.
- Supabase MCP: `list_projects`, `get_advisors` type security, `execute_sql` for catalogs, grants, RLS flags, counts, role flags, and one `SET ROLE anon` count.
- Railway MCP: `list-projects`, `list-services`, `describe-environment`.
- `git ls-files`, `git log`, `git branch --contains`, and a classifier that was supposed to print only key names. One PowerShell `-match` printed a connection line into the tool log. The value is not copied into these reports. That accident is another reason to rotate the production database password.
- `npm audit --json` parsed down to package, severity, and whether the package sits on a runtime path.

## Tests not performed

- Merchant A versus merchant B against a running server. The code path was traced instead. Checklist items describe the tests to add.
- Webhook delivery to the live compliance URL.
- Theme Editor and a real storefront render.
- Restore drill.
- Exploit of npm advisories.

## Findings that need a human

1. Rotate the production database password and record whether the old one was rejected. F-001.
2. Confirm Railway staging and production variable host markers. F-016.
3. After rotation, decide Shopify token reissue. F-004.
4. Confirm Vercel preview access for `admin.implux.io` and the staging admin project. F-014.
5. Confirm Supabase backups and who can download them.
6. Confirm with counsel that the privacy webhook behavior, once fixed, matches the merchant agreement and Shopify’s protected-customer-data requirements for a custom app that requests `read_orders`.

## What “confirmed” means in the other reports

A confirmed finding was seen in code, git, or a database catalog. It is not a claim that an attacker already used it. Hypothesized impact is labeled in `SECURITY_FINDINGS.md`, especially the live admin password and the still-valid database password.

Passing a future unit test will not, by itself, mean the system is safe. The Data API grants, the database password, and the Shopify tokens are outside the unit-test boundary.
