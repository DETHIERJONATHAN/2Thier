#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function repairAllLinkedIds() {
  const prisma = new PrismaClient();
  
  console.log('🛠️ RÉPARATION GLOBALE DES LINKEDIDS MANQUANTS\n');
  
  try {
    // 1. Trouver tous les nœuds qui ont des capacités actives
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { hasFormula: true },
          { hasCondition: true },
          { hasTable: true }
        ]
      },
      select: {
        id: true,
        label: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        formula_activeId: true,
        condition_activeId: true,
        table_activeId: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedTableIds: true,
        linkedVariableIds: true,
        data_activeId: true,
        data_exposedKey: true
      }
    });
    
    // Filtrer les nœuds problématiques
    const problematicNodes = allNodes.filter(node => {
      const hasFormulaIssue = node.hasFormula && node.formula_activeId && (!node.linkedFormulaIds || node.linkedFormulaIds.length === 0);
      const hasConditionIssue = node.hasCondition && node.condition_activeId && (!node.linkedConditionIds || node.linkedConditionIds.length === 0);
      const hasTableIssue = node.hasTable && node.table_activeId && (!node.linkedTableIds || node.linkedTableIds.length === 0);
      return hasFormulaIssue || hasConditionIssue || hasTableIssue;
    });
    
    console.log(`🔍 ${problematicNodes.length} nœud(s) avec des linkedIds manquants trouvé(s):\n`);
    
    let repairedCount = 0;
    
    for (const node of problematicNodes) {
      console.log(`📋 Réparation de: ${node.label} (${node.id})`);
      
      const updates = {};
      let needsUpdate = false;
      
      // Réparer linkedFormulaIds
      if (node.hasFormula && node.formula_activeId && (!node.linkedFormulaIds || node.linkedFormulaIds.length === 0)) {
        updates.linkedFormulaIds = [node.formula_activeId];
        needsUpdate = true;
        console.log(`   🧮 Ajout linkedFormulaIds: ${node.formula_activeId}`);
      }
      
      // Réparer linkedConditionIds
      if (node.hasCondition && node.condition_activeId && (!node.linkedConditionIds || node.linkedConditionIds.length === 0)) {
        updates.linkedConditionIds = [node.condition_activeId];
        needsUpdate = true;
        console.log(`   ⚡ Ajout linkedConditionIds: ${node.condition_activeId}`);
      }
      
      // Réparer linkedTableIds
      if (node.hasTable && node.table_activeId && (!node.linkedTableIds || node.linkedTableIds.length === 0)) {
        updates.linkedTableIds = [node.table_activeId];
        needsUpdate = true;
        console.log(`   📊 Ajout linkedTableIds: ${node.table_activeId}`);
      }
      
      if (needsUpdate) {
        await prisma.treeBranchLeafNode.update({
          where: { id: node.id },
          data: updates
        });
        console.log(`   ✅ Nœud mis à jour`);
        repairedCount++;
      } else {
        console.log(`   ⚠️ Aucune réparation nécessaire`);
      }
      
      // Vérifier les variables liées et les liaisons data
      if (node.linkedVariableIds && node.linkedVariableIds.length > 0) {
        if (!node.data_activeId || !node.data_exposedKey) {
          console.log(`   🔍 Réparation des liaisons variables...`);
          
          // Prendre la première variable liée
          const variableId = node.linkedVariableIds[0];
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: variableId },
            select: { id: true, exposedKey: true }
          });
          
          if (variable) {
            const dataUpdates = {};
            if (!node.data_activeId) {
              dataUpdates.data_activeId = variable.id;
              console.log(`   📎 Ajout data_activeId: ${variable.id}`);
            }
            if (!node.data_exposedKey) {
              dataUpdates.data_exposedKey = variable.exposedKey;
              console.log(`   🏷️ Ajout data_exposedKey: ${variable.exposedKey}`);
            }
            
            if (Object.keys(dataUpdates).length > 0) {
              await prisma.treeBranchLeafNode.update({
                where: { id: node.id },
                data: dataUpdates
              });
              console.log(`   ✅ Liaisons variables mises à jour`);
            }
          }
        } else {
          console.log(`   ✅ Liaisons variables déjà correctes`);
        }
      }
      
      console.log('');
    }
    
    // 2. Vérifier les nœuds qui ont des variables mais pas de linkedVariableIds
    console.log('\n🔍 RECHERCHE DES VARIABLES NON LIÉES...\n');
    
    const orphanVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        displayName: true
      }
    });
    
    const variablesByNode = {};
    orphanVariables.forEach(v => {
      if (!variablesByNode[v.nodeId]) {
        variablesByNode[v.nodeId] = [];
      }
      variablesByNode[v.nodeId].push(v);
    });
    
    let variableLinksFixed = 0;
    
    for (const [nodeId, variables] of Object.entries(variablesByNode)) {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: {
          id: true,
          label: true,
          linkedVariableIds: true,
          data_activeId: true,
          data_exposedKey: true
        }
      });
      
      if (!node) continue;
      
      const expectedVariableIds = variables.map(v => v.id);
      const currentLinkedIds = node.linkedVariableIds || [];
      const missingIds = expectedVariableIds.filter(id => !currentLinkedIds.includes(id));
      
      if (missingIds.length > 0) {
        console.log(`📋 ${node.label} (${nodeId}): ${missingIds.length} variable(s) non liée(s)`);
        
        const newLinkedVariableIds = [...currentLinkedIds, ...missingIds];
        const updates = { linkedVariableIds: newLinkedVariableIds };
        
        // Si pas de data_activeId, utiliser la première variable
        if (!node.data_activeId && variables.length > 0) {
          const primaryVar = variables[0];
          updates.data_activeId = primaryVar.id;
          updates.data_exposedKey = primaryVar.exposedKey;
          console.log(`   📎 Ajout data_activeId: ${primaryVar.id}`);
          console.log(`   🏷️ Ajout data_exposedKey: ${primaryVar.exposedKey}`);
        }
        
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: updates
        });
        
        console.log(`   ✅ ${missingIds.length} variable(s) liée(s)`);
        variableLinksFixed++;
      }
    }
    
    console.log('\n🎉 RÉPARATION TERMINÉE');
    console.log(`✅ ${repairedCount} nœud(s) avec linkedIds réparés`);
    console.log(`✅ ${variableLinksFixed} nœud(s) avec variables reliées`);
    console.log('\n💡 Maintenant, les champs devraient créer des displayFields lors de la duplication !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

repairAllLinkedIds().catch(console.error);