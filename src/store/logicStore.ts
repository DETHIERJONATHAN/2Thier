import { create } from 'zustand';

export type LogicBlockType = 'field' | 'operator' | 'value' | 'group';

export interface LogicBlockNode {
  id: string;
  type: LogicBlockType;
  value: string;
  children?: LogicBlockNode[];
  parentId?: string | null;
}

interface LogicStoreState {
  rootBlocks: LogicBlockNode[];
  addBlock: (block: Omit<LogicBlockNode, 'id'>, parentId?: string | null) => void;
  moveBlock: (blockId: string, newParentId: string | null, newIndex?: number) => void;
  removeBlock: (blockId: string) => void;
  reset: () => void;
}

export const useLogicStore = create<LogicStoreState>((set, get) => ({
  rootBlocks: [],
  addBlock: (block, parentId = null) => set(state => {
    const id = Math.random().toString(36).slice(2, 10);
    const newBlock: LogicBlockNode = { ...block, id, parentId };
    if (!parentId) {
      return { rootBlocks: [...state.rootBlocks, newBlock] };
    }
    // Ajout à un parent existant
    const addToTree = (nodes: LogicBlockNode[]): LogicBlockNode[] =>
      nodes.map(n =>
        n.id === parentId
          ? { ...n, children: [...(n.children || []), newBlock] }
          : { ...n, children: n.children ? addToTree(n.children) : undefined }
      );
    return { rootBlocks: addToTree(state.rootBlocks) };
  }),
  moveBlock: (blockId, newParentId, newIndex = 0) => set(state => {
    // Retirer le bloc de l'arbre
    let movedBlock: LogicBlockNode | null = null;
    const removeFromTree = (nodes: LogicBlockNode[]): LogicBlockNode[] =>
      nodes.filter(n => {
        if (n.id === blockId) {
          movedBlock = n;
          return false;
        }
        if (n.children) n.children = removeFromTree(n.children);
        return true;
      });
    let newRoots = removeFromTree(state.rootBlocks);
    if (movedBlock) {
      movedBlock.parentId = newParentId;
      if (!newParentId) {
        newRoots.splice(newIndex, 0, movedBlock);
      } else {
        const addToTree = (nodes: LogicBlockNode[]): LogicBlockNode[] =>
          nodes.map(n =>
            n.id === newParentId
              ? { ...n, children: [...(n.children || []), movedBlock!] }
              : { ...n, children: n.children ? addToTree(n.children) : undefined }
          );
        newRoots = addToTree(newRoots);
      }
    }
    return { rootBlocks: newRoots };
  }),
  removeBlock: (blockId) => set(state => {
    const removeFromTree = (nodes: LogicBlockNode[]): LogicBlockNode[] =>
      nodes.filter(n => {
        if (n.id === blockId) return false;
        if (n.children) n.children = removeFromTree(n.children);
        return true;
      });
    return { rootBlocks: removeFromTree(state.rootBlocks) };
  }),
  reset: () => set({ rootBlocks: [] }),
}));
