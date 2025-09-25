-- Script pour remonter automatiquement les informations depuis sourceRef
-- Fichier: populate_from_source_ref.sql

-- =========================================================================
-- FONCTION POUR REMONTER LES DONNÉES DEPUIS LES TABLES SOURCES
-- =========================================================================

CREATE OR REPLACE FUNCTION populate_tree_branch_leaf_from_source_ref()
RETURNS TRIGGER AS $$
DECLARE
    source_type TEXT;
    source_id TEXT;
    condition_record RECORD;
    formula_record RECORD;
    table_record RECORD;
BEGIN
    -- Si sourceRef est défini, extraire le type et l'ID
    IF NEW."sourceRef" IS NOT NULL AND NEW."sourceRef" != '' THEN
        -- Format attendu: "condition:uuid", "formula:uuid", "table:uuid"
        source_type := split_part(NEW."sourceRef", ':', 1);
        source_id := split_part(NEW."sourceRef", ':', 2);
        
        -- Traitement selon le type de source
        CASE source_type
            WHEN 'condition' THEN
                -- Récupérer les informations depuis TreeBranchLeafNodeCondition
                SELECT * INTO condition_record 
                FROM "TreeBranchLeafNodeCondition" 
                WHERE "id" = source_id;
                
                IF FOUND THEN
                    NEW."operationSource" := 'condition';
                    NEW."operationDetail" := json_build_object(
                        'type', 'condition',
                        'name', condition_record."name",
                        'description', condition_record."description",
                        'conditionSet', condition_record."conditionSet",
                        'isDefault', condition_record."isDefault",
                        'order', condition_record."order"
                    );
                    NEW."lastResolved" := NOW();
                END IF;
                
            WHEN 'formula' THEN
                -- Récupérer les informations depuis TreeBranchLeafNodeFormula
                SELECT * INTO formula_record 
                FROM "TreeBranchLeafNodeFormula" 
                WHERE "id" = source_id;
                
                IF FOUND THEN
                    NEW."operationSource" := 'formula';
                    NEW."operationDetail" := json_build_object(
                        'type', 'formula',
                        'nodeId', formula_record."nodeId",
                        'name', formula_record."name",
                        'description', formula_record."description",
                        'tokens', formula_record."tokens",
                        'isDefault', formula_record."isDefault",
                        'order', formula_record."order"
                    );
                    NEW."lastResolved" := NOW();
                END IF;
                
            WHEN 'table' THEN
                -- Récupérer les informations depuis TreeBranchLeafNodeTable
                SELECT * INTO table_record 
                FROM "TreeBranchLeafNodeTable" 
                WHERE "id" = source_id;
                
                IF FOUND THEN
                    NEW."operationSource" := 'table';
                    NEW."operationDetail" := json_build_object(
                        'type', 'table',
                        'name', table_record."name",
                        'description', table_record."description",
                        'tableType', table_record."type",
                        'columns', table_record."columns",
                        'rows', table_record."rows",
                        'data', table_record."data",
                        'meta', table_record."meta"
                    );
                    NEW."lastResolved" := NOW();
                END IF;
        END CASE;
    END IF;
    
    -- Continuer avec la logique existante pour fieldLabel et variables
    IF NEW."fieldLabel" IS NULL THEN
        SELECT "label" INTO NEW."fieldLabel" 
        FROM "TreeBranchLeafNode" 
        WHERE "id" = NEW."nodeId";
    END IF;
    
    -- Remplir les informations de variables si elles existent
    IF NEW."variableKey" IS NULL THEN
        SELECT 
            v."exposedKey",
            v."displayName", 
            v."unit"
        INTO 
            NEW."variableKey",
            NEW."variableDisplayName",
            NEW."variableUnit"
        FROM "TreeBranchLeafNodeVariable" v
        WHERE v."nodeId" = NEW."nodeId";
        
        IF FOUND THEN
            NEW."isVariable" := true;
        ELSE
            NEW."isVariable" := false;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- TRIGGER POUR AUTO-REMPLISSAGE DEPUIS SOURCE REF
-- =========================================================================

DROP TRIGGER IF EXISTS trigger_populate_from_source_ref ON "TreeBranchLeafSubmissionData";

CREATE TRIGGER trigger_populate_from_source_ref
    BEFORE INSERT OR UPDATE ON "TreeBranchLeafSubmissionData"
    FOR EACH ROW
    EXECUTE FUNCTION populate_tree_branch_leaf_from_source_ref();