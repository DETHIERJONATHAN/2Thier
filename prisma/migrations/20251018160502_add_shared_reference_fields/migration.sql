/*
  Warnings:

  - You are about to drop the column `repeater_conditionalRules` on the `TreeBranchLeafNode` table. All the data in the column will be lost.
  - You are about to drop the column `repeater_controlFieldId` on the `TreeBranchLeafNode` table. All the data in the column will be lost.
  - You are about to drop the column `repeater_mode` on the `TreeBranchLeafNode` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" DROP COLUMN "repeater_conditionalRules",
DROP COLUMN "repeater_controlFieldId",
DROP COLUMN "repeater_mode",
ADD COLUMN     "isSharedReference" BOOLEAN DEFAULT false,
ADD COLUMN     "sharedReferenceCategory" TEXT,
ADD COLUMN     "sharedReferenceDescription" TEXT,
ADD COLUMN     "sharedReferenceId" TEXT,
ADD COLUMN     "sharedReferenceName" TEXT;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNode" ADD CONSTRAINT "TreeBranchLeafNode_sharedReferenceId_fkey" FOREIGN KEY ("sharedReferenceId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
