-- Script de réparation forcée pour les variables et fieldLabel
-- Fichier: fix_missing_data.sql

-- =========================================================================
-- RÉPARATION FORCÉE DES DONNÉES MANQUANTES
-- =========================================================================

-- 1. D'abord remplir les fieldLabel depuis TreeBranchLeafNode
UPDATE "TreeBranchLeafSubmissionData" 
SET "fieldLabel" = n."label"
FROM "TreeBranchLeafNode" n
WHERE "TreeBranchLeafSubmissionData"."nodeId" = n."id" 
  AND "TreeBranchLeafSubmissionData"."fieldLabel" IS NULL;

-- 2. Remplir les informations de variables ET marquer isVariable = true
UPDATE "TreeBranchLeafSubmissionData" 
SET 
  "variableKey" = v."exposedKey",
  "variableDisplayName" = v."displayName",
  "variableUnit" = v."unit",
  "isVariable" = true
FROM "TreeBranchLeafNodeVariable" v
WHERE "TreeBranchLeafSubmissionData"."nodeId" = v."nodeId";

-- 3. Marquer isVariable = false pour les nodes qui N'ONT PAS de variables
UPDATE "TreeBranchLeafSubmissionData"
SET "isVariable" = false
WHERE "isVariable" IS NULL;