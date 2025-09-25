-- Créer une table dédiée pour les formules de nœuds TreeBranchLeaf
-- Plus propre que de stocker en JSON dans metadata

CREATE TABLE "TreeBranchLeafNodeFormula" (
  "id" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokens" JSONB NOT NULL DEFAULT '[]',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "TreeBranchLeafNodeFormula_pkey" PRIMARY KEY ("id")
);

-- Index pour performance
CREATE INDEX "TreeBranchLeafNodeFormula_nodeId_idx" ON "TreeBranchLeafNodeFormula"("nodeId");
CREATE INDEX "TreeBranchLeafNodeFormula_nodeId_order_idx" ON "TreeBranchLeafNodeFormula"("nodeId", "order");
CREATE INDEX "TreeBranchLeafNodeFormula_isActive_idx" ON "TreeBranchLeafNodeFormula"("isActive");

-- Contrainte unique pour éviter les doublons de noms par nœud
CREATE UNIQUE INDEX "TreeBranchLeafNodeFormula_nodeId_name_key" ON "TreeBranchLeafNodeFormula"("nodeId", "name");

-- Clé étrangère vers TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafNodeFormula" ADD CONSTRAINT "TreeBranchLeafNodeFormula_nodeId_fkey" 
  FOREIGN KEY ("nodeId") REFERENCES "TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Commentaires pour documentation
COMMENT ON TABLE "TreeBranchLeafNodeFormula" IS 'Formules associées à un nœud TreeBranchLeaf spécifique';
COMMENT ON COLUMN "TreeBranchLeafNodeFormula"."tokens" IS 'Tokens de la formule stockés en JSON';
COMMENT ON COLUMN "TreeBranchLeafNodeFormula"."order" IS 'Ordre d''affichage des formules pour ce nœud';
