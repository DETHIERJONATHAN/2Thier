import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Alert } from 'antd';
import { useAuthenticatedApi } from '../../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../../hooks/useDebouncedCallback';
import { FieldAppearancePanels } from '../../../../core/registry';

const { Title, Text } = Typography;

export interface AppearanceHostProps {
  treeId: string;
  nodeId: string;
  fieldType: string; // ex: 'TEXT', 'NUMBER' ...
  value?: Record<string, unknown>;
  existingMetadata?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
  /**
   * Scope d'apparence pour séparation O+C:
   * - 'option' → sauvegarde dans metadata.option.appearance
   * - 'field' → sauvegarde dans metadata.field.appearance
   * - undefined (par défaut) → metadata.appearance
   */
  appearanceScope?: 'option' | 'field';
}

export const AppearanceHost: React.FC<AppearanceHostProps> = ({ treeId, nodeId, fieldType, value, existingMetadata, onChange, readOnly, appearanceScope }) => {
  const { api } = useAuthenticatedApi();
  const [config, setConfig] = useState<Record<string, unknown>>(value || {});
  // Aucun chargement distant pour l'instant

  // Chargement initial si pas de value
  useEffect(() => {
    if (value) {
      setConfig(value);
      return;
    }
    // Deriver depuis existingMetadata si value non fournie
    const md = (existingMetadata || {}) as Record<string, unknown>;
    const optionMd = (md.option as Record<string, unknown> | undefined);
    const fieldMd = (md.field as Record<string, unknown> | undefined);
    const pathVal = appearanceScope === 'option'
      ? (optionMd?.appearance as Record<string, unknown> | undefined)
      : appearanceScope === 'field'
      ? (fieldMd?.appearance as Record<string, unknown> | undefined)
      : (md.appearance as Record<string, unknown> | undefined);
    if (pathVal) {
      setConfig(pathVal as Record<string, unknown>);
      onChange?.(pathVal as Record<string, unknown>);
    } else {
      setConfig({});
      onChange?.({});
    }
  }, [onChange, value, existingMetadata, appearanceScope]);

  const save = useCallback(async (vals: Record<string, unknown>) => {
    try {
      // Sauvegarder dans le scope d'apparence via PUT /nodes/:id
      const base = { ...(existingMetadata || {}) } as Record<string, unknown>;
      if (appearanceScope === 'option') {
        const opt = { ...((base.option as Record<string, unknown> | undefined) || {}), appearance: vals } as Record<string, unknown>;
        const next: Record<string, unknown> = { ...base, option: opt };
        await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: next });
        onChange?.(vals);
        // Signal pour TBL de recharger les données
        localStorage.setItem('treebranchleaf-modified', treeId);
        return;
      }
      if (appearanceScope === 'field') {
        const fld = { ...((base.field as Record<string, unknown> | undefined) || {}), appearance: vals } as Record<string, unknown>;
        const next: Record<string, unknown> = { ...base, field: fld };
        await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: next });
        onChange?.(vals);
        // Signal pour TBL de recharger les données
        localStorage.setItem('treebranchleaf-modified', treeId);
        return;
      }
      const next: Record<string, unknown> = { ...base, appearance: vals };
      await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: next });
      onChange?.(vals);
      // Signal pour TBL de recharger les données
      localStorage.setItem('treebranchleaf-modified', treeId);
      return;
    } catch {
      // Feedback minimal pour ne pas gêner la saisie
    }
  }, [api, treeId, nodeId, existingMetadata, onChange, appearanceScope]);

  const debouncedSave = useDebouncedCallback(save, 400);

  const handleChange = useCallback((vals: Record<string, unknown>) => {
    setConfig(vals);
    debouncedSave(vals);
  }, [debouncedSave]);

  type LazyComp = { default: React.ComponentType<Record<string, unknown>> };
  // 🌟 NOUVEAU : Utiliser le panneau universel par défaut si aucun panneau spécialisé n'existe
  const importer = useMemo(() => {
    const specificImporter = (FieldAppearancePanels as Record<string, () => Promise<LazyComp>>)[fieldType];
    const defaultImporter = (FieldAppearancePanels as Record<string, () => Promise<LazyComp>>)['DEFAULT'];
    return specificImporter || defaultImporter;
  }, [fieldType]);

  if (!importer) {
    return (
      <Card size="small" bordered>
        <Title level={5}>🎨 Apparence</Title>
        <Alert type="error" showIcon message={<Text>❌ Erreur critique: Aucun panneau d'apparence disponible</Text>} />
      </Card>
    );
  }

  const LazyPanel = React.lazy(importer);

  return (
    <React.Suspense fallback={<Card size="small"><Text>Chargement de l'apparence…</Text></Card>}>
      <LazyPanel value={config} onChange={handleChange} readOnly={readOnly} />
    </React.Suspense>
  );
};

export default AppearanceHost;
