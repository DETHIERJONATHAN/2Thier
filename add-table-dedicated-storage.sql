-- Création de la table TreeBranchLeafNodeTable pour stocker les tableaux de manière structurée
-- comme TreeBranchLeafNodeFormula et TreeBranchLeafNodeCondition

CREATE TABLE "TreeBranchLeafNodeTable" (
  "id" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'columns',
  "columns" JSON DEFAULT '[]',
  "rows" JSON DEFAULT '[]',
  "data" JSON DEFAULT '{}',
  "meta" JSON DEFAULT '{}',
  "isImported" BOOLEAN NOT NULL DEFAULT false,
  "importSource" TEXT,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TreeBranchLeafNodeTable_pkey" PRIMARY KEY ("id")
);

-- Index pour les performances
CREATE UNIQUE INDEX "TreeBranchLeafNodeTable_nodeId_name_key" ON "TreeBranchLeafNodeTable"("nodeId", "name");
CREATE INDEX "TreeBranchLeafNodeTable_nodeId_idx" ON "TreeBranchLeafNodeTable"("nodeId");
CREATE INDEX "TreeBranchLeafNodeTable_organizationId_idx" ON "TreeBranchLeafNodeTable"("organizationId");

-- Relations avec les autres tables
ALTER TABLE "TreeBranchLeafNodeTable" ADD CONSTRAINT "TreeBranchLeafNodeTable_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreeBranchLeafNodeTable" ADD CONSTRAINT "TreeBranchLeafNodeTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
