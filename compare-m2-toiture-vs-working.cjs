/**
 * 🔍 COMPARAISON DIRECTE: Ancien champ qui fonctionne VS Nouveau "M² de la toiture"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareFields() {
  try {
    console.log('\n🔍 ===== COMPARAISON ANCIEN vs NOUVEAU =====\n');

    // 1. LE CHAMP QUI FONCTIONNE (ancien)
    const WORKING_FIELD_ID = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
    const workingField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: WORKING_FIELD_ID },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true
      }
    });

    console.log('✅ ===== ANCIEN CHAMP QUI FONCTIONNE =====');
    console.log(`Label: "${workingField.label}"`);
    console.log(`ID: ${workingField.id}`);
    console.log(`Créé le: ${workingField.createdAt}`);
    console.log(`\n📊 STRUCTURE:`);
    console.log(`   type: "${workingField.type}"`);
    console.log(`   tbl_capacity: ${workingField.tbl_capacity}`);
    console.log(`   tbl_code: "${workingField.tbl_code}"`);
    console.log(`   hasData: ${workingField.hasData}`);
    console.log(`   hasFormula: ${workingField.hasFormula}`);
    console.log(`   hasCondition: ${workingField.hasCondition}`);
    
    console.log(`\n🔧 CONFIGURATION:`);
    console.log(`   fieldConfig:`, JSON.stringify(workingField.fieldConfig, null, 2));
    console.log(`   capabilities:`, JSON.stringify(workingField.capabilities, null, 2));
    console.log(`   properties:`, JSON.stringify(workingField.properties, null, 2));
    
    if (workingField.TreeBranchLeafNodeVariable) {
      console.log(`\n📍 VARIABLE:`);
      console.log(`   sourceRef: "${workingField.TreeBranchLeafNodeVariable.sourceRef}"`);
      console.log(`   sourceType: "${workingField.TreeBranchLeafNodeVariable.sourceType}"`);
      console.log(`   exposedKey: "${workingField.TreeBranchLeafNodeVariable.exposedKey}"`);
    } else {
      console.log(`\n⚠️ PAS DE VARIABLE`);
    }

    if (workingField.TreeBranchLeafNodeFormula && workingField.TreeBranchLeafNodeFormula.length > 0) {
      console.log(`\n📐 FORMULES (${workingField.TreeBranchLeafNodeFormula.length}):`);
      workingField.TreeBranchLeafNodeFormula.forEach((formula, i) => {
        console.log(`   ${i + 1}. ${formula.label || formula.name}`);
        console.log(`      Tokens:`, JSON.stringify(formula.tokens, null, 2));
      });
    }

    // 2. LE NOUVEAU CHAMP "M² de la toiture"
    const NEW_FIELD_ID = 'bda4aa6c-033e-46f8-ad39-5ea4e2a1cb77';
    const newField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: NEW_FIELD_ID },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true
      }
    });

    console.log('\n\n❌ ===== NOUVEAU CHAMP "M² de la toiture" =====');
    console.log(`Label: "${newField.label}"`);
    console.log(`ID: ${newField.id}`);
    console.log(`Créé le: ${newField.createdAt}`);
    console.log(`\n📊 STRUCTURE:`);
    console.log(`   type: "${newField.type}"`);
    console.log(`   tbl_capacity: ${newField.tbl_capacity}`);
    console.log(`   tbl_code: "${newField.tbl_code}"`);
    console.log(`   hasData: ${newField.hasData}`);
    console.log(`   hasFormula: ${newField.hasFormula}`);
    console.log(`   hasCondition: ${newField.hasCondition}`);
    
    console.log(`\n🔧 CONFIGURATION:`);
    console.log(`   fieldConfig:`, JSON.stringify(newField.fieldConfig, null, 2));
    console.log(`   capabilities:`, JSON.stringify(newField.capabilities, null, 2));
    console.log(`   properties:`, JSON.stringify(newField.properties, null, 2));
    
    if (newField.TreeBranchLeafNodeVariable) {
      console.log(`\n📍 VARIABLE:`);
      console.log(`   sourceRef: "${newField.TreeBranchLeafNodeVariable.sourceRef}"`);
      console.log(`   sourceType: "${newField.TreeBranchLeafNodeVariable.sourceType}"`);
      console.log(`   exposedKey: "${newField.TreeBranchLeafNodeVariable.exposedKey}"`);
    } else {
      console.log(`\n⚠️ PAS DE VARIABLE`);
    }

    if (newField.TreeBranchLeafNodeFormula && newField.TreeBranchLeafNodeFormula.length > 0) {
      console.log(`\n📐 FORMULES (${newField.TreeBranchLeafNodeFormula.length}):`);
      newField.TreeBranchLeafNodeFormula.forEach((formula, i) => {
        console.log(`   ${i + 1}. ${formula.label || formula.name}`);
        console.log(`      Tokens:`, JSON.stringify(formula.tokens, null, 2));
      });
    }

    // 3. ANALYSE DES DIFFÉRENCES
    console.log('\n\n🔎 ===== ANALYSE DES DIFFÉRENCES =====\n');

    const differences = [];

    // Type
    if (workingField.type !== newField.type) {
      differences.push(`⚠️ TYPE: ANCIEN="${workingField.type}" | NOUVEAU="${newField.type}"`);
    } else {
      console.log(`✅ type: identique ("${workingField.type}")`);
    }

    // tbl_capacity
    if (workingField.tbl_capacity !== newField.tbl_capacity) {
      differences.push(`⚠️ TBL_CAPACITY: ANCIEN=${workingField.tbl_capacity} | NOUVEAU=${newField.tbl_capacity}`);
    } else {
      console.log(`✅ tbl_capacity: identique (${workingField.tbl_capacity})`);
    }

    // tbl_code
    if (workingField.tbl_code !== newField.tbl_code) {
      differences.push(`⚠️ TBL_CODE: ANCIEN="${workingField.tbl_code}" | NOUVEAU="${newField.tbl_code}"`);
    } else {
      console.log(`✅ tbl_code: identique ("${workingField.tbl_code}")`);
    }

    // Variable
    const hasWorkingVar = !!workingField.TreeBranchLeafNodeVariable;
    const hasNewVar = !!newField.TreeBranchLeafNodeVariable;
    
    if (hasWorkingVar && !hasNewVar) {
      differences.push(`⚠️ VARIABLE: ANCIEN a une variable, NOUVEAU n'en a PAS`);
    } else if (!hasWorkingVar && hasNewVar) {
      differences.push(`⚠️ VARIABLE: ANCIEN n'a pas de variable, NOUVEAU en a une`);
    } else if (hasWorkingVar && hasNewVar) {
      console.log(`✅ Variable: les deux en ont une`);
      
      if (workingField.TreeBranchLeafNodeVariable.sourceType !== newField.TreeBranchLeafNodeVariable.sourceType) {
        differences.push(`⚠️ VARIABLE sourceType: ANCIEN="${workingField.TreeBranchLeafNodeVariable.sourceType}" | NOUVEAU="${newField.TreeBranchLeafNodeVariable.sourceType}"`);
      } else {
        console.log(`✅ sourceType: identique ("${workingField.TreeBranchLeafNodeVariable.sourceType}")`);
      }
    }

    // fieldConfig
    const oldFieldConfigKeys = workingField.fieldConfig ? Object.keys(workingField.fieldConfig) : [];
    const newFieldConfigKeys = newField.fieldConfig ? Object.keys(newField.fieldConfig) : [];
    
    if (JSON.stringify(oldFieldConfigKeys.sort()) !== JSON.stringify(newFieldConfigKeys.sort())) {
      differences.push(`⚠️ FIELDCONFIG: Clés différentes`);
      console.log(`   ANCIEN a: ${oldFieldConfigKeys.join(', ')}`);
      console.log(`   NOUVEAU a: ${newFieldConfigKeys.join(', ')}`);
    } else {
      console.log(`✅ fieldConfig: mêmes clés`);
    }

    // capabilities
    const oldCapKeys = workingField.capabilities ? Object.keys(workingField.capabilities) : [];
    const newCapKeys = newField.capabilities ? Object.keys(newField.capabilities) : [];
    
    if (JSON.stringify(oldCapKeys.sort()) !== JSON.stringify(newCapKeys.sort())) {
      differences.push(`⚠️ CAPABILITIES: Clés différentes`);
      console.log(`   ANCIEN a: ${oldCapKeys.join(', ')}`);
      console.log(`   NOUVEAU a: ${newCapKeys.join(', ')}`);
    } else {
      console.log(`✅ capabilities: mêmes clés`);
    }

    // Résumé
    console.log('\n\n📋 ===== RÉSUMÉ DES DIFFÉRENCES =====\n');
    
    if (differences.length === 0) {
      console.log('✨ AUCUNE DIFFÉRENCE MAJEURE TROUVÉE !');
      console.log('Le problème est probablement dans le rendu frontend, pas dans la config DB.');
    } else {
      console.log(`🚨 ${differences.length} DIFFÉRENCE(S) TROUVÉE(S):\n`);
      differences.forEach((diff, i) => {
        console.log(`${i + 1}. ${diff}`);
      });
      
      console.log('\n💡 SOLUTION:');
      console.log('Ces différences expliquent pourquoi le nouveau champ ne fonctionne pas.');
      console.log('Il faut copier exactement la configuration du champ qui fonctionne.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareFields();
