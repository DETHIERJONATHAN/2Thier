/*
  Warnings:

  - You are about to drop the column `bcc` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `bodyHtml` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `bodyText` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `cc` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `folder` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isSent` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `emailAddress` on the `MailSettings` table. All the data in the column will be lost.
  - You are about to drop the column `imapTls` on the `MailSettings` table. All the data in the column will be lost.
  - You are about to drop the column `smtpTls` on the `MailSettings` table. All the data in the column will be lost.
  - Added the required column `body` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Made the column `subject` on table `Email` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Email_messageId_key";

-- DropIndex
DROP INDEX "Email_userId_date_idx";

-- DropIndex
DROP INDEX "MailSettings_emailAddress_key";

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "bcc",
DROP COLUMN "bodyHtml",
DROP COLUMN "bodyText",
DROP COLUMN "cc",
DROP COLUMN "date",
DROP COLUMN "folder",
DROP COLUMN "isSent",
DROP COLUMN "messageId",
DROP COLUMN "updatedAt",
ADD COLUMN     "body" TEXT NOT NULL,
ALTER COLUMN "from" SET DATA TYPE TEXT,
ALTER COLUMN "to" SET DATA TYPE TEXT,
ALTER COLUMN "subject" SET NOT NULL;

-- AlterTable
ALTER TABLE "MailSettings" DROP COLUMN "emailAddress",
DROP COLUMN "imapTls",
DROP COLUMN "smtpTls",
ADD COLUMN     "isActivated" BOOLEAN NOT NULL DEFAULT false;
