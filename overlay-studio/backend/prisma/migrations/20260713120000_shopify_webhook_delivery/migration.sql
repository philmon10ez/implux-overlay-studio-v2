-- CreateTable
CREATE TABLE "ShopifyWebhookDelivery" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyWebhookDelivery_receivedAt_idx" ON "ShopifyWebhookDelivery"("receivedAt");
