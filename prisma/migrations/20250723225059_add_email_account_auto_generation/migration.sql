/*
  Warnings:

  - You are about to drop the `internal_email_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `internal_emails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "internal_email_attachments" DROP CONSTRAINT "internal_email_attachments_emailId_fkey";

-- DropForeignKey
ALTER TABLE "internal_emails" DROP CONSTRAINT "internal_emails_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "internal_emails" DROP CONSTRAINT "internal_emails_replyToId_fkey";

-- DropTable
DROP TABLE "internal_email_attachments";

-- DropTable
DROP TABLE "internal_emails";

-- DropEnum
DROP TYPE "EmailPriority";

-- CreateTable
CREATE TABLE "MailSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailAddress" TEXT,
    "encryptedPassword" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "folder" TEXT NOT NULL DEFAULT 'inbox',
    "contentType" TEXT NOT NULL DEFAULT 'text/plain',
    "uid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uid" TEXT,
    "messageId" TEXT,
    "folder" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "localPart" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "extension" TEXT NOT NULL DEFAULT 'be',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUsername" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpStartTls" BOOLEAN NOT NULL DEFAULT true,
    "imapHost" TEXT NOT NULL DEFAULT 'imap.gmail.com',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUsername" TEXT NOT NULL,
    "imapPassword" TEXT NOT NULL,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_domains" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpStartTls" BOOLEAN NOT NULL DEFAULT true,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailSettings_userId_key" ON "MailSettings"("userId");

-- CreateIndex
CREATE INDEX "DeletedEmail_userId_folder_idx" ON "DeletedEmail"("userId", "folder");

-- CreateIndex
CREATE INDEX "DeletedEmail_messageId_idx" ON "DeletedEmail"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedEmail_userId_uid_folder_key" ON "DeletedEmail"("userId", "uid", "folder");

-- CreateIndex
CREATE UNIQUE INDEX "email_accounts_userId_key" ON "email_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_accounts_emailAddress_key" ON "email_accounts"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "email_domains_domain_key" ON "email_domains"("domain");

-- AddForeignKey
ALTER TABLE "MailSettings" ADD CONSTRAINT "MailSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedEmail" ADD CONSTRAINT "DeletedEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_domains" ADD CONSTRAINT "email_domains_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
