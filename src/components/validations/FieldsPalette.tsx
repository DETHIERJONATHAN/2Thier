import React from 'react';
import DraggableItem from './DraggableItemHTML5';

interface FieldsPaletteProps {
  fields: Array<{
    id: string;
    label: string;
    sectionId?: string;
  }>;
}

/**
 * Palette de champs pour l'éditeur de validation.
 * Permet de faire glisser des champs du formulaire dans la zone de validation.
 */
const FieldsPalette: React.FC<FieldsPaletteProps> = ({ fields }) => {
  return (
    <div className="fields-palette">
      {fields.length === 0 ? (
        <div className="text-xs text-gray-500 italic p-2 text-center">
          Aucun champ disponible
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {fields.map(field => (
              <DraggableItem
                key={field.id}
                id={`field-${field.id}`}
                type="field"
                data={{
                  type: 'field',
                  id: field.id,
                  value: field.id,
                  label: field.label,
                  referenceSectionId: field.sectionId
                }}
                className="px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm hover:bg-blue-100 w-full text-left cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1" title={`Cliquez pour ajouter le champ: ${field.label}`}>
                  <span className="truncate">{field.label}</span>
                  <button 
                    type="button"
                    className="bg-blue-500 text-white rounded-full p-0.5 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Créer un événement personnalisé pour l'ajouter à la séquence
                      const event = new CustomEvent('validation-sequence-item-added', {
                        detail: {
                          type: 'field',
                          id: field.id,
                          value: field.id,
                          label: field.label,
                          referenceSectionId: field.sectionId
                        }
                      });
                      document.dispatchEvent(event);
                      
                      // Animation de retour visuel
                      const button = e.currentTarget;
                      button.classList.add('bg-green-500');
                      setTimeout(() => {
                        button.classList.remove('bg-green-500');
                      }, 300);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="flex-shrink-0" viewBox="0 0 16 16">
                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                  </button>
                </div>
              </DraggableItem>
            ))}
        </div>
      )}
    </div>
  );
};

export default FieldsPalette;
