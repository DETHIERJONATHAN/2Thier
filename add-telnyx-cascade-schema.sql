-- Idempotent schema patch for Telnyx "cascade" (SIP endpoints + call legs + org config)
-- ✅ Safe: adds tables/columns/indexes only (NO DROP / NO RESET)

BEGIN;

-- 1) Existing tables: add missing columns (non-breaking)
ALTER TABLE IF EXISTS "TelnyxCall" ADD COLUMN IF NOT EXISTS "answeredBy" TEXT;

ALTER TABLE IF EXISTS "TelnyxConnection" ADD COLUMN IF NOT EXISTS "sipDomain" TEXT;
ALTER TABLE IF EXISTS "TelnyxConnection" ADD COLUMN IF NOT EXISTS "callControlAppId" TEXT;

-- 2) TelnyxConfig (per-organization secured config)
CREATE TABLE IF NOT EXISTS "TelnyxConfig" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE,
  "encryptedApiKey" TEXT NOT NULL,
  "webhookSigningSecret" TEXT,
  "webhookUrl" TEXT NOT NULL DEFAULT '__AUTO__',
  "defaultConnectionId" TEXT,
  "callControlAppId" TEXT,
  "fallbackPstnNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxConfig_organizationId_fkey') THEN
    ALTER TABLE "TelnyxConfig"
      ADD CONSTRAINT "TelnyxConfig_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TelnyxConfig_organizationId_idx" ON "TelnyxConfig"("organizationId");

-- 3) TelnyxSipEndpoint (CRM + softphones)
CREATE TABLE IF NOT EXISTS "TelnyxSipEndpoint" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  name TEXT NOT NULL,
  "sipUsername" TEXT NOT NULL,
  "sipPassword" TEXT NOT NULL,
  "sipDomain" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 1,
  timeout INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelnyxSipEndpoint_sipUsername_key" ON "TelnyxSipEndpoint"("sipUsername");
CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_organizationId_idx" ON "TelnyxSipEndpoint"("organizationId");
CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_userId_idx" ON "TelnyxSipEndpoint"("userId");
CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_priority_idx" ON "TelnyxSipEndpoint"(priority);
CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_status_idx" ON "TelnyxSipEndpoint"(status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxSipEndpoint_organizationId_fkey') THEN
    ALTER TABLE "TelnyxSipEndpoint"
      ADD CONSTRAINT "TelnyxSipEndpoint_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxSipEndpoint_userId_fkey') THEN
    ALTER TABLE "TelnyxSipEndpoint"
      ADD CONSTRAINT "TelnyxSipEndpoint_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) TelnyxCallLeg (multi-leg call tracking)
CREATE TABLE IF NOT EXISTS "TelnyxCallLeg" (
  id TEXT PRIMARY KEY,
  "callId" TEXT NOT NULL,
  "legType" TEXT NOT NULL,
  "endpointId" TEXT,
  destination TEXT NOT NULL,
  status TEXT NOT NULL,
  "dialedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answeredAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  duration INTEGER,
  priority INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_callId_idx" ON "TelnyxCallLeg"("callId");
CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_endpointId_idx" ON "TelnyxCallLeg"("endpointId");
CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_status_idx" ON "TelnyxCallLeg"(status);
CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_dialedAt_idx" ON "TelnyxCallLeg"("dialedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxCallLeg_callId_fkey') THEN
    ALTER TABLE "TelnyxCallLeg"
      ADD CONSTRAINT "TelnyxCallLeg_callId_fkey"
      FOREIGN KEY ("callId") REFERENCES "TelnyxCall"("callId")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxCallLeg_endpointId_fkey') THEN
    ALTER TABLE "TelnyxCallLeg"
      ADD CONSTRAINT "TelnyxCallLeg_endpointId_fkey"
      FOREIGN KEY ("endpointId") REFERENCES "TelnyxSipEndpoint"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
