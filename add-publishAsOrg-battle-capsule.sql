-- Add publishAsOrg to Battle and TimeCapsule models
-- Safe: default false, non-breaking change

ALTER TABLE "Battle" ADD COLUMN IF NOT EXISTS "publishAsOrg" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimeCapsule" ADD COLUMN IF NOT EXISTS "publishAsOrg" BOOLEAN NOT NULL DEFAULT false;
