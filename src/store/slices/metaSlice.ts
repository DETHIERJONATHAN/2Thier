import { StateCreator } from 'zustand';
import { CRMState } from './types';

export interface MetaSlice {
  // Actions
  setActiveBlockIndex: (index: number) => void;
  setLoading: (isLoading: boolean) => void;
  setEditorDirty: (isDirty: boolean) => void;
  setLoadingState: (key: string, isLoading: boolean) => void;
  resetLoadingStates: () => void;
}

export const createMetaSlice: StateCreator<
  CRMState,
  [],
  [],
  MetaSlice
> = (set) => ({
  // Actions
  setActiveBlockIndex: (index) => {
    set(state => ({ ...state, activeBlockIndex: index }));
  },

  setLoading: (isLoading) => {
    set(state => ({ ...state, isLoading }));
  },

  setEditorDirty: (isDirty) => {
    set(state => ({ ...state, isEditorDirty: isDirty }));
  },

  setLoadingState: (key, isLoading) => {
    set((state) => ({
      ...state,
      loadingStates: {
        ...state.loadingStates,
        [key]: isLoading
      }
    }));
  },

  resetLoadingStates: () => {
    set(state => ({ ...state, loadingStates: {} }));
  }
});

