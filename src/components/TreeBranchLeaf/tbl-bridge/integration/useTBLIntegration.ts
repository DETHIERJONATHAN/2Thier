/**
 * 🎣 HOOK D'INTÉGRATION TBL BRIDGE
 * 
 * S'accroche aux opérations TreeBranchLeaf existantes pour générer
 * automatiquement les codes TBL 2-chiffres [TYPE][CAPACITÉ]
 * 
 * ✅ NON-INVASIF : Aucune modification du code TreeBranchLeaf existant
 * ✅ TRANSPARENT : Fonctionne en arrière-plan
 * ✅ SÉCURISÉ : Stockage temporaire, pas de modification BDD
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TBLBridge, TBLElement, type TreeBranchLeafNode } from '../index';

interface TBLIntegrationConfig {
  enableAutoGeneration: boolean;      // Génération automatique des codes TBL
  enableRealTimeSync: boolean;        // Synchronisation temps réel
  storageMode: 'memory' | 'localStorage'; // Mode de stockage temporaire
  debugMode: boolean;                 // Logs de debug
}

interface TBLIntegrationState {
  isActive: boolean;
  tblElements: Map<string, TBLElement>;
  pendingOperations: number;
  lastSync: Date | null;
  errors: string[];
}

interface UseTBLIntegrationReturn {
  // État
  state: TBLIntegrationState;
  
  // Actions
  interceptNodeCreate: (node: TreeBranchLeafNode) => Promise<void>;
  interceptNodeUpdate: (node: TreeBranchLeafNode) => Promise<void>;
  interceptNodeDelete: (nodeId: string) => Promise<void>;
  
  // Requêtes
  getTBLElement: (nodeId: string) => TBLElement | undefined;
  getTBLCode: (nodeId: string) => string | undefined;
  getAllTBLElements: () => TBLElement[];
  
  // Utilitaires
  syncWithTreeBranchLeaf: (nodes: TreeBranchLeafNode[]) => Promise<void>;
  exportTBLData: () => Record<string, TBLElement>;
  importTBLData: (data: Record<string, TBLElement>) => void;
  clearTBLData: () => void;
}

export function useTBLIntegration(config: Partial<TBLIntegrationConfig> = {}): UseTBLIntegrationReturn {
  
  // Configuration avec valeurs par défaut (— stockage mémoire uniquement, données via API/Cloud SQL)
  const fullConfig: TBLIntegrationConfig = {
    enableAutoGeneration: true,
    enableRealTimeSync: true,
    storageMode: 'memory',
    debugMode: true,
    ...config,
    storageMode: 'memory', // forcé : zéro stockage local
  };

  // Instance TBL Bridge
  const tblBridge = useRef(new TBLBridge({
    enableAutoCapacityDetection: true,
    strictTypeValidation: false, // Plus permissif pour l'intégration
    allowDuplicateNames: true,   // Gérer les doublons intelligemment
    debugMode: fullConfig.debugMode
  }));

  // État de l'intégration
  const [state, setState] = useState<TBLIntegrationState>({
    isActive: fullConfig.enableAutoGeneration,
    tblElements: new Map(),
    pendingOperations: 0,
    lastSync: null,
    errors: []
  });

  // 🔧 Fonction de log stable
  const log = useCallback((message: string) => {
    if (fullConfig.debugMode) {
      console.log(`[TBL Integration] ${message}`);
    }
  }, [fullConfig.debugMode]);

  // 💾 Sauvegarde en mémoire uniquement (données via API/Cloud SQL)
  const saveToStorage = useCallback((_elements: Map<string, TBLElement>) => {
    log('💾 Données TBL en mémoire (Cloud SQL via API)');
  }, [log]);

  // 📂 Chargement depuis la mémoire (rien à restaurer)
  const loadFromStorage = useCallback((): Map<string, TBLElement> => {
    return new Map();
  }, []);

  // 🚀 Initialisation - Charger les données existantes
  useEffect(() => {
    const stored = loadFromStorage();
    setState(prev => ({ ...prev, tblElements: stored }));
    
    // Importer dans TBLBridge
    if (stored.size > 0) {
      tblBridge.current.importElements(Array.from(stored.values()));
      log(`🔄 ${stored.size} éléments importés dans TBL Bridge`);
    }
  }, [loadFromStorage, log]);

  // 🎣 INTERCEPTION CRÉATION DE NŒUD
  const interceptNodeCreate = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    if (!state.isActive || !fullConfig.enableAutoGeneration) return;

    setState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));
    
    try {
      log(`🆕 Interception création: ${node.label} (${node.type})`);
      
      // Traiter avec TBL Bridge
      const result = await tblBridge.current.process(node);
      
      if (result.success && result.element) {
        // Mettre à jour l'état local
        setState(prev => {
          const newElements = new Map(prev.tblElements);
          newElements.set(node.id, result.element!);
          
          // Sauvegarder
          saveToStorage(newElements);
          
          return {
            ...prev,
            tblElements: newElements,
            lastSync: new Date(),
            pendingOperations: prev.pendingOperations - 1
          };
        });
        
        log(`✅ Code TBL généré: ${result.element.tbl_code}`);
        
        if (result.warnings) {
          log(`⚠️ Avertissements: ${result.warnings.join(', ')}`);
        }
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      const errorMsg = `Erreur génération TBL pour ${node.label}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      log(`❌ ${errorMsg}`);
      
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMsg],
        pendingOperations: prev.pendingOperations - 1
      }));
    }
  }, [state.isActive, fullConfig.enableAutoGeneration, log, saveToStorage]);

  // 🔄 INTERCEPTION MISE À JOUR DE NŒUD
  const interceptNodeUpdate = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    if (!state.isActive || !fullConfig.enableRealTimeSync) return;
    
    setState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));
    
    try {
      log(`🔄 Interception mise à jour: ${node.label}`);
      
      // Re-traiter avec TBL Bridge
      const result = await tblBridge.current.process(node);
      
      if (result.success && result.element) {
        setState(prev => {
          const newElements = new Map(prev.tblElements);
          newElements.set(node.id, result.element!);
          
          saveToStorage(newElements);
          
          return {
            ...prev,
            tblElements: newElements,
            lastSync: new Date(),
            pendingOperations: prev.pendingOperations - 1
          };
        });
        
        log(`✅ Code TBL mis à jour: ${result.element.tbl_code}`);
      }
      
    } catch (error) {
      const errorMsg = `Erreur mise à jour TBL: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      log(`❌ ${errorMsg}`);
      
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMsg],
        pendingOperations: prev.pendingOperations - 1
      }));
    }
  }, [state.isActive, fullConfig.enableRealTimeSync, log, saveToStorage]);

  // 🗑️ INTERCEPTION SUPPRESSION DE NŒUD
  const interceptNodeDelete = useCallback(async (nodeId: string): Promise<void> => {
    if (!state.isActive) return;
    
    setState(prev => {
      const newElements = new Map(prev.tblElements);
      const deleted = newElements.get(nodeId);
      
      if (deleted) {
        newElements.delete(nodeId);
        saveToStorage(newElements);
        log(`🗑️ Élément TBL supprimé: ${deleted.tbl_code}`);
      }
      
      return {
        ...prev,
        tblElements: newElements,
        lastSync: new Date()
      };
    });
  }, [state.isActive, log, saveToStorage]);

  // 🔍 REQUÊTES
  const getTBLElement = useCallback((nodeId: string): TBLElement | undefined => {
    return state.tblElements.get(nodeId);
  }, [state.tblElements]);

  const getTBLCode = useCallback((nodeId: string): string | undefined => {
    return state.tblElements.get(nodeId)?.tbl_code;
  }, [state.tblElements]);

  const getAllTBLElements = useCallback((): TBLElement[] => {
    return Array.from(state.tblElements.values());
  }, [state.tblElements]);

  // 🔄 SYNCHRONISATION COMPLÈTE
  const syncWithTreeBranchLeaf = useCallback(async (nodes: TreeBranchLeafNode[]): Promise<void> => {
    if (!state.isActive) return;
    
    log(`🔄 Synchronisation complète avec ${nodes.length} nœuds TreeBranchLeaf`);
    
    setState(prev => ({ ...prev, pendingOperations: nodes.length }));
    
    try {
      const newElements = new Map<string, TBLElement>();
      let processed = 0;
      
      for (const node of nodes) {
        try {
          const result = await tblBridge.current.process(node);
          
          if (result.success && result.element) {
            newElements.set(node.id, result.element);
          }
          
          processed++;
          
          // Mise à jour progressive pour les gros volumes
          if (processed % 10 === 0) {
            setState(prev => ({ 
              ...prev, 
              pendingOperations: nodes.length - processed 
            }));
          }
          
        } catch (error) {
          log(`❌ Erreur sync nœud ${node.label}: ${error}`);
        }
      }
      
      // Mise à jour finale
      setState(prev => ({
        ...prev,
        tblElements: newElements,
        pendingOperations: 0,
        lastSync: new Date()
      }));
      
      saveToStorage(newElements);
      log(`✅ Synchronisation terminée: ${newElements.size} éléments TBL`);
      
    } catch (error) {
      const errorMsg = `Erreur synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      log(`❌ ${errorMsg}`);
      
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMsg],
        pendingOperations: 0
      }));
    }
  }, [state.isActive, log, saveToStorage]);

  // 📤 EXPORT DES DONNÉES
  const exportTBLData = useCallback((): Record<string, TBLElement> => {
    return Object.fromEntries(state.tblElements.entries());
  }, [state.tblElements]);

  // 📥 IMPORT DES DONNÉES
  const importTBLData = useCallback((data: Record<string, TBLElement>): void => {
    const elements = new Map(Object.entries(data));
    
    setState(prev => ({
      ...prev,
      tblElements: elements,
      lastSync: new Date()
    }));
    
    saveToStorage(elements);
    tblBridge.current.importElements(Array.from(elements.values()));
    
    log(`📥 ${elements.size} éléments TBL importés`);
  }, [saveToStorage, log]);

  // 🧹 EFFACER LES DONNÉES
  const clearTBLData = useCallback((): void => {
    setState(prev => ({
      ...prev,
      tblElements: new Map(),
      errors: [],
      lastSync: null
    }));
    
    tblBridge.current.clear();
    log('🧹 Données TBL effacées');
  }, [log]);

  return {
    state,
    interceptNodeCreate,
    interceptNodeUpdate,
    interceptNodeDelete,
    getTBLElement,
    getTBLCode,
    getAllTBLElements,
    syncWithTreeBranchLeaf,
    exportTBLData,
    importTBLData,
    clearTBLData
  };
}

/**
 * 🎯 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * // Dans un composant TreeBranchLeaf
 * function MyTreeBranchLeafComponent() {
 *   const tblIntegration = useTBLIntegration({
 *     enableAutoGeneration: true,
 *     debugMode: true
 *   });
 * 
 *   const handleNodeCreate = async (nodeData) => {
 *     // Création normale TreeBranchLeaf
 *     const newNode = await createTreeBranchLeafNode(nodeData);
 *     
 *     // Interception TBL (automatique)
 *     await tblIntegration.interceptNodeCreate(newNode);
 *     
 *     return newNode;
 *   };
 * 
 *   // Récupérer le code TBL d'un nœud
 *   const tblCode = tblIntegration.getTBLCode(nodeId);
 *   console.log(`Code TBL: ${tblCode}`); // "62-prix-total"
 * 
 *   return <TreeBranchLeafEditor />;
 * }
 * ```
 */