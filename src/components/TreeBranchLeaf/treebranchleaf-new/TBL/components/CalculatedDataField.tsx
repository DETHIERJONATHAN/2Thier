import React from 'react';
import { useConditionEvaluation } from '../hooks/useConditionEvaluation';

interface CalculatedDataFieldProps {
  sourceRef: string;
  formData: Record<string, unknown>;
  displayFormat?: string;
  unit?: string;
  precision?: number;
  placeholder?: string;
}

export const CalculatedDataField: React.FC<CalculatedDataFieldProps> = ({
  sourceRef,
  formData,
  displayFormat = 'text',
  unit = '',
  precision = 2,
  placeholder = 'Calcul en cours...'
}) => {
  const conditionId = sourceRef.replace('condition:', '');
  const { result, isLoading, error } = useConditionEvaluation(conditionId, formData);

  // Gestion de l'affichage selon le format
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    
    switch (displayFormat) {
      case 'number': {
        const num = parseFloat(String(value));
        if (isNaN(num)) return '';
        return `${num.toFixed(precision)}${unit ? ' ' + unit : ''}`;
      }
      
      case 'currency': {
        const curr = parseFloat(String(value));
        if (isNaN(curr)) return '';
        return `${curr.toFixed(2)} €`;
      }
      
      case 'percentage': {
        const perc = parseFloat(String(value));
        if (isNaN(perc)) return '';
        return `${perc.toFixed(1)} %`;
      }
      
      default:
        return String(value);
    }
  };

  if (isLoading) {
    return (
      <div className="calculated-field loading">
        <span style={{ color: '#999', fontStyle: 'italic' }}>
          {placeholder}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calculated-field error">
        <span style={{ color: '#ff4d4f', fontStyle: 'italic' }}>
          Erreur de calcul
        </span>
      </div>
    );
  }

  const displayValue = formatValue(result);

  return (
    <div className="calculated-field result">
      <span style={{ 
        fontWeight: 'bold', 
        color: '#52c41a',
        fontSize: '14px'
      }}>
        {displayValue || 'Aucun résultat'}
      </span>
    </div>
  );
};
