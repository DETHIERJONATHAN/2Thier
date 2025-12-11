import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🧨 SUPPRESSION + TEST: Supprimer tous les nœuds avec double suffixes puis tester la création
 */

async function deleteAndTest() {
  console.log('🧨 === SUPPRESSION DES NŒUDS AVEC DOUBLE SUFFIXES ===\n');

  // 1. Trouver tous les nœuds avec double suffixes
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { contains: '-' }
    },
    select: {
      id: true,
      label: true,
      data_exposedKey: true
    }
  });

  const doubleSuffixed = allNodes.filter(node => /-\d+-\d+$/.test(node.id));

  if (doubleSuffixed.length === 0) {
    console.log('✅ Aucun nœud avec double suffixe trouvé\n');
  } else {
    console.log(`❌ Trouvé ${doubleSuffixed.length} nœuds avec double suffixes:\n`);
    
    for (const node of doubleSuffixed) {
      console.log(`   🗑️  Suppression: ${node.label || node.data_exposedKey} (${node.id})`);
      
      // Supprimer les variables associées
      await prisma.treeBranchLeafNodeVariable.deleteMany({
        where: { nodeId: node.id }
      });
      
      // Supprimer les formules
      await prisma.treeBranchLeafNodeFormula.deleteMany({
        where: { nodeId: node.id }
      });
      
      // Supprimer les conditions
      await prisma.treeBranchLeafNodeCondition.deleteMany({
        where: { nodeId: node.id }
      });
      
      // Supprimer le nœud
      await prisma.treeBranchLeafNode.delete({
        where: { id: node.id }
      });
      
      console.log(`      ✅ Supprimé`);
    }
  }

  // 2. Vérifier les variables avec double suffixes
  const allVars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      id: { contains: '-' }
    },
    select: {
      id: true,
      exposedKey: true,
      nodeId: true
    }
  });

  const varsDoubleSuffixed = allVars.filter(v => /-\d+-\d+$/.test(v.id));

  if (varsDoubleSuffixed.length > 0) {
    console.log(`\n❌ Trouvé ${varsDoubleSuffixed.length} variables avec double suffixes:\n`);
    
    for (const v of varsDoubleSuffixed) {
      console.log(`   🗑️  Suppression variable: ${v.exposedKey} (${v.id})`);
      await prisma.treeBranchLeafNodeVariable.delete({
        where: { id: v.id }
      });
      console.log(`      ✅ Supprimé`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ NETTOYAGE TERMINÉ\n');

  // 3. Analyser le repeater "Rampant toiture"
  console.log('🔍 Analyse du repeater "Rampant toiture"...\n');

  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: 'Rampant toiture',
      repeater_templateNodeIds: { not: null }
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (!repeater) {
    console.log('❌ Repeater "Rampant toiture" introuvable\n');
    return;
  }

  console.log(`✅ Repeater trouvé: ${repeater.id}\n`);

  // Vérifier les templateNodeIds
  let templateIds = [];
  if (repeater.repeater_templateNodeIds) {
    try {
      templateIds = JSON.parse(repeater.repeater_templateNodeIds);
      console.log(`📋 repeater_templateNodeIds (${templateIds.length}):`);
      
      const hasSuffixed = templateIds.filter(id => /-\d+$/.test(id));
      
      if (hasSuffixed.length > 0) {
        console.log(`   ❌ PROBLÈME: ${hasSuffixed.length} IDs SUFFIXÉS trouvés:`);
        hasSuffixed.forEach(id => console.log(`      - ${id}`));
        
        // NETTOYER
        const cleanIds = templateIds.filter(id => !/-\d+$/.test(id));
        console.log(`\n   🧹 Nettoyage: ${templateIds.length} → ${cleanIds.length} IDs`);
        
        await prisma.treeBranchLeafNode.update({
          where: { id: repeater.id },
          data: {
            repeater_templateNodeIds: JSON.stringify(cleanIds)
          }
        });
        
        console.log(`   ✅ repeater_templateNodeIds nettoyé\n`);
      } else {
        console.log(`   ✅ Tous les IDs sont propres (aucun suffixe)`);
        templateIds.forEach((id, idx) => console.log(`      ${idx + 1}. ${id}`));
      }
    } catch (e) {
      console.log(`   ❌ Erreur parsing: ${e.message}`);
    }
  } else {
    console.log('   ℹ️  repeater_templateNodeIds est NULL');
  }

  // Vérifier metadata
  if (repeater.metadata?.repeater?.templateNodeIds) {
    const metaIds = repeater.metadata.repeater.templateNodeIds;
    const hasSuffixed = metaIds.filter(id => typeof id === 'string' && /-\d+$/.test(id));
    
    if (hasSuffixed.length > 0) {
      console.log(`\n   ❌ metadata.repeater.templateNodeIds contient ${hasSuffixed.length} IDs suffixés`);
      
      const cleanIds = metaIds.filter(id => typeof id === 'string' && !/-\d+$/.test(id));
      const newMeta = {
        ...repeater.metadata,
        repeater: {
          ...repeater.metadata.repeater,
          templateNodeIds: cleanIds
        }
      };
      
      await prisma.treeBranchLeafNode.update({
        where: { id: repeater.id },
        data: { metadata: newMeta }
      });
      
      console.log(`   ✅ metadata.repeater.templateNodeIds nettoyé`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎯 PRÊT POUR LE TEST\n');
  console.log('👉 Maintenant, clique sur "Ajouter Toit" dans l\'interface');
  console.log('👉 Vérifie les logs du serveur pour voir les templateNodeIds utilisés\n');
}

deleteAndTest()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
