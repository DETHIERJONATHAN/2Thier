import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Divider, Input, Radio, Select, Space, Table, Tooltip, Typography, message } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import * as XLSX from 'xlsx';
import { DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TablePanelProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type TableConfig = {
  type: 'columns' | 'matrix';
  columns: string[];
  rows?: string[];
  data?: (number | string | null)[][];
  meta?: { unit?: string; decimal?: 'comma' | 'dot'; name?: string } & Record<string, unknown>;
  isImported?: boolean;
  importSource?: string;
};

type TableInstance = {
  id: string;
  name: string;
  description?: string;
  type: string;
  columns: unknown[];
  rows: unknown[];
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

const TablePanel: React.FC<TablePanelProps> = ({ nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const [cfg, setCfg] = useState<TableConfig>({ type: 'columns', columns: [] });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [testCol, setTestCol] = useState<string | undefined>(undefined);
  const [testRow, setTestRow] = useState<string | undefined>(undefined);
  const [lookupValue, setLookupValue] = useState<string | number | null | undefined>(undefined);
  const [instances, setInstances] = useState<TableInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Fonction de sauvegarde debounced
  const debouncedSave = useDebouncedCallback(async (config: TableConfig) => {
    if (!activeId || activeId.startsWith('temp_')) return;
    
    try {
      // Convertir vers le format API
      const apiData = {
        type: config.type,
        columns: config.columns,
        rows: config.rows || [],
        data: { matrix: config.data || [] },
        meta: config.meta || {}
      };
      
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`, apiData);
    } catch (error) {
      console.error('🗂️ TablePanel: Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  }, 1000);

  // Fonction utilitaire pour assurer la largeur des données
  const ensureDataWidth = useCallback((data: (number | string | null)[][] | undefined, width: number): (number | string | null)[][] | undefined => {
    if (!data) return Array.from({ length: 1 }, () => Array.from({ length: width }, () => null as null));
    return data.map((row) => {
      const newRow = [...row];
      while (newRow.length < width) newRow.push(null);
      return newRow.slice(0, width);
    });
  }, []);

  // Chargement initial des instances de tableaux depuis la table dédiée
  useEffect(() => {
    const mounted = true;
    (async () => {
      try {
        // console.log('🗂️ TablePanel: Chargement des instances de tableaux...'); // ✨ Log réduit
        
        // Charger toutes les instances de tableaux depuis la table dédiée
        const tables = await api.get(`/api/treebranchleaf/nodes/${nodeId}/tables`) as TableInstance[];
        
        // console.log(...) // ✨ Log réduit - objet de debug
        
        if (mounted) {
          setInstances(tables);
          if (tables.length > 0 && !activeId) {
            setActiveId(tables[0].id);
          }
        }
      } catch (error) {
        console.error('🗂️ TablePanel: Erreur chargement instances:', error);
        message.error('Impossible de charger les instances de tableaux');
      }
    })();
  }, [api, nodeId, activeId]);

  const ensureDataHeight = useCallback((data: (number | string | null)[][] | undefined, height: number, width: number): (number | string | null)[][] | undefined => {
    const makeEmpty = () => Array.from({ length: width }, () => null as null);
    if (!data) return Array.from({ length: height }, () => makeEmpty());
    const trimmed = [...data].slice(0, height);
    while (trimmed.length < height) trimmed.push(makeEmpty());
    return trimmed.map((row) => ensureDataWidth([row], width)![0]);
  }, [ensureDataWidth]);

  // Gestion Colonnes (tous types)
  const addColumn = useCallback(() => {
    const nextCols = [...(cfg.columns || []), `Colonne ${(cfg.columns?.length || 0) + 1}`];
    const next: TableConfig = cfg.type === 'matrix'
      ? { ...cfg, columns: nextCols, data: ensureDataWidth(cfg.data, nextCols.length) }
      : { ...cfg, columns: nextCols, data: ensureDataWidth(cfg.data, nextCols.length) };
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

  // Données (mode Colonnes): ajouter/supprimer lignes et éditer cellules
  const addDataRowColumns = useCallback(() => {
    if (cfg.type !== 'columns') return;
    const width = (cfg.columns || []).length;
    const newRow = Array.from({ length: width }, () => null as null);
    const nextData = Array.isArray(cfg.data) ? [...cfg.data, newRow] : [newRow];
    const next: TableConfig = { ...cfg, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  const removeDataRowColumns = useCallback((rowIdx: number) => {
    if (cfg.type !== 'columns' || !Array.isArray(cfg.data)) return;
    const nextData = cfg.data.filter((_, i) => i !== rowIdx);
    const next: TableConfig = { ...cfg, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  const setCellColumns = useCallback((rowIdx: number, colIdx: number, raw: string) => {
    if (cfg.type !== 'columns') return;
    const width = (cfg.columns || []).length;
    let nextData = ensureDataWidth(cfg.data, width) || [];
    if (!nextData[rowIdx]) {
      // étendre si nécessaire
      while (nextData.length <= rowIdx) {
        nextData.push(Array.from({ length: width }, () => null as null));
      }
    }
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
  }, [cfg, debouncedSave, ensureDataWidth]);

  // Gestion Lignes (uniquement matrix)
  // Gestion Lignes (labels) en mode Colonnes
  const addRowLabelColumns = useCallback(() => {
    if (cfg.type !== 'columns') return;
    const nextRows = [...(cfg.rows || []), `Ligne ${(cfg.rows?.length || 0) + 1}`];
    const width = (cfg.columns || []).length;
    const nextData = ensureDataHeight(cfg.data, nextRows.length, width);
    const next: TableConfig = { ...cfg, rows: nextRows, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave, ensureDataHeight]);

  const removeRowLabelColumns = useCallback((idx: number) => {
    if (cfg.type !== 'columns') return;
    const nextRows = (cfg.rows || []).filter((_, i) => i !== idx);
    let nextData = cfg.data;
    if (Array.isArray(cfg.data)) nextData = cfg.data.filter((_, i) => i !== idx);
    const next: TableConfig = { ...cfg, rows: nextRows, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  const renameRowLabelColumns = useCallback((idx: number, val: string) => {
    if (cfg.type !== 'columns') return;
    const nextRows = [...(cfg.rows || [])];
    nextRows[idx] = val;
    const next: TableConfig = { ...cfg, rows: nextRows };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  // Adapter lignes de données si on a des labels de lignes en columns
  const addDataRowColumnsOriginal = addDataRowColumns;
  const addDataRowColumnsWrapped = useCallback(() => {
    addDataRowColumnsOriginal();
    if (cfg.type === 'columns' && Array.isArray(cfg.rows)) {
      const nextRows = [...cfg.rows, `Ligne ${cfg.rows.length + 1}`];
      const next: TableConfig = { ...cfg, rows: nextRows };
      setCfg(next);
      debouncedSave(next);
    }
  }, [addDataRowColumnsOriginal, cfg, debouncedSave]);

  const removeDataRowColumnsWrapped = useCallback((rowIdx: number) => {
    removeDataRowColumns(rowIdx);
    if (cfg.type === 'columns' && Array.isArray(cfg.rows)) {
      const nextRows = cfg.rows.filter((_, i) => i !== rowIdx);
      const next: TableConfig = { ...cfg, rows: nextRows };
      setCfg(next);
      debouncedSave(next);
    }
  }, [removeDataRowColumns, cfg, debouncedSave]);

  const addRow = useCallback(() => {
    if (cfg.type !== 'matrix') return;
    const nextRows = [...(cfg.rows || []), `Ligne ${(cfg.rows?.length || 0) + 1}`];
    const width = (cfg.columns || []).length;
    const nextData = ensureDataHeight(cfg.data, nextRows.length, width);
    const next: TableConfig = { ...cfg, rows: nextRows, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave, ensureDataHeight]);

  const removeRow = useCallback((idx: number) => {
    if (cfg.type !== 'matrix') return;
    const nextRows = (cfg.rows || []).filter((_, i) => i !== idx);
    let nextData = cfg.data;
    if (Array.isArray(cfg.data)) nextData = cfg.data.filter((_, i) => i !== idx);
    const next: TableConfig = { ...cfg, rows: nextRows, data: nextData };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  const renameRow = useCallback((idx: number, val: string) => {
    if (cfg.type !== 'matrix') return;
    const nextRows = [...(cfg.rows || [])];
    nextRows[idx] = val;
    const next: TableConfig = { ...cfg, rows: nextRows };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  // Édition cellules (matrix)
  const setCellMatrix = useCallback((rowIdx: number, colIdx: number, raw: string) => {
    if (cfg.type !== 'matrix') return;
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

  const generateSelects = useCallback(async () => {
    try {
      const res = await api.post(`/api/treebranchleaf/nodes/${nodeId}/table/generate-selects`, {});
      const count = Array.isArray(res?.created) ? res.created.length : 0;
      message.success(`${count} champ(s) créé(s)`);
    } catch {
      message.error('Impossible de générer les champs dépendants');
    }
  }, [api, nodeId]);

  const refreshLookup = useCallback(async () => {
    if (cfg.type !== 'matrix' || !testCol || !testRow) return;
    try {
      const res = await api.get(`/api/treebranchleaf/nodes/${nodeId}/table/lookup`, { params: { column: testCol, row: testRow } });
      setLookupValue(res?.value);
    } catch {
      setLookupValue(undefined);
    }
  }, [api, cfg.type, nodeId, testCol, testRow]);

  // aperçu matrix non utilisé depuis passage en édition inline
  const matrixEditableColumns = useMemo(() => {
    if (cfg.type !== 'matrix') return [] as { title: React.ReactNode; dataIndex: string; key: string; fixed?: 'left'; render?: (a: unknown, b: unknown, rIdx: number) => React.ReactNode }[];
    const firstCol = {
      title: 'Ligne',
      dataIndex: 'row',
      key: 'row',
      fixed: 'left' as const,
      render: (_: unknown, __: unknown, rIdx: number) => (
        <Input size="small" value={(cfg.rows || [])[rIdx] || ''} onChange={(e) => renameRow(rIdx, e.target.value)} disabled={readOnly} />
      )
    };
    const rest = (cfg.columns || []).map((c, cIdx) => ({
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
    const newInstance: TableInstance = {
      id: `temp_${Date.now()}`,
      name: `Tableau ${instances.length + 1}`,
      description: '',
      type: 'columns',
      columns: [],
      rows: [],
      data: { matrix: [] },
      meta: {},
      order: instances.length
    };
    
    setInstances(prev => [...prev, newInstance]);
    setActiveId(newInstance.id);
    setCfg({ type: 'columns', columns: [] });
  }, [instances]);

  const deleteTableInstance = useCallback(async () => {
    if (!activeId || instances.length <= 1) return;
    
    const userConfirmed = window.confirm(
      `Supprimer définitivement cette instance de tableau ?`
    );
    
    if (!userConfirmed) return;
    
    try {
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
        // Convertir vers l'ancien format pour compatibilité
        const legacyConfig: TableConfig = {
          type: (nextActive.type as 'columns' | 'matrix') || 'columns',
          columns: Array.isArray(nextActive.columns) ? nextActive.columns.map(String) : [],
          rows: Array.isArray(nextActive.rows) ? nextActive.rows.map(String) : undefined,
          data: Array.isArray((nextActive.data as Record<string, unknown>)?.matrix) ? (nextActive.data as Record<string, unknown>).matrix as (number | string | null)[][] : undefined,
          meta: nextActive.meta || {},
        };
        setCfg(legacyConfig);
      } else {
        setCfg({ type: 'columns', columns: [] });
      }
      
      message.success('Instance supprimée');
    } catch (error) {
      console.error('🗂️ TablePanel: Erreur suppression instance:', error);
      message.error('Impossible de supprimer l\'instance');
    }
  }, [activeId, instances, api, nodeId]);

  // Gestionnaire de changement de type
  const onTypeChange = useCallback((type: 'columns' | 'matrix') => {
    const next: TableConfig = { ...cfg, type };
    setCfg(next);
    debouncedSave(next);
  }, [cfg, debouncedSave]);

  // Gestionnaire de sélection de fichier
  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
      
      // Déterminer le type automatiquement
      const hasHeaders = jsonData.length > 1;
      const type: 'columns' | 'matrix' = hasHeaders && jsonData[0].length > 1 ? 'matrix' : 'columns';
      
      let columns: string[] = [];
      let rows: string[] | undefined;
      let tableData: (number | string | null)[][] = [];
      
      if (type === 'matrix') {
        // Mode matrix: première ligne = colonnes, première colonne = lignes
        columns = jsonData[0].slice(1).map((col, idx) => 
          typeof col === 'string' ? col : `Colonne ${idx + 1}`
        );
        rows = jsonData.slice(1).map((row, idx) => 
          typeof row[0] === 'string' ? row[0] : `Ligne ${idx + 1}`
        );
        tableData = jsonData.slice(1).map(row => row.slice(1));
      } else {
        // Mode columns: chaque colonne = une série de données
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
      message.success(`Fichier importé: ${jsonData.length - 1} lignes`);
    } catch (error) {
      console.error('🗂️ TablePanel: Erreur import fichier:', error);
      message.error('Erreur lors de l\'import du fichier');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [cfg, debouncedSave]);

  return (
    <Card size="small" bordered>
      <Title level={5}>🧩 Tableau</Title>
      {/* Multi‑instances */}
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
              // Convertir vers l'ancien format pour compatibilité
              const legacyConfig: TableConfig = {
                type: (selectedInstance.type as 'columns' | 'matrix') || 'columns',
                columns: Array.isArray(selectedInstance.columns) ? selectedInstance.columns.map(String) : [],
                rows: Array.isArray(selectedInstance.rows) ? selectedInstance.rows.map(String) : undefined,
                data: Array.isArray((selectedInstance.data as Record<string, unknown>)?.matrix) ? (selectedInstance.data as Record<string, unknown>).matrix as (number | string | null)[][] : undefined,
                meta: selectedInstance.meta || {},
              };
              setCfg(legacyConfig);
            }
          }}
          placeholder="Sélectionner une instance"
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
      
      {/* Nom de l'instance et résumé test */}
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
            
            // Mettre à jour le nom dans la base si ce n'est pas temporaire
            if (activeId && !activeId.startsWith('temp_')) {
              try {
                await api.put(`/api/treebranchleaf/nodes/${nodeId}/tables/${activeId}`, { name });
              } catch (error) {
                console.error('🗂️ TablePanel: Erreur mise à jour nom:', error);
              }
            }
          }}
          disabled={readOnly}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Text type="secondary">
            Résumé: {cfg.type === 'matrix' ? `${cfg.rows?.length || 0} lignes × ${cfg.columns.length} colonnes` : `${cfg.columns.length} colonnes`}
          </Text>
        </div>
      </div>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Libellé du tableau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <Text strong>Libellé du tableau:</Text>
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
          <Tooltip title="Ce libellé sert de nom humainement lisible au tableau. Il est enregistré dans Prisma (tableConfig.meta.name).">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <Text strong>Type:</Text>
          <Radio.Group disabled={readOnly} value={cfg.type} onChange={(e) => onTypeChange(e.target.value)}>
            <Radio.Button value="columns">Colonnes</Radio.Button>
            <Radio.Button value="matrix">Croisé (lignes × colonnes)</Radio.Button>
          </Radio.Group>
          <Button onClick={triggerFilePicker} disabled={readOnly}>Importer Excel/CSV (fichier)</Button>
          <Space size={4}>
            <Button onClick={generateSelects} disabled={readOnly}>
              Créer champs de sélection (à partir du tableau)
            </Button>
            <Tooltip title="Crée automatiquement un ou deux champs 'liste déroulante' liés à ce tableau: en mode Colonnes → 1 champ (colonnes). En mode Croisé → 2 champs (colonnes et lignes). Ces champs se remplissent dynamiquement depuis le tableau.">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
  </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />

        {cfg.type === 'columns' && (
          <>
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

            <Divider style={{ margin: '8px 0' }} />
            <Text strong>Lignes</Text>
            <Space direction="vertical" style={{ width: '100%' }}>
              {(cfg.rows || []).map((r, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8 }}>
                  <Input
                    size="small"
                    value={r}
                    placeholder={`Ligne ${idx + 1}`}
                    onChange={(e) => renameRowLabelColumns(idx, e.target.value)}
                    disabled={readOnly}
                  />
                  <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removeRowLabelColumns(idx)} disabled={readOnly} />
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={addRowLabelColumns} size="small" disabled={readOnly}>Ajouter une ligne</Button>
            </Space>

            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong>Lignes de données</Text>
              <Button icon={<PlusOutlined />} size="small" onClick={addDataRowColumnsWrapped} disabled={readOnly}>Ajouter une ligne</Button>
            </div>
            <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <Table
                size="small"
                sticky
                pagination={false}
                scroll={{ x: true }}
                columns={[
                  ...(cfg.columns || []).map((c, cIdx) => ({
                    title: c,
                    dataIndex: String(cIdx),
                    key: String(cIdx),
                    render: (_: unknown, __: unknown, rIdx: number) => (
                      <Input
                        size="small"
                        value={(cfg.data?.[rIdx]?.[cIdx] ?? '') as string | number}
                        onChange={(e) => setCellColumns(rIdx, cIdx, e.target.value)}
                        disabled={readOnly}
                      />
                    )
                  })),
                  {
                    title: '',
                    key: 'actions',
                    fixed: 'right' as const,
                    width: 48,
                    render: (_: unknown, __: unknown, rIdx: number) => (
                      <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removeDataRowColumnsWrapped(rIdx)} disabled={readOnly} />
                    )
                  }
                ]}
                dataSource={(cfg.data || []).map((row, rIdx) => ({ key: String(rIdx) }))}
              />
            </div>
          </>
        )}

        {cfg.type === 'matrix' && (
          <>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                <div style={{ minWidth: 260, flex: 1 }}>
                  <Text strong>Colonnes</Text>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {(cfg.columns || []).map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8 }}>
                        <Input size="small" value={c} placeholder={`Colonne ${idx + 1}`} onChange={(e) => renameColumn(idx, e.target.value)} disabled={readOnly} />
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
              <Text type="secondary">{(cfg.rows?.length || 0)} lignes × {(cfg.columns?.length || 0)} colonnes</Text>
            </Space>
      <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <Table
                size="small"
                sticky
                pagination={false}
                scroll={{ x: true }}
        columns={matrixEditableColumns}
        dataSource={(cfg.rows || []).map((_, rIdx) => ({ key: String(rIdx) }))}
              />
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              <Text strong>Tester lookup:</Text>
              <Select
                style={{ minWidth: 180 }}
                placeholder="Colonne"
                value={testCol}
                onChange={setTestCol}
                options={(cfg.columns || []).map(c => ({ value: c, label: c }))}
              />
              <Select
                style={{ minWidth: 180 }}
                placeholder="Ligne"
                value={testRow}
                onChange={setTestRow}
                options={(cfg.rows || []).map(r => ({ value: r, label: r }))}
              />
              <Button onClick={refreshLookup}>Chercher</Button>
              {lookupValue !== undefined && (
                <Text>Valeur: {String(lookupValue)}</Text>
              )}
            </div>
          </>
        )}
      </Space>

    </Card>
  );
};

export default TablePanel;
