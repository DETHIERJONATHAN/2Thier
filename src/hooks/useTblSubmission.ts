import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

// Types de résultats (alignés avec l'API backend)
export interface TblResultItem {
  nodeId: string;
  nodeLabel: string | null;
  sourceRef: string;
  operationSource: string;
  operationResult: unknown;
  operationDetail: unknown;
}

export interface UseTblSubmissionOptions {
  initialTreeId?: string;
  initialSubmissionId?: string | null;
  initialFormData?: Record<string, unknown>;
  debounceMs?: number;
}

export interface UseTblSubmissionApi {
  // state
  treeId?: string;
  submissionId: string | null;
  stageId: string | null;
  formData: Record<string, unknown>;
  results: TblResultItem[];
  loading: boolean;
  previewing: boolean;
  committing: boolean;
  dirty: boolean;
  error: string | null;

  // setters
  setTreeId: (id: string) => void;
  setSubmissionId: (id: string | null) => void;
  setField: (nodeId: string, value: unknown) => void;
  setMany: (patch: Record<string, unknown>) => void;

  // actions
  previewNow: () => Promise<void>;
  stageNow: () => Promise<void>;
  commitToExisting: () => Promise<{ submissionId: string } | void>;
  commitAsNew: () => Promise<{ submissionId: string } | void>;
  discardStage: () => Promise<void>;
  reset: () => void;

  // helpers
  getNodeResult: (nodeId: string) => TblResultItem | undefined;
}

export function useTblSubmission(options: UseTblSubmissionOptions = {}): UseTblSubmissionApi {
  const { initialTreeId, initialSubmissionId = null, initialFormData = {}, debounceMs = 500 } = options;
  const { api } = useAuthenticatedApi();

  const [treeId, setTreeIdState] = useState<string | undefined>(initialTreeId);
  const [submissionId, setSubmissionIdState] = useState<string | null>(initialSubmissionId);
  const [stageId, setStageId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialFormData);
  const [results, setResults] = useState<TblResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  const setTreeId = useCallback((id: string) => setTreeIdState(id), []);
  const setSubmissionId = useCallback((id: string | null) => setSubmissionIdState(id), []);

  const getNodeResult = useCallback((nodeId: string) => results.find(r => r.nodeId === nodeId), [results]);

  const stageNow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { stageId, treeId, submissionId, formData } as Record<string, unknown>;
      const res = await api.post('/api/tbl/submissions/stage', payload);
      setStageId(res.data?.stage?.id ?? null);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erreur lors du staging');
    } finally {
      setLoading(false);
    }
  }, [api, stageId, treeId, submissionId, formData]);

  const previewNow = useCallback(async () => {
    setPreviewing(true);
    setError(null);
    try {
      // Garantir un stage courant
      if (!stageId) {
        await (async () => {
          const res = await api.post('/api/tbl/submissions/stage', { stageId: null, treeId, submissionId, formData });
          setStageId(res.data?.stage?.id ?? null);
        })();
      }
      const sid = stageId || (await (async () => {
        const r = await api.post('/api/tbl/submissions/stage', { stageId: null, treeId, submissionId, formData });
        const id = r.data?.stage?.id ?? null; setStageId(id); return id;
      })());
      if (!sid) return;
      const res = await api.post('/api/tbl/submissions/stage/preview', { stageId: sid });
      setResults(Array.isArray(res.data?.results) ? res.data.results : []);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erreur lors de la prévisualisation');
    } finally {
      setPreviewing(false);
    }
  }, [api, stageId, treeId, submissionId, formData]);

  const schedulePreview = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      previewNow();
    }, debounceMs);
  }, [previewNow, debounceMs]);

  const setField = useCallback((nodeId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [nodeId]: value }));
    setDirty(true);
    // stage + preview (debounced)
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        // envoyez le patch courant au stage
        const res = await api.post('/api/tbl/submissions/stage', { stageId, treeId, submissionId, formData: { [nodeId]: value } });
        setStageId(res.data?.stage?.id ?? stageId);
        // puis prévisualisez
        const sid = res.data?.stage?.id ?? stageId;
        if (sid) {
          const pv = await api.post('/api/tbl/submissions/stage/preview', { stageId: sid });
          setResults(Array.isArray(pv.data?.results) ? pv.data.results : []);
        }
      } catch (e: unknown) {
        setError((e as Error)?.message || 'Erreur lors de la mise à jour');
      }
    }, debounceMs);
  }, [api, stageId, treeId, submissionId, debounceMs]);

  const setMany = useCallback((patch: Record<string, unknown>) => {
    setFormData(prev => ({ ...prev, ...patch }));
    setDirty(true);
    schedulePreview();
  }, [schedulePreview]);

  const commitToExisting = useCallback(async () => {
    if (!stageId && !submissionId) return; // rien à commit
    setCommitting(true);
    setError(null);
    try {
      // s’assurer qu’un stage existe côté serveur
      if (!stageId) {
        const r = await api.post('/api/tbl/submissions/stage', { stageId: null, treeId, submissionId, formData });
        setStageId(r.data?.stage?.id ?? null);
      }
      const sid = stageId || null;
      if (!sid) return;
      const res = await api.post('/api/tbl/submissions/stage/commit', { stageId: sid, asNew: false });
      if (res.data?.submissionId) setSubmissionIdState(res.data.submissionId);
      setDirty(false);
      return { submissionId: res.data?.submissionId ?? submissionId! };
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setCommitting(false);
    }
  }, [api, stageId, submissionId, treeId, formData]);

  const commitAsNew = useCallback(async () => {
    setCommitting(true);
    setError(null);
    try {
      if (!stageId) {
        const r = await api.post('/api/tbl/submissions/stage', { stageId: null, treeId, submissionId, formData });
        setStageId(r.data?.stage?.id ?? null);
      }
      const sid = stageId || null;
      if (!sid) return;
      const res = await api.post('/api/tbl/submissions/stage/commit', { stageId: sid, asNew: true });
      if (res.data?.submissionId) {
        setSubmissionIdState(res.data.submissionId);
      }
      setDirty(false);
      return { submissionId: res.data?.submissionId as string };
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erreur lors de la création du nouveau devis');
    } finally {
      setCommitting(false);
    }
  }, [api, stageId, submissionId, treeId, formData]);

  const discardStage = useCallback(async () => {
    if (!stageId) return;
    try {
      await api.post('/api/tbl/submissions/stage/discard', { stageId });
    } catch {
      // no-op
    } finally {
      setStageId(null);
      setDirty(false);
    }
  }, [api, stageId]);

  const reset = useCallback(() => {
    setResults([]);
    setDirty(false);
    setError(null);
    setFormData(initialFormData || {});
    setStageId(null);
  }, [initialFormData]);

  const hasRunInitialPreview = useRef(false);
  // Preview initial si souhaité (si initialFormData ou submissionId)
  useEffect(() => {
    if (hasRunInitialPreview.current) {
      return;
    }

    const hasInitialData = Boolean(initialSubmissionId) || Object.keys(initialFormData || {}).length > 0;
    if (!hasInitialData || results.length > 0) {
      return;
    }

    hasRunInitialPreview.current = true;
    let cancelled = false;

    const runInitialPreview = async () => {
      try {
        const stageResponse = await api.post('/api/tbl/submissions/stage', {
          stageId: null,
          treeId: initialTreeId,
          submissionId: initialSubmissionId,
          formData: initialFormData,
        });
        if (cancelled) return;
        const sid = stageResponse.data?.stage?.id ?? null;
        setStageId(sid);
        if (!sid) return;
        const previewResponse = await api.post('/api/tbl/submissions/stage/preview', { stageId: sid });
        if (cancelled) return;
        setResults(Array.isArray(previewResponse.data?.results) ? previewResponse.data.results : []);
      } catch {
        // silencieux au montage
      }
    };

    runInitialPreview();

    return () => {
      cancelled = true;
    };
  }, [api, initialSubmissionId, initialFormData, initialTreeId, results.length]);

  const apiValue: UseTblSubmissionApi = useMemo(() => ({
    treeId,
    submissionId,
    stageId,
    formData,
    results,
    loading,
    previewing,
    committing,
    dirty,
    error,
    setTreeId,
    setSubmissionId,
    setField,
    setMany,
    previewNow,
    stageNow,
    commitToExisting,
    commitAsNew,
    discardStage,
    reset,
    getNodeResult,
  }), [treeId, submissionId, stageId, formData, results, loading, previewing, committing, dirty, error, setTreeId, setSubmissionId, setField, setMany, previewNow, stageNow, commitToExisting, commitAsNew, discardStage, reset, getNodeResult]);

  return apiValue;
}
