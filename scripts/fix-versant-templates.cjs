#!/usr/bin/env node
/**
 * 🔧 SCRIPT DE CORRECTION: Remplir les templateNodeIds du répéteur Versant
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VERSANT_REPEATER_ID = '10724c29-a717-4650-adf3-0ea6633f64f1';
const BLOC_PARENT_ID = 'node_1757366229474_w8xt9wtqz'; // Parent où sont les templates

async function main() {
  console.log('\n================== 🔧 CORRECTION VERSANT ==================\n');

  try {
    // 1. Récupérer le répéteur actuel
    const versant = await prisma.treeBranchLeafNode.findUnique({
      where: { id: VERSANT_REPEATER_ID }
    });

    console.log('📋 RÉPÉTEUR VERSANT AVANT:');
    console.log(`  - templateNodeIds: ${JSON.stringify(versant.metadata?.repeater?.templateNodeIds || [])}`);

    // 2. Récupérer les enfants directs du BLOC (les templates à dupliquer)
    const templateNodes = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: BLOC_PARENT_ID }
    });

    console.log(`\n📋 TEMPLATES TROUVÉS SOUS BLOC (${templateNodes.length}):`);
    const templateIds = templateNodes.map(t => {
      console.log(`  - "${t.label}" (${t.id})`);
      return t.id;
    });

    // 3. Mettre à jour le répéteur avec les templateNodeIds
    console.log(`\n🔄 MISE À JOUR EN COURS...`);
    
    const updatedVersant = await prisma.treeBranchLeafNode.update({
      where: { id: VERSANT_REPEATER_ID },
      data: {
        metadata: {
          ...versant.metadata,
          repeater: {
            ...versant.metadata?.repeater,
            templateNodeIds: templateIds
          }
        }
      }
    });

    console.log('✅ MISE À JOUR RÉUSSIE!');
    console.log(`\n📋 RÉPÉTEUR VERSANT APRÈS:`);
    console.log(`  - templateNodeIds: ${JSON.stringify(updatedVersant.metadata?.repeater?.templateNodeIds || [])}`);
    console.log(`  - Nombre de templates: ${updatedVersant.metadata?.repeater?.templateNodeIds?.length || 0}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
