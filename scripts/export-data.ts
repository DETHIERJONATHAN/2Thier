import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function exportData() {
  console.log('📦 Exporting data from local database...');
  
  try {
    const dataToExport = {
      users: await prisma.user.findMany({}),
      organizations: await prisma.organization.findMany({}),
      roles: await prisma.role.findMany({}),
      permissions: await prisma.permission.findMany({}),
      modules: await prisma.module.findMany({}),
      webSites: await prisma.webSite.findMany({}),
      webSiteSections: await prisma.webSiteSection.findMany({}),
      webSiteConfig: await prisma.webSiteConfig.findMany({}),
      webSiteTheme: await prisma.webSiteTheme.findMany({}),
      blocks: await prisma.block.findMany({}),
      categories: await prisma.category.findMany({}),
      leads: await prisma.lead.findMany({}),
      treeBranchLeafTree: await prisma.treeBranchLeafTree.findMany({}),
      treeBranchLeafNode: await prisma.treeBranchLeafNode.findMany({}),
    };

    const outputPath = path.join(__dirname, '../prisma/seed-data.json');
    await fs.writeFile(outputPath, JSON.stringify(dataToExport, null, 2));

    console.log(`✅ Data successfully exported to ${outputPath}`);
    console.log(`📊 Exported:`);
    console.log(`   - ${dataToExport.users.length} users`);
    console.log(`   - ${dataToExport.organizations.length} organizations`);
    console.log(`   - ${dataToExport.webSites.length} websites`);
    console.log(`   - ${dataToExport.webSiteSections.length} website sections`);
    console.log(`   - ${dataToExport.blocks.length} blocks`);
  } catch (error) {
    console.error('❌ Failed to export data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
