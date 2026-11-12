-- Poptek staging database hardening (F-002, F-011)
-- Project: Poptek Staging (draguoqqidihfxovxfss)
-- Status: REVIEW ONLY. Do not execute until an operator approves it
-- in the Supabase SQL editor for this project.
--
-- This is not a Prisma migration. Do not place it under prisma/migrations.
--
-- Intended effect:
--   * Enable row level security on application tables.
--   * Do not FORCE row level security (the table owner, used by Prisma, keeps access).
--   * Revoke anon and authenticated privileges on existing public tables,
--     sequences, and functions.
--   * Revoke default privileges so future objects are not granted to those roles.
--   * Create no policies. A missing policy denies anon/authenticated.
--   * Do not change table ownership.
--   * Do not grant Shopify tokens or session rows to the Data API.
--
-- Expected application impact:
--   Railway backend and Shopify Remix use the privileged DATABASE_URL role
--   (the table owner / postgres). That path is unchanged.
--   The public Supabase Data API (anon key, authenticated key) loses
--   SELECT, INSERT, UPDATE, DELETE, and TRUNCATE on these tables.
--   Confirm no client currently uses the Supabase JS client against these tables
--   before applying. The audited apps use Prisma, not the Data API.

-- ---------------------------------------------------------------------------
-- 1. Preflight. Run this block first and save the output.
-- ---------------------------------------------------------------------------

SELECT current_database() AS database_name, current_user AS executing_role;

-- Stop if database_name or the host is not the staging project
-- draguoqqidihfxovxfss.

SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'S')
ORDER BY c.relkind, c.relname;

SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- 2. Changes. Execute only after the preflight shows the staging project.
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CampaignEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RakutenCredentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RakutenTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RecommendationSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RecommendationSetProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OverlaySubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ShopifyWebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 3. Verification. anon must receive a permission error, not an empty result.
-- ---------------------------------------------------------------------------

-- SET ROLE anon;
-- SELECT count(*) FROM public."Merchant";
-- Expected: ERROR 42501 permission denied for table Merchant
-- RESET ROLE;
--
-- Repeat for "Session", "RakutenCredentials", and "OverlaySubmission".
-- Then, using the Prisma/postgres role (a normal app connection), confirm:
--   SELECT count(*) FROM public."Merchant";
-- returns a number. That proves the application role still has access.

-- ---------------------------------------------------------------------------
-- 4. Rollback. Re-granting restores the Data API exposure. Do not run this
-- unless an operator explicitly accepts that exposure again.
-- ---------------------------------------------------------------------------

-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
-- ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY;
-- (repeat DISABLE for each table enabled above)
