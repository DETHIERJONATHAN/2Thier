/*
  Warnings:

  - You are about to drop the column `fieldType` on the `TreeBranchLeafNode` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `TreeBranchLeafNode` table. All the data in the column will be lost.
  - You are about to drop the `TreeBranchLeafBranch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafConditionRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafNodeAPI` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafNodeCondition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafNodeData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafNodeFormula` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafNodeLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafNodeTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreeBranchLeafResponse` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `type` on table `TreeBranchLeafNode` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafBranch" DROP CONSTRAINT "TreeBranchLeafBranch_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafBranch" DROP CONSTRAINT "TreeBranchLeafBranch_treeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafConditionRule" DROP CONSTRAINT "TreeBranchLeafConditionRule_conditionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafField" DROP CONSTRAINT "TreeBranchLeafField_branchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafField" DROP CONSTRAINT "TreeBranchLeafField_optionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeAPI" DROP CONSTRAINT "TreeBranchLeafNodeAPI_connectionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeAPI" DROP CONSTRAINT "TreeBranchLeafNodeAPI_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeCondition" DROP CONSTRAINT "TreeBranchLeafNodeCondition_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeData" DROP CONSTRAINT "TreeBranchLeafNodeData_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeFormula" DROP CONSTRAINT "TreeBranchLeafNodeFormula_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeLink" DROP CONSTRAINT "TreeBranchLeafNodeLink_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeLink" DROP CONSTRAINT "TreeBranchLeafNodeLink_targetTreeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTable" DROP CONSTRAINT "TreeBranchLeafNodeTable_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTable" DROP CONSTRAINT "TreeBranchLeafNodeTable_tableDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafOption" DROP CONSTRAINT "TreeBranchLeafOption_branchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" DROP CONSTRAINT "TreeBranchLeafResponse_branchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" DROP CONSTRAINT "TreeBranchLeafResponse_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" DROP CONSTRAINT "TreeBranchLeafResponse_optionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" DROP CONSTRAINT "TreeBranchLeafResponse_submissionId_fkey";

-- DropIndex
DROP INDEX "public"."TreeBranchLeafNode_kind_idx";

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" DROP COLUMN "fieldType",
DROP COLUMN "kind",
ADD COLUMN     "hasAPI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasCondition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasFormula" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasLink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasMarkers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTable" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "type" SET NOT NULL;

-- DropTable
DROP TABLE "public"."TreeBranchLeafBranch";

-- DropTable
DROP TABLE "public"."TreeBranchLeafConditionRule";

-- DropTable
DROP TABLE "public"."TreeBranchLeafField";

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeAPI";

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeCondition";

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeData";

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeFormula";

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeLink";

-- DropTable
DROP TABLE "public"."TreeBranchLeafNodeTable";

-- DropTable
DROP TABLE "public"."TreeBranchLeafOption";

-- DropTable
DROP TABLE "public"."TreeBranchLeafResponse";

-- DropEnum
DROP TYPE "public"."TreeBranchLeafFieldType";

-- DropEnum
DROP TYPE "public"."TreeBranchLeafNodeKind";

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafTextConfig" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "maxLength" INTEGER,
    "minLength" INTEGER,
    "validation" TEXT,
    "placeholder" TEXT,
    "isMultiline" BOOLEAN NOT NULL DEFAULT false,
    "allowedCharacters" TEXT,
    "forbiddenWords" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafTextConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNumberConfig" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "step" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "prefix" TEXT,
    "suffix" TEXT,
    "separator" TEXT NOT NULL DEFAULT '.',
    "thousandsSeparator" TEXT NOT NULL DEFAULT ',',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNumberConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafSelectConfig" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "searchable" BOOLEAN NOT NULL DEFAULT false,
    "allowCustom" BOOLEAN NOT NULL DEFAULT false,
    "maxSelections" INTEGER,
    "optionsSource" TEXT,
    "apiEndpoint" TEXT,
    "tableReference" TEXT,
    "dependsOnNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafSelectConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafDateConfig" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "includeTime" BOOLEAN NOT NULL DEFAULT false,
    "minDate" TIMESTAMP(3),
    "maxDate" TIMESTAMP(3),
    "format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "disabledDates" JSONB NOT NULL DEFAULT '[]',
    "allowedDays" JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafDateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafFormulaConfig" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "resultType" TEXT NOT NULL DEFAULT 'number',
    "precision" INTEGER NOT NULL DEFAULT 2,
    "autoCalculate" BOOLEAN NOT NULL DEFAULT true,
    "dependencies" JSONB NOT NULL DEFAULT '[]',
    "lastCalculated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafFormulaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafTextConfig_nodeId_key" ON "public"."TreeBranchLeafTextConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafTextConfig_nodeId_idx" ON "public"."TreeBranchLeafTextConfig"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNumberConfig_nodeId_key" ON "public"."TreeBranchLeafNumberConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNumberConfig_nodeId_idx" ON "public"."TreeBranchLeafNumberConfig"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafSelectConfig_nodeId_key" ON "public"."TreeBranchLeafSelectConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSelectConfig_nodeId_idx" ON "public"."TreeBranchLeafSelectConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSelectConfig_optionsSource_idx" ON "public"."TreeBranchLeafSelectConfig"("optionsSource");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafDateConfig_nodeId_key" ON "public"."TreeBranchLeafDateConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafDateConfig_nodeId_idx" ON "public"."TreeBranchLeafDateConfig"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafFormulaConfig_nodeId_key" ON "public"."TreeBranchLeafFormulaConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafFormulaConfig_nodeId_idx" ON "public"."TreeBranchLeafFormulaConfig"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafFormulaConfig_autoCalculate_idx" ON "public"."TreeBranchLeafFormulaConfig"("autoCalculate");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_type_subType_idx" ON "public"."TreeBranchLeafNode"("type", "subType");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafTextConfig" ADD CONSTRAINT "TreeBranchLeafTextConfig_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNumberConfig" ADD CONSTRAINT "TreeBranchLeafNumberConfig_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSelectConfig" ADD CONSTRAINT "TreeBranchLeafSelectConfig_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafDateConfig" ADD CONSTRAINT "TreeBranchLeafDateConfig_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafFormulaConfig" ADD CONSTRAINT "TreeBranchLeafFormulaConfig_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
