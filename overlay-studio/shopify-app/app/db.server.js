import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Idempotent DDL for OverlaySubmission. Use when `DATABASE_URL` is shared with the
 * backend and `prisma migrate deploy` cannot run during startup (e.g. failed rows in
 * `_prisma_migrations` from another app). Safe to call before create.
 */
let ensureOverlaySubmissionPromise;
export async function ensureOverlaySubmissionTable() {
  if (!ensureOverlaySubmissionPromise) {
    ensureOverlaySubmissionPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "OverlaySubmission" (
            "id" SERIAL NOT NULL,
            "shopDomain" TEXT NOT NULL,
            "vendorName" TEXT NOT NULL,
            "rowCount" INTEGER NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "OverlaySubmission_pkey" PRIMARY KEY ("id")
          );
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "OverlaySubmission_shopDomain_idx" ON "OverlaySubmission"("shopDomain");`
        );
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "OverlaySubmission_createdAt_idx" ON "OverlaySubmission"("createdAt");`
        );
      } catch (e) {
        console.error('[Implux] ensureOverlaySubmissionTable:', e?.message || e);
        throw e;
      }
    })();
  }
  return ensureOverlaySubmissionPromise;
}

export default prisma;
