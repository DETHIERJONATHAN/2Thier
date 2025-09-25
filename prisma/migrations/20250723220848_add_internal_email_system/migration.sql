-- CreateEnum
CREATE TYPE "EmailPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "internal_emails" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isHtml" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "priority" "EmailPriority" NOT NULL DEFAULT 'NORMAL',
    "folder" TEXT NOT NULL DEFAULT 'inbox',
    "replyToId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_email_attachments" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_email_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "internal_emails" ADD CONSTRAINT "internal_emails_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "internal_emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_emails" ADD CONSTRAINT "internal_emails_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_email_attachments" ADD CONSTRAINT "internal_email_attachments_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "internal_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
