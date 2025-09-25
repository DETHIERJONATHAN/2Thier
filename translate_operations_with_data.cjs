const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function translateOperationsWithData() {
  try {
    console.log('🔄 TRADUCTION DES OPÉRATIONS AVEC DONNÉES RÉELLES\n');
    
    // 1. Récupérer toutes les variables avec operationDetail
    const variables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        operationDetail: { not: null }
      }
    });
    
    console.log(`🔍 Variables à traiter: ${variables.length}\n`);
    
    for (const variable of variables) {
      console.log(`🔄 Traitement: ${variable.variableKey}`);
      console.log(`   🆔 ID: ${variable.id}`);
      
      try {
        // 2. Parser l'operationDetail pour extraire toutes les références
        const operationDetail = variable.operationDetail;
        const nodeReferences = extractAllNodeReferences(operationDetail);
        
        console.log(`   🔗 Références trouvées: ${nodeReferences.length}`);
        nodeReferences.forEach(ref => console.log(`      - ${ref}`));
        
        // 3. Récupérer les vraies valeurs de tous les nodes référencés
        const nodeValues = {};
        for (const nodeId of nodeReferences) {
          const nodeData = await getNodeValue(nodeId, variable.submissionId);
          nodeValues[nodeId] = nodeData;
          console.log(`   📊 ${nodeId}: "${nodeData}"`);
        }
        
        // 4. Traduire l'opération avec les vraies données
        const translatedOperation = translateOperation(operationDetail, nodeValues);
        
        console.log(`   ✨ Traduction: ${translatedOperation}`);
        
        // 5. Sauvegarder dans operationResult
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: translatedOperation }
          }
        });
        
        console.log(`   ✅ operationResult mis à jour\n`);
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
      }
    }
    
    console.log('🎉 TRADUCTION TERMINÉE !\n');
    
    // 6. Affichage final
    const results = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        operationResult: { not: null }
      },
      select: {
        variableKey: true,
        operationResult: true
      }
    });
    
    console.log('📋 RÉSULTATS FINAUX:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. 🔑 ${r.variableKey}`);
      console.log(`   📝 ${r.operationResult.translation}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erreur globale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour extraire toutes les références @value.nodeId
function extractAllNodeReferences(obj) {
  const references = new Set();
  
  function traverse(item) {
    if (typeof item === 'string') {
      // Chercher les patterns @value.nodeId
      const matches = item.match(/@value\.([a-f0-9\-]+)/g);
      if (matches) {
        matches.forEach(match => {
          const nodeId = match.replace('@value.', '');
          references.add(nodeId);
        });
      }
    } else if (typeof item === 'object' && item !== null) {
      // Parcourir récursivement l'objet
      Object.values(item).forEach(traverse);
    }
  }
  
  traverse(obj);
  return Array.from(references);
}

// Fonction pour récupérer la valeur d'un node
async function getNodeValue(nodeId, submissionId) {
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
    
    // Si pas trouvé, chercher dans TreeBranchLeafNode pour la valeur par défaut
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { defaultValue: true, label: true }
    });
    
    return node?.defaultValue || node?.label || `[${nodeId}]`;
  } catch (error) {
    return `[ERROR:${nodeId}]`;
  }
}

// Fonction principale de traduction
function translateOperation(operationDetail, nodeValues) {
  try {
    if (operationDetail.branches) {
      // C'est une condition
      return translateCondition(operationDetail, nodeValues);
    } else if (operationDetail.expression) {
      // C'est une formule
      return translateFormula(operationDetail.expression, nodeValues);
    } else {
      return JSON.stringify(operationDetail);
    }
  } catch (error) {
    return `[ERREUR TRADUCTION: ${error.message}]`;
  }
}

// Traduction des conditions
function translateCondition(condition, nodeValues) {
  let result = '';
  
  // Traiter chaque branche
  if (condition.branches && condition.branches.length > 0) {
    condition.branches.forEach((branch, index) => {
      if (index > 0) result += ' SINON ';
      
      result += 'SI (';
      result += translateBinaryOperation(branch.when, nodeValues);
      result += ') ALORS (';
      
      // Traiter les actions
      if (branch.actions) {
        const actionTexts = branch.actions.map(action => {
          if (action.type === 'SHOW') {
            const nodeIds = action.nodeIds || [];
            return `MONTRER: ${nodeIds.map(id => nodeValues[id] || `[${id}]`).join(', ')}`;
          }
          return `ACTION: ${action.type}`;
        });
        result += actionTexts.join(', ');
      }
      result += ')';
    });
  }
  
  // Traiter le fallback
  if (condition.fallback && condition.fallback.actions) {
    result += ' SINON (';
    const fallbackActions = condition.fallback.actions.map(action => {
      if (action.type === 'SHOW') {
        const nodeIds = action.nodeIds || [];
        return `MONTRER: ${nodeIds.map(id => nodeValues[id] || `[${id}]`).join(', ')}`;
      }
      return `ACTION: ${action.type}`;
    });
    result += fallbackActions.join(', ');
    result += ')';
  }
  
  return result;
}

// Traduction des opérations binaires
function translateBinaryOperation(operation, nodeValues) {
  if (!operation) return '';
  
  const left = translateOperand(operation.left, nodeValues);
  const right = translateOperand(operation.right, nodeValues);
  const op = translateOperator(operation.op);
  
  return `${left} ${op} ${right}`;
}

// Traduction des opérandes
function translateOperand(operand, nodeValues) {
  if (!operand) return '';
  
  if (typeof operand === 'string') {
    return replaceNodeReferences(operand, nodeValues);
  } else if (operand.ref) {
    return replaceNodeReferences(operand.ref, nodeValues);
  } else if (operand.value !== undefined) {
    return operand.value;
  }
  
  return JSON.stringify(operand);
}

// Traduction des opérateurs
function translateOperator(op) {
  const operators = {
    'isNotEmpty': 'NON VIDE',
    'isEmpty': 'VIDE',
    'equals': '==',
    'notEquals': '!=',
    'greaterThan': '>',
    'lessThan': '<',
    'greaterThanOrEqual': '>=',
    'lessThanOrEqual': '<=',
    'contains': 'CONTIENT',
    'startsWith': 'COMMENCE PAR',
    'endsWith': 'FINIT PAR'
  };
  
  return operators[op] || op;
}

// Traduction des formules
function translateFormula(expression, nodeValues) {
  return replaceNodeReferences(expression, nodeValues);
}

// Remplacement des références par les vraies valeurs
function replaceNodeReferences(text, nodeValues) {
  if (typeof text !== 'string') return text;
  
  let result = text;
  
  // Remplacer toutes les références @value.nodeId
  Object.entries(nodeValues).forEach(([nodeId, value]) => {
    const pattern = new RegExp(`@value\\.${nodeId}`, 'g');
    result = result.replace(pattern, `"${value}"`);
  });
  
  return result;
}

translateOperationsWithData();