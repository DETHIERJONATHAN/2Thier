-- Migration: Add cascade fields to TelnyxUserConfig
-- forwardToNumber: user's personal phone number for PSTN fallback
-- canReceiveCalls: toggle to enable/disable incoming calls for the user
-- messengerRingTimeout: how long to ring on Messenger before forwarding (default 25s = 5 rings)

ALTER TABLE "TelnyxUserConfig" ADD COLUMN IF NOT EXISTS "forwardToNumber" TEXT;
ALTER TABLE "TelnyxUserConfig" ADD COLUMN IF NOT EXISTS "canReceiveCalls" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TelnyxUserConfig" ADD COLUMN IF NOT EXISTS "messengerRingTimeout" INTEGER NOT NULL DEFAULT 25;
