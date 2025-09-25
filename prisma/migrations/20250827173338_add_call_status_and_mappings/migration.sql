-- CreateTable
CREATE TABLE "public"."CallStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CallToLeadMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callStatusId" TEXT NOT NULL,
    "leadStatusId" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'automatic',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallToLeadMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallStatus_organizationId_idx" ON "public"."CallStatus"("organizationId");

-- CreateIndex
CREATE INDEX "CallStatus_organizationId_order_idx" ON "public"."CallStatus"("organizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CallStatus_organizationId_name_key" ON "public"."CallStatus"("organizationId", "name");

-- CreateIndex
CREATE INDEX "CallToLeadMapping_organizationId_idx" ON "public"."CallToLeadMapping"("organizationId");

-- CreateIndex
CREATE INDEX "CallToLeadMapping_callStatusId_idx" ON "public"."CallToLeadMapping"("callStatusId");

-- CreateIndex
CREATE INDEX "CallToLeadMapping_leadStatusId_idx" ON "public"."CallToLeadMapping"("leadStatusId");

-- CreateIndex
CREATE INDEX "CallToLeadMapping_priority_idx" ON "public"."CallToLeadMapping"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "CallToLeadMapping_organizationId_callStatusId_leadStatusId_key" ON "public"."CallToLeadMapping"("organizationId", "callStatusId", "leadStatusId");

-- AddForeignKey
ALTER TABLE "public"."CallStatus" ADD CONSTRAINT "CallStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallToLeadMapping" ADD CONSTRAINT "CallToLeadMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallToLeadMapping" ADD CONSTRAINT "CallToLeadMapping_callStatusId_fkey" FOREIGN KEY ("callStatusId") REFERENCES "public"."CallStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallToLeadMapping" ADD CONSTRAINT "CallToLeadMapping_leadStatusId_fkey" FOREIGN KEY ("leadStatusId") REFERENCES "public"."LeadStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
