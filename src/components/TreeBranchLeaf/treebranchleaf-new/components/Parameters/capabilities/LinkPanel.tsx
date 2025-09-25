import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Select as AntdSelect, Space, Checkbox, Radio, Input, Alert, message, Button, Modal } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';

const { Title, Text } = Typography;

type LinkMode = 'JUMP' | 'APPEND_SECTION';

interface TreeLite { id: string; name: string; }
interface NodeLite { id: string; label: string; }

interface LinkConfigValue {
  targetTreeId?: string;
  targetNodeId?: string;
  mode?: LinkMode;
  carryContext?: boolean;
  params?: Record<string, string>;
}

interface LinkPanelProps {
  treeId?: string;
  nodeId: string;
  value?: LinkConfigValue | Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type LinkInstance = { id: string; name: string; config: LinkConfigValue; enabled?: boolean };

const LinkPanel: React.FC<LinkPanelProps> = ({ treeId, nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const [trees, setTrees] = useState<TreeLite[]>([]);
  const [nodes, setNodes] = useState<NodeLite[]>([]);
  const [config, setConfig] = useState<LinkConfigValue>(() => ({
    targetTreeId: (value as LinkConfigValue)?.targetTreeId,
    targetNodeId: (value as LinkConfigValue)?.targetNodeId,
    mode: (value as LinkConfigValue)?.mode || 'JUMP',
    carryContext: Boolean((value as LinkConfigValue)?.carryContext),
    params: (value as LinkConfigValue)?.params || {}
  }));
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<LinkInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  // Chargement initial: config de lien + arbres disponibles
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Multi‑instances depuis metadata
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const list: LinkInstance[] = ((node?.metadata as { capabilities?: { links?: LinkInstance[] } } | undefined)?.capabilities?.links) || [];
        if (list.length > 0) {
          const first = list[0];
          setInstances(list);
          setActiveId(first.id);
          setConfig(first.config);
          setName(first.name || '');
          onChange?.(first.config as Record<string, unknown>);
        } else {
          // Charger config si non fournie → fabriquer une instance
          const data = await api.get(`/api/treebranchleaf/nodes/${nodeId}/link`);
          if (!mounted) return;
          const initial: LinkConfigValue = {
            targetTreeId: data?.targetTreeId,
            targetNodeId: data?.targetNodeId,
            mode: (data?.mode as LinkMode) || 'JUMP',
            carryContext: Boolean(data?.carryContext),
            params: data?.params || {}
          };
          setConfig(initial);
          const first: LinkInstance = { id: `link_${Date.now()}`, name: 'Lien 1', config: initial };
          setInstances([first]);
          setActiveId(first.id);
          setName(first.name);
          if (treeId) {
            try {
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, links: [first] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
          onChange?.(initial as Record<string, unknown>);
        }
        const treesResp = await api.get(`/api/treebranchleaf/trees`);
        if (mounted && Array.isArray(treesResp)) setTrees(treesResp);
      } catch {
        // silencieux
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, onChange, value, treeId]);

  // Charger les nœuds du tree cible quand targetTreeId change
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!config.targetTreeId) { setNodes([]); return; }
      try {
        const nodesResp = await api.get(`/api/treebranchleaf/trees/${config.targetTreeId}/nodes`);
        if (mounted && Array.isArray(nodesResp)) setNodes(nodesResp);
      } catch {
        // silencieux
      }
    })();
    return () => { mounted = false; };
  }, [api, config.targetTreeId]);

  // Sauvegarde debouncée
  const save = useCallback(async (next: LinkConfigValue) => {
    // Anti-boucle simple: interdire lien vers soi-même
    if (next.targetNodeId && next.targetNodeId === nodeId) {
      message.error('Le lien ne peut pas cibler ce même nœud.');
      return;
    }
    try {
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/link`, next);
      onChange?.(next as Record<string, unknown>);
    } catch {
      message.error('Erreur de sauvegarde du lien');
    }
  }, [api, nodeId, onChange]);
  const debouncedSave = useDebouncedCallback(save, 400);

  const setField = useCallback(<K extends keyof LinkConfigValue>(key: K, value: LinkConfigValue[K]) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'targetTreeId') {
        // Reset targetNodeId si l’arbre change
        delete next.targetNodeId;
      }
      debouncedSave(next);
      return next;
  }, [debouncedSave]);

  const treeOptions = useMemo(() => trees.map(t => ({ value: t.id, label: t.name })), [trees]);
  const nodeOptions = useMemo(() => nodes.map(n => ({ value: n.id, label: n.label })), [nodes]);

  const paramsText = useMemo(() => JSON.stringify(config.params || {}, null, 2), [config.params]);
  const onParamsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value || '{}') as Record<string, string>;
      setField('params', parsed);
    } catch {
      // laisser l'utilisateur corriger, pas de message bloquant ici
    }
  }, [setField]);

  const deleteLink = useCallback(() => {
    Modal.confirm({
      title: 'Supprimer le lien ?',
      content: 'Cette action vide la configuration et désactive la capacité.',
      okText: 'Supprimer',
      okButtonProps: { danger: true },
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          const empty: LinkConfigValue = { targetTreeId: undefined, targetNodeId: undefined, mode: 'JUMP', carryContext: false, params: {} };
          await api.put(`/api/treebranchleaf/nodes/${nodeId}/link`, empty);
          try { await api.put(`/api/treebranchleaf/nodes/${nodeId}`, { hasLink: false }); } catch { /* optional */ }
          setConfig(empty);
          onChange?.(empty as Record<string, unknown>);
          message.success('Lien supprimé');
        } catch {
          message.error('Impossible de supprimer le lien');
        }
      }
  }, [api, nodeId, onChange]);

  return (
    <Card size="small" bordered loading={loading}>
      <Title level={5}>🔗 Lien</Title>
      {/* Multi‑instances */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Instance:</Text>
        <AntdSelect
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ value: it.id, label: it.name || 'Sans nom' }))}
          onChange={(id) => {
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) { setConfig(it.config); setName(it.name || ''); }
          }}
          placeholder="Sélectionner une instance"
        />
        <Button size="small" onClick={async () => {
          const id = `link_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const it: LinkInstance = { id, name: `Lien ${(instances.length || 0) + 1}`, config };
          const next = [...instances, it];
          setInstances(next);
          setActiveId(id);
          setName(it.name);
          if (treeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const prev: LinkInstance[] = ((md as { capabilities?: { links?: LinkInstance[] } }).capabilities?.links) || [];
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, links: [...prev, it] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }}>Ajouter</Button>
        <Button size="small" danger onClick={deleteLink} disabled={!activeId}>Supprimer</Button>
      </div>

      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Nom:</Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom du lien"
          value={name}
          onChange={(e) => {
            const n = e.target.value;
            setName(n);
            (async () => {
              if (!treeId || !activeId) return;
              try {
                const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
                const md = (node?.metadata || {}) as Record<string, unknown>;
                const list: LinkInstance[] = ((md as { capabilities?: { links?: LinkInstance[] } }).capabilities?.links) || instances;
                const updated = (list || []).map(it => it.id === activeId ? { ...it, name: n } : it);
                const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, links: updated } };
                await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
                setInstances(updated);
              } catch { /* noop */ }
            })();
          }}
        />
      </div>

      {/* Résumé test */}
      <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
        <Text strong style={{ marginRight: 8 }}>Résumé test:</Text>
        <div>
          <Text type="secondary">Cible: {config.targetTreeId ? `arbre ${config.targetTreeId}` : '—'} {config.targetNodeId ? `→ nœud ${config.targetNodeId}` : ''}</Text>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <Button size="small" danger onClick={deleteLink}>Supprimer</Button>
      </div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Arbre cible</Text>
          <AntdSelect
            showSearch
            placeholder="Choisir un arbre"
            options={treeOptions}
            value={config.targetTreeId}
            onChange={(v) => setField('targetTreeId', v)}
            disabled={readOnly}
            style={{ width: '100%' }}
            optionFilterProp="label"
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Nœud cible</Text>
          <AntdSelect
            showSearch
            placeholder="Choisir un nœud"
            options={nodeOptions}
            value={config.targetNodeId}
            onChange={(v) => setField('targetNodeId', v)}
            disabled={readOnly || !config.targetTreeId}
            style={{ width: '100%' }}
            optionFilterProp="label"
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Mode</Text>
          <Radio.Group
            value={config.mode}
            onChange={(e) => setField('mode', e.target.value as LinkMode)}
            disabled={readOnly}
          >
            <Radio.Button value="JUMP">Aller à</Radio.Button>
            <Radio.Button value="APPEND_SECTION">Ajouter section</Radio.Button>
          </Radio.Group>
        </div>
        <Checkbox
          checked={!!config.carryContext}
          onChange={(e) => setField('carryContext', e.target.checked)}
          disabled={readOnly}
        >
          Transporter le contexte (params/session)
        </Checkbox>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Paramètres (JSON)</Text>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder={'{\n  "leadId": "@lead.id"\n}'}
            value={paramsText}
            onChange={onParamsChange}
            disabled={readOnly}
          />
        </div>
        {config.targetNodeId === nodeId && (
          <Alert type="warning" showIcon message="Le lien ne peut pas cibler ce même nœud." />
        )}
      </Space>
    </Card>
  );
};

export default LinkPanel;
