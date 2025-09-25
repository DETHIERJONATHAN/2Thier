const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enrichTranslationWithValues() {
  try {
    console.log('🎯 ENRICHISSEMENT TRADUCTION AVEC VRAIES VALEURS\n');
    
    // Variables avec formulas (sourceRef commence par "formula:")
    const formulaVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'formula:' }
      }
    });
    
    console.log(`🧮 Variables formules à enrichir: ${formulaVariables.length}`);
    
    for (const variable of formulaVariables) {
      console.log(`\n🔄 Variable: ${variable.variableKey}`);
      
      // Récupérer la formule depuis TreeBranchLeafNodeFormula
      const formulaId = variable.sourceRef.replace('formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula && formula.tokens) {
        console.log(`   🔗 Tokens: ${JSON.stringify(formula.tokens)}`);
        
        // Extraire les références
        const nodeRefs = formula.tokens.filter(token => 
          typeof token === 'string' && token.startsWith('@value.')
        ).map(token => token.replace('@value.', ''));
        
        console.log(`   📊 Références: ${nodeRefs.length}`);
        
        // Récupérer les valeurs ET les vraies données
        const nodeValues = {};
        const nodeRealValues = {};
        
        for (const nodeId of nodeRefs) {
          const nodeData = await getNodeValue(nodeId, variable.submissionId);
          const realValue = await getRealNodeValue(nodeId, variable.submissionId);
          
          nodeValues[nodeId] = nodeData;  // Le libellé
          nodeRealValues[nodeId] = realValue;  // La vraie valeur
          
          console.log(`      ${nodeId}: "${nodeData}" → (${realValue})`);
        }
        
        // Traduire avec LIBELLÉ + VALEUR
        const enrichedFormula = translateFormulaTokensWithValues(formula.tokens, nodeValues, nodeRealValues);
        console.log(`   ✨ Traduction enrichie: ${enrichedFormula}`);
        
        // Sauvegarder
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: enrichedFormula }
          }
        });
        
        console.log(`   ✅ Sauvegardé`);
      }
    }
    
    // Traiter aussi les conditions
    const conditionVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'condition:' }
      }
    });
    
    console.log(`\n🔀 Variables conditions à enrichir: ${conditionVariables.length}`);
    
    for (const variable of conditionVariables) {
      console.log(`\n🔄 Condition: ${variable.variableKey}`);
      
      // Récupérer la condition depuis TreeBranchLeafNodeCondition
      const conditionId = variable.sourceRef.replace('condition:', '');
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });
      
      if (condition) {
        console.log(`   🔗 Condition: ${condition.conditionSet}`);
        
        // Parser et enrichir la condition
        const enrichedCondition = await enrichConditionWithValues(condition.conditionSet, variable.submissionId);
        console.log(`   ✨ Condition enrichie: ${enrichedCondition}`);
        
        // Sauvegarder
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: enrichedCondition }
          }
        });
        
        console.log(`   ✅ Sauvegardé`);
      }
    }
    
    console.log('\n📋 RÉSULTATS FINAUX ENRICHIS:');
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

// Fonction pour récupérer la valeur d'un node (libellé)
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

// Fonction pour récupérer la VRAIE valeur d'un node
async function getRealNodeValue(nodeId, submissionId) {
  try {
    // Chercher dans TreeBranchLeafSubmissionData
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: nodeId,
        submissionId: submissionId
      }
    });
    
    if (submissionData && submissionData.value) {
      return submissionData.value;
    }
    
    // Si pas trouvé, chercher la valeur par défaut
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { defaultValue: true }
    });
    
    return node?.defaultValue || '0';
  } catch (error) {
    return `ERROR`;
  }
}

// Traduction des tokens de formule AVEC les vraies valeurs
function translateFormulaTokensWithValues(tokens, nodeValues, nodeRealValues) {
  if (!Array.isArray(tokens)) return 'FORMULE INVALIDE';
  
  return tokens.map(token => {
    if (typeof token === 'string') {
      if (token.startsWith('@value.')) {
        const nodeId = token.replace('@value.', '');
        const label = nodeValues[nodeId] || '[INCONNU]';
        const realValue = nodeRealValues[nodeId] || '0';
        
        // Format: "Libellé" (vraie_valeur)
        return `"${label}" (${realValue})`;
      }
      // C'est un opérateur ou une valeur littérale
      return token;
    }
    return token;
  }).join(' ');
}

// Enrichir les conditions avec les vraies valeurs
async function enrichConditionWithValues(conditionSet, submissionId) {
  try {
    // Si c'est déjà un objet, le convertir en string
    let conditionStr;
    if (typeof conditionSet === 'object') {
      conditionStr = JSON.stringify(conditionSet);
    } else {
      conditionStr = conditionSet;
    }
    
    console.log(`   🔗 Condition string: ${conditionStr}`);
    
    // Enrichir les références aux champs dans la string
    let enriched = conditionStr;
    
    // Trouver toutes les références "Nom du champ"
    const nodeReferences = enriched.match(/"([^"]+)"/g);
    if (nodeReferences) {
      for (const ref of nodeReferences) {
        const label = ref.slice(1, -1); // Enlever les guillemets
        
        // Trouver le nodeId correspondant au label
        const node = await prisma.treeBranchLeafNode.findFirst({
          where: { label: label }
        });
        
        if (node) {
          const realValue = await getRealNodeValue(node.id, submissionId);
          enriched = enriched.replace(ref, `${ref} (${realValue})`);
        }
      }
    }
    
    // Enrichir les références [node-formula:...]
    const formulaReferences = enriched.match(/\[node-formula:([a-f0-9-]+)\]/g);
    if (formulaReferences) {
      for (const ref of formulaReferences) {
        const match = ref.match(/\[node-formula:([a-f0-9-]+)\]/);
        if (match) {
          const nodeId = match[1];
          const realValue = await getRealNodeValue(nodeId, submissionId);
          enriched = enriched.replace(ref, `${ref} (${realValue})`);
        }
      }
    }
    
    return enriched;
    
  } catch (error) {
    console.log(`   ⚠️ Erreur enrichissement: ${error.message}`);
    return conditionSet; // Retourner tel quel si erreur
  }
}

async function enrichConditionObject(obj, submissionId) {
  if (typeof obj === 'string') {
    // Vérifier si c'est une référence de node
    if (obj.startsWith('[node-formula:') || obj.includes('node-formula:')) {
      const match = obj.match(/\[node-formula:([a-f0-9-]+)\]/);
      if (match) {
        const nodeId = match[1];
        const realValue = await getRealNodeValue(nodeId, submissionId);
        return obj.replace(match[0], `${match[0]} (${realValue})`);
      }
    }
    
    // Enrichir les références directes aux champs
    const nodeReferences = obj.match(/"([^"]+)"/g);
    if (nodeReferences) {
      let enriched = obj;
      for (const ref of nodeReferences) {
        const label = ref.slice(1, -1); // Enlever les guillemets
        
        // Trouver le nodeId correspondant au label
        const node = await prisma.treeBranchLeafNode.findFirst({
          where: { label: label }
        });
        
        if (node) {
          const realValue = await getRealNodeValue(node.id, submissionId);
          enriched = enriched.replace(ref, `${ref} (${realValue})`);
        }
      }
      return enriched;
    }
    
    return obj;
  }
  
  if (Array.isArray(obj)) {
    const enrichedArray = [];
    for (const item of obj) {
      enrichedArray.push(await enrichConditionObject(item, submissionId));
    }
    return enrichedArray;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const enrichedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      enrichedObj[key] = await enrichConditionObject(value, submissionId);
    }
    return enrichedObj;
  }
  
  return obj;
}

enrichTranslationWithValues();