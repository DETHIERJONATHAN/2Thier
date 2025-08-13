import { useState, useCallback } from 'react';
import { DependencyAction, DependencyResult } from '../../utils/dependencyFunctions';
import AdvancedDependencyEditor from './AdvancedDependencyEditor';

interface DependencyRulesProps {
  fieldId: string;
  initialRules?: string[];
  formValues?: Record<string, any>;
  onChange?: (rules: string[]) => void;
  onApply?: (results: DependencyResult[]) => void;
}

/**
 * Gestionnaire de règles de dépendance pour un champ
 * Permet de définir et d'appliquer des règles conditionnelles
 */
const DependencyRules = ({ fieldId, initialRules = [], formValues = {}, onChange, onApply }: DependencyRulesProps) => {
  const [rules, setRules] = useState<string[]>(initialRules);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Fonction pour mettre à jour un champ - simulation pour les tests
  const updateFormField = useCallback((fieldId: string, property: string, value: any) => {
    console.log(`[DependencyRules] Mise à jour du champ ${fieldId}, propriété ${property} = ${value}`);
    
    // Si onApply est fourni, on l'appelle avec les résultats des dépendances
    if (onApply) {
      // Créer un DependencyResult pour simuler l'application
      const result: DependencyResult = {
        action: property === 'visible' 
          ? (value ? DependencyAction.SHOW : DependencyAction.HIDE)
          : property === 'disabled' 
            ? (value ? DependencyAction.DISABLE : DependencyAction.ENABLE)
            : property === 'required'
              ? (value ? DependencyAction.SET_REQUIRED : DependencyAction.SET_OPTIONAL)
              : DependencyAction.SET_VALUE,
        targetField: fieldId,
        value: property === 'value' ? value : undefined,
        applied: true
      };
      
      onApply([result]);
    }
  }, [onApply]);
  
  // Évaluer les dépendances actuelles
  const handleEvaluateRules = useCallback(() => {
    try {
      // Convertir les règles sous forme de chaînes en fonctions
      // Note: cette étape nécessiterait normalement d'utiliser eval() ou Function(),
      // mais pour des raisons de sécurité, nous simulons ici l'évaluation
      
      console.log(`[DependencyRules] Évaluation de ${rules.length} règles pour le champ ${fieldId}`);
      
      // Simulation d'évaluation des règles
      const dummyResults: DependencyResult[] = rules.map((rule) => {
        // Exemple simple: si la règle contient "SHOW", on considère qu'elle montre le champ
        if (rule.includes('SHOW')) {
          return { 
            action: DependencyAction.SHOW, 
            targetField: fieldId, 
            applied: true 
          };
        } 
        // Exemple simple: si la règle contient "HIDE", on considère qu'elle cache le champ
        else if (rule.includes('HIDE')) {
          return { 
            action: DependencyAction.HIDE, 
            targetField: fieldId, 
            applied: true 
          };
        }
        // Par défaut, on retourne une règle non appliquée
        return { 
          action: DependencyAction.SHOW, 
          targetField: fieldId, 
          applied: false 
        };
      });
      
      // Appliquer les résultats
      if (onApply) {
        onApply(dummyResults.filter(r => r.applied));
      }
      
    } catch (error) {
      console.error('[DependencyRules] Erreur lors de l\'évaluation des règles:', error);
    }
  }, [fieldId, rules, onApply]);
  
  // Gestion des modifications des règles
  const handleRulesChange = useCallback((newRules: string[]) => {
    setRules(newRules);
    
    if (onChange) {
      onChange(newRules);
    }
    
    // Évaluer les nouvelles règles
    // Note: dans une implémentation réelle, on pourrait vouloir débouncer cet appel
    setTimeout(() => handleEvaluateRules(), 100);
  }, [onChange, handleEvaluateRules]);
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Règles de dépendance</h3>
          <p className="text-xs text-gray-500">{rules.length} règle(s) définie(s)</p>
        </div>
        
        <button
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          onClick={() => setIsEditorOpen(!isEditorOpen)}
        >
          {isEditorOpen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fermer
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Configurer
            </>
          )}
        </button>
      </div>
      
      {/* Résumé des règles quand l'éditeur est fermé */}
      {!isEditorOpen && rules.length > 0 && (
        <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-2">
          <ul className="text-xs text-gray-700 space-y-1">
            {rules.map((rule, index) => (
              <li key={index} className="flex items-center">
                <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">
                  {index + 1}
                </span>
                <code className="font-mono bg-gray-100 px-1 py-0.5 rounded truncate max-w-xs">
                  {rule}
                </code>
              </li>
            ))}
          </ul>
          
          <button 
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
            onClick={handleEvaluateRules}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tester les règles
          </button>
        </div>
      )}
      
      {/* Éditeur de dépendances */}
      {isEditorOpen && (
        <AdvancedDependencyEditor
          fieldId={fieldId}
          initialDependencies={rules}
          onChange={handleRulesChange}
        />
      )}
    </div>
  );
};

export default DependencyRules;
