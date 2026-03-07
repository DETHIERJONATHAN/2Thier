import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Tag, Table, Modal, Form, Input, InputNumber, Select, DatePicker,
  message, Empty, Typography, Space, Popconfirm, Badge,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, DollarOutlined,
  CheckCircleOutlined, SendOutlined,
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

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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
