# Database security audit

**Date:** 11 November 2026  
**Method:** Read-only Supabase advisor and SQL metadata. No customer rows, tokens, password hashes, or connection strings are copied here. No policies or data were changed.

## What database this is

The application does not use Supabase Auth, Storage, or the Supabase client library. Prisma in the backend and in the Shopify app both use `DATABASE_URL` and share one Postgres database per environment.

| Environment | Supabase project | Ref | Region | Engine | Status |
| --- | --- | --- | --- | --- | --- |
| Staging | Poptek Staging | `draguoqqidihfxovxfss` | us-west-2 | Postgres 17 | Active, healthy |
| Production | implux-overlay | `rpggayuuxnzdqybnmxyu` | us-west-2 | Postgres 17 | Active, healthy |

Also visible and not audited in depth: inactive projects `email_test_db` and `Commission Tracker v.1`. A local Postgres MCP connector was in an error state and was not used.

Schema comment in `backend/prisma/schema.prisma` still says “Railway managed DB.” The live databases are Supabase Postgres. Railway hosts the Node services, not these tables.

## Trust boundary

Row Level Security does **not** protect the running application.

- Tables are owned by `postgres`.
- `postgres` and `service_role` have `rolbypassrls = true`.
- `anon` and `authenticated` do not.
- Prisma uses the database URL, which is a privileged login. Every backend query runs with that privilege.
- Merchant isolation in the app is therefore whatever the route checks. The staff routes check only that some admin JWT is valid (finding F-005).

RLS matters for the Supabase Data API, which exposes `public` with the anonymous key. That key is designed to be public. RLS, not the key, is the control.

## Staging (Poptek Staging)

Advisor: `rls_disabled_in_public`, level error, facing external, 13 tables.

| Table | RLS | Forced | Policies | anon privileges | Rows (exact count) | Sensitive columns |
| --- | --- | --- | --- | --- | --- | --- |
| User | off | no | 0 | all, including TRUNCATE | 1 | `password` (bcrypt-shaped) |
| Merchant | off | no | 0 | all | 0 | `accessToken` |
| Session | off | no | 0 | all | 0 | `accessToken`, staff name and email columns |
| Campaign | off | no | 0 | all | 0 | design and promo fields |
| CampaignEvent | off | no | 0 | all | 0 | `orderId`, `orderValue` |
| RakutenCredentials | off | no | 0 | all | 0 | client secret, security token |
| RakutenTransaction | off | no | 0 | all | 0 | sale amounts |
| Product | off | no | 0 | all | 0 | product URL, SKU |
| RecommendationSet | off | no | 0 | all | 0 | trigger JSON |
| RecommendationSetProduct | off | no | 0 | all | 0 | links |
| OverlaySubmission | off | no | 0 | all | 0 | shop domain, vendor name |
| ShopifyWebhookDelivery | off | no | 0 | all | 0 | shop domain, topic |
| _prisma_migrations | off | no | 0 | all | not used as an exposure count | migration history |

`has_column_privilege('anon', Merchant.accessToken, SELECT)` is true. The same is true for `User.password` and `Session`.

Finding **F-002**. Staging is empty of merchant tokens today. The admin hash is not.

Storage buckets: 0. Public SQL functions: 0. `SECURITY DEFINER` functions in `public`: 0. `auth.users`: 0. Realtime tables in `public`: 0.

## Production (implux-overlay)

Advisor: `rls_enabled_no_policy`, level info, 13 tables. RLS on, force off, zero policies.

Anonymous role test: `count(*)` on `Merchant` as `anon` returned **0**. Privileged count returned **4**. RLS is hiding rows. Writes were not attempted.

Grants for `anon` and `authenticated` are still full (`SELECT` through `TRUNCATE`) on every application table. `service_role` bypasses RLS. Finding **F-011**.

| Table | RLS | Approx / exact rows | Non-empty secret-like column | Notes |
| --- | --- | --- | --- | --- |
| Merchant | on | 4 | 4 access tokens | Shop identity and Admin API token |
| Session | on | 16 | 13 access tokens | Also staff `email`, `firstName`, `lastName`, `userId` |
| User | on | 1 | 1 bcrypt-shaped password | Staff admin, not a shopper |
| Campaign | on | 11 | n/a | Promo and design JSON |
| CampaignEvent | on | 0 | 0 order ids | Schema can store order id and value |
| OverlaySubmission | on | 14 | n/a | Shop domain and vendor name |
| ShopifyWebhookDelivery | on | 100 | n/a | Delivery ids and shop domains |
| Product | on | 0 | n/a | |
| RecommendationSet | on | 0 | n/a | |
| RecommendationSetProduct | on | 0 | n/a | |
| RakutenCredentials | on | 0 | 0 | Plaintext secret columns exist |
| RakutenTransaction | on | 0 | n/a | |
| _prisma_migrations | on | 9 | n/a | |

No row contents were selected. Counts used `count(*)` and `count(*) FILTER` on emptiness or the bcrypt prefix only.

Storage buckets: 0. `auth.users`: 0. Realtime public tables: 0. Public `SECURITY DEFINER` functions: 0.

## Encryption and connections

- Historical and example URLs request `sslmode=require`. Supabase Postgres endpoints expect TLS. That is encryption in transit for database clients.
- Disk encryption at rest is a Supabase platform default. This audit did not open the project’s billing or compliance screen, so the plan’s backup and PITR terms were **not** verified.
- Application columns are not encrypted. Tokens and the Rakuten secret fields are ordinary text (F-004).
- Network allow-lists on the database were **not** visible in the queries that were run. The database hostname is on the public internet and is protected by the password plus TLS.

## Prisma and SQL injection

- Staff and proxy routes use Prisma query objects (`where`, `data`). Those are parameterized.
- Shopify app campaign counts use tagged `prisma.$queryRaw` with `${normalized}` bindings (`app._index.jsx` around lines 275–294). Those values are bound, not concatenated.
- `overlay-studio/shopify-app/app/db.server.js` uses `$executeRawUnsafe` for a fixed `CREATE TABLE` / index script for `OverlaySubmission`. The SQL text does not include request input. Risk is operational (ad-hoc DDL on boot), not injection from a merchant.
- No `$queryRawUnsafe` with user-string interpolation was found in application routes.
- Two Prisma major versions share this database: backend `@prisma/client` 5.22 and Shopify app Prisma 6.19. Migrations must stay compatible. A Shopify-only migration can break the backend, and the reverse.

## Tenant isolation

There is no `merchant_id` on the database role and no RLS policy that compares a shop claim. A merchant cannot cross tenants through RLS, because merchants never connect as `anon` with a shop claim. They cross, or not, at the API:

| Path | Isolation |
| --- | --- |
| Staff API | None beyond “is an admin.” Any id works. F-005. |
| Shopify embedded app | Queries filter on the session shop. F-026. |
| `/proxy` | Filters on the `shop` query parameter. That is public configuration, not an authorization check. F-006. |
| Data API staging | No isolation. F-002. |
| Data API production | Anonymous role sees no rows today. F-023. The app role sees all rows. |

Changing `shop` on `/proxy/campaigns` returns that other shop’s **active public** campaign config. It does not return `accessToken`. Changing `merchantId` on the staff API returns the other merchant’s full campaign record, and that API is not shop-authenticated.

## Data that should not be kept longer than needed

| Data | Why it exists | Retention in code |
| --- | --- | --- |
| Offline Admin token on `Merchant` | Backend may call Shopify later. `pushCampaignToStore` does not call Shopify yet. | Cleared to empty string on uninstall and shop redact. Row kept. |
| `Session.accessToken` plus staff name and email | Shopify session storage | Deleted on uninstall. **Not** deleted on shop redact. F-009. |
| `CampaignEvent.orderId` | Conversion attribution | Nulled on customer redact if the domain matches. Table is empty in production. |
| `OverlaySubmission` | Support email sequence number | Not deleted on shop redact. |
| `ShopifyWebhookDelivery` | Replay suppression | Indexed by `receivedAt`. No purge job was found. Production has about 100 rows. |
| Admin password hash | Staff login | No rotation job. |

Backups will keep deleted rows until backup expiry. Backup access control and expiry were **not** verified in the Supabase dashboard.

## Audit logging

No `pgaudit` setting was read. Supabase log drains were not opened. Application logs record shop domains on sync and compliance events. They must not start recording tokens or webhook bodies (F-013).

## Production and staging isolation

The two projects are different refs, regions-matched but not the same database. Code markers:

- Production ref constant: `rpggayuuxnzdqybnmxyu` in `stagingProcessGuard.server.js`
- Staging ref constant: `draguoqqidihfxovxfss`

Local gitignored files, classified by which ref they contain, not by their passwords:

- `overlay-studio/backend/.env` — production ref
- `overlay-studio/shopify-app/.env.staging` and `env/staging/.env` — staging ref
- `overlay-studio/shopify-app/.env` — neither ref

The guard that enforces this is not fatal on Railway unless variables are set (F-016). Railway values were not read.

## Credential handling

| Item | Result |
| --- | --- |
| Service-role key in application source | Not found |
| Anonymous key in application source | Not found |
| Production database URL in git history | Found. F-001. Value not recorded in this report. |
| Production database URL in current `HEAD` | Not tracked |
| Staging database URL in git history | Not in the historical `.env` that was classified |
| Direct SQL injection in app queries | Not found |

## Operator checks still required

These were not run, because they would reveal secrets or need the Supabase dashboard:

1. Confirm the database network restriction list, PITR, and backup retention for both projects.
2. Confirm the service-role key and database password exist only in Railway production or staging, not in both.
3. After F-002, repeat the anonymous `count(*)` test. It should fail for lack of privilege.
4. Do not `SELECT` token or password columns while doing that.
