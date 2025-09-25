/**
 * 🎭 WRAPPER TRANSPARENT POUR TREBRANCHLEAF
 * 
 * Enveloppe les composants TreeBranchLeaf existants pour ajouter
 * automatiquement les capacités TBL sans modifier le code existant
 * 
 * ✅ 100% COMPATIBLE : Aucune modification des composants existants
 * ✅ TRANSPARENT : Fonctionne en arrière-plan
 * ✅ EXTENSIBLE : Peut être activé/désactivé facilement
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  ReactNode,
  useState,
  useMemo
} from 'react';
import { getTBLSyncService, TBLSyncEvent, TBLSyncStats } from './TBLSyncService';
import { TBLElement, type TreeBranchLeafNode } from '../index';

// 🎯 CONTEXTE TBL
interface TBLContextValue {
  isEnabled: boolean;
  getTBLCode: (nodeId: string) => string | undefined;
  getTBLElement: (nodeId: string) => TBLElement | undefined;
  getAllTBLElements: () => TBLElement[];
  getStats: () => TBLSyncStats;
  toggleEnabled: () => void;
  clearData: () => void;
  exportData: () => Record<string, TBLElement>;
  importData: (data: Record<string, TBLElement>) => void;
}

const TBLContext = createContext<TBLContextValue | null>(null);

// 🎣 HOOK D'ACCÈS AU CONTEXTE TBL
export function useTBLContext(): TBLContextValue {
  const context = useContext(TBLContext);
  if (!context) {
    throw new Error('useTBLContext doit être utilisé dans un TBLProvider');
  }
  return context;
}

// 🎭 PROPRIÉTÉS DU WRAPPER
interface TreeBranchLeafTBLWrapperProps {
  children: ReactNode;
  enabled?: boolean;
  debugMode?: boolean;
  autoSyncOnMount?: boolean;
  syncInterval?: number; // ms
}

// 🎭 WRAPPER PRINCIPAL
export function TreeBranchLeafTBLWrapper({
  children,
  enabled = true,
  debugMode = true,
  autoSyncOnMount = true,
  syncInterval = 0 // 0 = pas de sync automatique
}: TreeBranchLeafTBLWrapperProps) {
  
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [events, setEvents] = useState<TBLSyncEvent[]>([]);
  const syncService = useRef(getTBLSyncService());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔧 LOGGING
  const log = (message: string) => {
    if (debugMode) {
      console.log(`[TBL Wrapper] ${message}`);
    }
  };

  // 🔔 ÉCOUTE DES ÉVÉNEMENTS TBL
  useEffect(() => {
    const unsubscribe = syncService.current.subscribe((event: TBLSyncEvent) => {
      setEvents(prev => [event, ...prev.slice(0, 49)]); // Garder les 50 derniers
      
      if (debugMode) {
        log(`Événement: ${event.type} - ${event.nodeId}`);
      }
    });

    return unsubscribe;
  }, [debugMode, log]);

  // ⏰ SYNCHRONISATION PÉRIODIQUE (si activée)
  useEffect(() => {
    if (syncInterval > 0 && isEnabled) {
      intervalRef.current = setInterval(() => {
        log(`⏰ Sync périodique (${syncInterval}ms)`);
        // Ici on pourrait déclencher une re-sync si nécessaire
      }, syncInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [syncInterval, isEnabled, log]);

  // 🚀 SYNCHRONISATION AU MONTAGE
  useEffect(() => {
    if (autoSyncOnMount && isEnabled) {
      log('🚀 Auto-sync au montage activé');
      
      // Tenter de synchroniser avec les nœuds existants
      // Cette logique peut être étendue selon vos besoins
      const existingNodes = document.querySelectorAll('[data-treebranchleaf-node]');
      if (existingNodes.length > 0) {
        log(`🔄 ${existingNodes.length} nœuds détectés pour sync`);
      }
    }
  }, [autoSyncOnMount, isEnabled, log]);

  // 🎯 VALEUR DU CONTEXTE
  const contextValue: TBLContextValue = useMemo(() => ({
    isEnabled,
    
    getTBLCode: (nodeId: string) => {
      return isEnabled ? syncService.current.getCode(nodeId) : undefined;
    },
    
    getTBLElement: (nodeId: string) => {
      return isEnabled ? syncService.current.getElement(nodeId) : undefined;
    },
    
    getAllTBLElements: () => {
      return isEnabled ? syncService.current.getAllElements() : [];
    },
    
    getStats: () => {
      return syncService.current.getStats();
    },
    
    toggleEnabled: () => {
      const newEnabled = !isEnabled;
      setIsEnabled(newEnabled);
      
      if (newEnabled) {
        syncService.current.activate();
        log('✅ TBL Bridge activé');
      } else {
        syncService.current.deactivate();
        log('⏸️ TBL Bridge désactivé');
      }
    },
    
    clearData: () => {
      syncService.current.clear();
      setEvents([]);
      log('🧹 Données TBL effacées');
    },
    
    exportData: () => {
      const data = syncService.current.export();
      log(`📤 ${Object.keys(data).length} éléments exportés`);
      return data;
    },
    
    importData: (data: Record<string, TBLElement>) => {
      const count = syncService.current.import(data);
      log(`📥 ${count} éléments importés`);
    }
  }), [isEnabled, log]);

  // 🎬 INTERCEPTEUR D'ÉVÉNEMENTS DOM (pour capturer les créations TreeBranchLeaf)
  useEffect(() => {
    if (!isEnabled) return;

    const handleNodeCreated = async (event: Event) => {
      const customEvent = event as CustomEvent<{ node: TreeBranchLeafNode }>;
      
      if (customEvent.detail?.node) {
        log(`🎯 Création TreeBranchLeaf interceptée: ${customEvent.detail.node.label}`);
        await syncService.current.syncCreate(customEvent.detail.node);
      }
    };

    const handleNodeUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent<{ node: TreeBranchLeafNode }>;
      
      if (customEvent.detail?.node) {
        log(`🎯 Mise à jour TreeBranchLeaf interceptée: ${customEvent.detail.node.label}`);
        await syncService.current.syncUpdate(customEvent.detail.node);
      }
    };

    const handleNodeDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string }>;
      
      if (customEvent.detail?.nodeId) {
        log(`🎯 Suppression TreeBranchLeaf interceptée: ${customEvent.detail.nodeId}`);
        syncService.current.syncDelete(customEvent.detail.nodeId);
      }
    };

    // Écouter les événements personnalisés TreeBranchLeaf
    document.addEventListener('treebranchleaf:node:created', handleNodeCreated);
    document.addEventListener('treebranchleaf:node:updated', handleNodeUpdated);
    document.addEventListener('treebranchleaf:node:deleted', handleNodeDeleted);

    return () => {
      document.removeEventListener('treebranchleaf:node:created', handleNodeCreated);
      document.removeEventListener('treebranchleaf:node:updated', handleNodeUpdated);
      document.removeEventListener('treebranchleaf:node:deleted', handleNodeDeleted);
    };
  }, [isEnabled, log]);

  return (
    <TBLContext.Provider value={contextValue}>
      {/* Indicateur visuel optionnel */}
      {debugMode && isEnabled && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: '#52c41a',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          opacity: 0.8
        }}>
          🔗 TBL Bridge Actif ({syncService.current.getStats().totalElements})
        </div>
      )}
      
      {children}
    </TBLContext.Provider>
  );
}

// 🛠️ HELPER POUR ÉMETTRE DES ÉVÉNEMENTS TREBRANCHLEAF
export const TBLEventEmitter = {
  
  nodeCreated: (node: TreeBranchLeafNode) => {
    document.dispatchEvent(new CustomEvent('treebranchleaf:node:created', {
      detail: { node }
    }));
  },
  
  nodeUpdated: (node: TreeBranchLeafNode) => {
    document.dispatchEvent(new CustomEvent('treebranchleaf:node:updated', {
      detail: { node }
    }));
  },
  
  nodeDeleted: (nodeId: string) => {
    document.dispatchEvent(new CustomEvent('treebranchleaf:node:deleted', {
      detail: { nodeId }
    }));
  }
};

// 🎯 COMPOSANT DE DEBUG TBL
interface TBLDebugPanelProps {
  maxEvents?: number;
}

export function TBLDebugPanel({ maxEvents = 10 }: TBLDebugPanelProps) {
  const { isEnabled, getStats, getAllTBLElements } = useTBLContext();
  const [events, setEvents] = useState<TBLSyncEvent[]>([]);
  
  useEffect(() => {
    const syncService = getTBLSyncService();
    
    const unsubscribe = syncService.subscribe((event) => {
      setEvents(prev => [event, ...prev.slice(0, maxEvents - 1)]);
    });
    
    return unsubscribe;
  }, [maxEvents]);
  
  if (!isEnabled) {
    return <div>TBL Bridge désactivé</div>;
  }
  
  const stats = getStats();
  const elements = getAllTBLElements();
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      background: 'white', 
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '10px',
      maxWidth: '300px',
      fontSize: '12px',
      zIndex: 9998
    }}>
      <h4>🔗 TBL Bridge Debug</h4>
      
      <div><strong>Éléments:</strong> {stats.totalElements}</div>
      <div><strong>Succès:</strong> {stats.successfulSyncs}</div>
      <div><strong>Échecs:</strong> {stats.failedSyncs}</div>
      <div><strong>Temps moyen:</strong> {stats.averageProcessingTime.toFixed(2)}ms</div>
      
      <h5>Derniers événements:</h5>
      {events.slice(0, 5).map((event, i) => (
        <div key={i} style={{ fontSize: '10px', color: '#666' }}>
          {event.type} - {event.nodeId} - {event.timestamp.toLocaleTimeString()}
        </div>
      ))}
      
      <h5>Codes TBL:</h5>
      {elements.slice(0, 5).map(el => (
        <div key={el.id} style={{ fontSize: '10px' }}>
          {el.tbl_code} - {el.label}
        </div>
      ))}
    </div>
  );
}

/**
 * 🎯 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * // Dans votre App.tsx ou composant racine
 * import { TreeBranchLeafTBLWrapper, TBLDebugPanel } from './TreeBranchLeafTBLWrapper';
 * 
 * function App() {
 *   return (
 *     <TreeBranchLeafTBLWrapper 
 *       enabled={true}
 *       debugMode={true}
 *       autoSyncOnMount={true}
 *     >
 *       <YourExistingTreeBranchLeafComponents />
 *       
 *       {process.env.NODE_ENV === 'development' && <TBLDebugPanel />}
 *     </TreeBranchLeafTBLWrapper>
 *   );
 * }
 * 
 * // Dans un composant enfant
 * function MyComponent() {
 *   const { getTBLCode, isEnabled } = useTBLContext();
 *   
 *   const tblCode = getTBLCode(nodeId);
 *   
 *   return (
 *     <div>
 *       Nœud: {nodeLabel}
 *       {isEnabled && tblCode && <span>Code TBL: {tblCode}</span>}
 *     </div>
 *   );
 * }
 * ```
 */