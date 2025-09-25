-- Migration: Remplir les informations de variables dans TreeBranchLeafSubmissionData
-- Fichier: backfill_variables_info.sql

-- =========================================================================
-- MISE À JOUR DES INFORMATIONS DE VARIABLES MANQUANTES
-- =========================================================================

-- Mettre à jour tous les enregistrements avec les informations de variables
UPDATE "TreeBranchLeafSubmissionData" 
SET 
  "variableKey" = v."exposedKey",
  "variableDisplayName" = v."displayName",
  "variableUnit" = v."unit",
  "isVariable" = TRUE
FROM "TreeBranchLeafNodeVariable" v
WHERE "TreeBranchLeafSubmissionData"."nodeId" = v."nodeId" 
  AND "TreeBranchLeafSubmissionData"."isVariable" = FALSE;

-- Marquer comme non-variable les champs qui n'ont pas de variables associées
UPDATE "TreeBranchLeafSubmissionData"
SET "isVariable" = FALSE
WHERE "nodeId" NOT IN (
  SELECT "nodeId" FROM "TreeBranchLeafNodeVariable"
) AND "isVariable" IS NULL;

-- Vérifier le résultat
DO $$
DECLARE
    total_count INTEGER;
    variable_count INTEGER;
    non_variable_count INTEGER;
    rec RECORD;
BEGIN
    -- Compter les totaux
    SELECT COUNT(*) INTO total_count
    FROM "TreeBranchLeafSubmissionData";
    
    SELECT COUNT(*) INTO variable_count
    FROM "TreeBranchLeafSubmissionData"
    WHERE "isVariable" = TRUE;
    
    SELECT COUNT(*) INTO non_variable_count
    FROM "TreeBranchLeafSubmissionData"
    WHERE "isVariable" = FALSE;
    
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Migration des informations de variables terminée';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Total d''entrées: %', total_count;
    RAISE NOTICE 'Entrées avec variables: %', variable_count;
    RAISE NOTICE 'Entrées sans variables: %', non_variable_count;
    RAISE NOTICE '=============================================';
    
    -- Afficher quelques exemples de variables
    RAISE NOTICE 'Exemples de variables trouvées:';
    FOR rec IN 
        SELECT "variableKey", "variableDisplayName", "variableUnit", COUNT(*) as count
        FROM "TreeBranchLeafSubmissionData" 
        WHERE "isVariable" = TRUE 
        GROUP BY "variableKey", "variableDisplayName", "variableUnit"
        ORDER BY count DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  % (%): % entrées %', 
            rec."variableKey", 
            rec."variableDisplayName", 
            rec.count,
            COALESCE('(' || rec."variableUnit" || ')', '');
    END LOOP;
END $$;