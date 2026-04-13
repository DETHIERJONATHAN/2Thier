import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Tabs, 
  Button, 
  Space, 
  Avatar, 
  Timeline, 
  Upload, 
  Modal, 
  Input, 
  Tag,
  // Divider,
  Typography,
  Row,
  Col,
  Descriptions,
  Badge,
  Tooltip,
  Grid
} from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined, 
  UserOutlined,
  FileOutlined,
  PlusOutlined,
  // EditOutlined,
  ArrowLeftOutlined,
  BellOutlined,
  // MessageOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';
import { extractApiArray, unwrapApiData } from '../../utils/apiResponse';
import type { ApiEnvelope } from '../../utils/apiResponse';
import type { Lead, LeadAddress, LeadApiResponse } from '../../types/leads';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

type LeadHistoryItem = {
  type: 'call' | 'email' | 'note' | 'meeting' | string;
  content: string;
  author: string;
  createdAt: string | Date;
};

type LeadDocument = {
  name: string;
  type: string;
  url?: string;
};

/**
 * 📋 Module du Lead (fiche détaillée) - Version finale
 * 
 * Contenu :
 * - Infos du client : coordonnées, email, téléphone, adresse, source, etc.
 * - Historique complet : appels, emails, notes, RDV passés.
 * - Notes internes (texte libre, obligatoires après appel).
 * - Documents liés : devis, factures, contrats (upload possible).
 * - Boutons d'action : 📞 Appeler, 📅 Agenda, ✉️ Email
 * - IA intégrée : suggestions de scripts, analyse des notes, propositions de RDV
 */
interface LeadDetailModuleProps {
  leadId?: string; // Utilisation en modal
  onClose?: () => void; // Callback fermeture modal
}

export default function LeadDetailModule({ leadId: propLeadId, onClose }: LeadDetailModuleProps = {}): React.ReactElement {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  
  // Déterminer la source du leadId (prop > URL)
  const leadId = propLeadId || urlLeadId;

  // États principaux
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  
  // États pour les modales
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  // const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  
  // États pour les formulaires
  // const [noteForm] = Form.useForm();
  const [currentNote, setCurrentNote] = useState('');
  
  // États pour l'historique
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [regeneratingFormPdf, setRegeneratingFormPdf] = useState(false);
  const formPdfAutoRequested = useRef(false);

  // 📊 Récupération des détails du lead
  const fetchLeadDetail = useCallback(async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      // Détails du lead (gérer {success, data} et fallback direct)
  const leadResp = await api.get<LeadApiResponse>(`/api/leads/${leadId}`);
  const leadData = unwrapApiData<Lead>(leadResp);
      setLead(leadData ?? null);
      
      // Historique (tolérer 404 et structures différentes)
      try {
        const historyResp = await api.get<LeadHistoryItem[] | ApiEnvelope<LeadHistoryItem[]> | null>(`/api/leads/${leadId}/history`, {
          suppressErrorLogForStatuses: [404],
          showErrors: false,
        });
        setHistory(extractApiArray<LeadHistoryItem>(historyResp));
      } catch {
        // 404 acceptable => pas d'historique
        setHistory([]);
      }
      
      // Documents (tolérer 404 et structures différentes)
      try {
        const docsResp = await api.get<LeadDocument[] | ApiEnvelope<LeadDocument[]> | null>(`/api/leads/${leadId}/documents`, {
          suppressErrorLogForStatuses: [404],
          showErrors: false,
        });
        setDocuments(extractApiArray<LeadDocument>(docsResp));
      } catch {
        setDocuments([]);
      }
      
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Erreur lors du chargement du lead');
      const errorDetails = getErrorResponseDetails(err);
      console.error('Erreur lors du chargement du lead:', {
        error: err,
        message: errorMessage,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [leadId, api]);

  const handleRegenerateFormPdf = useCallback(async () => {
    if (!leadId) return;
    setRegeneratingFormPdf(true);
    try {
      const response = await api.post<{ pdfUrl: string; formName: string; formSlug: string }>(`/api/leads/${leadId}/form-pdf/regenerate`);
      if (response?.pdfUrl) {
        setLead((prev) => {
          if (!prev) return prev;
          const prevData = (prev.data && typeof prev.data === 'object') ? prev.data : {};
          return {
            ...prev,
            data: {
              ...prevData,
              formPdfUrl: response.pdfUrl,
              formName: response.formName,
              formSlug: response.formSlug
            }
          } as Lead;
        });
        NotificationManager.success('PDF généré avec succès');
      } else {
        NotificationManager.error('PDF non généré');
      }
    } catch (error) {
      console.error('Erreur régénération PDF:', error);
      NotificationManager.error('Erreur lors de la génération du PDF');
    } finally {
      setRegeneratingFormPdf(false);
    }
  }, [leadId, api]);

  // 🔄 Chargement initial
  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  // ✅ Auto-génération du PDF si manquant (1 seule fois)
  useEffect(() => {
    if (!lead || !leadId) return;
    const hasPdf = typeof lead.data === 'object' && lead.data && (lead.data as unknown).formPdfUrl;
    if (!hasPdf && !formPdfAutoRequested.current) {
      formPdfAutoRequested.current = true;
      handleRegenerateFormPdf();
    }
  }, [lead, leadId, handleRegenerateFormPdf]);

  // Helpers de normalisation (priorité aux champs top-level, fallback sur data pour compatibilité)
  const asString = (v: unknown): string => (v == null ? '' : String(v));
  const joinName = (a?: unknown, b?: unknown) => [a, b].filter(Boolean).map(asString).join(' ').trim();
  const pickFirst = (...vals: Array<unknown>): string => {
    for (const v of vals) {
      if (Array.isArray(v)) {
        if (v.length > 0 && v[0]) {
          const first = v[0] as unknown;
          if (typeof first === 'string') return first.trim();
          if (typeof first === 'object') return JSON.stringify(first); // fallback, sera formaté si adresse
        }
      } else if (typeof v === 'string') {
        const s = v.trim();
        if (s) return s;
      } else if (v != null) {
        // nombres ou objets
        const s = String(v).trim();
        if (s) return s;
      }
    }
    return '';
  };
  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  const nameFromEmail = (email?: string): string => {
    if (!email) return '';
    const local = email.split('@')[0] || '';
    const parts = local.split(/[._-]+/).filter(Boolean).map(capitalize);
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts.join(' ');
  };

  // Préférer les colonnes dédiées renvoyées par l'API normalisée
  const displayNameSources: unknown[] = [
    joinName(lead?.firstName, lead?.lastName),
    lead?.name,
    joinName(lead?.data?.firstName, lead?.data?.lastName),
    lead?.data?.name,
    lead?.fullName,
    lead?.contact?.name,
    joinName(lead?.contact?.firstName, lead?.contact?.lastName),
    lead?.customer?.name,
    lead?.companyContact?.name,
  ];
  let displayName = pickFirst(...displayNameSources);
  if (!displayName) {
    // Fallback intelligents: email -> nom, sinon téléphone
    const emailCandidate = pickFirst(lead?.email, lead?.data?.email);
    const phoneCandidate = pickFirst(lead?.phone, lead?.data?.phone);
    const fromEmail = nameFromEmail(emailCandidate);
    displayName = fromEmail || phoneCandidate || 'Lead sans nom';
  }

  const displayEmail = pickFirst(
    lead?.email,
    lead?.contactEmail,
    lead?.contact?.email,
    lead?.emails,
    lead?.contact?.emails,
    lead?.data?.email
  );

  const displayPhone = pickFirst(
    lead?.phone,
    lead?.mobile,
    lead?.telephone,
    lead?.contact?.phone,
    lead?.contact?.mobile,
    lead?.phones,
    lead?.contact?.phones,
    lead?.data?.phone
  );

  const displayCompany = pickFirst(
    lead?.company,
    lead?.companyName,
    lead?.organization?.name,
    lead?.contact?.company,
    lead?.customer?.company,
    lead?.isCompany ? lead?.name : '',
    lead?.data?.company
  );
  const displaySource = (() => {
    const raw = pickFirst(lead?.source, lead?.data?.source, lead?.data?.formSource);
    if (!raw) return 'N/A';
    if (raw === 'website_form') return 'Formulaire en ligne';
    return String(raw);
  })();
  const formatAddress = (addr: LeadAddress | string | null | undefined): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street ?? addr.line1, addr.postalCode ?? addr.zip, addr.city, addr.country]
      .map((x) => (x ? String(x) : ''))
      .filter(Boolean);
    return parts.join(' ');
  };

  const firstAddress = (entries: Array<LeadAddress | string | null | undefined>): LeadAddress | string | null | undefined => {
    for (const entry of entries) {
      if (entry) return entry;
    }
    return null;
  };

  const displayAddress = formatAddress(firstAddress([
    lead?.address,
    Array.isArray(lead?.addresses) ? lead?.addresses?.[0] : undefined,
    lead?.contact?.address,
    Array.isArray(lead?.contact?.addresses) ? lead?.contact?.addresses?.[0] : undefined,
    lead?.data?.address as LeadAddress | string | null | undefined,
    Array.isArray(lead?.data?.addresses) ? (lead?.data?.addresses?.[0] as LeadAddress | string | undefined) : undefined,
  ]));

  // Debug non intrusif pour comprendre la source du nom affiché
  if (typeof window !== 'undefined' && lead) {
    try {
      console.log('[LeadDetailModule] 🧩 Debug nom', {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        nameTop: lead.name,
        nameData: lead.data?.name,
        email: lead.email,
        phone: lead.phone,
        displayName
      });
    } catch (e) {
      console.warn('[LeadDetailModule] Debug nom: erreur de log', e);
    }
  }

  // 📞 Action : Appeler le lead
  const handleCallLead = useCallback(() => {
    if (!lead) return;
    
    // TODO: Intégrer avec Telnyx
    // Suggestion IA de script d'appel avant d'ouvrir Telnyx
    Modal.info({
      title: '🤖 Script d\'appel suggéré par l\'IA',
      content: (
        <div>
          <p><strong>Contexte :</strong> {displayCompany ? 'Prospect B2B' : 'Prospect B2C'}</p>
          <p><strong>Dernier contact :</strong> {lead?.lastContactDate ? dayjs(lead.lastContactDate).format('DD/MM/YYYY') : 'Premier contact'}</p>
          <p><strong>Script suggéré :</strong></p>
          <div className="bg-blue-50 p-3 rounded mt-2">
            \"Bonjour {displayName}, je suis {user?.firstName} de 2Thier SRL. 
            Je vous contacte concernant votre demande sur notre site web...\"
          </div>
        </div>
      ),
      onOk() {
        // Rediriger vers le module d'appel
        navigate(`/leads/call/${leadId}`);
      },
    });
  }, [lead, user, leadId, navigate, displayCompany, displayName]);

  // 📅 Action : Planifier RDV (Google Agenda)
  const handleScheduleMeeting = useCallback(() => {
    if (!lead) return;
    
    // TODO: Intégrer avec Google Calendar
    // Propositions de créneaux optimisés par IA
    Modal.info({
      title: '🤖 Créneaux optimisés par l\'IA',
      content: (
        <div>
          <p><strong>Meilleurs créneaux suggérés :</strong></p>
          <ul className="mt-2">
            <li>Demain 14h00 - 15h00 (Disponibilité élevée)</li>
            <li>Jeudi 10h00 - 11h00 (Optimisé pour ce profil client)</li>
            <li>Vendredi 16h00 - 17h00 (Créneau préféré client)</li>
          </ul>
        </div>
      ),
      onOk() {
        // Ouvrir Google Calendar en mode iframe/API
        navigate(`/leads/agenda/${leadId}`);
      },
    });
  }, [lead, leadId, navigate]);

  // ✉️ Action : Envoyer un email
  const handleSendEmail = useCallback(() => {
    if (!lead) return;
    
    // TODO: Pré-remplir email avec IA
    const emailData = {
      to: displayEmail,
      subject: `Suivi de votre demande - ${displayCompany || displayName}`,
      body: `Bonjour ${displayName},\n\nJe fais suite à notre échange concernant...\n\nCordialement,\n${user?.firstName} ${user?.lastName}\n2Thier SRL`
    };
    
    // Rediriger vers le module email avec données pré-remplies
    navigate(`/leads/email/${leadId}`, { state: emailData });
  }, [lead, user, leadId, navigate, displayEmail, displayCompany, displayName]);

  // 📝 Ajouter une note interne
  const handleAddNote = useCallback(async () => {
    if (!currentNote.trim() || !leadId) return;
    
    try {
      await api.post(`/api/leads/${leadId}/notes`, {
        content: currentNote,
        author: user?.firstName + ' ' + user?.lastName,
        type: 'internal'
      });
      
      setCurrentNote('');
      setIsNoteModalOpen(false);
      NotificationManager.success('Note ajoutée avec succès');
      
      // Recharger l'historique
      fetchLeadDetail();
      
      // TODO: Analyse IA de la note
      // Détection d'opportunités ou signaux faibles
      
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de l\'ajout de la note');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de l\'ajout de la note:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  }, [currentNote, leadId, api, user, fetchLeadDetail]);

  // 📄 Upload de documents
  const handleDocumentUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId!);
      formData.append('type', 'document');
      
      await api.post(`/api/leads/${leadId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      NotificationManager.success('Document uploadé avec succès');
      fetchLeadDetail();
      
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de l\'upload du document');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de l\'upload du document:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
    
    return false; // Empêcher l'upload automatique d'Antd
  }, [leadId, api, fetchLeadDetail]);

  // Hook navigation retour (doit être défini avant tout return conditionnel)
  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate('/leads/home');
    }
  }, [onClose, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">Lead non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full"
      style={{
        maxWidth: 1200,
        padding: isMobile ? '16px' : '24px'
      }}
    >
      {/* 📊 Header avec actions principales */}
      <Row justify="space-between" align="middle" className="mb-6" gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Space wrap size={isMobile ? 12 : 16}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
              block={isMobile}
            >
              Retour à la liste
            </Button>
            <Title level={2} className="mb-0">
              <Avatar icon={<UserOutlined />} className="mr-2" />
              {displayName}
            </Title>
            {displayCompany && (
              <Tag color="blue" className="ml-2">{displayCompany}</Tag>
            )}
          </Space>
        </Col>
        <Col xs={24} lg={8}>
          <Space size={isMobile ? 12 : 16} wrap style={{ width: '100%', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
            <Tooltip title="Ouvrir TreeBranchLeaf pour ce lead">
              <Button 
                icon={<FolderOpenOutlined />}
                onClick={() => navigate(`/tbl/${lead.id}`)}
                size={isMobile ? 'middle' : 'large'}
                block={isMobile}
              >
                Ouvrir TBL
              </Button>
            </Tooltip>
            <Tooltip title="Script IA suggéré avant l'appel">
              <Button 
                type="primary" 
                icon={<PhoneOutlined />}
                onClick={handleCallLead}
                size={isMobile ? 'middle' : 'large'}
                block={isMobile}
              >
                📞 Appeler
              </Button>
            </Tooltip>
            <Tooltip title="Créneaux optimisés par IA">
              <Button 
                icon={<CalendarOutlined />}
                onClick={handleScheduleMeeting}
                size={isMobile ? 'middle' : 'large'}
                block={isMobile}
              >
                📅 Agenda
              </Button>
            </Tooltip>
            <Tooltip title="Email pré-rempli par IA">
              <Button 
                icon={<MailOutlined />}
                onClick={handleSendEmail}
                size={isMobile ? 'middle' : 'large'}
                block={isMobile}
              >
                ✉️ Email
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>

      {/* 📋 Contenu principal en onglets */}
      <Tabs
        defaultActiveKey="infos"
        size="large"
        items={[
          {
            key: 'infos',
            label: (
              <span>
                <UserOutlined />
                Informations
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card
                    title="👤 Coordonnées"
                    className="mb-4"
                    styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
                  >
                    <Descriptions column={1} bordered size={isMobile ? 'middle' : 'small'}>
                      <Descriptions.Item label="Nom">{displayName || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="Email">{displayEmail || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="Téléphone">{displayPhone || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="Société">{displayCompany || 'Particulier'}</Descriptions.Item>
                      <Descriptions.Item label="Adresse">{displayAddress || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="Source">
                        <Tag color="blue">{displaySource}</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card
                    title="📊 Statut & Suivi"
                    className="mb-4"
                    styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
                  >
                    <Descriptions column={1} bordered size={isMobile ? 'middle' : 'small'}>
                      <Descriptions.Item label="Statut actuel">
                        <Badge status="processing" text={lead.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Commercial assigné">
                        {lead.assignedTo
                          ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() || lead.assignedTo.email
                          : 'Non assigné'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Date d'entrée">
                        {dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Descriptions.Item>
                      <Descriptions.Item label="Dernière action">
                        {lead?.lastContactDate ? dayjs(lead.lastContactDate).format('DD/MM/YYYY HH:mm') : 'Aucune'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Prochain suivi">
                        {lead?.nextFollowUpDate ? dayjs(lead.nextFollowUpDate).format('DD/MM/YYYY') : 'À définir'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <ClockCircleOutlined />
                Historique
              </span>
            ),
            children: (
              <Card 
                title="📞 Historique des interactions" 
                styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
                extra={
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => setIsNoteModalOpen(true)}
                    size={isMobile ? 'middle' : 'large'}
                    style={{ width: isMobile ? '100%' : 'auto' }}
                  >
                    Ajouter une note
                  </Button>
                }
              >
                <Timeline
                  items={
                    history.length > 0
                      ? history.map((item: LeadHistoryItem) => ({
                          color: item.type === 'call' ? 'blue' : 'green',
                          children: (
                            <div className="flex justify-between">
                              <div>
                                <strong>{item.type === 'call' ? '📞 Appel' : '📧 Email'}</strong>
                                <p className="mb-1">{item.content}</p>
                                <Text type="secondary">{item.author} - {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                              </div>
                            </div>
                          ),
                        }))
                      : [
                          {
                            color: 'gray',
                            children: <Text type="secondary">Aucun historique pour ce lead</Text>,
                          },
                        ]
                  }
                />
              </Card>
            ),
          },
          {
            key: 'documents',
            label: (
              <span>
                <FileOutlined />
                Documents
              </span>
            ),
            children: (
              <div className="space-y-4">
                {/* Section PDF du formulaire public */}
                {lead && (
                  <Card 
                    title="📋 Récapitulatif du Formulaire" 
                    type="inner"
                    extra={
                      (lead?.data && typeof lead.data === 'object' && (lead.data as unknown).formPdfUrl) ? (
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => window.open((lead.data as unknown).formPdfUrl, '_blank')}
                          icon={<DownloadOutlined />}
                        >
                          Télécharger PDF
                        </Button>
                      ) : (
                        <Button 
                          type="primary" 
                          size="small"
                          loading={regeneratingFormPdf}
                          onClick={handleRegenerateFormPdf}
                        >
                          Générer le PDF
                        </Button>
                      )
                    }
                  >
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Formulaire:</strong> {(lead?.data && typeof lead.data === 'object' ? (lead.data as unknown).formName : undefined) || 'Formulaire en ligne'}
                      </p>
                      <p>
                        <strong>Soumis le:</strong> {lead?.createdAt ? new Date(lead.createdAt).toLocaleString('fr-FR') : 'N/A'}
                      </p>
                      <p className="text-gray-600">
                        PDF contenant toutes les questions et réponses du formulaire
                      </p>
                      {(lead?.data && typeof lead.data === 'object' && (lead.data as unknown).formPdfUrl) ? (
                        <Button 
                          type="default"
                          block
                          onClick={() => window.open((lead.data as unknown).formPdfUrl, '_blank')}
                          icon={<EyeOutlined />}
                        >
                          Voir le PDF
                        </Button>
                      ) : (
                        <div className="text-gray-500">
                          Aucun PDF trouvé pour ce lead. Cliquez sur "Générer le PDF".
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                <Card 
                  title="📄 Documents attachés" 
                  styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
                  extra={
                    <Upload 
                      beforeUpload={handleDocumentUpload}
                      showUploadList={false}
                    >
                      <Button type="primary" icon={<PlusOutlined />}>
                        Uploader un document
                      </Button>
                    </Upload>
                  }
                >
                  {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {documents.map((doc: { name: string; type: string }, index: number) => (
                        <Card key={index} size="small" className="cursor-pointer hover:shadow-md">
                          <div className="flex items-center space-x-3">
                            <FileTextOutlined className="text-blue-500 text-xl" />
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              <div className="text-sm text-gray-500">{doc.type}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileOutlined className="text-4xl mb-2" />
                      <p>Aucun document attaché</p>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'ai',
            label: (
              <span>
                <BellOutlined />
                IA & Suggestions
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="🤖 Analyse IA du Lead" className="mb-4" styles={{ body: { padding: isMobile ? '16px' : '24px' } }}>
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded">
                        <strong>💡 Opportunité détectée :</strong>
                        <p className="mb-0 mt-1">Ce prospect montre des signaux d'achat élevés. Recommandation : Planifier un RDV dans les 24h.</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <strong>📈 Score de qualification :</strong>
                        <p className="mb-0 mt-1">85/100 - Lead très qualifié</p>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="🎯 Prochaines actions suggérées" className="mb-4" styles={{ body: { padding: isMobile ? '16px' : '24px' } }}>
                    <div className="space-y-2">
                      <Button block type="dashed" icon={<PhoneOutlined />} size={isMobile ? 'large' : 'middle'}>
                        Appeler avant 18h aujourd'hui
                      </Button>
                      <Button block type="dashed" icon={<MailOutlined />} size={isMobile ? 'large' : 'middle'}>
                        Envoyer documentation produit
                      </Button>
                      <Button block type="dashed" icon={<CalendarOutlined />} size={isMobile ? 'large' : 'middle'}>
                        Proposer RDV démonstration
                      </Button>
                    </div>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* 📝 Modal pour ajouter une note */}
      <Modal
        title="📝 Ajouter une note interne"
        open={isNoteModalOpen}
        onOk={handleAddNote}
        onCancel={() => setIsNoteModalOpen(false)}
        okText="Enregistrer"
        cancelText="Annuler"
        width={isMobile ? '100%' : 520}
        style={isMobile ? { top: 12, padding: '0 12px' } : undefined}
      >
        <TextArea
          rows={4}
          placeholder="Saisir votre note ici... (obligatoire après un appel)"
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
        />
        <div className="mt-2 text-sm text-gray-500">
          💡 L'IA analysera cette note pour détecter des opportunités et suggérer les prochaines actions.
        </div>
      </Modal>
    </div>
  );
}
