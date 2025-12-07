import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../auth/useAuth';

// Interfaces pour la configuration
export interface TreeBranchLeafVariable {
  id: string;
  name: string;
  type: 'number' | 'text' | 'boolean' | 'date';
  defaultValue?: string | number | boolean;
  description?: string;
}

export interface TreeBranchLeafFieldConfig {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface TreeBranchLeafCalculationMode {
  id: string;
  code: string;
  label: string;
  capacity: string; // '1' | '2' | '3' | '4'
  fields: Array<{
    id: string;
    code: string;
    label: string;
    type: string;
    capacity: string;
    sourceRef?: string | null;
  }>;
}

export interface TreeBranchLeafConfig {
  variables: TreeBranchLeafVariable[];
  fields: TreeBranchLeafFieldConfig[];
  calculationModes: TreeBranchLeafCalculationMode[];
  meta?: {
    fetchedAt: string;
    source?: string;
  };
}

interface UseTreeBranchLeafConfigReturn {
  config: TreeBranchLeafConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook pour charger et gérer la configuration TreeBranchLeaf
 * Charge les variables, champs et modes de calcul disponibles
 */
export function useTreeBranchLeafConfig(): UseTreeBranchLeafConfigReturn {
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [config, setConfig] = useState<TreeBranchLeafConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const lastOrgIdRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger la configuration depuis l'API
      const [variablesResponse, fieldsResponse, modesResponse] = await Promise.all([
        api.get('/api/tbl/variables'),      // { variables, count }
        api.get('/api/tbl/fields'),         // { fields, count }
        api.get('/api/tbl/calculation-modes') // { modes, count }
      ]);

      const varsPayload = variablesResponse.data;
      const fieldsPayload = fieldsResponse.data;
      const modesPayload = modesResponse.data;

      // Normalisation défensive (si backend renvoie directement tableaux pour rétrocompat)
      const variables = Array.isArray(varsPayload?.variables) ? varsPayload.variables : Array.isArray(varsPayload) ? varsPayload : [];
      const fields = Array.isArray(fieldsPayload?.fields) ? fieldsPayload.fields : Array.isArray(fieldsPayload) ? fieldsPayload : [];
      const modes = Array.isArray(modesPayload?.modes) ? modesPayload.modes : Array.isArray(modesPayload) ? modesPayload : [];

      // Types défensifs minimaux pour éviter 'any'
      interface RawVarPayload { id: string; exposedKey?: string; displayFormat?: string; displayName?: string }
  interface RawFieldPayload { id: string; type?: string; label?: string; required?: boolean; defaultValue?: string | number | boolean | null }
      interface RawModeField { id: string; code?: string; label?: string; type?: string; capacity?: string; sourceRef?: string | null }
      interface RawModePayload { id: string; code?: string; label?: string; capacity?: string; fields?: RawModeField[] }

      const mappedVariables: TreeBranchLeafVariable[] = (variables as RawVarPayload[]).map(v => ({
        id: v.id,
        name: v.exposedKey || v.id,
        type: (v.displayFormat || '').startsWith('number') ? 'number' : 'text',
        defaultValue: undefined,
        description: v.displayName || undefined
      }));

      const mappedFields: TreeBranchLeafFieldConfig[] = (fields as RawFieldPayload[]).map(f => ({
        id: f.id,
        type: (f.type && ['text','number','select','checkbox','date'].includes(f.type)) ? (f.type as TreeBranchLeafFieldConfig['type']) : 'text',
        label: f.label || f.id,
        required: Boolean(f.required),
        defaultValue: f.defaultValue === null ? undefined : f.defaultValue
      }));

      const mappedModes: TreeBranchLeafCalculationMode[] = (modes as RawModePayload[]).map(m => ({
        id: m.id,
        code: m.code || m.id,
        label: m.label || m.code || m.id,
        capacity: m.capacity || '1',
        fields: Array.isArray(m.fields) ? m.fields.map(fld => ({
          id: fld.id,
            code: fld.code || fld.id,
            label: fld.label || fld.code || fld.id,
            type: fld.type || 'text',
            capacity: fld.capacity || m.capacity || '1',
            sourceRef: fld.sourceRef ?? null
        })) : []
      }));

      setConfig({
        variables: mappedVariables,
        fields: mappedFields,
        calculationModes: mappedModes,
        meta: { fetchedAt: new Date().toISOString(), source: 'api' }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Charger la configuration au montage
  const organizationId = currentOrganization?.id ?? null;

  useEffect(() => {
    const shouldFetch = !hasFetchedRef.current || lastOrgIdRef.current !== organizationId;
    if (!shouldFetch) {
      return;
    }

    hasFetchedRef.current = true;
    lastOrgIdRef.current = organizationId;
    fetchConfig();
  }, [fetchConfig, organizationId]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig
  };
}