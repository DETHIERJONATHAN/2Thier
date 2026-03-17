-- Migration: Réseau Social d'Entreprise (Wall)
-- Date: 2026-03-17
-- Modèles: WallPost, WallReaction, WallComment, WallShare, ClientAccount, PushSubscription

-- ═══════════════════════════════════════════════════════════════
-- WALLPOST — Posts du mur (auto CRM + manuels)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "WallPost" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrls" JSONB,
    "mediaType" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'IN',
    "targetLeadId" TEXT,
    "crmEventType" TEXT,
    "crmEntityType" TEXT,
    "crmEntityId" TEXT,
    "category" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WallPost_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════
-- WALLREACTION — Réactions (Like, Love, Bravo...)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "WallReaction" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WallReaction_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════
-- WALLCOMMENT — Commentaires (avec réponses imbriquées)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "WallComment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WallComment_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════
-- WALLSHARE — Partages (interne, LinkedIn, Facebook, WhatsApp...)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "WallShare" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WallShare_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════
-- CLIENTACCOUNT — Comptes clients (lien User ↔ Lead)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "ClientAccount" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════
-- PUSHSUBSCRIPTION — Abonnements push navigateur (VAPID)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

-- WallPost
CREATE INDEX IF NOT EXISTS "WallPost_organizationId_visibility_createdAt_idx" ON "WallPost"("organizationId", "visibility", "createdAt");
CREATE INDEX IF NOT EXISTS "WallPost_organizationId_createdAt_idx" ON "WallPost"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "WallPost_targetLeadId_createdAt_idx" ON "WallPost"("targetLeadId", "createdAt");
CREATE INDEX IF NOT EXISTS "WallPost_organizationId_category_createdAt_idx" ON "WallPost"("organizationId", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "WallPost_authorId_createdAt_idx" ON "WallPost"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "WallPost_crmEntityType_crmEntityId_idx" ON "WallPost"("crmEntityType", "crmEntityId");

-- WallReaction
CREATE UNIQUE INDEX IF NOT EXISTS "WallReaction_postId_userId_key" ON "WallReaction"("postId", "userId");
CREATE INDEX IF NOT EXISTS "WallReaction_postId_idx" ON "WallReaction"("postId");
CREATE INDEX IF NOT EXISTS "WallReaction_userId_idx" ON "WallReaction"("userId");

-- WallComment
CREATE INDEX IF NOT EXISTS "WallComment_postId_createdAt_idx" ON "WallComment"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "WallComment_authorId_idx" ON "WallComment"("authorId");

-- WallShare
CREATE INDEX IF NOT EXISTS "WallShare_postId_idx" ON "WallShare"("postId");
CREATE INDEX IF NOT EXISTS "WallShare_userId_idx" ON "WallShare"("userId");

-- ClientAccount
CREATE UNIQUE INDEX IF NOT EXISTS "ClientAccount_userId_key" ON "ClientAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientAccount_referralCode_key" ON "ClientAccount"("referralCode");
CREATE INDEX IF NOT EXISTS "ClientAccount_organizationId_idx" ON "ClientAccount"("organizationId");
CREATE INDEX IF NOT EXISTS "ClientAccount_leadId_idx" ON "ClientAccount"("leadId");

-- PushSubscription
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- ═══════════════════════════════════════════════════════════════
-- FOREIGN KEYS
-- ═══════════════════════════════════════════════════════════════

-- WallPost
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_targetLeadId_fkey" FOREIGN KEY ("targetLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WallReaction
ALTER TABLE "WallReaction" ADD CONSTRAINT "WallReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WallReaction" ADD CONSTRAINT "WallReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- WallComment
ALTER TABLE "WallComment" ADD CONSTRAINT "WallComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WallComment" ADD CONSTRAINT "WallComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WallComment" ADD CONSTRAINT "WallComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "WallComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WallShare
ALTER TABLE "WallShare" ADD CONSTRAINT "WallShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WallShare" ADD CONSTRAINT "WallShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ClientAccount
ALTER TABLE "ClientAccount" ADD CONSTRAINT "ClientAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientAccount" ADD CONSTRAINT "ClientAccount_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientAccount" ADD CONSTRAINT "ClientAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PushSubscription
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
