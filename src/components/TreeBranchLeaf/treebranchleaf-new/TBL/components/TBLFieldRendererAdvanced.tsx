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

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  MinusCircleOutlined,
  CameraOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { BackendValueDisplay } from './BackendValueDisplay';
import { HelpTooltip } from '../../../../common/HelpTooltip';
import { useTBLTooltip } from '../../../../../hooks/useTBLTooltip';
import { useTBLValidationContext } from '../contexts/TBLValidationContext';
import { useTBLTableLookup } from '../hooks/useTBLTableLookup';
import { type DynamicConstraints } from '../hooks/useDynamicConstraints';
import { getConstraintFormulas, extractSourceNodeIdFromTokens } from '../hooks/useNodeFormulas';
import { useTBLBatch } from '../contexts/TBLBatchContext';
import { useNodeCalculatedValue } from '../../../../../hooks/useNodeCalculatedValue';
import { generateMirrorVariants } from '../utils/mirrorNormalization';
import { tblLog, isTBLDebugEnabled } from '../../../../../utils/tblDebug';
// 🤖 AI Measure: Import du composant et de la fonction de config
import TBLImageFieldWithAI from './TBLImageFieldWithAI';
import { getAIMeasureConfig } from '../../../../../hooks/useAIMeasure';
// 🖼️ PHOTO MODE: Import pour afficher les images liées
import { ImageDisplayBubble } from './ImageDisplayBubble';

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
  // ✨ Multiplicateur/Valeur fixe conditionnel
  multiplier?: {
    enabled?: boolean;
    mode?: 'multiply' | 'fixed'; // 'multiply' = × facteur, 'fixed' = valeur directe
    conditions?: Array<{
      fieldA?: string;
      operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains';
      fieldB?: string;
    }>;
    conditionFieldA?: string;
    conditionFieldB?: string;
    conditionOperator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual';
    factor?: number;
    elseFactor?: number;
  };
}

// 🔄 Types pour les Extensions du Lookup (intégrées dans filterConditions)
interface LookupCondition {
  fieldRef: string;
  operator: string;
  value: string;
}
interface ActiveAlert {
  message: string;
  level: 'info' | 'warning' | 'error';
  label?: string;
}
interface LookupExtensionsResult {
  activeColumn?: string;
  capColumn?: string; // Colonne à lire pour comparer au plafond (ex: "KVA")
  activeCaps: Array<{ maxValue: number; scope: 'total' | 'per_unit'; label?: string }>;
  activeAlerts: ActiveAlert[];
}

// 🔄 Évaluer une condition de lookup (utilisé par columnOverrides, valueCaps, lookupAlerts)
const evaluateLookupCondition = (
  cond: LookupCondition,
  formData: Record<string, any>
): boolean => {
  if (!cond.fieldRef) return false;
  
  const resolveRef = (ref: string): any => {
    if (!ref) return null;
    if (ref.startsWith('@literal.')) return ref.replace('@literal.', '');
    if (ref.startsWith('@value.')) return formData[ref.replace('@value.', '')];
    if (ref.startsWith('@select.')) return formData[ref.replace('@select.', '')];
    if (ref.startsWith('@table.')) return formData[ref.replace('@table.', '')];
    if (ref.startsWith('@calculated.') || ref.startsWith('@calculated:')) {
      const nodeId = ref.replace(/^@calculated[.:]/, '');
      // Chercher la valeur dans formData avec différentes clés possibles
      if (formData[nodeId] !== undefined && formData[nodeId] !== null) return formData[nodeId];
      // Vérifier les clés __mirror_formula_ (valeurs calculées/agrégées)
      const mirrorKey = `__mirror_formula_${nodeId}`;
      if (formData[mirrorKey] !== undefined && formData[mirrorKey] !== null) return formData[mirrorKey];
      return null;
    }
    if (ref.startsWith('node-formula:')) return formData[ref.replace('node-formula:', '')];
    if (ref.startsWith('formula:')) return formData[ref.replace('formula:', '')];
    if (formData[ref] !== undefined) return formData[ref];
    return ref; // valeur littérale
  };

  const fieldValue = resolveRef(cond.fieldRef);
  const compareValue = resolveRef(cond.value);
  if (fieldValue === null || fieldValue === undefined) return false;
  
  const strA = String(fieldValue).trim().toLowerCase();
  const strB = String(compareValue).trim().toLowerCase();
  const numA = Number(fieldValue);
  const numB = Number(compareValue);
  
  switch (cond.operator) {
    case 'equals': {
      if (strA === strB) return true;
      // Support multi-valeurs séparées par " ; " (ex: "Triphasé 220-240v ; Tétraphasé 380-400v")
      const segsA = strA.includes(' ; ') ? strA.split(' ; ').map(s => s.trim()) : [strA];
      const segsB = strB.includes(' ; ') ? strB.split(' ; ').map(s => s.trim()) : [strB];
      return segsA.some(a => segsB.some(b => a.startsWith(b) || b.startsWith(a)));
    }
    case 'notEquals': return strA !== strB;
    case 'greaterThan': return !isNaN(numA) && !isNaN(numB) ? numA > numB : strA > strB;
    case 'lessThan': return !isNaN(numA) && !isNaN(numB) ? numA < numB : strA < strB;
    case 'greaterOrEqual': return !isNaN(numA) && !isNaN(numB) ? numA >= numB : strA >= strB;
    case 'lessOrEqual': return !isNaN(numA) && !isNaN(numB) ? numA <= numB : strA <= strB;
    case 'contains': return strA.includes(strB);
    case 'notContains': return !strA.includes(strB);
    default: return false;
  }
};

// 🔄 Évaluer les extensions du lookup (columnOverrides, valueCaps, lookupAlerts)
// Lit directement depuis filterConditions — PAS de système séparé
const evaluateLookupExtensions = (
  filterConditions: any,
  formData: Record<string, any>
): LookupExtensionsResult => {
  const result: LookupExtensionsResult = { activeCaps: [], activeAlerts: [] };
  if (!filterConditions) return result;

  // 0. Cap Column: quelle colonne contient la valeur à comparer aux plafonds (ex: "KVA")
  if (filterConditions.capColumn) {
    result.capColumn = filterConditions.capColumn;
  }

  // 1. Column Overrides (remplace columnSwitchRules)
  if (filterConditions.columnOverrides?.length) {
    for (const override of filterConditions.columnOverrides) {
      if (!override.enabled || !override.conditions?.length || !override.targetColumn) continue;
      if (override.conditions.every((c: LookupCondition) => evaluateLookupCondition(c, formData))) {
        result.activeColumn = override.targetColumn;
        break;
      }
    }
    if (!result.activeColumn && filterConditions.defaultColumn) {
      result.activeColumn = filterConditions.defaultColumn;
    }
  }

  // 2. Value Caps (plafonds de valeur)
  if (filterConditions.valueCaps?.length) {
    for (const cap of filterConditions.valueCaps) {
      if (!cap.enabled || !cap.conditions?.length) continue;
      if (cap.conditions.every((c: LookupCondition) => evaluateLookupCondition(c, formData))) {
        result.activeCaps.push({ maxValue: cap.maxValue, scope: cap.scope || 'total', label: cap.label });
      }
    }
  }

  // 3. Lookup Alerts (alertes contextuelles)
  if (filterConditions.lookupAlerts?.length) {
    for (const alert of filterConditions.lookupAlerts) {
      if (!alert.enabled || !alert.conditions?.length || !alert.message) continue;
      const condResults = alert.conditions.map((c: LookupCondition) => {
        const met = evaluateLookupCondition(c, formData);
        return { ref: c.fieldRef, op: c.operator, val: c.value, met };
      });
      const allMet = condResults.every((r: any) => r.met);
      console.log(`[LookupAlerts] "${alert.label}": ${allMet ? '✅ ACTIVE' : '❌ inactive'}`, condResults);
      if (allMet) {
        result.activeAlerts.push({ message: alert.message, level: alert.level || 'warning', label: alert.label });
      }
    }
  }

  return result;
};

// 🛡️ Normalisation des valeurs pour l'UI (évite le rendu d'objets React)
const normalizeValueForUi = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValueForUi(entry))
      .filter((entry) => entry !== undefined && entry !== null);
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const direct = obj.value ?? obj.label ?? obj.text ?? obj.display ?? obj.name ?? obj.title;
    if (direct !== undefined && direct !== null) {
      return normalizeValueForUi(direct);
    }

    // Cas spécifique adresse: { street, city, country, zipCode/postalCode }
    const street = obj.street ?? obj.address ?? obj.line1 ?? obj.route;
    const city = obj.city ?? obj.locality;
    const zip = obj.zipCode ?? obj.postalCode ?? obj.zip;
    const country = obj.country ?? obj.pays;
    const parts = [street, zip, city, country]
      .map((part) => (part !== undefined && part !== null ? String(part).trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }

    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }

  return value;
};

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
  
  // Log supprimé - trop verbeux

  const results = conditions.map(condition => {
    // 1. Extraire la valeur de référence depuis formData
    let referenceValue: any = null;
    
    if (condition.compareWithRef?.startsWith('@value.')) {
      const fieldId = condition.compareWithRef.replace('@value.', '');
      referenceValue = formData[fieldId];
    } else if (condition.compareWithRef?.startsWith('@select.')) {
      const fieldId = condition.compareWithRef.replace('@select.', '');
      referenceValue = formData[fieldId];
    } else if (condition.compareWithRef?.startsWith('@table.')) {
      // Support pour les références @table.{nodeId}
      const nodeId = condition.compareWithRef.replace('@table.', '');
      referenceValue = formData[nodeId];
    } else if (condition.compareWithRef?.startsWith('@calculated.') || condition.compareWithRef?.startsWith('@calculated:')) {
      // Support pour les références @calculated.{nodeId}
      const nodeId = condition.compareWithRef.replace(/^@calculated[.:]/, '');
      referenceValue = formData[nodeId];
    } else if (condition.compareWithRef?.startsWith('node-formula:')) {
      // Support pour les références node-formula:
      const nodeId = condition.compareWithRef.replace('node-formula:', '');
      referenceValue = formData[nodeId];
    } else if (condition.compareWithRef?.startsWith('formula:')) {
      // Support pour les références formula:
      const formulaId = condition.compareWithRef.replace('formula:', '');
      referenceValue = formData[formulaId];
    } else if (condition.compareWithRef) {
      // Essayer d'abord comme clé dans formData, sinon traiter comme valeur littérale
      referenceValue = formData[condition.compareWithRef] ?? condition.compareWithRef;
    }
    
    // 🛡️ Normaliser: si referenceValue est un objet {value: 'xxx', label: 'yyy'}, extraire .value
    if (referenceValue && typeof referenceValue === 'object' && !Array.isArray(referenceValue) && 'value' in referenceValue) {
      referenceValue = (referenceValue as any).value;
    }
    
    // 🛡️ Si la valeur est vide/null/undefined (ex: select vidé), IGNORER cette condition
    // Aligné sur le comportement serveur: un champ vide = filtre inactif (pas de filtrage)
    // Couvre: null, undefined, '', [], objet vide
    if (
      referenceValue === null || 
      referenceValue === undefined || 
      referenceValue === '' ||
      (Array.isArray(referenceValue) && referenceValue.length === 0)
    ) {
      return true; // Condition ignorée = considérée comme passée
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
    // Log supprimé - trop verbeux
    
    const conditionResults = tableValues.map(originalTableValue => {
      let tableValue = originalTableValue;

      // ✨ Multiplicateur conditionnel : modifier tableValue avant la comparaison
      if (condition.multiplier?.enabled) {
        const mult = condition.multiplier;
        
        // Résoudre les valeurs des champs depuis formData — supporte les valeurs littérales
        const resolveMultiplierRef = (ref: string | undefined): any => {
          if (!ref) return null;
          // 🎯 Support @literal.xxx: retourner la valeur littérale sans résolution
          if (ref.startsWith('@literal.')) return ref.replace('@literal.', '');
          // 🎯 Support @column.COLNAME: accéder à une colonne pour l'option courante
          if (ref.startsWith('@column.')) {
            const colName = ref.replace('@column.', '');
            return extractValueFromColumn(option, colName, tableData, config);
          }
          if (ref.startsWith('@value.')) return formData[ref.replace('@value.', '')];
          if (ref.startsWith('@select.')) return formData[ref.replace('@select.', '')];
          if (ref.startsWith('@table.')) return formData[ref.replace('@table.', '')] ?? null;
          if (ref.startsWith('node-formula:')) return formData[ref.replace('node-formula:', '')];
          if (ref.startsWith('formula:')) return formData[ref.replace('formula:', '')];
          if (ref.startsWith('@calculated.') || ref.startsWith('@calculated:')) return formData[ref.replace(/^@calculated[.:]/, '')];
          // Si c'est une clé dans formData, utiliser cette valeur
          if (formData[ref] !== undefined) return formData[ref];
          // Sinon, c'est une valeur littérale (ex: "HUAWEI") — retourner telle quelle
          return ref;
        };
        
        // Construire le tableau de conditions (rétrocompat avec l'ancien format single-condition)
        const conditions = mult.conditions?.length
          ? mult.conditions
          : [{ fieldA: mult.conditionFieldA || '', operator: mult.conditionOperator || 'equals', fieldB: mult.conditionFieldB || '' }];
        
        // Évaluer chaque condition — TOUTES doivent être vraies (logique AND)
        const evaluateSingleCondition = (cond: { fieldA?: string; operator?: string; fieldB?: string }, condIdx?: number): boolean => {
          if (!cond.fieldA && !cond.fieldB) return false;
          const fieldAValue = resolveMultiplierRef(cond.fieldA);
          const fieldBValue = resolveMultiplierRef(cond.fieldB);
          // 🔍 DEBUG MULTIPLIER: Log les valeurs résolues pour chaque condition
          if (fieldAValue === null || fieldAValue === undefined || fieldBValue === null || fieldBValue === undefined) {
            console.log(`[Multiplier] Cond${condIdx ?? '?'}: "${cond.fieldA}" → ${JSON.stringify(fieldAValue)} | "${cond.fieldB}" → ${JSON.stringify(fieldBValue)} → NULL/UNDEFINED → FALSE`);
            return false;
          }
          
          switch (cond.operator || 'equals') {
            case 'equals': return String(fieldAValue).trim().toLowerCase() === String(fieldBValue).trim().toLowerCase();
            case 'notEquals': return String(fieldAValue).trim().toLowerCase() !== String(fieldBValue).trim().toLowerCase();
            case 'greaterThan': return Number(fieldAValue) > Number(fieldBValue);
            case 'lessThan': return Number(fieldAValue) < Number(fieldBValue);
            case 'greaterOrEqual': return Number(fieldAValue) >= Number(fieldBValue);
            case 'lessOrEqual': return Number(fieldAValue) <= Number(fieldBValue);
            case 'contains': return String(fieldAValue).toLowerCase().includes(String(fieldBValue).toLowerCase());
            default: return false;
          }
        };
        
        const allConditionsMet = conditions.every((cond: any, idx: number) => evaluateSingleCondition(cond, idx));
        
        const mode = mult.mode || 'multiply';
        if (mode === 'fixed') {
          // Mode valeur fixe: remplacer la valeur du tableau par la valeur ALORS ou SINON
          const fixedValue = allConditionsMet ? (mult.factor ?? 0) : (mult.elseFactor ?? 0);
          console.log(`[Fixed] ${conditions.length} condition(s) → ${allConditionsMet ? 'TOUTES VRAIES' : 'NON'} → tableValue ${originalTableValue} → ${fixedValue}`);
          tableValue = fixedValue;
        } else {
          // Mode multiplicateur: multiplier la valeur du tableau
          const factor = allConditionsMet ? (mult.factor ?? 2) : (mult.elseFactor ?? 1);
          // 🎯 sourceColumn: quand conditions vraies, lire la valeur depuis une autre colonne
          let baseValue = tableValue;
          if (allConditionsMet && mult.sourceColumn) {
            const sourceVal = extractValueFromColumn(option, mult.sourceColumn, tableData, config);
            if (sourceVal !== null && sourceVal !== undefined) {
              baseValue = sourceVal;
              console.log(`[Multiplier] sourceColumn "${mult.sourceColumn}" → baseValue = ${sourceVal}`);
            }
          }
          const numericValue = Number(baseValue);
          if (!isNaN(numericValue) && factor !== 1) {
            tableValue = numericValue * factor;
            console.log(`[Multiplier] ${conditions.length} condition(s) → ${allConditionsMet ? 'TOUTES VRAIES' : 'NON'} → ${allConditionsMet && mult.sourceColumn ? `sourceCol(${mult.sourceColumn})=${baseValue}` : `tableValue ${originalTableValue}`} × ${factor} = ${tableValue}`);
          } else if (!isNaN(numericValue)) {
            tableValue = numericValue;
          }
        }
      }

      // 🔧 Direction: tableValue [op] referenceValue (aligné sur le backend)
      // Ex: "P min WC" greaterOrEqual totalWC → P_min_WC >= totalWC
      let result = false;
      switch (condition.operator) {
        case 'equals':
          result = String(referenceValue).trim().toLowerCase() === String(tableValue).trim().toLowerCase();
          break;
        case 'notEquals':
          result = String(referenceValue).trim().toLowerCase() !== String(tableValue).trim().toLowerCase();
          break;
        case 'greaterThan':
          result = Number(tableValue) > Number(referenceValue);
          break;
        case 'lessThan':
          result = Number(tableValue) < Number(referenceValue);
          break;
        case 'greaterOrEqual':
          result = Number(tableValue) >= Number(referenceValue);
          break;
        case 'lessOrEqual':
          result = Number(tableValue) <= Number(referenceValue);
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
      
      // Log supprimé - trop verbeux
      return result;
    });
    
    // Si colonne ET ligne: toutes les conditions doivent passer (AND)
    // Si seulement colonne OU ligne: au moins une doit passer
    const conditionPassed = conditionResults.every(result => result);
    // Log supprimé - trop verbeux
    return conditionPassed;
  });

  // Combiner les résultats selon la logique
  const finalResult = filterLogic === 'AND' 
    ? results.every(result => result) 
    : results.some(result => result);
    
  // Log supprimé - trop verbeux
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
        // 🔧 FIX: D'abord essayer de matcher option.value comme valeur dans une COLONNE (pas un nom de colonne)
        // Car pour les tables type "onduleur/KVA", les options sont des valeurs de cellules, pas des en-têtes
        const keyColIndex = tableData.columns.indexOf(config.keyColumn);
        if (keyColIndex >= 0 && targetColIndex >= 0) {
          const matchingRowIndex = tableData.data.findIndex(row => {
            if (!row) return false;
            const cellValue = row[keyColIndex];
            return String(cellValue ?? '').trim().toLowerCase() === String(option.value ?? '').trim().toLowerCase();
          });
          if (matchingRowIndex >= 0 && tableData.data[matchingRowIndex]?.[targetColIndex] !== undefined) {
            return tableData.data[matchingRowIndex][targetColIndex];
          }
        }
        
        // Fallback: Lookup par colonne - l'option correspond à un NOM de colonne (cas Orientation/Inclinaison)
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
  hasLink?: boolean;
  
  // Colonnes directes pour les liens
  link_targetNodeId?: string | null;
  link_targetTreeId?: string | null;
  link_mode?: string | null;
  link_carryContext?: boolean | null;
  
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
  submissionId?: string; // ID de la soumission pour lire les valeurs sources des calculs
  allNodes?: RawTreeNode[]; // 🔥 NOUVEAU: Tous les nœuds pour hiérarchie Cascader
  // 🎯 Props de validation pour les couleurs dynamiques
  isValidating?: boolean;
  hasValidationError?: boolean;
  // 🤖 AI Measure: Callback pour mettre à jour n'importe quel champ par son ID
  onUpdateAnyField?: (fieldId: string, value: unknown) => void;
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
  PHOTO: {
    label: 'Photo',
    icon: '📸',
    category: 'media',
    variants: ['camera'],
    validation: ['required', 'fileSize']
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
  submissionId,
  allNodes = [],
  onUpdateAnyField // 🤖 AI Measure: Callback pour mettre à jour n'importe quel champ
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
  
  // � DEBUG 17/12/2025: Tracer pourquoi Onduleur n'est pas SELECT
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('TBL_DIAG') !== '1') return;

    if (field.label?.toLowerCase().includes('onduleur')) {
      console.log(`🔴 [DEBUG ONDULEUR] "${field.label}" (${field.id}):`, {
        hasTableCapability,
        fieldHasTable: field.hasTable,
        fieldCapabilities: field.capabilities,
        fieldCapabilitiesTableEnabled: field.capabilities?.table?.enabled,
        treeMetadataHasTable: treeMetadata?.hasTable,
        fieldType: field.type,
        fieldSubType: field.subType,
        fieldKeys: Object.keys(field)
      });
    }
    // 🔴 DEBUG: Tracer Orientation
    if (field.label?.toLowerCase() === 'orientation') {
      console.log(`🔴 [DEBUG ORIENTATION] "${field.label}" (${field.id}):`, {
        hasTableCapability,
        fieldHasTable: field.hasTable,
        fieldType: field.type,
        fieldSubType: field.subType,
      });
    }
  }, [field, hasTableCapability, treeMetadata]);
  
  // �🔗 Hook pour charger les options depuis un tableau lookup (si configuré)
  // ✅ NOUVEAU: On passe hasTableCapability pour que le hook vide les options quand le lookup est désactivé
  const repeaterTemplateNodeId = (field as Record<string, unknown> | undefined)?.repeaterTemplateNodeId as string | undefined;
  const originalFieldId = (field as Record<string, unknown> | undefined)?.originalFieldId as string | undefined;
  const metaOriginalNodeId = (field as Record<string, unknown> | undefined)?.metadata && (field as Record<string, any>).metadata?.originalNodeId as string | undefined;
  const sourceTemplateNodeId = (field as Record<string, any> | undefined)?.sourceTemplateId as string | undefined;
  // Détecteur d'UUID v4 simple
  const looksLikeUUID = (s?: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  // Éviter les IDs namespacés type node_123_abcdef
  const isNamespacedNodeLike = (s?: string) => typeof s === 'string' && /^node_\d+_[a-z0-9]+$/i.test(s);
  
  // 🔧 FIX 07/01/2026: Pour les champs créés via repeat (duplicatedFromRepeater=true),
  // TOUJOURS utiliser field.id au lieu de repeaterTemplateNodeId qui pointe à l'original
  const isDuplicatedFromRepeater = (field as Record<string, any>)?.metadata?.duplicatedFromRepeater === true;
  
  // Choisir le meilleur candidat d'ID pour le lookup table côté backend
  let lookupNodeId: string;
  
  if (isDuplicatedFromRepeater) {
    // Les champs dupliqués depuis repeat doivent utiliser leur propre ID, pas celui du template
    lookupNodeId = field.id;
    console.log(`[TBL-DEBUG] Champ dupliqué depuis repeat: ${field.label} (${field.id})`);
  } else {
    // Pour les champs normaux, essayer les autres candidats
    lookupNodeId = repeaterTemplateNodeId || originalFieldId || metaOriginalNodeId || sourceTemplateNodeId || field.id;
    
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
  }
  
  console.log(`[TBL-DEBUG] Field: ${field.label}, field.id=${field.id}, lookupNodeId=${lookupNodeId}, duplicatedFromRepeater=${isDuplicatedFromRepeater}`);

  // 🔧 FIX CRITIQUE: Pour les champs dupliqués avec suffix (-1, -2, etc.),
  // il faut charger la config du champ ORIGINAL (sans suffix)
  // Car TreeBranchLeafSelectConfig est lié à l'ID original uniquement
  const getBaseFieldId = (fieldId: string): string => {
    return fieldId.replace(/-(\d{1,3})$/, '');
  };
  
  const isDuplicatedWithSuffix = /-(\d{1,3})$/.test(field.id);
  const baseFieldId = getBaseFieldId(field.id);
  
  // Pour charger la config, on utilise toujours l'ID de base (sans suffix)
  // Exemple: "c071a466-abc-1" → "c071a466-abc"
  const configLookupId = isDuplicatedWithSuffix ? baseFieldId : lookupNodeId;

  // 🔧 FIX 06/01/2026: Le hook useTBLTableLookup charge la SelectConfig si elle existe
  // Si la SelectConfig n'existe pas, tableLookup.selectConfig sera null et ne causera pas de problème
  // Si elle existe, les options seront chargées depuis la table de capacité
  // ✅ On utilise configLookupId pour charger depuis l'ID de base (sans suffix)
  const tableLookup = useTBLTableLookup(configLookupId, configLookupId, hasTableCapability, formData);

  // 🔄 Évaluation des extensions du lookup (columnOverrides, valueCaps, lookupAlerts)
  const lookupExtensionsResult = useMemo(() => {
    const lookupConfig = field.capabilities?.table?.currentTable?.meta?.lookup;
    const fc = lookupConfig?.filterConditions;
    if (!fc) {
      return { activeCaps: [], activeAlerts: [] } as LookupExtensionsResult;
    }
    return evaluateLookupExtensions(fc, formData);
  }, [field.capabilities?.table?.currentTable?.meta?.lookup, formData]);

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
  
  // 🔥 Ref pour tracker si le changement vient de l'intérieur (éviter l'écrasement pendant la frappe)
  const isInternalChangeRef = useRef(false);
  const previousValueRef = useRef(value);
  const pendingEvaluations = useRef<number>(0); // Compteur d'évaluations API en cours au lieu de timestamp
  
  // Synchronisation avec la valeur externe - SEULEMENT si le changement vient de l'extérieur
  useEffect(() => {
    const isNumberField = field.type === 'NUMBER' || field.type === 'number';
    
    // 🔍 DEBUG: Tracer tous les changements de valeur externe pour les champs NUMBER
    if (isNumberField) {
      console.log(`🔍 [${field.label}] useEffect value change:`, {
        newValue: value,
        previousValue: previousValueRef.current,
        localValue,
        isInternalChange: isInternalChangeRef.current,
        pendingEvals: pendingEvaluations.current
      });
    }
    
    // Si c'est un changement interne qu'on vient de faire, ignorer
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      previousValueRef.current = value;
      if (isNumberField) {
        console.log(`✅ [${field.label}] Changement interne détecté - protection activée`);
      }
      return;
    }
    
    // 🛡️ PROTECTION CRITIQUE: Ne jamais écraser une valeur saisie manuellement avec null/undefined
    // Ceci se produit quand l'API preview-evaluate retourne null pour les champs non calculés
    const hasPendingEvaluations = pendingEvaluations.current > 0;
    const isValueBeingCleared = (value === null || value === undefined || value === '');
    const hasLocalValue = localValue !== null && localValue !== undefined && localValue !== '';
    
    if (hasPendingEvaluations && isValueBeingCleared && hasLocalValue) {
      console.log(`🛡️ [${field.label}] PROTECTION useEffect: ne pas écraser "${localValue}" avec "${value}" (${pendingEvaluations.current} évaluations en cours)`);
      return; // Ne pas mettre à jour - gardons la valeur locale
    }
    
    // Seulement synchroniser si la valeur a vraiment changé de l'extérieur
    // (par exemple initialisation, reset, ou changement depuis un autre composant)
    if (value !== previousValueRef.current) {
      if (isNumberField) {
        console.log(`🔄 [${field.label}] Synchronisation depuis extérieur: "${previousValueRef.current}" → "${value}"`);
      }
      setLocalValue(value);
      previousValueRef.current = value;
    }
  }, [value, localValue, field.label, field.type]);

  // 🎯 NOUVEAU: Écouter les événements de fin d'évaluation pour décrémenter le compteur
  useEffect(() => {
    const handleEvaluationComplete = () => {
      if (pendingEvaluations.current > 0) {
        pendingEvaluations.current--;
        console.log(`⬇️ [${field.label}] Évaluation terminée (${pendingEvaluations.current} restantes)`);
      }
    };

    window.addEventListener('tbl-evaluation-complete', handleEvaluationComplete);
    return () => window.removeEventListener('tbl-evaluation-complete', handleEvaluationComplete);
  }, [field.label]);

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
    // 🎯 PRIORITÉ DE RÉSOLUTION DU TYPE:
    // 1. field.type (déjà résolu par buildConditionalFieldFromNode: node.subType || node.fieldType || node.type)
    // 2. field.subType / field.fieldSubType (fallback direct depuis les colonnes DB)
    // 3. metadata.subType
    // 4. 'TEXT' (défaut)
    const rawFieldType = (field as any).subType || (field as any).fieldSubType || field.type;
    const nodeType = rawFieldType?.toUpperCase() || 'TEXT';
    const baseSubType = rawFieldType?.toUpperCase() || metadata.subType || nodeType; // 🎯 Type d'origine depuis Prisma
    
    // ✅ VRAI PRINCIPE: Respecter la configuration du champ telle que dans la DB
    // Le type du champ = ce qu'il est réellement (field.type), NOT une transformation arbitraire
    // Sauf si une table lookup config existe → le champ devient SELECT avec sa config
    
    // 🔧 FIX DÉFINITIF: La vraie source de vérité est tableLookup.config
    // Ce config vient de l'API /select-config et est chargé par useTBLTableLookup
    // Si tableLookup.config existe et n'est pas null, alors c'est un SELECT
    const hasRealTableLookupConfig = !!(tableLookup?.config);
    
    // LOGIQUE: 
    // - Si le champ a une table lookup config (chargée depuis l'API) → il doit être SELECT
    // - Sinon → respecter le type original (TEXT, NUMBER, etc.)
    // Les champs dupliqués respectent la même logique que le champ original
    
    let subType: string;
    
    if (hasRealTableLookupConfig) {
      // Ce champ a une vraie table lookup config → c'est un SELECT
      subType = 'SELECT';
    } else {
      // Pas de table lookup config → respecter le type original
      subType = baseSubType;
    }
    
    const metadataSelectConfig = (metadata.selectConfig || {}) as Record<string, unknown>;
    
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
    // metadataSelectConfig déjà défini ligne 1153
    const metadataCheckboxConfig = (metadata.checkboxConfig || {}) as Record<string, unknown>;
    const metadataDateConfig = (metadata.dateConfig || {}) as Record<string, unknown>;

    const resolvedRequired = pickDefined(
      normalizedAppearanceConfig.isRequired as boolean | undefined,
      field.required,
      metadata.isRequired,
      (metadata as Record<string, any>).required
    ) ?? false;

    // 🔧 FIX CRITIQUE: visibleToUser ne doit masquer un champ QUE si la capacité data est activée.
    // Le flag data_visibleToUser (@default(false) en DB) est conçu pour les champs calculés/display
    // (hasData=true) - pas pour les champs normaux. Sans cette garde, TOUS les champs seraient
    // masqués car le default Prisma est false.
    // 🎯 FIX: Les champs Total (-sum-total / isSumDisplayField) sont TOUJOURS visibles.
    // Ils sont créés avec data_visibleToUser=false mais doivent quand même s'afficher.
    const isSumTotalField = (typeof field.id === 'string' && field.id.endsWith('-sum-total')) || metadata.isSumDisplayField === true;
    const hasDataCapability = capabilities?.data?.enabled;
    const visibleToUserCheck = (hasDataCapability && !isSumTotalField)
      ? (normalizedAppearanceConfig.visibleToUser !== false) 
      : true; // Ignorer visibleToUser pour les champs sans capacité data ou les champs Total
    const resolvedVisible = (field.visible !== false) && (metadata.isVisible !== false) && visibleToUserCheck;

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
          // 📦 PRODUIT FIX: Si config.multiple est explicitement true, forcer mode 'multiple'
          (config.multiple === true) ? 'multiple' as const : undefined,
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

  // 🚀 OPTIMISÉ: Utiliser le batch au lieu de requêtes individuelles
  const { getFormulasForNode, getConditionsTargetingNode, isReady: batchReady } = useTBLBatch();
  
  // Récupérer les formules depuis le cache batch (pas de requête HTTP !)
  const nodeFormulas = useMemo(() => {
    if (!batchReady) return [];
    const formulas = getFormulasForNode(field.id);
    if (formulas.length > 0 && isTBLDebugEnabled()) {
      tblLog(`📋 [BATCH] "${field.label}" (${field.id}) - ${formulas.length} formule(s) depuis cache`);
    }
    return formulas;
  }, [field.id, field.label, getFormulasForNode, batchReady]);

  // 🎯 NOUVEAU: Extraction des formules de contrainte (number_max, number_min, etc.)
  const constraintFormulas = useMemo(() => {
    const formulas = getConstraintFormulas(nodeFormulas);
    if (formulas.length > 0 && isTBLDebugEnabled()) {
      tblLog(`🎯 [ConstraintFormulas] "${field.label}" a ${formulas.length} formule(s) de contrainte`);
    }
    return formulas;
  }, [nodeFormulas, field.label]);

  // 🎯 NOUVEAU: Récupérer le premier nodeId source des formules de contrainte
  const constraintSourceNodeId = useMemo(() => {
    if (constraintFormulas.length === 0) return null;
    // Prendre le premier sourceNodeId trouvé dans les tokens
    for (const formula of constraintFormulas) {
      const sourceId = extractSourceNodeIdFromTokens(formula.tokens);
      if (sourceId) {
        return sourceId;
      }
    }
    return null;
  }, [constraintFormulas, field.label]);

  const constraintSourceNodeLabel = useMemo(() => {
    if (!constraintSourceNodeId || !allNodes || allNodes.length === 0) return null;
    const match = allNodes.find((node) => node.id === constraintSourceNodeId);
    return match?.label || null;
  }, [allNodes, constraintSourceNodeId]);

  const constraintMirrorVariants = useMemo(() => {
    const variants = new Set<string>();
    if (constraintSourceNodeId) {
      generateMirrorVariants(constraintSourceNodeId).forEach((v) => variants.add(v));
    }
    if (constraintSourceNodeLabel) {
      generateMirrorVariants(constraintSourceNodeLabel).forEach((v) => variants.add(v));
    }
    return Array.from(variants);
  }, [constraintSourceNodeId, constraintSourceNodeLabel]);

  // ⚠️ Ne pas passer submissionId si c'est un champ DISPLAY
  // Les display fields calculent en temps réel basés sur l'arbre uniquement
  const isDisplayField = field?.fieldType === 'DISPLAY' || field?.type === 'DISPLAY';
  
  const { value: constraintBackendValue } = useNodeCalculatedValue(
    constraintSourceNodeId || '',
    treeId || '',
    isDisplayField ? undefined : submissionId
  );

  // 🎯 NOUVEAU: Récupérer la valeur du champ source depuis formData OU via useBackendValue
  // D'abord on cherche dans formData (plus rapide et plus fiable)
  const constraintSourceValue = useMemo(() => {
    if (!constraintSourceNodeId) return undefined;
    
    // Chercher la valeur dans formData avec différentes clés possibles
    const possibleKeys = new Set<string>([
      constraintSourceNodeId,
      `${constraintSourceNodeId}-1`, // Avec suffix
      constraintSourceNodeId.replace(/-1$/, ''), // Sans suffix
      `${constraintSourceNodeId}-sum-total`,
      `__mirror_formula_${constraintSourceNodeId}`, // Valeur calculée miroir
      `__mirror_formula_${constraintSourceNodeId}-1`,
      `__mirror_formula_${constraintSourceNodeId}-sum-total`
    ]);

    constraintMirrorVariants.forEach((variant) => {
      possibleKeys.add(`__mirror_formula_${variant}`);
      possibleKeys.add(`__mirror_formula_${variant}-sum-total`);
    });

    let foundValue: unknown;
    let foundKey: string | null = null;

    for (const key of possibleKeys) {
      if (!key) continue;
      const value = formData[key];
      if (value !== undefined && value !== null && value !== '') {
        foundValue = value;
        foundKey = key;
        break;
      }
    }

    const hasBackendValue = constraintBackendValue !== undefined && constraintBackendValue !== null && constraintBackendValue !== '';

    if (foundKey) {
      if (hasBackendValue && typeof foundValue === 'number' && foundValue === 0 && constraintBackendValue !== foundValue) {
        return constraintBackendValue;
      }
      return foundValue;
    }

    if (hasBackendValue) {
      return constraintBackendValue;
    }
    
    return undefined;
  }, [constraintSourceNodeId, formData, field.label, constraintMirrorVariants, constraintBackendValue]);

  // 🎯 NOUVEAU: Construire les contraintes dynamiques à partir de la valeur calculée
  const dynamicConstraints = useMemo<DynamicConstraints>(() => {
    const constraints: DynamicConstraints = {};
    
    if (constraintFormulas.length === 0 || constraintSourceValue === undefined) {
      return constraints;
    }

    // Log supprimé - trop verbeux

    for (const formula of constraintFormulas) {
      const targetProp = formula.targetProperty;
      if (!targetProp) continue;
      
      const value = constraintSourceValue;
      if (value === undefined || value === null) continue;

      // Convertir selon le type de contrainte
      if (['number_max', 'number_min', 'step'].includes(targetProp)) {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        if (!isNaN(numValue)) {
          (constraints as Record<string, number>)[targetProp] = numValue;
          // Log supprimé - trop verbeux
        }
        // 🆕 Récupérer le message de contrainte depuis la formule
        if (formula.constraintMessage) {
          constraints.constraintMessage = formula.constraintMessage;
        }
      } else if (['visible', 'required', 'disabled'].includes(targetProp)) {
        (constraints as Record<string, boolean>)[targetProp] = Boolean(value);
      }
    }

    return constraints;
  }, [constraintFormulas, constraintSourceValue, constraintSourceNodeId, field.label]);

  // 🚀 CRITIQUE: Fusionner les conditions directes ET les conditions inversées (SHOW/HIDE targets)
  const allConditions = useMemo(() => {
    // D'abord les conditions directes du champ
    const directConditions = field.conditions || [];
    
    // Ensuite les conditions inversées (ce champ est ciblé par SHOW/HIDE d'une autre condition)
    const inverseConditions = batchReady ? getConditionsTargetingNode(field.id) : [];
    
    // Convertir les conditions inversées au format attendu
    const convertedInverse = inverseConditions.map(inv => ({
      dependsOn: inv.dependsOn,
      operator: inv.operator === '==' ? 'equals' : 
               inv.operator === '!=' ? 'not_equals' : 
               inv.operator === '>' ? 'greater_than' : 
               inv.operator === '<' ? 'less_than' : 
               inv.operator,
      showWhen: inv.showWhen,
      actionType: inv.actionType, // SHOW ou HIDE
      isInverse: true as const
    }));
    
    // Log si on trouve des conditions inversées
    if (convertedInverse.length > 0) {
      console.log(`🎯 [TBLFieldRendererAdvanced] "${field.label}" (${field.id}) a ${convertedInverse.length} condition(s) inversée(s):`, convertedInverse);
    }
    
    return [...directConditions, ...convertedInverse];
  }, [field.conditions, field.id, field.label, batchReady, getConditionsTargetingNode]);

  // Gestion des conditions du champ (système useTBLData + conditions inversées)
  useEffect(() => {
    if (!allConditions || allConditions.length === 0) {
      setConditionMet(true);
      return;
    }

    let isVisible = true;
    let hasShowCondition = false; // Pour gérer le SHOW: masqué par défaut si condition SHOW existe
    
    // Vérifier chaque condition
    for (const condition of allConditions) {
      let dependentValue = formData[condition.dependsOn];
      
      // 🔧 FIX: Si la valeur directe n'existe pas, c'est peut-être un ID d'option
      // (ex: @select.optionId). Chercher si un select field a cet optionId comme valeur sélectionnée.
      if (dependentValue === undefined && condition.dependsOn) {
        const isSelectedAsOption = Object.values(formData).some(v => v === condition.dependsOn);
        if (isSelectedAsOption) {
          // L'option EST sélectionnée → la valeur dépendante est l'ID de l'option
          dependentValue = condition.dependsOn;
        }
      }
      
      let conditionResult = false;
      
      switch (condition.operator) {
        case 'equals':
        case '==':
          conditionResult = dependentValue === condition.showWhen;
          break;
        case 'not_equals':
        case '!=':
          conditionResult = dependentValue !== condition.showWhen;
          break;
        case 'contains':
          conditionResult = String(dependentValue || '').includes(String(condition.showWhen));
          break;
        case 'not_contains':
          conditionResult = !String(dependentValue || '').includes(String(condition.showWhen));
          break;
        case 'greater_than':
        case '>':
          conditionResult = Number(dependentValue) > Number(condition.showWhen);
          break;
        case 'less_than':
        case '<':
          conditionResult = Number(dependentValue) < Number(condition.showWhen);
          break;
        case 'isEmpty':
          conditionResult = dependentValue === undefined || dependentValue === null || String(dependentValue).trim() === '';
          break;
        case 'isNotEmpty':
          conditionResult = dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '';
          break;
        default:
          conditionResult = true;
      }
      
      console.log(`🔍 [TBLFieldRendererAdvanced] Condition "${field.label}": dependentValue="${dependentValue}", op="${condition.operator}", showWhen="${condition.showWhen}" → ${conditionResult}`);
      
      // 🔥 CRITIQUE: Gérer les actions SHOW vs HIDE
      const isInverseCondition = 'isInverse' in condition && condition.isInverse;
      const actionType = 'actionType' in condition ? condition.actionType : 'SHOW';
      
      if (isInverseCondition) {
        if (actionType === 'SHOW') {
          hasShowCondition = true;
          // SHOW: visible seulement si la condition est vraie
          if (!conditionResult) {
            isVisible = false;
          }
        } else if (actionType === 'HIDE') {
          // HIDE: masqué seulement si la condition est vraie
          if (conditionResult) {
            isVisible = false;
          }
        }
      } else {
        // Condition classique: visible si la condition est vraie
        if (!conditionResult) {
          isVisible = false;
          break;
        }
      }
    }
    
    console.log(`🔍 [TBLFieldRendererAdvanced] Champ "${field.label}" (${field.id}) visible: ${isVisible}, hasShowCondition: ${hasShowCondition}`);
    setConditionMet(isVisible);
  }, [allConditions, formData, field.label, field.id]);

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
            // 🎯 NOUVEAU: Utiliser les contraintes dynamiques en priorité
            const min = dynamicConstraints.number_min ?? fieldConfig.numberConfig?.min;
            const max = dynamicConstraints.number_max ?? fieldConfig.numberConfig?.max;
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
  }, [fieldConfig, calculatedValue, localValue, isValidation, field.text_maxLength, dynamicConstraints]);

  // 🎯 Auto-sélection intelligente pour les champs SELECT avec table lookup
  // Quand les filtres changent (via formData), gérer automatiquement la sélection :
  // - Si aucune option disponible : vider la sélection
  // - Si la valeur actuelle est invalide : auto-sélectionner la première option
  // 🔥 FIX: Utiliser des refs pour éviter les boucles de rendu infinies (React Error #185)
  const lastAutoSelectedValueRef = useRef<unknown>(null);
  const lastOptionsSignatureRef = useRef<string>('');
  
  useEffect(() => {
    // Ne s'applique qu'aux champs SELECT avec table lookup activé
    if (fieldConfig.fieldType !== 'SELECT' || !fieldConfig.hasTable) return;
    
    // Ne rien faire pendant le chargement initial
    if (tableLookup.loading) return;
    
    // Calculer une signature des options pour éviter les re-exécutions inutiles
    const optionsSignature = (tableLookup.options || []).map(o => o.value).join(',');
    if (optionsSignature === lastOptionsSignatureRef.current) return;
    lastOptionsSignatureRef.current = optionsSignature;
    
    const currentValue = localValue;
    
    // CAS 1 : Aucune option disponible → VIDER la sélection
    if (!tableLookup.options || tableLookup.options.length === 0) {
      if (currentValue !== null && currentValue !== undefined && currentValue !== '' && lastAutoSelectedValueRef.current !== null) {
        console.log(`🧹 [Auto-Clear] Champ "${field.label}": Aucune option disponible, vidage de la sélection`);
        lastAutoSelectedValueRef.current = null;
        // 🚀 FIX R18: Utiliser handleChange au lieu de onChange direct
        // pour passer par toute la chaîne (normalisation, protection, etc.)
        handleChange(null);
        setLocalValue(null);
      }
      return;
    }
    
    // CAS 2 : Vérifier si la valeur actuelle est toujours valide
    const isCurrentValueValid = currentValue && tableLookup.options.some(
      opt => String(opt.value) === String(currentValue)
    );
    
    // CAS 3 : Si la valeur actuelle n'est plus valide, auto-sélectionner la première option
    // 🔥 FIX: Ne pas re-sélectionner si on vient déjà d'auto-sélectionner cette valeur
    if (!isCurrentValueValid && tableLookup.options.length > 0) {
      const firstOption = tableLookup.options[0];
      if (lastAutoSelectedValueRef.current !== firstOption.value) {
        console.log(`🔄 [Auto-Select] Champ "${field.label}": Valeur "${currentValue}" invalide, sélection automatique de "${firstOption.label}"`);
        lastAutoSelectedValueRef.current = firstOption.value;
        // 🚀 FIX R18+R21: Utiliser handleChange pour passer par toute la chaîne
        // et déclencher le recalcul des champs d'affichage (capacités, prix, etc.)
        handleChange(firstOption.value);
        setLocalValue(firstOption.value);
        
        // 🎯 FIX CAPACITÉS: Forcer un dispatch tbl-force-retransform après un délai
        // pour garantir que les champs DISPLAY (capacités) se recalculent
        // quand l'auto-sélection est déclenchée par un changement de filtres
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            console.log(`🔄 [Auto-Select] Champ "${field.label}": Dispatch forcé tbl-force-retransform pour recalcul des capacités`);
            window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
              detail: {
                source: 'auto-select-capacities',
                nodeId: field.id,
                timestamp: Date.now()
              }
            }));
          }
        }, 500); // Après le debounce de 300ms + marge
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableLookup.options, tableLookup.loading, fieldConfig.fieldType, fieldConfig.hasTable, field.label]);

  // Gestionnaire de changement unifié
  const handleChange = (newValue: unknown) => {
    // ⚠️ DIAGNOSTIC : Champ dans section DATA (read-only) ?
    if (!onChange) {
      console.error(`❌ [${field.label}] onChange est undefined - Le champ est probablement dans une SECTION DE DONNÉES (read-only) !`);
      console.error(`💡 SOLUTION : Déplacez "${field.label}" dans une section normale (pas isDataSection) pour permettre l'édition.`);
      return;
    }
    
    // �️ PROTECTION PRIMAIRE: Empêcher l'écrasement par null juste après une saisie utilisateur
    // Cette protection arrive AVANT setLocalValue(), donc elle empêche la corruption à la source
    const hasPendingEvaluations = pendingEvaluations.current > 0;
    const isValueBeingCleared = (newValue === null || newValue === undefined || newValue === '');
    const hasLocalValue = localValue !== null && localValue !== undefined && localValue !== '';
    
    if (hasPendingEvaluations && isValueBeingCleared && hasLocalValue) {
      console.log(`🛡️ [${field.label}] PROTECTION handleChange: ne pas écraser "${localValue}" avec "${newValue}" (${pendingEvaluations.current} évaluations en cours)`);
      return; // Bloquer complètement - ne pas appeler setLocalValue
    }
    
    // 🔥 Marquer ce changement comme interne pour éviter que le useEffect ne l'écrase
    isInternalChangeRef.current = true;
    
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

    // 🔗 DEBUG LINK: Accès aux propriétés via cast pour contourner TypeScript
    const fieldAsAny = field as Record<string, unknown>;
    
    // 🔗 FIX: Si hasLink n'est pas sur field, chercher dans allNodes
    // Les propriétés Link peuvent être perdues lors de la transformation, mais elles sont toujours sur le node original
    const originalNode = allNodes?.find((n: { id?: string }) => n.id === field.id) as Record<string, unknown> | undefined;
    
    const fieldHasLink = Boolean(fieldAsAny.hasLink ?? originalNode?.hasLink);
    const fieldLinkTargetNodeId = (fieldAsAny.link_targetNodeId ?? originalNode?.link_targetNodeId) as string | undefined;
    const fieldLinkMode = (fieldAsAny.link_mode ?? originalNode?.link_mode) as string | undefined;
    
    // 🔗 DEBUG DYNAMIQUE: Logger TOUS les champs avec link détecté (pas de hardcoding)
    if (fieldHasLink || fieldLinkTargetNodeId) {
      console.log(`🔗 [LINK] Champ "${fieldConfig.label}" (${field.id}) hasLink=${fieldHasLink}, target=${fieldLinkTargetNodeId}, mode=${fieldLinkMode}`);
      // 🔍 DEBUG DÉTAILLÉ pour comprendre d'où vient (ou ne vient pas) link_mode
      console.log(`🔗 [LINK DEBUG] fieldAsAny.link_mode=${fieldAsAny.link_mode}, originalNode?.link_mode=${originalNode?.link_mode}`);
    }

    // 🔗 PRIORITÉ 0: Capacité Link (affiche la valeur d'un autre champ)
    // Si le champ a un lien configuré, on affiche la valeur du champ cible
    const hasLinkCapability = Boolean(fieldHasLink && fieldLinkTargetNodeId);
    
    if (hasLinkCapability && fieldLinkTargetNodeId) {
      const targetNodeId = fieldLinkTargetNodeId;
      
      // 🖼️ MODE PHOTO: Afficher une image au lieu d'une valeur texte
      if (fieldLinkMode === 'PHOTO') {
        // 🎯 FIX: Passer les deux IDs pour que ImageDisplayBubble cherche dans formData[fieldId] ET formData[sourceNodeId]
        return wrapWithCustomTooltip(
          <ImageDisplayBubble
            fieldId={field.id}
            sourceNodeId={targetNodeId}
            label={field.label || 'Photo'}
            formData={formData as Record<string, unknown>}
            size={60}
          />,
          field
        );
      }
      
      // 🔗 MODE JUMP/APPEND_SECTION: Afficher la valeur texte du champ lié
      // 🎯 FIX: Le serveur stocke la valeur Link sous le nodeId du champ lui-même (field.id)
      // pas sous le targetNodeId ! Donc on cherche d'abord dans formData[field.id]
      let linkedValue = formData?.[field.id];
      
      // 🔍 DEBUG: Tracer la recherche de la valeur liée
      console.log(`🔍🔍🔍 [LINK VALUE SEARCH] Champ "${field.label}" (${field.id}):`);
      console.log(`   - formData[field.id]="${formData?.[field.id]}"`);
      console.log(`   - formData[targetNodeId]="${formData?.[targetNodeId]}"`);
      console.log(`   - targetNodeId="${targetNodeId}"`);
      console.log(`   - fieldLinkMode="${fieldLinkMode}"`);
      // Afficher toutes les clés qui contiennent "photo" ou l'ID
      const relevantKeys = Object.keys(formData || {}).filter(k => 
        k.toLowerCase().includes('photo') || 
        k.includes(field.id) || 
        k.includes(targetNodeId)
      );
      console.log(`   - Clés pertinentes dans formData:`, relevantKeys);
      
      // 🎯 ÉTAPE 1b: Si pas trouvé sous field.id, chercher sous targetNodeId (ancien comportement)
      if (linkedValue === undefined || linkedValue === null || linkedValue === '') {
        linkedValue = formData?.[targetNodeId];
      }
      
      // 🎯 ÉTAPE 2: Si pas trouvé, essayer avec des variantes de clé
      if (linkedValue === undefined || linkedValue === null || linkedValue === '') {
        // Essayer avec le label du nœud cible si disponible
        const targetLabel = (field as Record<string, unknown>).link_targetLabel as string | undefined;
        if (targetLabel && formData?.[targetLabel] !== undefined) {
          linkedValue = formData[targetLabel];
        }
      }
      
      // 🎯 ÉTAPE 3: Chercher dans les clés qui contiennent l'ID du nœud
      if (linkedValue === undefined || linkedValue === null || linkedValue === '') {
        for (const key of Object.keys(formData || {})) {
          if (key.includes(targetNodeId)) {
            linkedValue = formData[key];
            break;
          }
        }
      }
      
      // 🎯 ÉTAPE 4: Chercher le nœud cible dans allNodes pour avoir son label
      if (linkedValue === undefined || linkedValue === null || linkedValue === '') {
        const targetNode = allNodes?.find((n: { id?: string }) => n.id === targetNodeId);
        if (targetNode) {
          const targetLabel = (targetNode as { label?: string }).label;
          
          // Chercher dans formData avec le label
          if (targetLabel) {
            // Essayer avec le label exact
            if (formData?.[targetLabel] !== undefined) {
              linkedValue = formData[targetLabel];
            }
            // Essayer avec miroir data
            if (linkedValue === undefined || linkedValue === null || linkedValue === '') {
              const mirrorKey = `__mirror_data_${targetLabel}`;
              if (formData?.[mirrorKey] !== undefined) {
                linkedValue = formData[mirrorKey];
              }
            }
          }
        }
      }
      
      // Si on a trouvé une valeur dans formData, l'afficher directement
      if (linkedValue !== undefined && linkedValue !== null && linkedValue !== '') {
        // 🎯 GESTION DES TABLEAUX (SELECT multiples ou cascader)
        if (Array.isArray(linkedValue)) {
          // Pour un cascader ou select multiple, afficher le dernier élément ou joindre
          const displayValue = linkedValue.length > 0 
            ? linkedValue[linkedValue.length - 1] // Dernier élément pour cascader
            : '---';
          
          return wrapWithCustomTooltip(
            <>{displayValue}</>,
            field
          );
        }
        
        // 🖼️ DÉTECTION AUTOMATIQUE DES IMAGES: Si la valeur est une URL d'image, afficher ImageDisplayBubble
        // Ceci fonctionne même si link_mode n'est pas "PHOTO" - détection intelligente
        if (typeof linkedValue === 'string') {
          // 🔍 DEBUG: Afficher la valeur pour voir ce qu'on reçoit
          console.log(`🔍 [LINK IMAGE CHECK] Champ "${field.label}" - valeur type=${typeof linkedValue}, debut="${String(linkedValue).substring(0, 80)}..."`);
          
          // Détection des différents types d'URLs d'images
          const isDataImage = linkedValue.startsWith('data:image');
          const isBlobUrl = linkedValue.startsWith('blob:');
          const isHttpImage = linkedValue.startsWith('http') && (
            linkedValue.includes('.jpg') || 
            linkedValue.includes('.jpeg') || 
            linkedValue.includes('.png') || 
            linkedValue.includes('.gif') || 
            linkedValue.includes('.webp') ||
            linkedValue.includes('.svg') ||
            linkedValue.includes('/image')
          );
          
          const isImageUrl = isDataImage || isBlobUrl || isHttpImage;
          console.log(`🔍 [LINK IMAGE CHECK] isDataImage=${isDataImage}, isBlobUrl=${isBlobUrl}, isHttpImage=${isHttpImage}, isImageUrl=${isImageUrl}`);
          
          if (isImageUrl) {
            console.log(`🖼️ [LINK] Détection automatique d'image RÉUSSIE pour "${field.label}"`);
            return wrapWithCustomTooltip(
              <ImageDisplayBubble
                fieldId={field.id}
                sourceNodeId={targetNodeId}
                label={field.label || 'Photo'}
                formData={{ ...formData, [field.id]: linkedValue } as Record<string, unknown>}
                size={60}
              />,
              field
            );
          }
        }
        
        // Formatage de la valeur
        let displayValue: string;
        if (typeof linkedValue === 'number') {
          displayValue = linkedValue.toFixed(fieldConfig.decimals || 2);
        } else if (typeof linkedValue === 'string') {
          // 🔗 NOUVEAU: Si c'est un ID d'option, essayer de trouver le label correspondant
          const targetNode = allNodes?.find((n: { id?: string }) => n.id === targetNodeId);
          if (targetNode) {
            const targetOptions = (targetNode as { options?: Array<{ id?: string; value?: string; label?: string }> }).options;
            if (targetOptions && Array.isArray(targetOptions)) {
              // Chercher l'option par value ou id
              const matchedOption = targetOptions.find(
                opt => opt.value === linkedValue || opt.id === linkedValue
              );
              if (matchedOption?.label) {
                displayValue = matchedOption.label;
                console.log(`🔗 [LINK] Option trouvée: "${linkedValue}" -> label="${displayValue}"`);
              } else {
                displayValue = linkedValue;
              }
            } else {
              // Pas un SELECT, afficher la valeur directement
              const num = parseFloat(linkedValue);
              if (!isNaN(num) && fieldConfig.decimals !== undefined) {
                displayValue = num.toFixed(fieldConfig.decimals || 2);
              } else {
                displayValue = linkedValue;
              }
            }
          } else {
            const num = parseFloat(linkedValue);
            if (!isNaN(num) && fieldConfig.decimals !== undefined) {
              displayValue = num.toFixed(fieldConfig.decimals || 2);
            } else {
              displayValue = linkedValue;
            }
          }
        } else {
          displayValue = String(linkedValue);
        }
        
        // Ajouter l'unité si présente
        if (fieldConfig.unit) {
          displayValue = `${displayValue} ${fieldConfig.unit}`;
        }
        
        return wrapWithCustomTooltip(
          <>{displayValue}</>,
          field
        );
      }
      
      // 🎯 FALLBACK: Utiliser BackendValueDisplay pour récupérer via API
      // 🔗 FIX: Utiliser field.id (le nodeId du champ Link) car c'est là que le serveur stocke la valeur
      if (!treeId) {
        return <span style={{ color: '#888' }}>---</span>;
      }
      
      return wrapWithCustomTooltip(
        <BackendValueDisplay
          nodeId={field.id}
          treeId={treeId}
          formData={formData}
          unit={fieldConfig.unit}
          precision={fieldConfig.decimals || 2}
          placeholder="---"
        />,
        field
      );
    }

    // �🚀 PRIORITÉ 1: Champs TreeBranchLeaf intelligents (générés dynamiquement)
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
    const useCalculatedValue = fieldConfig.hasFormula && !manualOverrideAllowed && !formulaIsConstraint;
    const finalValueRaw = useCalculatedValue ? calculatedValue : localValue;
    const finalValue = normalizeValueForUi(finalValueRaw);
    const isReadOnly = useCalculatedValue;
    const isDisabled = disabled || isReadOnly;
    
    // 🔍 DEBUG: Log pour diagnostiquer les champs désactivés
    if (isDisabled && fieldConfig.fieldType === 'NUMBER') {
      console.log(`❌ [NUMBER DISABLED] "${fieldConfig.label}":`, {
        disabled,
        isReadOnly,
        useCalculatedValue,
        hasFormula: fieldConfig.hasFormula,
        manualOverrideAllowed,
        formulaIsConstraint,
        finalValue,
        localValue
      });
    }

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
          // 🎯 NOUVEAU: Appliquer les contraintes dynamiques au slider
          const sliderMin = dynamicConstraints.number_min ?? fieldConfig.numberConfig?.min ?? fieldConfig.min;
          const sliderMax = dynamicConstraints.number_max ?? fieldConfig.numberConfig?.max ?? fieldConfig.max;
          const sliderStep = dynamicConstraints.step ?? fieldConfig.numberConfig?.step ?? fieldConfig.step ?? 1;
          
          return (
            <div>
              <Slider
                disabled={isDisabled}
                value={Number(finalValue) || fieldConfig.numberConfig?.defaultValue || fieldConfig.defaultValue || 0}
                onChange={handleChange}
                // 🔥 PARAMÈTRES DYNAMIQUES PRISMA SLIDER avec contraintes dynamiques
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                marks={fieldConfig.numberConfig?.marks || fieldConfig.marks}
                tooltip={{ 
                  formatter: (value) => `${fieldConfig.numberConfig?.prefix || fieldConfig.prefix || ''}${value}${fieldConfig.numberConfig?.suffix || fieldConfig.suffix || fieldConfig.numberConfig?.unit || fieldConfig.unit || ''}` 
                }}
              />
              <div className="text-center text-sm text-gray-500 mt-1">
                {fieldConfig.numberConfig?.prefix || fieldConfig.prefix || ''}{finalValue || fieldConfig.numberConfig?.defaultValue || fieldConfig.defaultValue || 0}{fieldConfig.numberConfig?.suffix || fieldConfig.suffix || fieldConfig.numberConfig?.unit || fieldConfig.unit || ''}
                {sliderMax !== undefined && <span className="ml-2 text-xs text-gray-400">(max: {sliderMax})</span>}
              </div>
            </div>
          );
        }
        
        // 🎯 NOUVEAU: Calculer min/max/step avec priorité aux contraintes dynamiques
        const numberMin = dynamicConstraints.number_min ?? fieldConfig.numberConfig?.min ?? fieldConfig.min;
        const numberMax = dynamicConstraints.number_max ?? fieldConfig.numberConfig?.max ?? fieldConfig.max;
        const numberStep = dynamicConstraints.step ?? fieldConfig.numberConfig?.step ?? fieldConfig.step ?? 1;
        const constraintMsg = dynamicConstraints.constraintMessage;
        
        // 🎯 DEBUG: Afficher les contraintes appliquées
        if (dynamicConstraints.number_max !== undefined || dynamicConstraints.number_min !== undefined) {
          console.log(`🎯 [InputNumber] "${field.label}" contraintes dynamiques appliquées:`, {
            min: numberMin,
            max: numberMax,
            step: numberStep,
            constraintMessage: constraintMsg,
            dynamicConstraints
          });
        }
        
        // 🆕 Handler pour onChange - ne pas clamper, laisser l'utilisateur saisir librement
        const handleNumberChange = (val: number | null) => {
          console.log(`🔢 [NUMBER CHANGE] "${fieldConfig.label}":`, { 
            oldValue: finalValue, 
            newValue: val,
            isDisabled,
            disabled,
            isReadOnly 
          });
          
          // Marquer comme changement interne et incrémenter le compteur d'évaluations
          isInternalChangeRef.current = true;
          pendingEvaluations.current++;
          console.log(`⬆️ [${field.label}] Évaluation démarrée (${pendingEvaluations.current} en cours)`);
          
          // Simplement propager la valeur, sans clamper pendant la frappe
          handleChange(val);
        };
        
        // 🆕 Handler pour onBlur - valider et clamper au moment de quitter le champ
        const handleNumberBlur = () => {
          const val = Number(finalValue);
          if (isNaN(val)) return;
          
          let clampedVal = val;
          let wasConstrained = false;
          let constraintType: 'max' | 'min' | null = null;
          
          // Vérifier max dynamique
          if (numberMax !== undefined && val > numberMax) {
            clampedVal = numberMax;
            wasConstrained = true;
            constraintType = 'max';
          }
          
          // Vérifier min dynamique  
          if (numberMin !== undefined && val < numberMin) {
            clampedVal = numberMin;
            wasConstrained = true;
            constraintType = 'min';
          }
          
          // Si contrainte dépassée, afficher le message et clamper
          if (wasConstrained) {
            // Afficher le message
            if (constraintMsg) {
              // Remplacer les variables dans le message
              const formattedMsg = constraintMsg
                .replace(/\{max\}/g, String(numberMax ?? ''))
                .replace(/\{min\}/g, String(numberMin ?? ''))
                .replace(/\{value\}/g, String(val));
              message.warning(formattedMsg);
            } else {
              // Message par défaut
              if (constraintType === 'max') {
                message.warning(`La valeur maximale est ${numberMax}`);
              } else if (constraintType === 'min') {
                message.warning(`La valeur minimale est ${numberMin}`);
              }
            }
            
            // Appliquer la valeur clampée
            handleChange(clampedVal);
          }
        };
        
        // 🔧 Convertir finalValue en nombre valide pour InputNumber
        const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
          ? null 
          : Number(finalValue);
        
        return (
          <InputNumber
            {...commonProps}
            value={numericValue}
            onChange={handleNumberChange}
            onBlur={handleNumberBlur}
            step={numberStep}
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
        
        // 🔥 FILTRAGE PAR PLAFONDS (valueCaps) — filtre réellement les options du select
        if (lookupExtensionsResult.activeCaps.length > 0 && tableLookup.tableData && tableLookup.config) {
          const capColumn = lookupExtensionsResult.activeColumn || lookupExtensionsResult.capColumn;
          if (capColumn) {
            // Calculer le KVA déjà consommé par les autres copies du repeater (pour scope=total)
            let existingTotal = 0;
            const totalCap = lookupExtensionsResult.activeCaps.find(c => c.scope === 'total');
            if (totalCap) {
              // Chercher les valeurs KVA des autres onduleurs du repeater dans formData
              const baseId = baseFieldId || field.id;
              const suffixMatch = field.id.match(/-(\d{1,3})$/);
              const currentSuffix = suffixMatch ? parseInt(suffixMatch[1], 10) : 0;
              // Parcourir formData pour trouver les copies du même champ
              for (const [key, val] of Object.entries(formData)) {
                if (!key.startsWith(baseId)) continue;
                const keySuffix = key === baseId ? 0 : parseInt((key.match(/-(\d{1,3})$/) || ['', '-1'])[1], 10);
                if (keySuffix === currentSuffix) continue; // Skip la copie courante
                if (keySuffix < 0) continue;
                // val = valeur sélectionnée (label de l'onduleur)
                // Chercher le KVA correspondant dans tableData
                if (val && tableLookup.tableData) {
                  const kvaForSibling = extractValueFromColumn(
                    { value: val },
                    capColumn,
                    tableLookup.tableData,
                    tableLookup.config!
                  );
                  if (kvaForSibling !== null && !isNaN(Number(kvaForSibling))) {
                    existingTotal += Number(kvaForSibling);
                  }
                }
              }
            }

            baseOptions = baseOptions.filter(option => {
              const optionValue = extractValueFromColumn(
                option,
                capColumn,
                tableLookup.tableData!,
                tableLookup.config!
              );
              if (optionValue === null || isNaN(Number(optionValue))) return true; // Pas de valeur → on garde
              const numValue = Number(optionValue);

              for (const cap of lookupExtensionsResult.activeCaps) {
                if (cap.scope === 'per_unit' && numValue > cap.maxValue) {
                  return false; // Dépasse le plafond par unité
                }
                if (cap.scope === 'total' && (existingTotal + numValue) > cap.maxValue) {
                  return false; // Dépasse le plafond total avec les existants
                }
              }
              return true;
            });

            console.log(`[ValueCaps] capColumn="${capColumn}", existingTotal=${existingTotal}, caps=`, lookupExtensionsResult.activeCaps, `→ ${baseOptions.length} options restantes`);
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
        
        // 📦 PRODUIT FIX: multiple:true doit TOUJOURS gagner sur mode:'single' (metadata stale)
        const selectionMode = (fieldConfig.selectConfig?.multiple || fieldConfig.multiple)
          ? 'multiple'
          : (fieldConfig.selectConfig?.mode || 'single');
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

      case 'IMAGE': {
        const imageConfig = fieldConfig.imageConfig || {};
        const acceptedFormats = Array.isArray(imageConfig.formats) && imageConfig.formats.length > 0
          ? imageConfig.formats.map(fmt => (fmt.startsWith('.') ? fmt : `.${fmt.toLowerCase()}`))
          : undefined;
        const imageAccept = acceptedFormats && acceptedFormats.length > 0 ? acceptedFormats.join(',') : 'image/*';
        const maxImageSizeBytes = imageConfig.maxSize ? imageConfig.maxSize * 1024 * 1024 : undefined;
        const enforcedRatio = imageConfig.ratio;
        const imageThumbnails = imageConfig.thumbnails;
        
        // 🤖 AI Measure: Vérifier si l'IA est activée pour ce champ
        const aiMeasureConfig = getAIMeasureConfig({
          metadata: field.metadata as Record<string, unknown> | null,
          // Les colonnes dédiées (maintenant typées dans TBLField)
          aiMeasure_enabled: field.aiMeasure_enabled,
          aiMeasure_autoTrigger: field.aiMeasure_autoTrigger,
          aiMeasure_prompt: field.aiMeasure_prompt,
          aiMeasure_keys: field.aiMeasure_keys,
        });
        
        const isAIMeasureEnabled = aiMeasureConfig?.enabled === true;
        
        // 🤖 Si AI Measure activé, utiliser TBLImageFieldWithAI
        if (isAIMeasureEnabled) {
          // Handler pour remplir les champs cibles avec les résultats de l'IA
          const handleAIFieldUpdate = (targetFieldId: string, value: unknown) => {
            // Nettoyer le targetRef (enlever @value. si présent)
            const cleanFieldId = targetFieldId.startsWith('@value.') 
              ? targetFieldId.replace('@value.', '') 
              : targetFieldId;
            
            console.log(`🤖 [AI Measure] Mise à jour du champ ${cleanFieldId} avec:`, value);
            
            if (onUpdateAnyField) {
              onUpdateAnyField(cleanFieldId, value);
            } else {
              console.warn('[AI Measure] onUpdateAnyField non disponible - impossible de remplir le champ cible');
            }
          };
          
          // 🔍 DEBUG: Log complet de la valeur reçue
          const valueSummary = (() => {
            if (finalValue === null) return 'NULL';
            if (finalValue === undefined) return 'UNDEFINED';
            if (typeof finalValue === 'string') {
              if (finalValue.startsWith('data:')) return `data:URL (${(finalValue.length / 1024).toFixed(2)}KB)`;
              return `string (${finalValue.length}chars)`;
            }
            if (typeof finalValue === 'object') {
              const keys = Object.keys(finalValue as any);
              return `object {${keys.join(', ')}}`;
            }
            return typeof finalValue;
          })();
          
          console.log(`🖼️ [TBLImageFieldWithAI] RENDER (nodeId=${field.id})`);
          console.log(`   finalValue type: ${valueSummary}`);
          console.log(`   useCalculatedValue: ${useCalculatedValue}`);
          console.log(`   localValue: ${typeof localValue === 'string' ? localValue.substring(0, 50) : localValue}`);
          
          return (
            <TBLImageFieldWithAI
              nodeId={field.id}
              metadata={field.metadata as Record<string, unknown>}
              aiMeasure_enabled={field.aiMeasure_enabled}
              aiMeasure_autoTrigger={field.aiMeasure_autoTrigger}
              aiMeasure_prompt={field.aiMeasure_prompt}
              aiMeasure_keys={field.aiMeasure_keys}
              imageConfig={imageConfig}
              value={finalValue as string | null}
              onChange={handleChange}
              onFieldUpdate={handleAIFieldUpdate}
              disabled={isDisabled}
              size={resolvedSize}
              style={commonProps.style}
            />
          );
        }
        
        // Comportement standard sans IA
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
                        imageData = {
                          original: e.target?.result,
                          thumbnails: imageThumbnails,
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
                  borderRadius: '6px',
                }} 
              />
            )}
          </div>
        );
      }

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

      case 'PHOTO':
        // 📸 Champ photo natif : bouton qui ouvre la caméra du téléphone/tablette
        return wrapWithCustomTooltip(
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              id={`photo-input-${field.id}`}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    handleChange(ev.target?.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              disabled={isDisabled}
            />
            <label htmlFor={`photo-input-${field.id}`}>
              <Button
                icon={<CameraOutlined />}
                disabled={isDisabled}
                size={resolvedSize}
                style={{ ...commonProps.style, cursor: 'pointer' }}
                onClick={() => document.getElementById(`photo-input-${field.id}`)?.click()}
              >
                {finalValue ? 'Reprendre' : 'Photo'}
              </Button>
            </label>
            {finalValue && typeof finalValue === 'string' && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={finalValue}
                  alt="Photo prise"
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', border: '1px solid #d9d9d9', borderRadius: '6px' }}
                />
              </div>
            )}
          </div>,
          field
        );

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
      
      {/* 🔄 ALERTES DU LOOKUP */}
      {lookupExtensionsResult.activeAlerts.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {lookupExtensionsResult.activeAlerts.map((alert, idx) => (
            <div 
              key={idx}
              style={{
                padding: '6px 10px',
                marginBottom: 4,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                background: alert.level === 'error' ? '#fff2f0' : alert.level === 'warning' ? '#fffbe6' : '#f0f9ff',
                border: `1px solid ${alert.level === 'error' ? '#ffccc7' : alert.level === 'warning' ? '#ffe58f' : '#bae7ff'}`,
                color: alert.level === 'error' ? '#cf1322' : alert.level === 'warning' ? '#d48806' : '#096dd9',
              }}
            >
              {alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '⚠️' : 'ℹ️'} {alert.message}
            </div>
          ))}
        </div>
      )}
      {lookupExtensionsResult.activeCaps.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {lookupExtensionsResult.activeCaps.map((cap, idx) => (
            <div 
              key={idx}
              style={{
                padding: '4px 8px',
                fontSize: 10,
                color: '#d48806',
                background: '#fffbe6',
                border: '1px solid #ffe58f',
                borderRadius: 4,
                marginBottom: 2,
              }}
            >
              📏 Plafond: max {cap.maxValue.toLocaleString()} VA {cap.scope === 'per_unit' ? '(par unité)' : '(total)'}
              {cap.label && ` — ${cap.label}`}
            </div>
          ))}
        </div>
      )}
      
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

