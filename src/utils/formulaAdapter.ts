import type { Formula, FormulaItem } from '../store/slices/types';

/**
 * Adaptateur pour convertir les types de formule du store vers les types utilisés par l'évaluateur
 * Cela nous permet d'éviter les conflits de type entre les deux systèmes
 */
export const adaptFormulaForEvaluation = (formula: Formula): any => {
  if (!formula) return null;
  
  // S'assurer que tous les champs requis sont présents
  const adaptedFormula = {
    id: formula.id || '',
    name: formula.name || '',
    targetProperty: formula.targetProperty || '',
    sequence: Array.isArray(formula.sequence) 
      ? formula.sequence.map(adaptFormulaItem) 
      : [],
    expression: formula.expression || '',
    targetFieldId: formula.targetFieldId || ''
  };
  
  return adaptedFormula;
};

/**
 * Adaptateur pour les éléments de formule
 */
const adaptFormulaItem = (item: FormulaItem): any => {
  if (!item) return null;
  
  // Dans le store, pour les champs, l'ID du champ est stocké dans la propriété 'id'
  // et non dans une propriété 'fieldId' comme dans notre système d'évaluation
  const fieldId = item.type === 'field' ? item.id : undefined;
  
  return {
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: item.type || 'value',
    value: item.value || '',
    label: item.label || String(item.value || ''),
    fieldId: fieldId || '' // Pour les éléments de type 'field'
  };
};

/**
 * Extrait les informations des champs depuis la formule pour générer des valeurs de test
 */
export const extractFieldInfoFromFormula = (formula: Formula): { 
  fieldIds: string[]; 
  defaultValues: Record<string, number>;
} => {
  if (!formula || !Array.isArray(formula.sequence)) {
    return { fieldIds: [], defaultValues: {} };
  }
  
  // Extraire les IDs des champs uniques
  const fieldIds: string[] = [];
  const fieldLabels: Record<string, string> = {};
  const defaultValues: Record<string, number> = {};
  
  formula.sequence?.forEach((item: FormulaItem) => {
    if (item && item.type === 'field') {
      // Pour les champs, l'ID est soit dans item.id, soit dans item.value
      const fieldId = item.id || String(item.value || '');
      if (fieldId && !fieldIds.includes(fieldId)) {
        fieldIds.push(fieldId);
        fieldLabels[fieldId] = item.label || fieldId;
        defaultValues[fieldId] = 10; // Valeur par défaut pour les tests
      }
    }
  });
  
  return { fieldIds, defaultValues };
};
