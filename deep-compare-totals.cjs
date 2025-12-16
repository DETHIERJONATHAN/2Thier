const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepCompareThreeTotals() {
  const panneauxTotalId = '3da47bc3-739e-4c83-98c3-813ecf77a740-sum-total';
  const toitureTotalId = '0cac5b10-ea6e-45a4-a24a-a5a4ab6a04e0-sum-total';
  const murTotalId = 'f40b31f0-9cba-4110-a2a6-37df8c986661-sum-total';
  
  console.log('\n========== COMPARAISON COMPLÈTE DES 3 TOTAUX ==========\n');
  
  // Récupérer TOUS les champs de chaque nœud
  const [panneaux, toiture, mur] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({ where: { id: panneauxTotalId } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: toitureTotalId } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: murTotalId } })
  ]);
  
  const nodes = [
    { name: 'Panneaux max - Total ❌', node: panneaux },
    { name: 'M² toiture - Total ✅', node: toiture },
    { name: 'Mur - Total ✅', node: mur }
  ];
  
  // Tous les champs à comparer (les clés du premier nœud)
  const allKeys = Object.keys(panneaux || {}).sort();
  
  // Trouver les différences
  console.log('📊 CHAMPS AVEC VALEURS DIFFÉRENTES:\n');
  
  for (const key of allKeys) {
    const values = nodes.map(n => n.node?.[key]);
    
    // Convertir en JSON pour comparer
    const jsonValues = values.map(v => JSON.stringify(v));
    
    // Si toutes les valeurs sont identiques, skip
    if (new Set(jsonValues).size === 1) continue;
    
    console.log(`\n🔑 ${key}:`);
    nodes.forEach((n, i) => {
      const v = values[i];
      const display = typeof v === 'object' ? JSON.stringify(v, null, 2).substring(0, 200) : v;
      console.log(`   ${n.name}: ${display}`);
    });
  }
  
  // Focus sur les metadata
  console.log('\n\n========== FOCUS METADATA ==========\n');
  
  nodes.forEach(n => {
    const meta = n.node?.metadata || {};
    console.log(`${n.name}:`);
    console.log(`  isSumDisplayField: ${meta.isSumDisplayField}`);
    console.log(`  sourceNodeId: ${meta.sourceNodeId}`);
    console.log(`  sourceVariableId: ${meta.sourceVariableId}`);
    console.log(`  sumTokens: ${JSON.stringify(meta.sumTokens)}`);
    console.log(`  copiesCount: ${meta.copiesCount}`);
    console.log(`  createdAt: ${meta.createdAt}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

deepCompareThreeTotals().catch(e => { console.error(e); process.exit(1); });
