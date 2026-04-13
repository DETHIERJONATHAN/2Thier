/**
 * Évaluateur dynamique pour les conditions TreeBranchLeaf
 * Évalue les conditionSet sans appels API en utilisant des données statiques
 * 
 * 🚀 OPTIMISATION: Cache avec TTL pour éviter les appels API répétés
 */

import { FormulaEvaluator } from './FormulaEvaluator';
import { logger } from '../../../../../lib/logger';

interface ConditionWhen {
  id: string;
  op: string;
  left: {
    ref: string;
    kind: string;
  };
  right?: {
    ref?: string;
    value?: unknown;
    kind?: string;
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
      logger.debug(`🚀 [ConditionEvaluator] Cache hit pour condition ${conditionId}`);
      return cached.condition;
    }

    try {
      logger.debug(`⚠️ [ConditionEvaluator] Appel API pour condition ${conditionId}`);
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
    logger.debug(`🚀 [ConditionEvaluator] ${Object.keys(conditions).length} conditions injectées dans le cache`);
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
    const { op, left, right } = condition;
    
    // 🔧 Helper pour extraire l'ID depuis @value.xxx, @select.xxx, etc.
    const extractIdFromRef = (ref: string): string => {
      const m = /@(?:value|select|calculated|input)\.([a-f0-9-]{36})/i.exec(ref);
      return m && m[1] ? m[1] : ref;
    };
    
    // Résoudre la référence gauche @value.xxx, @select.xxx etc.
    const fieldRef = left.ref;
    const fieldId = extractIdFromRef(fieldRef);
    const leftValue = formData[fieldId];
    
    // Résoudre la référence droite si présente
    let rightValue: unknown = null;
    if (right) {
      // 🔧 Si c'est une référence @select.{optionId} avec kind=nodeOption, 
      // on compare DIRECTEMENT avec l'optionId (pas la valeur dans formData)
      if (right.kind === 'nodeOption' && right.ref) {
        const rightId = extractIdFromRef(right.ref);
        rightValue = rightId; // L'ID de l'option EST la valeur à comparer
      } else if (right.ref) {
        const rightId = extractIdFromRef(right.ref);
        rightValue = formData[rightId];
      } else if (right.value !== undefined) {
        rightValue = right.value;
      }
    }
    
    // Évaluer l'opération
    switch (op) {
      case 'isNotEmpty':
        return leftValue !== null && leftValue !== undefined && leftValue !== '';
      case 'isEmpty':
        return leftValue === null || leftValue === undefined || leftValue === '';
      case 'equals':
      case 'eq':
      case '==':
      case '===':
        // 🔧 Comparaison avec conversion string pour les IDs
        return String(leftValue) === String(rightValue);
      case 'notEquals':
      case 'ne':
      case '!=':
      case '!==':
        return String(leftValue) !== String(rightValue);
      case 'gt':
      case '>':
        return Number(leftValue) > Number(rightValue);
      case 'gte':
      case '>=':
        return Number(leftValue) >= Number(rightValue);
      case 'lt':
      case '<':
        return Number(leftValue) < Number(rightValue);
      case 'lte':
      case '<=':
        return Number(leftValue) <= Number(rightValue);
      case 'contains':
        return String(leftValue || '').toLowerCase().includes(String(rightValue || '').toLowerCase());
      case 'notContains':
        return !String(leftValue || '').toLowerCase().includes(String(rightValue || '').toLowerCase());
      default:
        logger.warn(`[ConditionEvaluator] Opération non supportée: ${op}`);
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