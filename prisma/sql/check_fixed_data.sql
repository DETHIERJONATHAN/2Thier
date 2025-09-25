-- Script de vérification après réparation
-- Fichier: check_fixed_data.sql

-- =========================================================================
-- VÉRIFICATION DES DONNÉES APRÈS RÉPARATION
-- =========================================================================

-- 1. Vérifier les fieldLabel
SELECT 
  'fieldLabel' as type,
  COUNT(*) as total,
  COUNT("fieldLabel") as filled,
  COUNT(*) - COUNT("fieldLabel") as missing
FROM "TreeBranchLeafSubmissionData";

-- 2. Vérifier les variables
SELECT 
  'variables' as type,
  COUNT(*) as total,
  COUNT("variableKey") as filled,
  COUNT(*) - COUNT("variableKey") as missing
FROM "TreeBranchLeafSubmissionData";

-- 3. Vérifier isVariable
SELECT 
  'isVariable' as type,
  "isVariable",
  COUNT(*) as count
FROM "TreeBranchLeafSubmissionData"
GROUP BY "isVariable"
ORDER BY "isVariable";

-- 4. Échantillon de données réparées
SELECT 
  "id",
  "nodeId",
  "fieldLabel",
  "variableKey",
  "variableDisplayName", 
  "variableUnit",
  "isVariable"
FROM "TreeBranchLeafSubmissionData"
WHERE "fieldLabel" IS NOT NULL OR "variableKey" IS NOT NULL
LIMIT 10;