-- Migration: Add OrgFollow + SocialSettings tables
-- Date: 2026-03-29

-- 1. OrgFollow table (Colony follow system)
CREATE TABLE IF NOT EXISTS "OrgFollow" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgFollow_userId_organizationId_key" ON "OrgFollow"("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "OrgFollow_userId_idx" ON "OrgFollow"("userId");
CREATE INDEX IF NOT EXISTS "OrgFollow_organizationId_idx" ON "OrgFollow"("organizationId");

ALTER TABLE "OrgFollow" DROP CONSTRAINT IF EXISTS "OrgFollow_userId_fkey";
ALTER TABLE "OrgFollow" ADD CONSTRAINT "OrgFollow_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgFollow" DROP CONSTRAINT IF EXISTS "OrgFollow_organizationId_fkey";
ALTER TABLE "OrgFollow" ADD CONSTRAINT "OrgFollow_organizationId_fkey" 
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. SocialSettings table (per-organization social network configuration)
CREATE TABLE IF NOT EXISTS "SocialSettings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  
  -- Feed Visibility
  "wallEnabled" BOOLEAN NOT NULL DEFAULT true,
  "storiesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "reelsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sparksEnabled" BOOLEAN NOT NULL DEFAULT true,
  "battlesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "exploreEnabled" BOOLEAN NOT NULL DEFAULT true,
  "hiveLiveEnabled" BOOLEAN NOT NULL DEFAULT true,
  "messengerEnabled" BOOLEAN NOT NULL DEFAULT true,
  "callsEnabled" BOOLEAN NOT NULL DEFAULT true,
  
  -- Default Visibility
  "defaultPostVisibility" TEXT NOT NULL DEFAULT 'IN',
  
  -- Colony Feed Behavior
  "allowMembersPost" BOOLEAN NOT NULL DEFAULT true,
  "allowMembersStory" BOOLEAN NOT NULL DEFAULT true,
  "allowMembersReel" BOOLEAN NOT NULL DEFAULT true,
  "allowMembersSpark" BOOLEAN NOT NULL DEFAULT false,
  "requirePostApproval" BOOLEAN NOT NULL DEFAULT false,
  
  -- Inter-Colony Visibility
  "showPublicPostsInFeed" BOOLEAN NOT NULL DEFAULT true,
  "showFriendsPostsInFeed" BOOLEAN NOT NULL DEFAULT true,
  "showFollowedColoniesInFeed" BOOLEAN NOT NULL DEFAULT true,
  
  -- Content Moderation
  "maxPostLength" INTEGER NOT NULL DEFAULT 5000,
  "maxCommentLength" INTEGER NOT NULL DEFAULT 2000,
  "maxMediaPerPost" INTEGER NOT NULL DEFAULT 10,
  "maxVideoSizeMB" INTEGER NOT NULL DEFAULT 100,
  "maxImageSizeMB" INTEGER NOT NULL DEFAULT 10,
  "allowGifs" BOOLEAN NOT NULL DEFAULT true,
  "allowLinks" BOOLEAN NOT NULL DEFAULT true,
  "allowHashtags" BOOLEAN NOT NULL DEFAULT true,
  "profanityFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
  
  -- Reactions & Comments
  "reactionsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sharesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "commentDepthLimit" INTEGER NOT NULL DEFAULT 3,
  
  -- Follow & Friends
  "allowFollowColony" BOOLEAN NOT NULL DEFAULT true,
  "autoFollowOnJoin" BOOLEAN NOT NULL DEFAULT true,
  "friendRequestsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "maxFriendsPerUser" INTEGER NOT NULL DEFAULT 5000,
  
  -- Privacy & Blocking
  "allowBlockColony" BOOLEAN NOT NULL DEFAULT true,
  "showMemberList" BOOLEAN NOT NULL DEFAULT true,
  "showMemberCount" BOOLEAN NOT NULL DEFAULT true,
  "profileVisibility" TEXT NOT NULL DEFAULT 'public',
  
  -- Notifications
  "notifyOnNewPost" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnComment" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnReaction" BOOLEAN NOT NULL DEFAULT false,
  "notifyOnNewFollower" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnFriendRequest" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnMention" BOOLEAN NOT NULL DEFAULT true,
  
  -- Analytics & Stats
  "showPostAnalytics" BOOLEAN NOT NULL DEFAULT false,
  "showProfileViews" BOOLEAN NOT NULL DEFAULT false,
  
  -- Advanced
  "customReactions" JSONB,
  "bannedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "pinnedPostsLimit" INTEGER NOT NULL DEFAULT 3,
  "autoArchiveDays" INTEGER NOT NULL DEFAULT 0,
  
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "SocialSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SocialSettings_organizationId_key" ON "SocialSettings"("organizationId");

ALTER TABLE "SocialSettings" DROP CONSTRAINT IF EXISTS "SocialSettings_organizationId_fkey";
ALTER TABLE "SocialSettings" ADD CONSTRAINT "SocialSettings_organizationId_fkey" 
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Done!
SELECT 'Migration complete: OrgFollow + SocialSettings tables created' AS result;
