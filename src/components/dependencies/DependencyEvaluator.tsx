import React, { useState, useEffect } from 'react';
import type { FieldDependency } from "../../store/slices/types";
import { validateDependency, getAPIHeaders, evaluateDependency } from '../../utils/dependencyValidator';

interface DependencyEvaluatorProps {
  dependency: FieldDependency;
}

const DependencyEvaluator: React.FC<DependencyEvaluatorProps> = ({ dependency }) => {
  const [testValues, setTestValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ result: string; details?: any } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [fieldsInfo, setFieldsInfo] = useState<Array<{ id: string; label: string; type: string }>>([]);

  // Récupérer les informations sur les champs utilisés dans la dépendance
  useEffect(() => {
    const fetchFields = async () => {
      try {
        console.log(`[DependencyEvaluator] 🔍 Récupération des champs pour la dépendance ${dependency.id}`);

        // Collecter tous les IDs de champs utilisés dans la dépendance
        const fieldIds = new Set<string>();
        
        if (dependency.sequence?.conditions) {
          dependency.sequence.conditions.forEach(conditionGroup => {
            conditionGroup
              .filter(item => item.type === 'field' && item.id)
              .forEach(item => item.id && fieldIds.add(item.id));
          });
        }
        
        // Ajouter le champ cible
        if (dependency.targetFieldId) {
          fieldIds.add(dependency.targetFieldId);
        }
        
        // Si aucun champ n'est utilisé, on s'arrête là
        if (fieldIds.size === 0) {
          console.log(`[DependencyEvaluator] ℹ️ Aucun champ utilisé dans la dépendance ${dependency.id}`);
          return;
        }
        
        // Récupérer les informations sur les champs
        const fieldsData: Array<{ id: string; label: string; type: string }> = [];
        
        // Récupération des champs depuis l'API (on pourrait aussi les récupérer du store)
        const headers = getAPIHeaders();
        const promises = Array.from(fieldIds).map(fieldId => 
          fetch(`/api/fields/${fieldId}`, { headers })
            .then(response => {
              if (!response.ok) throw new Error(`Erreur lors de la récupération du champ ${fieldId}`);
              return response.json();
            })
            .then(field => {
              fieldsData.push({
                id: field.id,
                label: field.label || `Champ ${field.id}`,
                type: field.type || 'text'
              });
            })
            .catch(error => {
              console.error(`[DependencyEvaluator] ❌ ${error.message}`);
              // Ajouter une entrée minimale pour ce champ
              fieldsData.push({
                id: fieldId,
                label: `Champ ${fieldId}`,
                type: 'unknown'
              });
            })
        );
        
        // Attendre que toutes les requêtes soient terminées
        await Promise.all(promises);
        
        console.log(`[DependencyEvaluator] ✅ ${fieldsData.length} champs récupérés`);
        setFieldsInfo(fieldsData);
        
        // Initialiser les valeurs de test
        const initialTestValues: Record<string, unknown> = {};
        fieldsData.forEach(field => {
          // Initialiser avec des valeurs par défaut selon le type
          switch (field.type) {
            case 'number':
              initialTestValues[field.id] = 0;
              break;
            case 'checkbox':
              initialTestValues[field.id] = false;
              break;
            case 'date':
              initialTestValues[field.id] = new Date().toISOString().split('T')[0];
              break;
            default:
              initialTestValues[field.id] = '';
          }
        });
        
        setTestValues(initialTestValues);
        
      } catch (error) {
        console.error(`[DependencyEvaluator] ❌ Erreur lors de la récupération des champs:`, error);
      }
    };

    fetchFields();
  }, [dependency.id, dependency.sequence, dependency.targetFieldId]);

  const handleValueChange = (fieldId: string, value: unknown) => {
    setTestValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleEvaluate = () => {
    setIsEvaluating(true);
    try {
      const evaluationResult = evaluateDependency(dependency, testValues);
      console.log(`[DependencyEvaluator] 🧪 Résultat de l'évaluation:`, evaluationResult);
      setResult(evaluationResult);
    } catch (error) {
      console.error(`[DependencyEvaluator] ❌ Erreur lors de l'évaluation:`, error);
      setResult({
        result: 'error',
        details: error
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const renderFieldInput = (field: { id: string; label: string; type: string }) => {
    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            value={testValues[field.id] || 0}
            onChange={(e) => handleValueChange(field.id, Number(e.target.value))}
            className="input input-bordered input-sm w-full"
          />
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={testValues[field.id] || false}
            onChange={(e) => handleValueChange(field.id, e.target.checked)}
            className="checkbox"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={testValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className="input input-bordered input-sm w-full"
          />
        );
      case 'select':
        return (
          <input
            type="text"
            value={testValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            placeholder="Valeur de test"
            className="input input-bordered input-sm w-full"
          />
        );
      default:
        return (
          <input
            type="text"
            value={testValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            placeholder="Valeur de test"
            className="input input-bordered input-sm w-full"
          />
        );
    }
  };

  // Trouver le champ cible pour l'afficher différemment
  const targetField = fieldsInfo.find(field => field.id === dependency.targetFieldId);

  return (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
      <h3 className="text-sm font-semibold mb-2">Test de la dépendance</h3>
      
      {fieldsInfo.length === 0 ? (
        <div className="bg-yellow-50 p-2 rounded-md text-yellow-700 text-xs">
          <p>⚠️ Cette dépendance ne contient aucun champ à tester.</p>
          <p>Ajoutez des conditions pour pouvoir tester la dépendance.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Entrez des valeurs de test pour les champs de cette dépendance:</p>
            
            <div className="grid grid-cols-1 gap-3">
              {fieldsInfo
                .filter(field => field.id !== dependency.targetFieldId) // Exclure le champ cible
                .map(field => (
                  <div key={field.id} className="flex flex-col">
                    <label className="text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                    {renderFieldInput(field)}
                  </div>
                ))
              }
            </div>
            
            {/* Afficher le champ cible séparément avec un style spécial */}
            {targetField && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded">Champ cible</div>
                  <span className="text-xs font-medium">{targetField.label}</span>
                </div>
                <p className="text-xs text-blue-700">
                  Ce champ sera affecté par le résultat de l'évaluation de la dépendance.
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="btn btn-sm btn-primary w-full"
          >
            {isEvaluating ? 'Évaluation en cours...' : 'Tester la dépendance'}
          </button>
          
          {result && (
            <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200">
              <p className="font-medium text-sm text-blue-700">
                Résultat: <span className="font-bold">{result.result}</span>
              </p>
              
              <p className="text-xs mt-1 text-blue-600">
                {result.result === 'show' && "Le champ cible sera affiché"}
                {result.result === 'hide' && "Le champ cible sera masqué"}
                {result.result === 'require' && "Le champ cible sera obligatoire"}
                {result.result === 'unrequire' && "Le champ cible sera optionnel"}
                {result.result === 'error' && "Une erreur s'est produite lors de l'évaluation"}
              </p>
              
              {result.details && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer font-medium">Détails de l'évaluation</summary>
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DependencyEvaluator;


