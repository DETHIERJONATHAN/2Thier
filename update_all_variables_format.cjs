const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔄 MISE À JOUR DE TOUTES LES VARIABLES AVEC NOUVEAU FORMAT\n');
    
    // 1. Vérifier l'état actuel
    console.log('1️⃣ ÉTAT ACTUEL:');
    const currentVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        operationResult: { not: null }
      },
      select: {
        id: true,
        variableKey: true,
        sourceRef: true,
        operationResult: true
      },
      take: 5
    });
    
    currentVariables.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.variableKey}`);
      console.log(`      Format actuel: ${v.operationResult.translation.substring(0, 60)}...`);
    });
    
    // 2. Identifier les variables à mettre à jour
    console.log('\n2️⃣ VARIABLES À METTRE À JOUR:');
    
    // Variables conditions
    const conditionVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'condition:' }
      }
    });
    
    console.log(`   🔀 Conditions: ${conditionVariables.length}`);
    
    // Variables formules
    const formulaVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'formula:' }
      }
    });
    
    console.log(`   🧮 Formules: ${formulaVariables.length}`);
    
    // 3. Appliquer le nouveau format récursif
    console.log('\n3️⃣ APPLICATION DU NOUVEAU FORMAT RÉCURSIF:');
    
    let updatedCount = 0;
    
    // Traiter les conditions avec le parser récursif
    for (const variable of conditionVariables) {
      console.log(`\n   🔀 Condition: ${variable.variableKey}`);
      
      const conditionId = variable.sourceRef.replace('condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });
      
      if (condition && condition.conditionSet) {
        const recursiveTranslation = await parseRecursively(condition.conditionSet, variable.submissionId, 0);
        
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: recursiveTranslation }
          }
        });
        
        console.log(`      ✅ Mis à jour: ${recursiveTranslation.substring(0, 80)}...`);
        updatedCount++;
      }
    }
    
    // Traiter les formules avec le nouveau format
    for (const variable of formulaVariables) {
      console.log(`\n   🧮 Formule: ${variable.variableKey}`);
      
      const formulaId = variable.sourceRef.replace('formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula && formula.tokens) {
        const nodeRefs = formula.tokens.filter(token => 
          typeof token === 'string' && token.startsWith('@value.')
        ).map(token => token.replace('@value.', ''));
        
        const nodeValues = {};
        const nodeRealValues = {};
        
        for (const nodeId of nodeRefs) {
          const nodeData = await getNodeValue(nodeId, variable.submissionId);
          const realValue = await getRealNodeValue(nodeId, variable.submissionId);
          
          nodeValues[nodeId] = nodeData;
          nodeRealValues[nodeId] = realValue;
        }
        
        const enrichedFormula = translateFormulaTokensWithValues(formula.tokens, nodeValues, nodeRealValues);
        
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: enrichedFormula }
          }
        });
        
        console.log(`      ✅ Mis à jour: ${enrichedFormula}`);
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 MISE À JOUR TERMINÉE: ${updatedCount} variables mises à jour`);
    
    // 4. Vérifier le résultat final
    console.log('\n4️⃣ RÉSULTAT FINAL:');
    const finalVariables = await prisma.treeBranchLeafSubmissionData.findMany({
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
    
    finalVariables.forEach((r, i) => {
      const type = r.sourceRef?.startsWith('formula:') ? '🧮' : '🔀';
      console.log(`   ${i + 1}. ${type} ${r.variableKey}`);
      console.log(`      📝 ${r.operationResult.translation}\n`);
    });
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

// FONCTIONS RÉCURSIVES (copiées du parser récursif)

async function parseRecursively(data, submissionId, depth = 0) {
  try {
    let dataObj;
    if (typeof data === 'string') {
      dataObj = JSON.parse(data);
    } else {
      dataObj = data;
    }
    
    if (dataObj.branches && dataObj.branches.length > 0) {
      return await parseConditionalStructure(dataObj, submissionId, depth);
    }
    
    if (dataObj.tokens && Array.isArray(dataObj.tokens)) {
      return await parseFormulaStructure(dataObj, submissionId, depth);
    }
    
    return 'STRUCTURE NON RECONNUE';
    
  } catch (error) {
    return `ERREUR NIVEAU ${depth}`;
  }
}

async function parseConditionalStructure(conditionObj, submissionId, depth) {
  const parts = [];
  
  for (let i = 0; i < conditionObj.branches.length; i++) {
    const branch = conditionObj.branches[i];
    
    if (i === 0) {
      const whenClause = await parseWhenClause(branch.when, submissionId, depth + 1);
      const thenClause = await parseActionClause(branch.actions, submissionId, depth + 1);
      parts.push(`SI (${whenClause}) ALORS (${thenClause})`);
    } else {
      const whenClause = await parseWhenClause(branch.when, submissionId, depth + 1);
      const thenClause = await parseActionClause(branch.actions, submissionId, depth + 1);
      parts.push(`SINON SI (${whenClause}) ALORS (${thenClause})`);
    }
  }
  
  if (conditionObj.fallback && conditionObj.fallback.actions) {
    const elseClause = await parseActionClause(conditionObj.fallback.actions, submissionId, depth + 1);
    parts.push(`SINON (${elseClause})`);
  }
  
  return parts.join(' ');
}

async function parseWhenClause(whenObj, submissionId, depth) {
  if (!whenObj) return 'CONDITION VIDE';
  
  switch (whenObj.op) {
    case 'isNotEmpty':
      const fieldRef = await resolveFieldReferenceRecursively(whenObj.left, submissionId, depth + 1);
      return `${fieldRef} NON VIDE`;
    case 'isEmpty':
      const emptyFieldRef = await resolveFieldReferenceRecursively(whenObj.left, submissionId, depth + 1);
      return `${emptyFieldRef} VIDE`;
    case 'equals':
      const leftRef = await resolveFieldReferenceRecursively(whenObj.left, submissionId, depth + 1);
      const rightRef = await resolveFieldReferenceRecursively(whenObj.right, submissionId, depth + 1);
      return `${leftRef} = ${rightRef}`;
    default:
      return `OPÉRATION ${whenObj.op} NON RECONNUE`;
  }
}

async function parseActionClause(actions, submissionId, depth) {
  if (!actions || actions.length === 0) return 'AUCUNE ACTION';
  
  const actionParts = [];
  
  for (const action of actions) {
    switch (action.type) {
      case 'SHOW':
        if (action.nodeIds && action.nodeIds.length > 0) {
          const showItems = [];
          for (const nodeId of action.nodeIds) {
            const fieldRef = await resolveNodeReferenceRecursively(nodeId, submissionId, depth + 1);
            showItems.push(fieldRef);
          }
          actionParts.push(`MONTRER: ${showItems.join(', ')}`);
        }
        break;
      case 'HIDE':
        if (action.nodeIds && action.nodeIds.length > 0) {
          const hideItems = [];
          for (const nodeId of action.nodeIds) {
            const fieldRef = await resolveNodeReferenceRecursively(nodeId, submissionId, depth + 1);
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

async function resolveFieldReferenceRecursively(fieldRef, submissionId, depth) {
  if (!fieldRef) return 'RÉFÉRENCE VIDE';
  
  if (fieldRef.ref && fieldRef.ref.startsWith('@value.')) {
    const nodeId = fieldRef.ref.replace('@value.', '');
    return await resolveNodeReferenceRecursively(nodeId, submissionId, depth);
  }
  
  return 'RÉFÉRENCE NON RECONNUE';
}

async function resolveNodeReferenceRecursively(nodeId, submissionId, depth) {
  try {
    if (nodeId.startsWith('node-formula:')) {
      const formulaId = nodeId.replace('node-formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula && formula.tokens && Array.isArray(formula.tokens)) {
        const formulaResult = await parseFormulaStructure(formula, submissionId, depth);
        return `[Formule: ${formula.label || 'Sans nom'} → ${formulaResult}]`;
      }
      return `[Formule: ${formula?.label || formulaId}]`;
    }
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true, defaultValue: true }
    });
    
    if (!node) return `[Node: ${nodeId}]`;
    
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: { nodeId: nodeId, submissionId: submissionId }
    });
    
    const realValue = submissionData?.value || node.defaultValue || '0';
    const label = node.label || `Node ${nodeId}`;
    
    return `"${label}" (${realValue})`;
    
  } catch (error) {
    return `[ERREUR: ${nodeId}]`;
  }
}

async function parseFormulaStructure(formulaObj, submissionId, depth) {
  const translatedTokens = [];
  
  for (const token of formulaObj.tokens) {
    if (typeof token === 'string' && token.startsWith('@value.')) {
      const nodeId = token.replace('@value.', '');
      const resolvedRef = await resolveNodeReferenceRecursively(nodeId, submissionId, depth + 1);
      translatedTokens.push(resolvedRef);
    } else {
      translatedTokens.push(token);
    }
  }
  
  return translatedTokens.join(' ');
}

async function getNodeValue(nodeId, submissionId) {
  try {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { defaultValue: true, label: true }
    });
    return node?.label || node?.defaultValue || `[${nodeId}]`;
  } catch (error) {
    return `[ERROR:${nodeId}]`;
  }
}

async function getRealNodeValue(nodeId, submissionId) {
  try {
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: { nodeId: nodeId, submissionId: submissionId }
    });
    
    if (submissionData && submissionData.value) {
      return submissionData.value;
    }
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { defaultValue: true }
    });
    
    return node?.defaultValue || '0';
  } catch (error) {
    return `ERROR`;
  }
}

function translateFormulaTokensWithValues(tokens, nodeValues, nodeRealValues) {
  if (!Array.isArray(tokens)) return 'FORMULE INVALIDE';
  
  return tokens.map(token => {
    if (typeof token === 'string') {
      if (token.startsWith('@value.')) {
        const nodeId = token.replace('@value.', '');
        const label = nodeValues[nodeId] || '[INCONNU]';
        const realValue = nodeRealValues[nodeId] || '0';
        return `"${label}" (${realValue})`;
      }
      return token;
    }
    return token;
  }).join(' ');
}