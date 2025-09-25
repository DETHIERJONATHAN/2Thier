const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createConditionParser() {
  try {
    console.log('🔀 PARSER CONDITIONS JSON → FRANÇAIS LISIBLE\n');
    
    // Variables avec conditions (sourceRef commence par "condition:")
    const conditionVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'condition:' }
      }
    });
    
    console.log(`🔀 Variables conditions: ${conditionVariables.length}`);
    
    for (const variable of conditionVariables) {
      console.log(`\n🔄 Condition: ${variable.variableKey}`);
      
      // Récupérer la condition depuis TreeBranchLeafNodeCondition
      const conditionId = variable.sourceRef.replace('condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });
      
      if (condition && condition.conditionSet) {
        console.log(`   📄 Condition brute: ${typeof condition.conditionSet}`);
        
        // Parser la condition et la traduire
        const humanReadable = await parseConditionToFrench(condition.conditionSet, variable.submissionId);
        
        console.log(`   ✨ Traduction française: ${humanReadable}`);
        
        // Sauvegarder
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: humanReadable }
          }
        });
        
        console.log(`   ✅ Sauvegardé`);
      }
    }
    
    console.log('\n📋 RÉSULTATS FINAUX:');
    const allResults = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        operationResult: { not: null }
      },
      select: {
        variableKey: true,
        sourceRef: true,
        operationResult: true
      }
    });
    
    allResults.forEach((r, i) => {
      const type = r.sourceRef?.startsWith('formula:') ? '🧮' : '🔀';
      console.log(`${i + 1}. ${type} ${r.variableKey}`);
      console.log(`   📝 ${r.operationResult.translation}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parser principal pour convertir une condition JSON en français
async function parseConditionToFrench(conditionSet, submissionId) {
  try {
    let conditionObj;
    
    // Gérer les différents formats
    if (typeof conditionSet === 'string') {
      conditionObj = JSON.parse(conditionSet);
    } else {
      conditionObj = conditionSet;
    }
    
    console.log(`   🔍 Structure: ${conditionObj.mode || 'simple'}`);
    
    // Différents types de conditions
    if (conditionObj.branches && conditionObj.branches.length > 0) {
      return await parseBranchedCondition(conditionObj, submissionId);
    }
    
    return 'CONDITION NON RECONNUE';
    
  } catch (error) {
    console.log(`   ⚠️ Erreur parsing: ${error.message}`);
    return `CONDITION INVALIDE: ${error.message}`;
  }
}

// Parser pour les conditions avec branches (SI...ALORS...SINON)
async function parseBranchedCondition(conditionObj, submissionId) {
  const parts = [];
  
  // Traiter chaque branche
  for (let i = 0; i < conditionObj.branches.length; i++) {
    const branch = conditionObj.branches[i];
    
    if (i === 0) {
      // Première branche = SI
      const whenClause = await parseWhenClause(branch.when, submissionId);
      const thenClause = await parseActionClause(branch.actions, submissionId);
      
      parts.push(`SI (${whenClause}) ALORS (${thenClause})`);
    } else {
      // Branches suivantes = SINON SI
      const whenClause = await parseWhenClause(branch.when, submissionId);
      const thenClause = await parseActionClause(branch.actions, submissionId);
      
      parts.push(`SINON SI (${whenClause}) ALORS (${thenClause})`);
    }
  }
  
  // Traiter le fallback (SINON)
  if (conditionObj.fallback && conditionObj.fallback.actions) {
    const elseClause = await parseActionClause(conditionObj.fallback.actions, submissionId);
    parts.push(`SINON (${elseClause})`);
  }
  
  return parts.join(' ');
}

// Parser pour les clauses WHEN (conditions)
async function parseWhenClause(whenObj, submissionId) {
  if (!whenObj) return 'CONDITION VIDE';
  
  switch (whenObj.op) {
    case 'isNotEmpty':
      const fieldRef = await resolveFieldReference(whenObj.left, submissionId);
      return `${fieldRef} NON VIDE`;
      
    case 'isEmpty':
      const emptyFieldRef = await resolveFieldReference(whenObj.left, submissionId);
      return `${emptyFieldRef} VIDE`;
      
    case 'equals':
      const leftRef = await resolveFieldReference(whenObj.left, submissionId);
      const rightRef = await resolveFieldReference(whenObj.right, submissionId);
      return `${leftRef} = ${rightRef}`;
      
    case 'greaterThan':
      const gtLeftRef = await resolveFieldReference(whenObj.left, submissionId);
      const gtRightRef = await resolveFieldReference(whenObj.right, submissionId);
      return `${gtLeftRef} > ${gtRightRef}`;
      
    default:
      return `OPÉRATION ${whenObj.op} NON RECONNUE`;
  }
}

// Parser pour les clauses ACTION (que faire)
async function parseActionClause(actions, submissionId) {
  if (!actions || actions.length === 0) return 'AUCUNE ACTION';
  
  const actionParts = [];
  
  for (const action of actions) {
    switch (action.type) {
      case 'SHOW':
        if (action.nodeIds && action.nodeIds.length > 0) {
          const showItems = [];
          for (const nodeId of action.nodeIds) {
            const fieldRef = await resolveNodeReference(nodeId, submissionId);
            showItems.push(fieldRef);
          }
          actionParts.push(`MONTRER: ${showItems.join(', ')}`);
        }
        break;
        
      case 'HIDE':
        if (action.nodeIds && action.nodeIds.length > 0) {
          const hideItems = [];
          for (const nodeId of action.nodeIds) {
            const fieldRef = await resolveNodeReference(nodeId, submissionId);
            hideItems.push(fieldRef);
          }
          actionParts.push(`CACHER: ${hideItems.join(', ')}`);
        }
        break;
        
      default:
        actionParts.push(`ACTION ${action.type} NON RECONNUE`);
    }
  }
  
  return actionParts.join(', ');
}

// Résoudre une référence de champ avec vraie valeur
async function resolveFieldReference(fieldRef, submissionId) {
  if (!fieldRef) return 'RÉFÉRENCE VIDE';
  
  if (fieldRef.ref && fieldRef.ref.startsWith('@value.')) {
    const nodeId = fieldRef.ref.replace('@value.', '');
    return await resolveNodeReference(nodeId, submissionId);
  }
  
  return 'RÉFÉRENCE NON RECONNUE';
}

// Résoudre une référence de node avec libellé + vraie valeur
async function resolveNodeReference(nodeId, submissionId) {
  try {
    // Gérer les références spéciales
    if (nodeId.startsWith('node-formula:')) {
      const formulaId = nodeId.replace('node-formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula && formula.label) {
        return `[Formule: ${formula.label}]`;
      }
      return `[Formule: ${formulaId}]`;
    }
    
    // Chercher le node normal
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true, defaultValue: true }
    });
    
    if (!node) return `[Node: ${nodeId}]`;
    
    // Récupérer la vraie valeur
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: nodeId,
        submissionId: submissionId
      }
    });
    
    const realValue = submissionData?.value || node.defaultValue || '0';
    const label = node.label || `Node ${nodeId}`;
    
    return `"${label}" (${realValue})`;
    
  } catch (error) {
    return `[ERREUR: ${nodeId}]`;
  }
}

createConditionParser();