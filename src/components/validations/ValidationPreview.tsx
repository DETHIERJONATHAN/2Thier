import React from 'react';
import { ValidationItem } from './types';

interface ValidationPreviewProps {
  sequence: ValidationItem[];
}

/**
 * Affiche un aperçu de la validation dans un format lisible
 */
const ValidationPreview: React.FC<ValidationPreviewProps> = ({ sequence }) => {
  if (!sequence || sequence.length === 0) {
    return (
      <div className="text-xs text-gray-500 p-2 bg-gray-50 border border-dashed border-gray-200 rounded-md">
        Aucune validation définie
      </div>
    );
  }

  // Fonction pour convertir la séquence en texte lisible
  const formatSequence = (items: ValidationItem[]): string => {
    return items.map(item => {
      if (item.type === 'field') {
        return `[${item.label}]`;
      } else if (item.type === 'operator') {
        // Simplifier l'affichage des opérateurs
        const operatorMap: Record<string, string> = {
          'equals': '=',
          'notEquals': '≠',
          'greaterThan': '>',
          'lessThan': '<',
          'greaterThanOrEquals': '≥',
          'lessThanOrEquals': '≤',
          'and': 'ET',
          'or': 'OU',
          'not': 'NON'
        };
        return operatorMap[String(item.value)] || String(item.value);
      } else if (item.type === 'formula') {
        return `{${item.label}}`;
      } else {
        // Pour les valeurs statiques
        return String(item.value);
      }
    }).join(' ');
  };

  return (
    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
      <h5 className="text-xs font-semibold text-gray-600 mb-1">Aperçu:</h5>
      <div className="text-sm bg-white p-2 rounded-md border border-gray-100">
        {formatSequence(sequence)}
      </div>
    </div>
  );
};

export default ValidationPreview;
