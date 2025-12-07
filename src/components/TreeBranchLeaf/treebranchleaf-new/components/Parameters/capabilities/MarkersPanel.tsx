import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Select, Tag, Space, message, Button, Modal, Input } from 'antd';
import type { TreeBranchLeafMarker } from '../../../types';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';

const { Title, Text } = Typography;

interface MarkersPanelProps {
  treeId?: string;
  nodeId: string;
  value?: { markerIds?: string[] } | Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type MarkersInstance = { id: string; name: string; markerIds: string[]; enabled?: boolean };

const MarkersPanel: React.FC<MarkersPanelProps> = ({ treeId, nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  type ValueShape = { markerIds?: string[] };
  const [available, setAvailable] = useState<TreeBranchLeafMarker[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (value as ValueShape)?.markerIds || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [instances, setInstances] = useState<MarkersInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  // Charger les marqueurs sélectionnés + disponibles si pas fournis
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // NOTE: Les endpoints /markers et /markers/available n'existent pas, commentés pour éviter la boucle infinie
        // Sélectionnés
        // if (!value || !Array.isArray((value as ValueShape).markerIds)) {
        //   const selected = await api.get(`/api/treebranchleaf/nodes/${nodeId}/markers`);
        //   const ids = Array.isArray(selected)
        //     ? (selected.map((m: Partial<TreeBranchLeafMarker> & { markerId?: string } | string) => {
        //         if (typeof m === 'string') return m;
        //         return m.id || m.markerId || '';
        //       }).filter(Boolean) as string[])
        //     : [];
        //   if (mounted) setSelectedIds(ids);
        //   onChange?.({ ...(value || {}), markerIds: ids });
        // }
        // Disponibles
        // const avail = await api.get(`/api/treebranchleaf/nodes/${nodeId}/markers/available`);
        // if (mounted && Array.isArray(avail)) setAvailable(avail);
  } catch {
        // silencieux (ne bloque pas le panneau)
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, onChange, value]);

  // Charger instances depuis metadata
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const list: MarkersInstance[] = ((node?.metadata as { capabilities?: { markers?: MarkersInstance[] } } | undefined)?.capabilities?.markers) || [];
        if (!mounted) return;
        if (list.length > 0) {
          setInstances(list);
          setActiveId(list[0].id);
          setSelectedIds(list[0].markerIds || []);
          setName(list[0].name || '');
          onChange?.({ ...(value as ValueShape || {}), markerIds: list[0].markerIds || [] });
        } else {
          const first: MarkersInstance = { id: `markers_${Date.now()}`, name: 'Marqueurs 1', markerIds: selectedIds || [] };
          setInstances([first]);
          setActiveId(first.id);
          setName(first.name);
          if (treeId) {
            try {
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, markers: [first] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }
      } catch {
        // noop
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, onChange, selectedIds, treeId, value]);

  const save = useCallback(async (markerIds: string[]) => {
    try {
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/markers`, { markerIds });
      onChange?.({ ...(value || {}), markerIds });
    } catch {
      message.error('Erreur de sauvegarde des marqueurs');
    }
  }, [api, nodeId, onChange, value]);

  const debouncedSave = useDebouncedCallback(save, 400);

  const onSelectChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    debouncedSave(ids);
  }, [debouncedSave]);

  // sync metadata instance sur changement
  useEffect(() => {
    (async () => {
      if (!treeId || !activeId) return;
      try {
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const md = (node?.metadata || {}) as Record<string, unknown>;
        const list: MarkersInstance[] = ((md as { capabilities?: { markers?: MarkersInstance[] } }).capabilities?.markers) || instances;
        const updated = (list || []).map(it => it.id === activeId ? { ...it, markerIds: selectedIds, name } : it);
        const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, markers: updated } };
        await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
        setInstances(updated);
      } catch { /* noop */ }
    })();
  }, [activeId, api, nodeId, selectedIds, treeId, name, instances]);

  const options = useMemo(() => {
    return (available || []).map(m => ({
      label: (
        <Space size={6}>
          <span>{m.icon || '🏷️'}</span>
          <span>{m.name}</span>
          {m.category ? <Tag color="default" style={{ marginInlineStart: 6 }}>{m.category}</Tag> : null}
        </Space>
      ),
      value: m.id,
    }));
  }, [available]);

  const selectedTags = useMemo(() => {
    const map = new Map(available.map(a => [a.id, a] as const));
    return selectedIds.map(id => map.get(id)).filter(Boolean) as TreeBranchLeafMarker[];
  }, [available, selectedIds]);

  return (
    <Card size="small" bordered loading={loading}>
      <Title level={5}>📍 Marqueurs</Title>
      {/* Multi‑instances */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Typography.Text type="secondary">Instance:</Typography.Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ value: it.id, label: it.name || 'Sans nom' }))}
          onChange={(id) => {
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) { setSelectedIds(it.markerIds || []); setName(it.name || ''); }
          }}
          placeholder="Sélectionner une instance"
        />
        <Button size="small" onClick={async () => {
          const id = `markers_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const it: MarkersInstance = { id, name: `Marqueurs ${(instances.length || 0) + 1}`, markerIds: [] };
          const next = [...instances, it];
          setInstances(next);
          setActiveId(id);
          setSelectedIds([]);
          setName(it.name);
          if (treeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const prev: MarkersInstance[] = ((md as { capabilities?: { markers?: MarkersInstance[] } }).capabilities?.markers) || [];
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, markers: [...prev, it] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }}>Ajouter</Button>
        <Button size="small" danger onClick={() => {
          Modal.confirm({
            title: 'Supprimer les marqueurs ?',
            content: 'Cette action vide la configuration et désactive la capacité.',
            okText: 'Supprimer',
            okButtonProps: { danger: true },
            cancelText: 'Annuler',
            onOk: async () => {
              try {
                await api.put(`/api/treebranchleaf/nodes/${nodeId}/markers`, { markerIds: [] });
                try { await api.put(`/api/treebranchleaf/nodes/${nodeId}`, { hasMarkers: false }); } catch { /* optional */ }
                if (treeId && activeId) {
                  try {
                    const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
                    const md = (node?.metadata || {}) as Record<string, unknown>;
                    const list: MarkersInstance[] = ((md as { capabilities?: { markers?: MarkersInstance[] } }).capabilities?.markers) || instances;
                    const remaining = (list || []).filter(it => it.id !== activeId);
                    const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, markers: remaining } };
                    await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
                    setInstances(remaining);
                    const nextActive = remaining[0] || null;
                    setActiveId(nextActive ? nextActive.id : null);
                    if (nextActive) {
                      setSelectedIds(nextActive.markerIds || []);
                      setName(nextActive.name || '');
                    } else {
                      setSelectedIds([]);
                      setName('');
                    }
                  } catch { /* noop */ }
                } else {
                  setSelectedIds([]);
                  setName('');
                }
                onChange?.({ ...(value as ValueShape || {}), markerIds: [] });
                message.success('Marqueurs supprimés');
              } catch {
                message.error('Impossible de supprimer les marqueurs');
              }
            }
          });
        }} disabled={!activeId}>Supprimer</Button>
      </div>

      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Typography.Text type="secondary">Nom:</Typography.Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom de l'ensemble de marqueurs"
          value={name}
          onChange={(e) => {
            const n = e.target.value;
            setName(n);
          }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <Button size="small" danger onClick={() => {
          Modal.confirm({
            title: 'Supprimer les marqueurs ?',
            content: 'Cette action vide la configuration et désactive la capacité.',
            okText: 'Supprimer',
            okButtonProps: { danger: true },
            cancelText: 'Annuler',
            onOk: async () => {
              try {
                await api.put(`/api/treebranchleaf/nodes/${nodeId}/markers`, { markerIds: [] });
                try { await api.put(`/api/treebranchleaf/nodes/${nodeId}`, { hasMarkers: false }); } catch { /* optional */ }
                setSelectedIds([]);
                onChange?.({ ...(value as ValueShape || {}), markerIds: [] });
                message.success('Marqueurs supprimés');
              } catch {
                message.error('Impossible de supprimer les marqueurs');
              }
            }
          });
        }}>Supprimer</Button>
      </div>
      <Select
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder="Sélectionnez des marqueurs disponibles"
        options={options}
        value={selectedIds}
        onChange={onSelectChange}
        disabled={readOnly}
        optionFilterProp="label"
      />
      <div style={{ height: 8 }} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Les marqueurs disponibles proviennent de votre organisation et/ou de l’arbre.
      </Text>
      {selectedTags.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selectedTags.map((m) => (
            <Tag key={m.id} color={m.color} bordered={!m.color}>
              <Space size={6}>
                <span>{m.icon || '🏷️'}</span>
                <span>{m.name}</span>
              </Space>
            </Tag>
          ))}
        </div>
      )}
    </Card>
  );
};

export default MarkersPanel;
