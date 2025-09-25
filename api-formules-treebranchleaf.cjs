// 🎯 EXEMPLE PRATIQUE - Comment accéder aux formules TreeBranchLeaf depuis ton module
// ==================================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🔥 FONCTION PRINCIPALE: Récupérer toutes les formules d'un nœud TreeBranchLeaf
 * 
 * Cette fonction montre comment ton module "Formule" peut accéder 
 * aux formules stockées dans les nœuds TreeBranchLeaf
 */
async function getTreeBranchLeafFormulas(nodeId) {
  try {
    console.log(`🔍 Récupération des formules pour le nœud: ${nodeId}`);
    
    // Méthode recommandée: table dédiée TreeBranchLeafNodeFormula
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      include: {
        node: {
          select: { 
            label: true, 
            type: true, 
            subType: true,
            treeId: true,
            Tree: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    console.log(`✅ ${formulas.length} formule(s) trouvée(s)`);
    
    // Formater pour ton module
    const formulesFormatees = formulas.map(formula => ({
      // Identifiants
      id: formula.id,
      nodeId: formula.nodeId,
      
      // Informations sur la formule
      name: formula.name,
      description: formula.description,
      tokens: formula.tokens, // C'est ici qu'est la logique de la formule !
      
      // Métadonnées
      isDefault: formula.isDefault,
      order: formula.order,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
      
      // Contexte du nœud
      nodeInfo: {
        label: formula.node.label,
        type: formula.node.type,
        subType: formula.node.subType,
        treeId: formula.node.treeId,
        treeName: formula.node.Tree?.name
      }
    }));
    
    return formulesFormatees;
    
  } catch (error) {
    console.error('❌ Erreur récupération formules:', error);
    return [];
  }
}

/**
 * 🎯 EXEMPLE: Récupérer TOUTES les formules de tous les nœuds TreeBranchLeaf
 * 
 * Utile pour ton module si tu veux lister toutes les formules disponibles
 */
async function getAllTreeBranchLeafFormulas(organizationId = null) {
  try {
    console.log('🌍 Récupération de TOUTES les formules TreeBranchLeaf...');
    
    const whereFilter = organizationId 
      ? { node: { Tree: { organizationId } } }
      : {};
    
    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: whereFilter,
      include: {
        node: {
          select: {
            label: true,
            type: true,
            treeId: true,
            Tree: {
              select: { name: true, organizationId: true }
            }
          }
        }
      },
      orderBy: [
        { node: { Tree: { name: 'asc' } } },
        { node: { label: 'asc' } },
        { order: 'asc' }
      ]
    });
    
    console.log(`✅ ${allFormulas.length} formules trouvées au total`);
    
    // Grouper par arbre pour faciliter la navigation
    const formulesParArbre = {};
    
    allFormulas.forEach(formula => {
      const treeName = formula.node.Tree?.name || 'Arbre inconnu';
      const treeId = formula.node.treeId;
      
      if (!formulesParArbre[treeId]) {
        formulesParArbre[treeId] = {
          treeName,
          organizationId: formula.node.Tree?.organizationId,
          formulas: []
        };
      }
      
      formulesParArbre[treeId].formulas.push({
        id: formula.id,
        name: formula.name,
        description: formula.description,
        tokens: formula.tokens,
        nodeLabel: formula.node.label,
        nodeId: formula.nodeId
      });
    });
    
    return formulesParArbre;
    
  } catch (error) {
    console.error('❌ Erreur récupération toutes les formules:', error);
    return {};
  }
}

/**
 * 🧮 EXEMPLE: Analyser une formule (tokens → lisible)
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

// 🚀 TEST PRATIQUE
async function testRecuperationFormules() {
  console.log('🚀 TEST PRATIQUE - Récupération formules TreeBranchLeaf');
  console.log('======================================================');
  
  // Test 1: Formules d'un nœud spécifique
  const nodeId = 'node_1757366229470_wbzl3mi60'; // Nœud "Clients" qui a une formule
  
  console.log(`\n1️⃣ Test: Formules du nœud ${nodeId}`);
  const formulas = await getTreeBranchLeafFormulas(nodeId);
  
  formulas.forEach(formula => {
    console.log(`\n📋 Formule: "${formula.name}"`);
    console.log(`   🆔 ID: ${formula.id}`);
    console.log(`   📝 Description: ${formula.description || 'Aucune'}`);
    console.log(`   🌳 Nœud: "${formula.nodeInfo.label}" (${formula.nodeInfo.type})`);
    console.log(`   🏗️ Arbre: "${formula.nodeInfo.treeName}"`);
    console.log(`   🧮 Formule brute: ${JSON.stringify(formula.tokens)}`);
    console.log(`   📖 Formule lisible: ${analyzeFormula(formula.tokens)}`);
  });
  
  // Test 2: Toutes les formules
  console.log(`\n2️⃣ Test: Toutes les formules TreeBranchLeaf`);
  const allFormulas = await getAllTreeBranchLeafFormulas();
  
  for (const treeId in allFormulas) {
    const tree = allFormulas[treeId];
    console.log(`\n🌳 Arbre: "${tree.treeName}" (${tree.formulas.length} formules)`);
    
    tree.formulas.forEach(formula => {
      console.log(`   📋 "${formula.name}" → Nœud "${formula.nodeLabel}"`);
      console.log(`      🧮 ${analyzeFormula(formula.tokens)}`);
    });
  }
  
  await prisma.$disconnect();
}

// Exporter les fonctions pour ton module
module.exports = {
  getTreeBranchLeafFormulas,
  getAllTreeBranchLeafFormulas,
  analyzeFormula
};

// Lancer le test si appelé directement
if (require.main === module) {
  testRecuperationFormules();
}
