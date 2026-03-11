import React, { useState, useEffect, useMemo } from 'react';
import { Card, Descriptions, Tag, Avatar, Space, Button, Timeline, Spin, Row, Col, Tabs, Upload, message, Tooltip, Grid, Popconfirm, Alert, Modal } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  GlobalOutlined, 
  LinkedinOutlined,
  EditOutlined,
  CalendarOutlined,
  FileOutlined,
  FileTextOutlined,
  PlusOutlined,
  BellOutlined,
  RobotOutlined,
  DownloadOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  TrophyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import type { Lead } from '../../types/leads';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import LeadGagneTab from '../../pages/Leads/components/LeadGagneTab';

interface LeadDetailProps {
  leadId: string;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onCall?: (leadId: string) => void;
  onEmail?: (leadId: string) => void; 
  onSchedule?: (leadId: string) => void;
}

/**
 * 📋 Composant de détail complet d'un lead
 */
export default function LeadDetail({ leadId, onEdit, onDelete, onCall, onEmail, onSchedule }: LeadDetailProps) {
  type LeadDocument = {
    id: string;
    name: string;
    type?: string;
    url?: string | null;
    createdAt?: string;
    meta?: { treeId?: string } | null;
  };
  type TblSubmission = {
    id: string;
    name?: string;
    status?: string;
    createdAt?: string;
    treeName?: string;
  };

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [tblSubmissions, setTblSubmissions] = useState<TblSubmission[]>([]);
  const [loadingTblSubmissions, setLoadingTblSubmissions] = useState(false);

  // État pour le workflow "À rectifier"
  type RectificationModification = {
    fieldLabel: string;
    originalValue: string | null;
    reviewedValue: string | null;
    note: string | null;
    reviewedBy: string | null;
  };
  type RectificationContext = {
    chantierId: string;
    submissionId: string | null;
    chantierName: string | null;
    clientName: string | null;
    siteAddress: string | null;
    productLabel: string;
    responsable: string | null;
    reviewEventId: string | null;
    reviewDate: string | null;
    reviewedBy: string | null;
    problemNote: string | null;
    modifications: RectificationModification[];
    totalModifications: number;
  };
  const [rectificationCtx, setRectificationCtx] = useState<RectificationContext | null>(null);
  const [loadingRectification, setLoadingRectification] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  
  const { api } = useAuthenticatedApi();
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Récupérer les détails du lead
  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[LeadDetail] Récupération du lead:', leadId);
    const leadData = await api.get<Lead>(`/api/leads/${leadId}`);
        
        console.log('[LeadDetail] Données reçues:', leadData);
        setLead(leadData);
        
      } catch (err) {
        console.error('[LeadDetail] Erreur lors de la récupération:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    
    if (leadId) {
      fetchLeadDetails();
    }
  }, [leadId, api]);

  // Charger les documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoadingDocs(true);
        const docs = await api.get<Array<LeadDocument> | { success?: boolean; data?: LeadDocument[] }>(`/api/leads/${leadId}/documents`);
        if (Array.isArray(docs)) {
          setDocuments(docs);
        } else if (docs && typeof docs === 'object' && 'data' in docs) {
          setDocuments(Array.isArray(docs.data) ? docs.data : []);
        } else {
          setDocuments([]);
        }
      } catch {
        setDocuments([]);
      } finally {
        setLoadingDocs(false);
      }
    };
    if (leadId) fetchDocuments();
  }, [leadId, api]);

  useEffect(() => {
    const fetchTblSubmissions = async () => {
      if (!leadId) {
        setTblSubmissions([]);
        return;
      }
      try {
        setLoadingTblSubmissions(true);
        const effectiveTreeId = lead?.data?.treeId || 'cmf1mwoz10005gooked1j6orn';
        const allLeadsWithSubmissions = await api.get(`/api/treebranchleaf/submissions/by-leads?treeId=${effectiveTreeId}`);
        const list = Array.isArray(allLeadsWithSubmissions) ? allLeadsWithSubmissions : [];
        const thisLeadData = list.find((item: { id?: string }) => item?.id === leadId);
        const submissions = Array.isArray(thisLeadData?.submissions) ? thisLeadData.submissions : [];
        setTblSubmissions(submissions);
      } catch {
        setTblSubmissions([]);
      } finally {
        setLoadingTblSubmissions(false);
      }
    };
    fetchTblSubmissions();
  }, [leadId, api, lead?.data?.treeId]);

  // Charger le contexte de rectification si le lead est "À rectifier"
  useEffect(() => {
    const isRectifier = lead?.status === 'à_rectifier' ||
      lead?.leadStatus?.name?.toLowerCase()?.includes('rectifier');
    if (!isRectifier || !leadId) {
      setRectificationCtx(null);
      return;
    }
    const fetchRectificationContext = async () => {
      try {
        setLoadingRectification(true);
        const res = await api.get<{ success: boolean; data: RectificationContext }>(
          `/api/chantiers/rectification-context/${leadId}`
        );
        if (res?.success && res.data) {
          setRectificationCtx(res.data);
        }
      } catch (err) {
        console.error('[LeadDetail] Erreur chargement contexte rectification:', err);
      } finally {
        setLoadingRectification(false);
      }
    };
    fetchRectificationContext();
  }, [leadId, lead?.status, lead?.leadStatus?.name, api]);

  // Re-soumettre le lead au chantier après corrections
  const handleResubmitToChantier = async () => {
    Modal.confirm({
      title: 'Re-soumettre au chantier',
      content: 'Confirmez-vous que les corrections ont été effectuées et que le devis est prêt à retourner en chantier ?',
      okText: 'Oui, re-soumettre',
      cancelText: 'Annuler',
      okType: 'primary',
      onOk: async () => {
        try {
          setResubmitting(true);
          const res = await api.post<{ success: boolean; message: string }>(
            `/api/chantiers/resubmit-to-chantier/${leadId}`
          );
          if (res?.success) {
            message.success('✅ Lead re-soumis au chantier avec succès !');
            // Recharger le lead pour mettre à jour le statut
            const leadData = await api.get<Lead>(`/api/leads/${leadId}`);
            setLead(leadData);
            setRectificationCtx(null);
          } else {
            message.error(res?.message || 'Erreur lors de la re-soumission');
          }
        } catch (err) {
          console.error('[LeadDetail] Erreur re-soumission chantier:', err);
          message.error('Erreur lors de la re-soumission au chantier');
        } finally {
          setResubmitting(false);
        }
      },
    });
  };

  // Générer le PDF du formulaire
  const handleGeneratePdf = async () => {
    try {
      message.loading('Génération du PDF...', 0);
      await api.post(`/api/leads/${leadId}/generate-pdf`);
      message.destroy();
      message.success('PDF généré avec succès !');
    } catch {
      message.destroy();
      message.error('Erreur lors de la génération du PDF');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>❌ Erreur lors du chargement des détails</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  if (!lead) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>❓ Lead non trouvé</p>
      </div>
    );
  }

  // Helpers de normalisation communs (priorité top-level, fallback data.*)
  const asString = (v: unknown): string => (v == null ? '' : String(v));
  const joinName = (a?: unknown, b?: unknown) => [a, b].filter(Boolean).map(asString).join(' ').trim();
  const pickFirst = (...vals: Array<unknown>): string => {
    for (const v of vals) {
      if (Array.isArray(v)) {
        if (v.length > 0 && v[0]) {
          const first = v[0] as unknown;
          if (typeof first === 'string') return first.trim();
          if (typeof first === 'object') return JSON.stringify(first);
        }
      } else if (typeof v === 'string') {
        const s = v.trim();
        if (s) return s;
      } else if (v != null) {
        const s = String(v).trim();
        if (s) return s;
      }
    }
    return '';
  };

  const displayName = pickFirst(
    joinName(lead.firstName, lead.lastName),
    lead.name,
    joinName(lead.data?.firstName, lead.data?.lastName),
    lead.data?.name
  ) || 'Nom non renseigné';

  const displayEmail = pickFirst(
    lead.email,
    lead.contactEmail,
    lead.contact?.email,
    lead.emails,
    lead.contact?.emails,
    lead.data?.email
  );

  const displayPhone = pickFirst(
    lead.phone,
    lead.mobile,
    lead.telephone,
    lead.contact?.phone,
    lead.contact?.mobile,
    lead.phones,
    lead.contact?.phones,
    lead.data?.phone
  );

  const displayCompany = pickFirst(
    lead.company,
    lead.companyName,
    lead.organization?.name,
    lead.contact?.company,
    lead.customer?.company,
    lead.isCompany ? lead.name : '',
    lead.data?.company
  );

  const openTblDevis = (doc?: { id?: string }) => {
    const base = `/tbl/${lead.id}`;
    if (doc?.id) {
      navigate(`${base}?devisId=${encodeURIComponent(doc.id)}`);
      return;
    }
    navigate(base);
  };

  const renderTableRow = (label: string, content: React.ReactNode, index: number) => (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff',
      }}
    >
      <div style={{
        width: '120px',
        flexShrink: 0,
        padding: '8px 12px',
        fontSize: '14px',
        color: '#6b7280',
        borderRight: '1px solid #e5e7eb',
      }}>
        {label}
      </div>
      <div style={{
        flex: 1,
        padding: '8px 12px',
        fontSize: '14px',
        color: '#111827',
      }}>
        {content}
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4" style={{ padding: isMobile ? '4px' : undefined }}>
      {/* Header avec informations principales */}
      <Card size="small" styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}>
        <Row gutter={[12, 12]} align="middle" wrap>
          <Col>
            <Avatar 
              size={48} 
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Col>
          <Col flex={1}>
            <div>
              <h2 className="text-lg font-semibold mb-0">{displayName}</h2>
              <Space size={4} wrap>
                {lead.leadStatus && (
                  <Tag color={lead.leadStatus.color} className="m-0">{lead.leadStatus.name}</Tag>
                )}
                {lead.source && (
                  <Tag className="m-0">{lead.source}</Tag>
                )}
              </Space>
            </div>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PhoneOutlined />} 
              onClick={() => onCall?.(lead.id)}
              disabled={!onCall}
              size="small"
            >
              Appeler
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 🔶 Bandeau "À rectifier" — affiché si le lead nécessite des corrections */}
      {(lead.status === 'à_rectifier' || lead.leadStatus?.name?.toLowerCase()?.includes('rectifier')) && (
        <Card
          size="small"
          style={{
            border: '2px solid #fa8c16',
            background: 'linear-gradient(135deg, #fff7e6 0%, #fff1d4 100%)',
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <div className="flex items-start gap-3">
            <WarningOutlined style={{ fontSize: 24, color: '#fa8c16', marginTop: 2 }} />
            <div className="flex-1">
              <h3 className="text-base font-bold mb-1" style={{ color: '#d46b08' }}>
                🔧 Devis à rectifier
              </h3>
              {loadingRectification ? (
                <Spin size="small" />
              ) : rectificationCtx ? (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    Le technicien a identifié <strong>{rectificationCtx.totalModifications} modification(s)</strong> à apporter au devis
                    {rectificationCtx.chantierName ? ` pour le chantier "${rectificationCtx.chantierName}"` : ''}.
                    {rectificationCtx.reviewedBy && (
                      <span> Revu par <strong>{rectificationCtx.reviewedBy}</strong>.</span>
                    )}
                  </p>

                  {rectificationCtx.problemNote && (
                    <Alert
                      type="warning"
                      showIcon
                      icon={<ToolOutlined />}
                      message="Note du technicien"
                      description={rectificationCtx.problemNote}
                      style={{ marginBottom: 8 }}
                    />
                  )}

                  {rectificationCtx.modifications.length > 0 && (
                    <div
                      style={{
                        border: '1px solid #ffd591',
                        borderRadius: 6,
                        overflow: 'hidden',
                        marginBottom: 10,
                        maxHeight: 200,
                        overflowY: 'auto',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          background: '#fff1b8',
                          padding: '6px 10px',
                          fontWeight: 600,
                          fontSize: 12,
                          borderBottom: '1px solid #ffd591',
                        }}
                      >
                        <div style={{ flex: 2 }}>Champ</div>
                        <div style={{ flex: 2 }}>Avant → Après</div>
                        <div style={{ flex: 2 }}>Remarque</div>
                      </div>
                      {rectificationCtx.modifications.map((mod, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            padding: '5px 10px',
                            fontSize: 12,
                            borderBottom: '1px solid #ffecd2',
                            background: i % 2 === 0 ? '#fffbe6' : '#fff',
                          }}
                        >
                          <div style={{ flex: 2, fontWeight: 500 }}>{mod.fieldLabel}</div>
                          <div style={{ flex: 2 }}>
                            <span style={{ textDecoration: 'line-through', color: '#cf1322' }}>
                              {mod.originalValue || '—'}
                            </span>
                            {' → '}
                            <span style={{ color: '#389e0d', fontWeight: 500 }}>
                              {mod.reviewedValue || '—'}
                            </span>
                          </div>
                          <div style={{ flex: 2, color: '#8c8c8c', fontStyle: 'italic' }}>
                            {mod.note || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Space wrap>
                    {rectificationCtx.submissionId && (
                      <Button
                        type="primary"
                        icon={<FolderOpenOutlined />}
                        style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                        onClick={() => {
                          let url = `/tbl/${lead.id}?devisId=${encodeURIComponent(rectificationCtx.submissionId!)}`;
                          // Ajouter mode rectification + eventId pour traçabilité 3 couches
                          if (rectificationCtx.reviewEventId) {
                            url += `&mode=rectification&eventId=${encodeURIComponent(rectificationCtx.reviewEventId)}`;
                          }
                          navigate(url);
                        }}
                      >
                        Ouvrir le devis à corriger
                      </Button>
                    )}
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      loading={resubmitting}
                      onClick={handleResubmitToChantier}
                    >
                      Re-soumettre au chantier
                    </Button>
                  </Space>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Ce lead est marqué "À rectifier" mais aucun contexte de chantier n'a été trouvé.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Onglets */}
      <Tabs
        defaultActiveKey={
          lead.status === 'à_rectifier' || lead.leadStatus?.name?.toLowerCase()?.includes('rectifier')
            ? 'tbl'
            : lead.status === 'won' || lead.leadStatus?.name?.toLowerCase()?.includes('gagn')
              ? 'gagne'
              : 'info'
        }
        size="small"
        items={[
          {
            key: 'info',
            label: <span><UserOutlined /> Informations</span>,
            children: (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coordonnées */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserOutlined style={{ color: '#3b82f6' }} />
                    <span style={{ fontWeight: 600, color: '#374151' }}>Coordonnées</span>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                    {renderTableRow('Nom', displayName, 0)}
                    {renderTableRow(
                      'Email',
                      displayEmail || 'Non renseigné',
                      1
                    )}
                    {renderTableRow(
                      'Téléphone',
                      displayPhone || 'Non renseigné',
                      2
                    )}
                    {renderTableRow('Société', displayCompany || 'Particulier', 3)}
                    {renderTableRow('Adresse', lead.address || 'Non renseignée', 4)}
                    {renderTableRow('Source', lead.source ? <Tag>{lead.source}</Tag> : <Tag>N/A</Tag>, 5)}
                  </div>
                </div>

                {/* Statut & Suivi */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarOutlined style={{ color: '#8b5cf6' }} />
                    <span style={{ fontWeight: 600, color: '#374151' }}>Statut & Suivi</span>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                    {renderTableRow(
                      'Statut actuel',
                      lead.leadStatus ? (
                        <Tag color={lead.leadStatus.color}>{lead.leadStatus.name}</Tag>
                      ) : (
                        '•'
                      ),
                      0
                    )}
                    {renderTableRow(
                      'Commercial assigné',
                      lead.assignedTo
                        ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                        : 'Non assigné',
                      1
                    )}
                    {renderTableRow(
                      "Date d'entrée",
                      dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm'),
                      2
                    )}
                    {renderTableRow(
                      'Dernière action',
                      lead.lastContactDate
                        ? dayjs(lead.lastContactDate).format('DD/MM/YYYY HH:mm')
                        : 'Aucune',
                      3
                    )}
                    {renderTableRow(
                      'Prochain suivi',
                      lead.nextFollowUpDate
                        ? dayjs(lead.nextFollowUpDate).format('DD/MM/YYYY HH:mm')
                        : 'À définir',
                      4
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'history',
            label: <span><CalendarOutlined /> Historique</span>,
            children: (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarOutlined className="text-blue-500" />
                  <span className="font-semibold text-gray-700">Historique des actions</span>
                </div>
                <div className="border border-gray-200 rounded overflow-hidden">
                  {renderTableRow('Lead créé', dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm'), 0)}
                  {lead.updatedAt && lead.updatedAt !== lead.createdAt && 
                    renderTableRow('Dernière modification', dayjs(lead.updatedAt).format('DD/MM/YYYY HH:mm'), 1)
                  }
                  {lead.lastContactDate && 
                    renderTableRow('Dernier contact', dayjs(lead.lastContactDate).format('DD/MM/YYYY HH:mm'), 2)
                  }
                  {lead.nextFollowUpDate && 
                    renderTableRow('Prochain suivi', dayjs(lead.nextFollowUpDate).format('DD/MM/YYYY HH:mm'), 3)
                  }
                </div>
              </div>
            ),
          },
          {
            key: 'documents',
            label: <span><FileOutlined /> Documents</span>,
            children: (
              <div className="space-y-4">
                {/* Récapitulatif formulaire */}
                <Card 
                  title="📄 Récapitulatif du Formulaire" 
                  size="small"
                  extra={
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={handleGeneratePdf}
                      size="small"
                    >
                      Télécharger PDF
                    </Button>
                  }
                >
                  <div className="border border-gray-200 rounded overflow-hidden">
                    {renderTableRow('Formulaire', lead.data?.formName || 'Formulaire Web', 0)}
                    {renderTableRow('Soumis le', dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm'), 1)}
                    {renderTableRow('Description', 'PDF contenant toutes les questions et réponses', 2)}
                  </div>
                  <Button 
                    icon={<EyeOutlined />} 
                    block 
                    className="mt-2"
                    onClick={() => message.info('Aperçu PDF à venir')}
                  >
                    Voir le PDF
                  </Button>
                </Card>

                {/* Documents attachés */}
                <Card 
                  title="📁 Documents attachés" 
                  size="small"
                  extra={
                    <Upload
                      beforeUpload={() => {
                        message.info('Upload de documents à venir');
                        return false;
                      }}
                      showUploadList={false}
                    >
                      <Button icon={<PlusOutlined />} size="small">
                        Uploader
                      </Button>
                    </Upload>
                  }
                >
                  {loadingDocs ? (
                    <div className="text-center py-4">
                      <Spin />
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded ${index % 2 === 0 ? 'bg-blue-50/60' : 'bg-white border border-gray-100'}`}
                        >
                          <Space>
                            <FileTextOutlined className="text-blue-500" />
                            <span>{doc.name}</span>
                            <Tag>{doc.type}</Tag>
                          </Space>
                          <Button size="small" icon={<EyeOutlined />} type="text" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <FileOutlined className="text-3xl mb-2" />
                      <p>Aucun document attaché</p>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'tbl',
            label: <span><FolderOpenOutlined /> TBL</span>,
            children: (
              <div className="space-y-4">
                <Card
                  title="📄 Devis TBL"
                  size="small"
                >
                  {loadingTblSubmissions ? (
                    <div className="text-center py-4">
                      <Spin />
                    </div>
                  ) : tblSubmissions.length > 0 ? (
                    <div className="space-y-2">
                      {tblSubmissions.map((doc, index) => (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between p-2 rounded ${index % 2 === 0 ? 'bg-blue-50/60' : 'bg-white border border-gray-100'}`}
                        >
                          <Space>
                            <FileTextOutlined className="text-blue-500" />
                            <div>
                              <div className="font-medium">{doc.name || 'Devis TBL'}</div>
                              <div className="text-xs text-gray-500">
                                {doc.createdAt ? dayjs(doc.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                              </div>
                            </div>
                          </Space>
                          <Button size="small" onClick={() => openTblDevis(doc)}>
                            Ouvrir
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <FileOutlined className="text-3xl mb-2" />
                      <p>Aucun devis TBL lié</p>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'gagne',
            label: <span><TrophyOutlined /> Gagné</span>,
            children: (
              <LeadGagneTab
                leadId={leadId}
                organizationId={lead.organizationId}
                leadData={{
                  firstName: lead.firstName || undefined,
                  lastName: lead.lastName || undefined,
                  company: lead.company || undefined,
                  assignedToId: lead.assignedToId || undefined,
                }}
              />
            ),
          },
          {
            key: 'ai',
            label: <span><RobotOutlined /> IA & Suggestions</span>,
            children: (
              <Row gutter={[12, 12]}>
                <Col xs={24} lg={12}>
                  <Card title="🤖 Analyse IA du Lead" size="small">
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded">
                        <strong>💡 Opportunité détectée :</strong>
                        <p className="mb-0 mt-1 text-sm">Ce prospect montre des signaux d'achat élevés. Recommandation : Planifier un RDV dans les 24h.</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <strong>📈 Score de qualification :</strong>
                        <p className="mb-0 mt-1 text-sm">85/100 - Lead très qualifié</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <strong>⚠️ Point d'attention :</strong>
                        <p className="mb-0 mt-1 text-sm">Dernier contact il y a plus de 48h. Risque de refroidissement.</p>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="🎯 Prochaines actions suggérées" size="small">
                    <div className="space-y-2">
                      <Button 
                        block 
                        type="dashed" 
                        icon={<PhoneOutlined />}
                        onClick={() => onCall?.(lead.id)}
                      >
                        📞 Appeler avant 18h aujourd'hui
                      </Button>
                      <Button 
                        block 
                        type="dashed" 
                        icon={<MailOutlined />}
                        onClick={() => onEmail?.(lead.id)}
                      >
                        ✉️ Envoyer documentation produit
                      </Button>
                      <Button 
                        block 
                        type="dashed" 
                        icon={<CalendarOutlined />}
                        onClick={() => onSchedule?.(lead.id)}
                      >
                        📅 Proposer RDV démonstration
                      </Button>
                    </div>
                  </Card>
                  
                  <Card title="🔔 Notifications IA" size="small" className="mt-3">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-2 bg-orange-50 rounded">
                        <BellOutlined className="text-orange-500 mt-1" />
                        <div>
                          <p className="font-medium text-sm mb-0">Relance recommandée</p>
                          <p className="text-xs text-gray-500 mb-0">Ce lead n'a pas été contacté depuis 3 jours</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
                        <BellOutlined className="text-green-500 mt-1" />
                        <div>
                          <p className="font-medium text-sm mb-0">Bon timing</p>
                          <p className="text-xs text-gray-500 mb-0">Ce lead est généralement disponible entre 14h-16h</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* Actions rapides */}
      <Card title="⚡ Actions rapides" size="small">
        <Space
          wrap
          size={isMobile ? 6 : 10}
          style={{ width: '100%', justifyContent: isMobile ? 'space-between' : 'flex-start' }}
        >
          <Tooltip title="Appeler avec Telnyx">
            <Button
              icon={<PhoneOutlined />}
              onClick={() => onCall?.(lead.id)}
              type="primary"
              disabled={!onCall}
            />
          </Tooltip>
          <Tooltip title="Gmail Google">
            <Button
              icon={<MailOutlined />}
              onClick={() => onEmail?.(lead.id)}
              disabled={!onEmail}
            />
          </Tooltip>
          <Tooltip title="Agenda Google">
            <Button
              icon={<CalendarOutlined />}
              onClick={() => onSchedule?.(lead.id)}
              disabled={!onSchedule}
            />
          </Tooltip>
          <Tooltip title="Ouvrir TBL">
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => openTblDevis()}
            />
          </Tooltip>
          {onEdit && (
            <Tooltip title="Modifier">
              <Button icon={<EditOutlined />} onClick={() => onEdit(lead)} />
            </Tooltip>
          )}
          {onDelete && (
            <Popconfirm
              title="Supprimer le lead"
              description="Êtes-vous sûr de vouloir supprimer ce lead ?"
              okText="Supprimer"
              cancelText="Annuler"
              onConfirm={() => onDelete(lead.id)}
            >
              <Tooltip title="Supprimer">
                <Button danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      </Card>
    </div>
  );
}
