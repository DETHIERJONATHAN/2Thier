/*
  Warnings:

  - You are about to drop the column `imapPassword` on the `MailSettings` table. All the data in the column will be lost.
  - You are about to drop the column `imapUser` on the `MailSettings` table. All the data in the column will be lost.
  - You are about to drop the column `isActivated` on the `MailSettings` table. All the data in the column will be lost.
  - You are about to drop the column `smtpPassword` on the `MailSettings` table. All the data in the column will be lost.
  - You are about to drop the column `smtpUser` on the `MailSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MailSettings" DROP COLUMN "imapPassword",
DROP COLUMN "imapUser",
DROP COLUMN "isActivated",
DROP COLUMN "smtpPassword",
DROP COLUMN "smtpUser",
ADD COLUMN     "emailAddress" TEXT,
ADD COLUMN     "encryptedPassword" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "imapHost" DROP NOT NULL,
ALTER COLUMN "imapPort" DROP NOT NULL,
ALTER COLUMN "smtpHost" DROP NOT NULL,
ALTER COLUMN "smtpPort" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TelnyxSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelnyxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelnyxSettings_userId_key" ON "TelnyxSettings"("userId");

-- AddForeignKey
ALTER TABLE "TelnyxSettings" ADD CONSTRAINT "TelnyxSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
