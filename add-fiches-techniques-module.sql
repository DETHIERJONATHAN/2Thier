-- Ajout du module "Fiches Techniques" dans la catégorie "Modules CRM"
-- Ce module permet de gérer les fiches techniques produits (panneaux, onduleurs, etc.)

-- 1. Insérer le module
INSERT INTO "Module" (
  "id", "key", "label", "feature", "icon", "route", "description", 
  "order", "active", "categoryId", "superAdminOnly", "createdAt", "updatedAt"
) VALUES (
  'fiches-techniques-module',
  'fiches_techniques',
  'Fiches Techniques',
  'fiches_techniques',
  'FileSearchOutlined',
  '/fiches-techniques',
  'Gestion des fiches techniques produits (panneaux solaires, onduleurs, etc.)',
  55,
  true,
  '424819f0-a8fb-4a49-961d-17d041b9c372',  -- Catégorie "Modules CRM"
  false,
  NOW(),
  NOW()
) ON CONFLICT ("key") DO NOTHING;

-- 2. Activer le module pour TOUTES les organisations existantes
INSERT INTO "OrganizationModuleStatus" ("id", "organizationId", "moduleId", "active", "createdAt", "updatedAt")
SELECT 
  'oms-ft-' || "id",
  "id",
  'fiches-techniques-module',
  true,
  NOW(),
  NOW()
FROM "Organization"
ON CONFLICT ("organizationId", "moduleId") DO NOTHING;

-- Vérification
SELECT m.id, m.key, m.label, m.feature, m.route, m.icon, c.name as category_name
FROM "Module" m
LEFT JOIN "Category" c ON m."categoryId" = c.id
WHERE m.key = 'fiches_techniques';
