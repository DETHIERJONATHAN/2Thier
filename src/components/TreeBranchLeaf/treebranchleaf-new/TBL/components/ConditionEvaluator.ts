/**
 * Évaluateur dynamique pour les conditions TreeBranchLeaf
 * Évalue les conditionSet sans appels API en utilisant des données statiques
 * 
 * 🚀 OPTIMISATION: Cache avec TTL pour éviter les appels API répétés
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
// 🚀 OPTIMISATION: Cache avec TTL
const conditionCache = new Map<string, { condition: ConditionSet; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 60 secondes

export class ConditionEvaluator {
  private api: { get: (url: string) => Promise<{ data: ConditionSet }> };

  constructor(api: { get: (url: string) => Promise<{ data: ConditionSet }> }) {
    this.api = api;
  }

  /**
   * Récupère une condition depuis l'API ou le cache
   * 🚀 OPTIMISATION: Cache avec TTL
   */
  private async fetchCondition(conditionId: string): Promise<ConditionSet> {
    // Vérifier le cache d'abord avec TTL
    const cached = conditionCache.get(conditionId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`🚀 [ConditionEvaluator] Cache hit pour condition ${conditionId}`);
      return cached.condition;
    }

    try {
      console.log(`⚠️ [ConditionEvaluator] Appel API pour condition ${conditionId}`);
      // Appel API pour récupérer la condition
      const response = await this.api.get(`/treebranchleaf/conditions/${conditionId}`);
      const conditionSet = response.data;
      
      // Mettre en cache avec timestamp
      conditionCache.set(conditionId, { condition: conditionSet, timestamp: Date.now() });
      
      return conditionSet;
    } catch (error) {
      throw new Error(`Impossible de récupérer la condition ${conditionId}: ${error}`);
    }
  }

  /**
   * 🚀 NOUVEAU: Injecter une condition dans le cache (utilisé par le batch)
   */
  static injectCondition(conditionId: string, condition: ConditionSet): void {
    conditionCache.set(conditionId, { condition, timestamp: Date.now() });
  }

  /**
   * 🚀 NOUVEAU: Injecter plusieurs conditions dans le cache
   */
  static injectConditions(conditions: Record<string, ConditionSet>): void {
    const now = Date.now();
    for (const [id, condition] of Object.entries(conditions)) {
      conditionCache.set(id, { condition, timestamp: now });
    }
    console.log(`🚀 [ConditionEvaluator] ${Object.keys(conditions).length} conditions injectées dans le cache`);
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