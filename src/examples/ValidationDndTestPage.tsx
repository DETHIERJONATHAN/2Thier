import React, { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors 
} from '@dnd-kit/core';

/**
 * Composant de test pour le contexte DnD
 * Ce composant montre comment implémenter un DndContext
 * dans une application React
 */
const ValidationDndTestPage: React.FC = () => {
  const [items, setItems] = useState([
    { id: 'item-1', content: 'Champ: Nom' },
    { id: 'item-2', content: 'Opérateur: Égal à' },
    { id: 'item-3', content: 'Valeur: "test"' }
  ]);
  
  const [droppedItems, setDroppedItems] = useState<Array<{ id: string, content: string }>>([]);
  
  // Configuration des sensors pour le drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Activer le drag après 8px de mouvement
      }
    }),
    useSensor(KeyboardSensor)
  );

  // Gestion de la fin du drag-and-drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag end:', { active, over });
    
    // Si l'élément a été déposé dans la zone de drop
    if (over && over.id === 'droppable') {
      // Trouver l'élément déplacé
      const draggedItem = items.find(item => item.id === active.id);
      if (draggedItem) {
        // Ajouter l'élément à la liste des éléments déposés
        setDroppedItems([...droppedItems, draggedItem]);
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Test de Drag and Drop</h1>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex">
          {/* Colonne des éléments draggables */}
          <div className="w-1/3 p-4 bg-gray-100 rounded">
            <h2 className="font-medium mb-4">Éléments disponibles</h2>
            <div className="space-y-2">
              {items.map(item => (
                <Draggable key={item.id} id={item.id}>
                  <div className="bg-white p-2 rounded shadow border">
                    {item.content}
                  </div>
                </Draggable>
              ))}
            </div>
          </div>
          
          {/* Zone de drop */}
          <div className="w-2/3 ml-4">
            <h2 className="font-medium mb-4">Zone de validation</h2>
            <Droppable id="droppable">
              <div className="min-h-[200px] p-4 border-2 border-dashed rounded">
                {droppedItems.length === 0 ? (
                  <div className="text-gray-400 flex items-center justify-center h-full">
                    Déposez des éléments ici
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {droppedItems.map((item, index) => (
                      <div 
                        key={`${item.id}-${index}`} 
                        className="bg-white p-2 rounded shadow border"
                      >
                        {item.content}
                        <button 
                          className="ml-2 text-red-500"
                          onClick={() => {
                            const newItems = [...droppedItems];
                            newItems.splice(index, 1);
                            setDroppedItems(newItems);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Droppable>
          </div>
        </div>
      </DndContext>
    </div>
  );
};

// Composant pour les éléments draggables
const Draggable = ({ children, id }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000
  } : undefined;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
};

// Composant pour la zone de drop
const Droppable = ({ children, id }) => {
  const { isOver, setNodeRef } = useDroppable({
    id
  });
  
  const style = {
    backgroundColor: isOver ? '#f0f9ff' : undefined,
    borderColor: isOver ? '#3b82f6' : undefined
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="transition-colors"
    >
      {children}
    </div>
  );
};

export default ValidationDndTestPage;
