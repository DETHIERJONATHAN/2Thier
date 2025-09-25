/**
 * 🚀 SYSTÈME D'INJECTION AUTOMATIQUE TBL
 * 
 * Injecte automatiquement les capacités TBL dans le système TreeBranchLeaf
 * existant via monkey-patching et interception d'API
 * 
 * ✅ ZÉRO MODIFICATION : Aucun changement dans le code existant
 * ✅ RÉTROCOMPATIBLE : 100% compatible avec l'existant
 * ✅ ACTIVATION/DÉSACTIVATION : Peut être activé/désactivé à tout moment
 */

import { getTBLSyncService } from './TBLSyncService';
import { type TreeBranchLeafNode } from '../index';

interface TBLInjectionConfig {
  enabled: boolean;
  interceptAPI: boolean;
  interceptHooks: boolean;
  interceptEvents: boolean;
  debugMode: boolean;
}

interface TBLInterceptionPoint {
  name: string;
  originalMethod: any;
  interceptedMethod: any;
  isActive: boolean;
}

class TBLAutoInjector {
  private config: TBLInjectionConfig;
  private syncService = getTBLSyncService();
  private interceptionPoints: Map<string, TBLInterceptionPoint> = new Map();
  private isInjected: boolean = false;

  constructor(config: Partial<TBLInjectionConfig> = {}) {
    this.config = {
      enabled: true,
      interceptAPI: true,
      interceptHooks: true,
      interceptEvents: true,
      debugMode: true,
      ...config
    };
  }

  // 🔧 LOGGING
  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[TBL Auto-Injector] ${message}`);
    }
  }

  // 🎯 INJECTION PRINCIPALE
  public inject(): void {
    if (this.isInjected) {
      this.log('⚠️ Injection déjà active');
      return;
    }

    if (!this.config.enabled) {
      this.log('⏸️ Injection désactivée par config');
      return;
    }

    this.log('🚀 Début de l\'injection TBL...');

    try {
      if (this.config.interceptAPI) {
        this.injectAPIInterception();
      }

      if (this.config.interceptHooks) {
        this.injectHooksInterception();
      }

      if (this.config.interceptEvents) {
        this.injectEventInterception();
      }

      this.isInjected = true;
      this.log(`✅ Injection terminée - ${this.interceptionPoints.size} points d'interception actifs`);

    } catch (error) {
      this.log(`❌ Erreur injection: ${error}`);
    }
  }

  // 🔄 DÉSINJECTION
  public eject(): void {
    if (!this.isInjected) {
      this.log('⚠️ Aucune injection active');
      return;
    }

    this.log('🔄 Début de la désinjection...');

    try {
      // Restaurer toutes les méthodes originales
      this.interceptionPoints.forEach((point, name) => {
        if (point.isActive && point.originalMethod) {
          this.restoreOriginalMethod(name, point);
        }
      });

      this.interceptionPoints.clear();
      this.isInjected = false;

      this.log('✅ Désinjection terminée');

    } catch (error) {
      this.log(`❌ Erreur désinjection: ${error}`);
    }
  }

  // 🌐 INTERCEPTION API
  private injectAPIInterception(): void {
    this.log('🌐 Injection interception API...');

    // Intercepter fetch global si utilisé
    this.interceptFetch();

    // Intercepter les méthodes d'API TreeBranchLeaf courantes
    this.interceptTreeBranchLeafAPI();
  }

  // 📡 INTERCEPTION FETCH
  private interceptFetch(): void {
    const originalFetch = window.fetch;

    const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);

      // Détecter les appels TreeBranchLeaf
      const url = typeof input === 'string' ? input : input.toString();
      
      if (url.includes('/api/treebranchleaf') || url.includes('/treebranchleaf')) {
        this.handleAPIResponse(url, response, init);
      }

      return response;
    };

    window.fetch = interceptedFetch;

    this.interceptionPoints.set('window.fetch', {
      name: 'window.fetch',
      originalMethod: originalFetch,
      interceptedMethod: interceptedFetch,
      isActive: true
    });

    this.log('📡 Fetch intercepté');
  }

  // 🌳 INTERCEPTION API TREBRANCHLEAF
  private interceptTreeBranchLeafAPI(): void {
    // Recherche des objets API dans le scope global
    const possibleAPIPaths = [
      'window.TreeBranchLeafAPI',
      'window.api.treebranchleaf',
      'window.app.treebranchleaf'
    ];

    possibleAPIPaths.forEach(path => {
      const api = this.getNestedProperty(window, path);
      if (api) {
        this.interceptAPIObject(api, path);
      }
    });
  }

  // 🎣 INTERCEPTION HOOKS
  private injectHooksInterception(): void {
    this.log('🎣 Injection interception hooks...');

    // Cette partie nécessiterait une approche plus sophistiquée
    // pour intercepter les hooks React personnalisés TreeBranchLeaf
    // Pour l'instant, on se concentre sur les événements DOM
  }

  // 📢 INTERCEPTION ÉVÉNEMENTS
  private injectEventInterception(): void {
    this.log('📢 Injection interception événements...');

    // Intercepter addEventListener pour capturer les événements TreeBranchLeaf
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    const interceptedAddEventListener = function(this: EventTarget, type: string, listener: any, options?: boolean | AddEventListenerOptions) {
      // Appel original
      originalAddEventListener.call(this, type, listener, options);

      // Si c'est un événement TreeBranchLeaf, ajouter notre interception
      if (type.includes('treebranchleaf') || type.includes('node')) {
        // Ajouter notre propre listener
        originalAddEventListener.call(this, type, (event: Event) => {
          // Notre traitement TBL ici
        }, options);
      }
    };

    EventTarget.prototype.addEventListener = interceptedAddEventListener;

    this.interceptionPoints.set('EventTarget.prototype.addEventListener', {
      name: 'EventTarget.prototype.addEventListener',
      originalMethod: originalAddEventListener,
      interceptedMethod: interceptedAddEventListener,
      isActive: true
    });

    // Intercepter les mutations DOM pour détecter les nouveaux nœuds
    this.setupDOMObserver();
  }

  // 👁️ OBSERVATEUR DOM
  private setupDOMObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Rechercher des éléments TreeBranchLeaf
              if (element.getAttribute('data-treebranchleaf-node') ||
                  element.className.includes('treebranchleaf') ||
                  element.className.includes('tree-node')) {
                
                this.handleNewTreeBranchLeafElement(element);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-treebranchleaf-node', 'data-node-id']
    });

    this.log('👁️ Observateur DOM configuré');
  }

  // 🎯 GESTIONNAIRES D'ÉVÉNEMENTS

  private async handleAPIResponse(url: string, response: Response, init?: RequestInit): Promise<void> {
    try {
      // Cloner la réponse pour pouvoir la lire
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      // Détecter les opérations de création/modification
      if (init?.method === 'POST' || init?.method === 'PUT') {
        if (data && typeof data === 'object' && 'id' in data) {
          const node = data as TreeBranchLeafNode;
          this.log(`🆕 Nouveau nœud détecté via API: ${node.label || node.id}`);
          
          await this.syncService.syncCreate(node);
        }
      }

    } catch (error) {
      // Ignore les erreurs de parsing JSON
    }
  }

  private handleNewTreeBranchLeafElement(element: Element): void {
    const nodeId = element.getAttribute('data-node-id') || element.getAttribute('data-treebranchleaf-node');
    
    if (nodeId) {
      this.log(`🎯 Nouvel élément TreeBranchLeaf détecté: ${nodeId}`);
      
      // Essayer d'extraire les données du nœud depuis l'élément
      const nodeData = this.extractNodeDataFromElement(element);
      
      if (nodeData) {
        this.syncService.syncCreate(nodeData);
      }
    }
  }

  // 🔍 UTILITAIRES

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private interceptAPIObject(api: any, path: string): void {
    const methods = ['create', 'update', 'delete', 'createNode', 'updateNode', 'deleteNode'];

    methods.forEach(method => {
      if (typeof api[method] === 'function') {
        const original = api[method];
        
        api[method] = async (...args: any[]) => {
          const result = await original.apply(api, args);
          
          // Traitement TBL après l'opération
          if (result && typeof result === 'object') {
            this.handleAPIResult(method, result);
          }
          
          return result;
        };

        this.interceptionPoints.set(`${path}.${method}`, {
          name: `${path}.${method}`,
          originalMethod: original,
          interceptedMethod: api[method],
          isActive: true
        });

        this.log(`🎯 Méthode ${path}.${method} interceptée`);
      }
    });
  }

  private async handleAPIResult(method: string, result: any): Promise<void> {
    if (method.includes('create') && result.id) {
      await this.syncService.syncCreate(result as TreeBranchLeafNode);
    } else if (method.includes('update') && result.id) {
      await this.syncService.syncUpdate(result as TreeBranchLeafNode);
    } else if (method.includes('delete') && typeof result === 'string') {
      this.syncService.syncDelete(result);
    }
  }

  private extractNodeDataFromElement(element: Element): TreeBranchLeafNode | null {
    try {
      // Essayer de récupérer les données depuis les attributs data-*
      const nodeId = element.getAttribute('data-node-id') || element.id;
      const label = element.getAttribute('data-label') || element.textContent?.trim() || '';
      const type = element.getAttribute('data-type') || 'unknown';

      if (nodeId) {
        return {
          id: nodeId,
          label,
          type,
          // Ajouter d'autres propriétés par défaut
          parentId: element.getAttribute('data-parent-id') || null,
          position: parseInt(element.getAttribute('data-position') || '0'),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as TreeBranchLeafNode;
      }

    } catch (error) {
      this.log(`❌ Erreur extraction données nœud: ${error}`);
    }

    return null;
  }

  private restoreOriginalMethod(name: string, point: TBLInterceptionPoint): void {
    try {
      const pathParts = name.split('.');
      let obj = window as any;

      // Naviguer jusqu'à l'objet parent
      for (let i = 0; i < pathParts.length - 1; i++) {
        obj = obj[pathParts[i]];
        if (!obj) return;
      }

      // Restaurer la méthode originale
      const methodName = pathParts[pathParts.length - 1];
      obj[methodName] = point.originalMethod;

      this.log(`🔄 Méthode ${name} restaurée`);

    } catch (error) {
      this.log(`❌ Erreur restauration ${name}: ${error}`);
    }
  }

  // 🎛️ CONTRÔLE PUBLIC

  public isActive(): boolean {
    return this.isInjected;
  }

  public getInterceptionPoints(): string[] {
    return Array.from(this.interceptionPoints.keys());
  }

  public toggle(): void {
    if (this.isInjected) {
      this.eject();
    } else {
      this.inject();
    }
  }

  public configure(newConfig: Partial<TBLInjectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('⚙️ Configuration mise à jour');
  }
}

// 🌍 INSTANCE GLOBALE
let globalInjector: TBLAutoInjector | null = null;

export function getTBLAutoInjector(): TBLAutoInjector {
  if (!globalInjector) {
    globalInjector = new TBLAutoInjector();
  }
  return globalInjector;
}

// 🚀 INJECTION AUTOMATIQUE AU CHARGEMENT
export function autoInjectTBL(config?: Partial<TBLInjectionConfig>): () => void {
  const injector = getTBLAutoInjector();
  
  if (config) {
    injector.configure(config);
  }
  
  // Injection immédiate si DOM prêt, sinon attendre
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => injector.inject());
  } else {
    injector.inject();
  }
  
  // Retourner une fonction de nettoyage
  return () => injector.eject();
}

/**
 * 🎯 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * // Option 1: Injection automatique simple
 * import { autoInjectTBL } from './TBLAutoInjector';
 * 
 * // Dans votre index.tsx ou App.tsx
 * const cleanup = autoInjectTBL({
 *   enabled: true,
 *   debugMode: process.env.NODE_ENV === 'development'
 * });
 * 
 * // Option 2: Contrôle manuel
 * import { getTBLAutoInjector } from './TBLAutoInjector';
 * 
 * const injector = getTBLAutoInjector();
 * injector.inject(); // Démarrer
 * injector.eject();  // Arrêter
 * injector.toggle(); // Basculer
 * 
 * // Option 3: Contrôle conditionnel
 * if (localStorage.getItem('enable-tbl-bridge') === 'true') {
 *   autoInjectTBL();
 * }
 * ```
 */