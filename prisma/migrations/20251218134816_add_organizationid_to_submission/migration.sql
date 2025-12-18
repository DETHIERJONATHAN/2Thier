-- AlterTable
ALTER TABLE "public"."TreeBranchLeafSubmission" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "TreeBranchLeafSubmission_organizationId_idx" ON "public"."TreeBranchLeafSubmission"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafSubmission" ADD CONSTRAINT "TreeBranchLeafSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
