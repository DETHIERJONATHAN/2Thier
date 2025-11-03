import { useMemo } from 'react';
import { useBackendValue } from './useBackendValue';

interface UseFormattedBackendValueOptions {
  /** Nombre de décimales pour les nombres */
  precision?: number;
  /** Unité à ajouter après la valeur */
  unit?: string;
  /** Placeholder si pas de valeur */
  placeholder?: string;
}

/**
 * 🎯 HOOK ULTRA-SIMPLE : Récupère ET formate la valeur du backend
 * 
 * Retourne directement une STRING prête à afficher
 * Pas de composant React, pas de wrapping, juste la valeur
 * 
 * @example
 * const { formattedValue, loading } = useFormattedBackendValue(
 *   nodeId, 
 *   treeId, 
 *   formData,
 *   { precision: 2, unit: 'm²', placeholder: '---' }
 * );
 * 
 * // Utilisation dans la carte bleue:
 * <Text>{formattedValue}</Text>
 */
export const useFormattedBackendValue = (
  nodeId: string | undefined,
  treeId: string | undefined,
  formData: Record<string, unknown>,
  options: UseFormattedBackendValueOptions = {}
) => {
  const {
    precision = 2,
    unit,
    placeholder = '---'
  } = options;

  const { value: rawValue, loading } = useBackendValue(nodeId, treeId, formData);

  const formattedValue = useMemo(() => {
    // 🚫 Pas de valeur
    if (rawValue === undefined || rawValue === null || rawValue === '∅') {
      return placeholder;
    }

    // 🛡️ Protection : si c'est un objet, extraire la valeur
    let extractedValue = rawValue;
    if (typeof rawValue === 'object' && rawValue !== null) {
      const obj = rawValue as Record<string, unknown>;
      extractedValue = obj.value ?? obj.result ?? obj.calculatedValue ?? obj.text ?? obj.humanText ?? rawValue;
    }

    // 📊 Formatage selon le type
    let displayValue: string;

    if (typeof extractedValue === 'number') {
      // Nombre : appliquer la précision
      displayValue = extractedValue.toFixed(precision);
    } else if (typeof extractedValue === 'string') {
      // String : vérifier si c'est un nombre
      const num = parseFloat(extractedValue);
      if (!isNaN(num)) {
        displayValue = num.toFixed(precision);
      } else {
        displayValue = extractedValue;
      }
    } else if (typeof extractedValue === 'boolean') {
      // Booléen
      displayValue = extractedValue ? 'Oui' : 'Non';
    } else {
      // Autre : convertir en string
      displayValue = String(extractedValue);
    }

    // ➕ Ajouter l'unité
    if (unit && displayValue !== placeholder) {
      displayValue = `${displayValue} ${unit}`;
    }

    return displayValue;
  }, [rawValue, precision, unit, placeholder]);

  return {
    /** La valeur formatée prête à afficher (string) */
    formattedValue,
    /** La valeur brute du backend */
    rawValue,
    /** Indicateur de chargement */
    loading
  };
};
