const { PrismaClient } = require('@prisma/client');

let prisma;
try {
  prisma = new PrismaClient();
} catch (error) {
  console.error('❌ Erreur Prisma:', error);
  process.exit(1);
}

async function traceField() {
  console.log('🔍 ANALYSE COMPLÈTE DU CHAMP 10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e');
  console.log('=' * 80);
  
  const fieldId = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
  
  // 1. Analyse du champ principal
  console.log('\n📋 1. ANALYSE DU CHAMP PRINCIPAL');
  const field = await prisma.treeBranchLeafNode.findUnique({
    where: { id: fieldId },
    include: {
      TreeBranchLeafNodeVariable: true,
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true,
      // Relation parent/enfant
      other_TreeBranchLeafNode: true,
      TreeBranchLeafNode: true
    }
  });
  
  if (!field) {
    console.log('❌ Champ non trouvé !');
    return;
  }
  
  console.log('✅ Champ trouvé:');
  console.log(`   ID: ${field.id}`);
  console.log(`   Nom: ${field.name}`);
  console.log(`   Type: ${field.type}`);
  console.log(`   tbl_capacity: ${field.tbl_capacity}`);
  console.log(`   sourceRef: ${field.sourceRef}`);
  console.log(`   Parent ID: ${field.parent_id}`);
  
  // 2. Analyse des instances
  console.log('\n🔗 2. ANALYSE DES INSTANCES');
  console.log(`   Variables: ${field.TreeBranchLeafNodeVariable?.length || 0}`);
  console.log(`   Formulas: ${field.TreeBranchLeafNodeFormula?.length || 0}`);
  console.log(`   Conditions: ${field.TreeBranchLeafNodeCondition?.length || 0}`);
  
  // Détail des instances
  if (field.TreeBranchLeafNodeVariable?.length > 0) {
    console.log('\n   � Variables:');
    field.TreeBranchLeafNodeVariable.forEach((instance, i) => {
      console.log(`     [${i}] ID: ${instance.id}, sourceRef: ${instance.sourceRef}`);
    });
  }
  
  if (field.TreeBranchLeafNodeFormula?.length > 0) {
    console.log('\n   📐 Formulas:');
    field.TreeBranchLeafNodeFormula.forEach((instance, i) => {
      console.log(`     [${i}] ID: ${instance.id}, formula: ${instance.formula}`);
    });
  }
  
  if (field.TreeBranchLeafNodeCondition?.length > 0) {
    console.log('\n   ⚡ Conditions:');
    field.TreeBranchLeafNodeCondition.forEach((instance, i) => {
      console.log(`     [${i}] ID: ${instance.id}, condition: ${instance.condition}`);
    });
  }
  
  // 3. Recherche des formules liées
  console.log('\n🧮 3. RECHERCHE DES FORMULES LIÉES');
  
  // Recherche par sourceRef
  if (field.sourceRef) {
    console.log(`   Recherche par sourceRef: ${field.sourceRef}`);
    
    if (field.sourceRef.startsWith('formula:')) {
      const formulaId = field.sourceRef.replace('formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      if (formula) {
        console.log(`   ✅ Formule trouvée: ${formula.formula}`);
      }
    }
    
    if (field.sourceRef.startsWith('condition:')) {
      const conditionId = field.sourceRef.replace('condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });
      if (condition) {
        console.log(`   ✅ Condition trouvée: ${condition.condition}`);
      }
    }
    
    if (field.sourceRef.startsWith('variable:')) {
      const variableId = field.sourceRef.replace('variable:', '');
      const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: variableId }
      });
      if (variable) {
        console.log(`   ✅ Variable trouvée: ${variable.sourceRef}`);
      }
    }
  }
  
  // 4. Analyse du parent
  console.log('\n👥 4. ANALYSE DU PARENT');
  if (field.parent_id) {
    const parent = await prisma.treeBranchLeafNode.findUnique({
      where: { id: field.parent_id }
    });
    if (parent) {
      console.log(`   Parent: ${parent.name} (${parent.type})`);
      console.log(`   Parent tbl_capacity: ${parent.tbl_capacity}`);
    }
  }
  
  // 5. Recherche dans toutes les formules qui utilisent ce champ
  console.log('\n🔍 5. FORMULES QUI UTILISENT CE CHAMP');
  const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: {
      OR: [
        { formula: { contains: fieldId } },
        { formula: { contains: field.name } }
      ]
    }
  });
  
  console.log(`   Trouvé ${allFormulas.length} formules qui référencent ce champ:`);
  allFormulas.forEach((formula, i) => {
    console.log(`     [${i}] ${formula.id}: ${formula.formula}`);
  });
  
  // 6. Vérification si ce champ est utilisé comme sourceRef ailleurs
  console.log('\n🔗 6. UTILISATIONS COMME SOURCEREF');
  
  const usedAsSourceRef = await prisma.treeBranchLeafNode.findMany({
    where: {
      sourceRef: {
        in: [
          `formula:${fieldId}`,
          `condition:${fieldId}`,
          `variable:${fieldId}`,
          `node-formula:${fieldId}`
        ]
      }
    }
  });
  
  console.log(`   Trouvé ${usedAsSourceRef.length} champs qui utilisent ce champ comme sourceRef:`);
  usedAsSourceRef.forEach((node, i) => {
    console.log(`     [${i}] ${node.name}: sourceRef=${node.sourceRef}`);
  });
  
  console.log('\n' + '=' * 80);
  console.log('✅ ANALYSE TERMINÉE');
}

traceField()
  .then(() => {
    console.log('🎯 Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });