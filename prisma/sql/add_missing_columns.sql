-- Migration pour ajouter les colonnes manquantes à TreeBranchLeafSubmissionData
-- Fichier: add_missing_columns.sql

-- =========================================================================
-- AJOUT DES COLONNES MANQUANTES POUR LES VARIABLES
-- =========================================================================

-- Ajouter fieldLabel
ALTER TABLE "TreeBranchLeafSubmissionData" 
ADD COLUMN IF NOT EXISTS "fieldLabel" TEXT;

-- Ajouter les colonnes variables
ALTER TABLE "TreeBranchLeafSubmissionData" 
ADD COLUMN IF NOT EXISTS "variableKey" TEXT;

ALTER TABLE "TreeBranchLeafSubmissionData" 
ADD COLUMN IF NOT EXISTS "variableDisplayName" TEXT;

ALTER TABLE "TreeBranchLeafSubmissionData" 
ADD COLUMN IF NOT EXISTS "variableUnit" TEXT;

ALTER TABLE "TreeBranchLeafSubmissionData" 
ADD COLUMN IF NOT EXISTS "isVariable" BOOLEAN DEFAULT false;

-- Ajouter les index pour performance
CREATE INDEX IF NOT EXISTS "idx_tree_branch_leaf_submission_data_field_label" 
ON "TreeBranchLeafSubmissionData"("fieldLabel");

CREATE INDEX IF NOT EXISTS "idx_tree_branch_leaf_submission_data_variable_key" 
ON "TreeBranchLeafSubmissionData"("variableKey");

CREATE INDEX IF NOT EXISTS "idx_tree_branch_leaf_submission_data_is_variable" 
ON "TreeBranchLeafSubmissionData"("isVariable");

-- Vérification des colonnes ajoutées
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'TreeBranchLeafSubmissionData' 
  AND table_schema = 'public'
  AND column_name IN ('fieldLabel', 'variableKey', 'variableDisplayName', 'variableUnit', 'isVariable')
ORDER BY column_name;