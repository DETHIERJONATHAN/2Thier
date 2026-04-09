-- Messenger Phase 2: Advanced Features
-- Statut par message, Réactions, Épingler, Mentions, Messages vocaux, Tâches, Modèles rapides, Statuts enrichis, Permissions granulaires

-- ═══════════════════════════════════════════════════════
-- 1. Message: Add status, pin, mentions, voice fields
-- ═══════════════════════════════════════════════════════
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "pinnedById" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "mentions" JSONB;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "voiceDuration" INTEGER;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "voiceTranscript" TEXT;

-- Indexes for Message
CREATE INDEX IF NOT EXISTS "Message_conversationId_isPinned_idx" ON "Message"("conversationId", "isPinned");
CREATE INDEX IF NOT EXISTS "Message_conversationId_mediaType_idx" ON "Message"("conversationId", "mediaType");

-- FK: pinnedBy → User
ALTER TABLE "Message" ADD CONSTRAINT "Message_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════
-- 2. ConversationParticipant: Granular permissions
-- ═══════════════════════════════════════════════════════
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "canPin" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "canManageMembers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "canSeeFullHistory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "canSendMedia" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "canCreateTasks" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "isMuted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationParticipant" ADD COLUMN IF NOT EXISTS "mutedUntil" TIMESTAMP(3);

-- ═══════════════════════════════════════════════════════
-- 3. UserStreak: Custom status
-- ═══════════════════════════════════════════════════════
ALTER TABLE "UserStreak" ADD COLUMN IF NOT EXISTS "customStatus" TEXT;
ALTER TABLE "UserStreak" ADD COLUMN IF NOT EXISTS "customStatusEmoji" TEXT;
ALTER TABLE "UserStreak" ADD COLUMN IF NOT EXISTS "customStatusExpiresAt" TIMESTAMP(3);

-- ═══════════════════════════════════════════════════════
-- 4. NEW TABLE: MessageReaction
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");
CREATE INDEX IF NOT EXISTS "MessageReaction_userId_idx" ON "MessageReaction"("userId");

ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════
-- 5. NEW TABLE: MessageTask
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "MessageTask" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessageTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MessageTask_conversationId_idx" ON "MessageTask"("conversationId");
CREATE INDEX IF NOT EXISTS "MessageTask_assigneeId_status_idx" ON "MessageTask"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "MessageTask_messageId_idx" ON "MessageTask"("messageId");

ALTER TABLE "MessageTask" ADD CONSTRAINT "MessageTask_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageTask" ADD CONSTRAINT "MessageTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageTask" ADD CONSTRAINT "MessageTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════
-- 6. NEW TABLE: QuickReplyTemplate
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "QuickReplyTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "shortcut" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuickReplyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuickReplyTemplate_userId_idx" ON "QuickReplyTemplate"("userId");
CREATE INDEX IF NOT EXISTS "QuickReplyTemplate_organizationId_idx" ON "QuickReplyTemplate"("organizationId");

ALTER TABLE "QuickReplyTemplate" ADD CONSTRAINT "QuickReplyTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickReplyTemplate" ADD CONSTRAINT "QuickReplyTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
