const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 ANALYSE DÉTAILLÉE DES CHAMPS "CALCUL DU PRIX"\n');
    
    const nodeIds = [
      '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e', // Prix Kw/h test
      'd6212e5e-3fe9-4cce-b380-e6745524d011', // Calcul du prix Kw/h  
      'node_1757366229542_r791f4qk7'          // Calcul du prix Kw/h ou Prix Kw/h
    ];
    
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      console.log(`${i + 1}️⃣ ANALYSE NODE: ${nodeId}`);
      
      // Node principal
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId }
      });
      
      if (node) {
        console.log(`   📋 CHAMP: ${node.label}`);
        console.log(`   Type: ${node.fieldType || 'null'}`);
        console.log(`   SubType: ${node.fieldSubType || 'null'}`);
        console.log(`   Description: ${node.description || 'null'}`);
        console.log(`   DefaultValue: ${node.defaultValue || 'null'}`);
        console.log(`   Value: ${node.value || 'null'}`);
        console.log(`   Order: ${node.order}`);
        console.log(`   IsRequired: ${node.isRequired}`);
        console.log(`   IsVisible: ${node.isVisible}`);
        console.log(`   IsActive: ${node.isActive}`);
        
        // Vérifier les configs spécifiques
        if (node.hasCondition) {
          console.log(`   🔀 A une CONDITION:`);
          console.log(`      Mode: ${node.condition_mode}`);
          console.log(`      Branches: ${JSON.stringify(node.condition_branches, null, 2)}`);
          console.log(`      Instances: ${JSON.stringify(node.condition_instances, null, 2)}`);
        }
        
        if (node.hasFormula) {
          console.log(`   🧮 A une FORMULE:`);
          console.log(`      Name: ${node.formula_name}`);
          console.log(`      Tokens: ${JSON.stringify(node.formula_tokens, null, 2)}`);
          console.log(`      Instances: ${JSON.stringify(node.formula_instances, null, 2)}`);
        }
        
        if (node.hasData) {
          console.log(`   📊 A des DONNÉES:`);
          console.log(`      ExposedKey: ${node.data_exposedKey}`);
          console.log(`      Unit: ${node.data_unit}`);
          console.log(`      Precision: ${node.data_precision}`);
          console.log(`      VisibleToUser: ${node.data_visibleToUser}`);
          console.log(`      Instances: ${JSON.stringify(node.data_instances, null, 2)}`);
        }
        
        if (node.fieldType === 'select' || node.select_options) {
          console.log(`   📋 OPTIONS SELECT:`);
          console.log(`      Options: ${JSON.stringify(node.select_options, null, 2)}`);
          console.log(`      DefaultValue: ${node.select_defaultValue}`);
          console.log(`      Multiple: ${node.select_multiple}`);
        }
        
        if (node.fieldType === 'number' || node.number_min !== null) {
          console.log(`   🔢 CONFIG NUMBER:`);
          console.log(`      Min: ${node.number_min}`);
          console.log(`      Max: ${node.number_max}`);
          console.log(`      Step: ${node.number_step}`);
          console.log(`      Unit: ${node.number_unit}`);
          console.log(`      DefaultValue: ${node.number_defaultValue}`);
        }
        
        // Chercher les données de soumission pour ce node
        console.log(`   📊 DONNÉES DE SOUMISSION:`);
        const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
          where: { nodeId: nodeId },
          select: {
            id: true,
            submissionId: true,
            value: true,
            isVariable: true,
            sourceRef: true
          },
          take: 5
        });
        
        submissionData.forEach((data, j) => {
          console.log(`      ${j + 1}. SubmissionId: ${data.submissionId}`);
          console.log(`         Value: ${data.value}`);
          console.log(`         IsVariable: ${data.isVariable}`);
          console.log(`         SourceRef: ${data.sourceRef}`);
        });
        
        // Chercher les conditions liées
        console.log(`   🔀 CONDITIONS LIÉES:`);
        const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
          where: { nodeId: nodeId }
        });
        
        conditions.forEach((condition, j) => {
          console.log(`      ${j + 1}. ${condition.name} (${condition.type})`);
          console.log(`         ID: ${condition.id}`);
          console.log(`         ConditionSet: ${JSON.stringify(condition.conditionSet, null, 2)}`);
        });
        
        // Chercher les formules liées
        console.log(`   🧮 FORMULES LIÉES:`);
        const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
          where: { nodeId: nodeId }
        });
        
        formulas.forEach((formula, j) => {
          console.log(`      ${j + 1}. ${formula.label || 'Sans nom'} (${formula.id})`);
          console.log(`         Description: ${formula.description}`);
          console.log(`         Tokens: ${JSON.stringify(formula.tokens, null, 2)}`);
        });
        
      } else {
        console.log(`   ❌ Node non trouvé`);
      }
      
      console.log('');
    }
    
    console.log('🎯 VOICI LA STRUCTURE RÉELLE DE CES CHAMPS !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();