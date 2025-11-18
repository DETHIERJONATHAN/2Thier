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
    const f1 = fields.find(f => f.id === 'f1');
    const f2 = fields.find(f => f.id === 'f2');
    expect(f1?.subTabKey).toBe('Photos');
    expect(f1?.subTabKeys).toEqual(['Photos']);
    expect(f2?.subTabKey).toBe('Electricité');
    expect(f2?.subTabKeys).toEqual(['Electricité']);
  });

  it('should not include default "Général" subTab if all fields are assigned', () => {
    const tabNode = { id: 'tab_2', parentId: null, label: 'Projet 2', type: 'branch', order: 0, metadata: { subTabs: ['A', 'B'] } } as any;
    const field1 = { id: 'f1', parentId: 'tab_2', type: 'leaf_field', label: 'Champ A', metadata: { subTab: 'A' }, order: 10 } as any;
    const field2 = { id: 'f2', parentId: 'tab_2', type: 'leaf_field', label: 'Champ B', metadata: { subTab: 'B' }, order: 20 } as any;
    const nodes = [ tabNode, field1, field2 ];
    const result = transformNodesToTBLComplete(nodes as any, {});
    const t = result.tabs.find(x => x.id === 'tab_2');
    expect(t).toBeDefined();
    const keys = (t!.subTabs || []).map(st => st.key);
    expect(keys).not.toContain('__default__');
  });

  it('should ignore displayOnly sections when deciding to show default "Général" subTab', () => {
    const tabNode = { id: 'tab_3', parentId: null, label: 'Projet 3', type: 'branch', order: 0, metadata: { subTabs: ['A'] } } as any;
    const displaySection = { id: 'section_display', parentId: 'tab_3', label: 'Aperçu', type: 'section', order: 1, metadata: { displayAlways: true } } as any;
    const field1 = { id: 'f1', parentId: 'tab_3', type: 'leaf_field', label: 'Champ A', metadata: { subTab: 'A' }, order: 10 } as any;
    // field in displayOnly section but not assigned -> should NOT trigger default
    const field2 = { id: 'f2', parentId: 'section_display', type: 'leaf_field', label: 'Champ B', metadata: {}, order: 20 } as any;
    const nodes = [ tabNode, displaySection, field1, field2 ];
    const result = transformNodesToTBLComplete(nodes as any, {});
    const t = result.tabs.find(x => x.id === 'tab_3');
    expect(t).toBeDefined();
    const keys = (t!.subTabs || []).map(st => st.key);
    expect(keys).not.toContain('__default__');
    // Ensure section metadata is propagated and displayAlways is present
    const sections = result.sectionsByTab['tab_3'] || [];
    const displaySectionFound = sections.find(s => s.title === 'Aperçu');
    expect(displaySectionFound).toBeDefined();
    expect((displaySectionFound as any).metadata?.displayAlways).toBe(true);
  });

  it('should assign fields to multiple subTabs when metadata.subTab is an array', () => {
    const tabNode = { id: 'tab_multi', parentId: null, label: 'Multi', type: 'branch', order: 0, metadata: { subTabs: ['Photo', 'Electricité', 'Chauffage'] } } as any;
    const multiField = { id: 'f_multi', parentId: 'tab_multi', type: 'leaf_field', label: 'Champ Multi', metadata: { subTab: ['Photo', 'Electricité'] }, order: 5 } as any;
    const soloField = { id: 'f_single', parentId: 'tab_multi', type: 'leaf_field', label: 'Champ Solo', metadata: { subTab: 'Chauffage' }, order: 10 } as any;
    const nodes = [tabNode, multiField, soloField];
    const result = transformNodesToTBLComplete(nodes as any, {});
    const tab = result.tabs.find(x => x.id === 'tab_multi');
    expect(tab).toBeDefined();
    const tabKeys = (tab!.subTabs || []).map(st => st.key);
    expect(tabKeys).toEqual(expect.arrayContaining(['Photo', 'Electricité', 'Chauffage']));
    const fields = result.fieldsByTab['tab_multi'];
    const multi = fields.find(f => f.id === 'f_multi');
    expect(multi?.subTabKey).toBe('Photo');
    expect(multi?.subTabKeys).toEqual(['Photo', 'Electricité']);
    const solo = fields.find(f => f.id === 'f_single');
    expect(solo?.subTabKeys).toEqual(['Chauffage']);
  });
});
