import React, { useState, useEffect } from 'react';
import type { FieldValidation } from "../../store/slices/types";
import { validateValidation, getAPIHeaders, evaluateValidation } from '../../utils/validationValidator';
import { logger } from '../../lib/logger';

interface ValidationEvaluatorProps {
  validation: FieldValidation;
}

const ValidationEvaluator: React.FC<ValidationEvaluatorProps> = ({ validation }) => {
  const [testValues, setTestValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ isValid: boolean; error?: string; details?: any } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [fieldsInfo, setFieldsInfo] = useState<Array<{ id: string; label: string; type: string }>>([]);

  // Récupérer les informations sur les champs utilisés dans la validation
  useEffect(() => {
    const fetchFields = async () => {
      try {
        logger.debug(`[ValidationEvaluator] 🔍 Récupération des champs pour la validation ${validation.id}`);

        // Collecter tous les IDs de champs utilisés dans la validation
        const fieldIds = new Set<string>();
        
        if (validation.sequence?.validationSequence) {
          validation.sequence.validationSequence
            .filter(item => item.type === 'field' && item.id)
            .forEach(item => item.id && fieldIds.add(item.id));
        }
        
        if (validation.sequence?.comparisonSequence) {
          validation.sequence.comparisonSequence
            .filter(item => item.type === 'field' && item.id)
            .forEach(item => item.id && fieldIds.add(item.id));
        }
        
        // Si aucun champ n'est utilisé, on s'arrête là
        if (fieldIds.size === 0) {
          logger.debug(`[ValidationEvaluator] ℹ️ Aucun champ utilisé dans la validation ${validation.id}`);
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
              logger.error(`[ValidationEvaluator] ❌ ${error.message}`);
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
        
        logger.debug(`[ValidationEvaluator] ✅ ${fieldsData.length} champs récupérés`);
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
        logger.error(`[ValidationEvaluator] ❌ Erreur lors de la récupération des champs:`, error);
      }
    };

    fetchFields();
  }, [validation.id, validation.sequence]);

  const handleValueChange = (fieldId: string, value: unknown) => {
    setTestValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleEvaluate = () => {
    setIsEvaluating(true);
    try {
      const evaluationResult = evaluateValidation(validation, testValues);
      logger.debug(`[ValidationEvaluator] 🧪 Résultat de l'évaluation:`, evaluationResult);
      setResult(evaluationResult);
    } catch (error) {
      logger.error(`[ValidationEvaluator] ❌ Erreur lors de l'évaluation:`, error);
      setResult({
        isValid: false,
        error: `Erreur lors de l'évaluation: ${error}`,
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

  return (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
      <h3 className="text-sm font-semibold mb-2">Test de la validation</h3>
      
      {fieldsInfo.length === 0 ? (
        <div className="bg-yellow-50 p-2 rounded-md text-yellow-700 text-xs">
          <p>⚠️ Cette validation ne contient aucun champ à tester.</p>
          <p>Ajoutez des champs à la séquence pour pouvoir tester la validation.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Entrez des valeurs de test pour les champs utilisés dans cette validation:</p>
            
            <div className="grid grid-cols-1 gap-3">
              {fieldsInfo.map(field => (
                <div key={field.id} className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                  {renderFieldInput(field)}
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="btn btn-sm btn-primary w-full"
          >
            {isEvaluating ? 'Évaluation en cours...' : 'Tester la validation'}
          </button>
          
          {result && (
            <div className={`mt-4 p-3 rounded-md ${result.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-medium text-sm ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>
                {result.isValid ? '✅ Validation réussie' : `❌ ${result.error || 'Validation échouée'}`}
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

export default ValidationEvaluator;


