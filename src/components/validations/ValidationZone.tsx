import React, { useState, useEffect, useRef } from 'react';
import { ValidationItem } from './types';
import ValidationsPalette from './ValidationsPalette';

interface ValidationZoneProps {
  validationId: string;
  sequence: ValidationItem[];
  onSequenceChange: (newSequence: ValidationItem[]) => void;
  availableFields?: Array<{ id: string; label: string; sectionId?: string }>;
}

/**
 * Zone de validation avec palette de types de validation.
 * Permet de construire visuellement des règles de validation avec l'API drag-and-drop HTML5 standard.
 */
const ValidationZone: React.FC<ValidationZoneProps> = ({
  validationId,
  sequence,
  onSequenceChange,
}) => {
  const [displaySequence, setDisplaySequence] = useState<ValidationItem[]>(sequence);
  const [isOver, setIsOver] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  // Mettre à jour l'affichage quand la séquence change
  useEffect(() => {
    setDisplaySequence(sequence);
  }, [sequence]);

  // Gérer le survol d'un élément draggable sur la zone de dépôt
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Vérifier s'il s'agit d'une valeur
    const hasValueType = e.dataTransfer.types.includes('application/x-validation-value');
    const hasJsonType = e.dataTransfer.types.includes('application/json');
    
    // Si c'est une valeur ou un autre type de données que nous pouvons gérer, montrer la zone active
    if (hasValueType || hasJsonType || e.dataTransfer.types.includes('field-id')) {
      setIsOver(true);
      e.dataTransfer.dropEffect = 'copy'; // Indiquer que nous acceptons le drop
    }
  };
  
  // Gérer la sortie d'un élément draggable de la zone de dépôt
  const handleDragLeave = () => {
    setIsOver(false);
  };
  
  // Gérer le dépôt d'un élément dans la zone de validation
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    
    try {
      // Afficher tous les types de données disponibles pour le debug
      console.log('Types de données disponibles:', e.dataTransfer.types);
      
      // Vérifier si nous avons une valeur spéciale
      const hasValueType = e.dataTransfer.types.includes('application/x-validation-value');
      if (hasValueType) {
        console.log('Détection d\'une valeur spéciale de validation');
      }
      
      // Vérifier d'abord si nous avons des données JSON (de nos palettes)
      let data = e.dataTransfer.getData('application/json');
      let itemData: any = null;
      
      if (data) {
        try {
          // Format JSON de DraggableItemHTML5
          itemData = JSON.parse(data);
          console.log('Données de l\'élément déposé (format JSON):', itemData);
          
          // Gestion spéciale pour les valeurs (true, false, null, etc.)
          if (itemData.type === 'value' && itemData.originalValue !== undefined) {
            console.log('Valeur originale détectée:', itemData.originalValue);
            // Utiliser la valeur JavaScript originale pour les valeurs spéciales
            itemData.value = itemData.originalValue;
          }
        } catch (error) {
          console.error('Erreur lors du parsing JSON:', error);
          console.log('Données brutes:', data);
        }
      } else {
        // Essayer le format des champs depuis SectionsFormulaire
        const fieldId = e.dataTransfer.getData('field-id');
        const fieldLabel = e.dataTransfer.getData('field-label');
        
        if (fieldId && fieldLabel) {
          console.log('Données de l\'élément déposé (format champ):', { fieldId, fieldLabel });
          itemData = {
            type: 'field',
            id: fieldId,
            value: fieldId,
            label: fieldLabel
          };
        } else {
          console.warn("Aucune donnée valide n'a été trouvée dans le transfert.");
          return;
        }
      }
      
      if (!itemData) {
        console.warn("Les données de l'élément ne sont pas valides");
        return;
      }
      
      // S'assurer que toutes les données requises sont présentes
      const draggedItem: ValidationItem = {
        type: itemData.type || 'unknown',
        id: itemData.id || `item-${Date.now()}`,
        value: itemData.value !== undefined ? itemData.value : itemData.id,
        label: itemData.label || 'Sans nom',
        referenceSectionId: itemData.referenceSectionId,
        originalValue: itemData.originalValue
      };
      
      // Pour les valeurs, nous voulons utiliser originalValue si disponible
      if (itemData.type === 'value' && itemData.originalValue !== undefined) {
        console.log('Valeur originale détectée:', itemData.originalValue);
        draggedItem.value = itemData.originalValue;
      }
      
      console.log('Élément ajouté à la séquence:', draggedItem);
      
      // Ajouter l'élément à la séquence
      const newSequence = [...displaySequence, draggedItem];
      onSequenceChange(newSequence);
      
      // Animation de feedback
      const dropzone = dropzoneRef.current;
      if (dropzone) {
        dropzone.classList.add('bg-green-50');
        setTimeout(() => {
          dropzone.classList.remove('bg-green-50');
        }, 300);
      }
    } catch (error) {
      console.error("Erreur lors de la gestion du glisser-déposer:", error);
    }
  };

  // Gérer la suppression d'un élément de la séquence
  const handleRemoveItem = (index: number) => {
    const newSequence = [...displaySequence];
    newSequence.splice(index, 1);
    onSequenceChange(newSequence);
  };

  // Écouter les événements de validation-sequence-item-added
  useEffect(() => {
    const handleCustomValueAdd = (e: Event) => {
      const event = e as CustomEvent;
      const item = event.detail as ValidationItem;
      if (item) {
        const newSequence = [...displaySequence, item];
        onSequenceChange(newSequence);
      }
    };

    // Ajouter l'écouteur d'événement
    document.addEventListener('validation-sequence-item-added', handleCustomValueAdd);

    // Nettoyer l'écouteur d'événement
    return () => {
      document.removeEventListener('validation-sequence-item-added', handleCustomValueAdd);
    };
  }, [displaySequence, onSequenceChange]);

  // Composant pour afficher un élément de séquence de validation
  const ValidationSequenceItem: React.FC<{
    item: ValidationItem;
    index: number; // Gardé pour référence future si nécessaire
    onRemove: () => void;
  }> = ({ item, onRemove }) => {
    // Déterminer la classe de couleur en fonction du type d'élément
    const getItemClasses = () => {
      switch(item.type) {
        case 'field':
          return 'bg-blue-50 border-blue-200 text-blue-700';
        case 'operator':
          return 'bg-purple-50 border-purple-200 text-purple-700';
        case 'value':
          return 'bg-green-50 border-green-200 text-green-700';
        case 'validation':
          return 'bg-orange-50 border-orange-200 text-orange-700';
        default:
          return 'bg-gray-50 border-gray-200 text-gray-700';
      }
    };

    return (
      <div className={`flex items-center gap-1 px-2 py-1 border rounded text-sm ${getItemClasses()}`}>
        <span>{item.label}</span>
        <button 
          onClick={onRemove}
          className="ml-1 text-gray-500 hover:text-gray-700"
          title="Retirer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Zone où déposer les éléments */}
      <div
        id={`validation-dropzone-${validationId}`}
        ref={dropzoneRef}
        className={`min-h-[100px] p-3 border-2 border-dashed rounded-md bg-white mb-4 relative transition-all ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/30'}`}
        data-droppable="true"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Zone de validation</span>
        </div>
        
        {displaySequence.length === 0 && (
          <div className="flex items-center justify-center h-[60px]">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Glissez les champs, opérateurs, valeurs ou types de validation ici</p>
            </div>
          </div>
        )}
        
        {/* Affichage des éléments de la séquence */}
        <div className="flex flex-wrap gap-2">
          {displaySequence.map((item, index) => (
            <ValidationSequenceItem
              key={`${item.type}-${item.id}-${index}`}
              item={item}
              index={index}
              onRemove={() => handleRemoveItem(index)}
            />
          ))}
        </div>
      </div>
      
      {/* Palette de types de validation */}
      <div className="mt-2">
        <h4 className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">Types de validation</h4>
        <div className="border rounded-md">
          <ValidationsPalette fieldId={validationId} />
        </div>
      </div>
    </div>
  );
};

export default ValidationZone;
