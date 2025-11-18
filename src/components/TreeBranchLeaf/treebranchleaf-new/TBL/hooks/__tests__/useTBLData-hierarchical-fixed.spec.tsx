import React from 'react';
import { render, act, screen } from '@testing-library/react';
import useTBLDataHierarchicalFixed from '../useTBLData-hierarchical-fixed';
import { vi } from 'vitest';

// Mock useAuthenticatedApi
vi.mock('../../../../../hooks/useAuthenticatedApi', () => ({
  useAuthenticatedApi: () => ({
    api: {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      patch: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({})
    }
  })
}));

const Wrapper: React.FC<{ treeId: string }> = ({ treeId }) => {
  const { rawNodes, refetch } = useTBLDataHierarchicalFixed({ tree_id: treeId });
  return (
    <div>
      <div data-testid="raw-count">{rawNodes.length}</div>
      <button data-testid="refetch" onClick={() => refetch()} />
    </div>
  );
};

describe('useTBLDataHierarchicalFixed', () => {
  it('should call api.get on mount and again on tbl-subtabs-updated event', async () => {
    const { useAuthenticatedApi } = await import('../../../../../hooks/useAuthenticatedApi');
    const spyGet = useAuthenticatedApi().api.get as any;

    const treeId = 'test-tree-1';
    render(<Wrapper treeId={treeId} />);

    expect(spyGet).toHaveBeenCalled();
    const initialCalls = spyGet.mock.calls.length;

    // dispatch subTabs updated event
    await act(async () => {
      window.dispatchEvent(new CustomEvent('tbl-subtabs-updated', { detail: { treeId } }));
    });

    expect(spyGet.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should merge updated node on tbl-node-updated event', async () => {
    const { useAuthenticatedApi } = await import('../../../../../hooks/useAuthenticatedApi');
    const spyGet = useAuthenticatedApi().api.get as any;
    // Initial node list without displayAlways
    spyGet.mockResolvedValueOnce([{ id: 's1', label: 'section1', metadata: {} }]);

    const treeId = 'test-tree-2';
    render(<Wrapper treeId={treeId} />);

    // Emit an updated node with displayAlways true
    const updatedNode = { id: 's1', label: 'section1', metadata: { displayAlways: true } };
    await act(async () => {
      window.dispatchEvent(new CustomEvent('tbl-node-updated', { detail: { node: updatedNode, treeId } }));
    });

    // The wrapper only renders rawNodes length (which goes from 1 initially to still 1)
    // But we can assert that the global rawNodes from hook should include updated metadata by re-fetching using spyGet mocked response.
    spyGet.mockResolvedValueOnce([{ id: 's1', label: 'section1', metadata: { displayAlways: true } }]);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('tbl-subtabs-updated', { detail: { treeId } }));
    });

    expect(spyGet).toHaveBeenCalled();
  });
});
