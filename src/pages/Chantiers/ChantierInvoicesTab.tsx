import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Button, Tag, Table, Modal, Form, Input, InputNumber, Select, DatePicker,
  Empty, Typography, Space, Popconfirm, Badge, Progress, Alert, Divider, Switch, App, Grid,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, DollarOutlined,
  CheckCircleOutlined, SendOutlined, ThunderboltOutlined, FileAddOutlined,
  SaveOutlined, ReloadOutlined, SafetyCertificateOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { SF } from '../../components/zhiive/ZhiiveTheme';
import { useAuth } from '../../auth/useAuth';
import { useChantierStatuses } from '../../hooks/useChantierStatuses';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { logger } from '../../lib/logger';

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
  // Peppol e-Invoicing
  peppolStatus?: string | null;
  peppolMessageId?: string | null;
  peppolError?: string | null;
  peppolSentAt?: string | null;
}

interface InvoiceTemplate {
  id: string;
  type: string;
  label: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  isRequired: boolean;
  isActive?: boolean;
  order: number;
  statusId?: string | null;
  Status?: { id: string; name: string; color: string } | null;
}

interface BillingPlanItem {
  id?: string;
  type: string;
  label: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  isRequired: boolean;
  order: number;
  statusId?: string | null;
  Status?: { id: string; name: string; color: string } | null;
}

interface Props {
  chantierId: string;
  chantierAmount?: number | null;
  isValidated?: boolean;
  onChantierStatusChanged?: () => void;
  onValidationChanged?: () => void;
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

const ChantierInvoicesTab: React.FC<Props> = ({ chantierId, chantierAmount, isValidated, onChantierStatusChanged, onValidationChanged }) => {
  const { t } = useTranslation();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { isSuperAdmin, userRole } = useAuth();
  const isAdminOrAbove = isSuperAdmin || userRole === 'admin';
  const { statuses: chantierStatuses } = useChantierStatuses();
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  const [invoices, setInvoices] = useState<ChantierInvoice[]>([]);
  const [billingPlan, setBillingPlan] = useState<BillingPlanItem[]>([]);
  const [billingSource, setBillingSource] = useState<'chantier' | 'templates'>('templates');
  const [editingPlan, setEditingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
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
      logger.error('Erreur chargement factures');
    } finally {
      setLoading(false);
    }
  }, [api, chantierId]);

  // Charger le plan de facturation (per-chantier ou templates)
  const fetchBillingPlan = useCallback(async () => {
    try {
      const res = await api.get(`/api/chantier-workflow/chantiers/${chantierId}/billing-plan`) as unknown;
      setBillingPlan(res.data || []);
      setBillingSource(res.source || 'templates');
    } catch {
      // non bloquant
    }
  }, [api, chantierId]);

  useEffect(() => {
    fetchInvoices();
    fetchBillingPlan();
  }, [fetchInvoices, fetchBillingPlan]);

  // Auto-initialiser le plan depuis les templates si aucun plan per-chantier n'existe
  const autoInitDone = useRef(false);
  useEffect(() => {
    if (autoInitDone.current) return;
    if (billingSource === 'templates' && billingPlan.length > 0 && isAdminOrAbove) {
      autoInitDone.current = true;
      // Des templates existent mais pas encore de plan per-chantier — init automatiquement
      const autoInit = async () => {
        try {
          await api.post(`/api/chantier-workflow/chantiers/${chantierId}/billing-plan/init`, {});
          fetchBillingPlan();
        } catch {
          // silencieux
        }
      };
      autoInit();
    }
  }, [billingSource, billingPlan.length, isAdminOrAbove, api, chantierId, fetchBillingPlan]);

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
    } catch (err: unknown) {
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

  const handlePeppolSend = useCallback(async (invoice: ChantierInvoice) => {
    let peppolEndpointInput = '';
    modal.confirm({
      title: 'Envoyer via Peppol',
      icon: <SafetyCertificateOutlined style={{ color: SF.primary }} />,
      width: 500,
      content: (
        <div>
          <p>La facture <strong>{invoice.label}</strong> ({invoice.amount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €) sera envoyée via le réseau Peppol.</p>
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>N° BCE du destinataire *</Text>
            <Input
              placeholder="0123.456.789"
              onChange={(e) => { peppolEndpointInput = e.target.value.replace(/\./g, '').trim(); }}
              style={{ marginBottom: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Numéro d&apos;entreprise belge (sans points). Le destinataire doit être enregistré sur Peppol.
            </Text>
          </div>
        </div>
      ),
      okText: 'Envoyer via Peppol',
      okButtonProps: { style: { background: SF.primary, borderColor: SF.primary } },
      cancelText: 'Annuler',
      async onOk() {
        if (!peppolEndpointInput) {
          message.warning('Veuillez renseigner le n° BCE du destinataire');
          throw new Error('cancelled');
        }
        try {
          await api.post(`/api/peppol/send/${invoice.id}`, {
            partnerPeppolEas: '0208',
            partnerPeppolEndpoint: peppolEndpointInput,
          });
          message.success('Facture envoyée via Peppol !');
          fetchInvoices();
        } catch (err: unknown) {
          if (err?.message === 'cancelled') throw err;
          message.error(err?.data?.message || err?.message || 'Erreur envoi Peppol');
        }
      },
    });
  }, [api, fetchInvoices, modal]);

  const handlePercentageChange = useCallback((pct: number | null) => {
    if (pct && chantierAmount) {
      form.setFieldsValue({ amount: Math.round((chantierAmount * pct / 100) * 100) / 100 });
    }
  }, [form, chantierAmount]);

  // Créer une facture depuis un item du plan
  const handleCreateFromTemplate = useCallback(async (tpl: BillingPlanItem | InvoiceTemplate) => {
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

  // Créer TOUTES les factures manquantes depuis le billing plan
  const handleCreateAllFromTemplates = useCallback(async () => {
    let created = 0;
    for (const tpl of billingPlan) {
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
  }, [api, chantierId, chantierAmount, billingPlan, invoices, fetchInvoices]);

  // ── Plan de facturation — édition ──

  const totalPercentage = useMemo(() => billingPlan.reduce((sum, item) => sum + (item.percentage || 0), 0), [billingPlan]);

  const handleAddPlanItem = useCallback(() => {
    setBillingPlan(prev => [...prev, {
      type: 'CUSTOM',
      label: '',
      percentage: null,
      fixedAmount: null,
      isRequired: false,
      order: prev.length,
      statusId: null,
    }]);
  }, []);

  const handleRemovePlanItem = useCallback((index: number) => {
    setBillingPlan(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdatePlanItem = useCallback((index: number, field: string, value: unknown) => {
    setBillingPlan(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const handleSavePlan = useCallback(async () => {
    // Validation
    const emptyLabels = billingPlan.filter(item => !item.label.trim());
    if (emptyLabels.length > 0) {
      message.warning('Tous les labels doivent être remplis');
      return;
    }
    try {
      setSavingPlan(true);
      await api.put(`/api/chantier-workflow/chantiers/${chantierId}/billing-plan`, { items: billingPlan });
      message.success('Plan de facturation sauvegardé');
      setEditingPlan(false);
      setBillingSource('chantier');
      fetchBillingPlan();
    } catch (err: unknown) {
      message.error(err?.data?.message || err?.message || 'Erreur sauvegarde plan');
    } finally {
      setSavingPlan(false);
    }
  }, [api, chantierId, billingPlan, fetchBillingPlan]);

  const handleInitFromTemplates = useCallback(async () => {
    try {
      const res = await api.post(`/api/chantier-workflow/chantiers/${chantierId}/billing-plan/init`, {});
      message.success(res.message || 'Plan initialisé depuis les templates');
      fetchBillingPlan();
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur initialisation');
    }
  }, [api, chantierId, fetchBillingPlan]);

  const handleValidateChantier = useCallback(async () => {
    modal.confirm({
      title: 'Valider ce chantier ?',
      icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
      content: 'Le chantier sera validé et les factures pourront être auto-créées lors des changements de statut. Le plan de facturation sera verrouillé.',
      okText: 'Valider',
      okButtonProps: { style: { background: '#52c41a', borderColor: '#52c41a' } },
      cancelText: 'Annuler',
      async onOk() {
        try {
          await api.post(`/api/chantier-workflow/chantiers/${chantierId}/validate`, {});
          message.success('Chantier validé !');
          onValidationChanged?.();
        } catch (err: unknown) {
          message.error(err?.data?.message || err?.message || 'Erreur validation');
        }
      },
    });
  }, [api, chantierId, onValidationChanged, modal, message]);

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
        return <Badge status={s?.color as unknown || 'default'} text={s?.label || status} />;
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
      width: 240,
      render: (_: unknown, record: ChantierInvoice) => (
        <Space size="small" wrap>
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
          {record.status === 'SENT' && !record.peppolStatus && (
            <Button size="small" style={{ background: SF.primary, borderColor: SF.primary, color: '#fff' }} icon={<SafetyCertificateOutlined />} onClick={() => handlePeppolSend(record)}>
              Peppol
            </Button>
          )}
          {record.peppolStatus && (
            <Tag color={(record.peppolStatus === 'SENT' || record.peppolStatus === 'DONE') ? 'success' : record.peppolStatus === 'ERROR' ? 'error' : 'processing'}>
              {record.peppolStatus === 'DONE' ? '✅ Peppol Délivré' : record.peppolStatus === 'SENT' ? '✅ Peppol' : record.peppolStatus === 'ERROR' ? '❌ Peppol' : '⏳ Peppol'}
            </Tag>
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

      {/* ── Plan de facturation per-chantier ── */}
      <Card
        size="small"
        title={<span><ThunderboltOutlined /> Plan de facturation {billingSource === 'templates' && <Tag color="orange" style={{ marginLeft: 8 }}>Depuis templates — non sauvegardé</Tag>}</span>}
        style={{ marginBottom: 16, borderColor: billingSource === 'chantier' ? '#52c41a' : '#faad14' }}
        extra={
          <Space wrap>
            {billingSource === 'templates' && isAdminOrAbove && (
              <Button size="small" icon={<ReloadOutlined />} onClick={handleInitFromTemplates}>
                Initialiser depuis templates
              </Button>
            )}
            {isAdminOrAbove && !editingPlan && (
              <Button size="small" type="dashed" icon={<EditOutlined />} onClick={() => setEditingPlan(true)}>
                Modifier le plan
              </Button>
            )}
            {editingPlan && (
              <>
                <Button size="small" onClick={() => { setEditingPlan(false); fetchBillingPlan(); }}>Annuler</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} loading={savingPlan} onClick={handleSavePlan}>
                  Sauvegarder
                </Button>
              </>
            )}
            {!editingPlan && billingPlan.length > 0 && (
              <Button size="small" type="primary" icon={<FileAddOutlined />} onClick={handleCreateAllFromTemplates}>
                Créer toutes les factures
              </Button>
            )}
          </Space>
        }
      >
        {!chantierAmount && (
          <Alert type="warning" message="Montant du devis non défini — les montants seront à 0 €" showIcon style={{ marginBottom: 12 }} />
        )}

        {billingPlan.length === 0 && !editingPlan ? (
          <Empty description="Aucun plan de facturation défini">
            {isAdminOrAbove && (
              <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleInitFromTemplates}>
                  Initialiser depuis les templates par défaut
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => { setEditingPlan(true); handleAddPlanItem(); }}>
                  Créer un plan personnalisé
                </Button>
              </Space>
            )}
          </Empty>
        ) : editingPlan ? (
          /* Mode édition du plan */
          <div>
            {billingPlan.map((item, index) => (
              <div key={index} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap',
                padding: '10px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0',
              }}>
                <Select
                  size="small" style={{ width: screens.md ? 140 : '100%' }}
                  value={item.type}
                  onChange={val => handleUpdatePlanItem(index, 'type', val)}
                  options={INVOICE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                />
                <Input
                  size="small" style={{ flex: 1, minWidth: screens.md ? undefined : '100%' }}
                  value={item.label}
                  onChange={e => handleUpdatePlanItem(index, 'label', e.target.value)}
                  placeholder="Label facture"
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: screens.md ? 'auto' : '100%' }}>
                  <InputNumber
                    size="small" style={{ width: screens.md ? 80 : 'calc(50% - 3px)' }}
                    value={item.percentage} min={0} max={100} suffix="%"
                    onChange={val => handleUpdatePlanItem(index, 'percentage', val)}
                    placeholder="%"
                  />
                  <InputNumber
                    size="small" style={{ width: screens.md ? 100 : 'calc(50% - 3px)' }}
                    value={item.fixedAmount} min={0} suffix="€"
                    onChange={val => handleUpdatePlanItem(index, 'fixedAmount', val)}
                    placeholder="Fixe €"
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: screens.md ? 'auto' : '100%' }}>
                  <Select
                    size="small" style={{ width: screens.md ? 130 : 'calc(100% - 100px)' }}
                    value={item.statusId || undefined}
                    onChange={val => handleUpdatePlanItem(index, 'statusId', val || null)}
                    placeholder="Étape"
                    allowClear
                    options={(chantierStatuses || []).map(s => ({ value: s.id, label: s.name }))}
                  />
                  <Switch
                    size="small" checked={item.isRequired}
                    onChange={val => handleUpdatePlanItem(index, 'isRequired', val)}
                    checkedChildren="Req" unCheckedChildren="Opt"
                  />
                  <Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => handleRemovePlanItem(index)} />
                </div>
              </div>
            ))}
            <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddPlanItem} style={{ marginTop: 8 }}>
              Ajouter une ligne
            </Button>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type={Math.abs(totalPercentage - 100) <= 0.1 ? 'success' : 'danger'} strong>
                Total : {totalPercentage.toFixed(1)}%
                {Math.abs(totalPercentage - 100) > 0.1 && ' (doit être 100%)'}
              </Text>
              {chantierAmount && (
                <Text type="secondary">
                  = {(billingPlan.reduce((sum, item) => {
                    const amt = item.percentage ? Math.round((Number(chantierAmount) * item.percentage / 100) * 100) / 100 : (item.fixedAmount || 0);
                    return sum + amt;
                  }, 0)).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €
                </Text>
              )}
            </div>
          </div>
        ) : (
          /* Mode lecture du plan */
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {billingPlan.map((tpl, idx) => {
                const typeInfo = INVOICE_TYPES.find(t => t.value === tpl.type);
                const alreadyExists = invoices.some(inv => inv.type === tpl.type && inv.label === tpl.label);
                const amount = tpl.percentage && chantierAmount
                  ? Math.round((Number(chantierAmount) * tpl.percentage / 100) * 100) / 100
                  : (tpl.fixedAmount || 0);

                return (
                  <Card key={idx} size="small" style={{
                    flex: '1 1 200px', maxWidth: 320,
                    borderColor: alreadyExists ? '#52c41a' : '#d9d9d9',
                    background: alreadyExists ? '#f6ffed' : undefined,
                    opacity: alreadyExists ? 0.8 : 1,
                  }}>
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
                        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => handleCreateFromTemplate(tpl)}>Créer</Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            {chantierAmount && (
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <Text type="secondary">
                  Total plan : {totalPercentage.toFixed(0)}% = {
                    (billingPlan.reduce((sum, t) => {
                      const amt = t.percentage ? Math.round((Number(chantierAmount) * t.percentage / 100) * 100) / 100 : (t.fixedAmount || 0);
                      return sum + amt;
                    }, 0)).toLocaleString('fr-BE', { minimumFractionDigits: 2 })
                  } €
                </Text>
              </div>
            )}
          </>
        )}
      </Card>

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

      {/* Factures */}
      <Card size="small" title={<span><DollarOutlined /> Factures</span>}
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Nouvelle facture</Button>}
      >
        {invoices.length === 0 ? (
          <Empty description="Aucune facture" />
        ) : !screens.md ? (
          /* ── Vue mobile : cartes ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoices.map(inv => {
              const t = INVOICE_TYPES.find(i => i.value === inv.type);
              const s = STATUS_LABELS[inv.status];
              return (
                <div key={inv.id} style={{
                  padding: '10px 12px', borderRadius: 8, border: '1px solid #f0f0f0', background: '#fafafa',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Tag color={t?.color} style={{ margin: 0 }}>{t?.label || inv.type}</Tag>
                      <Badge status={s?.color as unknown || 'default'} text={s?.label || inv.status} />
                    </div>
                    <Space size={4}>
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(inv)} style={{ minWidth: 32, minHeight: 32 }} />
                      <Popconfirm title="Supprimer ?" onConfirm={() => handleDelete(inv.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} style={{ minWidth: 32, minHeight: 32 }} />
                      </Popconfirm>
                    </Space>
                  </div>
                  <Text strong style={{ display: 'block', fontSize: 13 }}>{inv.label}</Text>
                  {inv.invoiceNumber && <Text type="secondary" style={{ fontSize: 11 }}>N° {inv.invoiceNumber}</Text>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text strong style={{ color: inv.status === 'PAID' ? '#52c41a' : undefined }}>
                      {inv.amount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €
                    </Text>
                    {inv.percentage && <Text type="secondary" style={{ fontSize: 11 }}>({inv.percentage}%)</Text>}
                    {inv.dueDate && <Text type="secondary" style={{ fontSize: 11 }}>Éch. {dayjs(inv.dueDate).format('DD/MM/YYYY')}</Text>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {inv.status === 'DRAFT' && (
                      <Button size="small" icon={<SendOutlined />} onClick={() => handleStatusChange(inv.id, 'SENT')} style={{ minHeight: 32 }}>Envoyer</Button>
                    )}
                    {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                      <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(inv.id, 'PAID')} style={{ minHeight: 32 }}>Payée</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vue desktop : table ── */
          <Table
            dataSource={invoices}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={false}
            locale={{ emptyText: <Empty description="Aucune facture" /> }}
            scroll={{ x: 750 }}
          />
        )}
      </Card>

      {/* Modal création / édition */}
      <Modal
        title={editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText={editingInvoice ? 'Modifier' : 'Créer'}
        width="95vw"
        style={{ maxWidth: 500, top: 20 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label={t('fields.type')} rules={[{ required: true }]} initialValue="CUSTOM">
            <Select options={INVOICE_TYPES.map(t => ({ value: t.value, label: t.label }))} />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label requis' }]}>
            <Input placeholder="Ex: Facture acompte 30%" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
          <Form.Item name="notes" label={t('fields.notes')}>
            <Input.TextArea rows={2} placeholder="Notes internes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChantierInvoicesTab;
