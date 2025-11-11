/**
 * 🎯 Composant pour afficher les valeurs calculées depuis Prisma
 * 
 * Consomme le hook useNodeCalculatedValue
 * Remplace BackendValueDisplay pour utiliser les données stockées dans Prisma
 */

import React, { useMemo } from 'react';
import { Spin, Tooltip, Tag } from 'antd';
import { useNodeCalculatedValue } from '../hooks/useNodeCalculatedValue';

interface CalculatedValueDisplayProps {
  /** ID du nœud TreeBranchLeaf */
  nodeId: string;
  /** ID de l'arbre */
  treeId: string;
  /** ID de la soumission (optionnel, pour contextualiser) */
  submissionId?: string;
  /** Placeholder si pas de valeur */
  placeholder?: string;
  /** Nombre de décimales (pour les nombres) */
  precision?: number;
  /** Unité à afficher après la valeur (ex: "m²", "€", "%") */
  unit?: string;
  /** Mode d'affichage: "simple" | "card" | "badge" */
  displayMode?: 'simple' | 'card' | 'badge';
  /** Afficher les métadonnées (calculatedAt, calculatedBy) */
  showMetadata?: boolean;
  /** Classe CSS personnalisée */
  className?: string;
  /** Style personnalisé */
  style?: React.CSSProperties;
}

/**
 * 🎯 Composant simple pour afficher une valeur calculée
 * 
 * Aucun recalcul, aucune transformation
 * Juste afficher ce que le backend a stocké dans Prisma
 */
export const CalculatedValueDisplay: React.FC<CalculatedValueDisplayProps> = ({
  nodeId,
  treeId,
  submissionId,
  placeholder = '---',
  precision = 2,
  unit,
  displayMode = 'simple',
  showMetadata = false,
  className = '',
  style = {}
}) => {
  const { value, loading, error, calculatedAt, calculatedBy } = useNodeCalculatedValue(
    nodeId,
    treeId,
    submissionId
  );

  // Formater la valeur affichée
  const formattedValue = useMemo(() => {
    if (value === undefined || value === null || value === '∅') {
      return placeholder;
    }

    let displayValue: string;

    if (typeof value === 'number') {
      displayValue = value.toFixed(precision);
    } else if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        displayValue = num.toFixed(precision);
      } else {
        displayValue = value;
      }
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Oui' : 'Non';
    } else {
      displayValue = String(value);
    }

    // Ajouter l'unité
    if (unit && displayValue !== placeholder) {
      displayValue = `${displayValue} ${unit}`;
    }

    return displayValue;
  }, [value, precision, unit, placeholder]);

  // 🔴 Cas erreur
  if (error) {
    return (
      <Tooltip title={`Erreur: ${error}`}>
        <span className={`text-red-500 ${className}`} style={style}>
          Erreur
        </span>
      </Tooltip>
    );
  }

  // ⏳ Cas chargement
  if (loading) {
    return <Spin size="small" />;
  }

  // ✅ Valeur chargée
  const contentElement = (
    <span className={className} style={style}>
      {formattedValue}
    </span>
  );

  // 📊 Mode d'affichage
  switch (displayMode) {
    case 'badge':
      return (
        <Tooltip 
          title={showMetadata ? `Calculé par: ${calculatedBy}\nÀ: ${calculatedAt}` : ''}
        >
          <Tag color="blue">{formattedValue}</Tag>
        </Tooltip>
      );

    case 'card':
      return (
        <div
          className={`border border-gray-200 rounded p-2 bg-blue-50 ${className}`}
          style={style}
        >
          <div className="text-sm font-medium">{formattedValue}</div>
          {showMetadata && (
            <div className="text-xs text-gray-500 mt-1">
              <div>Calculé par: {calculatedBy}</div>
              <div>À: {calculatedAt}</div>
            </div>
          )}
        </div>
      );

    case 'simple':
    default:
      if (showMetadata && calculatedBy) {
        return (
          <Tooltip title={`Calculé par: ${calculatedBy}\nÀ: ${calculatedAt}`}>
            {contentElement}
          </Tooltip>
        );
      }
      return contentElement;
  }
};

// Export default
export default CalculatedValueDisplay;
