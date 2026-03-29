-- Add cover image fields to Organization table
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "coverPositionY" DOUBLE PRECISION DEFAULT 50;
