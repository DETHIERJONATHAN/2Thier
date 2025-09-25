/*
  Warnings:

  - A unique constraint covering the columns `[leadNumber]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "company" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastContactDate" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "leadNumber" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "nextFollowUpDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "TelnyxConnection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelnyxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelnyxPhoneNumber" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "numberType" TEXT NOT NULL,
    "features" TEXT[],
    "monthlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "connectionId" TEXT,
    "organizationId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelnyxPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelnyxCall" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "cost" DOUBLE PRECISION,
    "recordingUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelnyxCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelnyxMessage" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelnyxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelnyxConnection_organizationId_idx" ON "TelnyxConnection"("organizationId");

-- CreateIndex
CREATE INDEX "TelnyxConnection_status_idx" ON "TelnyxConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TelnyxPhoneNumber_phoneNumber_key" ON "TelnyxPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE INDEX "TelnyxPhoneNumber_organizationId_idx" ON "TelnyxPhoneNumber"("organizationId");

-- CreateIndex
CREATE INDEX "TelnyxPhoneNumber_phoneNumber_idx" ON "TelnyxPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE INDEX "TelnyxPhoneNumber_status_idx" ON "TelnyxPhoneNumber"("status");

-- CreateIndex
CREATE INDEX "TelnyxPhoneNumber_countryCode_idx" ON "TelnyxPhoneNumber"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "TelnyxCall_callId_key" ON "TelnyxCall"("callId");

-- CreateIndex
CREATE INDEX "TelnyxCall_organizationId_idx" ON "TelnyxCall"("organizationId");

-- CreateIndex
CREATE INDEX "TelnyxCall_callId_idx" ON "TelnyxCall"("callId");

-- CreateIndex
CREATE INDEX "TelnyxCall_fromNumber_idx" ON "TelnyxCall"("fromNumber");

-- CreateIndex
CREATE INDEX "TelnyxCall_toNumber_idx" ON "TelnyxCall"("toNumber");

-- CreateIndex
CREATE INDEX "TelnyxCall_leadId_idx" ON "TelnyxCall"("leadId");

-- CreateIndex
CREATE INDEX "TelnyxCall_startedAt_idx" ON "TelnyxCall"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelnyxMessage_messageId_key" ON "TelnyxMessage"("messageId");

-- CreateIndex
CREATE INDEX "TelnyxMessage_organizationId_idx" ON "TelnyxMessage"("organizationId");

-- CreateIndex
CREATE INDEX "TelnyxMessage_messageId_idx" ON "TelnyxMessage"("messageId");

-- CreateIndex
CREATE INDEX "TelnyxMessage_fromNumber_idx" ON "TelnyxMessage"("fromNumber");

-- CreateIndex
CREATE INDEX "TelnyxMessage_toNumber_idx" ON "TelnyxMessage"("toNumber");

-- CreateIndex
CREATE INDEX "TelnyxMessage_leadId_idx" ON "TelnyxMessage"("leadId");

-- CreateIndex
CREATE INDEX "TelnyxMessage_sentAt_idx" ON "TelnyxMessage"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadNumber_key" ON "Lead"("leadNumber");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_firstName_lastName_idx" ON "Lead"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "TelnyxConnection" ADD CONSTRAINT "TelnyxConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxPhoneNumber" ADD CONSTRAINT "TelnyxPhoneNumber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxCall" ADD CONSTRAINT "TelnyxCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxCall" ADD CONSTRAINT "TelnyxCall_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxMessage" ADD CONSTRAINT "TelnyxMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelnyxMessage" ADD CONSTRAINT "TelnyxMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
