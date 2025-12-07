import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spin, Empty, Tooltip } from 'antd';
import { CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';

interface CalculatedValueCardProps {
  /** ID du nœud à afficher */
  nodeId: string;
  /** ID de l'arbre pour les recalculs live */
  treeId?: string;
  /** Données du formulaire pour les recalculs live */
  formData?: Record<string, unknown>;
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
  /** Activer le recalcul live via preview-evaluate */
  enableLivePreview?: boolean;
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
  treeId,
  formData,
  unit,
  precision = 2,
  placeholder = '---',
  showMetadata = false,
  className,
  enableLivePreview = true
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
  
  const [refreshToken, setRefreshToken] = useState(0);
  const lastPreviewKeyRef = useRef<string | null>(null);
  const pendingRequestsRef = useRef(0);

  const startLoading = () => {
    pendingRequestsRef.current += 1;
    setLoading(true);
  };

  const stopLoading = () => {
    pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
    if (pendingRequestsRef.current === 0) {
      setLoading(false);
    }
  };

  const { signature: formSignature, normalizedFormData } = useMemo(() => {
    if (!formData) {
      return { signature: undefined, normalizedFormData: undefined };
    }
    try {
      const json = JSON.stringify(formData);
      const parsed = JSON.parse(json);
      return { signature: json, normalizedFormData: parsed as Record<string, unknown> };
    } catch (err) {
      console.warn('⚠️ [CalculatedValueCard] Impossible de sérialiser formData:', err);
      return { signature: String(Date.now()), normalizedFormData: formData };
    }
  }, [formData]);

  const forceRefresh = () => {
    setRefreshToken((token) => token + 1);
  };

  // 🔔 Si l'événement global tbl-node-updated contient notre nodeId, forcer un refresh
  useEffect(() => {
    const handler = (event: Event) => {
      try {
        const custom = event as CustomEvent<{ node?: { id?: string } }>;
        const node = custom.detail?.node;
        if (node && node.id && node.id === nodeId) {
          console.log('🔔 [CalculatedValueCard] tbl-node-updated reçu pour nodeId -> refresh', nodeId);
          forceRefresh();
        }
      } catch (e) {
        // noop
      }
    };
    window.addEventListener('tbl-node-updated', handler);
    return () => window.removeEventListener('tbl-node-updated', handler);
  }, [nodeId]);

  const extractResultValue = useCallback((result: Record<string, unknown>) => {
    let backendValue = (result.value ?? result.calculatedValue ?? null) as unknown;
    if (backendValue && typeof backendValue === 'object' && !Array.isArray(backendValue)) {
      const obj = backendValue as Record<string, unknown>;
      const extracted = obj.value ?? obj.result ?? obj.calculatedValue ?? obj.text ?? obj.humanText ?? backendValue;
      backendValue = extracted;
      if (backendValue && typeof backendValue === 'object' && !Array.isArray(backendValue)) {
        const deepObj = backendValue as Record<string, unknown>;
        backendValue = deepObj.value ?? deepObj.result ?? deepObj.calculatedValue ?? backendValue;
      }
    }
    return backendValue;
  }, []);

  const resolvePreviewResult = useCallback((results: Array<Record<string, unknown>>) => {
    if (!Array.isArray(results)) return undefined;
    const tryIds = [nodeId];
    if (nodeId.endsWith('-1')) {
      tryIds.push(nodeId.slice(0, -2));
    } else {
      tryIds.push(`${nodeId}-1`);
    }
    for (const candidateId of tryIds) {
      const match = results.find(r => r.nodeId === candidateId);
      if (match) return match;
    }
    return undefined;
  }, [nodeId]);

  useEffect(() => {
    if (!nodeId || !api) {
      setValue(undefined);
      return;
    }

    let cancelled = false;

    const fetchCalculatedValue = async () => {
      try {
        startLoading();
        setError(undefined);

        console.log(`🔍 [CalculatedValueCard] Récupération valeur stockée pour nodeId: ${nodeId}`);

        const response = await api.get<{
          success?: boolean;
          nodeId: string;
          label?: string;
          value: unknown;
          calculatedAt?: string;
          calculatedBy?: string;
          type?: string;
          fieldType?: string;
        }>(`/api/tree-nodes/${nodeId}/calculated-value`);

        if (cancelled) return;

        if (response && (response.value !== undefined && response.value !== null || (response as Record<string, unknown>).calculatedValue !== undefined)) {
          const finalValue = response.value ?? (response as Record<string, unknown>).calculatedValue;
          setValue(finalValue);
          setCalculatedAt(response.calculatedAt);
          setCalculatedBy(response.calculatedBy);
          console.log(`✅ [CalculatedValueCard] Valeur persistée récupérée`, finalValue);
        } else {
          console.log(`⚠️ [CalculatedValueCard] Aucune valeur persistée pour ${nodeId}`);
          if (!enableLivePreview) {
            setValue(undefined);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`❌ [CalculatedValueCard] Erreur récupération Prisma:`, err);
          setError('Erreur lors du chargement');
          setValue(undefined);
        }
      } finally {
        if (!cancelled) {
          stopLoading();
        }
      }
    };

    fetchCalculatedValue();

    return () => {
      cancelled = true;
    };
  }, [nodeId, api, enableLivePreview, refreshToken]);

  useEffect(() => {
    if (!enableLivePreview) return;
    if (!nodeId || !treeId || !normalizedFormData || !api || !formSignature) return;

    const previewKey = `${nodeId}:${formSignature}`;
    if (lastPreviewKeyRef.current === previewKey) {
      return;
    }
    lastPreviewKeyRef.current = previewKey;

    let cancelled = false;

    const runPreview = async () => {
      try {
        startLoading();
        setError(undefined);

        console.log(`🚀 [CalculatedValueCard] Preview-evaluate pour nodeId ${nodeId}`);

        const previewResponse = await api.post<{
          success: boolean;
          results: Array<Record<string, unknown>>;
        }>('/api/tbl/submissions/preview-evaluate', {
          treeId,
          formData: normalizedFormData,
          leadId: normalizedFormData.__leadId
        });

        if (cancelled) return;

        if (previewResponse?.success && Array.isArray(previewResponse.results)) {
          const result = resolvePreviewResult(previewResponse.results);
          if (result) {
            const backendValue = extractResultValue(result);
            console.log(`✅ [CalculatedValueCard] Preview trouvé:`, backendValue);
            setValue(backendValue);
            setCalculatedBy(result.operationSource as string | undefined ?? 'live-preview');
            setCalculatedAt(new Date().toISOString());
            forceRefresh();
          } else {
            console.warn(`⚠️ [CalculatedValueCard] Aucun résultat preview pour ${nodeId}`);
          }
        } else {
          console.warn(`⚠️ [CalculatedValueCard] Preview-evaluate sans succès pour ${nodeId}`);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`❌ [CalculatedValueCard] Erreur preview-evaluate:`, err);
        }
      } finally {
        if (!cancelled) {
          stopLoading();
        }
      }
    };

    runPreview();

    return () => {
      cancelled = true;
    };
  }, [enableLivePreview, nodeId, treeId, api, formSignature, normalizedFormData, resolvePreviewResult, extractResultValue]);

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
