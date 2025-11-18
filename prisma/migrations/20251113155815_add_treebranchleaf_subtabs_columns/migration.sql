/*
  Warnings:

  - You are about to drop the `TreeBranchLeafNodeTombstone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "public"."TreeBranchLeafNode_subtab_idx";

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ALTER COLUMN "subtabs" SET DATA TYPE JSON,
ALTER COLUMN "subtab" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeTombstone";
