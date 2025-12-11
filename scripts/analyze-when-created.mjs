import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔍 Analyser EXACTEMENT QUAND et COMMENT le -1-1 se crée
 * 
 * Questions:
 * 1. Est-ce lors de la création du -1 que le -1-1 apparaît?
 * 2. Ou est-ce un processus séparé?
 * 3. Est-ce une variable d'affichage ou un nœud réel?
 */

async function analyzeWhenDoubleSuffixCreated() {
  console.log('🔍 === ANALYSE: QUAND SE CRÉE LE -1-1 ? ===\n');

  // Vérifier l'état actuel
  const rampantNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Rampant' }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      type: true,
      metadata: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📊 ÉTAT ACTUEL: ${rampantNodes.length} nœuds "Rampant"\n`);

  rampantNodes.forEach((node, idx) => {
    const timeStr = node.createdAt.toLocaleTimeString('fr-FR');
    console.log(`${idx + 1}. ${timeStr} - "${node.label}" (${node.type})`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log(`   Metadata: ${JSON.stringify(node.metadata)}`);
    console.log('');
  });

  // Chercher le -1-1 spécifiquement
  const doubleSuffix = rampantNodes.find(n => n.label === 'Rampant toiture-1-1');

  console.log('='.repeat(100) + '\n');
  
  if (doubleSuffix) {
    console.log('🚨 "Rampant toiture-1-1" EXISTE\n');
    
    // Chercher ses variables
    const vars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: doubleSuffix.id },
      select: {
        id: true,
        displayName: true,
        sourceRef: true
      }
    });

    console.log(`Variables du -1-1 (${vars.length}):\n`);
    vars.forEach(v => {
      console.log(`- ${v.displayName || 'N/A'}`);
      console.log(`  ID: ${v.id}`);
      console.log(`  sourceRef: ${v.sourceRef || 'null'}`);
      console.log('');
    });

    // Chercher les nœuds avec fromVariableId pointant au -1-1
    const fromVarNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['fromVariableId']
        }
      },
      select: {
        id: true,
        label: true,
        metadata: true
      }
    });

    const matchingNodes = fromVarNodes.filter(n => {
      const meta = n.metadata;
      const fromVarId = meta?.fromVariableId;
      return fromVarId && String(fromVarId).includes(doubleSuffix.id);
    });

    console.log(`\nNœuds créés pour les variables du -1-1 (${matchingNodes.length}):`);
    matchingNodes.forEach(n => {
      const meta = n.metadata;
      console.log(`- "${n.label}"`);
      console.log(`  ID: ${n.id}`);
      console.log(`  fromVariableId: ${meta?.fromVariableId}`);
      console.log('');
    });

    console.log('='.repeat(100) + '\n');
    console.log('💡 HYPOTHÈSE:\n');
    console.log('Le -1-1 n\'est PAS créé comme une copie d\'enfant de -1');
    console.log('C\'est un NŒUD D\'AFFICHAGE créé automatiquement');
    console.log('quand on copie les VARIABLES de Rampant toiture-1\n');
    
    console.log('❓ CAUSE PROBABLE:\n');
    console.log('Lors de la copie des variables de Rampant toiture-1:');
    console.log('1. Une variable de Rampant toiture-1 est trouvée');
    console.log('2. autoCreateDisplayNode=true est activé');
    console.log('3. On génère: displayNodeId = nodeId-suffix');
    console.log('4. Si nodeId = "uuid-1" et suffix = "1":');
    console.log('   displayNodeId = "uuid-1-1" ❌\n');

    console.log('✅ SOLUTION CORRECTE:\n');
    console.log('Avant de créer le displayNodeId, VÉRIFIER si nodeId est déjà suffixé');
    console.log('Puis utiliser SEULEMENT les suffixes du REPEATER PARENT');
    console.log('Pas du nodeId lui-même\n');

  } else {
    console.log('✅ "Rampant toiture-1-1" N\'EXISTE PAS\n');
    console.log('Le fix fonctionne!\n');
  }
}

analyzeWhenDoubleSuffixCreated()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
