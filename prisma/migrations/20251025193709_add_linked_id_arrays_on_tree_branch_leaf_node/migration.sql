-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ADD COLUMN     "linkedConditionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedFormulaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedTableIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedVariableIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
