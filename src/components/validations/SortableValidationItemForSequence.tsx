import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ValidationItem } from './types';

interface SortableValidationItemForSequenceProps {
  id: string;
  item: ValidationItem;
  index: number;
  onRemove: (index: number) => void;
}

const SortableValidationItemForSequence: React.FC<SortableValidationItemForSequenceProps> = ({
  id,
  item,
  index,
  onRemove
}) => {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Déterminer la couleur de l'item selon son type
  let bgColor = 'bg-gray-100 hover:bg-gray-200';
  let borderColor = 'border-gray-300';
  let textColor = 'text-gray-800';
  
  switch (item.type) {
    case 'field':
      bgColor = 'bg-blue-50 hover:bg-blue-100';
      borderColor = 'border-blue-300';
      textColor = 'text-blue-800';
      break;
    case 'operator':
      bgColor = 'bg-purple-50 hover:bg-purple-100';
      borderColor = 'border-purple-300';
      textColor = 'text-purple-800';
      break;
    case 'value':
      bgColor = 'bg-green-50 hover:bg-green-100';
      borderColor = 'border-green-300';
      textColor = 'text-green-800';
      break;
    case 'reference-field':
      bgColor = 'bg-orange-50 hover:bg-orange-100';
      borderColor = 'border-orange-300';
      textColor = 'text-orange-800';
      break;
    case 'formula':
      bgColor = 'bg-red-50 hover:bg-red-100';
      borderColor = 'border-red-300';
      textColor = 'text-red-800';
      break;
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group px-3 py-1.5 rounded-md border ${borderColor} ${bgColor} ${textColor} flex items-center justify-between`}
      {...attributes}
    >
      <div className="flex items-center gap-2">
        <div 
          {...listeners} 
          className="cursor-grab hover:text-gray-600 hover:bg-gray-100 p-0.5 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M3 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
            <path fillRule="evenodd" d="M7 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
          </svg>
        </div>
        <span className="font-medium text-sm">
          {item.label}
        </span>
      </div>
      
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600 p-0.5 rounded"
        onClick={() => onRemove(index)}
        title="Supprimer l'élément"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
      </button>
    </div>
  );
};

export default SortableValidationItemForSequence;
