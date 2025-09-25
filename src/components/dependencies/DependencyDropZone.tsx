import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import DependencyConditionDropZone from './DependencyConditionDropZone';

interface DependencyDropZoneProps {
  dependencyId: string;
}

const DependencyDropZone: React.FC<DependencyDropZoneProps> = ({ dependencyId }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Configuration de la zone de drop avec @dnd-kit
  const { isOver, setNodeRef } = useDroppable({
    id: `dependency-dropzone-${dependencyId}`,
    data: {
      type: 'dependency',
      dependencyId
    }
  });
  
  return (
    <div 
      ref={setNodeRef}
      className={`p-4 border-2 rounded-md transition-all ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-sm text-gray-500 mb-2">
        {isOver 
          ? "Déposez le champ ici..." 
          : "Glissez et déposez un champ ici pour créer une condition"}
      </div>
      
      {/* Exemple de condition */}
      <DependencyConditionDropZone 
        dependencyId={dependencyId}
        conditionId="condition-example"
      />
    </div>
  );
};

export default DependencyDropZone;