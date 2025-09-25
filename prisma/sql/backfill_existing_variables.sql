-- Script pour remplir les données existantes avec les variables
-- Fichier: backfill_existing_variables.sql

-- =========================================================================
-- BACKFILL DES DONNÉES EXISTANTES
-- =========================================================================

-- 1. Remplir les données des variables existantes
UPDATE "TreeBranchLeafSubmissionData" 
SET 
    "variableKey" = v."exposedKey",
    "variableDisplayName" = v."displayName",
    "variableUnit" = v."unit",
    "isVariable" = true
FROM "TreeBranchLeafNodeVariable" v
WHERE "TreeBranchLeafSubmissionData"."nodeId" = v."nodeId";

-- 2. S'assurer que isVariable = false pour les nodes sans variables
UPDATE "TreeBranchLeafSubmissionData"
SET "isVariable" = false
WHERE "isVariable" IS NULL OR ("variableKey" IS NULL AND "isVariable" = true);