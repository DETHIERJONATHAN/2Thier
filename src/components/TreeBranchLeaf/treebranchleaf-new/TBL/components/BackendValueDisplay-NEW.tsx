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
 * 🎯 VERSION ULTRA-SIMPLE : Retourne JUSTE LA VALEUR FORMATÉE (string)
 * 
 * ❌ ANCIEN PROBLÈME:
 *    - Retournait un <span> React
 *    - Ce <span> se faisait wrapper dans un objet
 *    - La carte bleue recevait l'objet → "[object Object]"
 * 
 * ✅ NOUVELLE APPROCHE:
 *    - Retourne JUSTE LA VALEUR (string)
 *    - La carte bleue crée elle-même le <Text> avec le style qu'elle veut
 *    - PAS de wrapping, PAS de confusion
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

  // 🔄 Chargement : retourner le placeholder avec icône
  if (loading) {
    return (
      <span style={{ color: '#888' }}>
        <Spin size="small" style={{ marginRight: 4 }} />
        {placeholder}
      </span>
    );
  }

  // 🚫 Pas de valeur : retourner le placeholder
  if (value === undefined || value === null || value === '∅') {
    return <span style={{ color: '#888' }}>{placeholder}</span>;
  }

  // 🛡️ PROTECTION : Si value est un objet, extraire la valeur
  let extractedValue = value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    extractedValue = obj.value ?? obj.result ?? obj.calculatedValue ?? obj.text ?? obj.humanText ?? value;
  }

  // 📊 Formatage de la valeur
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

  // ➕ Ajouter l'unité si présente
  if (unit && displayValue !== placeholder) {
    displayValue = `${displayValue} ${unit}`;
  }

  // ✅ RETOURNER JUSTE LA VALEUR FORMATÉE (string)
  //    PAS DE <span>, PAS DE REACT ELEMENT
  //    La carte bleue s'occupe du <Text> avec son propre style
  return <>{displayValue}</>;
};
