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
  rows: string[];
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
  rows?: string[] | null;
  matrix?: (string | number | boolean | null)[][] | null;
  data?: { matrix?: (string | number | boolean | null)[][] | null } | null;
  records?: Record<string, unknown>[] | null;
  meta?: Record<string, unknown> | null;
  order?: number | null;
};

const normalizedToInstance = (raw: NormalizedTableInstanceResponse): TableInstance => {
  const safeColumns = Array.isArray(raw.columns) ? raw.columns.map(String) : [];
  const safeRows = Array.isArray(raw.rows) ? raw.rows.map(String) : [];
  const matrix = Array.isArray(raw.matrix)
    ? (raw.matrix as (number | string | boolean | null)[][])
    : Array.isArray(raw.data?.matrix)
      ? (raw.data?.matrix as (number | string | boolean | null)[][])
      : [];

  return {
    id: String(raw.id),
    name: (raw.name ?? 'Sans nom') || 'Sans nom',
    description: raw.description ?? undefined,
    type: (raw.type as string) || 'columns',
    columns: safeColumns,
    rows: safeRows,
    matrix,
    data: { matrix },
    records: Array.isArray(raw.records) ? raw.records : [],
    meta: (raw.meta || {}) as TableMeta,
    order: typeof raw.order === 'number' ? raw.order : 0,
  };
};

const instanceToConfig = (instance?: TableInstance | null): TableConfig => {
  if (!instance) {
    return { type: 'columns', columns: [] };
  }

  const columns = Array.isArray(instance.columns) ? instance.columns.map(String) : [];
  const rows = Array.isArray(instance.rows) ? instance.rows.map(String) : undefined;
  const matrix = Array.isArray(instance.matrix)
    ? (instance.matrix as (number | string | null)[][])
    : Array.isArray(instance.data?.matrix)
      ? (instance.data?.matrix as (number | string | null)[][])
      : undefined;
  const meta = (instance.meta || {}) as TableMeta;

  return {
    type: (instance.type as 'columns' | 'matrix') || 'columns',
    columns,
    rows,
    data: matrix,
    meta,
    isImported: meta.isImported === true || meta.isImported === 'true',
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

        setFieldOptions(options);
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
          // âœ… CrÃ©er automatiquement une premiÃ¨re instance si aucune n'existe
          console.log('ðŸ—‚ï¸ TablePanel: Aucune instance, crÃ©ation auto...');
          const firstInstance = {
            name: 'Tableau 1',
            description: '',
            type: 'columns' as const,
            columns: [],
            rows: [],
            data: [],
            meta: { lookup: { enabled: true, mode: 'columns' as const, exposeColumns: [] } },
          };

          try {
            const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/tables`, firstInstance);
            const savedInstance = normalizedToInstance(created as NormalizedTableInstanceResponse);
            console.log('ðŸ—‚ï¸ TablePanel: âœ… PremiÃ¨re instance crÃ©Ã©e:', savedInstance.id);
            setInstances([savedInstance]);
            setActiveId(savedInstance.id);
            setCfg(instanceToConfig(savedInstance));
          } catch (error) {
            console.error('ðŸ—‚ï¸ TablePanel: âŒ Erreur crÃ©ation auto:', error);
            setActiveId(null);
          }
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
      return;
    }

    const instance = instances.find((item) => item.id === activeId);
    setCfg(instanceToConfig(instance));
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
    return (cfg.columns || []).map((col) => ({ value: col, label: col }));
  }, [cfg]);
  
  const rowOptions = useMemo(() => {
    return (cfg.rows || []).map((row) => ({ value: row, label: row }));
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
      render: (_: unknown, __: unknown, rIdx: number) => {
        // ✅ rows[0] = A1 ("Orientation"), rows[1] = "Nord", etc.
        // Pour afficher dans le tableau, on skip rows[0] donc on affiche rows[rIdx + 1]
        const actualRowIndex = rIdx + 1;
        return (
          <Input 
            size="small" 
            value={(cfg.rows || [])[actualRowIndex] || ''} 
            onChange={(e) => renameRow(actualRowIndex, e.target.value)} 
            disabled={readOnly} 
          />
        );
      }
    };
    const rest = (cfg.columns || []).slice(1).map((c, cIdx) => ({ // slice(1) pour SAUTER A1
      title: c,
      dataIndex: String(cIdx),
      key: String(cIdx),
      render: (_: unknown, __: unknown, rIdx: number) => (
        <Input
          size="small"
          value={(cfg.data?.[rIdx]?.[cIdx] ?? '') as string | number}
          onChange={(e) => setCellMatrix(rIdx, cIdx, e.target.value)}
          disabled={readOnly}
        />
      )
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
    if (!activeId || instances.length <= 1) return;
    
    const userConfirmed = window.confirm(
      `Supprimer dÃ©finitivement cette instance de tableau ?`
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
        setCfg({ type: 'columns', columns: [] });
      }
      
      message.success('Instance supprimÃ©e');
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
      cfg.rows.forEach((rowLabel, rowIdx) => {
        const rowData = cfg.data?.[rowIdx] || [];
        excelData.push([rowLabel, ...rowData]); // ["Nord", 82, 88, 93, ...]
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
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];
      
      if (jsonData.length === 0) {
        message.warning('Le fichier est vide');
        return;
      }
      
      // Utiliser le type actuel de la configuration
      // Maintenant toujours 'matrix' (avec colonnes ET lignes)
      const type: 'columns' | 'matrix' = 'matrix';
      
      let columns: string[] = [];
      let rows: string[] | undefined;
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
        
        // ✅ Lignes = Première colonne COMPLÈTE (AVEC A1) pour pouvoir le sélectionner
        rows = jsonData.map((row, idx) => {
          const val = row[0];
          if (val === null || val === undefined) return `Ligne ${idx + 1}`;
          return String(val);
        });
        
        // Data = Corps SANS première ligne NI première colonne
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
        meta: { ...cfg.meta, isImported: true, importSource: file.name },
      };
      
      setCfg(next);
      debouncedSave(next);
      message.success(`Fichier importÃ©: ${jsonData.length - 1} lignes`);
    } catch (error) {
      console.error('ðŸ—‚ï¸ TablePanel: Erreur import fichier:', error);
      message.error('Erreur lors de l\'import du fichier');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [cfg, debouncedSave]);

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
        {instances.length > 1 && (
          <Button size="small" icon={<DeleteOutlined />} onClick={deleteTableInstance} disabled={readOnly} danger>
            Supprimer
          </Button>
        )}
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
          <Button onClick={triggerFilePicker} disabled={readOnly}>Importer Excel/CSV (fichier)</Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleDownloadExcel} 
            disabled={readOnly || !cfg.columns?.length || !cfg.rows?.length}
          >
            Télécharger Excel
          </Button>
        </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />

        {/* âœ… TOUJOURS afficher colonnes et lignes */}
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
            <div style={{ minWidth: 260, flex: 1 }}>
              <Text strong>Colonnes</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(cfg.columns || []).map((c, idx) => (
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
              <Button icon={<PlusOutlined />} onClick={addColumn} size="small" disabled={readOnly}>Ajouter une colonne</Button>
            </Space>
            </div>
            <div style={{ minWidth: 260, flex: 1 }}>
              <Text strong>Lignes</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(cfg.rows || []).map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <Input size="small" value={r} placeholder={`Ligne ${idx + 1}`} onChange={(e) => renameRow(idx, e.target.value)} disabled={readOnly} />
                    <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removeRow(idx)} disabled={readOnly} />
                  </div>
                ))}
                <Button icon={<PlusOutlined />} onClick={addRow} size="small" disabled={readOnly}>Ajouter une ligne</Button>
              </Space>
            </div>
          </div>
          <Text type="secondary">{(cfg.rows?.length || 0)} lignes Ã— {(cfg.columns?.length || 0)} colonnes</Text>
        </Space>


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
                            const payload = {
                              enabled: true,
                              activeId: activeId,
                              currentTable: {
                                type: 'columns',
                                tableId: activeId,
                                mode: 'columns',
                                columnBased: true,
                                rowBased: false,
                                keyColumn: null,
                                valueColumn: null,
                                displayColumn: null,
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
                            await api.put(`/api/treebranchleaf/nodes/${prevFieldId}/capabilities/table`, {
                              enabled: false,
                            });
                            console.log('[TablePanel][COLUMN] Capacite Table desactivee');
                            
                            window.dispatchEvent(new CustomEvent('tbl-capability-updated', { 
                              detail: { nodeId: prevFieldId, treeId: initialTreeId } 
                            }));
                            console.log('[TablePanel] Evenement tbl-capability-updated emis (desactivation)');
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
                            await api.put(`/api/treebranchleaf/nodes/${value}/capabilities/table`, {
                              enabled: true,
                              activeId,
                              currentTable: {
                                type: cfg.type,
                                tableId: activeId,
                                rowBased: true,
                                columnBased: false, // ✅ Désactiver le flag colonne
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
        dataSource={(cfg.rows || []).slice(1).map((_, rIdx) => ({ key: String(rIdx) }))}
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
