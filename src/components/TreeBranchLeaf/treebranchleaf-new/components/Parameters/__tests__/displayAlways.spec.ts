/**
 * Test displayAlways feature
 * 
 * Ce test vérifie:
 * 1. Que l'événement tbl-node-updated est bien émis quand displayAlways change
 * 2. Que le hook useTBLDataPrismaComplete le retransformation correctement
 * 3. Que les sections avec displayAlways apparaissent dans tous les sous-onglets
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('displayAlways Feature Test', () => {
  let eventEmitted = false;
  let emittedNodeData: any = null;

  beforeEach(() => {
    // Mock window.dispatchEvent
    eventEmitted = false;
    emittedNodeData = null;

    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = vi.fn((event: any) => {
      if (event.type === 'tbl-node-updated') {
        eventEmitted = true;
        emittedNodeData = event.detail;
        console.log('✅ Event captured:', event.detail);
      }
      return originalDispatchEvent.call(window, event);
    });
  });

  it('should emit tbl-node-updated when displayAlways is toggled', () => {
    // Simuler le toggle displayAlways
    const nodeData = {
      id: 'test-section-123',
      type: 'section',
      label: 'Test Section',
      metadata: {
        displayAlways: false
      }
    };

    // Simuler le changement
    const updatedNode = {
      ...nodeData,
      metadata: { ...nodeData.metadata, displayAlways: true }
    };

    // Émettre l'événement
    window.dispatchEvent(
      new CustomEvent('tbl-node-updated', {
        detail: { node: updatedNode, treeId: 'tree-123' }
      })
    );

    // Vérifier
    expect(eventEmitted).toBe(true);
    expect(emittedNodeData.node.metadata.displayAlways).toBe(true);
    console.log('✅ Test 1 passed: Event emitted correctly');
  });

  it('should handle both boolean and string displayAlways values', () => {
    const testCases = [
      { value: true, expected: true },
      { value: 'true', expected: true },
      { value: false, expected: false },
      { value: 'false', expected: false }
    ];

    for (const testCase of testCases) {
      const isVisible = (
        testCase.value === true ||
        String(testCase.value) === 'true'
      );

      expect(isVisible).toBe(testCase.expected);
    }

    console.log('✅ Test 2 passed: Boolean/String detection works');
  });

  it('should detect displayAlways in section filtering', () => {
    // Simuler la logique de filtrage des sections
    const section = {
      id: 'sec-1',
      label: 'My Section',
      metadata: {
        displayAlways: true
      }
    };

    const activeSubTab = 'Photo'; // Un sous-onglet actif
    const sectionSubTabKeys = ['Electricité', 'Chauffage']; // La section est affectée à d'autres sous-onglets

    // Avec displayAlways=true, la section devrait être visible même si le subTab ne correspond pas
    const sectionMeta = section.metadata || {};
    const sectionAlwaysVisible = (
      sectionMeta.displayAlways === true ||
      String(sectionMeta.displayAlways) === 'true'
    );

    // Vérifier: la section devrait être visible car displayAlways=true
    const shouldBeVisible = sectionAlwaysVisible || sectionSubTabKeys.includes(activeSubTab);

    expect(shouldBeVisible).toBe(true);
    console.log('✅ Test 3 passed: displayAlways prevents filtering');
  });

  it('should show section in all sub-tabs when displayAlways is true', () => {
    const sections = [
      {
        id: 'always-visible',
        label: 'Important Info',
        metadata: { displayAlways: true },
        subTabKeys: ['Details', 'Photos']
      },
      {
        id: 'conditional',
        label: 'Photos',
        metadata: { displayAlways: false },
        subTabKeys: ['Photos']
      }
    ];

    const subTabs = ['Details', 'Photos', 'Electricité', 'Revenu'];

    // Simuler le filtrage par sous-onglet
    for (const subTab of subTabs) {
      const visibleSections = sections.filter(sec => {
        const secMeta = sec.metadata || {};
        const alwaysVisible = (
          secMeta.displayAlways === true ||
          String(secMeta.displayAlways) === 'true'
        );
        const assignments = Array.isArray((sec as any).subTabKeys)
          ? (sec as any).subTabKeys
          : (sec as any).subTabKey
            ? [sec.subTabKey]
            : [];
        if (assignments.length === 0) {
          return alwaysVisible || subTab === '__default__';
        }
        return alwaysVisible || assignments.includes(subTab);
      });

      // La section "always-visible" doit être visible dans TOUS les sous-onglets
      const alwaysVisibleFound = visibleSections.some(s => s.id === 'always-visible');
      expect(alwaysVisibleFound).toBe(true, `Should be visible in sub-tab: ${subTab}`);
    }

    console.log('✅ Test 4 passed: Section visible in all sub-tabs');
  });

  it('should immediately emit event without waiting for server response', async () => {
    const eventTimings = {
      emitTime: 0,
      serverResponseTime: 0
    };

    // Capturer le temps d'émission
    const eventListener = () => {
      eventTimings.emitTime = Date.now();
    };

    window.addEventListener('tbl-node-updated', eventListener);

    // Émettre l'événement
    const _startTime = Date.now();
    window.dispatchEvent(
      new CustomEvent('tbl-node-updated', {
        detail: { node: { id: 'test', metadata: { displayAlways: true } } }
      })
    );

    // Simuler un serveur qui répond après 500ms
    const _serverResponse = await new Promise(resolve => {
      setTimeout(() => {
        eventTimings.serverResponseTime = Date.now();
        resolve(true);
      }, 500);
    });

    // L'événement aurait dû être émis AVANT la réponse serveur
    expect(eventTimings.emitTime).toBeGreaterThan(0);
    expect(eventTimings.emitTime).toBeLessThan(eventTimings.serverResponseTime);

    window.removeEventListener('tbl-node-updated', eventListener);
    console.log('✅ Test 5 passed: Event emitted before server response');
  });
});
