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
  Checkbox, 
  DatePicker, 
  Slider,
  Switch,
  Upload,
  Button,
  Radio,
  Tag,
  Tooltip,
  Alert,
  Typography,
  Grid
} from 'antd';
import { 
  InfoCircleOutlined, 
  CalculatorOutlined, 
  BranchesOutlined,
  ApiOutlined,
  TableOutlined,
  TagOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { SmartCalculatedField } from './SmartCalculatedField';
import { HelpTooltip } from '../../../../common/HelpTooltip';
import { useTBLTooltip } from '../../../../../hooks/useTBLTooltip';
import { useTBLValidationContext } from '../contexts/TBLValidationContext';
import { useTBLTableLookup } from '../hooks/useTBLTableLookup';
// Types locaux pour éviter les 'any' lors de l'extraction des formules dynamiques
interface VariableDefLocal { sourceField: string; type?: string }
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
  isValidating = false,
  hasValidationError = false
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [localValue, setLocalValue] = useState(value);
  const [calculatedValue, setCalculatedValue] = useState<unknown>(null);
  const [conditionMet, setConditionMet] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 🔍 Hook tooltip TBL pour le champ
  const tooltipData = useTBLTooltip(field);

  // 🎯 Contexte de validation pour les couleurs dynamiques
  const { isValidation } = useTBLValidationContext();
  
  // ✅ NOUVEAU: Calculer hasTable AVANT d'appeler le hook pour pouvoir le passer en paramètre
  const hasTableCapability = useMemo(() => {
    const capabilities = field.capabilities || {};
    const metadata = treeMetadata || {};
    return capabilities.table?.enabled || metadata.hasTable || false;
  }, [field.capabilities, treeMetadata]);
  
  // 🔗 Hook pour charger les options depuis un tableau lookup (si configuré)
  // ✅ NOUVEAU: On passe hasTableCapability pour que le hook vide les options quand le lookup est désactivé
  const tableLookup = useTBLTableLookup(field.id, field.id, hasTableCapability);
  
  // 🚨 DEBUG: Vérifier si le contexte fonctionne
  console.log(`🔍 [${field.label}] isValidation:`, isValidation, 'localValue:', localValue, 'tableLookup:', tableLookup);

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
    
    // 🔍 DEBUG: Log du type de champ calculé
    if (field.label === 'Test - liste') {
      console.log(`🔍 [FIELD TYPE CALC][${field.label}]:`, {
        baseSubType,
        hasTableLookup,
        'capabilities.table?.enabled': capabilities.table?.enabled,
        'metadata.hasTable': metadata.hasTable,
        finalSubType: subType
      });
    }
    // 🔥 CORRECTION: Lire l'apparence depuis field.config ET metadata.appearance
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
    console.log(`🎯 [${field.label}] handleChange appelé:`, { 
      newValue, 
      fieldId: field.id, 
      hasOnChange: !!onChange,
      onChangeType: typeof onChange,
      hasTableCapability: fieldConfig.hasTable,
      tableLookupOptionsCount: tableLookup.options.length
    });
    
    // ⚠️ DIAGNOSTIC : Champ dans section DATA (read-only) ?
    if (!onChange) {
      console.error(`❌ [${field.label}] onChange est undefined - Le champ est probablement dans une SECTION DE DONNÉES (read-only) !`);
      console.error(`💡 SOLUTION : Déplacez "${field.label}" dans une section normale (pas isDataSection) pour permettre l'édition.`);
      return;
    }
    
    setLocalValue(newValue);
    console.log(`✅ [${field.label}] APPEL onChange avec:`, newValue);
    onChange(newValue);
    console.log(`✔️ [${field.label}] onChange terminé`);
  };

  // Rendu conditionnel basé sur les conditions TreeBranchLeaf
  if (!conditionMet || !fieldConfig.visible) {
    return null;
  }

  // Affichage des capacités actives TreeBranchLeaf
  const renderCapabilityBadges = () => {
    const badges = [];
    
    if (fieldConfig.hasCondition) {
      badges.push(
        <Tag key="condition" icon={<BranchesOutlined />} color="blue" size="small">
          Condition
        </Tag>
      );
    }
    
    if (fieldConfig.hasFormula) {
      badges.push(
        <Tag key="formula" icon={<CalculatorOutlined />} color="green" size="small">
          Formule
        </Tag>
      );
    }
    
    if (fieldConfig.hasTable) {
      badges.push(
        <Tag key="table" icon={<TableOutlined />} color="purple" size="small">
          Table
        </Tag>
      );
    }
    
    if (fieldConfig.hasAPI) {
      badges.push(
        <Tag key="api" icon={<ApiOutlined />} color="orange" size="small">
          API
        </Tag>
      );
    }
    
    if (fieldConfig.hasMarkers) {
      badges.push(
        <Tag key="markers" icon={<TagOutlined />} color="cyan" size="small">
          Markers
        </Tag>
      );
    }

    return badges.length > 0 ? (
      <div className="mb-2 flex flex-wrap gap-1">
        {badges}
      </div>
    ) : null;
  };

  // Rendu du champ selon le type et la configuration TreeBranchLeaf
  const renderFieldInput = () => {
    // 🎯 PRIORITÉ 0: Table Lookup - Si le champ a un lookup configuré ET activé ET des options chargées
    if (fieldConfig.hasTable && tableLookup.options.length > 0) {
      return (
        <Select
          value={localValue}
          onChange={handleChange}
          placeholder={`Sélectionnez ${fieldConfig.label.toLowerCase()}`}
          loading={tableLookup.loading}
          showSearch
          allowClear
          disabled={disabled}
          style={{ width: '100%' }}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {tableLookup.options.map((option) => (
            <Option key={option.value} value={option.value} label={option.label}>
              {option.label}
            </Option>
          ))}
        </Select>
      );
    }

    // Si le lookup est activé ET en cours de chargement, afficher un état de chargement
    if (fieldConfig.hasTable && tableLookup.loading) {
      return (
        <Select
          value={localValue}
          onChange={handleChange}
          placeholder="Chargement..."
          loading={true}
          disabled
          style={{ width: '100%' }}
        />
      );
    }

    // 🚀 PRIORITÉ 1: Champs TreeBranchLeaf intelligents (générés dynamiquement)
    if (field.isTreeBranchLeafSmart && (field.hasData || field.hasFormula)) {
      const caps = field.capabilities || {};

      // 1) Si une formule est disponible, on la privilégie
      const formulaId = caps?.formula?.activeId 
        || (caps?.formula?.instances && Object.keys(caps.formula.instances).length > 0 ? Object.keys(caps.formula.instances)[0] : undefined);
      const hasFormulaConfig = Boolean(formulaId || caps?.formula?.currentFormula);
      if (hasFormulaConfig && formulaId) {
        const sourceRef = `formula:${formulaId}`;
  const currentFormula = caps?.formula?.currentFormula as FormulaConfigLocal | undefined;
  const rawExpression = currentFormula?.expression;
  const variablesDef = currentFormula?.variables ? Object.fromEntries(Object.entries(currentFormula.variables).map(([k,v]) => [k, { sourceField: (v as VariableDefLocal).sourceField, type: (v as VariableDefLocal).type }])) : undefined;
        return (
          <SmartCalculatedField
            sourceRef={sourceRef}
            formData={formData}
            displayFormat="number"
            unit={field.config?.unit}
            precision={field.config?.decimals || 2}
            placeholder="Calcul automatique..."
            rawExpression={rawExpression}
            variablesDefinition={variablesDef}
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
          const resolvedRef = meta.sourceRef.startsWith('condition:') || meta.sourceRef.startsWith('formula:') || meta.sourceRef.startsWith('@value.')
            ? meta.sourceRef
            : `variable:${variableId}`;
          
          // ✅ CORRECTION: Utiliser les mêmes propriétés que "Prix Kw/h test"
          const currentFormula = caps?.formula?.currentFormula as FormulaConfigLocal | undefined;
          const rawExpression = currentFormula?.expression;
          const variablesDef = currentFormula?.variables ? Object.fromEntries(Object.entries(currentFormula.variables).map(([k,v]) => [k, { sourceField: (v as VariableDefLocal).sourceField, type: (v as VariableDefLocal).type }])) : undefined;
          
          return (
            <SmartCalculatedField
              sourceRef={resolvedRef}
              formData={formData}
              displayFormat="number"
              unit={field.config?.unit}
              precision={field.config?.decimals || 2}
              placeholder="Calcul automatique..."
              rawExpression={rawExpression}
              variablesDefinition={variablesDef}
            />
          );
        }
        const sourceRef = `variable:${variableId}`;
  const currentFormula = caps?.formula?.currentFormula as FormulaConfigLocal | undefined;
  const rawExpression = currentFormula?.expression;
  const variablesDef = currentFormula?.variables ? Object.fromEntries(Object.entries(currentFormula.variables).map(([k,v]) => [k, { sourceField: (v as VariableDefLocal).sourceField, type: (v as VariableDefLocal).type }])) : undefined;
        return (
          <SmartCalculatedField
            sourceRef={sourceRef}
            formData={formData}
            displayFormat="number"
            unit={field.config?.unit}
            precision={field.config?.decimals || 2}
            placeholder="Calcul automatique..."
            rawExpression={rawExpression}
            variablesDefinition={variablesDef}
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
    
    // ✨ PRIORITÉ 1: Capacité Data (données dynamiques depuis TreeBranchLeafNodeVariable)
  if (capabilities.data?.enabled && (capabilities.data.activeId || capabilities.data.instances)) {
      
      // Récupérer la configuration de la variable active
      const dataInstance = capabilities.data.instances?.[capabilities.data.activeId] as {
        metadata?: {
          sourceType?: string;
          sourceRef?: string;
          fixedValue?: unknown;
        };
        displayFormat?: string;
        unit?: string;
        precision?: number;
      };
      if (dataInstance && dataInstance.metadata) {
        const { sourceType: configSourceType, sourceRef: configSourceRef, fixedValue } = dataInstance.metadata;
        
        // Mode arborescence (déléguer à la variable du nœud pour couvrir formules ET conditions)
        if (configSourceType === 'tree' && configSourceRef) {
          const instanceId = capabilities.data.activeId 
            || (capabilities.data.instances ? Object.keys(capabilities.data.instances)[0] : undefined)
            || field.id;
        const metaFormula = caps?.formula?.currentFormula as FormulaConfigLocal | undefined;
        const rawExpression = metaFormula?.expression || (dataInstance as { metadata?: { expression?: string } })?.metadata?.expression;
        let variablesDef = metaFormula?.variables ? Object.fromEntries(Object.entries(metaFormula.variables).map(([k,v]) => [k, { sourceField: (v as VariableDefLocal).sourceField, type: (v as VariableDefLocal).type }])) : undefined;
        // Fallback: certaines variables data peuvent exposer un metadata.variables (structure similaire)
        if (!variablesDef && (dataInstance as { metadata?: { variables?: Record<string, { sourceField: string; type?: string }> } })?.metadata?.variables) {
          const dv = (dataInstance as { metadata?: { variables?: Record<string, { sourceField: string; type?: string }> } }).metadata?.variables || {};
          variablesDef = Object.fromEntries(Object.entries(dv).map(([k,v]) => [k,{ sourceField: v.sourceField, type: v.type }]));
        }
          return (
            <SmartCalculatedField
              sourceRef={`variable:${instanceId}`}
              formData={formData}
              displayFormat={dataInstance.displayFormat}
              unit={dataInstance.unit}
              precision={dataInstance.precision}
              placeholder="Calcul en cours..."
              rawExpression={rawExpression}
              variablesDefinition={variablesDef}
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
    }
    
    // ✨ PRIORITÉ 2: Capacité Formula (formules directes)
    if (capabilities.formula?.enabled && capabilities.formula.currentFormula) {
      const currentFormula = capabilities.formula.currentFormula as FormulaConfigLocal | undefined;
  const rawExpression = currentFormula?.expression;
  const variablesDef = currentFormula?.variables ? Object.fromEntries(Object.entries(currentFormula.variables).map(([k,v]) => [k, { sourceField: (v as VariableDefLocal).sourceField, type: (v as VariableDefLocal).type }])) : undefined;
      return (
        <SmartCalculatedField
          sourceRef={`formula:${capabilities.formula.activeId}`}
          formData={formData}
          displayFormat="number"
          unit={fieldConfig.unit}
          precision={fieldConfig.decimals || 4}
          placeholder="Calcul en cours..."
          rawExpression={rawExpression}
          variablesDefinition={variablesDef}
        />
      );
    }
    
    // ✨ FALLBACK: Logique traditionnelle pour les champs sans capacités TreeBranchLeaf
    const finalValue = fieldConfig.hasFormula ? calculatedValue : localValue;
    const isReadOnly = fieldConfig.hasFormula && !fieldConfig.formulaConfig?.allowManualOverride;
    const isDisabled = disabled || isReadOnly;

    // 🎨 Construction du style avec largeur configurée
    const appearanceStyle = fieldConfig.appearance?.style || {};
    const treeAppearance = treeMetadata?.appearance || {};
    
    // Appliquer la largeur configurée depuis TreeBranchLeaf
    const widthStyle: React.CSSProperties = {};
    // 🔥 LARGEUR DYNAMIQUE PRISMA avec fallback - PRIORITÉ AUX DONNÉES PRISMA
    const dynamicWidth = fieldConfig.appearance?.width || fieldConfig.width || treeAppearance.width;
    const dynamicSize = fieldConfig.appearance?.size || fieldConfig.size || treeAppearance.size;
    
    // 🎯 FIX CRITICAL: Utiliser aussi les données directes du field pour les propriétés Prisma
    const prismaWidth = field.appearance_width || field.config?.appearance_width;
    const prismaSize = field.appearance_size || field.config?.appearance_size;
    
    const finalWidth = prismaWidth || dynamicWidth;
    const finalSize = prismaSize || dynamicSize;
    
    if (finalWidth) {
      widthStyle.width = finalWidth;
    } else if (finalSize) {
      // Conversion des tailles prédéfinies
      switch (finalSize) {
        case 'sm':
        case 'small':
          widthStyle.width = '200px';
          break;
        case 'lg':
        case 'large':
          widthStyle.width = '400px';
          break;
        case 'full':
          widthStyle.width = '100%';
          break;
        case 'md':
        case 'medium':
        default:
          widthStyle.width = '300px'; // medium par défaut
      }
    } else {
      // Par défaut, prendre toute la largeur disponible
      widthStyle.width = '100%';
    }

    const commonProps = {
      disabled: isDisabled,
      // 🔥 PLACEHOLDER DYNAMIQUE PRISMA - PRIORITÉ AUX DONNÉES DIRECTES
      placeholder: field.text_placeholder || field.placeholder || fieldConfig.textConfig?.placeholder || fieldConfig.placeholder || `Saisissez ${fieldConfig.label.toLowerCase()}`,
      status: validationError && isValidation ? 'error' as const : validationError && !isValidation ? 'success' as const : undefined,
      // 🔥 TAILLE DYNAMIQUE PRISMA avec fallback - UTILISER LES DONNÉES FINALES
      size: finalSize || fieldConfig.appearance?.size || 'middle' as const,
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
        const finalOptions = (fieldConfig.hasTable && tableLookup.options.length > 0) ? tableLookup.options : staticOptions;
        
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
      style={{ width: '100%' }}
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
      
      {fieldConfig.hasFormula && (
        <Alert
          message="Valeur calculée automatiquement"
          description={
            <div>
              <Text code>{fieldConfig.formulaConfig?.formula || 'Non définie'}</Text>
              {fieldConfig.formulaConfig?.allowManualOverride && (
                <div className="mt-1">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Vous pouvez modifier manuellement cette valeur
                  </Text>
                </div>
              )}
            </div>
          }
          type="info"
          showIcon
          className="mt-2"
          size="small"
        />
      )}
      
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
