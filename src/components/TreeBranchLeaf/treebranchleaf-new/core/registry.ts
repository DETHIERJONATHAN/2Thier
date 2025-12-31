/**
 * 🧩 REGISTRY - Centre de gravité du système TreeBranchLeaf
 * 
 * Ce fichier centralise :
 * - Types de champs (FieldTypes)
 * - Panneaux d'aspect (Appearance panels)
 * - Modules de capacités (Capabilities panels)
 * - Réutilisables (Reusables attachers)
 * - Mapping legacy (Legacy mapping)
 * - Résolveurs de tokens (Token resolvers)
 */

import type { 
  FieldType, 
  CapabilityModule, 
  ReusableType,
  NodeType,
  TokenType,
  DropZoneType,
  NodeData,
  LegacyNodeData,
  TreeBranchLeafNode
} from '../types';

// =============================================================================
// 🏗️ FIELD TYPES - Types de champs disponibles
// =============================================================================

export const FIELD_TYPES: Record<string, FieldType> = {
  // 📝 TEXT
  TEXT: {
    key: 'TEXT',
    label: 'Texte',
    icon: 'FormOutlined',
    description: 'Champ de saisie de texte',
    category: 'input',
    variants: ['singleline', 'textarea'],
    defaultVariant: 'singleline',
    hasOptions: false,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'formula', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'singleline', label: 'Ligne simple', icon: 'EditOutlined' },
        { key: 'textarea', label: 'Zone de texte', icon: 'FileTextOutlined' }
      ],
      properties: ['placeholder', 'maxLength', 'minLength', 'validation']
    }
  },

  // 🔢 NUMBER
  NUMBER: {
    key: 'NUMBER',
    label: 'Nombre',
    icon: 'NumberOutlined',
    description: 'Champ numérique avec calculs',
    category: 'input',
    variants: ['input', 'stepper', 'slider', 'dial'],
    defaultVariant: 'input',
    hasOptions: false,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'formula', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'input', label: 'Saisie libre', icon: 'EditOutlined' },
        { key: 'stepper', label: 'Compteur', icon: 'PlusMinusOutlined' },
        { key: 'slider', label: 'Curseur', icon: 'SliderOutlined' },
        { key: 'dial', label: 'Cadran', icon: 'DashboardOutlined' }
      ],
      properties: ['min', 'max', 'step', 'decimals', 'unit', 'prefix', 'suffix']
    }
  },

  // ✅ BOOL
  BOOL: {
    key: 'BOOL',
    label: 'Booléen',
    icon: 'CheckSquareOutlined',
    description: 'Choix vrai/faux',
    category: 'choice',
    variants: ['checkbox', 'switch', 'segmented'],
    defaultVariant: 'checkbox',
    hasOptions: false,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'checkbox', label: 'Case à cocher', icon: 'CheckSquareOutlined' },
        { key: 'switch', label: 'Interrupteur', icon: 'SwapOutlined' },
        { key: 'segmented', label: 'Boutons', icon: 'AppstoreOutlined' }
      ],
      properties: ['defaultValue', 'trueLabel', 'falseLabel']
    }
  },

  // 📋 SELECT
  SELECT: {
    key: 'SELECT',
    label: 'Sélection',
    icon: 'UnorderedListOutlined',
    description: 'Choix parmi des options',
    category: 'choice',
    variants: ['dropdown', 'radio', 'pills', 'segmented', 'autocomplete'],
    defaultVariant: 'dropdown',
    hasOptions: true,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'api', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'dropdown', label: 'Liste déroulante', icon: 'CaretDownOutlined' },
        { key: 'radio', label: 'Boutons radio', icon: 'RadiusSettingOutlined' },
        { key: 'pills', label: 'Pastilles', icon: 'TagsOutlined' },
        { key: 'segmented', label: 'Segments', icon: 'AppstoreOutlined' },
        { key: 'autocomplete', label: 'Autocomplétion', icon: 'SearchOutlined' }
      ],
      properties: ['searchable', 'allowCustom', 'optionsSource']
    }
  },

  // 📋✅ MULTISELECT
  MULTISELECT: {
    key: 'MULTISELECT',
    label: 'Sélection multiple',
    icon: 'CheckboxOutlined',
    description: 'Choix multiples parmi des options',
    category: 'choice',
    variants: ['checkboxes', 'tags', 'dual-list'],
    defaultVariant: 'checkboxes',
    hasOptions: true,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'api', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'checkboxes', label: 'Cases à cocher', icon: 'CheckboxOutlined' },
        { key: 'tags', label: 'Étiquettes', icon: 'TagsOutlined' },
        { key: 'dual-list', label: 'Double liste', icon: 'SwapOutlined' }
      ],
      properties: ['maxSelections', 'searchable', 'optionsSource']
    }
  },

  // 📅 DATE
  DATE: {
    key: 'DATE',
    label: 'Date',
    icon: 'CalendarOutlined',
    description: 'Sélecteur de date/heure',
    category: 'temporal',
    variants: ['date', 'time', 'datetime', 'month', 'range'],
    defaultVariant: 'date',
    hasOptions: false,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'date', label: 'Date', icon: 'CalendarOutlined' },
        { key: 'time', label: 'Heure', icon: 'ClockCircleOutlined' },
        { key: 'datetime', label: 'Date et heure', icon: 'FieldTimeOutlined' },
        { key: 'month', label: 'Mois', icon: 'CalendarOutlined' },
        { key: 'range', label: 'Période', icon: 'CalendarOutlined' }
      ],
      properties: ['format', 'locale', 'minDate', 'maxDate', 'disabledDates']
    }
  },

  // 🖼️ IMAGE
  IMAGE: {
    key: 'IMAGE',
    label: 'Image',
    icon: 'PictureOutlined',
    description: 'Upload et gestion d\'images avancée',
    category: 'media',
    variants: ['upload', 'gallery', 'camera'],
    defaultVariant: 'upload',
    hasOptions: false,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'validation', 'aiMeasure'],
    appearanceConfig: {
      variants: [
        { key: 'upload', label: 'Upload simple', icon: 'UploadOutlined' },
        { key: 'gallery', label: 'Galerie', icon: 'AppstoreOutlined' },
        { key: 'camera', label: 'Prise de vue', icon: 'CameraOutlined' }
      ],
      properties: [
        'formats', 'maxSize', 'maxCount', 'ratio', 'crop', 'thumbnails',
        'compression', 'transforms', 'annotations'
      ]
    }
  },

  // 📎 FILE
  FILE: {
    key: 'FILE',
    label: 'Fichier',
    icon: 'FileOutlined',
    description: 'Upload de fichiers',
    category: 'media',
    variants: ['single', 'multiple', 'drag-drop'],
    defaultVariant: 'single',
    hasOptions: false,
    hasSubfields: false,
    capabilities: ['data', 'condition', 'validation'],
    appearanceConfig: {
      variants: [
        { key: 'single', label: 'Fichier unique', icon: 'FileOutlined' },
        { key: 'multiple', label: 'Plusieurs fichiers', icon: 'FolderOutlined' },
        { key: 'drag-drop', label: 'Glisser-déposer', icon: 'CloudUploadOutlined' }
      ],
      properties: ['accept', 'maxSize', 'maxCount', 'preview', 'extraction']
    }
  }
};

// =============================================================================
// 🎯 CAPABILITY MODULES - Modules de capacités
// =============================================================================

export const CAPABILITY_MODULES: Record<string, CapabilityModule> = {
  // 📊 DATA (Variable exposée)
  data: {
    key: 'data',
    label: 'Donnée',
    icon: 'BarChartOutlined',
    emoji: '📊',
    description: 'Exposer comme variable utilisable',
    category: 'calculation',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['branch', 'leaf'],
    panelComponent: 'DataConfigPanel',
    validationRules: ['exposedKey', 'format'],
    dependencies: []
  },

  // 🧮 FORMULA
  formula: {
    key: 'formula',
    label: 'Formule',
    icon: 'CalculatorOutlined',
    emoji: '🧮',
    description: 'Calcul automatique avec blocs',
    category: 'calculation',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['branch', 'leaf'],
    panelComponent: 'FormulaConfigPanel',
    validationRules: ['formula', 'variables'],
    dependencies: ['data']
  },

  // ⚖️ CONDITIONS
  condition: {
    key: 'condition',
    label: 'Conditions',
    icon: 'BranchesOutlined',
    emoji: '⚖️',
    description: 'Règles de navigation et affichage',
    category: 'logic',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['branch', 'leaf'],
    panelComponent: 'ConditionConfigPanel',
    validationRules: ['rules', 'outcomes'],
    dependencies: []
  },

  // 🧩 TABLE
  table: {
    key: 'table',
    label: 'Tableau',
    icon: 'TableOutlined',
    emoji: '🧩',
    description: 'Lookup 2D avec interpolation',
    category: 'data',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['leaf'],
    panelComponent: 'TableConfigPanel',
    validationRules: ['xAxis', 'yAxis', 'matrix'],
    dependencies: ['data']
  },

  // 🔌 API
  api: {
    key: 'api',
    label: 'API',
    icon: 'ApiOutlined',
    emoji: '🔌',
    description: 'Connexion externe avec cache',
    category: 'integration',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['branch', 'leaf'],
    panelComponent: 'APIConfigPanel',
    validationRules: ['method', 'url', 'responsePath'],
    dependencies: ['data']
  },

  // 🔗 LINK
  link: {
    key: 'link',
    label: 'Lien',
    icon: 'LinkOutlined',
    emoji: '🔗',
    description: 'Navigation et rebouclage',
    category: 'navigation',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['branch', 'leaf'],
    panelComponent: 'LinkConfigPanel',
    validationRules: ['targetTree', 'mode'],
    dependencies: []
  },

  // 📍 MARKERS
  markers: {
    key: 'markers',
    label: 'Marqueurs',
    icon: 'TagsOutlined',
    emoji: '📍',
    description: 'Tags et catégorisation',
    category: 'organization',
    autoOpen: false,
    requiresConfig: false,
    compatibleWith: ['branch', 'leaf'],
    panelComponent: 'MarkerConfigPanel',
    validationRules: [],
    dependencies: []
  },

  // 📐 AI MEASURE (Analyse d'images avec IA)
  aiMeasure: {
    key: 'aiMeasure',
    label: 'IA Mesure',
    icon: 'CameraOutlined',
    emoji: '📐',
    description: 'Analyse de photos pour extraire des mesures avec IA',
    category: 'ai',
    autoOpen: true,
    requiresConfig: true,
    compatibleWith: ['leaf'],
    panelComponent: 'AIMeasureConfigPanel',
    validationRules: ['prompt', 'measureKeys', 'mappings'],
    dependencies: []
  }
};

// =============================================================================
// 🎨 NODE TYPES - Types de nœuds
// =============================================================================

export const NODE_TYPES: Record<string, NodeType> = {
  // 🌿 BRANCHE
  branch: {
    key: 'branch',
    label: 'Branche',
    icon: 'BranchesOutlined',
    emoji: '🌿',
    description: 'Conteneur hiérarchique',
    color: '#52c41a',
    canHaveChildren: true,
  // Mise à jour: une Branche peut être enfant d'une autre Branche (imbrication infinie)
  canBeChild: true,
    acceptsDropFrom: ['palette', 'structure'],
    capabilities: ['data', 'condition', 'formula', 'api', 'link', 'markers']
  },

  // 🍃 FEUILLES
  leaf_option: {
    key: 'leaf_option',
    label: 'Option (O)',
    icon: 'NodeIndexOutlined',
    emoji: '○',
    description: 'Option simple de sélection',
    color: '#1890ff',
    canHaveChildren: true,
    canBeChild: true,
    acceptsDropFrom: ['palette', 'structure'],
    capabilities: ['data', 'condition', 'markers'],
    defaultFieldType: 'SELECT',
    fieldRequired: false
  },

  leaf_option_field: {
    key: 'leaf_option_field',
    label: 'Option + Champ (O+C)',
    icon: 'AppstoreOutlined',
    emoji: '◐',
    description: 'Option avec champ de saisie',
    color: '#722ed1',
    canHaveChildren: true,
    canBeChild: true,
    acceptsDropFrom: ['palette', 'structure'],
    capabilities: ['data', 'condition', 'formula', 'table', 'api', 'markers'],
  defaultFieldType: 'TEXT',
    fieldRequired: true
  },

  leaf_field: {
    key: 'leaf_field',
    label: 'Champ (C)',
    icon: 'FormOutlined',
    emoji: '●',
    description: 'Champ de saisie pur',
    color: '#fa8c16',
    canHaveChildren: true,
    canBeChild: true,
    acceptsDropFrom: ['palette', 'structure'],
    capabilities: ['data', 'condition', 'formula', 'table', 'api', 'validation', 'markers'],
    defaultFieldType: 'TEXT',
    fieldRequired: true
  },

  leaf_repeater: {
    key: 'leaf_repeater',
    label: 'Bloc répétable',
    icon: 'PlusSquareOutlined',
    emoji: '➕',
    description: 'Permet à l’utilisateur d’ajouter plusieurs occurrences d’un groupe de champs.',
    color: '#eb2f96',
    canHaveChildren: true,
    canBeChild: true,
    acceptsDropFrom: ['palette', 'structure'],
    capabilities: ['markers']
  },

  // 📋 SECTION CALCULATRICE
  section: {
    key: 'section',
    label: 'Section',
    icon: 'CalculatorOutlined',
    emoji: '📋',
    description: 'Section calculatrice avec champs d\'affichage',
    color: '#13c2c2',
    canHaveChildren: true,
    canBeChild: true,
    acceptsDropFrom: ['palette', 'structure'],
    capabilities: ['data', 'condition', 'markers']
  }
};

// =============================================================================
// 🧠 PANELS MAPPING - Chargement dynamique des panneaux UI
// =============================================================================

const universalPanelImporter = () => import('../components/Parameters/panels/FieldAppearance/UniversalPanel');

export const FieldAppearancePanels = {
  DEFAULT: universalPanelImporter,
  TEXT: universalPanelImporter,
  NUMBER: universalPanelImporter,
  BOOL: universalPanelImporter,
  SELECT: universalPanelImporter,
  MULTISELECT: universalPanelImporter,
  DATE: universalPanelImporter,
  FILE: universalPanelImporter,
  IMAGE: universalPanelImporter,
  DATA: universalPanelImporter,
  LEAF_REPEATER: universalPanelImporter
};

export const CapabilityPanels = {
  data: () => import('../components/Parameters/capabilities/DataPanel'),
  formula: () => import('../components/Parameters/capabilities/FormulaPanel'),
  condition: () => import('../components/Parameters/capabilities/ConditionsPanelNew'),
  table: () => import('../components/Parameters/capabilities/TablePanel'),
  api: () => import('../components/Parameters/capabilities/APIPanel'),
  link: () => import('../components/Parameters/capabilities/LinkPanel'),
  markers: () => import('../components/Parameters/capabilities/MarkersPanel'),
  aiMeasure: () => import('../components/Parameters/capabilities/AIMeasurePanel')
};

// =============================================================================
// 🏷️ TOKEN RESOLVERS - Générateurs de tokens pour Structure→Paramètres
// =============================================================================

export const TokenResolvers = {
  NODE_VALUE: (nodeKey: string) => `@value.${nodeKey}`,
  NODE_OPTION: (nodeKey: string, optionKey: string) => `@select.${nodeKey}.${optionKey}`,
  VARIABLE: (exposedKey: string) => `@${exposedKey}`,
  CONST: (v: unknown) => v,
  MARKER: (m: string) => `#${m}`
};

// =============================================================================
// 🔄 TOKEN TYPES - Types de tokens pour drag & drop
// =============================================================================

export const TOKEN_TYPES: Record<string, TokenType> = {
  NODE_VALUE: {
    key: 'NODE_VALUE',
    label: 'Valeur de champ',
    format: '@value.{nodeKey}',
    acceptedBy: ['formula', 'condition', 'api'],
    color: '#52c41a'
  },

  NODE_OPTION: {
    key: 'NODE_OPTION',
    label: 'Option sélectionnée',
    format: '@select.{nodeKey}.{optionKey}',
    acceptedBy: ['condition', 'api'],
    color: '#1890ff'
  },

  VARIABLE: {
    key: 'VARIABLE',
    label: 'Variable exposée',
    format: '@{exposedKey}',
    acceptedBy: ['formula', 'condition', 'table', 'api'],
    color: '#fa8c16'
  },

  CONSTANT: {
    key: 'CONSTANT',
    label: 'Constante',
    format: '{value}',
    acceptedBy: ['formula', 'condition'],
    color: '#6b7280'
  },

  MARKER: {
    key: 'MARKER',
    label: 'Marqueur',
    format: '@marker.{markerKey}',
    acceptedBy: ['condition'],
    color: '#eb2f96'
  }
};

// =============================================================================
// 🎯 DROP ZONES - Zones de dépôt
// =============================================================================

export const DROP_ZONES: Record<string, DropZoneType> = {
  structure_root: {
    key: 'structure_root',
    label: 'Racine de l\'arbre',
    acceptsFrom: ['palette'],
    acceptsTypes: ['branch', 'section'], // NIVEAU 1: Branches et sections à la racine
    dropPosition: 'child'
  },

  structure_branch: {
    key: 'structure_branch',
    label: 'Dans une branche',
    acceptsFrom: ['palette', 'structure'],
  // Autoriser aussi les branches et sections comme enfants (imbrication infinie)
  acceptsTypes: ['branch', 'section', 'leaf_option', 'leaf_option_field', 'leaf_field'],
    dropPosition: 'child'
  },

  structure_leaf: {
    key: 'structure_leaf',
    label: 'Après une feuille',
    acceptsFrom: ['palette', 'structure'],
    acceptsTypes: ['leaf_option', 'leaf_option_field', 'leaf_field'], // NIVEAU 3+: Seulement champs/options sous feuilles
    dropPosition: 'child'
  },

  structure_section: {
    key: 'structure_section',
    label: 'Dans une section calculatrice',
    acceptsFrom: ['palette', 'structure'],
    acceptsTypes: ['leaf_option', 'leaf_option_field', 'leaf_field'], // Sections acceptent des champs pour affichage
    dropPosition: 'child'
  },

  structure_between: {
    key: 'structure_between',
    label: 'Entre les éléments',
    acceptsFrom: ['palette', 'structure'],
  // Entre éléments de même niveau: branches, sections et feuilles
  acceptsTypes: ['branch', 'section', 'leaf_option', 'leaf_option_field', 'leaf_field'],
    dropPosition: 'sibling'
  },

  formula_input: {
    key: 'formula_input',
    label: 'Zone de formule',
    acceptsFrom: ['structure', 'reusables'],
    acceptsTypes: ['NODE_VALUE', 'VARIABLE', 'CONSTANT'],
    dropPosition: 'token'
  },

  condition_input: {
    key: 'condition_input',
    label: 'Zone de condition',
    acceptsFrom: ['structure', 'reusables'],
    acceptsTypes: ['NODE_VALUE', 'NODE_OPTION', 'VARIABLE', 'MARKER'],
    dropPosition: 'token'
  }
};

// =============================================================================
// 🔄 REUSABLE TYPES - Types de réutilisables
// =============================================================================

export const REUSABLE_TYPES: Record<string, ReusableType> = {
  formula: {
    key: 'formula',
    label: 'Formules',
    icon: 'CalculatorOutlined',
    emoji: '🧮',
    description: 'Formules sauvegardées',
    category: 'calculation',
    attachableTo: ['formula'],
    canLink: true,
    canCopy: true
  },

  condition: {
    key: 'condition',
    label: 'Conditions',
    icon: 'BranchesOutlined',
    emoji: '⚖️',
    description: 'Règles conditionnelles',
    category: 'logic',
    attachableTo: ['condition'],
    canLink: true,
    canCopy: true
  },

  table: {
    key: 'table',
    label: 'Tableaux',
    icon: 'TableOutlined',
    emoji: '🧩',
    description: 'Matrices de lookup',
    category: 'data',
    attachableTo: ['table'],
    canLink: true,
    canCopy: true
  },

  api: {
    key: 'api',
    label: 'Connexions API',
    icon: 'ApiOutlined',
    emoji: '🔌',
    description: 'Endpoints configurés',
    category: 'integration',
    attachableTo: ['api'],
    canLink: true,
    canCopy: false
  },

  fieldStyle: {
    key: 'fieldStyle',
    label: 'Styles de champ',
    icon: 'BgColorsOutlined',
    emoji: '🎨',
    description: 'Apparence réutilisable',
    category: 'appearance',
    attachableTo: ['appearance'],
    canLink: true,
    canCopy: true
  },

  optionSet: {
    key: 'optionSet',
    label: 'Jeux d\'options',
    icon: 'UnorderedListOutlined',
    emoji: '📋',
    description: 'Listes prédéfinies',
    category: 'data',
    attachableTo: ['options'],
    canLink: true,
    canCopy: true
  },

  markerSet: {
    key: 'markerSet',
    label: 'Sets de marqueurs',
    icon: 'TagsOutlined',
    emoji: '📍',
    description: 'Collections de tags',
    category: 'organization',
    attachableTo: ['markers'],
    canLink: true,
    canCopy: true
  },

  variable: {
    key: 'variable',
    label: 'Variables @key',
    icon: 'KeyOutlined',
    emoji: '🔑',
    description: 'Variables globales',
    category: 'data',
    attachableTo: ['formula', 'condition', 'table', 'api'],
    canLink: false,
    canCopy: false
  }
};

// =============================================================================
// 🛠️ LEGACY MAPPING - Correspondance avec l'ancien système
// =============================================================================

export const LEGACY_MAPPING = {
  // Types de nœuds
  nodeTypes: {
    'branch': 'branch',
    'leaf': 'leaf_field',
    'option': 'leaf_option',
    'option-field': 'leaf_option_field'
  },

  // Sous-types
  subTypes: {
    'field': 'leaf_field',
    'option': 'leaf_option',
    'data': 'leaf_field'
  },

  // Capacités
  capabilities: {
    'data': 'data',
    'condition': 'condition',
    'formula': 'formula',
    'table': 'table',
    'api': 'api',
    'link': 'link',
    'markers': 'markers'
  },

  // Propriétés des champs
  fieldProperties: {
    'fieldConfig': 'appearanceConfig',
    'conditionConfig': 'conditionConfig',
    'formulaConfig': 'formulaConfig',
    'tableConfig': 'tableConfig',
    'apiConfig': 'apiConfig',
    'linkConfig': 'linkConfig'
  }
};

// =============================================================================
// 🚀 REGISTRY CLASS - Interface principale
// =============================================================================

export class TreeBranchLeafRegistry {
  static getFieldType(key: string): FieldType | null {
    return FIELD_TYPES[key] || null;
  }

  static getCapabilityModule(key: string): CapabilityModule | null {
    return CAPABILITY_MODULES[key] || null;
  }

  static getNodeType(key: string): NodeType | null {
    return NODE_TYPES[key] || null;
  }

  static getTokenType(key: string): TokenType | null {
    return TOKEN_TYPES[key] || null;
  }

  static getReusableType(key: string): ReusableType | null {
    return REUSABLE_TYPES[key] || null;
  }

  static getDropZone(key: string): DropZoneType | null {
    return DROP_ZONES[key] || null;
  }

  static getAllFieldTypes(): FieldType[] {
    return Object.values(FIELD_TYPES);
  }

  static getAllCapabilities(): CapabilityModule[] {
    return Object.values(CAPABILITY_MODULES);
  }

  static getAllNodeTypes(): NodeType[] {
    return Object.values(NODE_TYPES);
  }

  static getFieldTypesByCategory(category: string): FieldType[] {
    return Object.values(FIELD_TYPES).filter(ft => ft.category === category);
  }

  static getCapabilitiesByCategory(category: string): CapabilityModule[] {
    return Object.values(CAPABILITY_MODULES).filter(cm => cm.category === category);
  }

  static validateDropOperation(
    sourceType: string,
    targetType: string,
    position: 'before' | 'after' | 'child'
  ): boolean {
    // Logique de validation des drops
    const sourceNode = this.getNodeType(sourceType);
    const targetNode = this.getNodeType(targetType);
    
    if (!sourceNode || !targetNode) return false;
    
    // Vérifier les compatibilités selon la position
    switch (position) {
      case 'child':
        return targetNode.canHaveChildren;
      case 'before':
      case 'after':
        return sourceNode.canBeChild;
      default:
        return false;
    }
  }

  static resolveTokenFromDrop(
    nodeData: NodeData,
    targetCapability: string
  ): string | null {
    // Résout un token depuis un drop de Structure → Paramètres
    if (!nodeData) return null;

    const nodeType = this.getNodeType(nodeData.type);
    if (!nodeType) return null;

    switch (targetCapability) {
      case 'formula':
        return nodeData.hasData ? `@value.${nodeData.key}` : null;
      case 'condition':
        if (nodeData.type.includes('option')) {
          return `@select.${nodeData.key}`;
        }
        return nodeData.hasData ? `@value.${nodeData.key}` : null;
      default:
        return null;
    }
  }

  static convertFromLegacy(legacyNode: LegacyNodeData): NodeData {
    // Convertit un nœud legacy vers le nouveau format
    const newType = LEGACY_MAPPING.nodeTypes[legacyNode.type] || legacyNode.type;
    const newSubType = LEGACY_MAPPING.subTypes[legacyNode.subType] || null;
    
    return {
      ...legacyNode,
      type: newType,
      subType: newSubType,
      // Convertir les autres propriétés...
    };
  }

  static isFieldInSection(node: TreeBranchLeafNode, allNodes: TreeBranchLeafNode[]): boolean {
    // Vérifie si un champ est enfant d'une section (directement ou indirectement)
    if (!node.parentId) return false;
    
    // Fonction récursive pour remonter l'arbre
    const findParentSection = (nodeId: string): boolean => {
      const parent = allNodes.find(n => n.id === nodeId);
      if (!parent) return false;
      
      // Si le parent est une section, c'est ce qu'on cherche
      if (parent.type === 'section') return true;
      
      // Sinon, continuer à remonter
      if (parent.parentId) {
        return findParentSection(parent.parentId);
      }
      
      return false;
    };
    
    return findParentSection(node.parentId);
  }

  static getSectionDisplayConfig(_node: TreeBranchLeafNode): { isDisplayOnly: boolean; hasCalculatorIcon: boolean; specialStyle: Record<string, unknown> } {
    // Retourne la configuration d'affichage pour un champ dans une section
    return {
      isDisplayOnly: true,
      hasCalculatorIcon: true,
      specialStyle: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '6px',
        padding: '8px 12px',
        position: 'relative'
      }
    };
  }

  static getDefaultAppearanceConfig(fieldType: string): Record<string, unknown> {
    // Retourne la configuration d'apparence par défaut pour un type de champ
    switch(fieldType?.toUpperCase()) {
      case 'TEXT':
        return {
          size: 'md',
          variant: 'singleline',
          placeholder: '',
          maxLength: 255,
          mask: '',
          regex: ''
        };
      
      case 'NUMBER':
        return {
          size: 'md',
          variant: 'input',
          min: null,
          max: null,
          step: 1,
          decimals: 0,
          prefix: '',
          suffix: ''
        };
      
      case 'BOOL':
        return {
          size: 'md',
          variant: 'checkbox',
          defaultValue: false,
          trueLabel: 'Oui',
          falseLabel: 'Non'
        };
      
      case 'SELECT':
        return {
          size: 'md',
          variant: 'dropdown',
          searchable: false,
          allowCustom: false
        };
      
      case 'MULTISELECT':
        return {
          size: 'md',
          variant: 'checkboxes',
          maxSelections: null,
          searchable: false,
          allowCustom: false
        };
      
      case 'DATE':
        return {
          size: 'md',
          variant: 'date',
          format: 'YYYY-MM-DD',
          locale: 'fr-BE'
        };
      
      case 'IMAGE':
        return {
          size: 'md',
          variant: 'upload',
          formats: ['jpeg', 'png', 'webp'],
          maxSize: 5,
          ratio: null,
          crop: false,
          thumbnails: []
        };
      
      case 'FILE':
        return {
          size: 'md',
          variant: 'single',
          accept: '.pdf,.docx,.xlsx',
          maxSize: 10,
          multiple: false
        };
      
      default:
        return {
          size: 'md',
          variant: 'default'
        };
    }
  }

  static mapAppearanceConfigToTBL(appearanceConfig: Record<string, unknown>): Record<string, unknown> {
    const size = (appearanceConfig.size as string) || 'md';
    const variant = (appearanceConfig.variant as string) || 'default';
    const explicitWidth = typeof appearanceConfig.width === 'string' ? appearanceConfig.width.trim() : '';

    const widthMap: Record<string, string> = {
      sm: '200px',
      md: '300px',
      lg: '400px'
    };

    const toNumberOrNull = (val: unknown) => {
      if (val === null || val === undefined || val === '') {
        return null;
      }
      const parsed = Number(val);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const toBooleanOrNull = (val: unknown) => {
      if (typeof val === 'boolean') {
        return val;
      }
      if (val === 'true') return true;
      if (val === 'false') return false;
      return null;
    };

    const selectMode = (appearanceConfig.selectMode || appearanceConfig.mode) as string | undefined;
    const isMultiMode = selectMode ? ['multiple', 'checkboxes', 'tags'].includes(selectMode) : undefined;

    const fileAccept = appearanceConfig.fileAccept || appearanceConfig.accept;
    const fileMaxSize = appearanceConfig.fileMaxSize ?? appearanceConfig.maxFileSize ?? appearanceConfig.maxSize;
    const imageMaxSize = appearanceConfig.imageMaxSize ?? appearanceConfig.maxSize;
    const imageRatio = appearanceConfig.imageRatio ?? appearanceConfig.ratio;
    const imageCrop = appearanceConfig.imageCrop ?? appearanceConfig.crop;
    const imageThumbnails = appearanceConfig.imageThumbnails ?? appearanceConfig.thumbnails;

    const repeaterMin = appearanceConfig.minItems ?? appearanceConfig.repeaterMinItems;
    const repeaterMax = appearanceConfig.maxItems ?? appearanceConfig.repeaterMaxItems;
    const repeaterButtonLabel = appearanceConfig.addButtonLabel ?? appearanceConfig.repeaterAddButtonLabel;
    const repeaterButtonSize = appearanceConfig.buttonSize ?? appearanceConfig.repeaterButtonSize;
    const repeaterButtonWidth = appearanceConfig.buttonWidth ?? appearanceConfig.repeaterButtonWidth;
    const repeaterIconOnly = appearanceConfig.iconOnly ?? appearanceConfig.repeaterIconOnly;

    const result: Record<string, unknown> = {
      appearance_size: size,
      appearance_width: explicitWidth || widthMap[size] || '300px',
      appearance_variant: variant,

      section_columnsDesktop: toNumberOrNull(appearanceConfig.columnsDesktop ?? appearanceConfig.section_columnsDesktop),
      section_columnsMobile: toNumberOrNull(appearanceConfig.columnsMobile ?? appearanceConfig.section_columnsMobile),
      section_gutter: toNumberOrNull(appearanceConfig.gutter ?? appearanceConfig.section_gutter),
      section_collapsible: toBooleanOrNull(appearanceConfig.collapsible),
      section_defaultCollapsed: toBooleanOrNull(appearanceConfig.defaultCollapsed),
      section_showChildrenCount: toBooleanOrNull(appearanceConfig.showChildrenCount),

      text_placeholder: appearanceConfig.placeholder || null,
      text_maxLength: toNumberOrNull(appearanceConfig.maxLength),
      text_minLength: toNumberOrNull(appearanceConfig.minLength),
      text_mask: appearanceConfig.mask || null,
      text_regex: appearanceConfig.regex || null,

      number_min: toNumberOrNull(appearanceConfig.min),
      number_max: toNumberOrNull(appearanceConfig.max),
      number_step: toNumberOrNull(appearanceConfig.step),
      number_decimals: toNumberOrNull(appearanceConfig.decimals),
      number_prefix: appearanceConfig.prefix || null,
      number_suffix: appearanceConfig.suffix || null,
      number_unit: appearanceConfig.unit || null,

      date_format: appearanceConfig.format || null,
      date_showTime: toBooleanOrNull(appearanceConfig.showTime),
      date_minDate: appearanceConfig.minDate || null,
      date_maxDate: appearanceConfig.maxDate || null,

      select_allowClear: toBooleanOrNull(appearanceConfig.selectAllowClear ?? appearanceConfig.allowClear),
      select_searchable: toBooleanOrNull(appearanceConfig.selectSearchable ?? appearanceConfig.searchable),
      select_multiple: typeof isMultiMode === 'boolean' ? isMultiMode : toBooleanOrNull(appearanceConfig.select_multiple),

      file_allowedTypes: Array.isArray(fileAccept) ? fileAccept.join(',') : fileAccept || null,
      file_maxSize: toNumberOrNull(fileMaxSize),
      file_multiple: toBooleanOrNull(appearanceConfig.fileMultiple ?? appearanceConfig.multiple),
      file_showPreview: toBooleanOrNull(appearanceConfig.fileShowPreview),

      image_maxSize: toNumberOrNull(imageMaxSize),
      image_ratio: imageRatio || null,
      image_crop: toBooleanOrNull(imageCrop),
      image_thumbnails: imageThumbnails || null,

      text_helpTooltipType: appearanceConfig.helpTooltipType || 'none',
      text_helpTooltipText: appearanceConfig.helpTooltipText || null,
      text_helpTooltipImage: appearanceConfig.helpTooltipImage || null,

      data_visibleToUser: toBooleanOrNull(appearanceConfig.visibleToUser),
      isRequired: toBooleanOrNull(appearanceConfig.isRequired),

      repeater_minItems: toNumberOrNull(repeaterMin),
      repeater_maxItems: toNumberOrNull(repeaterMax),
      repeater_addButtonLabel: repeaterButtonLabel || null,
      repeater_buttonSize: repeaterButtonSize || null,
      repeater_buttonWidth: repeaterButtonWidth || null,
      repeater_iconOnly: toBooleanOrNull(repeaterIconOnly)
    };

    Object.keys(result).forEach(key => {
      if (result[key] === null || result[key] === undefined) {
        delete result[key];
      }
    });

    return result;
  }

  static mapTBLToAppearanceConfig(tblData: Record<string, unknown>): Record<string, unknown> {
    const boolOrUndefined = (val: unknown) => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'boolean') return val;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    };

    const numberOrUndefined = (val: unknown) => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'number') return val;
      const parsed = Number(val);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const selectMode = tblData.select_multiple ? 'multiple' : 'single';

    const result: Record<string, unknown> = {
      size: tblData.appearance_size || 'md',
      variant: tblData.appearance_variant || 'default',
      width: tblData.appearance_width || '',

      columnsDesktop: numberOrUndefined(tblData.section_columnsDesktop),
      columnsMobile: numberOrUndefined(tblData.section_columnsMobile),
      gutter: numberOrUndefined(tblData.section_gutter),
      collapsible: boolOrUndefined(tblData.section_collapsible),
      defaultCollapsed: boolOrUndefined(tblData.section_defaultCollapsed),
      showChildrenCount: boolOrUndefined(tblData.section_showChildrenCount),

      placeholder: tblData.text_placeholder || undefined,
      maxLength: numberOrUndefined(tblData.text_maxLength),
      minLength: numberOrUndefined(tblData.text_minLength),
      mask: tblData.text_mask || undefined,
      regex: tblData.text_regex || undefined,

      min: numberOrUndefined(tblData.number_min),
      max: numberOrUndefined(tblData.number_max),
      step: numberOrUndefined(tblData.number_step),
      decimals: numberOrUndefined(tblData.number_decimals),
      prefix: tblData.number_prefix || undefined,
      suffix: tblData.number_suffix || undefined,
      unit: tblData.number_unit || undefined,

      format: tblData.date_format || undefined,
      showTime: boolOrUndefined(tblData.date_showTime),
      minDate: tblData.date_minDate || undefined,
      maxDate: tblData.date_maxDate || undefined,

      selectMode,
      selectAllowClear: boolOrUndefined(tblData.select_allowClear),
      selectSearchable: boolOrUndefined(tblData.select_searchable),
      selectShowSearch: boolOrUndefined(tblData.select_searchable),

      fileAccept: tblData.file_allowedTypes || undefined,
      fileMaxSize: numberOrUndefined(tblData.file_maxSize),
      fileMultiple: boolOrUndefined(tblData.file_multiple),
      fileShowPreview: boolOrUndefined(tblData.file_showPreview),

      imageMaxSize: numberOrUndefined(tblData.image_maxSize),
      imageRatio: tblData.image_ratio || undefined,
      imageCrop: boolOrUndefined(tblData.image_crop),
      imageThumbnails: tblData.image_thumbnails || undefined,

      helpTooltipType: tblData.text_helpTooltipType || 'none',
      helpTooltipText: tblData.text_helpTooltipText || undefined,
      helpTooltipImage: tblData.text_helpTooltipImage || undefined,

      visibleToUser: boolOrUndefined(tblData.data_visibleToUser),
      isRequired: boolOrUndefined(tblData.isRequired),

      minItems: numberOrUndefined(tblData.repeater_minItems),
      maxItems: numberOrUndefined(tblData.repeater_maxItems),
      addButtonLabel: tblData.repeater_addButtonLabel || undefined,
      buttonSize: tblData.repeater_buttonSize || undefined,
      buttonWidth: tblData.repeater_buttonWidth || undefined,
      iconOnly: boolOrUndefined(tblData.repeater_iconOnly)
    };

    Object.keys(result).forEach(key => {
      if (result[key] === undefined) {
        delete result[key];
      }
    });

    return result;
  }
}

export default TreeBranchLeafRegistry;
