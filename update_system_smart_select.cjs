const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSystemWithSmartSelectParsing() {
  try {
    console.log('🔄 MISE À JOUR SYSTÈME AVEC PARSER SELECT INTELLIGENT\n');
    
    // 1. Trouver toutes les variables qui utilisent des références @value
    console.log('1️⃣ VARIABLES À METTRE À JOUR:');
    
    const variablesToUpdate = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        operationResult: { not: null }
      },
      select: {
        id: true,
        variableKey: true,
        sourceRef: true,
        submissionId: true,
        operationResult: true
      }
    });
    
    console.log(`   📊 Variables trouvées: ${variablesToUpdate.length}`);
    
    let updatedCount = 0;
    
    // 2. Re-traiter chaque variable avec le nouveau parser intelligent
    for (const variable of variablesToUpdate) {
      console.log(`\n🔄 Re-traitement: ${variable.variableKey}`);
      
      try {
        let newTranslation = '';
        
        if (variable.sourceRef?.startsWith('condition:')) {
          console.log('   🔀 Condition détectée');
          
          const conditionId = variable.sourceRef.replace('condition:', '');
          const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
            where: { id: conditionId }
          });
          
          if (condition) {
            newTranslation = await parseConditionIntelligent(condition.conditionSet, variable.submissionId);
          }
          
        } else if (variable.sourceRef?.startsWith('formula:')) {
          console.log('   🧮 Formule détectée');
          
          const formulaId = variable.sourceRef.replace('formula:', '');
          const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
            where: { id: formulaId }
          });
          
          if (formula && formula.tokens) {
            newTranslation = await parseFormulaIntelligent(formula.tokens, variable.submissionId);
          }
        }
        
        if (newTranslation && newTranslation !== variable.operationResult?.translation) {
          console.log(`   📝 Ancienne: ${variable.operationResult?.translation?.substring(0, 60)}...`);
          console.log(`   ✨ Nouvelle: ${newTranslation.substring(0, 60)}...`);
          
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: variable.id },
            data: {
              operationResult: { translation: newTranslation }
            }
          });
          
          updatedCount++;
          console.log(`   ✅ Mis à jour avec parser intelligent`);
        } else {
          console.log(`   ⚪ Pas de changement nécessaire`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 MISE À JOUR TERMINÉE: ${updatedCount} variables mises à jour`);
    
    // 3. Afficher les résultats finaux
    console.log('\n3️⃣ RÉSULTATS FINAUX AVEC PARSER INTELLIGENT:');
    
    const finalResults = await prisma.treeBranchLeafSubmissionData.findMany({
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
    
    finalResults.forEach((r, i) => {
      const type = r.sourceRef?.startsWith('formula:') ? '🧮' : '🔀';
      console.log(`   ${i + 1}. ${type} ${r.variableKey}`);
      console.log(`      📝 ${r.operationResult.translation}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// FONCTION POUR PARSER LES CONDITIONS AVEC INTELLIGENCE SELECT
async function parseConditionIntelligent(conditionSet, submissionId) {
  try {
    let dataObj = typeof conditionSet === 'string' ? JSON.parse(conditionSet) : conditionSet;
    
    if (dataObj.branches && dataObj.branches.length > 0) {
      const parts = [];
      
      for (let i = 0; i < dataObj.branches.length; i++) {
        const branch = dataObj.branches[i];
        
        if (i === 0) {
          const whenClause = await parseWhenClauseIntelligent(branch.when, submissionId);
          const thenClause = await parseActionClauseIntelligent(branch.actions, submissionId);
          parts.push(`SI (${whenClause}) ALORS (${thenClause})`);
        }
      }
      
      if (dataObj.fallback && dataObj.fallback.actions) {
        const elseClause = await parseActionClauseIntelligent(dataObj.fallback.actions, submissionId);
        parts.push(`SINON (${elseClause})`);
      }
      
      return parts.join(' ');
    }
    
    return 'STRUCTURE NON RECONNUE';
  } catch (error) {
    return `ERREUR CONDITION: ${error.message}`;
  }
}

async function parseWhenClauseIntelligent(whenObj, submissionId) {
  if (!whenObj) return 'CONDITION VIDE';
  
  if (whenObj.op === 'isNotEmpty' && whenObj.left?.ref) {
    const nodeId = whenObj.left.ref.replace('@value.', '');
    const nodeRef = await resolveNodeReferenceIntelligent(nodeId, submissionId);
    return `${nodeRef} NON VIDE`;
  }
  
  return `${whenObj.op} NON RECONNUE`;
}

async function parseActionClauseIntelligent(actions, submissionId) {
  if (!actions || actions.length === 0) return 'AUCUNE ACTION';
  
  const actionParts = [];
  
  for (const action of actions) {
    if (action.type === 'SHOW' && action.nodeIds) {
      const showItems = [];
      for (const nodeId of action.nodeIds) {
        const fieldRef = await resolveNodeReferenceIntelligent(nodeId, submissionId);
        showItems.push(fieldRef);
      }
      actionParts.push(`MONTRER: ${showItems.join(', ')}`);
    }
  }
  
  return actionParts.join(', ');
}

// FONCTION POUR PARSER LES FORMULES AVEC INTELLIGENCE SELECT
async function parseFormulaIntelligent(tokens, submissionId) {
  if (!Array.isArray(tokens)) return 'FORMULE INVALIDE';
  
  const translatedTokens = [];
  
  for (const token of tokens) {
    if (typeof token === 'string' && token.startsWith('@value.')) {
      const nodeId = token.replace('@value.', '');
      const resolvedRef = await resolveNodeReferenceIntelligent(nodeId, submissionId);
      translatedTokens.push(resolvedRef);
    } else {
      translatedTokens.push(token);
    }
  }
  
  return translatedTokens.join(' ');
}

// FONCTION INTELLIGENTE POUR RÉSOUDRE LES NODES (y compris SELECT)
async function resolveNodeReferenceIntelligent(nodeId, submissionId) {
  try {
    // Gérer les références spéciales
    if (nodeId.startsWith('node-formula:')) {
      const formulaId = nodeId.replace('node-formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula && formula.tokens && Array.isArray(formula.tokens)) {
        const formulaResult = await parseFormulaIntelligent(formula.tokens, submissionId);
        return `[Formule: ${formula.label || 'Sans nom'} → ${formulaResult}]`;
      }
      return `[Formule: ${formula?.label || formulaId}]`;
    }
    
    // Node normal - vérifier si c'est un SELECT avec options
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { 
        label: true, 
        defaultValue: true, 
        type: true, 
        subType: true 
      }
    });
    
    if (!node) return `[Node: ${nodeId}]`;
    
    // Vérifier si des données de soumission existent pour ce node
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: nodeId,
        submissionId: submissionId,
        isVariable: false
      },
      select: { value: true }
    });
    
    // Si le node a une valeur qui ressemble à un ID d'autre node = SELECT avec option
    if (submissionData && submissionData.value && submissionData.value.match(/^[a-f0-9-]{36}$/)) {
      // C'est un SELECT avec option !
      const openedField = await prisma.treeBranchLeafNode.findUnique({
        where: { id: submissionData.value },
        select: { label: true }
      });
      
      if (openedField) {
        // Récupérer les données dans le champ ouvert
        const fieldData = await prisma.treeBranchLeafSubmissionData.findFirst({
          where: {
            nodeId: submissionData.value,
            submissionId: submissionId,
            isVariable: false
          },
          select: { value: true }
        });
        
        const dataValue = fieldData?.value || 'vide';
        return `"${node.label}" → "${openedField.label}" (${dataValue})`;
      }
    }
    
    // Sinon, traitement normal
    const realValue = submissionData?.value || node.defaultValue || '0';
    return `"${node.label}" (${realValue})`;
    
  } catch (error) {
    return `[ERREUR: ${nodeId}]`;
  }
}

console.log('🚀 MISE À JOUR SYSTÈME AVEC PARSER INTELLIGENT...\n');
updateSystemWithSmartSelectParsing();