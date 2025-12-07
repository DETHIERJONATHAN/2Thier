import { PrismaClient } from '@prisma/client';
import { copyVariableWithCapacities } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/variable-copy-engine.js';

async function main() {
  const prisma = new PrismaClient();
  try {
    const res = await copyVariableWithCapacities(
      '96504102-a91c-4eb3-887f-5c01211e207e',
      'debug',
      'adbf2827-d5d7-4ef1-9b38-67f76e9129a6-debug',
      prisma,
      {
        autoCreateDisplayNode: true,
        displaySectionLabel: 'Nouveau Section'
      }
    );
    console.log('Result:', res);
  } catch (err) {
    console.error('Error while copying variable', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
