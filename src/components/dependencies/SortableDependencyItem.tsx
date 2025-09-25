import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FieldDependency } from "../../store/slices/types";
import { Trash2, GripVertical } from 'lucide-react';
import { renderSequenceToString } from './dependencyUtils';

interface SortableDependencyItemProps {
  dependency: FieldDependency;
  fieldId: string;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
}

/**
 * Élément de dépendance sortable dans la liste
 */
const SortableDependencyItem: React.FC<SortableDependencyItemProps> = ({ 
  dependency, 
  fieldId, 
  onEdit, 
  onDelete, 
  isEditing 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: dependency.id,
    data: { type: 'dependency-item', fieldId: fieldId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  // Convertir les conditions en texte lisible pour l'affichage
  const conditionString = dependency.sequence?.conditions
    .map(cond => `( ${renderSequenceToString(cond)} )`)
    .join(' ET ');

  return (
    <div ref={setNodeRef} style={style} className={`p-2 rounded transition-shadow ${isEditing ? 'bg-blue-100 ring-1 ring-blue-300' : 'bg-white'} ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}>
        <div className="flex items-center gap-2">
            <span {...attributes} {...listeners} className="cursor-grab text-gray-400 p-1 touch-none"><GripVertical size={16} /></span>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-blue-700 truncate">{dependency.name || '(Sans nom)'}</div>
                <div className="text-gray-600 font-mono text-[11px] truncate" title={conditionString}>
                    SI {conditionString || <span className="italic text-gray-400">aucune condition</span>} ALORS {dependency.sequence?.action}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button className="btn btn-xs btn-ghost text-red-600 hover:text-red-800 p-1" onClick={onDelete} title="Supprimer la dépendance"><Trash2 size={14} /></button>
                <button className="btn btn-xs btn-ghost p-1" onClick={onEdit} title={isEditing ? 'Fermer' : 'Éditer la dépendance'}>{isEditing ? 'Fermer' : 'Éditer'}</button>
            </div>
        </div>
    </div>
  );
};

export default SortableDependencyItem;


