const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createRecursiveParser() {
  try {
    console.log('🔄 PARSER RÉCURSIF COMPLET - TOUS NIVEAUX\n');
    
    // Variables avec conditions
    const conditionVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'condition:' }
      }
    });
    
    console.log(`🔀 Variables conditions: ${conditionVariables.length}`);
    
    for (const variable of conditionVariables) {
      console.log(`\n🔄 PARSING RÉCURSIF: ${variable.variableKey}`);
      
      const conditionId = variable.sourceRef.replace('condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });
      
      if (condition && condition.conditionSet) {
        console.log(`   📄 Condition trouvée`);
        
        // Parser récursivement avec profondeur
        const recursiveTranslation = await parseRecursively(condition.conditionSet, variable.submissionId, 0);
        
        console.log(`   ✨ Traduction récursive complète:`);
        console.log(`   ${recursiveTranslation}`);
        
        // Sauvegarder
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: recursiveTranslation }
          }
        });
        
        console.log(`   ✅ Sauvegardé`);
      }
    }
    
    console.log('\n📋 RÉSULTATS FINAUX RÉCURSIFS:');
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

// PARSER RÉCURSIF PRINCIPAL
async function parseRecursively(data, submissionId, depth = 0) {
  const indent = '  '.repeat(depth);
  
  try {
    let dataObj;
    if (typeof data === 'string') {
      dataObj = JSON.parse(data);
    } else {
      dataObj = data;
    }
    
    console.log(`${indent}🔍 Niveau ${depth}: ${dataObj.mode || 'condition'}`);
    
    // Si c'est une condition avec branches
    if (dataObj.branches && dataObj.branches.length > 0) {
      return await parseConditionalStructure(dataObj, submissionId, depth);
    }
    
    // Si c'est une formule
    if (dataObj.tokens && Array.isArray(dataObj.tokens)) {
      return await parseFormulaStructure(dataObj, submissionId, depth);
    }
    
    return 'STRUCTURE NON RECONNUE';
    
  } catch (error) {
    console.log(`${indent}⚠️ Erreur niveau ${depth}: ${error.message}`);
    return `ERREUR NIVEAU ${depth}`;
  }
}

// Parser pour structures conditionnelles (SI...ALORS...SINON)
async function parseConditionalStructure(conditionObj, submissionId, depth) {
  const indent = '  '.repeat(depth);
  const parts = [];
  
  console.log(`${indent}📋 Parsing condition avec ${conditionObj.branches.length} branches`);
  
  // Traiter chaque branche
  for (let i = 0; i < conditionObj.branches.length; i++) {
    const branch = conditionObj.branches[i];
    
    if (i === 0) {
      // Première branche = SI
      const whenClause = await parseWhenClause(branch.when, submissionId, depth + 1);
      const thenClause = await parseActionClause(branch.actions, submissionId, depth + 1);
      
      parts.push(`SI (${whenClause}) ALORS (${thenClause})`);
    } else {
      // Branches suivantes = SINON SI
      const whenClause = await parseWhenClause(branch.when, submissionId, depth + 1);
      const thenClause = await parseActionClause(branch.actions, submissionId, depth + 1);
      
      parts.push(`SINON SI (${whenClause}) ALORS (${thenClause})`);
    }
  }
  
  // Traiter le fallback (SINON)
  if (conditionObj.fallback && conditionObj.fallback.actions) {
    const elseClause = await parseActionClause(conditionObj.fallback.actions, submissionId, depth + 1);
    parts.push(`SINON (${elseClause})`);
  }
  
  return parts.join(' ');
}

// Parser pour structures de formules
async function parseFormulaStructure(formulaObj, submissionId, depth) {
  const indent = '  '.repeat(depth);
  
  console.log(`${indent}🧮 Parsing formule avec ${formulaObj.tokens.length} tokens`);
  
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

// Parser pour clauses WHEN
async function parseWhenClause(whenObj, submissionId, depth) {
  const indent = '  '.repeat(depth);
  
  if (!whenObj) return 'CONDITION VIDE';
  
  console.log(`${indent}❓ When clause: ${whenObj.op}`);
  
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
      
    case 'greaterThan':
      const gtLeftRef = await resolveFieldReferenceRecursively(whenObj.left, submissionId, depth + 1);
      const gtRightRef = await resolveFieldReferenceRecursively(whenObj.right, submissionId, depth + 1);
      return `${gtLeftRef} > ${gtRightRef}`;
      
    default:
      return `OPÉRATION ${whenObj.op} NON RECONNUE`;
  }
}

// Parser pour clauses ACTION avec récursion
async function parseActionClause(actions, submissionId, depth) {
  const indent = '  '.repeat(depth);
  
  if (!actions || actions.length === 0) return 'AUCUNE ACTION';
  
  console.log(`${indent}🎬 Actions: ${actions.length}`);
  
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

// Résolution récursive des références de champs
async function resolveFieldReferenceRecursively(fieldRef, submissionId, depth) {
  const indent = '  '.repeat(depth);
  
  if (!fieldRef) return 'RÉFÉRENCE VIDE';
  
  if (fieldRef.ref && fieldRef.ref.startsWith('@value.')) {
    const nodeId = fieldRef.ref.replace('@value.', '');
    return await resolveNodeReferenceRecursively(nodeId, submissionId, depth);
  }
  
  return 'RÉFÉRENCE NON RECONNUE';
}

// RÉSOLUTION RÉCURSIVE COMPLÈTE DES NODES
async function resolveNodeReferenceRecursively(nodeId, submissionId, depth) {
  const indent = '  '.repeat(depth);
  
  try {
    console.log(`${indent}🔍 Résolution node: ${nodeId}`);
    
    // Gérer les références spéciales
    if (nodeId.startsWith('node-formula:')) {
      const formulaId = nodeId.replace('node-formula:', '');
      
      console.log(`${indent}🧮 FORMULE TROUVÉE: ${formulaId}`);
      
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula) {
        console.log(`${indent}   Label: ${formula.label || 'Sans label'}`);
        
        // RÉCURSER DANS LA FORMULE !
        if (formula.tokens && Array.isArray(formula.tokens)) {
          const formulaResult = await parseFormulaStructure(formula, submissionId, depth);
          return `[Formule: ${formula.label || 'Sans nom'} → ${formulaResult}]`;
        }
        
        return `[Formule: ${formula.label || formulaId}]`;
      }
      return `[Formule: ${formulaId}]`;
    }
    
    if (nodeId.startsWith('node-condition:')) {
      const conditionId = nodeId.replace('node-condition:', '');
      
      console.log(`${indent}🔀 CONDITION TROUVÉE: ${conditionId}`);
      
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });
      
      if (condition) {
        // RÉCURSER DANS LA CONDITION !
        const conditionResult = await parseRecursively(condition.conditionSet, submissionId, depth);
        return `[Condition: ${condition.name || 'Sans nom'} → ${conditionResult}]`;
      }
      return `[Condition: ${conditionId}]`;
    }
    
    // Node normal - vérifier s'il a des formules/conditions attachées
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true, defaultValue: true }
    });
    
    if (!node) return `[Node: ${nodeId}]`;
    
    // Vérifier si ce node a une formule
    const nodeFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: nodeId }
    });
    
    // Vérifier si ce node a une condition
    const nodeConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: nodeId }
    });
    
    // Récupérer la vraie valeur
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: nodeId,
        submissionId: submissionId
      }
    });
    
    const realValue = submissionData?.value || node.defaultValue || '0';
    const label = node.label || `Node ${nodeId}`;
    
    let result = `"${label}" (${realValue})`;
    
    // Si le node a une formule, la récurser !
    if (nodeFormulas.length > 0) {
      console.log(`${indent}   🧮 Node a ${nodeFormulas.length} formules attachées`);
      
      for (const formula of nodeFormulas) {
        if (formula.tokens && Array.isArray(formula.tokens)) {
          const formulaResult = await parseFormulaStructure(formula, submissionId, depth);
          result += ` [Formule: ${formulaResult}]`;
        }
      }
    }
    
    // Si le node a une condition, la récurser !
    if (nodeConditions.length > 0) {
      console.log(`${indent}   🔀 Node a ${nodeConditions.length} conditions attachées`);
      
      for (const condition of nodeConditions) {
        const conditionResult = await parseRecursively(condition.conditionSet, submissionId, depth);
        result += ` [Condition: ${conditionResult}]`;
      }
    }
    
    return result;
    
  } catch (error) {
    console.log(`${indent}⚠️ Erreur résolution: ${error.message}`);
    return `[ERREUR: ${nodeId}]`;
  }
}

createRecursiveParser();