-- AlterTable: Add tableRowId to ProductDocument for lookup table row references
ALTER TABLE "ProductDocument" ADD COLUMN "tableRowId" TEXT;

-- CreateIndex
CREATE INDEX "ProductDocument_tableRowId_idx" ON "ProductDocument"("tableRowId");

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_tableRowId_fkey" FOREIGN KEY ("tableRowId") REFERENCES "TreeBranchLeafNodeTableRow"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
