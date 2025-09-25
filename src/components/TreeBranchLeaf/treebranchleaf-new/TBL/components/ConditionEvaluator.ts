/**
 * Évaluateur dynamique pour les conditions TreeBranchLeaf
 * Évalue les conditionSet sans appels API en utilisant des données statiques
 */

import { FormulaEvaluator } from './FormulaEvaluator';

interface ConditionWhen {
  id: string;
  op: string;
  left: {
    ref: string;
    kind: string;
  };
  type: string;
}

interface ConditionAction {
  id: string;
  type: string;
  nodeIds: string[];
}

interface ConditionBranch {
  id: string;
  when: ConditionWhen;
  label: string;
  actions: ConditionAction[];
}

interface ConditionFallback {
  id: string;
  label: string;
  actions: ConditionAction[];
}

interface ConditionSet {
  id: string;
  mode: string;
  tokens: unknown[];
  branches: ConditionBranch[];
  fallback?: ConditionFallback;
}

// Cache des conditions pour éviter les appels API répétés
const conditionCache = new Map<string, ConditionSet>();

export class ConditionEvaluator {
  private api: { get: (url: string) => Promise<{ data: ConditionSet }> };

  constructor(api: { get: (url: string) => Promise<{ data: ConditionSet }> }) {
    this.api = api;
  }

  /**
   * Récupère une condition depuis l'API ou le cache
   */
  private async fetchCondition(conditionId: string): Promise<ConditionSet> {
    // Vérifier le cache d'abord
    if (conditionCache.has(conditionId)) {
      return conditionCache.get(conditionId)!;
    }

    try {
      // Appel API pour récupérer la condition
      const response = await this.api.get(`/treebranchleaf/conditions/${conditionId}`);
      const conditionSet = response.data;
      
      // Mettre en cache
      conditionCache.set(conditionId, conditionSet);
      
      return conditionSet;
    } catch (error) {
      throw new Error(`Impossible de récupérer la condition ${conditionId}: ${error}`);
    }
  }

  /**
   * Évalue un conditionSet complet avec ses branches et fallback
   */
  async evaluateConditionSet(sourceRef: string, formData: Record<string, unknown>): Promise<unknown | null> {
    const conditionId = sourceRef.replace('condition:', '');
    
    // Récupérer le conditionSet depuis l'API
    const conditionSet = await this.fetchCondition(conditionId);
    
    // Évaluer les branches en mode "first-match"
    for (const branch of conditionSet.branches) {
      const conditionResult = this.evaluateCondition(branch.when, formData);
      
      if (conditionResult) {
        // Exécuter les actions de cette branche
        return await this.executeActions(branch.actions, formData);
      }
    }
    
    // Si aucune branche ne correspond, utiliser le fallback
    if (conditionSet.fallback) {
      return await this.executeActions(conditionSet.fallback.actions, formData);
    }
    
    return null;
  }
  
  /**
   * Évalue une condition individuelle (when)
   */
  private evaluateCondition(condition: ConditionWhen, formData: Record<string, unknown>): boolean {
    const { op, left } = condition;
    
    // Résoudre la référence @value.xxx
    const fieldRef = left.ref; // "@value.702d1b09-abc9-4096-9aaa-77155ac5294f"
    const fieldId = fieldRef.replace('@value.', ''); // "702d1b09-abc9-4096-9aaa-77155ac5294f"
    const fieldValue = formData[fieldId];
    
    // Évaluer l'opération
    switch (op) {
      case 'isNotEmpty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'isEmpty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'equals':
        // Pour equals, il faudrait une valeur right dans la condition
        return false;
      default:
        console.warn(`Opération non supportée: ${op}`);
        return false;
    }
  }
  
  /**
   * Exécute les actions d'une branche ou fallback
   */
  private async executeActions(actions: ConditionAction[], formData: Record<string, unknown>): Promise<unknown | null> {
    for (const action of actions) {
      if (action.type === 'SHOW' && action.nodeIds?.length > 0) {
        const nodeId = action.nodeIds[0];
        
        // Si c'est une formule, l'évaluer
        if (nodeId.startsWith('node-formula:')) {
          const formulaId = nodeId.replace('node-formula:', '');
          // Utiliser FormulaEvaluator avec l'API
          const evaluator = new FormulaEvaluator(this.api);
          return await evaluator.evaluateFormula(formulaId, formData);
        }
        
        // Sinon, retourner la valeur du noeud
        return formData[nodeId];
      }
    }
    
    return null;
  }
}