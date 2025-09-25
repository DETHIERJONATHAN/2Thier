import React, { useState, useEffect } from 'react';
import DraggableItem from './DraggableItem';

interface DependenciesPaletteProps {
  dependencyId: string;
}

/**
 * Palette des actions de dépendance utilisables dans l'éditeur
 */
const DependenciesPalette: React.FC<DependenciesPaletteProps> = ({ dependencyId }) => {
  // État pour contrôler si la palette est prête à être rendue
  const [isReady, setIsReady] = useState(false);

  // Effet pour initialiser les éléments draggables après le rendu initial
  useEffect(() => {
    // Délai court pour s'assurer que le DOM est prêt
    const timer = setTimeout(() => {
      setIsReady(true);
      console.log('DependenciesPalette initialized');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Groupes d'actions disponibles pour les dépendances
  const actionGroups = [
    {
      name: 'Visibilité',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      actions: [
        { id: 'show', label: 'Afficher', description: 'Rendre le champ visible' },
        { id: 'hide', label: 'Masquer', description: 'Rendre le champ invisible' }
      ]
    },
    {
      name: 'Activation',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      actions: [
        { id: 'enable', label: 'Activer', description: 'Activer le champ' },
        { id: 'disable', label: 'Désactiver', description: 'Désactiver le champ' }
      ]
    },
    {
      name: 'Obligation',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      actions: [
        { id: 'require', label: 'Obligatoire', description: 'Rendre le champ obligatoire' },
        { id: 'optional', label: 'Facultatif', description: 'Rendre le champ facultatif' }
      ]
    },
    {
      name: 'Valeur',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800',
      actions: [
        { id: 'prefill', label: 'Prérenseigner', description: 'Préremplir le champ avec une valeur' },
        { id: 'clear', label: 'Effacer', description: 'Effacer la valeur du champ' }
      ]
    },
  ];

  // Opérateurs logiques
  const operators = [
    { id: 'if', label: 'IF', description: 'Condition IF' },
    { id: 'and', label: 'AND', description: 'Opérateur logique ET' },
    { id: 'or', label: 'OR', description: 'Opérateur logique OU' },
    { id: 'not', label: 'NOT', description: 'Négation logique' }
  ];

  // Tests de valeur
  const valueTests = [
    { id: 'is_null', label: 'null', description: 'Est null' },
    { id: 'is_empty', label: 'vide', description: 'Est vide' },
    { id: 'equals', label: 'égal', description: 'Est égal à' },
    { id: 'not_equals', label: 'différent', description: "N'est pas égal à" },
    { id: 'in', label: 'dans liste', description: 'Est dans la liste' },
    { id: 'gt', label: 'sup. à', description: 'Est supérieur à' },
    { id: 'lt', label: 'inf. à', description: 'Est inférieur à' }
  ];

  return (
    <div className="p-3">
      {/* Actions de dépendance */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 mb-2 pb-1 border-b border-gray-100">Actions</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isReady ? (
            actionGroups.map((group) => (
              <div 
                key={group.name}
                className={`${group.bgColor} ${group.borderColor} border rounded-md p-2`}
              >
                <h6 className={`text-xs font-medium ${group.textColor} mb-1 text-center`}>{group.name}</h6>
                <div className="flex flex-col gap-1">
                  {group.actions.map((action) => (
                    <DraggableItem
                      key={action.id}
                      id={action.id}
                      type="action"
                      label={action.label}
                      description={action.description}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 py-2 text-center text-sm text-gray-400">
              Chargement des actions...
            </div>
          )}
        </div>
      </div>
      
      {/* Opérateurs logiques */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 mb-2 pb-1 border-b border-gray-100">Opérateurs logiques</h5>
        <div className="flex flex-wrap gap-1">
          {isReady ? (
            operators.map((op) => (
              <DraggableItem
                key={op.id}
                id={op.id}
                type="operator"
                label={op.label}
                description={op.description}
                color="indigo"
              />
            ))
          ) : (
            <div className="w-full py-2 text-center text-sm text-gray-400">
              Chargement des opérateurs...
            </div>
          )}
        </div>
      </div>
      
      {/* Tests de valeur */}
      <div>
        <h5 className="text-xs font-medium text-gray-700 mb-2 pb-1 border-b border-gray-100">Tests de valeur</h5>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
          {isReady ? (
            valueTests.map((test) => (
              <DraggableItem
                key={test.id}
                id={test.id}
                type="test"
                label={test.label}
                description={test.description}
                color="red"
              />
            ))
          ) : (
            <div className="col-span-4 py-2 text-center text-sm text-gray-400">
              Chargement des tests...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DependenciesPalette;
