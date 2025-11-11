import type { RawTreeNode } from '../types';

export const isCopyFromRepeater = (
  sourceTemplateId: string | undefined,
  nodes: Map<string, RawTreeNode> | RawTreeNode[] | undefined,
  copyParentId?: string | null
): boolean => {
  if (!sourceTemplateId || !nodes) return false;

  let sourceTemplateNode: RawTreeNode | undefined;
  if (Array.isArray(nodes)) {
    sourceTemplateNode = nodes.find(n => n.id === sourceTemplateId);
  } else {
    sourceTemplateNode = nodes.get(sourceTemplateId);
  }

  if (!sourceTemplateNode) return false;

  // If the caller provides the actual copy parent id (the node where the copy resides), prefer
  // checking that node's type. This avoids excluding copies that are created from templates
  // which happen to be used as templates for repeaters in other parts of the tree.
  if (copyParentId) {
    let copyParentNode: RawTreeNode | undefined;
    if (Array.isArray(nodes)) {
      copyParentNode = nodes.find(n => n.id === copyParentId);
    } else {
      copyParentNode = nodes.get(copyParentId || '');
    }
    const copyParentType = copyParentNode?.type;
    if (copyParentType === 'leaf_repeater' || copyParentType === 'repeater') return true;
    return false;
  }

  let parentNode: RawTreeNode | undefined;
  if (Array.isArray(nodes)) {
    parentNode = nodes.find(n => n.id === sourceTemplateNode.parentId);
  } else {
    parentNode = nodes.get(sourceTemplateNode.parentId || '');
  }
  const parentType = parentNode?.type;
  return parentType === 'leaf_repeater' || parentType === 'repeater';
};
