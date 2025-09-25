const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🔥 VERSION CORRIGÉE - Récupérer les formules TreeBranchLeaf
 */

async function getTreeBranchLeafFormulasSimple(nodeId) {
  try {
    console.log(`🔍 Récupération des formules pour le nœud: ${nodeId}`);
    
    // Version simplifiée sans relations complexes
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      orderBy: { order: 'asc' }
    });
    
    console.log(`✅ ${formulas.length} formule(s) trouvée(s)`);
    
    // Si on a des formules, récupérer les infos du nœud séparément
    if (formulas.length > 0) {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { 
          id: true,
          label: true, 
          type: true, 
          subType: true,
          treeId: true
        }
      });
      
      const tree = node ? await prisma.treeBranchLeafTree.findUnique({
        where: { id: node.treeId },
        select: { name: true, organizationId: true }
      }) : null;
      
      return formulas.map(formula => ({
        ...formula,
        nodeInfo: {
          label: node?.label,
          type: node?.type,
          subType: node?.subType,
          treeId: node?.treeId,
          treeName: tree?.name
        }
      }));
    }
    
    return formulas;
    
  } catch (error) {
    console.error('❌ Erreur récupération formules:', error.message);
    return [];
  }
}

async function getAllTreeBranchLeafFormulasSimple() {
  try {
    console.log('🌍 Récupération de TOUTES les formules TreeBranchLeaf...');
    
    // Récupérer toutes les formules
    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ ${allFormulas.length} formules trouvées au total`);
    
    // Récupérer les infos des nœuds et arbres pour chaque formule
    const enrichedFormulas = [];
    
    for (const formula of allFormulas) {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: formula.nodeId },
        select: { 
          id: true,
          label: true, 
          type: true,
          treeId: true
        }
      });
      
      const tree = node ? await prisma.treeBranchLeafTree.findUnique({
        where: { id: node.treeId },
        select: { name: true, organizationId: true }
      }) : null;
      
      enrichedFormulas.push({
        ...formula,
        nodeLabel: node?.label || 'Nœud inconnu',
        nodeType: node?.type || 'unknown',
        treeName: tree?.name || 'Arbre inconnu',
        treeId: node?.treeId,
        organizationId: tree?.organizationId
      });
    }
    
    return enrichedFormulas;
    
  } catch (error) {
    console.error('❌ Erreur récupération toutes les formules:', error.message);
    return [];
  }
}

/**
 * 🧮 Analyser une formule (tokens → lisible)
 */
function analyzeFormula(tokens) {
  if (!Array.isArray(tokens)) return 'Formule invalide';
  
  return tokens.map(token => {
    if (typeof token === 'string') {
      if (token.startsWith('@value.')) {
        return `[Champ: ${token.replace('@value.', '')}]`;
      } else if (['+', '-', '*', '/', '(', ')'].includes(token)) {
        return `[Opérateur: ${token}]`;
      } else if (!isNaN(parseFloat(token))) {
        return `[Nombre: ${token}]`;
      }
    }
    return `[Token: ${token}]`;
  }).join(' ');
}

/**
 * 🔄 API REST compatible - comme dans le vrai système
 */
async function getNodeFormulasAPI(nodeId) {
  try {
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      orderBy: { order: 'asc' }
    });
    
    return formulas.map(f => ({
      id: f.id,
      name: f.name,
      tokens: f.tokens,
      description: f.description,
      isDefault: f.isDefault,
      order: f.order
    }));
  } catch (error) {
    console.error('❌ Erreur API formules:', error.message);
    return [];
  }
}

// 🚀 TEST PRATIQUE CORRIGÉ
async function testRecuperationFormulesCorriges() {
  console.log('🚀 TEST CORRIGÉ - Récupération formules TreeBranchLeaf');
  console.log('====================================================');
  
  // Test 1: Trouver un nœud avec des formules
  console.log('🔍 1. Recherche de nœuds avec formules...');
  
  const anyFormula = await prisma.treeBranchLeafNodeFormula.findFirst();
  if (!anyFormula) {
    console.log('❌ Aucune formule trouvée en base');
    return;
  }
  
  const nodeId = anyFormula.nodeId;
  console.log(`✅ Nœud trouvé avec formule: ${nodeId}`);
  
  // Test 2: Récupération simple
  console.log(`\n2️⃣ Test: Formules du nœud ${nodeId}`);
  const formulas = await getTreeBranchLeafFormulasSimple(nodeId);
  
  formulas.forEach(formula => {
    console.log(`\n📋 Formule: "${formula.name}"`);
    console.log(`   🆔 ID: ${formula.id}`);
    console.log(`   📝 Description: ${formula.description || 'Aucune'}`);
    console.log(`   🧮 Tokens: ${JSON.stringify(formula.tokens)}`);
    console.log(`   📖 Lisible: ${analyzeFormula(formula.tokens)}`);
    if (formula.nodeInfo) {
      console.log(`   🌳 Nœud: "${formula.nodeInfo.label}" (${formula.nodeInfo.type})`);
      console.log(`   🏗️ Arbre: "${formula.nodeInfo.treeName}"`);
    }
  });
  
  // Test 3: API REST simulée
  console.log(`\n3️⃣ Test: API REST /api/treebranchleaf/nodes/${nodeId}/formulas`);
  const apiFormulas = await getNodeFormulasAPI(nodeId);
  console.log('✅ Réponse API (format JSON):');
  console.log(JSON.stringify(apiFormulas, null, 2));
  
  // Test 4: Toutes les formules
  console.log(`\n4️⃣ Test: Toutes les formules`);
  const allFormulas = await getAllTreeBranchLeafFormulasSimple();
  
  console.log(`📊 Total: ${allFormulas.length} formules`);
  allFormulas.forEach((formula, index) => {
    console.log(`${index + 1}. "${formula.name}" → Nœud "${formula.nodeLabel}" (Arbre: ${formula.treeName})`);
  });
  
  await prisma.$disconnect();
}

// 📝 RÉSUMÉ POUR TON MODULE
console.log(`
🎯 RÉSUMÉ POUR TON MODULE FORMULE
===============================

✅ Pour récupérer les formules d'un nœud TreeBranchLeaf:

1. Via API REST (recommandé):
   GET /api/treebranchleaf/nodes/{nodeId}/formulas

2. Via Prisma directement:
   await prisma.treeBranchLeafNodeFormula.findMany({
     where: { nodeId: 'ton-node-id' },
     orderBy: { order: 'asc' }
   });

3. Chaque formule contient:
   - id: identifiant unique
   - name: nom de la formule
   - tokens: array des éléments de la formule
   - description: description optionnelle
   - nodeId: ID du nœud propriétaire

4. Les tokens sont la logique de la formule:
   ["@value.field1", "+", "@value.field2", "*", "1.21"]
   
   @value.xxx = référence à un champ
   +, -, *, / = opérateurs mathématiques
   nombres = constantes

📋 Table: TreeBranchLeafNodeFormula
🔗 API: /api/treebranchleaf/nodes/:nodeId/formulas
`);

module.exports = {
  getTreeBranchLeafFormulasSimple,
  getAllTreeBranchLeafFormulasSimple,
  getNodeFormulasAPI,
  analyzeFormula
};

if (require.main === module) {
  testRecuperationFormulesCorriges();
}
