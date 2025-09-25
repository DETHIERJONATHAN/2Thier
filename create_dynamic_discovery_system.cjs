const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDynamicDiscoverySystem() {
  try {
    console.log('🔍 SYSTÈME DE DÉCOUVERTE DYNAMIQUE COMPLÈTE\n');
    console.log('============================================\n');
    
    // 1. Scanner tous les arbres et formulaires
    console.log('1️⃣ DÉCOUVERTE DES ARBRES ET FORMULAIRES:');
    console.log('-'.repeat(50));
    
    const trees = await prisma.treeBranchLeafTree.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        organizationId: true
      }
    });
    
    console.log(`📂 Arbres trouvés: ${trees.length}`);
    trees.forEach((tree, index) => {
      console.log(`   ${index + 1}. 🌳 "${tree.name}" (${tree.category}) - ${tree.status}`);
    });
    
    // 2. Scanner tous les champs/nodes de tous les arbres
    console.log('\n2️⃣ DÉCOUVERTE DE TOUS LES CHAMPS:');
    console.log('-'.repeat(50));
    
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      select: {
        id: true,
        treeId: true,
        type: true,
        subType: true,
        fieldType: true,
        fieldSubType: true,
        label: true,
        isVisible: true,
        isActive: true,
        hasCondition: true,
        hasFormula: true,
        hasTable: true,
        hasData: true,
        select_options: true,
        TreeBranchLeafNodeVariable: {
          select: {
            id: true,
            exposedKey: true,
            displayName: true
          }
        }
      }
    });
    
    console.log(`🔧 Champs total trouvés: ${allNodes.length}`);
    
    // 3. Analyser les différents types de champs
    console.log('\n3️⃣ ANALYSE DES TYPES DE CHAMPS:');
    console.log('-'.repeat(50));
    
    const fieldTypes = {};
    const fieldSubTypes = {};
    const selectFieldsWithOptions = [];
    const fieldsWithFormulas = [];
    const fieldsWithConditions = [];
    const fieldsWithTables = [];
    const fieldsWithData = [];
    const fieldsWithoutVariables = [];
    
    for (const node of allNodes) {
      // Compter les types
      if (node.type) {
        fieldTypes[node.type] = (fieldTypes[node.type] || 0) + 1;
      }
      if (node.fieldType) {
        fieldSubTypes[node.fieldType] = (fieldSubTypes[node.fieldType] || 0) + 1;
      }
      
      // Identifier les SELECT avec options
      if (node.type === 'branch' || (node.select_options && Array.isArray(node.select_options) && node.select_options.length > 0)) {
        selectFieldsWithOptions.push({
          id: node.id,
          label: node.label,
          type: node.type,
          fieldType: node.fieldType,
          options: node.select_options,
          hasVariable: !!node.TreeBranchLeafNodeVariable
        });
      }
      
      // Identifier les champs avec formules
      if (node.hasFormula) {
        fieldsWithFormulas.push({
          id: node.id,
          label: node.label,
          hasVariable: !!node.TreeBranchLeafNodeVariable
        });
      }
      
      // Identifier les champs avec conditions
      if (node.hasCondition) {
        fieldsWithConditions.push({
          id: node.id,
          label: node.label,
          hasVariable: !!node.TreeBranchLeafNodeVariable
        });
      }
      
      // Identifier les champs avec tables
      if (node.hasTable) {
        fieldsWithTables.push({
          id: node.id,
          label: node.label,
          hasVariable: !!node.TreeBranchLeafNodeVariable
        });
      }
      
      // Identifier les champs avec données
      if (node.hasData) {
        fieldsWithData.push({
          id: node.id,
          label: node.label,
          hasVariable: !!node.TreeBranchLeafNodeVariable
        });
      }
      
      // Identifier les champs SANS variables
      if (!node.TreeBranchLeafNodeVariable && node.isActive && node.isVisible) {
        fieldsWithoutVariables.push({
          id: node.id,
          label: node.label,
          type: node.type,
          fieldType: node.fieldType,
          treeId: node.treeId
        });
      }
    }
    
    console.log('📊 Distribution des types:');
    Object.entries(fieldTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} champs`);
    });
    
    console.log('\n📊 Distribution des sous-types:');
    Object.entries(fieldSubTypes).forEach(([subType, count]) => {
      console.log(`   - ${subType}: ${count} champs`);
    });
    
    console.log(`\n🔽 SELECT avec options: ${selectFieldsWithOptions.length}`);
    selectFieldsWithOptions.slice(0, 5).forEach((field, i) => {
      console.log(`   ${i + 1}. "${field.label}" (${field.type}/${field.fieldType}) - Variable: ${field.hasVariable ? '✅' : '❌'}`);
    });
    
    console.log(`\n🧮 Champs avec formules: ${fieldsWithFormulas.length}`);
    fieldsWithFormulas.slice(0, 5).forEach((field, i) => {
      console.log(`   ${i + 1}. "${field.label}" - Variable: ${field.hasVariable ? '✅' : '❌'}`);
    });
    
    console.log(`\n🔀 Champs avec conditions: ${fieldsWithConditions.length}`);
    fieldsWithConditions.slice(0, 5).forEach((field, i) => {
      console.log(`   ${i + 1}. "${field.label}" - Variable: ${field.hasVariable ? '✅' : '❌'}`);
    });
    
    console.log(`\n📋 Champs avec tables: ${fieldsWithTables.length}`);
    fieldsWithTables.slice(0, 5).forEach((field, i) => {
      console.log(`   ${i + 1}. "${field.label}" - Variable: ${field.hasVariable ? '✅' : '❌'}`);
    });
    
    console.log(`\n📊 Champs avec données: ${fieldsWithData.length}`);
    fieldsWithData.slice(0, 5).forEach((field, i) => {
      console.log(`   ${i + 1}. "${field.label}" - Variable: ${field.hasVariable ? '✅' : '❌'}`);
    });
    
    console.log(`\n❌ Champs SANS variables: ${fieldsWithoutVariables.length}`);
    fieldsWithoutVariables.slice(0, 10).forEach((field, i) => {
      console.log(`   ${i + 1}. "${field.label}" (${field.type}/${field.fieldType})`);
    });
    
    // 4. Découverte des formules et conditions séparées
    console.log('\n4️⃣ DÉCOUVERTE DES FORMULES ET CONDITIONS:');
    console.log('-'.repeat(50));
    
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      select: {
        id: true,
        nodeId: true,
        name: true,
        tokens: true,
        node: {
          select: {
            label: true,
            TreeBranchLeafNodeVariable: {
              select: { exposedKey: true }
            }
          }
        }
      }
    });
    
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      select: {
        id: true,
        nodeId: true,
        name: true,
        conditionSet: true,
        node: {
          select: {
            label: true,
            TreeBranchLeafNodeVariable: {
              select: { exposedKey: true }
            }
          }
        }
      }
    });
    
    console.log(`🧮 Formules totales: ${formulas.length}`);
    console.log(`🔀 Conditions totales: ${conditions.length}`);
    
    // 5. Analyse des champs ouverts par SELECT
    console.log('\n5️⃣ ANALYSE DES CHAMPS OUVERTS PAR SELECT:');
    console.log('-'.repeat(50));
    
    const openedFieldsCount = await analyzeSelectOpenedFields(selectFieldsWithOptions);
    console.log(`🔓 Champs ouverts par SELECT détectés: ${openedFieldsCount}`);
    
    // 6. Génération du rapport de découverte
    console.log('\n6️⃣ RAPPORT DE DÉCOUVERTE DYNAMIQUE:');
    console.log('-'.repeat(50));
    
    const discoveryReport = {
      trees: trees.length,
      totalFields: allNodes.length,
      fieldTypes: Object.keys(fieldTypes).length,
      selectWithOptions: selectFieldsWithOptions.length,
      fieldsWithFormulas: fieldsWithFormulas.length,
      fieldsWithConditions: fieldsWithConditions.length,
      fieldsWithTables: fieldsWithTables.length,
      fieldsWithData: fieldsWithData.length,
      fieldsWithoutVariables: fieldsWithoutVariables.length,
      separateFormulas: formulas.length,
      separateConditions: conditions.length,
      needsVariableCreation: fieldsWithoutVariables.length,
      potentialNewVariables: calculatePotentialNewVariables(fieldsWithoutVariables, selectFieldsWithOptions, fieldsWithFormulas, fieldsWithConditions)
    };
    
    console.log('📊 RÉSUMÉ COMPLET:');
    Object.entries(discoveryReport).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    
    // 7. Recommandations pour l'automatisation
    console.log('\n7️⃣ RECOMMANDATIONS AUTOMATISATION:');
    console.log('-'.repeat(50));
    
    console.log('🎯 ÉLÉMENTS À AUTOMATISER:');
    console.log(`   1. Créer ${fieldsWithoutVariables.length} variables manquantes`);
    console.log(`   2. Analyser ${selectFieldsWithOptions.length} champs SELECT pour détecter les sous-champs`);
    console.log(`   3. Scanner ${fieldsWithFormulas.length} champs avec formules pour dépendances`);
    console.log(`   4. Analyser ${fieldsWithConditions.length} champs avec conditions pour branches`);
    console.log(`   5. Examiner ${fieldsWithTables.length} champs avec tables pour données`);
    
    return {
      discoveryReport,
      fieldsWithoutVariables,
      selectFieldsWithOptions,
      fieldsWithFormulas,
      fieldsWithConditions,
      fieldsWithTables,
      formulas,
      conditions
    };
    
  } catch (error) {
    console.error('❌ Erreur dans la découverte dynamique:', error);
    throw error;
  }
}

async function analyzeSelectOpenedFields(selectFields) {
  let openedFieldsCount = 0;
  
  console.log('🔍 Analyse des champs ouverts par SELECT:');
  
  for (const selectField of selectFields.slice(0, 5)) { // Analyser les 5 premiers pour l'exemple
    if (selectField.options && Array.isArray(selectField.options)) {
      console.log(`\n   📋 SELECT: "${selectField.label}"`);
      console.log(`      Options: ${selectField.options.length}`);
      
      // Pour chaque option, vérifier si elle ouvre un champ
      for (const option of selectField.options) {
        if (typeof option === 'object' && option.value) {
          // Vérifier si l'option.value est un ID de node
          const openedNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: option.value },
            select: {
              id: true,
              label: true,
              type: true,
              TreeBranchLeafNodeVariable: {
                select: { exposedKey: true }
              }
            }
          });
          
          if (openedNode) {
            console.log(`      🔓 Option "${option.label || option.value}" ouvre: "${openedNode.label}"`);
            openedFieldsCount++;
            
            if (!openedNode.TreeBranchLeafNodeVariable) {
              console.log(`         ⚠️  Champ ouvert SANS variable!`);
            }
          }
        }
      }
    }
  }
  
  return openedFieldsCount;
}

function calculatePotentialNewVariables(fieldsWithoutVariables, selectFields, formulaFields, conditionFields) {
  // Estimer le nombre total de nouvelles variables potentielles
  let count = fieldsWithoutVariables.length;
  
  // Ajouter les champs ouverts par SELECT qui n'ont pas de variables
  selectFields.forEach(field => {
    if (!field.hasVariable) count++;
  });
  
  // Ajouter les formules sans variables
  formulaFields.forEach(field => {
    if (!field.hasVariable) count++;
  });
  
  // Ajouter les conditions sans variables
  conditionFields.forEach(field => {
    if (!field.hasVariable) count++;
  });
  
  return count;
}

// FONCTION POUR CRÉER AUTOMATIQUEMENT TOUTES LES VARIABLES MANQUANTES
async function createAllMissingVariables(discoveryData) {
  console.log('\n🚀 CRÉATION AUTOMATIQUE DES VARIABLES MANQUANTES:');
  console.log('='.repeat(60));
  
  let createdCount = 0;
  const errors = [];
  
  for (const field of discoveryData.fieldsWithoutVariables) {
    try {
      // Générer un exposedKey unique
      let exposedKey;
      if (field.type === 'branch' && field.label.includes('Calcul')) {
        exposedKey = `CALC_${field.id.slice(-8).toUpperCase()}`;
      } else if (field.fieldType === 'number') {
        exposedKey = `NUM_${field.id.slice(-8).toUpperCase()}`;
      } else if (field.fieldType === 'text') {
        exposedKey = `TXT_${field.id.slice(-8).toUpperCase()}`;
      } else {
        exposedKey = `VAR_${field.id.slice(-8).toUpperCase()}`;
      }
      
      // Vérifier que l'exposedKey n'existe pas déjà
      const existing = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { exposedKey }
      });
      
      if (existing) {
        exposedKey = `${exposedKey}_${Date.now().toString().slice(-4)}`;
      }
      
      // Créer la variable
      const newVariable = await prisma.treeBranchLeafNodeVariable.create({
        data: {
          nodeId: field.id,
          exposedKey,
          displayName: field.label || `Variable ${exposedKey}`,
          displayFormat: field.fieldType === 'number' ? 'number' : 'text',
          unit: field.fieldType === 'number' ? 'unité' : null,
          precision: field.fieldType === 'number' ? 2 : null,
          visibleToUser: true,
          isReadonly: false,
          sourceType: 'fixed',
          sourceRef: `auto-created:${field.id}`
        }
      });
      
      console.log(`✅ Créée: ${exposedKey} pour "${field.label}"`);
      createdCount++;
      
    } catch (error) {
      console.log(`❌ Erreur pour "${field.label}": ${error.message}`);
      errors.push({ field, error: error.message });
    }
  }
  
  console.log(`\n📊 RÉSULTAT: ${createdCount} variables créées, ${errors.length} erreurs`);
  
  return { createdCount, errors };
}

console.log('🚀 LANCEMENT DE LA DÉCOUVERTE DYNAMIQUE COMPLÈTE...\n');

createDynamicDiscoverySystem()
  .then(async (discoveryData) => {
    console.log('\n' + '='.repeat(60));
    console.log('💡 VOULEZ-VOUS CRÉER AUTOMATIQUEMENT LES VARIABLES MANQUANTES?');
    console.log('='.repeat(60));
    
    // Pour le moment, on affiche juste le rapport
    // await createAllMissingVariables(discoveryData);
    
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });