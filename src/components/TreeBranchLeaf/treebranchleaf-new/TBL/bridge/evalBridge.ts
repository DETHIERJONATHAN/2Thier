/**
 * 🌉 evalBridge – couche unifiée de batching + instrumentation évènementielle
 *
 * Objectifs:
 *  - Centraliser la file micro-batch pour TOUTES les évaluations (/api/tbl/evaluate)
 *  - Fournir une API simple: enqueue(elementId, contextData) / enqueueMany(elementIds, contextData)
 *  - Publier des évènements structurés dans window.__TBL_BRIDGE__ pour inspection
 *  - Partager in-flight dedup + resolvers entre SmartCalculatedField et appels legacy
 *  - Supporter debug conditionnel via localStorage.TBL_SMART_DEBUG='1'
 */

import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

// ---- Types & Globals -------------------------------------------------------
export interface BridgeEventBase { ts: number; type: string; [k: string]: unknown }
export interface BridgeAPI {
  events: BridgeEventBase[];
  push: (e: BridgeEventBase) => void;
  dump: (filter?: string|RegExp) => BridgeEventBase[];
  clear: () => void;
  setLimit: (n: number) => void;
  limit: number;
}

declare global { interface Window { __TBL_BRIDGE__?: BridgeAPI } }

const isDebug = () => {
  try { return localStorage.getItem('TBL_SMART_DEBUG') === '1'; } catch { return false; }
};

function ensureBridge(): BridgeAPI {
  if (typeof window === 'undefined') {
    // SSR / tests: stub minimal
    return {
      events: [],
      push: () => void 0,
      dump: () => [],
      clear: () => void 0,
      setLimit: () => void 0,
      limit: 0
    };
  }
  if (!window.__TBL_BRIDGE__) {
    const store: BridgeAPI = {
      events: [],
      limit: 500,
      push(e) {
        if (!e || typeof e !== 'object') return;
        this.events.push({ ts: Date.now(), ...e });
        if (this.events.length > this.limit) this.events.splice(0, this.events.length - this.limit);
        if (isDebug()) {
          // Log ultra concis (type + clé principale)
          console.log(`🌉[BRIDGE] ${e.type}`, e.elementId ? `#${e.elementId}` : '');
        }
      },
      dump(filter) {
        if (!filter) return [...this.events];
        const f = (typeof filter === 'string') ? new RegExp(filter, 'i') : filter;
        return this.events.filter(ev => f.test(ev.type));
      },
      clear() { this.events.length = 0; },
      setLimit(n: number) { this.limit = Math.max(50, n|0); if (this.events.length > this.limit) this.events.splice(0, this.events.length - this.limit); }
    };
    window.__TBL_BRIDGE__ = store;
  }
  return window.__TBL_BRIDGE__!;
}

// ---- Internal shared state -------------------------------------------------
interface BatchResolver { (value: unknown): void }
const pending = new Set<string>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const resolvers = new Map<string, BatchResolver>();
const inflight = new Map<string, Promise<unknown>>();
const metrics = { sent: 0, items: 0, avoided: 0, lastDuration: 0 };
const contextRef: { current: Record<string, unknown> } = { current: {} };

// Re-exported so SmartCalculatedField conserve ses caches mais plus besoin de sa propre file.
export const evaluationCaches = {
  inflight,
  // place-holder if we later centralize calculationCache & signatureResultCache
};

// ---- Batching core ---------------------------------------------------------
type EvaluateRequestBody = { elementIds: string[]; contextData: Record<string, unknown>; evalType: string };
type EvaluateBatchResponse = { data?: { results?: Record<string, unknown> } } | { results?: Record<string, unknown> } | unknown;

async function flush(apiPost: (body: EvaluateRequestBody) => Promise<EvaluateBatchResponse>) {
  if (pending.size === 0) return;
  const ids = Array.from(pending.values());
  pending.clear();
  if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
  metrics.sent++; metrics.items += ids.length;
  const bridge = ensureBridge();
  const started = performance.now();
  bridge.push({ type: 'batch_flush_start', ids, size: ids.length });
  try {
    const resp = await apiPost({ elementIds: ids, contextData: contextRef.current, evalType: 'batch' });
    const data = resp?.data || resp;
    const results = data?.results || {};
    ids.forEach(id => {
      const r = resolvers.get(id);
      if (r) { r(results[id]); resolvers.delete(id); }
      bridge.push({ type: 'batch_resolve', elementId: id, hasResult: id in results });
    });
    metrics.lastDuration = Math.round(performance.now() - started);
    bridge.push({ type: 'batch_flush_done', size: ids.length, duration: metrics.lastDuration });
  } catch (e) {
    ids.forEach(id => {
      const r = resolvers.get(id); if (r) { r({ success: false, error: 'batch_failed', details: (e as Error).message }); resolvers.delete(id); }
      ensureBridge().push({ type: 'batch_resolve_error', elementId: id });
    });
  }
}

// ---- Public enqueue API ----------------------------------------------------
function internalEnqueue(
  elementId: string,
  contextData: Record<string, unknown>,
  apiPost: (body: EvaluateRequestBody) => Promise<EvaluateBatchResponse>
): Promise<unknown> {
  const bridge = ensureBridge();
  // Dédup in-flight
  const existing = inflight.get(elementId);
  if (existing) {
    bridge.push({ type: 'enqueue_join_inflight', elementId });
    return existing;
  }

  const promise = new Promise<unknown>(resolve => {
    resolvers.set(elementId, resolve);
    pending.add(elementId);
    contextRef.current = contextData;
    bridge.push({ type: 'enqueue_new', elementId });
    if (!batchTimer) batchTimer = setTimeout(() => flush(apiPost), 15);
  });
  inflight.set(elementId, promise);
  promise.finally(() => { if (inflight.get(elementId) === promise) inflight.delete(elementId); });
  return promise;
}

// ---- Hook / facade ---------------------------------------------------------
export function useEvalBridge() {
  const { api } = useAuthenticatedApi();
  const apiPost = (body: EvaluateRequestBody) => api.post('/api/tbl/evaluate', body, { showErrors: false }) as Promise<EvaluateBatchResponse>;

  const enqueue = (elementId: string, contextData: Record<string, unknown>) => internalEnqueue(elementId, contextData, apiPost);
  const enqueueMany = async (elementIds: string[], contextData: Record<string, unknown>) => {
    return Promise.all(elementIds.map(id => enqueue(id, contextData)));
  };
  const getMetrics = () => ({ ...metrics, avgSize: metrics.sent ? (metrics.items / metrics.sent) : 0 });

  return { enqueue, enqueueMany, getMetrics, bridge: ensureBridge() };
}

// Utilitaires d'accès global (optionnels pour scripts hors React)
export const EvalBridgeGlobal = {
  enqueue(elementId: string, contextData: Record<string, unknown>, api: { post: (url: string, body: unknown, opts?: Record<string, unknown>) => Promise<unknown> }) {
    const apiPost = (body: EvaluateRequestBody) => api.post('/api/tbl/evaluate', body, { showErrors: false }) as Promise<EvaluateBatchResponse>;
    return internalEnqueue(elementId, contextData, apiPost);
  },
  enqueueMany(elementIds: string[], contextData: Record<string, unknown>, api: { post: (url: string, body: unknown, opts?: Record<string, unknown>) => Promise<unknown> }) {
    return Promise.all(elementIds.map(id => this.enqueue(id, contextData, api)));
  },
  bridge: ensureBridge,
};
