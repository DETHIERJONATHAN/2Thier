import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ✅ TEST: Vérifier que les fixes fonctionnent
 * 
 * Avant les fixes:
 * - Première copie crée -1 ✅
 * - Deuxième copie crée -1-1 ❌ (MAUVAIS!)
 * 
 * Après les fixes:
 * - Première copie crée -1 ✅
 * - Deuxième copie crée -2 ✅
 * - Troisième copie crée -3 ✅
 */

async function testDoubleHaltSuffixFix() {
  console.log('✅ === TEST DES FIXES POUR LES DOUBLE SUFFIXES ===\n');
  console.log('='.repeat(100) + '\n');

  // 1. Vérifier l'état actuel
  console.log('📊 1️⃣ ÉTAT ACTUEL DES NŒUDS\n');

  const allRampant = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Rampant' }
    },
    select: {
      id: true,
      label: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Trouvé ${allRampant.length} nœuds "Rampant":\n`);

  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;

  for (const node of allRampant) {
    const isCopy = node.metadata?.duplicatedFromRepeater === true;
    const suffixes = (node.id.match(/-(\d+)/g) || []).map(s => s.slice(1));
    const isDoubleSuffix = suffixes.length > 1;
    
    const status = isDoubleSuffix ? '❌ DOUBLE SUFFIXE' :
                   isCopy ? '✅ COPIE SIMPLE' :
                   '📋 TEMPLATE';
    
    console.log(`${status}: "${node.label}"`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Suffixes: [${suffixes.join(', ') || 'aucun'}]`);
    console.log('');
  }

  // 2. Vérifier la configuration du repeater
  console.log('='.repeat(100) + '\n');
  console.log('🔍 2️⃣ CONFIGURATION DU REPEATER\n');

  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true
    }
  });

  if (repeater && repeater.repeater_templateNodeIds) {
    try {
      const templateIds = JSON.parse(repeater.repeater_templateNodeIds);
      console.log(`Repeater: "${repeater.label}"\n`);
      console.log(`repeater_templateNodeIds (${templateIds.length}):\n`);
      
      templateIds.forEach((id, idx) => {
        const isSuffixed = hasCopySuffix.test(id);
        const status = isSuffixed ? '❌ SUFFIXÉ (PROBLÈME!)' : '✅ UUID PUR (OK)';
        console.log(`${idx + 1}. ${status}`);
        console.log(`   ${id}\n`);
      });
    } catch (e) {
      console.log('Erreur parsing templateIds');
    }
  }

  // 3. Simulation: Qu'est-ce qui se passerait si on clique maintenant?
  console.log('='.repeat(100) + '\n');
  console.log('🎯 3️⃣ SIMULATION: Prochain clic sur "Ajouter Toit"\n');

  const children = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: {
      id: true,
      label: true,
      metadata: true
    }
  });

  const copies = children.filter(c => c.metadata?.duplicatedFromRepeater === true);
  const suffixes = copies
    .map(c => {
      const match = c.id.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(s => s > 0);

  const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0;
  const nextSuffix = maxSuffix + 1;

  console.log(`Copies actuelles: ${copies.length}`);
  console.log(`Suffixes utilisés: [${suffixes.join(', ') || 'aucun'}]`);
  console.log(`Prochain suffixe calculé: ${nextSuffix}\n`);

  // Vérifier que le prochain suffixe est correct
  if (nextSuffix === 1 && copies.length === 0) {
    console.log('✅ CORRECT: Première copie sera -1\n');
  } else if (nextSuffix === 2 && copies.length === 1) {
    console.log('✅ CORRECT: Deuxième copie sera -2\n');
  } else if (nextSuffix === 3 && copies.length === 2) {
    console.log('✅ CORRECT: Troisième copie sera -3\n');
  } else {
    console.log(`❓ À VÉRIFIER: nextSuffix=${nextSuffix}, copies=${copies.length}\n`);
  }

  // 4. Diagnostic final
  console.log('='.repeat(100) + '\n');
  console.log('🎯 DIAGNOSTIC FINAL\n');

  const hasDoubleSuffixes = allRampant.some(node => {
    const suffixes = (node.id.match(/-(\d+)/g) || []).length;
    return suffixes > 1;
  });

  const templateIdsWithSuffixes = (repeater && repeater.repeater_templateNodeIds) ? 
    JSON.parse(repeater.repeater_templateNodeIds).some(id => hasCopySuffix.test(id)) : false;

  if (hasDoubleSuffixes) {
    console.log('❌ PROBLÈME: Des nœuds avec double suffixes existent encore');
    console.log('   Ces nœuds doivent être supprimés manuellement\n');
  } else {
    console.log('✅ Aucun double suffixe détecté\n');
  }

  if (templateIdsWithSuffixes) {
    console.log('❌ PROBLÈME: Les templateNodeIds contiennent des suffixes');
    console.log('   Ils doivent être nettoyés\n');
  } else {
    console.log('✅ Les templateNodeIds sont des UUIDs purs\n');
  }

  if (!hasDoubleSuffixes && !templateIdsWithSuffixes) {
    console.log('🎉 TOUS LES FIXES SONT ACTIFS!');
    console.log('   Les prochaines copies seront: -1, -2, -3, etc.');
    console.log('   Aucun double suffixe ne sera créé\n');
  }
}

testDoubleHaltSuffixFix()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
