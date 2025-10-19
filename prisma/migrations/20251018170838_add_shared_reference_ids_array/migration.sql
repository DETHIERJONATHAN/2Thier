-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ADD COLUMN     "sharedReferenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
