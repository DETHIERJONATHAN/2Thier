import { buildResponseFromColumns } from '../treebranchleaf-routes';

describe('buildResponseFromColumns', () => {
  it('should preserve metadata.subTabs and metadata.subTab when building response', () => {
    const node = {
      id: 't1',
      metadata: { subTabs: ['Photos', 'Électricité'], subTab: 'Photos' }
    } as unknown;
    const res = buildResponseFromColumns(node as unknown);
    expect(res.metadata).toBeDefined();
    expect((res.metadata as unknown).subTabs).toEqual(['Photos', 'Électricité']);
    expect((res.metadata as unknown).subTab).toEqual('Photos');
  });

  it('should reconstruct metadata.subTabs and metadata.subTab when present in dedicated columns', () => {
    const node = {
      id: 't2',
      subtabs: JSON.stringify(['Documents', 'Images']),
      subtab: 'Images'
    } as unknown;
    const res = buildResponseFromColumns(node as unknown);
    expect(res.metadata).toBeDefined();
    expect((res.metadata as unknown).subTabs).toEqual(['Documents', 'Images']);
    expect((res.metadata as unknown).subTab).toEqual('Images');
  });
});
