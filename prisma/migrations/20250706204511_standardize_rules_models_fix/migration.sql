-- AlterTable
ALTER TABLE "FieldDependency" ADD COLUMN     "name" TEXT,
ADD COLUMN     "sequence" JSONB;

-- AlterTable
ALTER TABLE "FieldFormula" ADD COLUMN     "name" TEXT,
ADD COLUMN     "sequence" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "formula" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FieldValidation" ADD COLUMN     "name" TEXT,
ADD COLUMN     "sequence" JSONB,
ALTER COLUMN "type" DROP NOT NULL;
