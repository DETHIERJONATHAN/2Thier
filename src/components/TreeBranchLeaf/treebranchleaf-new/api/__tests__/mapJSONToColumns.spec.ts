import { mapJSONToColumns } from '../treebranchleaf-routes';

describe('mapJSONToColumns', () => {
  it('should map metadata.subTabs and metadata.subTab to dedicated columns', () => {
    const updateData = { metadata: { subTabs: ['A', 'B'], subTab: 'B' } } as any;
    const columnData = mapJSONToColumns(updateData);
    expect(columnData.subtabs).toBe(JSON.stringify(['A', 'B']));
    expect(columnData.subtab).toBe('B');
  });
});
