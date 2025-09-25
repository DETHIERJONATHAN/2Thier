-- Script pour remonter automatiquement les variables vers TreeBranchLeafSubmissionData
-- Fichier: auto_populate_variables.sql

-- =========================================================================
-- FONCTION POUR METTRE À JOUR TreeBranchLeafSubmissionData DEPUIS LES VARIABLES
-- =========================================================================

CREATE OR REPLACE FUNCTION update_submission_data_from_variable()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand une variable est créée/modifiée, mettre à jour tous les TreeBranchLeafSubmissionData correspondants
    UPDATE "TreeBranchLeafSubmissionData" 
    SET 
        "variableKey" = NEW."exposedKey",
        "variableDisplayName" = NEW."displayName",
        "variableUnit" = NEW."unit",
        "isVariable" = true
    WHERE "nodeId" = NEW."nodeId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- TRIGGER SUR TreeBranchLeafNodeVariable POUR AUTO-UPDATE
-- =========================================================================

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_submission_from_variable ON "TreeBranchLeafNodeVariable";

-- Créer le trigger pour INSERT et UPDATE
CREATE TRIGGER trigger_update_submission_from_variable
    AFTER INSERT OR UPDATE ON "TreeBranchLeafNodeVariable"
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_data_from_variable();

-- =========================================================================
-- FONCTION POUR NETTOYER QUAND UNE VARIABLE EST SUPPRIMÉE
-- =========================================================================

CREATE OR REPLACE FUNCTION cleanup_submission_data_from_deleted_variable()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand une variable est supprimée, nettoyer les TreeBranchLeafSubmissionData correspondants
    UPDATE "TreeBranchLeafSubmissionData" 
    SET 
        "variableKey" = NULL,
        "variableDisplayName" = NULL,
        "variableUnit" = NULL,
        "isVariable" = false
    WHERE "nodeId" = OLD."nodeId";
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- TRIGGER POUR SUPPRESSION DE VARIABLE
-- =========================================================================

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_cleanup_submission_from_deleted_variable ON "TreeBranchLeafNodeVariable";

-- Créer le trigger pour DELETE
CREATE TRIGGER trigger_cleanup_submission_from_deleted_variable
    AFTER DELETE ON "TreeBranchLeafNodeVariable"
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_submission_data_from_deleted_variable();