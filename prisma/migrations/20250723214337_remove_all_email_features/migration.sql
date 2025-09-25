/*
  Warnings:

  - You are about to drop the `DeletedEmail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Email` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MailSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeletedEmail" DROP CONSTRAINT "DeletedEmail_userId_fkey";

-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_userId_fkey";

-- DropForeignKey
ALTER TABLE "MailSettings" DROP CONSTRAINT "MailSettings_userId_fkey";

-- DropTable
DROP TABLE "DeletedEmail";

-- DropTable
DROP TABLE "Email";

-- DropTable
DROP TABLE "MailSettings";
