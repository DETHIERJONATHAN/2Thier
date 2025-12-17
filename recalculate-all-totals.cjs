const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

/**
 * Recalcule les valeurs de TOUS les champs Total
 * en évaluant leurs formula_tokens avec les valeurs actuelles des nœuds sources
 */
(async () => {
  console.log('\n🔄 === RECALCUL DE TOUS LES CHAMPS TOTAL ===\n');
  
  // 1. Récupérer tous les nœuds Total
  const totals = await p.treeBranchLeafNode.findMany({
    where: { id: { endsWith: '-sum-total' } },
    select: {
      id: true,
      label: true,
      formula_tokens: true,
      calculatedValue: true
    }
  });
  
  console.log(`📊 ${totals.length} champs Total trouvés\n`);
  
  for (const total of totals) {
    const tokens = total.formula_tokens || [];
    
    // Extraire les nodeIds des tokens
    const nodeIds = tokens
      .filter(t => t.startsWith('@value.'))
      .map(t => t.replace('@value.', ''));
    
    if (nodeIds.length === 0) {
      console.log(`⚠️ ${total.label}: Pas de tokens valides`);
      continue;
    }
    
    // Récupérer les valeurs calculées des nœuds sources
    const sourceNodes = await p.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, calculatedValue: true, label: true }
    });
    
    // Créer un map des valeurs
    const valueMap = {};
    for (const node of sourceNodes) {
      valueMap[node.id] = parseFloat(node.calculatedValue) || 0;
      console.log(`   - ${node.label}: ${valueMap[node.id]}`);
    }
    
    // Évaluer la formule (addition simple)
    let newValue = 0;
    for (const nodeId of nodeIds) {
      newValue += valueMap[nodeId] || 0;
    }
    
    const oldValue = total.calculatedValue;
    
    // Mettre à jour si différent
    if (newValue !== parseFloat(oldValue)) {
      await p.treeBranchLeafNode.update({
        where: { id: total.id },
        data: { calculatedValue: String(newValue) }
      });
      console.log(`✅ ${total.label}: ${oldValue} → ${newValue}`);
    } else {
      console.log(`✅ ${total.label}: ${oldValue} (déjà correct)`);
    }
    console.log('');
  }
  
  console.log('🔄 Rechargez la page pour voir les nouvelles valeurs!\n');
  
  await p.$disconnect();
})();
