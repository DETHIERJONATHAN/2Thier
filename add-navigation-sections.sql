-- Migration : Ajouter le système de sections de navigation
-- Créé le : 25 août 2025
-- But : Rendre complètement dynamique la navigation (sections et modules)

-- 1. Créer la table NavigationSection
CREATE TABLE "NavigationSection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "iconName" TEXT NOT NULL DEFAULT 'AppstoreOutlined',
  "iconColor" TEXT NOT NULL DEFAULT '#13c2c2',
  "order" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NavigationSection_pkey" PRIMARY KEY ("id")
);

-- 2. Ajouter la colonne navigationSectionId à Module
ALTER TABLE "Module" ADD COLUMN "navigationSectionId" TEXT;
ALTER TABLE "Module" ADD COLUMN "orderInSection" INTEGER DEFAULT 1;

-- 3. Ajouter les contraintes foreign key
ALTER TABLE "NavigationSection" ADD CONSTRAINT "NavigationSection_organizationId_fkey" 
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Module" ADD CONSTRAINT "Module_navigationSectionId_fkey" 
  FOREIGN KEY ("navigationSectionId") REFERENCES "NavigationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Créer les index
CREATE INDEX "NavigationSection_organizationId_idx" ON "NavigationSection"("organizationId");
CREATE INDEX "NavigationSection_order_idx" ON "NavigationSection"("order");
CREATE INDEX "Module_navigationSectionId_idx" ON "Module"("navigationSectionId");
CREATE INDEX "Module_orderInSection_idx" ON "Module"("orderInSection");

-- 5. Insérer les sections par défaut pour l'organisation 2Thier CRM
INSERT INTO "NavigationSection" ("id", "name", "description", "iconName", "iconColor", "order", "active", "organizationId") VALUES
  ('admin-section', 'Administration', 'Modules, Rôles, Utilisateurs, Permissions, Synthèse des droits, Organisations, Telnyx', 'UserSwitchOutlined', '#f5222d', 1, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'),
  ('forms-section', 'Formulaires', 'Bloc', 'FormOutlined', '#52c41a', 2, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'),
  ('technical-section', 'Outils Techniques', 'Gestion des Tableaux', 'ToolOutlined', '#fa8c16', 3, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'),
  ('google-workspace-section', 'Google Workspace', 'Google Gmail, Google Drive, Google Meet, Google Docs, Google Sheets, Google Voice, Google Agenda', 'GoogleOutlined', '#4285f4', 4, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'),
  ('devis1minute-admin-section', 'Devis1Minute - Admin', 'Campagnes, Analytics, Formulaires Publics, Landing Pages', 'RocketOutlined', '#722ed1', 5, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'),
  ('devis1minute-section', 'Devis1Minute', 'Marketplace, Portail Partenaire, Mes Leads, Facturation', 'RocketOutlined', '#ff7a00', 6, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'),
  ('other-section', 'Autres Modules', 'Dashboard, Techniques, Clients, Agenda, Devis, Facturation, Leads, Mail, Profile, Settings', 'AppstoreOutlined', '#13c2c2', 7, true, '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de');

-- 6. Mettre à jour les modules existants pour les assigner aux bonnes sections
UPDATE "Module" SET 
  "navigationSectionId" = 'admin-section',
  "orderInSection" = 1
WHERE "key" IN ('super-admin-modules', 'super-admin-roles', 'super-admin-users', 'super-admin-permissions', 'super-admin-rights-summary', 'super-admin-organizations', 'super-admin-telnyx');

UPDATE "Module" SET 
  "navigationSectionId" = 'forms-section',
  "orderInSection" = 1
WHERE "key" IN ('bloc', 'super-admin-forms');

UPDATE "Module" SET 
  "navigationSectionId" = 'technical-section',
  "orderInSection" = 1
WHERE "key" IN ('super-admin-tableaux', 'gestion_tableaux', 'techniques');

UPDATE "Module" SET 
  "navigationSectionId" = 'google-workspace-section',
  "orderInSection" = 1
WHERE "key" LIKE 'google_%';

UPDATE "Module" SET 
  "navigationSectionId" = 'devis1minute-admin-section',
  "orderInSection" = 1
WHERE "key" IN ('super-admin-campaigns', 'super-admin-analytics', 'super-admin-public-forms', 'super-admin-landing-pages');

UPDATE "Module" SET 
  "navigationSectionId" = 'devis1minute-section',
  "orderInSection" = 1
WHERE "key" LIKE 'devis1minute_%' AND "key" NOT LIKE '%admin%';

UPDATE "Module" SET 
  "navigationSectionId" = 'other-section',
  "orderInSection" = 1
WHERE "navigationSectionId" IS NULL;

-- 7. Mettre à jour les ordres plus précis dans chaque section
-- Administration (ordre par importance)
UPDATE "Module" SET "orderInSection" = 1 WHERE "key" = 'super-admin-modules';
UPDATE "Module" SET "orderInSection" = 2 WHERE "key" = 'super-admin-roles';
UPDATE "Module" SET "orderInSection" = 3 WHERE "key" = 'super-admin-users';
UPDATE "Module" SET "orderInSection" = 4 WHERE "key" = 'super-admin-permissions';
UPDATE "Module" SET "orderInSection" = 5 WHERE "key" = 'super-admin-rights-summary';
UPDATE "Module" SET "orderInSection" = 6 WHERE "key" = 'super-admin-organizations';
UPDATE "Module" SET "orderInSection" = 7 WHERE "key" = 'super-admin-telnyx';

COMMIT;
