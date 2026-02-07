/**
 * 📊 DOCUMENTATION COMPLÈTE - RÈGLE A1 EXCEL POUR TABLE LOOKUP
 * ===============================================================
 * 
 * Ce composant gère les tableaux de type "matrix" avec lookup dynamique.
 * Il respecte la RÈGLE A1 EXCEL : la cellule en haut à gauche (A1) représente
 * le croisement entre les en-têtes de colonnes et les labels de lignes.
 * 
 * 
 * 🎯 EXEMPLE CONCRET : Tableau d'orientations solaires
 * =====================================================
 * 
 * Fichier Excel importé :
 * 
 *     A              B    C    D    E    F    G    H    I
 * 1   Orientation    0    5    15   25   35   45   70   90
 * 2   Nord          86   82   73   64   54   45   29   21
 * 3   Nord Est      86   85   81   76   70   67   53   38
 * 4   Est           86   88   90   90   89   86   72   54
 * 
 * 
 * 📦 STOCKAGE INTERNE (IMMUABLE)
 * ===============================
 * 
 * columns: ["Orientation", "0", "5", "15", "25", "35", "45", "70", "90"]
 *          ↑ A1 présent    ↑ Valeurs utilisables pour lookup colonnes
 * 
 * rows: ["Orientation", "Nord", "Nord Est", "Est", ...]
 *       ↑ A1 présent    ↑ Valeurs utilisables pour lookup lignes
 * 
 * data: [
 *   [86, 82, 73, 64, 54, 45, 29, 21],  // Correspond à rows[1] = "Nord"
 *   [86, 85, 81, 76, 70, 67, 53, 38],  // Correspond à rows[2] = "Nord Est"
 *   [86, 88, 90, 90, 89, 86, 72, 54],  // Correspond à rows[3] = "Est"
 * ]
 * ⚠️ data ne contient PAS la première ligne (headers) NI la première colonne (labels)
 * 
 * 
 * 🖥️ AFFICHAGE DU TABLEAU
 * ========================
 * 
 * Rendu visuel :
 * 
 *     Orientation │  0  │  5  │ 15  │ 25  │ 35  │ 45  │ 70  │ 90
 *     ────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────
 *     Nord        │ 86  │ 82  │ 73  │ 64  │ 54  │ 45  │ 29  │ 21
 *     Nord Est    │ 86  │ 85  │ 81  │ 76  │ 70  │ 67  │ 53  │ 38
 *     Est         │ 86  │ 88  │ 90  │ 90  │ 89  │ 86  │ 72  │ 54
 * 
 * - "Orientation" apparaît UNE SEULE FOIS (en A1)
 * - Première colonne : titre = columns[0], valeurs = rows[1], rows[2], ...
 * - Autres colonnes : titres = columns[1], columns[2], ...
 * 
 * 
 * 🔍 LOOKUP DYNAMIQUE (SELECT)
 * =============================
 * 
 * CAS 1 : Champ SELECT configuré sur COLONNE "Orientation"
 * ---------------------------------------------------------
 * keyColumn = "Orientation" (columns[0])
 * → Backend détecte colIndex === 0
 * → Extrait depuis rows.slice(1) = ["Nord", "Nord Est", "Est", ...]
 * → Le SELECT affiche : Nord, Nord Est, Est, etc.
 * 
 * CAS 2 : Champ SELECT configuré sur LIGNE "Orientation" (A1)
 * ------------------------------------------------------------
 * keyRow = "Orientation" (rows[0])
 * → Backend détecte rowIndex === 0
 * → Extrait depuis columns.slice(1) = ["0", "5", "15", "25", "35", "45", "70", "90"]
 * → Le SELECT affiche : 0, 5, 15, 25, 35, 45, 70, 90
 * 
 * CAS 3 : Champ SELECT configuré sur LIGNE "Nord"
 * ------------------------------------------------
 * keyRow = "Nord" (rows[1])
 * → Backend détecte rowIndex === 1
 * → dataRowIndex = 1 - 1 = 0
 * → Extrait depuis data[0] = [86, 82, 73, 64, 54, 45, 29, 21]
 * → Le SELECT affiche : 86, 82, 73, 64, 54, 45, 29, 21
 * 
 * 
 * 📥 IMPORT EXCEL
 * ===============
 * 
 * Logique d'import (handleFileChosen) :
 * 
 * 1. Lecture du fichier avec XLSX.utils.sheet_to_json
 * 2. Extraction :
 *    - columns = jsonData[0] (première ligne complète avec A1)
 *    - rows = jsonData.map(row => row[0]) (première colonne complète avec A1)
 *    - data = jsonData.slice(1).map(row => row.slice(1)) (corps sans headers)
 * 3. Stockage en base de données avec A1 présent dans columns ET rows
 * 
 * 
 * 📤 EXPORT EXCEL (handleDownloadExcel)
 * ======================================
 * 
 * Reconstruction du fichier Excel :
 * 
 * 1. Ligne 1 = columns = ["Orientation", "0", "5", "15", ...]
 * 2. Lignes suivantes = [rows[i], ...data[i-1]] 
 *    Ex : ["Nord", 86, 82, 73, 64, 54, 45, 29, 21]
 * 3. Création XLSX avec XLSX.utils.aoa_to_sheet
 * 4. Téléchargement avec XLSX.writeFile
 * 
 * → Le fichier téléchargé est IDENTIQUE au fichier importé !
 * 
 * 
 * ⚙️ BACKEND API (treebranchleaf-routes.ts)
 * ==========================================
 * 
 * Endpoint : GET /api/treebranchleaf/nodes/:nodeId/table/lookup
 * 
 * Logique d'extraction des options :
 * 
 * if (selectConfig.keyColumn) {
 *   const colIndex = columns.indexOf(selectConfig.keyColumn);
 *   
 *   if (colIndex === 0) {
 *     // Colonne A = Labels de lignes
 *     options = rows.slice(1); // Skip A1
 *   } else {
 *     // Autre colonne = Valeurs depuis data[]
 *     const dataColIndex = colIndex - 1; // Décalage car data n'a pas colonne A
 *     options = data.map(row => row[dataColIndex]);
 *   }
 * }
 * 
 * if (selectConfig.keyRow) {
 *   const rowIndex = rows.indexOf(selectConfig.keyRow);
 *   
 *   if (rowIndex === 0) {
 *     // Ligne A1 = En-têtes de colonnes
 *     options = columns.slice(1); // Skip A1
 *   } else {
 *     // Autre ligne = Valeurs depuis data[]
 *     const dataRowIndex = rowIndex - 1; // Décalage car data n'a pas ligne 1
 *     options = data[dataRowIndex];
 *   }
 * }
 * 
 * 
 * 🚨 RÈGLES CRITIQUES À RESPECTER
 * ================================
 * 
 * 1. ❌ JAMAIS modifier columns ou rows après import (sauf renommage manuel)
 * 2. ✅ TOUJOURS garder A1 dans columns[0] ET rows[0]
 * 3. ✅ Dans l'affichage, skipper rows[0] pour éviter duplication visuelle
 * 4. ✅ Dans le backend, détecter colIndex/rowIndex === 0 comme cas spéciaux
 * 5. ✅ Appliquer décalage -1 pour accéder à data[][] (qui n'a pas headers)
 * 6. ✅ Export Excel doit reconstruire la structure originale avec A1
 * 
 * 
 * 💡 TOUT EST DYNAMIQUE - RIEN EN DUR !
 * ======================================
 * 
 * - Aucune valeur hardcodée ("Orientation", "Nord", etc.)
 * - Fonctionne avec N'IMPORTE QUEL tableau Excel
 * - Détection automatique de A1 basée sur la position (index 0)
 * - Adaptation automatique selon le type de lookup (colonne vs ligne)
 * 
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Divider, Input, InputNumber, Select, Space, Switch, Table, Tooltip, Typography, message, Progress, Spin, Timeline, Statistic, Row, Col } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useTBLBatch } from '../../../TBL/contexts/TBLBatchContext';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import * as XLSX from 'xlsx';
import { DeleteOutlined, PlusOutlined, InfoCircleOutlined, DownloadOutlined, FilterOutlined, PlayCircleOutlined, BulbOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';

const { Title, Text } = Typography;

interface TablePanelProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type TreeFieldOption = {
  value: string;
  label: string;
  type?: string | null;
  path?: string | null;
  capabilities?: {
    table?: {
      enabled?: boolean;
      activeId?: string;
      rowBased?: boolean;
      columnBased?: boolean;
    };
  };
  id?: string; // Assurer que l'ID est toujours présent
};

type TableLookupExpose = {
  id: string;
  column: string;
  label?: string;
  targetFieldId?: string | null;
};

type TableLookupSelectors = {
  dropdownFieldId?: string | null;
  columnFieldId?: string | null;
  rowFieldId?: string | null;
  valueFieldId?: string | null;
};

// 🔥 NOUVEAU: Type pour les 3 options de source de données
type TableLookupSourceOption = {
  type: 'select' | 'field' | 'capacity'; // Type de source
  selectedField?: string | null; // Pour option SELECT: colonne/ligne de la table
  sourceField?: string | null; // Pour option CHAMP: champ du formulaire
  capacityRef?: string | null; // Pour option CAPACITÉ: référence à la capacité
  comparisonColumn?: string | null; // 🔥 NOUVEAU: colonne de la table pour comparer (pour CHAMP et CAPACITÉ)
  operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'plus' | 'minus';
  description?: string;
};

type TableLookupConfig = {
  enabled?: boolean;
  columnLookupEnabled?: boolean; // NOUVEAU: contrôle affichage section COLONNE
  rowLookupEnabled?: boolean;    // NOUVEAU: contrôle affichage section LIGNE
  extractFrom?: 'column' | 'row'; // NOUVEAU : choix unifié
  keyColumn?: string; // Si extractFrom='column'
  keyRow?: string; // Si extractFrom='row'
  displayColumn?: string | string[]; // ✅ Accepter string OU array
  displayRow?: string | string[]; // ✅ Accepter string OU array
  valueColumn?: string; // Valeur stockée pour colonne (futur)
  valueRow?: string; // Valeur stockée pour ligne (futur)
  exposeColumns?: TableLookupExpose[];
  selectors?: TableLookupSelectors;
  fallbackValue?: string | number | null;
  // 🔥 NOUVEAU: Options pour les 3 sources de données
  columnSourceOption?: TableLookupSourceOption; // Pour lookup COLONNE
  rowSourceOption?: TableLookupSourceOption; // Pour lookup LIGNE
  // 🔥 NOUVEAU: Filtrage conditionnel des options de lookup
  filterConditions?: {
    enabled?: boolean;
    conditions?: TableLookupCondition[];
    filterLogic?: 'AND' | 'OR'; // Comment combiner les conditions
    // 🔄 Colonne conditionnelle: change dynamiquement la colonne du lookup selon conditions
    columnOverrides?: Array<{
      id: string;
      enabled: boolean;
      label?: string;
      conditions: Array<{ fieldRef: string; operator: string; value: string }>;
      targetColumn: string;  // Colonne à utiliser si conditions vraies
    }>;
    defaultColumn?: string; // Colonne par défaut si aucun override ne match
    // 📏 Plafonds de valeur: limite le résultat du lookup
    valueCaps?: Array<{
      id: string;
      enabled: boolean;
      label?: string;
      conditions: Array<{ fieldRef: string; operator: string; value: string }>;
      maxValue: number;
      scope?: 'total' | 'per_unit'; // total = valeur globale, per_unit = par onduleur/unité
    }>;
    // ⚠️ Alertes contextuelles: messages affichés selon conditions du lookup
    lookupAlerts?: Array<{
      id: string;
      enabled: boolean;
      label?: string;
      conditions: Array<{ fieldRef: string; operator: string; value: string }>;
      message: string;
      level: 'info' | 'warning' | 'error';
    }>;
  };
};

// 🔥 NOUVEAU: Type pour une condition de filtrage de lookup
type TableLookupCondition = {
  id: string;
  filterByColumn?: string; // Colonne du tableau à filtrer (optionnel)
  filterByRow?: string; // Ligne du tableau à filtrer (optionnel)
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'notContains';
  compareWithRef?: string; // Référence NodeTreeSelector vers un champ/formule
  description?: string; // Description lisible de la condition
  // ✨ Multiplicateur/Valeur fixe conditionnel
  multiplier?: {
    enabled?: boolean; // Activer le mode conditionnel
    mode?: 'multiply' | 'fixed'; // 'multiply' = valeur × facteur, 'fixed' = remplacer par valeur fixe
    // Plusieurs conditions combinées en AND
    conditions?: Array<{
      fieldA?: string; // Référence champ A (ex: @select.onduleur)
      operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains';
      fieldB?: string; // Référence champ B (ex: @value.nb_optimiseurs) ou valeur littérale
    }>;
    // Rétrocompat: anciens champs single-condition
    conditionFieldA?: string;
    conditionFieldB?: string;
    conditionOperator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual';
    factor?: number; // Mode multiply: facteur multiplicateur / Mode fixed: valeur directe (ALORS)
    elseFactor?: number; // Mode multiply: facteur sinon / Mode fixed: valeur directe (SINON)
  };
  // ✨ Filtrage conditionnel SI...ALORS...SINON (optionnel)
  conditionalFilter?: {
    enabled?: boolean; // Activer le mode conditionnel pour ce filtre
    conditions: Array<{
      field: string; // Référence @select.xxx, @input.xxx, etc.
      operator: 'notEmpty' | 'isEmpty' | 'equals' | 'notEquals' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual';
      value: string; // Valeur à comparer
    }>;
    onMatch: { // Filtre à appliquer si toutes les conditions sont vraies
      column: string;
      operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'notContains';
      valueRef: string; // Référence @select.xxx, @input.xxx, etc.
    };
    onElse?: { // Filtre à appliquer si au moins une condition est fausse (optionnel)
      column: string;
      operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'notContains';
      valueRef: string;
    };
  };
};

type TableMeta = {
  unit?: string;
  decimal?: 'comma' | 'dot';
  name?: string;
  importSource?: string;
  isImported?: boolean;
  lookup?: TableLookupConfig; // Config lookup UNIFIÃ‰E
} & Record<string, unknown>;

type TableConfig = {
  type: 'columns' | 'matrix';
  columns: string[];
  rows?: string[];
  data?: (number | string | null)[][];
  meta?: TableMeta;
  isImported?: boolean;
  importSource?: string;
};

type TableInstance = {
  id: string;
  name: string;
  description?: string;
  type: string;
  columns: string[];
  rows: (string | number)[][]; // ✅ Lignes complètes pour architecture normalisée
  matrix?: (number | string | null)[][];
  data?: { matrix?: (number | string | null)[][] };
  records?: Record<string, unknown>[];
  meta: TableMeta;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

type NormalizedTableInstanceResponse = {
  id: string;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  columns?: string[] | null;
  rows?: (string | number)[][] | null; // ✅ Lignes complètes
  matrix?: (string | number | boolean | null)[][] | null;
  data?: { matrix?: (string | number | boolean | null)[][] | null } | null;
  records?: Record<string, unknown>[] | null;
  meta?: Record<string, unknown> | null;
  order?: number | null;
};

const normalizedToInstance = (raw: NormalizedTableInstanceResponse): TableInstance => {
  console.log('🔍 [normalizedToInstance] RAW DATA:', {
    columns: raw.columns,
    rowsType: Array.isArray(raw.rows) ? 'array' : typeof raw.rows,
    rowsLength: Array.isArray(raw.rows) ? raw.rows.length : 0,
    firstRow: Array.isArray(raw.rows) && raw.rows[0],
    matrix: raw.matrix,
    dataMatrix: raw.data?.matrix
  });

  const safeColumns = Array.isArray(raw.columns) ? raw.columns.map(String) : [];
  
  // ✅ Les `rows` contiennent les lignes complètes (chaque ligne = array de cellules)
  let fullRows = Array.isArray(raw.rows) ? raw.rows : [];

  console.log('🔍 [normalizedToInstance] FULL ROWS:', fullRows.slice(0, 3));

  // 🛠️ DÉTECTION ET RECONSTRUCTION si les rows sont corrompues (strings au lieu d'arrays)
  const firstRow = fullRows[0];
  const isCorrupted = typeof firstRow === 'string'; // Si c'est un string, c'est corrompu !
  
  if (isCorrupted) {
    console.warn('🚨 [normalizedToInstance] ROWS CORROMPUES DÉTECTÉES ! Reconstruction...');
    console.log('🚨 [normalizedToInstance] Ancien format (strings):', fullRows.slice(0, 3));
    
    // Reconstruire les rows complètes à partir des colonnes + matrix
    const reconstructed: (string | number | null)[][] = [];
    
    // Ligne 0 = colonnes (header)
    reconstructed.push([...safeColumns]);
    
    // Lignes suivantes = label + data depuis matrix
    const matrix = raw.matrix || [];
    for (let i = 0; i < fullRows.length - 1; i++) { // -1 car première ligne = header
      const label = fullRows[i + 1]; // +1 car fullRows[0] = "Orientation" (header)
      const rowData = matrix[i] || [];
      reconstructed.push([label, ...rowData]);
    }
    
    fullRows = reconstructed;
    console.log('✅ [normalizedToInstance] ROWS RECONSTRUITES:', fullRows.slice(0, 3));
  }

  // ✅ IMPORTANT : TOUTES les lignes doivent être traitées, y compris la première !
  // rows[0] = ["Orientation", "0", "5", ...] → label = "Orientation", data = ["0", "5", ...]
  // rows[1] = ["Nord", 86, 82, ...] → label = "Nord", data = [86, 82, ...]

  // Extraire les labels de ligne (première colonne de TOUTES les lignes)
  const rowLabels = fullRows.map(row => {
    if (Array.isArray(row)) {
      return String(row[0] || '');
    }
    return String(row || '');
  });

  // ✅ Extraire la matrice de données (toutes les colonnes sauf la première)
  const matrix = fullRows.map(row => {
    if (Array.isArray(row)) {
      return row.slice(1); // Enlever la première colonne (le label)
    }
    return []; // Si ce n'est pas un array, retourner vide
  });

  console.log('🔍 [normalizedToInstance] EXTRACTED:', {
    rowLabels: rowLabels.slice(0, 3),
    matrixRows: matrix.length,
    firstMatrixRow: matrix[0],
    lastMatrixRow: matrix[matrix.length - 1]
  });

  return {
    id: String(raw.id),
    name: (raw.name ?? 'Sans nom') || 'Sans nom',
    description: raw.description ?? undefined,
    type: (raw.type as string) || 'matrix',
    columns: safeColumns,
    rows: rowLabels,
    matrix,
    data: { matrix },
    records: Array.isArray(raw.records) ? raw.records : [],
    meta: (raw.meta || {}) as TableMeta,
    order: typeof raw.order === 'number' ? raw.order : 0,
  };
};

const instanceToConfig = (instance?: TableInstance | null): TableConfig => {
  if (!instance) {
    return { type: 'matrix', columns: [], rows: [], data: [] };
  }

  const columns = Array.isArray(instance.columns) ? instance.columns.map(String) : [];
  const rowLabels = Array.isArray(instance.rows) ? instance.rows.map(String) : [];
  
  // Utiliser `instance.matrix` directement
  const matrix = Array.isArray(instance.matrix)
    ? (instance.matrix as (number | string | null)[][])
    : [];
    
  const meta = (instance.meta || {}) as TableMeta;

  // 🛠️ RECONSTRUCTION: Reconstruire les full rows (arrays) à partir de rowLabels + matrix
  // rowLabels = ["Orientation", "Nord", "Nord Nord-Est", ...]
  // matrix[0] = [0, 5, 15, ...] (données de la ligne "Orientation" SANS le label)
  // matrix[1] = [86, 82, 73, ...] (données de la ligne "Nord" SANS le label)
  const fullRows: (string | number | null)[][] = [];
  
  // Pour CHAQUE rowLabel, combiner le label avec les données correspondantes de matrix
  for (let i = 0; i < rowLabels.length; i++) {
    const label = rowLabels[i];
    const rowData = matrix[i] || [];
    fullRows.push([label, ...rowData]);
  }
  
  console.log('🔄 [instanceToConfig] Full rows reconstruites:', fullRows.slice(0, 3));

  return {
    type: (instance.type as 'columns' | 'matrix') || 'matrix',
    columns,
    rows: fullRows, // ✅ Retourner les full rows (arrays), pas les strings !
    data: matrix, // Utiliser la matrice de données
    meta,
    isImported: meta.isImported === true || String(meta.isImported) === 'true',
    importSource: typeof meta.importSource === 'string' ? meta.importSource : undefined,
  };
};

const TablePanel: React.FC<TablePanelProps> = ({ treeId: initialTreeId, nodeId, value: _value, onChange: _onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const tblBatch = useTBLBatch();
  const [cfg, setCfg] = useState<TableConfig>({ type: 'matrix', columns: [], rows: [] });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [testCol, setTestCol] = useState<string | undefined>(undefined);
  const [testRow, setTestRow] = useState<string | undefined>(undefined);
  const [lookupValue, setLookupValue] = useState<string | number | null | undefined>(undefined);
  const [instances, setInstances] = useState<TableInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nodeTreeId, setNodeTreeId] = useState<string | null>(
    initialTreeId && initialTreeId.length ? initialTreeId : null
  );
  const [fieldOptions, setFieldOptions] = useState<TreeFieldOption[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  
  // 🔥 NOUVEAU: États pour les conditions de filtrage
  const [showNodeTreeSelector, setShowNodeTreeSelector] = useState<boolean>(false);
  const [currentConditionId, setCurrentConditionId] = useState<string | null>(null);
  
  // ✨ États pour le multiplicateur conditionnel (sélection champ A / B)
  const [showMultiplierSelector, setShowMultiplierSelector] = useState<boolean>(false);
  const [multiplierSelectorTarget, setMultiplierSelectorTarget] = useState<'A' | 'B' | null>(null);
  const [multiplierConditionId, setMultiplierConditionId] = useState<string | null>(null);
  
  // 🔥 NOUVEAU: États pour le filtrage ÉTAPE 2.5 du SELECT
  const [showNodeTreeSelectorFilter, setShowNodeTreeSelectorFilter] = useState<boolean>(false);
  const [currentFilterFieldType, setCurrentFilterFieldType] = useState<'select' | null>(null);
  const [currentFilterIndex, setCurrentFilterIndex] = useState<number | null>(null);
  
  // 🔥 NOUVEAU: États pour les sélecteurs CAPACITÉ
  const [showCapacitySelectorColumn, setShowCapacitySelectorColumn] = useState<boolean>(false);
  const [showCapacitySelectorRow, setShowCapacitySelectorRow] = useState<boolean>(false);
  
  // 🔥 NOUVEAU: États pour la sélection des lignes via arborescence
  const [showRowTreeSelector, setShowRowTreeSelector] = useState<boolean>(false);
  const [currentRowSelectorType, setCurrentRowSelectorType] = useState<'select' | 'field' | 'capacity' | null>(null);
  
  // ⚡ ULTRA-NOUVEAU: États pour le filtrage temps réel
  const [realtimePreview, setRealtimePreview] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [filterResults, setFilterResults] = useState<{
    totalOptions: number;
    filteredOptions: number;
    matchingRows: any[];
    conditions: Array<{ id: string; result: boolean; description: string }>;
  } | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  const isPhysicalNodeId = useCallback((fieldId?: string | null): fieldId is string => {
    if (!fieldId) return false;
    const normalized = fieldId.trim();
    if (!normalized) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
      return true;
    }
    return normalized.startsWith('node_') || normalized.startsWith('display-');
  }, []);

  const updateTableCapability = useCallback(
    async (fieldId: string | null | undefined, payload: Record<string, unknown>) => {
      if (!isPhysicalNodeId(fieldId)) {
        console.log('[TablePanel] Skipping capability update for virtual field:', fieldId);
        return;
      }
      await api.put(`/api/treebranchleaf/nodes/${fieldId}/capabilities/table`, payload);
      window.dispatchEvent(
        new CustomEvent('tbl-capability-updated', { detail: { nodeId: fieldId, treeId: initialTreeId } })
      );
    },
    [api, initialTreeId, isPhysicalNodeId]
  );

  // Fonction de sauvegarde debounced
  const debouncedSave = useDebouncedCallback(async (config: TableConfig) => {
    if (!activeId || activeId.startsWith('temp_')) {
      console.log('ðŸ—‚ï¸ TablePanel: Sauvegarde ignorÃ©e (instance temporaire ou inexistante)', { activeId });
      return;
    }
    
    try {
      // Convertir vers le format API Prisma (data = array directement)
      const apiData = {
        type: config.type,
        columns: config.columns,
        rows: config.rows || [],
        data: config.data || [],  // âœ… Backend attend array direct, pas { matrix: [] }
        meta: config.meta || {}
      };
      
      console.log('ðŸ—‚ï¸ TablePanel: Sauvegarde tableau', { activeId, type: config.type, cols: config.columns.length });
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`, apiData);
      console.log('ðŸ—‚ï¸ TablePanel: âœ… Tableau sauvegardÃ© avec succÃ¨s');
    } catch (error) {
      console.error('ðŸ—‚ï¸ TablePanel: âŒ Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde du tableau');
    }
  }, 1000);

  const debouncedSaveSelectConfig = useDebouncedCallback(async (payload: Record<string, unknown>) => {
    if (!activeId || activeId.startsWith('temp_')) {
      return;
    }
    
    // Ne sauvegarder select-config que si un lookup est configure
    const hasLookupConfig = payload.keyColumn || payload.keyRow;
    if (!hasLookupConfig) {
      return;
    }

    try {
      await api.post(`/api/treebranchleaf/nodes/${nodeId}/select-config`, payload);
      tblBatch.refresh();
    } catch (error) {
      // Ignorer silencieusement les erreurs 500 - probablement un node non-SELECT
    }
  }, 800);
  // Fonction utilitaire pour assurer la largeur des donnÃ©es
  const ensureDataWidth = useCallback((data: (number | string | null)[][] | undefined, width: number): (number | string | null)[][] | undefined => {
    if (!data) return Array.from({ length: 1 }, () => Array.from({ length: width }, () => null as null));
    return data.map((row) => {
      const newRow = [...row];
      while (newRow.length < width) newRow.push(null);
      return newRow.slice(0, width);
    });
  }, []);

  // Identification de l'arbre associÃ© au nÅ“ud
  useEffect(() => {
    if (initialTreeId && initialTreeId.length) {
      setNodeTreeId(initialTreeId);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const info = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { treeId?: string };
        if (cancelled) return;
        if (info?.treeId) {
          setNodeTreeId(info.treeId);
        }
      } catch (error) {
        console.error('ðŸ—‚ï¸ TablePanel: Impossible de rÃ©cupÃ©rer le treeId du nÅ“ud', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, nodeId, initialTreeId]);

  // RÃ©cupÃ©rer la liste des champs disponibles pour configurer les lookups
  useEffect(() => {
    if (!nodeTreeId) return;

    let cancelled = false;
    setFieldsLoading(true);

    (async () => {
      try {
        const nodes = await api.get(`/api/treebranchleaf/trees/${nodeTreeId}/nodes`) as Array<Record<string, unknown>>;
        if (cancelled) return;

        // Champs du Lead disponibles pour lookup
        const leadFields: TreeFieldOption[] = [
          { value: 'lead.firstName', label: 'Lead - Prénom', type: 'lead_field', path: null },
          { value: 'lead.lastName', label: 'Lead - Nom', type: 'lead_field', path: null },
          { value: 'lead.fullName', label: 'Lead - Nom complet', type: 'lead_field', path: null },
          { value: 'lead.email', label: 'Lead - Email', type: 'lead_field', path: null },
          { value: 'lead.phone', label: 'Lead - Téléphone', type: 'lead_field', path: null },
          { value: 'lead.street', label: 'Lead - Rue', type: 'lead_field', path: null },
          { value: 'lead.streetNumber', label: 'Lead - Numéro', type: 'lead_field', path: null },
          { value: 'lead.postalCode', label: 'Lead - Code postal', type: 'lead_field', path: null },
          { value: 'lead.city', label: 'Lead - Localité', type: 'lead_field', path: null },
          { value: 'lead.fullAddress', label: 'Lead - Adresse complète', type: 'lead_field', path: null },
          { value: 'lead.company', label: 'Lead - Entreprise', type: 'lead_field', path: null },
        ];

        const options: TreeFieldOption[] = (Array.isArray(nodes) ? nodes : [])
          .filter((node) => {
            const nodeIdCandidate = node.id as string | undefined;
            if (!nodeIdCandidate) return false; // 🆕 Supprimer la vérification nodeIdCandidate === nodeId pour INCLURE le champ courant
            const type = (node.type as string | undefined) || '';
            return type.startsWith('leaf_');
          })
          .map((node) => ({
            value: String(node.id),
            label: (node.label as string) || String(node.id),
            type: (node.fieldType as string | undefined) || (node.subType as string | undefined) || (node.type as string | undefined) || null,
            path: node.path ? String(node.path) : null,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        // Fusionner les champs Lead + champs du formulaire
        const allOptions = [...leadFields, ...options];
        
        setFieldOptions(allOptions);
        console.log('ðŸ” [TablePanel] fieldOptions chargÃ©es:', { 
          count: options.length, 
          firstThree: options.slice(0, 3),
          allLabels: options.map(o => o.label),
          orientationPresent: options.some(o => o.label.toLowerCase().includes('orientation')),
          inclinaisonPresent: options.some(o => o.label.toLowerCase().includes('inclin'))
        });
      } catch (error) {
        console.error('ðŸ—‚ï¸ TablePanel: Erreur rÃ©cupÃ©ration champs disponibles', error);
      } finally {
        if (!cancelled) setFieldsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, nodeTreeId, nodeId]);

  // Chargement initial des instances de tableaux depuis la table dÃ©diÃ©e
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/tables`);
        const tables = Array.isArray(response)
          ? response.map((item) => normalizedToInstance(item as NormalizedTableInstanceResponse))
          : [];
        if (cancelled) return;

        console.log('ðŸ—‚ï¸ TablePanel: Instances chargÃ©es:', tables.length);
        setInstances(tables);

        if (!tables.length) {
          //  PAS de création automatique : l'utilisateur doit créer la table manuellement
          console.log(' TablePanel: Aucune instance trouvée');
          setActiveId(null);
          return;
        }

        const hasActive = activeId ? tables.some((table) => table.id === activeId) : false;
        if (!hasActive) {
          console.log('ðŸ—‚ï¸ TablePanel: SÃ©lection premiÃ¨re instance:', tables[0].id);
          setActiveId(tables[0].id);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('ðŸ—‚ï¸ TablePanel: Erreur chargement instances:', error);
          message.error('Impossible de charger les instances de tableaux');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, nodeId]);  // activeId volontairement omis pour Ã©viter boucle infinie

  useEffect(() => {
    if (!activeId) {
      setCfg({ type: 'columns', columns: [] });
      setIsLoadingTable(false);
      return;
    }

    const instance = instances.find((item) => item.id === activeId);
    
    // ✅ Pour les gros tableaux, afficher un indicateur de chargement
    const rowCount = instance?.rows?.length || 0;
    
    // 🚀 OPTIMISATION : Pour les TRÈS gros tableaux (>10000 lignes), ne pas afficher le contenu
    if (rowCount > 10000) {
      setIsLoadingTable(true);
      console.log(`🗂️ TablePanel: ⚠️ Tableau TRÈS volumineux (${rowCount} lignes) - Affichage limité`);
      
      // Ne charger QUE les métadonnées, pas le contenu complet
      setTimeout(() => {
        setCfg({
          type: instance?.type || 'columns',
          columns: instance?.columns || [],
          rows: [], // ❌ NE PAS CHARGER LES LIGNES
          data: [], // ❌ NE PAS CHARGER LES DONNÉES
          meta: { ...instance?.meta, isTooBig: true, fullRowCount: rowCount }
        });
        setIsLoadingTable(false);
        console.log(`🗂️ TablePanel: ✅ Métadonnées chargées (${rowCount} lignes masquées)`);
      }, 500);
    } else if (rowCount > 1000) {
      setIsLoadingTable(true);
      console.log(`🗂️ TablePanel: ⏳ Chargement d'un gros tableau (${rowCount} lignes)...`);
      
      // Utiliser setTimeout avec délai plus long pour permettre à React de rendre l'indicateur
      setTimeout(() => {
        setCfg(instanceToConfig(instance));
        setIsLoadingTable(false);
        console.log(`🗂️ TablePanel: ✅ Tableau chargé (${rowCount} lignes)`);
      }, 500);
    } else {
      setCfg(instanceToConfig(instance));
      setIsLoadingTable(false);
    }
  }, [activeId, instances]);

  const ensureDataHeight = useCallback((data: (number | string | null)[][] | undefined, height: number, width: number): (number | string | null)[][] | undefined => {
    const makeEmpty = () => Array.from({ length: width }, () => null as null);
    if (!data) return Array.from({ length: height }, () => makeEmpty());
    const trimmed = [...data].slice(0, height);
    while (trimmed.length < height) trimmed.push(makeEmpty());
    return trimmed.map((row) => ensureDataWidth([row], width)![0]);
  }, [ensureDataWidth]);

  // 🎯 Options pour SELECT : Toutes les colonnes et lignes AVEC A1 disponibles
  const columnOptions = useMemo(() => {
    // ✅ Les colonnes sont déjà des strings simples, pas besoin de transformation
    return (cfg.columns || []).map((col) => ({ value: col, label: col }));
  }, [cfg]);
  
  const rowOptions = useMemo(() => {
    // ✅ FIX: cfg.rows contient des arrays complets ["Nord", 86, 82, ...]
    // On extrait uniquement le premier élément (le label) pour l'affichage
    return (cfg.rows || []).map((row) => {
      const label = Array.isArray(row) ? String(row[0]) : String(row);
      return { value: label, label: label };
    });
  }, [cfg]);

  const fieldSelectOptions = useMemo(
    () =>
      fieldOptions.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.path || option.type || '',
        // Conserver l'ID pour l'afficher dans le tooltip
        nodeId: option.value,
      })),
    [fieldOptions]
  );
  
  // 🔍 Fonction de rendu des options avec tooltip affichant l'ID
  const fieldOptionRender = useCallback((option: { label?: React.ReactNode; value?: string; data?: { nodeId?: string; label?: string } }) => (
    <Tooltip 
      title={`ID: ${option.data?.nodeId || option.value}`} 
      placement="right"
      mouseEnterDelay={0.5}
    >
      <span style={{ display: 'block', width: '100%' }}>
        {option.data?.label || option.label}
      </span>
    </Tooltip>
  ), []);
  // const resultFieldSelectOptions = useMemo(
  //   () =>
  //     fieldOptions
  //       .filter((option) => typeof option.path === 'string' && option.path.toLowerCase().includes('section'))
  //       .map((option) => ({
  //         value: option.value,
  //         label: option.label,
  //         description: option.path || option.type || '',
  //       })),
  //   [fieldOptions]
  // );

  // Lookup config UNIFIÉ
  const lookupConfig = useMemo<TableLookupConfig>(() => {
    const raw = (cfg.meta?.lookup ?? {}) as TableLookupConfig;
    const exposeColumns = Array.isArray(raw?.exposeColumns)
      ? raw.exposeColumns.map((entry, idx) => ({
          id: entry?.id || `expose_${idx}`,
          column: entry?.column || '',
          label: entry?.label,
          targetFieldId: entry?.targetFieldId ?? null,
        }))
      : [];

    return {
      ...raw,
      extractFrom: raw.extractFrom || 'column', // Par défaut: colonne
      exposeColumns,
      columnLookupEnabled: raw.columnLookupEnabled ?? (!!raw.selectors?.columnFieldId),
      rowLookupEnabled: raw.rowLookupEnabled ?? (!!raw.selectors?.rowFieldId),
    };
  }, [cfg.meta]);

  const updateLookupConfig = useCallback(
    (updater: (prev: TableLookupConfig) => TableLookupConfig) => {
      setCfg((prevCfg) => {
        const previousLookup = (prevCfg.meta?.lookup ?? {}) as TableLookupConfig;
        const nextLookup = updater({ ...previousLookup });
        
        const nextMeta: TableMeta = {
          ...(prevCfg.meta || {}),
          lookup: nextLookup,
        };
        
        const nextCfg: TableConfig = { ...prevCfg, meta: nextMeta };
        console.log('[updateLookupConfig] Calling debouncedSave');
        debouncedSave(nextCfg);
        return nextCfg;
      });
    },
    [debouncedSave]
  );

  const normalizedDisplayColumns = useMemo(() => {
    const rawDisplayColumns = Array.isArray(lookupConfig.displayColumn)
      ? lookupConfig.displayColumn
      : (lookupConfig.displayColumn ? [lookupConfig.displayColumn] : []);

    const normalized = rawDisplayColumns.map((col) => {
      const exists = columnOptions.some((opt) => opt.value === col);
      if (!exists && !col.endsWith('-1')) {
        const suffixedCol = `${col}-1`;
        const suffixedExists = columnOptions.some((opt) => opt.value === suffixedCol);
        if (suffixedExists) {
          console.log(`[ÉTAPE 4] Normalisation: "${col}" → "${suffixedCol}"`);
          return suffixedCol;
        }
      }
      return col;
    });

    const hasDiff =
      normalized.length !== rawDisplayColumns.length ||
      normalized.some((value, index) => value !== rawDisplayColumns[index]);

    return { raw: rawDisplayColumns, normalized, hasDiff };
  }, [lookupConfig.displayColumn, columnOptions]);

  useEffect(() => {
    if (readOnly || !normalizedDisplayColumns.hasDiff) return;
    
    // 🔥 FIX 24/01/2026: Sauvegarde IMMÉDIATE de meta.lookup.displayColumn après normalisation
    // Le debounce peut être écrasé par d'autres sauvegardes, donc on fait un PUT direct
    const saveNormalizedDisplayColumn = async () => {
      if (!activeId || activeId.startsWith('temp_')) return;
      
      try {
        // Construire la meta mise à jour avec le displayColumn normalisé
        const updatedMeta = {
          ...(cfg.meta || {}),
          lookup: {
            ...((cfg.meta?.lookup as TableLookupConfig) || {}),
            displayColumn: normalizedDisplayColumns.normalized,
          },
        };
        
        console.log(`[ÉTAPE 4] 🔥 Sauvegarde IMMÉDIATE displayColumn="${normalizedDisplayColumns.normalized[0]}"`);
        
        // PUT direct pour sauvegarder SEULEMENT la meta (pas les colonnes/lignes)
        await api.put(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`, {
          meta: updatedMeta,
        });
        
        console.log('[ÉTAPE 4] ✅ Meta sauvegardée avec displayColumn normalisé');
        
        // Rafraîchir le cache batch après sauvegarde
        tblBatch.refresh();
      } catch (error) {
        console.error('[ÉTAPE 4] ❌ Erreur sauvegarde meta:', error);
      }
    };
    
    // Mettre à jour le state local ET sauvegarder immédiatement
    updateLookupConfig((prev) => ({
      ...prev,
      displayColumn: normalizedDisplayColumns.normalized,
    }));
    
    // Sauvegarde immédiate (pas debounced)
    saveNormalizedDisplayColumn();
  }, [normalizedDisplayColumns.hasDiff, normalizedDisplayColumns.normalized, readOnly, updateLookupConfig, activeId, api, nodeId, cfg.meta, tblBatch]);

  useEffect(() => {
    if (readOnly) return;
    if (!activeId || activeId.startsWith('temp_')) return;
    if (!normalizedDisplayColumns.normalized.length) return;
    
    // ✅ Ne sauvegarder select-config que si un lookup est réellement configuré
    // (évite les erreurs 500 pour les noeuds non-SELECT comme display)
    const hasLookupConfig = lookupConfig.keyColumn || lookupConfig.keyRow;
    if (!hasLookupConfig) return;

    const selectConfigDisplayColumn = normalizedDisplayColumns.normalized[0] || null;

    debouncedSaveSelectConfig({
      optionsSource: 'table',
      tableReference: activeId,
      keyColumn: lookupConfig.keyColumn || null,
      keyRow: lookupConfig.keyRow || null,
      valueColumn: lookupConfig.valueColumn || null,
      valueRow: lookupConfig.valueRow || null,
      // TreeBranchLeafSelectConfig.displayColumn est une string (pas un array)
      displayColumn: selectConfigDisplayColumn,
      displayRow: lookupConfig.displayRow || null,
    });
  }, [
    activeId,
    debouncedSaveSelectConfig,
    lookupConfig.displayColumn,
    lookupConfig.displayRow,
    lookupConfig.keyColumn,
    lookupConfig.keyRow,
    lookupConfig.valueColumn,
    lookupConfig.valueRow,
    normalizedDisplayColumns.normalized,
    readOnly,
  ]);

  // ⚡ ULTRA-NOUVEAU: Évaluation temps réel des conditions
  const evaluateFilterConditionsRealtime = useCallback(async () => {
    if (!lookupConfig.filterConditions?.enabled || !lookupConfig.filterConditions?.conditions?.length) {
      setFilterResults(null);
      return;
    }

    setEvaluationLoading(true);
    try {
      // Simuler l'évaluation des conditions (remplacer par vraie logique)
      const conditions = lookupConfig.filterConditions.conditions.map(condition => {
        const result = Math.random() > 0.5; // Simulation
        const filterTarget = condition.filterByColumn ? `Colonne "${condition.filterByColumn}"` : 
                           condition.filterByRow ? `Ligne "${condition.filterByRow}"` : 'Non configuré';
        return {
          id: condition.id,
          result,
          description: `${filterTarget} ${condition.operator} ${condition.compareWithRef} = ${result ? '✅' : '❌'}`
        };
      });

      // Calculer les options filtrées
      const totalOptions = (cfg.rows?.length || 1) - 1; // Exclure header
      const filteredCount = Math.floor(totalOptions * (0.3 + Math.random() * 0.4)); // Simulation
      
      setFilterResults({
        totalOptions,
        filteredOptions: filteredCount,
        matchingRows: [], // À implémenter
        conditions
      });
    } catch (error) {
      console.error('Erreur évaluation conditions:', error);
    } finally {
      setEvaluationLoading(false);
    }
  }, [lookupConfig.filterConditions, cfg.rows]);

  // Auto-évaluation quand les conditions changent
  useEffect(() => {
    if (realtimePreview && lookupConfig.filterConditions?.enabled) {
      const timeout = setTimeout(evaluateFilterConditionsRealtime, 500);
      return () => clearTimeout(timeout);
    }
  }, [realtimePreview, lookupConfig.filterConditions, evaluateFilterConditionsRealtime]);

  // 🔥 NOUVEAU: Gestion des conditions de filtrage
  const addFilterCondition = useCallback(() => {
    const newCondition: TableLookupCondition = {
      id: `condition_${Date.now()}`,
      filterByColumn: undefined, // Colonne du tableau à filtrer (optionnel)
      filterByRow: undefined, // Ligne du tableau à filtrer (optionnel)
      operator: 'equals',
      compareWithRef: '', // Référence NodeTreeSelector
      description: ''
    };
    
    updateLookupConfig((prev) => ({
      ...prev,
      filterConditions: {
        ...prev.filterConditions,
        enabled: true,
        conditions: [...(prev.filterConditions?.conditions || []), newCondition],
        filterLogic: prev.filterConditions?.filterLogic || 'AND'
      }
    }));
  }, [updateLookupConfig]);

  const removeFilterCondition = useCallback((conditionId: string) => {
    updateLookupConfig((prev) => ({
      ...prev,
      filterConditions: {
        ...prev.filterConditions,
        conditions: (prev.filterConditions?.conditions || []).filter(c => c.id !== conditionId)
      }
    }));
  }, [updateLookupConfig]);

  const updateFilterCondition = useCallback((conditionId: string, updates: Partial<TableLookupCondition>) => {
    updateLookupConfig((prev) => ({
      ...prev,
      filterConditions: {
        ...prev.filterConditions,
        conditions: (prev.filterConditions?.conditions || []).map(c => 
          c.id === conditionId ? { ...c, ...updates } : c
        )
      }
    }));
  }, [updateLookupConfig]);

  const handleNodeTreeSelection = useCallback((selection: NodeTreeSelectorValue) => {
    if (!currentConditionId) return;
    
    updateFilterCondition(currentConditionId, {
      compareWithRef: selection.ref,
      description: `Comparer avec: ${selection.ref}`
    });
    
    setShowNodeTreeSelector(false);
    setCurrentConditionId(null);
  }, [currentConditionId, updateFilterCondition]);

  const openNodeTreeSelector = useCallback((conditionId: string) => {
    setCurrentConditionId(conditionId);
    setShowNodeTreeSelector(true);
  }, []);

  // ✨ Multiplicateur conditionnel: ouvrir le sélecteur pour champ A ou B
  const openMultiplierSelector = useCallback((conditionId: string, target: 'A' | 'B') => {
    setMultiplierConditionId(conditionId);
    setMultiplierSelectorTarget(target);
    setShowMultiplierSelector(true);
  }, []);

  const handleMultiplierSelection = useCallback((selection: NodeTreeSelectorValue) => {
    if (!multiplierConditionId || !multiplierSelectorTarget) return;
    
    // Format: cso_{filterIndex}_{condIndex}_{A|B}
    if (multiplierConditionId.startsWith('cso_')) {
      const parts = multiplierConditionId.split('_');
      const filterIndex = parseInt(parts[1], 10);
      const condIndex = parts.length >= 4 ? parseInt(parts[2], 10) : 0;
      const targetField = parts.length >= 4 ? parts[3] : multiplierSelectorTarget;
      const fieldKey = targetField === 'A' ? 'fieldA' : 'fieldB';
      
      updateLookupConfig((prev) => {
        const newFilters = [...(prev.columnSourceOption?.filters || [])];
        if (newFilters[filterIndex]) {
          const newConds = [...(newFilters[filterIndex].multiplier?.conditions || [])];
          if (newConds[condIndex]) {
            newConds[condIndex] = { ...newConds[condIndex], [fieldKey]: selection.ref };
          }
          newFilters[filterIndex] = {
            ...newFilters[filterIndex],
            multiplier: { ...newFilters[filterIndex].multiplier, conditions: newConds }
          };
        }
        return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
      });
    } else if (multiplierConditionId.startsWith('lk_')) {
      // 🔄 Lookup extensions: format lk_{type}_{ruleIdx}_{condIdx}_fieldRef
      const parts = multiplierConditionId.split('_');
      const ruleType = parts[1]; // co (columnOverride), vc (valueCap), al (alert)
      const ruleIdx = parseInt(parts[2], 10);
      const condIdx = parseInt(parts[3], 10);
      
      updateLookupConfig((prev) => {
        const fc = { ...(prev.filterConditions || {}) };
        if (ruleType === 'co' && fc.columnOverrides) {
          const rules = [...fc.columnOverrides];
          const conds = [...(rules[ruleIdx]?.conditions || [])];
          conds[condIdx] = { ...conds[condIdx], fieldRef: selection.ref };
          rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
          fc.columnOverrides = rules;
        } else if (ruleType === 'vc' && fc.valueCaps) {
          const rules = [...fc.valueCaps];
          const conds = [...(rules[ruleIdx]?.conditions || [])];
          conds[condIdx] = { ...conds[condIdx], fieldRef: selection.ref };
          rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
          fc.valueCaps = rules;
        } else if (ruleType === 'al' && fc.lookupAlerts) {
          const rules = [...fc.lookupAlerts];
          const conds = [...(rules[ruleIdx]?.conditions || [])];
          conds[condIdx] = { ...conds[condIdx], fieldRef: selection.ref };
          rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
          fc.lookupAlerts = rules;
        }
        return { ...prev, filterConditions: fc };
      });
    } else {
      // Support pour les filterConditions classiques
      const fieldKey = multiplierSelectorTarget === 'A' ? 'conditionFieldA' : 'conditionFieldB';
      updateFilterCondition(multiplierConditionId, {
        multiplier: {
          ...(lookupConfig.filterConditions?.conditions?.find(c => c.id === multiplierConditionId)?.multiplier || {}),
          [fieldKey]: selection.ref
        }
      });
    }
    
    setShowMultiplierSelector(false);
    setMultiplierConditionId(null);
    setMultiplierSelectorTarget(null);
  }, [multiplierConditionId, multiplierSelectorTarget, updateFilterCondition, updateLookupConfig, lookupConfig.filterConditions?.conditions]);

  // Gestion Colonnes (tous types)
  const addColumn = useCallback(() => {
    const nextCols = [...(cfg.columns || []), `Colonne ${(cfg.columns?.length || 0) + 1}`];
    const next: TableConfig = { ...cfg, columns: nextCols, data: ensureDataWidth(cfg.data, nextCols.length) };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave, ensureDataWidth]);

  const removeColumn = useCallback((idx: number) => {
    const nextCols = (cfg.columns || []).filter((_, i) => i !== idx);
    let nextData = cfg.data;
    if (Array.isArray(cfg.data)) {
      nextData = cfg.data.map((row) => row.filter((_, i) => i !== idx));
    }
    const next: TableConfig = { ...cfg, columns: nextCols, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  const renameColumn = useCallback((idx: number, val: string) => {
    const nextCols = [...(cfg.columns || [])];
    nextCols[idx] = val;
    const next: TableConfig = { ...cfg, columns: nextCols };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  // Note: En mode unifiÃ©, les lignes ont toujours des noms (labels)
  // On utilise addRow, removeRow, renameRow pour gÃ©rer les lignes
  // et setCellMatrix pour Ã©diter les cellules

  const addRow = useCallback(() => {
    const nextRows = [...(cfg.rows || []), `Ligne ${(cfg.rows?.length || 0) + 1}`];
    const width = (cfg.columns || []).length;
    const nextData = ensureDataHeight(cfg.data, nextRows.length, width);
    const next: TableConfig = { ...cfg, rows: nextRows, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave, ensureDataHeight]);

  const removeRow = useCallback((idx: number) => {
    const nextRows = (cfg.rows || []).filter((_, i) => i !== idx);
    let nextData = cfg.data;
    if (Array.isArray(cfg.data)) nextData = cfg.data.filter((_, i) => i !== idx);
    const next: TableConfig = { ...cfg, rows: nextRows, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  const renameRow = useCallback((idx: number, val: string) => {
    const nextRows = [...(cfg.rows || [])];
    nextRows[idx] = val;
    const next: TableConfig = { ...cfg, rows: nextRows };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  // Ã‰dition cellules (matrix)
  const setCellMatrix = useCallback((rowIdx: number, colIdx: number, raw: string) => {
    const width = (cfg.columns || []).length;
    const height = (cfg.rows || []).length;
    let nextData = ensureDataHeight(cfg.data, height, width) || [];
    const parseVal = (s: string): number | string | null => {
      const trimmed = s.trim();
      if (trimmed === '') return null;
      const isNumLike = /^[-+]?\d{1,3}(?:[.,]\d+)?$/.test(trimmed);
      if (isNumLike) {
        const n = Number(trimmed.replace(',', '.'));
        if (Number.isFinite(n)) return n;
      }
      return trimmed;
    };
    const v = parseVal(raw);
    const row = [...nextData[rowIdx]];
    row[colIdx] = v;
    nextData = [...nextData];
    nextData[rowIdx] = row;
    const next: TableConfig = { ...cfg, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave, ensureDataHeight]);

  // import par fichier uniquement (voir handleFileChosen)

  const refreshLookup = useCallback(async () => {
    if (!testCol || !testRow || !activeId) return;
    try {
      const res = await api.get(`/api/treebranchleaf/nodes/${nodeId}/tables/lookup`, {
        params: { tableId: activeId, column: testCol, row: testRow },
      });
      setLookupValue(res?.value ?? null);
    } catch (error) {
      console.error('ðŸ—‚ï¸ TablePanel: Erreur lookup matrice', error);
      setLookupValue(undefined);
    }
  }, [api, nodeId, testCol, testRow, activeId]);

  // aperÃ§u matrix non utilisÃ© depuis passage en Ã©dition inline
  const matrixEditableColumns = useMemo(() => {
    const firstCol = {
      title: cfg.columns?.[0] || 'Ligne', // 🎯 A1 (ex: "Orientation") comme titre de colonne
      dataIndex: 'row',
      key: 'row',
      fixed: 'left' as const,
      // Use record.rowIndex which references the actual index in cfg.rows/cfg.data (includes header at index 0)
      render: (_: unknown, record: any) => {
        const idx = typeof record?.rowIndex === 'number' ? record.rowIndex : 0;
        // Afficher le label correspondant (cfg.rows peut contenir arrays ou strings)
        const label = Array.isArray((cfg.rows || [])[idx]) ? String((cfg.rows || [])[idx][0]) : String((cfg.rows || [])[idx] ?? '');
        return (
          <Input
            size="small"
            value={label}
            onChange={(e) => renameRow(idx, e.target.value)}
            disabled={readOnly}
          />
        );
      }
    };
    const rest = (cfg.columns || []).slice(1).map((c, cIdx) => ({ // slice(1) pour SAUTER A1
      title: c,
      dataIndex: String(cIdx),
      key: String(cIdx),
      // Use record.rowIndex to resolve the correct row in cfg.data (which may include header at index 0)
      render: (_: unknown, record: any) => {
        const idx = typeof record?.rowIndex === 'number' ? record.rowIndex : 0;
  const value = (cfg.data?.[idx]?.[cIdx] ?? '') as string | number;
        return (
          <Input
            size="small"
            value={value}
            onChange={(e) => setCellMatrix(idx, cIdx, e.target.value)}
            disabled={readOnly}
          />
        );
      }
    }));
    return [firstCol, ...rest];
  }, [cfg, readOnly, renameRow, setCellMatrix]);

  // Gestion des instances de tableaux
  const addTableInstance = useCallback(async () => {
    const tempId = `temp_${Date.now()}`;
  const fallbackInstances = instances;
  const fallbackActiveId = activeId;

    const tempInstance: TableInstance = {
      id: tempId,
      name: `Tableau ${instances.length + 1}`,
      description: '',
      type: 'columns',
      columns: [],
      rows: [],
      matrix: [],
      data: { matrix: [] },
      records: [],
      meta: {
        lookup: {
          enabled: true,
          mode: 'columns',
          exposeColumns: [],
        },
      },
      order: instances.length,
    };

    setInstances((prev) => [...prev, tempInstance]);
    setActiveId(tempId);
    setCfg(instanceToConfig(tempInstance));

    try {
      const payload = {
        name: tempInstance.name,
        description: tempInstance.description,
        type: tempInstance.type,
        columns: tempInstance.columns,
        rows: tempInstance.rows,
        data: tempInstance.matrix ?? [],  // âœ… Backend attend array direct
        meta: tempInstance.meta || {},
      };

      const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/tables`, payload);
      const savedInstance = normalizedToInstance(created as NormalizedTableInstanceResponse);

      setInstances((prev) => prev.map((item) => (item.id === tempId ? savedInstance : item)));
      setActiveId(savedInstance.id);
      setCfg(instanceToConfig(savedInstance));
      message.success('Tableau crÃ©Ã©');
    } catch (error) {
      console.error('ðŸ—‚ï¸ TablePanel: Erreur crÃ©ation instance:', error);
      message.error('Impossible de crÃ©er le tableau');
      setInstances((prev) => prev.filter((item) => item.id !== tempId));

      if (fallbackInstances.length) {
        const fallbackInstance = fallbackInstances.find((item) => item.id === fallbackActiveId) ?? fallbackInstances[0];
        setActiveId(fallbackInstance ? fallbackInstance.id : null);
        setCfg(instanceToConfig(fallbackInstance));
      } else {
        setActiveId(null);
        setCfg({ type: 'columns', columns: [] });
      }
    }
  }, [api, nodeId, instances, activeId]);

  const deleteTableInstance = useCallback(async () => {
    if (!activeId) return;
    
    const userConfirmed = window.confirm(
      instances.length > 1
        ? `Supprimer définitivement cette instance de tableau ?`
        : `Supprimer définitivement ce tableau ? Cette action est irréversible.`
    );
    
    if (!userConfirmed) return;
    
    try {
      // 🔧 FIX: Annuler TOUS les saves debounced AVANT la suppression
      // Empêche la race condition: le debounced POST select-config qui arrive
      // APRÈS le DELETE et recrée l'association avec la table supprimée
      debouncedSave.cancel();
      debouncedSaveSelectConfig.cancel();
      
      // Supprimer de l'API si ce n'est pas temporaire
      if (!activeId.startsWith('temp_')) {
        await api.delete(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`);
      }
      
      // Mettre à jour les instances locales
      const remaining = instances.filter(it => it.id !== activeId);
      setInstances(remaining);
      
      // Sélectionner la prochaine instance
      const nextActive = remaining[0] || null;
      setActiveId(nextActive ? nextActive.id : null);
      
      if (nextActive) {
        setCfg(instanceToConfig(nextActive));
      } else {
        // Réinitialiser avec un tableau vide
        setCfg({ type: 'matrix', columns: ['Colonne 1'], rows: ['Ligne 1'], data: [[null]] });
        
        // 🔧 FIX: Désactiver la capability table sur le nœud
        // Le backend DELETE a déjà nettoyé la DB, mais il faut aussi
        // forcer la mise à jour de la capability pour éviter tout désync
        try {
          await updateTableCapability(nodeId, {
            enabled: false,
            activeId: null,
            instances: null,
            currentTable: null,
          });
        } catch (capError) {
          console.warn('🗂️ TablePanel: Avertissement capability cleanup:', capError);
        }
      }
      
      message.success(instances.length > 1 ? 'Instance supprimée' : 'Tableau supprimé');
    } catch (error) {
      console.error('🗂️ TablePanel: Erreur suppression instance:', error);
      message.error('Impossible de supprimer l\'instance');
    }
  }, [activeId, instances, api, nodeId, debouncedSave, debouncedSaveSelectConfig, updateTableCapability]);

  // Gestionnaire de sÃ©lection de fichier
  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 📥 FONCTION DE TÉLÉCHARGEMENT EXCEL
  const handleDownloadExcel = useCallback(() => {
    if (!cfg.columns?.length || !cfg.rows?.length) {
      message.warning('Le tableau est vide, rien à télécharger');
      return;
    }

    try {
      // 🎯 RÈGLE A1: Reconstruire le format Excel avec A1 aux deux endroits
      // Ligne 1 = En-têtes de colonnes (incluant A1)
      const excelData: (string | number | null)[][] = [
        [...cfg.columns] // ["Orientation", "0", "5", "15", ...]
      ];

      // Lignes suivantes = [Label de ligne, ...valeurs de données]
      // Supporter cfg.rows qui peut contenir soit des labels simples (string)
      // soit des arrays complets ([label, ...cells])
      cfg.rows.forEach((row, rowIdx) => {
        if (Array.isArray(row)) {
          // row est déjà une array complète -> l'ajouter telle quelle
          excelData.push(row.map(cell => (cell === null || cell === undefined ? '' : cell)));
        } else {
          const rowData = cfg.data?.[rowIdx] || [];
          excelData.push([row, ...rowData]); // ["Nord", 82, 88, 93, ...]
        }
      });

      // Créer le fichier Excel
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tableau');

      // Générer le nom du fichier
      const fileName = cfg.meta?.name || `tableau_${Date.now()}`;
      const sanitizedName = fileName.replace(/[^a-z0-9_-]/gi, '_');

      // Télécharger
      XLSX.writeFile(workbook, `${sanitizedName}.xlsx`);
      message.success('✅ Fichier Excel téléchargé !');
    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      message.error('Impossible de télécharger le fichier');
    }
  }, [cfg]);

  // Gestionnaire de fichier choisi
  const handleFileChosen = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('🗂️ TablePanel: Pas de fichier sélectionné');
      return;
    }
    
    console.log('🗂️ TablePanel: 📂 Début import fichier:', file.name);
    
    try {
      console.log('🗂️ TablePanel: 📖 Lecture du fichier...');
      const data = await file.arrayBuffer();
      console.log('🗂️ TablePanel: ✅ Fichier lu, taille:', data.byteLength);
      
      const workbook = XLSX.read(data, { type: 'array' });
      console.log('🗂️ TablePanel: 📊 Workbook parsé, feuilles:', workbook.SheetNames);
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];
      
      console.log('🗂️ TablePanel: 📋 Données extraites:', jsonData.length, 'lignes');
      
      if (jsonData.length === 0) {
        message.warning('Le fichier est vide');
        return;
      }
      
      // Utiliser le type actuel de la configuration
      // Maintenant toujours 'matrix' (avec colonnes ET lignes)
      const type: 'columns' | 'matrix' = 'matrix';
      
      let columns: string[] = [];
      let rows: (string | number)[][] | undefined; // ✅ Changé: array de arrays!
      let tableData: (number | string | null)[][] = [];
      
      if (type === 'matrix') {
        // 🎯 RÈGLE A1 EXCEL (DYNAMIQUE):
        // A1 = Cellule au coin (ex: "Orientation") doit être disponible dans colonnes ET lignes pour SELECT
        // - columns = Première ligne COMPLÈTE ["Orientation", "0", "5", "15", ...] 
        // - rows = Première colonne COMPLÈTE ["Orientation", "Nord", "Nord Est", ...] ← AVEC A1 !!!
        // - data = Corps du tableau SANS première ligne NI première colonne
        // Dans l'affichage du tableau, A1 apparaît une seule fois comme titre de première colonne
        
        // Colonnes = Première ligne complète (AVEC A1 en position 0)
        columns = jsonData[0].map((col, idx) => {
          if (col === null || col === undefined) return `Colonne ${idx + 1}`;
          return String(col);
        });
        
        // ✅ FIX CRITIQUE: Backend attend rows = array de arrays (lignes complètes)
        // PAS un array de strings (juste les labels)!
        rows = jsonData.map((row) => {
          // Retourner la ligne COMPLÈTE avec toutes les cellules
          return row.map(val => val === null || val === undefined ? '' : val);
        });
        
        // Data = Corps SANS première ligne NI première colonne (pour affichage)
        tableData = jsonData.slice(1).map(row => row.slice(1));
      } else {
        // Mode columns: TOUTES les colonnes sont importÃ©es (y compris la premiÃ¨re)
        columns = jsonData[0].map((col, idx) => 
          typeof col === 'string' ? col : `Colonne ${idx + 1}`
        );
        tableData = jsonData.slice(1);
      }
      
      const next: TableConfig = {
        type,
        columns,
        rows,
        data: tableData,
        meta: { 
          ...cfg.meta, 
          isImported: true, 
          importSource: file.name,
          // 🔧 FIX: Initialiser lookup avec enabled:true par défaut
          lookup: {
            ...cfg.meta?.lookup,
            enabled: true,
            columnLookupEnabled: false,
            rowLookupEnabled: false,
            extractFrom: 'row',
            keyRow: rows?.[0] || null, // Par défaut: première ligne (A1)
            selectors: cfg.meta?.lookup?.selectors || {},
            exposeColumns: cfg.meta?.lookup?.exposeColumns || [],
          },
        },
      };
      
      console.log('🗂️ TablePanel: ========================================');
      console.log('🗂️ TablePanel: 📊 CONFIG CRÉÉE');
      console.log('🗂️ TablePanel: Type:', next.type);
      console.log('🗂️ TablePanel: Colonnes:', next.columns.length, next.columns);
      console.log('🗂️ TablePanel: Lignes (rows):', next.rows?.length, next.rows?.slice(0, 10), '...');
      console.log('🗂️ TablePanel: Data (matrix):', next.data.length, 'lignes');
      console.log('🗂️ TablePanel: 📋 Lookup config initiale:', next.meta.lookup);
      console.log('🗂️ TablePanel: Data[0]:', next.data[0]);
      console.log('🗂️ TablePanel: Data[dernière]:', next.data[next.data.length - 1]);
      console.log('🗂️ TablePanel: ========================================');
      
      setCfg(next);
      
      // ✅ Si instance temporaire, créer d'abord puis MAJ, sinon sauvegarder directement
      if (!activeId || activeId.startsWith('temp_')) {
        console.log('🗂️ TablePanel: 🎯 Instance temporaire détectée, création puis import...');
        setIsImporting(true);
        try {
          const payload = {
            name: `Import ${file.name}`,
            description: `Importé depuis ${file.name}`,
            type: next.type,
            columns: next.columns,
            rows: next.rows || [],
            data: next.data || [],
            meta: next.meta || {},
          };
          
          console.log('🗂️ TablePanel: ========================================');
          console.log('🗂️ TablePanel: 📤 PAYLOAD À ENVOYER AU SERVEUR');
          console.log('🗂️ TablePanel: name:', payload.name);
          console.log('🗂️ TablePanel: type:', payload.type);
          console.log('🗂️ TablePanel: columns:', payload.columns.length, 'items');
          console.log('🗂️ TablePanel: rows:', payload.rows.length, 'items');
          console.log('🗂️ TablePanel: data:', payload.data.length, 'lignes');
          console.log('🗂️ TablePanel: Premières rows:', payload.rows.slice(0, 10));
          console.log('🗂️ TablePanel: Dernières rows:', payload.rows.slice(-10));
          console.log('🗂️ TablePanel: Première ligne data:', payload.data[0]);
          console.log('🗂️ TablePanel: Dernière ligne data:', payload.data[payload.data.length - 1]);
          console.log('🗂️ TablePanel: ========================================');
          
          console.log('🗂️ TablePanel: 🚀 Envoi POST vers /api/treebranchleaf/nodes/' + nodeId + '/tables');
          const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/tables`, payload);
          console.log('🗂️ TablePanel: ✅ RÉPONSE SERVEUR REÇUE:', created);
          const savedInstance = normalizedToInstance(created as NormalizedTableInstanceResponse);
          console.log('[IMPORT] ✅ Instance sauvegardée, ID:', savedInstance.id);

          // Mettre à jour la liste des instances et l'ID actif.
          // L'useEffect [activeId, instances] se chargera de mettre à jour cfg.
          console.log('[IMPORT] 🔄 Mise à jour de la liste des instances et de l\'ID actif.');
          setInstances((prev) => {
            const newInstances = prev.filter(item => item.id !== activeId);
            newInstances.push(savedInstance);
            return newInstances.sort((a, b) => a.order - b.order);
          });
          setActiveId(savedInstance.id);
          
          message.success('Tableau importé et sélectionné avec succès !');
          console.log('🎉 Import terminé, l\'interface va se mettre à jour.');
        } catch (error) {
          console.error('🗂️ TablePanel: Erreur création instance import:', error);
          message.error('Erreur lors de la création du tableau importé');
        } finally {
          setIsImporting(false);
        }
      } else {
        debouncedSave(next);
        message.success(`Fichier importÃ©: ${jsonData.length - 1} lignes, ${next.columns.length} colonnes`);
      }
    } catch (error) {
      console.error('ðŸ—‚ï¸ TablePanel: Erreur import fichier:', error);
      message.error('Erreur lors de l\'import du fichier');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [cfg, debouncedSave, activeId, api, nodeId]);

  return (
    <Card size="small" variant="outlined">
      <Title level={5}>ðŸ§© Tableau</Title>
      {/* Multiâ€‘instances */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' as const }}>
        <Text type="secondary">Instance:</Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ value: it.id, label: it.name || 'Sans nom' }))}
          onChange={(id) => {
            setActiveId(id);
            const selectedInstance = instances.find(x => x.id === id);
            if (selectedInstance) {
              setCfg(instanceToConfig(selectedInstance));
            }
          }}
          placeholder="SÃ©lectionner une instance"
        />
        <Button size="small" icon={<PlusOutlined />} onClick={addTableInstance} disabled={readOnly}>
          Ajouter
        </Button>
        <Button size="small" icon={<DeleteOutlined />} onClick={deleteTableInstance} disabled={readOnly} danger>
          Supprimer{instances.length > 1 ? ' cette instance' : ' le tableau'}
        </Button>
      </div>
      
      {/* Nom de l'instance et rÃ©sumÃ© test */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' as const }}>
        <Text strong>Nom:</Text>
        <Input
          size="small"
          style={{ width: 260 }}
          value={(instances.find(i => i.id === activeId)?.name) || ''}
          placeholder="Nom de l'instance"
          onChange={async (e) => {
            const name = e.target.value;
            setInstances(prev => prev.map(it => it.id === activeId ? { ...it, name } : it));
            
            // Mettre Ã  jour le nom dans la base si ce n'est pas temporaire
            if (activeId && !activeId.startsWith('temp_')) {
              try {
                await api.put(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`, { name });
              } catch (error) {
                console.error('ðŸ—‚ï¸ TablePanel: Erreur mise Ã  jour nom:', error);
              }
            }
          }}
          disabled={readOnly}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Text type="secondary">
            RÃ©sumÃ©: {cfg.rows?.length || 0} lignes Ã— {cfg.columns.length} colonnes
          </Text>
        </div>
      </div>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* LibellÃ© du tableau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <Text strong>LibellÃ© du tableau:</Text>
          <Input
            style={{ maxWidth: 360 }}
            placeholder="Nom du tableau"
            value={typeof cfg.meta?.name === 'string' ? cfg.meta.name : ''}
            disabled={readOnly}
            onChange={(e) => {
              const name = e.target.value;
              const next: TableConfig = { ...cfg, meta: { ...(cfg.meta || {}), name } };
              setCfg(next);
              debouncedSave(next);
            }}
          />
          <Tooltip title="Ce libellÃ© sert de nom humainement lisible au tableau. Il est enregistrÃ© dans Prisma (tableConfig.meta.name).">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <Button onClick={triggerFilePicker} disabled={readOnly || isImporting} loading={isImporting}>
            {isImporting ? 'Import en cours...' : 'Importer Excel/CSV (fichier)'}
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadExcel} 
            disabled={readOnly || !cfg.columns?.length || !cfg.rows?.length || isImporting}
          >
            Télécharger Excel
          </Button>
          {isImporting && <Text type="secondary">⏳ Import de {cfg.rows?.length || 0} lignes en cours, veuillez patienter...</Text>}
        </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />

        {/* ✅ Indicateur de chargement pour gros tableaux */}
        {isLoadingTable && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="secondary">⏳ Chargement du tableau ({cfg.rows?.length || 0} lignes)...</Text>
          </div>
        )}

        {/* ⚠️ Message pour tableaux TROP volumineux */}
        {!isLoadingTable && cfg.meta?.isTooBig && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px', marginBottom: '16px' }}>
            <Text strong style={{ color: '#d46b08' }}>⚠️ Tableau très volumineux ({cfg.meta.fullRowCount} lignes)</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Pour des raisons de performance, seules les colonnes sont affichées. 
              Les données sont bien enregistrées et utilisables dans les lookups.
            </Text>
          </div>
        )}

        {/* ✅ Afficher UNIQUEMENT les colonnes pour les très gros tableaux */}
        {!isLoadingTable && cfg.meta?.isTooBig && (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
            <div style={{ minWidth: 260, flex: 1 }}>
              <Text strong>Colonnes ({cfg.columns?.length || 0})</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(cfg.columns || []).slice(0, 20).map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <Input
                      size="small"
                      value={c}
                      placeholder={`Colonne ${idx + 1}`}
                      disabled={true}
                    />
                  </div>
                ))}
                {(cfg.columns?.length || 0) > 20 && <Text type="secondary" style={{ fontSize: 11 }}>... et {(cfg.columns?.length || 0) - 20} autres colonnes</Text>}
              </Space>
            </div>
          </div>
          <Text type="secondary">0 lignes affichées × {(cfg.columns?.length || 0)} colonnes • ⚠️ {cfg.meta.fullRowCount} lignes totales (en base de données)</Text>
        </Space>
        )}

        {/* ✅ Affichage NORMAL pour tableaux raisonnables */}
        {!isLoadingTable && !cfg.meta?.isTooBig && (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
            <div style={{ minWidth: 260, flex: 1 }}>
              <Text strong>Colonnes ({cfg.columns?.length || 0})</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(cfg.columns || []).slice(0, 20).map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <Input
                      size="small"
                      value={c}
                      placeholder={`Colonne ${idx + 1}`}
                      onChange={(e) => renameColumn(idx, e.target.value)}
                    disabled={readOnly}
                  />
                  <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removeColumn(idx)} disabled={readOnly} />
                </div>
              ))}
              {(cfg.columns?.length || 0) > 20 && <Text type="secondary" style={{ fontSize: 11 }}>... et {(cfg.columns?.length || 0) - 20} autres colonnes</Text>}
              <Button icon={<PlusOutlined />} onClick={addColumn} size="small" disabled={readOnly}>Ajouter une colonne</Button>
            </Space>
            </div>
            <div style={{ minWidth: 260, flex: 1 }}>
              <Text strong>Lignes ({cfg.rows?.length || 0})</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Afficher TOUTES les lignes (y compris l'entête) comme des champs normaux */}
                {(cfg.rows || []).slice(0, 20).map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <Input size="small" value={Array.isArray(r) ? String(r[0]) : String(r)} placeholder={`Ligne ${idx + 1}`} onChange={(e) => renameRow(idx, e.target.value)} disabled={readOnly} />
                    <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removeRow(idx)} disabled={readOnly} />
                  </div>
                ))}
                {(cfg.rows?.length || 0) > 20 && <Text type="secondary" style={{ fontSize: 11 }}>... et {(cfg.rows?.length || 0) - 20} autres lignes</Text>}
                <Button icon={<PlusOutlined />} onClick={addRow} size="small" disabled={readOnly}>Ajouter une ligne</Button>
              </Space>
            </div>
          </div>
          <Text type="secondary">{(cfg.rows?.length || 0)} lignes × {(cfg.columns?.length || 0)} colonnes{cfg.meta?.isImported ? ` • 📥 Importé depuis ${cfg.meta.importSource || 'Excel'}` : ''}</Text>
        </Space>
        )}


            <Divider style={{ margin: '8px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                <Text strong>Lookup & liaisons</Text>
                <Tooltip title="Transforme ce tableau en source de donnees pour un champ SELECT. Extrayez les valeurs depuis une colonne ou une ligne.">
                  <InfoCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* SECTION 1: LOOKUP COLONNE */}
                <div style={{ padding: '12px', background: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>📊 Lookup COLONNE</Text>
                    <Switch
                      size="small"
                      checked={lookupConfig.columnLookupEnabled === true}
                      onChange={async (checked) => {
                        console.log('[TablePanel] Toggle lookup COLONNE:', checked);
                        
                        if (!checked) {
                          // DESACTIVATION : nettoyer TOUS les champs pour ce tableau
                          console.log('[TablePanel] Desactivation lookup COLONNE - nettoyage complet');
                          const fieldsToDisable: string[] = [];
                          
                          // 1. Champ dans lookupConfig.selectors
                          if (lookupConfig.selectors?.columnFieldId) {
                            fieldsToDisable.push(lookupConfig.selectors.columnFieldId);
                          }
                          
                          // 2. Chercher champs orphelins (avec table active mais pas dans selectors)
                          const allFields = fieldOptions || [];
                          const orphanFields = allFields.filter(f => 
                            f.capabilities?.table?.enabled === true && 
                            f.capabilities?.table?.activeId === activeId &&
                            f.id !== lookupConfig.selectors?.rowFieldId && // Ne pas toucher LIGNE actif
                            !fieldsToDisable.includes(f.id) // Éviter les doublons
                          );
                          orphanFields.forEach(f => {
                            console.log(`[TablePanel] Orphelin COLONNE détecté: ${f.label} (${f.id})`);
                            fieldsToDisable.push(f.id);
                          });
                          
                          console.log(`[TablePanel] Champs a desactiver: ${fieldsToDisable.length}`, fieldsToDisable);
                          
                          // Désactiver tous les champs
                          for (const fieldId of fieldsToDisable) {
                            try {
                              await updateTableCapability(fieldId, { enabled: false });
                            } catch (error) {
                              console.error(`Erreur desactivation ${fieldId}:`, error);
                            }
                          }
                          
                          updateLookupConfig((prev) => ({
                            ...prev,
                            columnLookupEnabled: false,
                            selectors: { ...(prev.selectors || {}), columnFieldId: null },
                            keyColumn: undefined,
                            valueColumn: undefined,
                            displayColumn: undefined
                          }));
                          
                          message.success(`Lookup COLONNE desactive (${fieldsToDisable.length} champ(s))`);
                        } else if (checked) {
                          // ACTIVATION : juste mettre le flag enabled
                          updateLookupConfig((prev) => ({ ...prev, columnLookupEnabled: true }));
                          message.info('Selectionnez un champ colonne ci-dessous');
                        } else {
                          // Désactivation simple (pas de champ configuré)
                          updateLookupConfig((prev) => ({ ...prev, columnLookupEnabled: false }));
                        }
                      }}
                      disabled={readOnly}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Extraire valeurs d'une colonne
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    Un champ SELECT sera cree avec les valeurs d'une colonne du tableau
                  </Text>
                </div>

                {/* SECTION 2: LOOKUP LIGNE */}
                <div style={{ padding: '12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>📝 Lookup LIGNE</Text>
                    <Switch
                      size="small"
                      checked={lookupConfig.rowLookupEnabled === true}
                      onChange={async (checked) => {
                        console.log('[TablePanel] Toggle lookup LIGNE:', checked);
                        
                        if (!checked) {
                          // DESACTIVATION : nettoyer TOUS les champs pour ce tableau
                          console.log('[TablePanel] Desactivation lookup LIGNE - nettoyage complet');
                          const fieldsToDisable: string[] = [];
                          
                          // 1. Champ dans lookupConfig.selectors
                          if (lookupConfig.selectors?.rowFieldId) {
                            fieldsToDisable.push(lookupConfig.selectors?.rowFieldId);
                          }
                          
                          // 2. Chercher champs orphelins (avec table active mais pas dans selectors)
                          const allFields = fieldOptions || [];
                          
                          // 🔍 DEBUG: Afficher TOUS les champs avec table active
                          const fieldsWithTable = allFields.filter(f => f.capabilities?.table?.enabled === true);
                          console.log('[TablePanel] 🔍 DEBUG Champs avec table active:', fieldsWithTable.map(f => ({
                            label: f.label,
                            id: f.id,
                            activeId: f.capabilities?.table?.activeId,
                            rowBased: f.capabilities?.table?.rowBased,
                            columnBased: f.capabilities?.table?.columnBased
                          })));
                          
                          const orphanFields = allFields.filter(f => 
                            f.capabilities?.table?.enabled === true && 
                            f.capabilities?.table?.activeId === activeId &&
                            f.id !== lookupConfig.selectors?.columnFieldId && // Ne pas toucher COLONNE actif
                            !fieldsToDisable.includes(f.id) // Éviter les doublons
                          );
                          orphanFields.forEach(f => {
                            console.log(`[TablePanel] Orphelin LIGNE détecté: ${f.label} (${f.id})`);
                            fieldsToDisable.push(f.id);
                          });
                          
                          console.log(`[TablePanel] Champs a desactiver: ${fieldsToDisable.length}`, fieldsToDisable);
                          
                          // Désactiver tous les champs
                          for (const fieldId of fieldsToDisable) {
                            try {
                              await updateTableCapability(fieldId, { enabled: false });
                            } catch (error) {
                              console.error(`Erreur desactivation ${fieldId}:`, error);
                            }
                          }
                          
                          updateLookupConfig((prev) => ({
                            ...prev,
                            rowLookupEnabled: false,
                            selectors: { ...(prev.selectors || {}), rowFieldId: null },
                            keyRow: undefined,
                            valueRow: undefined,
                            displayRow: undefined
                          }));
                          
                          message.success(`Lookup LIGNE desactive (${fieldsToDisable.length} champ(s))`);
                        } else if (checked) {
                          // ACTIVATION : juste mettre le flag enabled
                          updateLookupConfig((prev) => ({ ...prev, rowLookupEnabled: true }));
                          message.info('Selectionnez un champ ligne ci-dessous');
                        } else {
                          // Désactivation simple (pas de champ configuré)
                          updateLookupConfig((prev) => ({ ...prev, rowLookupEnabled: false }));
                        }
                      }}
                      disabled={readOnly}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Extraire valeurs d'une ligne
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    Un champ SELECT sera cree avec les valeurs d'une ligne du tableau
                  </Text>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Configuration COLONNE - visible uniquement si switch ON */}
                {lookupConfig.columnLookupEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* ENCADRÉ PRINCIPAL: Sélection du type de source + configuration */}
                  <div style={{ padding: '12px', background: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                    
                    {/* ÉTAPE 1: Choisir le type de source */}
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        📌 ÉTAPE 1: Sélectionner la source pour traiter la colonne
                      </Text>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="columnSourceType"
                            value="select"
                            checked={lookupConfig.columnSourceOption?.type === 'select' || !lookupConfig.columnSourceOption}
                            onChange={() => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                columnSourceOption: { ...(prev.columnSourceOption || {}), type: 'select', description: 'Colonne de la table' }
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <label style={{ cursor: 'pointer', flex: 1 }}>
                            <Text>1. SELECT - Un champ du formulaire devient liste déroulante</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 24 }}>
                              Sélectionner une colonne/ligne de la table
                            </Text>
                          </label>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="columnSourceType"
                            value="field"
                            checked={lookupConfig.columnSourceOption?.type === 'field'}
                            onChange={() => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                columnSourceOption: { ...(prev.columnSourceOption || {}), type: 'field', description: 'Valeur du champ' }
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <label style={{ cursor: 'pointer', flex: 1 }}>
                            <Text>2. CHAMP - Utiliser la valeur du champ du formulaire</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 24 }}>
                              La valeur sera utilisée pour traiter la table
                            </Text>
                          </label>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="columnSourceType"
                            value="capacity"
                            checked={lookupConfig.columnSourceOption?.type === 'capacity'}
                            onChange={() => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                columnSourceOption: { ...(prev.columnSourceOption || {}), type: 'capacity', description: 'Réponse de la capacité' }
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <label style={{ cursor: 'pointer', flex: 1 }}>
                            <Text>3. CAPACITÉ - Utiliser une capacité (formule/condition/table)</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 24 }}>
                              La réponse sera utilisée pour traiter la table
                            </Text>
                          </label>
                        </div>
                      </Space>
                    </div>

                    {/* ÉTAPE 2: Sélectionner dans l'arborescence selon l'option choisie */}
                    <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #91d5ff' }}>
                      <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        📌 ÉTAPE 2: Sélectionner dans l'arborescence
                      </Text>
                      
                      {/* OPTION 1: SELECT */}
                      {(!lookupConfig.columnSourceOption || lookupConfig.columnSourceOption.type === 'select') && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Champ colonne à transformer en liste:
                          </Text>
                          <Select
                            size="small"
                            showSearch
                            placeholder={fieldsLoading ? 'Chargement...' : 'Sélectionner un champ'}
                            value={lookupConfig.selectors?.columnFieldId || undefined}
                            options={fieldSelectOptions}
                            optionRender={fieldOptionRender}
                            onChange={(value) => {
                              // Mettre à jour la config lookup via updateLookupConfig
                              // qui gérera automatiquement la sauvegarde via debouncedSave
                              updateLookupConfig((prev) => ({
                                ...prev,
                                enabled: true,
                                columnLookupEnabled: true,
                                rowLookupEnabled: prev.rowLookupEnabled ?? false,
                                columnSourceOption: { ...(prev.columnSourceOption || {}), type: 'select', description: (prev.columnSourceOption as any)?.description || 'Colonne de la table' },
                                selectors: { ...(prev.selectors || {}), columnFieldId: value || null },
                              }));

                              if (value && activeId) {
                                (async () => {
                                  try {
                                    
                                    const payload = {
                                      enabled: true,
                                      activeId: activeId,
                                      currentTable: {
                                        type: 'columns',
                                        tableId: activeId,
                                        mode: 'columns',
                                        columnBased: true,
                                        rowBased: false,
                                        keyColumn: lookupConfig.keyColumn || null,
                                        valueColumn: lookupConfig.valueColumn || null,
                                        displayColumn: lookupConfig.displayColumn || null,
                                      },
                                    };
                                    await updateTableCapability(value, payload);
                                    message.success('Champ transformé en liste !');
                                  } catch (error) {
                                    console.error('Erreur activation capacité:', error);
                                    message.error('Erreur activation de la capacité Table');
                                  }
                                })();
                              }
                            }}
                            disabled={readOnly || fieldsLoading}
                            allowClear
                            optionFilterProp="label"
                            loading={fieldsLoading}
                            style={{ width: '100%' }}
                          />
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Ce champ deviendra une liste déroulante
                          </Text>
                        </div>
                      )}

                      {/* 🔥 ÉTAPE 2.5: Filtrage pour SELECT - Mode unifié avec filtres multiples */}
                      {(!lookupConfig.columnSourceOption || lookupConfig.columnSourceOption.type === 'select') && lookupConfig.selectors?.columnFieldId && (
                        <div style={{ paddingTop: 12, borderTop: '1px solid #91d5ff', marginBottom: 12, background: '#f6f8fa', padding: '12px', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text type="secondary" strong style={{ fontSize: 12 }}>
                              📌 ÉTAPE 2.5: Filtrer les données du SELECT
                            </Text>
                          </div>
                          
                          {/* MODE UNIFIÉ: Filtres multiples avec structure complète */}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <Text strong style={{ fontSize: 12 }}>🔥 Filtres (logique AND)</Text>
                              <Button
                                size="small"
                                type="dashed"
                                onClick={() => {
                                  updateLookupConfig((prev) => {
                                    const currentFilters = prev.columnSourceOption?.filters || [];
                                    return {
                                      ...prev,
                                      columnSourceOption: {
                                        ...(prev.columnSourceOption || {}),
                                        filters: [...currentFilters, { column: null, operator: 'greaterThan', valueRef: null }]
                                      }
                                    };
                                  });
                                }}
                                disabled={readOnly}
                              >
                                + Ajouter un filtre
                              </Button>
                            </div>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 12 }}>
                              Tous les filtres doivent être respectés (logique AND). Cliquez sur "+ Ajouter un filtre" pour commencer.
                            </Text>
                            
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                              {(lookupConfig.columnSourceOption?.filters || []).map((filter: any, index: number) => (
                                <div key={index} style={{ background: '#fff', padding: 16, borderRadius: 6, border: '1px solid #d9d9d9' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text strong style={{ fontSize: 12 }}>Filtre {index + 1}</Text>
                                    <Button
                                      size="small"
                                      danger
                                      type="text"
                                      onClick={() => {
                                        updateLookupConfig((prev) => ({
                                          ...prev,
                                          columnSourceOption: {
                                            ...(prev.columnSourceOption || {}),
                                            filters: prev.columnSourceOption?.filters?.filter((_: any, i: number) => i !== index) || []
                                          }
                                        }));
                                      }}
                                      disabled={readOnly}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                  
                                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                    {/* Colonne */}
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                                        🔍 Colonne de la table:
                                      </Text>
                                      <Select
                                        size="small"
                                        showSearch
                                        placeholder="Sélectionner une colonne..."
                                        value={filter.column || undefined}
                                        options={(cfg.columns || []).map(col => ({ label: col, value: col }))}
                                        onChange={(value) => {
                                          updateLookupConfig((prev) => {
                                            const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                            newFilters[index] = { ...newFilters[index], column: value };
                                            return {
                                              ...prev,
                                              columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters }
                                            };
                                          });
                                        }}
                                        disabled={readOnly}
                                        allowClear
                                        style={{ width: '100%' }}
                                      />
                                    </div>

                                    {/* Opérateur */}
                                    {filter.column && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                                          ⚙️ Opérateur de comparaison:
                                        </Text>
                                        <Select
                                          size="small"
                                          value={filter.operator || 'equals'}
                                          options={[
                                            { label: '= (égal)', value: 'equals' },
                                            { label: '≠ (différent)', value: 'notEquals' },
                                            { label: '> (supérieur)', value: 'greaterThan' },
                                            { label: '< (inférieur)', value: 'lessThan' },
                                            { label: '≥ (supérieur ou égal)', value: 'greaterOrEqual' },
                                            { label: '≤ (inférieur ou égal)', value: 'lessOrEqual' },
                                            { label: 'contient', value: 'contains' },
                                            { label: 'ne contient pas', value: 'notContains' },
                                          ]}
                                          onChange={(value) => {
                                            updateLookupConfig((prev) => {
                                              const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                              newFilters[index] = { ...newFilters[index], operator: value };
                                              return {
                                                ...prev,
                                                columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters }
                                              };
                                            });
                                          }}
                                          disabled={readOnly}
                                          style={{ width: '100%' }}
                                        />
                                      </div>
                                    )}

                                    {/* Valeur via NodeTreeSelector */}
                                    {filter.column && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                                          🌳 Comparer avec (valeur de l'arborescence ou saisie libre):
                                        </Text>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <Input
                                            size="small"
                                            placeholder="Tapez une valeur ou sélectionnez 🌳"
                                            value={filter.valueRef || ''}
                                            onChange={(e) => {
                                              updateLookupConfig((prev) => {
                                                const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                newFilters[index] = { ...newFilters[index], valueRef: e.target.value };
                                                return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                              });
                                            }}
                                            style={{ flex: 1 }}
                                            disabled={readOnly}
                                          />
                                          <Button
                                            size="small"
                                            type="primary"
                                            onClick={() => {
                                              setCurrentFilterIndex(index);
                                              setShowNodeTreeSelectorFilter(true);
                                              setCurrentFilterFieldType('select');
                                            }}
                                            disabled={readOnly}
                                          >
                                            🌳 Sélectionner
                                          </Button>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block', color: '#999' }}>
                                          Tapez directement une valeur (ex: HUAWEI) ou sélectionnez un champ, formule, référence via 🌳
                                        </Text>
                                      </div>
                                    )}

                                    {/* ✨ Multiplicateur conditionnel */}
                                    {filter.column && (
                                      <div style={{ 
                                        marginTop: 4,
                                        padding: '8px', 
                                        background: filter.multiplier?.enabled ? '#fff7e6' : '#fafafa', 
                                        border: `1px ${filter.multiplier?.enabled ? 'solid #faad14' : 'dashed #d9d9d9'}`, 
                                        borderRadius: '4px' 
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: filter.multiplier?.enabled ? 8 : 0 }}>
                                          <Switch
                                            size="small"
                                            checked={filter.multiplier?.enabled || false}
                                            onChange={(checked) => {
                                              updateLookupConfig((prev) => {
                                                const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                const existingMult = newFilters[index].multiplier || {};
                                                newFilters[index] = { 
                                                  ...newFilters[index], 
                                                  multiplier: {
                                                    ...existingMult,
                                                    enabled: checked,
                                                    factor: existingMult.factor ?? 2,
                                                    elseFactor: existingMult.elseFactor ?? 1,
                                                    conditions: existingMult.conditions?.length ? existingMult.conditions : [{ fieldA: existingMult.conditionFieldA || '', operator: existingMult.conditionOperator || 'equals', fieldB: existingMult.conditionFieldB || '' }]
                                                  }
                                                };
                                                return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                              });
                                            }}
                                            disabled={readOnly}
                                          />
                                          <Text style={{ fontSize: 11, fontWeight: 500 }}>
                                            ⚡ Conditionnel (multiplicateur ou valeur fixe)
                                          </Text>
                                          {filter.multiplier?.enabled && (
                                            <Text type="secondary" style={{ fontSize: 10 }}>
                                              (TOUTES les conditions doivent être vraies)
                                            </Text>
                                          )}
                                        </div>

                                        {filter.multiplier?.enabled && (
                                          <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                            {/* Mode: multiplicateur ou valeur fixe */}
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: '#f0f5ff', borderRadius: 4, border: '1px solid #d6e4ff' }}>
                                              <Text type="secondary" style={{ fontSize: 10 }}>Mode :</Text>
                                              <Select
                                                size="small"
                                                value={filter.multiplier.mode || 'multiply'}
                                                style={{ width: 200 }}
                                                onChange={(value) => {
                                                  updateLookupConfig((prev) => {
                                                    const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                    newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, mode: value } };
                                                    return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                  });
                                                }}
                                                disabled={readOnly}
                                              >
                                                <Select.Option value="multiply">✖️ Multiplicateur (× facteur)</Select.Option>
                                                <Select.Option value="fixed">🎯 Valeur fixe (= valeur)</Select.Option>
                                              </Select>
                                            </div>
                                            {/* Liste des conditions */}
                                            {(filter.multiplier.conditions || []).map((cond: any, condIdx: number) => (
                                              <div key={condIdx} style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 10, minWidth: 12 }}>{condIdx === 0 ? 'SI' : 'ET'}</Text>
                                                {/* Champ A */}
                                                <div style={{ flex: 1 }}>
                                                  <div style={{ display: 'flex', gap: 2 }}>
                                                    <Input
                                                      size="small"
                                                      placeholder="Champ A"
                                                      value={cond.fieldA || ''}
                                                      readOnly
                                                      style={{ flex: 1, fontSize: 9 }}
                                                    />
                                                    <Button
                                                      size="small"
                                                      type="dashed"
                                                      onClick={() => {
                                                        setMultiplierConditionId(`cso_${index}_${condIdx}_A`);
                                                        setMultiplierSelectorTarget('A');
                                                        setShowMultiplierSelector(true);
                                                      }}
                                                      disabled={readOnly}
                                                      style={{ padding: '0 4px' }}
                                                    >
                                                      🌳
                                                    </Button>
                                                  </div>
                                                </div>
                                                
                                                {/* Opérateur */}
                                                <Select
                                                  size="small"
                                                  value={cond.operator || 'equals'}
                                                  style={{ width: 65 }}
                                                  onChange={(value) => {
                                                    updateLookupConfig((prev) => {
                                                      const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                      const newConds = [...(newFilters[index].multiplier?.conditions || [])];
                                                      newConds[condIdx] = { ...newConds[condIdx], operator: value };
                                                      newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, conditions: newConds } };
                                                      return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                    });
                                                  }}
                                                  disabled={readOnly}
                                                >
                                                  <Select.Option value="equals">=</Select.Option>
                                                  <Select.Option value="notEquals">≠</Select.Option>
                                                  <Select.Option value="greaterThan">&gt;</Select.Option>
                                                  <Select.Option value="lessThan">&lt;</Select.Option>
                                                  <Select.Option value="greaterOrEqual">≥</Select.Option>
                                                  <Select.Option value="lessOrEqual">≤</Select.Option>
                                                  <Select.Option value="contains">∋</Select.Option>
                                                </Select>

                                                {/* Champ B */}
                                                <div style={{ flex: 1 }}>
                                                  <div style={{ display: 'flex', gap: 2 }}>
                                                    <Input
                                                      size="small"
                                                      placeholder="Champ B ou valeur"
                                                      value={cond.fieldB || ''}
                                                      onChange={(e) => {
                                                        // Permettre la saisie libre (valeur littérale)
                                                        updateLookupConfig((prev) => {
                                                          const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                          const newConds = [...(newFilters[index].multiplier?.conditions || [])];
                                                          newConds[condIdx] = { ...newConds[condIdx], fieldB: e.target.value };
                                                          newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, conditions: newConds } };
                                                          return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                        });
                                                      }}
                                                      style={{ flex: 1, fontSize: 9 }}
                                                    />
                                                    <Button
                                                      size="small"
                                                      type="dashed"
                                                      onClick={() => {
                                                        setMultiplierConditionId(`cso_${index}_${condIdx}_B`);
                                                        setMultiplierSelectorTarget('B');
                                                        setShowMultiplierSelector(true);
                                                      }}
                                                      disabled={readOnly}
                                                      style={{ padding: '0 4px' }}
                                                    >
                                                      🌳
                                                    </Button>
                                                  </div>
                                                </div>

                                                {/* Supprimer cette condition */}
                                                {(filter.multiplier.conditions || []).length > 1 && (
                                                  <Button
                                                    size="small"
                                                    type="text"
                                                    danger
                                                    onClick={() => {
                                                      updateLookupConfig((prev) => {
                                                        const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                        const newConds = [...(newFilters[index].multiplier?.conditions || [])].filter((_, i) => i !== condIdx);
                                                        newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, conditions: newConds } };
                                                        return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                      });
                                                    }}
                                                    disabled={readOnly}
                                                    style={{ padding: '0 2px' }}
                                                  >
                                                    ✕
                                                  </Button>
                                                )}
                                              </div>
                                            ))}

                                            {/* Bouton ajouter condition */}
                                            <Button
                                              size="small"
                                              type="dashed"
                                              onClick={() => {
                                                updateLookupConfig((prev) => {
                                                  const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                  const newConds = [...(newFilters[index].multiplier?.conditions || []), { fieldA: '', operator: 'equals', fieldB: '' }];
                                                  newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, conditions: newConds } };
                                                  return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                });
                                              }}
                                              disabled={readOnly}
                                              style={{ fontSize: 10 }}
                                            >
                                              + Ajouter une condition ET
                                            </Button>

                                            {/* ALORS / SINON facteurs */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                              <div style={{ flex: 1 }}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                  ALORS {(filter.multiplier.mode || 'multiply') === 'multiply' ? '×' : '='} :
                                                </Text>
                                                <InputNumber
                                                  size="small"
                                                  min={0}
                                                  step={(filter.multiplier.mode || 'multiply') === 'fixed' ? 100 : 0.5}
                                                  value={filter.multiplier.factor ?? ((filter.multiplier.mode || 'multiply') === 'fixed' ? 10000 : 2)}
                                                  onChange={(value) => {
                                                    updateLookupConfig((prev) => {
                                                      const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                      newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, factor: value ?? 2 } };
                                                      return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                    });
                                                  }}
                                                  style={{ width: '100%', marginTop: 2 }}
                                                  disabled={readOnly}
                                                />
                                              </div>
                                              <div style={{ flex: 1 }}>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                  SINON {(filter.multiplier.mode || 'multiply') === 'multiply' ? '×' : '='} :
                                                </Text>
                                                <InputNumber
                                                  size="small"
                                                  min={0}
                                                  step={(filter.multiplier.mode || 'multiply') === 'fixed' ? 100 : 0.5}
                                                  value={filter.multiplier.elseFactor ?? ((filter.multiplier.mode || 'multiply') === 'fixed' ? 5000 : 1)}
                                                  onChange={(value) => {
                                                    updateLookupConfig((prev) => {
                                                      const newFilters = [...(prev.columnSourceOption?.filters || [])];
                                                      newFilters[index] = { ...newFilters[index], multiplier: { ...newFilters[index].multiplier, elseFactor: value ?? 1 } };
                                                      return { ...prev, columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters } };
                                                    });
                                                  }}
                                                  style={{ width: '100%', marginTop: 2 }}
                                                  disabled={readOnly}
                                                />
                                              </div>
                                            </div>

                                            {/* Preview de la règle */}
                                            <div style={{ 
                                              marginTop: 4, 
                                              padding: '4px 8px', 
                                              background: (filter.multiplier.mode || 'multiply') === 'fixed' ? '#f0f5ff' : '#fffbe6', 
                                              borderRadius: 4, 
                                              border: `1px solid ${(filter.multiplier.mode || 'multiply') === 'fixed' ? '#adc6ff' : '#ffe58f'}` 
                                            }}>
                                              <Text style={{ fontSize: 10, color: (filter.multiplier.mode || 'multiply') === 'fixed' ? '#1d39c4' : '#874d00' }}>
                                                {(filter.multiplier.mode || 'multiply') === 'fixed' ? '🎯' : '📐'} SI {(filter.multiplier.conditions || []).map((c: any, i: number) => 
                                                  `${i > 0 ? ' ET ' : ''}${c.fieldA || '?'} ${
                                                    c.operator === 'equals' ? '=' :
                                                    c.operator === 'notEquals' ? '≠' :
                                                    c.operator === 'greaterThan' ? '>' :
                                                    c.operator === 'lessThan' ? '<' :
                                                    c.operator === 'greaterOrEqual' ? '≥' :
                                                    c.operator === 'lessOrEqual' ? '≤' :
                                                    c.operator === 'contains' ? '∋' : '='
                                                  } ${c.fieldB || '?'}`
                                                ).join('')}
                                                {(filter.multiplier.mode || 'multiply') === 'fixed'
                                                  ? ` → valeur = ${filter.multiplier.factor ?? 10000} | sinon = ${filter.multiplier.elseFactor ?? 5000}`
                                                  : ` → valeur tableau × ${filter.multiplier.factor ?? 2} | sinon × ${filter.multiplier.elseFactor ?? 1}`
                                                }
                                              </Text>
                                            </div>
                                          </Space>
                                        )}
                                      </div>
                                    )}
                                  </Space>
                                </div>
                              ))}
                              
                              {(!lookupConfig.columnSourceOption?.filters || lookupConfig.columnSourceOption.filters.length === 0) && (
                                <div style={{ padding: 24, textAlign: 'center', background: '#fafafa', borderRadius: 6, border: '1px dashed #d9d9d9' }}>
                                  <Text type="secondary">Aucun filtre configuré. Cliquez sur "+ Ajouter un filtre" pour commencer.</Text>
                                </div>
                              )}
                            </Space>
                          </div>
                        </div>
                      )}
                      
                      {/* OPTION 2: CHAMP */}
                      {lookupConfig.columnSourceOption?.type === 'field' && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Champ dont on prend la valeur:
                          </Text>
                          <Select
                            size="small"
                            showSearch
                            placeholder={fieldsLoading ? 'Chargement...' : 'Sélectionner un champ'}
                            value={lookupConfig.columnSourceOption?.sourceField || undefined}
                            options={fieldSelectOptions}
                            optionRender={fieldOptionRender}
                            onChange={(value) => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                columnSourceOption: { ...(prev.columnSourceOption || {}), sourceField: value || null }
                              }));
                            }}
                            disabled={readOnly || fieldsLoading}
                            allowClear
                            optionFilterProp="label"
                            loading={fieldsLoading}
                            style={{ width: '100%' }}
                          />
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Sa valeur sera utilisée pour traiter la table
                          </Text>
                        </div>
                      )}
                      
                      {/* OPTION 3: CAPACITÉ */}
                      {lookupConfig.columnSourceOption?.type === 'capacity' && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Capacité à exécuter (formule/condition/table):
                          </Text>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1, padding: '8px 12px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {lookupConfig.columnSourceOption?.capacityRef ? `✓ ${lookupConfig.columnSourceOption.capacityRef}` : 'Aucune sélection'}
                              </Text>
                            </div>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => setShowCapacitySelectorColumn(true)}
                              disabled={readOnly}
                            >
                              Sélectionner
                            </Button>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Sa réponse sera utilisée pour traiter la table (PAS de champ sélectionné)
                          </Text>
                        </div>
                      )}
                    </div>

                    {/* 🔥 ÉTAPE 2.5: Sélection de la colonne de comparaison (pour CHAMP et CAPACITÉ) */}
                    {((lookupConfig.columnSourceOption?.type === 'field' && lookupConfig.columnSourceOption?.sourceField) ||
                      (lookupConfig.columnSourceOption?.type === 'capacity' && lookupConfig.columnSourceOption?.capacityRef)) && (
                      <div style={{ paddingTop: 12, borderTop: '1px solid #91d5ff', marginBottom: 12 }}>
                        <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                          📌 ÉTAPE 2.5: Colonne de la table à comparer
                        </Text>
                        <Text type="secondary" style={{ fontSize: 10, marginBottom: 8, display: 'block' }}>
                          Sélectionner la colonne de la table où chercher la valeur:
                        </Text>
                        <Select
                          size="small"
                          showSearch
                          placeholder="Sélectionner une colonne..."
                          value={lookupConfig.columnSourceOption?.comparisonColumn || undefined}
                          options={columnOptions}
                          onChange={(value) => {
                            updateLookupConfig((prev) => ({
                              ...prev,
                              columnSourceOption: { ...(prev.columnSourceOption || {}), comparisonColumn: value || null }
                            }));
                          }}
                          disabled={readOnly}
                          allowClear
                          optionFilterProp="label"
                          style={{ width: '100%' }}
                        />
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                          Ex: Si vous avez sélectionné le champ "Revenu net imposable", choisissez ici la colonne "Revenu" de la table
                        </Text>
                      </div>
                    )}

                    {/* ÉTAPE 3: Configuration du traitement (opérateur) */}
                    {((lookupConfig.columnSourceOption?.type === 'select' && lookupConfig.selectors?.columnFieldId) ||
                      (lookupConfig.columnSourceOption?.type === 'field' && lookupConfig.columnSourceOption?.sourceField) ||
                      (lookupConfig.columnSourceOption?.type === 'capacity' && lookupConfig.columnSourceOption?.capacityRef)) && (
                      <div style={{ paddingTop: 12, borderTop: '1px solid #91d5ff' }}>
                        <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                          📌 ÉTAPE 3: Configuration du traitement
                        </Text>
                        
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Source sélectionnée:
                          </Text>
                          <div style={{ padding: '8px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                            <Text strong style={{ fontSize: 12, color: '#0050b3' }}>
                              {lookupConfig.columnSourceOption?.type === 'select' && fieldOptions.find(f => f.value === lookupConfig.selectors?.columnFieldId)?.label}
                              {lookupConfig.columnSourceOption?.type === 'field' && fieldOptions.find(f => f.value === lookupConfig.columnSourceOption?.sourceField)?.label}
                              {lookupConfig.columnSourceOption?.type === 'capacity' && fieldOptions.find(f => f.value === lookupConfig.columnSourceOption?.capacityRef)?.label}
                            </Text>
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                            Opérateur à appliquer sur la source:
                          </Text>
                          <Space style={{ width: '100%', display: 'flex', flexWrap: 'wrap' }}>
                            {['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterOrEqual', 'lessOrEqual', 'plus', 'minus'].map((op) => {
                              const labels = {
                                equals: '= (égal)',
                                notEquals: '≠ (différent)',
                                greaterThan: '> (supérieur)',
                                lessThan: '< (inférieur)',
                                greaterOrEqual: '≥ (sup. ou égal)',
                                lessOrEqual: '≤ (inf. ou égal)',
                                plus: '+ (addition)',
                                minus: '- (soustraction)',
                              } as Record<string, string>;
                              return (
                                <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input
                                    type="radio"
                                    name="columnOperator"
                                    value={op}
                                    checked={lookupConfig.columnSourceOption?.operator === op || (!lookupConfig.columnSourceOption?.operator && op === 'equals')}
                                    onChange={() => {
                                      updateLookupConfig((prev) => ({
                                        ...prev,
                                        columnSourceOption: { ...(prev.columnSourceOption || {}), operator: op as any }
                                      }));
                                    }}
                                    disabled={readOnly}
                                  />
                                  <Text style={{ fontSize: 11, cursor: 'pointer' }}>{labels[op]}</Text>
                                </label>
                              );
                            })}
                          </Space>
                        </div>

                        {/* ÉTAPE 4: Colonnes à afficher */}
                        <div style={{ paddingTop: 12, borderTop: '1px solid #91d5ff' }}>
                          <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                            📌 ÉTAPE 4: Colonnes à afficher
                          </Text>
                          <Select
                            size="small"
                            mode="multiple"
                            placeholder="Sélectionner colonne(s)..."
                            value={normalizedDisplayColumns.normalized}
                            options={columnOptions}
                            allowClear
                            onChange={(values) => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                displayColumn: values
                              }));
                            }}
                            disabled={readOnly}
                            style={{ width: '100%', marginTop: 4 }}
                          />
                          <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block' }}>
                            Ex: Janvier, Février... (plusieurs possibles)
                          </Text>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}



                {/* Configuration LIGNE - visible uniquement si switch ON */}
                {lookupConfig.rowLookupEnabled && (
                <>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* ENCADRÉ PRINCIPAL: Sélection du type de source + configuration */}
                  <div style={{ padding: '12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
                    
                    {/* ÉTAPE 1: Choisir le type de source */}
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        📌 ÉTAPE 1: Sélectionner la source pour traiter la ligne
                      </Text>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="rowSourceType"
                            value="select"
                            checked={lookupConfig.rowSourceOption?.type === 'select' || !lookupConfig.rowSourceOption}
                            onChange={() => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                rowSourceOption: { ...(prev.rowSourceOption || {}), type: 'select', description: 'Ligne de la table' }
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <label style={{ cursor: 'pointer', flex: 1 }}>
                            <Text>1. SELECT - Un champ du formulaire devient liste déroulante</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 24 }}>
                              Sélectionner une ligne du tableau
                            </Text>
                          </label>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="rowSourceType"
                            value="field"
                            checked={lookupConfig.rowSourceOption?.type === 'field'}
                            onChange={() => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                rowSourceOption: { ...(prev.rowSourceOption || {}), type: 'field', description: 'Valeur du champ' }
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <label style={{ cursor: 'pointer', flex: 1 }}>
                            <Text>2. CHAMP - Utiliser la valeur du champ du formulaire</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 24 }}>
                              La valeur sera utilisée pour traiter la table
                            </Text>
                          </label>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="radio"
                            name="rowSourceType"
                            value="capacity"
                            checked={lookupConfig.rowSourceOption?.type === 'capacity'}
                            onChange={() => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                rowSourceOption: { ...(prev.rowSourceOption || {}), type: 'capacity', description: 'Réponse de la capacité' }
                              }));
                            }}
                            disabled={readOnly}
                          />
                          <label style={{ cursor: 'pointer', flex: 1 }}>
                            <Text>3. CAPACITÉ - Utiliser une capacité (formule/condition/table)</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginLeft: 24 }}>
                              La réponse sera utilisée pour traiter la table
                            </Text>
                          </label>
                        </div>
                      </Space>
                    </div>

                    {/* ÉTAPE 2: Sélectionner dans l'arborescence selon l'option choisie */}
                    <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #ffd591' }}>
                      <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        📌 ÉTAPE 2: Sélectionner dans l'arborescence
                      </Text>
                      
                      {/* OPTION 1: SELECT */}
                      {(!lookupConfig.rowSourceOption || lookupConfig.rowSourceOption.type === 'select') && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Champ ligne à transformer en liste:
                          </Text>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Select
                              size="small"
                              showSearch
                              placeholder={fieldsLoading ? 'Chargement...' : 'Sélectionner un champ'}
                              value={lookupConfig.selectors?.rowFieldId || undefined}
                              options={fieldSelectOptions}
                              optionRender={fieldOptionRender}
                              onChange={(value) => {
                                updateLookupConfig((prev) => ({
                                  ...prev,
                                  rowSourceOption: { ...(prev.rowSourceOption || {}), type: 'select', description: (prev.rowSourceOption as any)?.description || 'Ligne de la table' },
                                  selectors: { ...(prev.selectors || {}), rowFieldId: value || null },
                                }));

                                if (value && activeId) {
                                  (async () => {
                                    try {
                                      const updatedLookupConfig = {
                                        ...lookupConfig,
                                        enabled: true,
                                        columnLookupEnabled: lookupConfig.columnLookupEnabled ?? false,
                                        rowLookupEnabled: true,
                                        selectors: {
                                          ...lookupConfig.selectors,
                                          rowFieldId: value,
                                        },
                                      };
                                      
                                      const updatedCfg = {
                                        ...cfg,
                                        meta: {
                                          ...cfg.meta,
                                          lookup: updatedLookupConfig,
                                        },
                                      };
                                      setCfg(updatedCfg);
                                      await debouncedSave(updatedCfg);
                                      
                                      await updateTableCapability(value, {
                                        enabled: true,
                                        activeId,
                                        currentTable: {
                                          type: cfg.type,
                                          tableId: activeId,
                                          rowBased: true,
                                          columnBased: false,
                                          keyRow: lookupConfig.keyRow || null,
                                          valueRow: lookupConfig.valueRow || null,
                                          displayRow: lookupConfig.displayRow || null,
                                        },
                                      });
                                      message.success('Champ ligne activé !');
                                    } catch (error) {
                                      console.error('Erreur rowFieldId:', error);
                                    }
                                  })();
                                }
                              }}
                              disabled={readOnly || fieldsLoading}
                              allowClear
                              optionFilterProp="label"
                              loading={fieldsLoading}
                              style={{ flex: 1 }}
                            />
                            <Button
                              size="small"
                              type="dashed"
                              onClick={() => {
                                setCurrentRowSelectorType('select');
                                setShowRowTreeSelector(true);
                              }}
                              disabled={readOnly}
                            >
                              🌳 Arborescence
                            </Button>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Ce champ deviendra une liste déroulante avec les valeurs des lignes du tableau
                          </Text>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2, color: '#1890ff', fontWeight: 'bold' }}>
                            💡 Conseil: Vous pouvez sélectionner une <strong>branche</strong> (par ex: "Alimentation") et utiliser "📊 Réponse de la branche" pour récupérer directement la réponse quand l'utilisateur choisit une option !
                          </Text>
                        </div>
                      )}
                      
                      {/* OPTION 2: CHAMP */}
                      {lookupConfig.rowSourceOption?.type === 'field' && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Champ dont on prend la valeur:
                          </Text>
                          <Select
                            size="small"
                            showSearch
                            placeholder={fieldsLoading ? 'Chargement...' : 'Sélectionner un champ'}
                            value={lookupConfig.rowSourceOption?.sourceField || undefined}
                            options={fieldSelectOptions}
                            optionRender={fieldOptionRender}
                            onChange={(value) => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                rowSourceOption: { ...(prev.rowSourceOption || {}), sourceField: value || null }
                              }));
                            }}
                            disabled={readOnly || fieldsLoading}
                            allowClear
                            optionFilterProp="label"
                            loading={fieldsLoading}
                            style={{ width: '100%' }}
                          />
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Sa valeur sera utilisée pour traiter la table
                          </Text>
                        </div>
                      )}
                      
                      {/* OPTION 3: CAPACITÉ */}
                      {lookupConfig.rowSourceOption?.type === 'capacity' && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Capacité à exécuter (formule/condition/table):
                          </Text>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1, padding: '8px 12px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {lookupConfig.rowSourceOption?.capacityRef ? `✓ ${lookupConfig.rowSourceOption.capacityRef}` : 'Aucune sélection'}
                              </Text>
                            </div>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => setShowCapacitySelectorRow(true)}
                              disabled={readOnly}
                            >
                              Sélectionner
                            </Button>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Sa réponse sera utilisée pour traiter la table (PAS de champ sélectionné)
                          </Text>
                        </div>
                      )}
                    </div>

                    {/* 🔥 ÉTAPE 2.5: Sélection de la ligne de comparaison (pour CHAMP et CAPACITÉ) */}
                    {((lookupConfig.rowSourceOption?.type === 'field' && lookupConfig.rowSourceOption?.sourceField) ||
                      (lookupConfig.rowSourceOption?.type === 'capacity' && lookupConfig.rowSourceOption?.capacityRef)) && (
                      <div style={{ paddingTop: 12, borderTop: '1px solid #ffd591', marginBottom: 12 }}>
                        <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                          📌 ÉTAPE 2.5: Ligne de la table à comparer
                        </Text>
                        <Text type="secondary" style={{ fontSize: 10, marginBottom: 8, display: 'block' }}>
                          Sélectionner la ligne de la table où chercher la valeur:
                        </Text>
                        <Select
                          size="small"
                          showSearch
                          placeholder="Sélectionner une ligne..."
                          value={lookupConfig.rowSourceOption?.comparisonColumn || undefined}
                          options={rowOptions}
                          onChange={(value) => {
                            updateLookupConfig((prev) => ({
                              ...prev,
                              rowSourceOption: { ...(prev.rowSourceOption || {}), comparisonColumn: value || null }
                            }));
                          }}
                          disabled={readOnly}
                          allowClear
                          optionFilterProp="label"
                          style={{ width: '100%' }}
                        />
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                          Ex: Si vous avez sélectionné le champ "Revenu net imposable", choisissez ici la ligne "Revenu" de la table
                        </Text>
                      </div>
                    )}

                    {/* ÉTAPE 3: Configuration du traitement (opérateur) */}
                    {((lookupConfig.rowSourceOption?.type === 'select' && lookupConfig.selectors?.rowFieldId) ||
                      (lookupConfig.rowSourceOption?.type === 'field' && lookupConfig.rowSourceOption?.sourceField) ||
                      (lookupConfig.rowSourceOption?.type === 'capacity' && lookupConfig.rowSourceOption?.capacityRef)) && (
                      <div style={{ paddingTop: 12, borderTop: '1px solid #ffd591' }}>
                        <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                          📌 ÉTAPE 3: Configuration du traitement
                        </Text>
                        
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Source sélectionnée:
                          </Text>
                          <div style={{ padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                            <Text strong style={{ fontSize: 12, color: '#ad6800' }}>
                              {lookupConfig.rowSourceOption?.type === 'select' && fieldOptions.find(f => f.value === lookupConfig.selectors?.rowFieldId)?.label}
                              {lookupConfig.rowSourceOption?.type === 'field' && fieldOptions.find(f => f.value === lookupConfig.rowSourceOption?.sourceField)?.label}
                              {lookupConfig.rowSourceOption?.type === 'capacity' && fieldOptions.find(f => f.value === lookupConfig.rowSourceOption?.capacityRef)?.label}
                            </Text>
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                            Opérateur à appliquer sur la source:
                          </Text>
                          <Space style={{ width: '100%', display: 'flex', flexWrap: 'wrap' }}>
                            {['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterOrEqual', 'lessOrEqual', 'plus', 'minus'].map((op) => {
                              const labels = {
                                equals: '= (égal)',
                                notEquals: '≠ (différent)',
                                greaterThan: '> (supérieur)',
                                lessThan: '< (inférieur)',
                                greaterOrEqual: '≥ (sup. ou égal)',
                                lessOrEqual: '≤ (inf. ou égal)',
                                plus: '+ (addition)',
                                minus: '- (soustraction)',
                              } as Record<string, string>;
                              return (
                                <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input
                                    type="radio"
                                    name="rowOperator"
                                    value={op}
                                    checked={lookupConfig.rowSourceOption?.operator === op || (!lookupConfig.rowSourceOption?.operator && op === 'equals')}
                                    onChange={() => {
                                      updateLookupConfig((prev) => ({
                                        ...prev,
                                        rowSourceOption: { ...(prev.rowSourceOption || {}), operator: op as any }
                                      }));
                                    }}
                                    disabled={readOnly}
                                  />
                                  <Text style={{ fontSize: 11, cursor: 'pointer' }}>{labels[op]}</Text>
                                </label>
                              );
                            })}
                          </Space>
                        </div>

                        {/* ÉTAPE 4: Lignes à afficher */}
                        <div style={{ paddingTop: 12, borderTop: '1px solid #ffd591' }}>
                          <Text type="secondary" strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                            📌 ÉTAPE 4: Lignes à afficher
                          </Text>
                          <Select
                            size="small"
                            mode="multiple"
                            placeholder="Sélectionner ligne(s)..."
                            value={Array.isArray(lookupConfig.displayRow) ? lookupConfig.displayRow : (lookupConfig.displayRow ? [lookupConfig.displayRow] : [])}
                            options={rowOptions}
                            allowClear
                            onChange={(values) => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                displayRow: values
                              }));
                            }}
                            disabled={readOnly}
                            style={{ width: '100%', marginTop: 4 }}
                          />
                          <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block' }}>
                            Ex: Ventes, Coûts... (plusieurs possibles)
                          </Text>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </>
                )}

                {/* Apercu global */}
                {(lookupConfig.keyColumn || lookupConfig.keyRow) && (
                  <div style={{ padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px', marginTop: 12 }}>
                    <Text strong style={{ color: '#52c41a' }}>Resume</Text>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      {lookupConfig.keyColumn && (
                        <div>Colonne "{lookupConfig.keyColumn}" {lookupConfig.displayColumn && `→ ${lookupConfig.displayColumn}`}</div>
                      )}
                      {lookupConfig.keyRow && (
                        <div>Ligne "{lookupConfig.keyRow}" {lookupConfig.displayRow && `→ ${lookupConfig.displayRow}`}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 🔥 NOUVEAU: Section filtrage par lookup */}
                {(lookupConfig.columnLookupEnabled || lookupConfig.rowLookupEnabled) && (
                  <div style={{ padding: '12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <FilterOutlined style={{ color: '#fa8c16' }} />
                      <Text strong style={{ fontSize: 13, color: '#fa8c16' }}>Filtrage pour ce lookup</Text>
                      <Switch
                        size="small"
                        checked={lookupConfig.filterConditions?.enabled === true}
                        onChange={(checked) => {
                          updateLookupConfig((prev) => ({
                            ...prev,
                            filterConditions: {
                              ...prev.filterConditions,
                              enabled: checked,
                              conditions: prev.filterConditions?.conditions || [],
                              filterLogic: prev.filterConditions?.filterLogic || 'AND'
                            }
                          }));
                        }}
                        disabled={readOnly}
                      />
                      <Tooltip title={`Filtrer les options ${lookupConfig.keyColumn ? 'de colonnes' : 'de lignes'} selon des conditions`}>
                        <InfoCircleOutlined style={{ color: '#999' }} />
                      </Tooltip>
                    </div>

                    {lookupConfig.filterConditions?.enabled && (
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Logique de combinaison:</Text>
                            <Select
                              size="small"
                              value={lookupConfig.filterConditions?.filterLogic || 'AND'}
                              style={{ width: 80 }}
                              onChange={(value) => {
                                updateLookupConfig((prev) => ({
                                  ...prev,
                                  filterConditions: {
                                    ...prev.filterConditions,
                                    filterLogic: value
                                  }
                                }));
                              }}
                              disabled={readOnly}
                            >
                              <Select.Option value="AND">ET</Select.Option>
                              <Select.Option value="OR">OU</Select.Option>
                            </Select>
                          </div>
                          <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={addFilterCondition}
                            disabled={readOnly}
                          >
                            Ajouter condition
                          </Button>
                        </div>

                        {/* Liste des conditions */}
                        {(lookupConfig.filterConditions?.conditions || []).map((condition, index) => (
                          <div
                            key={condition.id}
                            style={{ 
                              padding: '12px', 
                              background: '#fafafa', 
                              border: '1px solid #d9d9d9', 
                              borderRadius: '4px' 
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Text strong style={{ fontSize: 12 }}>Condition {index + 1}</Text>
                              <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => removeFilterCondition(condition.id)}
                                disabled={readOnly}
                                danger
                              />
                            </div>
                            
                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                              {/* Filtrage par colonne */}
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Filtrer par colonne:</Text>
                                <Select
                                  size="small"
                                  placeholder="Choisir une colonne (optionnel)"
                                  value={condition.filterByColumn}
                                  onChange={(value) => updateFilterCondition(condition.id, { filterByColumn: value })}
                                  style={{ width: '100%', marginTop: 2 }}
                                  disabled={readOnly}
                                  allowClear
                                >
                                  {(cfg.columns || []).slice(1).map(column => (
                                    <Select.Option key={column} value={column}>
                                      📊 {column}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>

                              {/* Filtrage par ligne */}
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Filtrer par ligne:</Text>
                                <Select
                                  size="small"
                                  placeholder="Choisir une ligne (optionnel)"
                                  value={condition.filterByRow}
                                  onChange={(value) => updateFilterCondition(condition.id, { filterByRow: value })}
                                  style={{ width: '100%', marginTop: 2 }}
                                  disabled={readOnly}
                                  allowClear
                                >
                                  {(cfg.rows || []).slice(1).map((row, index) => (
                                    <Select.Option key={row} value={row}>
                                      📋 Ligne {index + 1} ({String(row).substring(0, 20)}{String(row).length > 20 ? '...' : ''})
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>

                              {/* Opérateur de comparaison */}
                              <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Opérateur:</Text>
                                  <Select
                                    size="small"
                                    value={condition.operator}
                                    style={{ width: '100%', marginTop: 2 }}
                                    onChange={(value) => updateFilterCondition(condition.id, { operator: value })}
                                    disabled={readOnly}
                                  >
                                    <Select.Option value="equals">= (égal)</Select.Option>
                                    <Select.Option value="notEquals">≠ (différent)</Select.Option>
                                    <Select.Option value="greaterThan">&gt; (supérieur)</Select.Option>
                                    <Select.Option value="lessThan">&lt; (inférieur)</Select.Option>
                                    <Select.Option value="greaterOrEqual">≥ (sup. ou égal)</Select.Option>
                                    <Select.Option value="lessOrEqual">≤ (inf. ou égal)</Select.Option>
                                    <Select.Option value="contains">contient</Select.Option>
                                    <Select.Option value="notContains">ne contient pas</Select.Option>
                                  </Select>
                                </div>

                                <div style={{ flex: 1 }}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Comparer avec (valeur de l'arborescence ou saisie libre):</Text>
                                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                    <Input
                                      size="small"
                                      placeholder="Tapez une valeur ou sélectionnez 🌳"
                                      value={condition.compareWithRef}
                                      onChange={(e) => updateFilterCondition(condition.id, { compareWithRef: e.target.value })}
                                      style={{ flex: 1 }}
                                      disabled={readOnly}
                                    />
                                    <Button
                                      size="small"
                                      type="dashed"
                                      onClick={() => openNodeTreeSelector(condition.id)}
                                      disabled={readOnly}
                                    >
                                      🌳 Sélectionner
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Description optionnelle */}
                              {condition.description && (
                                <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic' }}>
                                  {condition.description}
                                </Text>
                              )}

                              {/* ✨ Multiplicateur conditionnel */}
                              <div style={{ 
                                marginTop: 4,
                                padding: '8px', 
                                background: condition.multiplier?.enabled ? '#fff7e6' : '#fafafa', 
                                border: `1px ${condition.multiplier?.enabled ? 'solid #faad14' : 'dashed #d9d9d9'}`, 
                                borderRadius: '4px' 
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: condition.multiplier?.enabled ? 8 : 0 }}>
                                  <Switch
                                    size="small"
                                    checked={condition.multiplier?.enabled || false}
                                    onChange={(checked) => updateFilterCondition(condition.id, {
                                      multiplier: {
                                        ...(condition.multiplier || {}),
                                        enabled: checked,
                                        factor: condition.multiplier?.factor ?? 2,
                                        elseFactor: condition.multiplier?.elseFactor ?? 1,
                                        conditionOperator: condition.multiplier?.conditionOperator ?? 'equals'
                                      }
                                    })}
                                    disabled={readOnly}
                                  />
                                  <Text style={{ fontSize: 11, fontWeight: 500 }}>
                                    ✖️ Multiplicateur conditionnel
                                  </Text>
                                  {condition.multiplier?.enabled && (
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                      (multiplie la valeur du tableau avant comparaison)
                                    </Text>
                                  )}
                                </div>

                                {condition.multiplier?.enabled && (
                                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                    {/* Condition: SI champ A [opérateur] champ B */}
                                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                                      SI :
                                    </Text>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                      {/* Champ A */}
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <Input
                                            size="small"
                                            placeholder="Champ A"
                                            value={condition.multiplier.conditionFieldA || ''}
                                            readOnly
                                            style={{ flex: 1, fontSize: 10 }}
                                          />
                                          <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => openMultiplierSelector(condition.id, 'A')}
                                            disabled={readOnly}
                                          >
                                            🌳
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {/* Opérateur */}
                                      <Select
                                        size="small"
                                        value={condition.multiplier.conditionOperator || 'equals'}
                                        style={{ width: 70 }}
                                        onChange={(value) => updateFilterCondition(condition.id, {
                                          multiplier: { ...condition.multiplier, conditionOperator: value }
                                        })}
                                        disabled={readOnly}
                                      >
                                        <Select.Option value="equals">=</Select.Option>
                                        <Select.Option value="notEquals">≠</Select.Option>
                                        <Select.Option value="greaterThan">&gt;</Select.Option>
                                        <Select.Option value="lessThan">&lt;</Select.Option>
                                        <Select.Option value="greaterOrEqual">≥</Select.Option>
                                        <Select.Option value="lessOrEqual">≤</Select.Option>
                                      </Select>

                                      {/* Champ B */}
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <Input
                                            size="small"
                                            placeholder="Champ B"
                                            value={condition.multiplier.conditionFieldB || ''}
                                            readOnly
                                            style={{ flex: 1, fontSize: 10 }}
                                          />
                                          <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => openMultiplierSelector(condition.id, 'B')}
                                            disabled={readOnly}
                                          >
                                            🌳
                                          </Button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* ALORS / SINON facteurs */}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                      <div style={{ flex: 1 }}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>ALORS × :</Text>
                                        <InputNumber
                                          size="small"
                                          min={0}
                                          step={0.5}
                                          value={condition.multiplier.factor ?? 2}
                                          onChange={(value) => updateFilterCondition(condition.id, {
                                            multiplier: { ...condition.multiplier, factor: value ?? 2 }
                                          })}
                                          style={{ width: '100%', marginTop: 2 }}
                                          disabled={readOnly}
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>SINON × :</Text>
                                        <InputNumber
                                          size="small"
                                          min={0}
                                          step={0.5}
                                          value={condition.multiplier.elseFactor ?? 1}
                                          onChange={(value) => updateFilterCondition(condition.id, {
                                            multiplier: { ...condition.multiplier, elseFactor: value ?? 1 }
                                          })}
                                          style={{ width: '100%', marginTop: 2 }}
                                          disabled={readOnly}
                                        />
                                      </div>
                                    </div>

                                    {/* Preview de la règle */}
                                    <div style={{ 
                                      marginTop: 4, 
                                      padding: '4px 8px', 
                                      background: '#fffbe6', 
                                      borderRadius: 4, 
                                      border: '1px solid #ffe58f' 
                                    }}>
                                      <Text style={{ fontSize: 10, color: '#874d00' }}>
                                        📐 SI {condition.multiplier.conditionFieldA || '?'} {
                                          condition.multiplier.conditionOperator === 'equals' ? '=' :
                                          condition.multiplier.conditionOperator === 'notEquals' ? '≠' :
                                          condition.multiplier.conditionOperator === 'greaterThan' ? '>' :
                                          condition.multiplier.conditionOperator === 'lessThan' ? '<' :
                                          condition.multiplier.conditionOperator === 'greaterOrEqual' ? '≥' :
                                          condition.multiplier.conditionOperator === 'lessOrEqual' ? '≤' : '='
                                        } {condition.multiplier.conditionFieldB || '?'}
                                        {' → '}valeur tableau × {condition.multiplier.factor ?? 2}
                                        {' | sinon '}× {condition.multiplier.elseFactor ?? 1}
                                      </Text>
                                    </div>
                                  </Space>
                                )}
                              </div>
                            </Space>
                          </div>
                        ))}

                        {(lookupConfig.filterConditions?.conditions || []).length === 0 && (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            <Text type="secondary">Aucune condition de filtrage configurée</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Cliquez sur "Ajouter condition" pour filtrer les options selon d'autres champs
                            </Text>
                          </div>
                        )}
                      </Space>
                    )}  
                  </div>
                )}

                {/* ✨ ULTRA-NOUVEAU: Section filtrage temps réel */}
                {lookupConfig.filterConditions?.enabled && lookupConfig.filterConditions?.conditions?.length > 0 && (
                  <div style={{ 
                    marginTop: 16, 
                    padding: '16px', 
                    background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)', 
                    border: '2px solid #52c41a', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(82, 196, 26, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <ThunderboltOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                      <Text strong style={{ fontSize: 15, color: '#52c41a' }}>🚀 Filtrage Temps Réel</Text>
                      {filterResults && (
                        <div style={{ 
                          background: filterResults.conditions.every(c => c.result) ? '#f6ffed' : '#fff2e8',
                          color: filterResults.conditions.every(c => c.result) ? '#52c41a' : '#fa8c16',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: 10,
                          fontWeight: 'bold',
                          border: `1px solid ${filterResults.conditions.every(c => c.result) ? '#b7eb8f' : '#ffd591'}`
                        }}>
                          {filterResults.conditions.every(c => c.result) ? '✅ TOUTES OK' : '⚠️ PARTIELLES'}
                        </div>
                      )}
                      <Switch
                        size="small"
                        checked={realtimePreview}
                        onChange={setRealtimePreview}
                        checkedChildren="ON"
                        unCheckedChildren="OFF"
                      />
                      <Button
                        type="primary" 
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => {
                          evaluateFilterConditionsRealtime();
                          message.success('🎯 Évaluation lancée !', 1);
                        }}
                        loading={evaluationLoading}
                        style={{ marginLeft: 'auto' }}
                      >
                        Évaluer maintenant
                      </Button>
                      <Tooltip title="Copier la configuration de filtrage">
                        <Button
                          size="small"
                          icon={<InfoCircleOutlined />}
                          onClick={() => {
                            const config = JSON.stringify(lookupConfig.filterConditions, null, 2);
                            navigator.clipboard?.writeText(config);
                            message.success('📋 Configuration copiée !', 1.5);
                          }}
                        />
                      </Tooltip>
                    </div>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Card size="small" style={{ 
                          background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)', 
                          border: '1px solid #d9f7be',
                          boxShadow: '0 2px 8px rgba(82, 196, 26, 0.1)'
                        }}>
                          <Statistic
                            title={
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                Options disponibles
                              </span>
                            }
                            value={filterResults?.filteredOptions || 0}
                            suffix={`/ ${filterResults?.totalOptions || 0}`}
                            valueStyle={{ 
                              color: filterResults && filterResults.filteredOptions > 0 ? '#52c41a' : '#ff4d4f', 
                              fontSize: 20,
                              fontWeight: 'bold'
                            }}
                          />
                          {filterResults && (
                            <div>
                              <Progress
                                percent={Math.round((filterResults.filteredOptions / filterResults.totalOptions) * 100)}
                                size="small"
                                strokeColor={{
                                  '0%': '#52c41a',
                                  '100%': '#389e0d'
                                }}
                                trailColor="#f0f0f0"
                                style={{ marginTop: 8 }}
                              />
                              <Text style={{ 
                                fontSize: 10, 
                                color: '#666', 
                                marginTop: 4,
                                display: 'block'
                              }}>
                                {filterResults.filteredOptions === 0 ? '🚫 Aucune option' : 
                                 filterResults.filteredOptions === filterResults.totalOptions ? '✨ Toutes visibles' :
                                 '🎯 Filtrage actif'}
                              </Text>
                            </div>
                          )}
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" style={{ background: '#fff', border: '1px solid #d9f7be' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <BulbOutlined style={{ color: '#fa8c16' }} />
                            <Text strong style={{ fontSize: 13 }}>Mode Test</Text>
                            <Switch
                              size="small"
                              checked={testMode}
                              onChange={setTestMode}
                              checkedChildren="✓"
                              unCheckedChildren="✗"
                            />
                          </div>
                          {testMode && (
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              {lookupConfig.filterConditions?.conditions?.map(condition => (
                                <div key={condition.id} style={{ display: 'flex', gap: 4 }}>
                                  <Text style={{ fontSize: 11, minWidth: 60 }}>{condition.sourceRef?.split(':').pop() || 'Source'}:</Text>
                                  <Input
                                    size="small"
                                    placeholder="Valeur test"
                                    value={testValues[condition.sourceRef] || ''}
                                    onChange={(e) => setTestValues(prev => ({ ...prev, [condition.sourceRef]: e.target.value }))}
                                    style={{ flex: 1 }}
                                  />
                                </div>
                              ))}
                            </Space>
                          )}
                        </Card>
                      </Col>
                    </Row>

                    {/* Résultats des conditions */}
                    {filterResults && (
                      <div style={{ marginTop: 16 }}>
                        <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>🎯 Évaluation des conditions:</Text>
                        <Timeline
                          size="small"
                          items={filterResults.conditions.map(cond => ({
                            dot: cond.result ? 
                              <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
                            children: (
                              <Text style={{ 
                                fontSize: 12, 
                                color: cond.result ? '#52c41a' : '#ff4d4f',
                                fontFamily: 'monospace'
                              }}>
                                {cond.description}
                              </Text>
                            )
                          }))}
                        />
                      </div>
                    )}

                    {evaluationLoading && (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin size="small" />
                        <Text style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>Évaluation en cours...</Text>
                      </div>
                    )}

                    {/* 🎯 SECTION HELP CONTEXTUELLE */}
                    {!filterResults && !evaluationLoading && (
                      <div style={{ 
                        marginTop: 16, 
                        padding: '12px', 
                        background: '#f0f9ff', 
                        border: '1px dashed #1890ff', 
                        borderRadius: '6px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <BulbOutlined style={{ color: '#1890ff' }} />
                          <Text strong style={{ color: '#1890ff', fontSize: 12 }}>💡 Aide</Text>
                        </div>
                        <Text style={{ fontSize: 11, color: '#666' }}>
                          • <strong>Temps réel ON</strong> : Évaluation automatique à chaque modification<br/>
                          • <strong>Mode Test</strong> : Simulez différentes valeurs pour tester vos conditions<br/>
                          • <strong>Évaluer maintenant</strong> : Lance une évaluation manuelle instantanée
                        </Text>
                      </div>
                    )}

                    {/* 🏆 SECTION PERFORMANCE TIPS */}
                    {filterResults && filterResults.filteredOptions < filterResults.totalOptions * 0.1 && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: '8px 12px', 
                        background: '#fff7e6', 
                        border: '1px solid #ffd591', 
                        borderRadius: '4px' 
                      }}>
                        <Text style={{ fontSize: 11, color: '#d48806' }}>
                          ⚡ <strong>Filtrage très sélectif</strong> : Seulement {Math.round((filterResults.filteredOptions / filterResults.totalOptions) * 100)}% des options sont affichées
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* 🔄📏⚠️ Extensions du Lookup — Intégrées dans filterConditions  */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {lookupConfig.filterConditions?.enabled && (lookupConfig.columnLookupEnabled || lookupConfig.rowLookupEnabled) && (
                  <div style={{ 
                    padding: '16px', 
                    background: 'linear-gradient(135deg, #f9f0ff 0%, #f0f5ff 100%)', 
                    border: '2px solid #722ed1', 
                    borderRadius: '8px', 
                    marginTop: 12 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Text strong style={{ fontSize: 14, color: '#722ed1' }}>🔧 Extensions du Lookup</Text>
                      <Tooltip title="Ces fonctionnalités font partie du pipeline de lookup : changement de colonne, plafonds de valeur et alertes. Elles s'appliquent directement sur les résultats du lookup.">
                        <InfoCircleOutlined style={{ color: '#999' }} />
                      </Tooltip>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }} size={16}>

                      {/* ── SECTION 1: Colonne Conditionnelle ─── */}
                      <div style={{ 
                        padding: '12px', 
                        background: '#fff', 
                        border: '1px solid #d3adf7', 
                        borderRadius: '6px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 13, color: '#722ed1' }}>🔄 Colonne Conditionnelle</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            (Change dynamiquement la colonne du lookup selon les conditions)
                          </Text>
                        </div>

                        {/* Colonne par défaut */}
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                            📌 Colonne par défaut (utilisée si aucune règle ne match):
                          </Text>
                          <Select
                            size="small"
                            placeholder="Sélectionner la colonne par défaut"
                            value={lookupConfig.filterConditions?.defaultColumn || undefined}
                            options={(cfg.columns || []).map(col => ({ label: col, value: col }))}
                            onChange={(value) => {
                              updateLookupConfig((prev) => ({
                                ...prev,
                                filterConditions: { ...(prev.filterConditions || {}), defaultColumn: value }
                              }));
                            }}
                            disabled={readOnly}
                            style={{ width: '100%' }}
                            allowClear
                          />
                        </div>

                        {/* Liste des règles de switch colonne */}
                        {(lookupConfig.filterConditions?.columnOverrides || []).map((rule, ruleIdx) => (
                          <div key={rule.id} style={{ 
                            padding: '10px', 
                            background: '#faf5ff', 
                            border: '1px solid #e8d5f5', 
                            borderRadius: '4px', 
                            marginBottom: 8 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: 600, color: '#531dab' }}>
                                Règle {ruleIdx + 1}: {rule.label || 'Sans nom'}
                              </Text>
                              <Button 
                                size="small" type="text" danger
                                onClick={() => {
                                  updateLookupConfig((prev) => ({
                                    ...prev,
                                    filterConditions: {
                                      ...(prev.filterConditions || {}),
                                      columnOverrides: (prev.filterConditions?.columnOverrides || []).filter((_, i) => i !== ruleIdx)
                                    }
                                  }));
                                }}
                                disabled={readOnly}
                              >✕</Button>
                            </div>

                            <Input
                              size="small"
                              placeholder="Nom de la règle (ex: Triphasé → kVA triphasé)"
                              value={rule.label || ''}
                              onChange={(e) => {
                                updateLookupConfig((prev) => {
                                  const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                  rules[ruleIdx] = { ...rules[ruleIdx], label: e.target.value };
                                  return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                });
                              }}
                              style={{ marginBottom: 8, fontSize: 11 }}
                              disabled={readOnly}
                            />

                            {/* Conditions */}
                            {(rule.conditions || []).map((cond, condIdx) => (
                              <div key={condIdx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 10, minWidth: 16 }}>{condIdx === 0 ? 'SI' : 'ET'}</Text>
                                <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                                  <Input
                                    size="small"
                                    placeholder="Champ (ex: @select.alimentation)"
                                    value={cond.fieldRef || ''}
                                    onChange={(e) => {
                                      updateLookupConfig((prev) => {
                                        const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                        const conds = [...(rules[ruleIdx]?.conditions || [])];
                                        conds[condIdx] = { ...conds[condIdx], fieldRef: e.target.value };
                                        rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                        return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                      });
                                    }}
                                    style={{ flex: 1, fontSize: 9 }}
                                    disabled={readOnly}
                                  />
                                  <Button
                                    size="small" type="dashed"
                                    onClick={() => {
                                      setMultiplierConditionId(`lk_co_${ruleIdx}_${condIdx}_fieldRef`);
                                      setMultiplierSelectorTarget('A');
                                      setShowMultiplierSelector(true);
                                    }}
                                    disabled={readOnly}
                                    style={{ padding: '0 4px' }}
                                  >🌳</Button>
                                </div>
                                <Select
                                  size="small"
                                  value={cond.operator || 'equals'}
                                  style={{ width: 65 }}
                                  onChange={(value) => {
                                    updateLookupConfig((prev) => {
                                      const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                      const conds = [...(rules[ruleIdx]?.conditions || [])];
                                      conds[condIdx] = { ...conds[condIdx], operator: value };
                                      rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                      return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                    });
                                  }}
                                  disabled={readOnly}
                                >
                                  <Select.Option value="equals">=</Select.Option>
                                  <Select.Option value="notEquals">≠</Select.Option>
                                  <Select.Option value="contains">∋</Select.Option>
                                  <Select.Option value="greaterThan">&gt;</Select.Option>
                                  <Select.Option value="lessThan">&lt;</Select.Option>
                                </Select>
                                <Input
                                  size="small"
                                  placeholder="Valeur (ex: Triphasé)"
                                  value={cond.value || ''}
                                  onChange={(e) => {
                                    updateLookupConfig((prev) => {
                                      const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                      const conds = [...(rules[ruleIdx]?.conditions || [])];
                                      conds[condIdx] = { ...conds[condIdx], value: e.target.value };
                                      rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                      return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                    });
                                  }}
                                  style={{ flex: 1, fontSize: 9 }}
                                  disabled={readOnly}
                                />
                                {(rule.conditions || []).length > 1 && (
                                  <Button
                                    size="small" type="text" danger
                                    onClick={() => {
                                      updateLookupConfig((prev) => {
                                        const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                        const conds = [...(rules[ruleIdx]?.conditions || [])].filter((_, i) => i !== condIdx);
                                        rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                        return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                      });
                                    }}
                                    disabled={readOnly}
                                    style={{ padding: '0 2px' }}
                                  >✕</Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="small" type="dashed"
                              onClick={() => {
                                updateLookupConfig((prev) => {
                                  const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                  const conds = [...(rules[ruleIdx]?.conditions || []), { fieldRef: '', operator: 'equals' as const, value: '' }];
                                  rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                  return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                });
                              }}
                              disabled={readOnly}
                              style={{ fontSize: 10, marginBottom: 8 }}
                            >+ Condition ET</Button>

                            {/* Colonne cible */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, fontWeight: 600, color: '#52c41a' }}>ALORS utiliser colonne:</Text>
                              <Select
                                size="small"
                                placeholder="Colonne cible"
                                value={rule.targetColumn || undefined}
                                options={(cfg.columns || []).map(col => ({ label: col, value: col }))}
                                onChange={(value) => {
                                  updateLookupConfig((prev) => {
                                    const rules = [...(prev.filterConditions?.columnOverrides || [])];
                                    rules[ruleIdx] = { ...rules[ruleIdx], targetColumn: value };
                                    return { ...prev, filterConditions: { ...(prev.filterConditions || {}), columnOverrides: rules } };
                                  });
                                }}
                                disabled={readOnly}
                                style={{ flex: 1 }}
                              />
                            </div>
                          </div>
                        ))}

                        <Button
                          size="small" type="dashed" block
                          onClick={() => {
                            updateLookupConfig((prev) => ({
                              ...prev,
                              filterConditions: {
                                ...(prev.filterConditions || {}),
                                columnOverrides: [
                                  ...(prev.filterConditions?.columnOverrides || []),
                                  { id: crypto.randomUUID(), enabled: true, label: '', conditions: [{ fieldRef: '', operator: 'equals' as const, value: '' }], targetColumn: '' }
                                ]
                              }
                            }));
                          }}
                          disabled={readOnly}
                          style={{ marginTop: 4 }}
                        >
                          + Ajouter une règle de colonne conditionnelle
                        </Button>
                      </div>

                      {/* ── SECTION 2: Plafonds de Valeur ─── */}
                      <div style={{ 
                        padding: '12px', 
                        background: '#fff', 
                        border: '1px solid #ffd591', 
                        borderRadius: '6px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 13, color: '#d48806' }}>📏 Plafonds de Valeur</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            (Limite la valeur max du lookup selon les conditions)
                          </Text>
                        </div>

                        {(lookupConfig.filterConditions?.valueCaps || []).map((rule, ruleIdx) => (
                          <div key={rule.id} style={{ 
                            padding: '10px', 
                            background: '#fffbe6', 
                            border: '1px solid #ffe58f', 
                            borderRadius: '4px', 
                            marginBottom: 8 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: 600, color: '#d48806' }}>
                                Plafond {ruleIdx + 1}: {rule.label || 'Sans nom'}
                              </Text>
                              <Button 
                                size="small" type="text" danger
                                onClick={() => {
                                  updateLookupConfig((prev) => ({
                                    ...prev,
                                    filterConditions: {
                                      ...(prev.filterConditions || {}),
                                      valueCaps: (prev.filterConditions?.valueCaps || []).filter((_, i) => i !== ruleIdx)
                                    }
                                  }));
                                }}
                                disabled={readOnly}
                              >✕</Button>
                            </div>

                            <Input
                              size="small"
                              placeholder="Nom (ex: Max 5000 mono non-RESA)"
                              value={rule.label || ''}
                              onChange={(e) => {
                                updateLookupConfig((prev) => {
                                  const rules = [...(prev.filterConditions?.valueCaps || [])];
                                  rules[ruleIdx] = { ...rules[ruleIdx], label: e.target.value };
                                  return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                });
                              }}
                              style={{ marginBottom: 8, fontSize: 11 }}
                              disabled={readOnly}
                            />

                            {/* Conditions */}
                            {(rule.conditions || []).map((cond, condIdx) => (
                              <div key={condIdx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 10, minWidth: 16 }}>{condIdx === 0 ? 'SI' : 'ET'}</Text>
                                <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                                  <Input
                                    size="small"
                                    placeholder="Champ"
                                    value={cond.fieldRef || ''}
                                    onChange={(e) => {
                                      updateLookupConfig((prev) => {
                                        const rules = [...(prev.filterConditions?.valueCaps || [])];
                                        const conds = [...(rules[ruleIdx]?.conditions || [])];
                                        conds[condIdx] = { ...conds[condIdx], fieldRef: e.target.value };
                                        rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                        return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                      });
                                    }}
                                    style={{ flex: 1, fontSize: 9 }}
                                    disabled={readOnly}
                                  />
                                  <Button
                                    size="small" type="dashed"
                                    onClick={() => {
                                      setMultiplierConditionId(`lk_vc_${ruleIdx}_${condIdx}_fieldRef`);
                                      setMultiplierSelectorTarget('A');
                                      setShowMultiplierSelector(true);
                                    }}
                                    disabled={readOnly}
                                    style={{ padding: '0 4px' }}
                                  >🌳</Button>
                                </div>
                                <Select
                                  size="small"
                                  value={cond.operator || 'equals'}
                                  style={{ width: 65 }}
                                  onChange={(value) => {
                                    updateLookupConfig((prev) => {
                                      const rules = [...(prev.filterConditions?.valueCaps || [])];
                                      const conds = [...(rules[ruleIdx]?.conditions || [])];
                                      conds[condIdx] = { ...conds[condIdx], operator: value };
                                      rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                      return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                    });
                                  }}
                                  disabled={readOnly}
                                >
                                  <Select.Option value="equals">=</Select.Option>
                                  <Select.Option value="notEquals">≠</Select.Option>
                                  <Select.Option value="contains">∋</Select.Option>
                                  <Select.Option value="greaterThan">&gt;</Select.Option>
                                  <Select.Option value="lessThan">&lt;</Select.Option>
                                </Select>
                                <Input
                                  size="small"
                                  placeholder="Valeur"
                                  value={cond.value || ''}
                                  onChange={(e) => {
                                    updateLookupConfig((prev) => {
                                      const rules = [...(prev.filterConditions?.valueCaps || [])];
                                      const conds = [...(rules[ruleIdx]?.conditions || [])];
                                      conds[condIdx] = { ...conds[condIdx], value: e.target.value };
                                      rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                      return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                    });
                                  }}
                                  style={{ flex: 1, fontSize: 9 }}
                                  disabled={readOnly}
                                />
                                {(rule.conditions || []).length > 1 && (
                                  <Button
                                    size="small" type="text" danger
                                    onClick={() => {
                                      updateLookupConfig((prev) => {
                                        const rules = [...(prev.filterConditions?.valueCaps || [])];
                                        const conds = [...(rules[ruleIdx]?.conditions || [])].filter((_, i) => i !== condIdx);
                                        rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                        return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                      });
                                    }}
                                    disabled={readOnly}
                                    style={{ padding: '0 2px' }}
                                  >✕</Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="small" type="dashed"
                              onClick={() => {
                                updateLookupConfig((prev) => {
                                  const rules = [...(prev.filterConditions?.valueCaps || [])];
                                  const conds = [...(rules[ruleIdx]?.conditions || []), { fieldRef: '', operator: 'equals' as const, value: '' }];
                                  rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                  return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                });
                              }}
                              disabled={readOnly}
                              style={{ fontSize: 10, marginBottom: 8 }}
                            >+ Condition ET</Button>

                            {/* Plafond et scope */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, fontWeight: 600, color: '#d48806' }}>ALORS max =</Text>
                              <InputNumber
                                size="small"
                                min={0}
                                step={500}
                                value={rule.maxValue ?? 5000}
                                onChange={(value) => {
                                  updateLookupConfig((prev) => {
                                    const rules = [...(prev.filterConditions?.valueCaps || [])];
                                    rules[ruleIdx] = { ...rules[ruleIdx], maxValue: value ?? 5000 };
                                    return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                  });
                                }}
                                style={{ width: 120 }}
                                disabled={readOnly}
                              />
                              <Text type="secondary" style={{ fontSize: 10 }}>VA</Text>
                              <Select
                                size="small"
                                value={rule.scope || 'total'}
                                style={{ width: 140 }}
                                onChange={(value) => {
                                  updateLookupConfig((prev) => {
                                    const rules = [...(prev.filterConditions?.valueCaps || [])];
                                    rules[ruleIdx] = { ...rules[ruleIdx], scope: value };
                                    return { ...prev, filterConditions: { ...(prev.filterConditions || {}), valueCaps: rules } };
                                  });
                                }}
                                disabled={readOnly}
                              >
                                <Select.Option value="total">📊 Total</Select.Option>
                                <Select.Option value="per_unit">🔧 Par unité</Select.Option>
                              </Select>
                            </div>
                          </div>
                        ))}

                        <Button
                          size="small" type="dashed" block
                          onClick={() => {
                            updateLookupConfig((prev) => ({
                              ...prev,
                              filterConditions: {
                                ...(prev.filterConditions || {}),
                                valueCaps: [
                                  ...(prev.filterConditions?.valueCaps || []),
                                  { id: crypto.randomUUID(), enabled: true, label: '', conditions: [{ fieldRef: '', operator: 'equals' as const, value: '' }], maxValue: 5000, scope: 'total' as const }
                                ]
                              }
                            }));
                          }}
                          disabled={readOnly}
                          style={{ marginTop: 4 }}
                        >
                          + Ajouter un plafond de valeur
                        </Button>
                      </div>

                      {/* ── SECTION 3: Alertes Contextuelles ─── */}
                      <div style={{ 
                        padding: '12px', 
                        background: '#fff', 
                        border: '1px solid #ffccc7', 
                        borderRadius: '6px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 13, color: '#cf1322' }}>⚠️ Alertes Contextuelles</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            (Messages affichés selon conditions — basés sur le lookup)
                          </Text>
                        </div>

                        {(lookupConfig.filterConditions?.lookupAlerts || []).map((rule, ruleIdx) => (
                          <div key={rule.id} style={{ 
                            padding: '10px', 
                            background: rule.level === 'error' ? '#fff2f0' : rule.level === 'warning' ? '#fffbe6' : '#f0f9ff',
                            border: `1px solid ${rule.level === 'error' ? '#ffccc7' : rule.level === 'warning' ? '#ffe58f' : '#bae7ff'}`,
                            borderRadius: '4px', 
                            marginBottom: 8 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: 600 }}>
                                {rule.level === 'error' ? '🔴' : rule.level === 'warning' ? '🟡' : 'ℹ️'} Alerte {ruleIdx + 1}
                              </Text>
                              <Button 
                                size="small" type="text" danger
                                onClick={() => {
                                  updateLookupConfig((prev) => ({
                                    ...prev,
                                    filterConditions: {
                                      ...(prev.filterConditions || {}),
                                      lookupAlerts: (prev.filterConditions?.lookupAlerts || []).filter((_, i) => i !== ruleIdx)
                                    }
                                  }));
                                }}
                                disabled={readOnly}
                              >✕</Button>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <Input
                                size="small"
                                placeholder="Nom de l'alerte"
                                value={rule.label || ''}
                                onChange={(e) => {
                                  updateLookupConfig((prev) => {
                                    const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                    rules[ruleIdx] = { ...rules[ruleIdx], label: e.target.value };
                                    return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                  });
                                }}
                                style={{ flex: 1, fontSize: 11 }}
                                disabled={readOnly}
                              />
                              <Select
                                size="small"
                                value={rule.level || 'warning'}
                                style={{ width: 140 }}
                                onChange={(value) => {
                                  updateLookupConfig((prev) => {
                                    const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                    rules[ruleIdx] = { ...rules[ruleIdx], level: value };
                                    return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                  });
                                }}
                                disabled={readOnly}
                              >
                                <Select.Option value="info">ℹ️ Info</Select.Option>
                                <Select.Option value="warning">⚠️ Avertissement</Select.Option>
                                <Select.Option value="error">🔴 Erreur</Select.Option>
                              </Select>
                            </div>

                            {/* Conditions */}
                            {(rule.conditions || []).map((cond, condIdx) => (
                              <div key={condIdx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 10, minWidth: 16 }}>{condIdx === 0 ? 'SI' : 'ET'}</Text>
                                <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                                  <Input
                                    size="small"
                                    placeholder="Champ"
                                    value={cond.fieldRef || ''}
                                    onChange={(e) => {
                                      updateLookupConfig((prev) => {
                                        const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                        const conds = [...(rules[ruleIdx]?.conditions || [])];
                                        conds[condIdx] = { ...conds[condIdx], fieldRef: e.target.value };
                                        rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                        return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                      });
                                    }}
                                    style={{ flex: 1, fontSize: 9 }}
                                    disabled={readOnly}
                                  />
                                  <Button
                                    size="small" type="dashed"
                                    onClick={() => {
                                      setMultiplierConditionId(`lk_al_${ruleIdx}_${condIdx}_fieldRef`);
                                      setMultiplierSelectorTarget('A');
                                      setShowMultiplierSelector(true);
                                    }}
                                    disabled={readOnly}
                                    style={{ padding: '0 4px' }}
                                  >🌳</Button>
                                </div>
                                <Select
                                  size="small"
                                  value={cond.operator || 'greaterThan'}
                                  style={{ width: 65 }}
                                  onChange={(value) => {
                                    updateLookupConfig((prev) => {
                                      const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                      const conds = [...(rules[ruleIdx]?.conditions || [])];
                                      conds[condIdx] = { ...conds[condIdx], operator: value };
                                      rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                      return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                    });
                                  }}
                                  disabled={readOnly}
                                >
                                  <Select.Option value="equals">=</Select.Option>
                                  <Select.Option value="notEquals">≠</Select.Option>
                                  <Select.Option value="greaterThan">&gt;</Select.Option>
                                  <Select.Option value="lessThan">&lt;</Select.Option>
                                  <Select.Option value="greaterOrEqual">≥</Select.Option>
                                  <Select.Option value="lessOrEqual">≤</Select.Option>
                                  <Select.Option value="contains">∋</Select.Option>
                                </Select>
                                <Input
                                  size="small"
                                  placeholder="Valeur"
                                  value={cond.value || ''}
                                  onChange={(e) => {
                                    updateLookupConfig((prev) => {
                                      const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                      const conds = [...(rules[ruleIdx]?.conditions || [])];
                                      conds[condIdx] = { ...conds[condIdx], value: e.target.value };
                                      rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                      return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                    });
                                  }}
                                  style={{ flex: 1, fontSize: 9 }}
                                  disabled={readOnly}
                                />
                                {(rule.conditions || []).length > 1 && (
                                  <Button
                                    size="small" type="text" danger
                                    onClick={() => {
                                      updateLookupConfig((prev) => {
                                        const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                        const conds = [...(rules[ruleIdx]?.conditions || [])].filter((_, i) => i !== condIdx);
                                        rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                        return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                      });
                                    }}
                                    disabled={readOnly}
                                    style={{ padding: '0 2px' }}
                                  >✕</Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="small" type="dashed"
                              onClick={() => {
                                updateLookupConfig((prev) => {
                                  const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                  const conds = [...(rules[ruleIdx]?.conditions || []), { fieldRef: '', operator: 'greaterThan' as const, value: '10000' }];
                                  rules[ruleIdx] = { ...rules[ruleIdx], conditions: conds };
                                  return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                });
                              }}
                              disabled={readOnly}
                              style={{ fontSize: 10, marginBottom: 8 }}
                            >+ Condition ET</Button>

                            <Input.TextArea
                              size="small"
                              placeholder="Message d'alerte (ex: ⚠️ Puissance > 10000VA — Hors résidentiel)"
                              value={rule.message || ''}
                              onChange={(e) => {
                                updateLookupConfig((prev) => {
                                  const rules = [...(prev.filterConditions?.lookupAlerts || [])];
                                  rules[ruleIdx] = { ...rules[ruleIdx], message: e.target.value };
                                  return { ...prev, filterConditions: { ...(prev.filterConditions || {}), lookupAlerts: rules } };
                                });
                              }}
                              rows={2}
                              style={{ fontSize: 11 }}
                              disabled={readOnly}
                            />
                          </div>
                        ))}

                        <Button
                          size="small" type="dashed" block
                          onClick={() => {
                            updateLookupConfig((prev) => ({
                              ...prev,
                              filterConditions: {
                                ...(prev.filterConditions || {}),
                                lookupAlerts: [
                                  ...(prev.filterConditions?.lookupAlerts || []),
                                  { id: crypto.randomUUID(), enabled: true, label: '', conditions: [{ fieldRef: '', operator: 'greaterThan' as const, value: '10000' }], message: '', level: 'warning' as const }
                                ]
                              }
                            }));
                          }}
                          disabled={readOnly}
                          style={{ marginTop: 4 }}
                        >
                          + Ajouter une alerte
                        </Button>
                      </div>

                      {/* ── RÉSUMÉ VISUEL ─── */}
                      {((lookupConfig.filterConditions?.columnOverrides?.length || 0) > 0 ||
                        (lookupConfig.filterConditions?.valueCaps?.length || 0) > 0 ||
                        (lookupConfig.filterConditions?.lookupAlerts?.length || 0) > 0) && (
                        <div style={{ 
                          padding: '12px', 
                          background: 'linear-gradient(135deg, #f6ffed 0%, #f9f0ff 100%)', 
                          border: '1px solid #b7eb8f', 
                          borderRadius: '6px' 
                        }}>
                          <Text strong style={{ fontSize: 12, color: '#389e0d', display: 'block', marginBottom: 8 }}>
                            📋 Résumé des extensions lookup
                          </Text>
                          {(lookupConfig.filterConditions?.columnOverrides || []).map((r, i) => (
                            <div key={`co-${i}`} style={{ fontSize: 10, marginBottom: 2, fontFamily: 'monospace' }}>
                              🔄 {r.label || `Règle ${i+1}`}: SI [{r.conditions?.map(c => `${c.fieldRef?.split('.').pop() || '?'} ${c.operator} ${c.value}`).join(' ET ')}] → colonne "{r.targetColumn}"
                            </div>
                          ))}
                          {(lookupConfig.filterConditions?.valueCaps || []).map((r, i) => (
                            <div key={`vc-${i}`} style={{ fontSize: 10, marginBottom: 2, fontFamily: 'monospace' }}>
                              📏 {r.label || `Plafond ${i+1}`}: SI [{r.conditions?.map(c => `${c.fieldRef?.split('.').pop() || '?'} ${c.operator} ${c.value}`).join(' ET ')}] → max {r.maxValue} VA ({r.scope === 'per_unit' ? 'par unité' : 'total'})
                            </div>
                          ))}
                          {(lookupConfig.filterConditions?.lookupAlerts || []).map((r, i) => (
                            <div key={`al-${i}`} style={{ fontSize: 10, marginBottom: 2, fontFamily: 'monospace' }}>
                              {r.level === 'error' ? '🔴' : r.level === 'warning' ? '🟡' : 'ℹ️'} {r.label || `Alerte ${i+1}`}: SI [{r.conditions?.map(c => `${c.fieldRef?.split('.').pop() || '?'} ${c.operator} ${c.value}`).join(' ET ')}] → "{r.message?.substring(0, 50)}..."
                            </div>
                          ))}
                        </div>
                      )}
                    </Space>
                  </div>
                )}
              </div>
            </Space>      <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <Table
                size="small"
                sticky
                pagination={false}
                scroll={{ x: true }}
                columns={matrixEditableColumns}
                // dataSource: skip header row (index 0) and provide rowIndex referencing actual cfg.rows/cfg.data
                dataSource={(cfg.rows || []).slice(1).map((_, rIdx) => ({ key: String(rIdx + 1), rowIndex: rIdx + 1 }))}
              />
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              <Text strong>Tester lookup:</Text>
              
              {/* Afficher le dropdown Colonne si columnFieldId est configurÃ© */}
              {lookupConfig.selectors?.columnFieldId && (
                <Select
                  style={{ minWidth: 180 }}
                  placeholder="Colonne"
                  value={testCol}
                  onChange={setTestCol}
                  options={columnOptions}
                />
              )}
              
              {/* Afficher le dropdown Ligne si rowFieldId est configurÃ© */}
              {lookupConfig.selectors?.rowFieldId && (
                <Select
                  style={{ minWidth: 180 }}
                  placeholder="Ligne"
                  value={testRow}
                  onChange={setTestRow}
                  options={rowOptions}
                />
              )}
              
              {/* Message si aucun champ n'est configurÃ© */}
              {!lookupConfig.selectors?.columnFieldId && !lookupConfig.selectors?.rowFieldId && (
                <Text type="secondary" italic>Configurez d'abord un champ colonne ou ligne ci-dessus</Text>
              )}
              
              {(lookupConfig.selectors?.columnFieldId || lookupConfig.selectors?.rowFieldId) && (
                <Button onClick={refreshLookup}>Chercher</Button>
              )}
              
              {lookupValue !== undefined && (
                <Text>Valeur: {String(lookupValue)}</Text>
              )}
            </div>
      </Space>

      {/* 🔥 NodeTreeSelector pour l'option 3 CAPACITÉ (COLONNE) */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={showCapacitySelectorColumn}
        onClose={() => setShowCapacitySelectorColumn(false)}
        onSelect={(selected: NodeTreeSelectorValue) => {
          updateLookupConfig((prev) => ({
            ...prev,
            columnSourceOption: { ...(prev.columnSourceOption || {}), capacityRef: selected.ref || null }
          }));
          setShowCapacitySelectorColumn(false);
        }}
        selectionContext="token"
        allowMulti={false}
      />

      {/* 🔥 NodeTreeSelector pour l'option 3 CAPACITÉ (LIGNE) */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={showCapacitySelectorRow}
        onClose={() => setShowCapacitySelectorRow(false)}
        onSelect={(selected: NodeTreeSelectorValue) => {
          updateLookupConfig((prev) => ({
            ...prev,
            rowSourceOption: { ...(prev.rowSourceOption || {}), capacityRef: selected.ref || null }
          }));
          setShowCapacitySelectorRow(false);
        }}
        selectionContext="token"
        allowMulti={false}
      />

      {/* 🔥 NOUVEAU: NodeTreeSelector pour la sélection des LIGNES */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={showRowTreeSelector}
        onClose={() => {
          setShowRowTreeSelector(false);
          setCurrentRowSelectorType(null);
        }}
        onSelect={(selected: NodeTreeSelectorValue) => {
          // Sélectionner le champ ligne via l'arborescence
          if (currentRowSelectorType === 'select') {
            updateLookupConfig((prev) => ({
              ...prev,
              selectors: { ...(prev.selectors || {}), rowFieldId: selected.ref || null },
            }));
            
            // Activer la capacité automatiquement
            if (selected.ref && activeId) {
              (async () => {
                try {
                  const updatedLookupConfig = {
                    ...lookupConfig,
                    enabled: true,
                    columnLookupEnabled: lookupConfig.columnLookupEnabled ?? false,
                    rowLookupEnabled: true,
                    selectors: {
                      ...lookupConfig.selectors,
                      rowFieldId: selected.ref,
                    },
                  };
                  
                  const updatedCfg = {
                    ...cfg,
                    meta: {
                      ...cfg.meta,
                      lookup: updatedLookupConfig,
                    },
                  };
                  setCfg(updatedCfg);
                  await debouncedSave(updatedCfg);
                  
                  await updateTableCapability(selected.ref, {
                    enabled: true,
                    activeId,
                    currentTable: {
                      type: cfg.type,
                      tableId: activeId,
                      rowBased: true,
                      columnBased: false,
                      keyRow: lookupConfig.keyRow || null,
                      valueRow: lookupConfig.valueRow || null,
                      displayRow: lookupConfig.displayRow || null,
                    },
                  });
                  message.success('✅ Champ ligne sélectionné et activé !');
                } catch (error) {
                  console.error('Erreur activation champ ligne:', error);
                  message.error('Erreur lors de l\'activation du champ ligne');
                }
              })();
            }
          }
          
          setShowRowTreeSelector(false);
          setCurrentRowSelectorType(null);
        }}
        selectionContext="token"
        allowMulti={false}
      />

      {/* 🔥 NodeTreeSelector pour les conditions */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={showNodeTreeSelector}
        onClose={() => {
          setShowNodeTreeSelector(false);
          setCurrentConditionId(null);
        }}
        onSelect={handleNodeTreeSelection}
        selectionContext="token"
        allowMulti={false}
      />

      {/* 🔥 NOUVEAU: NodeTreeSelector pour ÉTAPE 2.5 (Filtrage SELECT) */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={showNodeTreeSelectorFilter}
        onClose={() => {
          setShowNodeTreeSelectorFilter(false);
          setCurrentFilterFieldType(null);
        }}
        onSelect={(selected: NodeTreeSelectorValue) => {
          if (currentFilterFieldType === 'select') {
            if (currentFilterIndex !== null) {
              // Mode multi-filtre: mettre à jour le filtre à l'index spécifique
              updateLookupConfig((prev) => {
                const newFilters = [...(prev.columnSourceOption?.filters || [])];
                newFilters[currentFilterIndex] = { ...newFilters[currentFilterIndex], valueRef: selected.ref || null };
                return {
                  ...prev,
                  columnSourceOption: { ...(prev.columnSourceOption || {}), filters: newFilters }
                };
              });
            }
          }
          setShowNodeTreeSelectorFilter(false);
          setCurrentFilterFieldType(null);
          setCurrentFilterIndex(null);
        }}
        selectionContext="token"
        allowMulti={false}
      />

      {/* ✨ NodeTreeSelector pour le multiplicateur conditionnel (champ A / B) */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={showMultiplierSelector}
        onClose={() => {
          setShowMultiplierSelector(false);
          setMultiplierConditionId(null);
          setMultiplierSelectorTarget(null);
        }}
        onSelect={handleMultiplierSelection}
        selectionContext="token"
        allowMulti={false}
      />

    </Card>
  );
};

export default TablePanel;

