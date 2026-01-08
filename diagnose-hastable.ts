import { db } from './src/lib/database';

async function main() {
  const nodeId = '13c56c1f-7a14-41db-b1b6-214eb7d88235';
  const copyId = nodeId + '-1';

  // Vérifier les tables associées
  const originalTables = await db.treeBranchLeafNodeTable.findMany({ where: { nodeId } });
  const copyTables = await db.treeBranchLeafNodeTable.findMany({ where: { nodeId: copyId } });
  
  console.log('=== TABLES ===');
  console.log('Original tables:', originalTables.length);
  console.log('Copy tables:', copyTables.length);
  
  // Vérifier les formules
  const originalFormulas = await db.treeBranchLeafNodeFormula.findMany({ where: { nodeId } });
  const copyFormulas = await db.treeBranchLeafNodeFormula.findMany({ where: { nodeId: copyId } });
  
  console.log('\n=== FORMULAS ===');
  console.log('Original formulas:', originalFormulas.length);
  console.log('Copy formulas:', copyFormulas.length);
  
  // Vérifier les conditions
  const originalConditions = await db.treeBranchLeafNodeCondition.findMany({ where: { nodeId } });
  const copyConditions = await db.treeBranchLeafNodeCondition.findMany({ where: { nodeId: copyId } });
  
  console.log('\n=== CONDITIONS ===');
  console.log('Original conditions:', originalConditions.length);
  console.log('Copy conditions:', copyConditions.length);
  
  // Vérifier le metadata du node copié
  const copyNode = await db.treeBranchLeafNode.findUnique({
    where: { id: copyId },
    select: { 
      id: true, 
      label: true, 
      hasTable: true, 
      hasFormula: true, 
      hasCondition: true,
      metadata: true,
      linkedTableIds: true,
      table_activeId: true,
      capabilities: true
    }
  });
  
  console.log('\n=== COPY NODE DETAILS ===');
  console.log(JSON.stringify(copyNode, null, 2));
}

main();
