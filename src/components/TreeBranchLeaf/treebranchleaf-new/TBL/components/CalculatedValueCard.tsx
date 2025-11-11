import React, { useEffect, useState, useRef } from 'react';
import { Spin, Empty, Tooltip } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';

interface CalculatedValueCardProps {
  /** ID du nœud à afficher */
  nodeId: string;
  /** Label du champ */
  label?: string;
  /** Unité à afficher après la valeur (ex: "m²", "€", "%") */
  unit?: string;
  /** Nombre de décimales (pour les nombres) */
  precision?: number;
  /** Placeholder si pas de valeur */
  placeholder?: string;
  /** Afficher les métadonnées (calculé à, par qui) */
  showMetadata?: boolean;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * 🎯 COMPOSANT CLEAN : Affiche les valeurs CALCULÉES depuis Prisma
 * 
 * Remplace complètement BackendValueDisplay
 * Affiche:
 * - La valeur stockée
 * - La date/heure du calcul
 * - Qui a calculé
 */
export const CalculatedValueCard: React.FC<CalculatedValueCardProps> = ({
  nodeId,
  unit,
  precision = 2,
  placeholder = '---',
  showMetadata = false,
  className
}) => {
  // 🔥 STABILISATION ULTRA CRITIQUE: Utiliser un REF pour que l'API ne change JAMAIS
  const apiHook = useAuthenticatedApi();
  const apiRef = useRef(apiHook.api);
  
  // Mettre à jour le ref seulement si api change vraiment
  useEffect(() => {
    if (apiHook.api && apiHook.api !== apiRef.current) {
      apiRef.current = apiHook.api;
    }
  }, [apiHook.api]);
  
  const api = apiRef.current;
  
  const [value, setValue] = useState<unknown>(undefined);
  const [calculatedAt, setCalculatedAt] = useState<string | undefined>();
  const [calculatedBy, setCalculatedBy] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  
  // 🔥 STABILISATION: Utiliser un ref pour éviter les appels multiples
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!nodeId || !api) {
      setValue(undefined);
      return;
    }
    
    // 🔥 PROTECTION: Ne pas refaire l'appel si déjà fait pour ce nodeId
    if (fetchedRef.current === nodeId) {
      return;
    }

    const fetchCalculatedValue = async () => {
      try {
        setLoading(true);
        setError(undefined);

        console.log(`🔍 [CalculatedValueCard] Récupération valeur stockée pour nodeId: ${nodeId}`);

        const response = await api.get<{
          nodeId: string;
          label?: string;
          value: unknown;
          calculatedAt?: string;
          calculatedBy?: string;
          type?: string;
          fieldType?: string;
        }>(`/api/tree-nodes/${nodeId}/calculated-value`);

        console.log(`📊 [CalculatedValueCard] Réponse complète:`, response);
        console.log(`📊 [CalculatedValueCard] response.value:`, response?.value);
        console.log(`📊 [CalculatedValueCard] response.calculatedValue:`, response?.calculatedValue);

        if (response && (response.value !== undefined && response.value !== null || response.calculatedValue !== undefined && response.calculatedValue !== null)) {
          const finalValue = response.value ?? response.calculatedValue;
          console.log(`✅ [CalculatedValueCard] Valeur trouvée:`, finalValue);
          setValue(finalValue);
          setCalculatedAt(response.calculatedAt);
          setCalculatedBy(response.calculatedBy);
          fetchedRef.current = nodeId; // ✅ Marquer comme récupéré
        } else {
          console.log(`⚠️ [CalculatedValueCard] Pas de valeur pour nodeId: ${nodeId}`);
          console.log(`⚠️ [CalculatedValueCard] Réponse reçue mais vide:`, response);
          setValue(undefined);
        }
      } catch (err) {
        console.error(`❌ [CalculatedValueCard] Erreur:`, err);
        setError('Erreur lors du chargement');
        setValue(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchCalculatedValue();
  }, [nodeId, api]); // ✅ AJOUT 'api' car utilisé dans le useEffect

  // Formatage de la valeur
  const formatValue = (val: unknown): string => {
    if (val === undefined || val === null || val === '' || val === '∅') {
      return placeholder;
    }

    let displayValue: string;

    if (typeof val === 'number') {
      displayValue = val.toFixed(precision);
    } else if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        displayValue = num.toFixed(precision);
      } else {
        displayValue = val;
      }
    } else if (typeof val === 'boolean') {
      displayValue = val ? 'Oui' : 'Non';
    } else {
      displayValue = String(val);
    }

    if (unit && displayValue !== placeholder) {
      displayValue = `${displayValue} ${unit}`;
    }

    return displayValue;
  };

  const displayValue = formatValue(value);

  // 🎨 Rendu: Carte propre avec la valeur
  return (
    <div className={`calculated-value-card-wrapper ${className || ''}`}>
      {loading ? (
        <div className="flex items-center justify-center p-4">
          <Spin size="small" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm p-2">{error}</div>
      ) : displayValue === placeholder ? (
        <Empty description="Aucune valeur" style={{ margin: '8px 0' }} />
      ) : (
        <div className="calculated-value-display">
          {/* 🎯 VALEUR PRINCIPALE */}
          <div className="text-lg font-semibold text-blue-600">
            {displayValue}
          </div>

          {/* 📝 MÉTADONNÉES (optionnel) */}
          {showMetadata && (
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              {calculatedAt && (
                <Tooltip title={`Calculé le ${dayjs(calculatedAt).format('DD/MM/YYYY HH:mm:ss')}`}>
                  <div className="flex items-center gap-1">
                    <CalendarOutlined />
                    <span>{dayjs(calculatedAt).format('DD/MM HH:mm')}</span>
                  </div>
                </Tooltip>
              )}
              {calculatedBy && (
                <div className="flex items-center gap-1">
                  <UserOutlined />
                  <span>{calculatedBy}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ✅ MÉMOÏSATION pour éviter les re-rendus inutiles
export default React.memo(CalculatedValueCard);
