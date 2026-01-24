#!/usr/bin/env node
import { db } from '../src/lib/database.ts';

async function main() {
  // Récupérer SelectConfig pour Puissance WC-1
  const sc = await db.treeBranchLeafSelectConfig.findFirst({
    where: { nodeId: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1' }
  });
  
  console.log('✅ SelectConfig pour Puissance WC-1:');
  console.log(JSON.stringify(sc, null, 2));
  
  if (sc?.tableReference) {
    const table = await db.treeBranchLeafNodeTable.findUnique({
      where: { id: sc.tableReference },
      select: { id: true, meta: true }
    });
    
    console.log('\n🔍 Table associée (META):');
    console.log(JSON.stringify(table, null, 2));
  }
  
  await db.$disconnect();
}

main();
