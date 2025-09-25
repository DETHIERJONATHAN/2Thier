-- CreateTable
CREATE TABLE "public"."AdPlatformIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSync" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlatformIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platformIntegrationId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "budget" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "costPerLead" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "roi" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "targetingData" JSONB NOT NULL DEFAULT '{}',
    "creativeData" JSONB NOT NULL DEFAULT '{}',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdMetrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ctr" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "cvr" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "cpc" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cpl" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "qualityScore" DECIMAL(3,1),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EcommerceIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSync" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcommerceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ecommerceIntegrationId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stock" INTEGER,
    "sku" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ecommerceIntegrationId" TEXT,
    "externalId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "billingAddress" JSONB NOT NULL DEFAULT '{}',
    "shippingAddress" JSONB NOT NULL DEFAULT '{}',
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "items" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "value" DECIMAL(10,2),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdPlatformIntegration_organizationId_idx" ON "public"."AdPlatformIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "AdPlatformIntegration_platform_idx" ON "public"."AdPlatformIntegration"("platform");

-- CreateIndex
CREATE INDEX "AdPlatformIntegration_status_idx" ON "public"."AdPlatformIntegration"("status");

-- CreateIndex
CREATE INDEX "AdCampaign_organizationId_idx" ON "public"."AdCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "public"."AdCampaign"("status");

-- CreateIndex
CREATE INDEX "AdCampaign_platformIntegrationId_idx" ON "public"."AdCampaign"("platformIntegrationId");

-- CreateIndex
CREATE INDEX "AdMetrics_campaignId_idx" ON "public"."AdMetrics"("campaignId");

-- CreateIndex
CREATE INDEX "AdMetrics_date_idx" ON "public"."AdMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdMetrics_campaignId_date_key" ON "public"."AdMetrics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "EcommerceIntegration_organizationId_idx" ON "public"."EcommerceIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "EcommerceIntegration_platform_idx" ON "public"."EcommerceIntegration"("platform");

-- CreateIndex
CREATE INDEX "EcommerceIntegration_status_idx" ON "public"."EcommerceIntegration"("status");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "public"."Product"("organizationId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "public"."Product"("status");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "public"."Product"("category");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "public"."Product"("sku");

-- CreateIndex
CREATE INDEX "Order_organizationId_idx" ON "public"."Order"("organizationId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "public"."Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "public"."Order"("orderDate");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "public"."Order"("customerEmail");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_idx" ON "public"."AnalyticsEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "public"."AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_source_idx" ON "public"."AnalyticsEvent"("source");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "public"."AnalyticsEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."AdPlatformIntegration" ADD CONSTRAINT "AdPlatformIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdCampaign" ADD CONSTRAINT "AdCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdCampaign" ADD CONSTRAINT "AdCampaign_platformIntegrationId_fkey" FOREIGN KEY ("platformIntegrationId") REFERENCES "public"."AdPlatformIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdMetrics" ADD CONSTRAINT "AdMetrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EcommerceIntegration" ADD CONSTRAINT "EcommerceIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_ecommerceIntegrationId_fkey" FOREIGN KEY ("ecommerceIntegrationId") REFERENCES "public"."EcommerceIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_ecommerceIntegrationId_fkey" FOREIGN KEY ("ecommerceIntegrationId") REFERENCES "public"."EcommerceIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
