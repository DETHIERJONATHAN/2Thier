import React from 'react';
import { ValidationItem } from './types';

interface ValidationSidePreviewProps {
  sequence: ValidationItem[];
  validationName: string;
}

/**
 * Affiche un aperçu de la validation dans un panneau latéral en bas à gauche
 */
const ValidationSidePreview: React.FC<ValidationSidePreviewProps> = ({ sequence, validationName }) => {
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

  // Fonction pour vérifier si la validation est valide
  const isValidValidation = (): boolean => {
    return sequence.length > 0 && validationName.trim() !== '';
  };
  
  const getStatusText = (): string => {
    if (!validationName.trim()) return 'Nom de validation manquant';
    if (sequence.length === 0) return 'Aucune règle définie';
    return 'Validation valide';
  };

  return (
    <div className="fixed bottom-4 left-4 max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
      <div className="flex justify-between items-center mb-2">
        <h5 className="text-sm font-semibold text-gray-700">Prévisualisation</h5>
        <div className={`text-xs px-2 py-1 rounded ${isValidValidation() ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {getStatusText()}
        </div>
      </div>
      
      <div className="mb-2">
        <span className="text-xs font-medium text-gray-500">Nom:</span>
        <div className="text-sm bg-gray-50 p-1 rounded">
          {validationName.trim() || <span className="italic text-gray-400">Non défini</span>}
        </div>
      </div>
      
      <div>
        <span className="text-xs font-medium text-gray-500">Expression:</span>
        <div className="text-sm bg-gray-50 p-1 rounded">
          {sequence && sequence.length > 0 ? formatSequence(sequence) : (
            <span className="italic text-gray-400">Aucune règle définie</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationSidePreview;
