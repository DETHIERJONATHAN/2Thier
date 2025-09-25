import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormulaItem } from "../../store/slices/types";
import { Trash2 } from 'lucide-react';

interface SortableSequenceItemProps {
    id: string;
    item: FormulaItem;
    onRemove: () => void;
}

/**
 * Composant d'élément de séquence déplaçable par drag-and-drop
 */
const SortableSequenceItem: React.FC<SortableSequenceItemProps> = ({ id, item, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    };
    
    let display = '';
    let bgColor = 'bg-gray-200';
    if (item.type === 'field') {
        display = item.label || 'Champ inconnu';
        bgColor = 'bg-blue-100 text-blue-800';
    } else if (item.type === 'operator') {
        display = String(item.value);
        bgColor = 'bg-yellow-100 text-yellow-800';
    } else if (item.type === 'value') {
        display = String(item.value);
        bgColor = 'bg-green-100 text-green-800';
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`relative flex items-center gap-1 p-1 pl-2 pr-6 rounded shadow-sm touch-none cursor-grab ${bgColor}`}>
            <span className="font-medium text-xs">{display}</span>
            <button
                className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-100"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                title="Supprimer cet élément"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
};

export default SortableSequenceItem;


