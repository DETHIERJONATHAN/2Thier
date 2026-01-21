-- 🎯 Ajouter le module "Mes Liens Commerciaux"
-- Ce module permet aux commerciaux d'obtenir leurs liens de tracking personnalisés

DO $$
DECLARE
  module_id TEXT := 'module-commercial-links-' || gen_random_uuid()::text;
  general_category_id TEXT;
BEGIN
  -- Trouver la catégorie "Général" (ou créer si n'existe pas)
  SELECT id INTO general_category_id
  FROM "Category"
  WHERE name = 'Général'
  LIMIT 1;

  IF general_category_id IS NULL THEN
    general_category_id := 'category-general-' || gen_random_uuid()::text;
    INSERT INTO "Category" (id, name, description, icon, "order", "createdAt", "updatedAt")
    VALUES (
      general_category_id,
      'Général',
      'Fonctionnalités générales',
      'FaCogs',
      0,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Catégorie Général créée: %', general_category_id;
  END IF;

  -- Insérer le module "Mes Liens Commerciaux"
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
    'commercial_tracking_links',
    'Mes Liens Commerciaux',
    'commercial_tracking_links',
    'FaLink',
    '/mes-liens-commerciaux',
    'Obtenez vos liens de tracking personnalisés pour attribuer automatiquement les leads',
    100,
    true,
    general_category_id,
    NOW(),
    NOW(),
    false
  )
  ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    route = EXCLUDED.route,
    "updatedAt" = NOW();

  RAISE NOTICE 'Module "Mes Liens Commerciaux" ajouté/mis à jour: %', module_id;

  -- Activer le module pour toutes les organisations existantes
  INSERT INTO "OrganizationModuleStatus" (
    id,
    "organizationId",
    "moduleId",
    status,
    "createdAt",
    "updatedAt"
  )
  SELECT
    'org-mod-' || gen_random_uuid()::text,
    o.id,
    module_id,
    'ACTIVE',
    NOW(),
    NOW()
  FROM "Organization" o
  WHERE NOT EXISTS (
    SELECT 1
    FROM "OrganizationModuleStatus" oms
    WHERE oms."organizationId" = o.id
      AND oms."moduleId" = module_id
  );

  RAISE NOTICE 'Module activé pour toutes les organisations';

END $$;
