-- Script pour forcer la remontée des 4 variables existantes
-- Fichier: force_existing_variables_remount.sql

-- =========================================================================
-- FORCER LA REMONTÉE DES VARIABLES EXISTANTES
-- =========================================================================

-- Mettre à jour TreeBranchLeafSubmissionData avec les variables existantes
-- En cherchant les submissions qui correspondent aux nodeId des variables

UPDATE "TreeBranchLeafSubmissionData" 
SET 
    "variableKey" = v."exposedKey",
    "variableDisplayName" = v."displayName",
    "variableUnit" = v."unit",
    "isVariable" = true
FROM "TreeBranchLeafNodeVariable" v
WHERE "TreeBranchLeafSubmissionData"."nodeId" = v."nodeId";

-- Afficher le résultat pour debug
SELECT 
    'Mise à jour terminée' as status,
    COUNT(*) as submissions_updated
FROM "TreeBranchLeafSubmissionData"
WHERE "variableKey" IS NOT NULL;