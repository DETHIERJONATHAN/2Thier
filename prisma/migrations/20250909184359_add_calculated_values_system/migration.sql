-- CreateTable
CREATE TABLE "public"."CalculatedValue" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "treeId" TEXT,
    "organizationId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "dependencies" JSONB NOT NULL,
    "variables" JSONB NOT NULL,
    "value" JSONB NOT NULL,
    "rawValue" TEXT,
    "displayValue" TEXT,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculatedValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalculatedValue_leadId_idx" ON "public"."CalculatedValue"("leadId");

-- CreateIndex
CREATE INDEX "CalculatedValue_treeId_idx" ON "public"."CalculatedValue"("treeId");

-- CreateIndex
CREATE INDEX "CalculatedValue_organizationId_idx" ON "public"."CalculatedValue"("organizationId");

-- CreateIndex
CREATE INDEX "CalculatedValue_fieldId_idx" ON "public"."CalculatedValue"("fieldId");

-- CreateIndex
CREATE INDEX "CalculatedValue_calculationType_idx" ON "public"."CalculatedValue"("calculationType");

-- CreateIndex
CREATE INDEX "CalculatedValue_lastCalculated_idx" ON "public"."CalculatedValue"("lastCalculated");

-- CreateIndex
CREATE INDEX "CalculatedValue_isValid_idx" ON "public"."CalculatedValue"("isValid");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatedValue_leadId_treeId_fieldId_key" ON "public"."CalculatedValue"("leadId", "treeId", "fieldId");

-- AddForeignKey
ALTER TABLE "public"."CalculatedValue" ADD CONSTRAINT "CalculatedValue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalculatedValue" ADD CONSTRAINT "CalculatedValue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
