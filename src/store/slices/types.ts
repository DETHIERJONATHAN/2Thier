// types.ts - Types partagés entre les différents slices

export interface FieldOption {
  id?: string;
  label: string;
  value?: string;
  order?: number;
}

export interface FormulaItem {
  type: 'field' | 'operator' | 'value' | 'function' | 'formula_ref' | 'adv_part' | 'cond' | 'switch';
  id?: string;        // Identifiant interne de l'item
  value?: unknown;    // Constante / opérateur / fallback
  label?: string;     // Affichage
  // field / adv_part
  fieldId?: string;
  part?: 'selection' | 'extra' | 'nodeId';
  valueType?: 'number' | 'string';
  // formula_ref
  refFormulaId?: string;
  // cond
  condition?: {
    kind: 'advanced_select_equals' | 'advanced_select_in' | 'advanced_select_extra_cmp' | 'field_cmp';
    fieldId: string;
    part?: 'selection' | 'extra' | 'nodeId';
    operator?: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in';
    value: string | number | Array<string | number>;
  };
  then?: FormulaItem[];
  else?: FormulaItem[];
  elseBehavior?: 'zero' | 'ignore';
  arguments?: FormulaItem[]; // pour 'function'
  // switch multi-cas
  switchFieldId?: string;
  switchPart?: 'selection' | 'extra' | 'nodeId';
  cases?: { value: string; label?: string; seq: FormulaItem[] }[];
  defaultSeq?: FormulaItem[];
}

export interface Formula {
  id: string;
  name: string;
  fieldId?: string;    // ID du champ parent, important pour les opérations CRUD
  expression: string; // Conservée pour la rétrocompatibilité ou affichage simple
  sequence?: FormulaItem[]; // Nouvelle approche structurée pour construire la formule
  targetFieldId: string;
  targetProperty: string;
}

export interface FieldValidation {
  id: string;
  name: string;
  sequence?: {
    validationSequence: FormulaItem[];
    operator: 'less_than' | 'greater_than' | 'equals' | 'not_equals' | 'is_not_set' | 'is_set';
    comparisonSequence: FormulaItem[];
    errorMessage: string;
  };
  targetFieldId: string;
}

export interface FieldDependency {
  id: string;
  name: string;
  sequence?: {
    conditions: FormulaItem[][];
    action: 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable' | 'setValue';
    targetFieldId: string;
  };
  targetFieldId: string;
  defaultValue?: unknown; // Pour l'action setValue
}

export interface Field {
  id: string; // UUID string pour compatibilité backend
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  order?: number; // Ajout pour la gestion de l'ordre
  placeholder?: string;
  min?: number;
  max?: number;
  options?: FieldOption[]; // Ajout pour garantir la propagation des options (imageUrl, etc.)
  advancedConfig?: Record<string, unknown>; // Ajout pour la config avancée ultra-modulaire
  formulas?: Formula[];
  validations?: FieldValidation[];
  dependencies?: FieldDependency[];
}

export interface Section {
  id: string | number;
  name: string;
  sectionType: 'normal' | 'activity' | 'custom' | string;
  menuFieldId?: string; // Champ dropdown sélectionné pour les sections personnalisées
  order: number;
  fields: Field[];
  active?: boolean;
}

export interface Block {
  id: number;
  name: string;
  organization?: { name: string }; // Ajout pour la vue super_admin
  sections: Section[];
}

export interface FieldMeta {
  formulas: number;
  validations: number;
  dependencies: number;
}

// Type pour la gestion des options à supprimer
export interface MetaState {
  fieldMetaCounts: Record<string | number, FieldMeta>;
  optionsToDelete: (string | number)[];
}

// Type pour la gestion de base des blocs
export interface BlocksState {
  blocks: Block[];
}

// Propriétés pour la méta-slice (gestion de l'UI)
export interface MetaUIState {
  activeBlockIndex: number;
  isLoading: boolean;
  isEditorDirty: boolean;
  loadingStates: Record<string, boolean>;
}

// Ajout de la propriété auth dans CRMState
export interface AuthState {
  loading: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  currentOrganization: { id: string } | null;
}

// Correction des types 'any' dans CRMState
export interface CRMState extends BlocksState, MetaState, MetaUIState {
  auth: AuthState;
  // Fonctions d'accès (getters)
  getField: (blockId: string | number, sectionId: string | number, fieldId: string | number) => Field | undefined;
  setOptionsToDelete: (options: (string | number)[]) => void;

  // Actions (API calls) - ces signatures seront implémentées par chaque slice
  fetchBlocks: () => Promise<void>;

  // Block actions
  addBlock: (name: string) => Promise<Block>;
  removeBlock: (blockId: string | number) => Promise<void>;

  // Section actions
  addSectionToBlock: (blockId: string | number, section: { name: string; type: string; order?: number }) => Promise<void>;
  removeSectionFromBlock: (blockId: string | number, sectionId: string | number) => Promise<void>;
  updateSectionsOfBlock: (blockId: string | number, sections: Partial<Section>[]) => Promise<void>;
  updateSection: (sectionId: string | number, data: Partial<Section>) => Promise<void>;
  reorderSectionsOfBlock: (blockId: string | number, sections: {id: string | number, order: number}[]) => Promise<void>;
  replaceBlock: (blockId: string | number, template: Record<string, unknown>) => Promise<void>;

  // Field actions
  addFieldToSection: (sectionId: string | number, field: Partial<Field>) => Promise<Field | null>;
  updateField: (fieldId: string | number, fieldData: Partial<Field>) => Promise<void>;
  removeField: (fieldId: string | number) => Promise<void>;
  updateFieldsOrderInSection: (sectionId: string | number, fieldsOrder: { id: string | number; order: number }[]) => Promise<void>;
  moveFieldToSection: (fieldId: string | number, sourceSectionId: string | number, targetSectionId: string | number, newOrder: number) => Promise<void>;
  fetchFieldMetaCounts: (fieldIds: (string | number)[]) => Promise<void>;

  // Formula actions
  updateFormula: (formulaId: string, data: Partial<Formula>) => Promise<void>;
  createFormula: (fieldId: string, formulaData: Partial<Formula>) => Promise<Formula | null>;
  deleteFormula: (formulaId: string) => Promise<void>;
  reorderFormulaSequence: (formulaId: string, oldIndex: number, newIndex: number) => Promise<void>;
  addItemsToFormulaSequence: (fieldId: string, formulaId: string, items: FormulaItem[], index?: number) => Promise<void>;
  moveFormulaItem: (fieldId: string, formulaId: string, fromIndex: number, toIndex: number) => Promise<void>;

  // Validation actions
  updateValidation: (validationId: string, data: Partial<FieldValidation>) => Promise<void>;
  createValidation: (fieldId: string, validationData: Partial<FieldValidation>) => Promise<FieldValidation | null>;
  deleteValidation: (validationId: string) => Promise<void>;
  reorderValidations: (fieldId: string, oldIndex: number, newIndex: number) => Promise<void>;

  // Dependency actions
  updateDependency: (dependencyId: string, data: Partial<FieldDependency>) => Promise<void>;
  createDependency: (fieldId: string, dependencyData: Partial<FieldDependency>) => Promise<FieldDependency | null>;
  deleteDependency: (dependencyId: string) => Promise<void>;
  reorderDependencies: (fieldId: string, oldIndex: number, newIndex: number) => Promise<void>;
}

