-- Add preferredFeedMode column to User table
-- This persists the user's preferred feed mode (personal/org) across sessions
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredFeedMode" TEXT DEFAULT 'org';
