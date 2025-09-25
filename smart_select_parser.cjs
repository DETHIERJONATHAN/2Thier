const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSmartSelectParser() {
  try {
    console.log('🎯 PARSER INTELLIGENT POUR CHAMPS SELECT AVEC OPTIONS\n');
    
    // 1. Analyser le champ SELECT spécifique
    console.log('1️⃣ ANALYSE DU CHAMP SELECT:');
    const selectNodeId = 'node_1757366229542_r791f4qk7'; // "Calcul du prix Kw/h ou Prix Kw/h"
    
    const selectNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: selectNodeId },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        isRequired: true
      }
    });
    
    console.log(`   📋 Champ SELECT: "${selectNode?.label}"`);
    console.log(`   📊 Type: ${selectNode?.type || 'non défini'}`);
    console.log(`   📊 SubType: ${selectNode?.subType || 'non défini'}`);
    
    // 2. Trouver quelle option est sélectionnée dans les données de soumission
    console.log('\n2️⃣ OPTION SÉLECTIONNÉE:');
    
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: selectNodeId,
        isVariable: false
      },
      select: {
        submissionId: true,
        value: true
      }
    });
    
    if (submissionData && submissionData.value) {
      console.log(`   ✅ Option sélectionnée: ${submissionData.value}`);
      
      // 3. Analyser le champ ouvert par cette option
      console.log('\n3️⃣ CHAMP OUVERT PAR L\'OPTION:');
      
      const openedField = await prisma.treeBranchLeafNode.findUnique({
        where: { id: submissionData.value },
        select: {
          id: true,
          label: true,
          type: true,
          defaultValue: true
        }
      });
      
      if (openedField) {
        console.log(`   📋 Champ ouvert: "${openedField.label}"`);
        console.log(`   📊 Type: ${openedField.type || 'non défini'}`);
        
        // 4. Récupérer les données saisies dans ce champ ouvert
        console.log('\n4️⃣ DONNÉES DANS LE CHAMP OUVERT:');
        
        const fieldData = await prisma.treeBranchLeafSubmissionData.findFirst({
          where: {
            nodeId: submissionData.value,
            submissionId: submissionData.submissionId,
            isVariable: false
          },
          select: {
            value: true
          }
        });
        
        if (fieldData && fieldData.value) {
          console.log(`   💰 Valeur saisie: "${fieldData.value}"`);
          
          // 5. Construire le format intelligent
          console.log('\n5️⃣ FORMAT INTELLIGENT:');
          const smartFormat = `"${selectNode.label}" → Option: "${openedField.label}" = ${fieldData.value}`;
          console.log(`   🎯 ${smartFormat}`);
          
        } else {
          console.log(`   ⚠️ Aucune donnée saisie dans le champ ouvert`);
        }
        
      } else {
        console.log(`   ❌ Champ ouvert non trouvé: ${submissionData.value}`);
      }
      
    } else {
      console.log(`   ⚠️ Aucune option sélectionnée`);
    }
    
    console.log('\n6️⃣ CRÉATION DE LA FONCTION GÉNÉRIQUE:');
    
    // Test de la fonction générique
    const result = await resolveSelectFieldWithOptions(selectNodeId, submissionData?.submissionId);
    console.log(`   🎯 Résultat fonction générique: ${result}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// FONCTION GÉNÉRIQUE POUR RÉSOUDRE LES CHAMPS SELECT
async function resolveSelectFieldWithOptions(nodeId, submissionId) {
  try {
    // 1. Récupérer le champ SELECT
    const selectNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true }
    });
    
    if (!selectNode) return `[SELECT NON TROUVÉ: ${nodeId}]`;
    
    // 2. Chercher quelle option est sélectionnée
    const submissionData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: nodeId,
        submissionId: submissionId,
        isVariable: false
      },
      select: { value: true }
    });
    
    if (!submissionData || !submissionData.value) {
      return `"${selectNode.label}" (aucune option sélectionnée)`;
    }
    
    // 3. Récupérer le champ ouvert par l'option
    const openedField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: submissionData.value },
      select: { label: true }
    });
    
    if (!openedField) {
      return `"${selectNode.label}" → [Option inconnue: ${submissionData.value}]`;
    }
    
    // 4. Récupérer les données dans le champ ouvert
    const fieldData = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: {
        nodeId: submissionData.value,
        submissionId: submissionId,
        isVariable: false
      },
      select: { value: true }
    });
    
    if (fieldData && fieldData.value) {
      return `"${selectNode.label}" → "${openedField.label}" (${fieldData.value})`;
    } else {
      return `"${selectNode.label}" → "${openedField.label}" (vide)`;
    }
    
  } catch (error) {
    return `[ERREUR SELECT: ${nodeId}]`;
  }
}

// FONCTION MISE À JOUR POUR RÉSOUDRE LES NODES INTELLIGEMMENT
async function resolveNodeReferenceIntelligent(nodeId, submissionId, depth = 0) {
  const indent = '  '.repeat(depth);
  
  try {
    console.log(`${indent}🔍 Résolution intelligente: ${nodeId}`);
    
    // Gérer les références spéciales
    if (nodeId.startsWith('node-formula:')) {
      const formulaId = nodeId.replace('node-formula:', '');
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (formula && formula.tokens && Array.isArray(formula.tokens)) {
        const formulaResult = await parseFormulaStructureIntelligent(formula, submissionId, depth);
        return `[Formule: ${formula.label || 'Sans nom'} → ${formulaResult}]`;
      }
      return `[Formule: ${formula?.label || formulaId}]`;
    }
    
    // Node normal - D'ABORD vérifier si c'est un SELECT avec options
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
      console.log(`${indent}   🔽 Détecté comme SELECT avec option`);
      return await resolveSelectFieldWithOptions(nodeId, submissionId);
    }
    
    // Sinon, traitement normal
    const realValue = submissionData?.value || node.defaultValue || '0';
    
    console.log(`${indent}   📝 Champ normal: ${realValue}`);
    return `"${node.label}" (${realValue})`;
    
  } catch (error) {
    console.log(`${indent}⚠️ Erreur résolution intelligente: ${error.message}`);
    return `[ERREUR: ${nodeId}]`;
  }
}

async function parseFormulaStructureIntelligent(formulaObj, submissionId, depth) {
  const translatedTokens = [];
  
  for (const token of formulaObj.tokens) {
    if (typeof token === 'string' && token.startsWith('@value.')) {
      const nodeId = token.replace('@value.', '');
      const resolvedRef = await resolveNodeReferenceIntelligent(nodeId, submissionId, depth + 1);
      translatedTokens.push(resolvedRef);
    } else {
      translatedTokens.push(token);
    }
  }
  
  return translatedTokens.join(' ');
}

console.log('🚀 LANCEMENT DU PARSER INTELLIGENT...\n');
createSmartSelectParser();