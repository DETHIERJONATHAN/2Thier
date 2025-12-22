-- Script SQL pour ajouter le module "Gérer les documents" dans la catégorie Administration
--
-- Ce script :
-- 1. Trouve l'ID de la catégorie "Administration"
-- 2. Crée un nouveau module "Gérer les documents" avec la route /admin/documents
-- 3. L'associe à la catégorie Administration
-- 4. Le rend visible uniquement pour les super admins

-- ⚠️ EXÉCUTER CE SCRIPT AVEC PRISMA STUDIO OU psql

DO $$
DECLARE
  admin_category_id TEXT;
  module_id TEXT := 'documents-admin-module';
BEGIN
  -- 1. Trouver l'ID de la catégorie "Administration"
  SELECT id INTO admin_category_id
  FROM "Category"
  WHERE name = 'Administration'
  LIMIT 1;

  -- 2. Vérifier si la catégorie existe
  IF admin_category_id IS NULL THEN
    RAISE NOTICE 'ATTENTION: La catégorie "Administration" n''existe pas. Le module sera créé sans catégorie.';
  ELSE
    RAISE NOTICE 'Catégorie Administration trouvée: %', admin_category_id;
  END IF;

  -- 3. Vérifier si le module existe déjà
  IF EXISTS (SELECT 1 FROM "Module" WHERE key = 'documents_admin' OR id = module_id) THEN
    RAISE NOTICE 'Le module documents_admin existe déjà. Mise à jour...';
    
    UPDATE "Module"
    SET
      "label" = 'Gérer les documents',
      "feature" = 'documents_admin',
      "icon" = 'FileTextOutlined',
      "route" = '/admin/documents',
      "description" = 'Créer et gérer les modèles de documents PDF (devis, factures, contrats)',
      "order" = 50,
      "active" = TRUE,
      "superAdminOnly" = TRUE,
      "categoryId" = admin_category_id,
      "updatedAt" = NOW()
    WHERE key = 'documents_admin' OR id = module_id;
    
    RAISE NOTICE '✅ Module mis à jour';
  ELSE
    -- 4. Créer le nouveau module
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
      "superAdminOnly",
      "categoryId",
      "organizationId",
      "createdAt",
      "updatedAt"
    ) VALUES (
      module_id,
      'documents_admin',
      'Gérer les documents',
      'documents_admin',
      'FileTextOutlined',
      '/admin/documents',
      'Créer et gérer les modèles de documents PDF (devis, factures, contrats)',
      50,
      TRUE,
      TRUE,
      admin_category_id,
      NULL, -- Module global
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Module créé avec succès';
  END IF;

  -- 5. Afficher le résultat
  RAISE NOTICE '📄 Module "Gérer les documents" configuré:';
  RAISE NOTICE '   - Route: /admin/documents';
  RAISE NOTICE '   - Icône: FileTextOutlined';
  RAISE NOTICE '   - SuperAdmin uniquement: OUI';
  RAISE NOTICE '   - Catégorie: %', COALESCE(admin_category_id, 'Aucune');
END $$;
