/**
 * 📋 GestionnairePanel
 * 
 * Panneau latéral (Drawer) qui affiche les éléments exposés au Gestionnaire
 * pour un arbre TBL donné. Permet aux non-développeurs de modifier
 * les valeurs fixes et données de tableaux sans toucher au TBL editor.
 * 
 * Utilise le système d'overrides par organisation (GestionnaireOverride).
 * Les tables s'ouvrent avec le TableFullscreenEditor existant.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Space, Spin, Tag, Tooltip, Typography, message, Empty, Divider, Popconfirm } from 'antd';
import { EditOutlined, UndoOutlined, SaveOutlined, CheckCircleOutlined, FullscreenOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import TableFullscreenEditor, { type TableConfig } from '../components/Parameters/capabilities/TableFullscreenEditor';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../../lib/logger';

const { Text, Title } = Typography;

interface ExposedVariable {
  id: string;
  nodeId: string;
  displayName: string;
  gestionnaireLabel: string | null;
  fixedValue: string | null;
  unit: string | null;
  displayFormat: string | null;
  precision: number | null;
  sourceType: string;
  currentValue: string | null;
  hasOverride: boolean;
  overrideId: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
}

interface ExposedTable {
  id: string;
  nodeId: string;
  name: string;
  gestionnaireLabel: string | null;
  type: string;
  columnCount: number | null;
  rowCount: number | null;
  hasOverride: boolean;
  overrideId: string | null;
  overrideData: unknown;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
}

interface ExposedConstant {
  constId: string;
  formulaId: string;
  formulaName: string;
  nodeId: string;
  originalValue: string;
  label: string;
  customLabel: string;
  currentValue: string;
  hasOverride: boolean;
  overrideId: string | null;
}

interface GestionnairePanelProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  /** Appelé après chaque sauvegarde/suppression d'override pour déclencher un recalcul TBL */
  onOverrideSaved?: () => void;
}

const GestionnairePanel: React.FC<GestionnairePanelProps> = ({ open, onClose, treeId, onOverrideSaved }) => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [variables, setVariables] = useState<ExposedVariable[]>([]);
  const [tables, setTables] = useState<ExposedTable[]>([]);
  const [constants, setConstants] = useState<ExposedConstant[]>([]);
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);

  // 📊 État pour l'éditeur de table fullscreen
  const [tableEditorOpen, setTableEditorOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ExposedTable | null>(null);
  const [tableCfg, setTableCfg] = useState<TableConfig>({ type: 'matrix', columns: [], rows: [] });
  const [tableLoading, setTableLoading] = useState(false);

  // 📥 Ref pour l'input fichier Excel
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const pendingExcelTableRef = useRef<ExposedTable | null>(null);

  const loadExposed = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/gestionnaire/trees/${treeId}/exposed`);
      setVariables(res?.variables || []);
      setTables(res?.tables || []);
      setConstants(res?.constants || []);
    } catch (err) {
      logger.error('[GestionnairePanel] Failed to load:', err);
      message.error('Erreur lors du chargement des éléments exposés');
    } finally {
      setLoading(false);
    }
  }, [treeId, api]);

  useEffect(() => {
    if (open) {
      loadExposed();
    }
  }, [open, loadExposed]);

  // 📊 Convertir les données API en format TableConfig
  // Le TableFullscreenEditor attend:
  //   columns: string[] — noms de colonnes (col[0] = label, col[1+] = données)
  //   rows: [...] — rows[0] = header (skippé), rows[1+] = labels de lignes
  //   data: [...] — data[0] = header (vide), data[i] parallèle à rows[i]
  const apiToTableConfig = useCallback((columns: string[], apiRows: unknown[], tableName: string): TableConfig => {
    // rows[0] = header placeholder (skipped by editor), rows[1+] = row labels
    const cfgRows: (string | (string | number | null)[])[] = [
      columns[0] || 'Ligne' // Header placeholder
    ];
    // data[0] = header data (empty), data[1+] = cell values for columns[1+]
    const cfgData: (string | number | null)[][] = [[]];

    for (const cells of apiRows) {
      if (Array.isArray(cells)) {
        cfgRows.push(String(cells[0] ?? ''));
        cfgData.push(cells.slice(1).map((v: Record<string, unknown>) => v ?? null));
      } else {
        cfgRows.push(String(cells ?? ''));
        cfgData.push([]);
      }
    }

    return {
      type: 'matrix',
      columns,
      rows: cfgRows,
      data: cfgData,
      meta: { name: tableName },
    };
  }, []);

  // 📊 Ouvrir une table dans l'éditeur fullscreen
  const handleOpenTable = useCallback(async (table: ExposedTable) => {
    setEditingTable(table);
    setTableLoading(true);
    setTableEditorOpen(true);
    try {
      // Si un override existe déjà, utiliser ses données  
      if (table.hasOverride && table.overrideData) {
        const od = table.overrideData;
        setTableCfg({
          type: 'matrix',
          columns: od.columns || [],
          rows: od.rows || [],
          data: od.data || [],
          meta: { name: table.gestionnaireLabel || table.name },
        });
        setTableLoading(false);
        return;
      }

      // Sinon, charger les données de base depuis l'API
      const res = await api.get(`/api/treebranchleaf/tables/${table.id}?limit=10000`);
      
      // Extraire les noms de colonnes depuis l'API (objets {name, type, ...})
      const columns: string[] = (res.columns || []).map((c: Record<string, unknown>) => c.name || c);
      const apiRows: unknown[][] = res.rows || [];
      
      const tableName = table.gestionnaireLabel || table.name || res.name || 'Tableau';
      setTableCfg(apiToTableConfig(columns, apiRows, tableName));
    } catch (err) {
      logger.error('[GestionnairePanel] Failed to load table data:', err);
      message.error('Erreur lors du chargement des données du tableau');
      setTableEditorOpen(false);
    } finally {
      setTableLoading(false);
    }
  }, [api, apiToTableConfig]);

  // 📊 Sauvegarder les modifications de la table comme override
  const handleTableCfgChange = useCallback((newCfg: TableConfig) => {
    setTableCfg(newCfg);
  }, []);

  const handleTableEditorClose = useCallback(async () => {
    // Sauvegarder l'override avant de fermer
    if (editingTable && tableCfg.columns.length > 0) {
      try {
        await api.patch('/api/gestionnaire/override/table', {
          tableId: editingTable.id,
          nodeId: editingTable.nodeId,
          treeId,
          data: {
            columns: tableCfg.columns,
            rows: tableCfg.rows || [],
            data: tableCfg.data || [],
          },
        });
        message.success('Tableau sauvegardé');
        await loadExposed();
        onOverrideSaved?.();
      } catch (err) {
        logger.error('[GestionnairePanel] Failed to save table override:', err);
        message.error('Erreur lors de la sauvegarde du tableau');
      }
    }
    setTableEditorOpen(false);
    setEditingTable(null);
  }, [editingTable, tableCfg, treeId, api, loadExposed, onOverrideSaved]);

  const handleSaveVariable = async (variable: ExposedVariable) => {
    setSaving(variable.id);
    try {
      await api.patch('/api/gestionnaire/override/variable', {
        variableId: variable.id,
        nodeId: variable.nodeId,
        treeId,
        value: editValue,
      });
      message.success('Valeur mise à jour');
      setEditingVar(null);
      setEditValue('');
      await loadExposed();
      onOverrideSaved?.();
    } catch (err) {
      logger.error('[GestionnairePanel] Save error:', err);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const handleRevertVariable = async (variable: ExposedVariable) => {
    if (!variable.overrideId) return;
    setSaving(variable.id);
    try {
      await api.delete(`/api/gestionnaire/override/${variable.overrideId}`);
      message.success('Override supprimé — retour à la valeur de base');
      await loadExposed();
      onOverrideSaved?.();
    } catch (err) {
      logger.error('[GestionnairePanel] Revert error:', err);
      message.error('Erreur lors de la suppression de l\'override');
    } finally {
      setSaving(null);
    }
  };

  const handleRevertTable = async (table: ExposedTable) => {
    if (!table.overrideId) return;
    setSaving(table.id);
    try {
      await api.delete(`/api/gestionnaire/override/${table.overrideId}`);
      message.success('Override supprimé — retour aux données de base');
      await loadExposed();
      onOverrideSaved?.();
    } catch (err) {
      logger.error('[GestionnairePanel] Revert table error:', err);
      message.error('Erreur lors de la suppression');
    } finally {
      setSaving(null);
    }
  };

  // 📥 Import Excel — déclencher le file picker pour un tableau spécifique
  const handleExcelImportClick = useCallback((table: ExposedTable) => {
    pendingExcelTableRef.current = table;
    if (excelInputRef.current) {
      excelInputRef.current.value = ''; // Reset pour permettre re-sélection du même fichier
      excelInputRef.current.click();
    }
  }, []);

  // 📥 Import Excel — traiter le fichier sélectionné (AJOUTE aux données existantes)
  const handleExcelFileChosen = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const table = pendingExcelTableRef.current;
    if (!file || !table) return;

    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];

      if (jsonData.length === 0) {
        message.warning('Le fichier est vide');
        return;
      }

      // 1) Charger les données actuelles de la table (override ou base)
      let currentCfg: TableConfig;
      if (table.hasOverride && table.overrideData) {
        const od = table.overrideData;
        currentCfg = {
          type: 'matrix',
          columns: od.columns || [],
          rows: od.rows || [],
          data: od.data || [],
          meta: { name: table.gestionnaireLabel || table.name },
        };
      } else {
        const res = await api.get(`/api/treebranchleaf/tables/${table.id}?limit=10000`);
        const columns: string[] = (res.columns || []).map((c: Record<string, unknown>) => c.name || c);
        const apiRows: unknown[][] = res.rows || [];
        const tableName = table.gestionnaireLabel || table.name || res.name || 'Tableau';
        currentCfg = apiToTableConfig(columns, apiRows, tableName);
      }

      // 2) Parser l'Excel : 1ère ligne = en-têtes (ignorée), lignes suivantes = données à ajouter
      const excelHeaders = jsonData[0];
      const excelDataRows = jsonData.slice(1); // Ignorer la ligne d'en-têtes

      if (excelDataRows.length === 0) {
        message.warning('Le fichier ne contient pas de lignes de données (seulement des en-têtes)');
        return;
      }

      // 3) Mapper les colonnes Excel → colonnes existantes
      //    En-tête Excel "Nom" → index dans columns existantes
      const existingCols = currentCfg.columns || [];
      const colMapping: (number | null)[] = []; // Pour chaque colonne Excel, l'index dans existingCols (ou null si pas trouvé)
      for (let eIdx = 0; eIdx < excelHeaders.length; eIdx++) {
        const excelColName = String(excelHeaders[eIdx] ?? '').trim().toLowerCase();
        const matchIdx = existingCols.findIndex(c => c.trim().toLowerCase() === excelColName);
        colMapping.push(matchIdx >= 0 ? matchIdx : null);
      }

      // 4) Ajouter les lignes Excel aux données existantes
      const newRows = [...(currentCfg.rows || [])];
      const newData = [...(currentCfg.data || [])];
      const dataColCount = existingCols.length > 1 ? existingCols.length - 1 : 0; // Colonnes de data (sans la colonne label)

      let addedCount = 0;
      for (const excelRow of excelDataRows) {
        // La première colonne Excel = label de la ligne (colonne 0 du tableau)
        const label = String(excelRow[0] ?? '');
        newRows.push(label);

        // Construire la ligne de données pour les colonnes 1+
        const dataRow: (string | number | null)[] = new Array(dataColCount).fill(null);
        for (let eIdx = 0; eIdx < excelRow.length; eIdx++) {
          const targetCol = colMapping[eIdx];
          if (targetCol !== null && targetCol > 0) {
            // targetCol est l'index dans columns, data utilise targetCol - 1 (car col 0 = labels)
            dataRow[targetCol - 1] = excelRow[eIdx] ?? null;
          }
        }
        newData.push(dataRow);
        addedCount++;
      }

      const mergedCfg: TableConfig = {
        ...currentCfg,
        rows: newRows,
        data: newData,
      };

      // Ouvrir l'éditeur avec les données fusionnées
      setEditingTable(table);
      setTableCfg(mergedCfg);
      setTableEditorOpen(true);
      message.success(`${addedCount} ligne(s) ajoutée(s) depuis "${file.name}"`);
    } catch (err) {
      logger.error('[GestionnairePanel] Excel import error:', err);
      message.error('Erreur lors de l\'import du fichier Excel');
    }
  }, [api, apiToTableConfig]);

  // 📋 Sauvegarder un override de constante de formule
  const handleSaveConstant = async (constant: ExposedConstant) => {
    setSaving(constant.constId);
    try {
      await api.patch('/api/gestionnaire/override/constant', {
        constId: constant.constId,
        nodeId: constant.nodeId,
        treeId,
        value: editValue,
      });
      message.success('Valeur mise à jour');
      setEditingVar(null);
      setEditValue('');
      await loadExposed();
      onOverrideSaved?.();
    } catch (err) {
      logger.error('[GestionnairePanel] Save constant error:', err);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const handleRevertConstant = async (constant: ExposedConstant) => {
    if (!constant.overrideId) return;
    setSaving(constant.constId);
    try {
      await api.delete(`/api/gestionnaire/override/${constant.overrideId}`);
      message.success('Override supprimé — retour à la valeur de base');
      await loadExposed();
      onOverrideSaved?.();
    } catch (err) {
      logger.error('[GestionnairePanel] Revert constant error:', err);
      message.error('Erreur lors de la suppression');
    } finally {
      setSaving(null);
    }
  };

  // Sauvegarder un label personnalisé pour une constante
  const handleSaveLabel = async (constant: ExposedConstant) => {
    setSaving(constant.constId);
    try {
      await api.patch('/api/gestionnaire/override/constant', {
        constId: constant.constId,
        nodeId: constant.nodeId,
        treeId,
        label: editLabelValue,
      });
      message.success('Libellé mis à jour');
      setEditingLabel(null);
      setEditLabelValue('');
      await loadExposed();
    } catch (err) {
      logger.error('[GestionnairePanel] Save label error:', err);
      message.error('Erreur lors de la sauvegarde du libellé');
    } finally {
      setSaving(null);
    }
  };

  // Supprimer entièrement une constante du Gestionnaire (remet le nombre brut dans la formule)
  const handleDeleteConstant = async (constant: ExposedConstant) => {
    setSaving(constant.constId);
    try {
      await api.delete(`/api/gestionnaire/constant/${constant.constId}`);
      message.success('Constante retirée du Gestionnaire');
      await loadExposed();
      onOverrideSaved?.();
    } catch (err) {
      logger.error('[GestionnairePanel] Delete constant error:', err);
      message.error('Erreur lors de la suppression');
    } finally {
      setSaving(null);
    }
  };

  const isEmpty = variables.length === 0 && tables.length === 0 && constants.length === 0;

  return (
    <>
    <Drawer
      title={
        <Space>
          <span style={{ fontSize: 20 }}>📋</span>
          <span>Gestionnaire</span>
        </Space>
      }
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      extra={
        <Button size="small" onClick={loadExposed} loading={loading}>
          Rafraîchir
        </Button>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Chargement des éléments exposés...</Text>
          </div>
        </div>
      ) : isEmpty ? (
        <Empty
          description={
            <div>
              <Text>Aucun élément n'est exposé au Gestionnaire pour cet arbre.</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Pour exposer des éléments, double-cliquez sur un token dans une formule
                ou cochez "Exposer dans le Gestionnaire" dans un tableau.
              </Text>
            </div>
          }
        />
      ) : (
        <div>
          {/* ── Variables exposées ── */}
          {variables.length > 0 && (
            <>
              <Title level={5} style={{ marginBottom: 12 }}>
                🔢 Valeurs fixes ({variables.length})
              </Title>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {variables.map(v => (
                  <div
                    key={v.id}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      backgroundColor: v.hasOverride ? '#f6ffed' : '#fafafa',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div>
                        <Text strong>{v.gestionnaireLabel || v.displayName || 'Variable'}</Text>
                        {v.unit && <Text type="secondary" style={{ marginLeft: 6 }}>({v.unit})</Text>}
                      </div>
                      <div>
                        {v.hasOverride && (
                          <Tag color="green" style={{ marginRight: 4 }}>
                            <CheckCircleOutlined /> Override
                          </Tag>
                        )}
                        {!v.hasOverride && (
                          <Tag color="default">Base TBL</Tag>
                        )}
                      </div>
                    </div>

                    {editingVar === v.id ? (
                      <Space style={{ width: '100%' }}>
                        <Input
                          size="small"
                          style={{ width: 200 }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onPressEnter={() => handleSaveVariable(v)}
                          autoFocus
                          placeholder="Nouvelle valeur"
                        />
                        <Button
                          size="small"
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={() => handleSaveVariable(v)}
                          loading={saving === v.id}
                        >
                          OK
                        </Button>
                        <Button
                          size="small"
                          onClick={() => { setEditingVar(null); setEditValue(''); }}
                        >
                          Annuler
                        </Button>
                      </Space>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 600 }}>
                          {v.currentValue ?? v.fixedValue ?? '—'}
                          {v.unit ? ` ${v.unit}` : ''}
                        </Text>
                        <Space size="small">
                          <Tooltip title="Modifier la valeur">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingVar(v.id);
                                setEditValue(v.currentValue ?? v.fixedValue ?? '');
                              }}
                            />
                          </Tooltip>
                          {v.hasOverride && (
                            <Popconfirm
                              title="Revenir à la valeur de base TBL ?"
                              onConfirm={() => handleRevertVariable(v)}
                              okText={t('common.yes')}
                              cancelText={t('common.no')}
                            >
                              <Tooltip title="Revenir à la valeur de base">
                                <Button
                                  size="small"
                                  icon={<UndoOutlined />}
                                  danger
                                  loading={saving === v.id}
                                />
                              </Tooltip>
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                    )}

                    {v.hasOverride && v.fixedValue && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        Valeur de base TBL : {v.fixedValue}{v.unit ? ` ${v.unit}` : ''}
                      </Text>
                    )}
                  </div>
                ))}
              </Space>
            </>
          )}

          {/* ── Séparateur ── */}
          {variables.length > 0 && tables.length > 0 && (
            <Divider />
          )}

          {/* ── Tables exposées ── */}
          {tables.length > 0 && (
            <>
              <Title level={5} style={{ marginBottom: 12 }}>
                📊 Tableaux ({tables.length})
              </Title>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {tables.map(t => (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      backgroundColor: t.hasOverride ? '#f6ffed' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    role="button" tabIndex={0} onClick={() => handleOpenTable(t)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div>
                        <Text strong>{t.gestionnaireLabel || t.name || 'Tableau'}</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          {t.rowCount || '?'} lignes × {t.columnCount || '?'} colonnes
                        </Text>
                      </div>
                      <div>
                        {t.hasOverride && (
                          <Tag color="green" style={{ marginRight: 4 }}>
                            <CheckCircleOutlined /> Override
                          </Tag>
                        )}
                        {!t.hasOverride && (
                          <Tag color="default">Base TBL</Tag>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <Button
                        size="small"
                        type="primary"
                        icon={<FullscreenOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleOpenTable(t); }}
                      >
                        Ouvrir et modifier
                      </Button>
                      <Button
                        size="small"
                        icon={<UploadOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleExcelImportClick(t); }}
                      >
                        Importer Excel
                      </Button>
                      {t.hasOverride && (
                        <Popconfirm
                          title="Revenir aux données de base TBL ?"
                          onConfirm={(e) => { e?.stopPropagation(); handleRevertTable(t); }}
                          onCancel={(e) => e?.stopPropagation()}
                          okText={t('common.yes')}
                          cancelText={t('common.no')}
                        >
                          <Button
                            size="small"
                            icon={<UndoOutlined />}
                            danger
                            loading={saving === t.id}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Réinitialiser
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                ))}
              </Space>
            </>
          )}

          {/* ── Constantes de formule exposées ── */}
          {constants.length > 0 && (
            <>
              {(variables.length > 0 || tables.length > 0) && <Divider />}
              <Title level={5} style={{ marginBottom: 12 }}>
                🔢 Constantes de formule ({constants.length})
              </Title>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {constants.map(c => (
                  <div
                    key={c.constId}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      backgroundColor: c.hasOverride ? '#f6ffed' : '#fafafa',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* ── Label (éditable) ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingLabel === c.constId ? (
                          <Space size="small">
                            <Input
                              size="small"
                              style={{ width: 220 }}
                              value={editLabelValue}
                              onChange={(e) => setEditLabelValue(e.target.value)}
                              onPressEnter={() => handleSaveLabel(c)}
                              autoFocus
                              placeholder="Libellé personnalisé"
                            />
                            <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveLabel(c)} loading={saving === c.constId}>OK</Button>
                            <Button size="small" onClick={() => { setEditingLabel(null); setEditLabelValue(''); }}>Annuler</Button>
                          </Space>
                        ) : (
                          <span
                            style={{ cursor: 'pointer' }}
                            role="button" tabIndex={0} onClick={() => { setEditingLabel(c.constId); setEditLabelValue(c.customLabel || ''); }}
                            title="Cliquer pour modifier le libellé"
                          >
                            <Text strong>{c.label}</Text>
                            <EditOutlined style={{ marginLeft: 6, fontSize: 11, color: '#999' }} />
                          </span>
                        )}
                        <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>(base: {c.originalValue})</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.hasOverride && (
                          <Tag color="green" style={{ marginRight: 0 }}>
                            <CheckCircleOutlined /> Override
                          </Tag>
                        )}
                        {!c.hasOverride && (
                          <Tag color="default">Base</Tag>
                        )}
                        <Popconfirm
                          title="Retirer cette constante du Gestionnaire ?"
                          description="Le nombre sera remis tel quel dans la formule."
                          onConfirm={() => handleDeleteConstant(c)}
                          okText={t('common.delete')}
                          cancelText={t('common.no')}
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Retirer du Gestionnaire">
                            <Button
                              size="small"
                              icon={<DeleteOutlined />}
                              danger
                              type="text"
                              loading={saving === c.constId}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>

                    {/* ── Valeur (éditable) ── */}
                    {editingVar === c.constId ? (
                      <Space style={{ width: '100%' }}>
                        <InputNumber
                          size="small"
                          style={{ width: 200 }}
                          value={editValue ? parseFloat(editValue) : undefined}
                          onChange={(val) => setEditValue(val != null ? String(val) : '')}
                          onPressEnter={() => handleSaveConstant(c)}
                          autoFocus
                          placeholder="Nouvelle valeur"
                          step={0.01}
                        />
                        <Button
                          size="small"
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={() => handleSaveConstant(c)}
                          loading={saving === c.constId}
                        >
                          OK
                        </Button>
                        <Button
                          size="small"
                          onClick={() => { setEditingVar(null); setEditValue(''); }}
                        >
                          Annuler
                        </Button>
                      </Space>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 600 }}>
                          {c.currentValue}
                        </Text>
                        <Space size="small">
                          <Tooltip title="Modifier la valeur">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingVar(c.constId);
                                setEditValue(c.currentValue);
                              }}
                            />
                          </Tooltip>
                          {c.hasOverride && (
                            <Popconfirm
                              title={`Revenir à la valeur de base (${c.originalValue}) ?`}
                              onConfirm={() => handleRevertConstant(c)}
                              okText={t('common.yes')}
                              cancelText={t('common.no')}
                            >
                              <Tooltip title="Revenir à la valeur de base">
                                <Button
                                  size="small"
                                  icon={<UndoOutlined />}
                                  danger
                                  loading={saving === c.constId}
                                />
                              </Tooltip>
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                    )}
                  </div>
                ))}
              </Space>
            </>
          )}
        </div>
      )}
    </Drawer>

    {/* 📊 Éditeur de table fullscreen (réutilisation du composant existant) */}
    <TableFullscreenEditor
      open={tableEditorOpen}
      onClose={handleTableEditorClose}
      cfg={tableLoading ? { type: 'matrix', columns: [], rows: [] } : tableCfg}
      onCfgChange={handleTableCfgChange}
      readOnly={false}
      tableName={editingTable?.gestionnaireLabel || editingTable?.name || 'Tableau Gestionnaire'}
    />

    {/* 📥 Input fichier caché pour import Excel */}
    <input
      ref={excelInputRef}
      type="file"
      accept=".xlsx,.xls,.csv"
      style={{ display: 'none' }}
      onChange={handleExcelFileChosen}
    />
    </>
  );
};

export default GestionnairePanel;
