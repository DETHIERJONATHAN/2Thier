import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔴 TRACE DÉTAILLÉE: Chercher EXACTEMENT où se crée le -1-1
 * 
 * Hypothèses à tester:
 * 1. Est-ce que "Rampant toiture-1" était déjà suffixé dans repeater_templateNodeIds ?
 * 2. Est-ce qu'on copie une copie?
 * 3. Est-ce que le code deep-copy-service applique le suffixe récursivement?
 */

async function traceCreationOfDoubleSuffix() {
  console.log('🔴 === TRACE: CRÉATION DU DOUBLE SUFFIXE ===\n');
  console.log('='.repeat(100) + '\n');

  // Vérification 1: Historique des modificat ions de repeater_templateNodeIds
  console.log('🔍 VÉRIFICATION 1: Contenu ACTUEL de repeater_templateNodeIds\n');

  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true,
      updatedAt: true
    }
  });

  console.log(`Repeater: "${repeater.label}"`);
  console.log(`Mis à jour: ${repeater.updatedAt}\n`);

  let storedTemplateIds = [];
  if (repeater.repeater_templateNodeIds) {
    try {
      storedTemplateIds = JSON.parse(repeater.repeater_templateNodeIds);
    } catch (e) {}
  }

  console.log(`repeater_templateNodeIds stocké: [${storedTemplateIds.join(', ')}]\n`);

  storedTemplateIds.forEach((id, idx) => {
    // Analyser cet ID
    const isSuffixed = /-\d+$/.test(id);
    console.log(`${idx + 1}. ${id}`);
    console.log(`   Suffixé (-1, -2, etc)? ${isSuffixed ? 'OUI ❌' : 'NON ✅'}`);
    
    if (isSuffixed) {
      const cleaned = id.replace(/-\d+$/, '');
      console.log(`   UUID de base: ${cleaned}`);
    }
    console.log('');
  });

  console.log('='.repeat(100) + '\n');

  // Vérification 2: Retrouver "Rampant toiture-1-1" et comprendre sa création
  console.log('🔍 VÉRIFICATION 2: Analyser "Rampant toiture-1-1"\n');

  const doubleSuffixNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-1' },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (doubleSuffixNode) {
    console.log(`✅ Trouvé: "${doubleSuffixNode.label}" (${doubleSuffixNode.id})`);
    console.log(`   Créé: ${doubleSuffixNode.createdAt}`);
    console.log(`   Mis à jour: ${doubleSuffixNode.updatedAt}`);
    console.log(`   Parent: ${doubleSuffixNode.parentId}`);
    console.log(`   metadata.duplicatedFromRepeater: ${doubleSuffixNode.metadata?.duplicatedFromRepeater}`);
    console.log(`   metadata.originalNodeId: ${doubleSuffixNode.metadata?.originalNodeId}\n`);

    // C'est la clé: originalNodeId nous dit de quel template il est copié
    if (doubleSuffixNode.metadata?.originalNodeId) {
      const originalId = doubleSuffixNode.metadata.originalNodeId;
      console.log(`💡 Créé à partir de: ${originalId}`);
      
      const original = await prisma.treeBranchLeafNode.findUnique({
        where: { id: originalId },
        select: {
          id: true,
          label: true,
          metadata: true
        }
      });

      if (original) {
        console.log(`   Original: "${original.label}" (${original.id})`);
        console.log(`   Est une copie? ${original.metadata?.duplicatedFromRepeater ? 'OUI' : 'NON'}`);
        
        if (original.metadata?.duplicatedFromRepeater) {
          console.log(`   ⚠️  ATTENTION: C'est une copie, pas un template!\n`);
          console.log(`   💡 CELA EXPLIQUE LE DOUBLE SUFFIXE:`);
          console.log(`      1. "Rampant toiture" (template) → crée "Rampant toiture-1" (copie)`);
          console.log(`      2. Quelque chose crée une copie de "Rampant toiture-1"`);
          console.log(`      3. Le système applique le suffixe à l'ID déjà suffixé`);
          console.log(`      4. Résultat: "Rampant toiture-1-1"\n`);
        }
      }
    }
  } else {
    console.log('❌ "Rampant toiture-1-1" introuvable');
  }

  console.log('='.repeat(100) + '\n');

  // Vérification 3: Tous les nœuds Rampant et leur timeline
  console.log('🔍 VÉRIFICATION 3: Timeline complète de tous les nœuds "Rampant"\n');

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

  console.log(`${allRampant.length} nœuds "Rampant" trouvés:\n`);

  allRampant.forEach((node, idx) => {
    const isCopy = node.metadata?.duplicatedFromRepeater === true;
    const originalId = node.metadata?.originalNodeId;
    
    console.log(`${idx + 1}. ${node.label} (${node.id})`);
    console.log(`   Créé: ${node.createdAt}`);
    console.log(`   Est copie? ${isCopy ? 'OUI' : 'NON'}`);
    if (originalId) {
      console.log(`   Copié à partir de: ${originalId}`);
    }
    console.log('');
  });

  console.log('='.repeat(100) + '\n');

  // DIAGNOSTIC FINAL
  console.log('🎯 DIAGNOSTIC FINAL:\n');

  // Chercher qui a créé le -1-1
  const singleSuffixNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1' },
    select: {
      id: true,
      label: true,
      metadata: true
    }
  });

  if (singleSuffixNode && doubleSuffixNode) {
    console.log('SCÉNARIO POSSIBLE:\n');
    console.log(`1️⃣  Tu crées la première copie:`);
    console.log(`   Template: "Rampant toiture" (6817ee20-5782-4b03-a7b1-0687cc5b4d58)`);
    console.log(`   ➡️  Crée: "Rampant toiture-1" (6817ee20-5782-4b03-a7b1-0687cc5b4d58-1) ✅\n`);

    console.log(`2️⃣  Puis, par erreur, le système crée une copie de la copie:`);
    console.log(`   Template: ??? (quelle était le template?)`);
    console.log(`   Original: "Rampant toiture-1" (6817ee20-5782-4b03-a7b1-0687cc5b4d58-1)`);
    console.log(`   ➡️  Crée: "Rampant toiture-1-1" (6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-1) ❌\n`);

    console.log(`❓ QUESTION: Qu'est-ce qui a déclenché la création de "-1-1"?`);
    console.log(`   A) Un clic accidentel sur "Ajouter Toit"?`);
    console.log(`   B) Le code applique le suffixe à TOUS les enfants du repeater?`);
    console.log(`   C) Un bug où on copie d'une copie au lieu d'un template?\n`);
  }
}

traceCreationOfDoubleSuffix()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
