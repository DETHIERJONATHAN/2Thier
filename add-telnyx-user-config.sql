-- Migration: Ajouter la configuration utilisateur Telnyx
-- Date: 2025-08-04

-- Ajouter la table TelnyxUserConfig
CREATE TABLE IF NOT EXISTS "TelnyxUserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedNumber" TEXT,
    "canMakeCalls" BOOLEAN NOT NULL DEFAULT false,
    "canSendSms" BOOLEAN NOT NULL DEFAULT false,
    "monthlyLimit" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "TelnyxUserConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TelnyxUserConfig_userId_key" UNIQUE ("userId"),
    CONSTRAINT "TelnyxUserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TelnyxUserConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ajouter l'index sur userId
CREATE INDEX IF NOT EXISTS "TelnyxUserConfig_userId_idx" ON "TelnyxUserConfig"("userId");

-- Ajouter l'index sur organizationId
CREATE INDEX IF NOT EXISTS "TelnyxUserConfig_organizationId_idx" ON "TelnyxUserConfig"("organizationId");

-- Ajouter l'index sur assignedNumber
CREATE INDEX IF NOT EXISTS "TelnyxUserConfig_assignedNumber_idx" ON "TelnyxUserConfig"("assignedNumber");

-- Ajouter la colonne assignedUserId à TelnyxPhoneNumber si elle n'existe pas
ALTER TABLE "TelnyxPhoneNumber" ADD COLUMN "assignedUserId" TEXT;

-- Ajouter l'index sur assignedUserId
CREATE INDEX IF NOT EXISTS "TelnyxPhoneNumber_assignedUserId_idx" ON "TelnyxPhoneNumber"("assignedUserId");

-- Ajouter la contrainte de clé étrangère pour assignedUserId
-- (SQLite ne supporte pas ADD CONSTRAINT, on utilisera une approche différente si nécessaire)

PRAGMA foreign_keys = ON;
