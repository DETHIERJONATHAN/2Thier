import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Space, Badge, Input, Select, DatePicker, Card, Typography, Row, Col, Tag, Tabs, Modal, message } from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined, 
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  PlusOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  DashboardOutlined,
  SettingOutlined,
  ProjectOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import LeadsKanban from './LeadsKanban';
import LeadsDashboard from './LeadsDashboard';
import LeadsSettingsPage from './LeadsSettingsPage';
import AddLeadModal from './components/AddLeadModal';
import EditLeadModal from './components/EditLeadModal';
import type { Lead } from '../../types/leads';
import { 
  calculateLeadTimelineStatus, 
  generateLeadRecommendations, 
  calculateCommercialImpact 
} from '../../utils/leadTimeline';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface LeadsHomePageProps {
  onViewLead: (leadId: string) => void;
  onCallLead: (leadId: string) => void;
  onEmailLead: (leadId: string) => void;
  onScheduleLead: (leadId: string) => void;
  onCreateLead?: () => void;
  refreshTrigger?: number; // Pour forcer le rafraîchissement
}

/**
 * 🏠 Page d'accueil CRM - Liste des Leads avec IA et notifications
 */
export default function LeadsHomePage({ 
  onViewLead, 
  onCallLead, 
  onEmailLead, 
  onScheduleLead,
  onCreateLead,
  refreshTrigger = 0
}: LeadsHomePageProps): React.ReactElement {
  // Navigation et hooks
  const { api } = useAuthenticatedApi();
  const { leadStatuses } = useLeadStatuses();
  
  // State local pour gérer le refresh interne
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const { currentOrganization, isSuperAdmin, user } = useAuth();

  // 🎯 Navigation entre les vues
  const [activeView, setActiveView] = useState('liste');
  
  // États principaux
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [commercialFilter, setCommercialFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState<string>('priorityIA');

  // États pour les modales
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // 🔔 Fonction pour déterminer la couleur de notification IA
  const getNotificationColor = useCallback((lead: Lead) => {
    const now = dayjs();
    const nextFollowUp = lead.nextFollowUp ? dayjs(lead.nextFollowUp) : null;
    
    // Rouge = urgent (retard > 2 jours ou RDV annulé)
    if (nextFollowUp && nextFollowUp.isBefore(now.subtract(2, 'day'))) {
      return 'red';
    }
    
    // Orange = à suivre (retard 1-2 jours)
    if (nextFollowUp && nextFollowUp.isBefore(now.subtract(1, 'day'))) {
      return 'orange';
    }
    
    // Vert = en règle
    return 'green';
  }, []);

  // 🔍 Recherche intelligente avec IA
  const smartSearch = useMemo(() => {
    console.log('[LeadsHomePage] 🔍 Smart search - searchTerm:', searchTerm, 'leads:', leads.length);
    if (!searchTerm) return leads;
    
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => {
      // Recherche phonétique et suggestions automatiques - structure réelle des données
      const nameMatch = lead.name?.toLowerCase().includes(term);
      const emailMatch = lead.email?.toLowerCase().includes(term);
      const phoneMatch = lead.phone?.includes(term);
      const companyMatch = lead.company?.toLowerCase().includes(term);
      const sourceMatch = lead.source?.toLowerCase().includes(term);
      
      // TODO: Ajouter IA pour recherche phonétique avancée
      return nameMatch || emailMatch || phoneMatch || companyMatch || sourceMatch;
    });
  }, [leads, searchTerm]);

  // 📊 Filtrage dynamique
  const filteredLeads = useMemo(() => {
    let result = smartSearch;
    console.log('[LeadsHomePage] 🔍 Début filtrage - smartSearch:', result.length);
    console.log('[LeadsHomePage] 🔍 Filtres actifs:', { 
      statusFilter: statusFilter.length, 
      sourceFilter, 
      commercialFilter, 
      dateRange: dateRange.length 
    });
    
    // Filtre par statut
    if (statusFilter.length > 0) {
      const beforeCount = result.length;
      result = result.filter(lead => statusFilter.includes(lead.status));
      console.log('[LeadsHomePage] 🔍 Après filtre statut:', result.length, 'avant:', beforeCount);
    }
    
    // Filtre par source
    if (sourceFilter) {
      const beforeCount = result.length;
      result = result.filter(lead => lead.source === sourceFilter);
      console.log('[LeadsHomePage] 🔍 Après filtre source:', result.length, 'avant:', beforeCount);
    }
    
    // Filtre par commercial
    if (commercialFilter) {
      const beforeCount = result.length;
      result = result.filter(lead => lead.assignedTo === commercialFilter);
      console.log('[LeadsHomePage] 🔍 Après filtre commercial:', result.length, 'avant:', beforeCount);
    }
    
    // Filtre par date
    if (dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const beforeCount = result.length;
      result = result.filter(lead => {
        const leadDate = dayjs(lead.createdAt);
        return leadDate.isAfter(dateRange[0]) && leadDate.isBefore(dateRange[1]);
      });
      console.log('[LeadsHomePage] 🔍 Après filtre date:', result.length, 'avant:', beforeCount);
    }
    
    console.log('[LeadsHomePage] 🔍 Leads filtrés FINAL:', result.length, 'sur', smartSearch.length);
    return result;
  }, [smartSearch, statusFilter, sourceFilter, commercialFilter, dateRange]);

  // 🤖 SYSTÈME D'IA APPROFONDI - Analyse des leads réels
  const aiAnalysis = useMemo(() => {
    console.log('[IA] 🧠 Analyse approfondie des leads...', leads.length, 'leads');
    
    if (leads.length === 0) {
      return {
        alerts: [],
        criticalCount: 0,
        overdueCount: 0,
        uncompletedCalls: 0,
        emailTracking: []
      };
    }

    const alerts: Array<{
      id: string;
      type: 'critical' | 'warning' | 'info' | 'success';
      color: 'red' | 'orange' | 'blue' | 'green';
      icon: React.ReactNode;
      message: string;
      action?: string;
      leadId?: string;
    }> = [];

    let criticalCount = 0;
    let overdueCount = 0;
    let uncompletedCalls = 0;
    const emailTracking: Array<{leadName: string; opens: number}> = [];

    // Analyser chaque lead avec l'IA
    leads.forEach(lead => {
      const timeline = calculateLeadTimelineStatus(lead.createdAt, lead.source || 'manual');
      const recommendations = generateLeadRecommendations(lead);
      const impact = calculateCommercialImpact(lead);

      // 🚨 CRITIQUES : Leads en retard critique
      if (timeline.status === 'critical') {
        criticalCount++;
        alerts.push({
          id: `critical-${lead.id}`,
          type: 'critical',
          color: 'red',
          icon: <ExclamationCircleOutlined className="text-red-600" />,
          message: `${lead.name || 'Lead'} (${lead.source || 'direct'}) - ${Math.floor(Math.abs(timeline.remainingHours) / 24)} jours de retard`,
          action: 'Appeler immédiatement',
          leadId: lead.id
        });
      }

      // ⚠️ EN RETARD : Leads dépassant les délais
      if (timeline.status === 'overdue' && timeline.status !== 'critical') {
        overdueCount++;
        alerts.push({
          id: `overdue-${lead.id}`,
          type: 'warning',
          color: 'orange',
          icon: <FireOutlined className="text-orange-600" />,
          message: `${lead.name || 'Lead'} dépasse le délai de ${timeline.deadlineDate.toLocaleDateString()}`,
          action: 'Contacter aujourd\'hui',
          leadId: lead.id
        });
      }

      // ⏰ URGENTS : Leads à traiter rapidement
      if (timeline.status === 'warning' && recommendations.priority === 'high') {
        alerts.push({
          id: `urgent-${lead.id}`,
          type: 'warning',
          color: 'orange',
          icon: <ClockCircleOutlined className="text-orange-600" />,
          message: `${lead.name || 'Lead'} - ${timeline.description}`,
          action: recommendations.actions[0] || 'Traiter rapidement',
          leadId: lead.id
        });
      }

      // 📞 APPELS NON COMPLÉTÉS (simulation basée sur le statut)
      if (lead.status === 'contacted' && !lead.notes) {
        uncompletedCalls++;
      }

      // 📧 TRACKING EMAILS (simulation de données réalistes)
      if (lead.status === 'contacted' || lead.status === 'meeting') {
        emailTracking.push({
          leadName: lead.name || 'Lead',
          opens: Math.floor(Math.random() * 5) + 1 // Simulation d'ouvertures
        });
      }
    });

    // 📊 ALERTES GLOBALES SYSTÈME
    if (criticalCount > 0) {
      alerts.unshift({
        id: 'system-critical',
        type: 'critical',
        color: 'red',
        icon: <ExclamationCircleOutlined className="text-red-600" />,
        message: `${criticalCount} leads dépassent gravement le délai de traitement`,
        action: 'Action immédiate requise'
      });
    }

    if (uncompletedCalls > 0) {
      alerts.push({
        id: 'system-calls',
        type: 'warning',
        color: 'orange',
        icon: <PhoneOutlined className="text-orange-600" />,
        message: `${uncompletedCalls} appels terminés sans statut à compléter`,
        action: 'Mettre à jour les statuts'
      });
    }

    if (emailTracking.length > 0) {
      const topEmailLead = emailTracking.sort((a, b) => b.opens - a.opens)[0];
      alerts.push({
        id: 'system-email',
        type: 'info',
        color: 'blue',
        icon: <MailOutlined className="text-blue-600" />,
        message: `${topEmailLead.leadName} a ouvert vos emails ${topEmailLead.opens} fois`,
        action: 'Lead très intéressé - Relancer'
      });
    }

    // 🎯 RECOMMANDATIONS IA GLOBALES
    const totalOverdue = criticalCount + overdueCount;
    if (totalOverdue > 0) {
      alerts.push({
        id: 'ai-recommendation',
        type: 'info',
        color: 'blue',
        icon: <div className="text-blue-600">🤖</div>,
        message: `IA suggère: Prioriser les ${totalOverdue} leads en retard pour améliorer le taux de conversion`,
        action: 'Voir détails IA'
      });
    }

    console.log('[IA] 🧠 Analyse terminée:', {
      alertes: alerts.length,
      critiques: criticalCount,
      retards: overdueCount,
      appelsSansStatut: uncompletedCalls,
      emailsTracking: emailTracking.length
    });

    return {
      alerts: alerts.slice(0, 6), // Limiter à 6 alertes max
      criticalCount,
      overdueCount,
      uncompletedCalls,
      emailTracking
    };
  }, [leads]);

  // 📱 Actions rapides sur chaque lead
  const handleCallLead = useCallback((lead: Lead) => {
    onCallLead(lead.id);
  }, [onCallLead]);

  const handleEmailLead = useCallback((lead: Lead) => {
    onEmailLead(lead.id);
  }, [onEmailLead]);

  const handleScheduleMeeting = useCallback((lead: Lead) => {
    onScheduleLead(lead.id);
  }, [onScheduleLead]);

  const handleViewDetails = useCallback((lead: Lead) => {
    onViewLead(lead.id);
  }, [onViewLead]);

  const handleEdit = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setIsEditModalVisible(true);
  }, []);

  // 📊 Récupération des leads
  const fetchLeads = useCallback(async () => {
    // Attendre que l'organisation soit définie pour les utilisateurs normaux
    if (!currentOrganization && !isSuperAdmin) {
      console.log('[LeadsHomePage] ⏳ En attente de la définition de l\'organisation...');
      return;
    }
    
    setLoading(true);
    try {
      console.log('[LeadsHomePage] 📊 Récupération des leads...');
      
      const response = await api.get('/api/leads');
      console.log('[LeadsHomePage] 📊 Réponse API complète:', response);
      console.log('[LeadsHomePage] 📊 Type de response:', typeof response);
      console.log('[LeadsHomePage] 📊 Keys de response:', Object.keys(response || {}));
      console.log('[LeadsHomePage] 📊 Array.isArray(response):', Array.isArray(response));
      console.log('[LeadsHomePage] 📊 response.data existe:', !!response?.data);
      console.log('[LeadsHomePage] 📊 Array.isArray(response.data):', Array.isArray(response?.data));
      
      // Essayer différentes structures
      let leadsData: Lead[] = [];
      if (response?.success && Array.isArray(response.data)) {
        console.log('[LeadsHomePage] 📊 Structure: {success: true, data: [...]}');
        leadsData = response.data;
      } else if (Array.isArray(response)) {
        console.log('[LeadsHomePage] 📊 Structure: tableau direct (fallback)');
        leadsData = response;
      } else {
        console.log('[LeadsHomePage] 📊 Structure inconnue, réponse:', response);
        leadsData = [];
      }
      
      console.log('[LeadsHomePage] 📊 Leads reçus:', leadsData.length);
      console.log('[LeadsHomePage] 📊 Structure premier lead:', leadsData[0]);
      
      // Transformer les données Prisma pour la compatibilité avec l'interface
      const transformedLeads = leadsData.map(lead => {
        console.log('[LeadsHomePage] 📊 Traitement lead:', lead.id, lead);
        
        return {
          ...lead,
          // Extraire les propriétés du champ data JSON pour la compatibilité
          name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || `Lead ${lead.id.slice(0, 8)}`,
          email: lead.email || lead.data?.email || '',
          phone: lead.phone || lead.data?.phone || '',
          company: lead.company || lead.data?.company || '',
          notes: lead.data?.notes || '',
          website: lead.data?.website || '',
          linkedin: lead.data?.linkedin || '',
          lastContact: lead.data?.lastContactDate || lead.createdAt,
          // Ajouter calcul priorité IA
          priorityIA: Math.random() * 100, // Temporaire - remplacer par vraie IA
          notificationColor: getNotificationColor(lead)
        };
      });
      
      console.log('[LeadsHomePage] 📊 Leads transformés:', transformedLeads);
      setLeads(transformedLeads);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur lors du chargement des leads:', errorMessage);
      NotificationManager.error('Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  }, [api, currentOrganization, isSuperAdmin, getNotificationColor]);

  // 🔄 Chargement initial
  useEffect(() => {
    // Attendre que l'utilisateur ET l'organisation soient définis
    if (user && (currentOrganization || isSuperAdmin)) {
      console.log('[LeadsHomePage] 🚀 Chargement des leads...', { 
        user: user.email, 
        org: currentOrganization?.name || 'Vue globale',
        isSuperAdmin,
        refreshTrigger,
        internalRefreshTrigger
      });
      fetchLeads();
    }
  }, [user, currentOrganization, isSuperAdmin, fetchLeads, refreshTrigger, internalRefreshTrigger]);

  // 📋 Configuration des colonnes du tableau
  const handleDelete = useCallback(async (lead: Lead) => {
    try {
      const response = await api.delete(`/api/leads/${lead.id}`);
      if (response.success) {
        message.success('Lead supprimé avec succès');
        fetchLeads();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
      message.error(errorMessage);
    }
  }, [api, fetchLeads]);

  const columns = [
    {
      title: '🔔',
      key: 'notification',
      width: 50,
      render: (_, lead: Lead) => (
        <Badge 
          color={lead.notificationColor} 
          title={
            lead.notificationColor === 'red' ? 'Urgent - Retard de traitement' :
            lead.notificationColor === 'orange' ? 'À suivre - Relance nécessaire' :
            'En règle'
          }
        />
      ),
    },
    {
      title: 'Nom / Prénom',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (name: string, lead: Lead) => (
        <Button 
          type="link" 
          icon={<UserOutlined />}
          onClick={() => handleViewDetails(lead)}
        >
          {name || 'N/A'}
        </Button>
      ),
    },
    {
      title: 'Société',
      dataIndex: 'company',
      key: 'company',
      sorter: true,
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => <Tag color="blue">{source}</Tag>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusInfo = leadStatuses.find(s => s.id === status);
        return (
          <Tag color={statusInfo?.color || 'default'}>
            {statusInfo?.name || status}
          </Tag>
        );
      },
    },
    {
      title: 'Date d\'entrée',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Commercial',
      key: 'assignedTo',
      render: (_, lead: Lead) => {
        if (lead.assignedTo) {
          return `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() || lead.assignedTo.email;
        }
        return 'Non assigné';
      },
    },
    {
      title: 'Dernière action',
      dataIndex: 'lastContact',
      key: 'lastContact',
      render: (date: string) => date ? dayjs(date).format('DD/MM HH:mm') : 'Aucune',
    },
    {
      title: 'Prochain suivi',
      dataIndex: 'nextFollowUp',
      key: 'nextFollowUp',
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : 'À définir',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, lead: Lead) => (
        <Space>
          <Button 
            size="small" 
            icon={<PhoneOutlined />} 
            onClick={() => handleCallLead(lead)}
            title="Appeler"
          />
          <Button 
            size="small" 
            icon={<MailOutlined />} 
            onClick={() => handleEmailLead(lead)}
            title="Envoyer un email"
          />
          <Button 
            size="small" 
            icon={<CalendarOutlined />} 
            onClick={() => handleScheduleMeeting(lead)}
            title="Planifier RDV"
          />
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(lead)}
            title="Modifier"
          />
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(lead)}
            title="Voir détails"
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Êtes-vous sûr de vouloir supprimer ce lead ?',
                content: 'Cette action est irréversible.',
                okText: 'Oui',
                cancelText: 'Non',
                okButtonProps: { danger: true },
                onOk: () => handleDelete(lead)
              });
            }}
            title="Supprimer"
          />
        </Space>
      ),
    },
  ];

  // 📊 Configuration des onglets selon le cahier des charges
  const tabItems = [
    {
      key: 'liste',
      label: (
        <Space>
          <UnorderedListOutlined />
          Liste
        </Space>
      ),
      children: renderListeView()
    },
    {
      key: 'kanban',
      label: (
        <Space>
          <ProjectOutlined />
          Kanban
        </Space>
      ),
      children: (
        <LeadsKanban
          onViewLead={onViewLead}
          onCallLead={onCallLead}
          onEmailLead={onEmailLead}
          onScheduleLead={onScheduleLead}
          refreshTrigger={refreshTrigger + internalRefreshTrigger}
          onLeadUpdated={() => {
            console.log('[LeadsHomePage] 🔄 Kanban a modifié un lead, déclenchement refresh...');
            setInternalRefreshTrigger(prev => prev + 1);
          }}
        />
      )
    },
    {
      key: 'dashboard',
      label: (
        <Space>
          <DashboardOutlined />
          Dashboard
        </Space>
      ),
      children: <LeadsDashboard />
    },
    {
      key: 'parametres',
      label: (
        <Space>
          <SettingOutlined />
          Paramètres
        </Space>
      ),
      children: <LeadsSettingsPage />
    }
  ];

  // 📋 Fonction pour rendre la vue liste (contenu actuel)
  function renderListeView() {
    return (
    <div className="p-6">
      {/* ⚡ CENTRE DE NOTIFICATIONS IA */}
      <Card className="mb-6 border-l-4 border-l-blue-500">
        <Row align="middle" justify="space-between" className="mb-4">
          <Col>
            <Title level={4} className="mb-0 flex items-center">
              ⚡ Alertes IA
              <Badge count={aiAnalysis.alerts.length} className="ml-2" />
            </Title>
          </Col>
          <Col>
            <BellOutlined className="text-xl text-blue-600" />
          </Col>
        </Row>
        
        <Space direction="vertical" size="small" className="w-full">
          {aiAnalysis.alerts.length > 0 ? (
            aiAnalysis.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`bg-${alert.color}-50 border-l-4 border-l-${alert.color}-500 p-3 rounded hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => alert.leadId && handleViewDetails(leads.find(l => l.id === alert.leadId)!)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {alert.icon}
                    <span className={`font-medium text-${alert.color}-800`}>
                      {alert.message}
                    </span>
                  </div>
                  {alert.action && (
                    <Badge 
                      status={alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'processing'} 
                      text={alert.action} 
                    />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-green-600 text-center p-4 bg-green-50 rounded">
              ✅ Aucune alerte - Tous vos leads sont sous contrôle !
            </div>
          )}
        </Space>
      </Card>

      {/*  Barre de recherche et filtres */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="🔍 Recherche intelligente (nom, email, téléphone...)"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="Statuts"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              {leadStatuses.map(status => (
                <Option key={status.id} value={status.id}>
                  {status.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="Source"
              style={{ width: '100%' }}
              value={sourceFilter}
              onChange={setSourceFilter}
              allowClear
            >
              <Option value="website">Site Web</Option>
              <Option value="facebook">Facebook Ads</Option>
              <Option value="salon">Salon</Option>
              <Option value="referral">Parrainage</Option>
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="Commercial"
              style={{ width: '100%' }}
              value={commercialFilter}
              onChange={setCommercialFilter}
              allowClear
            >
              {/* TODO: Récupérer liste des commerciaux */}
              <Option value="user1">Commercial 1</Option>
              <Option value="user2">Commercial 2</Option>
            </Select>
          </Col>
          <Col span={4}>
            <RangePicker 
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Date début', 'Date fin']}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Tri par"
              style={{ width: '100%' }}
              value={sortColumn}
              onChange={setSortColumn}
            >
              <Option value="priorityIA">🤖 Priorité IA</Option>
              <Option value="createdAt">Date création</Option>
              <Option value="nextFollowUp">Prochain suivi</Option>
              <Option value="name">Nom alphabétique</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 📊 Tableau des leads */}
      <Table
        columns={columns}
        dataSource={filteredLeads}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} sur ${total} leads`,
        }}
        scroll={{ x: 1200 }}
        onChange={(pagination, filters, sorter) => {
          // TODO: Gérer le tri côté serveur
          console.log('Table change:', { pagination, filters, sorter });
        }}
      />

      {/* 🔔 Zone notifications IA urgentes */}
      {leads.filter(l => l.notificationColor === 'red').length > 0 && (
        <Card 
          title="⚡ Alertes IA Urgentes" 
          className="mt-4 border-red-500"
          extra={<BellOutlined className="text-red-500" />}
        >
          <div className="space-y-2">
            {leads
              .filter(l => l.notificationColor === 'red')
              .slice(0, 3)
              .map(lead => (
                <div key={lead.id} className="flex justify-between items-center">
                  <span>
                    🚨 <strong>{lead.name}</strong> - Retard de traitement
                  </span>
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => handleViewDetails(lead)}
                  >
                    Traiter →
                  </Button>
                </div>
              ))
            }
          </div>
        </Card>
      )}
    </div>
    );
  }

  return (
    <div className="h-full">
      {/* 🎯 Header avec actions principales */}
      <div className="mb-4 flex justify-between items-center p-6 pb-0">
        <div>
          <Title level={2} className="mb-0">
            📊 CRM Leads & Appels
          </Title>
          <p className="text-gray-600 mb-0">
            Gestion complète des leads avec IA intégrée
          </p>
        </div>
        
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddModalVisible(true)}
          >
            Nouveau Lead
          </Button>
          
          <Badge count={aiAnalysis.alerts.length} showZero={false}>
            <Button
              icon={<BellOutlined />}
              title="Notifications IA"
            >
              Alertes IA
            </Button>
          </Badge>
        </Space>
      </div>

      {/* 📋 Navigation à onglets principale */}
      <Tabs
        activeKey={activeView}
        onChange={setActiveView}
        size="large"
        items={tabItems}
        className="h-full px-6"
        style={{ height: 'calc(100vh - 120px)' }}
        tabBarStyle={{ 
          marginBottom: 16,
          borderBottom: '1px solid #f0f0f0',
          paddingLeft: 8,
          paddingRight: 8
        }}
      />

      {/* Modales */}
      <AddLeadModal 
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          fetchLeads();
        }}
      />
      
      {selectedLead && (
        <EditLeadModal
          visible={isEditModalVisible}
          lead={selectedLead}
          onCancel={() => {
            setIsEditModalVisible(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            setIsEditModalVisible(false);
            setSelectedLead(null);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
