import React, { useState, useEffect } from 'react';
import { ValidationItem } from './types';

interface FormulasSelectorProps {
  fieldId: string;
  onSelectFormula: (formula: any) => void;
}

/**
 * Sélecteur de formules existantes pour l'éditeur de validation.
 * Permet de sélectionner des formules existantes dans d'autres champs.
 */
const FormulasSelector: React.FC<FormulasSelectorProps> = ({ fieldId, onSelectFormula }) => {
  const [formulas, setFormulas] = useState<Array<{
    id: string;
    name: string;
    fieldId: string;
    fieldLabel?: string;
  }>>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les formules depuis l'API
  useEffect(() => {
    const loadFormulas = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Dans un environnement de production, vous utiliseriez une API réelle
        // Pour le développement, nous utilisons des données simulées
        
        // Simulation de l'API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockFormulas = [
          { id: 'form-1', name: 'Calcul de prix HT', fieldId: 'price-field', fieldLabel: 'Prix' },
          { id: 'form-2', name: 'Calcul de TVA', fieldId: 'tax-field', fieldLabel: 'Taxe' },
          { id: 'form-3', name: 'Total avec remise', fieldId: 'total-field', fieldLabel: 'Total' },
        ];
        
        setFormulas(mockFormulas);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des formules');
        console.error('Erreur de chargement des formules:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadFormulas();
  }, [fieldId]);

  // Handler pour la sélection d'une formule
  const handleSelectFormula = (formulaId: string) => {
    const selectedFormula = formulas.find(f => f.id === formulaId);
    if (selectedFormula) {
      // Création d'un nouvel élément de type formule pour la validation
      const formulaItem: ValidationItem = {
        type: 'formula',
        id: `formula-ref-${selectedFormula.id}`,
        value: selectedFormula.id,
        label: `Formule: ${selectedFormula.name}`,
        referenceFieldId: selectedFormula.fieldId
      };
      
      onSelectFormula(formulaItem);
    }
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="w-full h-8 bg-gray-100 animate-pulse rounded"></div>
      ) : error ? (
        <div className="text-xs text-red-500">{error}</div>
      ) : (
        <select
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm"
          onChange={(e) => handleSelectFormula(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Sélectionner une formule...</option>
          {formulas.map(formula => (
            <option key={formula.id} value={formula.id}>
              {formula.name} ({formula.fieldLabel || formula.fieldId})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default FormulasSelector;
