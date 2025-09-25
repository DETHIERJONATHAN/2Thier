/*
  Warnings:

  - You are about to drop the column `encryptedPassword` on the `MailSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MailSettings" DROP COLUMN "encryptedPassword",
ADD COLUMN     "domainExtension" TEXT NOT NULL DEFAULT 'be',
ADD COLUMN     "imapTls" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "smtpTls" BOOLEAN NOT NULL DEFAULT true;
