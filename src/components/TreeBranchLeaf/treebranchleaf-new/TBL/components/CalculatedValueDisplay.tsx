/**
 * 🎯 Composant pour afficher les valeurs calculées depuis Prisma
 * 
 * Consomme le hook useNodeCalculatedValue
 * Remplace BackendValueDisplay pour utiliser les données stockées dans Prisma
 */

import React, { useMemo } from 'react';
import { Spin, Tooltip, Tag } from 'antd';
import { useNodeCalculatedValue } from '../../../../../hooks/useNodeCalculatedValue';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

interface CalculatedValueDisplayProps {
  /** ID du nœud TreeBranchLeaf */
  nodeId: string;
  /** ID de l'arbre */
  treeId: string;
  /** ID de la soumission (pour lire les valeurs des champs sources) */
  submissionId?: string;
  /** Placeholder si pas de valeur */
  placeholder?: string;
  /** Nombre de décimales (pour les nombres) */
  precision?: number;
  /** Unité à afficher après la valeur (ex: "m²", "€", "%") */
  unit?: string;
  /** Préfixe à afficher avant la valeur (ex: "$", "€") */
  prefix?: string;
  /** Suffixe à afficher après la valeur (ex: "%", "€") */
  suffix?: string;
  /** Mode d'affichage: "simple" | "card" | "badge" */
  displayMode?: 'simple' | 'card' | 'badge';
  /** Afficher les métadonnées (calculatedAt, calculatedBy) */
  showMetadata?: boolean;
  /** Classe CSS personnalisée */
  className?: string;
  /** Style personnalisé */
  style?: React.CSSProperties;
  /** Valeur locale à afficher tant que Prisma n'a rien retourné */
  fallbackValue?: string | number | boolean | null;
  /** Liste d'IDs de secours à interroger si le premier nodeId n'a pas de valeur stockée */
  fallbackNodeIds?: string[];
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
  prefix = '',
  suffix = '',
  displayMode = 'simple',
  showMetadata = false,
  className = '',
  style = {},
  fallbackValue
  , fallbackNodeIds = []
}) => {
  // ⚠️ DISPLAY FIELDS: Ne JAMAIS passer submissionId - calcul uniquement depuis l'arbre
  const { value, loading, error, calculatedAt, calculatedBy, refresh } = useNodeCalculatedValue(
    nodeId,
    treeId,
    undefined  // 🚫 submissionId désactivé pour display fields
  );

  // Support client-side fallback: try fallbackNodeIds if primary node returns nothing
  const [fallbackValueFound, setFallbackValueFound] = React.useState<null | string | number | boolean>(null);
  const [fallbackLoading, setFallbackLoading] = React.useState(false);
  const { api } = useAuthenticatedApi();

  const fallbackNodeIdsKey = (fallbackNodeIds || []).join(',');

  // Debugging helpful log for fallback flow
  if (typeof window !== 'undefined' && localStorage.getItem('TBL_DIAG') === '1') {
    console.log('[CalculatedValueDisplay] props', { nodeId, treeId, fallbackNodeIds });
  }

  React.useEffect(() => {
    let cancelled = false;
    const runFallbacks = async () => {
      if (!fallbackNodeIds || fallbackNodeIds.length === 0) return;
      console.log('[CalculatedValueDisplay] fallbackNodeIds to try:', fallbackNodeIds);
      try {
        setFallbackLoading(true);
        for (const fbId of fallbackNodeIds) {
          if (cancelled) return;
          if (!fbId) continue;
          // Skip if same as primary
          if (fbId === nodeId) continue;
          try {
            // 🚫 Ne pas passer submissionId pour les display fields
            const resp = await api.get(`/api/tree-nodes/${fbId}/calculated-value`);
            if (resp?.success && resp?.value !== undefined && resp?.value !== null) {
              if (cancelled) return;
              setFallbackValueFound(resp.value);
              if (typeof window !== 'undefined' && localStorage.getItem('TBL_DIAG') === '1') {
                console.log('[CalculatedValueDisplay] found fallback value for', fbId, resp.value);
              }
              setFallbackLoading(false);
              return;
            }
          } catch (err) { console.debug('[CalculatedValueDisplay] fallback fetch error', err); }
        }
      } finally {
        if (!cancelled) setFallbackLoading(false);
      }
    };

    // Only trigger fallbacks when main value is missing
    if ((value === undefined || value === null) && fallbackNodeIds && fallbackNodeIds.length > 0) {
      runFallbacks();
    } else {
      setFallbackValueFound(null);
    }

    return () => { cancelled = true; };
  }, [api, nodeId, treeId, submissionId, value, fallbackNodeIdsKey, fallbackNodeIds]);

  // Formater la valeur affichée
  const formattedValue = useMemo(() => {
    const raw = (value === undefined || value === null || value === '∅') ? (fallbackValueFound ?? fallbackValue) : value;
    if (raw === undefined || raw === null || raw === '∅') {
      return placeholder;
    }

    let displayValue: string;

    if (typeof raw === 'number') {
      displayValue = raw.toFixed(precision);
    } else if (typeof raw === 'string') {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        displayValue = num.toFixed(precision);
      } else {
        displayValue = raw;
      }
    } else if (typeof raw === 'boolean') {
      displayValue = raw ? 'Oui' : 'Non';
    } else {
      displayValue = String(raw);
    }

    // Ajouter prefix, suffix et unité
    if (displayValue !== placeholder) {
      // Préfixe en premier
      if (prefix) {
        displayValue = `${prefix}${displayValue}`;
      }
      // Suffixe ensuite (sans espace)
      if (suffix) {
        displayValue = `${displayValue}${suffix}`;
      }
      // Unité à la fin (avec espace)
      if (unit) {
        displayValue = `${displayValue} ${unit}`;
      }
    }

    return displayValue;
  }, [value, precision, unit, prefix, suffix, placeholder, fallbackValue, fallbackValueFound]);

  // 🔴 Cas erreur
  if (error) {
    return (
      <Tooltip title={`Erreur: ${error}`}>
        <span
          className={`text-red-500 ${className}`}
          style={style}
          role="button"
          tabIndex={0}
          onClick={refresh}
          onKeyDown={(evt) => {
            if (evt.key === 'Enter' || evt.key === ' ') {
              refresh();
            }
          }}
        >
          Erreur
        </span>
      </Tooltip>
    );
  }

  // ⏳ Cas chargement
  if (loading || fallbackLoading) {
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
