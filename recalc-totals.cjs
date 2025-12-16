/**
 * 🔧 SCRIPT: Recalculer et vérifier les Totaux
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateAndVerify() {
  console.log('\n🔧 ========== RECALCUL DES TOTAUX ==========\n');

  const totalIds = [
    '3da47bc3-739e-4c83-98c3-813ecf77a740-sum-total',  // Panneaux max - Total
    '0cac5b10-ea6e-45a4-a24a-a5a4ab6a04e0-sum-total',  // M² toiture - Total
    'f40b31f0-9cba-4110-a2a6-37df8c986661-sum-total'   // Mur - Total
  ];

  for (const id of totalIds) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id },
      select: { formula_tokens: true, label: true, calculatedValue: true }
    });
    
    if (!node?.formula_tokens) {
      console.log(`⚠️ ${id}: Pas de formula_tokens`);
      continue;
    }
    
    console.log(`\n📊 ${node.label}`);
    console.log(`   formula_tokens: ${JSON.stringify(node.formula_tokens)}`);
    
    // Récupérer les valeurs des nœuds sources
    let total = 0;
    for (const token of node.formula_tokens) {
      if (token.startsWith('@value.')) {
        const sourceNodeId = token.replace('@value.', '');
        const sourceNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: sourceNodeId },
          select: { calculatedValue: true, label: true }
        });
        const val = parseFloat(sourceNode?.calculatedValue || '0');
        console.log(`   Source ${sourceNode?.label || sourceNodeId}: ${val}`);
        if (!isNaN(val)) total += val;
      }
    }
    
    console.log(`   TOTAL calculé: ${total}`);
    console.log(`   Ancienne valeur: ${node.calculatedValue}`);
    
    // Mettre à jour la valeur calculée
    await prisma.treeBranchLeafNode.update({
      where: { id },
      data: { 
        calculatedValue: String(total),
        calculatedAt: new Date(),
        calculatedBy: 'unify-totals-recalc'
      }
    });
    
    console.log(`   ✅ Nouvelle valeur: ${total}`);
  }

  // Vérification finale complète
  console.log('\n\n🔍 ========== STRUCTURE FINALE DES TOTAUX ==========\n');

  const updatedNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: totalIds } },
    select: { 
      id: true, 
      label: true, 
      metadata: true, 
      calculatedValue: true,
      fieldType: true,
      hasData: true,
      hasFormula: true,
      formula_instances: true,
      formula_activeId: true,
      formula_tokens: true,
      data_visibleToUser: true
    }
  });

  for (const node of updatedNodes) {
    const meta = node.metadata || {};
    console.log(`\n✅ ${node.label}:`);
    console.log(`   calculatedValue: ${node.calculatedValue}`);
    console.log(`   hasFormula: ${node.hasFormula}`);
    console.log(`   formula_activeId: ${node.formula_activeId}`);
    console.log(`   formula_instances: ${node.formula_instances ? 'OUI' : 'NON'}`);
    console.log(`   formula_tokens: ${JSON.stringify(node.formula_tokens)}`);
    console.log(`   fieldType: ${node.fieldType}`);
    console.log(`   hasData: ${node.hasData}`);
    console.log(`   data_visibleToUser: ${node.data_visibleToUser}`);
    console.log(`   metadata.capabilities: ${meta.capabilities ? 'OUI (PROBLÈME!)' : 'NON (OK)'}`);
  }

  console.log('\n\n🎉 Recalcul terminé ! Rafraîchis le frontend.');

  await prisma.$disconnect();
}

recalculateAndVerify().catch(e => { console.error(e); process.exit(1); });
