import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Spin, message, Modal, InputNumber, DatePicker, Tooltip,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, SendOutlined, DeleteOutlined,
  EditOutlined, EyeOutlined, DollarOutlined, DownloadOutlined,
  EuroCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

// ── Facebook Theme ──
const FB = {
  bg: '#f0f2f5', white: '#ffffff', text: '#050505', textSecondary: '#65676b',
  blue: '#1877f2', blueHover: '#166fe5', border: '#ced0d4',
  btnGray: '#e4e6eb', btnGrayHover: '#d8dadf', green: '#42b72a',
  red: '#e4405f', orange: '#f7931a', purple: '#722ed1',
  shadow: '0 1px 2px rgba(0,0,0,0.1)', radius: 8,
  // Light backgrounds for status badges
  lightBlue: '#e7f3ff', lightGreen: '#e6f4ea', lightRed: '#fce8e6', lightPurple: '#f3e8fd',
};

// ── Types ──
interface UnifiedInvoice {
  id: string;
  source: 'standalone' | 'chantier' | 'incoming';
  invoiceNumber: string;
  clientName: string;
  clientVat?: string;
  description?: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate?: string;
  paidAt?: string;
  peppolStatus?: string;
  chantierId?: string;
  createdAt: string;
}

interface Stats {
  totalEmises: number;
  totalRecues: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalAmount: number;
  totalDrafts: number;
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

// ── Responsive hook ──
const useScreenSize = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: w < 768, isTablet: w < 1024 };
};

// ── FBCard component ──
const FBCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }> = ({ children, style, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
      padding: 16, marginBottom: 12, cursor: onClick ? 'pointer' : undefined,
      transition: 'box-shadow 0.2s',
      ...style,
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = FB.shadow; }}
  >
    {children}
  </div>
);

// ── Status helpers ──
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Brouillon', color: FB.textSecondary, bg: FB.btnGray, icon: <EditOutlined /> },
  SENT: { label: 'Envoyée', color: FB.blue, bg: FB.lightBlue, icon: <SendOutlined /> },
  PAID: { label: 'Payée', color: FB.green, bg: FB.lightGreen, icon: <CheckCircleOutlined /> },
  OVERDUE: { label: 'En retard', color: FB.red, bg: FB.lightRed, icon: <ExclamationCircleOutlined /> },
  CANCELLED: { label: 'Annulée', color: FB.textSecondary, bg: FB.btnGray, icon: <ClockCircleOutlined /> },
  RECEIVED: { label: 'Reçue', color: FB.purple, bg: FB.lightPurple, icon: <DownloadOutlined /> },
  REVIEWED: { label: 'Vérifiée', color: FB.blue, bg: FB.lightBlue, icon: <EyeOutlined /> },
  ACCEPTED: { label: 'Acceptée', color: FB.green, bg: FB.lightGreen, icon: <CheckCircleOutlined /> },
  REJECTED: { label: 'Rejetée', color: FB.red, bg: FB.lightRed, icon: <ExclamationCircleOutlined /> },
};

const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  standalone: { label: 'Indépendante', color: FB.blue },
  chantier: { label: 'Chantier', color: FB.orange },
  incoming: { label: 'Reçue Peppol', color: FB.purple },
};

// ── Tabs ──
type TabKey = 'all' | 'outgoing' | 'incoming' | 'draft';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Toutes', icon: <FileTextOutlined /> },
  { key: 'outgoing', label: 'Émises', icon: <SendOutlined /> },
  { key: 'incoming', label: 'Reçues', icon: <DownloadOutlined /> },
  { key: 'draft', label: 'Brouillons', icon: <EditOutlined /> },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const FacturePage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  const { isMobile } = useScreenSize();

  // State
  const [invoices, setInvoices] = useState<UnifiedInvoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientVat: '',
    clientEmail: '',
    clientAddress: '',
    description: '',
    dueDate: null as dayjs.Dayjs | null,
    taxRate: 21,
    notes: '',
    lines: [{ description: '', quantity: 1, unitPrice: 0 }] as InvoiceLine[],
  });
  const [creating, setCreating] = useState(false);

  // Peppol state
  const [peppolActive, setPeppolActive] = useState(false);
  const [peppolModalInvoice, setPeppolModalInvoice] = useState<UnifiedInvoice | null>(null);
  const [peppolEndpoint, setPeppolEndpoint] = useState('');
  const [peppolSending, setPeppolSending] = useState(false);

  // ── Data fetching ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invoicesRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: UnifiedInvoice[] }>(`/api/invoices?filter=${activeTab}&search=${encodeURIComponent(search)}`),
        api.get<{ success: boolean; data: Stats }>('/api/invoices/stats'),
      ]);
      if (invoicesRes.success) setInvoices(invoicesRes.data);
      if (statsRes.success) setStats(statsRes.data);
      // Check Peppol config
      try {
        const peppolRes = await api.get<{ success: boolean; data: { registrationStatus: string; enabled: boolean } }>('/api/peppol/config');
        setPeppolActive(peppolRes.success && peppolRes.data?.registrationStatus === 'ACTIVE' && peppolRes.data?.enabled);
      } catch {
        setPeppolActive(false);
      }
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    } finally {
      setLoading(false);
    }
  }, [api, activeTab, search]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Actions ──
  const handleCreate = async () => {
    if (!formData.clientName.trim()) {
      message.warning('Nom du client requis');
      return;
    }
    const validLines = formData.lines.filter(l => l.description.trim() && l.quantity > 0 && l.unitPrice > 0);
    if (validLines.length === 0) {
      message.warning('Ajoutez au moins une ligne de facture');
      return;
    }
    try {
      setCreating(true);
      await api.post('/api/invoices', {
        clientName: formData.clientName,
        clientVat: formData.clientVat || undefined,
        clientEmail: formData.clientEmail || undefined,
        clientAddress: formData.clientAddress || undefined,
        description: formData.description || undefined,
        dueDate: formData.dueDate?.toISOString(),
        taxRate: formData.taxRate,
        notes: formData.notes || undefined,
        lines: validLines,
      });
      message.success('Facture créée !');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await api.post(`/api/invoices/${id}/mark-paid`);
      message.success('Facture marquée comme payée');
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur');
    }
  };

  const handleMarkSent = async (id: string) => {
    try {
      await api.post(`/api/invoices/${id}/mark-sent`);
      message.success('Facture marquée comme envoyée');
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Supprimer cette facture ?',
      content: 'Cette action est irréversible.',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.delete(`/api/invoices/${id}`);
          message.success('Facture supprimée');
          loadData();
        } catch (err: any) {
          message.error(err?.message || 'Erreur');
        }
      },
    });
  };

  const handlePeppolSend = async () => {
    if (!peppolModalInvoice || !peppolEndpoint.trim()) {
      message.warning('Identifiant Peppol (n° BCE) requis');
      return;
    }
    try {
      setPeppolSending(true);
      await api.post(`/api/peppol/send/${peppolModalInvoice.id}`, {
        partnerName: peppolModalInvoice.clientName,
        partnerVat: peppolModalInvoice.clientVat || undefined,
        partnerPeppolEndpoint: peppolEndpoint.trim(),
      });
      message.success('Facture envoyée via Peppol !');
      setPeppolModalInvoice(null);
      setPeppolEndpoint('');
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur d\'envoi Peppol');
    } finally {
      setPeppolSending(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '', clientVat: '', clientEmail: '', clientAddress: '',
      description: '', dueDate: null, taxRate: 21, notes: '',
      lines: [{ description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  // ── Computed ──
  const subtotal = useMemo(() =>
    formData.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [formData.lines]);
  const taxAmount = useMemo(() => subtotal * (formData.taxRate / 100), [subtotal, formData.taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: FB.bg }}>

      {/* ── Header Card (Facebook style) ── */}
      <FBCard style={{ borderRadius: 0, marginBottom: 0, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: FB.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileTextOutlined style={{ color: '#fff', fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Facturation</div>
              <div style={{ fontSize: 13, color: FB.textSecondary }}>
                Gérez toutes vos factures — émises, reçues et brouillons
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: FB.blue, color: '#fff', border: 'none', borderRadius: FB.radius,
              fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.blueHover)}
            onMouseLeave={e => (e.currentTarget.style.background = FB.blue)}
          >
            <PlusOutlined /> Nouvelle facture
          </button>
        </div>
      </FBCard>

      {/* ── Stats Bar ── */}
      {stats && (
        <div style={{
          display: 'flex', gap: 0, borderBottom: `1px solid ${FB.border}`,
          background: FB.white, overflowX: 'auto',
        }}>
          {[
            { label: 'Total émises', value: stats.totalEmises, icon: <SendOutlined />, color: FB.blue },
            { label: 'Montant total', value: `€${stats.totalAmount.toFixed(0)}`, icon: <EuroCircleOutlined />, color: FB.text },
            { label: 'Payé', value: `€${stats.totalPaid.toFixed(0)}`, icon: <CheckCircleOutlined />, color: FB.green },
            { label: 'En attente', value: `€${stats.totalPending.toFixed(0)}`, icon: <ClockCircleOutlined />, color: FB.orange },
            { label: 'En retard', value: `€${stats.totalOverdue.toFixed(0)}`, icon: <ExclamationCircleOutlined />, color: FB.red },
            { label: 'Reçues', value: stats.totalRecues, icon: <DownloadOutlined />, color: FB.purple },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, minWidth: isMobile ? 100 : 120, padding: '14px 16px',
              textAlign: 'center', borderRight: i < 5 ? `1px solid ${FB.border}` : undefined,
            }}>
              <div style={{ fontSize: 11, color: FB.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                <span style={{ marginRight: 4, color: s.color }}>{s.icon}</span>{s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar + Search ── */}
      <div style={{ background: FB.white, borderBottom: `1px solid ${FB.border}`, padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '14px 20px', background: 'transparent', border: 'none',
                    borderBottom: active ? `3px solid ${FB.blue}` : '3px solid transparent',
                    color: active ? FB.blue : FB.textSecondary,
                    fontWeight: active ? 600 : 400, fontSize: 15, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = FB.btnGray; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {tab.icon} {tab.label}
                  {tab.key === 'draft' && stats && stats.totalDrafts > 0 && (
                    <span style={{
                      background: FB.red, color: '#fff', borderRadius: 10,
                      padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 4,
                    }}>
                      {stats.totalDrafts}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: isMobile ? '100%' : 280 }}>
            <SearchOutlined style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: FB.textSecondary, fontSize: 14, zIndex: 1,
            }} />
            <input
              placeholder="Rechercher une facture..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', border: 'none',
                background: FB.btnGray, borderRadius: 20, fontSize: 14, outline: 'none',
                color: FB.text,
              }}
              onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = `0 0 0 2px ${FB.blue}`; }}
              onBlur={e => { e.currentTarget.style.background = FB.btnGray; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 80px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
            <div style={{ color: FB.textSecondary, marginTop: 12 }}>Chargement des factures...</div>
          </div>
        ) : invoices.length === 0 ? (
          <FBCard style={{ textAlign: 'center', padding: 48 }}>
            <FileTextOutlined style={{ fontSize: 48, color: FB.border, marginBottom: 16 }} />
            <div style={{ fontSize: 17, fontWeight: 600, color: FB.text, marginBottom: 8 }}>
              {activeTab === 'draft' ? 'Aucun brouillon' :
               activeTab === 'incoming' ? 'Aucune facture reçue' :
               activeTab === 'outgoing' ? 'Aucune facture émise' :
               'Aucune facture'}
            </div>
            <div style={{ color: FB.textSecondary, marginBottom: 20 }}>
              {activeTab === 'incoming'
                ? 'Les factures reçues via Peppol apparaîtront ici'
                : 'Créez votre première facture pour commencer'}
            </div>
            {activeTab !== 'incoming' && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '10px 24px', background: FB.blue, color: '#fff', border: 'none',
                  borderRadius: FB.radius, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <PlusOutlined style={{ marginRight: 8 }} />Créer une facture
              </button>
            )}
          </FBCard>
        ) : (
          /* ── Invoice Feed ── */
          invoices.map(inv => {
            const sc = getStatusConfig(inv.status);
            const source = SOURCE_BADGE[inv.source] || SOURCE_BADGE.standalone;
            const isEditable = inv.source === 'standalone' && inv.status === 'DRAFT';
            const canMarkPaid = ['SENT', 'OVERDUE'].includes(inv.status) && inv.source !== 'incoming';
            const canMarkSent = inv.source === 'standalone' && inv.status === 'DRAFT';
            const canSendPeppol = peppolActive
              && inv.source !== 'incoming'
              && ['SENT', 'OVERDUE'].includes(inv.status)
              && !inv.peppolStatus;

            return (
              <FBCard key={`${inv.source}-${inv.id}`}>
                {/* Top row: source badge + date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: source.color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>
                      {inv.source === 'chantier' ? '🏗️' :
                       inv.source === 'incoming' ? '📥' : '📄'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: FB.text }}>{inv.invoiceNumber}</div>
                      <div style={{ fontSize: 12, color: FB.textSecondary }}>
                        <span style={{
                          background: source.color + '15', color: source.color,
                          padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, marginRight: 8,
                        }}>
                          {source.label}
                        </span>
                        {dayjs(inv.issueDate || inv.createdAt).format('D MMM YYYY')}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: sc.bg, color: sc.color,
                    padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  }}>
                    {sc.icon} {sc.label}
                  </div>
                </div>

                {/* Client + Description */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: FB.text, marginBottom: 2 }}>
                    {inv.clientName}
                  </div>
                  {inv.description && (
                    <div style={{ fontSize: 14, color: FB.textSecondary, lineHeight: 1.4 }}>
                      {inv.description}
                    </div>
                  )}
                </div>

                {/* Amount highlight */}
                <div style={{
                  background: FB.bg, borderRadius: FB.radius, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: FB.text }}>
                      €{(inv.amount || 0).toFixed(2)}
                    </div>
                    {inv.dueDate && (
                      <div style={{ fontSize: 12, color: FB.textSecondary }}>
                        Échéance : {dayjs(inv.dueDate).format('D MMM YYYY')}
                      </div>
                    )}
                  </div>
                  {inv.peppolStatus && (
                    <Tooltip title={`Peppol: ${inv.peppolStatus}`}>
                      <div style={{
                        background: inv.peppolStatus === 'DONE' ? FB.green + '20' : FB.purple + '20',
                        color: inv.peppolStatus === 'DONE' ? FB.green : FB.purple,
                        padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      }}>
                        ⚡ Peppol {inv.peppolStatus === 'DONE' ? '✓' : inv.peppolStatus}
                      </div>
                    </Tooltip>
                  )}
                </div>

                {/* Action buttons (Facebook style) */}
                <div style={{
                  display: 'flex', gap: 8, borderTop: `1px solid ${FB.border}`,
                  paddingTop: 8, margin: '0 -16px', padding: '8px 16px 0',
                }}>
                  {canMarkSent && (
                    <button
                      onClick={() => handleMarkSent(inv.id)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.blue, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <SendOutlined /> Envoyer
                    </button>
                  )}
                  {canMarkPaid && (
                    <button
                      onClick={() => handleMarkPaid(inv.id)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.green, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <DollarOutlined /> Marquer payée
                    </button>
                  )}
                  {canSendPeppol && (
                    <button
                      onClick={() => { setPeppolModalInvoice(inv); setPeppolEndpoint(inv.clientVat || ''); }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', background: FB.purple + '10', border: 'none', borderRadius: 6,
                        color: FB.purple, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.purple + '20')}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.purple + '10')}
                    >
                      <ThunderboltOutlined /> Peppol
                    </button>
                  )}
                  {inv.source === 'chantier' && inv.chantierId && (
                    <button
                      onClick={() => { window.location.href = `/chantiers?id=${inv.chantierId}`; }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.orange, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      🏗️ Voir chantier
                    </button>
                  )}
                  {isEditable && (
                    <button
                      onClick={() => handleDelete(inv.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.red, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              </FBCard>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CREATE INVOICE MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={showCreateModal}
        onCancel={() => { setShowCreateModal(false); resetForm(); }}
        footer={null}
        width={700}
        centered
        title={null}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        {/* Modal header (Facebook style) */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${FB.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Créer une facture</div>
          <button
            onClick={() => { setShowCreateModal(false); resetForm(); }}
            style={{
              width: 36, height: 36, borderRadius: '50%', background: FB.btnGray,
              border: 'none', cursor: 'pointer', fontSize: 18, color: FB.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Client info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginBottom: 10 }}>Client</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Nom *</label>
                <input
                  value={formData.clientName}
                  onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
                  placeholder="Nom du client ou entreprise"
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.blue)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>N° TVA</label>
                <input
                  value={formData.clientVat}
                  onChange={e => setFormData(p => ({ ...p, clientVat: e.target.value }))}
                  placeholder="BE0123456789"
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.blue)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  value={formData.clientEmail}
                  onChange={e => setFormData(p => ({ ...p, clientEmail: e.target.value }))}
                  placeholder="email@client.be"
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.blue)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Adresse</label>
                <input
                  value={formData.clientAddress}
                  onChange={e => setFormData(p => ({ ...p, clientAddress: e.target.value }))}
                  placeholder="Rue, ville..."
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.blue)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
              </div>
            </div>
          </div>

          {/* Invoice details */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginBottom: 10 }}>Détails</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Description / Objet</label>
                <input
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Services de développement, maintenance..."
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.blue)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Date d'échéance</label>
                <DatePicker
                  value={formData.dueDate}
                  onChange={d => setFormData(p => ({ ...p, dueDate: d }))}
                  style={{ width: '100%' }}
                  placeholder="Sélectionner..."
                  format="DD/MM/YYYY"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Taux TVA (%)</label>
                <InputNumber
                  value={formData.taxRate}
                  onChange={v => setFormData(p => ({ ...p, taxRate: v ?? 21 }))}
                  min={0} max={100} style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Invoice lines */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>Lignes de facture</div>
              <button
                onClick={() => setFormData(p => ({
                  ...p, lines: [...p.lines, { description: '', quantity: 1, unitPrice: 0 }],
                }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', background: FB.blue + '10', color: FB.blue,
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <PlusOutlined /> Ajouter
              </button>
            </div>

            {formData.lines.map((line, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 80px 120px 40px',
                gap: 8, marginBottom: 8, alignItems: 'end',
              }}>
                <div>
                  {idx === 0 && <label style={{ fontSize: 11, color: FB.textSecondary, display: 'block', marginBottom: 2 }}>Description</label>}
                  <input
                    value={line.description}
                    onChange={e => {
                      const lines = [...formData.lines];
                      lines[idx] = { ...lines[idx], description: e.target.value };
                      setFormData(p => ({ ...p, lines }));
                    }}
                    placeholder="Description du service..."
                    style={{
                      width: '100%', padding: '8px 10px', border: `1px solid ${FB.border}`,
                      borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  {idx === 0 && <label style={{ fontSize: 11, color: FB.textSecondary, display: 'block', marginBottom: 2 }}>Qté</label>}
                  <InputNumber
                    value={line.quantity}
                    onChange={v => {
                      const lines = [...formData.lines];
                      lines[idx] = { ...lines[idx], quantity: v ?? 1 };
                      setFormData(p => ({ ...p, lines }));
                    }}
                    min={0} style={{ width: '100%' }} size="small"
                  />
                </div>
                <div>
                  {idx === 0 && <label style={{ fontSize: 11, color: FB.textSecondary, display: 'block', marginBottom: 2 }}>Prix unit. (€)</label>}
                  <InputNumber
                    value={line.unitPrice}
                    onChange={v => {
                      const lines = [...formData.lines];
                      lines[idx] = { ...lines[idx], unitPrice: v ?? 0 };
                      setFormData(p => ({ ...p, lines }));
                    }}
                    min={0} step={0.01} style={{ width: '100%' }} size="small"
                  />
                </div>
                <div>
                  {formData.lines.length > 1 && (
                    <button
                      onClick={() => {
                        const lines = formData.lines.filter((_, i) => i !== idx);
                        setFormData(p => ({ ...p, lines }));
                      }}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: FB.btnGray,
                        border: 'none', cursor: 'pointer', color: FB.red, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total summary */}
          <div style={{
            background: FB.bg, borderRadius: FB.radius, padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: FB.textSecondary }}>Sous-total HT</span>
              <span style={{ fontWeight: 600 }}>€{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: FB.textSecondary }}>TVA ({formData.taxRate}%)</span>
              <span style={{ fontWeight: 600 }}>€{taxAmount.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              borderTop: `1px solid ${FB.border}`, paddingTop: 8, marginTop: 4,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>Total TTC</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: FB.blue }}>€{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes internes ou conditions..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                borderRadius: 6, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${FB.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => { setShowCreateModal(false); resetForm(); }}
            style={{
              padding: '10px 20px', background: FB.btnGray, border: 'none',
              borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: FB.text, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '10px 24px', background: creating ? FB.btnGray : FB.blue,
              border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Création...' : 'Créer la facture'}
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          PEPPOL SEND MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!peppolModalInvoice}
        onCancel={() => { setPeppolModalInvoice(null); setPeppolEndpoint(''); }}
        footer={null}
        width={480}
        centered
        title={null}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${FB.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThunderboltOutlined style={{ color: FB.purple, fontSize: 20 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>Envoyer via Peppol</div>
          </div>
          <button
            onClick={() => { setPeppolModalInvoice(null); setPeppolEndpoint(''); }}
            style={{
              width: 36, height: 36, borderRadius: '50%', background: FB.btnGray,
              border: 'none', cursor: 'pointer', fontSize: 18, color: FB.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {peppolModalInvoice && (
            <>
              <div style={{
                background: FB.bg, borderRadius: FB.radius, padding: 14, marginBottom: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>
                  {peppolModalInvoice.invoiceNumber}
                </div>
                <div style={{ fontSize: 13, color: FB.textSecondary }}>
                  {peppolModalInvoice.clientName} — €{(peppolModalInvoice.amount || 0).toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: FB.text, display: 'block', marginBottom: 6 }}>
                  Identifiant Peppol du destinataire (n° BCE) *
                </label>
                <input
                  value={peppolEndpoint}
                  onChange={e => setPeppolEndpoint(e.target.value)}
                  placeholder="0123456789"
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.purple)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
                <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 4 }}>
                  Numéro d'entreprise du destinataire (sans préfixe BE)
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${FB.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => { setPeppolModalInvoice(null); setPeppolEndpoint(''); }}
            style={{
              padding: '10px 20px', background: FB.btnGray, border: 'none',
              borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: FB.text, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handlePeppolSend}
            disabled={peppolSending || !peppolEndpoint.trim()}
            style={{
              padding: '10px 24px', background: peppolSending || !peppolEndpoint.trim() ? FB.btnGray : FB.purple,
              border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: peppolSending || !peppolEndpoint.trim() ? 'not-allowed' : 'pointer',
              opacity: peppolSending ? 0.6 : 1,
            }}
          >
            {peppolSending ? 'Envoi...' : '⚡ Envoyer via Peppol'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default FacturePage;
