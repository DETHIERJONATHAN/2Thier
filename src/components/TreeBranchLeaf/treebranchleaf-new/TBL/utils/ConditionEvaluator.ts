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
    right?: { ref?: string; value?: unknown };
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
    
    // Résoudre la valeur de gauche
    const leftValue = this.resolveReference(left.ref, formData, debug);
    
    if (debug) {
      
      
    }
    
    switch (op) {
      case 'isNotEmpty': {
        const isEmpty = leftValue === null || leftValue === undefined || leftValue === '';
        const result = !isEmpty;
        if (debug) {
          
        }
        return result;
      }
        
      case 'isEmpty': {
        const isEmptyResult = leftValue === null || leftValue === undefined || leftValue === '';
        if (debug) {
          
        }
        return isEmptyResult;
      }
        
      case 'equals': {
        const rightValue = right ? this.resolveReference(right.ref || right.value, formData, debug) : null;
        const equalsResult = leftValue === rightValue;
        if (debug) {
          
        }
        return equalsResult;
      }
        
      default:
        if (debug) {
          
        }
        return false;
    }
  }
  
  /**
   * Résout une référence @value.xxx vers la valeur dans formData
   */
  private static resolveReference(
    ref: string | unknown, 
    formData: Record<string, unknown>,
    debug = false
  ): unknown {
    
    if (typeof ref !== 'string') {
      return ref; // Valeur directe
    }
    
    // Format @value.nodeId
    if (ref.startsWith('@value.')) {
      const nodeId = ref.replace('@value.', '');
      
      // Chercher dans formData par nodeId direct
      if (formData[nodeId] !== undefined) {
        if (debug) {
          
        }
        return formData[nodeId];
      }
      
      // Chercher dans les clés qui contiennent le nodeId
      for (const [key, value] of Object.entries(formData)) {
        if (key.includes(nodeId)) {
          if (debug) {
            
          }
          return value;
        }
      }
      
      if (debug) {
        
        
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