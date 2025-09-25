import React, { useState, useEffect } from 'react';
import { ValidationItem } from './types';

interface FieldPickerProps {
  availableFields: Array<{ id: string; label: string; sectionId?: string }>;
  onFieldSelect: (fieldItem: ValidationItem) => void;
}

/**
 * Composant de sélection de champs avec bouton d'ajout direct
 * Cette alternative au drag-and-drop fonctionne toujours
 */
const FieldPicker: React.FC<FieldPickerProps> = ({ availableFields, onFieldSelect }) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  
  // Réinitialiser la sélection si les champs disponibles changent
  useEffect(() => {
    if (availableFields.length > 0) {
      setSelectedFieldId(availableFields[0].id);
    }
  }, [availableFields]);
  
  const handleAddField = () => {
    const field = availableFields.find(f => f.id === selectedFieldId);
    
    if (field) {
      const fieldItem: ValidationItem = {
        type: 'field',
        id: field.id,
        value: field.id,
        label: field.label,
        referenceSectionId: field.sectionId
      };
      
      onFieldSelect(fieldItem);
    }
  };
  
  if (availableFields.length === 0) {
    return <div className="text-sm text-gray-500 p-2">Aucun champ disponible</div>;
  }
  
  return (
    <div className="p-2 border-t border-gray-200 mt-2">
      <div className="text-xs font-medium text-gray-700 mb-2">Ajout direct de champ</div>
      <div className="flex gap-2">
        <select
          value={selectedFieldId}
          onChange={(e) => setSelectedFieldId(e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded"
        >
          {availableFields.map(field => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddField}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Ajouter
        </button>
      </div>
    </div>
  );
};

export default FieldPicker;
