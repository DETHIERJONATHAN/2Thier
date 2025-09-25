-- Migration: Remplir les fieldLabel manquants dans TreeBranchLeafSubmissionData
-- Fichier: backfill_field_labels.sql

-- =========================================================================
-- MISE À JOUR DES FIELD LABELS MANQUANTS
-- =========================================================================

-- Mettre à jour tous les enregistrements où fieldLabel est NULL
UPDATE "TreeBranchLeafSubmissionData" 
SET "fieldLabel" = n."label"
FROM "TreeBranchLeafNode" n
WHERE "TreeBranchLeafSubmissionData"."nodeId" = n."id" 
  AND "TreeBranchLeafSubmissionData"."fieldLabel" IS NULL;

-- Vérifier le résultat
DO $$
DECLARE
    updated_count INTEGER;
    total_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Compter les entrées mises à jour
    SELECT COUNT(*) INTO total_count
    FROM "TreeBranchLeafSubmissionData";
    
    SELECT COUNT(*) INTO null_count
    FROM "TreeBranchLeafSubmissionData"
    WHERE "fieldLabel" IS NULL;
    
    updated_count := total_count - null_count;
    
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Migration des fieldLabel terminée';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Total d''entrées: %', total_count;
    RAISE NOTICE 'Entrées avec fieldLabel: %', updated_count;
    RAISE NOTICE 'Entrées sans fieldLabel: %', null_count;
    RAISE NOTICE '=============================================';
    
    IF null_count > 0 THEN
        RAISE WARNING 'Il reste % entrées sans fieldLabel (probablement des nodeId invalides)', null_count;
    ELSE
        RAISE NOTICE 'Toutes les entrées ont maintenant un fieldLabel !';
    END IF;
END $$;