import React, { useState, useEffect } from 'react';
import type { FieldValidation } from "../../store/slices/types";
import { validateValidation, getAPIHeaders } from '../../utils/validationValidator';
import ValidationEvaluator from './ValidationEvaluator';

interface ValidationItemEditorProps {
  validation: FieldValidation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}

/**
 * Affiche une seule validation et son éditeur si elle est dépliée.
 */
export const ValidationItemEditor: React.FC<ValidationItemEditorProps> = ({ 
  validation, 
  isExpanded,
  onToggleExpand,
  onDelete
}) => {
  // Vérifier que la validation est valide
  if (!validation || !validation.id) {
    console.error("[ValidationItemEditor] Validation is undefined or missing ID");
    return (
      <div className="p-2 bg-red-50 text-red-800 text-xs rounded border border-red-200">
        Erreur: Validation invalide ou corrompue
      </div>
    );
  }

  // Initialiser avec le nom actuel ou "Nouvelle validation" par défaut
  const initialName = validation.name || "Nouvelle validation";
  console.log(`[ValidationItemEditor] 🏷️ Initialisation avec nom: "${initialName}" pour validation ${validation.id}`);
  const [name, setName] = useState(initialName);
  
  // État pour gérer l'affichage du mode test ou édition
  const [viewMode, setViewMode] = useState<'edit' | 'test'>('edit');

  // Mettre à jour le nom local si le nom de la validation change
  useEffect(() => {
    if (validation && validation.name) {
      console.log(`[ValidationItemEditor] 🔄 Mise à jour du nom local suite à changement: "${validation.name}"`);
      setName(validation.name);
    }
  }, [validation?.name])

  const handleNameBlur = () => {
    if (validation && validation.id && name !== validation.name) {
      console.log(`[ValidationItemEditor] ✏️ Mise à jour du nom de la validation ${validation.id}: "${validation.name}" => "${name}"`);
      
      // Valider la validation actuelle
      const validationResult = validateValidation(validation, 'ValidationItemEditor');
      if (!validationResult.isValid) {
        console.error(`[ValidationItemEditor] ❌ Validation de l'objet validation échouée: ${validationResult.message}`, validationResult.details);
        return;
      }
      
      // Préparer les données pour l'API directement
      const updatedValidationData = {
        id: validation.id,
        name: name,
        sequence: validation.sequence || { validationSequence: [], comparisonSequence: [] },
        errorMessage: validation.sequence?.errorMessage || "Valeur invalide",
        targetFieldId: validation.targetFieldId
      };
      
      // Utiliser les headers standard
      const headers = getAPIHeaders();
      
      console.log(`[ValidationItemEditor] 📤 Envoi de la mise à jour directe à l'API`);
      
      // Mettre à jour directement via l'API au lieu du store
      fetch(`/api/validations/${validation.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedValidationData)
      })
      .then(response => {
        if (response.ok) {
          console.log(`[ValidationItemEditor] ✅ Nom de la validation mis à jour avec succès via API directe`);
          // Déclencher un événement personnalisé pour informer le parent
          setTimeout(() => {
            const event = new CustomEvent('validation-updated', { 
              detail: { validationId: validation.id, success: true } 
            });
            document.dispatchEvent(event);
          }, 300);
        } else {
          console.error(`[ValidationItemEditor] ❌ Échec de la mise à jour du nom via API: ${response.statusText}`);
        }
      })
      .catch(error => {
        console.error(`[ValidationItemEditor] ❌ Erreur lors de la mise à jour du nom via API:`, error);
      });
    }
  };

  // Debug limité en mode développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ValidationItemEditor] Rendering validation ${validation.id}, isExpanded=${isExpanded}`, {
      name: validation.name,
      id: validation.id,
      sequence: validation.sequence
    });
  }

  return (
    <div className="bg-white w-full border border-gray-200 rounded-md shadow-sm">
      {/* En-tête de la validation avec bouton ouvrir/fermer et supprimer (identique aux formules) */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div 
          className="flex-grow flex items-center cursor-pointer" 
          onClick={onToggleExpand}
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
          <span className="font-medium">{validation.name || "Validation sans nom"}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded-md font-medium"
        >
          Supprimer
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-4 max-w-full">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la validation</label>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleNameBlur();
              }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                    placeholder="Nom de la validation"
                    className={`input input-bordered input-sm w-full ${validation.name !== name ? 'border-blue-500 bg-blue-50' : ''}`}
                    autoComplete="off"
                  />
                  {validation.name !== name && (
                    <button 
                      type="submit" 
                      className="btn btn-sm btn-primary"
                      title="Enregistrer le nom"
                    >
                      Enregistrer
                    </button>
                  )}
                </div>
              </form>
              {validation.name !== name && (
                <p className="text-xs text-blue-600 mt-1">
                  <span className="font-bold">⚠️</span> Appuyez sur Entrée, le bouton Enregistrer ou cliquez ailleurs pour sauvegarder le nom
                </p>
              )}
              {validation.name === name && name && (
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-bold">✓</span> Nom actuel: {name}
                </p>
              )}
            </div>

            <div className="w-full max-w-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Construction</label>
              
              {/* Zone de dépôt des séquences de validation - style identique aux formules */}
              <div className="min-h-[100px] p-3 border border-dashed rounded-md border-blue-300 bg-white transition-colors duration-200 mb-4">
                <div className="text-center bg-blue-500 text-white text-xs py-1 px-2 rounded-md font-medium mb-2 mx-auto max-w-fit">
                  Zone de dépôt
                </div>
                
                {validation.sequence?.validationSequence?.length ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <strong className="w-full text-xs text-gray-600 mb-1">Séquence à valider:</strong>
                    {validation.sequence.validationSequence.map((item, index) => (
                      <span key={index} className={`text-xs px-3 py-1 rounded-md ${
                        item.type === 'field' ? 'bg-blue-100 text-blue-800' :
                        item.type === 'operator' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      } flex items-center gap-1`}>
                        {item.type === 'field' ? item.label : String(item.value)}
                        <button className="text-gray-500 hover:text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <strong className="w-full text-xs text-gray-600 mb-1">Séquence à valider:</strong>
                    <div className="flex items-center justify-center h-[50px] w-full text-gray-400">
                      <p className="text-xs">Déposez ici les éléments de la séquence à valider...</p>
                    </div>
                  </div>
                )}
                
                {validation.sequence?.comparisonSequence?.length ? (
                  <div className="flex flex-wrap gap-2">
                    <strong className="w-full text-xs text-gray-600 mb-1">Séquence de comparaison:</strong>
                    {validation.sequence.comparisonSequence.map((item, index) => (
                      <span key={index} className={`text-xs px-3 py-1 rounded-md ${
                        item.type === 'field' ? 'bg-blue-100 text-blue-800' :
                        item.type === 'operator' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      } flex items-center gap-1`}>
                        {item.type === 'field' ? item.label : String(item.value)}
                        <button className="text-gray-500 hover:text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <strong className="w-full text-xs text-gray-600 mb-1">Séquence de comparaison:</strong>
                    <div className="flex items-center justify-center h-[50px] w-full text-gray-400">
                      <p className="text-xs">Déposez ici les éléments de comparaison...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Opérateurs disponibles */}
              <div className="mb-4">
                <div className="text-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Opérateurs disponibles:</h3>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {['=', '!=', '>', '<', '>=', '<=', '&&', '||'].map(op => (
                    <button key={op} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-mono hover:bg-yellow-200 transition-colors">
                      {op}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Message d'erreur</label>
                <input
                  type="text"
                  value={validation.sequence?.errorMessage || ""}
                  placeholder="Message affiché en cas d'erreur de validation"
                  className="input input-bordered input-sm w-full"
                  readOnly
                />
              </div>
              
              {/* Outil de test de validation intégré - style identique aux formules */}
              <div className="flex items-center justify-between mt-6">
                <h3 className="text-sm font-semibold text-gray-700">Tester la validation</h3>
                <button
                  className={`px-3 py-1 text-xs rounded ${viewMode === 'test' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => setViewMode(viewMode === 'test' ? 'edit' : 'test')}
                >
                  Test
                </button>
              </div>
              
              {viewMode === 'test' && (
                <div className="mt-2 border-t pt-2">
                  <ValidationEvaluator validation={validation} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Exporter le composant comme export par défaut (pour index.ts)
export default ValidationItemEditor;
