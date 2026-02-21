/**
 * DataLoader-style request batcher for calculated values.
 * 
 * Instead of 30+ individual GET /api/tree-nodes/:nodeId/calculated-value requests,
 * this collects all nodeIds requested within a 50ms window and fires a single
 * POST /api/tree-nodes/batch-calculated-values request.
 * 
 * Usage: import { batchFetchCalculatedValue } from './calculatedValueBatcher';
 *        const result = await batchFetchCalculatedValue(api, nodeId, submissionId);
 */

interface BatchResult {
  value: string | number | boolean | null;
  calculatedAt?: string;
  calculatedBy?: string;
}

interface PendingRequest {
  nodeId: string;
  submissionId?: string;
  resolve: (result: BatchResult | null) => void;
  reject: (error: Error) => void;
}

// Module-level state
let pendingRequests: PendingRequest[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let currentApi: any = null;

const BATCH_DELAY_MS = 50; // Collect requests for 50ms before firing

/**
 * Flush all pending requests as a single batch POST
 */
async function flushBatch(): Promise<void> {
  batchTimer = null;
  
  const requests = pendingRequests;
  pendingRequests = [];
  
  if (requests.length === 0) return;
  
  const api = currentApi;
  if (!api) {
    // No API available, reject all
    for (const req of requests) {
      req.reject(new Error('API not available'));
    }
    return;
  }
  
  // Group by submissionId (most likely all same)
  const groups = new Map<string, PendingRequest[]>();
  for (const req of requests) {
    const key = req.submissionId || '__none__';
    const group = groups.get(key) || [];
    group.push(req);
    groups.set(key, group);
  }
  
  for (const [key, group] of groups) {
    const nodeIds = [...new Set(group.map(r => r.nodeId))];
    const submissionId = key === '__none__' ? undefined : key;
    
    try {
      const response = await api.post('/api/tree-nodes/batch-calculated-values', {
        nodeIds,
        submissionId,
      });
      
      const results: Record<string, BatchResult> = response?.results || {};
      
      // Resolve each pending request with its result
      for (const req of group) {
        const result = results[req.nodeId] || null;
        req.resolve(result);
      }
    } catch (error) {
      // Fallback: resolve all with null (individual hooks will handle retry)
      for (const req of group) {
        req.resolve(null);
      }
    }
  }
}

/**
 * Request a calculated value for a nodeId. The actual HTTP request will be 
 * batched with other requests made within a 50ms window.
 */
export function batchFetchCalculatedValue(
  api: any,
  nodeId: string,
  submissionId?: string
): Promise<BatchResult | null> {
  currentApi = api;
  
  return new Promise((resolve, reject) => {
    pendingRequests.push({ nodeId, submissionId, resolve, reject });
    
    // Reset the timer on each new request (debounce pattern)
    if (batchTimer !== null) {
      clearTimeout(batchTimer);
    }
    batchTimer = setTimeout(flushBatch, BATCH_DELAY_MS);
  });
}

/**
 * Cancel all pending batch requests (e.g., on component unmount or new devis)
 */
export function cancelPendingBatchRequests(): void {
  if (batchTimer !== null) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  // Resolve all pending with null
  for (const req of pendingRequests) {
    req.resolve(null);
  }
  pendingRequests = [];
}
