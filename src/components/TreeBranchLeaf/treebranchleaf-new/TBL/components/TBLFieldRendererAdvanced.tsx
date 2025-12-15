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
  Grid,
  message
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
  
  console.log(`[evaluateFilterConditions] Évaluation pour option:`, option, `avec ${conditions.length} condition(s)`);

  const results = conditions.map(condition => {
    // 1. Extraire la valeur de référence depuis formData
    let referenceValue: any = null;
    
    if (condition.compareWithRef?.startsWith('@value.')) {
      const fieldId = condition.compareWithRef.replace('@value.', '');
      referenceValue = formData[fieldId];
    } else if (condition.compareWithRef?.startsWith('@select.')) {
      const fieldId = condition.compareWithRef.replace('@select.', '');
      referenceValue = formData[fieldId];
    } else if (condition.compareWithRef?.startsWith('node-formula:')) {
      // Support pour les références node-formula:
      const nodeId = condition.compareWithRef.replace('node-formula:', '');
      referenceValue = formData[nodeId];
    } else if (condition.compareWithRef?.startsWith('formula:')) {
      // Support pour les références formula:
      const formulaId = condition.compareWithRef.replace('formula:', '');
      referenceValue = formData[formulaId];
    } else if (condition.compareWithRef && formData[condition.compareWithRef]) {
      // Fallback: essayer directement l'ID
      referenceValue = formData[condition.compareWithRef];
    }
    
    // Vérification de la valeur de référence
    if (referenceValue === null || referenceValue === undefined || referenceValue === '') {
      console.warn(`[evaluateFilterConditions] Valeur de référence non trouvée pour: ${condition.compareWithRef}`);
      console.warn(`[evaluateFilterConditions] FormData disponible:`, Object.keys(formData));
      return false; // Si pas de valeur de référence, la condition échoue
    }

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
    console.log(`[evaluateFilterConditions] Comparaison: referenceValue=${referenceValue}, tableValues:`, tableValues, `opérateur=${condition.operator}`);
    
    const conditionResults = tableValues.map(tableValue => {
      let result = false;
      switch (condition.operator) {
        case 'equals':
          result = String(referenceValue).trim().toLowerCase() === String(tableValue).trim().toLowerCase();
          break;
        case 'notEquals':
          result = String(referenceValue).trim().toLowerCase() !== String(tableValue).trim().toLowerCase();
          break;
        case 'greaterThan':
          result = Number(referenceValue) > Number(tableValue);
          break;
        case 'lessThan':
          result = Number(referenceValue) < Number(tableValue);
          break;
        case 'greaterOrEqual':
          result = Number(referenceValue) >= Number(tableValue);
          break;
        case 'lessOrEqual':
          result = Number(referenceValue) <= Number(tableValue);
          break;
        case 'contains':
          result = String(tableValue).toLowerCase().includes(String(referenceValue).toLowerCase());
          break;
        case 'notContains':
          result = !String(tableValue).toLowerCase().includes(String(referenceValue).toLowerCase());
          break;
        default:
          result = false;
      }
      
      console.log(`[evaluateFilterConditions] ${String(referenceValue)} ${condition.operator} ${String(tableValue)} = ${result}`);
      return result;
    });
    
    // Si colonne ET ligne: toutes les conditions doivent passer (AND)
    // Si seulement colonne OU ligne: au moins une doit passer
    const conditionPassed = conditionResults.every(result => result);
    console.log(`[evaluateFilterConditions] Condition ${condition.id} résultat: ${conditionPassed}`);
    return conditionPassed;
  });

  // Combiner les résultats selon la logique
  const finalResult = filterLogic === 'AND' 
    ? results.every(result => result) 
    : results.some(result => result);
    
  console.log(`[evaluateFilterConditions] Résultat final pour option "${option.value}": ${finalResult} (logique: ${filterLogic})`);
  return finalResult;
};

// 🔧 Fonction utilitaire pour extraire une valeur depuis une colonne du tableau
const extractValueFromColumn = (
  option: any,
  targetColumn: string,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any
): any => {
  try {
    if (tableData.type === 'columns') {
      // Mode colonnes: trouver la ligne correspondante à cette option
      const keyColIndex = config.keyColumn ? tableData.columns.indexOf(config.keyColumn) : 0;
      const targetColIndex = tableData.columns.indexOf(targetColumn);
      
      if (keyColIndex >= 0 && targetColIndex >= 0) {
        const matchingRowIndex = tableData.data.findIndex(row => {
          const cellValue = row[keyColIndex];
          const optionValue = option.value;
          // Comparaison plus flexible
          return String(cellValue).trim().toLowerCase() === String(optionValue).trim().toLowerCase();
        });
        if (matchingRowIndex >= 0 && tableData.data[matchingRowIndex][targetColIndex] !== undefined) {
          return tableData.data[matchingRowIndex][targetColIndex];
        }
      }
    } else if (tableData.type === 'matrix') {
      // Mode matrix selon keyColumn/keyRow
      const targetColIndex = tableData.columns.indexOf(targetColumn);
      
      if (config.keyColumn) {
        // Lookup par colonne: l'option correspond à une colonne
        const optionColIndex = tableData.columns.findIndex(col => 
          String(col).trim().toLowerCase() === String(option.value).trim().toLowerCase()
        );
        if (optionColIndex >= 0 && targetColIndex >= 0) {
          // Pour chaque ligne de données, comparer les colonnes
          for (let rowIndex = 0; rowIndex < tableData.data.length; rowIndex++) {
            const dataColIndex = optionColIndex - 1; // Décalage car data n'a pas colonne A
            const targetDataColIndex = targetColIndex - 1;
            if (dataColIndex >= 0 && targetDataColIndex >= 0 && 
                tableData.data[rowIndex] && tableData.data[rowIndex][targetDataColIndex] !== undefined) {
              return tableData.data[rowIndex][targetDataColIndex];
            }
          }
        }
      } else if (config.keyRow) {
        // Lookup par ligne: trouver la colonne cible
        const keyRowIndex = tableData.rows.findIndex(row => 
          String(row).trim().toLowerCase() === String(config.keyRow).trim().toLowerCase()
        );
        if (keyRowIndex >= 0 && targetColIndex >= 0) {
          const dataRowIndex = keyRowIndex - 1;
          const dataColIndex = targetColIndex - 1;
          if (dataRowIndex >= 0 && dataRowIndex < tableData.data.length &&
              dataColIndex >= 0 && tableData.data[dataRowIndex] && 
              dataColIndex < tableData.data[dataRowIndex].length) {
            return tableData.data[dataRowIndex][dataColIndex];
          }
        }
      }
    }
  } catch (error) {
    console.error('[extractValueFromColumn] Erreur:', error);
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

// 🔧 Réserve deux lignes pour les labels afin d'aligner toutes les entrées
const LABEL_LINE_HEIGHT_PX = 18;
const LABEL_MIN_LINES = 2;
const LABEL_CONTAINER_HEIGHT = (LABEL_LINE_HEIGHT_PX * LABEL_MIN_LINES) + 12;
const DEFAULT_LABEL_TEXT_STYLE: React.CSSProperties = {
  lineHeight: `${LABEL_LINE_HEIGHT_PX}px`,
  height: `${LABEL_LINE_HEIGHT_PX * LABEL_MIN_LINES}px`,
  display: '-webkit-box',
  WebkitLineClamp: LABEL_MIN_LINES,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  width: '100%',
  paddingRight: 32
};

const LABEL_CONTAINER_STYLE: React.CSSProperties = {
  position: 'relative',
  height: LABEL_CONTAINER_HEIGHT,
  width: '100%',
  display: 'flex',
  alignItems: 'flex-start'
};

const LABEL_REQUIRED_BADGE_STYLE: React.CSSProperties = {
  display: 'inline-block',
  fontWeight: 600,
  marginLeft: 4
};

const LABEL_ACTIONS_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  height: LABEL_CONTAINER_HEIGHT,
  display: 'inline-flex',
  alignItems: 'flex-start',
  gap: 8,
  minWidth: 24
};

interface TreeBranchLeafFieldConfig {
  // Configuration de base
  fieldType: string;
  label: string;
  description?: string;
  required: boolean;
  visible: boolean;
  placeholder?: string;
  
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
    mode?: 'single' | 'multiple' | 'checkboxes' | 'tags';
    allowCustom?: boolean;
    maxSelections?: number;
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
    minDate?: string;
    maxDate?: string;
  };
  
  fileConfig?: {
    accept?: string;
    maxSize?: number;
    multiple?: boolean;
    showPreview?: boolean;
  };
  
  imageConfig?: {
    formats?: string[];
    maxSize?: number;
    ratio?: string;
    crop?: boolean;
    thumbnails?: unknown;
  };
  
  repeaterConfig?: {
    minItems?: number;
    maxItems?: number;
    addButtonLabel?: string;
    buttonSize?: 'tiny' | 'small' | 'middle' | 'large';
    buttonWidth?: 'auto' | 'half' | 'full';
    iconOnly?: boolean;
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
      placeholder?: string;
      mask?: string;
      
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
      minDate?: string;
      maxDate?: string;
      
      // Sélection
      options?: Array<{ label: string; value: string; disabled?: boolean }>;
      multiple?: boolean;
      searchable?: boolean;
      allowClear?: boolean;
      selectDefaultValue?: string;
      
      // Booléen
      trueLabel?: string;
      falseLabel?: string;
      boolDefaultValue?: boolean;
    };
    appearanceConfig?: Record<string, unknown>;
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

  const tableLookup = useTBLTableLookup(lookupNodeId, lookupNodeId, hasTableCapability, formData);

  const templateAppearanceOverrides = useMemo(() => {
    if (!allNodes || allNodes.length === 0) return null;

    const safePush = (acc: Set<string>, candidate?: unknown) => {
      if (!candidate) return;
      if (Array.isArray(candidate)) {
        candidate.forEach((value) => safePush(acc, value));
        return;
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        acc.add(candidate.trim());
      }
    };

    const meta = ((field as Record<string, any>)?.metadata) || {};
    const candidateIds = new Set<string>();

    safePush(candidateIds, (field as Record<string, any>)?.repeaterTemplateNodeId);
    safePush(candidateIds, (field as Record<string, any>)?.sourceTemplateId);
    safePush(candidateIds, (field as Record<string, any>)?.originalFieldId);
    safePush(candidateIds, meta?.sourceTemplateId);
    safePush(candidateIds, meta?.originalNodeId);

    let copiedFrom = meta?.copiedFromNodeId;
    if (typeof copiedFrom === 'string' && copiedFrom.trim().startsWith('[')) {
      try {
        copiedFrom = JSON.parse(copiedFrom);
      } catch {
        // ignore malformed JSON values
      }
    }
    safePush(candidateIds, copiedFrom);

    const templateNode = Array.from(candidateIds)
      .map((id) => allNodes.find((node) => node.id === id))
      .find((node): node is RawTreeNode => Boolean(node));

    if (!templateNode) return null;

    const metadataAppearance = (templateNode.metadata?.appearance || {}) as Record<string, unknown>;
    const legacyAppearance: Record<string, unknown> = {};

    if (templateNode.appearance_size) legacyAppearance.size = templateNode.appearance_size;
    if (templateNode.appearance_width) legacyAppearance.width = templateNode.appearance_width;
    if (templateNode.appearance_variant) legacyAppearance.variant = templateNode.appearance_variant;

    return {
      ...legacyAppearance,
      ...metadataAppearance
    };
  }, [allNodes, field]);
  
  // Synchronisation avec la valeur externe
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Configuration complète du champ depuis TreeBranchLeaf
  const fieldConfig: TreeBranchLeafFieldConfig = useMemo(() => {
    const baseAppearanceConfig = (field.appearanceConfig || {}) as Record<string, unknown>;
    const resolvedAppearanceConfig = {
      ...(templateAppearanceOverrides || {}),
      ...baseAppearanceConfig
    };
    const config = { ...(field.config || {}) } as Record<string, unknown> & typeof field.config;
    if (resolvedAppearanceConfig && Object.keys(resolvedAppearanceConfig).length > 0) {
      Object.entries(resolvedAppearanceConfig).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          (config as Record<string, unknown>)[key] = value;
        }
      });
    }
    const metadata = treeMetadata || {};
    const capabilities = field.capabilities || {};

    const pickDefined = <T,>(...values: Array<T | null | undefined>): T | undefined => {
      for (const value of values) {
        if (value !== undefined && value !== null) {
          return value;
        }
      }
      return undefined;
    };
    
    // Récupérer la configuration depuis les métadonnées TreeBranchLeaf
    const nodeType = field.type?.toUpperCase() || 'TEXT';
    const baseSubType = field.type?.toUpperCase() || metadata.subType || nodeType; // 🎯 Type d'origine depuis Prisma
    
    // ✅ CORRECTION DYNAMIQUE: Si table lookup activé, transformer TEXT en SELECT
    const hasTableLookup = capabilities.table?.enabled || metadata.hasTable || false;
    const subType = hasTableLookup ? 'SELECT' : baseSubType; // 🔥 TRANSFORMATION DYNAMIQUE
    
    //  CORRECTION: Lire l'apparence depuis field.config ET metadata.appearance
    const columnAppearance = {
      size: (field as Record<string, any>)?.appearance_size,
      width: (field as Record<string, any>)?.appearance_width,
      variant: (field as Record<string, any>)?.appearance_variant
    };

    const metadataAppearance = {
      ...(templateAppearanceOverrides || {}),
      ...((metadata.appearance || {}) as Record<string, unknown>)
    };
    const normalizedAppearanceConfig = resolvedAppearanceConfig || {};
    const appearance = {
      ...metadataAppearance,
      ...normalizedAppearanceConfig,
      size: pickDefined(
        normalizedAppearanceConfig.size as string | undefined,
        normalizedAppearanceConfig.textSize as string | undefined,
        config.size as string | undefined,
        columnAppearance.size as string | undefined,
        metadataAppearance.size as string | undefined
      ),
      width: pickDefined(
        normalizedAppearanceConfig.width as string | undefined,
        normalizedAppearanceConfig.fieldWidth as string | undefined,
        config.width as string | undefined,
        columnAppearance.width as string | undefined,
        metadataAppearance.width as string | undefined
      ),
      variant: pickDefined(
        normalizedAppearanceConfig.variant as string | undefined,
        config.variant as string | undefined,
        columnAppearance.variant as string | undefined,
        metadataAppearance.variant as string | undefined
      ),
      className: pickDefined(
        normalizedAppearanceConfig.className as string | undefined,
        metadataAppearance.className as string | undefined
      ),
      style: pickDefined(
        normalizedAppearanceConfig.style as React.CSSProperties | undefined,
        metadataAppearance.style as React.CSSProperties | undefined
      )
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
    
    const metadataTextConfig = (metadata.textConfig || {}) as Record<string, unknown>;
    const metadataNumberConfig = (metadata.numberConfig || {}) as Record<string, unknown>;
    const metadataSelectConfig = (metadata.selectConfig || {}) as Record<string, unknown>;
    const metadataCheckboxConfig = (metadata.checkboxConfig || {}) as Record<string, unknown>;
    const metadataDateConfig = (metadata.dateConfig || {}) as Record<string, unknown>;

    const resolvedRequired = pickDefined(
      normalizedAppearanceConfig.isRequired as boolean | undefined,
      field.required,
      metadata.isRequired,
      (metadata as Record<string, any>).required
    ) ?? false;

    const resolvedVisible = (field.visible !== false) && (metadata.isVisible !== false) && (normalizedAppearanceConfig.visibleToUser !== false);

    return {
      fieldType: subType,
      label: field.label || 'Champ',
      description: pickDefined(field.description, metadata.description),
      required: resolvedRequired,
      visible: resolvedVisible,
      placeholder: pickDefined(
        normalizedAppearanceConfig.placeholder as string | undefined,
        field.placeholder,
        config.placeholder as string | undefined,
        metadataTextConfig.placeholder,
        metadata.placeholder
      ),
      
      // Configurations spécifiques
      numberConfig: {
        min: pickDefined(config.min, metadataNumberConfig.min, (metadata as Record<string, unknown>).min) as number | undefined,
        max: pickDefined(config.max, metadataNumberConfig.max, (metadata as Record<string, unknown>).max) as number | undefined,
        step: pickDefined(config.step, metadataNumberConfig.step, (metadata as Record<string, unknown>).step) ?? 1,
        defaultValue: pickDefined(
          config.numberDefaultValue,
          metadataNumberConfig.defaultValue,
          config.defaultValue,
          metadata.defaultValue
        ),
        ui: pickDefined(appearance.variant, config.ui, metadataNumberConfig.ui, 'input') as string,
        unit: pickDefined(config.unit, metadataNumberConfig.unit, (metadata as Record<string, unknown>).unit),
        ...metadata.numberConfig
      },
      
      textConfig: {
        placeholder: pickDefined(
          normalizedAppearanceConfig.placeholder as string | undefined,
          field.placeholder,
          config.placeholder as string | undefined,
          metadataTextConfig.placeholder,
          metadata.placeholder
        ),
        minLength: pickDefined(
          normalizedAppearanceConfig.minLength as number | undefined,
          config.minLength as number | undefined,
          metadataTextConfig.minLength,
          metadata.minLength
        ) as number | undefined,
        maxLength: pickDefined(
          normalizedAppearanceConfig.maxLength as number | undefined,
          config.maxLength as number | undefined,
          metadataTextConfig.maxLength,
          metadata.maxLength
        ) as number | undefined,
        mask: pickDefined(
          normalizedAppearanceConfig.mask as string | undefined,
          config.mask as string | undefined,
          metadataTextConfig.mask,
          metadata.mask
        ),
        rows: pickDefined(
          normalizedAppearanceConfig.rows as number | undefined,
          config.rows as number | undefined,
          metadataTextConfig.rows,
          metadata.rows
        ) ?? 3,
        defaultValue: pickDefined(
          config.textDefaultValue,
          metadataTextConfig.defaultValue,
          config.defaultValue,
          metadata.defaultValue
        ),
        pattern: pickDefined(
          normalizedAppearanceConfig.regex as string | undefined,
          config.regex as string | undefined,
          metadataTextConfig.regex,
          metadata.regex
        ),
        ...metadata.textConfig
      },
      
      selectConfig: {
        options: field.options || (config.options as any) || metadataSelectConfig.options || metadata.options || [],
        defaultValue: pickDefined(
          config.selectDefaultValue,
          metadataSelectConfig.defaultValue,
          config.defaultValue,
          metadata.defaultValue
        ),
        multiple: pickDefined(
          normalizedAppearanceConfig.selectMode === 'multiple' ? true : undefined,
          config.multiple as boolean | undefined,
          metadataSelectConfig.multiple,
          metadata.multiple
        ) ?? false,
        searchable: pickDefined(
          normalizedAppearanceConfig.selectSearchable as boolean | undefined,
          normalizedAppearanceConfig.selectShowSearch as boolean | undefined,
          config.searchable as boolean | undefined,
          metadataSelectConfig.searchable,
          metadata.searchable
        ) ?? true,
        allowClear: pickDefined(
          normalizedAppearanceConfig.selectAllowClear as boolean | undefined,
          config.allowClear as boolean | undefined,
          metadataSelectConfig.allowClear,
          metadata.allowClear
        ) ?? !resolvedRequired,
        mode: pickDefined(
          normalizedAppearanceConfig.selectMode as 'single' | 'multiple' | 'checkboxes' | 'tags' | undefined,
          metadataSelectConfig.mode as 'single' | 'multiple' | 'checkboxes' | 'tags' | undefined
        ),
        allowCustom: pickDefined(
          normalizedAppearanceConfig.selectAllowCustom as boolean | undefined,
          config.selectAllowCustom as boolean | undefined,
          metadataSelectConfig.allowCustom as boolean | undefined
        ),
        maxSelections: pickDefined(
          normalizedAppearanceConfig.selectMaxSelections as number | undefined,
          config.selectMaxSelections as number | undefined,
          metadataSelectConfig.maxSelections as number | undefined
        ),
        ...metadata.selectConfig
      },
      
      checkboxConfig: {
        label: field.label,
        trueLabel: pickDefined(config.trueLabel, metadataCheckboxConfig.trueLabel, metadata.trueLabel),
        falseLabel: pickDefined(config.falseLabel, metadataCheckboxConfig.falseLabel, metadata.falseLabel),
        defaultValue: pickDefined(
          config.boolDefaultValue,
          metadataCheckboxConfig.defaultValue,
          config.defaultValue,
          metadata.defaultValue
        ),
        ...metadata.checkboxConfig
      },
      
      dateConfig: {
        format: pickDefined(
          normalizedAppearanceConfig.format as string | undefined,
          config.format as string | undefined,
          metadataDateConfig.format,
          metadata.format
        ) || 'DD/MM/YYYY',
        showTime: pickDefined(
          normalizedAppearanceConfig.showTime as boolean | undefined,
          config.showTime as boolean | undefined,
          metadataDateConfig.showTime,
          metadata.showTime
        ) ?? false,
        defaultValue: pickDefined(
          config.dateDefaultValue,
          metadataDateConfig.defaultValue,
          config.defaultValue,
          metadata.defaultValue
        ),
        minDate: pickDefined(
          normalizedAppearanceConfig.minDate as string | undefined,
          config.minDate as string | undefined,
          metadataDateConfig.minDate,
          metadata.minDate
        ),
        maxDate: pickDefined(
          normalizedAppearanceConfig.maxDate as string | undefined,
          config.maxDate as string | undefined,
          metadataDateConfig.maxDate,
          metadata.maxDate
        ),
        ...metadata.dateConfig
      },

      fileConfig: {
        accept: pickDefined(
          normalizedAppearanceConfig.fileAccept as string | undefined,
          config.fileAccept as string | undefined,
          (metadata as Record<string, unknown>).fileAccept as string | undefined
        ),
        maxSize: pickDefined(
          normalizedAppearanceConfig.fileMaxSize as number | undefined,
          config.fileMaxSize as number | undefined,
          (metadata as Record<string, unknown>).fileMaxSize as number | undefined
        ),
        multiple: pickDefined(
          normalizedAppearanceConfig.fileMultiple as boolean | undefined,
          config.fileMultiple as boolean | undefined,
          (metadata as Record<string, unknown>).fileMultiple as boolean | undefined
        ),
        showPreview: pickDefined(
          normalizedAppearanceConfig.fileShowPreview as boolean | undefined,
          config.fileShowPreview as boolean | undefined,
          (metadata as Record<string, unknown>).fileShowPreview as boolean | undefined
        )
      },

      imageConfig: {
        formats: Array.isArray(normalizedAppearanceConfig.imageFormats)
          ? normalizedAppearanceConfig.imageFormats as string[]
          : typeof normalizedAppearanceConfig.imageFormats === 'string'
            ? (normalizedAppearanceConfig.imageFormats as string).split(',').map(str => str.trim()).filter(Boolean)
            : (Array.isArray((metadata as Record<string, unknown>).imageFormats)
              ? (metadata as Record<string, unknown>).imageFormats as string[]
              : undefined),
        maxSize: pickDefined(
          normalizedAppearanceConfig.imageMaxSize as number | undefined,
          config.imageMaxSize as number | undefined,
          (metadata as Record<string, unknown>).imageMaxSize as number | undefined
        ),
        ratio: pickDefined(
          normalizedAppearanceConfig.imageRatio as string | undefined,
          config.imageRatio as string | undefined,
          (metadata as Record<string, unknown>).imageRatio as string | undefined
        ),
        crop: pickDefined(
          normalizedAppearanceConfig.imageCrop as boolean | undefined,
          config.imageCrop as boolean | undefined,
          (metadata as Record<string, unknown>).imageCrop as boolean | undefined
        ),
        thumbnails: pickDefined(
          normalizedAppearanceConfig.imageThumbnails,
          config.imageThumbnails,
          (metadata as Record<string, unknown>).imageThumbnails
        )
      },

      repeaterConfig: {
        minItems: pickDefined(
          normalizedAppearanceConfig.minItems as number | undefined,
          config.minItems as number | undefined
        ),
        maxItems: pickDefined(
          normalizedAppearanceConfig.maxItems as number | undefined,
          config.maxItems as number | undefined
        ),
        addButtonLabel: pickDefined(
          normalizedAppearanceConfig.addButtonLabel as string | undefined,
          config.addButtonLabel as string | undefined
        ),
        buttonSize: pickDefined(
          normalizedAppearanceConfig.buttonSize as 'tiny' | 'small' | 'middle' | 'large' | undefined,
          config.buttonSize as 'tiny' | 'small' | 'middle' | 'large' | undefined
        ),
        buttonWidth: pickDefined(
          normalizedAppearanceConfig.buttonWidth as 'auto' | 'half' | 'full' | undefined,
          config.buttonWidth as 'auto' | 'half' | 'full' | undefined
        ),
        iconOnly: pickDefined(
          normalizedAppearanceConfig.iconOnly as boolean | undefined,
          config.iconOnly as boolean | undefined
        )
      },
      
      // Apparence
      appearance: {
        variant: appearance.variant,
        size: appearance.size ?? 'middle',
        width: appearance.width,
        style: appearance.style || {},
        className: appearance.className || '',
        // 🎨 COULEUR DU LABEL: Héritage depuis l'apparence du parent/template
        labelColor: pickDefined(
          normalizedAppearanceConfig.labelColor as string | undefined,
          metadataAppearance.labelColor as string | undefined,
          (metadata.field as Record<string, unknown> | undefined)?.labelColor as string | undefined
        )
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
  }, [field, treeMetadata, templateAppearanceOverrides]);

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

  // 🎯 Auto-sélection intelligente pour les champs SELECT avec table lookup
  // Quand les filtres changent (via formData), gérer automatiquement la sélection :
  // - Si aucune option disponible : vider la sélection
  // - Si la valeur actuelle est invalide : auto-sélectionner la première option
  useEffect(() => {
    // Ne s'applique qu'aux champs SELECT avec table lookup activé
    if (fieldConfig.fieldType !== 'SELECT' || !fieldConfig.hasTable) return;
    
    // Ne rien faire pendant le chargement initial
    if (tableLookup.loading) return;
    
    const currentValue = localValue;
    
    // CAS 1 : Aucune option disponible → VIDER la sélection
    if (!tableLookup.options || tableLookup.options.length === 0) {
      if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
        console.log(`🧹 [Auto-Clear] Champ "${field.label}": Aucune option disponible, vidage de la sélection`);
        onChange?.(null);
        setLocalValue(null);
      }
      return;
    }
    
    // CAS 2 : Vérifier si la valeur actuelle est toujours valide
    const isCurrentValueValid = currentValue && tableLookup.options.some(
      opt => String(opt.value) === String(currentValue)
    );
    
    // CAS 3 : Si la valeur actuelle n'est plus valide, auto-sélectionner la première option
    if (!isCurrentValueValid && tableLookup.options.length > 0) {
      const firstOption = tableLookup.options[0];
      console.log(`🔄 [Auto-Select] Champ "${field.label}": Valeur "${currentValue}" invalide, sélection automatique de "${firstOption.label}"`);
      onChange?.(firstOption.value);
      setLocalValue(firstOption.value);
    }
  }, [tableLookup.options, tableLookup.loading, fieldConfig.fieldType, fieldConfig.hasTable, field.label, localValue, onChange]);

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

    const capabilities = field.capabilities || {};
    const tableActiveId = capabilities?.table?.activeId as string | undefined;

    // 🚀 PRIORITÉ 1: Champs TreeBranchLeaf intelligents (générés dynamiquement)
    if (field.isTreeBranchLeafSmart && (field.hasData || field.hasFormula)) {
      const caps = capabilities;

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
    
    // 🔍 NOUVELLE LOGIQUE: Distinguer les formules de VALEUR des formules de CONTRAINTE
    // Une formule de contrainte (ex: number_max dynamique) ne rend PAS le champ read-only
    const isConstraintFormula = (formulaInstances: Record<string, unknown> | null | undefined): boolean => {
      if (!formulaInstances) return false;
      
      // Parcourir toutes les instances de formule
      for (const [_instanceId, instance] of Object.entries(formulaInstances)) {
        const inst = instance as Record<string, unknown> | null;
        if (!inst) continue;
        
        // Vérifier le targetProperty - si c'est une propriété de contrainte, ce n'est PAS une formule de valeur
        const targetProperty = inst.targetProperty as string | undefined;
        if (targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(targetProperty)) {
          return true;
        }
        
        // Vérifier aussi le nom de la formule pour des indices
        const name = (inst.name as string) || '';
        if (/\b(max|min|limit|constraint|validation)\b/i.test(name)) {
          return true;
        }
      }
      return false;
    };
    
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
    
    // 🎯 NOUVEAU: Vérifier si c'est une formule de contrainte (pas une formule de valeur)
    const formulaIsConstraint = isConstraintFormula(capabilities.formula?.instances as Record<string, unknown> | null | undefined);
    
    const manualOverrideAllowed = fieldConfig.formulaConfig?.allowManualOverride === true;

    // ✨ PRIORITÉ 2: Capacité Formula (formules directes) - SEULEMENT pour les formules de VALEUR
    // Si c'est une formule de CONTRAINTE (ex: number_max), le champ reste éditable
    if (hasFormulaCapability && !manualOverrideAllowed && !formulaIsConstraint) {
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

    const normalizeWidth = (raw?: string | number | null): string | undefined => {
      if (raw === undefined || raw === null) return undefined;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return `${raw}px`;
      }
      if (typeof raw !== 'string') return undefined;
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      if (/^\d+$/.test(trimmed)) return `${trimmed}px`;
      if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(trimmed)) return trimmed;
      if (trimmed.startsWith('calc(')) return trimmed;
      return undefined;
    };

    const widthStyle: React.CSSProperties = {};
    const customWidth = normalizeWidth(fieldConfig.appearance?.width || fieldConfig.width);
    if (customWidth) {
      widthStyle.width = customWidth;
    }

    const mapSizeToAntd = (size?: string) => {
      switch ((size || '').toLowerCase()) {
        case 'sm':
        case 'small':
          return 'small';
        case 'lg':
        case 'large':
          return 'large';
        case 'md':
        case 'medium':
        default:
          return 'middle';
      }
    };

    const resolvedSize = mapSizeToAntd(fieldConfig.appearance?.size || fieldConfig.size);

    const commonProps = {
      disabled: isDisabled,
      // 🔥 PLACEHOLDER DYNAMIQUE PRISMA - PRIORITÉ AUX DONNÉES DIRECTES
      placeholder: field.text_placeholder || fieldConfig.placeholder || field.placeholder || fieldConfig.textConfig?.placeholder || `Saisissez ${fieldConfig.label.toLowerCase()}`,
      status: validationError && isValidation ? 'error' as const : undefined,
      size: resolvedSize,
      style: { 
        ...appearanceStyle, 
        ...widthStyle 
      },
      className: fieldConfig.appearance?.className || fieldConfig.className || '',
      'aria-required': fieldConfig.required || undefined
    };

    // For selects and cascaders: default to 100% width when no explicit width configured
    const selectLikeStyle: React.CSSProperties = {
      ...(commonProps.style || {}),
      width: (commonProps.style && (commonProps.style as React.CSSProperties).width) ? (commonProps.style as React.CSSProperties).width : '100%'
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
        // 🎯 DEBUG: Vérifier la configuration lookup pour diagnostic
        if (fieldConfig.hasTable && field.capabilities?.table?.currentTable?.meta?.lookup) {
          const lookup = field.capabilities.table.currentTable.meta.lookup;
          console.log(`🔍 [LOOKUP DEBUG] Configuration pour "${field.label}":`, {
            rowEnabled: lookup.rowLookupEnabled,
            colEnabled: lookup.columnLookupEnabled,
            rowFieldId: lookup.selectors?.rowFieldId,
            colFieldId: lookup.selectors?.columnFieldId,
            rowSourceOption: lookup.rowSourceOption,
            colSourceOption: lookup.columnSourceOption,
            displayColumn: lookup.displayColumn
          });
        }
        
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
              style={selectLikeStyle}
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
        
        const selectionMode = fieldConfig.selectConfig?.mode || ((fieldConfig.selectConfig?.multiple || fieldConfig.multiple) ? 'multiple' : 'single');
        const allowCustomValues = fieldConfig.selectConfig?.allowCustom;
        const maxSelections = fieldConfig.selectConfig?.maxSelections;
        const isCheckboxMode = selectionMode === 'checkboxes';
        const wantsTagMode = selectionMode === 'tags' || (allowCustomValues && selectionMode !== 'single');
        const antSelectMode = isCheckboxMode
          ? undefined
          : selectionMode === 'multiple'
            ? 'multiple'
            : wantsTagMode
              ? 'tags'
              : undefined;
        const isMultiValue = isCheckboxMode || Boolean(antSelectMode);
        const normalizedSelectValue = isMultiValue
          ? (Array.isArray(finalValue) ? finalValue : (finalValue !== undefined && finalValue !== null ? [finalValue] : []))
          : finalValue;

        const enforceMaxSelections = (nextValue: unknown) => {
          if (Array.isArray(nextValue) && maxSelections && nextValue.length > maxSelections) {
            message.warning(`Maximum ${maxSelections} sélection(s).`);
            return;
          }
          handleChange(nextValue);
        };

        if ((fieldConfig.appearance?.variant || fieldConfig.variant) === 'radio' && !isMultiValue) {
          return (
            <Radio.Group
              disabled={isDisabled}
              value={finalValue}
              onChange={(e) => handleChange(e.target.value)}
              size={resolvedSize}
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

        if (isCheckboxMode) {
          const checkboxValue = Array.isArray(normalizedSelectValue) ? normalizedSelectValue : [];
          return (
            <Checkbox.Group
              options={finalOptions.map(option => ({ label: option.label, value: option.value, disabled: option.disabled }))}
              value={checkboxValue}
              disabled={isDisabled}
              onChange={(vals) => enforceMaxSelections(vals)}
            />
          );
        }
        
        // SELECT classique (sans hiérarchie)
        return (
          <Select
            {...commonProps}
            value={antSelectMode ? normalizedSelectValue : finalValue}
            onChange={(value) => enforceMaxSelections(value)}
            style={selectLikeStyle}
            loading={fieldConfig.hasTable && tableLookup.loading}
            mode={antSelectMode}
            showSearch={fieldConfig.selectConfig?.searchable ?? fieldConfig.searchable ?? true}
            allowClear={fieldConfig.selectConfig?.allowClear ?? true}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            tokenSeparators={allowCustomValues ? [','] : undefined}
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
          const mapSizeToSwitch = (size?: 'small' | 'middle' | 'large') => (size === 'small' ? 'small' : 'default');
          return (
            <Switch
              disabled={isDisabled}
              checked={Boolean(finalValue)}
              onChange={handleChange}
              size={mapSizeToSwitch(resolvedSize as 'small' | 'middle' | 'large')}
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
            size={resolvedSize}
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
        const imageConfig = fieldConfig.imageConfig || {};
        const acceptedFormats = Array.isArray(imageConfig.formats) && imageConfig.formats.length > 0
          ? imageConfig.formats.map(fmt => (fmt.startsWith('.') ? fmt : `.${fmt.toLowerCase()}`))
          : undefined;
        const imageAccept = acceptedFormats && acceptedFormats.length > 0 ? acceptedFormats.join(',') : 'image/*';
        const maxImageSizeBytes = imageConfig.maxSize ? imageConfig.maxSize * 1024 * 1024 : undefined;
        const enforcedRatio = imageConfig.ratio;
        const imageThumbnails = imageConfig.thumbnails;
        return (
          <div>
            <Upload
              accept={imageAccept}
              maxCount={1}
              // 🔥 TAILLE MAX DYNAMIQUE PRISMA IMAGE
              beforeUpload={(file) => {
                if (maxImageSizeBytes && file.size > maxImageSizeBytes) {
                  message.error(`Image trop lourde (max ${imageConfig.maxSize} Mo).`);
                  return Upload.LIST_IGNORE;
                }
                
                // Validation ratio si défini
                if (enforcedRatio && window.URL) {
                  const img = new Image();
                  img.onload = () => {
                    const [width, height] = enforcedRatio.split(':').map(Number);
                    const expectedRatio = width / height;
                    const actualRatio = img.width / img.height;
                    if (Math.abs(expectedRatio - actualRatio) > 0.1) {
                      message.warning(`Ratio attendu ${enforcedRatio}`);
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
                      let imageData = e.target?.result;
                      
                      // Traiter les thumbnails si configurés
                      if (imageThumbnails && typeof imageThumbnails === 'object') {
                        // console.log(`🖼️ Configuration thumbnails:`, thumbnails); // ✨ Log réduit
                        // Stocker à la fois l'image originale et la config thumbnails
                        imageData = {
                          original: e.target?.result,
                          thumbnails: imageThumbnails
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
                size={resolvedSize}
                style={commonProps.style}
              >
                {finalValue ? 'Modifier l\'image' : 'Charger une image'}
              </Button>
            </Upload>
            {finalValue && (
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
            )}
          </div>
        );

      case 'FILE': {
        const fileConfig = fieldConfig.fileConfig || {};
        const fileAccept = fileConfig.accept;
        const maxFileSizeBytes = fileConfig.maxSize ? fileConfig.maxSize * 1024 * 1024 : undefined;
        const allowMultipleFiles = Boolean(fileConfig.multiple);
        const showPreviewList = Boolean(fileConfig.showPreview);
        return (
          <Upload
            accept={fileAccept}
            multiple={allowMultipleFiles}
            maxCount={allowMultipleFiles ? undefined : 1}
            showUploadList={showPreviewList ? { showRemoveIcon: !isDisabled } : false}
            beforeUpload={(file) => {
              if (maxFileSizeBytes && file.size > maxFileSizeBytes) {
                message.error(`Fichier trop volumineux (max ${fileConfig.maxSize} Mo).`);
                return Upload.LIST_IGNORE;
              }
              return false; // Empêche l'upload automatique
            }}
            onChange={(info) => {
              if (allowMultipleFiles) {
                const files = info.fileList.map(item => item.originFileObj || item);
                handleChange(files);
              } else {
                const file = info.fileList[0];
                handleChange(file ? (file.originFileObj || file) : null);
              }
            }}
            disabled={isDisabled}
          >
            <Button icon={<UploadOutlined />} disabled={isDisabled}>
              Sélectionner un fichier
            </Button>
          </Upload>
        );
      }

      case 'leaf_repeater':
      case 'LEAF_REPEATER': {
        // 🔁 REPEATER : Gestion des champs répétables avec template
        // Extraire les métadonnées du répétable depuis field.metadata.repeater
        const repeaterMetadata = field.metadata?.repeater;
        const templateNodeIds = repeaterMetadata?.templateNodeIds || [];
        const repeaterOverrides = fieldConfig.repeaterConfig || {};
        const maxItems = repeaterOverrides.maxItems ?? repeaterMetadata?.maxItems ?? undefined;
        const addButtonLabel = repeaterOverrides.addButtonLabel || repeaterMetadata?.addButtonLabel || 'Ajouter une entrée';
        const minItems = repeaterOverrides.minItems ?? repeaterMetadata?.minItems ?? 0;

        // 🎨 Apparence du bouton "+" (respecte les réglages du répétiteur)
          const buttonSize: 'tiny' | 'small' | 'middle' | 'large' = repeaterOverrides.buttonSize || (repeaterMetadata?.buttonSize as any) || 'middle';
          const iconOnly: boolean = repeaterOverrides.iconOnly ?? Boolean(repeaterMetadata?.iconOnly);

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

  const normalizedValidationMessage = typeof validationError === 'string'
    ? validationError.trim()
    : '';
  const sanitizedValidationMessage = normalizedValidationMessage
    ? normalizedValidationMessage
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.!?]/g, '')
        .trim()
    : '';
  const shouldDisplayValidationHelp = Boolean(
    normalizedValidationMessage &&
    sanitizedValidationMessage !== 'ce champ est obligatoire'
  );

  const hasValidationError = Boolean(validationError);
  const shouldShowErrorState = hasValidationError && isValidation;

  return (
    <Form.Item
      className={`mb-4 ${isMobile ? 'tbl-form-item-mobile' : ''}`}
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      colon={false}
      style={{ width: '100%' }}
      label={
        <div style={LABEL_CONTAINER_STYLE}>
          <span
            className={`font-medium whitespace-normal break-words ${!fieldConfig.appearance?.labelColor ? 'text-gray-700' : ''}`}
            style={{
              ...DEFAULT_LABEL_TEXT_STYLE,
              // 🎨 Couleur du label héritée du parent/template si définie
              ...(fieldConfig.appearance?.labelColor ? { color: fieldConfig.appearance.labelColor } : {})
            }}
          >
            {fieldConfig.label}
            <span
              style={{
                ...LABEL_REQUIRED_BADGE_STYLE,
                color: fieldConfig.required
                  ? (isValidation ? '#ef4444' : '#16a34a')
                  : 'transparent'
              }}
            >
              *
            </span>
          </span>
          <div style={LABEL_ACTIONS_STYLE}>
            {tooltipData.hasTooltip && (
              <HelpTooltip
                type={tooltipData.type}
                text={tooltipData.text}
                image={tooltipData.image}
              />
            )}
            {fieldConfig.description && (
              <Tooltip title={fieldConfig.description}>
                <InfoCircleOutlined className="text-gray-400" />
              </Tooltip>
            )}
            {!tooltipData.hasTooltip && !fieldConfig.description && (
              <span style={{ visibility: 'hidden' }}>
                <InfoCircleOutlined />
              </span>
            )}
          </div>
        </div>
      }
      validateStatus={shouldShowErrorState ? 'error' : ''}
      help={shouldDisplayValidationHelp ? (
        <div 
          style={{ 
            color: isValidation ? '#dc2626' : '#059669',
            fontWeight: '400',
            fontSize: '14px',
            marginTop: '4px'
          }}
        >
          {normalizedValidationMessage}
        </div>
      ) : undefined}
      required={false}
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

