/**
 * 🔷 TYPES - Définitions TypeScript pour TreeBranchLeaf
 */

// =============================================================================
// 🏗️ CORE TYPES - Types fondamentaux
// =============================================================================

export interface TreeBranchLeafTree {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes?: TreeBranchLeafNode[];
}

export interface TreeBranchLeafNode {
  id: string;
  treeId: string;
  parentId?: string;
  type: NodeTypeKey;
  subType?: string;
  label: string;
  description?: string;
  value?: string;
  order: number;
  isRequired: boolean;
  isVisible: boolean;
  isActive: boolean;
  
  // Configurations spécialisées
  fieldConfig?: Record<string, unknown>;
  conditionConfig?: Record<string, unknown>;
  formulaConfig?: Record<string, unknown>;
  tableConfig?: Record<string, unknown>;
  apiConfig?: Record<string, unknown>;
  linkConfig?: Record<string, unknown>;
  
  // Valeurs calculées
  defaultValue?: string;
  calculatedValue?: string;
  metadata: Record<string, unknown>;
  
  // Capacités activées (flags)
  hasAPI: boolean;
  hasCondition: boolean;
  hasData: boolean;
  hasFormula: boolean;
  hasLink: boolean;
  hasMarkers: boolean;
  hasTable: boolean;
  
  // Relations
  children?: TreeBranchLeafNode[];
  markers?: TreeBranchLeafNodeMarker[];
  variables?: TreeBranchLeafNodeVariable[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeBranchLeafNodeMarker {
  id: string;
  nodeId: string;
  markerId: string;
  value?: string;
  metadata: Record<string, unknown>;
  marker: TreeBranchLeafMarker;
  createdAt: Date;
}

export interface TreeBranchLeafMarker {
  id: string;
  organizationId: string;
  treeId?: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  category?: string;
  isGlobal: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeBranchLeafNodeVariable {
  id: string;
  nodeId: string;
  exposedKey: string;
  displayName: string;
  displayFormat: 'number' | 'text' | 'boolean' | 'date' | 'currency' | 'percentage';
  unit?: string;
  precision?: number;
  visibleToUser: boolean;
  isReadonly: boolean;
  defaultValue?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// 🎨 FIELD TYPES - Types de champs
// =============================================================================

export type FieldTypeKey = 
  | 'TEXT' | 'NUMBER' | 'BOOL' | 'SELECT' | 'MULTISELECT' 
  | 'DATE' | 'IMAGE' | 'FILE';

export interface FieldType {
  key: FieldTypeKey;
  label: string;
  icon: string;
  description: string;
  category: 'input' | 'choice' | 'temporal' | 'media';
  variants: string[];
  defaultVariant: string;
  hasOptions: boolean;
  hasSubfields: boolean;
  capabilities: CapabilityKey[];
  appearanceConfig: {
    variants: FieldVariant[];
    properties: string[];
  };
}

export interface FieldVariant {
  key: string;
  label: string;
  icon: string;
}

// =============================================================================
// 🎯 NODE TYPES - Types de nœuds
// =============================================================================

export type NodeTypeKey = 
  | 'branch' 
  | 'leaf_option' 
  | 'leaf_option_field' 
  | 'leaf_field'
  | 'section';

export interface NodeType {
  key: NodeTypeKey;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  color: string;
  canHaveChildren: boolean;
  canBeChild: boolean;
  acceptsDropFrom: ('palette' | 'structure')[];
  capabilities: CapabilityKey[];
  defaultFieldType?: FieldTypeKey;
  fieldRequired?: boolean;
}

// =============================================================================
// 🧩 CAPABILITY MODULES - Modules de capacités
// =============================================================================

export type CapabilityKey = 
  | 'data' | 'formula' | 'condition' | 'table' 
  | 'api' | 'link' | 'markers' | 'validation';

export interface CapabilityModule {
  key: CapabilityKey;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  category: 'calculation' | 'logic' | 'data' | 'integration' | 'navigation' | 'organization';
  autoOpen: boolean;
  requiresConfig: boolean;
  compatibleWith: NodeTypeKey[];
  panelComponent: string;
  validationRules: string[];
  dependencies: CapabilityKey[];
}

// =============================================================================
// 🏷️ TOKEN TYPES - Types de tokens pour drag & drop
// =============================================================================

export type TokenTypeKey = 
  | 'NODE_VALUE' | 'NODE_OPTION' | 'VARIABLE' 
  | 'CONSTANT' | 'MARKER';

export interface TokenType {
  key: TokenTypeKey;
  label: string;
  format: string;
  acceptedBy: CapabilityKey[];
  color: string;
}

// =============================================================================
// 🎯 DROP ZONES - Zones de dépôt
// =============================================================================

export interface DropZoneType {
  key: string;
  label: string;
  acceptsFrom: ('palette' | 'structure' | 'reusables')[];
  acceptsTypes: (NodeTypeKey | TokenTypeKey)[];
  dropPosition: 'child' | 'sibling' | 'token';
}

// =============================================================================
// ♻️ REUSABLE TYPES - Types de réutilisables
// =============================================================================

export type ReusableTypeKey = 
  | 'formula' | 'condition' | 'table' | 'api' 
  | 'fieldStyle' | 'optionSet' | 'markerSet' | 'variable';

export interface ReusableType {
  key: ReusableTypeKey;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  category: 'calculation' | 'logic' | 'data' | 'integration' | 'appearance' | 'organization';
  attachableTo: (CapabilityKey | 'appearance' | 'options')[];
  canLink: boolean;
  canCopy: boolean;
}

// =============================================================================
// 🎨 APPEARANCE CONFIG - Configuration d'apparence
// =============================================================================

export interface AppearanceConfig {
  fieldType: FieldTypeKey;
  variant: string;
  size: 'sm' | 'md' | 'lg';
  labelPosition: 'top' | 'left' | 'none';
  width: string;
  properties: Record<string, unknown>;
}

// Configurations spécialisées par type
export interface TextAppearanceConfig extends AppearanceConfig {
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  validation?: string;
  mask?: string;
  autoComplete?: boolean;
}

export interface NumberAppearanceConfig extends AppearanceConfig {
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  unit?: string;
  prefix?: string;
  suffix?: string;
  thousandsSeparator?: string;
  currency?: {
    code: string;
    symbol: string;
  };
}

export interface ImageAppearanceConfig extends AppearanceConfig {
  formats: string[];
  maxSize: number;
  maxCount?: number;
  ratio?: string;
  crop?: boolean;
  thumbnails?: string[];
  compression?: {
    quality: number;
    format?: string;
  };
  annotations?: boolean;
}

// =============================================================================
// 🔄 DRAG & DROP - Système de glisser-déposer
// =============================================================================

export interface DragItem {
  id: string;
  type: 'palette-item' | 'node' | 'reusable';
  nodeType?: NodeTypeKey;
  fieldType?: FieldTypeKey;
  data?: Record<string, unknown>;
}

export interface DropTargetData {
  type: 'structure' | 'parameter' | 'reusable';
  nodeId?: string;
  capability?: CapabilityKey;
  position?: 'before' | 'after' | 'child';
  slot?: string; // slot spécifique pour paramètres (ex: condition_left, condition_right)
  accepts: (NodeTypeKey | TokenTypeKey)[];
}

export interface DragEndResult {
  sourceId: string;
  targetId: string;
  position: 'before' | 'after' | 'child' | 'token';
  success: boolean;
  error?: string;
}

// =============================================================================
// 🧮 FORMULAS - Système de formules
// =============================================================================

export interface FormulaBlock {
  id: string;
  type: 'input' | 'operator' | 'function' | 'constant';
  value: string | number;
  operator?: '+' | '-' | '*' | '/' | 'min' | 'max' | 'sum' | 'avg' | 'round' | 'ceil' | 'floor';
  inputs?: string[];
}

export interface FormulaAST {
  id: string;
  blocks: FormulaBlock[];
  variables: Record<string, string>;
  result?: string;
  valid: boolean;
  errors: string[];
}

// =============================================================================
// ⚖️ CONDITIONS - Système de conditions
// =============================================================================

export interface ConditionRule {
  id: string;
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty';
  value: string | number | boolean;
  valueType: 'constant' | 'field' | 'variable';
}

export interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  rules: ConditionRule[];
  groups: ConditionGroup[];
  not?: boolean;
}

export interface ConditionOutcome {
  id: string;
  type: 'SHOW_NODES' | 'HIDE_NODES' | 'GO_TO_NODE' | 'GO_TO_TREE' | 'APPEND_SECTION' | 'SET_VARIABLE' | 'EVAL_FORMULA';
  nodeIds?: string[];
  targetId?: string;
  value?: string | number | boolean;
  variableKey?: string;
  formulaId?: string;
}

export interface ConditionConfig {
  id: string;
  conditions: ConditionGroup;
  thenOutcomes: ConditionOutcome[];
  elseOutcomes?: ConditionOutcome[];
}

// =============================================================================
// ⚖️ CONDITIONS 2.0 AST - Nouveau modèle pour le builder visuel
// =============================================================================

export type ConditionEvalMode = 'all' | 'first-match' | 'collect';

export type BinaryOp =
  | '==' | '!=' | '>' | '>=' | '<' | '<='
  | 'contains' | 'startsWith' | 'endsWith'
  | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';

export interface ValueRef {
  kind: 'const' | 'nodeValue' | 'nodeOption' | 'variable' | 'marker';
  value?: string | number | boolean | null;
  ref?: string; // ex: @value.nodeKey, @select.nodeKey.optionKey, @myVar, #tag
}

export interface Expr {
  id: string;
  type: 'binary' | 'group' | 'not';
  op?: BinaryOp; // pour binary
  left?: ValueRef; // pour binary
  right?: ValueRef; // pour binary
  bool?: 'AND' | 'OR'; // pour group
  children?: Expr[]; // pour group
  child?: Expr; // pour not
}

export interface ConditionAction {
  id: string;
  type: 'SHOW' | 'HIDE' | 'GOTO_NODE' | 'GOTO_TREE' | 'SET_VAR' | 'EVAL_FORMULA' | 'APPEND_SECTION';
  nodeIds?: string[];
  targetId?: string;
  treeId?: string;
  variableKey?: string;
  value?: string | number | boolean | null;
  formulaId?: string;
}

export interface ConditionBranch {
  id: string;
  label?: string;
  when?: Expr; // condition
  actions: ConditionAction[];
}

export interface ConditionSet {
  id: string;
  tokens?: string[]; // références collectées via DnD
  mode: ConditionEvalMode; // all | first-match | collect
  branches: ConditionBranch[]; // THEN / ELSE IF* / ELSE
  fallback?: ConditionBranch; // ELSE
  metadata?: Record<string, unknown>;
}

// =============================================================================
// 📊 TABLES - Système de tableaux 2D
// =============================================================================

export interface TableAxis {
  id: string;
  label: string;
  type: 'field' | 'variable' | 'constant';
  reference: string;
  values: (string | number)[];
}

export interface TableCell {
  x: string | number;
  y: string | number;
  value: string | number;
}

export interface TableConfig {
  id: string;
  xAxis: TableAxis;
  yAxis: TableAxis;
  cells: TableCell[];
  mode: 'EXACT' | 'NEAREST' | 'INTERPOLATE';
  defaultValue?: string | number;
}

// =============================================================================
// 🔌 API - Système d'API
// =============================================================================

export interface APIConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  authType?: 'none' | 'bearer' | 'basic' | 'apikey';
  authConfig?: Record<string, string>;
  responsePath?: string;
  cacheTTL: number;
  fallbackValue?: string | number | boolean;
  timeout?: number;
}

export interface APIResponse {
  success: boolean;
  data: unknown;
  error?: string;
  cached: boolean;
  timestamp: Date;
}

// =============================================================================
// 🔗 LINKS - Système de liens
// =============================================================================

export interface LinkConfig {
  id: string;
  targetTreeId: string;
  targetNodeId?: string;
  mode: 'JUMP' | 'APPEND_SECTION';
  carryContext: boolean;
  params?: Record<string, string>;
  conditions?: ConditionGroup;
}

// =============================================================================
// 🎛️ UI STATES - États de l'interface
// =============================================================================

export interface UIState {
  selectedNode?: TreeBranchLeafNode;
  expandedNodes: Set<string>;
  dragState: {
    isDragging: boolean;
    draggedItem?: DragItem;
    hoveredTarget?: string;
    validDrop: boolean;
  };
  searchState: {
    query: string;
    filters: {
      type?: NodeTypeKey[];
      capabilities?: CapabilityKey[];
      markers?: string[];
    };
  };
  panelState: {
    activePanel: 'properties' | 'reusables';
    openCapabilities: Set<CapabilityKey>;
    previewMode: boolean;
  };
}

// =============================================================================
// 🎬 ACTIONS - Actions Redux/State
// =============================================================================

export interface TreeAction {
  type: string;
  payload?: unknown;
}

export interface NodeAction extends TreeAction {
  nodeId: string;
}

export interface CapabilityAction extends NodeAction {
  capability: CapabilityKey;
  config?: Record<string, unknown>;
}

// =============================================================================
// 📝 FORM DATA - Données de formulaires
// =============================================================================

export interface TreeSubmission {
  id: string;
  treeId: string;
  userId?: string;
  leadId?: string;
  sessionId?: string;
  status: 'draft' | 'completed' | 'abandoned';
  data: Record<string, unknown>;
  calculatedValues: Record<string, unknown>;
  totalScore?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// 🔍 SEARCH & FILTERS - Recherche et filtres
// =============================================================================

export interface SearchOptions {
  query?: string;
  nodeTypes?: NodeTypeKey[];
  capabilities?: CapabilityKey[];
  markers?: string[];
  hasData?: boolean;
  isRequired?: boolean;
  parentId?: string;
}

export interface SearchResult {
  nodes: TreeBranchLeafNode[];
  total: number;
  filters: {
    availableTypes: NodeTypeKey[];
    availableCapabilities: CapabilityKey[];
    availableMarkers: string[];
  };
}

// =============================================================================
// ⚡ PERFORMANCE - Optimisations
// =============================================================================

export interface VirtualizationConfig {
  enabled: boolean;
  itemHeight: number;
  overscan: number;
  scrollToIndex?: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

// =============================================================================
// 🎨 THEME - Thème et styles
// =============================================================================

export interface TreeTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
  icons: {
    size: {
      sm: number;
      md: number;
      lg: number;
    };
  };
}

// =============================================================================
// 📊 ANALYTICS - Analytics et métriques
// =============================================================================

export interface NodeMetrics {
  nodeId: string;
  interactions: number;
  completions: number;
  abandonments: number;
  averageTime: number;
  errorRate: number;
  conversionRate: number;
}

export interface TreeMetrics {
  treeId: string;
  submissions: number;
  completions: number;
  averageCompletionTime: number;
  dropOffPoints: string[];
  popularPaths: string[][];
  nodeMetrics: NodeMetrics[];
}

// =============================================================================
// 🔒 VALIDATION - Validation et erreurs
// =============================================================================

export interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// =============================================================================
// 🎯 EXPORTS - Exports principaux
// =============================================================================

export type NodeData = Record<string, unknown>;
export type LegacyNodeData = Record<string, unknown>;
export type ComponentProps = Record<string, unknown>;
