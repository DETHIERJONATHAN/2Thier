// 🔍 ANALYSE DU SYSTÈME DE FORMULES TREEBRANCHLEAF
// =====================================================

/**
 * COMMENT RÉCUPÉRER LES FORMULES D'UN NŒUD DEPUIS LE MODULE FORMULE
 * 
 * Il y a 2 endroits où les formules sont stockées :
 * 
 * 1️⃣ TABLE DÉDIÉE: TreeBranchLeafNodeFormula (recommandé)
 * 2️⃣ METADATA: node.metadata.capabilities.formulas (legacy/cache)
 * 
 * Le système préfère la table dédiée car c'est plus structuré.
 */

// =====================================================
// 📋 STRUCTURE DE LA TABLE TreeBranchLeafNodeFormula
// =====================================================

interface TreeBranchLeafNodeFormula {
  id: string;                    // ID unique de la formule
  nodeId: string;               // ID du nœud TreeBranchLeaf
  organizationId?: string;      // Organisation (pour filtrage)
  name: string;                 // Nom de la formule ("Formule 1", "Calcul TVA", etc.)
  tokens: string[];             // Tokens de la formule en JSON (les éléments de la formule)
  description?: string;         // Description optionnelle
  isDefault: boolean;          // Si c'est la formule par défaut
  order: number;               // Ordre d'affichage
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// 🔧 COMMENT RÉCUPÉRER LES FORMULES DEPUIS LE MODULE
// =====================================================

// ✅ MÉTHODE 1: Via l'API REST (recommandé)
const formulas = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`);

// ✅ MÉTHODE 2: Via l'endpoint dédié aux formules
const allFormulas = await api.get('/api/treebranchleaf/formulas/all');

// ✅ MÉTHODE 3: Via Prisma directement (côté serveur)
const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
  where: { nodeId: nodeId },
  orderBy: { order: 'asc' }
});

// ✅ MÉTHODE 4: Via la fonction utilitaire
import { getNodeFormulas } from '../lib/api/node-formulas';
const formulas = await getNodeFormulas(nodeId);

// =====================================================
// 🎯 EXEMPLE PRATIQUE: RÉCUPÉRER TOUTES LES FORMULES
// =====================================================

const exempleRecuperationFormules = async (nodeId: string) => {
  try {
    // 1. Récupérer les formules de la table dédiée
    const formulesTable = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`);
    console.log('📊 Formules depuis table:', formulesTable);
    
    // 2. Récupérer depuis metadata (fallback/cache)
    const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`);
    const formulesMetadata = node?.metadata?.capabilities?.formulas || [];
    console.log('📊 Formules depuis metadata:', formulesMetadata);
    
    // 3. Le système préfère la table, sinon fallback sur metadata
    const formules = formulesTable.length > 0 ? formulesTable : formulesMetadata;
    
    return formules;
  } catch (error) {
    console.error('❌ Erreur récupération formules:', error);
    return [];
  }
};

// =====================================================
// 🔄 FLUX NORMAL D'UTILISATION
// =====================================================

/**
 * 1. L'utilisateur ouvre le FormulaPanel dans TreeBranchLeaf
 * 2. Le FormulaPanel charge d'abord depuis la table TreeBranchLeafNodeFormula
 * 3. Si aucune formule en table, il regarde dans node.metadata.capabilities.formulas
 * 4. L'utilisateur peut ajouter/modifier/supprimer des formules
 * 5. Les changements sont sauvés en priorité dans la table dédiée
 * 6. La metadata est mise à jour comme cache/synchronisation
 */

// =====================================================
// 💡 POINTS CLÉS POUR LE MODULE FORMULE
// =====================================================

/**
 * ✅ Pour accéder aux formules d'un nœud depuis ton module:
 * 
 * 1. Utilise l'API: GET /api/treebranchleaf/nodes/{nodeId}/formulas
 * 2. Ou utilise la fonction: getNodeFormulas(nodeId) 
 * 3. Chaque formule a un nom, des tokens, et peut être évaluée
 * 4. Les tokens sont les éléments de la formule (variables, opérateurs, nombres)
 * 
 * ✅ Structure d'une formule typique:
 * {
 *   id: "formula-1234",
 *   name: "Calcul TVA", 
 *   tokens: ["@value.prix", "*", "1.21"],
 *   description: "Prix avec TVA 21%"
 * }
 * 
 * ✅ Pour évaluer une formule:
 * - Les tokens contiennent la logique
 * - @value.field fait référence à un champ du formulaire
 * - Les opérateurs sont: +, -, *, /, etc.
 */

export { exempleRecuperationFormules };
