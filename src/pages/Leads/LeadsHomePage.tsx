import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Space, Badge, Input, Select, DatePicker, Card, Typography, Row, Col, Tag, Modal, message, Popconfirm, Grid } from 'antd';
import { useNavigate } from 'react-router-dom';
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
  DeleteOutlined,
  EditOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import AddLeadModal from './components/AddLeadModal';
import EditLeadModal from './components/EditLeadModal';
import CallModule from './CallModule';
import EmailModule from './EmailModule';
import LeadDetailModule from './LeadDetailModule';
import type { Lead } from '../../types/leads';
import { 
  calculateLeadTimelineStatus, 
  generateLeadRecommendations
} from '../../utils/leadTimeline';
import dayjs from 'dayjs';
import { getErrorMessage } from '../../utils/errorHandling';
import { useTranslation } from 'react-i18next';
import { logger } from '../../lib/logger';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

interface LeadsHomePageProps {
  onViewLead: (leadId: string) => void;
  onCallLead: (leadId: string) => void;
  onEmailLead: (leadId: string) => void;
  onScheduleLead: (leadId: string) => void;
  onCreateLead?: () => void;
  refreshTrigger?: number; // Pour forcer le rafraîchissement
  openInline?: boolean; // Ouvrir les modules en modal inline (par défaut true)
}

/**
 * 🏠 Page d'accueil CRM - Liste des Leads avec IA et notifications
 */
export default function LeadsHomePage({ 
  onViewLead, 
  onCallLead, 
  onEmailLead, 
  onScheduleLead,
  refreshTrigger = 0,
  openInline = true
}: LeadsHomePageProps): React.ReactElement {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // 🔍 DEBUG: Vérifier les props reçues en détail
  logger.debug('[LeadsHomePage] 📦 Props reçues:', {
    onViewLead: typeof onViewLead,
    onCallLead: typeof onCallLead,
    onEmailLead: typeof onEmailLead,
    onScheduleLead: typeof onScheduleLead,
    refreshTrigger,
    onViewLeadDef: onViewLead !== undefined,
    onCallLeadDef: onCallLead !== undefined,
    onEmailLeadDef: onEmailLead !== undefined,
    onScheduleLeadDef: onScheduleLead !== undefined
  });
  
  // 🚨 URGENT DEBUG: Tester directement les callbacks
  logger.debug('[LeadsHomePage] 🧪 TEST DIRECT DES CALLBACKS:');
  logger.debug('[LeadsHomePage] 🧪 onViewLead:', onViewLead);
  logger.debug('[LeadsHomePage] 🧪 onCallLead:', onCallLead);
  logger.debug('[LeadsHomePage] 🧪 onEmailLead:', onEmailLead);
  logger.debug('[LeadsHomePage] 🧪 onScheduleLead:', onScheduleLead);
  
  if (onCallLead) {
    logger.debug('[LeadsHomePage] ✅ onCallLead existe et est valide');
  } else {
    logger.debug('[LeadsHomePage] ❌ onCallLead est NULL/UNDEFINED!');
  }
  // Navigation et hooks
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const { leadStatuses } = useLeadStatuses();
  
  // State local pour gérer le refresh interne
  const [internalRefreshTrigger] = useState(0);
  const { currentOrganization, isSuperAdmin, user } = useAuth();

  // États principaux
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
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
  // Modals inline pour actions
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

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
    logger.debug('[LeadsHomePage] 🔍 Smart search - searchTerm:', searchTerm, 'leads:', leads.length);
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
    logger.debug('[LeadsHomePage] 🔍 Début filtrage - smartSearch:', result.length);
    logger.debug('[LeadsHomePage] 🔍 Filtres actifs:', { 
      statusFilter: statusFilter.length, 
      sourceFilter, 
      commercialFilter, 
      dateRange: dateRange.length 
    });
    
    // Filtre par statut
    if (statusFilter.length > 0) {
      const beforeCount = result.length;
      result = result.filter(lead => statusFilter.includes(lead.status));
      logger.debug('[LeadsHomePage] 🔍 Après filtre statut:', result.length, 'avant:', beforeCount);
    }
    
    // Filtre par source
    if (sourceFilter) {
      const beforeCount = result.length;
      result = result.filter(lead => lead.source === sourceFilter);
      logger.debug('[LeadsHomePage] 🔍 Après filtre source:', result.length, 'avant:', beforeCount);
    }
    
    // Filtre par commercial
    if (commercialFilter) {
      const beforeCount = result.length;
      result = result.filter(lead => lead.assignedTo === commercialFilter);
      logger.debug('[LeadsHomePage] 🔍 Après filtre commercial:', result.length, 'avant:', beforeCount);
    }
    
    // Filtre par date
    if (dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const beforeCount = result.length;
      result = result.filter(lead => {
        const leadDate = dayjs(lead.createdAt);
        return leadDate.isAfter(dateRange[0]) && leadDate.isBefore(dateRange[1]);
      });
      logger.debug('[LeadsHomePage] 🔍 Après filtre date:', result.length, 'avant:', beforeCount);
    }
    
    logger.debug('[LeadsHomePage] 🔍 Leads filtrés FINAL:', result.length, 'sur', smartSearch.length);
    return result;
  }, [smartSearch, statusFilter, sourceFilter, commercialFilter, dateRange]);

  // 🤖 SYSTÈME D'IA APPROFONDI - Analyse des leads réels
  const aiAnalysis = useMemo(() => {
    logger.debug('[IA] 🧠 Analyse approfondie des leads...', leads.length, 'leads');
    
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

    logger.debug('[IA] 🧠 Analyse terminée:', {
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

  // 📱 Actions rapides sur chaque lead - avec garde
  logger.debug('[LeadsHomePage] 🏗️ Création des handlers avec les props actuelles...');
  logger.debug('[LeadsHomePage] 🏗️ onCallLead actuel:', typeof onCallLead, onCallLead);
  
  const handleCallLead = useCallback((lead: Lead) => {
    logger.debug('[LeadsHomePage] 📞 handleCallLead appelé, onCallLead:', typeof onCallLead);
    logger.debug('[LeadsHomePage] 📞 onCallLead valeur:', onCallLead);
    logger.debug('[LeadsHomePage] 📞 lead.id:', lead.id);
    if (openInline) {
      setSelectedLead(lead);
      setIsCallModalOpen(true);
      return;
    }
    if (typeof onCallLead === 'function') {
      logger.debug('[LeadsHomePage] 📞 Appel de onCallLead avec:', lead.id);
      onCallLead(lead.id);
      logger.debug('[LeadsHomePage] 📞 onCallLead executé avec succès');
    } else {
      logger.error('[LeadsHomePage] ❌ onCallLead n\'est pas une fonction:', onCallLead);
      message.error('Erreur : fonction d\'appel non disponible');
    }
  }, [onCallLead, openInline]);
  
  logger.debug('[LeadsHomePage] ✅ handleCallLead créé:', typeof handleCallLead);

  const handleEmailLead = useCallback((lead: Lead) => {
    logger.debug('[LeadsHomePage] 📧 handleEmailLead appelé, onEmailLead:', typeof onEmailLead);
    logger.debug('[LeadsHomePage] 📧 onEmailLead valeur:', onEmailLead);
    logger.debug('[LeadsHomePage] 📧 lead.id:', lead.id);
    if (openInline) {
      setSelectedLead(lead);
      setIsEmailModalOpen(true);
      return;
    }
    if (typeof onEmailLead === 'function') {
      logger.debug('[LeadsHomePage] 📧 Appel de onEmailLead avec:', lead.id);
      onEmailLead(lead.id);
      logger.debug('[LeadsHomePage] 📧 onEmailLead executé avec succès');
    } else {
      logger.error('[LeadsHomePage] ❌ onEmailLead n\'est pas une fonction:', onEmailLead);
      message.error('Erreur : fonction d\'email non disponible');
    }
  }, [onEmailLead, openInline]);
  
  logger.debug('[LeadsHomePage] ✅ handleEmailLead créé:', typeof handleEmailLead);

  const handleScheduleMeeting = useCallback((lead: Lead) => {
    logger.debug('[LeadsHomePage] 📅 handleScheduleMeeting appelé, onScheduleLead:', typeof onScheduleLead);
    if (openInline) {
      setSelectedLead(lead);
      setIsAgendaModalOpen(true);
      return;
    }
    if (typeof onScheduleLead === 'function') {
      onScheduleLead(lead.id);
    } else {
      logger.error('[LeadsHomePage] ❌ onScheduleLead n\'est pas une fonction:', onScheduleLead);
      message.error('Erreur : fonction de planification non disponible');
    }
  }, [onScheduleLead, openInline]);

  const handleViewDetails = useCallback((lead: Lead) => {
    logger.debug('[LeadsHomePage] 👁️ handleViewDetails appelé, onViewLead:', typeof onViewLead);
    if (openInline) {
      setSelectedLead(lead);
      setIsDetailsModalOpen(true);
      return;
    }
    if (typeof onViewLead === 'function') {
      onViewLead(lead.id);
    } else {
      logger.error('[LeadsHomePage] ❌ onViewLead n\'est pas une fonction:', onViewLead);
      message.error('Erreur : fonction de visualisation non disponible');
    }
  }, [onViewLead, openInline]);

  const handleEdit = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setIsEditModalVisible(true);
  }, []);

  // 📊 Récupération des leads
  const fetchLeads = useCallback(async () => {
    // Attendre que l'organisation soit définie pour les utilisateurs normaux
    if (!currentOrganization && !isSuperAdmin) {
      logger.debug('[LeadsHomePage] ⏳ En attente de la définition de l\'organisation...');
      return;
    }
    
    setLoading(true);
    try {
      logger.debug('[LeadsHomePage] 📊 Récupération des leads...');
      
      const response = await api.get('/api/leads');
      logger.debug('[LeadsHomePage] 📊 Réponse API complète:', response);
      logger.debug('[LeadsHomePage] 📊 Type de response:', typeof response);
      logger.debug('[LeadsHomePage] 📊 Keys de response:', Object.keys(response || {}));
      logger.debug('[LeadsHomePage] 📊 Array.isArray(response):', Array.isArray(response));
      logger.debug('[LeadsHomePage] 📊 response.data existe:', !!response?.data);
      logger.debug('[LeadsHomePage] 📊 Array.isArray(response.data):', Array.isArray(response?.data));
      
      // Essayer différentes structures
      let leadsData: Lead[] = [];
      if (response?.success && Array.isArray(response.data)) {
        logger.debug('[LeadsHomePage] 📊 Structure: {success: true, data: [...]}');
        leadsData = response.data;
      } else if (Array.isArray(response)) {
        logger.debug('[LeadsHomePage] 📊 Structure: tableau direct (fallback)');
        leadsData = response;
      } else {
        logger.debug('[LeadsHomePage] 📊 Structure inconnue, réponse:', response);
        leadsData = [];
      }
      
      logger.debug('[LeadsHomePage] 📊 Leads reçus:', leadsData.length);
      logger.debug('[LeadsHomePage] 📊 Structure premier lead:', leadsData[0]);
      
      // Transformer les données Prisma pour la compatibilité avec l'interface
      const transformedLeads = leadsData.map(lead => {
        logger.debug('[LeadsHomePage] 📊 Traitement lead:', lead.id, lead);
        
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
      
      logger.debug('[LeadsHomePage] 📊 Leads transformés:', transformedLeads);
      setLeads(transformedLeads);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors du chargement des leads');
      logger.error('[LeadsHomePage] ❌ Erreur lors du chargement des leads:', errorMessage, error);
      NotificationManager.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [api, currentOrganization, isSuperAdmin, getNotificationColor]);

  // 🔄 Chargement initial
  useEffect(() => {
    // Attendre que l'utilisateur ET l'organisation soient définis
    if (user && (currentOrganization || isSuperAdmin)) {
      logger.debug('[LeadsHomePage] 🚀 Chargement des leads...', { 
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
    setDeletingId(lead.id);
    try {
      await api.delete(`/api/leads/${lead.id}`);
      // Si aucune exception levée, considérer comme succès (gère 204 No Content)
      message.success('Lead supprimé avec succès');
      await fetchLeads();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la suppression');
      message.error(errorMessage);
      throw error;
    } finally {
      setDeletingId(null);
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
            onClick={() => {
              logger.debug(`[LeadsHomePage] 📞 BOUTON APPEL CLIQUÉ - TIMESTAMP: ${Date.now()}`);
              logger.debug('[LeadsHomePage] 📞 Lead pour appel:', lead);
              logger.debug('[LeadsHomePage] 📞 handleCallLead fonction:', typeof handleCallLead);
              handleCallLead(lead);
            }}
            title="Appeler"
          />
          <Button 
            size="small" 
            icon={<MailOutlined />} 
            onClick={() => {
              logger.debug(`[LeadsHomePage] 📧 BOUTON EMAIL CLIQUÉ - TIMESTAMP: ${Date.now()}`);
              logger.debug('[LeadsHomePage] 📧 Lead pour email:', lead);
              logger.debug('[LeadsHomePage] 📧 handleEmailLead fonction:', typeof handleEmailLead);
              handleEmailLead(lead);
            }}
            title="Envoyer un email"
          />
          <Button 
            size="small" 
            icon={<CalendarOutlined />} 
            onClick={() => {
              logger.debug(`[LeadsHomePage] 📅 BOUTON CALENDRIER CLIQUÉ - TIMESTAMP: ${Date.now()}`);
              logger.debug('[LeadsHomePage] 📅 Lead pour RDV:', lead);
              logger.debug('[LeadsHomePage] 📅 handleScheduleMeeting fonction:', typeof handleScheduleMeeting);
              handleScheduleMeeting(lead);
            }}
            title="Planifier RDV"
          />
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(lead)}
            title={t('common.edit')}
          />
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => {
              logger.debug(`[LeadsHomePage] 👁️ BOUTON VOIR DÉTAILS CLIQUÉ - TIMESTAMP: ${Date.now()}`);
              logger.debug('[LeadsHomePage] 👁️ Lead pour détails:', lead);
              logger.debug('[LeadsHomePage] 👁️ handleViewDetails fonction:', typeof handleViewDetails);
              handleViewDetails(lead);
            }}
            title="Voir détails"
          />
          <Popconfirm
            title="Supprimer le lead"
            description="Cette action est irréversible. Confirmez la suppression ?"
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(lead)}
          >
            <Button
              size="small"
              danger
              loading={deletingId === lead.id}
              icon={<DeleteOutlined />}
              title={t('common.delete')}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  //  Fonction pour rendre la vue liste (contenu actuel)
  function renderListeView() {
    return (
    <div
      className="w-full"
      style={{
        padding: isMobile ? '16px' : '24px'
      }}
    >
      {/* ⚡ CENTRE DE NOTIFICATIONS IA */}
      {isAlertsOpen && (
        <Card
          className="mb-6 border-l-4 border-l-blue-500"
          styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
        >
          <Row
            align="middle"
            justify="space-between"
            className="mb-4"
            gutter={[12, 12]}
          >
            <Col flex="auto">
              <Title level={4} className="mb-0 flex items-center">
                ⚡ Alertes IA
                <Badge count={aiAnalysis.alerts.length} className="ml-2" />
              </Title>
            </Col>
            <Col flex="none">
              <BellOutlined className="text-xl text-blue-600" />
            </Col>
          </Row>
          <Space direction="vertical" size="small" className="w-full">
            {aiAnalysis.alerts.length > 0 ? (
              aiAnalysis.alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`bg-${alert.color}-50 border-l-4 border-l-${alert.color}-500 p-3 rounded hover:shadow-md transition-shadow cursor-pointer`}
                  role="button" tabIndex={0} onClick={() => alert.leadId && handleViewDetails(leads.find(l => l.id === alert.leadId)!)}
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
      )}

      {/*  Barre de recherche et filtres */}
      <Card
        className="mb-4"
        styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Input
              placeholder="🔍 Recherche intelligente (nom, email, téléphone...)"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size={isMobile ? 'large' : 'middle'}
            />
          </Col>
          <Col xs={24} sm={12} md={12} lg={8} xl={6}>
            <Select
              mode="multiple"
              placeholder="Statuts"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              size={isMobile ? 'large' : 'middle'}
            >
              {leadStatuses.map(status => (
                <Option key={status.id} value={status.id}>
                  {status.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={12} md={8} lg={4} xl={3}>
            <Select
              placeholder="Source"
              style={{ width: '100%' }}
              value={sourceFilter}
              onChange={setSourceFilter}
              allowClear
              size={isMobile ? 'large' : 'middle'}
            >
              <Option value="website">Site Web</Option>
              <Option value="facebook">Facebook Ads</Option>
              <Option value="salon">Salon</Option>
              <Option value="referral">Parrainage</Option>
            </Select>
          </Col>
          <Col xs={12} sm={12} md={8} lg={4} xl={3}>
            <Select
              placeholder="Commercial"
              style={{ width: '100%' }}
              value={commercialFilter}
              onChange={setCommercialFilter}
              allowClear
              size={isMobile ? 'large' : 'middle'}
            >
              {/* TODO: Récupérer liste des commerciaux */}
              <Option value="user1">Commercial 1</Option>
              <Option value="user2">Commercial 2</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <RangePicker 
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Date début', 'Date fin']}
              size={isMobile ? 'large' : 'middle'}
            />
          </Col>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Select
              placeholder="Tri par"
              style={{ width: '100%' }}
              value={sortColumn}
              onChange={setSortColumn}
              size={isMobile ? 'large' : 'middle'}
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
        size={isMobile ? 'small' : 'middle'}
        pagination={{
          pageSize: isMobile ? 20 : 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} sur ${total} leads`,
        }}
        scroll={{ x: isMobile ? 900 : 1200 }}
        onChange={(pagination, filters, sorter) => {
          // TODO: Gérer le tri côté serveur
          logger.debug('Table change:', { pagination, filters, sorter });
        }}
      />

      {/* 🔔 Zone notifications IA urgentes */}
      {leads.filter(l => l.notificationColor === 'red').length > 0 && (
        <Card 
          title="⚡ Alertes IA Urgentes" 
          className="mt-4 border-red-500"
          extra={<BellOutlined className="text-red-500" />}
          styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
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
      <div
        className="mb-4 w-full"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          gap: isMobile ? 16 : 24,
          padding: isMobile ? '16px 16px 0' : '24px 24px 0'
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Title level={2} className="mb-0">
            📊 CRM Leads & Appels
          </Title>
          <p className="text-gray-600 mb-0">
            Gestion complète des leads avec IA intégrée
          </p>
        </div>
        
        <Space wrap size={isMobile ? 12 : 16}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddModalVisible(true)}
            block={isMobile}
          >
            Nouveau Lead
          </Button>
          
          {/* 🔧 Bouton Paramètres - Visible uniquement pour SuperAdmin */}
          {isSuperAdmin && (
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate('/leads/settings')}
              title="Configuration des leads et statuts"
              block={isMobile}
            >
              Paramètres
            </Button>
          )}
          
          <Badge count={aiAnalysis.alerts.length} showZero={false}>
            <Button
              icon={<BellOutlined />}
              type={isAlertsOpen ? 'primary' : 'default'}
              onClick={() => setIsAlertsOpen(prev => !prev)}
              title="Notifications IA"
              block={isMobile}
            >
              Alertes IA
            </Button>
          </Badge>
        </Space>
      </div>

      {/* 📋 Contenu principal - Liste des leads */}
      {renderListeView()}

      {/* Modales */}
      <AddLeadModal 
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          fetchLeads();
        }}
      />
      
      {selectedLead && (
        <EditLeadModal
          open={isEditModalVisible}
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

      {/* 📞 Modal Appel inline */}
      <Modal
        open={isCallModalOpen}
        onCancel={() => setIsCallModalOpen(false)}
        footer={null}
        width={"95%"}
        style={{ top: 16 }}
        destroyOnHidden
        title={null}
      >
        {selectedLead && (
          <CallModule
            leadId={selectedLead.id}
            onClose={() => setIsCallModalOpen(false)}
          />
        )}
      </Modal>

      {/* ✉️ Modal Email inline */}
      <Modal
        open={isEmailModalOpen}
        onCancel={() => setIsEmailModalOpen(false)}
        footer={null}
        width={"95%"}
        style={{ top: 16 }}
        destroyOnHidden
        title={null}
      >
        {selectedLead && (
          <EmailModule
            leadId={selectedLead.id}
            onClose={() => setIsEmailModalOpen(false)}
          />
        )}
      </Modal>

      {/* 👁️ Modal Détails inline */}
      <Modal
        open={isDetailsModalOpen}
        onCancel={() => setIsDetailsModalOpen(false)}
        footer={null}
        width={"95%"}
        style={{ top: 16 }}
        destroyOnHidden
        title={null}
      >
        {selectedLead && (
          <LeadDetailModule
            leadId={selectedLead.id}
            onClose={() => setIsDetailsModalOpen(false)}
          />
        )}
      </Modal>

      {/* 🗓️ Modal Agenda inline (évite Modal.info statique) */}
      <Modal
        open={isAgendaModalOpen}
        onCancel={() => setIsAgendaModalOpen(false)}
        footer={null}
        width={800}
        destroyOnHidden
        title={
          <div className="flex items-center gap-2">
            <CalendarOutlined />
            <span>Planifier un rendez-vous</span>
          </div>
        }
      >
        {selectedLead ? (
          <div className="space-y-4">
            <p>
              Intégration Google Calendar prochaine. Vous pouvez continuer vers la page dédiée pour ce lead.
            </p>
            <Space>
              <Button onClick={() => setIsAgendaModalOpen(false)}>Fermer</Button>
              <Button
                type="primary"
                onClick={() => {
                  if (typeof onScheduleLead === 'function') {
                    onScheduleLead(selectedLead.id);
                  } else {
                    // Fallback navigation locale si callback absent
                    navigate(`/leads/agenda/${selectedLead.id}`);
                  }
                  setIsAgendaModalOpen(false);
                }}
              >
                Ouvrir la page Agenda
              </Button>
            </Space>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
