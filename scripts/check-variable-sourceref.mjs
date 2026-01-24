#!/usr/bin/env node
import { db } from '../src/lib/database.ts';

async function main() {
  const v1 = await db.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1' }
  });
  
  const v0 = await db.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23' }
  });
  
  console.log('✅ Variable ORIGINAL:');
  console.log(JSON.stringify(v0, null, 2));
  
  console.log('\n🔍 Variable COPIE -1:');
  console.log(JSON.stringify(v1, null, 2));
  
  await db.$disconnect();
}

main();
