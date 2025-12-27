import { TreeBranchLeafSelectConfig } from '../../types';

type BatchRequest = {
  fieldId: string;
  resolve: (value: TreeBranchLeafSelectConfig | null) => void;
  reject: (reason?: any) => void;
};

class SelectConfigBatcher {
  private queue: BatchRequest[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private api: any; // We'll need to inject the API instance or use a callback

  // Since we need the authenticated API instance, we can't make this a pure singleton without injection.
  // However, the API instance usually just adds headers.
  // We can make the `fetch` method accept the `api` object.

  fetch(fieldId: string, api: any): Promise<TreeBranchLeafSelectConfig | null> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fieldId, resolve, reject });

      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      this.timeout = setTimeout(() => {
        this.processQueue(api);
      }, 50); // 50ms debounce
    });
  }

  private async processQueue(api: any) {
    const currentQueue = [...this.queue];
    this.queue = [];
    this.timeout = null;

    if (currentQueue.length === 0) return;

    const fieldIds = Array.from(new Set(currentQueue.map(req => req.fieldId)));

    try {
      // console.log(`[SelectConfigBatcher] Batching ${fieldIds.length} requests...`);
      const response = await api.post('/api/treebranchleaf/nodes/select-config/batch', { fieldIds });
      
      const configMap = response || {};

      currentQueue.forEach(req => {
        const config = configMap[req.fieldId];
        req.resolve(config || null);
      });

    } catch (error) {
      console.error('[SelectConfigBatcher] Batch request failed:', error);
      // Fallback: try individual requests or just reject?
      // Rejecting is safer to avoid infinite loops if the batch endpoint is broken.
      currentQueue.forEach(req => {
        req.reject(error);
      });
    }
  }
}

export const selectConfigBatcher = new SelectConfigBatcher();
