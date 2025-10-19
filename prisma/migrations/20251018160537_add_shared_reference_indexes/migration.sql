-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_sharedReferenceId_idx" ON "public"."TreeBranchLeafNode"("sharedReferenceId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_isSharedReference_idx" ON "public"."TreeBranchLeafNode"("isSharedReference");
