-- Migration: Create OrgBlock table for organization-level blocking
-- This allows users to block entire Colonies (organizations)

CREATE TABLE IF NOT EXISTS "OrgBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockedOrgId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgBlock_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: a user can only block an org once
CREATE UNIQUE INDEX IF NOT EXISTS "OrgBlock_userId_blockedOrgId_key" ON "OrgBlock"("userId", "blockedOrgId");

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "OrgBlock_userId_idx" ON "OrgBlock"("userId");
CREATE INDEX IF NOT EXISTS "OrgBlock_blockedOrgId_idx" ON "OrgBlock"("blockedOrgId");

-- Foreign keys
ALTER TABLE "OrgBlock" ADD CONSTRAINT "OrgBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgBlock" ADD CONSTRAINT "OrgBlock_blockedOrgId_fkey" FOREIGN KEY ("blockedOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
