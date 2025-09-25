// Exports du système Généalogique Révolutionnaire
export { default as GenealogyExplorer } from './index';
export { default as GenealogyUserView } from './UserView';
export { default as GenealogyExplorerDemo } from './Demo';

// Types partagés
export interface NodeData {
  id: string;
  label: string;
  type: 'O' | 'O+C' | 'C';
  parentId: string | null;
  fieldId: string;
  order: number;
  level: number;
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'file' | 'image';
  fieldConfig?: {
    required?: boolean;
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
    regex?: string;
  };
  children?: NodeData[];
}

export interface UserNodeData {
  id: string;
  label: string;
  type: 'O' | 'O+C' | 'C';
  fieldType?: string;
  fieldConfig?: {
    required?: boolean;
    placeholder?: string;
    options?: string[];
  };
  children?: UserNodeData[];
}
