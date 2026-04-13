import React from 'react';
import { Spin, Typography } from 'antd';
import { useConditionEvaluation } from '../hooks/useConditionEvaluation';
import type { TBLFormData } from '../hooks/useTBLSave';
import { logger } from '../../../../../lib/logger';

const { Text } = Typography;

interface TBLConditionFieldProps {
  conditionId: string;
  formData: TBLFormData;
  field: unknown;
  placeholder?: string;
}

export const TBLConditionField: React.FC<TBLConditionFieldProps> = ({
  conditionId,
  formData,
  field,
  placeholder = '🧮 Calcul...'
}) => {
  const { isLoading, result, error, conditionMet } = useConditionEvaluation(conditionId, formData);

  logger.debug(`🧮 [TBLConditionField] État pour ${conditionId}:`, {
    isLoading,
    result,
    error,
    conditionMet,
    formData: Object.keys(formData).length
  });

  if (isLoading) {
    return (
      <Text type="secondary">
        <Spin size="small" /> {placeholder}
      </Text>
    );
  }

  if (error) {
    return (
      <Text type="danger">
        ❌ Erreur: {error}
      </Text>
    );
  }

  if (!conditionMet && (result === null || result === undefined)) {
    return (
      <Text type="secondary">
        ⚪ Condition non remplie
      </Text>
    );
  }

  // Formater le résultat selon le type de champ
  const formatResult = (value: unknown) => {
    if (value === null || value === undefined) {
      return '---';
    }

    // Pour les champs numériques, appliquer la configuration
    if (field?.type === 'number' && field?.numberConfig) {
      const { unit = '', prefix = '', suffix = '', precision = 2 } = field.numberConfig;
      
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) {
        return `${prefix}---${suffix}${unit ? ` ${unit}` : ''}`;
      }
      
      return `${prefix}${numValue.toFixed(precision)}${suffix}${unit ? ` ${unit}` : ''}`;
    }

    // Pour les autres types, conversion simple
    return String(value);
  };

  return (
    <Text strong style={{ color: conditionMet ? '#52c41a' : '#1890ff' }}>
      {formatResult(result)}
    </Text>
  );
};
