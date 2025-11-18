import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { dlog } from '../../../../../utils/debug';
import {
  transformNodesToTBLComplete,
  createAutomaticMirrors,
  type TreeBranchLeafNode,
  type TBLField,
  type TBLSection,
  type TBLTab,
  type TBLTree
} from './useTBLDataPrismaComplete';

export interface UseTBLDataHierarchicalParams {
  tree_id: string | number;
  disabled?: boolean;
}

type FetchOptions = { silent?: boolean };

export interface UseTBLDataHierarchicalReturn {
  tree: TBLTree | null;
  tabs: TBLTab[];
  fieldsByTab: Record<string, TBLField[]>;
  sectionsByTab: Record<string, TBLSection[]>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateNodeValue: (nodeId: string, value: string | number | boolean) => Promise<void>;
  toggleNodeVisibility: (nodeId: string) => Promise<void>;
  addOption: (nodeId: string, option: string) => Promise<void>;
  deleteOption: (nodeId: string, option: string) => Promise<void>;
  rawNodes: TreeBranchLeafNode[];
}

const diagEnabled = () => {
  try {
    return localStorage.getItem('TBL_DIAG') === '1';
  } catch {
    return false;
  }
};

const ddiag = (...args: unknown[]) => {
  if (diagEnabled()) {
    console.log('[TBL_DIAG]', ...args);
  }
};

const readGlobalTreeIdFallback = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const candidates = [
    (window as any)?.__TBL_LAST_TREE_ID,
    (window as any)?.__TBL_TREE_ID,
    (window as any)?.TBL_LAST_TREE_ID
  ];
  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return undefined;
};

const resolveEventTreeIdWithFallback = (value?: string | number | null): string | undefined => {
  if (value !== undefined && value !== null) {
    const normalized = String(value).trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return readGlobalTreeIdFallback();
};

export function useTBLDataHierarchicalFixed(params: UseTBLDataHierarchicalParams): UseTBLDataHierarchicalReturn {
  const { tree_id, disabled } = params;
  const treeId = tree_id ? String(tree_id) : undefined;
  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  useEffect(() => { if (api && api !== apiRef.current) apiRef.current = api; }, [api]);
  const matchesCurrentTreeId = useCallback((candidate?: string | number | null) => {
    if (!treeId) {
      return false;
    }
    const resolved = resolveEventTreeIdWithFallback(candidate);
    if (!resolved) {
      return false;
    }
    return resolved === treeId;
  }, [treeId]);

  const [rawNodes, setRawNodes] = useState<TreeBranchLeafNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rawNodesRef = useRef<TreeBranchLeafNode[]>([]);
  const transformedRef = useRef<ReturnType<typeof transformNodesToTBLComplete> | null>(null);
  const capabilityDebounceRef = useRef<number | null>(null);

  // Feature: When form data changes, re-transform the existing rawNodes with the new formData
  // This state/ref pair is used to trigger a recompute of the memoized transform without fetching.
  const [formDataVersion, setFormDataVersion] = useState(0);
  const formDataVersionRef = useRef<number>(0);
  useEffect(() => { formDataVersionRef.current = formDataVersion; }, [formDataVersion]);

  useEffect(() => {
    rawNodesRef.current = rawNodes;
    try { (window as any).__DEBUG_RAW_NODES_HIERARCHICAL = rawNodes; } catch { /* ignore */ }
  }, [rawNodes]);

  useEffect(() => {
    // keep a ref to the current transformed tree for background checks
    // transformed is declared later; we fill this ref after it's computed below
  }, []);

  const fetchData = useCallback(async (options?: FetchOptions) => {
    const silent = options?.silent === true;
    if (!treeId || disabled) {
      return;
    }

    if (!silent) setLoading(true);
    setError(null);

    try {
      dlog('[useTBLDataHierarchicalFixed] fetching nodes', treeId);
      const payload = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);

      let nodes: TreeBranchLeafNode[] = [];
      if (Array.isArray(payload)) {
        nodes = payload as TreeBranchLeafNode[];
      } else if (payload && typeof payload === 'object') {
        const wrapper = payload as { data?: TreeBranchLeafNode[]; nodes?: TreeBranchLeafNode[] };
        nodes = (wrapper.data || wrapper.nodes || []) as TreeBranchLeafNode[];
      }

      ddiag('Nodes fetched', nodes.length);
      if (process.env.NODE_ENV === 'development') {
        const withDisplayAlways = nodes.filter(r => r.metadata && typeof r.metadata === 'object' && (r.metadata as any).displayAlways === true);
        console.log('🔎 [TBL Hook - Hierarchical] fetch nodes with displayAlways', withDisplayAlways.map(n => ({ id: n.id, label: n.label })));
      }
      setRawNodes(nodes);
    } catch (err) {
      console.error('❌ [useTBLDataHierarchicalFixed] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [api, treeId, disabled]);

  useEffect(() => {
    if (!disabled) {
      fetchData();
    }
  }, [fetchData, disabled]);

  const reconcileDuplicatedNodes = useCallback(async (duplicated: Array<{ id: string; parentId?: string; sourceTemplateId?: string }>) => {
    if (!duplicated || duplicated.length === 0) return;
    const getMissing = () => {
      const t = transformedRef.current;
      if (!t) return duplicated.map(d => d.id);
      const allFields = Object.values(t.fieldsByTab || {}).flat();
      return duplicated.map(d => d.id).filter(id => !allFields.some(f => f.id === id));
    };

    let missing = getMissing();
    if (missing.length === 0) return;
    let attempts = 0;
    while (missing.length > 0 && attempts < 4) {
      attempts += 1;
      await Promise.all(missing.map(async id => {
        try {
          const res = await apiRef.current.get(`/api/treebranchleaf/nodes/${id}/full`);
          const nodes: TreeBranchLeafNode[] = Array.isArray(res) ? res as TreeBranchLeafNode[] : (res && typeof res === 'object' ? (res.data || res.nodes || (res.node ? [res.node] : [])) : []);
          if (nodes.length > 0) {
            setRawNodes(prev => {
              const known = new Set(prev.map(n => n.id));
              const newOnes = nodes.filter(n => !known.has(n.id));
              if (newOnes.length === 0) return prev;
              return [...prev, ...newOnes];
            });
          }
        } catch {
          // ignore
        }
      }));

      // wait a bit for transform to recalculated
      await new Promise(r => setTimeout(r, 200));
      setFormDataVersion(v => v + 1);
      await new Promise(r => setTimeout(r, 100));
      missing = getMissing();
    }

    if (missing.length > 0) {
      console.warn('[useTBLDataHierarchicalFixed] Reconciliation incomplete after retry; attempting targeted merge using full tree');
      try {
        if (!treeId) {
          console.warn('[useTBLDataHierarchicalFixed] No treeId available for full tree query; falling back to fetchData()');
          fetchData();
          return;
        }
        const response = await apiRef.current.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
        let allNodes: TreeBranchLeafNode[] = [];
        if (Array.isArray(response)) allNodes = response as TreeBranchLeafNode[];
        else if (response && typeof response === 'object') allNodes = (response.data || response.nodes || []) as TreeBranchLeafNode[];
        if (allNodes.length === 0) {
          console.warn('[useTBLDataHierarchicalFixed] Full tree query returned no nodes, falling back to fetchData()');
          fetchData();
          return;
        }
        const duplicateIds = new Set(duplicated.map(d => d.id));
        const duplicateSourceTemplateIds = new Set(duplicated.map(d => d.sourceTemplateId).filter(Boolean));
        const sourceParentIds: string[] = [];
        if (duplicateSourceTemplateIds.size > 0) {
          await Promise.all(Array.from(duplicateSourceTemplateIds).map(async stid => {
            try {
              const sr = await apiRef.current.get(`/api/treebranchleaf/nodes/${stid}/full`);
              const sarr: TreeBranchLeafNode[] = Array.isArray(sr) ? sr as TreeBranchLeafNode[] : (sr && typeof sr === 'object' ? (sr.data || sr.nodes || (sr.node ? [sr.node] : [])) : []);
              if (sarr.length > 0) {
                const p = sarr[0].parentId;
                if (p) sourceParentIds.push(p as string);
              }
            } catch (err) {
              ddiag('[useTBLDataHierarchicalFixed] failed to resolve sourceTemplate parent during reconciliation', stid, err);
            }
          }));
        }
        const sourceParentSet = new Set(sourceParentIds);
        const candidates = allNodes.filter(n => {
          const meta: any = n.metadata || {};
          const parentMatchesSource = !!(n.parentId && sourceParentSet.has(n.parentId));
          return (meta.copiedFromNodeId && duplicateIds.has(meta.copiedFromNodeId)) ||
                 (meta.copiedFromNodeId && duplicateSourceTemplateIds.has(meta.copiedFromNodeId)) ||
                 (meta.sourceTemplateId && duplicateSourceTemplateIds.has(meta.sourceTemplateId)) ||
                 (meta.fromVariableId && parentMatchesSource) ||
                 (meta.autoCreated && parentMatchesSource);
        });
        if (candidates.length > 0) {
          setRawNodes(prev => {
            const known = new Set(prev.map(n => n.id));
            const newOnes = candidates.filter(n => !known.has(n.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });
          ddiag('[useTBLDataHierarchicalFixed] merged nodes from full tree query:', candidates.length);
          setFormDataVersion(v => v + 1);
          await new Promise(r => setTimeout(r, 120));
          missing = getMissing();
        } else {
          console.warn('[useTBLDataHierarchicalFixed] No candidate nodes found in full tree query; attempting optimistic injection then fallback to fetchData()');
          // Attempt optimistic minimal node injection for missing duplicated ids to allow UI rendering
          try {
            const missingIds = missing;
            if (missingIds && missingIds.length > 0) {
              const minimalNodes: TreeBranchLeafNode[] = missingIds.map(id => ({
                id,
                parentId: duplicated.find(d => d.id === id)?.parentId || null,
                label: `copie-${id.substring(0, 6)}`,
                type: 'leaf_field',
                order: 9999,
                treeId,
                isVisible: true,
                isRequired: false,
                metadata: { copiedFromNodeId: duplicated.find(d => d.id === id)?.sourceTemplateId || duplicated.find(d => d.id === id)?.id }
              } as TreeBranchLeafNode));
              setRawNodes(prev => {
                const known = new Set(prev.map(n => n.id));
                const newOnes = minimalNodes.filter(n => !known.has(n.id));
                if (newOnes.length === 0) return prev;
                return [...prev, ...newOnes];
              });
              ddiag('[useTBLDataHierarchicalFixed] Injecté minimal nodes pour duplication (optimistic):', missingIds);
              setFormDataVersion(v => v + 1);
            }
          } catch (e) {
            ddiag('[useTBLDataHierarchicalFixed] optimistic injection failed', e);
          }
          fetchData();
        }
      } catch (err) {
        console.error('[useTBLDataHierarchicalFixed] Failed full tree reconcile query:', err);
        fetchData();
      }
    }
  }, [apiRef, fetchData, treeId]);

  useEffect(() => {
    if (!treeId || disabled) {
      return;
    }

  const handleCapabilityUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ treeId?: string | number }>).detail;
      if (!matchesCurrentTreeId(detail?.treeId)) {
        return;
      }
      ddiag('Capability update detected → refetch (debounced)', detail);
      if (capabilityDebounceRef.current) window.clearTimeout(capabilityDebounceRef.current);
      capabilityDebounceRef.current = window.setTimeout(() => {
        fetchData();
      }, 300);
    };

    window.addEventListener('tbl-capability-updated', handleCapabilityUpdate);
    return () => {
      if (capabilityDebounceRef.current) window.clearTimeout(capabilityDebounceRef.current);
      window.removeEventListener('tbl-capability-updated', handleCapabilityUpdate);
    };
  }, [fetchData, treeId, disabled, matchesCurrentTreeId]);

  // 🔄 Écouter les changements de sous-onglets (sub-tabs) et refetch
  useEffect(() => {
    if (!treeId || disabled) return;
    const handleSubTabsUpdate = async (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId?: string; treeId?: string | number }>).detail;
      if (!matchesCurrentTreeId(detail?.treeId)) return;
      ddiag('SubTabs update received → refetch', detail);
      // Debug in dev: log event and try to fetch and validate the node metadata is present
      try {
        if (process.env.NODE_ENV === 'development') console.log('[useTBLDataHierarchicalFixed] tbl-subtabs-updated event detail:', detail);
        await fetchData();
        // Give the transform a short moment to recompute
        await new Promise(r => setTimeout(r, 120));
        const nid = detail.nodeId as string | undefined;
        if (nid) {
          const found = rawNodesRef.current.find(n => n.id === nid) as any | undefined;
          if (process.env.NODE_ENV === 'development') console.log('[useTBLDataHierarchicalFixed] After refetch - node found for detail.nodeId:', { nid, found });
        } else {
          if (process.env.NODE_ENV === 'development') console.log('[useTBLDataHierarchicalFixed] After refetch - no nodeId in detail; rawNodes length:', rawNodesRef.current.length);
        }
      } catch (e) {
        console.error('[useTBLDataHierarchicalFixed] Error during subTabs update handling:', e);
      }
    };
    window.addEventListener('tbl-subtabs-updated', handleSubTabsUpdate);
    return () => window.removeEventListener('tbl-subtabs-updated', handleSubTabsUpdate);
  }, [fetchData, treeId, disabled, matchesCurrentTreeId]);

  // 🔄 Écouter un événement d'update de node (optimistic update + merge)
  useEffect(() => {
    if (!treeId || disabled) return;
    const handleNodeUpdated = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ node?: any; treeId?: string | number }>;
        const { node, treeId: eventTreeId } = customEvent.detail || {};
        if (!node) return;
        if (!matchesCurrentTreeId(eventTreeId)) return;
        if (process.env.NODE_ENV === 'development') console.log('🔔 [useTBLDataHierarchicalFixed] tbl-node-updated detail:', { nodeId: node.id, metadata: node.metadata });
        // Merge node in locally
        setRawNodes(prev => {
          const idx = prev.findIndex(n => n.id === node.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...node };
            return copy;
          }
          return [...prev, node];
        });
        // Trigger local retransform: schedule after rawNodes update to avoid race
        try {
          window.setTimeout(() => setFormDataVersion(v => v + 1), 20);
        } catch {
          setFormDataVersion(v => v + 1);
        }
      } catch (e) {
        console.error('❌ [useTBLDataHierarchicalFixed] handleNodeUpdated error', e);
      }
    };
    window.addEventListener('tbl-node-updated', handleNodeUpdated);
    return () => window.removeEventListener('tbl-node-updated', handleNodeUpdated);
  }, [treeId, disabled, matchesCurrentTreeId]);

  useEffect(() => {
    if (!treeId || disabled) {
      return;
    }

    const handleRepeaterUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ treeId?: string | number }>).detail;
      if (!matchesCurrentTreeId(detail?.treeId)) {
        return;
      }
        ddiag('Repeater update received', detail);
        try {
          const debugEventId = Math.random().toString(36).slice(2, 9);
          const inlineNodesRaw = (detail as any)?.newNodes || (detail as any)?.nodes;
          const inlineNodes: Array<Partial<TreeBranchLeafNode> & { id?: string }> = Array.isArray(inlineNodesRaw) ? inlineNodesRaw : [];
          const duplicateIds = Array.isArray((detail as any)?.duplicated) ? (detail as any).duplicated.map((d: any) => d.id) : [];
          const rawDuplicated = Array.isArray((detail as any)?.duplicated) ? (detail as any).duplicated : [];
          const source = (detail as any)?.source || null;
          const suppressReload = Boolean((detail as any)?.suppressReload);
          console.log(`[Hierarchical][evt:${debugEventId}] tbl-repeater-updated detail:`, { source, suppressReload, duplicateIds, rawDuplicatedCount: rawDuplicated.length, inlineNodesCount: inlineNodes.length, inlineNodeIds: inlineNodes.map(n => n && n.id), detail });
        } catch { /* ignore */ }

        if (detail?.suppressReload) {
          ddiag('Repeater update (suppressReload=true) → Doing local retransform only', detail);
          const duplicated: Array<{ id: string }> = (detail as any)?.duplicated || [];
          const deletedIds: string[] = (detail as any)?.deletedIds || [];
          const deletingIds: string[] = (detail as any)?.deletingIds || [];
          // Accept both `newNodes` and legacy `nodes` from repeater duplication event
          const inlineNodesRaw = (detail as any)?.newNodes || (detail as any)?.nodes;
          const inlineNodes: Array<Partial<TreeBranchLeafNode> & { id?: string }> = Array.isArray(inlineNodesRaw)
            ? inlineNodesRaw
            : [];
          const inlineNodeCount = inlineNodes.length;
          const hasRenderableInlineNodes = inlineNodes.some(node => {
            const type = typeof node?.type === 'string' ? node.type.toLowerCase() : '';
            return type.includes('field') || type.includes('leaf');
          });
          const needsFallbackReload = duplicated.length > 0 && (!inlineNodeCount || !hasRenderableInlineNodes);
          // If the event indicates a duplicate-templates action but contains no duplicated ids
          // nor inline nodes, schedule a silent fetch to re-sync with the server if it materializes nodes later.
          if ((detail as any)?.source === 'duplicate-templates' && (!duplicated || duplicated.length === 0) && inlineNodeCount === 0) {
            ddiag('[useTBLDataHierarchicalFixed] duplicate-templates event without duplicated ids detected; scheduling silent fetch');
            window.setTimeout(() => {
              try { fetchData({ silent: true }); } catch { /* ignore */ }
            }, 160);
          }

          if (inlineNodes.length > 0) {
            setRawNodes(prev => {
              const next = [...prev];
              let changed = false;
              inlineNodes.forEach(node => {
                if (!node || typeof node !== 'object' || !node.id) return;
                const idx = next.findIndex(existing => existing.id === node.id);
                if (idx >= 0) {
                  next[idx] = { ...next[idx], ...(node as TreeBranchLeafNode) };
                } else {
                  next.push(node as TreeBranchLeafNode);
                }
                changed = true;
              });
              return changed ? next : prev;
            });
            // If inline nodes are incomplete (missing type or metadata), fetch their full payloads
            (async () => {
              try {
                const toResolve = inlineNodes.filter(n => !n || typeof n !== 'object' || !n.id ? false : !(n as any).type).map(n => n.id as string);
                if (toResolve.length === 0) return;
                const fetched: TreeBranchLeafNode[] = [];
                await Promise.all(toResolve.map(async id => {
                  try {
                    const res = await apiRef.current.get(`/api/treebranchleaf/nodes/${id}/full`);
                    if (!res) return;
                    if (Array.isArray(res)) fetched.push(...res as TreeBranchLeafNode[]);
                    else if (res && typeof res === 'object') {
                      const asAny = res as any;
                      if (Array.isArray(asAny.data)) fetched.push(...asAny.data);
                      else if (Array.isArray(asAny.nodes)) fetched.push(...asAny.nodes);
                      else if (asAny.node && typeof asAny.node === 'object') fetched.push(asAny.node);
                    }
                  } catch (e) {
                    ddiag('[useTBLDataHierarchicalFixed] failed to fetch full inline node', id, e);
                  }
                }));
                if (fetched.length > 0) {
                  setRawNodes(prev => {
                    const known = new Set(prev.map(n => n.id));
                    const newOnes = fetched.filter(n => !known.has(n.id));
                    if (newOnes.length === 0) return prev;
                    return [...prev, ...newOnes];
                  });
                  ddiag('[useTBLDataHierarchicalFixed] merged fetched full inline nodes:', fetched.map(n => n.id));
                }
              } catch (e) { ddiag('[useTBLDataHierarchicalFixed] failed to enrich inline nodes', e); }
            })();
          }

          // Merge duplicated nodes by fetching full subtree and appending
          (async () => {
            try {
              if (Array.isArray(duplicated) && duplicated.length > 0) {
                const toFetch = Array.from(new Set(duplicated.map(d => d.id))).filter(Boolean);
                const fetched: TreeBranchLeafNode[] = [];
                await Promise.all(toFetch.map(async id => {
                  try {
                    // Retry few times if the backend hasn't materialized the subtree yet
                    let attempts = 0;
                    let res: any = null;
                    while (attempts < 3) {
                      try {
                        res = await apiRef.current.get(`/api/treebranchleaf/nodes/${id}/full`);
                        break; // success
                      } catch {
                        // wait briefly before retry
                        attempts += 1;
                        await new Promise(r => setTimeout(r, 120));
                      }
                    }
                    if (!res) {
                      throw new Error('no response from /nodes/:id/full');
                    }
                    // Normaliser la réponse: le endpoint peut renvoyer soit un tableau, soit { data: [...] }, soit { nodes: [...] }
                    if (Array.isArray(res)) {
                      fetched.push(...res as TreeBranchLeafNode[]);
                    } else if (res && typeof res === 'object') {
                      const asAny = res as any;
                      if (Array.isArray(asAny.data)) fetched.push(...asAny.data);
                      else if (Array.isArray(asAny.nodes)) fetched.push(...asAny.nodes);
                      else if (asAny.node && typeof asAny.node === 'object') fetched.push(asAny.node);
                    }
                  } catch (e) {
                    ddiag('Failed to fetch duplicated node subtree', id, e);
                  }
                }));

                if (fetched.length > 0) {
                  setRawNodes(prev => {
                    const known = new Set(prev.map(n => n.id));
                    const newOnes = fetched.filter(n => !known.has(n.id));
                    if (newOnes.length === 0) return prev;
                    return [...prev, ...newOnes];
                  });
                  console.log('[useTBLDataHierarchicalFixed] merged duplicated subtree nodes:', fetched.length, fetched.map(n => n.id));
                  ddiag('[useTBLDataHierarchicalFixed] rawNodes AFTER duplicate merge count:', rawNodesRef.current.length);
                  // Also fetch parent subtrees for display nodes created under the parent
                  try {
                    let parentIds = Array.from(new Set((duplicated as Array<any>).map(d => d.parentId).filter(Boolean)));
                    // Also attempt to derive parentIds from the original template's parent (sourceTemplateId)
                    const sourceParentIds: string[] = [];
                    const sourceTemplateIds = Array.from(new Set((duplicated as Array<any>).map(d => d.sourceTemplateId).filter(Boolean))) as string[];
                    if (sourceTemplateIds.length > 0) {
                      await Promise.all(sourceTemplateIds.map(async stid => {
                        try {
                          const sr = await apiRef.current.get(`/api/treebranchleaf/nodes/${stid}/full`);
                          const sarr: TreeBranchLeafNode[] = Array.isArray(sr) ? sr as TreeBranchLeafNode[] : (sr && typeof sr === 'object' ? (sr.data || sr.nodes || (sr.node ? [sr.node] : [])) : []);
                          if (sarr.length > 0) {
                            const p = sarr[0].parentId;
                            if (p) sourceParentIds.push(p);
                          }
                        } catch (e) {
                          ddiag('[useTBLDataHierarchicalFixed] failed to fetch full source template', stid, e);
                        }
                      }));
                      if (sourceParentIds.length > 0) parentIds = [...new Set(parentIds.concat(sourceParentIds))];
                    }
                    if (parentIds.length > 0) {
                      const fetchedParentNodes: TreeBranchLeafNode[] = [];
                      await Promise.all(parentIds.map(async pid => {
                        try {
                          const pr = await apiRef.current.get(`/api/treebranchleaf/nodes/${pid}/full`);
                          if (Array.isArray(pr)) fetchedParentNodes.push(...pr as TreeBranchLeafNode[]);
                          else if (pr && typeof pr === 'object') {
                            const asAny = pr as any;
                            if (Array.isArray(asAny.data)) fetchedParentNodes.push(...asAny.data);
                            else if (Array.isArray(asAny.nodes)) fetchedParentNodes.push(...asAny.nodes);
                            else if (asAny.node && typeof asAny.node === 'object') fetchedParentNodes.push(asAny.node);
                          }
                        } catch {
                          // ignore
                        }
                      }));
                      if (fetchedParentNodes.length > 0) {
                        setRawNodes(prev => {
                          const known = new Set(prev.map(n => n.id));
                          const newOnes = fetchedParentNodes.filter(n => !known.has(n.id));
                          if (newOnes.length === 0) return prev;
                          return [...prev, ...newOnes];
                        });
                        ddiag('useTBLDataHierarchicalFixed merged parent subtree nodes:', fetchedParentNodes.length, fetchedParentNodes.map(n=>n.id));
                        ddiag('[useTBLDataHierarchicalFixed] rawNodes AFTER parent merge count:', rawNodesRef.current.length);
                        // Quick immediate check: are duplicates present in transformed after merge?
                        try {
                          const duplicatedIds = (duplicated as Array<any>).map(d=>d.id).filter(Boolean);
                          const t = transformedRef.current;
                          const present = duplicatedIds.filter(id => {
                            if (!t) return false;
                            return Object.values(t.fieldsByTab || {}).flat().some((f: any) => f.id === id);
                          });
                          ddiag('[useTBLDataHierarchicalFixed] IMMEDIATE check after parent merge - duplicated present:', present, { eventDebugId: (detail as any)?.eventDebugId || null });
                        } catch { /* ignore */ }
                        // Schedule a quick check whether transformed contains duplicated ids
                        try {
                          const duplicatedIds = (duplicated as Array<any>).map(d => d.id).filter(Boolean);
                          window.setTimeout(() => {
                            const t = transformedRef.current;
                            const present = duplicatedIds.filter(id => {
                              if (!t) return false;
                              return Object.values(t.fieldsByTab || {}).flat().some((f: any) => f.id === id);
                            });
                            console.error('[Hierarchical] After parent merge - duplicated present in transformed:', present);
                          }, 180);
                        } catch { /* ignore */ }
                      }
                    }
                  } catch {
                    // swallow errors to avoid affecting the optimistic local merge
                  }
                } else if (Array.isArray(duplicated) && duplicated.length > 0) {
                  // Fallback: if we expected duplicates but nothing was fetched, do a full refresh only
                  // if the caller explicitly asked to force a refresh (forceRefresh=true).
                  console.warn('[useTBLDataHierarchicalFixed] Expected duplicates but fetched 0 nodes → falling back to full fetch (respecting suppressReload)', { duplicated });
                  if ((detail as any)?.forceRefresh) {
                    fetchData();
                  } else {
                    // If no fetched nodes and we are in suppressReload, proactively attempt reconciliation
                    // by fetching each duplicate node subtree and merging before resorting to optimistic injection.
                    ddiag('[useTBLDataHierarchicalFixed] initiating proactive reconciliation for duplicates', duplicated.map(d => d.id));
                    try {
                      await reconcileDuplicatedNodes(duplicated as any);
                    } catch (e) { ddiag('[useTBLDataHierarchicalFixed] proactive reconciliation error', e); }
                    ddiag('[useTBLDataHierarchicalFixed] suppressReload=true — no fetched duplicates; attempting optimistic minimal injection then skipping full fetch');
                    // Attempt optimistic minimal injection: build minimal nodes with metadata used by transform to detect copies
                    try {
                      const missingIds = duplicated.map(d => d.id);
                      const minimalNodes = missingIds.map(id => ({
                        id,
                        parentId: duplicated.find(d => d.id === id)?.parentId || null,
                        label: `copie-${id.substring(0,6)}`,
                        type: 'leaf_field',
                        order: 9999,
                        treeId,
                        isVisible: true,
                        isRequired: false,
                        metadata: {
                          copiedFromNodeId: duplicated.find(d => d.id === id)?.sourceTemplateId || duplicated.find(d => d.id === id)?.id,
                          sourceTemplateId: duplicated.find(d => d.id === id)?.sourceTemplateId || duplicated.find(d => d.id === id)?.id
                        }
                      } as TreeBranchLeafNode));
                      setRawNodes(prev => {
                        const known = new Set(prev.map(n => n.id));
                        const newOnes = minimalNodes.filter(n => !known.has(n.id));
                        if (newOnes.length === 0) return prev;
                        return [...prev, ...newOnes];
                      });
                      ddiag('[useTBLDataHierarchicalFixed] Optimistic minimal nodes injected for duplicates:', minimalNodes.map(n=>n.id));
                      // Schedule a silent fetch afterwards to pick up real nodes when backend finishes processing
                      window.setTimeout(() => {
                        ddiag('[useTBLDataHierarchicalFixed] scheduling silent fetch after optimistic injection');
                        try { fetchData({ silent: true }); } catch { /* ignore */ }
                      }, 180);
                      setFormDataVersion(v => v + 1);
                      // Check transformed after optimistic minimal injection
                      try {
                        const duplicatedIds = duplicated.map(d=>d.id).filter(Boolean);
                        window.setTimeout(() => {
                          const t = transformedRef.current;
                          const present = duplicatedIds.filter(id => {
                            if (!t) return false;
                            return Object.values(t.fieldsByTab || {}).flat().some((f:any) => f.id === id);
                          });
                          console.error('[Hierarchical] After optimistic injection - duplicated present in transformed:', present);
                        }, 220);
                      } catch { /* ignore */ }
                    } catch (e) {
                      ddiag('[useTBLDataHierarchicalFixed] optimistic injection failed', e);
                    }
                  }
                  return;
                }
              }

              if (Array.isArray(deletingIds) && deletingIds.length > 0) {
                // 0) Handle optimistic deletions (deletingIds) — local, suffix-aware cascade only
                setRawNodes(prev => {
                  const removed = new Set(deletingIds);
                  const deletedSuffixes = new Set<string>();
                  for (const id of deletingIds) {
                    const m = String(id).match(/-(\d+)$/);
                    if (m) deletedSuffixes.add(m[1]);
                  }
                    const debugEnabled = typeof window !== 'undefined' && (window as any).localStorage && localStorage.getItem('TBL_DEBUG_DELETE') === '1';
                    let added = true;
                  while (added) {
                    added = false;
                    for (const n of prev) {
                      if (removed.has(n.id)) continue;
                      if (n.parentId && removed.has(n.parentId)) {
                        const nodeSuffix = String(n.id).match(/-(\d+)$/)?.[1];
                        if (nodeSuffix && deletedSuffixes.has(nodeSuffix)) {
                            if (debugEnabled) console.log('🔧 [OPTIMISTIC-REMOVE] caused by parent suffix match (deletingIds)', { nodeId: n.id, parentId: n.parentId, suffix: nodeSuffix });
                            removed.add(n.id);
                          added = true;
                        } else if (!nodeSuffix) {
                            if (debugEnabled) console.log('🔧 [OPTIMISTIC-REMOVE] caused by parent base node (no suffix)', { nodeId: n.id, parentId: n.parentId });
                            removed.add(n.id);
                          added = true;
                        }
                      }
                    }
                  }
                  if (removed.size === 0) return prev;
                  if (typeof window !== 'undefined' && (window as any).localStorage && localStorage.getItem('TBL_DEBUG_DELETE') === '1') {
                    const removedList = Array.from(removed);
                    console.log('[OPTIMISTIC-REMOVE] Final removed (optimistic):', { count: removedList.length, list: removedList });
                  }
                  return prev.filter(n => !removed.has(n.id));
                });
              }

              if (Array.isArray(deletedIds) && deletedIds.length > 0) {
                // 1) Local cascade from the deletedIds
                // ⚠️ CRITIQUE: Vérifier le suffixe pour éviter de supprimer les mauvais nœuds
                setRawNodes(prev => {
                  const removed = new Set(deletedIds);
                  
                  // Extraire les suffixes des nœuds supprimés
                  const deletedSuffixes = new Set<string>();
                  const deletedParentIds = new Set<string>();
                  for (const id of deletedIds) {
                    const match = String(id).match(/-(\d+)$/);
                    if (match) {
                      deletedSuffixes.add(match[1]); // "2" pour "xyz-2"
                    }
                    // Trouver le parentId du nœud supprimé
                    const node = prev.find(n => n.id === id);
                    if (node?.parentId) {
                      deletedParentIds.add(node.parentId);
                    }
                  }
                  
                  console.log('🔢 [DELETE CASCADE LOCAL] Suffixes détectés:', Array.from(deletedSuffixes));
                  console.log('👨‍👩‍👧 [DELETE CASCADE LOCAL] ParentIds des nœuds supprimés:', Array.from(deletedParentIds));
                  
                  // Cascade avec vérification du suffixe
                  let added = true;
                  while (added) {
                    added = false;
                    for (const n of prev) {
                      // Déjà supprimé → skip
                      if (removed.has(n.id)) continue;
                      
                      // Si le parent est supprimé, vérifier le suffixe
                      if (n.parentId && removed.has(n.parentId)) {
                        const nodeSuffix = String(n.id).match(/-(\d+)$/)?.[1];
                        
                        // ✅ RÈGLE STRICTE: Le nœud doit avoir le MÊME suffixe que son parent supprimé
                        if (nodeSuffix && deletedSuffixes.has(nodeSuffix)) {
                          console.log(`✅ [DELETE CASCADE LOCAL MATCH] Nœud ${n.id} (${n.label}) → parent supprimé + suffixe -${nodeSuffix}`);
                          removed.add(n.id);
                          added = true;
                        } else if (nodeSuffix) {
                          console.log(`⏭️ [DELETE CASCADE LOCAL SKIP] Nœud ${n.id} (${n.label}) → parent supprimé MAIS suffixe -${nodeSuffix} différent`);
                        } else {
                          // Pas de suffixe → supprimer (nœud de base)
                          console.log(`✅ [DELETE CASCADE LOCAL] Nœud ${n.id} (${n.label}) → parent supprimé, pas de suffixe`);
                          removed.add(n.id);
                          added = true;
                        }
                      }
                    }
                  }
                  
                  return prev.filter(n => !removed.has(n.id));
                });

                // NOTE: we intentionally avoid a heavy full-tree query here to keep it lightweight.
                // The Prisma-aware hook performs aggressive enrichment; however, we fallback to
                // a delayed refresh if deletions didn't remove display nodes locally.
                console.log('[useTBLDataHierarchicalFixed] deleted nodes merged locally:', deletedIds.length);
                // Attempt to enrich deletions by scanning the full tree for display nodes
                // referencing the deleted nodes (via metadata). If we find any, remove them
                // locally and retransform; otherwise, schedule a gentle fetchData() as fallback.
                (async () => {
                  try {
                    if (!treeId) return;
                    // Prefer local cache first
                    let allNodes: TreeBranchLeafNode[] = Array.isArray(rawNodesRef.current) ? rawNodesRef.current as TreeBranchLeafNode[] : [];
                    // If local cache is empty and the caller asked for a full refresh, fetch it
                    if (!allNodes.length && (detail as any)?.forceRefresh) {
                      const resp = await apiRef.current.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
                      if (Array.isArray(resp)) allNodes = resp as TreeBranchLeafNode[];
                      else if (resp && typeof resp === 'object') allNodes = (resp.data || resp.nodes || []) as TreeBranchLeafNode[];
                    }
                    if (!allNodes.length) {
                      // No nodes available from full tree query. Respect suppressReload and
                      // only refresh if the caller explicitly requested it via forceRefresh.
                      if ((detail as any)?.forceRefresh) setTimeout(() => fetchData(), 800);
                      return;
                    }
                    const baseRemoved = new Set(deletedIds);
                    const nodeById = new Map(allNodes.map(n => [n.id, n] as const));
                    const relatedTemplateIds = new Set<string>();
                    const relatedTemplateSuffixes = new Map<string, Set<string | null>>();
                    for (const rid of deletedIds) {
                      const deletedNode = nodeById.get(rid as string);
                      if (!deletedNode) continue;
                      const dm: any = deletedNode.metadata || {};
                      const suffix = String(rid).match(/-(\d+)$/)?.[1] ?? null;
                      if (dm?.sourceTemplateId) {
                        relatedTemplateIds.add(String(dm.sourceTemplateId));
                        const set = relatedTemplateSuffixes.get(String(dm.sourceTemplateId)) || new Set();
                        set.add(suffix);
                        relatedTemplateSuffixes.set(String(dm.sourceTemplateId), set);
                      }
                      if (dm?.copiedFromNodeId) {
                        relatedTemplateIds.add(String(dm.copiedFromNodeId));
                        const set = relatedTemplateSuffixes.get(String(dm.copiedFromNodeId)) || new Set();
                        set.add(suffix);
                        relatedTemplateSuffixes.set(String(dm.copiedFromNodeId), set);
                      }
                    }
                    const extraToRemove = new Set<string>();
                    for (const node of allNodes) {
                      const meta: any = node.metadata || {};
                      if (meta.copiedFromNodeId && baseRemoved.has(String(meta.copiedFromNodeId))) {
                        extraToRemove.add(node.id);
                        ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (copiedFrom matches removed id):', node.id, meta.copiedFromNodeId);
                      }
                      if (meta.copiedFromNodeId && relatedTemplateIds.has(String(meta.copiedFromNodeId))) {
                        const suffixSet = relatedTemplateSuffixes.get(String(meta.copiedFromNodeId));
                        const nodeSuffix = String(node.id).match(/-(\d+)$/)?.[1] ?? null;
                        const allowed = suffixSet && (suffixSet.has(null) || (nodeSuffix && suffixSet.has(nodeSuffix)));
                        if (allowed) {
                          extraToRemove.add(node.id);
                          ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (copiedFrom matches related template + suffix):', node.id, meta.copiedFromNodeId, nodeSuffix, Array.from(suffixSet || []));
                        } else {
                          ddiag('[useTBLDataHierarchicalFixed] SKIP (copiedFrom matches related template but suffix mismatch):', node.id, meta.copiedFromNodeId, nodeSuffix, Array.from(suffixSet || []));
                        }
                      }
                      if (meta.sourceTemplateId && (baseRemoved.has(String(meta.sourceTemplateId)) || relatedTemplateIds.has(String(meta.sourceTemplateId)))) {
                        const suffixSet = relatedTemplateSuffixes.get(String(meta.sourceTemplateId));
                        const nodeSuffix = String(node.id).match(/-(\d+)$/)?.[1] ?? null;
                        const allowed = baseRemoved.has(String(meta.sourceTemplateId)) || (suffixSet && (suffixSet.has(null) || (nodeSuffix && suffixSet.has(nodeSuffix))));
                        if (allowed) {
                          extraToRemove.add(node.id);
                          ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (sourceTemplate matches removed/related + suffix):', node.id, meta.sourceTemplateId, nodeSuffix, Array.from(suffixSet || []));
                        } else {
                          ddiag('[useTBLDataHierarchicalFixed] SKIP (sourceTemplate matches related but suffix mismatch):', node.id, meta.sourceTemplateId, nodeSuffix, Array.from(suffixSet || []));
                        }
                      }
                      if (meta.fromVariableId) {
                        const fromVarStr = String(meta.fromVariableId || '');
                        for (const rid of baseRemoved) {
                          const ridStr = String(rid);
                          if (fromVarStr === ridStr) {
                            extraToRemove.add(node.id);
                            ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (fromVariableId exact removed match):', node.id, fromVarStr, ridStr);
                            continue;
                          }
                          const m = ridStr.match(/-(\d+)$/);
                          if (m && fromVarStr.endsWith(`-${m[1]}`)) {
                            extraToRemove.add(node.id);
                            ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (fromVariableId endsWith removed suffix match):', node.id, fromVarStr, `-${m[1]}`);
                            continue;
                          }
                        }
                        for (const tid of relatedTemplateIds) {
                          const tidStr = String(tid);
                          if (fromVarStr === tidStr) {
                            extraToRemove.add(node.id);
                            ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (fromVariableId exact related template match):', node.id, fromVarStr, tidStr);
                            continue;
                          }
                          const m = tidStr.match(/-(\d+)$/);
                          if (m && fromVarStr.endsWith(`-${m[1]}`)) {
                            extraToRemove.add(node.id);
                            ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (fromVariableId endsWith related template suffix):', node.id, fromVarStr, `-${m[1]}`);
                            continue;
                          }
                        }
                      }
                        for (const rid of baseRemoved) {
                        const m = String(rid).match(/-(\d+)$/);
                        if (m) {
                          const suffix = `-${m[1]}`;
                            if (String(meta.fromVariableId).endsWith(suffix)) {
                              extraToRemove.add(node.id);
                              ddiag('[useTBLDataHierarchicalFixed] extraToRemove candidate (fromVariableId endsWith suffix from deleted id):', node.id, String(meta.fromVariableId), suffix);
                            }
                        }
                      }
                    }
                    if (extraToRemove.size > 0) {
                      setRawNodes(prev => prev.filter(n => !extraToRemove.has(n.id)));
                      ddiag('[useTBLDataHierarchicalFixed] merged additional deletion candidates from full tree:', extraToRemove.size);
                      setFormDataVersion(v => v + 1);
                    } else {
                      if ((detail as any)?.forceRefresh) setTimeout(() => fetchData(), 800);
                    }
                    } catch (e) {
                      ddiag('[useTBLDataHierarchicalFixed] failed to enrich deletions via full tree query', e);
                      if ((detail as any)?.forceRefresh) setTimeout(() => fetchData(), 800);
                    }
                })();
              }
            } catch (e) {
              ddiag('Error merging duplicated/deleted nodes silently', e);
            } finally {
              setFormDataVersion(v => v + 1);
            }
          })();
          // Recompute local transform based on current window.TBL_FORM_DATA and rawNodes
          if (rawNodesRef.current.length > 0) {
            formDataVersionRef.current += 1;
            // The useMemo that builds nodes from rawNodes will recompute when formDataVersion changes
            setFormDataVersion((v) => v + 1);
            // Kick off background reconciliation for cases where some display nodes are not yet visible
            (async () => {
              try {
                if (duplicated && duplicated.length > 0) await reconcileDuplicatedNodes(duplicated);
              } catch { /* ignore */ }
            })();
          }

          // Always perform silent refetch to guarantee backend has materialized full subtree
          if (duplicated && duplicated.length > 0) {
            const delay = needsFallbackReload ? 40 : 70;
            window.setTimeout(() => fetchData({ silent: true }), delay);
            // Renforcement: effectuer des refetchs supplémentaires si les IDs dupliqués n'apparaissent pas encore
            try {
              const duplicatedIds = duplicated.map(d => d.id).filter(Boolean);
              if (duplicatedIds.length) {
                // Fonction utilitaire locale pour vérifier la présence des duplications
                const checkMissing = () => {
                  const currentIds = new Set(rawNodesRef.current.map(n => n.id));
                  return duplicatedIds.filter(id => !currentIds.has(id));
                };
                // Première vague (après le refetch initial)
                window.setTimeout(() => {
                  const stillMissing = checkMissing();
                  if (stillMissing.length) {
                    ddiag('[HierarchicalFixed] Duplicates still missing after first silent fetch → second fetch', stillMissing);
                    fetchData({ silent: true });
                  } else {
                    ddiag('[HierarchicalFixed] All duplicates present after first silent fetch');
                    setFormDataVersion(v => v + 1);
                  }
                }, delay + 220);
                // Deuxième vague (fallback plus tardif) uniquement si encore manquants
                window.setTimeout(() => {
                  const stillMissing = checkMissing();
                  if (stillMissing.length) {
                    ddiag('[HierarchicalFixed] Duplicates still missing after second fetch → third fetch', stillMissing);
                    fetchData({ silent: true });
                  } else {
                    ddiag('[HierarchicalFixed] All duplicates present after second fetch');
                    setFormDataVersion(v => v + 1);
                  }
                }, delay + 600);
                // Dernière vague – si encore absent → forcer réconciliation ciblée
                window.setTimeout(async () => {
                  const stillMissing = checkMissing();
                  if (stillMissing.length) {
                    console.warn('[HierarchicalFixed] Duplicates STILL missing after multi-fetch cycle → invoking reconcileDuplicatedNodes', stillMissing);
                    try {
                      await reconcileDuplicatedNodes(duplicated as any);
                      setFormDataVersion(v => v + 1);
                    } catch (e) {
                      console.error('[HierarchicalFixed] reconcileDuplicatedNodes final attempt error', e);
                    }
                    // Final fallback in development or when explicitly enabled: perform a full non-silent fetch to re-sync UI
                    try {
                      const shouldForce = typeof window !== 'undefined' && localStorage.getItem('TBL_FORCE_REFRESH_ON_MISSING_DUPLICATES') === '1';
                      if (shouldForce || process.env.NODE_ENV === 'development') {
                        console.warn('[HierarchicalFixed] Final fallback: performing full fetchData() to ensure duplicates are present (non-silent)');
                        fetchData();
                      }
                    } catch (e) { ddiag('[HierarchicalFixed] final fallback fetchData error', e); }
                  }
                }, delay + 1200);
              }
            } catch (e) {
              ddiag('[HierarchicalFixed] multi-stage duplicate presence check failed', e);
            }
          }
          return;
        }

        ddiag('Repeater update detected → refetch', detail);
        fetchData();
    };

    window.addEventListener('tbl-repeater-updated', handleRepeaterUpdate);
    return () => window.removeEventListener('tbl-repeater-updated', handleRepeaterUpdate);
  }, [fetchData, treeId, disabled, setFormDataVersion, reconcileDuplicatedNodes, matchesCurrentTreeId]);

  // Feature: When form data changes, re-transform the existing rawNodes with the new formData
  // NOTE: Do NOT call fetchData() here; fetching nodes on each field change is expensive.
  useEffect(() => {
    if (!treeId || disabled) {
      return;
    }

    const handleFormDataChange = () => {
      if (!rawNodesRef.current.length) {
        ddiag('Form data change ignored (no cached nodes)');
        return;
      }
      ddiag('Form data changed → re-transforming local nodes (no network)');
      // Trigger a re-compute of transformed memo by bumping the version counter
      setFormDataVersion(v => v + 1);
    };

    window.addEventListener('TBL_FORM_DATA_CHANGED', handleFormDataChange);
    return () => window.removeEventListener('TBL_FORM_DATA_CHANGED', handleFormDataChange);
  }, [fetchData, treeId, disabled, setFormDataVersion]);

  // Écouter tbl-force-retransform pour effectuer une retransform locale (ou un fetch si forceRemote)
  useEffect(() => {
    if (!treeId || disabled) return;
    const handleForceRetransform = (event: Event) => {
      const detail = (event as CustomEvent<{ treeId?: string | number; forceRemote?: boolean; eventDebugId?: string }>).detail || {};
      if (!matchesCurrentTreeId(detail?.treeId)) return;
      const forceRemote = !!detail.forceRemote;
      ddiag('[useTBLDataHierarchicalFixed] tbl-force-retransform event received', { forceRemote, eventDebugId: detail?.eventDebugId || null, detail });
      if (forceRemote) {
        fetchData({ silent: false });
      } else {
        setFormDataVersion(v => v + 1);
      }
    };
    window.addEventListener('tbl-force-retransform', handleForceRetransform);
    return () => window.removeEventListener('tbl-force-retransform', handleForceRetransform);
  }, [fetchData, treeId, disabled, matchesCurrentTreeId]);

  const transformed = useMemo(() => {
    // linter: reference formDataVersion to ensure memoization reacts to formData changes
    void formDataVersion;
    if (!rawNodes.length) {
      return {
        tree: null,
        tabs: [] as TBLTab[],
        fieldsByTab: {} as Record<string, TBLField[]>,
        sectionsByTab: {} as Record<string, TBLSection[]>
      };
    }
    const formData = (typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) || {};
    return transformNodesToTBLComplete(rawNodes, formData);
  }, [rawNodes, formDataVersion]);
  const transformedTabs = transformed.tabs;
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    try {
      const sectionsWithDisplayAlways = Object.values(transformed.sectionsByTab || {})
        .flat()
        .filter(s => !!(s as any).metadata?.displayAlways);
      if (sectionsWithDisplayAlways.length) {
        console.log('[TBL Hook - Hierarchical] Sections with displayAlways found after transform:', sectionsWithDisplayAlways.map(s => ({ id: s.id, title: s.title })));
      } else {
        console.log('[TBL Hook - Hierarchical] No sections with displayAlways after transform');
      }
    } catch (e) { console.error('[TBL Hook - Hierarchical] logging transform error', e); }
  }, [transformed]);
  useEffect(() => { transformedRef.current = transformed; }, [transformed]);

  useEffect(() => {
    const nodesSource = rawNodesRef.current.length ? rawNodesRef.current : rawNodes;
    if (!transformedTabs?.length || !nodesSource.length) {
      return;
    }
    try {
      createAutomaticMirrors(transformedTabs, nodesSource);
    } catch (error) {
      console.error('[useTBLDataHierarchicalFixed] Impossible de créer les mirrors automatiques:', error);
    }
  }, [transformedTabs, rawNodes]);

  

  const refetch = useCallback(() => fetchData(), [fetchData]);

  const updateNodeValue = useCallback(async (nodeId: string, value: string | number | boolean) => {
    try {
      await api.post(`/api/treebranchleaf/nodes/${nodeId}/value`, { value });
      await fetchData();
    } catch (err) {
      console.error('❌ [useTBLDataHierarchicalFixed] updateNodeValue error:', err);
    }
  }, [api, fetchData]);

  const toggleNodeVisibility = useCallback(async (nodeId: string) => {
    try {
      await api.put(`/api/treebranchleaf/${nodeId}/visibility`, {});
      await fetchData();
    } catch (err) {
      console.error('❌ [useTBLDataHierarchicalFixed] toggleNodeVisibility error:', err);
    }
  }, [api, fetchData]);

  const addOption = useCallback(async (nodeId: string, option: string) => {
    try {
      await api.post(`/api/treebranchleaf/${nodeId}/options`, { option });
      await fetchData();
    } catch (err) {
      console.error('❌ [useTBLDataHierarchicalFixed] addOption error:', err);
    }
  }, [api, fetchData]);

  const deleteOption = useCallback(async (nodeId: string, option: string) => {
    try {
      await api.delete(`/api/treebranchleaf/${nodeId}/options/${encodeURIComponent(option)}`);
      await fetchData();
    } catch (err) {
      console.error('❌ [useTBLDataHierarchicalFixed] deleteOption error:', err);
    }
  }, [api, fetchData]);

  return {
    tree: transformed.tree,
    tabs: transformed.tabs,
    fieldsByTab: transformed.fieldsByTab,
    sectionsByTab: transformed.sectionsByTab,
    loading,
    error,
    refetch,
    updateNodeValue,
    toggleNodeVisibility,
    addOption,
    deleteOption,
    rawNodes
  };
}

export default useTBLDataHierarchicalFixed;
