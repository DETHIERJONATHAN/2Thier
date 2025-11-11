/**
 * ⚡ QUICK CHECK - Vérification rapide des valeurs calculées
 * 
 * Utilisation:
 * npx tsx src/quick-check.ts
 * 
 * Ce script:
 * 1. Affiche les stats globales
 * 2. Stocke une valeur de test
 * 3. La relit pour vérifier
 */

import { prisma } from './lib/prisma';

async function main() {
  try {
    console.log('\n⚡ QUICK CHECK - Valeurs Calculées\n');

    // Stats
    const total = await prisma.treeBranchLeafNode.count();
    const withValues = await prisma.treeBranchLeafNode.count({
      where: { calculatedValue: { not: null } }
    });

    console.log(`📊 Stats: ${withValues}/${total} nœuds avec valeurs`);

    // Trouver un nœud
    const node = await prisma.treeBranchLeafNode.findFirst({
      select: { id: true, label: true }
    });

    if (!node) {
      console.log('❌ Aucun nœud trouvé!');
      process.exit(1);
    }

    console.log(`✅ Nœud: ${node.label} (${node.id.substring(0, 8)}...)`);

    // Test
    const value = `test_${Date.now()}`;
    await prisma.treeBranchLeafNode.update({
      where: { id: node.id },
      data: {
        calculatedValue: value,
        calculatedAt: new Date(),
        calculatedBy: 'quick-check'
      }
    });

    const result = await prisma.treeBranchLeafNode.findUnique({
      where: { id: node.id },
      select: { calculatedValue: true }
    });

    if (result?.calculatedValue === value) {
      console.log(`✅ Test: Valeur stockée et relue avec succès!`);
      console.log(`📝 Valeur: ${value}\n`);
    } else {
      console.log(`❌ Test FAILED`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
