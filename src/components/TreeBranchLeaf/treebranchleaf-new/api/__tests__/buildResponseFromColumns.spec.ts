import { buildResponseFromColumns } from '../treebranchleaf-routes';

describe('buildResponseFromColumns', () => {
  it('should preserve metadata.subTabs and metadata.subTab when building response', () => {
    const node = {
      id: 't1',
      metadata: { subTabs: ['Photos', 'Électricité'], subTab: 'Photos' }
    } as any;
    const res = buildResponseFromColumns(node as any);
    expect(res.metadata).toBeDefined();
    expect((res.metadata as any).subTabs).toEqual(['Photos', 'Électricité']);
    expect((res.metadata as any).subTab).toEqual('Photos');
  });

  it('should reconstruct metadata.subTabs and metadata.subTab when present in dedicated columns', () => {
    const node = {
      id: 't2',
      subtabs: JSON.stringify(['Documents', 'Images']),
      subtab: 'Images'
    } as any;
    const res = buildResponseFromColumns(node as any);
    expect(res.metadata).toBeDefined();
    expect((res.metadata as any).subTabs).toEqual(['Documents', 'Images']);
    expect((res.metadata as any).subTab).toEqual('Images');
  });
});
