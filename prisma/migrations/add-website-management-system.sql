-- Migration: Système de gestion multi-sites
-- Création des tables pour gérer les sites web (Site Vitrine 2Thier, Devis1Minute, etc.)

-- Table principale des sites web
CREATE TABLE "websites" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER NOT NULL,
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
  
  CONSTRAINT "websites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
  CONSTRAINT "websites_organizationId_slug_key" UNIQUE ("organizationId", "slug")
);

CREATE INDEX "websites_organizationId_idx" ON "websites"("organizationId");
CREATE INDEX "websites_slug_idx" ON "websites"("slug");

-- Table de configuration des sites
CREATE TABLE "website_configs" (
  "id" SERIAL PRIMARY KEY,
  "websiteId" INTEGER NOT NULL UNIQUE,
  
  -- Identité visuelle
  "logoFileId" INTEGER,
  "faviconFileId" INTEGER,
  "primaryColor" TEXT NOT NULL DEFAULT '#10b981',
  "secondaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
  
  -- Coordonnées
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Belgique',
  "mapUrl" TEXT,
  "businessHours" JSONB,
  
  -- Réseaux sociaux
  "socialLinks" JSONB,
  
  -- Hero section
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "heroCtaPrimary" TEXT,
  "heroCtaSecondary" TEXT,
  "heroBackgroundFileId" INTEGER,
  
  -- SEO
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "metaKeywords" TEXT,
  "ogImageFileId" INTEGER,
  
  -- Statistiques affichées
  "stats" JSONB,
  
  -- Contenu personnalisable
  "aboutText" TEXT,
  "valuesJson" JSONB,
  
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "website_configs_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);

CREATE INDEX "website_configs_websiteId_idx" ON "website_configs"("websiteId");

-- Table des fichiers/médias
CREATE TABLE "website_media_files" (
  "id" SERIAL PRIMARY KEY,
  "websiteId" INTEGER NOT NULL,
  
  -- Fichier
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  
  -- Métadonnées
  "title" TEXT,
  "altText" TEXT,
  "caption" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  
  -- Catégorisation
  "category" TEXT,
  "tags" JSONB,
  
  -- Statut
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  
  "uploadedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "website_media_files_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "website_media_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "website_media_files_websiteId_idx" ON "website_media_files"("websiteId");
CREATE INDEX "website_media_files_category_idx" ON "website_media_files"("category");

-- Ajouter les FK pour les fichiers dans website_configs
ALTER TABLE "website_configs" ADD CONSTRAINT "website_configs_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "website_media_files"("id") ON DELETE SET NULL;
ALTER TABLE "website_configs" ADD CONSTRAINT "website_configs_faviconFileId_fkey" FOREIGN KEY ("faviconFileId") REFERENCES "website_media_files"("id") ON DELETE SET NULL;
ALTER TABLE "website_configs" ADD CONSTRAINT "website_configs_heroBackgroundFileId_fkey" FOREIGN KEY ("heroBackgroundFileId") REFERENCES "website_media_files"("id") ON DELETE SET NULL;
ALTER TABLE "website_configs" ADD CONSTRAINT "website_configs_ogImageFileId_fkey" FOREIGN KEY ("ogImageFileId") REFERENCES "website_media_files"("id") ON DELETE SET NULL;

-- Table des services
CREATE TABLE "website_services" (
  "id" SERIAL PRIMARY KEY,
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
  
  CONSTRAINT "website_services_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "website_services_websiteId_key_key" UNIQUE ("websiteId", "key")
);

CREATE INDEX "website_services_websiteId_idx" ON "website_services"("websiteId");
CREATE INDEX "website_services_displayOrder_idx" ON "website_services"("displayOrder");

-- Table des projets/réalisations
CREATE TABLE "website_projects" (
  "id" SERIAL PRIMARY KEY,
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
  
  CONSTRAINT "website_projects_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);

CREATE INDEX "website_projects_websiteId_idx" ON "website_projects"("websiteId");
CREATE INDEX "website_projects_isFeatured_idx" ON "website_projects"("isFeatured");
CREATE INDEX "website_projects_displayOrder_idx" ON "website_projects"("displayOrder");

-- Table des témoignages
CREATE TABLE "website_testimonials" (
  "id" SERIAL PRIMARY KEY,
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
  
  CONSTRAINT "website_testimonials_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);

CREATE INDEX "website_testimonials_websiteId_idx" ON "website_testimonials"("websiteId");
CREATE INDEX "website_testimonials_isFeatured_idx" ON "website_testimonials"("isFeatured");
CREATE INDEX "website_testimonials_displayOrder_idx" ON "website_testimonials"("displayOrder");

-- Table des articles de blog
CREATE TABLE "website_blog_posts" (
  "id" SERIAL PRIMARY KEY,
  "websiteId" INTEGER NOT NULL,
  
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "coverImageFileId" INTEGER,
  "tags" JSONB NOT NULL,
  
  "authorId" INTEGER,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "website_blog_posts_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "website_blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "website_blog_posts_websiteId_slug_key" UNIQUE ("websiteId", "slug")
);

CREATE INDEX "website_blog_posts_websiteId_idx" ON "website_blog_posts"("websiteId");
CREATE INDEX "website_blog_posts_slug_idx" ON "website_blog_posts"("slug");
CREATE INDEX "website_blog_posts_isPublished_idx" ON "website_blog_posts"("isPublished");
CREATE INDEX "website_blog_posts_isFeatured_idx" ON "website_blog_posts"("isFeatured");

-- Commentaires sur les tables
COMMENT ON TABLE "websites" IS 'Gestion multi-sites (Site Vitrine, Devis1Minute, etc.)';
COMMENT ON TABLE "website_configs" IS 'Configuration et contenu de chaque site';
COMMENT ON TABLE "website_media_files" IS 'Fichiers uploadés (images, vidéos, etc.)';
COMMENT ON TABLE "website_services" IS 'Services proposés sur chaque site';
COMMENT ON TABLE "website_projects" IS 'Projets et réalisations';
COMMENT ON TABLE "website_testimonials" IS 'Témoignages clients';
COMMENT ON TABLE "website_blog_posts" IS 'Articles de blog';
