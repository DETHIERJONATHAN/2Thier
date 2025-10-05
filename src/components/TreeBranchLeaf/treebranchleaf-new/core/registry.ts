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
    capabilities: ['data', 'condition', 'validation'],
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

export const FieldAppearancePanels = {
  TEXT: () => import('../components/Parameters/panels/FieldAppearance/TextPanel'),
  NUMBER: () => import('../components/Parameters/panels/FieldAppearance/NumberPanel'),
  BOOL: () => import('../components/Parameters/panels/FieldAppearance/BoolPanel'),
  SELECT: () => import('../components/Parameters/panels/FieldAppearance/SelectPanel'),
  MULTISELECT: () => import('../components/Parameters/panels/FieldAppearance/MultiSelectPanel'),
  DATE: () => import('../components/Parameters/panels/FieldAppearance/DateTimePanel'),
  FILE: () => import('../components/Parameters/panels/FieldAppearance/FilePanel'),
  IMAGE: () => import('../components/Parameters/panels/FieldAppearance/ImagePanel')
};

export const CapabilityPanels = {
  data: () => import('../components/Parameters/capabilities/DataPanel'),
  formula: () => import('../components/Parameters/capabilities/FormulaPanel'),
  condition: () => import('../components/Parameters/capabilities/ConditionsPanelNew'),
  table: () => import('../components/Parameters/capabilities/TablePanel'),
  api: () => import('../components/Parameters/capabilities/APIPanel'),
  link: () => import('../components/Parameters/capabilities/LinkPanel'),
  markers: () => import('../components/Parameters/capabilities/MarkersPanel')
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
    // Mappe la configuration d'apparence vers les champs TBL
    const size = appearanceConfig.size as string || 'md';
    const variant = appearanceConfig.variant as string || 'default';
    
    // Mapping des tailles vers des largeurs
    const widthMap: Record<string, string> = {
      'sm': '200px',
      'md': '300px',
      'lg': '400px'
    };
    
    // Mapping complet vers les colonnes Prisma
    const result: Record<string, unknown> = {
      // Apparence générale
      appearance_size: size,
      appearance_width: widthMap[size] || '300px',
      appearance_variant: variant,
      
      // Configuration champs texte
      text_placeholder: appearanceConfig.placeholder || null,
      text_maxLength: appearanceConfig.maxLength ? Number(appearanceConfig.maxLength) : null,
      text_minLength: appearanceConfig.minLength ? Number(appearanceConfig.minLength) : null,
      text_mask: appearanceConfig.mask || null,
      text_regex: appearanceConfig.regex || null,
      
      // Configuration champs nombre
      number_min: appearanceConfig.min ? Number(appearanceConfig.min) : null,
      number_max: appearanceConfig.max ? Number(appearanceConfig.max) : null,
      number_step: appearanceConfig.step ? Number(appearanceConfig.step) : null,
      number_decimals: appearanceConfig.decimals ? Number(appearanceConfig.decimals) : null,
      number_prefix: appearanceConfig.prefix || null,
      number_suffix: appearanceConfig.suffix || null,
      number_unit: appearanceConfig.unit || null,
      
      // Configuration champs date
      date_format: appearanceConfig.format || null,
      date_showTime: appearanceConfig.showTime ? Boolean(appearanceConfig.showTime) : null,
      date_minDate: appearanceConfig.minDate || null,
      date_maxDate: appearanceConfig.maxDate || null,
      
      // Configuration champs select
      select_mode: appearanceConfig.mode || null,
      select_allowClear: appearanceConfig.allowClear ? Boolean(appearanceConfig.allowClear) : null,
      select_showSearch: appearanceConfig.showSearch ? Boolean(appearanceConfig.showSearch) : null,
      
      // Configuration tooltip d'aide
      text_helpTooltipType: appearanceConfig.helpTooltipType || 'none',
      text_helpTooltipText: appearanceConfig.helpTooltipText || null,
      text_helpTooltipImage: appearanceConfig.helpTooltipImage || null
    };
    
    // Nettoyer les valeurs null/undefined
    Object.keys(result).forEach(key => {
      if (result[key] === null || result[key] === undefined) {
        delete result[key];
      }
    });
    
    return result;
  }

  static mapTBLToAppearanceConfig(tblData: Record<string, unknown>): Record<string, unknown> {
    // Mappe les champs TBL vers la configuration d'apparence
    const result: Record<string, unknown> = {
      // Apparence générale
      size: tblData.appearance_size || 'md',
      variant: tblData.appearance_variant || 'default',
      
      // Configuration champs texte
      placeholder: tblData.text_placeholder || null,
      maxLength: tblData.text_maxLength || null,
      minLength: tblData.text_minLength || null,
      mask: tblData.text_mask || null,
      regex: tblData.text_regex || null,
      
      // Configuration champs nombre
      min: tblData.number_min || null,
      max: tblData.number_max || null,
      step: tblData.number_step || null,
      decimals: tblData.number_decimals || null,
      prefix: tblData.number_prefix || null,
      suffix: tblData.number_suffix || null,
      unit: tblData.number_unit || null,
      
      // Configuration champs date
      format: tblData.date_format || null,
      showTime: tblData.date_showTime || null,
      minDate: tblData.date_minDate || null,
      maxDate: tblData.date_maxDate || null,
      
      // Configuration champs select
      mode: tblData.select_mode || null,
      allowClear: tblData.select_allowClear || null,
      showSearch: tblData.select_showSearch || null,
      
      // Configuration tooltip d'aide
      helpTooltipType: tblData.text_helpTooltipType || 'none',
      helpTooltipText: tblData.text_helpTooltipText || null,
      helpTooltipImage: tblData.text_helpTooltipImage || null
    };
    
    // Nettoyer les valeurs null/undefined
    Object.keys(result).forEach(key => {
      if (result[key] === null || result[key] === undefined) {
        delete result[key];
      }
    });
    
    return result;
  }
}

export default TreeBranchLeafRegistry;
