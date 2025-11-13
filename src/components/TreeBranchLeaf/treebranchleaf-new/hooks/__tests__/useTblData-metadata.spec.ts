import { mapApiTree } from '../useTblData';

describe('mapApiTree metadata propagation', () => {
  it('should copy metadata from api nodes to TblNode', () => {
    const apiTree = { id: 'tree1', name: 'Test' } as any;
    const nodes = [
      { id: 'tab1', parentId: null, label: 'Tab 1', description: null, type: 'branch', subType: null, order: 0, metadata: { subTabs: ['Photos', 'Electricité'] } },
      { id: 'leaf1', parentId: 'tab1', label: 'Champ A', description: null, type: 'leaf_field', subType: null, order: 1, metadata: { subTab: 'Photos' } }
    ];
    const result = mapApiTree(apiTree, nodes);
    expect(result).toBeDefined();
    expect(result!.nodes.length).toBeGreaterThan(0);
    const tab = result!.nodes.find(n => n.id === 'tab1') as any;
    expect(tab).toBeDefined();
    expect(tab.metadata).toBeDefined();
    expect(Array.isArray(tab.metadata.subTabs)).toBe(true);
    const leaf = tab.children.find((c: any) => c.id === 'leaf1');
    expect(leaf).toBeDefined();
    expect(leaf.metadata).toBeDefined();
    expect(leaf.metadata.subTab).toBe('Photos');
  });
});
