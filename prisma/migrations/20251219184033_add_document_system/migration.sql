-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('QUOTE', 'INVOICE', 'ORDER', 'CONTRACT', 'PRESENTATION');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('COVER_PAGE', 'COMPANY_PRESENTATION', 'TEXT_BLOCK', 'PRODUCT_OFFER', 'PRICING_TABLE', 'CHART_ROI', 'CHART_BAR', 'CHART_LINE', 'CHART_PIE', 'IMAGE', 'TERMS_CONDITIONS', 'SIGNATURE_BLOCK', 'PAGE_BREAK', 'CUSTOM_HTML');

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'fr',
    "themeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdminOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "SectionType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "displayConditions" JSONB,
    "linkedNodeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedVariables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "translations" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#1890ff',
    "secondaryColor" TEXT NOT NULL DEFAULT '#52c41a',
    "accentColor" TEXT,
    "textColor" TEXT NOT NULL DEFAULT '#000000',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontFamily" TEXT NOT NULL DEFAULT 'Arial, sans-serif',
    "fontSize" INTEGER NOT NULL DEFAULT 12,
    "logoUrl" TEXT,
    "headerImageUrl" TEXT,
    "footerImageUrl" TEXT,
    "headerTemplate" JSONB NOT NULL DEFAULT '{}',
    "footerTemplate" JSONB NOT NULL DEFAULT '{}',
    "customStyles" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "leadId" TEXT,
    "templateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "pdfUrl" TEXT,
    "pdfFilename" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "dataSnapshot" JSONB,
    "clientAccessToken" TEXT,
    "clientViewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureUrl" TEXT,
    "signedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentAmount" DECIMAL(10,2),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "sentBy" TEXT,
    "documentNumber" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTemplate_organizationId_idx" ON "DocumentTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");

-- CreateIndex
CREATE INDEX "DocumentSection_templateId_idx" ON "DocumentSection"("templateId");

-- CreateIndex
CREATE INDEX "DocumentSection_order_idx" ON "DocumentSection"("order");

-- CreateIndex
CREATE INDEX "DocumentTheme_organizationId_idx" ON "DocumentTheme"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentTheme_isDefault_idx" ON "DocumentTheme"("isDefault");

-- CreateIndex
CREATE INDEX "GeneratedDocument_submissionId_idx" ON "GeneratedDocument"("submissionId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_leadId_idx" ON "GeneratedDocument"("leadId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_organizationId_idx" ON "GeneratedDocument"("organizationId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_idx" ON "GeneratedDocument"("type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_clientAccessToken_idx" ON "GeneratedDocument"("clientAccessToken");

-- CreateIndex
CREATE INDEX "GeneratedDocument_documentNumber_idx" ON "GeneratedDocument"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_clientAccessToken_key" ON "GeneratedDocument"("clientAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_documentNumber_key" ON "GeneratedDocument"("documentNumber");

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "DocumentTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSection" ADD CONSTRAINT "DocumentSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTheme" ADD CONSTRAINT "DocumentTheme_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "TreeBranchLeafSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
