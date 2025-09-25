/**
 * 🌲 TreeBranchLeaf - Point d'entrée principal
 * 
 * Export centralisé de tous les composants du système TreeBranchLeaf
 */

// Composant principal
export { default as TreeBranchLeafWrapper } from './TreeBranchLeafWrapper';
export { default as TreeBranchLeafEditor } from './TreeBranchLeafEditor';
// UserRenderer components supprimés

// Composants individuels
export { default as Palette } from './components/Palette/Palette';
export { default as Structure } from './components/Structure/Structure';
export { default as TreeManager } from './components/TreeManager/TreeManager';

// Hooks
export { default as useTreeData } from './hooks/useTreeData';
export { default as useDragAndDrop } from './hooks/useDragAndDrop';

// Registry et types
export { default as TreeBranchLeafRegistry } from './core/registry';
export * from './types';

// 🎯 SYSTÈME TBL - Exports pour TreeBranchLeaf Business Logic
export { default as TBL } from './TBL/TBL';
export { useTBLData } from './TBL/hooks/useTBLData';
export { useTBLSave } from './TBL/hooks/useTBLSave';
export { default as tblRoutes } from './TBL/routes/tbl-routes';

// Types TBL
export type { 
  TBLTab, 
  TBLField, 
  TBLData 
} from './TBL/hooks/useTBLData';

export type { 
  TBLFormData, 
  TBLSaveOptions, 
  TBLSaveResult 
} from './TBL/hooks/useTBLSave';

// Export par défaut : le wrapper complet
export { default } from './TreeBranchLeafWrapper';
