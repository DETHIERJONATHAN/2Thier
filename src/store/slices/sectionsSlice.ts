// sectionsSlice.ts - Gestion des sections

import { StateCreator } from 'zustand';
import { CRMState, Section } from './types';
import { fetchWithAuth } from './api';
import { toast } from 'react-toastify';

// Types pour ce slice spécifique
export interface SectionsSlice {
  addSectionToBlock: (blockId: string | number, section: { name: string; type: string; order?: number }) => Promise<void>;
  removeSectionFromBlock: (blockId: string | number, sectionId: string | number) => Promise<void>;
  updateSectionsOfBlock: (blockId: string | number, sections: Partial<Section>[]) => Promise<void>;
  updateSection: (sectionId: string | number, data: Partial<Section>) => Promise<void>;
  reorderSectionsOfBlock: (blockId: string | number, sections: {id: string | number, order: number}[]) => Promise<void>;
}

// Création du slice
export const createSectionsSlice: StateCreator<
  CRMState,
  [],
  [],
  SectionsSlice
> = (set) => ({
  addSectionToBlock: async (blockId: string | number, section: { name: string; type: string; order?: number }) => {
    try {
      const res = await fetchWithAuth(`/api/blocks/${blockId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'ajout de la section");
      }

      const updatedBlock = await res.json(); // Le backend renvoie le block mis à jour

      set(state => ({
        blocks: state.blocks.map(b => 
          String(b.id) === String(blockId) ? updatedBlock : b
        ),
      }));

      toast.success("Section ajoutée avec succès !");
    } catch (err: any) {
      toast.error(err.message);
      console.error('[CRMStore] addSectionToBlock error:', err);
    }
  },
  
  removeSectionFromBlock: async (blockId: string | number, sectionId: string | number) => {
    try {
      const res = await fetchWithAuth(`/api/blocks/${blockId}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la suppression de la section");
      }

      const updatedBlock = await res.json(); // Le backend renvoie le block mis à jour

      set(state => ({
        blocks: state.blocks.map(block => 
          String(block.id) === String(blockId) ? updatedBlock : block
        ),
      }));
      
      toast.success("Section supprimée avec succès !");
    } catch (err: any) {
      toast.error(err.message);
      console.error('[CRMStore] removeSectionFromBlock error:', err);
    }
  },
  
  updateSectionsOfBlock: async (blockId, sections) => {
    if (sections.length === 0) return;
    
    // PUT sur toutes les sections sauf la dernière (fire-and-forget)
    for (let i = 0; i < sections.length - 1; i++) {
      const section = sections[i];
      fetchWithAuth(`/api/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: section.name, sectionType: section.sectionType }),
      });
    }
    
    // PUT sur la dernière section et mise à jour du state avec la réponse (block à jour)
    const lastSection = sections[sections.length - 1];
    const res = await fetchWithAuth(`/api/sections/${lastSection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: lastSection.name, sectionType: lastSection.sectionType }),
    });
    
    const updatedBlock = await res.json();
    set((state) => ({
      blocks: state.blocks.map(b => String(b.id) === String(blockId) ? updatedBlock : b),
    }));
  },
  
  updateSection: async (sectionId, data) => {
    const res = await fetchWithAuth(`/api/sections/${sectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const updatedBlock = await res.json();
    set((state) => ({
      blocks: state.blocks.map(b => String(b.id) === String(updatedBlock.id) ? updatedBlock : b),
    }));
  },
  
  reorderSectionsOfBlock: async (blockId, sections) => {
    try {
      const res = await fetchWithAuth(`/api/blocks/${blockId}/sections/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors du réordonnancement des sections");
      }

      const updatedBlock = await res.json();

      set(state => ({
        blocks: state.blocks.map(b => 
          String(b.id) === String(blockId) ? updatedBlock : b
        ),
      }));

      toast.success("Sections réordonnées avec succès !");
    } catch (err: any) {
      toast.error(err.message);
      console.error('[CRMStore] reorderSectionsOfBlock error:', err);
    }
  },
});

