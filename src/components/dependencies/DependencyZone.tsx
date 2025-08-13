import React, { useState, useEffect, useRef } from 'react';
import { Dependency, DependencyCondition } from './types';
import DependenciesPalette from './DependenciesPalette';

// Types pour les éléments draggables
interface DraggableAction {
  id: string;
  type: 'action';
  label: string;
  color?: string;
  icon?: string;
}

interface DraggableOperator {
  id: string;
  type: 'operator';
  label: string;
}

interface DraggableTest {
  id: string;
  type: 'test';
  label: string;
}

type DraggableItem = DraggableAction | DraggableOperator | DraggableTest;

interface DependencyZoneProps {
  dependencyId: string;
  conditions: DependencyCondition[];
  onConditionsChange: (newConditions: DependencyCondition[]) => void;
  availableFields?: Array<{ id: string; name: string }>;
}

/**
 * Zone de dépendance avec palette d'actions et d'opérations.
 * Permet de construire visuellement des règles de dépendance avec l'API drag-and-drop HTML5 standard.
 */
const DependencyZone: React.FC<DependencyZoneProps> = ({
  dependencyId,
  conditions,
  onConditionsChange,
  availableFields = []
}) => {
  const [displayConditions, setDisplayConditions] = useState<DependencyCondition[]>(conditions);
  const [isOver, setIsOver] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showActionFeedback, setShowActionFeedback] = useState(false);
  const [droppedItems, setDroppedItems] = useState<DraggableItem[]>([]);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  // Mettre à jour l'affichage quand les conditions changent
  useEffect(() => {
    setDisplayConditions(conditions);
  }, [conditions]);
  
  // Marquer le composant comme prêt après le premier rendu
  useEffect(() => {
    // Petit délai pour s'assurer que tout est bien rendu
    const readyTimer = setTimeout(() => {
      setIsReady(true);
      console.log(`Zone de dépendance ${dependencyId} prête`);
    }, 300);
    
    return () => clearTimeout(readyTimer);
  }, [dependencyId]);

  // Gérer le survol d'un élément draggable sur la zone de dépôt
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Vérifier les types de données
    const hasJsonType = e.dataTransfer.types.includes('application/json');
    const hasFieldType = e.dataTransfer.types.includes('field-id');
    const hasActionType = e.dataTransfer.types.includes('dependency-action');
    const hasOperatorType = e.dataTransfer.types.includes('dependency-operator');
    const hasTestType = e.dataTransfer.types.includes('dependency-test');
    
    // Si c'est une donnée que nous pouvons gérer, montrer la zone active
    if (hasJsonType || hasFieldType || hasActionType || hasOperatorType || hasTestType) {
      setIsOver(true);
      e.dataTransfer.dropEffect = 'copy'; // Indiquer que nous acceptons le drop
    }
  };
  
  // Gérer la sortie d'un élément draggable de la zone de dépôt
  const handleDragLeave = () => {
    setIsOver(false);
  };
  
  // Gérer le dépôt d'un élément dans la zone de dépendance
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    
    if (!isReady) {
      console.warn("La zone de dépôt n'est pas encore prête");
      return;
    }
    
    try {
      // Afficher tous les types de données disponibles pour le debug
      console.log('Types de données disponibles:', e.dataTransfer.types);
      
      // Vérifier directement si nous avons une action de dépendance (prioritaire)
      const actionType = e.dataTransfer.getData('dependency-action');
      
      if (actionType) {
        console.log(`Action de dépendance détectée: ${actionType}`);
        
        // Récupérer d'autres attributs visuels si disponibles
        const actionColor = e.dataTransfer.getData('action-color') || '';
        const actionIcon = e.dataTransfer.getData('action-icon') || '';
        const actionLabel = e.dataTransfer.getData('field-name') || actionType;
        
        // Créer et déclencher un événement personnalisé
        const actionEvent = new CustomEvent('dependency-action-added', {
          detail: {
            dependencyId,
            actionType,
            actionColor,
            actionIcon,
            actionLabel
          },
          bubbles: true
        });
        
        console.log(`Dispatching action event for: ${actionType} on dependency: ${dependencyId}`);
        document.dispatchEvent(actionEvent);
        
        // Feedback visuel temporaire
        setShowActionFeedback(true);
        setTimeout(() => setShowActionFeedback(false), 1500);
        
        // Ajouter l'élément à la liste des éléments déposés (affichage permanent)
        setDroppedItems(prev => [...prev, {
          id: `action-${Date.now()}`,
          type: 'action',
          label: getActionLabel(actionType),
          color: getActionColor(actionType),
          icon: getActionIcon(actionType)
        }]);
        
        return;
      }
      
      // Vérifier s'il s'agit d'un opérateur
      const operatorType = e.dataTransfer.getData('dependency-operator');
      if (operatorType) {
        console.log(`Opérateur de dépendance détecté: ${operatorType}`);
        
        // Créer et déclencher un événement personnalisé
        const operatorEvent = new CustomEvent('dependency-operator-added', {
          detail: {
            dependencyId,
            operatorType
          },
          bubbles: true
        });
        
        document.dispatchEvent(operatorEvent);
        
        // Ajouter l'opérateur à la liste des éléments déposés (affichage permanent)
        setDroppedItems(prev => [...prev, {
          id: `operator-${Date.now()}`,
          type: 'operator',
          label: operatorType.toUpperCase()
        }]);
        
        return;
      }
      
      // Vérifier s'il s'agit d'un test
      const testType = e.dataTransfer.getData('dependency-test');
      if (testType) {
        console.log(`Test de dépendance détecté: ${testType}`);
        
        // Créer et déclencher un événement personnalisé
        const testEvent = new CustomEvent('dependency-test-added', {
          detail: {
            dependencyId,
            testType
          },
          bubbles: true
        });
        
        document.dispatchEvent(testEvent);
        
        // Ajouter le test à la liste des éléments déposés (affichage permanent)
        setDroppedItems(prev => [...prev, {
          id: `test-${Date.now()}`,
          type: 'test',
          label: getTestLabel(testType)
        }]);
        
        return;
      }
      
      // Ensuite, vérifier les données JSON
      let data = e.dataTransfer.getData('application/json');
      let itemData: any = null;
      
      if (data) {
        try {
          itemData = JSON.parse(data);
          console.log('Données de l\'élément déposé (format JSON):', itemData);
        } catch (error) {
          console.error('Erreur lors du parsing JSON:', error);
          console.log('Données brutes:', data);
        }
      } else {
        // Essayer le format des champs
        const fieldId = e.dataTransfer.getData('field-id');
        const fieldName = e.dataTransfer.getData('field-name') || e.dataTransfer.getData('field-label');
        
        if (fieldId) {
          console.log('Données de l\'élément déposé (format champ):', { fieldId, fieldName });
          itemData = {
            type: 'field',
            id: fieldId,
            name: fieldName || `Champ ${fieldId}`
          };
        } 
        
        // Vérifier si c'est une action de dépendance
        const actionType = e.dataTransfer.getData('dependency-action');
        if (actionType) {
          console.log('Action de dépendance détectée:', actionType);
          itemData = {
            type: 'action',
            id: actionType,
            name: actionType
          };
        }
        
        if (!itemData) {
          console.warn("Aucune donnée valide n'a été trouvée dans le transfert.");
          return;
        }
      }
      
      if (!itemData) {
        console.warn("Les données de l'élément ne sont pas valides");
        return;
      }
      
      // Créer une nouvelle condition selon le type d'élément
      let newCondition: DependencyCondition | null = null;
      
      switch (itemData.type) {
        case 'field':
          newCondition = {
            id: `condition-${Date.now()}`,
            targetFieldId: itemData.id,
            operator: 'equals',
            value: ''
          };
          break;
          
        case 'action':
          // Ajouter l'action à la liste des éléments déposés
          setDroppedItems(prev => [...prev, {
            id: `action-${Date.now()}`,
            type: 'action',
            label: getActionLabel(itemData.id),
            color: getActionColor(itemData.id),
            icon: getActionIcon(itemData.id)
          }]);
          
          // Nous allons traiter les actions spécialement via un événement personnalisé
          const actionEvent = new CustomEvent('dependency-action-added', {
            detail: {
              dependencyId,
              actionType: itemData.id
            },
            bubbles: true, // S'assurer que l'événement remonte dans le DOM
            cancelable: true
          });
          
          console.log(`Dispatching action event for: ${itemData.id} on dependency: ${dependencyId}`);
          
          // Dispatch l'événement directement sur document pour assurer sa propagation
          document.dispatchEvent(actionEvent);
          
          // Afficher un retour visuel pour confirmer que l'action a été prise en compte
          setShowActionFeedback(true);
          setTimeout(() => setShowActionFeedback(false), 2000);
          
          break;
          
        case 'operator':
          // Ajouter l'opérateur à la liste des éléments déposés
          setDroppedItems(prev => [...prev, {
            id: `operator-${Date.now()}`,
            type: 'operator',
            label: itemData.id.toUpperCase()
          }]);
          break;
          
        case 'test':
          // Ajouter le test à la liste des éléments déposés
          setDroppedItems(prev => [...prev, {
            id: `test-${Date.now()}`,
            type: 'test',
            label: getTestLabel(itemData.id)
          }]);
          break;
          
        case 'formula':
          // Formules - à implémenter
          const formulaEvent = new CustomEvent('dependency-formula-added', {
            detail: {
              dependencyId,
              formulaId: itemData.id
            }
          });
          document.dispatchEvent(formulaEvent);
          break;
      }
      
      // Si nous avons une nouvelle condition, l'ajouter à la liste
      if (newCondition) {
        console.log('Nouvelle condition ajoutée:', newCondition);
        const newConditions = [...displayConditions, newCondition];
        onConditionsChange(newConditions);
        
        // Animation de feedback
        const dropzone = dropzoneRef.current;
        if (dropzone) {
          dropzone.classList.add('bg-green-50');
          setTimeout(() => {
            dropzone.classList.remove('bg-green-50');
          }, 300);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la gestion du glisser-déposer:", error);
    }
  };

  // Fonction pour supprimer un élément déposé
  const handleRemoveDroppedItem = (itemId: string) => {
    setDroppedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Gérer la suppression d'une condition
  const handleRemoveCondition = (index: number) => {
    const newConditions = [...displayConditions];
    newConditions.splice(index, 1);
    onConditionsChange(newConditions);
  };

  // Fonctions helper pour obtenir les styles et libellés
  const getActionColor = (action: string): string => {
    switch(action) {
      case 'show':
      case 'hide':
        return 'blue';
      case 'enable':
      case 'disable':
        return 'green';
      case 'require':
      case 'optional':
        return 'amber';
      case 'prefill':
      case 'clear':
        return 'purple';
      default:
        return 'gray';
    }
  };
  
  const getActionIcon = (action: string): string => {
    switch(action) {
      case 'show': return '👁️';
      case 'hide': return '👁️‍🗨️';
      case 'enable': return '✅';
      case 'disable': return '❌';
      case 'require': return '⚠️';
      case 'optional': return '📝';
      case 'prefill': return '✏️';
      case 'clear': return '🧹';
      default: return '🔄';
    }
  };
  
  const getActionLabel = (action: string): string => {
    switch(action) {
      case 'show': return 'Afficher';
      case 'hide': return 'Masquer';
      case 'enable': return 'Activer';
      case 'disable': return 'Désactiver';
      case 'require': return 'Rendre obligatoire';
      case 'optional': return 'Rendre facultatif';
      case 'prefill': return 'Préremplir';
      case 'clear': return 'Effacer';
      default: return action;
    }
  };
  
  const getTestLabel = (test: string): string => {
    switch(test) {
      case 'is_null': return 'Est null';
      case 'is_empty': return 'Est vide';
      case 'equals': return 'Est égal à';
      case 'not_equals': return "N'est pas égal à";
      case 'in': return 'Est dans la liste';
      case 'gt': return 'Est supérieur à';
      case 'lt': return 'Est inférieur à';
      default: return test;
    }
  };

  // Composant pour afficher une condition
  const ConditionItem: React.FC<{
    condition: DependencyCondition;
    index: number;
    onRemove: () => void;
  }> = ({ condition, onRemove }) => {
    // Trouver le nom du champ correspondant
    const field = availableFields.find(f => f.id === condition.targetFieldId);
    
    return (
      <div className="flex items-center gap-1 px-2 py-1 border border-blue-200 bg-blue-50 text-blue-700 rounded text-sm">
        <span>{field?.name || condition.targetFieldId}</span>
        <span className="text-xs mx-1">
          {condition.operator === 'equals' ? 'est égal à' : 
           condition.operator === 'not_equals' ? "n'est pas égal à" :
           condition.operator === 'contains' ? 'contient' :
           condition.operator === 'is_empty' ? 'est vide' : "n'est pas vide"}
        </span>
        {condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' && (
          <span className="bg-gray-100 px-1 py-0.5 text-xs rounded">{condition.value || "(aucune valeur)"}</span>
        )}
        <button 
          onClick={onRemove}
          className="ml-1 text-gray-500 hover:text-gray-700"
          title="Retirer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    );
  };
  
  // Composants pour afficher les éléments déposés
  const ActionItem: React.FC<{
    item: DraggableAction;
    onRemove: () => void;
  }> = ({ item, onRemove }) => {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 border border-${item.color || 'gray'}-200 bg-${item.color || 'gray'}-50 text-${item.color || 'gray'}-700 rounded text-sm`}>
        <span>{item.icon || '🔄'}</span>
        <span className="text-xs font-medium">{item.label}</span>
        <button 
          onClick={onRemove}
          className="ml-1 text-gray-500 hover:text-gray-700"
          title="Retirer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    );
  };
  
  const OperatorItem: React.FC<{
    item: DraggableOperator;
    onRemove: () => void;
  }> = ({ item, onRemove }) => {
    return (
      <div className="flex items-center gap-1 px-2 py-1 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded text-sm">
        <span>⚙️</span>
        <span className="text-xs font-bold">{item.label}</span>
        <button 
          onClick={onRemove}
          className="ml-1 text-gray-500 hover:text-gray-700"
          title="Retirer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    );
  };
  
  const TestItem: React.FC<{
    item: DraggableTest;
    onRemove: () => void;
  }> = ({ item, onRemove }) => {
    return (
      <div className="flex items-center gap-1 px-2 py-1 border border-red-200 bg-red-50 text-red-700 rounded text-sm">
        <span>🔍</span>
        <span className="text-xs font-medium">{item.label}</span>
        <button 
          onClick={onRemove}
          className="ml-1 text-gray-500 hover:text-gray-700"
          title="Retirer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Zone où déposer les éléments */}
      <div
        id={`dependency-dropzone-${dependencyId}`}
        ref={dropzoneRef}
        className={`min-h-[100px] p-3 border-2 border-dashed rounded-md bg-white mb-4 relative transition-all ${
          isOver ? 'border-blue-400 bg-blue-50' : 
          isReady ? 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/30' : 
          'border-gray-300 bg-gray-50'
        }`}
        data-droppable="true"
        data-ready={isReady ? "true" : "false"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Zone de dépendance</span>
          
          {/* Indicateur de statut de la zone */}
          {!isReady && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1 py-0.5 rounded">
              Initialisation...
            </span>
          )}
        </div>
        
        {/* Retour visuel pour les actions */}
        {showActionFeedback && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 z-10 rounded-md animate-fadeIn">
            <div className="bg-white shadow-lg rounded-lg p-3 border border-green-200 flex items-center gap-2 animate-scaleIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="text-green-700 font-medium">Action ajoutée avec succès!</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  L'action sera appliquée quand la condition sera remplie
                </p>
              </div>
            </div>
          </div>
        )}
        
        {displayConditions.length === 0 && droppedItems.length === 0 && !showActionFeedback && (
          <div className="flex items-center justify-center h-[60px]">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Glissez les champs, actions ou opérateurs ici</p>
            </div>
          </div>
        )}
        
        {/* Affichage des conditions et éléments déposés */}
        <div className="flex flex-wrap gap-2">
          {/* Conditions (champs) */}
          {displayConditions.map((condition, index) => (
            <ConditionItem
              key={`condition-${condition.id}-${index}`}
              condition={condition}
              index={index}
              onRemove={() => handleRemoveCondition(index)}
            />
          ))}
          
          {/* Éléments déposés */}
          {droppedItems.map((item) => {
            if (item.type === 'action') {
              return (
                <ActionItem 
                  key={item.id} 
                  item={item as DraggableAction} 
                  onRemove={() => handleRemoveDroppedItem(item.id)} 
                />
              );
            } else if (item.type === 'operator') {
              return (
                <OperatorItem 
                  key={item.id} 
                  item={item as DraggableOperator} 
                  onRemove={() => handleRemoveDroppedItem(item.id)} 
                />
              );
            } else if (item.type === 'test') {
              return (
                <TestItem 
                  key={item.id} 
                  item={item as DraggableTest} 
                  onRemove={() => handleRemoveDroppedItem(item.id)} 
                />
              );
            }
            return null;
          })}
        </div>
      </div>
      
      {/* Palette d'actions de dépendance */}
      <div className="mt-2">
        <h4 className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">Actions de dépendance</h4>
        <div className="border rounded-md">
          <DependenciesPalette dependencyId={dependencyId} />
        </div>
      </div>
    </div>
  );
};

export default DependencyZone;
