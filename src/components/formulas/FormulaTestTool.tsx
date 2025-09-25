import React, { useState } from 'react';
import { Formula } from '../../types/formula';
import { evaluateFormula } from '../../utils/formulaEvaluator';

interface FormulaTestToolProps {
  formula: Formula;
  initialValues?: Record<string, number>;
}

/**
 * Outil simple pour tester une formule avec des valeurs réelles
 */
const FormulaTestTool: React.FC<FormulaTestToolProps> = ({ formula, initialValues = {} }) => {
  // Extraire tous les champs de la formule
  const fieldsInFormula = formula.sequence
    .filter(item => item.type === 'field')
    .map(item => ({
      id: item.fieldId || String(item.value),
      label: item.label || String(item.value)
    }));
  
  // État pour les valeurs de chaque champ
  const [fieldValues, setFieldValues] = useState<Record<string, number>>(() => {
    // Initialiser avec les valeurs fournies ou 0 par défaut
    const values: Record<string, number> = {};
    fieldsInFormula.forEach(field => {
      values[field.id] = initialValues[field.id] !== undefined 
        ? initialValues[field.id] 
        : 0;
    });
    return values;
  });
  
  // Évaluer la formule avec les valeurs actuelles
  const evaluation = evaluateFormula(formula, fieldValues);
  
  // Mettre à jour la valeur d'un champ
  const handleFieldValueChange = (fieldId: string, value: string) => {
    const numericValue = parseFloat(value);
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: isNaN(numericValue) ? 0 : numericValue
    }));
  };
  
  // Réinitialiser toutes les valeurs
  const resetValues = () => {
    const values: Record<string, number> = {};
    fieldsInFormula.forEach(field => {
      values[field.id] = 0;
    });
    setFieldValues(values);
  };

  return (
    <div className="p-4 bg-white border rounded-md shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        Test de la formule: {formula.name || formula.id}
      </h2>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Séquence actuelle:</h3>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md flex flex-wrap gap-2">
          {formula.sequence.map((item, index) => (
            <span key={index} className={`px-2 py-1 rounded text-sm ${
              item.type === 'field' ? 'bg-blue-100 border border-blue-300' :
              item.type === 'operator' ? 'bg-yellow-100 border border-yellow-300' :
              item.type === 'value' ? 'bg-green-100 border border-green-300' :
              'bg-gray-100 border border-gray-300'
            }`}>
              {item.label || String(item.value)}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Valeurs de test:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {fieldsInFormula.map(field => (
            <div key={field.id} className="mb-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {field.label || field.id}:
              </label>
              <input
                type="number"
                value={fieldValues[field.id]}
                onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          ))}
        </div>
        <button
          onClick={resetValues}
          className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
        >
          Réinitialiser les valeurs
        </button>
      </div>
      
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-sm font-medium mb-2">Résultat:</h3>
        <div className={`p-3 rounded-md ${
          evaluation.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {evaluation.success ? (
            <div>
              <div className="font-bold">
                Valeur: {typeof evaluation.result === 'boolean' 
                  ? (evaluation.result ? 'Vrai' : 'Faux') 
                  : evaluation.result}
              </div>
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
      
      {/* Étapes de débogage */}
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Étapes de calcul:</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="p-1">Étape</th>
                <th className="p-1">Opération</th>
                <th className="p-1">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.debug.map((step, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-100' : ''}>
                  <td className="p-1">{step.step}</td>
                  <td className="p-1">{step.operation}</td>
                  <td className="p-1 font-mono">{
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
  );
};

export default FormulaTestTool;
