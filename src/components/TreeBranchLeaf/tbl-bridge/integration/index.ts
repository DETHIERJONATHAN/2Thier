import { logger } from '../../../../lib/logger';
/**
 * 🎯 POINT D'ENTRÉE PRINCIPAL - TBL BRIDGE INTEGRATION
 * 
 * Module principal qui expose toutes les fonctionnalités d'intégration
 * TBL Bridge de manière simple et unifiée
 */

// Core TBL Bridge
export * from '../index';

// Services d'intégration
export { getTBLSyncService, TBLSyncService } from './TBLSyncService';
export type { TBLSyncEvent, TBLSyncStats } from './TBLSyncService';

// Auto-injection
export { getTBLAutoInjector, autoInjectTBL } from './TBLAutoInjector';

// Hook d'intégration (corrigé)
export { useTBLIntegration } from './useTBLIntegration';

// Utils et événements
export * from './TBLIntegrationUtils';

/**
 * 🚀 DÉMARRAGE RAPIDE
 * 
 * ```typescript
 * import { startTBLIntegration } from './integration';
 * 
 * // Dans votre App.tsx
 * const cleanup = startTBLIntegration();
 * 
 * // Voilà ! TBL Bridge fonctionne en arrière-plan
 * ```
 */

export interface TBLIntegrationOptions {
  autoInject?: boolean;
  debugMode?: boolean;
  enableAPI?: boolean;
  enableEvents?: boolean;
  syncOnMount?: boolean;
}

export function startTBLIntegration(options: TBLIntegrationOptions = {}): () => void {
  const {
    autoInject = true,
    debugMode = process.env.NODE_ENV === 'development',
    enableAPI = true,
    enableEvents = true,
    syncOnMount = true
  } = options;

  logger.debug('🚀 [TBL Integration] Démarrage...');

  const cleanupFunctions: (() => void)[] = [];

  // Auto-injection si activée
  if (autoInject) {
    const autoCleanup = autoInjectTBL({
      enabled: true,
      interceptAPI: enableAPI,
      interceptEvents: enableEvents,
      debugMode
    });
    cleanupFunctions.push(autoCleanup);
  }

  // Sync au montage si activée
  if (syncOnMount) {
    const syncService = getTBLSyncService();
    
    // Tentative de sync avec éléments existants
    setTimeout(() => {
      const existingElements = document.querySelectorAll('[data-treebranchleaf-node], [data-node-id]');
      if (existingElements.length > 0 && debugMode) {
        logger.debug(`🔄 [TBL Integration] ${existingElements.length} éléments existants détectés`);
      }
    }, 1000);
  }

  logger.debug('✅ [TBL Integration] Démarrage terminé');

  // Fonction de nettoyage globale
  return () => {
    logger.debug('🧹 [TBL Integration] Nettoyage...');
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}