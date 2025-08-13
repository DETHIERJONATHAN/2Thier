import React, { useState } from 'react';
import type { Formula } from "../../store/slices/types";
import { evaluateFormula } from '../../utils/formulaEvaluator';
import { adaptFormulaForEvaluation, extractFieldInfoFromFormula } from '../../utils/formulaAdapter';

interface FormulaEvaluatorProps {
  formula: Formula;
}

/**
 * Composant intégré pour tester une formule directement dans l'éditeur
 */
const FormulaEvaluator: React.FC<FormulaEvaluatorProps> = ({ formula }) => {
  // Extraire les informations des champs et valeurs par défaut
  const { fieldIds, defaultValues } = extractFieldInfoFromFormula(formula);
  const [fieldValues, setFieldValues] = useState<Record<string, number>>(defaultValues);
  
  // Adapter la formule pour l'évaluation
  const adaptedFormula = adaptFormulaForEvaluation(formula);
  
  // Évaluer la formule avec les valeurs actuelles
  const evaluation = evaluateFormula(adaptedFormula, fieldValues);
  
  // Mettre à jour la valeur d'un champ
  const handleFieldValueChange = (fieldId: string, value: string) => {
    const numericValue = parseFloat(value);
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: isNaN(numericValue) ? 0 : numericValue
    }));
  };

  // Si pas de champs à tester
  if (fieldIds.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-700">
          Cette formule ne contient pas de champs à évaluer.
        </p>
      </div>
    );
  }
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-blue-50 p-3 border-b border-blue-100">
        <h3 className="text-sm font-medium text-blue-800">
          Tester cette formule avec des valeurs
        </h3>
        <p className="text-xs text-blue-600 mt-1">
          Ajustez les valeurs des champs pour voir le résultat de la formule en temps réel
        </p>
      </div>
      
      <div className="p-3 bg-white">
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fieldIds.map(fieldId => (
              <div key={fieldId} className="mb-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {fieldId}:
                </label>
                <input
                  type="number"
                  value={fieldValues[fieldId]}
                  onChange={(e) => handleFieldValueChange(fieldId, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Résultat</h4>
          <div className={`p-3 rounded-md ${
            evaluation.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {evaluation.success ? (
              <div>
                <span className="font-bold text-green-700">
                  {typeof evaluation.result === 'boolean' 
                    ? (evaluation.result ? 'Vrai' : 'Faux') 
                    : evaluation.result}
                </span>
                <div className="text-xs text-gray-600 mt-1">
                  Type: {typeof evaluation.result}
                </div>
              </div>
            ) : (
              <div className="text-red-700">
                Erreur: {evaluation.error || 'Erreur inconnue'}
              </div>
            )}
          </div>
        </div>
        
        {/* Étapes de calcul simplifiées */}
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase text-gray-500">Étapes de calcul</h4>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md mt-1 overflow-hidden">
            <div className="max-h-28 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1">Étape</th>
                    <th className="px-2 py-1">Opération</th>
                    <th className="px-2 py-1">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.debug.map((step, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1">{step.step}</td>
                      <td className="px-2 py-1">{step.operation}</td>
                      <td className="px-2 py-1 font-mono">{
                        step.value === null ? '-' : 
                        typeof step.value === 'boolean' ? 
                        (step.value ? 'Vrai' : 'Faux') : 
                        step.value
                      }</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaEvaluator;


