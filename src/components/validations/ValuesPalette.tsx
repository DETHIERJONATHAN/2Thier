import React from 'react';
import DraggableItem from './DraggableItemHTML5';
import { ValidationItem } from './types';

// Liste des valeurs prédéfinies pour les validations
// Nous stockons les valeurs sous forme de chaînes pour éviter les problèmes avec JSON.stringify
const values = [
  { id: 'true', label: 'Vrai', value: 'true', jsValue: true, description: 'Valeur booléenne vraie' },
  { id: 'false', label: 'Faux', value: 'false', jsValue: false, description: 'Valeur booléenne fausse' },
  { id: 'null', label: 'Null', value: 'null', jsValue: null, description: 'Valeur nulle' },
  { id: 'empty', label: 'Vide', value: '', jsValue: '', description: 'Chaîne vide' },
  { id: 'zero', label: '0', value: '0', jsValue: 0, description: 'Valeur numérique zéro' },
  { id: 'one', label: '1', value: '1', jsValue: 1, description: 'Valeur numérique un' }
];

/**
 * Palette de valeurs prédéfinies pour l'éditeur de validation.
 * Permet de faire glisser des valeurs dans la zone de validation.
 */
const ValuesPalette: React.FC = () => {
  return (
    <div className="bg-white">
      <div className="flex flex-wrap gap-1">
        {values.map(v => (
          <DraggableItem
            key={v.id}
            id={`value-${v.id}`}
            type="value"
            data={{
              type: 'value',
              id: v.id,
              value: v.value,
              label: v.label,
              originalValue: v.jsValue // Important : conserver la valeur JS originale
            } as ValidationItem}
            className="px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700 text-sm hover:bg-green-100"
          >
            <div className="flex items-center gap-1" title={v.description}>
              <span>{v.label}</span>
            </div>
          </DraggableItem>
        ))}

        {/* Bouton pour ajouter une valeur personnalisée */}
        <button
          className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-700 text-sm hover:bg-gray-200 flex items-center gap-1"
          onClick={() => {
            const customValue = prompt('Entrez une valeur personnalisée:');
            if (customValue !== null) {
              // Création d'un événement personnalisé pour ajouter la valeur à la séquence
              const event = new CustomEvent('validation-sequence-item-added', {
                detail: {
                  type: 'value',
                  id: `value-custom-${Date.now()}`,
                  value: customValue,
                  label: `"${customValue.length > 10 ? customValue.substring(0, 10) + '...' : customValue}"`
                }
              });
              document.dispatchEvent(event);
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          <span>Valeur</span>
        </button>
      </div>
    </div>
  );
};

export default ValuesPalette;
