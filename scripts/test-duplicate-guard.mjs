import { PrismaClient } from '@prisma/client';
import { planRepeatDuplication, executeRepeatDuplication } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/repeat-service.js';

const prisma = new PrismaClient();

async function test() {
  const repeaterNodeId = 'c40d8353-923f-49ac-a3db-91284de99654';
  try {
    console.log('Running first executeRepeatDuplication...');
    const res1 = await executeRepeatDuplication(prisma, repeaterNodeId, {});
    console.log('First run status', res1.status, 'operations:', res1.operations.length);

    console.log('Running second executeRepeatDuplication (immediately)...');
    const res2 = await executeRepeatDuplication(prisma, repeaterNodeId, {});
    console.log('Second run status', res2.status, 'operations:', res2.operations.length);
  } catch (e) {
    console.error('Error in test', e);
  } finally {
    await prisma.$disconnect();
  }
}

test().catch(e => { console.error(e); process.exit(1); });