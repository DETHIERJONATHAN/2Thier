// blocksSlice.ts - Gestion des blocs (formulaires)
console.log(' [DEBUG] blocksSlice.ts chargé - début du fichier');

import { StateCreator } from 'zustand';
import { CRMState, Block } from './types';
import { fetchWithAuth } from './api';
import { dlog } from '../../utils/debug';

// Types pour ce slice spécifique
export interface BlocksSlice {
  blocks: Block[];
  _lastBlocksFetch?: number;
  fetchBlocks: () => Promise<void>;
  addBlock: (name: string) => Promise<Block>;
  removeBlock: (blockId: string | number) => Promise<void>;
  replaceBlock: (blockId: string | number, template: unknown) => Promise<void>;
}

// Création du slice
export const createBlocksSlice: StateCreator<
  CRMState,
  [],
  [],
  BlocksSlice
> = (set, get) => ({
  blocks: [],
  
  fetchBlocks: async () => {
    const now = Date.now();
    const { _lastBlocksFetch, blocks: currentBlocks } = get();

    const TTL = 5000; // 5 secondes anti-rafale
    if (_lastBlocksFetch && (now - _lastBlocksFetch) < TTL) {
      dlog('[blocksSlice] fetchBlocks ignoré (TTL actif)');
      return;
    }

    dlog('[blocksSlice] fetchBlocks appelé - Blocks actuels:', currentBlocks.length);
    set({ _lastBlocksFetch: now });
    dlog('[blocksSlice] fetchBlocks - DEBUT');

    try {
      const url = '/api/blocks';
      dlog('[blocksSlice] Requête vers:', url);
      const response = await fetchWithAuth(url);

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          set({ blocks: data });
        } else if (data && data.success && Array.isArray(data.data)) {
          set({ blocks: data.data });
        } else {
          set({ blocks: [] });
        }
      } else {
        set({ blocks: [] });
      }
    } catch (error) {
      console.error('[blocksSlice] Erreur lors de fetchBlocks:', error);
      set({ blocks: [] });
    }
  },
  
  addBlock: async (name: string) => {
    try {
      const res = await fetchWithAuth('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizationId: 'current' }),
      });
      
      if (!res.ok) throw new Error('Erreur lors de la création du formulaire');
      const block = await res.json();
      set((state) => ({ blocks: [...state.blocks, block] }));
      return block;
    } catch (error) {
      console.error('Erreur lors de la création du bloc:', error);
      throw error;
    }
  },
  
  removeBlock: async (blockId: string | number) => {
    try {
      const res = await fetchWithAuth(`/api/blocks/${blockId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Erreur lors de la suppression du formulaire');
      set((state) => ({ blocks: state.blocks.filter(b => String(b.id) !== String(blockId)) }));
    } catch (error) {
      console.error('Erreur lors de la suppression du bloc:', error);
      throw error;
    }
  },
  
  // Placeholder futur : remplacement d'un bloc par un template
  replaceBlock: async () => { /* no-op */ },
});

export default createBlocksSlice;
console.log(' [DEBUG] createBlocksSlice exporté:', typeof createBlocksSlice);