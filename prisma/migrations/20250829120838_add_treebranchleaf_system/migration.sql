-- CreateTable
CREATE TABLE "public"."TreeBranchLeafTree" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'formulaire',
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNode" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fieldConfig" JSONB,
    "conditionConfig" JSONB,
    "formulaConfig" JSONB,
    "tableConfig" JSONB,
    "apiConfig" JSONB,
    "linkConfig" JSONB,
    "defaultValue" TEXT,
    "calculatedValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafMarker" (
    "id" TEXT NOT NULL,
    "treeId" TEXT,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "category" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeMarker" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "markerId" TEXT NOT NULL,
    "value" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeBranchLeafNodeMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafTableData" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headers" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "importSource" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafTableData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafAPIConnection" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "headers" JSONB NOT NULL DEFAULT '{}',
    "params" JSONB NOT NULL DEFAULT '{}',
    "authType" TEXT,
    "authConfig" JSONB NOT NULL DEFAULT '{}',
    "cacheEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cacheDuration" INTEGER NOT NULL DEFAULT 3600,
    "lastCall" TIMESTAMP(3),
    "lastResponse" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafAPIConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafFormulaReference" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "referencedNodeId" TEXT NOT NULL,
    "operator" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeBranchLeafFormulaReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafSubmission" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalScore" DOUBLE PRECISION,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "exportData" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafSubmissionData" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "value" TEXT,
    "calculatedValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeBranchLeafSubmissionData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeBranchLeafTree_organizationId_idx" ON "public"."TreeBranchLeafTree"("organizationId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafTree_status_idx" ON "public"."TreeBranchLeafTree"("status");

-- CreateIndex
CREATE INDEX "TreeBranchLeafTree_category_idx" ON "public"."TreeBranchLeafTree"("category");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_treeId_idx" ON "public"."TreeBranchLeafNode"("treeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_parentId_idx" ON "public"."TreeBranchLeafNode"("parentId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_type_subType_idx" ON "public"."TreeBranchLeafNode"("type", "subType");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_order_idx" ON "public"."TreeBranchLeafNode"("order");

-- CreateIndex
CREATE INDEX "TreeBranchLeafMarker_organizationId_idx" ON "public"."TreeBranchLeafMarker"("organizationId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafMarker_isGlobal_idx" ON "public"."TreeBranchLeafMarker"("isGlobal");

-- CreateIndex
CREATE INDEX "TreeBranchLeafMarker_category_idx" ON "public"."TreeBranchLeafMarker"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafMarker_organizationId_name_key" ON "public"."TreeBranchLeafMarker"("organizationId", "name");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeMarker_nodeId_idx" ON "public"."TreeBranchLeafNodeMarker"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeMarker_markerId_idx" ON "public"."TreeBranchLeafNodeMarker"("markerId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeMarker_nodeId_markerId_key" ON "public"."TreeBranchLeafNodeMarker"("nodeId", "markerId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafTableData_treeId_idx" ON "public"."TreeBranchLeafTableData"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafTableData_treeId_name_key" ON "public"."TreeBranchLeafTableData"("treeId", "name");

-- CreateIndex
CREATE INDEX "TreeBranchLeafAPIConnection_treeId_idx" ON "public"."TreeBranchLeafAPIConnection"("treeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafAPIConnection_isActive_idx" ON "public"."TreeBranchLeafAPIConnection"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafAPIConnection_treeId_name_key" ON "public"."TreeBranchLeafAPIConnection"("treeId", "name");

-- CreateIndex
CREATE INDEX "TreeBranchLeafFormulaReference_nodeId_idx" ON "public"."TreeBranchLeafFormulaReference"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafFormulaReference_referencedNodeId_idx" ON "public"."TreeBranchLeafFormulaReference"("referencedNodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafFormulaReference_order_idx" ON "public"."TreeBranchLeafFormulaReference"("order");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmission_treeId_idx" ON "public"."TreeBranchLeafSubmission"("treeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmission_userId_idx" ON "public"."TreeBranchLeafSubmission"("userId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmission_leadId_idx" ON "public"."TreeBranchLeafSubmission"("leadId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmission_status_idx" ON "public"."TreeBranchLeafSubmission"("status");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmission_createdAt_idx" ON "public"."TreeBranchLeafSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmissionData_submissionId_idx" ON "public"."TreeBranchLeafSubmissionData"("submissionId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmissionData_nodeId_idx" ON "public"."TreeBranchLeafSubmissionData"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafSubmissionData_submissionId_nodeId_key" ON "public"."TreeBranchLeafSubmissionData"("submissionId", "nodeId");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafTree" ADD CONSTRAINT "TreeBranchLeafTree_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNode" ADD CONSTRAINT "TreeBranchLeafNode_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNode" ADD CONSTRAINT "TreeBranchLeafNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafMarker" ADD CONSTRAINT "TreeBranchLeafMarker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafMarker" ADD CONSTRAINT "TreeBranchLeafMarker_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeMarker" ADD CONSTRAINT "TreeBranchLeafNodeMarker_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeMarker" ADD CONSTRAINT "TreeBranchLeafNodeMarker_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "public"."TreeBranchLeafMarker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafTableData" ADD CONSTRAINT "TreeBranchLeafTableData_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafAPIConnection" ADD CONSTRAINT "TreeBranchLeafAPIConnection_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafFormulaReference" ADD CONSTRAINT "TreeBranchLeafFormulaReference_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSubmission" ADD CONSTRAINT "TreeBranchLeafSubmission_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSubmission" ADD CONSTRAINT "TreeBranchLeafSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSubmission" ADD CONSTRAINT "TreeBranchLeafSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSubmissionData" ADD CONSTRAINT "TreeBranchLeafSubmissionData_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."TreeBranchLeafSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSubmissionData" ADD CONSTRAINT "TreeBranchLeafSubmissionData_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
