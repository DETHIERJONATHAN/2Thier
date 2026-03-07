import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Tag, Table, Modal, Form, Input, InputNumber, Select, DatePicker,
  message, Empty, Typography, Space, Popconfirm, Badge, Progress, Alert,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, DollarOutlined,
  CheckCircleOutlined, SendOutlined, ThunderboltOutlined, FileAddOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ChantierInvoice {
  id: string;
  chantierId: string;
  type: string;
  label: string;
  amount: number;
  percentage?: number | null;
  status: string;
  dueDate?: string | null;
  paidAt?: string | null;
  sentAt?: string | null;
  documentUrl?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceTemplate {
  id: string;
  type: string;
  label: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
  statusId?: string | null;
  Status?: { id: string; name: string; color: string } | null;
}

interface Props {
  chantierId: string;
  chantierAmount?: number | null;
  onChantierStatusChanged?: () => void;
}

const INVOICE_TYPES = [
  { value: 'ACOMPTE', label: '💰 Acompte', color: '#faad14' },
  { value: 'MATERIEL', label: '📦 Matériel', color: '#1890ff' },
  { value: 'FIN_CHANTIER', label: '🏗️ Fin de chantier', color: '#52c41a' },
  { value: 'RECEPTION', label: '✅ Réception', color: '#13c2c2' },
  { value: 'CUSTOM', label: '📄 Personnalisé', color: '#722ed1' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'default' },
  SENT: { label: 'Envoyée', color: 'processing' },
  PAID: { label: 'Payée', color: 'success' },
  OVERDUE: { label: 'En retard', color: 'error' },
  CANCELLED: { label: 'Annulée', color: 'default' },
};

const ChantierInvoicesTab: React.FC<Props> = ({ chantierId, chantierAmount, onChantierStatusChanged }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  const [invoices, setInvoices] = useState<ChantierInvoice[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ChantierInvoice | null>(null);
  const [form] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/chantier-workflow/chantiers/${chantierId}/invoices`);
      setInvoices(res.data || []);
    } catch {
      console.error('Erreur chargement factures');
    } finally {
      setLoading(false);
    }
  }, [api, chantierId]);

  // Charger les templates de factures de l'organisation
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/api/chantier-workflow/invoice-templates');
      setTemplates((res.data || []).filter((t: InvoiceTemplate) => t.isActive));
    } catch {
      // non bloquant
    }
  }, [api]);

  useEffect(() => {
    fetchInvoices();
    fetchTemplates();
  }, [fetchInvoices, fetchTemplates]);

  const handleOpenModal = useCallback((invoice?: ChantierInvoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      form.setFieldsValue({
        ...invoice,
        dueDate: invoice.dueDate ? dayjs(invoice.dueDate) : null,
      });
    } else {
      setEditingInvoice(null);
      form.resetFields();
      // Pré-calculer le montant si un pourcentage est défini
      if (chantierAmount) {
        form.setFieldsValue({ amount: 0 });
      }
    }
    setModalVisible(true);
  }, [form, chantierAmount]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };

      if (editingInvoice) {
        await api.put(`/api/chantier-workflow/invoices/${editingInvoice.id}`, payload);
        message.success('Facture mise à jour');
      } else {
        await api.post(`/api/chantier-workflow/chantiers/${chantierId}/invoices`, payload);
        message.success('Facture créée');
      }
      setModalVisible(false);
      fetchInvoices();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error
      message.error(err?.message || 'Erreur');
    }
  }, [api, chantierId, editingInvoice, form, fetchInvoices]);

  const handleStatusChange = useCallback(async (invoiceId: string, newStatus: string) => {
    try {
      await api.put(`/api/chantier-workflow/invoices/${invoiceId}`, { status: newStatus });
      message.success(`Statut facture → ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      fetchInvoices();
      // Si la facture passe à PAID, une auto-transition peut avoir changé le statut du chantier
      if (newStatus === 'PAID' && onChantierStatusChanged) {
        // Petit délai pour laisser le backend finir l'auto-transition
        setTimeout(() => onChantierStatusChanged(), 500);
      }
    } catch {
      message.error('Erreur changement statut facture');
    }
  }, [api, fetchInvoices, onChantierStatusChanged]);

  const handleDelete = useCallback(async (invoiceId: string) => {
    try {
      await api.delete(`/api/chantier-workflow/invoices/${invoiceId}`);
      message.success('Facture supprimée');
      fetchInvoices();
    } catch {
      message.error('Erreur suppression');
    }
  }, [api, fetchInvoices]);

  const handlePercentageChange = useCallback((pct: number | null) => {
    if (pct && chantierAmount) {
      form.setFieldsValue({ amount: Math.round((chantierAmount * pct / 100) * 100) / 100 });
    }
  }, [form, chantierAmount]);

  // Créer une facture depuis un template
  const handleCreateFromTemplate = useCallback(async (tpl: InvoiceTemplate) => {
    // Vérifier si cette facture existe déjà
    const alreadyExists = invoices.some(inv => inv.type === tpl.type && inv.label === tpl.label);
    if (alreadyExists) {
      message.warning(`La facture "${tpl.label}" existe déjà pour ce chantier`);
      return;
    }
    try {
      const amount = tpl.percentage && chantierAmount
        ? Math.round((Number(chantierAmount) * tpl.percentage / 100) * 100) / 100
        : (tpl.fixedAmount || 0);

      await api.post(`/api/chantier-workflow/chantiers/${chantierId}/invoices`, {
        type: tpl.type,
        label: tpl.label,
        amount,
        percentage: tpl.percentage || null,
        status: 'DRAFT',
        order: tpl.order,
      });
      message.success(`Facture "${tpl.label}" créée (${amount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €)`);
      fetchInvoices();
    } catch {
      message.error('Erreur lors de la création');
    }
  }, [api, chantierId, chantierAmount, invoices, fetchInvoices]);

  // Créer TOUTES les factures manquantes depuis les templates
  const handleCreateAllFromTemplates = useCallback(async () => {
    let created = 0;
    for (const tpl of templates) {
      const alreadyExists = invoices.some(inv => inv.type === tpl.type && inv.label === tpl.label);
      if (alreadyExists) continue;

      const amount = tpl.percentage && chantierAmount
        ? Math.round((Number(chantierAmount) * tpl.percentage / 100) * 100) / 100
        : (tpl.fixedAmount || 0);

      try {
        await api.post(`/api/chantier-workflow/chantiers/${chantierId}/invoices`, {
          type: tpl.type,
          label: tpl.label,
          amount,
          percentage: tpl.percentage || null,
          status: 'DRAFT',
          order: tpl.order,
        });
        created++;
      } catch {
        // continue
      }
    }
    if (created > 0) {
      message.success(`${created} facture(s) créée(s) depuis le plan`);
      fetchInvoices();
    } else {
      message.info('Toutes les factures du plan existent déjà');
    }
  }, [api, chantierId, chantierAmount, templates, invoices, fetchInvoices]);

  // Statistiques
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [invoices]);

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: string) => {
        const t = INVOICE_TYPES.find(i => i.value === type);
        return <Tag color={t?.color}>{t?.label || type}</Tag>;
      }
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: ChantierInvoice) => (
        <div>
          <Text strong>{text}</Text>
          {record.invoiceNumber && <div><Text type="secondary" style={{ fontSize: 11 }}>N° {record.invoiceNumber}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: ChantierInvoice) => (
        <div>
          <Text strong style={{ color: record.status === 'PAID' ? '#52c41a' : undefined }}>
            {amount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €
          </Text>
          {record.percentage && <div><Text type="secondary" style={{ fontSize: 11 }}>{record.percentage}%</Text></div>}
        </div>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const s = STATUS_LABELS[status];
        return <Badge status={s?.color as any || 'default'} text={s?.label || status} />;
      }
    },
    {
      title: 'Échéance',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (date: string | null) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: ChantierInvoice) => (
        <Space size="small">
          {record.status === 'DRAFT' && (
            <Button size="small" icon={<SendOutlined />} onClick={() => handleStatusChange(record.id, 'SENT')}>
              Envoyer
            </Button>
          )}
          {(record.status === 'SENT' || record.status === 'OVERDUE') && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(record.id, 'PAID')}>
              Payée
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm title="Supprimer cette facture ?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Plan de facturation — Templates configurés */}
      {templates.length > 0 && (
        <Card
          size="small"
          title={<span><ThunderboltOutlined /> Plan de facturation</span>}
          style={{ marginBottom: 16, borderColor: '#d9d9d9' }}
          extra={
            <Button
              size="small"
              type="primary"
              icon={<FileAddOutlined />}
              onClick={handleCreateAllFromTemplates}
            >
              Créer toutes les factures
            </Button>
          }
        >
          {!chantierAmount && (
            <Alert
              type="warning"
              message="Montant du devis non défini — les montants seront à 0 €. Définissez le montant dans les informations du chantier."
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {templates.map(tpl => {
              const typeInfo = INVOICE_TYPES.find(t => t.value === tpl.type);
              const alreadyExists = invoices.some(inv => inv.type === tpl.type && inv.label === tpl.label);
              const amount = tpl.percentage && chantierAmount
                ? Math.round((Number(chantierAmount) * tpl.percentage / 100) * 100) / 100
                : (tpl.fixedAmount || 0);

              return (
                <Card
                  key={tpl.id}
                  size="small"
                  style={{
                    flex: '1 1 200px',
                    maxWidth: 260,
                    borderColor: alreadyExists ? '#52c41a' : '#d9d9d9',
                    background: alreadyExists ? '#f6ffed' : undefined,
                    opacity: alreadyExists ? 0.8 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Tag color={typeInfo?.color} style={{ margin: 0 }}>{typeInfo?.label || tpl.type}</Tag>
                    {tpl.isRequired && <Tag color="red" style={{ margin: 0, fontSize: 10 }}>Obligatoire</Tag>}
                  </div>
                  <Text strong style={{ display: 'block', marginBottom: 2 }}>{tpl.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tpl.percentage ? `${tpl.percentage}%` : '—'} = {amount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €
                  </Text>
                  {tpl.Status && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Étape : </Text>
                      <Tag color={tpl.Status.color} style={{ fontSize: 11 }}>{tpl.Status.name}</Tag>
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {alreadyExists ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>Créée</Tag>
                    ) : (
                      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => handleCreateFromTemplate(tpl)}>
                        Créer
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          {chantierAmount && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Text type="secondary">
                Total plan : {templates.reduce((sum, t) => sum + (t.percentage || 0), 0)}% = {
                  (templates.reduce((sum, t) => {
                    const amt = t.percentage ? Math.round((Number(chantierAmount) * t.percentage / 100) * 100) / 100 : (t.fixedAmount || 0);
                    return sum + amt;
                  }, 0)).toLocaleString('fr-BE', { minimumFractionDigits: 2 })
                } €
              </Text>
            </div>
          )}
        </Card>
      )}

      {/* Statistiques */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card size="small" style={{ flex: 1, minWidth: 150 }}>
          <Text type="secondary">Total facturé</Text>
          <div><Text strong style={{ fontSize: 18 }}>{stats.total.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text></div>
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 150 }}>
          <Text type="secondary">Payé</Text>
          <div><Text strong style={{ fontSize: 18, color: '#52c41a' }}>{stats.paid.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text></div>
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 150 }}>
          <Text type="secondary">En attente</Text>
          <div><Text strong style={{ fontSize: 18, color: stats.pending > 0 ? '#faad14' : '#52c41a' }}>{stats.pending.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text></div>
        </Card>
        {chantierAmount && (
          <Card size="small" style={{ flex: 1, minWidth: 150 }}>
            <Text type="secondary">Montant devis</Text>
            <div><Text strong style={{ fontSize: 18 }}>{chantierAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text></div>
          </Card>
        )}
      </div>

      {/* Progression paiement */}
      {stats.total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Progress
            percent={Math.round((stats.paid / stats.total) * 100)}
            strokeColor="#52c41a"
            trailColor="#f0f0f0"
            format={pct => `${pct}% payé`}
          />
        </div>
      )}

      {/* Tableau */}
      <Card size="small" title={<span><DollarOutlined /> Factures</span>}
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Nouvelle facture</Button>}
      >
        <Table
          dataSource={invoices}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="Aucune facture" /> }}
        />
      </Card>

      {/* Modal création / édition */}
      <Modal
        title={editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText={editingInvoice ? 'Modifier' : 'Créer'}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]} initialValue="CUSTOM">
            <Select options={INVOICE_TYPES.map(t => ({ value: t.value, label: t.label }))} />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label requis' }]}>
            <Input placeholder="Ex: Facture acompte 30%" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="percentage" label="% du devis" style={{ flex: 1 }}>
              <InputNumber
                min={0} max={100} suffix="%" style={{ width: '100%' }}
                onChange={handlePercentageChange}
                disabled={!chantierAmount}
              />
            </Form.Item>
            <Form.Item name="amount" label="Montant" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} suffix="€" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="invoiceNumber" label="N° de facture">
            <Input placeholder="Ex: FA-2026-001" />
          </Form.Item>
          <Form.Item name="dueDate" label="Échéance">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Notes internes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChantierInvoicesTab;
