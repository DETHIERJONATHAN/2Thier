-- CreateTable
CREATE TABLE "GoogleVoiceConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "encryptedClientEmail" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "delegatedUserEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleVoiceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleVoiceCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "callType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordingUrl" TEXT,
    "transcription" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleVoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleVoiceSMS" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleVoiceSMS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleVoiceConfig_organizationId_key" ON "GoogleVoiceConfig"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleVoiceConfig_organizationId_idx" ON "GoogleVoiceConfig"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleVoiceConfig_isActive_idx" ON "GoogleVoiceConfig"("isActive");

-- CreateIndex
CREATE INDEX "GoogleVoiceCall_organizationId_idx" ON "GoogleVoiceCall"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleVoiceCall_userId_idx" ON "GoogleVoiceCall"("userId");

-- CreateIndex
CREATE INDEX "GoogleVoiceCall_fromNumber_idx" ON "GoogleVoiceCall"("fromNumber");

-- CreateIndex
CREATE INDEX "GoogleVoiceCall_toNumber_idx" ON "GoogleVoiceCall"("toNumber");

-- CreateIndex
CREATE INDEX "GoogleVoiceCall_startTime_idx" ON "GoogleVoiceCall"("startTime");

-- CreateIndex
CREATE INDEX "GoogleVoiceSMS_organizationId_idx" ON "GoogleVoiceSMS"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleVoiceSMS_userId_idx" ON "GoogleVoiceSMS"("userId");

-- CreateIndex
CREATE INDEX "GoogleVoiceSMS_fromNumber_idx" ON "GoogleVoiceSMS"("fromNumber");

-- CreateIndex
CREATE INDEX "GoogleVoiceSMS_toNumber_idx" ON "GoogleVoiceSMS"("toNumber");

-- CreateIndex
CREATE INDEX "GoogleVoiceSMS_timestamp_idx" ON "GoogleVoiceSMS"("timestamp");

-- AddForeignKey
ALTER TABLE "GoogleVoiceConfig" ADD CONSTRAINT "GoogleVoiceConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleVoiceCall" ADD CONSTRAINT "GoogleVoiceCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleVoiceCall" ADD CONSTRAINT "GoogleVoiceCall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleVoiceSMS" ADD CONSTRAINT "GoogleVoiceSMS_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleVoiceSMS" ADD CONSTRAINT "GoogleVoiceSMS_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
