/*
  Warnings:

  - You are about to drop the column `description` on the `FieldValidation` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `FieldValidation` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `FieldValidation` table. All the data in the column will be lost.
  - You are about to drop the column `params` on the `FieldValidation` table. All the data in the column will be lost.
  - You are about to drop the column `sequence` on the `FieldValidation` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `FieldValidation` table. All the data in the column will be lost.
  - Made the column `type` on table `FieldValidation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FieldValidation" DROP COLUMN "description",
DROP COLUMN "name",
DROP COLUMN "order",
DROP COLUMN "params",
DROP COLUMN "sequence",
DROP COLUMN "title",
ADD COLUMN     "comparisonFieldId" TEXT,
ADD COLUMN     "comparisonType" TEXT NOT NULL DEFAULT 'static',
ADD COLUMN     "message" TEXT NOT NULL DEFAULT 'Ce champ n''est pas valide.',
ADD COLUMN     "value" TEXT,
ALTER COLUMN "type" SET NOT NULL;

-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "FieldValidation_fieldId_idx" ON "FieldValidation"("fieldId");
