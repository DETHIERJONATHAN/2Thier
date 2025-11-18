import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Parameters from '../Parameters';

describe('Parameters - displayAlways checkbox', () => {
  it('should reflect updated metadata.displayAlways after onNodeUpdate and nodes refresh', async () => {
    const node = { id: 's1', type: 'section', label: 'Aperçu', metadata: {} } as any;
    const updatedNode = { ...node, metadata: { displayAlways: true } } as any;

    const onNodeUpdate = async (payload: any) => {
      // Simulate server update by returning updated node
      return updatedNode;
    };

    const onSelectNodeId = jest.fn();
    const onNodesUpdate = jest.fn();
    const refreshTree = jest.fn(() => Promise.resolve());

    const tree: any = { id: 't1', name: 'Test', tabs: [] };

    // Set a TBL_FORCE_REFRESH stub to validate fallback refresh was invoked
    (window as any).TBL_FORCE_REFRESH = jest.fn();

    const { rerender } = render(
      <Parameters
        tree={tree}
        selectedNode={node}
        nodes={[node]}
        panelState={{ activePanel: 'properties', openCapabilities: new Set(), previewMode: false }}
        onNodeUpdate={onNodeUpdate}
        refreshTree={refreshTree}
        onCapabilityConfig={onNodeUpdate}
        registry={{ getAllCapabilities: () => [] } as any}
        onSelectNodeId={onSelectNodeId}
      />
    );

    // Find the checkbox
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    // Click the checkbox to toggle
    fireEvent.click(checkbox);

    // Advance timer for debounce
    await waitFor(() => expect(onNodeUpdate).toHaveBeenCalled());

    // Simulate parent nodes being updated and re-rendering
    rerender(
      <Parameters
        tree={tree}
        selectedNode={updatedNode}
        nodes={[updatedNode]}
        panelState={{ activePanel: 'properties', openCapabilities: new Set(), previewMode: false }}
        onNodeUpdate={onNodeUpdate}
        onCapabilityConfig={onNodeUpdate}
        registry={{ getAllCapabilities: () => [] } as any}
        onSelectNodeId={onSelectNodeId}
      />
    );

    // Checkbox should now be checked
    const checkboxAfter = screen.getByRole('checkbox');
    expect(checkboxAfter).toBeChecked();
    // Ensure fallback refresh is called
    expect((window as any).TBL_FORCE_REFRESH).toHaveBeenCalled();
    expect(refreshTree).toHaveBeenCalled();
  });
});
