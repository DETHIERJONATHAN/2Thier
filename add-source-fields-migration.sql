-- Migration pour ajouter les nouveaux champs source dans TreeBranchLeafNodeVariable

-- Ajout des colonnes sourceType, sourceRef, fixedValue, selectedNodeId
ALTER TABLE "TreeBranchLeafNodeVariable" 
ADD COLUMN "sourceType" VARCHAR(50) DEFAULT 'fixed',
ADD COLUMN "sourceRef" TEXT,
ADD COLUMN "fixedValue" TEXT,
ADD COLUMN "selectedNodeId" TEXT;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNodeVariable_sourceType_idx" ON "TreeBranchLeafNodeVariable"("sourceType");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNodeVariable_selectedNodeId_idx" ON "TreeBranchLeafNodeVariable"("selectedNodeId");

-- Commentaires
COMMENT ON COLUMN "TreeBranchLeafNodeVariable"."sourceType" IS 'Type de source: fixed, tree, formula, condition';
COMMENT ON COLUMN "TreeBranchLeafNodeVariable"."sourceRef" IS 'Référence vers source (condition:id, formula:id, node:id)';
COMMENT ON COLUMN "TreeBranchLeafNodeVariable"."fixedValue" IS 'Valeur fixe quand sourceType=fixed';
COMMENT ON COLUMN "TreeBranchLeafNodeVariable"."selectedNodeId" IS 'ID du nœud sélectionné quand sourceType=tree';
