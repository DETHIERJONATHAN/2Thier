import { useState } from 'react';
import { DependencyAction } from '../../utils/dependencyFunctions';
import DependencyPalette from './DependencyPalette';

interface AdvancedDependencyEditorProps {
  fieldId: string;
  initialDependencies?: string[];
  onChange?: (dependencies: string[]) => void;
}

/**
 * Éditeur avancé de dépendances pour un champ de formulaire
 * Permet de définir des règles conditionnelles pour l'affichage, l'activation,
 * la validation et les valeurs par défaut des champs
 */
const AdvancedDependencyEditor = ({ fieldId, initialDependencies = [], onChange }: AdvancedDependencyEditorProps) => {
  const [dependencies, setDependencies] = useState<string[]>(initialDependencies);
  const [activeTab, setActiveTab] = useState<'list' | 'editor'>('list');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentRule, setCurrentRule] = useState<string>('');

  // Ajouter une nouvelle dépendance
  const handleAddDependency = (dependencyType: string) => {
    const newDependency = dependencyType === DependencyAction.SET_VALUE 
      ? `${dependencyType}("${fieldId}", "")` // Template pour SET_VALUE qui requiert 2 paramètres
      : `${dependencyType}("${fieldId}")`;     // Template pour les autres actions
    
    setDependencies(prev => [...prev, newDependency]);
    
    // Notifier le parent du changement
    if (onChange) {
      onChange([...dependencies, newDependency]);
    }
  };

  // Supprimer une dépendance
  const handleRemoveDependency = (index: number) => {
    const updatedDependencies = dependencies.filter((_, i) => i !== index);
    setDependencies(updatedDependencies);
    
    // Notifier le parent du changement
    if (onChange) {
      onChange(updatedDependencies);
    }
  };

  // Commencer l'édition d'une règle
  const handleEditRule = (index: number) => {
    setEditingIndex(index);
    setCurrentRule(dependencies[index]);
    setActiveTab('editor');
  };

  // Sauvegarder la règle éditée
  const handleSaveRule = () => {
    if (editingIndex !== null) {
      const updatedDependencies = [...dependencies];
      updatedDependencies[editingIndex] = currentRule;
      
      setDependencies(updatedDependencies);
      setEditingIndex(null);
      setCurrentRule('');
      setActiveTab('list');
      
      // Notifier le parent du changement
      if (onChange) {
        onChange(updatedDependencies);
      }
    }
  };

  // Gérer le glisser-déposer des éléments de dépendance
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Récupérer les données de l'élément déposé
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.type.startsWith('dependency-')) {
        let newPart = '';
        
        // Construire le texte à insérer en fonction du type d'élément
        switch (parsedData.type) {
          case 'dependency-action':
            newPart = parsedData.value === DependencyAction.SET_VALUE
              ? `${parsedData.value}("${fieldId}", "")` 
              : `${parsedData.value}("${fieldId}")`;
            break;
          case 'dependency-condition':
            if (parsedData.value === 'IF') {
              newPart = `${parsedData.value}(condition, SHOW("${fieldId}"), HIDE("${fieldId}"))`;
            } else if (['AND', 'OR'].includes(parsedData.value)) {
              newPart = `${parsedData.value}(condition1, condition2)`;
            } else {
              newPart = `${parsedData.value}(condition)`;
            }
            break;
          case 'dependency-test':
            newPart = parsedData.value === 'IN'
              ? `${parsedData.value}(fieldValue, ["option1", "option2"])`
              : `${parsedData.value}(fieldValue)`;
            break;
        }
        
        // Si nous sommes en mode édition, insérer à la position du curseur
        if (activeTab === 'editor') {
          // Ajouter le texte à la position du curseur dans l'éditeur
          const editorElement = document.getElementById('dependency-rule-editor');
          if (editorElement instanceof HTMLTextAreaElement) {
            const start = editorElement.selectionStart;
            const end = editorElement.selectionEnd;
            const before = currentRule.substring(0, start);
            const after = currentRule.substring(end);
            
            setCurrentRule(before + newPart + after);
          }
        } else {
          // Sinon, ajouter comme nouvelle règle
          handleAddDependency(parsedData.value);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du drop', error);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Dépendances du champ</h3>
        
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-xs font-medium rounded ${activeTab === 'list' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('list')}
          >
            Liste
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded ${activeTab === 'editor' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => {
              setActiveTab('editor');
              if (editingIndex === null && dependencies.length > 0) {
                setEditingIndex(0);
                setCurrentRule(dependencies[0]);
              } else if (dependencies.length === 0) {
                setCurrentRule('');
              }
            }}
          >
            Éditeur
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {/* Onglet Liste */}
        {activeTab === 'list' && (
          <>
            {dependencies.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                <p>Aucune dépendance définie</p>
                <p className="mt-2 text-xs">Utilisez la palette ci-dessous pour ajouter des dépendances</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dependencies.map((dependency, index) => (
                  <div key={`dep-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex-grow font-mono text-xs text-gray-700 overflow-x-auto px-2 py-1">
                      {dependency}
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        className="p-1 text-blue-600 hover:text-blue-800"
                        onClick={() => handleEditRule(index)}
                        title="Modifier"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="p-1 text-red-600 hover:text-red-800"
                        onClick={() => handleRemoveDependency(index)}
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Onglet Éditeur */}
        {activeTab === 'editor' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                id="dependency-rule-editor"
                className="w-full h-32 p-2 border border-gray-300 rounded font-mono text-sm"
                value={currentRule}
                onChange={(e) => setCurrentRule(e.target.value)}
                placeholder="IF(EQUALS(status, 'En attente'), HIDE('commentaire'), SHOW('commentaire'))"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white to-transparent h-6 pointer-events-none"></div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => {
                  setActiveTab('list');
                  setEditingIndex(null);
                  setCurrentRule('');
                }}
              >
                Annuler
              </button>
              <button
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSaveRule}
              >
                Enregistrer
              </button>
            </div>
            
            <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <p className="font-medium">Aide sur la syntaxe:</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Utilisez <code className="bg-yellow-100 px-1">IF(condition, actionSiVrai, actionSiFaux)</code> pour créer une condition</li>
                <li>Utilisez <code className="bg-yellow-100 px-1">AND(cond1, cond2)</code> ou <code className="bg-yellow-100 px-1">OR(cond1, cond2)</code> pour combiner des conditions</li>
                <li>Utilisez <code className="bg-yellow-100 px-1">EQUALS(champ, valeur)</code>, <code className="bg-yellow-100 px-1">IS_EMPTY(champ)</code> pour tester des valeurs</li>
                <li>Glissez-déposez des éléments depuis la palette pour faciliter l'édition</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Palette de dépendances */}
        <DependencyPalette 
          fieldId={fieldId} 
          onAddDependency={handleAddDependency}
        />
      </div>
    </div>
  );
};

export default AdvancedDependencyEditor;
