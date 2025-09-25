/**
 * DEPRECATION NOTICE
 * ---------------------------------------------------------------------------
 * Ce composant ancien `ConditionsPanel` est conservé provisoirement pour
 * compatibilité. Il mélange stockage dans metadata et gestion d'une seule
 * instance implicite.
 * Merci d'utiliser désormais `ConditionsPanelNew` qui :
 *  - s'appuie sur la table dédiée `treeBranchLeafNodeCondition`
 *  - supporte plusieurs instances / ordres
 *  - gère création / duplication / sauvegarde debouncée
 *  - expose onChange avec structure normalisée (activeConditionId, conditions[])
 * Ce fichier pourra être retiré après migration complète.
 */
import React, { useEffect, useState } from 'react';
import { Card, Typography, message, Button, Modal, Select, Input } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import type { ConditionSet } from '../../../types';
import ConditionsDnDComposer from './conditions/ConditionsDnDComposer';

const { Title, Text } = Typography;

interface ConditionsPanelProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type ConditionInstance = { id: string; name: string; set: ConditionSet; enabled?: boolean };

const isConditionSet = (v: unknown): v is ConditionSet => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const hasId = typeof o.id === 'string';
  const hasBranches = Array.isArray((o as { branches?: unknown }).branches || []);
  const hasMode = 'mode' in o;
  return hasId && hasBranches && hasMode;
};

const emptySet = (nodeId: string): ConditionSet => ({ id: 'cond_' + nodeId, tokens: [], mode: 'first-match', branches: [] });

const ConditionsPanel: React.FC<ConditionsPanelProps> = ({ treeId, nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const [cond, setCond] = useState<ConditionSet | null>(null);
  const [instances, setInstances] = useState<ConditionInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  // Charger conditionSet
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Charger depuis metadata si disponible
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const fromMeta = (node?.metadata as Record<string, unknown> | undefined)?.capabilities as Record<string, unknown> | undefined;
        const list = Array.isArray((fromMeta as { conditions?: unknown }).conditions)
          ? (fromMeta as { conditions?: ConditionInstance[] }).conditions!
          : [];
        if (list.length > 0) {
          if (!mounted) return;
          setInstances(list);
          setActiveId(list[0].id);
          setCond(list[0].set);
          setName(list[0].name || '');
          onChange?.({ ...(value || {}), conditionSet: list[0].set, name: list[0].name || '' });
        } else {
          const data = (await api.get(`/api/treebranchleaf/nodes/${nodeId}/conditions`)) as unknown;
          const cs = isConditionSet(data) ? (data as ConditionSet) : emptySet(nodeId);
          const first: ConditionInstance = { id: `cond_${Date.now()}`, name: 'Conditions 1', set: cs };
          if (!mounted) return;
          setInstances([first]);
          setActiveId(first.id);
          setCond(cs);
          setName(first.name);
          if (treeId) {
            try {
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, conditions: [first] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
          onChange?.({ ...(value || {}), conditionSet: cs, name: first.name });
        }
      } catch {
        setCond(emptySet(nodeId));
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, onChange, value, treeId]);

  // Sauvegarde debouncée
  const saveConditionSet = useDebouncedCallback(async (next: ConditionSet) => {
    try {
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/conditions`, next);
      // mettre à jour metadata instance active
      if (treeId && activeId) {
        try {
          const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
          const md = (node?.metadata || {}) as Record<string, unknown>;
          const list: ConditionInstance[] = ((md as { capabilities?: { conditions?: ConditionInstance[] } }).capabilities?.conditions) || instances;
          const updated = (list || []).map(it => it.id === activeId ? { ...it, set: next, name } : it);
          const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, conditions: updated } };
          await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
          setInstances(updated);
        } catch { /* noop */ }
      }
      onChange?.({ ...(value || {}), conditionSet: next });
    } catch {
      message.error('Erreur de sauvegarde des règles');
    }
  }, 500);

  const deleteConditions = () => {
    Modal.confirm({
      title: 'Supprimer toutes les conditions ?',
      content: 'Cette action videra les conditions et désactivera la capacité.',
      okText: 'Supprimer',
      okButtonProps: { danger: true },
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          const empty = emptySet(nodeId);
          await api.put(`/api/treebranchleaf/nodes/${nodeId}/conditions`, empty);
          try { await api.put(`/api/treebranchleaf/nodes/${nodeId}`, { hasCondition: false }); } catch { /* optional */ }
          // retirer l'instance active
          if (treeId && activeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const list: ConditionInstance[] = ((md as { capabilities?: { conditions?: ConditionInstance[] } }).capabilities?.conditions) || instances;
              const remaining = (list || []).filter(it => it.id !== activeId);
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, conditions: remaining } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
              setInstances(remaining);
              const nextActive = remaining[0] || null;
              setActiveId(nextActive ? nextActive.id : null);
              if (nextActive) {
                setCond(nextActive.set);
                setName(nextActive.name || '');
              }
            } catch { /* noop */ }
          }
          setCond(empty);
          onChange?.({ ...(value || {}), conditionSet: empty });
          message.success('Conditions supprimées');
        } catch {
          message.error('Impossible de supprimer les conditions');
        }
      }
    });
  };

  return (
    <Card size="small" bordered>
      <Title level={5}>⚖️ Conditions</Title>
      {/* Multi‑instances: sélection, ajout, suppression */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Instance:</Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ value: it.id, label: it.name || 'Sans nom' }))}
          onChange={(id) => {
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) { setCond(it.set); setName(it.name || ''); }
          }}
          placeholder="Sélectionner une instance"
        />
        <Button size="small" onClick={async () => {
          const id = `cond_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const it: ConditionInstance = { id, name: `Conditions ${(instances.length || 0) + 1}`, set: emptySet(nodeId) };
          const next = [...instances, it];
          setInstances(next);
          setActiveId(id);
          setCond(it.set);
          setName(it.name);
          if (treeId) {
            try {
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const prev: ConditionInstance[] = ((md as { capabilities?: { conditions?: ConditionInstance[] } }).capabilities?.conditions) || [];
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, conditions: [...prev, it] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          }
        }}>Ajouter</Button>
        <Button size="small" danger onClick={deleteConditions} disabled={!activeId}>Supprimer</Button>
      </div>

      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Nom:</Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom de l'ensemble"
          value={name}
          onChange={(e) => {
            const n = e.target.value;
            setName(n);
            // persist name in metadata if possible
            (async () => {
              if (!treeId || !activeId) return;
              try {
                const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
                const md = (node?.metadata || {}) as Record<string, unknown>;
                const list: ConditionInstance[] = ((md as { capabilities?: { conditions?: ConditionInstance[] } }).capabilities?.conditions) || instances;
                const updated = (list || []).map(it => it.id === activeId ? { ...it, name: n } : it);
                const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, conditions: updated } };
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
          <Text type="secondary">Branches: {(cond?.branches?.length ?? 0)}</Text>
        </div>
        <div style={{ marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Aperçu: règles structurées, utilisez l'éditeur ci-dessous pour modifier et tester visuellement.</Text>
        </div>
      </div>

      <ConditionsDnDComposer
        nodeId={nodeId}
        value={cond || emptySet(nodeId)}
        onChange={(next) => { setCond(next); saveConditionSet(next); }}
        readOnly={readOnly}
      />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Sauvegarde automatique activée.
      </Text>
    </Card>
  );
};

export default ConditionsPanel;
 
