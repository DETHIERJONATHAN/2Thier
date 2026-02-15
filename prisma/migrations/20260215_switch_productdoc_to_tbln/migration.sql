-- AlterTable: Switch ProductDocument.nodeId from FieldOptionNode to TreeBranchLeafNode

-- Drop old FK constraint
ALTER TABLE "ProductDocument" DROP CONSTRAINT IF EXISTS "ProductDocument_nodeId_fkey";

-- Add new FK constraint pointing to TreeBranchLeafNode
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
