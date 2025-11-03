/**
 * SCRIPT DE TEST : Copier manuellement UNE capacité pour comprendre le problème
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCopyFormula() {
  console.log('\n🧪 TEST COPIE DE CAPACITÉ FORMULE\n');
  
  // 1. Trouver une variable originale (sans -1) qui a une formule
  const originalVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: {
      sourceType: 'tree',
      sourceRef: {
        startsWith: 'node-formula:'
      },
      id: {
        not: {
          contains: '-1'
        }
      }
    },
    select: {
      id: true,
      exposedKey: true,
      sourceRef: true,
      nodeId: true
    }
  });

  if (!originalVariable) {
    console.log('❌ Aucune variable originale avec formule trouvée');
    return;
  }

  console.log('✅ Variable originale trouvée:');
  console.log(`   ID: ${originalVariable.id}`);
  console.log(`   ExposedKey: ${originalVariable.exposedKey}`);
  console.log(`   SourceRef: ${originalVariable.sourceRef}`);
  console.log(`   NodeId: ${originalVariable.nodeId}`);

  // 2. Extraire l'ID de la formule
  const formulaId = originalVariable.sourceRef?.replace('node-formula:', '');
  
  if (!formulaId) {
    console.log('❌ Impossible d\'extraire l\'ID de formule');
    return;
  }

  console.log(`\n📐 ID de formule: ${formulaId}`);

  // 3. Récupérer la formule originale
  const originalFormula = await prisma.nodeFormula.findUnique({
    where: { id: formulaId },
    select: {
      id: true,
      name: true,
      tokens: true,
      nodeId: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!originalFormula) {
    console.log(`❌ Formule ${formulaId} introuvable !`);
    return;
  }

  console.log('✅ Formule originale trouvée:');
  console.log(`   ID: ${originalFormula.id}`);
  console.log(`   Name: ${originalFormula.name}`);
  console.log(`   NodeId: ${originalFormula.nodeId}`);
  console.log(`   Tokens:`, JSON.stringify(originalFormula.tokens, null, 2));

  // 4. CRÉER une copie de la formule
  const newFormulaId = `${originalFormula.id}-1`;
  const newNodeId = `${originalFormula.nodeId}-1`;

  console.log(`\n🚀 CRÉATION DE LA COPIE:`);
  console.log(`   Nouveau ID formule: ${newFormulaId}`);
  console.log(`   Nouveau NodeId: ${newNodeId}`);

  try {
    // Vérifier si le node existe
    const newNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: newNodeId }
    });

    if (!newNode) {
      console.log(`⚠️  Node ${newNodeId} n'existe pas encore`);
    } else {
      console.log(`✅ Node ${newNodeId} existe`);
    }

    // CRÉER la formule copiée
    const newFormula = await prisma.nodeFormula.create({
      data: {
        id: newFormulaId,
        name: `${originalFormula.name} (copie)`,
        tokens: originalFormula.tokens,
        nodeId: newNodeId
      }
    });

    console.log(`\n✅✅✅ FORMULE COPIÉE AVEC SUCCÈS !`);
    console.log(`   ID: ${newFormula.id}`);
    console.log(`   Name: ${newFormula.name}`);
    console.log(`   NodeId: ${newFormula.nodeId}`);

    // 5. Vérifier que la formule existe
    const verification = await prisma.nodeFormula.findUnique({
      where: { id: newFormulaId }
    });

    if (verification) {
      console.log(`\n🎉 VÉRIFICATION: Formule ${newFormulaId} trouvée dans la base !`);
    } else {
      console.log(`\n❌ ERREUR: Formule ${newFormulaId} NON trouvée après création !`);
    }

    // 6. METTRE À JOUR la variable copiée pour pointer vers la nouvelle formule
    const copiedVariableId = `${originalVariable.id}-1`;
    const copiedVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: copiedVariableId }
    });

    if (copiedVariable) {
      console.log(`\n🔗 Variable copiée trouvée: ${copiedVariableId}`);
      console.log(`   SourceRef actuel: ${copiedVariable.sourceRef}`);
      
      // Mettre à jour pour pointer vers la nouvelle formule
      await prisma.treeBranchLeafNodeVariable.update({
        where: { id: copiedVariableId },
        data: {
          sourceRef: `node-formula:${newFormulaId}`
        }
      });

      console.log(`   ✅ SourceRef mis à jour: node-formula:${newFormulaId}`);
    } else {
      console.log(`\n⚠️  Variable copiée ${copiedVariableId} n'existe pas encore`);
    }

  } catch (error: any) {
    console.error(`\n❌ ERREUR lors de la création:`, error.message);
    console.error(`   Code:`, error.code);
    console.error(`   Meta:`, error.meta);
  }
}

testCopyFormula()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
