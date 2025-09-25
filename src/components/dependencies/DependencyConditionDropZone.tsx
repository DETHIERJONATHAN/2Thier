import React, { useCallback } from 'react';

interface DependencyConditionDropZoneProps {
  dependencyId: string;
  conditionId: string;
}

const DependencyConditionDropZone: React.FC<DependencyConditionDropZoneProps> = ({ 
  dependencyId, 
  conditionId 
}) => {
  // Implémentation simplifiée - à développer selon les besoins
  const handleRemoveCondition = useCallback(() => {
    console.log(`Removing condition ${conditionId} from dependency ${dependencyId}`);
    // Ici, implémentez la logique pour supprimer cette condition
  }, [dependencyId, conditionId]);

  return (
    <div className="bg-gray-100 p-3 rounded-md mb-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Condition exemple</span>
        <button 
          onClick={handleRemoveCondition}
          className="text-red-500 hover:text-red-700"
        >
          <span className="sr-only">Supprimer</span>
          &times;
        </button>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        Exemple: Si champ X est égal à "Valeur"
      </div>
    </div>
  );
};

export default DependencyConditionDropZone;
