const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createIntelligentDetectionSystem() {
  try {
    console.log('🧠 SYSTÈME DE DÉTECTION INTELLIGENTE DES ÉLÉMENTS\n');
    console.log('='.repeat(60));
    
    // 1. DÉTECTION INTELLIGENTE DES SELECT AVEC OPTIONS
    console.log('\n1️⃣ DÉTECTION INTELLIGENTE DES SELECT:');
    console.log('-'.repeat(50));
    
    const selectAnalysis = await analyzeSelectFieldsIntelligent();
    
    // 2. DÉTECTION DES FORMULES COMPLEXES
    console.log('\n2️⃣ DÉTECTION DES FORMULES COMPLEXES:');
    console.log('-'.repeat(50));
    
    const formulaAnalysis = await analyzeFormulasIntelligent();
    
    // 3. DÉTECTION DES CONDITIONS COMPLEXES
    console.log('\n3️⃣ DÉTECTION DES CONDITIONS COMPLEXES:');
    console.log('-'.repeat(50));
    
    const conditionAnalysis = await analyzeConditionsIntelligent();
    
    // 4. DÉTECTION DES CHAMPS CACHÉS/DÉPENDANTS
    console.log('\n4️⃣ DÉTECTION DES CHAMPS CACHÉS:');
    console.log('-'.repeat(50));
    
    const hiddenFieldsAnalysis = await analyzeHiddenFieldsIntelligent();
    
    // 5. GÉNÉRATION AUTOMATIQUE DES VARIABLES INTELLIGENTES
    console.log('\n5️⃣ GÉNÉRATION AUTOMATIQUE DES VARIABLES:');
    console.log('-'.repeat(50));
    
    const autoGenerationPlan = generateAutoVariableCreationPlan(
      selectAnalysis,
      formulaAnalysis,
      conditionAnalysis,
      hiddenFieldsAnalysis
    );
    
    console.log('📋 PLAN DE GÉNÉRATION AUTOMATIQUE:');
    console.log(`   📊 Total d'éléments détectés: ${autoGenerationPlan.totalElements}`);
    console.log(`   🆕 Nouvelles variables à créer: ${autoGenerationPlan.newVariables.length}`);
    console.log(`   🔗 Relations à établir: ${autoGenerationPlan.relations.length}`);
    console.log(`   ⚙️  Configurations automatiques: ${autoGenerationPlan.configurations.length}`);
    
    return {
      selectAnalysis,
      formulaAnalysis,
      conditionAnalysis,
      hiddenFieldsAnalysis,
      autoGenerationPlan
    };
    
  } catch (error) {
    console.error('❌ Erreur dans la détection intelligente:', error);
    throw error;
  }
}

async function analyzeSelectFieldsIntelligent() {
  console.log('🔽 Analyse intelligente des champs SELECT...');
  
  // Récupérer tous les champs SELECT (type: branch)
  const selectFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      type: 'branch',
      isActive: true,
      isVisible: true
    },
    select: {
      id: true,
      label: true,
      treeId: true,
      select_options: true,
      TreeBranchLeafNodeVariable: {
        select: { id: true, exposedKey: true }
      }
    }
  });
  
  const analysis = {
    totalSelect: selectFields.length,
    selectWithOptions: 0,
    optionsAnalyzed: 0,
    openedFields: [],
    missingVariables: [],
    recommendations: []
  };
  
  console.log(`   📋 Champs SELECT trouvés: ${selectFields.length}`);
  
  for (const selectField of selectFields) {
    console.log(`\n   🔍 Analyse: "${selectField.label}"`);
    
    // Analyser les options SELECT
    if (selectField.select_options && Array.isArray(selectField.select_options)) {
      analysis.selectWithOptions++;
      
      console.log(`      📝 Options trouvées: ${selectField.select_options.length}`);
      
      for (const option of selectField.select_options) {
        analysis.optionsAnalyzed++;
        
        if (typeof option === 'object' && option.value && option.value.match(/^[a-f0-9-]{36}$/)) {
          // L'option pointe vers un node - vérifier si ce node existe
          const targetNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: option.value },
            select: {
              id: true,
              label: true,
              type: true,
              fieldType: true,
              TreeBranchLeafNodeVariable: {
                select: { id: true, exposedKey: true }
              }
            }
          });
          
          if (targetNode) {
            console.log(`         🔓 Option "${option.label}" ouvre champ: "${targetNode.label}"`);
            
            analysis.openedFields.push({
              selectFieldId: selectField.id,
              selectLabel: selectField.label,
              optionLabel: option.label,
              openedFieldId: targetNode.id,
              openedFieldLabel: targetNode.label,
              openedFieldType: targetNode.type,
              hasVariable: !!targetNode.TreeBranchLeafNodeVariable
            });
            
            // Si le champ ouvert n'a pas de variable, le marquer pour création
            if (!targetNode.TreeBranchLeafNodeVariable) {
              analysis.missingVariables.push({
                nodeId: targetNode.id,
                label: targetNode.label,
                type: targetNode.type,
                fieldType: targetNode.fieldType,
                context: `Champ ouvert par SELECT "${selectField.label}" → option "${option.label}"`,
                priority: 'high', // Haute priorité car utilisé dans SELECT
                suggestedExposedKey: generateSmartExposedKey(targetNode.label, 'select_opened'),
                sourceType: 'select_option',
                sourceRef: `select:${selectField.id}:option:${option.value}`
              });
            }
          }
        }
      }
    }
    
    // Si le SELECT lui-même n'a pas de variable
    if (!selectField.TreeBranchLeafNodeVariable) {
      analysis.missingVariables.push({
        nodeId: selectField.id,
        label: selectField.label,
        type: 'branch',
        fieldType: 'select',
        context: `Champ SELECT principal`,
        priority: 'medium',
        suggestedExposedKey: generateSmartExposedKey(selectField.label, 'select'),
        sourceType: 'select_field',
        sourceRef: `select:${selectField.id}`
      });
    }
  }
  
  console.log(`\n   📊 RÉSULTATS SELECT:`);
  console.log(`      - SELECT avec options: ${analysis.selectWithOptions}`);
  console.log(`      - Options analysées: ${analysis.optionsAnalyzed}`);
  console.log(`      - Champs ouverts détectés: ${analysis.openedFields.length}`);
  console.log(`      - Variables manquantes: ${analysis.missingVariables.length}`);
  
  return analysis;
}

async function analyzeFormulasIntelligent() {
  console.log('🧮 Analyse intelligente des formules...');
  
  // Récupérer toutes les formules
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
    include: {
      node: {
        select: {
          id: true,
          label: true,
          type: true,
          TreeBranchLeafNodeVariable: {
            select: { id: true, exposedKey: true }
          }
        }
      }
    }
  });
  
  const analysis = {
    totalFormulas: formulas.length,
    formulasWithVariables: 0,
    formulasWithoutVariables: 0,
    referencedNodes: new Set(),
    missingVariables: [],
    dependencies: []
  };
  
  console.log(`   📋 Formules trouvées: ${formulas.length}`);
  
  for (const formula of formulas) {
    console.log(`\n   🔍 Analyse formule: "${formula.name}" sur "${formula.node.label}"`);
    
    if (formula.node.TreeBranchLeafNodeVariable) {
      analysis.formulasWithVariables++;
      console.log(`      ✅ Node avec variable: ${formula.node.TreeBranchLeafNodeVariable.exposedKey}`);
    } else {
      analysis.formulasWithoutVariables++;
      console.log(`      ❌ Node SANS variable`);
      
      analysis.missingVariables.push({
        nodeId: formula.nodeId,
        label: formula.node.label,
        type: formula.node.type,
        context: `Champ avec formule "${formula.name}"`,
        priority: 'high',
        suggestedExposedKey: generateSmartExposedKey(formula.node.label, 'formula'),
        sourceType: 'formula',
        sourceRef: `formula:${formula.id}`,
        formulaTokens: formula.tokens
      });
    }
    
    // Analyser les tokens de la formule pour détecter les dépendances
    if (formula.tokens && Array.isArray(formula.tokens)) {
      for (const token of formula.tokens) {
        if (typeof token === 'string' && token.startsWith('@value.')) {
          const referencedNodeId = token.replace('@value.', '');
          analysis.referencedNodes.add(referencedNodeId);
          
          // Vérifier si le node référencé a une variable
          const referencedNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: referencedNodeId },
            select: {
              id: true,
              label: true,
              TreeBranchLeafNodeVariable: {
                select: { exposedKey: true }
              }
            }
          });
          
          if (referencedNode && !referencedNode.TreeBranchLeafNodeVariable) {
            console.log(`      🔗 Référence node SANS variable: "${referencedNode.label}"`);
            
            analysis.missingVariables.push({
              nodeId: referencedNodeId,
              label: referencedNode.label,
              type: 'referenced',
              context: `Node référencé par formule "${formula.name}"`,
              priority: 'high',
              suggestedExposedKey: generateSmartExposedKey(referencedNode.label, 'formula_ref'),
              sourceType: 'formula_reference',
              sourceRef: `formula_ref:${formula.id}:${referencedNodeId}`
            });
          }
          
          analysis.dependencies.push({
            formulaId: formula.id,
            formulaName: formula.name,
            referencedNodeId: referencedNodeId,
            referencedNodeLabel: referencedNode?.label || 'Node non trouvé'
          });
        }
      }
    }
  }
  
  console.log(`\n   📊 RÉSULTATS FORMULES:`);
  console.log(`      - Formules avec variables: ${analysis.formulasWithVariables}`);
  console.log(`      - Formules sans variables: ${analysis.formulasWithoutVariables}`);
  console.log(`      - Nodes référencés: ${analysis.referencedNodes.size}`);
  console.log(`      - Variables manquantes: ${analysis.missingVariables.length}`);
  console.log(`      - Dépendances détectées: ${analysis.dependencies.length}`);
  
  return analysis;
}

async function analyzeConditionsIntelligent() {
  console.log('🔀 Analyse intelligente des conditions...');
  
  const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
    include: {
      node: {
        select: {
          id: true,
          label: true,
          type: true,
          TreeBranchLeafNodeVariable: {
            select: { id: true, exposedKey: true }
          }
        }
      }
    }
  });
  
  const analysis = {
    totalConditions: conditions.length,
    conditionsWithVariables: 0,
    conditionsWithoutVariables: 0,
    missingVariables: []
  };
  
  console.log(`   📋 Conditions trouvées: ${conditions.length}`);
  
  for (const condition of conditions) {
    console.log(`\n   🔍 Analyse condition: "${condition.name}" sur "${condition.node.label}"`);
    
    if (condition.node.TreeBranchLeafNodeVariable) {
      analysis.conditionsWithVariables++;
      console.log(`      ✅ Node avec variable: ${condition.node.TreeBranchLeafNodeVariable.exposedKey}`);
    } else {
      analysis.conditionsWithoutVariables++;
      console.log(`      ❌ Node SANS variable`);
      
      analysis.missingVariables.push({
        nodeId: condition.nodeId,
        label: condition.node.label,
        type: condition.node.type,
        context: `Champ avec condition "${condition.name}"`,
        priority: 'high',
        suggestedExposedKey: generateSmartExposedKey(condition.node.label, 'condition'),
        sourceType: 'condition',
        sourceRef: `condition:${condition.id}`,
        conditionSet: condition.conditionSet
      });
    }
  }
  
  console.log(`\n   📊 RÉSULTATS CONDITIONS:`);
  console.log(`      - Conditions avec variables: ${analysis.conditionsWithVariables}`);
  console.log(`      - Conditions sans variables: ${analysis.conditionsWithoutVariables}`);
  console.log(`      - Variables manquantes: ${analysis.missingVariables.length}`);
  
  return analysis;
}

async function analyzeHiddenFieldsIntelligent() {
  console.log('🔍 Analyse intelligente des champs cachés...');
  
  // Détecter les champs qui pourraient être masqués ou dépendants
  const hiddenFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { isVisible: false },
        { isActive: false },
        { type: 'leaf_option_field' }, // Champs d'options souvent cachés
        { type: 'leaf_option' }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      isVisible: true,
      isActive: true,
      parentId: true,
      TreeBranchLeafNodeVariable: {
        select: { id: true, exposedKey: true }
      }
    }
  });
  
  const analysis = {
    totalHiddenFields: hiddenFields.length,
    invisibleFields: 0,
    inactiveFields: 0,
    optionFields: 0,
    missingVariables: []
  };
  
  console.log(`   📋 Champs cachés/dépendants trouvés: ${hiddenFields.length}`);
  
  for (const field of hiddenFields) {
    if (!field.isVisible) analysis.invisibleFields++;
    if (!field.isActive) analysis.inactiveFields++;
    if (field.type.includes('option')) analysis.optionFields++;
    
    if (!field.TreeBranchLeafNodeVariable) {
      analysis.missingVariables.push({
        nodeId: field.id,
        label: field.label,
        type: field.type,
        context: `Champ caché/dépendant (visible: ${field.isVisible}, actif: ${field.isActive})`,
        priority: 'low', // Priorité plus basse pour les champs cachés
        suggestedExposedKey: generateSmartExposedKey(field.label, 'hidden'),
        sourceType: 'hidden_field',
        sourceRef: `hidden:${field.id}`,
        isVisible: field.isVisible,
        isActive: field.isActive
      });
    }
  }
  
  console.log(`\n   📊 RÉSULTATS CHAMPS CACHÉS:`);
  console.log(`      - Champs invisibles: ${analysis.invisibleFields}`);
  console.log(`      - Champs inactifs: ${analysis.inactiveFields}`);
  console.log(`      - Champs d'options: ${analysis.optionFields}`);
  console.log(`      - Variables manquantes: ${analysis.missingVariables.length}`);
  
  return analysis;
}

function generateSmartExposedKey(label, context) {
  // Nettoyer le label
  const cleanLabel = label
    .replace(/[^a-zA-Z0-9\s]/g, '') // Supprimer caractères spéciaux
    .replace(/\s+/g, '_')           // Remplacer espaces par underscore
    .toUpperCase();
  
  // Générer un préfixe basé sur le contexte
  const prefixes = {
    'select': 'SEL',
    'select_opened': 'OPEN',
    'formula': 'CALC',
    'formula_ref': 'REF',
    'condition': 'COND',
    'hidden': 'HIDE'
  };
  
  const prefix = prefixes[context] || 'VAR';
  
  // Tronquer le label si trop long
  const truncatedLabel = cleanLabel.length > 20 ? cleanLabel.substring(0, 20) : cleanLabel;
  
  // Ajouter un suffixe unique basé sur le timestamp
  const suffix = Date.now().toString().slice(-4);
  
  return `${prefix}_${truncatedLabel}_${suffix}`;
}

function generateAutoVariableCreationPlan(selectAnalysis, formulaAnalysis, conditionAnalysis, hiddenFieldsAnalysis) {
  const plan = {
    totalElements: 0,
    newVariables: [],
    relations: [],
    configurations: []
  };
  
  // Collecter toutes les variables manquantes
  const allMissingVariables = [
    ...selectAnalysis.missingVariables,
    ...formulaAnalysis.missingVariables,
    ...conditionAnalysis.missingVariables,
    ...hiddenFieldsAnalysis.missingVariables
  ];
  
  // Déduplication par nodeId
  const uniqueVariables = {};
  for (const variable of allMissingVariables) {
    if (!uniqueVariables[variable.nodeId]) {
      uniqueVariables[variable.nodeId] = variable;
    } else {
      // Garder la variable avec la priorité la plus élevée
      if (getPriorityValue(variable.priority) > getPriorityValue(uniqueVariables[variable.nodeId].priority)) {
        uniqueVariables[variable.nodeId] = variable;
      }
    }
  }
  
  plan.newVariables = Object.values(uniqueVariables);
  plan.totalElements = plan.newVariables.length;
  
  // Générer les relations
  plan.relations = [
    ...formulaAnalysis.dependencies.map(dep => ({
      type: 'formula_dependency',
      source: dep.formulaId,
      target: dep.referencedNodeId,
      description: `Formule "${dep.formulaName}" référence "${dep.referencedNodeLabel}"`
    })),
    ...selectAnalysis.openedFields.map(field => ({
      type: 'select_opens_field',
      source: field.selectFieldId,
      target: field.openedFieldId,
      description: `SELECT "${field.selectLabel}" ouvre "${field.openedFieldLabel}"`
    }))
  ];
  
  // Générer les configurations automatiques
  plan.configurations = plan.newVariables.map(variable => ({
    nodeId: variable.nodeId,
    exposedKey: variable.suggestedExposedKey,
    displayName: variable.label,
    sourceType: variable.sourceType,
    sourceRef: variable.sourceRef,
    priority: variable.priority,
    autoGenerated: true
  }));
  
  return plan;
}

function getPriorityValue(priority) {
  const values = { 'high': 3, 'medium': 2, 'low': 1 };
  return values[priority] || 1;
}

console.log('🚀 LANCEMENT DE LA DÉTECTION INTELLIGENTE...\n');

createIntelligentDetectionSystem()
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });