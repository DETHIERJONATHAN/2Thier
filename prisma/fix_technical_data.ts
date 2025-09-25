
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting data fix script...');

    const technicalDataId = 'b171ed57-34a6-4584-8ed7-36413aa7d5d0';
    const targetOrganizationId = '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de';

    // Find the technical data to ensure it exists
    const techData = await prisma.technicalData.findUnique({
        where: { id: technicalDataId }
    });

    if (!techData) {
        console.error(`Technical data with ID ${technicalDataId} not found. Nothing to fix.`);
        return;
    }

    if (techData.organizationId) {
        console.log(`Technical data already has an organizationId: ${techData.organizationId}. Nothing to fix.`);
        return;
    }

    // Update the technical data
    await prisma.technicalData.update({
        where: { id: technicalDataId },
        data: { organizationId: targetOrganizationId },
    });

    console.log(`Successfully updated organizationId for technical data ${technicalDataId}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Fix script finished.");
  })
  .catch(async (e) => {
    console.error("Error during fix script:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
