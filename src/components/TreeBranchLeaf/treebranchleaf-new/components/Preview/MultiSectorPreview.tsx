import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Typography, Tabs, Radio, Input, InputNumber, Button, Space, Tag, Divider, message, Progress } from 'antd';
import { CheckCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../../auth/useAuth';
import type { TreeBranchLeafNode, TreeBranchLeafTree } from '../../types';

type MultiSectorPreviewProps = {
  treeId?: string;
  leadId?: string; // Contexte lead pour rattacher la soumission
};

const { Title, Text } = Typography;

function buildHierarchy(flat: TreeBranchLeafNode[]): TreeBranchLeafNode[] {
  const map = new Map<string, TreeBranchLeafNode & { children?: TreeBranchLeafNode[] }>();
  flat.forEach(n => map.set(n.id, { ...n, children: [] }));
  const roots: TreeBranchLeafNode[] = [];
  flat.forEach(n => {
    const node = map.get(n.id)!;
    if (n.parentId) {
      const parent = map.get(n.parentId);
      if (parent) (parent.children as TreeBranchLeafNode[]).push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }
  // tri par order
  const sortRec = (items: TreeBranchLeafNode[]) => {
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    items.forEach(i => {
      // @ts-expect-error children possible
      if (i.children && i.children.length) sortRec(i.children);
    });
  };
  sortRec(roots);
  return roots;
}

export default function MultiSectorPreview({ treeId, leadId }: MultiSectorPreviewProps) {
  const { api } = useAuthenticatedApi();
  const { user, currentOrganization } = useAuth();

  const [tree, setTree] = useState<TreeBranchLeafTree | null>(null);
  const [nodes, setNodes] = useState<TreeBranchLeafNode[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [lead, setLead] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Charger lead si fourni
  useEffect(() => {
    if (!leadId) return;
    (async () => {
      try {
        const data = await api.get(`/api/leads/${leadId}`);
        setLead(data);
      } catch (e) {
        // silencieux
      }
    })();
  }, [api, leadId]);

  // Charger l'arbre + nœuds pour l'orga courante
  useEffect(() => {
    (async () => {
      try {
        let t: TreeBranchLeafTree | null = null;
        if (treeId) {
          t = await api.get(`/api/treebranchleaf/trees/${treeId}`);
        } else {
          const list = await api.get<TreeBranchLeafTree[]>(`/api/treebranchleaf/trees`);
          t = (list.find(x => x.status === 'active') || list[0]) || null;
        }
        if (!t) return;
        setTree(t);
        const ns = await api.get<TreeBranchLeafNode[]>(`/api/treebranchleaf/trees/${t.id}/nodes`);
        setNodes(ns || []);
      } catch (e) {
        message.error("Impossible de charger l'arbre");
      }
    })();
  }, [api, treeId]);

  const roots = useMemo(() => buildHierarchy(nodes).filter(n => n.type === 'branch'), [nodes]);

  // Définir l'onglet actif par défaut
  useEffect(() => {
    if (!activeTab && roots.length) {
      const general = roots.find(r => (r.label || '').toLowerCase().includes('mesures générales'));
      setActiveTab((general || roots[0]).id);
    }
  }, [activeTab, roots]);

  const activeBranch = useMemo(() => roots.find(r => r.id === activeTab) || null, [activeTab, roots]);

  const handleChange = useCallback((nodeId: string, value: string | number | null | undefined) => {
    setFormData(prev => ({ ...prev, [nodeId]: value ?? '' }));
  }, []);

  const branchChildren = useMemo(() => {
    // @ts-expect-error children ajoutée dynamiquement
    return (activeBranch?.children as TreeBranchLeafNode[] | undefined) || [];
  }, [activeBranch]);

  const visibleLeaves = useMemo(() => branchChildren.filter(n => n.isActive !== false && n.isVisible !== false), [branchChildren]);

  const totalRequired = useMemo(() => visibleLeaves.filter(n => n.type === 'leaf' && n.subType === 'field' && n.isRequired).length, [visibleLeaves]);
  const completedRequired = useMemo(() => visibleLeaves.filter(n => n.type === 'leaf' && n.subType === 'field' && n.isRequired && (formData[n.id] !== undefined && formData[n.id] !== '')).length, [visibleLeaves, formData]);
  const progress = useMemo(() => totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100, [completedRequired, totalRequired]);

  const onSave = useCallback(async () => {
    if (!tree) return;
    setSaving(true);
    try {
      // On enregistre seulement les valeurs présentes de l'onglet actif
      const data = visibleLeaves
        .filter(n => n.type === 'leaf')
        .map(n => ({
          nodeId: n.id,
          value: formData[n.id] !== undefined ? String(formData[n.id]) : '',
        }));

      await api.post(`/api/treebranchleaf-v2/trees/${tree.id}/submissions`, {
        data,
        status: progress === 100 ? 'completed' : 'draft',
        ...(leadId ? { leadId } : {}),
      message.success('Brouillon enregistré');
    } catch (e) {
      message.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [api, formData, leadId, progress, tree, visibleLeaves]);

  const onFinish = useCallback(async () => {
    if (!tree) return;
    setSaving(true);
    try {
      // Prend toutes les feuilles visibles du formulaire (toutes branches)
      const allLeaves = buildHierarchy(nodes)
        .flatMap(b => {
          // @ts-expect-error children existe
          const stack: TreeBranchLeafNode[] = b.children || [];
          const res: TreeBranchLeafNode[] = [];
          while (stack.length) {
            const it = stack.shift()!;
            if (it.type === 'leaf') res.push(it);
            // @ts-expect-error children existe
            if (it.children?.length) stack.push(...it.children);
          }
          return res;
        })
        .filter(n => n.isActive !== false && n.isVisible !== false);

      const data = allLeaves.map(n => ({ nodeId: n.id, value: formData[n.id] !== undefined ? String(formData[n.id]) : '' }));
      await api.post(`/api/treebranchleaf-v2/trees/${tree.id}/submissions`, {
        data,
        status: 'completed',
        ...(leadId ? { leadId } : {}),
      message.success('Soumission terminée');
    } catch (e) {
      message.error('Échec de la soumission');
    } finally {
      setSaving(false);
    }
  }, [api, formData, leadId, nodes, tree]);

  // Rendu d'un nœud feuille basique (aperçu simple)
  const renderLeaf = (node: TreeBranchLeafNode) => {
    if (node.subType === 'option') {
      const options: string[] = (node as any)?.fieldConfig?.options || [];
      return (
        <div key={node.id} style={{ marginBottom: 16 }}>
          <Text strong>
            {node.label}
            {node.isRequired && <span style={{ color: 'red' }}> *</span>}
          </Text>
          {node.description && (
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">{node.description}</Text>
            </div>
          )}
          <Radio.Group
            value={formData[node.id]}
            onChange={(e) => handleChange(node.id, e.target.value)}
          >
            {options.map((opt, i) => (
              <Radio key={i} value={opt}>{opt}</Radio>
            ))}
          </Radio.Group>
        </div>
      );
    }

    // field
    const fieldType = (node as any)?.fieldConfig?.fieldType || 'text';
    return (
      <div key={node.id} style={{ marginBottom: 16 }}>
        <Text strong>
          {node.label}
          {node.isRequired && <span style={{ color: 'red' }}> *</span>}
        </Text>
        {node.description && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">{node.description}</Text>
          </div>
        )}
        {fieldType === 'text' && (
          <Input value={(formData[node.id] as string) || ''} onChange={(e) => handleChange(node.id, e.target.value)} />
        )}
        {fieldType === 'textarea' && (
          <Input.TextArea rows={4} value={(formData[node.id] as string) || ''} onChange={(e) => handleChange(node.id, e.target.value)} />
        )}
        {fieldType === 'number' && (
          <InputNumber style={{ width: '100%' }} value={Number(formData[node.id] ?? 0)} onChange={(v) => handleChange(node.id, v ?? 0)} />
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: 16 }}>
      <Row justify="center">
        <Col xs={24} sm={22} md={20} lg={18} xl={16}>
          <Card style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space direction="vertical" size={0}>
                  <Text type="secondary">Organisation</Text>
                  <Text strong>{currentOrganization?.name || '—'}</Text>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" size={0}>
                  <Text type="secondary">Utilisateur</Text>
                  <Text strong>{user?.email || '—'}</Text>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" size={0}>
                  <Text type="secondary">Lead</Text>
                  <Text strong>{lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.company || lead.email || lead.phone : '—'}</Text>
                </Space>
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col flex={1}>
                <Title level={3} style={{ margin: 0 }}>{tree?.name || 'Formulaire'}</Title>
                {tree?.description && <Text type="secondary">{tree.description}</Text>}
              </Col>
              <Col>
                <div style={{ minWidth: 200 }}>
                  <Text strong>Progression</Text>
                  <Progress style={{ width: 200 }} percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
                </div>
              </Col>
            </Row>
          </Card>

          {/* Onglets secteurs = branches racines */}
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={roots.map(b => ({ key: b.id, label: b.label || 'Branche', children: (
                <div>
                  {/* @ts-expect-error children ajoutée dynamiquement */}
                  {(b.children || []).map((child: TreeBranchLeafNode) => child.type === 'leaf' ? renderLeaf(child) : (
                    <Card key={child.id} style={{ marginBottom: 16 }}>
                      <Title level={4} style={{ marginTop: 0 }}>{child.label}</Title>
                      {/* @ts-expect-error children possible */}
                      {(child.children || []).filter((n: TreeBranchLeafNode) => n.type === 'leaf').map((leaf: TreeBranchLeafNode) => renderLeaf(leaf))}
                    </Card>
                  ))}
                </div>
              )}))}
            />
            <Divider />
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Text type="secondary">{Object.values(formData).filter(v => v !== '' && v !== undefined).length} réponse(s)</Text>
                  {progress === 100 && <Tag color="green"><CheckCircleOutlined /> Complet</Tag>}
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<SaveOutlined />} onClick={onSave} loading={saving}>Sauvegarder</Button>
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={onFinish} loading={saving} disabled={progress < 100}>Terminer</Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
