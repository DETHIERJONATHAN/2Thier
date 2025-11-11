import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

export interface PreloadedTBLCapability {
  nodeId: string;
  variableId?: string;
  sourceRef?: string | null;
  sourceType?: string | null;
  exposedKey?: string | null;
  displayName?: string | null;
  capacity: 'data' | 'formula' | 'condition' | 'table' | 'fixed' | 'unknown';
  hasFormula?: boolean;
  hasCondition?: boolean;
  hasTable?: boolean;
  fixedValue?: string | null;
  dependencies?: string[];
  raw?: Record<string, unknown>;
}

interface UseTBLCapabilitiesPreloadOptions {
  treeId?: string;
  enabled?: boolean;
  includeRaw?: boolean;
  extractDependencies?: boolean;
  refetchIntervalMs?: number; // pour futur polling / invalidation
}

interface UseTBLCapabilitiesPreloadResult {
  loading: boolean;
  error: string | null;
  capabilities: PreloadedTBLCapability[];
  byNodeId: Map<string, PreloadedTBLCapability>;
  // dependencyGraph: chaque référence (variable:xxx, formula:yyy...) -> liste des capabilities (nodeId) qui en dépendent
  dependencyGraph: Map<string, Set<string>>;
  // reverseGraph: nodeId -> liste des références dont il dépend (copie normalisée de capability.dependencies)
  reverseGraph: Map<string, Set<string>>;
  refetch: () => Promise<void>;
  lastUpdated?: string;
}

const ddiag = (...args: unknown[]) => {
  try {
    if (localStorage.getItem('TBL_DIAG')) {
      console.log('[TBL][CAPA-PRELOAD]', ...args);
    }
  } catch {
    /* noop */
  }
};

export function useTBLCapabilitiesPreload(options: UseTBLCapabilitiesPreloadOptions): UseTBLCapabilitiesPreloadResult {
  const { treeId, enabled = true, includeRaw = false, extractDependencies = true, refetchIntervalMs } = options;
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreloadedTBLCapability[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  const intervalRef = useRef<number | null>(null);

  const fetchCapabilities = useMemo(() => async () => {
    if (!treeId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('treeId', treeId);
      if (includeRaw) params.set('raw', '1');
      if (extractDependencies) params.set('deps', '1');
  const resp = await api.get(`/api/tbl/capabilities?${params.toString()}`);
      const json = resp?.data || resp; // selon impl api
      ddiag('Fetched capabilities', json?.count);
      setData(json?.capabilities || []);
      setLastUpdated(json?.meta?.extractedAt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(msg);
      ddiag('Erreur fetch capabilities', msg, e);
    } finally {
      setLoading(false);
    }
  }, [api, treeId, enabled, includeRaw, extractDependencies]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  // Optionnel: refetch périodique (cache invalidation future)
  useEffect(() => {
    if (!refetchIntervalMs || !enabled) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      fetchCapabilities();
    }, refetchIntervalMs);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [refetchIntervalMs, fetchCapabilities, enabled]);

  const byNodeId = useMemo(() => {
    const m = new Map<string, PreloadedTBLCapability>();
    for (const c of data) m.set(c.nodeId, c);
    return m;
  }, [data]);

  // Construction des graphes de dépendances
  const { dependencyGraph, reverseGraph } = useMemo(() => {
    const depGraph = new Map<string, Set<string>>();
    const revGraph = new Map<string, Set<string>>();
    for (const c of data) {
      const deps = c.dependencies || [];
      if (!revGraph.has(c.nodeId)) revGraph.set(c.nodeId, new Set());
      for (const rawRef of deps) {
        const ref = rawRef.trim();
        if (!ref) continue;
        if (!depGraph.has(ref)) depGraph.set(ref, new Set());
        depGraph.get(ref)!.add(c.nodeId);
        revGraph.get(c.nodeId)!.add(ref);
      }
    }
    return { dependencyGraph: depGraph, reverseGraph: revGraph };
  }, [data]);

  return {
    loading,
    error,
    capabilities: data,
    byNodeId,
    dependencyGraph,
    reverseGraph,
    refetch: fetchCapabilities,
    lastUpdated
  };
}
