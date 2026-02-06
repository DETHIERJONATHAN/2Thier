/**
 * 🔀 ÉVALUATEUR DE CONDITIONS DYNAMIQUE
 * 
 * Comprend et évalue les conditionSet TreeBranchLeaf :
 * - Mode "first-match" avec branches et fallback
 * - Opérations isNotEmpty, égalités, etc.
 * - Références @value.xxx vers formData
 * - Actions SHOW avec nodeIds et formules
 */

interface ConditionBranch {
  id: string;
  when: {
    op: string;
    left: { ref: string; kind?: string };
    right?: { ref?: string; value?: unknown; kind?: string };
  };
  label: string;
  actions: Array<{
    type: string;
    nodeIds: string[];
  }>;
}

interface ConditionSet {
  id: string;
  mode: string;
  branches: ConditionBranch[];
  fallback: {
    id: string;
    label: string;
    actions: Array<{
      type: string;
      nodeIds: string[];
    }>;
  };
}

type FormData = Record<string, unknown>;
type ConditionResult = { success: boolean; action?: unknown; result?: unknown; error?: string };
type ActionResult = { type: string; id: string } | null;

export class ConditionEvaluator {
  
  /**
   * Évalue un conditionSet complet et retourne l'action à exécuter
   */
  static evaluateConditionSet(
    conditionSet: ConditionSet, 
    formData: Record<string, unknown>,
    debug = false
  ): ConditionResult {
    
    if (debug) {
      
      
      
    }
    
    try {
      // Mode "first-match" : première branche qui match
      if (conditionSet.mode === 'first-match') {
        for (const branch of conditionSet.branches) {
          const conditionResult = this.evaluateCondition(branch.when, formData, debug);
          
          if (debug) {
            
          }
          
          if (conditionResult) {
            // Condition vraie → exécuter actions de cette branche
            const actionResult = this.executeActions(branch.actions, formData, debug);
            return { 
              success: true, 
              action: branch.actions[0], // Première action
              result: actionResult
            };
          }
        }
      }
      
      // Aucune branche n'a matché → fallback
      if (conditionSet.fallback) {
        if (debug) {
          
        }
        
        const fallbackResult = this.executeActions(conditionSet.fallback.actions, formData, debug);
        return { 
          success: true, 
          action: conditionSet.fallback.actions[0],
          result: fallbackResult
        };
      }
      
      return { success: false, error: 'Aucune condition matchée et pas de fallback' };
      
    } catch (error) {
      return { 
        success: false, 
        error: `Erreur évaluation condition: ${error.message}` 
      };
    }
  }
  
  /**
   * Évalue une condition individuelle (when)
   */
  private static evaluateCondition(
    when: ConditionBranch['when'], 
    formData: Record<string, unknown>,
    debug = false
  ): boolean {
    
    const { op, left, right } = when;
    
    // 🔧 Helper pour extraire l'ID depuis @value.xxx, @select.xxx, etc.
    const extractIdFromRef = (ref: string): string => {
      const m = /@(?:value|select|calculated|input)\.([a-f0-9-]{36})/i.exec(ref);
      return m && m[1] ? m[1] : ref;
    };
    
    // Résoudre la valeur de gauche
    const leftId = extractIdFromRef(left.ref);
    const leftValue = this.resolveReference(left.ref, formData, debug);
    
    // Résoudre la valeur de droite si présente
    let rightValue: unknown = null;
    if (right) {
      // 🔧 Si c'est une référence @select.{optionId} avec kind=nodeOption,
      // on compare DIRECTEMENT avec l'optionId (pas besoin de lookup)
      if (right.kind === 'nodeOption' && right.ref) {
        rightValue = extractIdFromRef(right.ref);
      } else if (right.ref) {
        rightValue = this.resolveReference(right.ref, formData, debug);
      } else if (right.value !== undefined) {
        rightValue = right.value;
      }
    }
    
    if (debug) {
      console.log(`[ConditionEvaluator] op=${op}, leftValue=${leftValue}, rightValue=${rightValue}`);
    }
    
    switch (op) {
      case 'isNotEmpty': {
        const isEmpty = leftValue === null || leftValue === undefined || leftValue === '';
        return !isEmpty;
      }
        
      case 'isEmpty': {
        return leftValue === null || leftValue === undefined || leftValue === '';
      }
        
      case 'equals':
      case 'eq':
      case '==':
      case '===': {
        // 🔧 Comparaison avec conversion string pour les IDs
        return String(leftValue) === String(rightValue);
      }
      
      case 'notEquals':
      case 'ne':
      case '!=':
      case '!==': {
        return String(leftValue) !== String(rightValue);
      }
      
      case 'gt':
      case '>': {
        return Number(leftValue) > Number(rightValue);
      }
      
      case 'gte':
      case '>=': {
        return Number(leftValue) >= Number(rightValue);
      }
      
      case 'lt':
      case '<': {
        return Number(leftValue) < Number(rightValue);
      }
      
      case 'lte':
      case '<=': {
        return Number(leftValue) <= Number(rightValue);
      }
      
      case 'contains': {
        return String(leftValue || '').toLowerCase().includes(String(rightValue || '').toLowerCase());
      }
      
      case 'notContains': {
        return !String(leftValue || '').toLowerCase().includes(String(rightValue || '').toLowerCase());
      }
        
      default:
        if (debug) {
          console.warn(`[ConditionEvaluator] Opérateur non supporté: ${op}`);
        }
        return false;
    }
  }
  
  /**
   * Résout une référence @value.xxx, @select.xxx vers la valeur dans formData
   */
  private static resolveReference(
    ref: string | unknown, 
    formData: Record<string, unknown>,
    debug = false
  ): unknown {
    
    if (typeof ref !== 'string') {
      return ref; // Valeur directe
    }
    
    // 🔧 Pattern unifié pour @value.xxx, @select.xxx, @calculated.xxx, etc.
    const refMatch = /@(?:value|select|calculated|input)\.([a-f0-9-]{36})/i.exec(ref);
    if (refMatch) {
      const nodeId = refMatch[1];
      
      // Chercher dans formData par nodeId direct
      if (formData[nodeId] !== undefined) {
        if (debug) {
          console.log(`[resolveReference] Trouvé ${nodeId} = ${formData[nodeId]}`);
        }
        return formData[nodeId];
      }
      
      // Chercher dans les clés qui contiennent le nodeId
      for (const [key, value] of Object.entries(formData)) {
        if (key.includes(nodeId)) {
          if (debug) {
            console.log(`[resolveReference] Trouvé via clé ${key} = ${value}`);
          }
          return value;
        }
      }
      
      if (debug) {
        console.log(`[resolveReference] Non trouvé: ${nodeId}`);
      }
      
      return null;
    }
    
    return ref; // Retourner tel quel si pas une référence
  }
  
  /**
   * Exécute les actions d'une branche ou fallback
   */
  private static executeActions(
    actions: ConditionBranch['actions'], 
    formData: Record<string, unknown>,
    debug = false
  ): ActionResult {
    
    if (!actions || actions.length === 0) {
      return null;
    }
    
    const action = actions[0]; // Prendre la première action
    
    if (debug) {
      
    }
    
    switch (action.type) {
      case 'SHOW': {
        // Retourner l'ID du node/formule à afficher
        const nodeId = action.nodeIds[0];
        
        // Si c'est une formule (node-formula:xxx)
        if (nodeId.startsWith('node-formula:')) {
          const formulaId = nodeId.replace('node-formula:', '');
          if (debug) {
            
          }
          return { type: 'formula', id: formulaId };
        }
        
        // Sinon c'est un nodeId direct
        if (debug) {
          
        }
        return { type: 'nodeValue', id: nodeId };
      }
        
      default:
        if (debug) {
          
        }
        return null;
    }
  }
}

export default ConditionEvaluator;