// blocksSlice.ts - Gestion des blocs (formulaires)

import { StateCreator } from 'zustand';
import { CRMState, Block } from './types';
import { fetchWithAuth } from './api';

// Types pour ce slice spécifique
export interface BlocksSlice {
  blocks: Block[];
  fetchBlocks: () => Promise<void>;
  addBlock: (name: string) => Promise<Block>;
  removeBlock: (blockId: string | number) => Promise<void>;
  replaceBlock: (blockId: string | number, template: any) => Promise<void>;
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
    console.log('[blocksSlice] fetchBlocks - DEBUT');
    
    try {
      // Pour les blocs, nous récupérons tous les blocs disponibles
      // Le filtrage par organisation se fera côté serveur si nécessaire
      const url = '/api/blocks';
      
      console.log('[blocksSlice] Requête vers:', url);
      
      const response = await fetchWithAuth(url);
      
      console.log('[blocksSlice] Réponse reçue:', response);
      console.log('[blocksSlice] Status:', response.status);
      console.log('[blocksSlice] OK:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[blocksSlice] Données JSON:', data);
        
        // Vérifier si les données sont dans le bon format
        if (data && Array.isArray(data)) {
          console.log('[blocksSlice] Mise à jour du store avec', data.length, 'blocks');
          set({ blocks: data });
        } else if (data && data.success && Array.isArray(data.data)) {
          console.log('[blocksSlice] Mise à jour du store avec', data.data.length, 'blocks (format success/data)');
          set({ blocks: data.data });
        } else {
          console.warn('[blocksSlice] Format de données inattendu:', data);
          set({ blocks: [] });
        }
      } else {
        console.error('[blocksSlice] Erreur HTTP:', response.status, response.statusText);
        set({ blocks: [] });
      }
      
    } catch (error) {
      console.error('[blocksSlice] Erreur lors de fetchBlocks:', error);
      set({ blocks: [] });
    }
    
    console.log('[blocksSlice] fetchBlocks - FIN');
  },
  
  addBlock: async (name: string) => {
    try {
      const res = await fetchWithAuth('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizationId: 'current' }), // Utiliser 'current' car le serveur détectera l'org
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
  
  replaceBlock: async (blockId: string | number, template: Record<string, unknown>) => {
    console.log('replaceBlock non implémenté');
  },
});

