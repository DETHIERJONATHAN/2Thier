/**
 * 🎯 TESTS D'INTÉGRATION TBL BRIDGE
 * 
 * Tests pour valider l'intégration non-invasive avec TreeBranchLeaf
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getTBLSyncService, TBLSyncService } from '../TBLSyncService';
import { getTBLAutoInjector } from '../TBLAutoInjector';
import { TreeBranchLeafDetector, TBLValidator, ManualTBLSync } from '../TBLIntegrationUtils';
import type { TreeBranchLeafNode } from '../../index';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock de données TreeBranchLeaf
const mockTreeBranchLeafNode: TreeBranchLeafNode = {
  id: 'test-node-123',
  label: 'Prix Total HT',
  type: 'price',
  parentId: null,
  position: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('TBL Integration', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Nettoyer le DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Nettoyer les services
    const syncService = getTBLSyncService();
    syncService.clear();
    
    const injector = getTBLAutoInjector();
    if (injector.isActive()) {
      injector.eject();
    }
  });

  describe('TBLSyncService', () => {
    
    it('devrait créer un service singleton', () => {
      const service1 = getTBLSyncService();
      const service2 = getTBLSyncService();
      
      expect(service1).toBe(service2);
    });

    it('devrait synchroniser un nouveau nœud', async () => {
      const syncService = getTBLSyncService();
      
      const element = await syncService.syncCreate(mockTreeBranchLeafNode);
      
      expect(element).toBeDefined();
      expect(element?.id).toBe(mockTreeBranchLeafNode.id);
      expect(element?.tbl_code).toMatch(/^[1-7][1-4]$/);
    });

    it('devrait gérer la mise à jour d\'un nœud', async () => {
      const syncService = getTBLSyncService();
      
      // Créer d'abord
      await syncService.syncCreate(mockTreeBranchLeafNode);
      
      // Modifier et mettre à jour
      const updatedNode = { ...mockTreeBranchLeafNode, label: 'Prix Total TTC' };
      const element = await syncService.syncUpdate(updatedNode);
      
      expect(element).toBeDefined();
      expect(element?.label).toBe('Prix Total TTC');
    });

    it('devrait gérer la suppression d\'un nœud', async () => {
      const syncService = getTBLSyncService();
      
      // Créer d'abord
      await syncService.syncCreate(mockTreeBranchLeafNode);
      expect(syncService.isElementExists(mockTreeBranchLeafNode.id)).toBe(true);
      
      // Supprimer
      const result = syncService.syncDelete(mockTreeBranchLeafNode.id);
      
      expect(result).toBe(true);
      expect(syncService.isElementExists(mockTreeBranchLeafNode.id)).toBe(false);
    });

    it('devrait persister les données dans localStorage', async () => {
      const syncService = getTBLSyncService();
      
      await syncService.syncCreate(mockTreeBranchLeafNode);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tbl-sync-service-data',
        expect.stringContaining(mockTreeBranchLeafNode.id)
      );
    });

    it('devrait restaurer les données depuis localStorage', () => {
      const mockData = {
        elements: {
          'test-node-123': {
            id: 'test-node-123',
            label: 'Prix Total HT',
            type: 'price',
            tbl_code: '61',
            capacity: 1,
            createdAt: new Date().toISOString()
          }
        },
        stats: {
          totalElements: 1,
          successfulSyncs: 1,
          failedSyncs: 0,
          lastSync: new Date().toISOString()
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
      
      // Créer un nouveau service qui devrait charger les données
      const syncService = new TBLSyncService();
      
      expect(syncService.getElement('test-node-123')).toBeDefined();
      expect(syncService.getStats().totalElements).toBe(1);
    });

    it('devrait émettre des événements', (done) => {
      const syncService = getTBLSyncService();
      
      const unsubscribe = syncService.subscribe((event) => {
        expect(event.type).toBe('CREATE');
        expect(event.nodeId).toBe(mockTreeBranchLeafNode.id);
        unsubscribe();
        done();
      });
      
      syncService.syncCreate(mockTreeBranchLeafNode);
    });

    it('devrait calculer les statistiques correctement', async () => {
      const syncService = getTBLSyncService();
      
      await syncService.syncCreate(mockTreeBranchLeafNode);
      await syncService.syncCreate({
        ...mockTreeBranchLeafNode,
        id: 'test-node-456',
        label: 'Quantité'
      });
      
      const stats = syncService.getStats();
      
      expect(stats.totalElements).toBe(2);
      expect(stats.successfulSyncs).toBe(2);
      expect(stats.failedSyncs).toBe(0);
    });

  });

  describe('TreeBranchLeafDetector', () => {
    
    it('devrait détecter les éléments TreeBranchLeaf dans le DOM', () => {
      // Ajouter des éléments test au DOM
      document.body.innerHTML = `
        <div data-treebranchleaf-node="node1" data-label="Test Node 1">Node 1</div>
        <div data-node-id="node2" data-type="price">Node 2</div>
        <div class="tree-node" id="node3">Node 3</div>
        <div>Regular div</div>
      `;
      
      const elements = TreeBranchLeafDetector.findAllNodes();
      
      expect(elements).toHaveLength(3);
    });

    it('devrait extraire les données d\'un élément', () => {
      const element = document.createElement('div');
      element.setAttribute('data-node-id', 'test-123');
      element.setAttribute('data-label', 'Test Label');
      element.setAttribute('data-type', 'price');
      element.setAttribute('data-parent-id', 'parent-456');
      
      const nodeData = TreeBranchLeafDetector.extractNodeData(element);
      
      expect(nodeData).toEqual({
        id: 'test-123',
        label: 'Test Label',
        type: 'price',
        parentId: 'parent-456',
        position: 0,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('devrait identifier les éléments TreeBranchLeaf', () => {
      const tblElement = document.createElement('div');
      tblElement.setAttribute('data-treebranchleaf-node', 'test');
      
      const regularElement = document.createElement('div');
      
      expect(TreeBranchLeafDetector.isTreeBranchLeafElement(tblElement)).toBe(true);
      expect(TreeBranchLeafDetector.isTreeBranchLeafElement(regularElement)).toBe(false);
    });

  });

  describe('TBLValidator', () => {
    
    it('devrait valider les codes TBL corrects', () => {
      const validCodes = ['11', '23', '34', '67', '72'];
      
      validCodes.forEach(code => {
        const result = TBLValidator.validateTBLCode(code);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('devrait rejeter les codes TBL incorrects', () => {
      const invalidCodes = [
        { code: '', error: 'Code TBL manquant' },
        { code: '1', error: 'Code TBL doit faire exactement 2 caractères' },
        { code: '123', error: 'Code TBL doit faire exactement 2 caractères' },
        { code: '81', error: 'Code type doit être entre 1 et 7' },
        { code: '15', error: 'Code capacité doit être entre 1 et 4' },
        { code: 'AB', error: 'Code type doit être entre 1 et 7' }
      ];
      
      invalidCodes.forEach(({ code, error }) => {
        const result = TBLValidator.validateTBLCode(code);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(error);
      });
    });

    it('devrait détecter les codes TBL en doublon', () => {
      const elements = [
        { id: '1', tbl_code: '11', label: 'Element 1', type: 'price' },
        { id: '2', tbl_code: '22', label: 'Element 2', type: 'quantity' },
        { id: '3', tbl_code: '11', label: 'Element 3', type: 'price' }, // Doublon
        { id: '4', tbl_code: '33', label: 'Element 4', type: 'text' }
      ];
      
      const duplicates = TBLValidator.findDuplicateCodes(elements as any);
      
      expect(Object.keys(duplicates)).toHaveLength(1);
      expect(duplicates['11']).toHaveLength(2);
      expect(duplicates['11'][0].id).toBe('1');
      expect(duplicates['11'][1].id).toBe('3');
    });

  });

  describe('ManualTBLSync', () => {
    
    it('devrait synchroniser depuis le DOM', async () => {
      // Préparer le DOM
      document.body.innerHTML = `
        <div data-node-id="node1" data-label="Test Node" data-type="price">Node 1</div>
        <div data-treebranchleaf-node="node2" data-label="Another Node">Node 2</div>
      `;
      
      // Mock l'émission d'événements
      const emitSpy = vi.spyOn(document, 'dispatchEvent');
      
      const result = await ManualTBLSync.syncFromDOM();
      
      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.errors).toBe(0);
      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    it('devrait synchroniser un nœud spécifique', async () => {
      const element = document.createElement('div');
      element.id = 'specific-node';
      element.setAttribute('data-label', 'Specific Node');
      element.setAttribute('data-type', 'price');
      document.body.appendChild(element);
      
      const emitSpy = vi.spyOn(document, 'dispatchEvent');
      
      const result = await ManualTBLSync.syncSpecificNode('specific-node');
      
      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'treebranchleaf:node:created'
        })
      );
    });

  });

  describe('Auto Injector', () => {
    
    it('devrait s\'injecter sans erreur', () => {
      const injector = getTBLAutoInjector();
      
      expect(() => injector.inject()).not.toThrow();
      expect(injector.isActive()).toBe(true);
    });

    it('devrait se désinjecter proprement', () => {
      const injector = getTBLAutoInjector();
      
      injector.inject();
      expect(injector.isActive()).toBe(true);
      
      injector.eject();
      expect(injector.isActive()).toBe(false);
    });

    it('devrait intercepter fetch', () => {
      const originalFetch = window.fetch;
      const injector = getTBLAutoInjector();
      
      injector.inject();
      
      expect(window.fetch).not.toBe(originalFetch);
      
      injector.eject();
      
      expect(window.fetch).toBe(originalFetch);
    });

  });

  describe('Intégration End-to-End', () => {
    
    it('devrait fonctionner de bout en bout', async () => {
      // 1. Démarrer l'injection
      const injector = getTBLAutoInjector();
      injector.inject();
      
      // 2. Ajouter un élément au DOM
      const element = document.createElement('div');
      element.setAttribute('data-node-id', 'e2e-test');
      element.setAttribute('data-label', 'Test E2E');
      element.setAttribute('data-type', 'price');
      document.body.appendChild(element);
      
      // 3. Déclencher la synchronisation manuelle
      await ManualTBLSync.syncSpecificNode('e2e-test');
      
      // 4. Vérifier que l'élément TBL existe
      const syncService = getTBLSyncService();
      const tblElement = syncService.getElement('e2e-test');
      
      expect(tblElement).toBeDefined();
      expect(tblElement?.tbl_code).toMatch(/^[1-7][1-4]$/);
      expect(tblElement?.label).toBe('Test E2E');
      
      // 5. Nettoyer
      injector.eject();
    });

  });

});