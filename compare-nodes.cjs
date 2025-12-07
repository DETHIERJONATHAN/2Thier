#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function compareNodes() {
  const prisma = new PrismaClient();
  
  console.log('🔍 COMPARAISON: Orientation-Inclinaison vs Rampant Toiture\n');
  
  try {
    // 1. Chercher les nœuds par label
    const orientationNode = await prisma.treeBranchLeafNode.findFirst({
      where: { 
        label: { contains: 'Orientation-Inclinaison', mode: 'insensitive' }
      },
      select: {
        id: true,
        label: true,
        type: true,
        hasTable: true,
        hasFormula: true,
        hasCondition: true,
        linkedTableIds: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedVariableIds: true,
        table_activeId: true,
        formula_activeId: true,
        condition_activeId: true,
        metadata: true
      }
    });
    
    const rampantNode = await prisma.treeBranchLeafNode.findFirst({
      where: { 
        label: { contains: 'Rampant', mode: 'insensitive' }
      },
      select: {
        id: true,
        label: true,
        type: true,
        hasTable: true,
        hasFormula: true,
        hasCondition: true,
        linkedTableIds: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedVariableIds: true,
        table_activeId: true,
        formula_activeId: true,
        condition_activeId: true,
        metadata: true
      }
    });
    
    console.log('📊 RÉSULTATS TROUVÉS:\n');
    
    if (orientationNode) {
      console.log('✅ Orientation-Inclinaison trouvé:');
      console.log('   ID:', orientationNode.id);
      console.log('   Label:', orientationNode.label);
      console.log('   Type:', orientationNode.type);
      console.log('   hasTable:', orientationNode.hasTable);
      console.log('   hasFormula:', orientationNode.hasFormula);
      console.log('   hasCondition:', orientationNode.hasCondition);
      console.log('   linkedTableIds:', orientationNode.linkedTableIds?.length || 0, 'items');
      console.log('   linkedFormulaIds:', orientationNode.linkedFormulaIds?.length || 0, 'items');
      console.log('   linkedConditionIds:', orientationNode.linkedConditionIds?.length || 0, 'items');
      console.log('   linkedVariableIds:', orientationNode.linkedVariableIds?.length || 0, 'items');
      console.log('   table_activeId:', orientationNode.table_activeId || 'null');
      console.log('   formula_activeId:', orientationNode.formula_activeId || 'null');
      console.log('   condition_activeId:', orientationNode.condition_activeId || 'null');
    } else {
      console.log('❌ Orientation-Inclinaison NON trouvé');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    if (rampantNode) {
      console.log('✅ Rampant trouvé:');
      console.log('   ID:', rampantNode.id);
      console.log('   Label:', rampantNode.label);
      console.log('   Type:', rampantNode.type);
      console.log('   hasTable:', rampantNode.hasTable);
      console.log('   hasFormula:', rampantNode.hasFormula);
      console.log('   hasCondition:', rampantNode.hasCondition);
      console.log('   linkedTableIds:', rampantNode.linkedTableIds?.length || 0, 'items');
      console.log('   linkedFormulaIds:', rampantNode.linkedFormulaIds?.length || 0, 'items');
      console.log('   linkedConditionIds:', rampantNode.linkedConditionIds?.length || 0, 'items');
      console.log('   linkedVariableIds:', rampantNode.linkedVariableIds?.length || 0, 'items');
      console.log('   table_activeId:', rampantNode.table_activeId || 'null');
      console.log('   formula_activeId:', rampantNode.formula_activeId || 'null');
      console.log('   condition_activeId:', rampantNode.condition_activeId || 'null');
    } else {
      console.log('❌ Rampant NON trouvé');
    }
    
    // 2. COMPARAISON DÉTAILLÉE
    if (orientationNode && rampantNode) {
      console.log('\n🔍 ANALYSE COMPARATIVE:\n');
      
      const differences = [];
      
      if (orientationNode.hasTable !== rampantNode.hasTable) {
        differences.push(`hasTable: Orientation(${orientationNode.hasTable}) vs Rampant(${rampantNode.hasTable})`);
      }
      
      if (orientationNode.hasFormula !== rampantNode.hasFormula) {
        differences.push(`hasFormula: Orientation(${orientationNode.hasFormula}) vs Rampant(${rampantNode.hasFormula})`);
      }
      
      if (orientationNode.hasCondition !== rampantNode.hasCondition) {
        differences.push(`hasCondition: Orientation(${orientationNode.hasCondition}) vs Rampant(${rampantNode.hasCondition})`);
      }
      
      const oriLinkedTables = orientationNode.linkedTableIds?.length || 0;
      const ramLinkedTables = rampantNode.linkedTableIds?.length || 0;
      if (oriLinkedTables !== ramLinkedTables) {
        differences.push(`linkedTableIds: Orientation(${oriLinkedTables}) vs Rampant(${ramLinkedTables}) ⚠️`);
      }
      
      const oriLinkedFormulas = orientationNode.linkedFormulaIds?.length || 0;
      const ramLinkedFormulas = rampantNode.linkedFormulaIds?.length || 0;
      if (oriLinkedFormulas !== ramLinkedFormulas) {
        differences.push(`linkedFormulaIds: Orientation(${oriLinkedFormulas}) vs Rampant(${ramLinkedFormulas})`);
      }
      
      const oriLinkedConditions = orientationNode.linkedConditionIds?.length || 0;
      const ramLinkedConditions = rampantNode.linkedConditionIds?.length || 0;
      if (oriLinkedConditions !== ramLinkedConditions) {
        differences.push(`linkedConditionIds: Orientation(${oriLinkedConditions}) vs Rampant(${ramLinkedConditions})`);
      }
      
      if (differences.length > 0) {
        console.log('🚨 DIFFÉRENCES TROUVÉES:');
        differences.forEach(diff => console.log(`   - ${diff}`));
      } else {
        console.log('✅ Aucune différence structurelle majeure');
      }
      
      // 3. VÉRIFIER LES TABLES ASSOCIÉES
      console.log('\n📋 TABLES ASSOCIÉES:\n');
      
      if (orientationNode.table_activeId) {
        const oriTable = await prisma.treeBranchLeafNodeTable.findUnique({
          where: { id: orientationNode.table_activeId },
          select: { id: true, name: true, nodeId: true }
        });
        console.log('✅ Orientation-Inclinaison table:', oriTable?.name || 'Table introuvable');
      }
      
      if (rampantNode.table_activeId) {
        const ramTable = await prisma.treeBranchLeafNodeTable.findUnique({
          where: { id: rampantNode.table_activeId },
          select: { id: true, name: true, nodeId: true }
        });
        console.log('✅ Rampant table:', ramTable?.name || 'Table introuvable');
      } else {
        console.log('❌ Rampant: AUCUNE table_activeId - PROBLÈME POTENTIEL !');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareNodes().catch(console.error);