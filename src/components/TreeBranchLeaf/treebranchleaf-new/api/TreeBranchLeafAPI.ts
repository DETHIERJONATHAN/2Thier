/**
 * 🌲 TreeBranchLeaf - API Backend centralisée
 *
 * API complète pour le système TreeBranchLeaf
 * Tout est centralisé dans treebranchleaf-new/
 */

import type { TreeBranchLeafTree, TreeBranchLeafNode } from '../types';
import { TreeBranchLeafRegistry } from '../core/registry';

// Mock data pour commencer - remplacera l'ancienne API
// Configuration d'organisation par défaut (modifiable via variable d'environnement)
const DEFAULT_ORG_ID = process.env.TBL_DEFAULT_ORG_ID || 'dev-organization';

const mockTrees: TreeBranchLeafTree[] = [
  {
    id: 'tree-1',
    name: 'Formulaire de Contact',
    description: 'Formulaire principal de contact',
    organizationId: DEFAULT_ORG_ID,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tree-2', 
    name: 'Formulaire de Devis',
    description: 'Générateur de devis avancé',
    organizationId: DEFAULT_ORG_ID,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockNodes: Record<string, TreeBranchLeafNode[]> = {
  'tree-1': [
    {
      id: 'node-1',
      label: 'Informations Personnelles',
      description: 'Section des données personnelles',
      type: 'branch',
      parentId: null,
      sortOrder: 1,
      isVisible: true,
      metadata: {},
      children: [],
      hasData: false,
      hasFormula: false,
      hasCondition: false,
      hasTable: false,
      hasAPI: false,
      hasLink: false,
      hasMarkers: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'node-2',
      label: 'Nom',
      description: 'Champ nom utilisateur',
      type: 'leaf_field',
      parentId: 'node-1',
      sortOrder: 1,
      isVisible: true,
      metadata: { fieldType: 'text', required: true },
      children: [],
      hasData: true,
      hasFormula: false,
      hasCondition: false,
      hasTable: false,
      hasAPI: false,
      hasLink: false,
      hasMarkers: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'node-3',
      label: 'Email',
      description: 'Adresse email',
      type: 'leaf_field',
      parentId: 'node-1',
      sortOrder: 2,
      isVisible: true,
      metadata: { fieldType: 'email', required: true },
      children: [],
      hasData: true,
      hasFormula: false,
      hasCondition: false,
      hasTable: false,
      hasAPI: false,
      hasLink: false,
      hasMarkers: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  'tree-2': [
    {
      id: 'node-4',
      label: 'Détails du Projet',
      description: 'Informations sur le projet',
      type: 'branch',
      parentId: null,
      sortOrder: 1,
      isVisible: true,
      metadata: {},
      children: [],
      hasData: false,
      hasFormula: false,
      hasCondition: false,
      hasTable: false,
      hasAPI: false,
      hasLink: false,
      hasMarkers: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

/**
 * API Handlers centralisés
 */
export class TreeBranchLeafAPI {
  
  // GET /trees - Liste des arbres
  static async getTrees(organizationId: string): Promise<TreeBranchLeafTree[]> {
    // Filtrer par organisation
    return mockTrees.filter(tree => tree.organizationId === organizationId);
  }

  // GET /trees/:id/nodes - Nœuds d'un arbre
  static async getTreeNodes(treeId: string): Promise<TreeBranchLeafNode[]> {
    return mockNodes[treeId] || [];
  }

  // POST /trees - Créer un arbre
  static async createTree(data: Partial<TreeBranchLeafTree>): Promise<TreeBranchLeafTree> {
    const newTree: TreeBranchLeafTree = {
      id: `tree-${Date.now()}`,
      name: data.name || 'Nouvel arbre',
      description: data.description || '',
      organizationId: data.organizationId!,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockTrees.push(newTree);
    mockNodes[newTree.id] = [];
    
    return newTree;
  }

  // PUT /trees/:id - Modifier un arbre
  static async updateTree(id: string, data: Partial<TreeBranchLeafTree>): Promise<TreeBranchLeafTree | null> {
    const index = mockTrees.findIndex(tree => tree.id === id);
    if (index === -1) return null;

    mockTrees[index] = {
      ...mockTrees[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    return mockTrees[index];
  }

  // DELETE /trees/:id - Supprimer un arbre
  static async deleteTree(id: string): Promise<boolean> {
    const index = mockTrees.findIndex(tree => tree.id === id);
    if (index === -1) return false;

    mockTrees.splice(index, 1);
    delete mockNodes[id];
    
    return true;
  }

  // POST /trees/:treeId/nodes - Créer un nœud
  static async createNode(treeId: string, data: Partial<TreeBranchLeafNode>): Promise<TreeBranchLeafNode | null> {
    if (!mockNodes[treeId]) return null;

    // Déterminer le fieldType pour initialiser l'apparence par défaut
    const nodeType = TreeBranchLeafRegistry.getNodeType(data.type || 'leaf_field');
    const fieldType = data.subType || data.metadata?.fieldType || nodeType?.defaultFieldType;
    
    // Initialiser l'apparence par défaut si c'est un champ
    let defaultAppearance: Record<string, unknown> = {};
    let tblMapping = {};
    
    if (fieldType && data.type !== 'branch' && data.type !== 'section') {
      defaultAppearance = TreeBranchLeafRegistry.getDefaultAppearanceConfig(fieldType);
      tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(defaultAppearance);
    }

    const newNode: TreeBranchLeafNode = {
      id: `node-${Date.now()}`,
      label: data.label || 'Nouveau nœud',
      description: data.description || '',
      type: data.type || 'leaf_field',
      subType: fieldType,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder || 1,
      isVisible: data.isVisible !== false,
      metadata: data.metadata || {},
      children: [],
      hasData: data.hasData || false,
      hasFormula: data.hasFormula || false,
      hasCondition: data.hasCondition || false,
      hasTable: data.hasTable || false,
      hasAPI: data.hasAPI || false,
      hasLink: data.hasLink || false,
      hasMarkers: data.hasMarkers || false,
      // Ajouter l'apparence par défaut
      appearanceConfig: data.appearanceConfig || defaultAppearance,
      // Mapper vers les champs TBL
      ...(tblMapping as Record<string, unknown>),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockNodes[treeId].push(newNode);
    return newNode;
  }

  // PUT /nodes/:id - Modifier un nœud
  static async updateNode(nodeId: string, data: Partial<TreeBranchLeafNode>): Promise<TreeBranchLeafNode | null> {
    try {
      console.log('🔄 [TreeBranchLeafAPI] updateNode:', nodeId, data);
      
      // ✅ APPELER LA VRAIE API AU LIEU DU MOCK
      const response = await fetch(`/api/treebranchleaf/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include', // Pour envoyer les cookies d'authentification
      });

      if (!response.ok) {
        console.error('❌ [TreeBranchLeafAPI] Erreur HTTP:', response.status);
        return null;
      }

      const updatedNode = await response.json();
      console.log('✅ [TreeBranchLeafAPI] Node mis à jour:', updatedNode);
      return updatedNode;
    } catch (error) {
      console.error('❌ [TreeBranchLeafAPI] Erreur updateNode:', error);
      return null;
    }
  }

  // DELETE /nodes/:id - Supprimer un nœud
  static async deleteNode(nodeId: string): Promise<boolean> {
    for (const treeId in mockNodes) {
      const index = mockNodes[treeId].findIndex(node => node.id === nodeId);
      if (index !== -1) {
        mockNodes[treeId].splice(index, 1);
        return true;
      }
    }
    return false;
  }
}

export default TreeBranchLeafAPI;
