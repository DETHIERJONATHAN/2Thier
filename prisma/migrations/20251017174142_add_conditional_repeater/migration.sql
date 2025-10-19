-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ADD COLUMN     "repeater_conditionalRules" JSONB,
ADD COLUMN     "repeater_controlFieldId" TEXT,
ADD COLUMN     "repeater_mode" TEXT DEFAULT 'fixed';
