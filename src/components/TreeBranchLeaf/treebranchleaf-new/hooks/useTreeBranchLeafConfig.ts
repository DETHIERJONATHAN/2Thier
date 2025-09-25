import { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';

export interface TreeBranchLeafConfig {
  variables: {
    id: string;
    exposedKey: string;
    displayName: string;
    sourceRef: string | null;
    displayFormat: string;
  }[];
  calculModes: {
    id: string;
    code: string;
    label: string;
    fields: {
      id: string;
      code: string;
      label: string;
      type: string;
      unit?: string;
    }[];
  }[];
}

export function useTreeBranchLeafConfig() {
  const { api } = useAuthenticatedApi();
  const [config, setConfig] = useState<TreeBranchLeafConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const normalizeVariables = (payload: unknown): TreeBranchLeafConfig['variables'] => {
      if (!payload) return [];
      const toString = (val: unknown, fallback = ''): string => {
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        return fallback;
      };
      const asArray = (val: unknown): unknown[] => (Array.isArray(val) ? val : []);
      const payloadObj: Record<string, unknown> = (typeof payload === 'object' && payload !== null) ? (payload as Record<string, unknown>) : {};
      const listSource = 'variables' in payloadObj ? (payloadObj.variables) : payload;
      const rawList = asArray(listSource);
      return rawList
        .filter(v => typeof v === 'object' && v !== null)
        .map(v => {
          const o = v as Record<string, unknown>;
          const id = toString(o.id ?? o.nodeId, Math.random().toString(36).slice(2));
          const exposedKey = toString(o.exposedKey ?? o.code, '');
          const displayName = toString(
            o.displayName ?? o.exposedKey ?? o.code ?? o.id,
            'Variable'
          );
          const sourceRef = (typeof o.sourceRef === 'string') ? o.sourceRef : null;
          const displayFormat = toString(o.displayFormat, 'number');
          return { id, exposedKey, displayName, sourceRef, displayFormat };
        });
    };

    const normalizeModes = (payload: unknown): TreeBranchLeafConfig['calculModes'] => {
      if (!payload) return [];
      const toString = (val: unknown, fallback = ''): string => {
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        return fallback;
      };
      const payloadObj: Record<string, unknown> = (typeof payload === 'object' && payload !== null) ? (payload as Record<string, unknown>) : {};
      const listSource = 'modes' in payloadObj ? payloadObj.modes : payload;
      const rawList = Array.isArray(listSource) ? listSource : [];
      return rawList
        .filter(m => typeof m === 'object' && m !== null)
        .map(m => {
          const o = m as Record<string, unknown>;
          const id = toString(o.id, Math.random().toString(36).slice(2));
          const code = toString(o.code ?? o.id, 'mode');
          const label = toString(o.label ?? o.code ?? o.id, 'Mode');
          const fieldsRaw = Array.isArray(o.fields) ? o.fields : [];
          const fields = fieldsRaw
            .filter(f => typeof f === 'object' && f !== null)
            .map(f => {
              const ff = f as Record<string, unknown>;
              const fid = toString(ff.id ?? ff.code, Math.random().toString(36).slice(2));
              const fcode = toString(ff.code ?? ff.id, fid);
              const flabel = toString(ff.label ?? ff.code ?? ff.id, 'Champ');
              const ftype = toString(ff.type, 'text');
              const unit = typeof ff.unit === 'string' ? ff.unit : undefined;
              return { id: fid, code: fcode, label: flabel, type: ftype, unit };
            });
          return { id, code, label, fields };
        });
    };

    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      let vars: TreeBranchLeafConfig['variables'] = [];
      let modes: TreeBranchLeafConfig['calculModes'] = [];
      const partialErrors: string[] = [];

      // Exécuter les requêtes en parallèle mais de façon indépendante
      await Promise.all([
        (async () => {
          try {
            const r = await api.get('/api/tbl/variables');
            vars = normalizeVariables(r.data || r.data?.variables);
          } catch (e) {
            console.warn('[TBL Config] ⚠️ Variables non chargées:', e);
            partialErrors.push('variables');
          }
        })(),
        (async () => {
          try {
            const r = await api.get('/api/tbl/modes');
            modes = normalizeModes(r.data || r.data?.modes);
          } catch (e) {
            console.warn('[TBL Config] ⚠️ Modes non chargés:', e);
            partialErrors.push('modes');
          }
        })()
      ]);

      if (cancelled) return;

      // Fallback: si aucun mode mais des variables, générer un mode virtuel
      if (modes.length === 0 && vars.length > 0) {
        modes = [{
          id: 'mode_auto',
          code: 'auto',
          label: 'Mode Auto',
          fields: vars.slice(0, 25).map(v => ({
            id: v.id,
            code: v.exposedKey || v.id,
            label: v.displayName,
            type: v.displayFormat.startsWith('number') ? 'number' : 'text'
          }))
        }];
      }

      if (vars.length === 0 && modes.length === 0) {
        setError('Configuration TBL vide');
        setConfig(null);
      } else {
        if (partialErrors.length > 0) {
          setError(`Chargement partiel: ${partialErrors.join(', ')}`);
        }
        setConfig({ variables: vars, calculModes: modes });
      }
      setLoading(false);
    };

    loadConfig();
    return () => { cancelled = true; };
  }, [api]);

  return { config, loading, error };
}