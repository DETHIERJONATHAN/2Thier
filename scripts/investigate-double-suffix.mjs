import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔴 ANALYSE COMPLÈTE: D'où vient exactement Rampant toiture-1-1 ?
 * 
 * Hypothèses:
 * 1. C'est un enfant de Rampant toiture-1 (copie d'une copie)?
 * 2. C'est un enfant du repeater (devrait être une copie directe)?
 * 3. Qui l'a créé? Quand? Pourquoi?
 */

async function analyzeDoubleSuffixCreation() {
  console.log('🔴 === INVESTIGATION COMPLÈTE DU -1-1 ===\n');
  console.log('='.repeat(100) + '\n');

  // 1. Trouver le nœud -1-1
  console.log('🔍 ÉTAPE 1: Localiser Rampant toiture-1-1\n');

  const doubleSuffix = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-1' },
    select: {
      id: true,
      label: true,
      parentId: true,
      type: true,
      metadata: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!doubleSuffix) {
    console.log('❌ Rampant toiture-1-1 N\'EXISTE PAS\n');
    console.log('✅ Cela signifie qu\'il a peut-être été supprimé ou ne s\'est pas créé avec les fixes!\n');
    return;
  }

  console.log('✅ TROUVÉ: Rampant toiture-1-1\n');
  console.log(`ID: ${doubleSuffix.id}`);
  console.log(`Label: ${doubleSuffix.label}`);
  console.log(`Type: ${doubleSuffix.type}`);
  console.log(`Parent: ${doubleSuffix.parentId}`);
  console.log(`Créé: ${doubleSuffix.createdAt}`);
  console.log(`Mis à jour: ${doubleSuffix.updatedAt}`);
  console.log(`\nMetadata:\n${JSON.stringify(doubleSuffix.metadata, null, 2)}\n`);

  // 2. Analyser le parent
  console.log('='.repeat(100) + '\n');
  console.log('🔍 ÉTAPE 2: Analyser le parent\n');

  const parent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: doubleSuffix.parentId || '' },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true,
      metadata: true
    }
  });

  if (parent) {
    console.log(`Parent: "${parent.label}" (${parent.id})`);
    console.log(`Type: ${parent.type}`);
    console.log(`Est répéteur? ${parent.metadata?.repeater ? 'OUI' : 'NON'}`);
    console.log(`Est copie? ${parent.metadata?.duplicatedFromRepeater ? 'OUI' : 'NON'}\n`);

    // Si le parent est Rampant toiture-1, alors le -1-1 est une copie d'une copie!
    if (parent.label === 'Rampant toiture-1') {
      console.log('🚨 DÉCOUVERTE: Le -1-1 est un ENFANT de la COPIE -1!');
      console.log('   Cela signifie: Rampant toiture-1 avait un repeater actif');
      console.log('   Et quelqu\'un a cliqué "Ajouter" sur la COPIE -1\n');
    }

    // Vérifier la grand-parent (parent du parent)
    if (parent.parentId) {
      const grandparent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: parent.parentId },
        select: {
          id: true,
          label: true,
          metadata: true
        }
      });

      if (grandparent) {
        console.log(`Grand-parent: "${grandparent.label}" (${grandparent.id})`);
        console.log(`Est répéteur? ${grandparent.metadata?.repeater ? 'OUI' : 'NON'}\n`);
      }
    }
  }

  // 3. Analyser la chaîne de création
  console.log('='.repeat(100) + '\n');
  console.log('🔍 ÉTAPE 3: Chaîne de création (timeline)\n');

  // Trouver tous les Rampant dans cet arbre
  const allRampant = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Rampant' }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Timeline de création (${allRampant.length} nœuds):\n`);

  allRampant.forEach((node, idx) => {
    const isCopy = node.metadata?.duplicatedFromRepeater === true;
    const originalId = node.metadata?.originalNodeId;
    const timeStr = node.createdAt.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const icon = isCopy ? '📑' : '📋';
    const origin = originalId ? ` (copié de ${originalId.slice(0, 8)}...)` : '';

    console.log(`${idx + 1}. ${timeStr} - ${icon} "${node.label}"${origin}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log('');
  });

  // 4. Vérifier qui pourrait avoir un repeater configuré
  console.log('='.repeat(100) + '\n');
  console.log('🔍 ÉTAPE 4: Vérifier les repeaters configurés\n');

  const nodesWithRepeater = await prisma.treeBranchLeafNode.findMany({
    where: {
      repeater_templateNodeIds: { not: null }
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true
    }
  });

  console.log(`${nodesWithRepeater.length} nœud(s) avec repeater_templateNodeIds:\n`);

  nodesWithRepeater.forEach(node => {
    try {
      const templateIds = JSON.parse(node.repeater_templateNodeIds || '[]');
      console.log(`📦 "${node.label}" (${node.id})`);
      console.log(`   Templates (${templateIds.length}): ${templateIds.join(', ')}`);
      console.log('');
    } catch (e) {
      console.log(`📦 "${node.label}": ERREUR PARSING\n`);
    }
  });

  // 5. DIAGNOSTIC FINAL
  console.log('='.repeat(100) + '\n');
  console.log('🎯 DIAGNOSTIC FINAL\n');

  if (doubleSuffix && parent && parent.label === 'Rampant toiture-1') {
    console.log('🚨 CAUSE IDENTIFIÉE:\n');
    console.log('Le nœud "Rampant toiture-1-1" a été créé comme ENFANT de "Rampant toiture-1"\n');
    console.log('Cela signifie:\n');
    console.log('1. "Rampant toiture-1" (une copie) est configuré comme REPEATER');
    console.log('2. Quelqu\'un a cliqué "Ajouter" sur le repeater de "Rampant toiture-1"');
    console.log('3. Le système a créé "Rampant toiture-1-1" comme enfant\n');
    
    console.log('❓ QUESTIONS:\n');
    console.log('- Pourquoi "Rampant toiture-1" est-il configuré comme repeater?');
    console.log('- Qui a cliqué le bouton "Ajouter" sur la COPIE -1?');
    console.log('- Comment empêcher que les COPIES deviennent des repeaters?\n');
    
    console.log('✅ SOLUTION PROPOSÉE:\n');
    console.log('Quand on crée une copie d\'un nœud repeater:');
    console.log('1. Ne PAS copier la configuration repeater_templateNodeIds');
    console.log('2. La copie ne doit PAS avoir de repeater_templateNodeIds');
    console.log('3. Seul le template original peut être un repeater\n');
  }
}

analyzeDoubleSuffixCreation()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
