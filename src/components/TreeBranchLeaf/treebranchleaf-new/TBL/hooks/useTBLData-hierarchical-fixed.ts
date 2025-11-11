import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { dlog } from '../../../../../utils/debug';
import {
  transformNodesToTBLComplete,
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

export function useTBLDataHierarchicalFixed(params: UseTBLDataHierarchicalParams): UseTBLDataHierarchicalReturn {
  const { tree_id, disabled } = params;
  const treeId = tree_id ? String(tree_id) : undefined;
  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  useEffect(() => { if (api && api !== apiRef.current) apiRef.current = api; }, [api]);

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
    try { (window as any).__DEBUG_RAW_NODES = rawNodes; } catch { /* ignore */ }
  }, [rawNodes]);

  useEffect(() => {
    // keep a ref to the current transformed tree for background checks
    // transformed is declared later; we fill this ref after it's computed below
  }, []);

  const fetchData = useCallback(async () => {
    if (!treeId || disabled) {
      return;
    }

    setLoading(true);
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
      setRawNodes(nodes);
    } catch (err) {
      console.error('❌ [useTBLDataHierarchicalFixed] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
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
          console.warn('[useTBLDataHierarchicalFixed] No candidate nodes found in full tree query; falling back to fetchData()');
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
      if (!detail?.treeId) {
        return;
      }
      if (String(detail.treeId) !== treeId) {
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
  }, [fetchData, treeId, disabled, setFormDataVersion, reconcileDuplicatedNodes]);

  useEffect(() => {
    if (!treeId || disabled) {
      return;
    }

    const handleRepeaterUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ treeId?: string | number }>).detail;
      if (!detail?.treeId) {
        return;
      }
      if (String(detail.treeId) !== treeId) {
        return;
      }
        ddiag('Repeater update received', detail);

        if (detail?.suppressReload) {
          ddiag('Repeater update (suppressReload=true) → Doing local retransform only', detail);
          const duplicated: Array<{ id: string }> = (detail as any)?.duplicated || [];
          const deletedIds: string[] = (detail as any)?.deletedIds || [];

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
                  console.log('[useTBLDataHierarchicalFixed] merged duplicated subtree nodes:', fetched.length);
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
                        ddiag('useTBLDataHierarchicalFixed merged parent subtree nodes:', fetchedParentNodes.length);
                      }
                    }
                  } catch {
                    // swallow errors to avoid affecting the optimistic local merge
                  }
                }
                else if (Array.isArray(duplicated) && duplicated.length > 0) {
                  // Fallback: if we expected duplicates but nothing was fetched, do a full refresh only
                  // if the caller explicitly asked to force a refresh (forceRefresh=true).
                  console.warn('[useTBLDataHierarchicalFixed] Expected duplicates but fetched 0 nodes → falling back to full fetch (respecting suppressReload)', { duplicated });
                  if ((detail as any)?.forceRefresh) {
                    fetchData();
                  } else {
                    ddiag('[useTBLDataHierarchicalFixed] suppressReload=true — skipping fallback fetch for expected duplicates (no reload)');
                  }
                  return;
                }
              }

              if (Array.isArray(deletedIds) && deletedIds.length > 0) {
                // 1) Local cascade from the deletedIds
                setRawNodes(prev => {
                  const removed = new Set(deletedIds);
                  let added = true;
                  while (added) {
                    added = false;
                    for (const n of prev) {
                      if (n.parentId && removed.has(n.parentId) && !removed.has(n.id)) {
                        removed.add(n.id);
                        added = true;
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
                    for (const rid of deletedIds) {
                      const deletedNode = nodeById.get(rid as string);
                      if (!deletedNode) continue;
                      const dm: any = deletedNode.metadata || {};
                      if (dm?.sourceTemplateId) relatedTemplateIds.add(String(dm.sourceTemplateId));
                      if (dm?.copiedFromNodeId) relatedTemplateIds.add(String(dm.copiedFromNodeId));
                    }
                    const extraToRemove = new Set<string>();
                    for (const node of allNodes) {
                      const meta: any = node.metadata || {};
                      if (meta.copiedFromNodeId && baseRemoved.has(String(meta.copiedFromNodeId))) extraToRemove.add(node.id);
                      if (meta.copiedFromNodeId && relatedTemplateIds.has(String(meta.copiedFromNodeId))) extraToRemove.add(node.id);
                      if (meta.sourceTemplateId && (baseRemoved.has(String(meta.sourceTemplateId)) || relatedTemplateIds.has(String(meta.sourceTemplateId)))) extraToRemove.add(node.id);
                      if (meta.fromVariableId) {
                        for (const rid of baseRemoved) {
                          if (String(meta.fromVariableId).includes(String(rid))) extraToRemove.add(node.id);
                        }
                        for (const tid of relatedTemplateIds) {
                          if (String(meta.fromVariableId).includes(String(tid))) extraToRemove.add(node.id);
                        }
                      }
                      for (const rid of baseRemoved) {
                        const m = String(rid).match(/-(\d+)$/);
                        if (m) {
                          const suffix = `-${m[1]}`;
                          if (String(meta.fromVariableId).endsWith(suffix)) extraToRemove.add(node.id);
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
          return;
        }

        ddiag('Repeater update detected → refetch', detail);
        fetchData();
    };

    window.addEventListener('tbl-repeater-updated', handleRepeaterUpdate);
    return () => window.removeEventListener('tbl-repeater-updated', handleRepeaterUpdate);
  }, [fetchData, treeId, disabled, setFormDataVersion, reconcileDuplicatedNodes]);

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
  useEffect(() => { transformedRef.current = transformed; }, [transformed]);

  

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
