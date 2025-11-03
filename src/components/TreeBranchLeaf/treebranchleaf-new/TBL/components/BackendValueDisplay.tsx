import React from 'react';
import { Spin } from 'antd';
import { useBackendValue } from '../hooks/useBackendValue';

interface BackendValueDisplayProps {
  /** ID du champ à afficher */
  nodeId: string;
  /** ID de l'arbre */
  treeId: string;
  /** Données du formulaire */
  formData: Record<string, unknown>;
  /** Placeholder si pas de valeur */
  placeholder?: string;
  /** Nombre de décimales (pour les nombres) */
  precision?: number;
  /** Unité à afficher après la valeur (ex: "m²", "€", "%") */
  unit?: string;
}

/**
 * 🎯 COMPOSANT ULTRA-SIMPLE : Affiche directement la valeur du backend
 * 
 * Le backend calcule TOUT (formules, tables, conditions)
 * Ce composant va juste chercher et afficher la réponse TELLE QUELLE
 * 
 * AUCUN CALCUL, AUCUNE TRANSFORMATION, juste afficher ce que le backend renvoie
 */
export const BackendValueDisplay: React.FC<BackendValueDisplayProps> = ({
  nodeId,
  treeId,
  formData,
  placeholder = '---',
  precision = 2,
  unit
}) => {
  const { value, loading } = useBackendValue(nodeId, treeId, formData);

  // Chargement
  if (loading) {
    return <Spin size="small" />;
  }

  // Pas de valeur
  if (value === undefined || value === null || value === '∅') {
    return <>{placeholder}</>;
  }

  // 🛡️ PROTECTION : Si value est un objet, extraire la valeur intelligemment
  let extractedValue = value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    extractedValue = obj.value ?? obj.result ?? obj.calculatedValue ?? obj.text ?? obj.humanText ?? value;
    console.log('🔍 [BackendValueDisplay] Objet détecté, valeur extraite:', extractedValue);
  }

  // Formatage simple de la valeur
  let displayValue: string;

  if (typeof extractedValue === 'number') {
    // C'est un nombre : appliquer la précision
    displayValue = extractedValue.toFixed(precision);
  } else if (typeof extractedValue === 'string') {
    // C'est une chaîne : vérifier si c'est un nombre
    const num = parseFloat(extractedValue);
    if (!isNaN(num)) {
      displayValue = num.toFixed(precision);
    } else {
      displayValue = extractedValue;
    }
  } else if (typeof extractedValue === 'boolean') {
    // C'est un booléen
    displayValue = extractedValue ? 'Oui' : 'Non';
  } else {
    // Autre type : convertir en chaîne
    displayValue = String(extractedValue);
  }

  // Ajouter l'unité si présente
  if (unit && displayValue !== placeholder) {
    displayValue = `${displayValue} ${unit}`;
  }

  // ✅ RETOURNER JUSTE LA VALEUR (pas de <span>)
  // La carte bleue s'occupe du style
  return <>{displayValue}</>;
};
