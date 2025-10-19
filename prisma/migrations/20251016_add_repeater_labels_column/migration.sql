-- Add repeater_templateNodeLabels column to TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafNode"
ADD COLUMN "repeater_templateNodeLabels" TEXT;
