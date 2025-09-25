import { useCallback, useMemo, useRef } from 'react';
import { useEvalBridge } from '../bridge/evalBridge';

// TTL cache (ms)
const DEFAULT_TTL = 5000;

export interface BatchEvalResultItem {
  nodeId: string;
  calculatedValue: number | string | boolean | null;
  raw: unknown;
  meta: Record<string, unknown>;
}

export interface BatchEvalOptions {
  ttl?: number;
  debug?: boolean;
}

interface CacheEntry {
  key: string; // signature
  timestamp: number;
  results: Record<string, BatchEvalResultItem>;
  nodeIds: string[];
  fieldHash: string;
}

// Création d'un hash simple (JSON stable + length) – suffisant pour invalidation courte durée
function hashObject(obj: Record<string, unknown>): string {
  try {
    return JSON.stringify(obj, Object.keys(obj).sort()) + '|' + Object.keys(obj).length;
  } catch {
    return 'hash-error';
  }
}

/**
 * IMPORTANT: Hook legacy conservé pour compatibilité.
 * Il délègue maintenant entièrement au bridge (enqueueMany) afin d'unifier
 * toutes les évaluations via le même pipeline (micro-batching + déduplication).
 * À terme, remplacer les usages par useEvalBridge directement.
 */
export function useBatchEvaluation(options: BatchEvalOptions = {}) {
  const { enqueueMany } = useEvalBridge();
  const ttl = options.ttl ?? DEFAULT_TTL;
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  type BridgeItemObj = { elementId: string; value: unknown; raw?: unknown; meta?: Record<string, unknown> };
  const diag = () => { try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; } };

  const buildSignature = useCallback((nodeIds: string[], fieldValues: Record<string, unknown>) => {
    const sorted = [...nodeIds].sort();
    const fieldHash = hashObject(fieldValues || {});
    return { key: `${sorted.join(',')}::${fieldHash}`, fieldHash };
  }, []);

  const evaluateBatch = useCallback(async (nodeIds: string[], fieldValues: Record<string, unknown>) => {
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) return {} as Record<string, BatchEvalResultItem>;
    const { key, fieldHash } = buildSignature(nodeIds, fieldValues);
    const now = Date.now();
    const existing = cacheRef.current.get(key);
    if (existing && (now - existing.timestamp) < ttl) {
      if (options.debug || diag()) console.log('[BATCH-EVAL] Cache HIT', { key, nodeIds, age: now - existing.timestamp });
      return existing.results;
    }
    try {
      if (options.debug || diag()) console.log('[BATCH-EVAL] MISS -> enqueueMany', { nodeIds, key });
      // Nouvelle utilisation correcte: enqueueMany(string[], context)
      const rawValues = await enqueueMany(nodeIds, fieldValues);
      const results: Record<string, BatchEvalResultItem> = {};
      // Compat: si la bridge renvoie déjà des objets { elementId, value }
      if (Array.isArray(rawValues) && rawValues.length && typeof rawValues[0] === 'object' && rawValues[0] && 'elementId' in (rawValues[0] as Record<string, unknown>)) {
        for (const r of rawValues as BridgeItemObj[]) {
          const elId = r.elementId;
          results[elId] = {
            nodeId: elId,
            calculatedValue: r.value as number | string | boolean | null,
            raw: r.raw ?? r.value,
            meta: r.meta || {}
          };
        }
      } else {
        // Sinon on suppose un tableau de valeurs aligné sur nodeIds
        for (let i = 0; i < nodeIds.length; i++) {
          const elId = nodeIds[i];
          const v = (rawValues as unknown[])[i];
          results[elId] = {
            nodeId: elId,
            calculatedValue: v as number | string | boolean | null,
            raw: v,
            meta: {}
          };
        }
      }
      cacheRef.current.set(key, { key, timestamp: Date.now(), results, nodeIds, fieldHash });
      if (diag()) console.log('[BATCH-EVAL] STORE', { key, count: Object.keys(results).length });
      return results;
    } catch (e) {
      console.error('[BATCH-EVAL] Erreur bridge batch', e);
      return {} as Record<string, BatchEvalResultItem>;
    }
  }, [enqueueMany, buildSignature, ttl, options.debug]);

  const invalidate = useCallback((changedFields?: string[]) => {
    if (!changedFields || changedFields.length === 0) {
      cacheRef.current.clear();
      return; 
    }
    cacheRef.current.clear();
  }, []);

  const getStats = useCallback(() => {
    const entries = Array.from(cacheRef.current.values());
    return {
      size: entries.length,
      entries: entries.map(e => ({ key: e.key, ageMs: Date.now() - e.timestamp }))
    };
  }, []);

  return useMemo(() => ({ evaluateBatch, invalidate, getStats }), [evaluateBatch, invalidate, getStats]);
}

export default useBatchEvaluation;