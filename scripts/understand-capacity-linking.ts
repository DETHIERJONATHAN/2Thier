/**
 * COMPRENDRE LA LIAISON : Variable → Node → Capacité
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCapacityLinking() {
  console.log('\n🔍 ANALYSE LIAISON VARIABLE → NODE → CAPACITÉ\n');
  console.log('═'.repeat(80));

  // 1. Prendre une variable originale avec formule
  const variable = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: {
      sourceRef: { startsWith: 'node-formula:' }
    }
  });

  if (!variable) {
    console.log('❌ Aucune variable avec formule trouvée');
    return;
  }

  console.log('\n📌 VARIABLE ORIGINALE:');
  console.log(`   ID: ${variable.id}`);
  console.log(`   ExposedKey: ${variable.exposedKey}`);
  console.log(`   SourceType: ${variable.sourceType}`);
  console.log(`   SourceRef: ${variable.sourceRef}`);
  console.log(`   NodeId: ${variable.nodeId}`);

  // 2. Extraire l'ID du sourceRef
  const sourceRefId = variable.sourceRef?.replace('node-formula:', '');
  console.log(`\n🔍 ID extrait du sourceRef: ${sourceRefId}`);

  // 3. Est-ce que cet ID est un NodeFormula.id ?
  const formulaById = await prisma.nodeFormula.findUnique({
    where: { id: sourceRefId }
  });

  if (formulaById) {
    console.log(`\n✅ MÉTHODE 1: ID direct dans NodeFormula.id`);
    console.log(`   Formula.id: ${formulaById.id}`);
    console.log(`   Formula.name: ${formulaById.name}`);
    console.log(`   Formula.nodeId: ${formulaById.nodeId}`);
  } else {
    console.log(`\n❌ MÉTHODE 1: Pas de formule avec id = ${sourceRefId}`);
  }

  // 4. OU est-ce que c'est un TreeBranchLeaf.id (node) qui CONTIENT la formule ?
  const formulaByNodeId = await prisma.nodeFormula.findFirst({
    where: { nodeId: sourceRefId }
  });

  if (formulaByNodeId) {
    console.log(`\n✅✅✅ MÉTHODE 2: NodeId dans NodeFormula.nodeId`);
    console.log(`   Formula.id: ${formulaByNodeId.id}`);
    console.log(`   Formula.name: ${formulaByNodeId.name}`);
    console.log(`   Formula.nodeId: ${formulaByNodeId.nodeId}`);
    console.log(`   Formula.tokens:`, JSON.stringify(formulaByNodeId.tokens, null, 2));
  } else {
    console.log(`\n❌ MÉTHODE 2: Pas de formule avec nodeId = ${sourceRefId}`);
  }

  // 5. Vérifier si le node existe
  const node = await prisma.treeBranchLeaf.findUnique({
    where: { id: sourceRefId }
  });

  if (node) {
    console.log(`\n🌲 NODE TROUVÉ:`);
    console.log(`   Node.id: ${node.id}`);
    console.log(`   Node.label: ${node.label}`);
    console.log(`   Node.type: ${node.type}`);
    console.log(`   Node.parentId: ${node.parentId}`);
  } else {
    console.log(`\n❌ Node ${sourceRefId} introuvable`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RÉSUMÉ DE LA STRUCTURE:\n');
  
  if (formulaByNodeId) {
    console.log(`Variable.sourceRef = "node-formula:${sourceRefId}"`);
    console.log(`                              ↓`);
    console.log(`                       TreeBranchLeaf.id = ${sourceRefId}`);
    console.log(`                              ↓`);
    console.log(`                       NodeFormula.nodeId = ${sourceRefId}`);
    console.log(`                       NodeFormula.id = ${formulaByNodeId.id}`);
    console.log(`                       NodeFormula.name = "${formulaByNodeId.name}"`);
  }

  console.log('\n' + '═'.repeat(80));

  // 6. Analyser la variable COPIÉE si elle existe
  const copiedVariableId = `${variable.id}-1`;
  const copiedVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: copiedVariableId }
  });

  if (copiedVariable) {
    console.log('\n🔄 VARIABLE COPIÉE TROUVÉE:');
    console.log(`   ID: ${copiedVariable.id}`);
    console.log(`   SourceRef: ${copiedVariable.sourceRef}`);
    console.log(`   NodeId: ${copiedVariable.nodeId}`);

    const copiedSourceRefId = copiedVariable.sourceRef?.replace('node-formula:', '');
    console.log(`\n🔍 ID extrait du sourceRef copié: ${copiedSourceRefId}`);

    // Vérifier si la capacité copiée existe
    const copiedFormulaByNodeId = await prisma.nodeFormula.findFirst({
      where: { nodeId: copiedSourceRefId }
    });

    if (copiedFormulaByNodeId) {
      console.log(`\n✅ CAPACITÉ COPIÉE EXISTE !`);
      console.log(`   Formula.id: ${copiedFormulaByNodeId.id}`);
      console.log(`   Formula.nodeId: ${copiedFormulaByNodeId.nodeId}`);
    } else {
      console.log(`\n❌ CAPACITÉ COPIÉE N'EXISTE PAS !`);
      console.log(`   Cherché: NodeFormula WHERE nodeId = "${copiedSourceRefId}"`);
      
      // Vérifier si le node copié existe
      const copiedNode = await prisma.treeBranchLeaf.findUnique({
        where: { id: copiedSourceRefId }
      });
      
      if (copiedNode) {
        console.log(`   ✅ Node copié existe: ${copiedNode.label}`);
      } else {
        console.log(`   ❌ Node copié n'existe pas non plus !`);
      }
    }
  } else {
    console.log('\n⚠️  Aucune variable copiée trouvée');
  }

  console.log('\n' + '═'.repeat(80));
}

analyzeCapacityLinking()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
