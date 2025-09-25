const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 TEST SPÉCIFIQUE DU CHAMP SELECT\n');
    
    // Test du champ SELECT spécifique
    const selectNodeId = 'node_1757366229542_r791f4qk7';
    const submissionId = '645253c7-7f65-46d6-9ff7-94e7543bb921';
    
    console.log('1️⃣ TEST DIRECT DE LA FONCTION:');
    const result = await resolveNodeReferenceIntelligent(selectNodeId, submissionId);
    console.log(`   🎯 Résultat: ${result}`);
    
    // Test du champ qui devrait être dans la condition
    console.log('\n2️⃣ TEST DU CHAMP DANS LA CONDITION:');
    const conditionNodeId = '702d1b09-abc9-4096-9aaa-77155ac5294f';
    const conditionResult = await resolveNodeReferenceIntelligent(conditionNodeId, submissionId);
    console.log(`   🎯 Résultat condition: ${conditionResult}`);
    
    // Analyser la condition complète
    console.log('\n3️⃣ RE-PARSING COMPLET DE LA CONDITION:');
    
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: 'ff05cc48-27ec-4d94-8975-30a0f9c1c275' }
    });
    
    if (condition) {
      console.log('   📋 Condition trouvée, re-parsing...');
      
      const newTranslation = await parseConditionIntelligent(condition.conditionSet, submissionId);
      console.log(`   ✨ Nouvelle traduction: ${newTranslation}`);
      
      // Comparer avec l'ancienne
      const currentVariable = await prisma.treeBranchLeafSubmissionData.findFirst({
        where: {
          sourceRef: 'condition:ff05cc48-27ec-4d94-8975-30a0f9c1c275',
          isVariable: true
        },
        select: { operationResult: true }
      });
      
      console.log(`   📝 Ancienne: ${currentVariable?.operationResult?.translation}`);
      console.log(`   🆚 Nouvelle: ${newTranslation}`);
      
      if (newTranslation !== currentVariable?.operationResult?.translation) {
        console.log('   🎉 DIFFÉRENCE DÉTECTÉE ! Mise à jour...');
        
        await prisma.treeBranchLeafSubmissionData.updateMany({
          where: {
            sourceRef: 'condition:ff05cc48-27ec-4d94-8975-30a0f9c1c275',
            isVariable: true
          },
          data: {
            operationResult: { translation: newTranslation }
          }
        });
        
        console.log('   ✅ Variable mise à jour avec parser intelligent !');
      } else {
        console.log('   ⚪ Pas de différence trouvée');
      }
    }
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

// FONCTIONS INTELLIGENTES (copiées et améliorées)

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

async function resolveNodeReferenceIntelligent(nodeId, submissionId) {
  try {
    console.log(`     🔍 Résolution: ${nodeId}`);
    
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
    
    if (!node) {
      console.log(`     ❌ Node non trouvé: ${nodeId}`);
      return `[Node: ${nodeId}]`;
    }
    
    console.log(`     📋 Node trouvé: "${node.label}" (type: ${node.type})`);
    
    // Vérifier si des données de soumission existent pour ce node
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: nodeId,
        submissionId: submissionId,
        isVariable: false
      },
      select: { value: true }
    });
    
    console.log(`     📊 Données soumission: ${submissionData?.value || 'aucune'}`);
    
    // Si le node a une valeur qui ressemble à un ID d'autre node = SELECT avec option
    if (submissionData && submissionData.value && submissionData.value.match(/^[a-f0-9-]{36}$/)) {
      console.log(`     🔽 Détecté comme SELECT avec option !`);
      
      // C'est un SELECT avec option !
      const openedField = await prisma.treeBranchLeafNode.findUnique({
        where: { id: submissionData.value },
        select: { label: true }
      });
      
      if (openedField) {
        console.log(`     📋 Champ ouvert: "${openedField.label}"`);
        
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
        console.log(`     💰 Valeur dans champ ouvert: ${dataValue}`);
        
        return `"${node.label}" → "${openedField.label}" (${dataValue})`;
      }
    }
    
    // Sinon, traitement normal
    const realValue = submissionData?.value || node.defaultValue || '0';
    console.log(`     📝 Traitement normal: ${realValue}`);
    
    return `"${node.label}" (${realValue})`;
    
  } catch (error) {
    console.log(`     ❌ Erreur: ${error.message}`);
    return `[ERREUR: ${nodeId}]`;
  }
}

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