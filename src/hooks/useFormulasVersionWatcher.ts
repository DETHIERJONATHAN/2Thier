import { useEffect } from 'react';

/**
 * Hook global pour surveiller la version des formules côté backend et invalider le cache local.
 * Stratégie simple: on interroge /api/treebranchleaf/formulas-version au montage, puis à intervalles.
 * Si la version change versus localStorage, on déclenche un event window 'formulas-version-changed'.
 */
export function useFormulasVersionWatcher(): void {
  // 🔕 DEPRECATED: Ce watcher est neutralisé car le système d'évaluation unifié
  // n'utilise plus de "formulas-version" ping. Laisser en place pour éviter les crashs.
  // TODO: supprimer complètement après refonte cache dépendances.
  useEffect(() => {
    const isProd = (() => {
      // Vite expose import.meta.env; fallback safe si process absent
      try {
        const meta: unknown = (import.meta as unknown);
        if (meta && typeof meta === 'object' && 'env' in meta) {
          const env = (meta as { env?: Record<string, unknown> }).env || {};
            const prodFlag = env.PROD === true;
            const modeProd = env.MODE === 'production';
            return Boolean(prodFlag || modeProd);
        }
      } catch { /* ignore */ }
      if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV === 'production';
      }
      return false; // défaut: considérer dev
    })();
    if (!isProd) {
      console.warn('[TBL] useFormulasVersionWatcher est déprécié (noop).');
    }
  }, []);
}

/**
 * Utilitaire pour s'abonner au changement de version facilement.
 */
export function onFormulasVersionChange(callback: (info: { newVersion: number; oldVersion: number; generatedAt?: string }) => void) {
  const handler = (ev: Event) => {
    const ce = ev as CustomEvent;
    if (ce.detail && typeof ce.detail.newVersion === 'number') {
      callback(ce.detail);
    }
  };
  window.addEventListener('formulas-version-changed', handler as EventListener);
  return () => window.removeEventListener('formulas-version-changed', handler as EventListener);
}
