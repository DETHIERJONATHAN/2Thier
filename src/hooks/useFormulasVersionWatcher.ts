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
    // Hook neutralisé - plus d'avertissement pour ne pas polluer la console
    // TODO: supprimer complètement après refonte cache dépendances.
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
