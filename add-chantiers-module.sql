-- 🏗️ Ajouter le module "Chantiers" au menu sidebar
-- Ce module gère le suivi des chantiers (pipeline post-signature)

DO $$
DECLARE
  module_id TEXT := 'module-chantiers-' || gen_random_uuid()::text;
  leads_category_id TEXT;
BEGIN
  -- Trouver la catégorie du module "leads" pour mettre Chantiers dans la même section
  SELECT "categoryId" INTO leads_category_id
  FROM "Module"
  WHERE key = 'leads'
  LIMIT 1;

  -- Fallback: utiliser la catégorie "Commercial" ou "Général"
  IF leads_category_id IS NULL THEN
    SELECT id INTO leads_category_id
    FROM "Category"
    WHERE name IN ('Commercial', 'Général')
    ORDER BY CASE WHEN name = 'Commercial' THEN 1 ELSE 2 END
    LIMIT 1;
  END IF;

  -- Insérer le module "Chantiers"
  INSERT INTO "Module" (
    id,
    key,
    label,
    feature,
    icon,
    route,
    description,
    "order",
    active,
    "categoryId",
    "createdAt",
    "updatedAt",
    "superAdminOnly"
  )
  VALUES (
    module_id,
    'chantiers',
    'Chantiers',
    'chantiers_access',
    'ToolOutlined',
    '/chantiers',
    'Suivi des chantiers et produits signés — pipeline post-commercial',
    15,
    true,
    leads_category_id,
    NOW(),
    NOW(),
    false
  )
  ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    "updatedAt" = NOW();

  -- Récupérer l'ID réel (si ON CONFLICT a mis à jour)
  SELECT id INTO module_id FROM "Module" WHERE key = 'chantiers';

  RAISE NOTICE 'Module "Chantiers" ajouté/mis à jour: %', module_id;

  -- Activer le module pour toutes les organisations existantes
  INSERT INTO "OrganizationModuleStatus" (
    id,
    "organizationId",
    "moduleId",
    active,
    "createdAt",
    "updatedAt"
  )
  SELECT
    'org-mod-chantiers-' || gen_random_uuid()::text,
    o.id,
    module_id,
    true,
    NOW(),
    NOW()
  FROM "Organization" o
  WHERE NOT EXISTS (
    SELECT 1
    FROM "OrganizationModuleStatus" oms
    WHERE oms."organizationId" = o.id
      AND oms."moduleId" = module_id
  );

  RAISE NOTICE 'Module Chantiers activé pour toutes les organisations';

END $$;
