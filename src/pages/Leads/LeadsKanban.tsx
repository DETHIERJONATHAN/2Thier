import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Tag, Button, Space, Typography, Row, Col, Badge, Spin, message } from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { 
  calculateLeadTimeline, 
  getLeadPriority, 
  getTimelineColor
} from '../../utils/leadTimeline';
import type { Lead } from '../../types/leads';

const { Title, Text } = Typography;

// Types pour le drag & drop
const ITEM_TYPE = 'LEAD_CARD';

interface DragItem {
  id: string;
  type: string;
  fromColumn: string;
}

interface LeadsKanbanProps {
  onViewLead: (leadId: string) => void;
  onCallLead: (leadId: string) => void;
  onEmailLead: (leadId: string) => void;
  onScheduleLead: (leadId: string) => void;
  refreshTrigger?: number;
  onLeadUpdated?: () => void; // 🔄 Nouveau callback pour notifier les mises à jour
}

// Configuration du pipeline par défaut
const DEFAULT_PIPELINE = [
  { 
    id: 'new', 
    name: '🆕 Nouveau', 
    color: '#1890ff',
    description: 'Leads fraîchement reçus'
  },
  { 
    id: 'contacted', 
    name: '📞 Contacté', 
    color: '#52c41a',
    description: 'Premier contact établi'
  },
  { 
    id: 'meeting', 
    name: '📅 RDV', 
    color: '#722ed1',
    description: 'Rendez-vous planifié ou en cours'
  },
  { 
    id: 'proposal', 
    name: '📋 Devis', 
    color: '#fa8c16',
    description: 'Devis envoyé, en attente'
  },
  { 
    id: 'won', 
    name: '🎉 Gagné', 
    color: '#52c41a',
    description: 'Client converti !'
  },
  { 
    id: 'lost', 
    name: '❌ Perdu', 
    color: '#ff4d4f',
    description: 'Opportunité perdue'
  }
];

// Fonction utilitaire pour normaliser les statuts
const normalizeStatus = (status: string | null): string => {
  if (!status) return 'new';
  
  // Mapping des anciens statuts vers les nouveaux
  const statusMapping: Record<string, string> = {
    'nouveau': 'new',
    'en_cours': 'contacted',
    'contacte': 'contacted',
    'contacté': 'contacted',
    'rdv': 'meeting',
    'rendez_vous': 'meeting',
    'devis': 'proposal',
    'gagne': 'won',
    'gagné': 'won',
    'perdu': 'lost',
    'termine': 'won',
    'terminé': 'won'
  };
  
  const normalizedStatus = statusMapping[status.toLowerCase()] || status;
  
  // Vérifier que le statut existe dans le pipeline
  const validStatuses = DEFAULT_PIPELINE.map(col => col.id);
  if (!validStatuses.includes(normalizedStatus)) {
    console.warn(`[LeadsKanban] Statut inconnu "${status}" normalisé vers "new"`);
    return 'new';
  }
  
  return normalizedStatus;
};

// 🃏 Composant Carte Lead
interface LeadCardProps {
  lead: Lead;
  onView: () => void;
  onCall: () => void;
  onEmail: () => void;
  onSchedule: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onView, onCall, onEmail, onSchedule }) => {
  // Utilisation des utilitaires pour les couleurs et priorités
  const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
  const priority = getLeadPriority(lead.createdAt, lead.source, lead.lastContactDate);
  const timelineColor = getTimelineColor(timeline.status);

  const getBorderColor = () => timelineColor;

  const getPriorityIcon = () => {
    switch (priority) {
      case 'critical': return <ExclamationCircleOutlined style={{ color: '#722ed1' }} />;
      case 'high': return <FireOutlined style={{ color: '#ff4d4f' }} />;
      case 'medium': return <ClockCircleOutlined style={{ color: '#fa8c16' }} />;
      default: return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: lead.id, type: ITEM_TYPE, fromColumn: lead.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const displayName = lead.firstName && lead.lastName 
    ? `${lead.firstName} ${lead.lastName}` 
    : lead.data?.name || `Lead ${lead.id.slice(0, 8)}`;

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card
        size="small"
        className="mb-3 cursor-move hover:shadow-md transition-shadow"
        style={{ 
          borderLeft: `4px solid ${getBorderColor()}`,
          borderRadius: '8px',
          backgroundColor: timeline.isOverdue ? '#faf0ff' : 'white'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* Header avec priorité et statut temporel */}
        <Row justify="space-between" align="top" className="mb-2">
          <Col>
            <Space>
              <Text strong className="text-sm">
                {displayName}
              </Text>
              {getPriorityIcon()}
            </Space>
          </Col>
          <Col>
            <Badge 
              count={timeline.isOverdue ? 'Retard' : `${timeline.remainingHours}h`}
              style={{ 
                backgroundColor: getBorderColor(),
                fontSize: '9px',
                height: '18px',
                lineHeight: '18px'
              }}
            />
          </Col>
        </Row>

        {/* Société */}
        {(lead.company || lead.data?.company) && (
          <Text type="secondary" className="text-xs block mb-2">
            🏢 {lead.company || lead.data?.company}
          </Text>
        )}

        {/* Source avec code couleur selon délai */}
        <Space size="small" className="mb-2" direction="vertical">
          <Space size="small">
            <Tag color={timeline.status === 'critical' ? 'purple' : timeline.status === 'urgent' ? 'red' : timeline.status === 'important' ? 'orange' : 'green'} className="text-xs">
              {lead.source || 'direct'}
            </Tag>
            <Text className="text-xs" style={{ color: getBorderColor() }}>
              {timeline.description}
            </Text>
          </Space>
          
          {/* Recommandation IA courte */}
          {priority !== 'low' && (
            <Text className="text-xs" style={{ 
              color: priority === 'critical' ? '#722ed1' : '#666',
              fontStyle: 'italic'
            }}>
              🤖 Action recommandée basée sur la priorité {priority}
            </Text>
          )}
        </Space>

        {/* Commercial assigné */}
        {lead.assignedTo && (
          <div className="mb-2">
            <Text className="text-xs text-gray-500">
              <UserOutlined /> {lead.assignedTo.firstName} {lead.assignedTo.lastName}
            </Text>
          </div>
        )}

        {/* Actions avec priorité sur les actions urgentes */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="small">
              {priority === 'critical' && (
                <Button 
                  size="small" 
                  type="primary" 
                  danger
                  icon={<PhoneOutlined />} 
                  onClick={(e) => { e.stopPropagation(); onCall(); }}
                  title="URGENT - Appeler"
                />
              )}
              {priority !== 'critical' && (
                <>
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<PhoneOutlined />} 
                    onClick={(e) => { e.stopPropagation(); onCall(); }}
                    title="Appeler"
                  />
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<MailOutlined />} 
                    onClick={(e) => { e.stopPropagation(); onEmail(); }}
                    title="Email"
                  />
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<CalendarOutlined />} 
                    onClick={(e) => { e.stopPropagation(); onSchedule(); }}
                    title="RDV"
                  />
                </>
              )}
              <Button 
                size="small" 
                type="text" 
                icon={<EyeOutlined />} 
                onClick={(e) => { e.stopPropagation(); onView(); }}
                title="Voir"
              />
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// 📋 Composant Colonne
interface KanbanColumnProps {
  column: typeof DEFAULT_PIPELINE[0];
  leads: Lead[];
  onDropLead: (leadId: string, newStatus: string) => void;
  onViewLead: (leadId: string) => void;
  onCallLead: (leadId: string) => void;
  onEmailLead: (leadId: string) => void;
  onScheduleLead: (leadId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  leads,
  onDropLead,
  onViewLead,
  onCallLead,
  onEmailLead,
  onScheduleLead
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: DragItem) => {
      if (item.fromColumn !== column.id) {
        onDropLead(item.id, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Calcul des métriques de la colonne avec la nouvelle logique
  const columnMetrics = useMemo(() => {
    const overdueCount = leads.filter(lead => {
      const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
      return timeline.isOverdue || timeline.status === 'critical';
    }).length;

    const criticalCount = leads.filter(lead => {
      const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
      return timeline.status === 'critical';
    }).length;

    const urgentCount = leads.filter(lead => {
      const priority = getLeadPriority(lead.createdAt, lead.source, lead.lastContactDate);
      return priority === 'high' || priority === 'critical';
    }).length;

    return { overdueCount, criticalCount, urgentCount };
  }, [leads]);

  return (
    <div 
      ref={drop}
      className={`bg-gray-50 rounded-lg p-3 min-h-[600px] transition-colors ${
        isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
      }`}
    >
      {/* Header de la colonne */}
      <div className="mb-4">
        <Row justify="space-between" align="middle" className="mb-2">
          <Col>
            <Title level={5} className="mb-0" style={{ color: column.color }}>
              {column.name}
            </Title>
          </Col>
          <Col>
            <Badge 
              count={leads.length} 
              style={{ backgroundColor: column.color }}
            />
          </Col>
        </Row>
        
        <Text type="secondary" className="text-xs block mb-2">
          {column.description}
        </Text>

        {/* Indicateurs d'urgence avec nouvelle logique */}
        {(columnMetrics.overdueCount > 0 || columnMetrics.urgentCount > 0 || columnMetrics.criticalCount > 0) && (
          <Space size="small" className="mb-2">
            {columnMetrics.criticalCount > 0 && (
              <Badge 
                count={columnMetrics.criticalCount} 
                style={{ backgroundColor: '#722ed1' }}
                title={`${columnMetrics.criticalCount} leads critiques`}
              >
                <ExclamationCircleOutlined style={{ color: '#722ed1' }} />
              </Badge>
            )}
            {columnMetrics.overdueCount > 0 && (
              <Badge 
                count={columnMetrics.overdueCount} 
                style={{ backgroundColor: '#ff4d4f' }}
                title={`${columnMetrics.overdueCount} leads en retard`}
              >
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              </Badge>
            )}
            {columnMetrics.urgentCount > 0 && (
              <Badge 
                count={columnMetrics.urgentCount} 
                style={{ backgroundColor: '#fa8c16' }}
                title={`${columnMetrics.urgentCount} leads urgents`}
              >
                <FireOutlined style={{ color: '#fa8c16' }} />
              </Badge>
            )}
          </Space>
        )}
      </div>

      {/* Cartes des leads */}
      <div className="space-y-2">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onView={() => onViewLead(lead.id)}
            onCall={() => onCallLead(lead.id)}
            onEmail={() => onEmailLead(lead.id)}
            onSchedule={() => onScheduleLead(lead.id)}
          />
        ))}
      </div>

      {/* Zone de drop active */}
      {isOver && (
        <div className="mt-4 p-4 border-2 border-blue-300 border-dashed rounded-lg text-center">
          <Text type="secondary">
            Déposer le lead ici pour le déplacer vers "{column.name}"
          </Text>
        </div>
      )}
    </div>
  );
};

/**
 * Vue Kanban pour visualiser les leads par statut
 */
const LeadsKanban: React.FC<LeadsKanbanProps> = ({
  onViewLead,
  onCallLead,
  onEmailLead,
  onScheduleLead,
  refreshTrigger = 0,
  onLeadUpdated // 🔄 Nouveau prop
}) => {
  console.log('🏗️ [LeadsKanban] Composant monté');
  
  const { api } = useAuthenticatedApi();
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false); // Track internal updates
  const lastUpdateByKanban = useRef(false); // 🚩 Flag pour éviter le refresh après nos modifications

  // 📊 Récupération des leads
  const fetchLeads = useCallback(async () => {
    if (!currentOrganization && !isSuperAdmin) {
      console.log('[LeadsKanban] ⏳ En attente de la définition de l\'organisation...');
      return;
    }
    
    setLoading(true);
    try {
      console.log('[LeadsKanban] 📊 Récupération des leads pour Kanban...');
      
      const response = await api.get('/api/leads');
      let leadsData: Lead[] = [];
      
      if (Array.isArray(response)) {
        leadsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        leadsData = response.data;
      }
      
      console.log('[LeadsKanban] 📊 Leads reçus pour Kanban:', leadsData.length);
      
      // Transformer les données pour le Kanban avec normalisation des statuts
      const transformedLeads = leadsData.map(lead => ({
        ...lead,
        name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || `Lead ${lead.id.slice(0, 8)}`,
        email: lead.email || lead.data?.email || '',
        phone: lead.phone || lead.data?.phone || '',
        company: lead.company || lead.data?.company || '',
        notes: lead.data?.notes || '',
        website: lead.data?.website || '',
        linkedin: lead.data?.linkedin || '',
        lastContact: lead.data?.lastContactDate || lead.createdAt,
        status: normalizeStatus(lead.status), // Normaliser le statut
      }));
      
      setLeads(transformedLeads);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur lors du chargement des leads:', errorMessage);
      message.error('Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  }, [api, currentOrganization, isSuperAdmin]);

  // 🔄 Chargement initial
  useEffect(() => {
    console.log('[LeadsKanban] 🔄 useEffect déclenché:', { 
      isUpdatingLead, 
      refreshTrigger, 
      user: user?.email,
      hasCurrentOrg: !!currentOrganization,
      isSuperAdmin 
    });
    
    // Ne pas recharger si c'est le kanban qui vient de faire une modification
    if (isUpdatingLead) {
      console.log('[LeadsKanban] ⏭️ Skip refresh - modification interne en cours');
      return;
    }

    // Éviter le refresh si c'est notre propre modification qui a déclenché le refreshTrigger
    if (lastUpdateByKanban.current && refreshTrigger > 0) {
      console.log('[LeadsKanban] ⏭️ Skip refresh - notre propre modification, pas de rechargement');
      lastUpdateByKanban.current = false; // Reset le flag
      return;
    }
    
    if (user && (currentOrganization || isSuperAdmin)) {
      console.log('[LeadsKanban] 🚀 Chargement des leads pour Kanban...', { 
        user: user.email, 
        org: currentOrganization?.name || 'Vue globale',
        isSuperAdmin,
        refreshTrigger
      });
      fetchLeads();
    } else {
      console.log('[LeadsKanban] ❌ Conditions non remplies pour charger les leads:', {
        hasUser: !!user,
        hasOrg: !!currentOrganization,
        isSuperAdmin
      });
    }
  }, [user, currentOrganization, isSuperAdmin, fetchLeads, refreshTrigger, isUpdatingLead]);

  // 🎯 Gestion du drag & drop
  const handleDropLead = useCallback(async (leadId: string, newStatus: string) => {
    try {
      console.log('[LeadsKanban] 🎯 Déplacement lead:', leadId, 'vers statut:', newStatus);
      console.log('[LeadsKanban] 🔧 API instance:', !!api);
      console.log('[LeadsKanban] 🔧 User:', user?.email);
      console.log('[LeadsKanban] 🔧 Organization:', currentOrganization?.name);
      
      // Mise à jour optimiste
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      // Appel API pour mise à jour
      console.log('[LeadsKanban] 📡 Appel API PUT /api/leads/' + leadId);
      const response = await api.put(`/api/leads/${leadId}`, { status: newStatus });
      console.log('[LeadsKanban] ✅ Réponse API:', response);
      
      message.success('Lead déplacé avec succès !');
      
      // 🔄 NOUVEAU: Déclencher un refresh des autres vues (mais pas du kanban)
      if (onLeadUpdated) {
        console.log('[LeadsKanban] 🔄 Déclenchement refresh des autres vues...');
        console.log('[LeadsKanban] 🔧 État avant setIsUpdatingLead:', { isUpdatingLead, refreshTrigger });
        
        // 🚩 Marquer que c'est nous qui faisons la modification
        lastUpdateByKanban.current = true;
        
        setIsUpdatingLead(true); // Flag pour éviter le refresh du kanban
        console.log('[LeadsKanban] 🔧 setIsUpdatingLead(true) appelé');
        onLeadUpdated();
        console.log('[LeadsKanban] 🔧 onLeadUpdated() appelé');
        
        // Reset le flag après que les autres vues aient été mises à jour
        setTimeout(() => {
          console.log('[LeadsKanban] 🔧 Début du timeout - reset du flag...');
          setIsUpdatingLead(false);
          console.log('[LeadsKanban] 🔄 Flag isUpdatingLead reset - refresh possible à nouveau');
        }, 2000); // 2 secondes pour laisser le temps à toutes les vues de se mettre à jour
      }
      
    } catch (error) {
      console.error('[LeadsKanban] ❌ Erreur lors du déplacement du lead:', error);
      console.error('[LeadsKanban] ❌ Détails de l\'erreur:', {
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        status: error && typeof error === 'object' && 'response' in error ? 
          (error.response as { status?: number })?.status : undefined,
        data: error && typeof error === 'object' && 'response' in error ? 
          (error.response as { data?: unknown })?.data : undefined
      });
      message.error('Erreur lors du déplacement du lead');
      
      // Revert optimistic update
      fetchLeads();
    }
  }, [api, fetchLeads, user, currentOrganization]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📋 Groupement des leads par statut
  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    // Initialiser toutes les colonnes
    DEFAULT_PIPELINE.forEach(column => {
      grouped[column.id] = [];
    });
    
    // Grouper les leads avec normalisation des statuts
    leads.forEach(lead => {
      const normalizedStatus = normalizeStatus(lead.status);
      grouped[normalizedStatus].push(lead);
    });
    
    return grouped;
  }, [leads]);

  // 📊 Métriques globales avec IA et système de délais
  const metrics = useMemo(() => {
    const total = leads.length;
    
    const overdueLeads = leads.filter(lead => {
      const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
      return timeline.isOverdue || timeline.status === 'critical';
    });
    
    const criticalLeads = leads.filter(lead => {
      const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
      return timeline.status === 'critical';
    });
    
    const urgentLeads = leads.filter(lead => {
      const priority = getLeadPriority(lead.createdAt, lead.source, lead.lastContactDate);
      return priority === 'high' || priority === 'critical';
    });
    
    const won = leadsByStatus['won']?.length || 0;
    const conversionRate = total > 0 ? (won / total * 100).toFixed(1) : '0';
    
    // Score commercial global (basé sur les délais et statuts)
    const commercialScore = leads.reduce((score, lead) => {
      const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
      
      if (timeline.status === 'critical') return score - 10;
      if (timeline.isOverdue) return score - 5;
      if (timeline.status === 'urgent') return score - 1;
      if (lead.status === 'won') return score + 10;
      return score;
    }, 0);

    return { 
      total, 
      overdue: overdueLeads.length, 
      critical: criticalLeads.length,
      urgent: urgentLeads.length, 
      won, 
      conversionRate,
      commercialScore
    };
  }, [leads, leadsByStatus]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6">
        {/* 📊 Header avec métriques */}
        <Row justify="space-between" align="middle" className="mb-6">
          <Col>
            <Title level={2} className="mb-0">
              🏗️ Pipeline Commercial
            </Title>
          </Col>
          <Col>
            <Space size="large">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.total}</div>
                <div className="text-xs text-gray-500">Total leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.critical}</div>
                <div className="text-xs text-gray-500">Critiques</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{metrics.overdue}</div>
                <div className="text-xs text-gray-500">En retard</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.urgent}</div>
                <div className="text-xs text-gray-500">Urgents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.conversionRate}%</div>
                <div className="text-xs text-gray-500">Conversion</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${metrics.commercialScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.commercialScore > 0 ? '+' : ''}{metrics.commercialScore}
                </div>
                <div className="text-xs text-gray-500">Score IA</div>
              </div>
            </Space>
          </Col>
        </Row>

        {/* 🏗️ Colonnes Kanban */}
        <Row gutter={16}>
          {DEFAULT_PIPELINE.map(column => (
            <Col key={column.id} span={4}>
              <KanbanColumn
                column={column}
                leads={leadsByStatus[column.id] || []}
                onDropLead={handleDropLead}
                onViewLead={onViewLead}
                onCallLead={onCallLead}
                onEmailLead={onEmailLead}
                onScheduleLead={onScheduleLead}
              />
            </Col>
          ))}
        </Row>
      </div>
    </DndProvider>
  );
};

export default LeadsKanban;
