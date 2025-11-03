import React from 'react';
import { useBackendValue } from '../../hooks/useBackendValue';
import { Spin, Tooltip, Typography } from 'antd';
import { TBLField } from '../TreeBranchLeaf/treebranchleaf-new/TBL/types/TBLField';

const { Text } = Typography;

interface BackendValueDisplayProps {
  nodeId: string;
  formData: any;
  displayConfig?: TBLField['metadata']['displayConfig'];
  label?: string;
}

const BackendValueDisplay: React.FC<BackendValueDisplayProps> = ({ nodeId, formData, displayConfig, label }) => {
  // Correction: Extraire le nodeId original si l'ID est "namespacé" par un répétiteur.
  const originalNodeId = nodeId.includes('__') ? nodeId.split('__')[0] : nodeId;

  const { value, loading, error, operationResult } = useBackendValue(originalNodeId, formData);

  if (loading) {
    return <Spin size="small" />;
  }

  if (error) {
    return <Text type="danger">Erreur</Text>;
  }

  const formattedValue =
    typeof value === 'number' && displayConfig?.precision
      ? value.toFixed(displayConfig.precision)
      : value;

  const unit = displayConfig?.unit || '';
  const finalValue = `${formattedValue} ${unit}`.trim();

  const tooltipTitle = operationResult?.humanText ? (
    <div>
      <p>
        <strong>{label}</strong>
      </p>
      <p>{operationResult.humanText}</p>
    </div>
  ) : null;

  return (
    <Tooltip title={tooltipTitle}>
      <span style={{ color: 'blue', fontWeight: 'bold' }}>{finalValue}</span>
    </Tooltip>
  );
};

export default BackendValueDisplay;
