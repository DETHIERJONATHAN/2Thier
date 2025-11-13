import { removeJSONFromUpdate } from '../treebranchleaf-routes';

describe('removeJSONFromUpdate', () => {
  it('should preserve metadata.capabilities only by default', () => {
    const payload = { metadata: { capabilities: { foo: 'bar' }, other: 'x' }, appearanceConfig: { size: 'small' } } as any;
    const result = removeJSONFromUpdate(payload);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.capabilities).toEqual({ foo: 'bar' });
    expect((result.metadata as any).other).toBeUndefined();
  });

  it('should preserve metadata.subTabs and metadata.subTab', () => {
    const payload = { metadata: { subTabs: ['A', 'B'], subTab: 'A', unrelated: 1 } } as any;
    const result = removeJSONFromUpdate(payload);
    expect(result.metadata).toBeDefined();
    expect((result.metadata as any).subTabs).toEqual(['A', 'B']);
    expect((result.metadata as any).subTab).toEqual('A');
    expect((result.metadata as any).unrelated).toBeUndefined();
  });
});
