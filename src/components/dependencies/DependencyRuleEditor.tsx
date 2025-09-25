import React, { useState, useMemo, useCallback } from 'react';
import { Dependency, DependencyAction, DependencyOperator, DependencyCondition, DependencyRule } from './types';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  useDroppable 
} from '@dnd-kit/core';
import useCRMStore from '../../store';

interface DependencyRuleEditorProps {
  dependency: Dependency;
  allFields: { id: string; name: string }[]; // Liste de tous les champs disponibles
  onUpdate: (updatedDependency: Partial<Dependency> & { id: string }) => void;
  onDelete: (dependencyId: string) => void;
  onTest?: (dependencyId: string) => void;
}

// Options pour les menus déroulants
const actions = [
  { value: 'show', label: 'Afficher ce champ' },
  { value: 'require', label: 'Rendre ce champ obligatoire' },
];

const operators = [
  { value: 'equals', label: 'est égal à' },
  { value: 'not_equals', label: 'n\'est pas égal à' },
  { value: 'contains', label: 'contient' },
  { value: 'is_empty', label: 'est vide' },
  { value: 'is_not_empty', label: 'n\'est pas vide' },
];

/**
 * Éditeur de règles de dépendance 
 * Component pour éditer une règle de dépendance individuelle
 */
function DependencyRuleEditor({ dependency, allFields, onUpdate, onDelete, onTest }: DependencyRuleEditorProps) {
  // État pour gérer l'ouverture/fermeture de la dépendance
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // État pour stocker les conditions dans la zone de dépôt
  const [conditions, setConditions] = useState<DependencyCondition[]>([]);
  // État pour gérer la logique entre les conditions (AND/OR)
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  
  // Récupérer le nom à afficher
  const dependencyName = dependency.name || "Dépendance sans nom";

  // Obtenir les formules disponibles depuis le store de manière statique
  // pour éviter les boucles infinies de rendu
  const formulas = useMemo(() => {
    const state = useCRMStore.getState();
    return state.blocks
      .flatMap(block => block.sections)
      .flatMap(section => section.fields)
      .flatMap(field => field.formulas || []);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ id: dependency.id, name: e.target.value });
  };

  // Configuration des capteurs pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );
  
  // Gestion des événements de drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      console.log(`Élément ${active.id} déposé sur ${over.id}`);
      
      // Récupérer les données associées à l'élément déplacé
      const activeData = active.data.current;
      
      if (activeData) {
        // Gérer le drop selon le type d'élément
        if (activeData.type === 'field' && activeData.fieldId) {
          // Ajouter une nouvelle condition avec le champ
          const newCondition: DependencyCondition = {
            id: `condition-${Date.now()}`,
            targetFieldId: activeData.fieldId,
            operator: 'equals', // Opérateur par défaut
            value: '' // Valeur vide par défaut
          };
          
          setConditions(prev => [...prev, newCondition]);
        } 
        else if (activeData.operator) {
          // Mettre à jour l'opérateur de la dernière condition si possible
          setConditions(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1].operator = activeData.operator;
            return updated;
          });
        }
        else if (activeData.value !== undefined) {
          // Mettre à jour la valeur de la dernière condition si possible
          setConditions(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1].value = activeData.value;
            return updated;
          });
        }
        else if (activeData.logic) {
          // Modifier la logique entre les conditions
          setLogic(activeData.logic);
        }
        
        // Mettre à jour la dépendance avec les nouvelles conditions
        if (!dependency.formulaId) {
          const dependencyRule: DependencyRule = {
            id: dependency.id,
            action: dependency.action,
            logic: logic,
            conditions: conditions
          };
          
          // Mise à jour via onUpdate
          onUpdate({
            id: dependency.id,
            _rule: dependencyRule
          });
        }
      }
    }
  };
  
  // Configuration de la zone de dépôt
  const { setNodeRef, isOver } = useDroppable({
    id: `dependency-dropzone-${dependency.id}`,
    data: {
      type: 'dependency-dropzone',
      dependencyId: dependency.id
    }
  });

  // Fonction pour ajouter une condition manuelle
  const addManualCondition = useCallback(() => {
    // Créer une nouvelle condition de base si des champs sont disponibles
    if (allFields.length > 0) {
      const newCondition: DependencyCondition = {
        id: `condition-${Date.now()}`,
        targetFieldId: allFields[0].id,
        operator: 'equals',
        value: ''
      };
      
      setConditions(prev => [...prev, newCondition]);
    }
  }, [allFields]);

  return (
    <div className="bg-white w-full max-w-full border border-gray-200 rounded-md mb-2 shadow-sm">
      {/* En-tête avec bouton ouvrir/fermer et supprimer */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div 
          className="flex-grow flex items-center cursor-pointer" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="mr-2">
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
              </svg>
            )}
          </div>
          <span className="font-medium">{dependencyName}</span>
        </div>
        <div className="flex items-center">
          {onTest && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTest(dependency.id);
              }}
              className="mr-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md"
            >
              Test
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(dependency.id);
            }}
            className="px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded-md"
          >
            Supprimer
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
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
                <div className="flex items-center mt-2">
                  <input
                    id={`require-checkbox-${dependency.id}`}
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={dependency.action === 'require'}
                    onChange={(e) => onUpdate({ 
                      id: dependency.id, 
                      action: e.target.checked ? 'require' : 'show' 
                    })}
                  />
                  <label 
                    htmlFor={`require-checkbox-${dependency.id}`} 
                    className="ml-2 text-sm text-gray-700"
                  >
                    Rendre obligatoire
                  </label>
                </div>
              </div>
              
              {/* Formule à utiliser (comme dans validations) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Formule à utiliser</label>
                <select
                  className="w-full text-sm border-gray-300 rounded-md"
                  value={dependency.formulaId || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Mettre à jour la dépendance avec la formule sélectionnée
                      onUpdate({
                        id: dependency.id,
                        formulaId: e.target.value
                      });
                    }
                  }}
                >
                  <option value="">Sélectionner une formule...</option>
                  {formulas.length > 0 ? 
                    formulas.map((formula: { id: string; name?: string }) => (
                      <option key={formula.id} value={formula.id}>
                        {formula.name || `Formule #${formula.id.slice(-5)}`}
                      </option>
                    )) : (
                      <option disabled>Aucune formule disponible</option>
                    )}
                </select>
              </div>
            </div>
            
            {/* Zone de dépôt avec DnD */}
            <div className="mt-4">
              <div className="relative">
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded-t-md text-xs font-medium z-10">
                  Zone de dépôt
                </div>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  {/* Zone de dépôt principale */}
                  <div 
                    ref={setNodeRef}
                    className={`min-h-[100px] p-4 border-2 rounded-md mb-4 ${
                      isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
                    } transition-colors duration-200`}
                  >
                    {/* Message d'instruction ou affichage de la formule sélectionnée */}
                    {dependency.formulaId ? (
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                          <span className="text-sm font-medium">Formule sélectionnée:</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                            {formulas.find((f: { id: string; name?: string }) => f.id === dependency.formulaId)?.name || `Formule #${dependency.formulaId.slice(-5)}`}
                          </span>
                        </div>
                        <div className="flex-grow flex items-center justify-center text-gray-400">
                          <p className="text-sm">Configuration via formule active</p>
                        </div>
                      </div>
                    ) : conditions.length > 0 ? (
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                          <span className="text-sm font-medium">Conditions:</span>
                          <div className="flex gap-1">
                            <button 
                              className={`px-2 py-1 text-xs rounded ${logic === 'AND' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                              onClick={() => setLogic('AND')}
                            >
                              ET
                            </button>
                            <button 
                              className={`px-2 py-1 text-xs rounded ${logic === 'OR' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                              onClick={() => setLogic('OR')}
                            >
                              OU
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 mt-2">
                          {conditions.map((condition, index) => {
                            const field = allFields.find(f => f.id === condition.targetFieldId);
                            return (
                              <div key={condition.id} className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded">
                                <span className="text-sm font-medium mr-1">{field?.name || condition.targetFieldId}</span>
                                <span className="text-sm mr-1">{condition.operator === 'equals' ? 'est égal à' : 
                                  condition.operator === 'not_equals' ? "n'est pas égal à" :
                                  condition.operator === 'contains' ? 'contient' :
                                  condition.operator === 'is_empty' ? 'est vide' : "n'est pas vide"}</span>
                                {condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' && (
                                  <span className="bg-gray-100 px-1 py-0.5 text-sm rounded">{condition.value || "(aucune valeur)"}</span>
                                )}
                                <button 
                                  className="ml-auto text-red-500 text-xs"
                                  onClick={() => {
                                    setConditions(prev => prev.filter((_, i) => i !== index));
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <p className="text-sm">Glissez ici les champs, opérateurs et valeurs ou sélectionnez une formule</p>
                      </div>
                    )}
                  </div>

                  {/* Section avec les éléments à faire glisser */}
                  <div className="mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Champs du formulaire */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Champs du formulaire</h4>
                        <div className="bg-white p-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                          {allFields.map(field => (
                            <div 
                              key={field.id}
                              className="flex items-center p-2 mb-2 bg-blue-50 border border-blue-200 rounded cursor-grab"
                              draggable
                              data-field-id={field.id}
                              data-type="field"
                            >
                              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2 text-xs">F</div>
                              <span className="text-sm">{field.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Opérateurs */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Opérateurs</h4>
                        <div className="flex flex-wrap gap-2 bg-white p-2 border border-gray-200 rounded-md">
                          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded cursor-grab" draggable data-operator="equals">=</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded cursor-grab" draggable data-operator="not_equals">≠</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded cursor-grab" draggable data-operator="contains">Contient</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded cursor-grab" draggable data-operator="is_empty">Vide</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded cursor-grab" draggable data-operator="is_not_empty">Non vide</div>
                          
                          <div className="w-full my-1"></div>
                          
                          <div className="px-3 py-1 bg-blue-50 text-blue-800 rounded cursor-grab border border-blue-200" draggable data-logic="AND">ET</div>
                          <div className="px-3 py-1 bg-blue-50 text-blue-800 rounded cursor-grab border border-blue-200" draggable data-logic="OR">OU</div>
                        </div>
                      </div>
                      
                      {/* Valeurs */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Valeurs</h4>
                        <div className="flex flex-wrap gap-2 bg-white p-2 border border-gray-200 rounded-md">
                          <div className="px-3 py-1 bg-green-50 text-green-800 rounded cursor-grab border border-green-200" draggable data-value="true">Oui</div>
                          <div className="px-3 py-1 bg-red-50 text-red-800 rounded cursor-grab border border-red-200" draggable data-value="false">Non</div>
                          <div className="px-3 py-1 bg-gray-50 text-gray-800 rounded cursor-grab" draggable data-value="null">Non défini</div>
                          <div className="px-3 py-1 bg-gray-50 text-gray-800 rounded cursor-grab" draggable data-value="">Champ vide</div>
                          
                          <div className="w-full mt-2">
                            <div className="flex">
                              <input 
                                type="text" 
                                className="flex-1 p-1 text-sm border border-gray-300 rounded-l"
                                placeholder="Valeur personnalisée"
                              />
                              <button 
                                className="px-2 py-1 bg-blue-500 text-white rounded-r text-sm hover:bg-blue-600"
                                onClick={(e) => e.preventDefault()}
                              >
                                Ajouter
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DndContext>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500 my-auto">Glissez-déposez les éléments ou</span>
                    <button 
                      onClick={addManualCondition}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs"
                    >
                      + Ajouter condition
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    {conditions.length > 0 && !dependency.formulaId && (
                      <button 
                        onClick={() => {
                          const dependencyRule: DependencyRule = {
                            id: dependency.id,
                            action: dependency.action,
                            logic: logic,
                            conditions: conditions
                          };
                          
                          // Mise à jour via onUpdate
                          onUpdate({
                            id: dependency.id,
                            // Utiliser les propriétés existantes pour la compatibilité
                            targetFieldId: conditions.length > 0 ? conditions[0].targetFieldId : "",
                            operator: conditions.length > 0 ? conditions[0].operator : "equals",
                            value: conditions.length > 0 ? conditions[0].value : ""
                          });
                        }}
                        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded text-sm"
                      >
                        Appliquer
                      </button>
                    )}
                    <button 
                      onClick={() => onTest?.(dependency.id)}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm"
                    >
                      Tester
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utiliser un export par défaut explicite
export default DependencyRuleEditor;