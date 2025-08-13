/*
  Warnings:

  - You are about to drop the `MailSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_domains` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MailSettings" DROP CONSTRAINT "MailSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "email_accounts" DROP CONSTRAINT "email_accounts_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "email_accounts" DROP CONSTRAINT "email_accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "email_domains" DROP CONSTRAINT "email_domains_organizationId_fkey";

-- DropTable
DROP TABLE "MailSettings";

-- DropTable
DROP TABLE "email_accounts";

-- DropTable
DROP TABLE "email_domains";
