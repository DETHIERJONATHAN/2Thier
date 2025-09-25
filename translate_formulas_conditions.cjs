const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function translateFormulasAndConditions() {
  try {
    console.log('🔄 TRADUCTION AMÉLIORÉE FORMULES + CONDITIONS\n');
    
    // Variables avec formulas (sourceRef commence par "formula:")
    const formulaVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: { startsWith: 'formula:' }
      }
    });
    
    console.log(`🧮 Variables formules: ${formulaVariables.length}`);
    
    for (const variable of formulaVariables) {
      console.log(`\n🔄 Formule: ${variable.variableKey}`);
      
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
        
        // Récupérer les valeurs
        const nodeValues = {};
        for (const nodeId of nodeRefs) {
          const nodeData = await getNodeValue(nodeId, variable.submissionId);
          nodeValues[nodeId] = nodeData;
          console.log(`      ${nodeId}: "${nodeData}"`);
        }
        
        // Traduire la formule
        const translatedFormula = translateFormulaTokens(formula.tokens, nodeValues);
        console.log(`   ✨ Traduction: ${translatedFormula}`);
        
        // Sauvegarder
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: variable.id },
          data: {
            operationResult: { translation: translatedFormula }
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

// Traduction des tokens de formule
function translateFormulaTokens(tokens, nodeValues) {
  if (!Array.isArray(tokens)) return 'FORMULE INVALIDE';
  
  return tokens.map(token => {
    if (typeof token === 'string') {
      if (token.startsWith('@value.')) {
        const nodeId = token.replace('@value.', '');
        return `"${nodeValues[nodeId] || '[INCONNU]'}"`;
      }
      // C'est un opérateur ou une valeur littérale
      return token;
    }
    return token;
  }).join(' ');
}

translateFormulasAndConditions();