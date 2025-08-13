import React, { useState, useMemo } from 'react';
import { Dependency, DependencyCondition } from './types';
import { 
  DndContext, 
  rectIntersection,
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
  DragStartEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import useCRMStore from '../../store';

interface DependencyRuleEditorProps {
  dependency: Dependency;
  allFields: { id: string; name: string }[];
  onUpdate: (updatedDependency: Partial<Dependency> & { id: string }) => void;
  onDelete: (dependencyId: string) => void;
  onTest?: (dependencyId: string) => void;
}

// Options pour les menus déroulants
const ADVANCED_CONDITION_FUNCTIONS = [
  { value: 'IF', label: 'IF', description: 'Condition IF' },
  { value: 'AND', label: 'AND', description: 'Opérateur logique ET' },
  { value: 'OR', label: 'OR', description: 'Opérateur logique OU' },
  { value: 'NOT', label: 'NOT', description: 'Négation logique' },
];

const ADVANCED_VALUE_TESTS = [
  { value: 'IS_NULL', label: 'null', description: 'Vérifie si la valeur est null' },
  { value: 'IS_EMPTY', label: 'vide', description: 'Vérifie si la valeur est vide' },
  { value: 'EQUALS', label: 'égal', description: 'Vérifie si une valeur est égale à une autre' },
  { value: 'IN', label: 'dans liste', description: 'Vérifie si une valeur est présente dans une liste' },
  { value: 'GREATER_THAN', label: 'sup. à', description: 'Vérifie si une valeur est supérieure à une autre' },
  { value: 'LESS_THAN', label: 'inf. à', description: 'Vérifie si une valeur est inférieure à une autre' }
];

/**
 * Éditeur de règles de dépendance (nouvelle version)
 * Composant pour éditer une règle de dépendance individuelle
 */
function DependencyRuleEditorNew({ dependency, allFields, onUpdate, onDelete, onTest }: DependencyRuleEditorProps) {
  // État pour gérer l'ouverture/fermeture de la dépendance
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // État pour stocker les conditions dans la zone de dépôt
  const [conditions, setConditions] = useState<DependencyCondition[]>([]);
  
  // État pour gérer la logique entre les conditions (AND/OR)
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  
  // Récupérer le nom à afficher
  const dependencyName = dependency.name || "Dépendance sans nom";

  // Obtenir les formules disponibles depuis le store
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
    useSensor(PointerSensor, {
      // Paramètres très permissifs pour faciliter le drag & drop
      activationConstraint: {
        distance: 1,
        tolerance: 10
      }
    }),
    useSensor(KeyboardSensor)
  );
  
  // État pour suivre l'élément en cours de glissement
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Gestion du début du glissement
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Log détaillé pour le débogage
    console.log("Drag started:", {
      id: active.id,
      data: active.data.current
    });
    
    if (active.data.current) {
      const data = active.data.current as any;
      
      // Normalisation des données d'élément externe
      if (data.fieldId || data.sectionId || data.formulaId) {
        console.log("Élément externe détecté:", data);
        
        // Pour les champs externes
        if (data.fieldId && !data.type) {
          data.type = 'field';
          data.id = data.fieldId;
        }
        
        // Pour les sections externes
        if (data.sectionId && !data.type) {
          data.type = 'section';
          data.id = data.sectionId;
        }
        
        // Pour les formules externes
        if (data.formulaId && !data.type) {
          data.type = 'formula';
          data.id = data.formulaId;
        }
      }
    }
  };
  
  // Gestion des événements de drag & drop - APPROCHE SIMPLIFIÉE
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    // Log détaillé
    console.log("Drag end event:", {
      active: {
        id: active.id,
        data: active.data.current
      },
      over: over ? {
        id: over.id,
        data: over.data.current
      } : 'No over target'
    });
    
    // TRAITER TOUT DROP, PEU IMPORTE LA CIBLE
    const activeData = active.data.current as any;
    
    if (activeData) {
      // Détection de type simplifiée
      let itemType = 'unknown';
      let itemId = '';
      
      // 1. Vérifier si le type est explicitement défini
      if (activeData.type) {
        itemType = activeData.type;
        itemId = activeData.id || '';
      }
      // 2. Vérifier les propriétés spécifiques
      else if (activeData.fieldId) {
        itemType = 'field';
        itemId = activeData.fieldId;
      } 
      else if (activeData.sectionId) {
        itemType = 'section';
        itemId = activeData.sectionId;
      } 
      else if (activeData.formulaId) {
        itemType = 'formula';
        itemId = activeData.formulaId;
      }
      // 3. Analyser l'ID
      else if (typeof active.id === 'string') {
        const idString = String(active.id);
        
        // Format type-id
        if (idString.includes('-')) {
          const parts = idString.split('-');
          if (parts.length >= 2) {
            const potentialType = parts[0];
            if (['field', 'section', 'formula', 'action', 'operator', 'test'].includes(potentialType)) {
              itemType = potentialType;
              itemId = parts.slice(1).join('-');
            }
          }
        }
        
        // Détection par inclusion
        if (itemType === 'unknown') {
          if (idString.includes('field')) {
            itemType = 'field';
          } else if (idString.includes('section')) {
            itemType = 'section';
          } else if (idString.includes('formula')) {
            itemType = 'formula';
          } else if (idString.includes('action')) {
            itemType = 'action';
          } else if (idString.includes('operator')) {
            itemType = 'operator';
          } else if (idString.includes('test')) {
            itemType = 'test';
          }
          
          if (itemType !== 'unknown') {
            // Extraire ID numérique si présent
            const numericMatch = idString.match(/\d+/);
            itemId = numericMatch ? numericMatch[0] : idString;
          }
        }
      }
      
      console.log(`Type détecté: ${itemType}, ID: ${itemId}`);
      
      // Traitement de l'élément selon son type
      switch(itemType) {
        case 'action':
          console.log(`Application de l'action: ${itemId}`);
          onUpdate({
            id: dependency.id,
            action: itemId || activeData.id
          });
          break;
        case 'field':
          console.log(`Ajout du champ comme condition: ${itemId}`);
          const newCondition: DependencyCondition = {
            id: `condition-${Date.now()}`,
            targetFieldId: itemId || activeData.id || activeData.fieldId,
            operator: 'equals',
            value: ''
          };
          setConditions(prev => [...prev, newCondition]);
          break;
        case 'operator':
          console.log(`Ajout de l'opérateur: ${itemId}`);
          alert(`Opérateur ${itemId} ajouté avec succès!`);
          break;
        case 'test':
          console.log(`Ajout du test: ${itemId}`);
          alert(`Test ${itemId} ajouté avec succès!`);
          break;
        case 'section':
          console.log(`Section déposée: ${itemId}`);
          alert(`Section ${itemId} déposée avec succès!`);
          break;
        case 'formula':
          console.log(`Formule déposée: ${itemId}`);
          onUpdate({
            id: dependency.id,
            formulaId: itemId || activeData.id || activeData.formulaId
          });
          break;
        default:
          // Pour les éléments non reconnus, essayer avec le nom
          if (activeData && activeData.name) {
            console.log(`Élément avec nom trouvé: ${activeData.name}`);
            const fieldCondition: DependencyCondition = {
              id: `condition-${Date.now()}`,
              targetFieldId: activeData.id || `field-${Date.now()}`,
              operator: 'equals',
              value: ''
            };
            setConditions(prev => [...prev, fieldCondition]);
          } else {
            alert("Élément non reconnu déposé. Vérifiez la console pour plus de détails.");
          }
      }
    }
  };

  // Configuration de la zone de dépôt
  const dropId = `dependency-dropzone-${dependency.id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    // Configuration minimale pour éviter les problèmes
    data: {
      type: 'dependency-dropzone'
    }
  });

  // Composant pour les actions glissables
  interface DraggableItemProps {
    id: string;
    type: string;
    label: string;
    color: string;
    icon?: React.ReactNode;
    description?: string;
  }

  const DraggableItem = ({ id, type, label, color, icon, description }: DraggableItemProps) => {
    // ID simple et cohérent
    const dragId = `${type}-${id}`;
    
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: dragId,
      data: {
        id,
        type,
        label,
        // Propriétés pour compatibilité
        fieldId: type === 'field' ? id : undefined,
        sectionId: type === 'section' ? id : undefined,
        formulaId: type === 'formula' ? id : undefined
      }
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 999 : 'auto',
    };

    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    let hoverColor = 'hover:bg-gray-200';
    let borderColor = 'border-gray-200';

    switch (color) {
      case 'blue':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        hoverColor = 'hover:bg-blue-200';
        borderColor = 'border-blue-200';
        break;
      case 'green':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        hoverColor = 'hover:bg-green-200';
        borderColor = 'border-green-200';
        break;
      case 'amber':
        bgColor = 'bg-amber-100';
        textColor = 'text-amber-800';
        hoverColor = 'hover:bg-amber-200';
        borderColor = 'border-amber-200';
        break;
      case 'purple':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        hoverColor = 'hover:bg-purple-200';
        borderColor = 'border-purple-200';
        break;
      case 'red':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        hoverColor = 'hover:bg-red-200';
        borderColor = 'border-red-200';
        break;
      case 'indigo':
        bgColor = 'bg-indigo-100';
        textColor = 'text-indigo-800';
        hoverColor = 'hover:bg-indigo-200';
        borderColor = 'border-indigo-200';
        break;
    }

    return (
      <div 
        ref={setNodeRef} 
        {...attributes} 
        {...listeners} 
        style={style} 
        className={`cursor-grab ${bgColor} ${textColor} ${hoverColor} px-2 py-1 rounded-md text-xs font-medium border ${borderColor} flex items-center mb-1
          hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner`}
        title={description}
        data-draggable-id={dragId}
        data-draggable-type={type}
      >
        {icon && <span className="mr-1">{icon}</span>}
        <span className="flex-grow">{label}</span>
        <span className="ml-1 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </span>
      </div>
    );
  };

  // Rendu du composant
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-md overflow-hidden mb-4">
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
          <h3 className="text-sm font-medium">{dependencyName}</h3>
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
              </div>
              
              {/* Formule à utiliser */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Formule à utiliser</label>
                <select
                  className="w-full text-sm border-gray-300 rounded-md"
                  value={dependency.formulaId || ""}
                  onChange={(e) => {
                    if (e.target.value) {
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
            
            <div className="mt-4">
              <div className="relative">
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded-t-md text-xs font-medium z-10">
                  Zone de dépôt
                </div>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={rectIntersection}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  autoScroll={true}
                >
                  {/* Zone de dépôt avec ID très visible */}
                  <div 
                    ref={setNodeRef}
                    className={`relative min-h-[180px] p-4 border-4 rounded-md mb-4 ${
                      isOver ? 'border-red-500 bg-red-100 border-dashed shadow-lg' : 
                             'border-blue-300 bg-blue-50 border-dashed'
                    } transition-all duration-200 ${activeId ? 'border-blue-500 shadow-md' : ''} 
                    hover:border-blue-500 hover:shadow-lg`}
                    data-dropzone-id={dropId}
                    data-testid="dependency-drop-zone"
                  >
                    {/* Indicateur visuel pour debuggage */}
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      ID: {dropId}
                    </div>
                    
                    {dependency.formulaId ? (
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                          <span className="text-sm font-medium">Formule sélectionnée:</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                            {formulas.find((f: { id: string; name?: string }) => f.id === dependency.formulaId)?.name || `Formule #${dependency.formulaId.slice(-5)}`}
                          </span>
                        </div>
                        <div className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded mt-2">
                          <div className="flex-grow flex flex-col">
                            <div className="flex items-center">
                              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2 text-xs">F</div>
                              <span className="text-sm font-medium">
                                {formulas.find((f: { id: string; name?: string }) => f.id === dependency.formulaId)?.name || `Formule #${dependency.formulaId.slice(-5)}`}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 ml-7">
                              Cette dépendance s'applique quand la formule retourne <code>true</code>
                            </div>
                          </div>
                          <button 
                            className="text-red-500 text-xs"
                            onClick={() => {
                              onUpdate({
                                id: dependency.id,
                                formulaId: undefined
                              });
                            }}
                          >
                            ✕
                          </button>
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
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="flex items-center mb-3 bg-blue-100 p-3 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-red-700 bg-red-50 px-3 py-1 rounded-md shadow-sm border border-red-200 mb-2">
                          ⚠️ ZONE DE DÉPÔT ACTIVE ⚠️
                        </p>
                        <p className="text-sm mb-2 font-bold">Glissez et déposez ici :</p>
                        <ul className="text-xs mt-1 bg-gray-50 p-2 rounded-md border border-gray-200 shadow-sm w-full">
                          <li className="flex items-center py-1 border-b border-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>des <b>champs</b> depuis la colonne centrale du formulaire</span>
                          </li>
                          <li className="flex items-center py-1 border-b border-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>des <b>actions</b> depuis les boutons ci-dessous</span>
                          </li>
                          <li className="flex items-center py-1 border-b border-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>des <b>formules</b> depuis le sélecteur</span>
                          </li>
                          <li className="flex items-center py-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>des <b>opérateurs</b> ou <b>tests</b> de valeur</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'actions */}
                  <div className="mt-4">
                    <div className="p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                      <h4 className="text-sm font-medium mb-3 border-b pb-2">Actions de dépendance</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {/* Visibilité */}
                        <div className="bg-blue-50 rounded-md flex flex-col items-center p-1 border border-blue-100">
                          <h5 className="text-xs font-medium text-blue-800 w-full text-center border-b border-blue-200 pb-1 mb-1">Visibilité</h5>
                          <div className="flex gap-1 w-full justify-center">
                            <DraggableItem 
                              id="show"
                              type="action"
                              label="Afficher"
                              color="blue"
                              description="Afficher ce champ"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              }
                            />
                            <DraggableItem 
                              id="hide"
                              type="action"
                              label="Masquer"
                              color="blue"
                              description="Masquer ce champ"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              }
                            />
                          </div>
                        </div>

                        {/* Autres actions... */}
                        <div className="bg-green-50 rounded-md flex flex-col items-center p-1 border border-green-100">
                          <h5 className="text-xs font-medium text-green-800 w-full text-center border-b border-green-200 pb-1 mb-1">Activation</h5>
                          <div className="flex gap-1 w-full justify-center">
                            <DraggableItem 
                              id="enable"
                              type="action"
                              label="Activer"
                              color="green"
                              description="Activer ce champ"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                              }
                            />
                            <DraggableItem 
                              id="disable"
                              type="action"
                              label="Désactiver"
                              color="green"
                              description="Désactiver ce champ"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              }
                            />
                          </div>
                        </div>
                        
                        <div className="bg-amber-50 rounded-md flex flex-col items-center p-1 border border-amber-100">
                          <h5 className="text-xs font-medium text-amber-800 w-full text-center border-b border-amber-200 pb-1 mb-1">Obligation</h5>
                          <div className="flex gap-1 w-full justify-center">
                            <DraggableItem 
                              id="require"
                              type="action"
                              label="Obligatoire"
                              color="amber"
                              description="Rendre ce champ obligatoire"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              }
                            />
                            <DraggableItem 
                              id="optional"
                              type="action"
                              label="Facultatif"
                              color="amber"
                              description="Rendre ce champ facultatif"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              }
                            />
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-md flex flex-col items-center p-1 border border-purple-100">
                          <h5 className="text-xs font-medium text-purple-800 w-full text-center border-b border-purple-200 pb-1 mb-1">Valeur</h5>
                          <div className="flex gap-1 w-full justify-center">
                            <DraggableItem 
                              id="prefill"
                              type="action"
                              label="Prérenseigner"
                              color="purple"
                              description="Prérenseigner ce champ avec une valeur"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              }
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Champ pour la valeur à prérenseigner */}
                      {dependency.action === 'prefill' && (
                        <div className="mt-2 col-span-4 bg-purple-50 border border-purple-100 rounded p-1">
                          <label className="text-xs text-purple-800 font-medium mb-1 block">Valeur à prérenseigner:</label>
                          <input
                            type="text"
                            value={dependency.prefillValue || ""}
                            onChange={(e) => onUpdate({
                              id: dependency.id,
                              prefillValue: e.target.value
                            })}
                            placeholder="Saisissez une valeur..."
                            className="w-full p-1 text-xs border border-purple-200 rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                
                  {/* Opérateurs et tests */}
                  <div className="mb-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Opérateurs logiques */}
                        <div>
                          <h5 className="text-xs font-medium text-gray-600 mb-1 text-center border-b border-gray-200 pb-1">Opérateurs logiques</h5>
                          <div className="flex flex-wrap justify-center gap-1">
                            {ADVANCED_CONDITION_FUNCTIONS.map(func => (
                              <DraggableItem
                                key={func.value}
                                id={func.value}
                                type="operator"
                                label={func.label}
                                color="indigo"
                                description={func.description}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Tests de valeur */}
                        <div>
                          <h5 className="text-xs font-medium text-gray-600 mb-1 text-center border-b border-gray-200 pb-1">Tests de valeur</h5>
                          <div className="grid grid-cols-3 gap-1">
                            {ADVANCED_VALUE_TESTS.map(test => (
                              <DraggableItem
                                key={test.value}
                                id={test.value}
                                type="test"
                                label={test.label.replace('Est ', '').replace(' à', '')}
                                color="red"
                                description={test.description}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <button 
                    onClick={() => {
                      if (allFields.length > 0) {
                        const newCondition: DependencyCondition = {
                          id: `condition-${Date.now()}`,
                          targetFieldId: allFields[0].id,
                          operator: 'equals',
                          value: ''
                        };
                        setConditions(prev => [...prev, newCondition]);
                      }
                    }}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs flex items-center w-fit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajouter condition
                  </button>
                  
                  <div className="flex gap-2 mt-4">
                    {conditions.length > 0 && !dependency.formulaId && (
                      <button 
                        onClick={() => {
                          if (conditions.length > 0) {
                            onUpdate({
                              id: dependency.id,
                              targetFieldId: conditions[0].targetFieldId,
                              operator: conditions[0].operator,
                              value: conditions[0].value
                            });
                          }
                        }}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Appliquer
                      </button>
                    )}
                    <button 
                      onClick={() => onTest?.(dependency.id)}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tester
                    </button>
                  </div>
                </DndContext>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { DependencyRuleEditorNew };
export default DependencyRuleEditorNew;
