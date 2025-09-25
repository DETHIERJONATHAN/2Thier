import React, { useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import SortableValidationItemForSequence from './SortableValidationItemForSequence';
import { ValidationItem } from './types';

interface ValidationSequenceEditorProps {
  validation: any;
  updateSequence: (newSequence: ValidationItem[]) => void;
  sequence: ValidationItem[];
  availableFields: any[];
  availableSections: any[];
}

const ValidationSequenceEditor: React.FC<ValidationSequenceEditorProps> = (props) => {
  const { validation, updateSequence, sequence } = props;
  
  // Configuration des sensors pour le drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Activer le drag après 8px de mouvement pour éviter les clics accidentels
      },
    })
  );
  
  // Fonction pour supprimer un élément de la séquence
  const handleRemoveItem = useCallback((indexToRemove: number) => {
    if (indexToRemove >= 0 && indexToRemove < sequence.length) {
      const newSequence = [...sequence];
      newSequence.splice(indexToRemove, 1);
      updateSequence(newSequence);
    }
  }, [sequence, updateSequence]);
  
  // Gestion de la fin du drag-and-drop
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // Si l'élément a été déposé sur une zone valide
    if (event.over && event.over.id === `validation-dropzone-${validation.id}`) {
      // Récupérer les données de l'élément déplacé
      const draggedItem = event.active.data.current as ValidationItem;
      
      if (draggedItem && !sequence.some(item => item.id === draggedItem.id)) {
        // Ajouter l'élément à la séquence s'il n'y est pas déjà
        const newSequence = [...sequence, draggedItem];
        updateSequence(newSequence);
      }
    }
  }, [sequence, updateSequence, validation.id]);

  // Configurer le dropzone pour les éléments de validation
  const { setNodeRef, isOver } = useDroppable({
    id: `validation-dropzone-${validation.id}`,
    data: {
      type: 'validation-dropzone',
      validationId: validation.id
    }
  });

  // Générer la liste des ID pour la SortableContext
  const itemIds = sequence.map((item, index) => `${item.type}-${item.id || index}-${index}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={setNodeRef} 
        className={`min-h-[100px] p-2 border rounded-md ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'} transition-colors duration-200`}
      >
        {sequence.length === 0 ? (
          <div className="flex items-center justify-center h-[80px] text-gray-400">
            <p className="text-sm">Déposez ici les éléments...</p>
          </div>
        ) : (
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-1">
              {sequence.map((item, index) => (
                <SortableValidationItemForSequence
                  key={`${item.type}-${item.id || index}-${index}`}
                  id={`${item.type}-${item.id || index}-${index}`}
                  item={item}
                  index={index}
                  onRemove={() => handleRemoveItem(index)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
};

export default ValidationSequenceEditor;

