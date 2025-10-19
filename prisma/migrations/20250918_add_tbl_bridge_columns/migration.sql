-- Migration aligning TreeBranchLeaf bridge columns and public website system
-- Generated via prisma migrate diff to match existing production schema

-- CreateEnum
CREATE TYPE "public"."OperationSource" AS ENUM ('condition', 'formula', 'table', 'neutral');

-- DropForeignKey
ALTER TABLE "public"."CalculatedValue" DROP CONSTRAINT "CalculatedValue_leadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CalculatedValue" DROP CONSTRAINT "CalculatedValue_organizationId_fkey";

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode"
    ADD COLUMN "repeater_addButtonLabel" TEXT DEFAULT 'Ajouter une entrée',
    ADD COLUMN "repeater_maxItems" INTEGER,
    ADD COLUMN "repeater_minItems" INTEGER DEFAULT 0,
    ADD COLUMN "repeater_templateNodeIds" TEXT,
    ADD COLUMN "tbl_auto_generated" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "tbl_capacity" INTEGER,
    ADD COLUMN "tbl_code" VARCHAR(20),
    ADD COLUMN "tbl_created_at" TIMESTAMP(3),
    ADD COLUMN "tbl_type" INTEGER,
    ADD COLUMN "tbl_updated_at" TIMESTAMP(3),
    ADD COLUMN "text_helpTooltipImage" TEXT,
    ADD COLUMN "text_helpTooltipText" TEXT,
    ADD COLUMN "text_helpTooltipType" TEXT DEFAULT 'none';

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNodeTable"
    ADD COLUMN "lookupDisplayColumns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "lookupSelectColumn" TEXT;

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNodeVariable"
    ADD COLUMN "fixedValue" TEXT,
    ADD COLUMN "selectedNodeId" TEXT,
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "sourceType" TEXT DEFAULT 'fixed';

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafSelectConfig"
    ADD COLUMN "displayRow" TEXT,
    ADD COLUMN "keyRow" TEXT,
    ADD COLUMN "valueRow" TEXT;

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafSubmissionData"
    DROP COLUMN "calculatedValue",
    DROP COLUMN "metadata",
    ADD COLUMN "fieldLabel" TEXT,
    ADD COLUMN "isVariable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "lastResolved" TIMESTAMP(3),
    ADD COLUMN "operationDetail" JSONB,
    ADD COLUMN "operationResult" JSONB,
    ADD COLUMN "operationSource" "public"."OperationSource",
    ADD COLUMN "sourceRef" TEXT,
    ADD COLUMN "variableDisplayName" TEXT,
    ADD COLUMN "variableKey" TEXT,
    ADD COLUMN "variableUnit" TEXT;

-- DropTable
DROP TABLE "public"."CalculatedValue";

-- CreateTable
CREATE TABLE "public"."AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "model" TEXT,
    "tokensPrompt" INTEGER DEFAULT 0,
    "tokensOutput" INTEGER DEFAULT 0,
    "latencyMs" INTEGER,
    "success" BOOLEAN DEFAULT true,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."websites" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "siteType" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_configs" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "logoFileId" INTEGER,
    "faviconFileId" INTEGER,
    "primaryColor" TEXT NOT NULL DEFAULT '#10b981',
    "secondaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Belgique',
    "mapUrl" TEXT,
    "businessHours" JSONB,
    "socialLinks" JSONB,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroCtaPrimary" TEXT,
    "heroCtaSecondary" TEXT,
    "heroBackgroundFileId" INTEGER,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImageFileId" INTEGER,
    "stats" JSONB,
    "aboutText" TEXT,
    "valuesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_media_files" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "title" TEXT,
    "altText" TEXT,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "category" TEXT,
    "tags" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_services" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaUrl" TEXT,
    "imageFileId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_projects" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "imageFileId" INTEGER,
    "tags" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_testimonials" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "avatarFileId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_blog_posts" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverImageFileId" INTEGER,
    "tags" JSONB NOT NULL,
    "authorId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_sections" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "customCss" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_themes" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Thème par défaut',
    "primaryColor" TEXT NOT NULL DEFAULT '#10b981',
    "secondaryColor" TEXT NOT NULL DEFAULT '#059669',
    "accentColor" TEXT NOT NULL DEFAULT '#047857',
    "textColor" TEXT NOT NULL DEFAULT '#1f2937',
    "textLightColor" TEXT NOT NULL DEFAULT '#6b7280',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "surfaceColor" TEXT NOT NULL DEFAULT '#f9fafb',
    "fontTitle" TEXT NOT NULL DEFAULT 'Poppins',
    "fontText" TEXT NOT NULL DEFAULT 'Inter',
    "fontSizeBase" INTEGER NOT NULL DEFAULT 16,
    "borderRadius" INTEGER NOT NULL DEFAULT 12,
    "shadowLevel" TEXT NOT NULL DEFAULT 'medium',
    "spacingUnit" INTEGER NOT NULL DEFAULT 8,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicForm" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'contact',
    "slug" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "thankYouMessage" TEXT NOT NULL DEFAULT 'Merci pour votre soumission !',
    "redirectUrl" TEXT,
    "collectsRgpdConsent" BOOLEAN NOT NULL DEFAULT true,
    "autoPublishLeads" BOOLEAN NOT NULL DEFAULT false,
    "maxSubmissionsPerDay" INTEGER,
    "customCss" TEXT,
    "campaigns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSubmissionAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicFormSubmission" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "formId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "leadId" TEXT,
    "privacyConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_submissions" (
    "id" SERIAL NOT NULL,
    "websiteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "service" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "organizationId" TEXT,
    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "public"."AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_orgId_idx" ON "public"."AiUsageLog"("organizationId");

-- CreateIndex
CREATE INDEX "AiUsageLog_type_idx" ON "public"."AiUsageLog"("type");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_idx" ON "public"."AiUsageLog"("userId");

-- CreateIndex
CREATE INDEX "websites_organizationId_idx" ON "public"."websites"("organizationId");

-- CreateIndex
CREATE INDEX "websites_slug_idx" ON "public"."websites"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "websites_organizationId_slug_key" ON "public"."websites"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "website_configs_websiteId_key" ON "public"."website_configs"("websiteId");

-- CreateIndex
CREATE INDEX "website_configs_websiteId_idx" ON "public"."website_configs"("websiteId");

-- CreateIndex
CREATE INDEX "website_media_files_websiteId_idx" ON "public"."website_media_files"("websiteId");

-- CreateIndex
CREATE INDEX "website_media_files_category_idx" ON "public"."website_media_files"("category");

-- CreateIndex
CREATE INDEX "website_services_websiteId_idx" ON "public"."website_services"("websiteId");

-- CreateIndex
CREATE INDEX "website_services_displayOrder_idx" ON "public"."website_services"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "website_services_websiteId_key_key" ON "public"."website_services"("websiteId", "key");

-- CreateIndex
CREATE INDEX "website_projects_websiteId_idx" ON "public"."website_projects"("websiteId");

-- CreateIndex
CREATE INDEX "website_projects_isFeatured_idx" ON "public"."website_projects"("isFeatured");

-- CreateIndex
CREATE INDEX "website_projects_displayOrder_idx" ON "public"."website_projects"("displayOrder");

-- CreateIndex
CREATE INDEX "website_testimonials_websiteId_idx" ON "public"."website_testimonials"("websiteId");

-- CreateIndex
CREATE INDEX "website_testimonials_isFeatured_idx" ON "public"."website_testimonials"("isFeatured");

-- CreateIndex
CREATE INDEX "website_testimonials_displayOrder_idx" ON "public"."website_testimonials"("displayOrder");

-- CreateIndex
CREATE INDEX "website_blog_posts_websiteId_idx" ON "public"."website_blog_posts"("websiteId");

-- CreateIndex
CREATE INDEX "website_blog_posts_slug_idx" ON "public"."website_blog_posts"("slug");

-- CreateIndex
CREATE INDEX "website_blog_posts_isPublished_idx" ON "public"."website_blog_posts"("isPublished");

-- CreateIndex
CREATE INDEX "website_blog_posts_isFeatured_idx" ON "public"."website_blog_posts"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "website_blog_posts_websiteId_slug_key" ON "public"."website_blog_posts"("websiteId", "slug");

-- CreateIndex
CREATE INDEX "website_sections_websiteId_idx" ON "public"."website_sections"("websiteId");

-- CreateIndex
CREATE INDEX "website_sections_displayOrder_idx" ON "public"."website_sections"("displayOrder");

-- CreateIndex
CREATE INDEX "website_sections_isActive_idx" ON "public"."website_sections"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "website_sections_websiteId_key_key" ON "public"."website_sections"("websiteId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "website_themes_websiteId_key" ON "public"."website_themes"("websiteId");

-- CreateIndex
CREATE INDEX "website_themes_websiteId_idx" ON "public"."website_themes"("websiteId");

-- CreateIndex
CREATE INDEX "PublicForm_organizationId_isActive_idx" ON "public"."PublicForm"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "PublicForm_organizationId_deletedAt_idx" ON "public"."PublicForm"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicForm_organization_slug_unique" ON "public"."PublicForm"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "PublicFormSubmission_formId_createdAt_idx" ON "public"."PublicFormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "PublicFormSubmission_organizationId_createdAt_idx" ON "public"."PublicFormSubmission"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PublicFormSubmission_status_createdAt_idx" ON "public"."PublicFormSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_submissions_websiteId_idx" ON "public"."contact_submissions"("websiteId");

-- CreateIndex
CREATE INDEX "contact_submissions_organizationId_idx" ON "public"."contact_submissions"("organizationId");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "public"."contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_submittedAt_idx" ON "public"."contact_submissions"("submittedAt");

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "public"."contact_submissions"("email");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_tbl_auto_generated_idx" ON "public"."TreeBranchLeafNode"("tbl_auto_generated");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_tbl_capacity_idx" ON "public"."TreeBranchLeafNode"("tbl_capacity");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_tbl_code_idx" ON "public"."TreeBranchLeafNode"("tbl_code");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_tbl_type_idx" ON "public"."TreeBranchLeafNode"("tbl_type");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTable_lookupSelectColumn_idx" ON "public"."TreeBranchLeafNodeTable"("lookupSelectColumn");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeVariable_selectedNodeId_idx" ON "public"."TreeBranchLeafNodeVariable"("selectedNodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeVariable_sourceType_idx" ON "public"."TreeBranchLeafNodeVariable"("sourceType");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmissionData_isVariable_idx" ON "public"."TreeBranchLeafSubmissionData"("isVariable");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmissionData_operationSource_idx" ON "public"."TreeBranchLeafSubmissionData"("operationSource");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmissionData_sourceRef_idx" ON "public"."TreeBranchLeafSubmissionData"("sourceRef");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmissionData_variableKey_idx" ON "public"."TreeBranchLeafSubmissionData"("variableKey");

-- CreateIndex
CREATE INDEX "idx_tree_branch_leaf_submission_data_source_ref" ON "public"."TreeBranchLeafSubmissionData"("sourceRef");

-- AddForeignKey
ALTER TABLE "public"."websites" ADD CONSTRAINT "websites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_configs" ADD CONSTRAINT "website_configs_faviconFileId_fkey" FOREIGN KEY ("faviconFileId") REFERENCES "public"."website_media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_configs" ADD CONSTRAINT "website_configs_heroBackgroundFileId_fkey" FOREIGN KEY ("heroBackgroundFileId") REFERENCES "public"."website_media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_configs" ADD CONSTRAINT "website_configs_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "public"."website_media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_configs" ADD CONSTRAINT "website_configs_ogImageFileId_fkey" FOREIGN KEY ("ogImageFileId") REFERENCES "public"."website_media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_configs" ADD CONSTRAINT "website_configs_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_media_files" ADD CONSTRAINT "website_media_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_media_files" ADD CONSTRAINT "website_media_files_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_services" ADD CONSTRAINT "website_services_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_projects" ADD CONSTRAINT "website_projects_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_testimonials" ADD CONSTRAINT "website_testimonials_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_blog_posts" ADD CONSTRAINT "website_blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_blog_posts" ADD CONSTRAINT "website_blog_posts_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_sections" ADD CONSTRAINT "website_sections_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."website_themes" ADD CONSTRAINT "website_themes_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicForm" ADD CONSTRAINT "PublicForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicFormSubmission" ADD CONSTRAINT "PublicFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."PublicForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicFormSubmission" ADD CONSTRAINT "PublicFormSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_submissions" ADD CONSTRAINT "contact_submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_submissions" ADD CONSTRAINT "contact_submissions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
