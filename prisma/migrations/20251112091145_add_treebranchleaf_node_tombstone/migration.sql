-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeTombstone" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeBranchLeafNodeTombstone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeTombstone_nodeId_key" ON "public"."TreeBranchLeafNodeTombstone"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTombstone_createdAt_idx" ON "public"."TreeBranchLeafNodeTombstone"("createdAt");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTombstone_nodeId_idx" ON "public"."TreeBranchLeafNodeTombstone"("nodeId");
