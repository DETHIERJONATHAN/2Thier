/**
 * 🎯 useDynamicConstraints - Hook pour récupérer les contraintes dynamiques des formules
 * 
 * Ce hook extrait les formules avec targetProperty (number_max, number_min, etc.)
 * et récupère les valeurs calculées des champs sources pour les appliquer comme contraintes.
 * 
 * Par exemple, si un champ "N° de panneau" a une formule avec:
 * - targetProperty: 'number_max'
 * - tokens: ['@value.panneaux-max-nodeId']
 * 
 * Ce hook extrait la valeur de "Panneaux max" et la retourne comme constraint.number_max
 */

import { useMemo } from 'react';

export interface DynamicConstraints {
  number_max?: number;
  number_min?: number;
  step?: number;
  visible?: boolean;
  required?: boolean;
  disabled?: boolean;
  constraintMessage?: string; // Message personnalisé quand la contrainte n'est pas respectée
}

export interface ConstraintFormula {
  id: string;
  name?: string;
  tokens?: unknown[];
  targetProperty: string;
  sourceNodeId?: string; // NodeId extrait des tokens
}

/**
 * Extrait le nodeId d'un token de référence
 * Format supportés: "@value.nodeId", "@value.shared-ref-xxx", { type: 'ref', ref: '@value.xxx' }
 */
const extractNodeIdFromToken = (token: unknown): string | null => {
  if (!token) return null;
  
  // Token string
  if (typeof token === 'string') {
    // Format @value.nodeId ou @value.shared-ref-xxx
    const match = token.match(/@value\.(.+)/);
    if (match) return match[1];
  }
  
  // Token objet { type: 'ref', ref: '@value.xxx' }
  if (typeof token === 'object' && token !== null) {
    const tokenObj = token as Record<string, unknown>;
    if (tokenObj.type === 'ref' && typeof tokenObj.ref === 'string') {
      const match = tokenObj.ref.match(/@value\.(.+)/);
      if (match) return match[1];
    }
  }
  
  return null;
};

/**
 * Extrait les formules de contrainte (celles avec un targetProperty défini)
 * et identifie les nodeIds sources à partir des tokens
 */
export const extractConstraintFormulas = (instances: Record<string, unknown> | null | undefined): ConstraintFormula[] => {
  if (!instances) return [];
  
  const constraintFormulas: ConstraintFormula[] = [];
  
  for (const [instanceId, instance] of Object.entries(instances)) {
    const inst = instance as Record<string, unknown> | null;
    if (!inst) continue;
    
    const targetProperty = inst.targetProperty as string | undefined;
    if (targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(targetProperty)) {
      // Normaliser le targetProperty
      const normalizedTarget = targetProperty === 'max' ? 'number_max' : targetProperty === 'min' ? 'number_min' : targetProperty;
      
      // Extraire le premier nodeId des tokens (pour les formules simples comme "=Panneaux max")
      const tokens = inst.tokens as unknown[] | undefined;
      let sourceNodeId: string | undefined;
      
      if (tokens && Array.isArray(tokens)) {
        for (const token of tokens) {
          const nodeId = extractNodeIdFromToken(token);
          if (nodeId) {
            sourceNodeId = nodeId;
            break;
          }
        }
      }
      
      constraintFormulas.push({
        id: instanceId,
        name: inst.name as string | undefined,
        tokens: tokens,
        targetProperty: normalizedTarget,
        sourceNodeId
      });
    }
  }
  
  return constraintFormulas;
};

/**
 * Hook simplifié pour obtenir les formules de contrainte
 * Retourne les formules et leurs nodeIds sources pour permettre
 * à TBLFieldRendererAdvanced de récupérer les valeurs via useBackendValue
 */
export const useConstraintFormulas = (
  formulaInstances: Record<string, unknown> | null | undefined
): ConstraintFormula[] => {
  return useMemo(() => {
    return extractConstraintFormulas(formulaInstances);
  }, [formulaInstances]);
};

/**
 * Fonction pour convertir les valeurs brutes en contraintes typées
 */
export const buildConstraints = (
  constraintFormulas: ConstraintFormula[],
  calculatedValues: Record<string, unknown>
): DynamicConstraints => {
  const constraints: DynamicConstraints = {};
  
  for (const formula of constraintFormulas) {
    const sourceNodeId = formula.sourceNodeId;
    if (!sourceNodeId) continue;
    
    // Chercher la valeur calculée pour ce nodeId source
    let value = calculatedValues[sourceNodeId];
    
    // Essayer aussi avec le suffixe -1 si non trouvé
    if (value === undefined && !sourceNodeId.endsWith('-1')) {
      value = calculatedValues[`${sourceNodeId}-1`];
    }
    
    // Essayer sans le suffixe -1 si non trouvé
    if (value === undefined && sourceNodeId.endsWith('-1')) {
      value = calculatedValues[sourceNodeId.slice(0, -2)];
    }
    
    if (value === undefined || value === null) continue;
    
    // Convertir selon le type de contrainte
    if (['number_max', 'number_min', 'step'].includes(formula.targetProperty)) {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(numValue)) {
        (constraints as Record<string, number>)[formula.targetProperty] = numValue;
      }
    } else if (['visible', 'required', 'disabled'].includes(formula.targetProperty)) {
      (constraints as Record<string, boolean>)[formula.targetProperty] = Boolean(value);
    }
  }
  
  return constraints;
};

/**
 * Vérifie si un champ a des formules de contrainte
 */
export const hasConstraintFormulas = (instances: Record<string, unknown> | null | undefined): boolean => {
  if (!instances) return false;
  
  for (const [, instance] of Object.entries(instances)) {
    const inst = instance as Record<string, unknown> | null;
    if (!inst) continue;
    
    const targetProperty = inst.targetProperty as string | undefined;
    if (targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(targetProperty)) {
      return true;
    }
  }
  return false;
};

export default useConstraintFormulas;
