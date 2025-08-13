import React, { useState } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import DraggableItem from '../components/validations/DraggableItem';
import { ValidationItem } from '../components/validations/types';

// Exemple d'utilisation du composant DraggableItem
const DraggableExample: React.FC = () => {
  const [dropItems, setDropItems] = useState<ValidationItem[]>([]);
  
  // Configuration des sensors pour le drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Activer le drag après 8px de mouvement pour éviter les clics accidentels
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  // Gestion de la fin du drag-and-drop
  const handleDragEnd = (event: DragEndEvent) => {
    console.log('Drag end:', event);
    
    // Si l'élément a été déposé sur une zone valide
    if (event.over && event.over.id === 'drop-zone') {
      // Récupérer les données de l'élément déplacé
      const draggedItem = event.active.data.current as ValidationItem;
      if (draggedItem) {
        console.log('Item déposé:', draggedItem);
        // Ajouter l'élément à la séquence
        setDropItems([...dropItems, draggedItem]);
      }
    }
  };
  
  // Configuration du dropzone
  const { setNodeRef, isOver } = useDroppable({
    id: 'drop-zone'
  });
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4">
        <h2 className="text-lg font-medium mb-4">Exemple de Validation avec Drag and Drop</h2>
        
        <div className="grid grid-cols-5 gap-4">
          {/* Zone de drop pour les éléments */}
          <div className="col-span-3">
            <h3 className="font-medium mb-2">Zone de validation</h3>
            <div 
              ref={setNodeRef}
              className={`min-h-[200px] p-4 rounded-lg border-2 ${
                isOver 
                  ? 'border-blue-500 bg-blue-50 border-dashed' 
                  : 'border-gray-300 border-dashed'
              }`}
            >
              {dropItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Déposez des éléments ici
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dropItems.map((item, index) => (
                    <div 
                      key={`${item.type}-${item.id}-${index}`}
                      className="bg-white p-2 rounded shadow border border-gray-200"
                    >
                      {item.label}
                      <button 
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => {
                          const newItems = [...dropItems];
                          newItems.splice(index, 1);
                          setDropItems(newItems);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Liste des éléments draggables */}
          <div className="col-span-2">
            <div className="bg-gray-100 p-3 rounded mb-4">
              <h3 className="font-medium mb-2">Champs</h3>
              
              <DraggableItem 
                id="field-1" 
                type="reference-field"
                data={{ 
                  type: 'reference-field',
                  id: 'field-1',
                  value: 'field-1',
                  label: 'Nom',
                  referenceFieldId: 'field-1'
                }}
              >
                <div className="bg-white p-2 border rounded shadow-sm">
                  Champ: Nom
                </div>
              </DraggableItem>
            </div>
            
            <div className="bg-gray-100 p-3 rounded mb-4">
              <h3 className="font-medium mb-2">Opérateurs</h3>
              
              <div className="space-y-2">
                <DraggableItem 
                  id="op-1" 
                  type="operator"
                  data={{ 
                    type: 'operator',
                    id: 'op-1',
                    value: '==',
                    label: 'Égal à'
                  }}
                >
                  <div className="bg-white p-2 border rounded shadow-sm">
                    Opérateur: Égal à
                  </div>
                </DraggableItem>
                
                <DraggableItem 
                  id="op-2" 
                  type="operator"
                  data={{ 
                    type: 'operator',
                    id: 'op-2',
                    value: '!=',
                    label: 'Différent de'
                  }}
                >
                  <div className="bg-white p-2 border rounded shadow-sm">
                    Opérateur: Différent de
                  </div>
                </DraggableItem>
              </div>
            </div>
            
            <div className="bg-gray-100 p-3 rounded">
              <h3 className="font-medium mb-2">Valeurs</h3>
              
              <div className="space-y-2">
                <DraggableItem 
                  id="val-1" 
                  type="value"
                  data={{ 
                    type: 'value',
                    id: 'val-1',
                    value: 'test',
                    label: 'test'
                  }}
                >
                  <div className="bg-white p-2 border rounded shadow-sm">
                    Valeur: "test"
                  </div>
                </DraggableItem>
                
                <DraggableItem 
                  id="val-2" 
                  type="value"
                  data={{ 
                    type: 'value',
                    id: 'val-2',
                    value: '10',
                    label: '10'
                  }}
                >
                  <div className="bg-white p-2 border rounded shadow-sm">
                    Valeur: 10
                  </div>
                </DraggableItem>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default DraggableExample;
