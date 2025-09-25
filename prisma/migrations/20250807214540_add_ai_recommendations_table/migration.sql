-- AlterTable
ALTER TABLE "TelnyxPhoneNumber" ADD COLUMN     "assignedUserId" TEXT;

-- CreateTable
CREATE TABLE "TelnyxUserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedNumber" TEXT,
    "canMakeCalls" BOOLEAN NOT NULL DEFAULT false,
    "canSendSms" BOOLEAN NOT NULL DEFAULT false,
    "monthlyLimit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelnyxUserConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleMailWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "historyId" TEXT,
    "expiration" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleMailWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "type" TEXT NOT NULL DEFAULT 'ai_slot',
    "status" TEXT NOT NULL DEFAULT 'active',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelnyxUserConfig_userId_key" ON "TelnyxUserConfig"("userId");

-- CreateIndex
CREATE INDEX "TelnyxUserConfig_userId_idx" ON "TelnyxUserConfig"("userId");

-- CreateIndex
CREATE INDEX "TelnyxUserConfig_organizationId_idx" ON "TelnyxUserConfig"("organizationId");

-- CreateIndex
CREATE INDEX "TelnyxUserConfig_assignedNumber_idx" ON "TelnyxUserConfig"("assignedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleMailWatch_userId_key" ON "GoogleMailWatch"("userId");

-- CreateIndex
CREATE INDEX "GoogleMailWatch_userId_idx" ON "GoogleMailWatch"("userId");

-- CreateIndex
CREATE INDEX "GoogleMailWatch_organizationId_idx" ON "GoogleMailWatch"("organizationId");

-- CreateIndex
CREATE INDEX "AIRecommendation_leadId_idx" ON "AIRecommendation"("leadId");

-- CreateIndex
CREATE INDEX "AIRecommendation_organizationId_idx" ON "AIRecommendation"("organizationId");

-- CreateIndex
CREATE INDEX "AIRecommendation_startTime_idx" ON "AIRecommendation"("startTime");

-- CreateIndex
CREATE INDEX "AIRecommendation_status_idx" ON "AIRecommendation"("status");

-- CreateIndex
CREATE INDEX "AIRecommendation_leadId_status_startTime_idx" ON "AIRecommendation"("leadId", "status", "startTime");

-- CreateIndex
CREATE INDEX "TelnyxPhoneNumber_assignedUserId_idx" ON "TelnyxPhoneNumber"("assignedUserId");

-- AddForeignKey
ALTER TABLE "TelnyxPhoneNumber" ADD CONSTRAINT "TelnyxPhoneNumber_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxUserConfig" ADD CONSTRAINT "TelnyxUserConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxUserConfig" ADD CONSTRAINT "TelnyxUserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleMailWatch" ADD CONSTRAINT "GoogleMailWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleMailWatch" ADD CONSTRAINT "GoogleMailWatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
