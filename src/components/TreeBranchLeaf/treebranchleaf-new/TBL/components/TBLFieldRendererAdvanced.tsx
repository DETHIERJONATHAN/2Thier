/**
 * 🎨 TBLFieldRendererAdvanced - Rendu de champs TBL avec configuration TreeBranchLeaf complète
 * 
 * Respecte tous les paramètres et capacités du système TreeBranchLeaf :
 * - Types de champs (TEXT, NUMBER, SELECT, CHECKBOX, DATE, etc.)
 * - Configurations spécifiques (numberConfig, selectConfig, etc.)
 * - Validation (required, min, max, etc.)
 * - Apparence (variants, properties, styles)
 * - Capacités (condition, formula, table, api, etc.)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Select,
  Cascader, 
  Checkbox, 
  DatePicker, 
  Slider,
  Switch,
  Upload,
  Button,
  Radio,
  Tag,
  Tooltip,
  Typography,
  Grid
} from 'antd';
import { 
  InfoCircleOutlined, 
  UploadOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { BackendValueDisplay } from './BackendValueDisplay';
import { HelpTooltip } from '../../../../common/HelpTooltip';
import { useTBLTooltip } from '../../../../../hooks/useTBLTooltip';
import { useTBLValidationContext } from '../contexts/TBLValidationContext';
import { useTBLTableLookup } from '../hooks/useTBLTableLookup';
import type { RawTreeNode } from '../types';

declare global {
  interface Window {
    TBL_CASCADER_NODE_IDS?: Record<string, string>;
  }
}
// Types locaux pour éviter les 'any' lors de l'extraction des formules dynamiques
interface VariableDefLocal { sourceField: string; type?: string }

// 🔥 NOUVEAU: Types pour le filtrage conditionnel des lookups
interface TableLookupCondition {
  id: string;
  filterByColumn?: string; // Colonne du tableau à filtrer (optionnel)
  filterByRow?: string; // Ligne du tableau à filtrer (optionnel)
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'notContains';
  compareWithRef?: string; // Référence NodeTreeSelector vers un champ/formule
  description?: string; // Description lisible de la condition
}

interface TableLookupFilterConfig {
  enabled?: boolean;
  conditions?: TableLookupCondition[];
  filterLogic?: 'AND' | 'OR'; // Comment combiner les conditions
}

// 🔥 NOUVEAU: Fonction pour évaluer si une option de lookup passe les conditions de filtrage
const evaluateFilterConditions = (
  option: any, // Option courante {value, label}
  conditions: TableLookupCondition[], 
  formData: Record<string, any>,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any, // Configuration du lookup (keyColumn, keyRow, etc.)
  filterLogic: 'AND' | 'OR' = 'AND'
): boolean => {
  if (!conditions || conditions.length === 0) return true;
  if (!tableData || !config) return true;

  const results = conditions.map(condition => {
    // 1. Extraire la valeur de référence depuis formData
    let referenceValue: any = null;
    
    if (condition.compareWithRef?.startsWith('@value.')) {
      const fieldId = condition.compareWithRef.replace('@value.', '');
      referenceValue = formData[fieldId];
    } else if (condition.compareWithRef?.startsWith('@select.')) {
      const fieldId = condition.compareWithRef.replace('@select.', '');
      referenceValue = formData[fieldId];
    }
    // TODO: Ajouter le support pour formula:{id} et condition:{id}

    // 2. Trouver la/les valeur(s) correspondante(s) dans le tableau pour cette option
    const tableValues: any[] = [];
    
    try {
      // Collecter les valeurs selon filterByColumn et/ou filterByRow
      if (condition.filterByColumn) {
        const columnValue = extractValueFromColumn(option, condition.filterByColumn, tableData, config);
        if (columnValue !== null) tableValues.push(columnValue);
      }
      
      if (condition.filterByRow) {
        const rowValue = extractValueFromRow(option, condition.filterByRow, tableData, config);
        if (rowValue !== null) tableValues.push(rowValue);
      }
      
      // Si aucune valeur trouvée, rejeter cette condition
      if (tableValues.length === 0) {
        return false;
      }
    } catch (error) {
      console.warn('Erreur lors de l\'extraction de la valeur du tableau:', error);
      return false;
    }

    // 3. Comparer referenceValue avec chaque tableValue selon l'opérateur
    // Si plusieurs valeurs (colonne ET ligne), toutes doivent passer la condition
    const conditionResults = tableValues.map(tableValue => {
      switch (condition.operator) {
        case 'equals':
          return String(referenceValue) === String(tableValue);
        case 'notEquals':
          return String(referenceValue) !== String(tableValue);
        case 'greaterThan':
          return Number(referenceValue) > Number(tableValue);
        case 'lessThan':
          return Number(referenceValue) < Number(tableValue);
        case 'greaterOrEqual':
          return Number(referenceValue) >= Number(tableValue);
        case 'lessOrEqual':
          return Number(referenceValue) <= Number(tableValue);
        case 'contains':
          return String(tableValue).toLowerCase().includes(String(referenceValue).toLowerCase());
        case 'notContains':
          return !String(tableValue).toLowerCase().includes(String(referenceValue).toLowerCase());
        default:
          return false;
      }
    });
    
    // Si colonne ET ligne: toutes les conditions doivent passer (AND)
    // Si seulement colonne OU ligne: au moins une doit passer
    return conditionResults.every(result => result);
  });

  // Combiner les résultats selon la logique
  return filterLogic === 'AND' 
    ? results.every(result => result) 
    : results.some(result => result);
};

// 🔧 Fonction utilitaire pour extraire une valeur depuis une colonne du tableau
const extractValueFromColumn = (
  option: any,
  targetColumn: string,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any
): any => {
  if (tableData.type === 'columns') {
    // Mode colonnes: trouver la ligne correspondante à cette option
    const keyColIndex = config.keyColumn ? tableData.columns.indexOf(config.keyColumn) : 0;
    const targetColIndex = tableData.columns.indexOf(targetColumn);
    
    if (keyColIndex >= 0 && targetColIndex >= 0) {
      const matchingRowIndex = tableData.data.findIndex(row => String(row[keyColIndex]) === String(option.value));
      if (matchingRowIndex >= 0) {
        return tableData.data[matchingRowIndex][targetColIndex];
      }
    }
  } else if (tableData.type === 'matrix') {
    // Mode matrix selon keyColumn/keyRow
    const targetColIndex = tableData.columns.indexOf(targetColumn);
    
    if (config.keyColumn) {
      // Lookup par colonne: l'option correspond à une colonne
      const optionColIndex = tableData.columns.indexOf(String(option.value));
      if (optionColIndex >= 0 && targetColIndex >= 0) {
        // Pour chaque ligne de données, comparer les colonnes
        for (let rowIndex = 0; rowIndex < tableData.data.length; rowIndex++) {
          const dataColIndex = optionColIndex - 1; // Décalage car data n'a pas colonne A
          const targetDataColIndex = targetColIndex - 1;
          if (dataColIndex >= 0 && targetDataColIndex >= 0) {
            return tableData.data[rowIndex][targetDataColIndex];
          }
        }
      }
    } else if (config.keyRow) {
      // Lookup par ligne: trouver la colonne cible
      const keyRowIndex = tableData.rows.indexOf(config.keyRow);
      if (keyRowIndex >= 0 && targetColIndex >= 0) {
        const dataRowIndex = keyRowIndex - 1;
        const dataColIndex = targetColIndex - 1;
        if (dataRowIndex >= 0 && dataRowIndex < tableData.data.length &&
            dataColIndex >= 0 && dataColIndex < tableData.data[dataRowIndex].length) {
          return tableData.data[dataRowIndex][dataColIndex];
        }
      }
    }
  }
  
  return null;
};

// 🔧 Fonction utilitaire pour extraire une valeur depuis une ligne du tableau
const extractValueFromRow = (
  option: any,
  targetRow: string,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any
): any => {
  if (tableData.type === 'columns') {
    // Mode colonnes: targetRow n'est pas applicable directement
    // On pourrait chercher dans les données mais c'est moins logique
    return null;
  } else if (tableData.type === 'matrix') {
    const targetRowIndex = tableData.rows.indexOf(targetRow);
    
    if (config.keyColumn) {
      // Lookup par colonne: trouver la ligne cible
      const keyColIndex = tableData.columns.indexOf(config.keyColumn);
      const optionColIndex = tableData.columns.indexOf(String(option.value));
      
      if (targetRowIndex >= 0 && optionColIndex >= 0) {
        const dataRowIndex = targetRowIndex - 1;
        const dataColIndex = optionColIndex - 1;
        if (dataRowIndex >= 0 && dataRowIndex < tableData.data.length &&
            dataColIndex >= 0 && dataColIndex < tableData.data[dataRowIndex].length) {
          return tableData.data[dataRowIndex][dataColIndex];
        }
      }
    } else if (config.keyRow) {
      // Lookup par ligne: l'option correspond à une ligne
      const optionRowIndex = tableData.rows.indexOf(String(option.value));
      if (optionRowIndex >= 0 && targetRowIndex >= 0) {
        const optionDataRowIndex = optionRowIndex - 1;
        const targetDataRowIndex = targetRowIndex - 1;
        
        // Comparer les valeurs de la première colonne (ou d'une colonne spécifique)
        if (optionDataRowIndex >= 0 && targetDataRowIndex >= 0 && 
            optionDataRowIndex < tableData.data.length && targetDataRowIndex < tableData.data.length) {
          // Retourner une valeur representative de cette ligne (ex: première colonne de données)
          return tableData.data[targetDataRowIndex][0];
        }
      }
    }
  }
  
  return null;
};
interface FormulaConfigLocal { expression?: string; variables?: Record<string, VariableDefLocal> }

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;
const { useBreakpoint } = Grid;

interface TreeBranchLeafFieldConfig {
  // Configuration de base
  fieldType: string;
  label: string;
  description?: string;
  required: boolean;
  visible: boolean;
  
  // Configurations spécifiques par type
  numberConfig?: {
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    ui?: 'input' | 'slider' | 'stepper';
    unit?: string;
    formatter?: (value: number) => string;
    parser?: (value: string) => number;
    marks?: Record<number, string>;
  };
  
  textConfig?: {
    defaultValue?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    rows?: number;
    pattern?: string;
  };
  
  selectConfig?: {
    options: Array<{ label: string; value: string; disabled?: boolean }>;
    defaultValue?: string;
    multiple?: boolean;
    searchable?: boolean;
    allowClear?: boolean;
  };
  
  checkboxConfig?: {
    label?: string;
    trueLabel?: string;
    falseLabel?: string;
    defaultValue?: boolean;
  };
  
  dateConfig?: {
    format?: string;
    disabledDate?: (date: dayjs.Dayjs) => boolean;
    showTime?: boolean;
    defaultValue?: string;
  };
  
  // Apparence TreeBranchLeaf
  appearance?: {
    variant?: string;
    size?: 'small' | 'middle' | 'large';
    style?: React.CSSProperties;
    className?: string;
  };
  
  // Capacités TreeBranchLeaf
  hasCondition?: boolean;
  hasFormula?: boolean;
  hasTable?: boolean;
  hasAPI?: boolean;
  hasMarkers?: boolean;
  
  // Configuration des capacités
  conditionConfig?: {
    branches?: Array<{
      label: string;
      targetField: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: unknown;
      action: 'show' | 'hide' | 'enable' | 'disable';
    }>;
  };
  
  formulaConfig?: {
    formula: string;
    variables: Record<string, { sourceField: string; type: 'number' | 'text' }>;
    allowManualOverride?: boolean;
  };
  
  tableConfig?: {
    columns: Array<{ key: string; label: string; type: string }>;
    dataSource?: string; // API endpoint ou nom de variable
  };
  
  apiConfig?: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, unknown>;
    responseField?: string;
  };
  
  markersConfig?: {
    markers: Array<{ id: string; name: string; color: string; icon?: string }>;
  };
}

interface TBLFieldAdvancedProps {
  field: {
    id: string;
    type: string;
    label: string;
    description?: string;
    required?: boolean;
    visible?: boolean;
    config?: {
      // Apparence
      size?: string;
      width?: string;
      variant?: string;
      
      // Texte
      minLength?: number;
      maxLength?: number;
      rows?: number;
      regex?: string;
      textDefaultValue?: string;
      
      // Nombre
      min?: number;
      max?: number;
      step?: number;
      decimals?: number;
      prefix?: string;
      suffix?: string;
      unit?: string;
      numberDefaultValue?: number;
      
      // Date
      format?: string;
      showTime?: boolean;
      dateDefaultValue?: string;
      
      // Sélection
      multiple?: boolean;
      searchable?: boolean;
      allowClear?: boolean;
      selectDefaultValue?: string;
      
      // Booléen
      trueLabel?: string;
      falseLabel?: string;
      boolDefaultValue?: boolean;
    };
    options?: Array<{ label: string; value: string }>;
    conditions?: Array<{
      dependsOn: string;
      showWhen: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    }>;
    
    // 🎯 NOUVEAU: Capacités TreeBranchLeaf complètes
    capabilities?: {
      data?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
      };
      
      formula?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
        currentFormula?: {
          expression: string;
          variables: Record<string, { sourceField: string; type: string }>;
          allowManualOverride?: boolean;
        } | null;
      };
      
      condition?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
        currentConditions?: Array<{
          dependsOn: string;
          operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
          value: unknown;
          action: 'show' | 'hide' | 'enable' | 'disable';
        }> | null;
      };
      
      table?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
        currentTable?: {
          columns: Array<{ key: string; label: string; type: string }>;
          dataSource?: string;
          allowEdit?: boolean;
        } | null;
      };
      
      api?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
        currentAPI?: {
          endpoint: string;
          method: 'GET' | 'POST' | 'PUT' | 'DELETE';
          params?: Record<string, unknown>;
          responseField?: string;
          autoRefresh?: boolean;
        } | null;
      };
      
      link?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
        currentLinks?: Array<{
          targetField: string;
          linkType: 'mirror' | 'calculate' | 'lookup';
          expression?: string;
        }> | null;
      };
      
      markers?: {
        enabled: boolean;
        activeId?: string;
        instances?: Record<string, unknown>;
        currentMarkers?: Array<{
          id: string;
          name: string;
          color: string;
          icon?: string;
          condition?: string;
        }> | null;
      };
    };
  };
  value?: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  formData?: Record<string, unknown>;
  treeMetadata?: Record<string, unknown>; // Métadonnées du nœud TreeBranchLeaf
  treeId?: string; // ID de l'arbre TreeBranchLeaf pour les appels backend
  allNodes?: RawTreeNode[]; // 🔥 NOUVEAU: Tous les nœuds pour hiérarchie Cascader
  // 🎯 Props de validation pour les couleurs dynamiques
  isValidating?: boolean;
  hasValidationError?: boolean;
}

/**
 * Configuration étendue des types de champs basée sur TreeBranchLeaf
 */
const FIELD_TYPE_DEFINITIONS = {
  TEXT: {
    label: 'Texte',
    icon: '📝',
    category: 'input',
    variants: ['singleline', 'textarea'],
    validation: ['required', 'minLength', 'maxLength', 'pattern']
  },
  NUMBER: {
    label: 'Nombre',
    icon: '🔢', 
    category: 'input',
    variants: ['input', 'stepper', 'slider', 'dial'],
    validation: ['required', 'min', 'max', 'step']
  },
  SELECT: {
    label: 'Sélection',
    icon: '📋',
    category: 'choice', 
    variants: ['dropdown', 'radio', 'pills', 'segmented'],
    validation: ['required'],
    requiresOptions: true
,
  },
  CHECKBOX: {
    label: 'Case à cocher',
    icon: '☑️',
    category: 'choice',
    variants: ['checkbox', 'switch', 'segmented'],
    validation: ['required']
,
  },
  DATE: {
    label: 'Date',
    icon: '📅',
    category: 'temporal',
    variants: ['date', 'time', 'datetime', 'month', 'range'],
    validation: ['required', 'dateFormat', 'minDate', 'maxDate']
  },
  IMAGE: {
    label: 'Image',
    icon: '🖼️',
    category: 'media',
    variants: ['upload', 'camera', 'gallery'],
    validation: ['required', 'fileSize', 'fileType']
  },
  FILE: {
    label: 'Fichier',
    icon: '📎',
    category: 'media',
    variants: ['upload', 'dropzone'],
    validation: ['required', 'fileSize', 'fileType']
  },
  EMAIL: {
    label: 'Email',
    icon: '📧',
    category: 'input', 
    validation: ['required', 'email']
  },
  TEL: {
    label: 'Téléphone',
    icon: '📞',
    category: 'input',
    validation: ['required', 'phone']
  },
  TEXTAREA: {
    label: 'Texte long',
    icon: '📄',
    category: 'input',
    validation: ['required', 'minLength', 'maxLength']
  }
} as const;

// Helper pour gérer les tooltips personnalisés
const wrapWithCustomTooltip = (element: React.ReactElement, field: any): React.ReactElement => {
  // Vérifier si le champ a une configuration de tooltip personnalisé
  const appearanceConfig = field.appearanceConfig || {};
  const tooltipType = appearanceConfig.helpTooltipType;
  
  if (!tooltipType || tooltipType === 'none') {
    return element;
  }
  
  let tooltipContent: React.ReactNode = null;
  
  if (tooltipType === 'text' && appearanceConfig.helpTooltipText) {
    tooltipContent = <div>{appearanceConfig.helpTooltipText}</div>;
  } else if (tooltipType === 'image' && appearanceConfig.helpTooltipImage) {
    tooltipContent = (
      <div style={{ maxWidth: 300 }}>
        <img 
          src={appearanceConfig.helpTooltipImage} 
          alt="Aide" 
          style={{ maxWidth: '100%', height: 'auto' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  } else if (tooltipType === 'both' && (appearanceConfig.helpTooltipText || appearanceConfig.helpTooltipImage)) {
    tooltipContent = (
      <div>
        {appearanceConfig.helpTooltipText && (
          <div style={{ marginBottom: appearanceConfig.helpTooltipImage ? 8 : 0 }}>
            {appearanceConfig.helpTooltipText}
          </div>
        )}
        {appearanceConfig.helpTooltipImage && (
          <div style={{ maxWidth: 300 }}>
            <img 
              src={appearanceConfig.helpTooltipImage} 
              alt="Aide" 
              style={{ maxWidth: '100%', height: 'auto' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  }
  
  if (tooltipContent) {
    return (
      <Tooltip title={tooltipContent} placement="top">
        {element}
      </Tooltip>
    );
  }
  
  return element;
};

const TBLFieldRendererAdvanced: React.FC<TBLFieldAdvancedProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  formData = {},
  treeMetadata = {},
  treeId,
  allNodes = []
}) => {
  
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [localValue, setLocalValue] = useState(value);
  const [calculatedValue, setCalculatedValue] = useState<unknown>(null);
  const [conditionMet, setConditionMet] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  
  // 🔁 État pour le repeater (nombre d'instances)
  // ⚠️ Commencer à 0 instances au lieu de minItems - l'utilisateur clique sur "+" pour ajouter
  const [repeaterInstanceCount, setRepeaterInstanceCount] = useState(0);

  // 🔍 Hook tooltip TBL pour le champ
  const tooltipData = useTBLTooltip(field);

  // 🎯 Contexte de validation pour les couleurs dynamiques
  const { isValidation } = useTBLValidationContext();
  
  // 🧭 INITIALISATION MAPPING CASCADER: si une valeur est déjà présente au montage,
  // tenter d'initialiser window.TBL_CASCADER_NODE_IDS[field.id] pour permettre
  // à TBLSectionRenderer de reconstruire les champs conditionnels dès le premier rendu.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!value || !Array.isArray(value) || value.length === 0) return;
      if (window.TBL_CASCADER_NODE_IDS && window.TBL_CASCADER_NODE_IDS[field.id]) return;

      // Fonction de recherche récursive pour trouver le nœud correspondant au chemin
      const findNodeRecursive = (nodesToSearch, path) => {
        if (!path || path.length === 0) return null;
        
        const [currentLabel, ...restPath] = path;
        const foundNode = nodesToSearch.find(n => n.label === currentLabel);

        if (!foundNode) return null;

        // Si c'est le dernier élément du chemin, on a trouvé le nœud
        if (restPath.length === 0) {
          return foundNode;
        }

        // Sinon, on continue la recherche dans les enfants du nœud trouvé
        const children = allNodes.filter(n => n.parentId === foundNode.id);
        return findNodeRecursive(children, restPath);
      };

      // Démarrer la recherche depuis les options de premier niveau du champ
      const optionNode = findNodeRecursive(field.options, [...value]);

      if (optionNode) {
        window.TBL_CASCADER_NODE_IDS = window.TBL_CASCADER_NODE_IDS || {};
        window.TBL_CASCADER_NODE_IDS[field.id] = optionNode.id;
      }
    } catch (e) {
      console.error("Erreur lors de l'initialisation du mapping Cascader:", e);
    }
  }, [value, allNodes, field.id, field.options]);
  
  // ✅ NOUVEAU: Calculer hasTable AVANT d'appeler le hook pour pouvoir le passer en paramètre
  // 🔧 PRIORITÉ: field.hasTable (base de données) > capabilities.table.enabled (cache) > metadata.hasTable
  const hasTableCapability = useMemo(() => {
    // 1. Priorité absolue : field.hasTable vient directement de la DB après mise à jour
    if (typeof field.hasTable === 'boolean') {
      return field.hasTable;
    }
    
    // 2. Fallback : capabilities (peut être en cache)
    const capabilities = field.capabilities || {};
    if (capabilities.table?.enabled !== undefined) {
      return capabilities.table.enabled;
    }
    
    // 3. Dernier recours : metadata
    const metadata = treeMetadata || {};
    return metadata.hasTable || false;
  }, [field.hasTable, field.capabilities, treeMetadata]);
  
  // 🔗 Hook pour charger les options depuis un tableau lookup (si configuré)
  // ✅ NOUVEAU: On passe hasTableCapability pour que le hook vide les options quand le lookup est désactivé
  const repeaterTemplateNodeId = (field as Record<string, unknown> | undefined)?.repeaterTemplateNodeId as string | undefined;
  const originalFieldId = (field as Record<string, unknown> | undefined)?.originalFieldId as string | undefined;
  const metaOriginalNodeId = (field as Record<string, unknown> | undefined)?.metadata && (field as Record<string, any>).metadata?.originalNodeId as string | undefined;
  const sourceTemplateNodeId = (field as Record<string, any> | undefined)?.sourceTemplateId as string | undefined;
  // Détecteur d'UUID v4 simple
  const looksLikeUUID = (s?: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  // Éviter les IDs namespacés type node_123_abcdef
  const isNamespacedNodeLike = (s?: string) => typeof s === 'string' && /^node_\d+_[a-z0-9]+$/i.test(s);
  // Choisir le meilleur candidat d'ID pour le lookup table côté backend
  let lookupNodeId = repeaterTemplateNodeId || originalFieldId || metaOriginalNodeId || sourceTemplateNodeId || field.id;
  // Si l'ID courant ne ressemble pas à un UUID et qu'on a un candidat meilleur qui en est un, basculer dessus
  if (!looksLikeUUID(lookupNodeId)) {
    const candidates = [repeaterTemplateNodeId, originalFieldId, metaOriginalNodeId, sourceTemplateNodeId].filter(Boolean) as string[];
    const uuidCandidate = candidates.find(looksLikeUUID);
    if (uuidCandidate) {
      lookupNodeId = uuidCandidate;
    } else if (isNamespacedNodeLike(lookupNodeId) && candidates.length > 0) {
      // Dernier recours: prendre le premier candidat non-vide (même si pas UUID) pour éviter node_*
      lookupNodeId = candidates[0]!;
    }
  }

  const tableLookup = useTBLTableLookup(lookupNodeId, lookupNodeId, hasTableCapability);
  
  // Synchronisation avec la valeur externe
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Configuration complète du champ depuis TreeBranchLeaf
  const fieldConfig: TreeBranchLeafFieldConfig = useMemo(() => {
    const config = field.config || {};
    const metadata = treeMetadata || {};
    const capabilities = field.capabilities || {};
    
    // Récupérer la configuration depuis les métadonnées TreeBranchLeaf
    const nodeType = field.type?.toUpperCase() || 'TEXT';
    const baseSubType = field.type?.toUpperCase() || metadata.subType || nodeType; // 🎯 Type d'origine depuis Prisma
    
    // ✅ CORRECTION DYNAMIQUE: Si table lookup activé, transformer TEXT en SELECT
    const hasTableLookup = capabilities.table?.enabled || metadata.hasTable || false;
    const subType = hasTableLookup ? 'SELECT' : baseSubType; // 🔥 TRANSFORMATION DYNAMIQUE
    
    //  CORRECTION: Lire l'apparence depuis field.config ET metadata.appearance
    const appearance = {
      size: config.size || metadata.appearance?.size,
      width: config.width || metadata.appearance?.width,
      variant: config.variant || metadata.appearance?.variant,
      ...(metadata.appearance || {})
    };
    
    // 🔍 [DEBUG] Log spécifique pour l'apparence et le type
    // console.log(`🎨 [Apparence Renderer] Champ "${field.label}":`, { // ✨ Log réduit
    //   fieldType: field.type,
    //   nodeType,
    //   subType,
    //   metadataSubType: metadata.subType,
    //   appearance: appearance,
    //   metadataAppearance: metadata.appearance,
    //   hasSize: !!appearance.size,
    //   hasPlaceholder: !!appearance.placeholder,
    //   fullMetadata: metadata
    // });
    
    // 🎯 [DEBUG] Log des capacités actives
    const activeCapabilities = Object.entries(capabilities)
      .filter(([, capability]) => capability?.enabled)
      .map(([name]) => name);
    
    if (activeCapabilities.length > 0) {
      // console.log(`🎯 [CAPACITÉS RENDERER] Champ "${field.label}": ${activeCapabilities.join(', ')}`); // ✨ Log réduit
    }
    
    // console.log(`🎯 [TBLFieldRendererAdvanced] Champ "${field.label}":`, { // ✨ Log réduit
    //   fieldType: field.type,
    //   nodeType,
    //   subType,
    //   metadata,
    //   capabilities,
    //   finalFieldType: subType
    // });
    
    return {
      fieldType: subType,
      label: field.label || 'Champ',
      description: field.description || metadata.description,
      required: field.required || metadata.isRequired || false,
      visible: field.visible !== false && metadata.isVisible !== false,
      
      // Configurations spécifiques
      numberConfig: {
        min: config.min || metadata.min,
        max: config.max || metadata.max,
        step: config.step || metadata.step || 1,
        defaultValue: config.numberDefaultValue || metadata.numberDefaultValue || config.defaultValue || metadata.defaultValue,
        ui: appearance.variant || config.ui || 'input',
        unit: config.unit || metadata.unit,
        ...metadata.numberConfig
      },
      
      textConfig: {
        placeholder: field.placeholder || config.placeholder || metadata.placeholder,
        minLength: config.minLength || metadata.minLength,
        maxLength: config.maxLength || metadata.maxLength,
        mask: config.mask || metadata.mask, // 🔥 AJOUT: masque
        rows: config.rows || metadata.rows || 3,
        defaultValue: config.textDefaultValue || metadata.textDefaultValue || config.defaultValue || metadata.defaultValue,
        pattern: config.regex || metadata.regex,
        ...metadata.textConfig
      },
      
      selectConfig: {
        options: field.options || config.options || metadata.options || [],
        defaultValue: config.selectDefaultValue || metadata.selectDefaultValue || config.defaultValue || metadata.defaultValue,
        multiple: config.multiple || metadata.multiple || false,
        searchable: config.searchable || metadata.searchable !== false,
        allowClear: !field.required,
        ...metadata.selectConfig
      },
      
      checkboxConfig: {
        label: field.label,
        trueLabel: config.trueLabel || metadata.trueLabel,
        falseLabel: config.falseLabel || metadata.falseLabel,
        defaultValue: config.boolDefaultValue || metadata.boolDefaultValue || config.defaultValue || metadata.defaultValue,
        ...metadata.checkboxConfig
      },
      
      dateConfig: {
        format: config.format || metadata.format || 'DD/MM/YYYY',
        showTime: config.showTime || metadata.showTime || false,
        defaultValue: config.dateDefaultValue || metadata.dateDefaultValue || config.defaultValue || metadata.defaultValue,
        ...metadata.dateConfig
      },
      
      // Apparence
      appearance: {
        variant: appearance.variant,
        size: appearance.size || 'middle',
        width: appearance.width, // 🔥 AJOUT: largeur depuis config
        style: appearance.style || {},
        className: appearance.className || ''
      },
      
      // 🔥 AJOUT: Accès direct aux paramètres d'apparence pour compatibilité code existant
      size: appearance.size,
      width: appearance.width,
      variant: appearance.variant,
      
      // 🔥 AJOUT: Accès direct aux paramètres de texte pour compatibilité
      minLength: config.minLength,
      maxLength: config.maxLength,
      mask: config.mask,
      regex: config.regex,
      rows: config.rows,
      
      // 🔥 AJOUT: Accès direct aux paramètres de nombre pour compatibilité
      min: config.min,
      max: config.max,
      step: config.step,
      decimals: config.decimals,
      prefix: config.prefix,
      suffix: config.suffix,
      unit: config.unit,
      
      // 🎯 NOUVEAU: Capacités TreeBranchLeaf depuis les instances Prisma
      hasCondition: capabilities.condition?.enabled || metadata.hasCondition || false,
      hasFormula: capabilities.formula?.enabled || metadata.hasFormula || false,
      hasTable: capabilities.table?.enabled || metadata.hasTable || false,
      hasAPI: capabilities.api?.enabled || metadata.hasAPI || false,
      hasMarkers: capabilities.markers?.enabled || metadata.hasMarkers || false,
      
      // Configuration des capacités (données actives)
      conditionConfig: capabilities.condition?.currentConditions ? {
        branches: capabilities.condition.currentConditions.map(cond => ({
          label: `Condition sur ${cond.dependsOn}`,
          targetField: cond.dependsOn,
          operator: cond.operator,
          value: cond.value,
          action: cond.action
        }))
      } : metadata.conditionConfig || {},
      
      formulaConfig: capabilities.formula?.currentFormula || metadata.formulaConfig || {},
      tableConfig: capabilities.table?.currentTable || metadata.tableConfig || {},
      apiConfig: capabilities.api?.currentAPI || metadata.apiConfig || {},
      markersConfig: capabilities.markers?.currentMarkers ? {
        markers: capabilities.markers.currentMarkers
      } : metadata.markersConfig || {}
    };
  }, [field, treeMetadata]);

  // Gestion des conditions du champ (système useTBLData)
  useEffect(() => {
    if (!field.conditions || field.conditions.length === 0) {
      setConditionMet(true);
      return;
    }

    let isVisible = true;
    
    // Vérifier chaque condition
    for (const condition of field.conditions) {
      const dependentValue = formData[condition.dependsOn];
      let conditionResult = false;
      
      // console.log(`🔍 [TBLFieldRendererAdvanced] Condition pour "${field.label}":`, { // ✨ Log réduit
      //   dependentValue,
      //   showWhen: condition.showWhen,
      //   operator: condition.operator
      // });
      switch (condition.operator) {
        case 'equals':
          conditionResult = dependentValue === condition.showWhen;
          break;
        case 'not_equals':
          conditionResult = dependentValue !== condition.showWhen;
          break;
        case 'contains':
          conditionResult = String(dependentValue || '').includes(String(condition.showWhen));
          break;
        case 'greater_than':
          conditionResult = Number(dependentValue) > Number(condition.showWhen);
          break;
        case 'less_than':
          conditionResult = Number(dependentValue) < Number(condition.showWhen);
          break;
        default:
          conditionResult = true;
      }
      
      // console.log(`🔍 [TBLFieldRendererAdvanced] Résultat condition: ${conditionResult}`); // ✨ Log réduit
      
      if (!conditionResult) {
        isVisible = false;
        break;
      }
    }
    
    // console.log(`🔍 [TBLFieldRendererAdvanced] Champ "${field.label}" visible: ${isVisible}`); // ✨ Log réduit
    setConditionMet(isVisible);
  }, [field.conditions, formData, field.label]);

  // Gestion des formules TreeBranchLeaf
  useEffect(() => {
    if (!fieldConfig.hasFormula || !fieldConfig.formulaConfig?.formula) {
      setCalculatedValue(localValue);
      return;
    }

    try {
      const formula = fieldConfig.formulaConfig.formula;
      const variables = fieldConfig.formulaConfig.variables || {};
      
      // Remplacer les variables dans la formule
      let evaluatedFormula = formula;
      Object.entries(variables).forEach(([varName, varConfig]) => {
        const sourceField = varConfig.sourceField;
        const sourceValue = formData[sourceField] || 0;
        const processedValue = varConfig.type === 'number' ? Number(sourceValue) : String(sourceValue);
        evaluatedFormula = evaluatedFormula.replace(new RegExp(`\\$${varName}`, 'g'), String(processedValue));
      });
      if (fieldConfig.fieldType === 'NUMBER' && evaluatedFormula.match(/^[\d+\-*/\s().]+$/)) {
        const result = Function(`"use strict"; return (${evaluatedFormula})`)();
        setCalculatedValue(result);
      } else {
        setCalculatedValue(evaluatedFormula);
      }
    } catch (error) {
      console.warn('Erreur d\'évaluation de formule:', error); // ✨ Log réduit
      setCalculatedValue(localValue);
    }
  }, [fieldConfig, formData, localValue]);

  // Validation complète TreeBranchLeaf
  useEffect(() => {
    const fieldTypeDef = FIELD_TYPE_DEFINITIONS[fieldConfig.fieldType as keyof typeof FIELD_TYPE_DEFINITIONS];
    if (!fieldTypeDef) return;

    let error: string | null = null;
    const valueToCheck = fieldConfig.hasFormula ? calculatedValue : localValue;

    // Message obligatoire en VERT par défaut, ROUGE seulement pendant validation PDF
    if (fieldConfig.required && (valueToCheck === null || valueToCheck === undefined || valueToCheck === '')) {
      if (isValidation) {
        error = 'Ce champ est obligatoire'; // Rouge pendant validation
      } else {
        error = 'Ce champ est obligatoire'; // Vert par défaut (sera stylé différemment)
      }
    }

    // Validations spécifiques par type
    if (valueToCheck !== null && valueToCheck !== undefined && valueToCheck !== '' && !error) {
      switch (fieldConfig.fieldType) {
        case 'NUMBER': {
          const numVal = Number(valueToCheck);
          if (isNaN(numVal)) {
            error = 'Veuillez saisir un nombre valide';
          } else {
            const min = fieldConfig.numberConfig?.min;
            const max = fieldConfig.numberConfig?.max;
            if (min !== undefined && numVal < min) {
              error = `La valeur doit être supérieure ou égale à ${min}`;
            }
            if (max !== undefined && numVal > max) {
              error = `La valeur doit être inférieure ou égale à ${max}`;
            }
          }
          break;
        }
          
        case 'EMAIL': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(valueToCheck))) {
            error = 'Veuillez saisir un email valide';
          }
          break;
        }
          
        case 'TEXT':
        case 'TEXTAREA': {
          const textVal = String(valueToCheck);
          // 🔥 UTILISATION DIRECTE DES PARAMÈTRES PRISMA
          const minLength = fieldConfig.textConfig?.minLength || fieldConfig.minLength;
          const maxLength = field.text_maxLength || fieldConfig.textConfig?.maxLength || fieldConfig.maxLength;
          const pattern = fieldConfig.textConfig?.pattern || fieldConfig.regex || fieldConfig.pattern;
          
          if (minLength && textVal.length < minLength) {
            error = `Le texte doit contenir au moins ${minLength} caractères`;
          }
          if (maxLength && textVal.length > maxLength) {
            error = `Le texte ne peut pas dépasser ${maxLength} caractères`;
          }
          if (pattern && !new RegExp(pattern).test(textVal)) {
            error = 'Le format du texte n\'est pas valide';
          }
          break;
        }
          
        case 'TEL': {
          const phoneRegex = /^[\d\s+()-]+$/;
          if (!phoneRegex.test(String(valueToCheck))) {
            error = 'Veuillez saisir un numéro de téléphone valide';
          }
          break;
        }
      }
    }

    setValidationError(error);
  }, [fieldConfig, calculatedValue, localValue, isValidation, field.text_maxLength]);

  // Gestionnaire de changement unifié
  const handleChange = (newValue: unknown) => {
    // ⚠️ DIAGNOSTIC : Champ dans section DATA (read-only) ?
    if (!onChange) {
      console.error(`❌ [${field.label}] onChange est undefined - Le champ est probablement dans une SECTION DE DONNÉES (read-only) !`);
      console.error(`💡 SOLUTION : Déplacez "${field.label}" dans une section normale (pas isDataSection) pour permettre l'édition.`);
      return;
    }
    
    setLocalValue(newValue);
    onChange(newValue);

    // 🔥 CRITICAL FIX: Si ce champ utilise tableLookup, stocker AUSSI la valeur avec le nodeId du SELECT
    // Le backend `interpretTable` cherche les valeurs dans formData[selectNodeId], pas formData[field.id]
    if (fieldConfig.hasTable && field.table_activeId && formData) {
      console.log(`🔗 [${field.label}] Table Lookup détecté - Stockage duppliqué avec table_activeId: ${field.table_activeId}`);
      
      // Trouver le(s) SELECT node(s) configuré(s) pour cette table
      // Le table_activeId pointe vers la table, mais les SELECTs ont leurs propres IDs
      // On doit chercher dans allNodes les nodes qui ont une TreeBranchLeafSelectConfig pointant vers cette table
      const tableId = field.table_activeId;
      
      // Parcourir tous les nœuds pour trouver les SELECT liés à cette table
      if (allNodes && allNodes.length > 0) {
        allNodes.forEach(node => {
          // Vérifier si ce node est un SELECT lié à notre table
          if (node.type?.includes('SELECT') || node.nodeType === 'leaf_field') {
            // Si le node a une reference vers notre table dans ses capacités
            const nodeTableId = node.table_activeId;
            if (nodeTableId === tableId) {
              console.log(`✅ [${field.label}] Trouvé SELECT node ${node.id} (${node.label}) lié à la table ${tableId}`);
              // Stocker la valeur AVEC LE NODE ID du SELECT
              onChange(newValue); // Stockage original avec field.id (déjà fait au-dessus)
              // Maintenant on doit aussi écrire dans formData[node.id] mais on n'a pas d'accès direct
              // SOLUTION: Appeler un callback parent si disponible, ou utiliser un setter global
              console.log(`⚠️ [${field.label}] ATTENTION: Impossible de stocker directement dans formData[${node.id}]`);
              console.log(`💡 SOLUTION: Le parent (TBLSectionRenderer) doit gérer ce cas`);
            }
          }
        });
      }
    }
  };

  // Rendu conditionnel basé sur les conditions TreeBranchLeaf
  if (!conditionMet || !fieldConfig.visible) {
    return null;
  }

  // Affichage des capacités actives TreeBranchLeaf
  const renderCapabilityBadges = () => {
    // ❌ MASQUÉ : Ces badges ne doivent s'afficher que dans l'éditeur TreeBranchLeaf,
    // pas dans le formulaire utilisateur final
    return null;
  };

  // Rendu du champ selon le type et la configuration TreeBranchLeaf
  const renderFieldInput = () => {
    // (La gestion Table Lookup est traitée plus bas via le type SELECT et ne doit pas préempter
    // les champs avec capacités Data/Formula qui doivent afficher une valeur calculée.)

    const fieldNodeId = (field as any).nodeId || field.id;
    const resolveBackendNodeId = (f: any): string | undefined => {
      try {
        const meta = (f && f.metadata) || {};
        let cid = meta?.copiedFromNodeId;
        if (typeof cid === 'string' && cid.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(cid);
            if (Array.isArray(arr) && arr.length > 0) cid = arr[0];
          } catch { /* ignore */ }
        }
        if (Array.isArray(cid) && cid.length > 0) cid = cid[0];
        if (cid) return String(cid);
        if (meta?.originalNodeId) return String(meta.originalNodeId);
        if (f?.nodeId) return String(f.nodeId);
        if (f?.id) return String(f.id);
      } catch (e) { console.warn('[resolveBackendNodeId] erreur:', e); }
      return undefined;
    };

    const resolveNodeIdFromSourceRef = (
      sourceRef?: string,
      options?: {
        fallbackNodeId?: string;
        dataActiveId?: string;
        tableActiveId?: string;
      }
    ): string => {
      const fallbackNodeId = options?.fallbackNodeId || fieldNodeId;
      const ref = typeof sourceRef === 'string' ? sourceRef.trim() : '';
      if (!ref) {
        return options?.dataActiveId || fallbackNodeId;
      }

      if (/^(condition:|formula:|node-formula:)/.test(ref)) {
        return fallbackNodeId;
      }

      if (ref.startsWith('@value.')) {
        const extracted = ref.slice('@value.'.length);
        return extracted || fallbackNodeId;
      }

      if (ref.startsWith('@table.')) {
        let candidate = options?.dataActiveId;
        if (!candidate || (options?.tableActiveId && candidate === options.tableActiveId)) {
          candidate = fallbackNodeId;
        }
        if (candidate && !looksLikeUUID(candidate) && looksLikeUUID(fallbackNodeId)) {
          return fallbackNodeId;
        }
        return candidate || fallbackNodeId;
      }

      if (/^variable:/.test(ref) || /^value:/.test(ref)) {
        const extracted = ref.split(':')[1];
        if (extracted) {
          return extracted;
        }
      }

      if (!ref.includes(':') && looksLikeUUID(ref)) {
        return ref;
      }

      if (ref.includes(':')) {
        const candidate = ref.split(':')[1];
        if (candidate && looksLikeUUID(candidate)) {
          return candidate;
        }
      }

      return options?.dataActiveId || fallbackNodeId;
    };

    // 🚀 PRIORITÉ 1: Champs TreeBranchLeaf intelligents (générés dynamiquement)
    if (field.isTreeBranchLeafSmart && (field.hasData || field.hasFormula)) {
      const caps = field.capabilities || {};

      // 1) Si une formule est disponible, on la privilégie
      const formulaId = caps?.formula?.activeId 
        || (caps?.formula?.instances && Object.keys(caps.formula.instances).length > 0 ? Object.keys(caps.formula.instances)[0] : undefined);
      const hasFormulaConfig = Boolean(formulaId || caps?.formula?.currentFormula);
      if (hasFormulaConfig && formulaId) {
        if (!treeId) {
          return <span style={{ color: '#888' }}>---</span>;
        }
        
        // ✅ NOUVEAU SYSTÈME : BackendValueDisplay
        return (
          <BackendValueDisplay
            nodeId={resolveBackendNodeId(field) || field.id}
            treeId={treeId}
            formData={formData}
            unit={field.config?.unit}
            precision={field.config?.decimals || 2}
            placeholder="Calcul automatique..."
          />
        );
      }

      // 2) Sinon, si une variable (data) est disponible, l'utiliser
      const variableId = caps?.data?.activeId 
        || (caps?.data?.instances && Object.keys(caps.data.instances).length > 0 ? Object.keys(caps.data.instances)[0] : undefined);
      if (variableId) {
        // Si l'instance data pointe une sourceRef explicite (condition/formula/@value), router directement dessus
        const dataInstance = caps?.data?.instances?.[variableId] as { metadata?: { sourceType?: string; sourceRef?: string; fixedValue?: unknown } } | undefined;
        const meta = dataInstance?.metadata;
        if (meta?.sourceType === 'tree' && typeof meta.sourceRef === 'string' && meta.sourceRef) {
          const resolvedNodeId = resolveNodeIdFromSourceRef(meta.sourceRef, {
            dataActiveId: variableId,
            tableActiveId: caps?.table?.activeId as string | undefined,
            fallbackNodeId: fieldNodeId
          });
          
          if (!treeId || !resolvedNodeId) {
            return <span style={{ color: '#888' }}>---</span>;
          }
          
          // ✅ NOUVEAU SYSTÈME : BackendValueDisplay
          return (
            <BackendValueDisplay
              nodeId={resolvedNodeId}
              treeId={treeId}
              formData={formData}
              unit={field.config?.unit}
              precision={field.config?.decimals || 2}
              placeholder="Calcul automatique..."
            />
          );
        }
        
        if (!treeId) {
          return <span style={{ color: '#888' }}>---</span>;
        }
        
        // ✅ NOUVEAU SYSTÈME : BackendValueDisplay
        return (
          <BackendValueDisplay
            nodeId={resolveBackendNodeId(field) || field.id}
            treeId={treeId}
            formData={formData}
            unit={field.config?.unit}
            precision={field.config?.decimals || 2}
            placeholder="Calcul automatique..."
          />
        );
      }

      // 3) Aucun mapping exploitable → placeholder
      return (
        <span style={{ color: '#999' }}>---</span>
      );
    }
    
    // 🎯 NOUVEAU SYSTÈME TreeBranchLeaf : Vérifier les capacités Data et Formula d'abord
    const capabilities = field.capabilities || {};
    const dataInstances = capabilities.data?.instances;
    const hasDataCapability = Boolean(
      capabilities.data && (
        capabilities.data.enabled !== false ||
        capabilities.data.activeId ||
        (dataInstances && Object.keys(dataInstances).length > 0)
      )
    );
    
    // ✨ PRIORITÉ 1: Capacité Data (données dynamiques depuis TreeBranchLeafNodeVariable)
    if (hasDataCapability) {
      
      // Récupérer la configuration de la variable active
      const activeDataId = capabilities.data?.activeId || (dataInstances ? Object.keys(dataInstances)[0] : undefined);
      const dataInstance = activeDataId && dataInstances ? dataInstances[activeDataId] as {
        metadata?: {
          sourceType?: string;
          sourceRef?: string;
          fixedValue?: unknown;
        };
        displayFormat?: string;
        unit?: string;
        precision?: number;
      } : undefined;
      if (dataInstance && dataInstance.metadata) {
        const { sourceType: configSourceType, sourceRef: configSourceRef, fixedValue } = dataInstance.metadata;
        
        // Mode arborescence (déléguer à la variable du nœud pour couvrir formules ET conditions)
        if (configSourceType === 'tree' && configSourceRef) {
        const metaFormula = capabilities?.formula?.currentFormula as FormulaConfigLocal | undefined;
        let variablesDef = metaFormula?.variables ? Object.fromEntries(Object.entries(metaFormula.variables).map(([k,v]) => [k, { sourceField: (v as VariableDefLocal).sourceField, type: (v as VariableDefLocal).type }])) : undefined;
        // Fallback: certaines variables data peuvent exposer un metadata.variables (structure similaire)
        if (!variablesDef && (dataInstance as { metadata?: { variables?: Record<string, { sourceField: string; type?: string }> } })?.metadata?.variables) {
          const dv = (dataInstance as { metadata?: { variables?: Record<string, { sourceField: string; type?: string }> } }).metadata?.variables || {};
          variablesDef = Object.fromEntries(Object.entries(dv).map(([k,v]) => [k,{ sourceField: v.sourceField, type: v.type }]));
        }
        
        if (!treeId) {
          return <span style={{ color: '#888' }}>---</span>;
        }
        const resolvedNodeId = resolveNodeIdFromSourceRef(configSourceRef, {
          dataActiveId: capabilities.data?.activeId,
          tableActiveId,
          fallbackNodeId: fieldNodeId
        });
        
        // ✅ NOUVEAU SYSTÈME : BackendValueDisplay
        return (
          <BackendValueDisplay
            nodeId={resolvedNodeId}
            treeId={treeId}
            formData={formData}
            unit={dataInstance.unit as string | undefined}
            precision={dataInstance.precision as number | undefined}
            placeholder="Calcul en cours..."
          />
        );
      }
        
        // Mode valeur fixe
        if (configSourceType === 'fixed' && fixedValue !== undefined) {
          return (
            <Input 
              value={String(fixedValue)} 
              disabled 
              style={{ backgroundColor: '#f5f5f5' }}
            />
          );
        }
      }

      if (!treeId) {
        return <span style={{ color: '#888' }}>---</span>;
      }

      return (
        <BackendValueDisplay
          nodeId={resolveBackendNodeId(field) || field.id}
          treeId={treeId}
          formData={formData}
          unit={(dataInstance?.unit as string | undefined) ?? field.config?.unit}
          precision={((dataInstance?.precision as number | undefined) ?? field.config?.decimals) ?? 2}
          placeholder="Calcul en cours..."
        />
      );
    }
    
    const hasFormulaCapability = Boolean(
      (capabilities.formula && (
        capabilities.formula.enabled !== false ||
        capabilities.formula.activeId ||
        (capabilities.formula.instances && Object.keys(capabilities.formula.instances).length > 0) ||
        capabilities.formula.currentFormula
      )) ||
      fieldConfig.hasFormula ||
      field.hasFormula
    );
    const manualOverrideAllowed = fieldConfig.formulaConfig?.allowManualOverride === true;

    // ✨ PRIORITÉ 2: Capacité Formula (formules directes)
    if (hasFormulaCapability && !manualOverrideAllowed) {
      if (!treeId) {
        return <span style={{ color: '#888' }}>---</span>;
      }
      
      // ✅ NOUVEAU SYSTÈME : BackendValueDisplay
      return (
        <BackendValueDisplay
          nodeId={resolveBackendNodeId(field) || field.id}
          treeId={treeId}
          formData={formData}
          unit={fieldConfig.unit}
          precision={fieldConfig.decimals || 4}
          placeholder="Calcul en cours..."
        />
      );
    }
    
    // 🔥 PRIORITÉ 2B: FALLBACK SOURCEREF - Si le champ a une sourceRef directe (condition/formula/node-formula/table)
    // C'est pour les champs comme "Prix Kwh" et "M façade" qui ont sourceRef mais pas de capabilities.data
    const fieldSourceRef = (field as any).sourceRef || (field as any).metadata?.sourceRef;
    if (fieldSourceRef && typeof fieldSourceRef === 'string' && /^(condition:|formula:|node-formula:|@table\.|@value\.)/.test(fieldSourceRef)) {
      if (!treeId) {
        return <span style={{ color: '#888' }}>---</span>;
      }
      
      console.log(`🔥 [FALLBACK DIRECT SOURCEREF] Champ "${fieldConfig.label}" utilise sourceRef directe: ${fieldSourceRef}, nodeId: ${fieldNodeId}`);
      
      const resolvedNodeId = resolveNodeIdFromSourceRef(fieldSourceRef, {
        dataActiveId: capabilities.data?.activeId,
        tableActiveId,
        fallbackNodeId: fieldNodeId
      });

      // ✅ NOUVEAU SYSTÈME : BackendValueDisplay
      return (
        <BackendValueDisplay
          nodeId={resolvedNodeId}
          treeId={treeId}
          formData={formData}
          unit={fieldConfig.unit}
          precision={fieldConfig.decimals || 4}
          placeholder="Calcul..."
        />
      );
    }
    
    // ✨ FALLBACK: Logique traditionnelle pour les champs sans capacités TreeBranchLeaf
    const finalValue = fieldConfig.hasFormula ? calculatedValue : localValue;
    const isReadOnly = fieldConfig.hasFormula && !fieldConfig.formulaConfig?.allowManualOverride;
    const isDisabled = disabled || isReadOnly;

    // 🎨 Construction du style avec largeur configurée
    const appearanceStyle = fieldConfig.appearance?.style || {};
    
    // 🎯 FORCE: TOUS LES CHAMPS À 150PX - PAS DE DIFFÉRENCE DE TAILLE
    const widthStyle: React.CSSProperties = {
      width: '150px'
    };

    const commonProps = {
      disabled: isDisabled,
      // 🔥 PLACEHOLDER DYNAMIQUE PRISMA - PRIORITÉ AUX DONNÉES DIRECTES
      placeholder: field.text_placeholder || field.placeholder || fieldConfig.textConfig?.placeholder || fieldConfig.placeholder || `Saisissez ${fieldConfig.label.toLowerCase()}`,
      status: validationError && isValidation ? 'error' as const : validationError && !isValidation ? 'success' as const : undefined,
      // 🔥 TAILLE FIXE pour tous les champs
      size: 'middle' as const,
      style: { 
        ...appearanceStyle, 
        ...widthStyle 
      },
      className: fieldConfig.appearance?.className || fieldConfig.className || ''
    };

    // 🔍 Debug du style appliqué
    if (Object.keys(widthStyle).length > 0) {
      // console.log(`🎨 [Style Apply] Champ "${fieldConfig.label}":`, { // ✨ Log réduit
      //   widthStyle: widthStyle,
      //   finalStyle: commonProps.style
      // });
    }

    switch (fieldConfig.fieldType) {
      case 'TEXT':
        return wrapWithCustomTooltip(
          <Input
            {...commonProps}
            value={finalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            // 🔥 LONGUEUR MAX DYNAMIQUE PRISMA - PRIORITÉ AUX DONNÉES DIRECTES
            maxLength={field.text_maxLength || fieldConfig.textConfig?.maxLength || fieldConfig.maxLength}
            showCount={!!(field.text_maxLength || fieldConfig.textConfig?.maxLength || fieldConfig.maxLength)}
            // 🔥 PATTERN/REGEX DYNAMIQUE PRISMA
            pattern={fieldConfig.textConfig?.pattern || fieldConfig.regex || fieldConfig.pattern}
          />,
          field
        );

      case 'TEXTAREA':
        return wrapWithCustomTooltip(
          <TextArea
            {...commonProps}
            value={finalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            rows={fieldConfig.textConfig?.rows || 3}
            // 🔥 LONGUEUR MAX DYNAMIQUE PRISMA TEXTAREA
            maxLength={fieldConfig.textConfig?.maxLength || fieldConfig.maxLength}
            showCount={!!(fieldConfig.textConfig?.maxLength || fieldConfig.maxLength)}
            // 🔥 PATTERN/REGEX DYNAMIQUE PRISMA TEXTAREA
            pattern={fieldConfig.textConfig?.pattern || fieldConfig.regex || fieldConfig.pattern}
          />,
          field
        );

      case 'NUMBER':
        // 🔥 VARIANT DYNAMIQUE PRISMA NUMBER avec fallback
        if ((fieldConfig.appearance?.variant || fieldConfig.variant) === 'slider' || fieldConfig.numberConfig?.ui === 'slider') {
          return (
            <div>
              <Slider
                disabled={isDisabled}
                value={Number(finalValue) || fieldConfig.numberConfig?.defaultValue || fieldConfig.defaultValue || 0}
                onChange={handleChange}
                // 🔥 PARAMÈTRES DYNAMIQUES PRISMA SLIDER avec fallback
                min={fieldConfig.numberConfig?.min || fieldConfig.min}
                max={fieldConfig.numberConfig?.max || fieldConfig.max}
                step={fieldConfig.numberConfig?.step || fieldConfig.step || 1}
                marks={fieldConfig.numberConfig?.marks || fieldConfig.marks}
                tooltip={{ 
                  formatter: (value) => `${fieldConfig.numberConfig?.prefix || fieldConfig.prefix || ''}${value}${fieldConfig.numberConfig?.suffix || fieldConfig.suffix || fieldConfig.numberConfig?.unit || fieldConfig.unit || ''}` 
                }}
              />
              <div className="text-center text-sm text-gray-500 mt-1">
                {fieldConfig.numberConfig?.prefix || fieldConfig.prefix || ''}{finalValue || fieldConfig.numberConfig?.defaultValue || fieldConfig.defaultValue || 0}{fieldConfig.numberConfig?.suffix || fieldConfig.suffix || fieldConfig.numberConfig?.unit || fieldConfig.unit || ''}
              </div>
            </div>
          );
        }
        
        return (
          <InputNumber
            {...commonProps}
            value={finalValue}
            onChange={(val)=>{
              handleChange(val);
            }}
            min={fieldConfig.numberConfig?.min || fieldConfig.min}
            max={fieldConfig.numberConfig?.max || fieldConfig.max}
            step={fieldConfig.numberConfig?.step || fieldConfig.step || 1}
            style={commonProps.style}
            formatter={fieldConfig.numberConfig?.formatter || fieldConfig.formatter}
            parser={fieldConfig.numberConfig?.parser || fieldConfig.parser}
            addonBefore={fieldConfig.numberConfig?.prefix || fieldConfig.prefix}
            addonAfter={fieldConfig.numberConfig?.suffix || fieldConfig.suffix || fieldConfig.numberConfig?.unit || fieldConfig.unit}
            precision={fieldConfig.numberConfig?.decimals || fieldConfig.decimals}
          />
        );

      case 'SELECT': {
        // 🔥 OPTIONS DYNAMIQUES - PRIORITÉ: 1) Table Lookup (si activé), 2) Prisma Config, 3) Fallback
        const staticOptions = fieldConfig.selectConfig?.options || fieldConfig.options || [];
        let baseOptions = (fieldConfig.hasTable && tableLookup.options.length > 0) ? tableLookup.options : staticOptions;

        // 🔥 NOUVEAU: Filtrage conditionnel des options de lookup
        if (fieldConfig.hasTable && field.capabilities?.table?.currentTable?.meta?.lookup) {
          const lookupConfig = field.capabilities.table.currentTable.meta.lookup;
          const filterConfig = lookupConfig.filterConditions;
          
          if (filterConfig?.enabled && filterConfig.conditions && filterConfig.conditions.length > 0 && 
              tableLookup.tableData && tableLookup.config) {
            
            // Filtrer chaque option individuellement
            baseOptions = baseOptions.filter(option => 
              evaluateFilterConditions(
                option,
                filterConfig.conditions,
                formData,
                tableLookup.tableData!,
                tableLookup.config!,
                filterConfig.filterLogic || 'AND'
              )
            );
          }
        }
        
        const finalOptions = baseOptions;

        // 🩹 PATCH: Enrichir les options sans id avec le nodeId correspondant depuis allNodes
        // Contexte: les champs copiés (ex: "Versant (Copie 1)") ont souvent des options sans id,
        // ce qui empêche la détection de hiérarchie et l'utilisation du Cascader (donc pas d'injection).
        // Stratégie: pour chaque option sans id, chercher un nœud enfant (leaf_option/leaf_option_field)
        // du champ courant dont le label correspond. Si trouvé, utiliser son id comme option.id.
        const enrichedOptions = finalOptions.map((opt: any) => {
          if (opt && (opt.id || opt.nodeId)) return opt; // déjà enrichi
          try {
            const candidates = allNodes.filter(n =>
              (n.type === 'leaf_option' || n.type === 'leaf_option_field') &&
              n.parentId === field.id &&
              (n.label === opt.label || n.option_label === opt.label || n.value === opt.value)
            );
            if (candidates.length > 0) {
              const node = candidates.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
              return { ...opt, id: node.id, nodeId: node.id };
            }
          } catch {
            /* noop: enrich failure */
          }
          return opt;
        });
        
        // 🔍 DEBUG CASCADE COPIÉ - Vérifier les options disponibles
        if (field.type === 'cascade') {
          console.log(`🔍 [CASCADE FIELD RENDER] "${field.label}":`, {
            fieldId: field.id,
            fieldType: field.type,
            hasFieldOptions: !!field.options,
            fieldOptionsCount: field.options?.length || 0,
            hasFieldConfigOptions: !!fieldConfig.options,
            fieldConfigOptionsCount: fieldConfig.options?.length || 0,
            hasFieldConfigSelectOptions: !!fieldConfig.selectConfig?.options,
            fieldConfigSelectOptionsCount: fieldConfig.selectConfig?.options?.length || 0,
            hasTableLookup: fieldConfig.hasTable,
            tableLookupOptionsCount: tableLookup.options.length,
            finalOptionsCount: finalOptions.length,
            isRepeaterInstance: (field as any).isRepeaterInstance,
            repeaterTemplateNodeId: (field as any).repeaterTemplateNodeId
          });
        }
        
        // 🔥 NOUVEAU: Détecter si le champ a une hiérarchie (sous-options imbriquées)
        // Récupérer les IDs des options du champ
  const optionIds = enrichedOptions.map((opt: any) => opt.id || opt.nodeId || opt.value);
        
        // Chercher si des leaf_option ont comme parentId un ID d'option du champ
        const hasHierarchy = allNodes.length > 0 && optionIds.length > 0 && allNodes.some(node => 
          optionIds.includes(node.parentId) && 
          (node.type === 'leaf_option' || node.type === 'leaf_option_field')
        );
        
        // 🔥 DEBUG: Log de détection hiérarchie
        console.log(`🔍 [CASCADER DEBUG] Champ "${field.label}":`, {
          fieldId: field.id,
          allNodesLength: allNodes.length,
          optionIds,
          hasHierarchy,
          childrenNodes: allNodes.filter(node => optionIds.includes(node.parentId)),
          allNodesTypes: [...new Set(allNodes.map(n => n.type))]
        });
        
        // 🔥 CASCADER: Si hiérarchie détectée, utiliser Cascader au lieu de Select
        if (hasHierarchy) {
          // Construire les options Cascader : Niveau 1 = options du champ, Niveaux suivants = sous-options depuis allNodes
          const buildRecursive = (parentId: string, depth = 0): any[] => {
            if (depth > 20) return []; // Protection anti-boucle
            
            return allNodes
              .filter(node => 
                node.parentId === parentId && 
                (node.type === 'leaf_option' || node.type === 'leaf_option_field')
              )
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(node => {
                const children = buildRecursive(node.id, depth + 1);
                return {
                  value: node.label || node.id, // ⚠️ Utiliser le label comme valeur (match avec options du champ)
                  label: node.label || node.id,
                  nodeId: node.id,
                  children: children.length > 0 ? children : undefined
                };
              });
          };
          
          // Construire l'arbre complet: options du champ + leurs sous-options
          const cascaderOptions = enrichedOptions.map((option: any) => {
            const optionId = option.id || option.value;
            const children = buildRecursive(optionId);
            
            return {
              value: option.value || option.label,
              label: option.label || option.value,
              nodeId: optionId,
              children: children.length > 0 ? children : undefined
            };
          });
          
          console.log(`✅ [CASCADER] Options construites pour "${field.label}":`, cascaderOptions);
          
          return (
            <Cascader
              {...commonProps}
              value={finalValue ? [finalValue] : undefined}
              onChange={(selectedValues, selectedOptions) => {
                // Cascader retourne un tableau de valeurs (chemin complet)
                // On prend la dernière valeur (feuille sélectionnée)
                const lastValue = selectedValues && selectedValues.length > 0 
                  ? selectedValues[selectedValues.length - 1] 
                  : null;
                if (typeof window !== 'undefined') {
                  if (lastValue && selectedOptions && selectedOptions.length > 0) {
                    const lastOption = selectedOptions[selectedOptions.length - 1] as { nodeId?: string } | undefined;
                    if (lastOption?.nodeId) {
                      window.TBL_CASCADER_NODE_IDS = window.TBL_CASCADER_NODE_IDS || {};
                      window.TBL_CASCADER_NODE_IDS[field.id] = lastOption.nodeId;
                      // ✅ Fallback persistant pour l'injection: stocker aussi dans TBL_FORM_DATA
                      try {
                        if (window.TBL_FORM_DATA) {
                          (window.TBL_FORM_DATA as any)[`${field.id}__selectedNodeId`] = lastOption.nodeId;
                        }
                      } catch { /* noop */ }
                    } else if (window.TBL_CASCADER_NODE_IDS) {
                      delete window.TBL_CASCADER_NODE_IDS[field.id];
                      try {
                        if (window.TBL_FORM_DATA) {
                          delete (window.TBL_FORM_DATA as any)[`${field.id}__selectedNodeId`];
                        }
                      } catch { /* noop */ }
                    }
                  } else if (window.TBL_CASCADER_NODE_IDS) {
                    delete window.TBL_CASCADER_NODE_IDS[field.id];
                    try {
                      if (window.TBL_FORM_DATA) {
                        delete (window.TBL_FORM_DATA as any)[`${field.id}__selectedNodeId`];
                      }
                    } catch { /* noop */ }
                  }
                }
                handleChange(lastValue);
              }}
              options={cascaderOptions}
              style={commonProps.style}
              placeholder={commonProps.placeholder}
              disabled={isDisabled}
              showSearch={{
                filter: (inputValue, path) =>
                  path.some(option => 
                    option.label.toString().toLowerCase().includes(inputValue.toLowerCase())
                  )
              }}
              expandTrigger="hover"
              changeOnSelect={false}
              displayRender={(labels) => labels.join(' > ')}
            />
          );
        }
        
        // 🔥 VARIANT DYNAMIQUE PRISMA SELECT avec fallback
        if ((fieldConfig.appearance?.variant || fieldConfig.variant) === 'radio') {
          return (
            <Radio.Group
              disabled={isDisabled}
              value={finalValue}
              onChange={(e) => handleChange(e.target.value)}
              size={fieldConfig.appearance?.size}
            >
              {finalOptions.map((option) => (
                <Radio 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          );
        }
        
        // SELECT classique (sans hiérarchie)
        return (
          <Select
            {...commonProps}
            value={finalValue}
            onChange={handleChange}
            style={commonProps.style}
            loading={fieldConfig.hasTable && tableLookup.loading}
            // 🔥 PARAMÈTRES DYNAMIQUES PRISMA SELECT avec fallback
            mode={(fieldConfig.selectConfig?.multiple || fieldConfig.config?.multiple || fieldConfig.multiple) ? 'multiple' : undefined}
            showSearch={fieldConfig.selectConfig?.searchable ?? fieldConfig.config?.searchable ?? fieldConfig.searchable ?? true}
            allowClear={fieldConfig.selectConfig?.allowClear ?? fieldConfig.config?.allowClear ?? fieldConfig.allowClear ?? true}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {finalOptions.map((option) => (
              <Option 
                key={option.value} 
                value={option.value} 
                label={option.label}
                disabled={option.disabled}
              >
                {option.label}
              </Option>
            ))}
          </Select>
        );
      }

      case 'CHECKBOX':
        // 🔥 VARIANT DYNAMIQUE PRISMA CHECKBOX avec fallback
        if ((fieldConfig.appearance?.variant || fieldConfig.variant) === 'switch') {
          return (
            <Switch
              disabled={isDisabled}
              checked={Boolean(finalValue)}
              onChange={handleChange}
              size={fieldConfig.appearance?.size}
              // 🔥 LABELS DYNAMIQUES PRISMA SWITCH avec fallback
              checkedChildren={fieldConfig.checkboxConfig?.trueLabel || fieldConfig.trueLabel}
              unCheckedChildren={fieldConfig.checkboxConfig?.falseLabel || fieldConfig.falseLabel}
            />
          );
        }
        
        return (
          <Checkbox
            disabled={isDisabled}
            checked={Boolean(finalValue)}
            onChange={(e) => handleChange(e.target.checked)}
          >
            {fieldConfig.checkboxConfig?.label || fieldConfig.label}
          </Checkbox>
        );

      case 'DATE':
        return (
          <DatePicker
            disabled={isDisabled}
            value={finalValue ? dayjs(finalValue) : null}
            onChange={(date) => handleChange(date ? date.toISOString() : null)}
            style={commonProps.style}
            // 🔥 PARAMÈTRES DYNAMIQUES PRISMA DATE avec fallback
            format={fieldConfig.dateConfig?.format || fieldConfig.format || 'DD/MM/YYYY'}
            // 🔥 VARIANT DYNAMIQUE PRISMA DATE avec fallback
            picker={(fieldConfig.appearance?.variant || fieldConfig.variant) as 'date' | 'week' | 'month' | 'quarter' | 'year' | undefined}
            showTime={fieldConfig.dateConfig?.showTime || fieldConfig.showTime}
            size={fieldConfig.appearance?.size || fieldConfig.size}
            // 🔥 MIN/MAX DATE DYNAMIQUES PRISMA
            disabledDate={(current) => {
              const minDate = fieldConfig.dateConfig?.minDate || fieldConfig.minDate;
              const maxDate = fieldConfig.dateConfig?.maxDate || fieldConfig.maxDate;
              if (minDate && current && current < dayjs(minDate)) return true;
              if (maxDate && current && current > dayjs(maxDate)) return true;
              return fieldConfig.dateConfig?.disabledDate?.(current) || fieldConfig.disabledDate?.(current) || false;
            }}
          />
        );

      case 'EMAIL':
        return (
          <Input
            {...commonProps}
            type="email"
            value={finalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            // 🔥 LONGUEUR MAX DYNAMIQUE PRISMA EMAIL
            maxLength={fieldConfig.textConfig?.maxLength || fieldConfig.maxLength}
            showCount={!!(fieldConfig.textConfig?.maxLength || fieldConfig.maxLength)}
            // 🔥 PATTERN/REGEX DYNAMIQUE PRISMA EMAIL
            pattern={fieldConfig.textConfig?.pattern || fieldConfig.regex || fieldConfig.pattern}
          />
        );

      case 'TEL':
        return (
          <Input
            {...commonProps}
            type="tel"
            value={finalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            // 🔥 LONGUEUR MAX DYNAMIQUE PRISMA TEL
            maxLength={fieldConfig.textConfig?.maxLength || fieldConfig.maxLength}
            showCount={!!(fieldConfig.textConfig?.maxLength || fieldConfig.maxLength)}
            // 🔥 PATTERN/REGEX DYNAMIQUE PRISMA TEL
            pattern={fieldConfig.textConfig?.pattern || fieldConfig.regex || fieldConfig.pattern}
          />
        );

      case 'IMAGE':
        return (
          <div>
            <Upload
              accept="image/*"
              maxCount={1}
              // 🔥 TAILLE MAX DYNAMIQUE PRISMA IMAGE
              beforeUpload={(file) => {
                const maxSize = fieldConfig.config?.maxSize || fieldConfig.maxSize;
                // 🔥 RATIO DYNAMIQUE PRISMA IMAGE
                const ratio = fieldConfig.imageConfig?.ratio || fieldConfig.ratio;
                // 🔥 CROP DYNAMIQUE PRISMA IMAGE  
                const crop = fieldConfig.imageConfig?.crop || fieldConfig.crop;
                
                if (maxSize && file.size > maxSize) {
                  // console.warn(`Fichier trop volumineux: ${file.size} > ${maxSize}`); // ✨ Log réduit
                  return false;
                }
                
                // Log de la configuration crop pour debug
                if (crop) {
                  // console.log(`🖼️ Configuration crop activée:`, crop); // ✨ Log réduit
                }
                
                // Validation ratio si défini
                if (ratio && window.URL) {
                  const img = new Image();
                  img.onload = () => {
                    const [width, height] = ratio.split(':').map(Number);
                    const expectedRatio = width / height;
                    const actualRatio = img.width / img.height;
                    if (Math.abs(expectedRatio - actualRatio) > 0.1) {
                      // console.warn(`Ratio d'image incorrect. Attendu: ${ratio}, Actuel: ${img.width}:${img.height}`); // ✨ Log réduit
                    }
                    URL.revokeObjectURL(img.src);
                  };
                  img.src = URL.createObjectURL(file);
                }
                
                return false; // Empêche l'upload automatique
              }}
              onChange={(info) => {
                if (info.fileList.length > 0) {
                  const file = info.fileList[0];
                  if (file.originFileObj) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      // 🔥 THUMBNAILS DYNAMIQUE PRISMA IMAGE
                      const thumbnails = fieldConfig.imageConfig?.thumbnails || fieldConfig.thumbnails;
                      let imageData = e.target?.result;
                      
                      // Traiter les thumbnails si configurés
                      if (thumbnails && typeof thumbnails === 'object') {
                        // console.log(`🖼️ Configuration thumbnails:`, thumbnails); // ✨ Log réduit
                        // Stocker à la fois l'image originale et la config thumbnails
                        imageData = {
                          original: e.target?.result,
                          thumbnails: thumbnails
,
                        };
                      }
                      
                      handleChange(imageData);
                    };
                    reader.readAsDataURL(file.originFileObj);
                  }
                } else {
                  handleChange(null);
                }
              }}
              disabled={isDisabled}
              showUploadList={false}
            >
              <Button 
                icon={<UploadOutlined />} 
                disabled={isDisabled}
                size={fieldConfig.appearance?.size || 'middle'}
                style={commonProps.style}
              >
                {finalValue ? 'Modifier l\'image' : 'Charger une image'}
              </Button>
            </Upload>
            {finalValue && (
              <div className="mt-2">
                <img 
                  src={finalValue as string} 
                  alt="preview" 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    objectFit: 'cover', 
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px'
,
                  }} 
                />
              </div>
            )}
          </div>
        );

      case 'FILE':
        return (
          <Upload
            // 🔥 TAILLE MAX DYNAMIQUE PRISMA FILE
            beforeUpload={(file) => {
              const maxSize = fieldConfig.config?.maxSize || fieldConfig.maxSize;
              if (maxSize && file.size > maxSize) {
                // console.warn(`Fichier trop volumineux: ${file.size} > ${maxSize}`); // ✨ Log réduit
                return false;
              }
              return false; // Empêche l'upload automatique
            }}
            onChange={(info) => {
              if (info.fileList.length > 0) {
                const file = info.fileList[0];
                handleChange(file.originFileObj);
              } else {
                handleChange(null);
              }
            }}
            disabled={isDisabled}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} disabled={isDisabled}>
              Sélectionner un fichier
            </Button>
          </Upload>
        );

      case 'leaf_repeater':
      case 'LEAF_REPEATER': {
        // 🔁 REPEATER : Gestion des champs répétables avec template
        // Extraire les métadonnées du répétable depuis field.metadata.repeater
        const repeaterMetadata = field.metadata?.repeater;
        const templateNodeIds = repeaterMetadata?.templateNodeIds || [];
        const maxItems = repeaterMetadata?.maxItems;
        const addButtonLabel = repeaterMetadata?.addButtonLabel || 'Ajouter une entrée';
        const minItems = repeaterMetadata?.minItems || 0;

        // 🎨 Apparence du bouton "+" (respecte les réglages du répétiteur)
        const buttonSize: 'tiny' | 'small' | 'middle' | 'large' = (repeaterMetadata?.buttonSize as any) || 'middle';
  const _buttonWidth: 'auto' | 'half' | 'full' = (repeaterMetadata?.buttonWidth as any) || 'auto';
        const iconOnly: boolean = Boolean(repeaterMetadata?.iconOnly);

        // Helpers de style pour le bouton "+"
        const getAddButtonHeight = () => {
          switch (buttonSize) {
            case 'tiny': return iconOnly ? '28px' : '30px';
            case 'small': return '32px';
            case 'large': return '48px';
            case 'middle':
            default: return '40px';
          }
        };
        const getAddButtonWidth = () => {
          if (!iconOnly) return undefined;
          switch (buttonSize) {
            case 'tiny': return '28px';
            case 'small': return '32px';
            case 'large': return '48px';
            case 'middle':
            default: return '40px';
          }
        };
        const getAddButtonFontSize = () => {
          if (iconOnly) {
            switch (buttonSize) {
              case 'tiny': return '14px';
              case 'small': return '16px';
              case 'large': return '20px';
              case 'middle':
              default: return '18px';
            }
          }
          switch (buttonSize) {
            case 'tiny': return '12px';
            case 'small': return '13px';
            case 'large': return '16px';
            case 'middle':
            default: return '14px';
          }
        };
        const getAntSize = (): 'small' | 'middle' | 'large' => (buttonSize === 'tiny' ? 'small' : (buttonSize as 'small' | 'middle' | 'large'));
        
        // Fonction pour récupérer les nœuds template (même logique que TreeBranchLeafPreviewPage)
        const getTemplateNodes = () => {
          // Ici on devrait accéder à l'arbre complet pour récupérer les nœuds par ID
          // Pour l'instant, on retourne un tableau vide et on affichera juste les IDs
          return templateNodeIds.map(id => ({ id, label: id, type: 'text' }));
        };
        
        const templateNodes = getTemplateNodes();
        
        // Le repeater se rend lui-même avec les boutons et les champs template
        return (
          <>
            {/* Liste des instances - Rendu dans le flux normal du formulaire */}
            {Array.from({ length: repeaterInstanceCount }).map((_, index) => (
              <React.Fragment key={`${field.id}_instance_${index}`}>
                {/* Champs template rendus normalement dans le flux */}
                {templateNodes.map((templateNode) => {
                  const fieldKey = `${field.id}_${index}_${templateNode.id}`;
                  return (
                    <Form.Item
                      key={fieldKey}
                      label={templateNode.label || templateNode.id}
                      style={{ marginBottom: 16 }}
                    >
                      <Input
                        value={formData[fieldKey] as string || ''}
                        onChange={(e) => {
                          handleChange({
                            ...formData,
                            [fieldKey]: e.target.value
                          });
                        }}
                        placeholder={`${templateNode.label || templateNode.id}...`}
                        disabled={disabled}
                      />
                    </Form.Item>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Bouton "+" pour ajouter une instance */}
            {(!maxItems || repeaterInstanceCount < maxItems) && (
              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="dashed"
                  block={!iconOnly}
                  size={getAntSize()}
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const newCount = repeaterInstanceCount + 1;
                    setRepeaterInstanceCount(newCount);
                    try {
                      const instanceCountKey = `${field.id}_instanceCount`;
                      onChange(instanceCountKey, newCount);
                    } catch {
                      // If onChange undefined (data section or similar), ignore
                    }
                  }}
                  disabled={disabled}
                  style={{
                    height: getAddButtonHeight(),
                    width: getAddButtonWidth(),
                    fontSize: getAddButtonFontSize(),
                    minWidth: iconOnly ? getAddButtonWidth() : undefined,
                    padding: iconOnly ? '0' : undefined,
                    display: iconOnly ? 'inline-flex' : undefined,
                    alignItems: iconOnly ? 'center' : undefined,
                    justifyContent: iconOnly ? 'center' : undefined
                  }}
                >
                  {!iconOnly && addButtonLabel}
                </Button>
              </Form.Item>
            )}

            {/* Bouton "-" pour supprimer la dernière instance (si > minItems) */}
            {repeaterInstanceCount > minItems && (
              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="dashed"
                  block
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => {
                    const newCount = repeaterInstanceCount - 1;
                    setRepeaterInstanceCount(newCount);
                    try {
                      const instanceCountKey = `${field.id}_instanceCount`;
                      onChange(instanceCountKey, newCount);
                    } catch {
                      // ignore
                    }
                  }}
                  disabled={disabled}
                >
                  Supprimer la dernière entrée
                </Button>
              </Form.Item>
            )}
          </>
        );
      }

      default:
        return (
          <Input
            {...commonProps}
            value={finalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            // 🔥 LONGUEUR MAX DYNAMIQUE PRISMA DEFAULT
            maxLength={fieldConfig.textConfig?.maxLength || fieldConfig.maxLength}
            showCount={!!(fieldConfig.textConfig?.maxLength || fieldConfig.maxLength)}
            // 🔥 PATTERN/REGEX DYNAMIQUE PRISMA DEFAULT
            pattern={fieldConfig.textConfig?.pattern || fieldConfig.regex || fieldConfig.pattern}
          />
        );
    }
  };

  return (
    <Form.Item
      className={`mb-4 ${isMobile ? 'tbl-form-item-mobile' : ''}`}
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      colon={false}
      style={{ width: '150px' }}
      label={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="font-medium text-gray-700 whitespace-normal break-words">
            {fieldConfig.label}
            {(() => {
              if (fieldConfig.required) {
                return (
                  <span 
                    className={isValidation ? 'text-red-500 ml-1' : 'text-green-600 ml-1'} 
                    style={{ color: isValidation ? '#ef4444 !important' : '#16a34a !important' }}
                  >
                    *
                  </span>
                );
              }
              return null;
            })()}
            {/* 🎯 Tooltip à droite du label avec espacement */}
            {tooltipData.hasTooltip && (
              <span className="ml-2 inline-flex">
                <HelpTooltip
                  type={tooltipData.type}
                  text={tooltipData.text}
                  image={tooltipData.image}
                />
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {fieldConfig.description && (
              <Tooltip title={fieldConfig.description}>
                <InfoCircleOutlined className="text-gray-400" />
              </Tooltip>
            )}
          </div>
        </div>
      }
      validateStatus={validationError && isValidation ? 'error' : validationError && !isValidation ? 'success' : ''}
      help={validationError ? (
        <div 
          style={{ 
            color: isValidation ? '#dc2626' : '#059669',
            fontWeight: '400',
            fontSize: '14px',
            marginTop: '4px'
          }}
        >
          {validationError}
        </div>
      ) : undefined}
      required={fieldConfig.required}
    >
      {renderCapabilityBadges()}
      {renderFieldInput()}
      
      {/* ❌ MASQUÉ : Alert formule réservée à l'éditeur TreeBranchLeaf */}
      
      {fieldConfig.hasMarkers && fieldConfig.markersConfig?.markers && (
        <div className="mt-2">
          <Text type="secondary" style={{ fontSize: '12px' }}>Marqueurs: </Text>
          {fieldConfig.markersConfig.markers.map((marker) => (
            <Tag 
              key={marker.id} 
              color={marker.color} 
              size="small"
              className="ml-1"
            >
              {marker.icon} {marker.name}
            </Tag>
          ))}
        </div>
      )}
    </Form.Item>
  );
};

export default TBLFieldRendererAdvanced;

