import { StateCreator } from 'zustand';
import { CRMState, Field } from './types';

export interface UtilsSlice {
  // Getters
  getField: (blockId: string | number, sectionId: string | number, fieldId: string | number) => Field | undefined;
  setOptionsToDelete: (options: (string | number)[]) => void;
}

export const createUtilsSlice: StateCreator<
  CRMState,
  [],
  [],
  UtilsSlice
> = (set, get) => ({
  getField: (blockId, sectionId, fieldId) => {
    const block = get().blocks.find(b => String(b.id) === String(blockId));
    if (!block) return undefined;
    
    const section = block.sections.find(s => String(s.id) === String(sectionId));
    if (!section) return undefined;
    
    return section.fields.find(f => String(f.id) === String(fieldId));
  },

  setOptionsToDelete: (options) => {
    set(state => ({ ...state, optionsToDelete: options }));
  }
});

