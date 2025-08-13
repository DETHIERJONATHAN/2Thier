import React, { useState, useEffect } from 'react';
import { Validation, Field, ValidationItem } from './types';
import ValidationZone from './ValidationZone';
import ValidationPreview from './ValidationPreview';

import { ValidationRuleConfig } from '../../config/validationRules';

interface ValidationRuleEditorProps {
  validation: Validation;
  allFields: Field[];
  validationRules?: ValidationRuleConfig[];
  onUpdate: (updatedValidation: Partial<Validation> & { id: string }) => void;
  onDelete: (validationId: string) => void;
}

const ValidationRuleEditor: React.FC<ValidationRuleEditorProps> = ({
  validation,
  allFields,
  validationRules,
  onUpdate,
  onDelete,
}) => {
  // État pour gérer l'ouverture/fermeture de la validation
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // État pour gérer l'affichage du mode test ou édition
  const [viewMode, setViewMode] = useState<'edit' | 'test'>('edit');

  // États pour gérer la séquence de validation
  const [validationSequence, setValidationSequence] = useState<ValidationItem[]>(() => {
    try {
      if (validation.value) {
        // Vérifions si la valeur semble être un JSON ou une simple chaîne
        if (validation.value.startsWith('[') || validation.value.startsWith('{')) {
          return JSON.parse(validation.value);
        } else {
          // Si ce n'est pas un JSON, c'est probablement une valeur simple comme "email"
          // Créons un élément de séquence de validation à partir de cette valeur
          return [{
            type: 'value',
            id: `value-${Date.now()}`,
            value: validation.value,
            label: validation.value
          }];
        }
      }
    } catch (e) {
      console.error('Erreur lors du parsing de la séquence de validation:', e);
    }
    return [];
  });
  const [validationName, setValidationName] = useState<string>(validation.message || '');

  // Fonction pour mettre à jour la séquence de validation
  const updateSequence = (newSequence: ValidationItem[]) => {
    setValidationSequence(newSequence);
    
    // Mettre à jour la validation via onUpdate
    let valueToUpdate;
    
    if (newSequence.length === 0) {
      valueToUpdate = null;
    } else if (newSequence.length === 1 && newSequence[0].type === 'value' && typeof newSequence[0].value === 'string') {
      // Pour les validations simples (comme "email"), on peut stocker directement la valeur
      valueToUpdate = newSequence[0].value;
    } else {
      // Pour les séquences complexes, on stocke le JSON
      valueToUpdate = JSON.stringify(newSequence);
    }
    
    console.log(`[ValidationRuleEditor] Mise à jour de la séquence pour ${validation.id}:`, valueToUpdate);
    
    onUpdate({
      id: validation.id,
      value: valueToUpdate
    });
  };
  
  // Mettre à jour le nom de la validation
  useEffect(() => {
    if (validation.message !== validationName) {
      onUpdate({
        id: validation.id,
        message: validationName
      });
    }
  }, [validationName, validation.id]);

  const [allFormulas, setAllFormulas] = useState<Array<{
    id: string;
    name: string;
    fieldId: string;
    fieldLabel?: string;
  }>>([]);
  
  // Charger les formules depuis l'API
  useEffect(() => {
    const fetchAllFormulas = async () => {
      try {
        // Appel direct à l'API pour récupérer toutes les formules de tous les champs
        const response = await fetch('/api/formulas/all', {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('Erreur lors du chargement des formules:', response.statusText);
          return;
        }
        
        const formulasData = await response.json();
        setAllFormulas(formulasData);
      } catch (error) {
        console.error('Erreur lors du chargement des formules:', error);
        // En cas d'erreur, utiliser des données de test
        const mockFormulas = [
          { id: 'form-1', name: 'Calcul de prix HT', fieldId: 'price-field', fieldLabel: 'Prix' },
          { id: 'form-2', name: 'Calcul de TVA', fieldId: 'tax-field', fieldLabel: 'Taxe' },
          { id: 'form-3', name: 'Total avec remise', fieldId: 'total-field', fieldLabel: 'Total' },
        ];
        
        setAllFormulas(mockFormulas);
      }
    };
    
    fetchAllFormulas();
  }, []);
  
  // Sélectionner une formule
  const handleSelectFormula = (formulaId: string) => {
    const selectedFormula = allFormulas.find(f => f.id === formulaId);
    if (selectedFormula) {
      // Création d'un nouvel élément de type formule pour la validation
      const formulaItem: ValidationItem = {
        type: 'formula',
        id: `formula-ref-${selectedFormula.id}`,
        value: selectedFormula.id,
        label: `Formule: ${selectedFormula.name}`,
        referenceFieldId: selectedFormula.fieldId
      };
      
      updateSequence([...validationSequence, formulaItem]);
    }
  };
  
  // Utilisation de validationRules pour le debugging si disponible
  useEffect(() => {
    if (validationRules && validationRules.length > 0) {
      console.log(`[ValidationRuleEditor] Règles de validation disponibles pour ${validation.id}:`, 
        validationRules.map(rule => rule.label).join(', ')
      );
    }
  }, [validationRules, validation.id]);
  
  // Mettre à jour la séquence de validation lorsque validation.value change
  useEffect(() => {
    // On ajoute un ref pour éviter les mises à jour inutiles et les boucles infinies
    const currentValue = JSON.stringify(validationSequence);
    const isSimpleValue = validationSequence.length === 1 && 
                         validationSequence[0].type === 'value' && 
                         typeof validationSequence[0].value === 'string';
    
    // Comparaison pour éviter les mises à jour inutiles
    if (
      (validation.value === null && validationSequence.length === 0) ||
      (isSimpleValue && validationSequence[0].value === validation.value) ||
      (validation.value && validation.value.startsWith('[') && currentValue === validation.value)
    ) {
      return; // Pas besoin de mettre à jour
    }
    
    try {
      if (validation.value) {
        // Vérifions si la valeur semble être un JSON ou une simple chaîne
        if (validation.value.startsWith('[') || validation.value.startsWith('{')) {
          const parsedSequence = JSON.parse(validation.value);
          setValidationSequence(parsedSequence);
          console.log(`[ValidationRuleEditor] Séquence mise à jour depuis JSON pour ${validation.id}`);
        } else {
          // Si ce n'est pas un JSON, créons un élément simple
          setValidationSequence([{
            type: 'value',
            id: `value-${Date.now()}`,
            value: validation.value,
            label: validation.value
          }]);
          console.log(`[ValidationRuleEditor] Séquence mise à jour depuis valeur simple pour ${validation.id}: ${validation.value}`);
        }
      } else {
        setValidationSequence([]);
        console.log(`[ValidationRuleEditor] Séquence vidée pour ${validation.id}`);
      }
    } catch (e) {
      console.error('Erreur lors de la mise à jour de la séquence de validation:', e);
    }
  }, [validation.value, validation.id, validationSequence]);
  
  return (
    <div className="bg-white w-full max-w-full border border-gray-200 rounded-md mb-2 shadow-sm">
      {/* En-tête avec bouton ouvrir/fermer et supprimer - style identique à FormulaItemEditor */}
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
          <span className="font-medium">{validationName || "Règle de validation sans nom"}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(validation.id);
          }}
          className="ml-2 px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded-md"
        >
          Supprimer
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-4 max-w-full">
            {/* Section nom de la validation et formule à utiliser - placés côte à côte */}
            <div className="grid grid-cols-2 gap-4">
              {/* Nom de la validation - style identique à FormulaItemEditor */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la validation</label>
                <form onSubmit={(e) => {
                  e.preventDefault();
                }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={validationName}
                      onChange={(e) => setValidationName(e.target.value)}
                      placeholder="Nom de la validation"
                      className={`input input-bordered input-sm w-full ${validation.message !== validationName ? 'border-blue-500 bg-blue-50' : ''}`}
                      autoComplete="off"
                    />
                  </div>
                </form>
                {validation.message !== validationName && (
                  <p className="text-xs text-blue-600 mt-1">
                    <span className="font-bold">⚠️</span> Appuyez sur Entrée ou cliquez ailleurs pour sauvegarder le nom
                  </p>
                )}
                {validation.message === validationName && validationName && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-bold">✓</span> Nom actuel: {validationName}
                  </p>
                )}
              </div>
              
              {/* Select pour les formules existantes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Formule à utiliser</label>
                <select
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm"
                  onChange={(e) => handleSelectFormula(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Sélectionner une formule...</option>
                  {allFormulas.map((formula) => (
                    <option key={formula.id} value={formula.id}>
                      {formula.name} ({formula.fieldLabel || formula.fieldId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Zone de validation avec drag and drop - style identique à FormulaItemEditor */}
            <div className="w-full max-w-full">
              <div className="relative">
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded-t-md text-xs font-medium z-10">
                  Zone de dépôt
                </div>
                
                <div className="border border-dashed border-gray-300 rounded-md">
                  <ValidationZone 
                    validationId={validation.id}
                    sequence={validationSequence}
                    onSequenceChange={updateSequence}
                    availableFields={allFields.map(field => ({
                      id: field.id,
                      label: field.label,
                      sectionId: field.sectionId
                    }))}
                  />
                  {validationSequence.length === 0 && (
                    <div className="p-8 flex flex-col items-center justify-center">
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zone de prévisualisation avec bouton test */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Tester la validation</h3>
                <button
                  className={`px-3 py-1 text-xs rounded ${viewMode === 'test' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setViewMode(viewMode === 'test' ? 'edit' : 'test')}
                >
                  Test
                </button>
              </div>
              
              {viewMode === 'test' && (
                <ValidationPreview sequence={validationSequence} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationRuleEditor;
