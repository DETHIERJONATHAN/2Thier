import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Tag, Button, Typography, Row, Col, Badge, Spin, message, Alert } from 'antd';
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
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { 
  calculateLeadTimeline, 
  getLeadPriority, 
  getTimelineColor
} from '../../utils/leadTimeline';
import type { Lead } from '../../types/leads';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';

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


// 🗑️ Fonction normalizeStatus supprimée - nous utilisons maintenant directement les UUID statusId de Prisma

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

  console.log(`🎯 [LeadCard] Création carte drag & drop pour lead ${lead.id}`, {
    leadId: lead.id,
    leadName: lead.firstName + ' ' + lead.lastName,
    currentStatus: lead.status,
    canDrag: true
  });

  const [{ isDragging, canDrag }, drag, dragPreview] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      console.log(`🟢 [LeadCard] ITEM function ${lead.id}:`, {
        leadId: lead.id,
        fromColumn: lead.status,
        leadName: lead.firstName + ' ' + lead.lastName
      });
      return { id: lead.id, type: ITEM_TYPE, fromColumn: lead.status };
    },
    canDrag: () => {
      const canDragResult = true; // Toujours permettre le drag pour les tests
      console.log(`🎯 [LeadCard] Can drag ${lead.id}:`, canDragResult);
      return canDragResult;
    },
    collect: (monitor) => {
      const isDragging = monitor.isDragging();
      const canDrag = monitor.canDrag();
      const item = monitor.getItem();
      
      console.log(`🚀 [LeadCard] Drag collect ${lead.id}:`, {
        isDragging,
        canDrag,
        didDrop: monitor.didDrop(),
        item,
        monitor: monitor.getItemType()
      });
      
      return {
        isDragging,
        canDrag,
      };
    },
    end: (item, monitor) => {
      console.log(`🔴 [LeadCard] END drag ${lead.id}:`, {
        didDrop: monitor.didDrop(),
        dropResult: monitor.getDropResult(),
        item: monitor.getItem()
      });
    }
  });

  console.log(`🔍 [LeadCard] État drag ${lead.id}:`, {
    isDragging,
    hasRef: !!drag,
    leadStatus: lead.status
  });

  const displayName = lead.firstName && lead.lastName 
    ? `${lead.firstName} ${lead.lastName}` 
    : lead.data?.name || `Lead ${lead.id.slice(0, 8)}`;

  // Utiliser le dragPreview pour une image personnalisée
  React.useEffect(() => {
    const previewElement = document.createElement('div');
    previewElement.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1890ff, #40a9ff);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        transform: rotate(3deg);
      ">
        🚀 ${displayName}
      </div>
    `;
    previewElement.style.position = 'absolute';
    previewElement.style.top = '-1000px';
    previewElement.style.left = '-1000px';
    document.body.appendChild(previewElement);
    
    dragPreview(previewElement);
    
    return () => {
      if (document.body.contains(previewElement)) {
        document.body.removeChild(previewElement);
      }
    };
  }, [dragPreview, displayName]);

  return (
    <div 
      ref={drag} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
        transform: isDragging ? 'rotate(5deg)' : 'none',
        transition: 'all 0.2s ease'
      }}
      draggable={true}
      className="select-none"
      onDragStart={(e) => {
        console.log(`🚀 [LeadCard] HTML5 dragStart ${lead.id}`, e);
        e.dataTransfer.effectAllowed = 'move';
        
        // Créer une image de drag personnalisée
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.opacity = '0.8';
        dragImage.style.width = e.currentTarget.offsetWidth + 'px';
        dragImage.style.backgroundColor = '#f0f8ff';
        dragImage.style.border = '2px dashed #1890ff';
        dragImage.style.borderRadius = '8px';
        
        // Ajouter temporairement au DOM
        document.body.appendChild(dragImage);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        
        // Utiliser comme image de drag
        e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        
        // Nettoyer après un délai
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 100);
      }}
      onDrag={(e) => {
        console.log(`🔄 [LeadCard] HTML5 drag ${lead.id}`, e.clientX, e.clientY);
      }}
      onDragEnd={(e) => {
        console.log(`🔴 [LeadCard] HTML5 dragEnd ${lead.id}`, e);
      }}
    >
      <Card
        size="small"
        className={`
          transition-all duration-300 ease-in-out
          ${isDragging ? 'shadow-2xl border-dashed rotate-2 scale-105' : 'hover:shadow-lg hover:-translate-y-1'}
          cursor-grab active:cursor-grabbing
        `}
        style={{ 
          borderLeft: `4px solid ${getBorderColor()}`,
          borderRadius: '12px',
          backgroundColor: isDragging ? '#e6f7ff' : (timeline.isOverdue ? '#fef7f7' : 'white'),
          cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
          pointerEvents: isDragging ? 'none' : 'auto',
          border: isDragging ? '2px dashed #1890ff' : '1px solid #e5e5e5',
          transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
          boxShadow: isDragging 
            ? '0 8px 25px rgba(24, 144, 255, 0.3)' 
            : timeline.isOverdue 
              ? '0 2px 8px rgba(255, 77, 79, 0.1)'
              : '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        styles={{ body: { padding: '16px' } }}
      >
        {/* Header avec nom et priorité */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Text strong className="text-sm text-gray-800 truncate">
                {displayName}
              </Text>
              {getPriorityIcon()}
            </div>
            
            {/* Société en sous-titre */}
            {(lead.company || lead.data?.company) && (
              <Text type="secondary" className="text-xs mt-1 block truncate">
                🏢 {lead.company || lead.data?.company}
              </Text>
            )}
          </div>
          
          <Badge 
            count={timeline.isOverdue ? 'Retard' : `${timeline.remainingHours}h`}
            style={{ 
              backgroundColor: getBorderColor(),
              fontSize: '10px',
              fontWeight: 'bold',
              minWidth: '45px',
              height: '20px',
              lineHeight: '20px'
            }}
            className="ml-2 flex-shrink-0"
          />
        </div>

        {/* Informations détaillées */}
        <div className="space-y-2 mb-3">
          {/* Source et timeline */}
          <div className="flex items-center justify-between">
            <Tag 
              color={timeline.status === 'critical' ? 'purple' : timeline.status === 'urgent' ? 'red' : timeline.status === 'important' ? 'orange' : 'green'} 
              className="text-xs font-medium"
            >
              {lead.source || 'direct'}
            </Tag>
            <Text className="text-xs text-gray-500 truncate max-w-[120px]">
              {timeline.description}
            </Text>
          </div>
          
          {/* Commercial assigné */}
          {lead.assignedTo && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <UserOutlined className="text-gray-400" />
              <span className="truncate">
                {lead.assignedTo.firstName} {lead.assignedTo.lastName}
              </span>
            </div>
          )}

          {/* Contact info */}
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            {lead.email && (
              <div className="flex items-center space-x-1">
                <MailOutlined className="text-gray-400" />
                <span className="truncate max-w-[100px]">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center space-x-1">
                <PhoneOutlined className="text-gray-400" />
                <span>{lead.phone}</span>
              </div>
            )}
          </div>

          {/* Recommandation IA */}
          {priority !== 'low' && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 text-xs">
              <Text className="text-xs" style={{ 
                color: priority === 'critical' ? '#722ed1' : '#666',
                fontStyle: 'italic'
              }}>
                🤖 Priorité {priority} - Action recommandée
              </Text>
            </div>
          )}
        </div>

        {/* Actions améliorées */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="flex space-x-2">
            {priority === 'critical' ? (
              <Button 
                size="small" 
                type="primary" 
                danger
                icon={<PhoneOutlined />} 
                onClick={(e) => { e.stopPropagation(); onCall(); }}
                title="URGENT - Appeler"
                className="text-xs font-medium"
              />
            ) : (
              <>
                <Button 
                  size="small" 
                  type="text" 
                  icon={<PhoneOutlined />} 
                  onClick={(e) => { e.stopPropagation(); onCall(); }}
                  title="Appeler"
                  className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                />
                <Button 
                  size="small" 
                  type="text" 
                  icon={<MailOutlined />} 
                  onClick={(e) => { e.stopPropagation(); onEmail(); }}
                  title="Email"
                  className="hover:bg-green-50 hover:text-green-600 transition-colors"
                />
                <Button 
                  size="small" 
                  type="text" 
                  icon={<CalendarOutlined />} 
                  onClick={(e) => { e.stopPropagation(); onSchedule(); }}
                  title="RDV"
                  className="hover:bg-purple-50 hover:text-purple-600 transition-colors"
                />
              </>
            )}
          </div>
          
          <Button 
            size="small" 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={(e) => { e.stopPropagation(); onView(); }}
            title="Voir détails"
            className="hover:bg-gray-50 hover:text-gray-700 transition-colors"
          />
        </div>
      </Card>
    </div>
  );
};

// 📋 Composant Colonne
interface KanbanColumnProps {
  column: {
    id: string;
    name: string;
    color: string;
    description?: string;
  };
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
  console.log(`🏗️ [KanbanColumn] Initialisation colonne ${column.id}`, {
    columnId: column.id,
    columnName: column.name,
    leadsCount: leads.length,
    leadsIds: leads.map(l => l.id)
  });

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: DragItem) => {
      console.log(`🎯 [KanbanColumn] DROP dans colonne ${column.id}:`, {
        leadId: item.id,
        fromColumn: item.fromColumn,
        toColumn: column.id,
        willUpdate: item.fromColumn !== column.id
      });
      
      if (item.fromColumn !== column.id) {
        console.log(`✅ [KanbanColumn] Déclenchement onDropLead`, {
          leadId: item.id,
          newStatus: column.id
        });
        onDropLead(item.id, column.id);
      } else {
        console.log(`⏭️ [KanbanColumn] Pas de changement - même colonne`);
      }
    },
    collect: (monitor) => {
      const isOver = monitor.isOver();
      const canDrop = monitor.canDrop();
      const item = monitor.getItem();
      
      if (item) {
        console.log(`👀 [KanbanColumn] Monitor colonne ${column.id}:`, {
          isOver,
          canDrop,
          draggedItemId: item.id,
          draggedFromColumn: item.fromColumn
        });
      }
      
      return {
        isOver,
      };
    },
  });

  console.log(`🔍 [KanbanColumn] État drop ${column.id}:`, {
    isOver,
    hasRef: !!drop,
    leadsInColumn: leads.length
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
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm
        min-h-[70vh] transition-all duration-300 ease-in-out
        ${isOver ? 'bg-blue-50 border-2 border-blue-400 border-dashed shadow-lg transform scale-[1.02]' : 'hover:shadow-md'}
        flex flex-col
      `}
      style={{ minHeight: '600px' }}
    >
      {/* Header de la colonne amélioré */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <Title 
              level={5} 
              className="mb-0 text-sm sm:text-base font-semibold" 
              style={{ color: column.color }}
            >
              {column.name}
            </Title>
          </div>
          
          <Badge 
            count={leads.length} 
            style={{ 
              backgroundColor: column.color,
              fontSize: '11px',
              minWidth: '20px',
              height: '20px',
              lineHeight: '20px'
            }}
            className="font-medium"
          />
        </div>

        {/* Indicateurs d'urgence compacts */}
        {(columnMetrics.overdueCount > 0 || columnMetrics.urgentCount > 0 || columnMetrics.criticalCount > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {columnMetrics.criticalCount > 0 && (
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                title={`${columnMetrics.criticalCount} leads critiques`}
              >
                <ExclamationCircleOutlined className="mr-1" />
                {columnMetrics.criticalCount} critique{columnMetrics.criticalCount > 1 ? 's' : ''}
              </span>
            )}
            {columnMetrics.overdueCount > 0 && (
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                title={`${columnMetrics.overdueCount} leads en retard`}
              >
                <ExclamationCircleOutlined className="mr-1" />
                {columnMetrics.overdueCount} retard{columnMetrics.overdueCount > 1 ? 's' : ''}
              </span>
            )}
            {columnMetrics.urgentCount > 0 && (
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                title={`${columnMetrics.urgentCount} leads urgents`}
              >
                <FireOutlined className="mr-1" />
                {columnMetrics.urgentCount} urgent{columnMetrics.urgentCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contenu de la colonne - scrollable */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-3">
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
          
          {/* Message si aucun lead */}
          {leads.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <Text type="secondary" className="text-sm">
                Aucun lead dans "{column.name}"
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Zone de drop active améliorée */}
      {isOver && (
        <div className="mx-3 mb-3 p-4 border-2 border-blue-400 border-dashed rounded-lg text-center bg-blue-50 animate-pulse">
          <div className="text-blue-600 font-medium text-sm">
            💫 Déposer le lead ici
          </div>
          <Text type="secondary" className="text-xs">
            pour le déplacer vers "{column.name}"
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
  const { leadStatuses, isLoading: statusesLoading } = useLeadStatuses();
  
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
        statusId: lead.statusId, // Utiliser directement statusId UUID de Prisma
      }));
      
      setLeads(transformedLeads);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors du chargement des leads');
      console.error('[LeadsKanban] ❌ Erreur lors du chargement des leads:', errorMessage, error);
      message.error(errorMessage);
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
  const handleDropLead = useCallback(async (leadId: string, newStatusId: string) => {
    console.log(`🚀 [handleDropLead] DÉBUT - Tentative de déplacement:`, {
      leadId,
      newStatusId,
      timestamp: new Date().toISOString(),
      hasApi: !!api,
      userEmail: user?.email,
      orgName: currentOrganization?.name,
      isSuperAdmin
    });

    try {
      console.log('[LeadsKanban] 🎯 Déplacement lead:', leadId, 'vers statusId:', newStatusId);
      console.log('[LeadsKanban] 🔧 API instance:', !!api);
      console.log('[LeadsKanban] 🔧 User:', user?.email);
      console.log('[LeadsKanban] 🔧 Organization:', currentOrganization?.name);
      
      // Mise à jour optimiste
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, statusId: newStatusId } : lead
        )
      );

      // Appel API pour mise à jour
      console.log('[LeadsKanban] 📡 Appel API PUT /api/leads/' + leadId);
      const response = await api.put(`/api/leads/${leadId}`, { statusId: newStatusId });
      console.log('[LeadsKanban] ✅ Réponse API:', response);
      
      message.success('Lead déplacé avec succès !');
      
      // 🔄 NOUVEAU: Déclencher un refresh des autres vues (mais pas du kanban)
      if (onLeadUpdated) {
        console.log('[LeadsKanban] 🔄 Déclenchement refresh des autres vues...');
        
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
      
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors du déplacement du lead');
      const { status, data } = getErrorResponseDetails(error);
      console.error('[LeadsKanban] ❌ Erreur lors du déplacement du lead:', errorMessage, {
        status,
        data,
        leadId,
        newStatusId,
      });
      message.error(errorMessage);
      
      // Revert optimistic update
      fetchLeads();
    }
  }, [api, fetchLeads, user, currentOrganization, isSuperAdmin, onLeadUpdated]);

  // 📋 Groupement des leads par statut dynamique
  const leadsByStatus = useMemo(() => {
    console.log(`📋 [leadsByStatus] Début regroupement des leads:`, {
      totalLeads: leads.length,
      leadsData: leads.map(l => ({ id: l.id, name: l.firstName + ' ' + l.lastName, statusId: l.statusId }))
    });

    const grouped: Record<string, Lead[]> = {};
    
    // Initialiser toutes les colonnes avec les statuts dynamiques
    leadStatuses.forEach(status => {
      grouped[status.id] = [];
      console.log(`📋 [leadsByStatus] Colonne initialisée: ${status.id} (${status.name})`);
    });
    
    // Grouper les leads directement par statusId (pas de normalisation, utilisation directe des IDs Prisma)
    leads.forEach(lead => {
      const statusId = lead.statusId;
      console.log(`📋 [leadsByStatus] Lead ${lead.id}:`, {
        leadName: lead.firstName + ' ' + lead.lastName,
        statusId,
        willAddToColumn: statusId
      });
      
      // Ajouter le lead dans la colonne correspondante (ou dans une colonne par défaut)
      if (statusId && grouped[statusId]) {
        grouped[statusId].push(lead);
      } else {
        // Fallback: mettre dans le premier statut disponible ou créer une colonne "Autre"
        const firstStatus = leadStatuses[0];
        if (firstStatus) {
          console.log(`📋 [leadsByStatus] ⚠️ Lead sans statut valide, ajouté à: ${firstStatus.id}`);
          grouped[firstStatus.id].push(lead);
        }
      }
    });
    
    console.log(`📋 [leadsByStatus] Résultat final du regroupement:`, {
      columnsCount: Object.keys(grouped).length,
      distribution: Object.keys(grouped).map(key => ({
        column: key,
        count: grouped[key].length,
        leadIds: grouped[key].map(l => l.id)
      }))
    });
    
    return grouped;
  }, [leads, leadStatuses]);

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

  console.log(`🎨 [LeadsKanban] RENDU PRINCIPAL:`, {
    loading,
    statusesLoading,
    leadsCount: leads.length,
    leadsByStatusKeys: Object.keys(leadsByStatus),
    hasAPI: !!api,
    hasUser: !!user,
    hasOrg: !!currentOrganization,
    dndBackend: 'HTML5Backend',
    statusesCount: leadStatuses.length
  });

  if (loading || statusesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (leadStatuses.length === 0) {
    return (
      <Alert
        message="Aucun statut de lead configuré"
        description="Veuillez configurer les statuts de leads dans les paramètres."
        type="warning"
        showIcon
      />
    );
  }

  // 📏 Calcul des spans responsifs pour utiliser tout l'espace
  const getResponsiveSpan = () => {
    const statusCount = leadStatuses.length;
    if (statusCount <= 3) return 8; // 3 colonnes max par ligne
    if (statusCount <= 4) return 6; // 4 colonnes
    if (statusCount <= 6) return 4; // 6 colonnes
    return 3; // 8 colonnes max
  };

  const responsiveSpan = getResponsiveSpan();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full max-w-full">
        {/* 📊 Header avec métriques - Responsive */}
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <Title level={2} className="mb-0 text-xl sm:text-2xl lg:text-3xl">
                🏗️ Pipeline Commercial
              </Title>
            </div>
            
            {/* Métriques responsives */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 w-full lg:w-auto">
              <div className="text-center bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{metrics.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{metrics.critical}</div>
                <div className="text-xs text-gray-500">Critiques</div>
              </div>
              <div className="text-center bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{metrics.overdue}</div>
                <div className="text-xs text-gray-500">Retard</div>
              </div>
              <div className="text-center bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">{metrics.urgent}</div>
                <div className="text-xs text-gray-500">Urgents</div>
              </div>
              <div className="text-center bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{metrics.conversionRate}%</div>
                <div className="text-xs text-gray-500">Conversion</div>
              </div>
              <div className="text-center bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${metrics.commercialScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.commercialScore > 0 ? '+' : ''}{metrics.commercialScore}
                </div>
                <div className="text-xs text-gray-500">Score IA</div>
              </div>
            </div>
          </div>

          {/* 🏗️ Colonnes Kanban Responsives - Utilisation de toute la largeur */}
          <div className="w-full overflow-x-auto">
            <Row 
              gutter={[12, 16]} 
              className="min-w-full"
              style={{ margin: 0 }}
            >
              {leadStatuses.map(status => {
                const columnLeads = leadsByStatus[status.id] || [];
                console.log(`🏗️ [Rendu] Colonne ${status.id}:`, {
                  columnName: status.name,
                  leadsCount: columnLeads.length,
                  leadIds: columnLeads.map(l => l.id),
                  hasHandleDropLead: !!handleDropLead,
                  responsiveSpan
                });
                
                // Transformer le statut Prisma en format compatible avec KanbanColumn
                const columnData = {
                  id: status.id,
                  name: status.name,
                  color: status.color,
                  description: `Statut: ${status.name}`
                };
                
                return (
                  <Col 
                    key={status.id} 
                    xs={24} // Mobile: 1 colonne
                    sm={12} // Tablette: 2 colonnes
                    md={responsiveSpan} // Desktop: colonnes adaptives
                    lg={responsiveSpan}
                    xl={responsiveSpan}
                    className="flex-1"
                    style={{ minWidth: '280px' }} // Largeur minimale pour lisibilité
                  >
                    <KanbanColumn
                      column={columnData}
                      leads={columnLeads}
                      onDropLead={handleDropLead}
                      onViewLead={onViewLead}
                      onCallLead={onCallLead}
                      onEmailLead={onEmailLead}
                      onScheduleLead={onScheduleLead}
                    />
                  </Col>
                );
              })}
            </Row>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default LeadsKanban;
