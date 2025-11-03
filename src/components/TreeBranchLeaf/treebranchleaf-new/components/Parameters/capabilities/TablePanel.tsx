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
import { Button, Card, Divider, Input, Select, Space, Switch, Table, Tooltip, Typography, message } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import * as XLSX from 'xlsx';
import { DeleteOutlined, PlusOutlined, InfoCircleOutlined, DownloadOutlined } from '@ant-design/icons';

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
            if (!nodeIdCandidate || nodeIdCandidate === nodeId) return false;
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
      })),
    [fieldOptions]
  );
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
      displayColumn: Array.isArray(raw.displayColumn) ? raw.displayColumn : (typeof raw.displayColumn === 'string' ? raw.displayColumn : undefined),
      displayRow: Array.isArray(raw.displayRow) ? raw.displayRow : (typeof raw.displayRow === 'string' ? raw.displayRow : undefined),
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
        debouncedSave(nextCfg);
        return nextCfg;
      });
    },
    [setCfg, debouncedSave]
  );

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
      // Supprimer de l'API si ce n'est pas temporaire
      if (!activeId.startsWith('temp_')) {
        await api.delete(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`);
      }
      
      // Mettre Ã  jour les instances locales
      const remaining = instances.filter(it => it.id !== activeId);
      setInstances(remaining);
      
      // SÃ©lectionner la prochaine instance
      const nextActive = remaining[0] || null;
      setActiveId(nextActive ? nextActive.id : null);
      
      if (nextActive) {
        setCfg(instanceToConfig(nextActive));
      } else {
        // Réinitialiser avec un tableau vide
        setCfg({ type: 'matrix', columns: ['Colonne 1'], rows: ['Ligne 1'], data: [[null]] });
      }
      
      message.success(instances.length > 1 ? 'Instance supprimée' : 'Tableau supprimé');
    } catch (error) {
      console.error('ðŸ—‚ï¸ TablePanel: Erreur suppression instance:', error);
      message.error('Impossible de supprimer l\'instance');
    }
  }, [activeId, instances, api, nodeId]);

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
                              await api.put(`/api/treebranchleaf/nodes/${fieldId}/capabilities/table`, { enabled: false });
                              window.dispatchEvent(new CustomEvent('tbl-capability-updated', { detail: { nodeId: fieldId, treeId: initialTreeId } }));
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
                              await api.put(`/api/treebranchleaf/nodes/${fieldId}/capabilities/table`, { enabled: false });
                              window.dispatchEvent(new CustomEvent('tbl-capability-updated', { detail: { nodeId: fieldId, treeId: initialTreeId } }));
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
                <div style={{ minWidth: 280 }}>
                  <Text type="secondary" strong>Champ colonne a transformer en liste</Text>
                  <Select
                    size="small"
                    showSearch
                    placeholder={fieldsLoading ? 'Chargement...' : 'Selectionner un champ'}
                    value={lookupConfig.selectors?.columnFieldId || undefined}
                    options={fieldSelectOptions}
                    onChange={(value) => {
                      console.log('[TablePanel][COLUMN] Selection champ:', { value, activeId, nodeId });
                      
                      updateLookupConfig((prev) => ({
                        ...prev,
                        selectors: { ...(prev.selectors || {}), columnFieldId: value || null },
                      }));

                      // Activer la capacite Table sur le champ selectionne
                      if (value && activeId) {
                        console.log('[TablePanel][COLUMN] Activation capacite Table pour champ:', value);
                        (async () => {
                          try {
                            // 🔧 FIX CRITIQUE : Mettre à jour la config lookup dans meta pour l'interpreter
                            const updatedLookupConfig = {
                              ...lookupConfig,
                              enabled: true,
                              columnLookupEnabled: true,
                              // ✅ PRÉSERVER rowLookupEnabled (ne pas écraser si déjà activé)
                              rowLookupEnabled: lookupConfig.rowLookupEnabled ?? false,
                              selectors: {
                                ...lookupConfig.selectors,
                                columnFieldId: value,
                              },
                            };
                            
                            // Sauvegarder la config lookup dans l'instance de table
                            const updatedCfg = {
                              ...cfg,
                              meta: {
                                ...cfg.meta,
                                lookup: updatedLookupConfig,
                              },
                            };
                            setCfg(updatedCfg);
                            
                            // Sauvegarder dans la base (table instance)
                            await debouncedSave(updatedCfg);
                            
                            const payload = {
                              enabled: true,
                              activeId: activeId,
                              currentTable: {
                                type: 'columns',
                                tableId: activeId,
                                mode: 'columns',
                                columnBased: true,
                                rowBased: false,
                                // 🔧 FIX: Ajouter keyColumn pour que l'interpréteur sache quelle colonne extraire
                                keyColumn: lookupConfig.keyColumn || null,
                                valueColumn: lookupConfig.valueColumn || null,
                                displayColumn: lookupConfig.displayColumn || null,
                              },
                            };
                            console.log('[TablePanel][COLUMN] Payload PUT initial:', payload);
                            await api.put(`/api/treebranchleaf/nodes/${value}/capabilities/table`, payload);
                            console.log('[TablePanel][COLUMN] Capacite Table activee pour:', value);
                            
                            window.dispatchEvent(new CustomEvent('tbl-capability-updated', { 
                              detail: { nodeId: value, treeId: initialTreeId } 
                            }));
                            console.log('[TablePanel] Evenement tbl-capability-updated emis');
                            
                            message.success('Champ transforme en liste !');
                          } catch (error) {
                            console.error('[TablePanel][COLUMN] Erreur activation capacite:', error);
                            message.error('Erreur activation de la capacite Table');
                          }
                        })();
                      } else if (!value && lookupConfig.selectors?.columnFieldId) {
                        // Desactiver la capacite si on deselectionne
                        const prevFieldId = lookupConfig.selectors.columnFieldId;
                        console.log('[TablePanel][COLUMN] Desactivation capacite Table pour:', prevFieldId);
                        (async () => {
                            try {
                              // Tentative de désactivation - rien à faire si l'appel n'est pas nécessaire
                              // (placeholder pour futures actions)
                            } catch (error) {
                              console.error('[TablePanel][COLUMN] Erreur desactivation:', error);
                            }
                        })();
                      }
                    }}
                    disabled={readOnly || fieldsLoading}
                    allowClear
                    optionFilterProp="label"
                    loading={fieldsLoading}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Ce champ deviendra une liste deroulante
                  </Text>
                </div>
                )}

                {/* Configuration BLOC COLONNE */}
                {lookupConfig.selectors?.columnFieldId && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ padding: '12px', background: '#f0f9ff', border: '1px solid #bae7ff', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>📊</span>
                        <Text strong style={{ fontSize: 14 }}>Configuration Lookup COLONNE</Text>
                      </div>
                      
                      {/* Quelle colonne extraire ? */}
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" strong style={{ fontSize: 12 }}>Quelle colonne extraire ?</Text>
                        <Select
                          size="small"
                          placeholder="Selectionner une colonne..."
                          value={lookupConfig.keyColumn}
                          options={columnOptions}
                          allowClear
                          onChange={(value) => {
                            updateLookupConfig((prev) => ({ ...prev, keyColumn: value || undefined }));
                            
                            if (lookupConfig.selectors?.columnFieldId && activeId) {
                              (async () => {
                                try {
                                  await api.put(`/api/treebranchleaf/nodes/${lookupConfig.selectors.columnFieldId}/capabilities/table`, {
                                    enabled: true,
                                    activeId,
                                    currentTable: {
                                      type: cfg.type,
                                      tableId: activeId,
                                      keyColumn: value || null,
                                      valueColumn: lookupConfig.valueColumn || null,
                                      displayColumn: lookupConfig.displayColumn || null,
                                    },
                                  });
                                  window.dispatchEvent(new CustomEvent('tbl-capability-updated', { 
                                    detail: { nodeId: lookupConfig.selectors.columnFieldId, treeId: initialTreeId } 
                                  }));
                                } catch (error) {
                                  console.error('Erreur keyColumn:', error);
                                }
                              })();
                            }
                          }}
                          disabled={readOnly}
                          style={{ width: '100%', marginTop: 4 }}
                        />
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                          {lookupConfig.keyColumn ? `Affichera: ${lookupConfig.keyColumn}` : 'Ex: Janvier'}
                        </Text>
                      </div>

                      {/* Champs de reponse colonne */}
                      {lookupConfig.keyColumn && (
                        <div style={{ paddingLeft: 12, borderLeft: '3px solid #1890ff' }}>
                          <Text type="secondary" strong style={{ fontSize: 12 }}>Colonne(s) a afficher</Text>
                          <Select
                            size="small"
                            mode="multiple"
                            placeholder="Selectionner colonne(s)..."
                            value={Array.isArray(lookupConfig.displayColumn) ? lookupConfig.displayColumn : (lookupConfig.displayColumn ? [lookupConfig.displayColumn] : [])}
                            options={columnOptions}
                            allowClear
                            onChange={(values) => {
                              // Stocker TOUTES les valeurs sélectionnées (array)
                              updateLookupConfig((prev) => ({ ...prev, displayColumn: values }));
                            }}
                            disabled={readOnly}
                            style={{ width: '100%', marginTop: 4 }}
                          />
                          <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block' }}>
                            Ex: Janvier, Fevrier... (plusieurs possibles)
                          </Text>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Configuration LIGNE - visible uniquement si switch ON */}
                {lookupConfig.rowLookupEnabled && (
                <>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ minWidth: 280 }}>
                  <Text type="secondary" strong>Champ ligne a transformer en liste</Text>
                  <Select
                    size="small"
                    showSearch
                    placeholder={fieldsLoading ? 'Chargement...' : 'Selectionner un champ'}
                    value={lookupConfig.selectors?.rowFieldId}
                    options={fieldSelectOptions}
                    onChange={(value) => {
                      updateLookupConfig((prev) => ({
                        ...prev,
                        selectors: { ...(prev.selectors || {}), rowFieldId: value || null },
                      }));

                      if (value && activeId) {
                        (async () => {
                          try {
                            // 🔧 FIX CRITIQUE : Mettre à jour la config lookup dans meta pour l'interpreter
                            const updatedLookupConfig = {
                              ...lookupConfig,
                              enabled: true,
                              // ✅ PRÉSERVER columnLookupEnabled (ne pas écraser si déjà activé)
                              columnLookupEnabled: lookupConfig.columnLookupEnabled ?? false,
                              rowLookupEnabled: true,
                              selectors: {
                                ...lookupConfig.selectors,
                                rowFieldId: value,
                              },
                            };
                            
                            // Sauvegarder la config lookup dans l'instance de table
                            const updatedCfg = {
                              ...cfg,
                              meta: {
                                ...cfg.meta,
                                lookup: updatedLookupConfig,
                              },
                            };
                            setCfg(updatedCfg);
                            
                            // Sauvegarder dans la base (table instance)
                            await debouncedSave(updatedCfg);
                            
                            await api.put(`/api/treebranchleaf/nodes/${value}/capabilities/table`, {
                              enabled: true,
                              activeId,
                              currentTable: {
                                type: cfg.type,
                                tableId: activeId,
                                rowBased: true,
                                columnBased: false,
                                // 🔧 FIX: Ajouter keyRow pour que l'interpréteur sache quelle ligne extraire
                                keyRow: lookupConfig.keyRow || null,
                                valueRow: lookupConfig.valueRow || null,
                                displayRow: lookupConfig.displayRow || null,
                              },
                            });
                            window.dispatchEvent(new CustomEvent('tbl-capability-updated', { 
                              detail: { nodeId: value, treeId: initialTreeId } 
                            }));
                            message.success('Champ ligne active !');
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
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Ce champ deviendra une liste deroulante (ligne)
                  </Text>
                </div>

                {/* Configuration BLOC LIGNE */}
                {lookupConfig.selectors?.rowFieldId && (
                  <div style={{ padding: '12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 18 }}>📈</span>
                      <Text strong style={{ fontSize: 14 }}>Configuration Lookup LIGNE</Text>
                    </div>
                    
                    {/* Quelle ligne extraire ? */}
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" strong style={{ fontSize: 12 }}>Quelle ligne extraire ?</Text>
                      <Select
                        size="small"
                        placeholder="Selectionner une ligne..."
                        value={lookupConfig.keyRow}
                        options={rowOptions}
                        allowClear
                        onChange={(value) => {
                          updateLookupConfig((prev) => ({ ...prev, keyRow: value || undefined }));
                          
                          if (lookupConfig.selectors?.rowFieldId && activeId) {
                            (async () => {
                              try {
                                await api.put(`/api/treebranchleaf/nodes/${lookupConfig.selectors.rowFieldId}/capabilities/table`, {
                                  enabled: true,
                                  activeId,
                                  currentTable: {
                                    type: cfg.type,
                                    tableId: activeId,
                                    keyRow: value || null,
                                    valueRow: lookupConfig.valueRow || null,
                                    displayRow: lookupConfig.displayRow || null,
                                  },
                                });
                                window.dispatchEvent(new CustomEvent('tbl-capability-updated', { 
                                  detail: { nodeId: lookupConfig.selectors.rowFieldId, treeId: initialTreeId } 
                                }));
                              } catch (error) {
                                console.error('Erreur keyRow:', error);
                              }
                            })();
                          }
                        }}
                        disabled={readOnly}
                        style={{ width: '100%', marginTop: 4 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        {lookupConfig.keyRow ? `Affichera: ${lookupConfig.keyRow}` : 'Ex: Ventes'}
                      </Text>
                    </div>

                    {/* Champs de reponse ligne */}
                    {lookupConfig.keyRow && (
                      <div style={{ paddingLeft: 12, borderLeft: '3px solid #fa8c16' }}>
                        <Text type="secondary" strong style={{ fontSize: 12 }}>Ligne(s) a afficher</Text>
                        <Select
                          size="small"
                          mode="multiple"
                          placeholder="Selectionner ligne(s)..."
                          value={Array.isArray(lookupConfig.displayRow) ? lookupConfig.displayRow : (lookupConfig.displayRow ? [lookupConfig.displayRow] : [])}
                          options={rowOptions}
                          allowClear
                          onChange={(values) => {
                            // Stocker TOUTES les valeurs sélectionnées (array)
                            updateLookupConfig((prev) => ({ ...prev, displayRow: values }));
                          }}
                          disabled={readOnly}
                          style={{ width: '100%', marginTop: 4 }}
                        />
                        <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block' }}>
                          Ex: Ventes, Couts... (plusieurs possibles)
                        </Text>
                      </div>
                    )}
                  </div>
                )}
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
              </div>
            </Space>

      <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
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

    </Card>
  );
};

export default TablePanel;

