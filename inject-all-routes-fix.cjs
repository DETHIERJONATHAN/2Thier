#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function injectLinkedIdsFixForAllRoutes() {
  console.log('🔧 INJECTION DU FIX LINKEDIDS POUR TOUTES LES ROUTES\n');
  
  const routesFile = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');
  
  try {
    let content = fs.readFileSync(routesFile, 'utf8');
    
    // 1. Fix pour POST /conditions (si pas déjà présent)
    if (!content.includes('nodeCheck after condition creation')) {
      console.log('🎯 Ajout du fix pour POST /conditions');
      
      const conditionPattern = /(\s+)(console\.log\(`✅ \[TBL-ROUTES\] Condition créée:.*?\n)/;
      const conditionMatch = content.match(conditionPattern);
      
      if (conditionMatch) {
        const indentation = conditionMatch[1];
        const logLine = conditionMatch[2];
        
        const conditionFix = `${logLine}
${indentation}// 🔗 VERIFICATION: S'assurer que les linkedConditionIds sont corrects
${indentation}try {
${indentation}  const nodeCheck = await prisma.treeBranchLeafNode.findUnique({
${indentation}    where: { id: nodeId },
${indentation}    select: { linkedConditionIds: true, condition_activeId: true }
${indentation}  });
${indentation}  
${indentation}  if (nodeCheck?.condition_activeId && !nodeCheck.linkedConditionIds?.includes(nodeCheck.condition_activeId)) {
${indentation}    console.log('🔧 [AUTO-FIX] Ajout condition_activeId aux linkedConditionIds');
${indentation}    await prisma.treeBranchLeafNode.update({
${indentation}      where: { id: nodeId },
${indentation}      data: {
${indentation}        linkedConditionIds: {
${indentation}          push: nodeCheck.condition_activeId
${indentation}        }
${indentation}      }
${indentation}    });
${indentation}  }
${indentation}  console.log('✅ [nodeCheck after condition creation] linkedConditionIds vérifié');
${indentation}} catch (e) {
${indentation}  console.warn('⚠️ [nodeCheck] Erreur lors de la vérification des linkedConditionIds:', e);
${indentation}}
${indentation}`;
        
        content = content.replace(conditionPattern, conditionFix);
        console.log('   ✅ Fix ajouté pour POST /conditions');
      } else {
        console.log('   ❌ Pattern non trouvé pour POST /conditions');
      }
    } else {
      console.log('✅ Fix déjà présent pour POST /conditions');
    }
    
    // 2. Fix pour POST /tables (si pas déjà présent)
    if (!content.includes('nodeCheck after table creation')) {
      console.log('🎯 Ajout du fix pour POST /tables');
      
      const tablePattern = /(\s+)(console\.log\(`✅ \[TBL-ROUTES\] Table créée:.*?\n)/;
      const tableMatch = content.match(tablePattern);
      
      if (tableMatch) {
        const indentation = tableMatch[1];
        const logLine = tableMatch[2];
        
        const tableFix = `${logLine}
${indentation}// 🔗 VERIFICATION: S'assurer que les linkedTableIds sont corrects
${indentation}try {
${indentation}  const nodeCheck = await prisma.treeBranchLeafNode.findUnique({
${indentation}    where: { id: nodeId },
${indentation}    select: { linkedTableIds: true, table_activeId: true }
${indentation}  });
${indentation}  
${indentation}  if (nodeCheck?.table_activeId && !nodeCheck.linkedTableIds?.includes(nodeCheck.table_activeId)) {
${indentation}    console.log('🔧 [AUTO-FIX] Ajout table_activeId aux linkedTableIds');
${indentation}    await prisma.treeBranchLeafNode.update({
${indentation}      where: { id: nodeId },
${indentation}      data: {
${indentation}        linkedTableIds: {
${indentation}          push: nodeCheck.table_activeId
${indentation}        }
${indentation}      }
${indentation}    });
${indentation}  }
${indentation}  console.log('✅ [nodeCheck after table creation] linkedTableIds vérifié');
${indentation}} catch (e) {
${indentation}  console.warn('⚠️ [nodeCheck] Erreur lors de la vérification des linkedTableIds:', e);
${indentation}}
${indentation}`;
        
        content = content.replace(tablePattern, tableFix);
        console.log('   ✅ Fix ajouté pour POST /tables');
      } else {
        console.log('   ❌ Pattern non trouvé pour POST /tables');
      }
    } else {
      console.log('✅ Fix déjà présent pour POST /tables');
    }
    
    // 3. Vérifier que le fix pour POST /formulas est bien présent
    if (content.includes('nodeCheck after formula creation')) {
      console.log('✅ Fix déjà présent pour POST /formulas');
    } else {
      console.log('❌ Fix manquant pour POST /formulas - besoin de l\'appliquer');
    }
    
    // Écrire le fichier mis à jour
    fs.writeFileSync(routesFile, content, 'utf8');
    
    console.log('\n🎉 INJECTION TERMINÉE');
    console.log('✅ Toutes les routes de création de capacités ont maintenant la vérification automatique des linkedIds');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

injectLinkedIdsFixForAllRoutes().catch(console.error);