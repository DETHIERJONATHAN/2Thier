/**
 * 🎭 SERVICE DE SYNCHRONISATION TBL
 * 
 * Service autonome pour maintenir la cohérence entre:
 * - Les nœuds TreeBranchLeaf (UUID)
 * - Les éléments TBL (codes 2-chiffres)
 * 
 * ✅ TEMPS RÉEL : Synchronisation automatique
 * ✅ PERSISTANT : Stockage fiable
 * ✅ RÉSILIENT : Gestion des erreurs et reconstitution
 */

import { TBLElement, TBLBridge, type TreeBranchLeafNode, type TBLBridgeConfig } from '../index';

export interface TBLSyncEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_SYNC';
  nodeId: string;
  node?: TreeBranchLeafNode;
  tblElement?: TBLElement;
  timestamp: Date;
}

export interface TBLSyncStats {
  totalElements: number;
  lastSync: Date | null;
  successfulSyncs: number;
  failedSyncs: number;
  reconstitutions: number;
  averageProcessingTime: number;
}

export type TBLSyncListener = (event: TBLSyncEvent) => void;

export class TBLSyncService {
  private bridge: TBLBridge;
  private elements: Map<string, TBLElement> = new Map();
  private listeners: Set<TBLSyncListener> = new Set();
  private isActive: boolean = true;
  private storageKey: string = 'tbl-sync-service-data';
  
  // Statistiques
  private stats: TBLSyncStats = {
    totalElements: 0,
    lastSync: null,
    successfulSyncs: 0,
    failedSyncs: 0,
    reconstitutions: 0,
    averageProcessingTime: 0
  };
  
  // Cache des temps de traitement
  private processingTimes: number[] = [];
  private maxProcessingTimesSamples = 50;

  constructor(bridgeConfig?: Partial<TBLBridgeConfig>) {
    this.bridge = new TBLBridge(bridgeConfig || {
      enableAutoCapacityDetection: true,
      strictTypeValidation: false,
      allowDuplicateNames: true,
      debugMode: true
    });
    
    this.loadFromStorage();
    this.log('🚀 TBL Sync Service initialisé');
  }

  // 📂 STOCKAGE PERSISTANT
  private saveToStorage(): void {
    try {
      const data = {
        elements: Object.fromEntries(this.elements.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this.log(`💾 ${this.elements.size} éléments sauvegardés`);
      
    } catch (error) {
      this.log(`❌ Erreur sauvegarde: ${error}`);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restaurer les éléments
        this.elements = new Map(Object.entries(data.elements || {}));
        
        // Restaurer les stats
        if (data.stats) {
          this.stats = {
            ...data.stats,
            lastSync: data.stats.lastSync ? new Date(data.stats.lastSync) : null
          };
        }
        
        // Importer dans le bridge
        if (this.elements.size > 0) {
          this.bridge.importElements(Array.from(this.elements.values()));
        }
        
        this.log(`📂 ${this.elements.size} éléments restaurés depuis le stockage`);
      }
      
    } catch (error) {
      this.log(`❌ Erreur chargement: ${error}`);
      this.reconstitute();
    }
  }

  // 🔄 RECONSTITUTION D'URGENCE
  private reconstitute(): void {
    this.log('🚨 Reconstitution d\'urgence des données TBL');
    
    this.elements.clear();
    this.bridge.clear();
    
    this.stats.reconstitutions++;
    this.saveToStorage();
    
    this.emit({
      type: 'BULK_SYNC',
      nodeId: 'SYSTEM',
      timestamp: new Date()
    });
  }

  // 📊 GESTION DES PERFORMANCES
  private recordProcessingTime(time: number): void {
    this.processingTimes.push(time);
    
    if (this.processingTimes.length > this.maxProcessingTimesSamples) {
      this.processingTimes.shift();
    }
    
    // Calculer la moyenne
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  // 🔔 ÉVÉNEMENTS
  private emit(event: TBLSyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.log(`❌ Erreur émission événement: ${error}`);
      }
    });
  }

  public subscribe(listener: TBLSyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 🔧 LOGGING
  private log(message: string): void {
    console.log(`[TBL Sync] ${message}`);
  }

  // 🆕 SYNCHRONISATION CRÉATION
  public async syncCreate(node: TreeBranchLeafNode): Promise<TBLElement | null> {
    if (!this.isActive) return null;
    
    const startTime = performance.now();
    
    try {
      this.log(`🆕 Sync création: ${node.label} (${node.type})`);
      
      const result = await this.bridge.process(node);
      
      if (result.success && result.element) {
        this.elements.set(node.id, result.element);
        this.stats.totalElements = this.elements.size;
        this.stats.lastSync = new Date();
        this.stats.successfulSyncs++;
        
        this.saveToStorage();
        
        this.emit({
          type: 'CREATE',
          nodeId: node.id,
          node,
          tblElement: result.element,
          timestamp: new Date()
        });
        
        this.log(`✅ Élément TBL créé: ${result.element.tbl_code}`);
        return result.element;
        
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      this.stats.failedSyncs++;
      this.log(`❌ Erreur sync création: ${error}`);
      return null;
      
    } finally {
      const endTime = performance.now();
      this.recordProcessingTime(endTime - startTime);
    }
  }

  // 🔄 SYNCHRONISATION MISE À JOUR
  public async syncUpdate(node: TreeBranchLeafNode): Promise<TBLElement | null> {
    if (!this.isActive) return null;
    
    const startTime = performance.now();
    
    try {
      this.log(`🔄 Sync mise à jour: ${node.label}`);
      
      const result = await this.bridge.process(node);
      
      if (result.success && result.element) {
        this.elements.set(node.id, result.element);
        this.stats.lastSync = new Date();
        this.stats.successfulSyncs++;
        
        this.saveToStorage();
        
        this.emit({
          type: 'UPDATE',
          nodeId: node.id,
          node,
          tblElement: result.element,
          timestamp: new Date()
        });
        
        this.log(`✅ Élément TBL mis à jour: ${result.element.tbl_code}`);
        return result.element;
      }
      
    } catch (error) {
      this.stats.failedSyncs++;
      this.log(`❌ Erreur sync mise à jour: ${error}`);
      
    } finally {
      const endTime = performance.now();
      this.recordProcessingTime(endTime - startTime);
    }
    
    return null;
  }

  // 🗑️ SYNCHRONISATION SUPPRESSION
  public syncDelete(nodeId: string): boolean {
    if (!this.isActive) return false;
    
    try {
      const element = this.elements.get(nodeId);
      
      if (element) {
        this.elements.delete(nodeId);
        this.stats.totalElements = this.elements.size;
        this.stats.lastSync = new Date();
        
        this.saveToStorage();
        
        this.emit({
          type: 'DELETE',
          nodeId,
          tblElement: element,
          timestamp: new Date()
        });
        
        this.log(`🗑️ Élément TBL supprimé: ${element.tbl_code}`);
        return true;
      }
      
    } catch (error) {
      this.log(`❌ Erreur sync suppression: ${error}`);
    }
    
    return false;
  }

  // 🔄 SYNCHRONISATION EN MASSE
  public async syncBulk(nodes: TreeBranchLeafNode[]): Promise<number> {
    if (!this.isActive) return 0;
    
    this.log(`🔄 Sync en masse: ${nodes.length} nœuds`);
    
    let successCount = 0;
    const startTime = performance.now();
    
    for (const node of nodes) {
      const element = await this.syncCreate(node);
      if (element) successCount++;
    }
    
    const endTime = performance.now();
    this.recordProcessingTime(endTime - startTime);
    
    this.emit({
      type: 'BULK_SYNC',
      nodeId: 'BULK',
      timestamp: new Date()
    });
    
    this.log(`✅ Sync en masse terminée: ${successCount}/${nodes.length} succès`);
    return successCount;
  }

  // 🔍 REQUÊTES
  public getElement(nodeId: string): TBLElement | undefined {
    return this.elements.get(nodeId);
  }

  public getCode(nodeId: string): string | undefined {
    return this.elements.get(nodeId)?.tbl_code;
  }

  public getAllElements(): TBLElement[] {
    return Array.from(this.elements.values());
  }

  public getStats(): TBLSyncStats {
    return { ...this.stats };
  }

  public isElementExists(nodeId: string): boolean {
    return this.elements.has(nodeId);
  }

  public findElementByCode(tblCode: string): TBLElement | undefined {
    return Array.from(this.elements.values()).find(el => el.tbl_code === tblCode);
  }

  // 🎛️ CONTRÔLE
  public activate(): void {
    this.isActive = true;
    this.log('✅ Service activé');
  }

  public deactivate(): void {
    this.isActive = false;
    this.log('⏸️ Service désactivé');
  }

  public clear(): void {
    this.elements.clear();
    this.bridge.clear();
    
    this.stats = {
      totalElements: 0,
      lastSync: null,
      successfulSyncs: 0,
      failedSyncs: 0,
      reconstitutions: 0,
      averageProcessingTime: 0
    };
    
    this.processingTimes = [];
    
    localStorage.removeItem(this.storageKey);
    this.log('🧹 Service réinitialisé');
    
    this.emit({
      type: 'BULK_SYNC',
      nodeId: 'CLEAR',
      timestamp: new Date()
    });
  }

  // 📤 EXPORT / IMPORT
  public export(): Record<string, TBLElement> {
    return Object.fromEntries(this.elements.entries());
  }

  public import(data: Record<string, TBLElement>): number {
    this.elements = new Map(Object.entries(data));
    this.bridge.importElements(Array.from(this.elements.values()));
    
    this.stats.totalElements = this.elements.size;
    this.stats.lastSync = new Date();
    
    this.saveToStorage();
    
    this.log(`📥 ${this.elements.size} éléments importés`);
    
    this.emit({
      type: 'BULK_SYNC',
      nodeId: 'IMPORT',
      timestamp: new Date()
    });
    
    return this.elements.size;
  }
}

// 🌍 INSTANCE GLOBALE (Singleton)
let globalTBLSyncService: TBLSyncService | null = null;

export function getTBLSyncService(): TBLSyncService {
  if (!globalTBLSyncService) {
    globalTBLSyncService = new TBLSyncService();
  }
  return globalTBLSyncService;
}

/**
 * 🎯 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * import { getTBLSyncService } from './TBLSyncService';
 * 
 * const syncService = getTBLSyncService();
 * 
 * // Écouter les événements
 * const unsubscribe = syncService.subscribe((event) => {
 *   console.log(`Événement TBL: ${event.type}`, event);
 * });
 * 
 * // Synchroniser un nouveau nœud
 * const tblElement = await syncService.syncCreate(newNode);
 * 
 * // Obtenir le code TBL
 * const code = syncService.getCode(nodeId);
 * 
 * // Statistiques
 * const stats = syncService.getStats();
 * console.log(`${stats.totalElements} éléments, ${stats.successfulSyncs} succès`);
 * ```
 */