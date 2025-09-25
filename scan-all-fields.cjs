const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function scanAllFields() {
  console.log('🔍 SCANNER TOUS LES CHAMPS TBL EXISTANTS');
  console.log('=====================================');
  console.log('Objectif: Identifier tous les champs qui ont des formules mais ne fonctionnent pas comme SmartCalculatedField');
  console.log('');
  
  // 1. Trouver tous les champs qui ont des formules
  console.log('📋 1. RECHERCHE DES CHAMPS AVEC FORMULES');
  console.log('========================================');
  
  const fieldsWithFormulas = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { hasFormula: true },
        { hasCondition: true },
        { TreeBranchLeafNodeFormula: { some: {} } },
        { TreeBranchLeafNodeCondition: { some: {} } }
      ]
    },
    include: {
      TreeBranchLeafNodeVariable: true,
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true
    }
  });
  
  console.log(`✅ Trouvé ${fieldsWithFormulas.length} champs avec formules/conditions`);
  console.log('');
  
  // 2. Analyser chaque champ
  console.log('🔍 2. ANALYSE DÉTAILLÉE DE CHAQUE CHAMP');
  console.log('======================================');
  
  const workingField = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e'; // Le champ qui fonctionne
  const problemFields = [];
  const workingFields = [];
  
  for (let i = 0; i < fieldsWithFormulas.length; i++) {
    const field = fieldsWithFormulas[i];
    const isWorkingField = field.id === workingField;
    
    console.log(`\n📋 CHAMP ${i + 1}/${fieldsWithFormulas.length}:`);
    console.log(`   ID: ${field.id}`);
    console.log(`   Nom: ${field.label || 'undefined'}`);
    console.log(`   Type: ${field.type}`);
    console.log(`   ${isWorkingField ? '⭐ CHAMP DE RÉFÉRENCE (fonctionne)' : ''}`);
    
    // Analyser les problèmes potentiels
    const problems = [];
    const fixes = [];
    
    // Vérifier tbl_capacity
    if (field.tbl_capacity !== 2) {
      problems.push(`❌ tbl_capacity = ${field.tbl_capacity} (devrait être 2)`);
      fixes.push('SET tbl_capacity = 2');
    } else {
      console.log(`   ✅ tbl_capacity = 2`);
    }
    
    // Vérifier TreeBranchLeafNodeVariable
    if (!field.TreeBranchLeafNodeVariable) {
      problems.push(`❌ Aucune TreeBranchLeafNodeVariable`);
      fixes.push('CREATE TreeBranchLeafNodeVariable');
    } else {
      const variable = field.TreeBranchLeafNodeVariable;
      console.log(`   ✅ Variable existe: ${variable.id}`);
      console.log(`   sourceRef: ${variable.sourceRef || 'undefined'}`);
      console.log(`   sourceType: ${variable.sourceType || 'undefined'}`);
      
      // Vérifier le sourceRef
      if (!variable.sourceRef) {
        problems.push(`❌ Variable.sourceRef = null`);
        fixes.push('SET sourceRef vers condition/formule');
      } else if (!variable.sourceRef.startsWith('condition:') && !variable.sourceRef.startsWith('formula:')) {
        problems.push(`❌ sourceRef format invalide: "${variable.sourceRef}"`);
        fixes.push('CORRECT sourceRef format');
      }
    }
    
    // Vérifier TreeBranchLeafNodeCondition
    const conditions = field.TreeBranchLeafNodeCondition || [];
    console.log(`   Conditions: ${conditions.length}`);
    
    // Vérifier TreeBranchLeafNodeFormula
    const formulas = field.TreeBranchLeafNodeFormula || [];
    console.log(`   Formules: ${formulas.length}`);
    
    if (conditions.length === 0 && formulas.length === 0) {
      problems.push(`❌ Aucune condition ni formule`);
      fixes.push('CREATE condition ou formule');
    }
    
    // Classifier le champ
    if (problems.length === 0) {
      workingFields.push(field);
      console.log(`   🎉 PARFAIT - Champ correctement structuré`);
    } else {
      problemFields.push({
        field,
        problems,
        fixes
      });
      console.log(`   🔧 PROBLÈME(S) DÉTECTÉ(S):`);
      problems.forEach(problem => console.log(`      ${problem}`));
    }
  }
  
  // 3. Résumé
  console.log(`\n📊 3. RÉSUMÉ DE L'ANALYSE`);
  console.log('========================');
  console.log(`Total des champs analysés: ${fieldsWithFormulas.length}`);
  console.log(`✅ Champs fonctionnels: ${workingFields.length}`);
  console.log(`🔧 Champs à corriger: ${problemFields.length}`);
  console.log('');
  
  if (workingFields.length > 0) {
    console.log('✅ CHAMPS FONCTIONNELS:');
    workingFields.forEach((field, i) => {
      console.log(`   ${i + 1}. ${field.label || field.id}`);
    });
    console.log('');
  }
  
  if (problemFields.length > 0) {
    console.log('🔧 CHAMPS À CORRIGER:');
    problemFields.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.field.label || item.field.id}`);
      item.problems.forEach(problem => console.log(`      ${problem}`));
    });
    console.log('');
  }
  
  // 4. Plan de correction
  console.log('🛠️ 4. PLAN DE CORRECTION AUTOMATIQUE');
  console.log('===================================');
  console.log('Le script va corriger automatiquement:');
  console.log('1. tbl_capacity = 2 pour tous les champs');
  console.log('2. Créer TreeBranchLeafNodeVariable manquantes');
  console.log('3. Définir sourceRef vers condition existante');
  console.log('4. Utiliser le même pattern que le champ qui fonctionne');
  console.log('');
  
  return {
    total: fieldsWithFormulas.length,
    working: workingFields.length,
    problems: problemFields.length,
    problemFields: problemFields,
    workingFields: workingFields
  };
}

scanAllFields()
  .then((result) => {
    console.log('🎯 SCAN TERMINÉ AVEC SUCCÈS !');
    console.log(`📊 Résultat: ${result.working} fonctionnels, ${result.problems} à corriger`);
    console.log('');
    console.log('💡 Prochaine étape: Exécuter le script de correction automatique');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });