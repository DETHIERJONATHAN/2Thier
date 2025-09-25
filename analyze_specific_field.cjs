const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 ANALYSE COMPLÈTE DU CHAMP 02496ef8-873d-4f14-a8dc-ee2200bf591b\n');
    
    const nodeId = '02496ef8-873d-4f14-a8dc-ee2200bf591b';
    
    // 1. Chercher le node principal
    console.log('1️⃣ NODE PRINCIPAL:');
    const mainNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });
    
    if (mainNode) {
      console.log('   ✅ Node trouvé:');
      console.log(`   ID: ${mainNode.id}`);
      console.log(`   Label: ${mainNode.label}`);
      console.log(`   Type: ${mainNode.type}`);
      console.log(`   DefaultValue: ${mainNode.defaultValue}`);
      console.log(`   Properties: ${JSON.stringify(mainNode.properties, null, 2)}`);
      console.log(`   Config: ${JSON.stringify(mainNode.config, null, 2)}`);
      console.log(`   ValidationRules: ${JSON.stringify(mainNode.validationRules, null, 2)}`);
    } else {
      console.log('   ❌ Node non trouvé');
      return;
    }
    
    // 2. Chercher les données de soumission pour ce node
    console.log('\n2️⃣ DONNÉES DE SOUMISSION:');
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { nodeId: nodeId },
      select: {
        id: true,
        submissionId: true,
        value: true,
        isVariable: true,
        sourceRef: true,
        operationDetail: true,
        operationResult: true
      }
    });
    
    console.log(`   📊 ${submissionData.length} entrées trouvées:`);
    submissionData.forEach((data, i) => {
      console.log(`   ${i + 1}. SubmissionId: ${data.submissionId}`);
      console.log(`      Value: ${data.value}`);
      console.log(`      IsVariable: ${data.isVariable}`);
      console.log(`      SourceRef: ${data.sourceRef}`);
      if (data.operationDetail) {
        console.log(`      OperationDetail: ${JSON.stringify(data.operationDetail)}`);
      }
      if (data.operationResult) {
        console.log(`      OperationResult: ${JSON.stringify(data.operationResult)}`);
      }
      console.log('');
    });
    
    // 3. Chercher les formules liées à ce node
    console.log('3️⃣ FORMULES LIÉES:');
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: nodeId }
    });
    
    console.log(`   🧮 ${formulas.length} formules trouvées:`);
    formulas.forEach((formula, i) => {
      console.log(`   ${i + 1}. ID: ${formula.id}`);
      console.log(`      Label: ${formula.label}`);
      console.log(`      Description: ${formula.description}`);
      console.log(`      Tokens: ${JSON.stringify(formula.tokens, null, 2)}`);
      console.log('');
    });
    
    // 4. Chercher les conditions liées à ce node
    console.log('4️⃣ CONDITIONS LIÉES:');
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: nodeId }
    });
    
    console.log(`   🔀 ${conditions.length} conditions trouvées:`);
    conditions.forEach((condition, i) => {
      console.log(`   ${i + 1}. ID: ${condition.id}`);
      console.log(`      Name: ${condition.name}`);
      console.log(`      Type: ${condition.type}`);
      console.log(`      ConditionSet: ${JSON.stringify(condition.conditionSet, null, 2)}`);
      console.log('');
    });
    
    // 5. Chercher les nodes enfants (sous-champs)
    console.log('5️⃣ NODES ENFANTS/SOUS-CHAMPS:');
    const childNodes = await prisma.treeBranchLeafNode.findMany({
      where: { 
        parentId: nodeId 
      }
    });
    
    console.log(`   👶 ${childNodes.length} nodes enfants trouvés:`);
    childNodes.forEach((child, i) => {
      console.log(`   ${i + 1}. ID: ${child.id}`);
      console.log(`      Label: ${child.label}`);
      console.log(`      Type: ${child.type}`);
      console.log(`      DefaultValue: ${child.defaultValue}`);
      console.log(`      Properties: ${JSON.stringify(child.properties, null, 2)}`);
      console.log('');
    });
    
    // 6. Chercher dans la structure de l'arbre
    console.log('6️⃣ STRUCTURE ARBRE:');
    const treeStructure = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { id: nodeId },
          { parentId: nodeId }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true,
        order: true,
        properties: true
      }
    });
    
    console.log(`   🌳 Structure trouvée:`);
    treeStructure.forEach((node, i) => {
      const isParent = node.id === nodeId;
      const prefix = isParent ? '📍 PARENT' : '   └── ENFANT';
      console.log(`   ${prefix}: ${node.label} (${node.type})`);
      console.log(`      ID: ${node.id}`);
      console.log(`      Order: ${node.order}`);
      if (node.properties) {
        console.log(`      Properties: ${JSON.stringify(node.properties, null, 2)}`);
      }
      console.log('');
    });
    
    console.log('🎯 ANALYSE TERMINÉE - Voici ce que contient réellement ce champ !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();