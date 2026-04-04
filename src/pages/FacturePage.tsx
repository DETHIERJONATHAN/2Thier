import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Spin, App, Modal, InputNumber, DatePicker, Tooltip, Switch,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, SendOutlined, DeleteOutlined,
  EditOutlined, EyeOutlined, DollarOutlined, DownloadOutlined,
  EuroCircleOutlined, ThunderboltOutlined, CopyOutlined,
  CameraOutlined, WalletOutlined, BarChartOutlined,
  ShoppingCartOutlined, LoadingOutlined,
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
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  organizationName?: string;
  organizationVat?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  description?: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate?: string;
  paidAt?: string;
  peppolStatus?: string;
  chantierId?: string;
  createdAt: string;
  taxRate?: number;
  subtotal?: number;
  taxAmount?: number;
  notes?: string;
  lines?: InvoiceLine[];
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

interface Expense {
  id: string;
  supplierName: string;
  supplierVat?: string;
  supplierAddress?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  category: string;
  description?: string;
  reference?: string;
  expenseDate: string;
  paidAt?: string;
  paymentMethod?: string;
  status: string;
  receiptUrl?: string;
  aiExtracted: boolean;
  aiConfidence?: number;
  chantierId?: string;
  notes?: string;
  createdAt: string;
}

interface ExpenseStats {
  totalExpenses: number;
  totalThisMonth: number;
  totalPending: number;
  totalPaid: number;
  count: number;
  byCategory: Record<string, number>;
}

interface ExpenseCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
}

interface ScanResult {
  supplierName: string;
  supplierVat: string;
  supplierAddress: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  currency: string;
  reference: string;
  expenseDate: string;
  category: string;
  description: string;
  items: { name: string; quantity: number; price: number }[];
  confidence: number;
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
type TabKey = 'all' | 'outgoing' | 'incoming' | 'draft' | 'expenses' | 'accounting';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Toutes', icon: <FileTextOutlined /> },
  { key: 'outgoing', label: 'Émises', icon: <SendOutlined /> },
  { key: 'incoming', label: 'Reçues', icon: <DownloadOutlined /> },
  { key: 'expenses', label: 'Dépenses', icon: <WalletOutlined /> },
  { key: 'accounting', label: 'Compta', icon: <BarChartOutlined /> },
  { key: 'draft', label: 'Brouillons', icon: <EditOutlined /> },
];

// ── Expense category helpers ──
const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  fuel: { label: 'Carburant', icon: '⛽', color: '#e74c3c' },
  material: { label: 'Matériaux', icon: '🧱', color: '#e67e22' },
  tools: { label: 'Outillage', icon: '🔧', color: '#f39c12' },
  food: { label: 'Restauration', icon: '🍽️', color: '#27ae60' },
  transport: { label: 'Transport', icon: '🚗', color: '#3498db' },
  office: { label: 'Bureau', icon: '📎', color: '#9b59b6' },
  telecom: { label: 'Télécom', icon: '📱', color: '#1abc9c' },
  insurance: { label: 'Assurance', icon: '🛡️', color: '#34495e' },
  subscription: { label: 'Abonnement', icon: '📅', color: '#8e44ad' },
  maintenance: { label: 'Entretien', icon: '🔩', color: '#d35400' },
  other: { label: 'Autre', icon: '📦', color: '#95a5a6' },
};
const getCategoryInfo = (key: string) => CATEGORY_MAP[key] || CATEGORY_MAP.other;

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const FacturePage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { user: _user } = useAuth();
  const { isMobile } = useScreenSize();
  const { message, modal } = App.useApp();

  // State
  const [invoices, setInvoices] = useState<UnifiedInvoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientName: '',
    clientVat: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    description: '',
    dueDate: null as dayjs.Dayjs | null,
    taxRate: 21,
    notes: '',
    lines: [{ description: '', quantity: 1, unitPrice: 0 }] as InvoiceLine[],
  });
  const [creating, setCreating] = useState(false);

  // VAT lookup state
  const [vatLookupLoading, setVatLookupLoading] = useState(false);
  const [vatLookupDone, setVatLookupDone] = useState(false);

  // Client autocomplete state
  const [clientSuggestions, setClientSuggestions] = useState<{ id: string; name: string; vatNumber?: string; email?: string; phone?: string; address?: string; invoiceCount: number }[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showVatDropdown, setShowVatDropdown] = useState(false);
  const clientSearchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const vatSearchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail view state
  const [selectedInvoice, setSelectedInvoice] = useState<UnifiedInvoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Peppol state
  const [peppolActive, setPeppolActive] = useState(false);
  const [peppolModalInvoice, setPeppolModalInvoice] = useState<UnifiedInvoice | null>(null);
  const [peppolEndpoint, setPeppolEndpoint] = useState('');
  const [peppolSending, setPeppolSending] = useState(false);

  // Email preview modal
  const [emailPreviewInvoice, setEmailPreviewInvoice] = useState<UnifiedInvoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendPeppol, setEmailSendPeppol] = useState(true);

  // Manual Peppol marking modal
  const [peppolManualInvoice, setPeppolManualInvoice] = useState<UnifiedInvoice | null>(null);
  const [peppolManualRecipient, setPeppolManualRecipient] = useState('');

  // ── Expense state ──
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    supplierName: '', supplierVat: '', supplierAddress: '',
    totalAmount: 0, subtotal: 0, taxAmount: 0, taxRate: 21,
    category: 'other', description: '', reference: '',
    expenseDate: dayjs().format('YYYY-MM-DD'), paymentMethod: 'card',
    notes: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // ── Load expenses when tab is active ──
  const loadExpenses = useCallback(async () => {
    try {
      setExpensesLoading(true);
      const [expRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: Expense[] }>(`/api/expenses?search=${encodeURIComponent(search)}`),
        api.get<{ success: boolean; data: ExpenseStats }>('/api/expenses/stats'),
      ]);
      if (expRes.success) setExpenses(expRes.data);
      if (statsRes.success) setExpenseStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement dépenses:', err);
    } finally {
      setExpensesLoading(false);
    }
  }, [api, search]);

  useEffect(() => {
    if (activeTab === 'expenses' || activeTab === 'accounting') {
      loadExpenses();
    }
  }, [activeTab, loadExpenses]);

  // ── Scan ticket via Gemini ──
  const handleScanTicket = useCallback(async (file: File) => {
    try {
      setScanning(true);
      setScanResult(null);

      // Preview the image
      const reader = new FileReader();
      reader.onload = (e) => setScanPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await api.post<{ success: boolean; data: ScanResult; message?: string }>('/api/expenses/scan', {
        imageBase64: base64,
        mimeType: file.type,
      });

      if (res.success && res.data) {
        setScanResult(res.data);
        // Pré-remplir le formulaire
        setExpenseForm({
          supplierName: res.data.supplierName || '',
          supplierVat: res.data.supplierVat || '',
          supplierAddress: res.data.supplierAddress || '',
          totalAmount: res.data.totalAmount || 0,
          subtotal: res.data.subtotal || 0,
          taxAmount: res.data.taxAmount || 0,
          taxRate: res.data.taxRate || 21,
          category: res.data.category || 'other',
          description: res.data.description || '',
          reference: res.data.reference || '',
          expenseDate: res.data.expenseDate || dayjs().format('YYYY-MM-DD'),
          paymentMethod: 'card',
          notes: '',
        });
        setShowExpenseForm(true);
        message.success(`Ticket analysé — ${res.data.supplierName || 'Fournisseur'} €${res.data.totalAmount?.toFixed(2) || '?'}`);
      } else {
        message.warning(res.message || 'Analyse impossible, saisissez manuellement');
        setShowExpenseForm(true);
      }
    } catch (err) {
      console.error('Scan error:', err);
      message.error('Erreur lors du scan');
    } finally {
      setScanning(false);
    }
  }, [api, message]);

  // ── Save expense ──
  const handleSaveExpense = useCallback(async () => {
    if (!expenseForm.supplierName.trim()) {
      message.warning('Nom du fournisseur requis');
      return;
    }
    try {
      setSavingExpense(true);
      await api.post('/api/expenses', {
        ...expenseForm,
        aiExtracted: !!scanResult,
        aiConfidence: scanResult?.confidence || undefined,
        status: 'PAID',
      });
      message.success('Dépense enregistrée');
      setShowExpenseForm(false);
      setShowScanModal(false);
      setScanResult(null);
      setScanPreview(null);
      setExpenseForm({
        supplierName: '', supplierVat: '', supplierAddress: '',
        totalAmount: 0, subtotal: 0, taxAmount: 0, taxRate: 21,
        category: 'other', description: '', reference: '',
        expenseDate: dayjs().format('YYYY-MM-DD'), paymentMethod: 'card',
        notes: '',
      });
      loadExpenses();
    } catch {
      message.error('Erreur lors de l\'enregistrement');
    } finally {
      setSavingExpense(false);
    }
  }, [api, expenseForm, scanResult, message, loadExpenses]);

  // ── Delete expense ──
  const handleDeleteExpense = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/expenses/${id}`);
      message.success('Dépense supprimée');
      loadExpenses();
    } catch {
      message.error('Erreur');
    }
  }, [api, message, loadExpenses]);

  // ── Open create modal with auto-generated number ──
  const openCreateModal = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { formatted: string } }>('/api/invoices/next-number');
      if (res.success && res.data?.formatted) {
        setFormData(p => ({ ...p, invoiceNumber: res.data.formatted }));
      }
    } catch { /* ignore — user can fill manually */ }
    setShowCreateModal(true);
  }, [api]);

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
        invoiceNumber: formData.invoiceNumber || undefined,
        clientName: formData.clientName,
        clientVat: formData.clientVat || undefined,
        clientEmail: formData.clientEmail || undefined,
        clientPhone: formData.clientPhone || undefined,
        clientAddress: formData.clientAddress || undefined,
        description: formData.description || undefined,
        dueDate: formData.dueDate?.format('YYYY-MM-DD'),
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

  const handleDuplicate = useCallback(async (inv: UnifiedInvoice) => {
    try {
      // Fetch full invoice detail + next number in parallel
      const [numRes, detailRes] = await Promise.all([
        api.get<{ success: boolean; data: { formatted: string } }>('/api/invoices/next-number'),
        inv.source === 'standalone'
          ? api.get<{ success: boolean; data: any }>(`/api/invoices/${inv.id}`)
          : Promise.resolve(null),
      ]);
      const nextNumber = numRes.success && numRes.data?.formatted ? numRes.data.formatted : '';
      const full = detailRes?.success && detailRes.data ? detailRes.data : inv;
      setFormData({
        invoiceNumber: nextNumber,
        clientName: full.clientName || inv.clientName,
        clientVat: full.clientVat || inv.clientVat || '',
        clientEmail: full.clientEmail || inv.clientEmail || '',
        clientPhone: full.clientPhone || inv.clientPhone || '',
        clientAddress: full.clientAddress || inv.clientAddress || '',
        description: full.description || inv.description || '',
        dueDate: null,
        taxRate: full.taxRate ?? inv.taxRate ?? 21,
        notes: full.notes || inv.notes || '',
        lines: (full.lines && full.lines.length > 0)
          ? full.lines.map((l: any) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice }))
          : (inv.lines && inv.lines.length > 0)
            ? inv.lines.map(l => ({ ...l }))
            : [{ description: '', quantity: 1, unitPrice: 0 }],
      });
      setEditMode(false);
      setEditInvoiceId(null);
      setSelectedInvoice(null);
      setShowCreateModal(true);
    } catch {
      message.error('Erreur lors de la duplication');
    }
  }, [api]);

  const handleMarkPeppolManual = async () => {
    if (!peppolManualInvoice) return;
    try {
      await api.post(`/api/invoices/${peppolManualInvoice.id}/mark-peppol-sent`, {
        peppolRecipient: peppolManualRecipient.trim() || undefined,
      });
      message.success('Facture marquée comme envoyée via Peppol');
      setPeppolManualInvoice(null);
      setPeppolManualRecipient('');
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur');
    }
  };

  const handleOpenEmailPreview = (inv: UnifiedInvoice) => {
    const recipients = [inv.clientEmail].filter(Boolean).join(', ');
    setEmailTo(recipients);
    setEmailSubject(`Facture ${inv.invoiceNumber || ''} - ${inv.organizationName || ''}`);
    setEmailBody(
      `<p>Bonjour ${inv.clientName},</p>` +
      `<p>Veuillez trouver ci-joint la facture <strong>${inv.invoiceNumber || ''}</strong> d'un montant de <strong>€${(inv.amount || 0).toFixed(2)} TTC</strong>.</p>` +
      (inv.dueDate ? `<p>Date d'échéance : ${dayjs(inv.dueDate).format('D MMMM YYYY')}.</p>` : '') +
      `<p>N'hésitez pas à nous contacter pour toute question.</p>` +
      `<p>Cordialement,<br/>${inv.organizationName || 'L\'équipe'}</p>`
    );
    setEmailSendPeppol(peppolActive);
    setEmailPreviewInvoice(inv);
  };

  const handleSendEmail = async () => {
    if (!emailPreviewInvoice) return;
    const toList = emailTo.split(',').map(e => e.trim()).filter(Boolean);
    if (toList.length === 0) { message.error('Veuillez saisir au moins un destinataire'); return; }
    try {
      setEmailSending(true);

      // Send email with cc to org email
      const res = await api.post<{ success: boolean; message: string; warnings?: string[] }>(
        `/api/invoices/${emailPreviewInvoice.id}/send-email`,
        { to: toList, subject: emailSubject, body: emailBody, ccOrgEmail: true }
      );

      // Also send via Peppol if toggle is on
      if (emailSendPeppol && peppolActive) {
        try {
          await api.post(`/api/peppol/send/${emailPreviewInvoice.id}`, {
            partnerName: emailPreviewInvoice.clientName,
            partnerVat: emailPreviewInvoice.clientVat || undefined,
          });
        } catch (peppolErr: any) {
          message.warning(`Email envoyé mais Peppol a échoué: ${peppolErr?.message || 'Erreur'}`);
        }
      }

      if (res.success) {
        message.success(res.message);
        setEmailPreviewInvoice(null);
        loadData();
      } else {
        message.error(res.message);
      }
    } catch (err: any) {
      message.error(err?.message || 'Erreur lors de l\'envoi');
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownloadPdf = async (inv: UnifiedInvoice) => {
    try {
      const blob = await api.get<Blob>(`/api/invoices/${inv.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(inv.invoiceNumber || 'facture').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      message.error(err?.message || 'Erreur téléchargement PDF');
    }
  };

  const handleDelete = async (id: string, source: string = 'standalone') => {
    modal.confirm({
      title: 'Supprimer cette facture ?',
      content: 'Cette action est irréversible.',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          if (source === 'chantier') {
            await api.delete(`/api/chantier-workflow/invoices/${id}`);
          } else {
            await api.delete(`/api/invoices/${id}`);
          }
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

  const handlePeppolRetry = async (invoiceId: string) => {
    try {
      await api.post(`/api/peppol/retry/${invoiceId}`);
      message.success('Envoi Peppol relancé ! Vérification automatique toutes les 2 min.');
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur lors du retry Peppol');
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '', clientName: '', clientVat: '', clientEmail: '', clientPhone: '', clientAddress: '',
      description: '', dueDate: null, taxRate: 21, notes: '',
      lines: [{ description: '', quantity: 1, unitPrice: 0 }],
    });
    setVatLookupDone(false);
    setClientSuggestions([]);
    setShowClientDropdown(false);
    setEditMode(false);
    setEditInvoiceId(null);
  };

  // ── VAT Lookup auto-fill ──
  // overwriteAll=false (défaut): ne remplit que les champs VIDES (auto-trigger)
  // overwriteAll=true: écrase tout (clic bouton 🔍 ou Enter)
  const handleVatLookup = useCallback(async (vatNumber: string, overwriteAll = false) => {
    const cleaned = vatNumber.replace(/[\s.\-/]/g, '').toUpperCase();
    // Need at least BE + 10 digits or other EU format (min 8 chars)
    if (cleaned.length < 8) return;

    try {
      setVatLookupLoading(true);
      const res = await api.post<{ success: boolean; data: { valid: boolean; company?: { name?: string; address?: string; zipCode?: string; city?: string; country?: string; email?: string } } }>(
        '/api/peppol/vat-lookup',
        { vatNumber: cleaned }
      );
      if (res.success && res.data?.valid && res.data.company) {
        const c = res.data.company;
        const fullAddress = [c.address, c.zipCode, c.city, c.country].filter(Boolean).join(', ');
        const phone = (c as Record<string, string>).phone || '';
        setFormData(p => ({
          ...p,
          // NE JAMAIS toucher au nom sauf si overwriteAll=true (clic explicite)
          clientName: overwriteAll ? (c.name || p.clientName) : p.clientName,
          clientAddress: overwriteAll ? (fullAddress || p.clientAddress) : (p.clientAddress || fullAddress),
          clientEmail: overwriteAll ? (c.email || p.clientEmail) : (p.clientEmail || c.email || ''),
          clientPhone: overwriteAll ? (phone || p.clientPhone) : (p.clientPhone || phone),
        }));
        setVatLookupDone(true);
        message.success('Entreprise trouvée et pré-remplie !');
      } else {
        message.info('Aucune entreprise trouvée pour ce numéro de TVA');
      }
    } catch {
      message.warning('Impossible de rechercher ce numéro de TVA');
    } finally {
      setVatLookupLoading(false);
    }
  }, [api, message]);

  // ── Save client data (green button click) ──
  const handleSaveClient = useCallback(async () => {
    try {
      await api.post('/api/invoices/clients/save', {
        name: formData.clientName,
        vatNumber: formData.clientVat,
        email: formData.clientEmail,
        phone: formData.clientPhone,
        address: formData.clientAddress,
      });
      message.success('Données client sauvegardées !');
    } catch {
      message.error('Erreur lors de la sauvegarde du client');
    }
  }, [api, formData.clientName, formData.clientVat, formData.clientEmail, formData.clientPhone, formData.clientAddress, message]);

  // ── Client search (autocomplete) ──
  const searchClients = useCallback(async (query: string, source: 'name' | 'vat' = 'name') => {
    if (query.trim().length < 2) {
      setClientSuggestions([]);
      if (source === 'name') setShowClientDropdown(false);
      else setShowVatDropdown(false);
      return;
    }
    try {
      const res = await api.get<{ success: boolean; data: typeof clientSuggestions }>(
        `/api/invoices/clients/search?q=${encodeURIComponent(query.trim())}`
      );
      if (res.success && res.data?.length) {
        setClientSuggestions(res.data);
        if (source === 'name') { setShowClientDropdown(true); setShowVatDropdown(false); }
        else { setShowVatDropdown(true); setShowClientDropdown(false); }
      } else {
        setClientSuggestions([]);
        if (source === 'name') setShowClientDropdown(false);
        else setShowVatDropdown(false);
      }
    } catch {
      setClientSuggestions([]);
    }
  }, [api]);

  const handleClientNameChange = useCallback((value: string) => {
    setFormData(p => ({ ...p, clientName: value }));
    // Si le client est déjà confirmé (checkmark vert), ne plus chercher
    if (vatLookupDone) return;
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    clientSearchTimer.current = setTimeout(() => searchClients(value, 'name'), 300);
  }, [searchClients, vatLookupDone]);

  const handleVatChange = useCallback((value: string) => {
    setFormData(p => ({ ...p, clientVat: value }));
    setVatLookupDone(false);
    if (vatSearchTimer.current) clearTimeout(vatSearchTimer.current);
    vatSearchTimer.current = setTimeout(() => {
      // Search DB clients by VAT
      if (value.trim().length >= 2) searchClients(value, 'vat');
      else setShowVatDropdown(false);
      // PAS de lookup externe automatique — l'utilisateur clique 🔍 ou appuie Enter
    }, 500);
  }, [searchClients]);

  const selectClient = useCallback((client: typeof clientSuggestions[0], source: 'name' | 'vat' = 'name') => {
    setFormData(p => ({
      ...p,
      clientName: source === 'name' ? client.name : (p.clientName || client.name),
      clientVat: client.vatNumber || p.clientVat,
      clientEmail: source === 'name' ? (client.email || p.clientEmail) : (p.clientEmail || client.email || ''),
      clientPhone: source === 'name' ? (client.phone || p.clientPhone) : (p.clientPhone || client.phone || ''),
      clientAddress: source === 'name' ? (client.address || p.clientAddress) : (p.clientAddress || client.address || ''),
    }));
    setShowClientDropdown(false);
    setShowVatDropdown(false);
    setClientSuggestions([]);
    // Client connu sélectionné → verrouiller (checkmark vert)
    // Ne PAS relancer de lookup externe — les données DB suffisent
    // L'utilisateur peut cliquer 🔍 pour forcer un refresh KBO si besoin
    if (client.vatNumber) {
      setVatLookupDone(true);
    }
  }, []);

  // ── Invoice detail view ──
  const openInvoiceDetail = useCallback(async (inv: UnifiedInvoice) => {
    // For standalone invoices, fetch full detail with lines
    if (inv.source === 'standalone') {
      try {
        setDetailLoading(true);
        setSelectedInvoice(inv); // Show immediately with basic data
        const res = await api.get<{ success: boolean; data: any }>(`/api/invoices/${inv.id}`);
        if (res.success && res.data) {
          const full = res.data;
          setSelectedInvoice({
            ...inv,
            clientEmail: full.clientEmail || undefined,
            clientPhone: full.clientPhone || undefined,
            clientAddress: full.clientAddress || undefined,
            taxRate: full.taxRate,
            subtotal: full.subtotal,
            taxAmount: full.taxAmount,
            notes: full.notes || undefined,
            lines: (full.lines as InvoiceLine[]) || [],
          });
        }
      } catch {
        // Use basic data if detail fetch fails
      } finally {
        setDetailLoading(false);
      }
    } else {
      setSelectedInvoice(inv);
    }
  }, [api]);

  const openEditMode = useCallback((inv: UnifiedInvoice) => {
    // Pre-fill the create form with invoice data for editing
    setFormData({
      invoiceNumber: inv.invoiceNumber || '',
      clientName: inv.clientName,
      clientVat: inv.clientVat || '',
      clientEmail: inv.clientEmail || '',
      clientPhone: inv.clientPhone || '',
      clientAddress: inv.clientAddress || '',
      description: inv.description || '',
      dueDate: inv.dueDate ? dayjs(inv.dueDate) : null,
      taxRate: inv.taxRate ?? 21,
      notes: inv.notes || '',
      lines: inv.lines && inv.lines.length > 0
        ? inv.lines
        : [{ description: '', quantity: 1, unitPrice: 0 }],
    });
    setEditInvoiceId(inv.id);
    setEditMode(true);
    setSelectedInvoice(null);
    setShowCreateModal(true);
  }, []);

  const handleUpdate = async () => {
    if (!editMode || !selectedInvoice && !editInvoiceId) return;
    const invoiceId = editInvoiceId;
    if (!invoiceId) return;

    const validLines = formData.lines.filter(l => l.description.trim() && l.quantity > 0 && l.unitPrice > 0);
    if (validLines.length === 0) {
      message.warning('Ajoutez au moins une ligne de facture');
      return;
    }
    try {
      setCreating(true);
      await api.put(`/api/invoices/${invoiceId}`, {
        clientName: formData.clientName,
        clientVat: formData.clientVat || undefined,
        clientEmail: formData.clientEmail || undefined,
        clientPhone: formData.clientPhone || undefined,
        clientAddress: formData.clientAddress || undefined,
        description: formData.description || undefined,
        dueDate: formData.dueDate?.format('YYYY-MM-DD'),
        taxRate: formData.taxRate,
        notes: formData.notes || undefined,
        lines: validLines,
      });
      message.success('Facture mise à jour !');
      setShowCreateModal(false);
      setEditMode(false);
      setEditInvoiceId(null);
      resetForm();
      loadData();
    } catch (err: any) {
      message.error(err?.message || 'Erreur lors de la mise à jour');
    } finally {
      setCreating(false);
    }
  };

  // Track which invoice we're editing
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);

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
      <FBCard style={{ borderRadius: 0, marginBottom: 0, padding: isMobile ? '12px 16px' : '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isMobile ? 8 : 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
            <div style={{
              width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: '50%', background: FB.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileTextOutlined style={{ color: '#fff', fontSize: isMobile ? 18 : 22 }} />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: FB.text }}>Comptabilité</div>
              {!isMobile && (
                <div style={{ fontSize: 13, color: FB.textSecondary }}>
                  Factures émises, reçues, dépenses et vue comptable
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowScanModal(true); setScanResult(null); setScanPreview(null); setShowExpenseForm(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '8px 12px' : '10px 16px',
                background: '#27ae60', color: '#fff', border: 'none', borderRadius: FB.radius,
                fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#219a52')}
              onMouseLeave={e => (e.currentTarget.style.background = '#27ae60')}
            >
              <CameraOutlined /> {isMobile ? 'Scanner' : 'Scanner ticket'}
            </button>
            <button
              onClick={() => openCreateModal()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '8px 14px' : '10px 20px',
                background: FB.blue, color: '#fff', border: 'none', borderRadius: FB.radius,
                fontSize: isMobile ? 13 : 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = FB.blueHover)}
              onMouseLeave={e => (e.currentTarget.style.background = FB.blue)}
            >
              <PlusOutlined /> {isMobile ? 'Facture' : 'Nouvelle facture'}
            </button>
          </div>
        </div>
      </FBCard>

      {/* ── Stats Bar (toujours visible) ── */}
      {stats && (() => {
        const netBalance = (stats.totalPaid || 0) - (expenseStats?.totalExpenses || 0);
        const statItems = [
          { label: 'Émises', value: stats.totalEmises, icon: <SendOutlined />, color: FB.blue },
          { label: 'Entrées', value: `€${stats.totalAmount.toFixed(0)}`, icon: <EuroCircleOutlined />, color: FB.text },
          { label: 'Payé', value: `€${stats.totalPaid.toFixed(0)}`, icon: <CheckCircleOutlined />, color: FB.green },
          { label: 'Attente', value: `€${stats.totalPending.toFixed(0)}`, icon: <ClockCircleOutlined />, color: FB.orange },
          { label: 'Retard', value: `€${stats.totalOverdue.toFixed(0)}`, icon: <ExclamationCircleOutlined />, color: FB.red },
          { label: 'Reçues', value: stats.totalRecues, icon: <DownloadOutlined />, color: FB.purple },
          { label: 'Dépenses', value: `€${(expenseStats?.totalExpenses || 0).toFixed(0)}`, icon: <WalletOutlined />, color: '#e74c3c' },
          { label: 'Solde', value: `${netBalance >= 0 ? '+' : ''}€${netBalance.toFixed(0)}`, icon: <BarChartOutlined />, color: netBalance >= 0 ? '#27ae60' : '#e74c3c' },
        ];
        const cols = statItems.length;
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : `repeat(${cols}, 1fr)`,
            borderBottom: `1px solid ${FB.border}`,
            background: FB.white,
          }}>
            {statItems.map((s, i) => (
              <div key={i} style={{
                padding: isMobile ? '10px 6px' : '14px 12px',
                textAlign: 'center',
                borderRight: isMobile ? ((i % 4 !== 3) ? `1px solid ${FB.border}` : undefined) : (i < cols - 1 ? `1px solid ${FB.border}` : undefined),
                borderBottom: isMobile && i < 4 ? `1px solid ${FB.border}` : undefined,
              }}>
                <div style={{ fontSize: isMobile ? 9 : 11, color: FB.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  <span style={{ marginRight: 3, color: s.color }}>{s.icon}</span>{s.label}
                </div>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Tab bar + Search ── */}
      <div style={{ background: FB.white, borderBottom: `1px solid ${FB.border}`, padding: '0 16px' }}>
        {isMobile && (
          <div style={{ padding: '8px 0 0' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <SearchOutlined style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: FB.textSecondary, fontSize: 14, zIndex: 1,
              }} />
              <input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px', border: 'none',
                  background: FB.btnGray, borderRadius: 20, fontSize: 14, outline: 'none',
                  color: FB.text, boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = `0 0 0 2px ${FB.blue}`; }}
                onBlur={e => { e.currentTarget.style.background = FB.btnGray; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, flex: 1,
            overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any,
            scrollbarWidth: 'none' as any,
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
                    padding: isMobile ? '12px 12px' : '14px 20px',
                    background: 'transparent', border: 'none', whiteSpace: 'nowrap',
                    borderBottom: active ? `3px solid ${FB.blue}` : '3px solid transparent',
                    color: active ? FB.blue : FB.textSecondary,
                    fontWeight: active ? 600 : 400, fontSize: isMobile ? 13 : 15, cursor: 'pointer',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = FB.btnGray; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {tab.icon} {tab.label}
                  {tab.key === 'draft' && stats && stats.totalDrafts > 0 && (
                    <span style={{
                      background: FB.red, color: '#fff', borderRadius: 10,
                      padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 2,
                    }}>
                      {stats.totalDrafts}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search (desktop only - mobile is above) */}
          {!isMobile && (
            <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
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
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '8px 8px 80px' : '16px 16px 80px' }}>

        {/* ═══ EXPENSES TAB ═══ */}
        {activeTab === 'expenses' && (
          <>
            {/* Scan button prominent */}
            <FBCard style={{ marginBottom: 16, padding: 20, textAlign: 'center', borderLeft: `4px solid #27ae60` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: FB.text }}>Scanner un ticket ou reçu</div>
                  <div style={{ fontSize: 13, color: FB.textSecondary }}>
                    Prenez une photo — l'IA extrait automatiquement les données
                  </div>
                </div>
                <button
                  onClick={() => { setShowScanModal(true); setScanResult(null); setScanPreview(null); setShowExpenseForm(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                    background: '#27ae60', color: '#fff', border: 'none', borderRadius: FB.radius,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <CameraOutlined style={{ fontSize: 18 }} /> Scanner
                </button>
                <button
                  onClick={() => {
                    setShowExpenseForm(true);
                    setScanResult(null);
                    setExpenseForm({
                      supplierName: '', supplierVat: '', supplierAddress: '',
                      totalAmount: 0, subtotal: 0, taxAmount: 0, taxRate: 21,
                      category: 'other', description: '', reference: '',
                      expenseDate: dayjs().format('YYYY-MM-DD'), paymentMethod: 'card', notes: '',
                    });
                    setShowScanModal(true);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                    background: FB.blue, color: '#fff', border: 'none', borderRadius: FB.radius,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <PlusOutlined /> Saisie manuelle
                </button>
              </div>
            </FBCard>

            {/* Expense list */}
            {expensesLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
            ) : expenses.length === 0 ? (
              <FBCard style={{ textAlign: 'center', padding: 48 }}>
                <WalletOutlined style={{ fontSize: 48, color: FB.border, marginBottom: 16 }} />
                <div style={{ fontSize: 17, fontWeight: 600, color: FB.text, marginBottom: 8 }}>Aucune dépense</div>
                <div style={{ color: FB.textSecondary }}>Scannez un ticket pour commencer</div>
              </FBCard>
            ) : (
              expenses.map(exp => {
                const cat = getCategoryInfo(exp.category);
                return (
                  <FBCard key={exp.id} onClick={() => setSelectedExpense(exp)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%', background: cat.color + '15',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                        }}>
                          {cat.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: FB.text, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {exp.supplierName}
                            </span>
                            {exp.aiExtracted && (
                              <span style={{
                                fontSize: 10, padding: '1px 5px', borderRadius: 4,
                                background: '#9b59b620', color: '#9b59b6', fontWeight: 600,
                              }}>IA</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: FB.textSecondary }}>
                            {cat.label} • {dayjs(exp.expenseDate).format('DD/MM/YYYY')}
                            {exp.description && ` • ${exp.description}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#e74c3c' }}>
                          -€{exp.totalAmount.toFixed(2)}
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 600,
                          color: exp.status === 'PAID' ? FB.green : FB.orange,
                        }}>
                          {exp.status === 'PAID' ? 'Payé' : 'En attente'}
                        </div>
                      </div>
                    </div>
                  </FBCard>
                );
              })
            )}
          </>
        )}

        {/* ═══ ACCOUNTING TAB ═══ */}
        {activeTab === 'accounting' && (
          <>
            {/* Breakdown — les chiffres clés sont dans la barre du haut */}
            <FBCard style={{ padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: FB.text, marginBottom: 16 }}>Détail des flux</div>

              {/* Entrées */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#27ae60', marginBottom: 8, textTransform: 'uppercase' }}>
                  ↗ Entrées
                </div>
                {[
                  { label: 'Factures payées', value: stats?.totalPaid || 0 },
                  { label: 'En attente de paiement', value: stats?.totalPending || 0, sub: true },
                  { label: 'En retard', value: stats?.totalOverdue || 0, sub: true, warn: true },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: `1px solid ${FB.border}`,
                    paddingLeft: item.sub ? 16 : 0,
                  }}>
                    <span style={{ fontSize: 14, color: item.warn ? FB.red : item.sub ? FB.textSecondary : FB.text }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: item.warn ? FB.red : '#27ae60' }}>
                      €{item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sorties */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e74c3c', marginBottom: 8, textTransform: 'uppercase' }}>
                  ↘ Sorties
                </div>
                {expenseStats && Object.entries(expenseStats.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const info = getCategoryInfo(cat);
                    return (
                      <div key={cat} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: `1px solid ${FB.border}`,
                      }}>
                        <span style={{ fontSize: 14, color: FB.text }}>
                          {info.icon} {info.label}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#e74c3c' }}>
                          -€{amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                {(!expenseStats || Object.keys(expenseStats.byCategory).length === 0) && (
                  <div style={{ fontSize: 13, color: FB.textSecondary, padding: '8px 0' }}>Aucune dépense enregistrée</div>
                )}
              </div>
            </FBCard>
          </>
        )}

        {/* ═══ INVOICE TABS (all, outgoing, incoming, draft) ═══ */}
        {activeTab !== 'expenses' && activeTab !== 'accounting' && (
        <>
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
                onClick={() => openCreateModal()}
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
            const isDraft = inv.status === 'DRAFT';
            const hasPeppolError = inv.peppolStatus === 'ERROR';
            const canDelete = (inv.source === 'standalone' || inv.source === 'chantier') && (isDraft || hasPeppolError);
            const canMarkPaid = ['DRAFT', 'SENT', 'OVERDUE'].includes(inv.status) && inv.source !== 'incoming';
            const canMarkSent = inv.source === 'standalone' && isDraft;
            const canSendPeppol = peppolActive
              && inv.source !== 'incoming'
              && ['SENT', 'OVERDUE'].includes(inv.status)
              && (!inv.peppolStatus || inv.peppolStatus === 'ERROR');
            const canMarkPeppolManual = inv.source !== 'incoming'
              && ['SENT', 'OVERDUE', 'PAID'].includes(inv.status)
              && !inv.peppolStatus;
            const canDuplicate = inv.source === 'standalone';

            return (
              <FBCard key={`${inv.source}-${inv.id}`} onClick={() => openInvoiceDetail(inv)}>
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
                  {inv.organizationName && inv.source !== 'incoming' && (
                    <div style={{ fontSize: 12, color: FB.textSecondary, marginBottom: 2 }}>
                      De : <span style={{ fontWeight: 600 }}>{inv.organizationName}</span>
                    </div>
                  )}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tooltip title={`Peppol: ${inv.peppolStatus}`}>
                        <div style={{
                          background: (inv.peppolStatus === 'SENT' || inv.peppolStatus === 'DONE') ? FB.green + '20'
                            : inv.peppolStatus === 'ERROR' ? FB.red + '20'
                            : FB.purple + '20',
                          color: (inv.peppolStatus === 'SENT' || inv.peppolStatus === 'DONE') ? FB.green
                            : inv.peppolStatus === 'ERROR' ? FB.red
                            : FB.purple,
                          padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                        }}>
                          {inv.peppolStatus === 'DONE' ? '✅ Peppol Délivré'
                            : inv.peppolStatus === 'SENT' ? '✅ Peppol ✓'
                            : inv.peppolStatus === 'ERROR' ? '❌ Peppol'
                            : '⏳ Peppol PROCESSING'}
                        </div>
                      </Tooltip>
                      {(inv.peppolStatus === 'PROCESSING' || inv.peppolStatus === 'ERROR') && (
                        <Tooltip title="Réessayer l'envoi Peppol">
                          <button
                            onClick={e => { e.stopPropagation(); handlePeppolRetry(inv.id); }}
                            style={{
                              background: FB.purple + '20', color: FB.purple, border: 'none',
                              borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            🔄
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons (Facebook style) */}
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                  display: 'flex', gap: isMobile ? 6 : 8, borderTop: `1px solid ${FB.border}`,
                  paddingTop: 8, margin: '0 -16px', padding: '8px 16px 0',
                  flexWrap: 'wrap',
                }}>
                  {canMarkSent && (
                    <button
                      onClick={() => handleOpenEmailPreview(inv)}
                      style={{
                        flex: isMobile ? '1 1 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 6,
                        padding: isMobile ? '8px 10px' : '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.blue, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <SendOutlined /> {isMobile ? 'Email' : 'Envoyer par email'}
                    </button>
                  )}
                  {canMarkSent && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkSent(inv.id); }}
                      style={{
                        flex: isMobile ? '1 1 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 6,
                        padding: isMobile ? '8px 10px' : '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.orange, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <CheckCircleOutlined /> {isMobile ? 'Envoyée' : 'Marquer envoyée'}
                    </button>
                  )}
                  {canMarkPaid && (
                    <button
                      onClick={() => handleMarkPaid(inv.id)}
                      style={{
                        flex: isMobile ? '1 1 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 6,
                        padding: isMobile ? '8px 10px' : '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.green, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <DollarOutlined /> {isMobile ? 'Payée' : 'Marquer payée'}
                    </button>
                  )}
                  {canSendPeppol && (
                    <button
                      onClick={() => { setPeppolModalInvoice(inv); setPeppolEndpoint((inv.clientVat || '').replace(/^BE/i, '').replace(/[\s.\-]/g, '')); }}
                      style={{
                        flex: isMobile ? '1 1 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 6,
                        padding: isMobile ? '8px 10px' : '8px 0', background: FB.purple + '10', border: 'none', borderRadius: 6,
                        color: FB.purple, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
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
                        flex: isMobile ? '1 1 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 6,
                        padding: isMobile ? '8px 10px' : '8px 0', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.orange, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      🏗️ {isMobile ? 'Chantier' : 'Voir chantier'}
                    </button>
                  )}
                  {canDuplicate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(inv); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: isMobile ? '8px 10px' : '8px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.textSecondary, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
                    >
                      <CopyOutlined /> {isMobile ? '' : 'Dupliquer'}
                    </button>
                  )}
                  {canMarkPeppolManual && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPeppolManualInvoice(inv); setPeppolManualRecipient(inv.clientVat || ''); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: isMobile ? '8px 10px' : '8px 16px', background: FB.purple + '10', border: 'none', borderRadius: 6,
                        color: FB.purple, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = FB.purple + '20')}
                      onMouseLeave={e => (e.currentTarget.style.background = FB.purple + '10')}
                    >
                      <ThunderboltOutlined /> {isMobile ? '' : 'Peppol (ancien)'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(inv.id, inv.source)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: isMobile ? '8px 10px' : '8px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                        color: FB.red, fontWeight: 600, fontSize: isMobile ? 12 : 14, cursor: 'pointer',
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
        </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CREATE INVOICE MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={showCreateModal}
        onCancel={() => { setShowCreateModal(false); resetForm(); }}
        footer={null}
        width={isMobile ? '100%' : 700}
        centered
        title={null}
        closable={false}
        styles={{ body: { padding: 0 }, wrapper: isMobile ? { top: 0 } : undefined }}
      >
        {/* Modal header (Facebook style) */}
        <div style={{
          padding: isMobile ? '12px 16px' : '16px 20px', borderBottom: `1px solid ${FB.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>{editMode ? 'Modifier la facture' : 'Créer une facture'}</div>
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

        <div style={{ padding: isMobile ? 16 : 20, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Invoice number */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginBottom: 10 }}>Numéro de facture</div>
            <input
              value={formData.invoiceNumber}
              onChange={e => setFormData(p => ({ ...p, invoiceNumber: e.target.value }))}
              placeholder="FACTURE 2026 - 001 (auto-généré si vide)"
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                borderRadius: 6, fontSize: 15, fontWeight: 600, outline: 'none', background: FB.bg,
                boxSizing: 'border-box', letterSpacing: '0.5px',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = FB.blue)}
              onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
            />
            <div style={{ fontSize: 11, color: FB.textSecondary, marginTop: 4 }}>
              Modifiable manuellement. Laissez vide pour auto-incrémenter.
            </div>
          </div>

          {/* Client info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginBottom: 10 }}>Client</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Nom *</label>
                <input
                  value={formData.clientName}
                  onChange={e => handleClientNameChange(e.target.value)}
                  placeholder="Nom du client ou entreprise"
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = FB.blue;
                    if (!vatLookupDone && formData.clientName.length >= 2) searchClients(formData.clientName, 'name');
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = FB.border;
                    // Delay hide to allow click on suggestion
                    setTimeout(() => setShowClientDropdown(false), 200);
                  }}
                />
                {/* Client suggestions dropdown */}
                {showClientDropdown && clientSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: FB.white, border: `1px solid ${FB.border}`, borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  }}>
                    {clientSuggestions.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => selectClient(c, 'name')}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${FB.bg}`,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = FB.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = FB.white)}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: FB.textSecondary }}>
                          {[c.vatNumber, c.email].filter(Boolean).join(' · ')}
                          {c.invoiceCount > 0 && ` · ${c.invoiceCount} facture${c.invoiceCount > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>N° TVA</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    value={formData.clientVat}
                    onChange={e => handleVatChange(e.target.value)}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = FB.border;
                      setTimeout(() => setShowVatDropdown(false), 200);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (vatLookupDone) { handleSaveClient(); } else { handleVatLookup(formData.clientVat, true); } } }}
                    placeholder="BE0123456789 ou nom d'entreprise"
                    style={{
                      flex: 1, padding: '10px 12px', border: `1px solid ${vatLookupDone ? FB.green : FB.border}`,
                      borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = FB.blue;
                      if (!vatLookupDone && formData.clientVat.length >= 2) searchClients(formData.clientVat, 'vat');
                    }}
                  />
                  <Tooltip title={vatLookupDone ? "Sauvegarder les données client" : "Rechercher l'entreprise par TVA"}>
                    <button
                      type="button"
                      onClick={() => { if (vatLookupDone) { handleSaveClient(); } else { handleVatLookup(formData.clientVat, true); } }}
                      disabled={vatLookupLoading || (!vatLookupDone && formData.clientVat.trim().length < 8)}
                      style={{
                        width: 40, height: 40, borderRadius: 6, border: `1px solid ${FB.border}`,
                        background: vatLookupDone ? FB.lightGreen : FB.bg, cursor: vatLookupLoading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        color: vatLookupDone ? FB.green : FB.blue, fontSize: 16,
                        opacity: (!vatLookupDone && formData.clientVat.trim().length < 8) ? 0.4 : 1,
                      }}
                    >
                      {vatLookupLoading ? <Spin size="small" /> : vatLookupDone ? <CheckCircleOutlined /> : <SearchOutlined />}
                    </button>
                  </Tooltip>
                </div>
                {/* VAT suggestions dropdown */}
                {showVatDropdown && clientSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: FB.white, border: `1px solid ${FB.border}`, borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  }}>
                    {clientSuggestions.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => selectClient(c, 'vat')}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${FB.bg}`,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = FB.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = FB.white)}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: FB.textSecondary }}>
                          {[c.vatNumber, c.email].filter(Boolean).join(' · ')}
                          {c.invoiceCount > 0 && ` · ${c.invoiceCount} facture${c.invoiceCount > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Téléphone</label>
                <input
                  value={formData.clientPhone}
                  onChange={e => setFormData(p => ({ ...p, clientPhone: e.target.value }))}
                  placeholder="+32 ..."
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
          padding: isMobile ? '10px 12px' : '12px 20px', borderTop: `1px solid ${FB.border}`,
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
            onClick={editMode ? handleUpdate : handleCreate}
            disabled={creating}
            style={{
              padding: '10px 24px', background: creating ? FB.btnGray : FB.blue,
              border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? (editMode ? 'Mise à jour...' : 'Création...') : (editMode ? 'Enregistrer' : 'Créer la facture')}
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          INVOICE DETAIL MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selectedInvoice}
        onCancel={() => setSelectedInvoice(null)}
        footer={null}
        width={isMobile ? '100%' : 700}
        centered
        title={null}
        closable={false}
        styles={{ body: { padding: 0 }, wrapper: isMobile ? { top: 0 } : undefined }}
      >
        {selectedInvoice && (() => {
          const inv = selectedInvoice;
          const sc = getStatusConfig(inv.status);
          const source = SOURCE_BADGE[inv.source] || SOURCE_BADGE.standalone;
          const isStandalone = inv.source === 'standalone';
          const isDraft = inv.status === 'DRAFT';
          const canEdit = isStandalone && isDraft;
          const canMarkPaidDetail = ['DRAFT', 'SENT', 'OVERDUE'].includes(inv.status) && inv.source !== 'incoming';
          const canMarkSentDetail = isStandalone && isDraft;
          const hasPeppolError = inv.peppolStatus === 'ERROR';
          const canDelete = (isStandalone || inv.source === 'chantier') && (isDraft || hasPeppolError);
          const canSendPeppolDetail = peppolActive && inv.source !== 'incoming'
            && ['SENT', 'OVERDUE'].includes(inv.status) && (!inv.peppolStatus || inv.peppolStatus === 'ERROR');
          const canMarkPeppolManualDetail = inv.source !== 'incoming'
            && ['SENT', 'OVERDUE', 'PAID'].includes(inv.status)
            && !inv.peppolStatus;
          const canDuplicateDetail = isStandalone;

          return (
            <>
              {/* Header */}
              <div style={{
                padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: `1px solid ${FB.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%',
                    background: source.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 16 : 18,
                    flexShrink: 0,
                  }}>
                    {inv.source === 'chantier' ? '🏗️' : inv.source === 'incoming' ? '📥' : '📄'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</div>
                    <div style={{ fontSize: isMobile ? 11 : 12, color: FB.textSecondary }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: sc.bg, color: sc.color,
                    padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  }}>
                    {sc.icon} {sc.label}
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', background: FB.btnGray,
                      border: 'none', cursor: 'pointer', fontSize: 18, color: FB.textSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: isMobile ? 16 : 20, maxHeight: '65vh', overflowY: 'auto' }}>
                {detailLoading && (
                  <div style={{ textAlign: 'center', padding: 8 }}>
                    <Spin size="small" /> <span style={{ color: FB.textSecondary, fontSize: 13 }}>Chargement des détails...</span>
                  </div>
                )}

                {/* Émetteur (organization) */}
                {inv.organizationName && inv.source !== 'incoming' && (
                  <div style={{
                    background: FB.blue + '08', borderRadius: FB.radius, padding: 16, marginBottom: 16,
                    border: `1px solid ${FB.blue}20`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Émetteur</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: FB.text, marginBottom: 4 }}>{inv.organizationName}</div>
                    {inv.organizationVat && <div style={{ fontSize: 13, color: FB.textSecondary }}>TVA : {inv.organizationVat}</div>}
                    {inv.organizationAddress && <div style={{ fontSize: 13, color: FB.textSecondary }}>{inv.organizationAddress}</div>}
                    {inv.organizationPhone && <div style={{ fontSize: 13, color: FB.textSecondary }}>{inv.organizationPhone}</div>}
                    {inv.organizationEmail && <div style={{ fontSize: 13, color: FB.textSecondary }}>{inv.organizationEmail}</div>}
                  </div>
                )}

                {/* Client info */}
                <div style={{
                  background: FB.bg, borderRadius: FB.radius, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Client</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: FB.text, marginBottom: 4 }}>{inv.clientName}</div>
                  {inv.clientVat && <div style={{ fontSize: 13, color: FB.textSecondary }}>TVA : {inv.clientVat}</div>}
                  {inv.clientAddress && <div style={{ fontSize: 13, color: FB.textSecondary }}>{inv.clientAddress}</div>}
                  {inv.clientPhone && <div style={{ fontSize: 13, color: FB.textSecondary }}>{inv.clientPhone}</div>}
                  {inv.clientEmail && <div style={{ fontSize: 13, color: FB.textSecondary }}>{inv.clientEmail}</div>}
                </div>

                {/* Description */}
                {inv.description && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Objet</div>
                    <div style={{ fontSize: 15, color: FB.text }}>{inv.description}</div>
                  </div>
                )}

                {/* Lines */}
                {inv.lines && inv.lines.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lignes de facture</div>
                    <div style={{ border: `1px solid ${FB.border}`, borderRadius: FB.radius, overflow: 'hidden' }}>
                      {/* Table header (desktop only) */}
                      {!isMobile && (
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px',
                          background: FB.bg, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: FB.textSecondary,
                        }}>
                          <div>Description</div>
                          <div style={{ textAlign: 'center' }}>Qté</div>
                          <div style={{ textAlign: 'right' }}>Prix unit.</div>
                          <div style={{ textAlign: 'right' }}>Total</div>
                        </div>
                      )}
                      {inv.lines.map((line, i) => (
                        isMobile ? (
                          <div key={i} style={{
                            padding: '10px 12px', borderTop: i > 0 ? `1px solid ${FB.border}` : undefined,
                          }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: FB.text, marginBottom: 4 }}>{line.description}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: FB.textSecondary }}>
                              <span>{line.quantity} × €{line.unitPrice.toFixed(2)}</span>
                              <span style={{ fontWeight: 600, color: FB.text }}>€{(line.quantity * line.unitPrice).toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px',
                            padding: '10px 12px', fontSize: 14, color: FB.text,
                            borderTop: `1px solid ${FB.border}`,
                          }}>
                            <div>{line.description}</div>
                            <div style={{ textAlign: 'center' }}>{line.quantity}</div>
                            <div style={{ textAlign: 'right' }}>€{line.unitPrice.toFixed(2)}</div>
                            <div style={{ textAlign: 'right', fontWeight: 600 }}>€{(line.quantity * line.unitPrice).toFixed(2)}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div style={{
                  background: FB.bg, borderRadius: FB.radius, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: FB.textSecondary, fontSize: 14 }}>Sous-total HT</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>€{(inv.subtotal ?? inv.amount ?? 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: FB.textSecondary, fontSize: 14 }}>TVA ({inv.taxRate ?? 21}%)</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>€{(inv.taxAmount ?? 0).toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${FB.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 18, color: FB.text }}>Total TTC</span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: FB.blue }}>€{(inv.amount ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: FB.bg, borderRadius: FB.radius, padding: 12 }}>
                    <div style={{ fontSize: 12, color: FB.textSecondary, marginBottom: 2 }}>Date d'émission</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{dayjs(inv.issueDate || inv.createdAt).format('D MMMM YYYY')}</div>
                  </div>
                  <div style={{ background: FB.bg, borderRadius: FB.radius, padding: 12 }}>
                    <div style={{ fontSize: 12, color: FB.textSecondary, marginBottom: 2 }}>Échéance</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {inv.dueDate ? dayjs(inv.dueDate).format('D MMMM YYYY') : '—'}
                    </div>
                  </div>
                  {inv.paidAt && (
                    <div style={{ background: FB.lightGreen, borderRadius: FB.radius, padding: 12 }}>
                      <div style={{ fontSize: 12, color: FB.green, marginBottom: 2 }}>Payée le</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: FB.green }}>{dayjs(inv.paidAt).format('D MMMM YYYY')}</div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {inv.notes && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                    <div style={{ fontSize: 14, color: FB.text, background: FB.bg, borderRadius: FB.radius, padding: 12, whiteSpace: 'pre-wrap' }}>{inv.notes}</div>
                  </div>
                )}

                {/* Peppol status */}
                {inv.peppolStatus && (
                  <div style={{
                    background: inv.peppolStatus === 'DONE' ? FB.lightGreen : FB.lightPurple,
                    borderRadius: FB.radius, padding: 12, marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <ThunderboltOutlined style={{ color: inv.peppolStatus === 'DONE' ? FB.green : FB.purple }} />
                    <span style={{ fontWeight: 600, color: inv.peppolStatus === 'DONE' ? FB.green : FB.purple }}>
                      Peppol : {inv.peppolStatus === 'DONE' ? 'Envoyée avec succès' : inv.peppolStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div style={{
                padding: isMobile ? '10px 12px' : '12px 20px', borderTop: `1px solid ${FB.border}`,
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                {canEdit && (
                  <button
                    onClick={() => openEditMode(inv)}
                    style={{
                      flex: isMobile ? '1 1 45%' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.blue, border: 'none', borderRadius: 6,
                      color: '#fff', fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                    }}
                  >
                    <EditOutlined /> Modifier
                  </button>
                )}
                {canMarkSentDetail && (
                  <button
                    onClick={() => { setSelectedInvoice(null); handleOpenEmailPreview(inv); }}
                    style={{
                      flex: isMobile ? '1 1 45%' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                      color: FB.blue, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                    }}
                  >
                    <SendOutlined /> {isMobile ? 'Email' : 'Envoyer par email'}
                  </button>
                )}
                {canMarkSentDetail && (
                  <button
                    onClick={() => { handleMarkSent(inv.id); setSelectedInvoice(null); }}
                    style={{
                      flex: isMobile ? '1 1 45%' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                      color: FB.orange, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                    }}
                  >
                    <CheckCircleOutlined /> {isMobile ? 'Envoyée' : 'Marquer envoyée'}
                  </button>
                )}
                <button
                  onClick={() => handleDownloadPdf(inv)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: isMobile ? '8px 10px' : '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                    color: FB.textSecondary, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                    flex: isMobile ? '1 1 auto' : undefined,
                  }}
                >
                  <DownloadOutlined /> PDF
                </button>
                {canMarkPaidDetail && (
                  <button
                    onClick={() => { handleMarkPaid(inv.id); setSelectedInvoice(null); }}
                    style={{
                      flex: isMobile ? '1 1 45%' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                      color: FB.green, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                    }}
                  >
                    <DollarOutlined /> {isMobile ? 'Payée' : 'Marquer payée'}
                  </button>
                )}
                {canSendPeppolDetail && (
                  <button
                    onClick={() => { setSelectedInvoice(null); setPeppolModalInvoice(inv); setPeppolEndpoint((inv.clientVat || '').replace(/^BE/i, '').replace(/[\s.\-]/g, '')); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.purple + '10', border: 'none', borderRadius: 6,
                      color: FB.purple, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                      flex: isMobile ? '1 1 auto' : undefined,
                    }}
                  >
                    <ThunderboltOutlined /> Peppol
                  </button>
                )}
                {(inv.peppolStatus === 'PROCESSING' || inv.peppolStatus === 'ERROR') && (
                  <button
                    onClick={() => { handlePeppolRetry(inv.id); setSelectedInvoice(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.orange + '10', border: 'none', borderRadius: 6,
                      color: FB.orange, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                      flex: isMobile ? '1 1 auto' : undefined,
                    }}
                  >
                    🔄 {isMobile ? 'Retry' : 'Réessayer Peppol'}
                  </button>
                )}
                {inv.source === 'chantier' && inv.chantierId && (
                  <button
                    onClick={() => { window.location.href = `/chantiers?id=${inv.chantierId}`; }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                      color: FB.orange, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                      flex: isMobile ? '1 1 auto' : undefined,
                    }}
                  >
                    🏗️ {isMobile ? 'Chantier' : 'Voir chantier'}
                  </button>
                )}
                {canDuplicateDetail && (
                  <button
                    onClick={() => handleDuplicate(inv)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
                      color: FB.textSecondary, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                      flex: isMobile ? '1 1 auto' : undefined,
                    }}
                  >
                    <CopyOutlined /> Dupliquer
                  </button>
                )}
                {canMarkPeppolManualDetail && (
                  <button
                    onClick={() => { setSelectedInvoice(null); setPeppolManualInvoice(inv); setPeppolManualRecipient(inv.clientVat || ''); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.purple + '10', border: 'none', borderRadius: 6,
                      color: FB.purple, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                      flex: isMobile ? '1 1 auto' : undefined,
                    }}
                  >
                    <ThunderboltOutlined /> Peppol (ancien)
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => { setSelectedInvoice(null); handleDelete(inv.id, inv.source); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: isMobile ? '8px 10px' : '10px 16px', background: FB.lightRed, border: 'none', borderRadius: 6,
                      color: FB.red, fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                      flex: isMobile ? '1 1 auto' : undefined,
                    }}
                  >
                    <DeleteOutlined /> Supprimer
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          PEPPOL SEND MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!peppolModalInvoice}
        onCancel={() => { setPeppolModalInvoice(null); setPeppolEndpoint(''); }}
        footer={null}
        width={isMobile ? '100%' : 480}
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

      {/* ═══════════════════════════════════════════════════════════
          PEPPOL MANUAL MARKING MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!peppolManualInvoice}
        onCancel={() => { setPeppolManualInvoice(null); setPeppolManualRecipient(''); }}
        footer={null}
        width={isMobile ? '100%' : 480}
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
            <div style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>Marquer comme envoyée Peppol</div>
          </div>
          <button
            onClick={() => { setPeppolManualInvoice(null); setPeppolManualRecipient(''); }}
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
          {peppolManualInvoice && (
            <>
              <div style={{
                background: FB.bg, borderRadius: FB.radius, padding: 14, marginBottom: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>
                  {peppolManualInvoice.invoiceNumber}
                </div>
                <div style={{ fontSize: 13, color: FB.textSecondary }}>
                  {peppolManualInvoice.clientName} — €{(peppolManualInvoice.amount || 0).toFixed(2)}
                </div>
              </div>

              <div style={{ fontSize: 13, color: FB.textSecondary, marginBottom: 16, lineHeight: 1.5 }}>
                Cette facture a été envoyée via Peppol (ex: Accountable, Hermes...).
                Indiquez le destinataire pour garder la trace.
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: FB.text, display: 'block', marginBottom: 6 }}>
                  Destinataire Peppol (n° TVA ou BCE)
                </label>
                <input
                  value={peppolManualRecipient}
                  onChange={e => setPeppolManualRecipient(e.target.value)}
                  placeholder="BE0123456789 ou nom du destinataire"
                  style={{
                    width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                    borderRadius: 6, fontSize: 14, outline: 'none', background: FB.bg,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = FB.purple)}
                  onBlur={e => (e.currentTarget.style.borderColor = FB.border)}
                />
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${FB.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => { setPeppolManualInvoice(null); setPeppolManualRecipient(''); }}
            style={{
              padding: '10px 20px', background: FB.btnGray, border: 'none',
              borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: FB.text, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleMarkPeppolManual}
            style={{
              padding: '10px 24px', background: FB.purple,
              border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: 'pointer',
            }}
          >
            ⚡ Marquer Peppol envoyée
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          EMAIL PREVIEW MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!emailPreviewInvoice}
        onCancel={() => setEmailPreviewInvoice(null)}
        footer={null}
        width={isMobile ? '100%' : 600}
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
            <SendOutlined style={{ color: FB.blue, fontSize: 20 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>Aperçu de l'email</div>
          </div>
          <button
            onClick={() => setEmailPreviewInvoice(null)}
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
          {/* PDF attachment notice */}
          <div style={{
            background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: FB.blue,
          }}>
            <DownloadOutlined />
            <span>Le PDF de la facture <strong>{emailPreviewInvoice?.invoiceNumber}</strong> sera joint automatiquement.</span>
          </div>

          {/* To field */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Destinataire(s) <span style={{ fontSize: 11 }}>(séparés par des virgules)</span></label>
            <input
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="client@example.com, autre@example.com"
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                borderRadius: 6, fontSize: 14, outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Objet</label>
            <input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                borderRadius: 6, fontSize: 14, outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Preview rendered */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Aperçu</label>
            <div
              style={{
                border: `1px solid ${FB.border}`, borderRadius: 8, padding: 16,
                background: '#fff', maxHeight: 200, overflow: 'auto', fontSize: 14, lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: emailBody }}
            />
          </div>

          {/* Peppol toggle */}
          {peppolActive && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: emailSendPeppol ? '#F0FFF4' : FB.btnGray,
              borderRadius: 8, marginBottom: 16, border: `1px solid ${emailSendPeppol ? '#38A169' : FB.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔗</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: FB.text }}>Envoi Peppol</div>
                  <div style={{ fontSize: 11, color: FB.textSecondary }}>Envoyer également via le réseau Peppol (e-invoicing)</div>
                </div>
              </div>
              <Switch checked={emailSendPeppol} onChange={setEmailSendPeppol} />
            </div>
          )}

          {/* CC org notice */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: '#FFFBE6', borderRadius: 6, fontSize: 12, color: '#AD6800',
            border: '1px solid #FFE58F',
          }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span>Une copie sera envoyée à l'adresse email de votre Colony.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '10px 12px' : '12px 20px', borderTop: `1px solid ${FB.border}`,
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile ? 'stretch' : 'space-between', alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 8 : 0,
        }}>
          <button
            onClick={() => {
              if (emailPreviewInvoice) handleDownloadPdf(emailPreviewInvoice);
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', background: FB.btnGray, border: 'none', borderRadius: 6,
              color: FB.textSecondary, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            <DownloadOutlined /> Télécharger PDF
          </button>
          <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
            <button
              onClick={() => setEmailPreviewInvoice(null)}
              style={{
                padding: '10px 20px', background: FB.btnGray, border: 'none',
                borderRadius: 6, fontSize: 15, fontWeight: 600,
                color: FB.text, cursor: 'pointer', flex: isMobile ? 1 : undefined,
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSendEmail}
              disabled={emailSending || !emailTo.trim()}
              style={{
                padding: '10px 24px', background: emailSending || !emailTo.trim() ? FB.btnGray : FB.blue,
                border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
                color: '#fff', cursor: emailSending || !emailTo.trim() ? 'not-allowed' : 'pointer',
                opacity: emailSending ? 0.6 : 1, flex: isMobile ? 1 : undefined,
              }}
            >
              {emailSending ? 'Envoi en cours...' : '📧 Envoyer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          SCAN TICKET / CREATE EXPENSE MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={showScanModal}
        onCancel={() => { setShowScanModal(false); setScanResult(null); setScanPreview(null); setShowExpenseForm(false); }}
        footer={null}
        width={isMobile ? '100%' : 640}
        centered
        title={null}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: isMobile ? 16 : 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#27ae6020',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CameraOutlined style={{ color: '#27ae60', fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: FB.text }}>
                  {showExpenseForm ? 'Nouvelle dépense' : 'Scanner un ticket'}
                </div>
                <div style={{ fontSize: 12, color: FB.textSecondary }}>
                  {showExpenseForm ? 'Vérifiez et ajustez les données' : 'L\'IA Gemini extrait les données automatiquement'}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setShowScanModal(false); setScanResult(null); setScanPreview(null); setShowExpenseForm(false); }}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: FB.textSecondary }}
            >✕</button>
          </div>

          {/* Step 1: Upload / Camera */}
          {!showExpenseForm && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScanTicket(file);
                  e.target.value = '';
                }}
              />

              {scanning ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ marginBottom: 16 }}>
                    {scanPreview && (
                      <img src={scanPreview} alt="ticket" style={{
                        maxWidth: '100%', maxHeight: 200, borderRadius: 8, opacity: 0.6,
                      }} />
                    )}
                  </div>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#27ae60' }} spin />} />
                  <div style={{ marginTop: 12, fontWeight: 600, color: FB.text }}>Analyse en cours...</div>
                  <div style={{ fontSize: 13, color: FB.textSecondary }}>Gemini AI extrait les données du ticket</div>
                </div>
              ) : (
                <div style={{
                  border: `2px dashed ${FB.border}`, borderRadius: 12, padding: 40,
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#27ae60'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = FB.border; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = FB.border;
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) handleScanTicket(file);
                  }}
                >
                  <CameraOutlined style={{ fontSize: 48, color: FB.border, marginBottom: 12 }} />
                  <div style={{ fontWeight: 600, fontSize: 16, color: FB.text, marginBottom: 4 }}>
                    {isMobile ? 'Touchez pour prendre une photo' : 'Glissez une image ou cliquez'}
                  </div>
                  <div style={{ fontSize: 13, color: FB.textSecondary }}>
                    Photo de ticket, facture, reçu, note de frais
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Expense form (after scan or manual) */}
          {showExpenseForm && (
            <div>
              {/* Confidence badge */}
              {scanResult && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                  padding: '8px 14px', borderRadius: 8,
                  background: (scanResult.confidence || 0) > 0.7 ? '#27ae6015' : '#e67e2215',
                  border: `1px solid ${(scanResult.confidence || 0) > 0.7 ? '#27ae6040' : '#e67e2240'}`,
                }}>
                  <span style={{ fontSize: 16 }}>{(scanResult.confidence || 0) > 0.7 ? '✅' : '⚠️'}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: (scanResult.confidence || 0) > 0.7 ? '#27ae60' : '#e67e22' }}>
                    Confiance IA : {((scanResult.confidence || 0) * 100).toFixed(0)}% — Vérifiez les données
                  </span>
                </div>
              )}

              {/* Scan preview on the side */}
              {scanPreview && (
                <div style={{ marginBottom: 14, textAlign: 'center' }}>
                  <img src={scanPreview} alt="ticket" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, border: `1px solid ${FB.border}` }} />
                </div>
              )}

              {/* Form */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                {/* Supplier */}
                <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Fournisseur *</label>
                  <input
                    value={expenseForm.supplierName}
                    onChange={e => setExpenseForm(p => ({ ...p, supplierName: e.target.value }))}
                    placeholder="Nom du magasin / fournisseur"
                    style={{
                      width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                      borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Montant TTC (€) *</label>
                  <InputNumber
                    value={expenseForm.totalAmount}
                    onChange={v => {
                      const total = v || 0;
                      const sub = total / (1 + expenseForm.taxRate / 100);
                      setExpenseForm(p => ({ ...p, totalAmount: total, subtotal: Math.round(sub * 100) / 100, taxAmount: Math.round((total - sub) * 100) / 100 }));
                    }}
                    min={0} step={0.01} precision={2} prefix="€"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Tax rate */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Taux TVA (%)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[6, 12, 21].map(rate => (
                      <button key={rate} onClick={() => {
                        const sub = expenseForm.totalAmount / (1 + rate / 100);
                        setExpenseForm(p => ({ ...p, taxRate: rate, subtotal: Math.round(sub * 100) / 100, taxAmount: Math.round((p.totalAmount - sub) * 100) / 100 }));
                      }}
                        style={{
                          flex: 1, padding: '8px 0', border: `1px solid ${expenseForm.taxRate === rate ? '#27ae60' : FB.border}`,
                          borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          background: expenseForm.taxRate === rate ? '#27ae6015' : '#fff',
                          color: expenseForm.taxRate === rate ? '#27ae60' : FB.text,
                        }}
                      >{rate}%</button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Catégorie</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                      <button key={key} onClick={() => setExpenseForm(p => ({ ...p, category: key }))}
                        style={{
                          padding: '6px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          border: `1px solid ${expenseForm.category === key ? info.color : FB.border}`,
                          background: expenseForm.category === key ? info.color + '15' : '#fff',
                          color: expenseForm.category === key ? info.color : FB.textSecondary,
                        }}
                      >{info.icon} {info.label}</button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Date</label>
                  <DatePicker
                    value={expenseForm.expenseDate ? dayjs(expenseForm.expenseDate) : null}
                    onChange={d => setExpenseForm(p => ({ ...p, expenseDate: d?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD') }))}
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Payment method */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { key: 'card', label: '💳 Carte' },
                      { key: 'cash', label: '💵 Cash' },
                      { key: 'transfer', label: '🏦 Virement' },
                    ].map(pm => (
                      <button key={pm.key} onClick={() => setExpenseForm(p => ({ ...p, paymentMethod: pm.key }))}
                        style={{
                          flex: 1, padding: '8px 0', border: `1px solid ${expenseForm.paymentMethod === pm.key ? FB.blue : FB.border}`,
                          borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          background: expenseForm.paymentMethod === pm.key ? FB.lightBlue : '#fff',
                          color: expenseForm.paymentMethod === pm.key ? FB.blue : FB.textSecondary,
                        }}
                      >{pm.label}</button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>Description</label>
                  <input
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ex: Achat matériel chantier Dupont"
                    style={{
                      width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                      borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Reference */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>N° ticket / référence</label>
                  <input
                    value={expenseForm.reference}
                    onChange={e => setExpenseForm(p => ({ ...p, reference: e.target.value }))}
                    placeholder="Optionnel"
                    style={{
                      width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                      borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Supplier VAT */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary, display: 'block', marginBottom: 4 }}>TVA fournisseur</label>
                  <input
                    value={expenseForm.supplierVat}
                    onChange={e => setExpenseForm(p => ({ ...p, supplierVat: e.target.value }))}
                    placeholder="BE0123456789"
                    style={{
                      width: '100%', padding: '10px 12px', border: `1px solid ${FB.border}`,
                      borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div style={{
                marginTop: 16, padding: 14, borderRadius: 8, background: '#f8f9fa',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ fontSize: 13, color: FB.textSecondary }}>
                  HT: €{expenseForm.subtotal.toFixed(2)} + TVA {expenseForm.taxRate}%: €{expenseForm.taxAmount.toFixed(2)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#e74c3c' }}>
                  €{expenseForm.totalAmount.toFixed(2)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                {!scanResult && (
                  <button
                    onClick={() => { setShowExpenseForm(false); }}
                    style={{
                      padding: '10px 20px', background: FB.btnGray, border: 'none',
                      borderRadius: 6, fontSize: 14, fontWeight: 600, color: FB.text, cursor: 'pointer',
                    }}
                  >Annuler</button>
                )}
                {scanResult && (
                  <button
                    onClick={() => { setShowExpenseForm(false); setScanResult(null); setScanPreview(null); }}
                    style={{
                      padding: '10px 20px', background: FB.btnGray, border: 'none',
                      borderRadius: 6, fontSize: 14, fontWeight: 600, color: FB.text, cursor: 'pointer',
                    }}
                  >Re-scanner</button>
                )}
                <button
                  onClick={handleSaveExpense}
                  disabled={savingExpense || !expenseForm.supplierName.trim() || expenseForm.totalAmount <= 0}
                  style={{
                    padding: '10px 24px',
                    background: savingExpense || !expenseForm.supplierName.trim() || expenseForm.totalAmount <= 0 ? FB.btnGray : '#27ae60',
                    border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
                    color: '#fff', cursor: savingExpense ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingExpense ? 'Enregistrement...' : '✅ Enregistrer la dépense'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          EXPENSE DETAIL MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selectedExpense}
        onCancel={() => setSelectedExpense(null)}
        footer={null}
        width={isMobile ? '100%' : 480}
        centered
        title={null}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        {selectedExpense && (() => {
          const cat = getCategoryInfo(selectedExpense.category);
          return (
            <div style={{ padding: isMobile ? 16 : 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: cat.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}>{cat.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: FB.text }}>{selectedExpense.supplierName}</div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>{cat.label} • {dayjs(selectedExpense.expenseDate).format('DD/MM/YYYY')}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedExpense(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: FB.textSecondary }}>✕</button>
              </div>

              <div style={{ fontSize: 32, fontWeight: 700, color: '#e74c3c', textAlign: 'center', marginBottom: 20 }}>
                -€{selectedExpense.totalAmount.toFixed(2)}
              </div>

              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                {[
                  { label: 'HT', value: `€${selectedExpense.subtotal.toFixed(2)}` },
                  { label: `TVA ${selectedExpense.taxRate}%`, value: `€${selectedExpense.taxAmount.toFixed(2)}` },
                  { label: 'TTC', value: `€${selectedExpense.totalAmount.toFixed(2)}`, bold: true },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                    fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 15 : 13,
                    color: row.bold ? FB.text : FB.textSecondary,
                  }}>
                    <span>{row.label}</span><span>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedExpense.description && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary }}>Description</div>
                  <div style={{ fontSize: 14, color: FB.text }}>{selectedExpense.description}</div>
                </div>
              )}
              {selectedExpense.reference && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary }}>Référence</div>
                  <div style={{ fontSize: 14, color: FB.text }}>{selectedExpense.reference}</div>
                </div>
              )}
              {selectedExpense.supplierVat && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FB.textSecondary }}>TVA Fournisseur</div>
                  <div style={{ fontSize: 14, color: FB.text }}>{selectedExpense.supplierVat}</div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {selectedExpense.aiExtracted && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#9b59b620', color: '#9b59b6', fontWeight: 600 }}>
                    Extrait par IA {selectedExpense.aiConfidence ? `(${(selectedExpense.aiConfidence * 100).toFixed(0)}%)` : ''}
                  </span>
                )}
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                  background: selectedExpense.status === 'PAID' ? '#27ae6020' : '#e67e2220',
                  color: selectedExpense.status === 'PAID' ? '#27ae60' : '#e67e22',
                }}>
                  {selectedExpense.status === 'PAID' ? 'Payé' : 'En attente'}
                </span>
                {selectedExpense.paymentMethod && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: FB.btnGray, color: FB.textSecondary }}>
                    {selectedExpense.paymentMethod === 'card' ? '💳 Carte' : selectedExpense.paymentMethod === 'cash' ? '💵 Cash' : '🏦 Virement'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    modal.confirm({
                      title: 'Supprimer cette dépense ?',
                      content: `${selectedExpense.supplierName} — €${selectedExpense.totalAmount.toFixed(2)}`,
                      okText: 'Supprimer',
                      okType: 'danger',
                      cancelText: 'Annuler',
                      onOk: () => { handleDeleteExpense(selectedExpense.id); setSelectedExpense(null); },
                    });
                  }}
                  style={{
                    padding: '8px 16px', background: FB.lightRed, border: 'none',
                    borderRadius: 6, fontSize: 13, fontWeight: 600, color: FB.red, cursor: 'pointer',
                  }}
                >
                  <DeleteOutlined /> Supprimer
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default FacturePage;
