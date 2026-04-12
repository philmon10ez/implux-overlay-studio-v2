-- CreateTable
CREATE TABLE "OverlaySubmission" (
    "id" SERIAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverlaySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OverlaySubmission_shopDomain_idx" ON "OverlaySubmission"("shopDomain");

-- CreateIndex
CREATE INDEX "OverlaySubmission_createdAt_idx" ON "OverlaySubmission"("createdAt");
