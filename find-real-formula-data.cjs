#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function findRealFormulaData() {
  console.log('🔍 RECHERCHE VRAIES DONNÉES FORMULES');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Chercher des formules avec des tokens/expressions non vides
    console.log('\n📐 === FORMULES AVEC TOKENS ===');
    const formulasWithTokens = await prisma.treeBranchLeafNodeFormula.findMany({
      where: {
        tokens: { not: '[]' }
      }
    });
    
    console.log(`📊 Formules avec tokens: ${formulasWithTokens.length}`);
    formulasWithTokens.forEach(formula => {
      console.log(`\n🧮 FORMULE: ${formula.name}`);
      console.log(`  ID: ${formula.id}`);
      console.log(`  Tokens: ${formula.tokens}`);
    });
    
    // 2. Chercher dans TreeBranchLeafNodeVariable pour les références
    console.log('\n\n📊 === VARIABLES/RÉFÉRENCES ===');
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      take: 10
    });
    
    console.log(`📊 Variables trouvées: ${variables.length}`);
    variables.forEach(variable => {
      console.log(`\n🔧 VARIABLE: ${variable.name || variable.id}`);
      console.log(`  ID: ${variable.id}`);
      console.log(`  Type: ${variable.type}`);
      console.log(`  Value: ${variable.value}`);
    });
    
    // 3. Chercher les noms des champs "Calcul du prix" spécifiquement
    console.log('\n\n🎯 === RECHERCHE "CALCUL DU PRIX" ===');
    const calculPrixNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        name: { contains: 'Calcul', mode: 'insensitive' }
      }
    });
    
    console.log(`📊 Nodes avec "Calcul": ${calculPrixNodes.length}`);
    calculPrixNodes.forEach(node => {
      console.log(`\n💰 NODE: ${node.name}`);
      console.log(`  ID: ${node.id}`);
      console.log(`  Type: ${node.type}`);
    });
    
    // 4. Chercher TOUS les types de données dans TreeBranchLeaf
    console.log('\n\n🔍 === EXPLORATION TABLES TBL ===');
    
    try {
      const conditionsCount = await prisma.treeBranchLeafNodeCondition.count();
      console.log(`📊 Conditions: ${conditionsCount}`);
      
      const formulasCount = await prisma.treeBranchLeafNodeFormula.count();
      console.log(`📊 Formules: ${formulasCount}`);
      
      const tablesCount = await prisma.treeBranchLeafNodeTable.count();
      console.log(`📊 Tables: ${tablesCount}`);
      
      const variablesCount = await prisma.treeBranchLeafNodeVariable.count();
      console.log(`📊 Variables: ${variablesCount}`);
      
      const nodesCount = await prisma.treeBranchLeafNode.count();
      console.log(`📊 Nodes: ${nodesCount}`);
      
    } catch (error) {
      console.log('⚠️ Certaines tables TBL peuvent ne pas exister encore');
    }
    
  } catch (error) {
    console.error('❌ Erreur recherche:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findRealFormulaData();