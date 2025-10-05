-- AlterTable TreeBranchLeafSelectConfig : Ajouter les colonnes pour le lookup de tableau
ALTER TABLE "TreeBranchLeafSelectConfig" ADD COLUMN "keyColumn" TEXT;
ALTER TABLE "TreeBranchLeafSelectConfig" ADD COLUMN "valueColumn" TEXT;
ALTER TABLE "TreeBranchLeafSelectConfig" ADD COLUMN "displayColumn" TEXT;
