import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, message, Button, Modal, Select, Input, Space } from 'antd';
import TokenDropZone from '../shared/TokenDropZone';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';

const { Title, Text } = Typography;

interface APIPanelProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type APIInstance = { id: string; name: string; bodyVars: string[]; enabled?: boolean };

const APIPanel: React.FC<APIPanelProps> = ({ treeId, nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const [bodyVars, setBodyVars] = useState<string[]>(() => (value?.bodyVars as string[]) || []);
  const [instances, setInstances] = useState<APIInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  // Chargement initial si aucune valeur n'est fournie
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Chercher des instances dans metadata
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const list: APIInstance[] = ((node?.metadata as { capabilities?: { apis?: APIInstance[] } } | undefined)?.capabilities?.apis) || [];
        if (list.length > 0) {
          if (!mounted) return;
          setInstances(list);
          setActiveId(list[0].id);
          setBodyVars(list[0].bodyVars || []);
          setName(list[0].name || '');
          onChange?.({ ...(value || {}), bodyVars: list[0].bodyVars || [], name: list[0].name || '' });
        } else {
          const data = await api.get(`/api/treebranchleaf/nodes/${nodeId}/api`);
          const initial = (data?.bodyVars as string[]) || [];
          const first: APIInstance = { id: `api_${Date.now()}`, name: 'API 1', bodyVars: initial };
          if (mounted) {
            setInstances([first]);
            setActiveId(first.id);
            setBodyVars(initial);
            setName(first.name);
          }
          if (treeId) {
            try {
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, apis: [first] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
          onChange?.({ ...(value || {}), bodyVars: initial, name: first.name });
        }
      } catch {
        // silencieux
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, onChange, value, treeId]);

  const save = useCallback(async (next: string[]) => {
    try {
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/api`, { bodyVars: next });
      // mettre à jour metadata instance active
      if (treeId && activeId) {
        try {
          const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
          const md = (node?.metadata || {}) as Record<string, unknown>;
          const list: APIInstance[] = ((md as { capabilities?: { apis?: APIInstance[] } }).capabilities?.apis) || instances;
          const updated = (list || []).map(it => it.id === activeId ? { ...it, bodyVars: next, name } : it);
          const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, apis: updated } };
          await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
          setInstances(updated);
        } catch { /* noop */ }
      }
      onChange?.({ ...(value || {}), bodyVars: next });
    } catch {
      message.error('Erreur de sauvegarde API');
    }
  }, [api, nodeId, onChange, value, treeId, activeId, instances, name]);

  const debouncedSave = useDebouncedCallback(save, 500);
  const onVarsChange = useCallback((next: string[]) => { setBodyVars(next); debouncedSave(next); }, [debouncedSave]);
  const placeholder = useMemo(() => 'Glissez ici des variables pour construire le body de la requête', []);

  const deleteApi = useCallback(() => {
    Modal.confirm({
      title: 'Supprimer la configuration API ?',
      content: 'Cette action vide la configuration et désactive la capacité.',
      okText: 'Supprimer',
      okButtonProps: { danger: true },
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.put(`/api/treebranchleaf/nodes/${nodeId}/api`, { bodyVars: [] });
          try { await api.put(`/api/treebranchleaf/nodes/${nodeId}`, { hasAPI: false }); } catch { /* optional */ }
          // retirer l'instance active
          if (treeId && activeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const list: APIInstance[] = ((md as { capabilities?: { apis?: APIInstance[] } }).capabilities?.apis) || instances;
              const remaining = (list || []).filter(it => it.id !== activeId);
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, apis: remaining } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
              setInstances(remaining);
              const nextActive = remaining[0] || null;
              setActiveId(nextActive ? nextActive.id : null);
              if (nextActive) {
                setBodyVars(nextActive.bodyVars || []);
                setName(nextActive.name || '');
              } else {
                setBodyVars([]);
                setName('');
              }
            } catch { /* noop */ }
          } else {
            setBodyVars([]);
            setName('');
          }
          onChange?.({ ...(value || {}), bodyVars: [] });
          message.success('Configuration API supprimée');
        } catch {
          message.error('Impossible de supprimer la configuration API');
        }
      },
    });
  }, [api, nodeId, onChange, value, treeId, activeId, instances]);

  return (
    <Card size="small" bordered>
      <Title level={5}>🔌 API</Title>
      {/* Multi‑instances: sélection, ajout, suppression */}
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
            if (it) { setBodyVars(it.bodyVars || []); setName(it.name || ''); }
          }}
          placeholder="Sélectionner une instance"
        />
        <Button size="small" onClick={async () => {
          const id = `api_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const it: APIInstance = { id, name: `API ${(instances.length || 0) + 1}`, bodyVars: [] };
          const next = [...instances, it];
          setInstances(next);
          setActiveId(id);
          setBodyVars([]);
          setName(it.name);
          if (treeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const prev: APIInstance[] = ((md as { capabilities?: { apis?: APIInstance[] } }).capabilities?.apis) || [];
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, apis: [...prev, it] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }}>Ajouter</Button>
        <Button size="small" danger onClick={deleteApi} disabled={!activeId}>Supprimer</Button>
      </div>

      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Typography.Text type="secondary">Nom:</Typography.Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom de l'appel API"
          value={name}
          onChange={(e) => {
            const n = e.target.value;
            setName(n);
            (async () => {
              if (!treeId || !activeId) return;
              try {
                const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
                const md = (node?.metadata || {}) as Record<string, unknown>;
                const list: APIInstance[] = ((md as { capabilities?: { apis?: APIInstance[] } }).capabilities?.apis) || instances;
                const updated = (list || []).map(it => it.id === activeId ? { ...it, name: n } : it);
                const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, apis: updated } };
                await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
                setInstances(updated);
              } catch { /* noop */ }
            })();
          }}
        />
      </div>

      {/* Résumé test */}
      <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
        <Typography.Text strong style={{ marginRight: 8 }}>Résumé test:</Typography.Text>
        <div>
          <Typography.Text type="secondary">Variables ({bodyVars.length}):</Typography.Text>
        </div>
        {bodyVars.length > 0 && (
          <Space wrap style={{ marginTop: 6 }}>
            {bodyVars.map(v => <code key={v} style={{ background: '#f6f6f6', padding: '2px 6px', borderRadius: 4 }}>{v}</code>)}
          </Space>
        )}
      </div>
      <TokenDropZone nodeId={nodeId} capability="api" label="Corps de requête (variables)" placeholder={placeholder} value={bodyVars} onChange={onVarsChange} readOnly={readOnly} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Sauvegarde automatique activée. Builder complet à venir.
      </Text>
    </Card>
  );
};

export default APIPanel;
