import React, { useState, useEffect } from 'react';
import { Dependency, DependencyCondition } from './types';
import DependencyZone from './DependencyZone';

interface DependencyRuleEditorProps {
  dependency: Dependency;
  allFields: { id: string; name: string }[];
  onUpdate: (updatedDependency: Partial<Dependency> & { id: string }) => void;
  onDelete: (dependencyId: string) => void;
  onTest?: (dependencyId: string) => void;
}

/**
 * Éditeur de règles de dépendance simplifié
 * Utilise la nouvelle approche avec HTML5 Drag and Drop
 */
const DependencyRuleEditorSimplified: React.FC<DependencyRuleEditorProps> = ({
  dependency,
  allFields,
  onUpdate,
  onDelete,
  onTest
}) => {
  // État pour vérifier si l'éditeur est prêt à être utilisé
  const [isReady, setIsReady] = useState(false);
  
  // État pour gérer l'ouverture/fermeture de la dépendance
  // Ouvrir automatiquement si c'est une nouvelle dépendance (pas de targetFieldId ni de formulaId)
  const [isExpanded, setIsExpanded] = useState<boolean>(!dependency.targetFieldId && !dependency.formulaId);
  
  // État local pour gérer l'action en cours (pour mise à jour visuelle immédiate)
  const [currentAction, setCurrentAction] = useState<string | undefined>(dependency.action);
  
  // État pour les opérateurs et tests actuels
  const [currentOperator, setCurrentOperator] = useState<string | null>(null);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  
  // État pour stocker les conditions avec initialisation à partir des propriétés existantes
  const [conditions, setConditions] = useState<DependencyCondition[]>(() => {
    // Si la dépendance a déjà un targetFieldId, créer une condition initiale
    if (dependency.targetFieldId && !dependency.formulaId) {
      return [{
        id: `condition-init-${Date.now()}`,
        targetFieldId: dependency.targetFieldId,
        operator: dependency.operator || 'equals',
        value: dependency.value || '',
        displayName: allFields.find(f => f.id === dependency.targetFieldId)?.name
      }];
    }
    return [];
  });
  
  // Initialisation de l'éditeur après le rendu initial
  useEffect(() => {
    console.log(`Initializing DependencyRuleEditor: ${dependency.id}`);
    
    // Délai court pour s'assurer que tous les composants sont bien montés
    const timer = setTimeout(() => {
      setIsReady(true);
      console.log(`DependencyRuleEditor ready: ${dependency.id}`);
      
      // Auto-expansion pour les nouvelles dépendances
      if (!dependency.targetFieldId && !dependency.formulaId) {
        setIsExpanded(true);
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, [dependency.id, dependency.targetFieldId, dependency.formulaId]);

  // Synchroniser l'état local avec les propriétés reçues
  useEffect(() => {
    // Mise à jour de l'action locale si elle a changé dans les propriétés
    if (dependency.action !== currentAction) {
      setCurrentAction(dependency.action);
    }
  }, [dependency.action, currentAction]);

  // Récupérer le nom à afficher
  const dependencyName = dependency.name || "Dépendance sans nom";

  // Mise à jour du nom de la dépendance
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ id: dependency.id, name: e.target.value });
  };

  // Mettre à jour les conditions
  const handleConditionsChange = (newConditions: DependencyCondition[]) => {
    setConditions(newConditions);
    
    // Si nous avons une condition, mettre à jour la dépendance
    if (newConditions.length > 0) {
      const mainCondition = newConditions[0];
      onUpdate({
        id: dependency.id,
        targetFieldId: mainCondition.targetFieldId,
        operator: mainCondition.operator as any,
        value: mainCondition.value
      });
    }
  };
  
  // Écouter les événements personnalisés pour les actions, opérateurs et tests
  React.useEffect(() => {
    const handleActionAdded = (e: Event) => {
      const event = e as CustomEvent;
      const { dependencyId, actionType, actionColor, actionIcon, actionLabel } = event.detail;
      
      // S'assurer que l'événement est pour cette dépendance
      if (dependencyId === dependency.id && actionType) {
        console.log(`Action reçue pour la dépendance ${dependency.id}: ${actionType}`);
        
        // Mettre à jour l'état local pour une réaction immédiate de l'UI
        setCurrentAction(actionType);
        
        // Mettre à jour la dépendance avec la nouvelle action
        onUpdate({
          id: dependency.id,
          action: actionType
        });
        
        // Auto-expansion pour voir les modifications
        if (!isExpanded) {
          setIsExpanded(true);
        }
        
        // Afficher une notification temporaire
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 bg-${actionColor || 'green'}-50 border border-${actionColor || 'green'}-200 text-${actionColor || 'green'}-700 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-scaleIn`;
        notification.innerHTML = `
          <span class="text-xl">${actionIcon || '✓'}</span>
          <span>${actionLabel || `Action ${actionType} ajoutée`}</span>
        `;
        document.body.appendChild(notification);
        
        // Supprimer la notification après 3 secondes
        setTimeout(() => {
          notification.classList.add('animate-fadeOut');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 3000);
      }
    };
    
    const handleOperatorAdded = (e: Event) => {
      const event = e as CustomEvent;
      const { dependencyId, operatorType } = event.detail;
      
      // S'assurer que l'événement est pour cette dépendance
      if (dependencyId === dependency.id && operatorType) {
        console.log(`Opérateur reçu pour la dépendance ${dependency.id}: ${operatorType}`);
        
        // Mettre à jour l'état local pour une réaction immédiate de l'UI
        setCurrentOperator(operatorType);
        
        // Auto-expansion pour voir les modifications
        if (!isExpanded) {
          setIsExpanded(true);
        }
        
        // Afficher une notification temporaire
        const notification = document.createElement('div');
        notification.className = "fixed bottom-4 right-4 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-scaleIn";
        notification.innerHTML = `
          <span class="text-xl">⚙️</span>
          <span>Opérateur ${operatorType.toUpperCase()} ajouté</span>
        `;
        document.body.appendChild(notification);
        
        // Supprimer la notification après 3 secondes
        setTimeout(() => {
          notification.classList.add('animate-fadeOut');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 3000);
      }
    };
    
    const handleTestAdded = (e: Event) => {
      const event = e as CustomEvent;
      const { dependencyId, testType } = event.detail;
      
      // S'assurer que l'événement est pour cette dépendance
      if (dependencyId === dependency.id && testType) {
        console.log(`Test reçu pour la dépendance ${dependency.id}: ${testType}`);
        
        // Mettre à jour l'état local pour une réaction immédiate de l'UI
        setCurrentTest(testType);
        
        // Auto-expansion pour voir les modifications
        if (!isExpanded) {
          setIsExpanded(true);
        }
        
        // Trouver le label correspondant au test
        let testLabel = testType;
        switch(testType) {
          case 'is_null': testLabel = 'est null'; break;
          case 'is_empty': testLabel = 'est vide'; break;
          case 'equals': testLabel = 'est égal à'; break;
          case 'not_equals': testLabel = "n'est pas égal à"; break;
          case 'in': testLabel = 'est dans la liste'; break;
          case 'gt': testLabel = 'est supérieur à'; break;
          case 'lt': testLabel = 'est inférieur à'; break;
        }
        
        // Afficher une notification temporaire
        const notification = document.createElement('div');
        notification.className = "fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-scaleIn";
        notification.innerHTML = `
          <span class="text-xl">🔍</span>
          <span>Test "${testLabel}" ajouté</span>
        `;
        document.body.appendChild(notification);
        
        // Supprimer la notification après 3 secondes
        setTimeout(() => {
          notification.classList.add('animate-fadeOut');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 3000);
      }
    };
    
    const handleFormulaAdded = (e: Event) => {
      const event = e as CustomEvent;
      const { dependencyId, formulaId } = event.detail;
      
      // S'assurer que l'événement est pour cette dépendance
      if (dependencyId === dependency.id && formulaId) {
        onUpdate({
          id: dependency.id,
          formulaId
        });
      }
    };
    
    // Ajouter les écouteurs d'événements
    document.addEventListener('dependency-action-added', handleActionAdded);
    document.addEventListener('dependency-operator-added', handleOperatorAdded);
    document.addEventListener('dependency-test-added', handleTestAdded);
    document.addEventListener('dependency-formula-added', handleFormulaAdded);
    
    // Nettoyer les écouteurs
    return () => {
      document.removeEventListener('dependency-action-added', handleActionAdded);
      document.removeEventListener('dependency-operator-added', handleOperatorAdded);
      document.removeEventListener('dependency-test-added', handleTestAdded);
      document.removeEventListener('dependency-formula-added', handleFormulaAdded);
    };
  }, [dependency.id, onUpdate]);

  // Fonctions pour obtenir les classes CSS, icônes et étiquettes pour les actions
  const getActionColorClasses = (action: string): string => {
    switch(action) {
      case 'show':
      case 'hide':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'enable':
      case 'disable':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'require':
      case 'optional':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'prefill':
      case 'clear':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
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
  
  // Ajouter les descriptions pour les actions
  const getActionDescription = (action: string): string => {
    switch(action) {
      case 'show': return 'Rendre le champ visible';
      case 'hide': return 'Rendre le champ invisible';
      case 'enable': return 'Activer le champ pour permettre la saisie';
      case 'disable': return 'Désactiver le champ pour empêcher la saisie';
      case 'require': return 'Rendre la saisie du champ obligatoire';
      case 'optional': return 'Rendre la saisie du champ facultative';
      case 'prefill': return 'Préremplir le champ avec une valeur';
      case 'clear': return 'Effacer la valeur du champ';
      default: return 'Action sur le champ cible';
    }
  };
  
  // Fonctions pour obtenir les classes CSS, icônes et étiquettes pour les opérateurs
  const getOperatorColorClasses = (): string => {
    return 'bg-indigo-50 border-indigo-200 text-indigo-800';
  };
  
  // Fonctions pour obtenir les classes CSS, icônes et étiquettes pour les tests
  const getTestColorClasses = (): string => {
    return 'bg-red-50 border-red-200 text-red-800';
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
  


  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-md overflow-hidden mb-4">
      {/* En-tête de la dépendance */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-2 text-gray-600 hover:text-gray-800"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
          >
            <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h3 className="text-sm font-medium flex items-center">
            {dependencyName}
            {(currentAction || dependency.action) && (
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${getActionColorClasses(currentAction || dependency.action || '')}`}>
                {getActionIcon(currentAction || dependency.action || '')} {getActionLabel(currentAction || dependency.action || '')}
              </span>
            )}
          </h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onTest?.(dependency.id)} 
            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md"
          >
            Tester
          </button>
          <button 
            onClick={() => onDelete(dependency.id)} 
            className="px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded-md"
          >
            Supprimer
          </button>
        </div>
      </div>
      
      {/* Contenu de la dépendance */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          {!isReady ? (
            <div className="text-center py-4 text-gray-500">
              <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm">Chargement de l'éditeur...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-full">
              {/* Paramètres de base de la dépendance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom de la dépendance */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la dépendance</label>
                  <input
                    type="text"
                    value={dependency.name || ""}
                    onChange={handleNameChange}
                    placeholder="Nom de la dépendance"
                    className="input input-bordered input-sm w-full rounded-md border-gray-300"
                    autoComplete="off"
                  />
                </div>
                
                {/* Action actuelle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Action actuelle</label>
                  {currentAction || dependency.action ? (
                    <div className={`px-3 py-2 text-sm rounded border shadow-sm ${
                      getActionColorClasses(currentAction || dependency.action || '')
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getActionIcon(currentAction || dependency.action || '')}</span>
                        <div className="flex-1">
                          <div className="font-medium">{getActionLabel(currentAction || dependency.action || '')}</div>
                          <div className="text-xs mt-0.5 opacity-80">
                            {getActionDescription(currentAction || dependency.action || '')}
                          </div>
                        </div>
                      </div>
                      
                      {(currentAction === 'prefill' || dependency.action === 'prefill') && (
                        <div className="mt-2 bg-white/60 p-1.5 rounded border border-purple-200">
                          <label className="text-xs text-purple-800 font-medium mb-1 block">Valeur à prérenseigner:</label>
                          <input
                            type="text"
                            value={dependency.prefillValue || ""}
                            onChange={(e) => onUpdate({
                              id: dependency.id,
                              prefillValue: e.target.value
                            })}
                            placeholder="Saisissez une valeur..."
                            className="w-full p-1 text-sm border border-purple-200 rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 text-sm bg-gray-100 rounded border border-gray-200">
                      Aucune action sélectionnée
                    </div>
                  )}
                </div>
              </div>
              

              
              {/* Champ pour la valeur à prérenseigner */}
              {dependency.action === 'prefill' && (
                <div className="mt-2 bg-purple-50 border border-purple-100 rounded p-2">
                  <label className="text-xs text-purple-800 font-medium mb-1 block">Valeur à prérenseigner:</label>
                  <input
                    type="text"
                    value={dependency.prefillValue || ""}
                    onChange={(e) => onUpdate({
                      id: dependency.id,
                      prefillValue: e.target.value
                    })}
                    placeholder="Saisissez une valeur..."
                    className="w-full p-1 text-sm border border-purple-200 rounded"
                  />
                </div>
              )}
              
              {/* Zone de construction des dépendances */}
              <div className="mt-4 relative">
                <div className="border border-dashed border-gray-300 rounded-md">
                  <DependencyZone
                    dependencyId={dependency.id}
                    conditions={conditions}
                    onConditionsChange={handleConditionsChange}
                    availableFields={allFields}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { DependencyRuleEditorSimplified };
export default DependencyRuleEditorSimplified;
