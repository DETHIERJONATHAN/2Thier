-- CreateEnum
CREATE TYPE "public"."TreeBranchLeafNodeKind" AS ENUM ('OPTION', 'OPTION_WITH_FIELD', 'FIELD_ONLY');

-- CreateEnum
CREATE TYPE "public"."TreeBranchLeafFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'TIME', 'DATETIME', 'EMAIL', 'PHONE', 'URL', 'FILE', 'IMAGE', 'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'TEXTAREA', 'SLIDER', 'RATING');

-- DropIndex
DROP INDEX "public"."TreeBranchLeafNode_type_subType_idx";

-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ADD COLUMN     "fieldType" "public"."TreeBranchLeafFieldType",
ADD COLUMN     "kind" "public"."TreeBranchLeafNodeKind" NOT NULL DEFAULT 'OPTION',
ALTER COLUMN "type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeData" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "exposedKey" TEXT NOT NULL,
    "displayFormat" TEXT,
    "unit" TEXT,
    "precision" INTEGER NOT NULL DEFAULT 2,
    "isVisibleToUser" BOOLEAN NOT NULL DEFAULT true,
    "isExportable" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeFormula" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "ast" JSONB NOT NULL,
    "legacyExpression" TEXT,
    "dependencies" TEXT[],
    "lastCalculatedAt" TIMESTAMP(3),
    "lastCalculatedValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeCondition" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'AND',
    "targetTreeId" TEXT,
    "targetNodeId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafConditionRule" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "leftOperand" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "rightOperand" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TreeBranchLeafConditionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeTable" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "tableDataId" TEXT NOT NULL,
    "xAxisRef" TEXT NOT NULL,
    "yAxisRef" TEXT NOT NULL,
    "lookupMode" TEXT NOT NULL DEFAULT 'EXACT',
    "fallbackValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeAPI" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "connectionId" TEXT,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "bodyTemplate" JSONB,
    "responsePath" TEXT,
    "ttlSeconds" INTEGER NOT NULL DEFAULT 300,
    "fallbackValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeAPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeLink" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "targetTreeId" TEXT NOT NULL,
    "targetNodeId" TEXT,
    "handoverMode" TEXT NOT NULL DEFAULT 'JUMP',
    "carryContext" BOOLEAN NOT NULL DEFAULT true,
    "returnAfterCompletion" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeData_nodeId_key" ON "public"."TreeBranchLeafNodeData"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeFormula_nodeId_key" ON "public"."TreeBranchLeafNodeFormula"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeCondition_nodeId_key" ON "public"."TreeBranchLeafNodeCondition"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafConditionRule_conditionId_order_idx" ON "public"."TreeBranchLeafConditionRule"("conditionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeTable_nodeId_key" ON "public"."TreeBranchLeafNodeTable"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeAPI_nodeId_key" ON "public"."TreeBranchLeafNodeAPI"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeLink_nodeId_key" ON "public"."TreeBranchLeafNodeLink"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_kind_idx" ON "public"."TreeBranchLeafNode"("kind");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeData" ADD CONSTRAINT "TreeBranchLeafNodeData_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeFormula" ADD CONSTRAINT "TreeBranchLeafNodeFormula_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeCondition" ADD CONSTRAINT "TreeBranchLeafNodeCondition_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafConditionRule" ADD CONSTRAINT "TreeBranchLeafConditionRule_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "public"."TreeBranchLeafNodeCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTable" ADD CONSTRAINT "TreeBranchLeafNodeTable_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeTable" ADD CONSTRAINT "TreeBranchLeafNodeTable_tableDataId_fkey" FOREIGN KEY ("tableDataId") REFERENCES "public"."TreeBranchLeafTableData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeAPI" ADD CONSTRAINT "TreeBranchLeafNodeAPI_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeAPI" ADD CONSTRAINT "TreeBranchLeafNodeAPI_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."TreeBranchLeafAPIConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeLink" ADD CONSTRAINT "TreeBranchLeafNodeLink_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeLink" ADD CONSTRAINT "TreeBranchLeafNodeLink_targetTreeId_fkey" FOREIGN KEY ("targetTreeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
