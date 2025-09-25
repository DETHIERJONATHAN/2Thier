import React from 'react';
import { ValidationItem } from './types';

interface DraggableItemProps {
  id: string;
  type: string;
  data: ValidationItem;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Composant qui rend un élément draggable pour le système de validation en utilisant l'API drag-and-drop HTML5.
 * Ce composant est utilisé pour les champs, les opérateurs, et les valeurs dans l'éditeur de validation.
 */
const DraggableItem: React.FC<DraggableItemProps> = ({ id, type, data, children, className = '', onClick }) => {
  // Gestionnaire pour le début du drag
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Assurer que le type et l'ID sont bien inclus dans les données
    const dragData = {
      ...data,
      type: type, // S'assurer que le type est bien inclus
      id: data.id, // S'assurer que l'ID est bien inclus
      draggableId: id, // Ajouter l'ID draggable pour référence
      _isHTML5Drag: true // Marquer comme un glisser-déposer HTML5 pour éviter les conflits avec d'autres bibliothèques
    };
    
    // Pour les valeurs, assurons-nous de bien gérer les valeurs spéciales
    if (type === 'value' && dragData.originalValue !== undefined) {
      console.log('[DraggableItemHTML5] Démarrage du drag pour une valeur avec originalValue:', dragData.originalValue);
    }
    
    // Définir les données pour le transfert
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    
    // Pour les valeurs, ajoutons aussi des données sous forme de texte pour faciliter le débogage
    if (type === 'value') {
      e.dataTransfer.setData('text/plain', String(dragData.label));
      // Ajoutons un type personnalisé pour marquer les valeurs
      e.dataTransfer.setData('application/x-validation-value', String(dragData.id));
    }
    
    // Définir l'effet de copie
    e.dataTransfer.effectAllowed = 'copy';
    
    // Ajouter une image fantôme facultative
    // Si on veut personnaliser l'image, on peut créer un élément canvas ou utiliser une image
    try {
      // Utiliser l'élément lui-même comme image de glisser-déposer
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, rect.height / 2);
    } catch (error) {
      console.warn('Impossible de définir l\'image de glisser-déposer:', error);
    }
  };
  
  return (
    <div
      id={id}
      draggable={true}
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing ${className} ${type}-item`}
      data-type={type}
      data-id={data.id}
    >
      {children}
    </div>
  );
};

export default DraggableItem;
