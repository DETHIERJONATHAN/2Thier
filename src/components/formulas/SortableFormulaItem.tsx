import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

// Déclaration pour étendre Window avec notre propriété de débogage
declare global {
    interface Window {
        lastDeleteClickTime?: number;
    }
}

interface SortableFormulaItemProps {
    id: string;
    item: {
        type: 'field' | 'operator' | 'value' | 'function';
        label?: string;
        value?: any;
        id?: string;
    };
    formulaId: string;
    onRemove: () => void;
}

/**
 * Élément de formule déplaçable pour le drag-and-drop
 */
const SortableFormulaItem: React.FC<SortableFormulaItemProps> = ({ id, item, formulaId, onRemove }) => {
    // Référence à l'ID de formule pour le rendre stable pendant le drag-and-drop
    const formulaIdRef = useRef(formulaId);
    
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        data: {
            type: 'formula-item',
            item,
            formulaId: formulaIdRef.current,
        },
    });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    };

    const getBackgroundColor = () => {
        switch (item.type) {
            case 'field':
                return 'bg-blue-100 border-blue-300';
            case 'operator':
                return 'bg-orange-100 border-orange-300';
            case 'value':
                return 'bg-gray-100 border-gray-300';
            default:
                return 'bg-gray-100 border-gray-300';
        }
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
        // Empêche l'événement de se propager aux gestionnaires de drag-and-drop
        e.stopPropagation();
        e.preventDefault();
        
        // Log pour confirmer que le clic est bien enregistré
        console.log(`[SortableFormulaItem] ✅ Clic sur supprimer pour l'élément:`, item);
        
        // Enregistrer l'heure du clic pour le débogage
        (window as any).lastDeleteClickTime = Date.now();
        
        // Appeler la fonction de suppression passée en props
        onRemove();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`flex items-center p-2 rounded-md shadow-sm border ${getBackgroundColor()} text-sm font-medium text-gray-800 relative group`}
        >
            {/* Poignée de Drag-and-Drop */}
            <div {...listeners} className="cursor-grab touch-none p-1">
                <GripVertical size={16} className="text-gray-500" />
            </div>

            {/* Contenu de l'élément */}
            <span className="mx-2 select-none">{item.label || item.value}</span>

            {/* Bouton de suppression */}
            <button
                type="button"
                onClick={handleRemoveClick}
                // onPointerDown est crucial ici pour arrêter la propagation avant que dnd-kit ne la capture
                onPointerDown={(e) => e.stopPropagation()}
                className="ml-2 p-1 rounded-full bg-red-200 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default SortableFormulaItem;


