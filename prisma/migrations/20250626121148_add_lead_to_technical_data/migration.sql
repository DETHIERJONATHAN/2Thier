-- AlterTable
ALTER TABLE "TechnicalData" ADD COLUMN     "leadId" TEXT;

-- AddForeignKey
ALTER TABLE "TechnicalData" ADD CONSTRAINT "TechnicalData_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
