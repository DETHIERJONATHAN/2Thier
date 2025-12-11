import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ✅ Vérification: La nouvelle regex détecte-t-elle correctement les suffixes ?
 */

async function verifyNewRegex() {
  console.log('✅ VÉRIFICATION DE LA NOUVELLE REGEX\n');
  console.log('='.repeat(80) + '\n');

  // Nouvelle regex précise
  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;

  // Récupérer tous les nœuds
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true
    }
  });

  console.log(`📦 Total de nœuds: ${allNodes.length}\n`);

  // 1. Tester sur tous les IDs de nœuds
  console.log('🔍 TEST 1: Détection sur tous les IDs de nœuds\n');
  
  const nodesWithSuffix = allNodes.filter(n => hasCopySuffix.test(n.id));
  const nodesWithoutSuffix = allNodes.filter(n => !hasCopySuffix.test(n.id));

  console.log(`✅ UUIDs purs (sans suffixe): ${nodesWithoutSuffix.length}`);
  console.log(`🔸 IDs avec suffixes de copie: ${nodesWithSuffix.length}\n`);

  if (nodesWithSuffix.length > 0) {
    console.log('📋 Exemples d\'IDs avec suffixes détectés:');
    nodesWithSuffix.slice(0, 5).forEach(n => {
      console.log(`   - ${n.label || 'N/A'}: ${n.id}`);
    });
    console.log('');
  }

  // 2. Tester sur les repeater_templateNodeIds
  console.log('='.repeat(80) + '\n');
  console.log('🔍 TEST 2: Détection dans repeater_templateNodeIds\n');

  const repeatersWithTemplates = allNodes.filter(n => n.repeater_templateNodeIds);
  console.log(`📦 Nœuds avec templateNodeIds: ${repeatersWithTemplates.length}\n`);

  let totalTemplateIds = 0;
  let cleanTemplateIds = 0;
  let problematicTemplateIds = 0;
  const problematicNodes = [];

  for (const node of repeatersWithTemplates) {
    try {
      const templateIds = JSON.parse(node.repeater_templateNodeIds);
      
      for (const templateId of templateIds) {
        totalTemplateIds++;
        
        if (hasCopySuffix.test(templateId)) {
          problematicTemplateIds++;
          problematicNodes.push({
            nodeLabel: node.label,
            nodeId: node.id,
            problematicTemplateId: templateId
          });
        } else {
          cleanTemplateIds++;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  console.log(`✅ TemplateIds propres (UUIDs purs): ${cleanTemplateIds}`);
  console.log(`❌ TemplateIds problématiques (avec suffixes): ${problematicTemplateIds}\n`);

  if (problematicNodes.length > 0) {
    console.log('⚠️  PROBLÈMES DÉTECTÉS:\n');
    
    problematicNodes.forEach((problem, idx) => {
      console.log(`${idx + 1}. Repeater: "${problem.nodeLabel || 'N/A'}" (${problem.nodeId})`);
      console.log(`   ❌ TemplateId avec suffixe: ${problem.problematicTemplateId}`);
      
      // Proposer l'ID nettoyé
      const cleaned = problem.problematicTemplateId.replace(/(-\d+)+$/, '');
      console.log(`   ✅ ID nettoyé proposé: ${cleaned}\n`);
    });

    console.log('='.repeat(80) + '\n');
    console.log('💡 ACTION REQUISE:\n');
    console.log('   Ces repeater_templateNodeIds contiennent des IDs avec suffixes');
    console.log('   Ils doivent être nettoyés pour contenir UNIQUEMENT des UUIDs de base\n');
    
  } else {
    console.log('✅ Aucun problème détecté ! Tous les templateIds sont propres.\n');
  }

  // 3. Résumé final
  console.log('='.repeat(80) + '\n');
  console.log('📊 RÉSUMÉ FINAL:\n');
  console.log(`Total d'IDs analysés: ${allNodes.length}`);
  console.log(`   - UUIDs purs: ${nodesWithoutSuffix.length}`);
  console.log(`   - IDs avec suffixes: ${nodesWithSuffix.length}\n`);
  
  console.log(`Total de templateIds analysés: ${totalTemplateIds}`);
  console.log(`   - Propres (UUIDs): ${cleanTemplateIds}`);
  console.log(`   - Problématiques (suffixés): ${problematicTemplateIds}\n`);

  if (problematicTemplateIds === 0 && nodesWithSuffix.length === 0) {
    console.log('🎉 PARFAIT ! Aucun problème détecté avec la nouvelle regex.\n');
  } else if (problematicTemplateIds > 0) {
    console.log('⚠️  Des templateIds avec suffixes ont été détectés.');
    console.log('   Il faut les nettoyer avant de créer de nouvelles copies.\n');
  }
}

verifyNewRegex()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
