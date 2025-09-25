-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeTable" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'basic',
    "columns" JSONB NOT NULL DEFAULT '[]',
    "rows" JSONB NOT NULL DEFAULT '[]',
    "data" JSONB NOT NULL DEFAULT '{}',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTable_nodeId_idx" ON "public"."TreeBranchLeafNodeTable"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTable_organizationId_idx" ON "public"."TreeBranchLeafNodeTable"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeTable_nodeId_name_key" ON "public"."TreeBranchLeafNodeTable"("nodeId", "name");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTable" ADD CONSTRAINT "TreeBranchLeafNodeTable_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTable" ADD CONSTRAINT "TreeBranchLeafNodeTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
