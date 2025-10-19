/*
  Warnings:

  - You are about to drop the column `columns` on the `TreeBranchLeafNodeTable` table. All the data in the column will be lost.
  - You are about to drop the column `index` on the `TreeBranchLeafNodeTableRow` table. All the data in the column will be lost.
  - You are about to drop the column `row` on the `TreeBranchLeafNodeTableRow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tableId,rowIndex]` on the table `TreeBranchLeafNodeTableRow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cells` to the `TreeBranchLeafNodeTableRow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rowIndex` to the `TreeBranchLeafNodeTableRow` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."TreeBranchLeafNodeTableRow_tableId_index_key";

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNodeTable" DROP COLUMN "columns",
ADD COLUMN     "columnCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rowCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNodeTableRow" DROP COLUMN "index",
DROP COLUMN "row",
ADD COLUMN     "cells" JSONB NOT NULL,
ADD COLUMN     "rowIndex" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeTableColumn" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "columnIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'text',
    "width" INTEGER,
    "format" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TreeBranchLeafNodeTableColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeTableColumn_tableId_idx" ON "public"."TreeBranchLeafNodeTableColumn"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeTableColumn_tableId_columnIndex_key" ON "public"."TreeBranchLeafNodeTableColumn"("tableId", "columnIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeTableRow_tableId_rowIndex_key" ON "public"."TreeBranchLeafNodeTableRow"("tableId", "rowIndex");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTableColumn" ADD CONSTRAINT "TreeBranchLeafNodeTableColumn_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."TreeBranchLeafNodeTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
