import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Import des types
import { CRMState, Block, MetaState, MetaUIState } from './slices/types';

// Import des slices
import { createBlocksSlice, BlocksSlice } from './slices/blocksSlice';
import { createSectionsSlice, SectionsSlice } from './slices/sectionsSlice';
import { createFieldsSlice, FieldsSlice } from './slices/fieldsSlice';
import { createFormulasSlice, FormulasSlice } from './slices/formulasSlice';
import { createValidationSlice, ValidationSlice } from './slices/validationsSlice';
import { createDependenciesSlice, DependenciesSlice } from './slices/dependenciesSlice';
import { createMetaSlice, MetaSlice } from './slices/metaSlice';
import { createUtilsSlice, UtilsSlice } from './slices/utilsSlice';

// État initial
const initialState: Partial<CRMState> = {
  blocks: [] as Block[],
  fieldMetaCounts: {},
  optionsToDelete: [],
  activeBlockIndex: 0,
  isLoading: false,
  isEditorDirty: false,
  loadingStates: {}
};

// Création du store avec tous les slices
const useCRMStore = create<
  CRMState & 
  BlocksSlice & 
  SectionsSlice & 
  FieldsSlice &
  FormulasSlice &
  ValidationSlice &
  DependenciesSlice &
  MetaSlice &
  UtilsSlice
>()(
  devtools(
    (...a) => ({
      // État initial
      ...initialState as CRMState,

      // Combiner tous les slices
      ...createBlocksSlice(...a),
      ...createSectionsSlice(...a),
      ...createFieldsSlice(...a),
      ...createFormulasSlice(...a),
      ...createValidationSlice(...a),
      ...createDependenciesSlice(...a),
      ...createMetaSlice(...a),
      ...createUtilsSlice(...a),
    }),
    { name: 'CRM Store' } // Nom dans Redux DevTools
  )
);

export default useCRMStore;
