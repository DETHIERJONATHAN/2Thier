-- Trigger pour créer automatiquement toutes les variables à chaque nouveau devis
-- Ce trigger s'exécute après insertion d'un nouveau TreeBranchLeafSubmission

CREATE OR REPLACE FUNCTION auto_create_variables_for_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Insérer automatiquement toutes les variables pour ce nouveau devis
    INSERT INTO "TreeBranchLeafSubmissionData" (
        id,
        "submissionId",
        "nodeId", 
        value,
        "isVariable",
        "variableKey",
        "variableDisplayName",
        "variableUnit",
        "fieldLabel",
        "sourceRef",
        "operationDetail",
        "operationResult",
        "operationSource",
        "createdAt"
    )
    SELECT 
        -- Garantir un ID unique par devis et par variable
        (NEW.id || ':' || var."nodeId") AS id,
        NEW.id, -- Le nouvel ID du devis
        var."nodeId",
        NULL, -- Valeur vide au début, sera complétée par l'utilisateur
        true, -- C'est une variable
        var."exposedKey",
        var."displayName", 
        var.unit,
        node.label,
        var."sourceRef",
        -- Laisser le trigger BEFORE (auto_resolve_tree_branch_leaf_operations) remplir operationDetail
        NULL,
        NULL, -- operationResult sera calculé plus tard
        -- Déduire la source à partir de sourceRef et respecter l'ENUM OperationSource
        CASE 
            WHEN var."sourceRef" LIKE 'condition:%' THEN 'condition'::"OperationSource"
            WHEN var."sourceRef" LIKE 'formula:%' THEN 'formula'::"OperationSource"
            WHEN var."sourceRef" LIKE 'table:%' THEN 'table'::"OperationSource"
            ELSE NULL
        END,
        NOW()
    FROM "TreeBranchLeafNodeVariable" var
    JOIN "TreeBranchLeafNode" node ON var."nodeId" = node.id
    -- Ne créer que les variables appartenant au même arbre que le devis
    WHERE node."treeId" = NEW."treeId"
    WHERE var."nodeId" NOT IN (
        -- Éviter les doublons si la variable existe déjà pour ce devis
        SELECT "nodeId" 
        FROM "TreeBranchLeafSubmissionData" 
        WHERE "submissionId" = NEW.id
    );
    
    -- Log du nombre de variables créées
    RAISE NOTICE 'Auto-créé variables pour le devis % (arbre %)', NEW.id, NEW."treeId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";
CREATE TRIGGER auto_create_variables_trigger
    AFTER INSERT ON "TreeBranchLeafSubmission"
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_variables_for_submission();

-- Fonction pour nettoyer les variables quand un devis est supprimé
CREATE OR REPLACE FUNCTION cleanup_variables_for_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer toutes les variables associées à ce devis
    DELETE FROM "TreeBranchLeafSubmissionData" 
    WHERE "submissionId" = OLD.id AND "isVariable" = true;
    
    RAISE NOTICE 'Nettoyé les variables pour le devis supprimé %', OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger de nettoyage
DROP TRIGGER IF EXISTS cleanup_variables_trigger ON "TreeBranchLeafSubmission";
CREATE TRIGGER cleanup_variables_trigger
    BEFORE DELETE ON "TreeBranchLeafSubmission"
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_variables_for_submission();