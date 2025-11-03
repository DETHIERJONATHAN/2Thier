#!/usr/bin/env node
/**
 * 🔧 SCRIPT DE CORRECTION V2: Remplir correctement les templateNodeIds du répéteur Versant
 * Exclure: le répéteur lui-même, "Nouveau Section", et autres branches
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VERSANT_REPEATER_ID = '10724c29-a717-4650-adf3-0ea6633f64f1';
const BLOC_PARENT_ID = 'node_1757366229474_w8xt9wtqz';
const NOUVEAU_SECTION_ID = 'c40d8353-923f-49ac-a3db-91284de99654';

async function main() {
  console.log('\n================== 🔧 CORRECTION VERSANT V2 ==================\n');

  try {
    // 1. Récupérer le répéteur actuel
    const versant = await prisma.treeBranchLeafNode.findUnique({
      where: { id: VERSANT_REPEATER_ID }
    });

    console.log('📋 RÉPÉTEUR VERSANT AVANT:');
    console.log(`  - templateNodeIds: ${versant.metadata?.repeater?.templateNodeIds?.length || 0} champs`);

    // 2. Récupérer les enfants directs du BLOC
    const allTemplateNodes = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: BLOC_PARENT_ID }
    });

    console.log(`\n📋 TOUS LES NŒUDS SOUS BLOC (${allTemplateNodes.length}):`);
    
    // 3. Filtrer pour exclure:
    //    - Les branches (type: 'branch') sauf si c'est un simple groupe
    //    - Le répéteur lui-même
    //    - "Nouveau Section"
    //    - Les leaf_repeater
    
    const validTemplateIds = allTemplateNodes
      .filter(node => {
        const isRepeaterItself = node.id === VERSANT_REPEATER_ID;
        const isNouveauSection = node.id === NOUVEAU_SECTION_ID;
        const isRepeater = node.type === 'leaf_repeater';
        const isBranch = node.type === 'branch';
        
        const shouldInclude = !isRepeaterItself && !isNouveauSection && !isRepeater && !isBranch;
        
        if (shouldInclude) {
          console.log(`  ✅ "${node.label}" (${node.type})`);
        } else {
          let reason = [];
          if (isRepeaterItself) reason.push('EST LE RÉPÉTEUR');
          if (isNouveauSection) reason.push('EST NOUVEAU SECTION');
          if (isRepeater) reason.push('EST UN REPEATER');
          if (isBranch) reason.push('EST UNE BRANCHE');
          console.log(`  ❌ "${node.label}" (${node.type}) - ${reason.join(', ')}`);
        }
        
        return shouldInclude;
      })
      .map(n => n.id);

    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`  - Total sous Bloc: ${allTemplateNodes.length}`);
    console.log(`  - Valides pour templateNodeIds: ${validTemplateIds.length}`);

    // 4. Mettre à jour le répéteur
    console.log(`\n🔄 MISE À JOUR EN COURS...`);
    
    const updatedVersant = await prisma.treeBranchLeafNode.update({
      where: { id: VERSANT_REPEATER_ID },
      data: {
        metadata: {
          ...versant.metadata,
          repeater: {
            ...versant.metadata?.repeater,
            templateNodeIds: validTemplateIds
          }
        }
      }
    });

    console.log('✅ MISE À JOUR RÉUSSIE!');
    console.log(`\n📋 RÉPÉTEUR VERSANT APRÈS:`);
    console.log(`  - templateNodeIds: ${updatedVersant.metadata?.repeater?.templateNodeIds?.length || 0} champs`);
    console.log(`\n📝 IDs inclus:`);
    validTemplateIds.forEach((id, idx) => {
      const node = allTemplateNodes.find(n => n.id === id);
      console.log(`  ${idx + 1}. ${node?.label} (${id})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
