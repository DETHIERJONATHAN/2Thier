import React, { useState, useEffect } from 'react';
import type { Formula } from "../../store/slices/types";
import FormulaSequenceEditor from './FormulaSequenceEditor';
import OperatorsPalette from './OperatorsPalette';
import FunctionsPalette from './FunctionsPalette';
import FormulaEvaluator from './FormulaEvaluator';
import { validateFormula, getAPIHeaders } from '../../utils/formulaValidator';

interface FormulaItemEditorProps {
  formula: Formula;
  isOpen?: boolean; // Pour rétrocompatibilité
  isExpanded?: boolean;
  onToggleOpen?: () => void; // Pour rétrocompatibilité
  onToggleExpand?: () => void;
  onDelete: () => void;
  onUpdate?: (formula: Formula) => void;
  onFormulaChange?: () => void;
}

/**
 * Affiche une seule formule et son éditeur si elle est dépliée.
 */
const FormulaItemEditor: React.FC<FormulaItemEditorProps> = ({ 
  formula, 
  isOpen, 
  isExpanded,
  onToggleOpen,
  onToggleExpand,
  onDelete,
  onUpdate,
  onFormulaChange
}) => {
  // Utiliser les nouvelles props ou retomber sur les anciennes pour la rétrocompatibilité
  const isFormulaOpen = isExpanded !== undefined ? isExpanded : isOpen;
  const toggleFormula = onToggleExpand || onToggleOpen;
  // Vérifier que la formule est valide
  if (!formula || !formula.id) {
    console.error("[FormulaItemEditor] Formula is undefined or missing ID");
    return (
      <div className="p-2 bg-red-50 text-red-800 text-xs rounded border border-red-200">
        Erreur: Formule invalide ou corrompue
      </div>
    );
  }

  // Initialiser avec le nom actuel ou "Nouvelle formule" par défaut
  const initialName = formula.name || "Nouvelle formule";
  // Limiter les logs en mode développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FormulaItemEditor] 🏷️ Initialisation avec nom: "${initialName}" pour formule ${formula.id}`);
  }
  const [name, setName] = useState(initialName);
  
  // État pour gérer l'affichage du mode test ou édition
  const [viewMode, setViewMode] = useState<'edit' | 'test'>('edit');

  // Mettre à jour le nom local si le nom de la formule change
  useEffect(() => {
    if (formula && formula.name) {
      // Limiter les logs en mode développement
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FormulaItemEditor] 🔄 Mise à jour du nom local suite à changement: "${formula.name}"`);
      }
      setName(formula.name);
    }
  }, [formula?.name])

  const handleNameBlur = () => {
    if (formula && formula.id && name !== formula.name) {
      console.log(`[FormulaItemEditor] ✏️ Mise à jour du nom de la formule ${formula.id}: "${formula.name}" => "${name}"`);
      
      // Valider la formule actuelle
      const validation = validateFormula(formula, 'FormulaItemEditor');
      if (!validation.isValid) {
        console.error(`[FormulaItemEditor] ❌ Validation de la formule échouée: ${validation.message}`, validation.details);
        return;
      }
      
      // Préparer les données pour l'API directement, sans passer par prepareFormulaForAPI
      // Cela évite les problèmes de conversion de types entre les formules du store et notre utilitaire
      const updatedFormulaData = {
        id: formula.id,
        name: name,
        sequence: formula.sequence || [],
        targetProperty: formula.targetProperty,
        expression: formula.expression,
        targetFieldId: formula.targetFieldId,
        fieldId: formula.fieldId || formula.targetFieldId // S'assurer que le fieldId est envoyé explicitement
      };
      
      // Utiliser les headers standard
      const headers = getAPIHeaders();
      
      // Récupérer le fieldId associé à cette formule
      // Pour une formule, le targetFieldId est le fieldId où la formule est calculée/appliquée
      const fieldId = formula.fieldId || formula.targetFieldId;
      
      if (!fieldId) {
        console.error(`[FormulaItemEditor] ❌ Impossible de mettre à jour la formule: fieldId manquant.`);
        return;
      }
      
      console.log(`[FormulaItemEditor] 📤 Envoi de la mise à jour directe à l'API (fieldId: ${fieldId})`);
      
      // Utiliser l'URL qui fonctionne correctement avec le backend
      const apiUrl = `/api/fields/${fieldId}/formulas/${formula.id}`;
        
      // Mettre à jour directement via l'API au lieu du store
      fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedFormulaData)
      })
      .then(async response => {
        if (response.ok) {
          console.log(`[FormulaItemEditor] ✅ Nom de la formule mis à jour avec succès via API directe`);
          // Déclencher un événement personnalisé pour informer le parent (sans délai pour réduire les problèmes)
          const event = new CustomEvent('formula-updated', { 
            detail: { formulaId: formula.id, success: true, action: 'rename' } 
          });
          document.dispatchEvent(event);
          
          // Mettre à jour l'interface si onUpdate est défini
          if (onUpdate) {
            onUpdate({...formula, name: name});
          }
        } else {
          // Essayer de lire les détails de l'erreur
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || '';
          } catch (e) {
            // Ignore les erreurs de parsing
          }
          
          console.error(`[FormulaItemEditor] ❌ Échec de la mise à jour du nom via API: ${response.statusText}`, 
            errorDetails ? `\nDétails: ${errorDetails}` : '');
            
          // Afficher une notification dans l'interface utilisateur
          const errorMessage = document.createElement('div');
          errorMessage.className = 'fixed bottom-4 right-4 bg-red-100 text-red-800 p-2 rounded shadow z-50';
          errorMessage.innerText = `Erreur de sauvegarde: ${response.statusText}${errorDetails ? `\n${errorDetails}` : ''}`;
          document.body.appendChild(errorMessage);
          setTimeout(() => errorMessage.remove(), 5000);
        }
      })
      .catch(error => {
        console.error(`[FormulaItemEditor] ❌ Erreur lors de la mise à jour du nom via API:`, error);
      });
    }
  };

  // Debug limité en mode développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FormulaItemEditor] Rendering formula ${formula.id}, isOpen=${isFormulaOpen}`, {
      name: formula.name,
      id: formula.id,
      sequenceItems: formula.sequence?.length || 0
    });
  }

  // Affichage de l'en-tête de la formule et du contenu s'il est déplié
  return (
    <div className="bg-white w-full max-w-full border border-gray-200 rounded-md mb-2 shadow-sm">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div 
          className="flex-grow flex items-center cursor-pointer" 
          onClick={toggleFormula}
        >
          <div className="mr-2">
            {isFormulaOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
              </svg>
            )}
          </div>
          <span className="font-medium">{formula.name || "Formule sans nom"}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded-md"
        >
          Supprimer
        </button>
      </div>
      {isFormulaOpen && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
           <div className="flex flex-col gap-4 max-w-full">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la formule</label>
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
                      placeholder="Nom de la formule"
                      className={`input input-bordered input-sm w-full ${formula.name !== name ? 'border-blue-500 bg-blue-50' : ''}`}
                      autoComplete="off"
                    />
                  </div>
                </form>
                {formula.name !== name && (
                  <p className="text-xs text-blue-600 mt-1">
                    <span className="font-bold">⚠️</span> Appuyez sur Entrée ou cliquez ailleurs pour sauvegarder le nom
                  </p>
                )}
                {formula.name === name && name && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-bold">✓</span> Nom actuel: {name}
                  </p>
                )}
              </div>
              <div className="w-full max-w-full">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Construction</label>
                <div className="relative">
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded-t-md text-xs font-medium z-10">
                    Zone de dépôt
                  </div>
                  <FormulaSequenceEditor formula={formula} />
                </div>
                {/* Palettes d'opérateurs, fonctions et champs */}
                {formula && formula.id && (
                  <>
                    <OperatorsPalette formulaId={formula.id} formula={formula} />
                    <FunctionsPalette formulaId={formula.id} formula={formula} />

                    {/* Outil de test de formule intégré */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Tester la formule</h3>
                        <div className="flex items-center">
                          <button
                            className={`px-3 py-1 text-xs rounded ${viewMode === 'test' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                            onClick={() => setViewMode(viewMode === 'test' ? 'edit' : 'test')}
                          >
                            Test
                          </button>
                        </div>
                      </div>
                      
                      {viewMode === 'test' && (
                        <FormulaEvaluator formula={formula} />
                      )}
                    </div>
                  </>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FormulaItemEditor;


