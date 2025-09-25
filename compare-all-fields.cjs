const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareAllFields() {
  console.log('🔍 COMPARAISON STRUCTURE CHAMPS - Modèle vs Problématiques');
  console.log('============================================================');
  
  // IDs des 4 champs concernés
  const workingField = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e'; // Le modèle qui fonctionne
  const problematicFields = [
    'cb42c9a9-c6b4-49bb-bd55-74d763123bfb',
    'ff05cc48-27ec-4d94-8975-30a0f9c1c275', 
    '7097ff9b-974a-4fb3-80d8-49634a634efc'
  ];
  
  async function analyzeField(fieldId, label) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ${label} - ${fieldId}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: fieldId },
        include: {
          TreeBranchLeafNodeVariable: true,
          TreeBranchLeafNodeFormula: true,
          TreeBranchLeafNodeCondition: true
        }
      });
      
      if (!node) {
        console.log('❌ Node non trouvé !');
        return;
      }
      
      console.log('📊 NODE:');
      console.log(`  - label: "${node.label}"`);
      console.log(`  - type: ${node.type}`);
      console.log(`  - tbl_capacity: ${node.tbl_capacity}`);
      console.log(`  - tbl_type: ${node.tbl_type}`);
      console.log(`  - tbl_code: ${node.tbl_code}`);
      
      // Variable
      console.log('\n📝 VARIABLE:');
      if (node.TreeBranchLeafNodeVariable) {
        const variable = node.TreeBranchLeafNodeVariable;
        console.log(`  ✅ Existe - ID: ${variable.id}`);
        console.log(`  - exposedKey: "${variable.exposedKey}"`);
        console.log(`  - displayName: "${variable.displayName}"`);
        console.log(`  - sourceRef: "${variable.sourceRef}"`);
        console.log(`  - sourceType: "${variable.sourceType}"`);
      } else {
        console.log('  ❌ PAS DE VARIABLE');
      }
      
      // Formules
      console.log('\n🧮 FORMULES:');
      if (node.TreeBranchLeafNodeFormula && node.TreeBranchLeafNodeFormula.length > 0) {
        console.log(`  ✅ ${node.TreeBranchLeafNodeFormula.length} formule(s)`);
        for (const formula of node.TreeBranchLeafNodeFormula) {
          console.log(`    - ID: ${formula.id}`);
          console.log(`    - name: "${formula.name}"`);
          console.log(`    - tokens: ${JSON.stringify(formula.tokens)}`);
        }
      } else {
        console.log('  ❌ PAS DE FORMULES');
      }
      
      // Conditions
      console.log('\n🔀 CONDITIONS:');
      if (node.TreeBranchLeafNodeCondition && node.TreeBranchLeafNodeCondition.length > 0) {
        console.log(`  ✅ ${node.TreeBranchLeafNodeCondition.length} condition(s)`);
        for (const condition of node.TreeBranchLeafNodeCondition) {
          console.log(`    - ID: ${condition.id}`);
          console.log(`    - name: "${condition.name}"`);
          console.log(`    - conditionSet keys: ${Object.keys(condition.conditionSet || {})}`);
        }
      } else {
        console.log('  ❌ PAS DE CONDITIONS');
      }
      
      // POINTS CRITIQUES pour SmartCalculatedField
      console.log('\n🎯 POINTS CRITIQUES:');
      console.log(`  - Variable.sourceRef: ${node.TreeBranchLeafNodeVariable?.sourceRef || 'MANQUANT'}`);
      console.log(`  - tbl_capacity: ${node.tbl_capacity || 'MANQUANT'}`);
      console.log(`  - Formules count: ${node.TreeBranchLeafNodeFormula?.length || 0}`);
      console.log(`  - Conditions count: ${node.TreeBranchLeafNodeCondition?.length || 0}`);
      
      // Détection de la capacité selon la logique SmartCalculatedField
      let detectedCapacity = 'unknown';
      if (node.TreeBranchLeafNodeVariable?.sourceRef) {
        const sourceRef = node.TreeBranchLeafNodeVariable.sourceRef;
        if (sourceRef.startsWith('formula:')) {
          detectedCapacity = 'formula';
        } else if (sourceRef.startsWith('condition:')) {
          detectedCapacity = 'condition';
        }
      }
      console.log(`  - Capacité détectée: ${detectedCapacity}`);
      
    } catch (error) {
      console.error('❌ Erreur:', error.message);
    }
  }
  
  // Analyser le modèle qui fonctionne
  await analyzeField(workingField, '🟢 MODÈLE QUI FONCTIONNE');
  
  // Analyser les champs problématiques
  for (let i = 0; i < problematicFields.length; i++) {
    await analyzeField(problematicFields[i], `🔴 CHAMP PROBLÉMATIQUE ${i + 1}`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 RÉSUMÉ DES DIFFÉRENCES');
  console.log(`${'='.repeat(60)}`);
  console.log('Le champ qui fonctionne a :');
  console.log('✅ Variable avec sourceRef: "condition:ff05cc48-27ec-4d94-8975-30a0f9c1c275"');
  console.log('✅ tbl_capacity: 2');
  console.log('✅ tbl_type: 6');
  console.log('✅ Condition ET Formule associées');
  console.log('');
  console.log('Les champs problématiques ont probablement :');
  console.log('❓ sourceRef différent ou manquant');
  console.log('❓ Structure Formule/Condition différente');
  console.log('❓ Mauvais tbl_capacity/tbl_type');
  
  await prisma.$disconnect();
}

compareAllFields().catch(console.error);