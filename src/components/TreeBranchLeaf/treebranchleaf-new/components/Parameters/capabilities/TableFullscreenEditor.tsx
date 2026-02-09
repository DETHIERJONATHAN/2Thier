/**
 * 📊 TableFullscreenEditor - Éditeur de tableau plein écran
 * 
 * Modal plein écran permettant :
 * - Visualisation complète du tableau (scrollable)
 * - Édition inline de chaque cellule
 * - Ajout/suppression de lignes
 * - Ajout/suppression de colonnes
 * - Renommage des en-têtes de colonnes
 * - Sauvegarde automatique (debounced)
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Modal, Button, Input, Tooltip, Typography, Popconfirm, Space } from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  FullscreenOutlined,
  SaveOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ─── Types ──────────────────────────────────────────────────────────────────

export type TableConfig = {
  type: 'columns' | 'matrix';
  columns: string[];
  rows?: (string | (string | number | null)[])[];
  data?: (number | string | null)[][];
  meta?: Record<string, unknown>;
  isImported?: boolean;
  importSource?: string;
};

interface TableFullscreenEditorProps {
  open: boolean;
  onClose: () => void;
  cfg: TableConfig;
  onCfgChange: (newCfg: TableConfig) => void;
  readOnly?: boolean;
  tableName?: string;
}

// ─── Composant cellule éditable ─────────────────────────────────────────────

const EditableCell: React.FC<{
  value: string | number | null;
  onChange: (val: string) => void;
  readOnly?: boolean;
  isHeader?: boolean;
  isRowLabel?: boolean;
}> = React.memo(({ value, onChange, readOnly, isHeader, isRowLabel }) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value ?? ''));
  const inputRef = useRef<any>(null);

  useEffect(() => {
    setLocalVal(String(value ?? ''));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (localVal !== String(value ?? '')) {
      onChange(localVal);
    }
  }, [localVal, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setLocalVal(String(value ?? ''));
      setEditing(false);
    }
  }, [value]);

  if (readOnly) {
    return (
      <div
        style={{
          padding: '4px 8px',
          minHeight: 28,
          fontWeight: isHeader ? 600 : isRowLabel ? 500 : 400,
          background: isHeader ? '#fafafa' : isRowLabel ? '#f9f9f9' : 'transparent',
          color: isHeader ? '#1a1a1a' : '#333',
          fontSize: isHeader ? 12 : 13,
        }}
      >
        {String(value ?? '')}
      </div>
    );
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{
          padding: '4px 8px',
          minHeight: 28,
          cursor: 'pointer',
          borderRadius: 3,
          fontWeight: isHeader ? 600 : isRowLabel ? 500 : 400,
          background: isHeader ? '#fafafa' : isRowLabel ? '#f9f9f9' : 'transparent',
          color: isHeader ? '#1a1a1a' : '#333',
          fontSize: isHeader ? 12 : 13,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget.style.background = '#e6f7ff'); }}
        onMouseLeave={(e) => { (e.currentTarget.style.background = isHeader ? '#fafafa' : isRowLabel ? '#f9f9f9' : 'transparent'); }}
        title="Cliquer pour éditer"
      >
        {String(value ?? '') || <span style={{ color: '#bbb', fontStyle: 'italic' }}>vide</span>}
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      size="small"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        width: '100%',
        fontWeight: isHeader ? 600 : isRowLabel ? 500 : 400,
        fontSize: isHeader ? 12 : 13,
      }}
    />
  );
});

EditableCell.displayName = 'EditableCell';

// ─── Composant principal ────────────────────────────────────────────────────

const TableFullscreenEditor: React.FC<TableFullscreenEditorProps> = ({
  open,
  onClose,
  cfg,
  onCfgChange,
  readOnly = false,
  tableName,
}) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Indicateur de sauvegarde
  const triggerSave = useCallback((newCfg: TableConfig) => {
    setSaveStatus('saving');
    onCfgChange(newCfg);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveStatus('saved'), 1200);
  }, [onCfgChange]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ─── Parse value ────────────────────────────────────────────────────────
  const parseVal = useCallback((s: string): number | string | null => {
    const trimmed = s.trim();
    if (trimmed === '') return null;
    const isNumLike = /^[-+]?\d{1,3}(?:[.,]\d+)?$/.test(trimmed);
    if (isNumLike) {
      const n = Number(trimmed.replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
    return trimmed;
  }, []);

  // ─── Rename column ─────────────────────────────────────────────────────
  const renameColumn = useCallback((colIdx: number, val: string) => {
    const nextCols = [...(cfg.columns || [])];
    nextCols[colIdx] = val;
    triggerSave({ ...cfg, columns: nextCols });
  }, [cfg, triggerSave]);

  // ─── Add column ─────────────────────────────────────────────────────────
  const addColumn = useCallback(() => {
    const nextCols = [...(cfg.columns || []), `Col ${(cfg.columns?.length || 0) + 1}`];
    const nextData = (cfg.data || []).map((row) => [...row, null]);
    triggerSave({ ...cfg, columns: nextCols, data: nextData });
  }, [cfg, triggerSave]);

  // ─── Remove column ─────────────────────────────────────────────────────
  const removeColumn = useCallback((colIdx: number) => {
    const nextCols = (cfg.columns || []).filter((_, i) => i !== colIdx);
    const nextData = (cfg.data || []).map((row) => row.filter((_, i) => i !== colIdx));
    triggerSave({ ...cfg, columns: nextCols, data: nextData });
  }, [cfg, triggerSave]);

  // ─── Rename row label ──────────────────────────────────────────────────
  const renameRow = useCallback((rowIdx: number, val: string) => {
    const nextRows = [...(cfg.rows || [])];
    nextRows[rowIdx] = val;
    triggerSave({ ...cfg, rows: nextRows });
  }, [cfg, triggerSave]);

  // ─── Add row ────────────────────────────────────────────────────────────
  const addRow = useCallback(() => {
    const width = Math.max((cfg.columns || []).length - 1, 0); // data n'inclut pas col[0]
    const nextRows = [...(cfg.rows || []), `Ligne ${(cfg.rows?.length || 0) + 1}`];
    const nextData = [...(cfg.data || []), Array.from({ length: width }, () => null as null)];
    triggerSave({ ...cfg, rows: nextRows, data: nextData });
  }, [cfg, triggerSave]);

  // ─── Remove row ─────────────────────────────────────────────────────────
  const removeRow = useCallback((rowIdx: number) => {
    const nextRows = (cfg.rows || []).filter((_, i) => i !== rowIdx);
    const nextData = (cfg.data || []).filter((_, i) => i !== rowIdx);
    triggerSave({ ...cfg, rows: nextRows, data: nextData });
  }, [cfg, triggerSave]);

  // ─── Set cell value ─────────────────────────────────────────────────────
  const setCellValue = useCallback((rowIdx: number, colIdx: number, raw: string) => {
    const v = parseVal(raw);
    const nextData = (cfg.data || []).map((row, rI) => {
      if (rI !== rowIdx) return row;
      const newRow = [...row];
      newRow[colIdx] = v;
      return newRow;
    });
    triggerSave({ ...cfg, data: nextData });
  }, [cfg, triggerSave, parseVal]);

  // ─── Build visible data ─────────────────────────────────────────────────
  // rows[0] = header row (A1), skip it for data rows
  // data[0] corresponds to rows[1]
  const columns = useMemo(() => cfg.columns || [], [cfg.columns]);
  const dataRows = useMemo(() => {
    const rows = cfg.rows || [];
    // Skip index 0 (header/A1 row) — data rows start from index 1
    return rows.slice(1).map((row, idx) => {
      const label = Array.isArray(row) ? String(row[0]) : String(row ?? '');
      return { rowIndex: idx + 1, dataIndex: idx, label };
    });
  }, [cfg.rows]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FullscreenOutlined />
          <span>Éditeur de tableau{tableName ? ` — ${tableName}` : ''}</span>
          {saveStatus === 'saving' && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
              <SaveOutlined spin /> Sauvegarde...
            </Text>
          )}
          {saveStatus === 'saved' && (
            <Text type="success" style={{ fontSize: 12, marginLeft: 'auto' }}>
              ✅ Sauvegardé
            </Text>
          )}
        </div>
      }
      width="95vw"
      style={{ top: 20 }}
      styles={{
        body: { 
          height: 'calc(100vh - 140px)', 
          overflow: 'auto', 
          padding: '12px',
        },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">
            {dataRows.length} lignes × {columns.length} colonnes
          </Text>
          <Space>
            {!readOnly && (
              <>
                <Button icon={<PlusOutlined />} onClick={addRow}>
                  Ajouter une ligne
                </Button>
                <Button icon={<ColumnWidthOutlined />} onClick={addColumn}>
                  Ajouter une colonne
                </Button>
              </>
            )}
            <Button type="primary" onClick={onClose}>
              Fermer
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100%' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            minWidth: columns.length * 120,
            fontSize: 13,
          }}
        >
          {/* ─── Header Row (Column names) ─────────────────────────────── */}
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fafafa' }}>
              {/* Numéro de ligne */}
              <th
                style={{
                  border: '1px solid #e8e8e8',
                  padding: 0,
                  width: 36,
                  textAlign: 'center',
                  background: '#f0f0f0',
                  color: '#999',
                  fontSize: 11,
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                }}
              >
                #
              </th>
              {columns.map((col, cIdx) => (
                <th
                  key={cIdx}
                  style={{
                    border: '1px solid #e8e8e8',
                    padding: 0,
                    minWidth: cIdx === 0 ? 150 : 100,
                    background: '#fafafa',
                    position: cIdx === 0 ? 'sticky' : undefined,
                    left: cIdx === 0 ? 36 : undefined,
                    zIndex: cIdx === 0 ? 3 : 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ flex: 1 }}>
                      <EditableCell
                        value={col}
                        onChange={(val) => renameColumn(cIdx, val)}
                        readOnly={readOnly}
                        isHeader
                      />
                    </div>
                    {!readOnly && columns.length > 1 && (
                      <Popconfirm
                        title={`Supprimer la colonne "${col}" ?`}
                        description="Toutes les données de cette colonne seront perdues."
                        onConfirm={() => removeColumn(cIdx)}
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          style={{ color: '#ff4d4f', opacity: 0.5 }}
                          className="hover-opacity-full"
                        />
                      </Popconfirm>
                    )}
                  </div>
                </th>
              ))}
              {/* Bouton ajouter colonne dans le header */}
              {!readOnly && (
                <th
                  style={{
                    border: '1px solid #e8e8e8',
                    padding: '4px 8px',
                    background: '#f0f0f0',
                    width: 36,
                  }}
                >
                  <Tooltip title="Ajouter une colonne">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={addColumn}
                      style={{ color: '#1890ff' }}
                    />
                  </Tooltip>
                </th>
              )}
            </tr>
          </thead>

          {/* ─── Data Rows ─────────────────────────────────────────────── */}
          <tbody>
            {dataRows.map((row) => {
              const { rowIndex, dataIndex, label } = row;
              const rowData = cfg.data?.[dataIndex] || [];

              return (
                <tr key={rowIndex} style={{ background: dataIndex % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {/* Numéro de ligne + bouton supprimer */}
                  <td
                    style={{
                      border: '1px solid #e8e8e8',
                      padding: '2px 4px',
                      textAlign: 'center',
                      background: '#f0f0f0',
                      color: '#999',
                      fontSize: 11,
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      minWidth: 36,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span>{dataIndex + 1}</span>
                      {!readOnly && (
                        <Popconfirm
                          title={`Supprimer la ligne ${dataIndex + 1} ?`}
                          description={`"${label}" sera supprimée définitivement.`}
                          onConfirm={() => removeRow(rowIndex)}
                          okText="Supprimer"
                          cancelText="Annuler"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                            style={{ color: '#ff4d4f', opacity: 0.4, padding: 0, height: 16, width: 16, minWidth: 16 }}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  </td>

                  {/* Première colonne = label de ligne */}
                  <td
                    style={{
                      border: '1px solid #e8e8e8',
                      padding: 0,
                      minWidth: 150,
                      position: 'sticky',
                      left: 36,
                      zIndex: 1,
                      background: dataIndex % 2 === 0 ? '#f9f9f9' : '#f5f5f5',
                    }}
                  >
                    <EditableCell
                      value={label}
                      onChange={(val) => renameRow(rowIndex, val)}
                      readOnly={readOnly}
                      isRowLabel
                    />
                  </td>

                  {/* Cellules de données (colonnes 1+) */}
                  {columns.slice(1).map((_, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        border: '1px solid #e8e8e8',
                        padding: 0,
                        minWidth: 100,
                        background: dataIndex % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      <EditableCell
                        value={rowData[cIdx] ?? null}
                        onChange={(val) => setCellValue(dataIndex, cIdx, val)}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}

                  {/* Cellule vide alignée avec le bouton ajouter colonne */}
                  {!readOnly && <td style={{ border: '1px solid #e8e8e8' }} />}
                </tr>
              );
            })}

            {/* ─── Bouton ajouter ligne en bas ─────────────────────────── */}
            {!readOnly && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  style={{
                    border: '1px solid #e8e8e8',
                    padding: '6px 12px',
                    background: '#f0f0f0',
                  }}
                >
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addRow}
                    style={{ width: '100%' }}
                  >
                    Ajouter une ligne
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Message si tableau vide */}
      {dataRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Le tableau est vide. Importez un fichier Excel ou ajoutez des lignes et colonnes.
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default TableFullscreenEditor;
