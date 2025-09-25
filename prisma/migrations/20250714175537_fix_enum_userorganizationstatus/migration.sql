/*
  Warnings:

  - The values [SUSPENDED] on the enum `UserOrganizationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserOrganizationStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');
ALTER TABLE "UserOrganization" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserOrganization" ALTER COLUMN "status" TYPE "UserOrganizationStatus_new" USING ("status"::text::"UserOrganizationStatus_new");
ALTER TYPE "UserOrganizationStatus" RENAME TO "UserOrganizationStatus_old";
ALTER TYPE "UserOrganizationStatus_new" RENAME TO "UserOrganizationStatus";
DROP TYPE "UserOrganizationStatus_old";
ALTER TABLE "UserOrganization" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
