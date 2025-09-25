import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Button, Dropdown, Tag, Avatar, Timeline, Statistic, Row, Col, Select } from 'antd';
import { 
  PhoneOutlined, 
  FileTextOutlined, 
  CalendarOutlined, 
  EnvironmentOutlined, 
  MailOutlined,
  EditOutlined,
  SettingOutlined,
  UserOutlined,
  DollarOutlined,
  CopyOutlined,
  DeleteOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';
import { unwrapApiData } from '../../utils/apiResponse';
import { LEAD_STATUSES, LEAD_SOURCES } from './LeadsConfig';
import type { Lead, LeadApiResponse } from '../../types/leads';

const { TabPane } = Tabs;

interface LeadDetailProps {
  leadId?: string; // Prop optionnelle pour utilisation en Drawer
  onClose?: () => void; // Callback pour fermer le Drawer
  onCall?: () => void; // Callback pour ouvrir le module d'appel
  onEmail?: () => void; // Callback pour ouvrir le module email
  onSchedule?: () => void; // Callback pour ouvrir le module agenda
}

export default function LeadDetail({ 
  leadId: propLeadId, 
  onClose, 
  onCall, 
  onEmail, 
  onSchedule 
}: LeadDetailProps = {}) {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { api, isLoading } = useAuthenticatedApi();
  
  // Utilise le leadId des props si disponible, sinon celui de l'URL
  const leadId = propLeadId || urlLeadId;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingClientForm, setSavingClientForm] = useState(false);

  // Devis (Propositions) list
  type Quote = { id: string; title?: string | null; status?: string | null; createdAt: string };
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Fiche Client via Formulaire (Bloc Prisma)
  type FieldOption = { id: string; label: string; value?: string };
  type Field = { id: string; label: string; type: string; required?: boolean; width?: string; options?: FieldOption[] };
  type Section = { id: string; name: string; fields: Field[] };
  type Block = { id: string; name?: string; sections: Section[] };
  type BlockWrapped = { success?: boolean; data?: Block[] } | Block[];
  type OneBlockWrapped = { success?: boolean; data?: Block } | Block;
  const [availableBlocks, setAvailableBlocks] = useState<Array<{ id: string; name?: string }>>([]);
  const [clientBlockId, setClientBlockId] = useState<string>('');
  const [clientBlock, setClientBlock] = useState<Block | null>(null);
  const [clientValues, setClientValues] = useState<Record<string, unknown>>({});
  const saveTimer = useRef<number | null>(null);

  // Fonction pour gérer la fermeture/navigation
  const handleClose = () => {
    if (onClose) {
      onClose(); // Drawer : ferme le Drawer
    } else {
      navigate('/leads/home'); // Page : navigation normale
    }
  };

  // Charger les détails du lead
  useEffect(() => {
    const fetchLeadDetail = async () => {
      if (!leadId) {
        setError("ID du lead manquant");
        setLoading(false);
        return;
      }
      
      try {
        const data = await api.get<LeadApiResponse>(`/api/leads/${leadId}`);
        const leadData = unwrapApiData<Lead>(data);
        if (leadData) {
          setLead(leadData);
        } else {
          setError("Lead non trouvé");
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, 'Erreur lors du chargement du lead');
        const errorDetails = getErrorResponseDetails(error);
        console.error('Erreur lors du chargement du lead:', {
          error,
          status: errorDetails.status,
          data: errorDetails.data,
        });
        setError(errorMessage);
        NotificationManager.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadDetail();
  }, [leadId, api]);

  // Charger la liste des blocs disponibles (pour la fiche client)
  useEffect(() => {
    (async () => {
      try {
        const resp: BlockWrapped = await api.get('/api/blocks/read');
        const list: Block[] = Array.isArray((resp as Block[]))
          ? (resp as Block[])
          : Array.isArray((resp as { data?: Block[] })?.data)
            ? ((resp as { data?: Block[] }).data as Block[])
            : [];
        setAvailableBlocks(list.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        // silencieux
      }
    })();
  }, [api]);

  // Charger le bloc sélectionné pour la fiche client
  useEffect(() => {
    if (!clientBlockId) { setClientBlock(null); setClientValues({}); return; }
    (async () => {
      try {
  const resp: OneBlockWrapped = await api.get(`/blocks/${clientBlockId}/read`);
  const blk: Block = (resp as { data?: Block })?.data || (resp as Block);
  setClientBlock(blk);
  const initial = (lead?.data?.devis && (lead.data.devis as Record<string, unknown>)[clientBlockId]) || {};
        setClientValues(initial);
      } catch {
        setClientBlock(null);
      }
    })();
  }, [clientBlockId, api, lead]);

  // Autosave fiche client -> lead.data.devis[clientBlockId]
  const scheduleClientSave = useCallback((nextValues: Record<string, unknown>) => {
    if (!leadId || !clientBlockId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        setSavingClientForm(true);
        const newData = { ...(lead?.data || {}) } as { devis?: Record<string, unknown> } & Record<string, unknown>;
        newData.devis = newData.devis || {};
        (newData.devis as Record<string, unknown>)[clientBlockId] = nextValues;
        await api.patch(`/leads/${leadId}`, { data: newData });
      } finally {
        setSavingClientForm(false);
      }
    }, 500);
  }, [api, leadId, clientBlockId, lead]);

  // Charger les devis (quotes) pour alimenter timeline et l'onglet Devis
  useEffect(() => {
    if (!leadId) return;
    (async () => {
      try {
        const resp: { success?: boolean; data?: Quote[] } | Quote[] = await api.get('/api/quotes', { params: { leadId } });
        const list: Quote[] = Array.isArray(resp) ? (resp as Quote[]) : ((resp as { data?: Quote[] }).data || []);
        setQuotes(list);
      } catch {
        setQuotes([]);
      }
    })();
  }, [api, leadId]);

  const getStatusInfo = (statusCode: string) => {
    return LEAD_STATUSES.find(status => status.value === statusCode) || 
      { value: statusCode, label: statusCode, color: 'bg-gray-500' };
  };

  const getSourceLabel = (sourceCode: string) => {
    const source = LEAD_SOURCES.find(src => src.value === sourceCode);
    return source ? source.label : sourceCode;
  };

  const handleBack = () => {
    handleClose();
  };

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Lead non trouvé</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(lead.status);

  // Actions disponibles - modulaires et configurables
  const actionButtons = [
    {
      key: 'call',
      label: 'Appeler',
      icon: <PhoneOutlined />,
      type: 'primary',
      onClick: () => {
        if (onCall) {
          onCall(); // Utilise le callback du parent
        } else {
          navigate(`/leads/call/${leadId}`); // Fallback vers navigation
        }
      }
    },
    {
      key: 'quote',
      label: 'Nouveau Devis',
      icon: <FileTextOutlined />,
  onClick: () => navigate(`/devis?leadId=${leadId}${clientBlockId ? `&blockId=${clientBlockId}` : ''}`)
    },
    {
      key: 'appointment',
      label: 'Rendez-vous',
      icon: <CalendarOutlined />,
      onClick: () => {
        if (onSchedule) {
          onSchedule(); // Utilise le callback du parent
        } else {
          navigate('/agenda'); // Fallback vers navigation
        }
      }
    },
    {
      key: 'maps',
      label: 'Navigation',
      icon: <EnvironmentOutlined />,
      onClick: () => {
        const address = `${lead?.data?.address || ''} ${lead?.data?.city || ''}`.trim();
        if (address) {
          window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank');
        }
      }
    },
    {
      key: 'email',
      label: 'Envoyer Email',
      icon: <MailOutlined />,
      onClick: () => {
        if (onEmail) {
          onEmail(); // Utilise le callback du parent
        } else if (lead?.data?.email) {
          window.open(`mailto:${lead.data.email}`, '_blank'); // Fallback vers mailto
        }
      }
    },
    {
      key: 'open-tbl',
      label: 'Ouvrir TBL',
      icon: <FolderOpenOutlined />,
      type: 'default' as const,
      onClick: () => navigate(`/tbl/${leadId}`)
    }
  ];

  const settingsMenu = {
    items: [
      {
        key: 'edit-lead',
        label: 'Modifier le lead',
        icon: <EditOutlined />,
        onClick: () => navigate(`/leads/edit/${leadId}`) // Redirection vers la page d'édition
      },
      {
        key: 'duplicate-lead',
        label: 'Dupliquer le lead',
        icon: <CopyOutlined />,
        onClick: () => console.log('Duplication du lead') // Logique à implémenter
      },
      {
        type: 'divider',
      },
      {
        key: 'delete-lead',
        label: 'Supprimer le lead',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => console.log('Suppression du lead') // Logique à implémenter avec confirmation
      }
    ]
  };

  // Statistiques du lead - À brancher sur des agrégations réelles
  const leadStats = [
    {
      title: 'Appels passés',
      value: '0 (0min)',
      suffix: 'Total: 0min',
      prefix: <PhoneOutlined />,
      color: '#1890ff'
    },
    {
      title: 'Rendez-vous',
      value: '0',
      suffix: 'Confirmés: 0 | En attente: 0',
      prefix: <CalendarOutlined />,
      color: '#52c41a'
    },
    {
      title: 'Devis créés',
      value: '0',
      suffix: 'Valeur totale des devis',
      prefix: <FileTextOutlined />,
      color: '#faad14'
    },
    {
      title: 'Valeur estimée',
      value: '€0',
      suffix: 'Basée sur les devis actifs',
      prefix: <DollarOutlined />,
      color: '#13c2c2'
    }
  ];
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header avec informations principales */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {lead.data?.name || 'Sans nom'}
            </h1>
            {lead.data?.company && (
              <p className="text-xl text-gray-600 mb-2">{lead.data.company}</p>
            )}
            <div className="flex items-center space-x-4">
              <Tag color={statusInfo.color.replace('bg-', '').replace('-500', '')}>
                {statusInfo.label}
              </Tag>
              {lead.assignedTo && (
                <div className="flex items-center space-x-2">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span className="text-sm text-gray-600">
                    {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={handleBack}>
              Retour à la liste
            </Button>
            <Dropdown menu={settingsMenu} placement="bottomRight">
              <Button icon={<SettingOutlined />}>
                Actions
              </Button>
            </Dropdown>
          </div>
        </div>

        {/* Boutons d'action principaux */}
        <div className="flex flex-wrap gap-3 mb-6">
          {actionButtons.map(button => (
            <Button
              key={button.key}
              type={button.type || 'default'}
              icon={button.icon}
              size="large"
              onClick={button.onClick}
              className="flex items-center"
            >
              {button.label}
            </Button>
          ))}
        </div>

        {/* Statistiques rapides */}
        <Row gutter={16} className="mb-6">
          {leadStats.map((stat, index) => (
            <Col span={6} key={index}>
              <Card>
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  valueStyle={{ color: stat.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Contenu principal avec onglets */}
      <Card>
        <Tabs defaultActiveKey="details" type="card">
          {/* Onglet Détails */}
          <TabPane tab="Détails" key="details">
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <Card title="Informations Contact" size="small">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>
                        {lead.data?.email ? (
                          <a href={`mailto:${lead.data.email}`} className="text-blue-600">
                            {lead.data.email}
                          </a>
                        ) : 'Non renseigné'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléphone:</span>
                      <span>
                        {lead.data?.phone ? (
                          <a href={`tel:${lead.data.phone}`} className="text-blue-600">
                            {lead.data.phone}
                          </a>
                        ) : 'Non renseigné'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Adresse:</span>
                      <span className="text-right">
                        {lead.data?.address && lead.data?.city 
                          ? `${lead.data.address}, ${lead.data.city}`
                          : 'Non renseignée'
                        }
                      </span>
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="Informations Lead" size="small">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Source:</span>
                      <span>{lead.source ? getSourceLabel(lead.source) : 'Direct'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Créé le:</span>
                      <span>
                        {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Notes:</span>
                      <span className="text-right max-w-xs truncate">
                        {lead.data?.notes || 'Aucune note'}
                      </span>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

              {/* Section notes complètes si nécessaire */}
            {lead.data?.notes && (
              <Card title="Notes" className="mt-4" size="small">
                <p className="whitespace-pre-wrap">{lead.data.notes}</p>
              </Card>
            )}

              {/* Fiche client (Formulaire Prisma) */}
              <Card title="Fiche client (Formulaire)" className="mt-4" size="small">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-gray-600">Formulaire</span>
                  <Select
                    placeholder="Choisir un formulaire client"
                    className="min-w-[280px]"
                    value={clientBlockId || undefined}
                    onChange={(v) => setClientBlockId(v)}
                    options={availableBlocks.map(b => ({ value: b.id, label: b.name || b.id }))}
                  />
                  {savingClientForm && <span className="text-xs text-gray-500">Sauvegarde…</span>}
                </div>
                {!clientBlockId && (
                  <div className="text-gray-500">Sélectionnez un formulaire. Créez un bloc “Coordonnées Client” dans Formulaire — il apparaîtra ici et dans Devis.</div>
                )}
                {clientBlock && (
                  <div className="border rounded p-3 bg-white">
                    <div className="grid grid-cols-4 gap-4">
                      {clientBlock.sections?.flatMap(s => s.fields)?.map((f) => {
                        let colSpan = 'col-span-4';
                        if (f.width === '1/2') colSpan = 'col-span-2';
                        else if (f.width === '1/4') colSpan = 'col-span-1';
                        else if (f.width === '3/4') colSpan = 'col-span-3';
                        const val = clientValues[f.id] ?? '';
                        const opts = Array.isArray(f.options) ? f.options : [];
                        return (
                          <div key={f.id} className={`flex flex-col ${colSpan}`}>
                            <label className="font-medium mb-1">{f.label}</label>
                            {f.type === 'text' && (
                              <input className="border rounded px-2 py-1" value={val as string} onChange={(e) => {
                                const next = { ...clientValues, [f.id]: e.target.value };
                                setClientValues(next);
                                scheduleClientSave(next);
                              }} />
                            )}
                            {f.type === 'number' && (
                              <input type="number" className="border rounded px-2 py-1" value={val as number | string} onChange={(e) => {
                                const nv = e.target.value === '' ? '' : Number(e.target.value);
                                const next = { ...clientValues, [f.id]: nv };
                                setClientValues(next);
                                scheduleClientSave(next);
                              }} />
                            )}
                            {f.type === 'date' && (
                              <input type="date" className="border rounded px-2 py-1" value={val as string} onChange={(e) => {
                                const next = { ...clientValues, [f.id]: e.target.value };
                                setClientValues(next);
                                scheduleClientSave(next);
                              }} />
                            )}
                            {f.type === 'select' && (
                              <select className="border rounded px-2 py-1" value={val as string} onChange={(e) => {
                                const next = { ...clientValues, [f.id]: e.target.value };
                                setClientValues(next);
                                scheduleClientSave(next);
                              }}>
                                <option value="">Sélectionner…</option>
                                {opts.map((o) => (
                                  <option key={o.id} value={o.value || o.label}>{o.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Données sauvegardées dans Lead → data.devis[{clientBlockId || '…'}]</div>
                  </div>
                )}
              </Card>
          </TabPane>

          {/* Onglet Timeline */}
          <TabPane tab="Historique" key="timeline">
            <Card>
              <Timeline>
                <Timeline.Item color="blue">
                  <div>
                    <p className="font-medium">Lead créé</p>
                    <p className="text-sm text-gray-500">Source: {lead.source ? getSourceLabel(lead.source) : 'Direct'}</p>
                    <p className="text-sm text-gray-500">{new Date(lead.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                </Timeline.Item>
                {quotes.map((q) => (
                  <Timeline.Item key={q.id} color="cyan">
                    <div>
                      <p className="font-medium">Devis créé{q.title ? ` — ${q.title}` : ''}</p>
                      <p className="text-sm text-gray-500">Statut: {q.status || '—'}</p>
                      <p className="text-sm text-gray-500">{new Date(q.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  </Timeline.Item>
                ))}
                {quotes.length === 0 && (
                  <Timeline.Item color="gray">
                    <span className="text-gray-500">Aucune activité enregistrée (devis, appels, emails). Les modules concernés alimenteront automatiquement cette timeline.</span>
                  </Timeline.Item>
                )}
              </Timeline>
            </Card>
          </TabPane>

          {/* Onglet Devis */}
          <TabPane tab="Devis" key="quotes">
            <Card>
              {quotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileTextOutlined className="text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucun devis créé pour ce lead</p>
                  <Button 
                    type="primary" 
                    icon={<FileTextOutlined />}
                    onClick={() => navigate(`/devis?leadId=${leadId}${clientBlockId ? `&blockId=${clientBlockId}` : ''}`)}
                  >
                    Ouvrir Devis
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <div key={q.id} className="border rounded p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{q.title || 'Devis'}</div>
                        <div className="text-xs text-gray-500">{new Date(q.createdAt).toLocaleString('fr-FR')} — Statut: {q.status || '—'}</div>
                      </div>
                      <Button size="small" onClick={() => navigate(`/devis?leadId=${leadId}`)}>Ouvrir</Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabPane>

          {/* Onglet Propositions (PDFs) - Placeholder */}
          <TabPane tab="Propositions" key="proposals">
            <Card>
              <div className="text-gray-600">Espace réservé pour les propositions (PDF). On liera ici la génération/export PDF des devis.</div>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
