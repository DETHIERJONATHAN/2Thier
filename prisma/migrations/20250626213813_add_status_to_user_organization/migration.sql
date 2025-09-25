-- CreateEnum
CREATE TYPE "UserOrganizationStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- AlterTable
ALTER TABLE "UserOrganization" ADD COLUMN     "status" "UserOrganizationStatus" NOT NULL DEFAULT 'ACTIVE';
