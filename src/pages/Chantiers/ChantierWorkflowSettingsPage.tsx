import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Select, Input, Switch, Tag, Table, Modal, Form, InputNumber,
  message, Empty, Typography, Space, Popconfirm,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  ThunderboltOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useChantierStatuses } from '../../hooks/useChantierStatuses';

const { Text, Title } = Typography;

// ─── Types ───
interface Transition {
  id: string;
  fromStatusId: string;
  toStatusId: string;
  triggerType: string;
  requiredConditions?: any;
  allowedRoles?: string[];
  notifyRoles?: string[];
  sendEmail: boolean;
  label?: string;
  isActive: boolean;
  order: number;
  FromStatus?: { id: string; name: string; color: string };
  ToStatus?: { id: string; name: string; color: string };
}

interface InvoiceTemplate {
  id: string;
  statusId?: string | null;
  type: string;
  label: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
  Status?: { id: string; name: string; color: string } | null;
}

const TRIGGER_TYPES = [
  { value: 'MANUAL', label: '🖱️ Manuel (drag & drop)' },
  { value: 'AUTO_INVOICE_PAID', label: '💰 Auto — Facture payée' },
  { value: 'AUTO_MATERIAL_RECEIVED', label: '📦 Auto — Matériel reçu' },
  { value: 'AUTO_VISIT_VALIDATED', label: '🔍 Auto — Visite validée' },
  { value: 'AUTO_CLIENT_SIGNED', label: '✍️ Auto — Client a signé' },
  { value: 'AUTO_DATE_REACHED', label: '📅 Auto — Date atteinte' },
];

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'technicien', label: 'Technicien' },
];

const INVOICE_TYPES = [
  { value: 'ACOMPTE', label: '💰 Acompte' },
  { value: 'MATERIEL', label: '📦 Matériel' },
  { value: 'FIN_CHANTIER', label: '🏗️ Fin de chantier' },
  { value: 'RECEPTION', label: '✅ Réception' },
  { value: 'CUSTOM', label: '📄 Personnalisé' },
];

const ChantierWorkflowSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { statuses } = useChantierStatuses();

  // ─── Transitions State ───
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [transLoading, setTransLoading] = useState(true);
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [editingTrans, setEditingTrans] = useState<Transition | null>(null);
  const [transForm] = Form.useForm();

  // ─── Invoice Templates State ───
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [templLoading, setTemplLoading] = useState(true);
  const [templModalVisible, setTemplModalVisible] = useState(false);
  const [editingTempl, setEditingTempl] = useState<InvoiceTemplate | null>(null);
  const [templForm] = Form.useForm();

  // ─── Fetch ───
  const fetchTransitions = useCallback(async () => {
    try {
      setTransLoading(true);
      const res = await api.get('/api/chantier-workflow/transitions');
      setTransitions(res.data || []);
    } catch {
      console.error('Erreur chargement transitions');
    } finally {
      setTransLoading(false);
    }
  }, [api]);

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplLoading(true);
      const res = await api.get('/api/chantier-workflow/invoice-templates');
      setTemplates(res.data || []);
    } catch {
      console.error('Erreur chargement templates');
    } finally {
      setTemplLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTransitions();
    fetchTemplates();
  }, [fetchTransitions, fetchTemplates]);

  // Status options for selects
  const statusOptions = useMemo(() =>
    statuses.map(s => ({ value: s.id, label: s.name, color: s.color })),
    [statuses]
  );

  // ═══ TRANSITIONS CRUD ═══
  const handleOpenTransModal = useCallback((trans?: Transition) => {
    if (trans) {
      setEditingTrans(trans);
      transForm.setFieldsValue({
        fromStatusId: trans.fromStatusId,
        toStatusId: trans.toStatusId,
        triggerType: trans.triggerType,
        allowedRoles: trans.allowedRoles || [],
        notifyRoles: trans.notifyRoles || [],
        sendEmail: trans.sendEmail,
        label: trans.label,
        isActive: trans.isActive,
      });
    } else {
      setEditingTrans(null);
      transForm.resetFields();
      transForm.setFieldsValue({ triggerType: 'MANUAL', isActive: true, sendEmail: false });
    }
    setTransModalVisible(true);
  }, [transForm]);

  const handleSaveTrans = useCallback(async () => {
    try {
      const values = await transForm.validateFields();
      if (editingTrans) {
        await api.put(`/api/chantier-workflow/transitions/${editingTrans.id}`, values);
        message.success('Transition mise à jour');
      } else {
        await api.post('/api/chantier-workflow/transitions', values);
        message.success('Transition créée');
      }
      setTransModalVisible(false);
      fetchTransitions();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Erreur');
    }
  }, [api, editingTrans, transForm, fetchTransitions]);

  const handleDeleteTrans = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/chantier-workflow/transitions/${id}`);
      message.success('Transition supprimée');
      fetchTransitions();
    } catch {
      message.error('Erreur suppression');
    }
  }, [api, fetchTransitions]);

  // ═══ INVOICE TEMPLATES CRUD ═══
  const handleOpenTemplModal = useCallback((templ?: InvoiceTemplate) => {
    if (templ) {
      setEditingTempl(templ);
      templForm.setFieldsValue(templ);
    } else {
      setEditingTempl(null);
      templForm.resetFields();
      templForm.setFieldsValue({ type: 'CUSTOM', isRequired: false, isActive: true });
    }
    setTemplModalVisible(true);
  }, [templForm]);

  const handleSaveTempl = useCallback(async () => {
    try {
      const values = await templForm.validateFields();
      if (editingTempl) {
        await api.put(`/api/chantier-workflow/invoice-templates/${editingTempl.id}`, values);
        message.success('Template mis à jour');
      } else {
        await api.post('/api/chantier-workflow/invoice-templates', values);
        message.success('Template créé');
      }
      setTemplModalVisible(false);
      fetchTemplates();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Erreur');
    }
  }, [api, editingTempl, templForm, fetchTemplates]);

  const handleDeleteTempl = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/chantier-workflow/invoice-templates/${id}`);
      message.success('Template supprimé');
      fetchTemplates();
    } catch {
      message.error('Erreur suppression');
    }
  }, [api, fetchTemplates]);

  // ═══ RENDER ═══
  const transColumns = [
    {
      title: 'De → Vers',
      key: 'transition',
      render: (_: any, r: Transition) => (
        <Space>
          <Tag color={r.FromStatus?.color}>{r.FromStatus?.name}</Tag>
          <ArrowRightOutlined />
          <Tag color={r.ToStatus?.color}>{r.ToStatus?.name}</Tag>
        </Space>
      ),
    },
    {
      title: 'Déclencheur',
      dataIndex: 'triggerType',
      key: 'triggerType',
      width: 200,
      render: (type: string) => {
        const t = TRIGGER_TYPES.find(tt => tt.value === type);
        return <Text>{t?.label || type}</Text>;
      }
    },
    {
      title: 'Rôles autorisés',
      dataIndex: 'allowedRoles',
      key: 'allowedRoles',
      render: (roles: string[] | null) => roles?.length
        ? roles.map(r => <Tag key={r} color="blue">{r}</Tag>)
        : <Text type="secondary">Tous</Text>
    },
    {
      title: 'Actif',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 60,
      render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag color="default">Non</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, r: Transition) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenTransModal(r)} />
          <Popconfirm title="Supprimer ?" onConfirm={() => handleDeleteTrans(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const templColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => {
        const t = INVOICE_TYPES.find(i => i.value === type);
        return <Text>{t?.label || type}</Text>;
      }
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Statut associé',
      key: 'status',
      render: (_: any, r: InvoiceTemplate) => r.Status
        ? <Tag color={r.Status.color}>{r.Status.name}</Tag>
        : <Text type="secondary">Global</Text>,
    },
    {
      title: '%',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 70,
      render: (p: number | null) => p != null ? `${p}%` : '-',
    },
    {
      title: 'Requis',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 70,
      render: (v: boolean) => v ? <Tag color="red">Oui</Tag> : <Tag>Non</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, r: InvoiceTemplate) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenTemplModal(r)} />
          <Popconfirm title="Supprimer ?" onConfirm={() => handleDeleteTempl(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/chantiers/settings')}>
          Retour aux paramètres
        </Button>
        <Title level={4} style={{ margin: 0 }}>⚙️ Workflow Chantiers</Title>
      </div>

      {/* ═══ TRANSITIONS ═══ */}
      <Card
        title={<span><ThunderboltOutlined /> Règles de transition</span>}
        size="small"
        style={{ marginBottom: 24 }}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenTransModal()}>
            Nouvelle transition
          </Button>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Définissez les règles qui contrôlent comment les chantiers avancent dans le pipeline.
          Configurez les déclencheurs automatiques et les rôles autorisés pour le drag & drop.
        </Text>
        <Table
          dataSource={transitions}
          columns={transColumns}
          rowKey="id"
          loading={transLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="Aucune transition configurée — les déplacements sont libres" /> }}
        />
      </Card>

      {/* ═══ INVOICE TEMPLATES ═══ */}
      <Card
        title={<span><DollarOutlined /> Templates de factures</span>}
        size="small"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenTemplModal()}>
            Nouveau template
          </Button>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Définissez les factures types qui pourront être créées automatiquement pour chaque chantier.
          Associez-les à un statut pour qu'elles soient proposées lors d'un changement d'étape.
        </Text>
        <Table
          dataSource={templates}
          columns={templColumns}
          rowKey="id"
          loading={templLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="Aucun template — les factures seront créées manuellement" /> }}
        />
      </Card>

      {/* ═══ TRANSITION MODAL ═══ */}
      <Modal
        title={editingTrans ? 'Modifier la transition' : 'Nouvelle transition'}
        open={transModalVisible}
        onOk={handleSaveTrans}
        onCancel={() => setTransModalVisible(false)}
        okText={editingTrans ? 'Modifier' : 'Créer'}
        width={560}
      >
        <Form form={transForm} layout="vertical">
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="fromStatusId" label="De (statut source)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={statusOptions} placeholder="Sélectionner..." />
            </Form.Item>
            <Form.Item name="toStatusId" label="Vers (statut cible)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={statusOptions} placeholder="Sélectionner..." />
            </Form.Item>
          </div>
          <Form.Item name="triggerType" label="Déclencheur" rules={[{ required: true }]}>
            <Select options={TRIGGER_TYPES} />
          </Form.Item>
          <Form.Item name="label" label="Description (optionnel)">
            <Input placeholder="Ex: Passage auto après paiement acompte" />
          </Form.Item>
          <Form.Item name="allowedRoles" label="Rôles autorisés (drag & drop)">
            <Select mode="multiple" options={ROLES} placeholder="Laisser vide = tout le monde" />
          </Form.Item>
          <Form.Item name="notifyRoles" label="Notifier ces rôles">
            <Select mode="multiple" options={ROLES} placeholder="Sélectionner les rôles à notifier..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 24 }}>
            <Form.Item name="sendEmail" label="Envoyer email" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isActive" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* ═══ TEMPLATE MODAL ═══ */}
      <Modal
        title={editingTempl ? 'Modifier le template' : 'Nouveau template de facture'}
        open={templModalVisible}
        onOk={handleSaveTempl}
        onCancel={() => setTemplModalVisible(false)}
        okText={editingTempl ? 'Modifier' : 'Créer'}
        width={500}
      >
        <Form form={templForm} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={INVOICE_TYPES} />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label requis' }]}>
            <Input placeholder="Ex: Facture acompte 30%" />
          </Form.Item>
          <Form.Item name="statusId" label="Associé au statut (optionnel)">
            <Select
              options={[{ value: null as any, label: '— Global (aucun statut) —' }, ...statusOptions]}
              allowClear
              placeholder="Sélectionner..."
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="percentage" label="Pourcentage" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="fixedAmount" label="Montant fixe" style={{ flex: 1 }}>
              <InputNumber min={0} suffix="€" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Form.Item name="isRequired" label="Requis pour passer au statut suivant" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isActive" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ChantierWorkflowSettingsPage;
