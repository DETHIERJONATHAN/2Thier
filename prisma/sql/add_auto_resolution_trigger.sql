-- Migration: Ajouter trigger auto-résolution pour TreeBranchLeafSubmissionData
-- Fichier: add_auto_resolution_trigger.sql

-- =========================================================================
-- FONCTION DE TRIGGER POUR AUTO-RÉSOLUTION DES OPÉRATIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION auto_resolve_tree_branch_leaf_operations()
RETURNS TRIGGER AS $$
DECLARE
    operation_content JSONB;
    source_type TEXT;
    source_id TEXT;
    node_label TEXT;
    var_key TEXT;
    var_display_name TEXT;
    var_unit TEXT;
    var_exists BOOLEAN := FALSE;
BEGIN
    -- Vérifier si sourceRef est rempli mais operationDetail est vide
    IF NEW."sourceRef" IS NOT NULL AND NEW."operationDetail" IS NULL AND NEW."operationSource" IS NOT NULL THEN
        
        -- Extraire le type et l'ID depuis sourceRef (format: "condition:abc123")
        source_type := split_part(NEW."sourceRef", ':', 1);
        source_id := split_part(NEW."sourceRef", ':', 2);
        
        -- Vérifier que sourceType correspond à operationSource
        IF source_type != NEW."operationSource"::TEXT THEN
            RAISE WARNING 'Source type mismatch for sourceRef %: expected %, got %', 
                NEW."sourceRef", NEW."operationSource", source_type;
            RETURN NEW;
        END IF;
        
        -- Résoudre selon le type d'opération
        CASE NEW."operationSource"
            WHEN 'condition' THEN
                -- Récupérer conditionSet depuis TreeBranchLeafNodeCondition
                SELECT "conditionSet" INTO operation_content
                FROM "TreeBranchLeafNodeCondition"
                WHERE "id" = source_id;
                
            WHEN 'formula' THEN
                -- Récupérer tokens depuis TreeBranchLeafNodeFormula  
                SELECT "tokens" INTO operation_content
                FROM "TreeBranchLeafNodeFormula"
                WHERE "id" = source_id;
                
            WHEN 'table' THEN
                -- Récupérer data depuis TreeBranchLeafNodeTable
                SELECT "data" INTO operation_content
                FROM "TreeBranchLeafNodeTable"
                WHERE "id" = source_id;
                
            ELSE
                RAISE WARNING 'Unknown operation source: %', NEW."operationSource";
                RETURN NEW;
        END CASE;
        
        -- Mettre à jour operationDetail avec le contenu résolu
        IF operation_content IS NOT NULL THEN
            NEW."operationDetail" := operation_content;
            NEW."lastResolved" := NOW();
            
            -- Log de succès
            RAISE NOTICE 'Auto-resolved operation % with source %', NEW."id", NEW."sourceRef";
        ELSE
            -- Log d'avertissement si la source n'est pas trouvée
            RAISE WARNING 'Could not find source % for operation %', NEW."sourceRef", NEW."id";
        END IF;
    END IF;
    
    -- Auto-remplir le fieldLabel si vide et nodeId fourni
    IF NEW."fieldLabel" IS NULL AND NEW."nodeId" IS NOT NULL THEN
        SELECT "label" INTO node_label
        FROM "TreeBranchLeafNode"
        WHERE "id" = NEW."nodeId";
        
        IF node_label IS NOT NULL THEN
            NEW."fieldLabel" := node_label;
            RAISE NOTICE 'Auto-filled fieldLabel for % with "%"', NEW."id", node_label;
        END IF;
    END IF;
    
    -- Auto-remplir les informations de variables si nodeId fourni
    IF NEW."nodeId" IS NOT NULL AND (NEW."variableKey" IS NULL OR NEW."isVariable" IS NULL) THEN
        SELECT 
            v."exposedKey",
            v."displayName", 
            v."unit",
            TRUE
        INTO var_key, var_display_name, var_unit, var_exists
        FROM "TreeBranchLeafNodeVariable" v
        WHERE v."nodeId" = NEW."nodeId";
        
        IF var_exists THEN
            NEW."variableKey" := var_key;
            NEW."variableDisplayName" := var_display_name;
            NEW."variableUnit" := var_unit;
            NEW."isVariable" := TRUE;
            
            RAISE NOTICE 'Auto-filled variable info for % with key "%" (% %)', 
                NEW."id", var_key, var_display_name, COALESCE(var_unit, '');
        ELSE
            -- Pas de variable pour ce node
            NEW."isVariable" := FALSE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- CRÉATION DU TRIGGER
-- =========================================================================

-- Supprimer le trigger s'il existe déjà (pour éviter les erreurs)
DROP TRIGGER IF EXISTS trigger_auto_resolve_operations ON "TreeBranchLeafSubmissionData";

-- Créer le trigger sur INSERT et UPDATE
CREATE TRIGGER trigger_auto_resolve_operations
    BEFORE INSERT OR UPDATE ON "TreeBranchLeafSubmissionData"
    FOR EACH ROW 
    EXECUTE FUNCTION auto_resolve_tree_branch_leaf_operations();

-- =========================================================================
-- FONCTION POUR INVALIDER LE CACHE (appelable depuis l'application)
-- =========================================================================

CREATE OR REPLACE FUNCTION invalidate_operation_cache(source_ref TEXT)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Réinitialiser operationDetail pour forcer la re-résolution
    UPDATE "TreeBranchLeafSubmissionData"
    SET "operationDetail" = NULL,
        "operationResult" = NULL,
        "lastResolved" = NULL
    WHERE "sourceRef" = source_ref;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Invalidated cache for % rows with sourceRef: %', affected_rows, source_ref;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- =========================================================================

-- Index sur sourceRef pour les requêtes d'invalidation de cache
CREATE INDEX IF NOT EXISTS "idx_tree_branch_leaf_submission_data_source_ref" 
ON "TreeBranchLeafSubmissionData" ("sourceRef");

-- Index composé pour les requêtes de résolution
CREATE INDEX IF NOT EXISTS "idx_tree_branch_leaf_submission_data_resolution" 
ON "TreeBranchLeafSubmissionData" ("operationSource", "sourceRef") 
WHERE "sourceRef" IS NOT NULL;

-- Index pour identifier les entrées non résolues
CREATE INDEX IF NOT EXISTS "idx_tree_branch_leaf_submission_data_unresolved"
ON "TreeBranchLeafSubmissionData" ("sourceRef", "operationDetail")
WHERE "sourceRef" IS NOT NULL AND "operationDetail" IS NULL;

-- =========================================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =========================================================================

COMMENT ON FUNCTION auto_resolve_tree_branch_leaf_operations() IS 
'Trigger function that automatically resolves operation details when sourceRef is provided';

COMMENT ON FUNCTION invalidate_operation_cache(TEXT) IS 
'Invalidates cached operation data for a specific sourceRef, forcing re-resolution';

COMMENT ON TRIGGER trigger_auto_resolve_operations ON "TreeBranchLeafSubmissionData" IS 
'Automatically resolves operation details on INSERT/UPDATE when sourceRef is provided';