/**
 * Compare deux champs Total pour voir pourquoi l'un fonctionne et l'autre non
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function compare() {
  console.log('=== COMPARAISON PANNEAUX MAX vs PUISSANCE WC ===\n');
  
  // Panneaux max (fonctionne)
  console.log('📊 PANNEAUX MAX:');
  const panneauxMax = await p.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { id: '3da47bc3-739e-4c83-98c3-813ecf77a740' },
        { id: { startsWith: '3da47bc3-739e-4c83-98c3-813ecf77a740-' } }
      ]
    },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      metadata: true
    }
  });
  
  let sumPanneaux = 0;
  for (const node of panneauxMax) {
    const val = parseFloat(node.calculatedValue || '0');
    sumPanneaux += val;
    const isTotal = node.id.includes('sum-total');
    console.log(`${isTotal ? '➡️ TOTAL' : '📍'} ${node.label} (${node.id}): ${node.calculatedValue}`);
  }
  console.log('Somme des sources:', sumPanneaux - parseFloat(panneauxMax.find(n => n.id.includes('sum-total'))?.calculatedValue || '0'));
  
  // Puissance WC (problématique)
  console.log('\n📊 PUISSANCE WC:');
  const puissanceWC = await p.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { id: 'b8f8e0f5-8572-4c47-8fd9-e1932bca6f99' },
        { id: { startsWith: 'b8f8e0f5-8572-4c47-8fd9-e1932bca6f99-' } }
      ]
    },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      metadata: true
    }
  });
  
  let sumPuissance = 0;
  for (const node of puissanceWC) {
    const val = parseFloat(node.calculatedValue || '0');
    sumPuissance += val;
    const isTotal = node.id.includes('sum-total');
    console.log(`${isTotal ? '➡️ TOTAL' : '📍'} ${node.label} (${node.id}): ${node.calculatedValue}`);
    if (!isTotal) {
      const meta = node.metadata || {};
      console.log(`   metadata.createSumDisplayField: ${meta.createSumDisplayField}`);
    }
  }
  console.log('Somme des sources:', sumPuissance - parseFloat(puissanceWC.find(n => n.id.includes('sum-total'))?.calculatedValue || '0'));
  
  await p.$disconnect();
}

compare();
