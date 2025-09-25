-- CreateTable
CREATE TABLE "public"."TreeBranchLeafBranch" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafOption" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasField" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafField" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "optionId" TEXT,
    "fieldType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultValue" TEXT,
    "validation" JSONB,
    "config" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafResponse" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "branchId" TEXT,
    "optionId" TEXT,
    "fieldId" TEXT,
    "value" TEXT,
    "calculatedValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreeBranchLeafResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeBranchLeafBranch_treeId_idx" ON "public"."TreeBranchLeafBranch"("treeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafBranch_parentId_idx" ON "public"."TreeBranchLeafBranch"("parentId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafBranch_order_idx" ON "public"."TreeBranchLeafBranch"("order");

-- CreateIndex
CREATE INDEX "TreeBranchLeafOption_branchId_idx" ON "public"."TreeBranchLeafOption"("branchId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafOption_order_idx" ON "public"."TreeBranchLeafOption"("order");

-- CreateIndex
CREATE INDEX "TreeBranchLeafField_branchId_idx" ON "public"."TreeBranchLeafField"("branchId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafField_optionId_idx" ON "public"."TreeBranchLeafField"("optionId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafField_fieldType_idx" ON "public"."TreeBranchLeafField"("fieldType");

-- CreateIndex
CREATE INDEX "TreeBranchLeafField_order_idx" ON "public"."TreeBranchLeafField"("order");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafField_optionId_key" ON "public"."TreeBranchLeafField"("optionId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafResponse_submissionId_idx" ON "public"."TreeBranchLeafResponse"("submissionId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafResponse_branchId_idx" ON "public"."TreeBranchLeafResponse"("branchId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafResponse_optionId_idx" ON "public"."TreeBranchLeafResponse"("optionId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafResponse_fieldId_idx" ON "public"."TreeBranchLeafResponse"("fieldId");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafBranch" ADD CONSTRAINT "TreeBranchLeafBranch_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."TreeBranchLeafTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafBranch" ADD CONSTRAINT "TreeBranchLeafBranch_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."TreeBranchLeafBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafOption" ADD CONSTRAINT "TreeBranchLeafOption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."TreeBranchLeafBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafField" ADD CONSTRAINT "TreeBranchLeafField_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."TreeBranchLeafBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafField" ADD CONSTRAINT "TreeBranchLeafField_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."TreeBranchLeafOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" ADD CONSTRAINT "TreeBranchLeafResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."TreeBranchLeafSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" ADD CONSTRAINT "TreeBranchLeafResponse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."TreeBranchLeafBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" ADD CONSTRAINT "TreeBranchLeafResponse_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."TreeBranchLeafOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafResponse" ADD CONSTRAINT "TreeBranchLeafResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."TreeBranchLeafField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
