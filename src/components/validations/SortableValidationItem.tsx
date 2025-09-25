import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FieldValidation } from "../../store/slices/types";
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface SortableValidationItemProps {
  validation: FieldValidation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}

const SortableValidationItem: React.FC<SortableValidationItemProps> = ({
  validation,
  isExpanded,
  onToggleExpand,
  onDelete
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: validation.id,
    data: { type: 'validation-item', validationId: validation.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  // Formatage de l'aperçu de la séquence de validation
  const sequencePreview = () => {
    if (!validation.sequence) return 'Aucune condition';
    
    const leftPart = validation.sequence.validationSequence
      ?.map(item => item.type === 'field' ? (item.label || `[${item.id}]`) : item.value)
      .join(' ') || 'Valeur du champ';
    
    const operator = validation.sequence.operator || '==';
    
    const rightPart = validation.sequence.comparisonSequence
      ?.map(item => item.type === 'field' ? (item.label || `[${item.id}]`) : item.value)
      .join(' ') || 'Valeur de comparaison';
    
    return `${leftPart} ${operator} ${rightPart}`;
  };

  const errorMessage = validation.sequence?.errorMessage || 'Valeur invalide';
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`p-2 rounded transition-shadow ${
        isExpanded ? 'bg-blue-100 ring-1 ring-blue-300' : 'bg-white'
      } ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-2">
        <span 
          {...attributes} 
          {...listeners} 
          className="cursor-grab text-gray-400 p-1 touch-none"
        >
          <GripVertical size={16} />
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-blue-700 truncate">{validation.name || '(Sans nom)'}</div>
          <div className="text-gray-600 font-mono text-[11px] truncate" title={sequencePreview()}>
            {sequencePreview()}
          </div>
          <div className="text-red-600 text-[10px]">
            <span className="inline-block bg-red-100 px-1 rounded">Message: {errorMessage}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            className="btn btn-xs btn-ghost text-red-600 hover:text-red-800 p-1" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }} 
            title="Supprimer la validation"
          >
            <Trash2 size={14} />
          </button>
          
          <button 
            className="btn btn-xs btn-ghost p-1" 
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }} 
            title={isExpanded ? 'Réduire' : 'Développer'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortableValidationItem;


