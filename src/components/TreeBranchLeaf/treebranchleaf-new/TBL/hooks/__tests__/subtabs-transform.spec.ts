import { transformNodesToTBLComplete } from '../useTBLDataPrismaComplete';

describe('subTab transformation', () => {
  it('should propagate metadata.subTab into fields and compute tab.subTabs', () => {
    const tabNode = { id: 'tab_1', parentId: null, label: 'Projet', type: 'branch', order: 0, metadata: { subTabs: ['Photos', 'Electricité'] } } as any;
    const field1 = { id: 'f1', parentId: 'tab_1', type: 'leaf_field', label: 'Champ A', metadata: { subTab: 'Photos' }, order: 10 } as any;
    const field2 = { id: 'f2', parentId: 'tab_1', type: 'leaf_field', label: 'Champ B', metadata: { subTab: 'Electricité' }, order: 20 } as any;
    const nodes = [ tabNode, field1, field2 ];
    const result = transformNodesToTBLComplete(nodes as any, {});
    expect(result.tabs.length).toBeGreaterThan(0);
    const t = result.tabs.find(x => x.id === 'tab_1');
    expect(t).toBeDefined();
    expect(t!.subTabs).toBeDefined();
    expect(t!.subTabs!.map(s => s.label)).toEqual(expect.arrayContaining(['Photos', 'Electricité']));
    const fields = result.fieldsByTab['tab_1'];
    expect(fields.find(f => f.id === 'f1')!.subTabKey).toBe('Photos');
    expect(fields.find(f => f.id === 'f2')!.subTabKey).toBe('Electricité');
  });
});
