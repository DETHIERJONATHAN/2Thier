/**
 * 🛠️ UTILITAIRES D'INTÉGRATION TBL
 * 
 * Fonctions utilitaires pour faciliter l'intégration TBL Bridge
 * avec le système TreeBranchLeaf existant
 */

import { type TreeBranchLeafNode, TBLElement } from '../index';

// 🔄 ÉMETTEUR D'ÉVÉNEMENTS TBL
export const TBLEventEmitter = {
  nodeCreated: (node: TreeBranchLeafNode) => {
    document.dispatchEvent(new CustomEvent('treebranchleaf:node:created', {
      detail: { node }
    }));
  },
  
  nodeUpdated: (node: TreeBranchLeafNode) => {
    document.dispatchEvent(new CustomEvent('treebranchleaf:node:updated', {
      detail: { node }
    }));
  },
  
  nodeDeleted: (nodeId: string) => {
    document.dispatchEvent(new CustomEvent('treebranchleaf:node:deleted', {
      detail: { nodeId }
    }));
  }
};

// 🎯 DÉTECTEUR DE NŒUDS TREBRANCHLEAF
export class TreeBranchLeafDetector {
  private static selectors = [
    '[data-treebranchleaf-node]',
    '[data-node-id]',
    '.tree-node',
    '.treebranchleaf-node',
    '.node-item'
  ];

  public static findAllNodes(): Element[] {
    const elements: Element[] = [];
    
    this.selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      elements.push(...Array.from(found));
    });

    return [...new Set(elements)]; // Supprimer les doublons
  }

  public static extractNodeData(element: Element): TreeBranchLeafNode | null {
    try {
      const nodeId = element.getAttribute('data-node-id') || 
                    element.getAttribute('data-treebranchleaf-node') || 
                    element.id;

      if (!nodeId) return null;

      const label = element.getAttribute('data-label') || 
                   element.getAttribute('title') ||
                   element.textContent?.trim() || 
                   'Nœud sans nom';

      const type = element.getAttribute('data-type') || 
                  element.getAttribute('data-node-type') ||
                  'unknown';

      return {
        id: nodeId,
        label,
        type,
        parentId: element.getAttribute('data-parent-id') || null,
        position: parseInt(element.getAttribute('data-position') || '0'),
        isActive: element.getAttribute('data-active') !== 'false',
        createdAt: new Date(),
        updatedAt: new Date()
      } as TreeBranchLeafNode;

    } catch (error) {
      console.warn('Erreur extraction données nœud:', error);
      return null;
    }
  }

  public static isTreeBranchLeafElement(element: Element): boolean {
    return this.selectors.some(selector => element.matches(selector));
  }
}

// 📊 STATISTIQUES TBL
export interface TBLStats {
  totalNodes: number;
  tblElements: number;
  coverage: number; // Pourcentage de nœuds avec codes TBL
  types: Record<string, number>;
  capacities: Record<string, number>;
}

export function calculateTBLStats(
  nodes: TreeBranchLeafNode[], 
  tblElements: TBLElement[]
): TBLStats {
  const tblMap = new Map(tblElements.map(el => [el.id, el]));
  
  const stats: TBLStats = {
    totalNodes: nodes.length,
    tblElements: tblElements.length,
    coverage: nodes.length > 0 ? (tblElements.length / nodes.length) * 100 : 0,
    types: {},
    capacities: {}
  };

  // Analyser les types et capacités
  tblElements.forEach(el => {
    const typeCode = el.tbl_code.charAt(0);
    const capacityCode = el.tbl_code.charAt(1);
    
    stats.types[typeCode] = (stats.types[typeCode] || 0) + 1;
    stats.capacities[capacityCode] = (stats.capacities[capacityCode] || 0) + 1;
  });

  return stats;
}

// 🔍 VALIDATEUR TBL
export class TBLValidator {
  public static validateTBLCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code) {
      errors.push('Code TBL manquant');
      return { valid: false, errors };
    }

    if (code.length !== 2) {
      errors.push('Code TBL doit faire exactement 2 caractères');
    }

    const typeCode = code.charAt(0);
    const capacityCode = code.charAt(1);

    if (!/[1-7]/.test(typeCode)) {
      errors.push('Code type doit être entre 1 et 7');
    }

    if (!/[1-4]/.test(capacityCode)) {
      errors.push('Code capacité doit être entre 1 et 4');
    }

    return { valid: errors.length === 0, errors };
  }

  public static validateTBLElement(element: TBLElement): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!element.id) {
      errors.push('ID manquant');
    }

    if (!element.label) {
      errors.push('Label manquant');
    }

    if (!element.type) {
      errors.push('Type manquant');
    }

    const codeValidation = this.validateTBLCode(element.tbl_code);
    if (!codeValidation.valid) {
      errors.push(...codeValidation.errors);
    }

    return { valid: errors.length === 0, errors };
  }

  public static findDuplicateCodes(elements: TBLElement[]): Record<string, TBLElement[]> {
    const duplicates: Record<string, TBLElement[]> = {};
    const codeMap = new Map<string, TBLElement[]>();

    elements.forEach(element => {
      const existing = codeMap.get(element.tbl_code) || [];
      existing.push(element);
      codeMap.set(element.tbl_code, existing);
    });

    codeMap.forEach((elements, code) => {
      if (elements.length > 1) {
        duplicates[code] = elements;
      }
    });

    return duplicates;
  }
}

// 🔄 SYNCHRONISEUR MANUEL
export class ManualTBLSync {
  public static async syncFromDOM(): Promise<{ success: number; errors: number; total: number }> {
    const elements = TreeBranchLeafDetector.findAllNodes();
    const nodes = elements
      .map(el => TreeBranchLeafDetector.extractNodeData(el))
      .filter(node => node !== null) as TreeBranchLeafNode[];

    let success = 0;
    let errors = 0;

    for (const node of nodes) {
      try {
        TBLEventEmitter.nodeCreated(node);
        success++;
      } catch (error) {
        console.error('Erreur sync manuel:', error);
        errors++;
      }
    }

    return { success, errors, total: nodes.length };
  }

  public static async syncSpecificNode(nodeId: string): Promise<boolean> {
    const element = document.querySelector(`[data-node-id="${nodeId}"], [id="${nodeId}"]`);
    
    if (!element) {
      console.warn(`Élément non trouvé: ${nodeId}`);
      return false;
    }

    const nodeData = TreeBranchLeafDetector.extractNodeData(element);
    
    if (!nodeData) {
      console.warn(`Impossible d'extraire les données: ${nodeId}`);
      return false;
    }

    try {
      TBLEventEmitter.nodeCreated(nodeData);
      return true;
    } catch (error) {
      console.error('Erreur sync spécifique:', error);
      return false;
    }
  }
}

// 🎨 HELPER D'AFFICHAGE
export const TBLDisplayHelper = {
  formatTBLCode: (code: string): string => {
    if (!code || code.length !== 2) return code;
    
    const typeNames = {
      '1': 'Prix',
      '2': 'Quantité', 
      '3': 'Texte',
      '4': 'Date',
      '5': 'Logique',
      '6': 'Calcul',
      '7': 'Référence'
    };

    const capacityNames = {
      '1': 'Simple',
      '2': 'Intermédiaire',
      '3': 'Complexe',
      '4': 'Expert'
    };

    const type = typeNames[code.charAt(0) as keyof typeof typeNames] || 'Inconnu';
    const capacity = capacityNames[code.charAt(1) as keyof typeof capacityNames] || 'Inconnu';

    return `${code} (${type} - ${capacity})`;
  },

  getTypeColor: (typeCode: string): string => {
    const colors = {
      '1': '#52c41a', // Prix - Vert
      '2': '#1890ff', // Quantité - Bleu
      '3': '#722ed1', // Texte - Violet
      '4': '#fa8c16', // Date - Orange
      '5': '#eb2f96', // Logique - Rose
      '6': '#f5222d', // Calcul - Rouge
      '7': '#13c2c2'  // Référence - Cyan
    };

    return colors[typeCode as keyof typeof colors] || '#666666';
  },

  getCapacityIcon: (capacityCode: string): string => {
    const icons = {
      '1': '⚪', // Simple
      '2': '🔵', // Intermédiaire
      '3': '🟠', // Complexe
      '4': '🔴'  // Expert
    };

    return icons[capacityCode as keyof typeof icons] || '❓';
  }
};

// 🚀 INITIALISATEUR RAPIDE
export const QuickTBLSetup = {
  /**
   * Configuration ultra-rapide pour démarrer TBL Bridge
   */
  async quickStart(): Promise<void> {
    console.log('🚀 Démarrage rapide TBL Bridge...');
    
    // Import dynamique pour éviter les dépendances circulaires
    const { startTBLIntegration } = await import('./index');
    
    const cleanup = startTBLIntegration({
      autoInject: true,
      debugMode: true,
      enableAPI: true,
      enableEvents: true,
      syncOnMount: true
    });

    // Ajouter la fonction de nettoyage au window pour accès global
    (window as any).tblCleanup = cleanup;
    
    console.log('✅ TBL Bridge démarré. Tapez "window.tblCleanup()" pour arrêter.');
  },

  /**
   * Synchronisation manuelle d'urgence
   */
  async emergencySync(): Promise<void> {
    console.log('🚨 Synchronisation d\'urgence...');
    
    const result = await ManualTBLSync.syncFromDOM();
    
    console.log(`✅ Sync terminée: ${result.success}/${result.total} succès, ${result.errors} erreurs`);
  }
};

/**
 * 🎯 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * import { QuickTBLSetup, TBLEventEmitter, TreeBranchLeafDetector } from './TBLIntegrationUtils';
 * 
 * // Démarrage ultra-rapide
 * await QuickTBLSetup.quickStart();
 * 
 * // Émettre un événement manuellement
 * TBLEventEmitter.nodeCreated(myNode);
 * 
 * // Détecter les nœuds existants
 * const nodes = TreeBranchLeafDetector.findAllNodes();
 * 
 * // Sync d'urgence
 * await QuickTBLSetup.emergencySync();
 * ```
 */