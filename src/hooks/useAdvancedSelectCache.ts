import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

/**
 * Cache unifié (global window) pour les arbres advanced_select.
 * Evite les disparitions et multiplie pas les fetchs concurrents.
 */
export interface AdvancedSelectCachedNode {
  id: string;
  label: string;
  value?: string;
  parentId: string | null;
  hasChildren: boolean;
  hasExtra: boolean;
  pathIds?: string[];
  pathLabels?: string[];
  nextFieldMeta?: { type?: string; placeholder?: string };
}
export interface AdvancedSelectTreeCacheEntry {
  loaded: boolean;
  nodesByParent: Record<string, AdvancedSelectCachedNode[]>;
  nodeById: Record<string, AdvancedSelectCachedNode>;
  ts: number;
  error?: string;
}

interface GlobalStoreShape { __advSelectCache?: Record<string, AdvancedSelectTreeCacheEntry>; }

const getGlobalCache = (): Record<string, AdvancedSelectTreeCacheEntry> => {
  try {
    const w = window as unknown as GlobalStoreShape;
    if (!w.__advSelectCache) w.__advSelectCache = {};
    return w.__advSelectCache;
  } catch {
    return {};
  }
};

/**
 * Hook principal. Fournit accès lecture + chargement/forceReload d'un arbre.
 * Idempotent: plusieurs appels ensureTree sur même fieldId ne déclenchent qu'un fetch.
 */
export function useAdvancedSelectCache() {
  const { get } = useAuthenticatedApi();
  const [, forceRender] = useState(0);
  const pending = useRef<Record<string, Promise<void>>>({});

  const ensureTree = useCallback(async (fieldId: string) => {
    const cache = getGlobalCache();
    if (cache[fieldId]?.loaded) return; // déjà chargé
    if (pending.current[fieldId]) return pending.current[fieldId];
    pending.current[fieldId] = (async () => {
      try {
        const resp = await get<unknown>(`/api/option-nodes/field/${encodeURIComponent(fieldId)}/tree`);
        let arr: unknown[] = [];
        if (Array.isArray(resp)) arr = resp as unknown[]; else if (resp && typeof resp === 'object' && 'data' in resp) {
          const d = (resp as { data?: unknown }).data; if (Array.isArray(d)) arr = d as unknown[];
        }
        const nodesByParent: Record<string, AdvancedSelectCachedNode[]> = {};
        const nodeById: Record<string, AdvancedSelectCachedNode> = {};
        interface RawNode { id:string; label:string; value?: string|null; children?: RawNode[]; parentId?: string|null; hasChildren?: boolean; hasExtra?: boolean; data?: unknown; pathIds?: string[]; pathLabels?: string[]; }
        const walk = (nodes: unknown[], parentId: string|null) => {
          for (const raw of nodes) {
            if(!raw || typeof raw !== 'object') continue;
            const n = raw as RawNode;
            let nextFieldMeta: { type?: string; placeholder?: string } | undefined;
            try {
              if (n.data && typeof n.data === 'object' && n.data.nextField) {
                const nf = n.data.nextField as { type?: string; placeholder?: string };
                nextFieldMeta = { type: nf.type, placeholder: nf.placeholder };
              }
            } catch { /* noop */ }
            const cn: AdvancedSelectCachedNode = {
              id: n.id,
              label: n.label,
              value: n.value || undefined,
              parentId,
              hasChildren: n.hasChildren || (Array.isArray(n.children) && n.children.length>0),
              hasExtra: !!n.hasExtra,
              pathIds: n.pathIds,
              pathLabels: n.pathLabels,
              nextFieldMeta,
            };
            nodeById[cn.id] = cn;
            const key = parentId || 'root';
            if (!nodesByParent[key]) nodesByParent[key] = [];
            nodesByParent[key].push(cn);
            if (Array.isArray(n.children) && n.children.length>0) walk(n.children, n.id);
          }
        };
        walk(arr, null);
        cache[fieldId] = { loaded: true, nodesByParent, nodeById, ts: Date.now() };
      } catch (e) {
        cache[fieldId] = { loaded: true, nodesByParent: {}, nodeById: {}, ts: Date.now(), error: (e as Error)?.message || 'fetch error' };
      } finally {
        forceRender(x => x + 1);
        delete pending.current[fieldId];
      }
    })();
    return pending.current[fieldId];
  }, [get]);

  const forceReload = useCallback(async (fieldId: string) => {
    const cache = getGlobalCache();
    delete cache[fieldId];
    forceRender(x => x + 1);
    await ensureTree(fieldId);
  }, [ensureTree]);

  const getTree = useCallback((fieldId: string): AdvancedSelectTreeCacheEntry | undefined => {
    return getGlobalCache()[fieldId];
  }, []);

  // Option: nettoyage vieux cache (>30min) lors du montage
  useEffect(() => {
    const cache = getGlobalCache();
    const now = Date.now();
    for (const k of Object.keys(cache)) {
      if (now - cache[k].ts > 30 * 60_000) delete cache[k];
    }
  }, []);

  return { ensureTree, forceReload, getTree };
}
