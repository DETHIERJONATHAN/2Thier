/*
  Warnings:

  - The primary key for the `UserOrganization` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,organizationId]` on the table `UserOrganization` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `UserOrganization` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_pkey";
ALTER TABLE "UserOrganization" ADD COLUMN "id" TEXT;
UPDATE "UserOrganization" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
ALTER TABLE "UserOrganization" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrganization_userId_organizationId_key" ON "UserOrganization"("userId", "organizationId");
