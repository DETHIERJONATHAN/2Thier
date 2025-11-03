#!/usr/bin/env node
/**
 * Simulation: Créer un nœud de test avec table_instances, puis le dupliquer
 * et vérifier que tous les suffixes sont appliqués
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID();
}

async function simulateDuplication() {
  console.log('🧪 SIMULATION: Duplication complète avec table_instances\n');

  try {
    // 1. Trouver un arbre existant
    const tree = await prisma.treeBranchLeafTree.findFirst();
    if (!tree) {
      console.log('❌ Aucun arbre trouvé. Impossible de tester.');
      return;
    }

    console.log(`✅ Arbre trouvé: ${tree.id} (${tree.name})\n`);

    // 2. Créer un nœud de test avec table_instances
    const testNodeId = generateId();
    const tableId = generateId();
    
    const testNode = await prisma.treeBranchLeafNode.create({
      data: {
        id: testNodeId,
        treeId: tree.id,
        type: 'matrix',
        label: 'Test Node for Duplication',
        table_instances: {
          [tableId]: {
            type: 'matrix',
            tableId: tableId,
            keyColumn: 'Orientation',
            valueColumn: null,
            displayColumn: null
          }
        }
      }
    });

    console.log(`✅ Nœud de test créé: ${testNodeId}`);
    console.log(`   Table instance key: "${tableId}"`);
    console.log(`   Table instance tableId: "${tableId}"\n`);

    // 3. Dupliquer via deepCopyNodeInternal
    console.log('📋 Appel simule de deepCopyNodeInternal...\n');
    
    // Note: C'est une simulation, on affiche juste ce qui DEVRAIT se passer
    const expectedSuffix = '-1';
    const expectedNewKey = `${tableId}${expectedSuffix}`;
    const expectedNewTableId = `${tableId}${expectedSuffix}`;
    
    console.log(`Résultat ATTENDU:`);
    console.log(`  Clé: ${tableId} → ${expectedNewKey}`);
    console.log(`  tableId: ${tableId} → ${expectedNewTableId}\n`);

    // 4. Récupérer et afficher le nœud
    const retrievedNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: testNodeId }
    });

    if (retrievedNode?.table_instances) {
      console.log(`Résultat RÉEL dans la BD:`);
      const instances = retrievedNode.table_instances;
      console.log(JSON.stringify(instances, null, 2));
    }

    // Nettoyage
    await prisma.treeBranchLeafNode.delete({
      where: { id: testNodeId }
    });
    console.log(`\n✅ Nœud de test nettoyé`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulateDuplication();
