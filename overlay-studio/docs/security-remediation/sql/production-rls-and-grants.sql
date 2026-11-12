-- Poptek production database hardening (F-002, F-011)
-- Project: implux-overlay (rpggayuuxnzdqybnmxyu)
-- Status: REVIEW ONLY. Do not execute until the production database
-- password rotation in CREDENTIAL_ROTATION_RUNBOOK.md is complete and
-- an operator approves this script in the production Supabase SQL editor.
--
-- This is not a Prisma migration.
--
-- Production tables already have row level security enabled and no policies.
-- This script does not disable that. It does not add USING (true) policies.
-- It revokes anon and authenticated privileges that still allow a denied-by-policy
-- read to be attempted, and it removes write privileges.
--
-- Expected application impact:
--   The Railway services connect as the privileged database role and bypass
--   row level security as the table owner. Merchant rendering, Prisma, and
--   Shopify session storage keep working.
--   The Supabase Data API can no longer read or write application tables.
--   There is a short lock while REVOKE runs. Schedule it in a maintenance window.

-- ---------------------------------------------------------------------------
-- 1. Preflight. Save the output. Abort if the host is not rpggayuuxnzdqybnmxyu.
-- ---------------------------------------------------------------------------

SELECT current_database() AS database_name, current_user AS executing_role;

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- 2. Changes.
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
-- 3. Verification.
-- ---------------------------------------------------------------------------

-- SET ROLE anon;
-- SELECT count(*) FROM public."Merchant";
-- Expected: ERROR 42501 permission denied for table Merchant
-- RESET ROLE;
--
-- From the application role, SELECT count(*) FROM public."Merchant" must succeed.
-- Then open one production storefront and the staff dashboard and confirm
-- campaigns and login still work.

-- ---------------------------------------------------------------------------
-- 4. Rollback. This restores the exposure. Operator approval required.
-- ---------------------------------------------------------------------------

-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
