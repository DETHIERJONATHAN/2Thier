import React, { useEffect, useRef } from 'react';

interface DraggableItemProps {
  id: string;
  type: 'field' | 'action' | 'operator' | 'test' | 'formula';
  label: string;
  description?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'indigo' | 'gray';
  disabled?: boolean;
}

/**
 * Élément glissable pour les palettes de l'éditeur de dépendances
 * Utilise l'API de Drag & Drop HTML5
 */
const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  type,
  label,
  description,
  color = 'gray',
  disabled = false
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  // Initialisation des événements de drag après le rendu
  useEffect(() => {
    const element = elementRef.current;
    if (element && !disabled) {
      // Définir explicitement les attributs draggable
      element.setAttribute('draggable', 'true');
    }
  }, [disabled]);

  // Gestion du début du glissement
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Données au format JSON
    const data = {
      id,
      type,
      label,
      description
    };
    
    try {
      // Définir d'abord les types spécifiques pour une meilleure compatibilité
      switch (type) {
        case 'field':
          e.dataTransfer.setData('field-id', id);
          e.dataTransfer.setData('field-name', label);
          break;
        case 'action':
          e.dataTransfer.setData('dependency-action', id);
          break;
        case 'operator':
          e.dataTransfer.setData('dependency-operator', id);
          break;
        case 'formula':
          e.dataTransfer.setData('formula-id', id);
          break;
        case 'test':
          e.dataTransfer.setData('dependency-test', id);
          break;
      }
      
      // Ajouter les données au format JSON pour la compatibilité maximale
      // Toujours après les types spécifiques
      e.dataTransfer.setData('application/json', JSON.stringify(data));
      
      // Ajouter une version texte pour une compatibilité maximale
      e.dataTransfer.setData('text/plain', `${type}:${id}`);
      
    } catch (err) {
      console.error('Erreur lors du drag start:', err);
    }
    
    // Effet visuel pour le glisser
    e.dataTransfer.effectAllowed = 'copy';
    
    // Pour le debug
    console.log(`Début du glissement: ${type} - ${id}`);
  };
  
  // Classes CSS selon le type et la couleur
  const getStyles = () => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-700';
    let borderColor = 'border-gray-200';
    let hoverBg = 'hover:bg-gray-200';
    
    switch (color) {
      case 'blue':
        bgColor = 'bg-blue-50';
        textColor = 'text-blue-700';
        borderColor = 'border-blue-200';
        hoverBg = 'hover:bg-blue-100';
        break;
      case 'green':
        bgColor = 'bg-green-50';
        textColor = 'text-green-700';
        borderColor = 'border-green-200';
        hoverBg = 'hover:bg-green-100';
        break;
      case 'amber':
        bgColor = 'bg-amber-50';
        textColor = 'text-amber-700';
        borderColor = 'border-amber-200';
        hoverBg = 'hover:bg-amber-100';
        break;
      case 'purple':
        bgColor = 'bg-purple-50';
        textColor = 'text-purple-700';
        borderColor = 'border-purple-200';
        hoverBg = 'hover:bg-purple-100';
        break;
      case 'red':
        bgColor = 'bg-red-50';
        textColor = 'text-red-700';
        borderColor = 'border-red-200';
        hoverBg = 'hover:bg-red-100';
        break;
      case 'indigo':
        bgColor = 'bg-indigo-50';
        textColor = 'text-indigo-700';
        borderColor = 'border-indigo-200';
        hoverBg = 'hover:bg-indigo-100';
        break;
    }
    
    return `${bgColor} ${textColor} border ${borderColor} ${hoverBg} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`;
  };
  
  return (
    <div
      ref={elementRef}
      onDragStart={handleDragStart}
      className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-all ${getStyles()}`}
      title={description || label}
      data-id={id}
      data-type={type}
    >
      <span className="truncate">{label}</span>
      {!disabled && (
        <span className="ml-1 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </span>
      )}
    </div>
  );
};

export default DraggableItem;
