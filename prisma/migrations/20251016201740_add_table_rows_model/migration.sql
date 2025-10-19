/*
  Warnings:

  - You are about to drop the column `data` on the `TreeBranchLeafNodeTable` table. All the data in the column will be lost.
  - You are about to drop the column `rows` on the `TreeBranchLeafNodeTable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNodeTable" DROP COLUMN "data",
DROP COLUMN "rows";

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeTableRow" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "row" JSONB NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeTableRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTableRow_tableId_idx" ON "public"."TreeBranchLeafNodeTableRow"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeTableRow_tableId_index_key" ON "public"."TreeBranchLeafNodeTableRow"("tableId", "index");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTableRow" ADD CONSTRAINT "TreeBranchLeafNodeTableRow_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."TreeBranchLeafNodeTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
