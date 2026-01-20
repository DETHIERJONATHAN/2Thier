import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, Spin, message, Alert, Avatar, Tooltip, Grid, Modal, Select, App } from 'antd';
import * as XLSX from 'xlsx';
import { 
  ClockCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  GlobalOutlined,
  UserOutlined,
  LinkOutlined,
  FilterOutlined,
  RobotOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import CreateLeadModal from '../../components/leads/CreateLeadModal';
import { 
  calculateLeadTimeline, 
  getLeadPriority, 
  getTimelineColor
} from '../../utils/leadTimeline';

// 🎯 Configuration MultiBackend pour Desktop (HTML5) + Mobile (Touch)
const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: {
        enableMouseEvents: false, // Désactivé car HTML5Backend gère la souris
        delayTouchStart: 150, // Délai court pour mobile
      },
      preview: true,
      transition: TouchTransition,
    },
  ],
};
import type { Lead } from '../../types/leads';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';


// Types pour le drag & drop
const ITEM_TYPE = 'LEAD_CARD';

const hexToRgba = (hex: string, alpha: number) => {
  const normalizedHex = hex.replace('#', '');
  if (normalizedHex.length !== 6) return `rgba(24, 144, 255, ${alpha})`;
  const r = parseInt(normalizedHex.slice(0, 2), 16);
  const g = parseInt(normalizedHex.slice(2, 4), 16);
  const b = parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getColumnHeaderBackground = (color: string) => (
  `linear-gradient(135deg, ${hexToRgba(color, 0.16)}, ${hexToRgba(color, 0.04)})`
);

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
  onEditLead?: (leadId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  refreshTrigger?: number;
  onLeadUpdated?: () => void;
}


// 🗑️ Fonction normalizeStatus supprimée - nous utilisons maintenant directement les UUID statusId de Prisma

// 🃏 Composant Carte Lead
interface LeadCardProps {
  lead: Lead;
  onView: () => void;
  onCall: () => void;
  onEmail: () => void;
  onSchedule: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// 🎯 Custom Drag Layer pour afficher la carte pendant le drag sur mobile
const CustomDragLayer: React.FC = () => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        left: currentOffset.x,
        top: currentOffset.y,
        transform: 'rotate(5deg)',
        opacity: 0.9,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(9,30,66,.35)',
          padding: '12px 16px',
          minWidth: '180px',
          border: '2px solid #0079BF',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#172B4D' }}>
          🚚 En déplacement...
        </span>
      </div>
    </div>
  );
};

// 🎯 Auto-scroll basé sur la position du drag layer (doit être dans le DndProvider)
const AutoScrollDragTracker: React.FC<{ boardRef: React.RefObject<HTMLDivElement> }> = ({ boardRef }) => {
  const dragXRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);
  const { isDragging, clientOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));

  useEffect(() => {
    dragActiveRef.current = isDragging;
    dragXRef.current = clientOffset?.x ?? null;
  }, [isDragging, clientOffset]);

  useEffect(() => {
    if (!boardRef.current) return;

    const boardEl = boardRef.current;
    let rafId: number | null = null;
    let lastScrollTime = 0;

    const tick = () => {
      if (!dragActiveRef.current || dragXRef.current === null) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      if (now - lastScrollTime < 16) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastScrollTime = now;

      const rect = boardEl.getBoundingClientRect();
      const x = dragXRef.current;
      const distFromLeft = x - rect.left;
      const distFromRight = rect.right - x;
      const edgeSize = 160;
      const maxSpeed = 40;

      if (distFromLeft >= 0 && distFromLeft < edgeSize) {
        const ratio = 1 - (distFromLeft / edgeSize);
        const speed = Math.pow(ratio, 1.6) * maxSpeed;
        boardEl.scrollLeft = Math.max(0, boardEl.scrollLeft - speed);
        console.log(`⬅️ SCROLL LEFT x=${x.toFixed(0)} speed=${speed.toFixed(1)}`);
      } else if (distFromRight >= 0 && distFromRight < edgeSize) {
        const ratio = 1 - (distFromRight / edgeSize);
        const speed = Math.pow(ratio, 1.6) * maxSpeed;
        const maxScrollLeft = boardEl.scrollWidth - boardEl.clientWidth;
        boardEl.scrollLeft = Math.min(maxScrollLeft, boardEl.scrollLeft + speed);
        console.log(`➡️ SCROLL RIGHT x=${x.toFixed(0)} speed=${speed.toFixed(1)}`);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [boardRef]);

  return null;
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, onView, onCall, onEmail, onSchedule, onEdit, onDelete, onDragStart, onDragEnd }) => {
  const timeline = calculateLeadTimeline(lead.createdAt, lead.source);
  const priority = getLeadPriority(lead.createdAt, lead.source, lead.lastContactDate);
  const timelineColor = getTimelineColor(timeline.status);
  
  // 🎯 Refs pour distinguer tap vs drag sur mobile
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Couleurs labels Trello
  const getLabelColor = () => {
    switch (priority) {
      case 'critical': return '#EB5A46'; // Rouge
      case 'high': return '#FF9F1A'; // Orange  
      case 'medium': return '#F2D600'; // Jaune
      default: return '#61BD4F'; // Vert
    }
  };

  const getSecondaryLabelColor = () => {
    const source = lead.source?.toLowerCase() || '';
    if (source.includes('site') || source.includes('web')) return '#0079BF'; // Bleu
    if (source.includes('partner')) return '#C377E0'; // Violet
    return '#00C2E0'; // Cyan
  };

  const displayName = lead.firstName && lead.lastName 
    ? `${lead.firstName} ${lead.lastName}` 
    : lead.data?.name || `Lead ${lead.id.slice(0, 8)}`;

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      onDragStart?.();
      console.log('🎯 [DRAG ITEM] Début du drag pour lead:', lead.id);
      return { id: lead.id, type: ITEM_TYPE, fromColumn: lead.status };
    },
    end: () => {
      onDragEnd?.();
      console.log('🛑 [DRAG END] Fin du drag pour lead:', lead.id);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Date formatée style Trello
  const formatDate = (date: string) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const createdDate = formatDate(lead.createdAt);

  // 🎯 Handlers pour distinguer tap vs drag
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    hasMoved.current = false;
    console.log('👆 [TOUCH START] Position:', touchStartPos.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      hasMoved.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const duration = Date.now() - touchStartTime.current;
    console.log('👆 [TOUCH END] Duration:', duration, 'hasMoved:', hasMoved.current);
    // C'est un TAP si < 300ms et pas de mouvement significatif (augmenté à 300ms pour plus de fiabilité)
    if (duration < 300 && !hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ [TAP DETECTED] Ouverture du lead');
      setTimeout(() => onView(), 0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Pour desktop - on vérifie qu'on n'est pas en train de dragger
    if (!isDragging) {
      console.log('🖱️ [CLICK DETECTED] Ouverture du lead');
      onView();
    }
  };

  return (
    <div 
      ref={drag} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: isDragging ? 'rotate(3deg)' : 'none',
        touchAction: 'none', // 🔴 CRITIQUE: Désactive le scroll natif pour permettre le drag
        userSelect: 'none', // 🔴 Empêche la sélection de texte
        WebkitUserSelect: 'none', // 🔴 Pour Safari/iOS
        WebkitTouchCallout: 'none', // 🔴 Empêche le menu contextuel iOS
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 1px 0 rgba(9,30,66,.25)',
          padding: '8px',
          cursor: 'pointer',
          transition: 'background-color 0.1s ease',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          userSelect: 'none', // 🔴 Double protection
          WebkitUserSelect: 'none',
        }}
        className="hover:bg-[#F4F5F7]"
      >
        {/* Labels colorés Trello */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span 
            style={{
              display: 'inline-block',
              width: '40px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: getLabelColor(),
            }}
          />
          <span 
            style={{
              display: 'inline-block',
              width: '40px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: getSecondaryLabelColor(),
            }}
          />
        </div>

        {/* Titre */}
        <div style={{ 
          fontSize: '14px', 
          color: '#172B4D', 
          marginBottom: '8px',
          lineHeight: '1.4',
          fontWeight: 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}>
          {displayName}
        </div>

        {/* Footer avec date, source et actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '4px',
        }}>
          {/* Badges (date + source) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Badge date */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                backgroundColor: timeline.isOverdue ? '#EB5A46' : '#F4F5F7',
                color: timeline.isOverdue ? '#FFFFFF' : '#5E6C84',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
              }}
            >
              <ClockCircleOutlined style={{ fontSize: '11px' }} />
              <span>{createdDate}</span>
            </div>

            {/* Badge source avec tooltip */}
            <Tooltip title={`Source: ${lead.source || 'Direct'}`}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '3px',
                  backgroundColor: getSecondaryLabelColor(),
                  color: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'help',
                }}
              >
                {lead.source?.toLowerCase().includes('web') || lead.source?.toLowerCase().includes('site') ? (
                  <GlobalOutlined style={{ fontSize: '10px' }} />
                ) : lead.source?.toLowerCase().includes('partner') ? (
                  <LinkOutlined style={{ fontSize: '10px' }} />
                ) : (
                  <UserOutlined style={{ fontSize: '10px' }} />
                )}
                <span style={{ maxWidth: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.source || 'Direct'}
                </span>
              </div>
            </Tooltip>
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Avatar 
              size={24} 
              style={{ 
                backgroundColor: priority === 'critical' ? '#EB5A46' : 
                                priority === 'high' ? '#FF9F1A' : 
                                priority === 'medium' ? '#61BD4F' : '#0079BF',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          </div>
        </div>
      </div>
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
  onEditLead?: (leadId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  isMobile?: boolean;
  onCardDragStart?: () => void;
  onCardDragEnd?: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  leads,
  onDropLead,
  onViewLead,
  onCallLead,
  onEmailLead,
  onScheduleLead,
  onEditLead,
  onDeleteLead,
  isMobile = false,
  onCardDragStart,
  onCardDragEnd
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: DragItem) => {
      if (item.fromColumn !== column.id) {
        onDropLead(item.id, column.id);
      }
    },
    collect: (monitor) => {
      return {
        isOver: monitor.isOver(),
      };
    },
  });

  return (
    <div 
      ref={drop}
      style={{
        backgroundColor: '#EBECF0',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 100px)',
        transition: 'background-color 0.2s ease',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        border: isMobile ? '2px solid #DFE1E6' : 'none',
        ...(isOver && { backgroundColor: '#E1E4E9' }),
      }}
    >
      {/* Header de la colonne */}
      <div style={{ padding: '10px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#172B4D',
          }}>
            {column.name}
          </span>
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            style={{ color: '#6B778C' }}
          />
        </div>
      </div>

      {/* Contenu scrollable */}
      <div 
        style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px 8px',
          minHeight: '50px',
        }}
      >
        {/* Cartes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onView={() => onViewLead(lead.id)}
              onCall={() => onCallLead(lead.id)}
              onEmail={() => onEmailLead(lead.id)}
              onSchedule={() => onScheduleLead(lead.id)}
              onEdit={() => onEditLead?.(lead.id)}
              onDelete={() => onDeleteLead?.(lead.id)}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
            />
          ))}
        </div>
        
        {/* Message si aucun lead */}
        {leads.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px 8px',
            color: '#5E6C84',
            fontSize: '13px',
          }}>
            —
          </div>
        )}
      </div>

      {/* Footer - Ajouter une carte */}
      <div style={{ padding: '8px' }}>
        <Button
          type="text"
          icon={<PlusOutlined />}
          style={{
            width: '100%',
            textAlign: 'left',
            color: '#5E6C84',
            fontSize: '14px',
            height: '32px',
            borderRadius: '8px',
          }}
          className="hover:bg-[#DFE1E6]"
        >
          Add a card
        </Button>
      </div>

      {/* Zone de drop visuelle */}
      {isOver && (
        <div style={{
          margin: '0 8px 8px',
          padding: '16px',
          border: '2px dashed #0079BF',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 121, 191, 0.1)',
          textAlign: 'center',
        }}>
          <span style={{ color: '#0079BF', fontSize: '13px', fontWeight: 500 }}>
            Drop here
          </span>
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
  onEditLead,
  onDeleteLead,
  refreshTrigger = 0,
  onLeadUpdated
}) => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg && screens.md;
  const columnWidth = isMobile ? '48vw' : isTablet ? '300px' : '272px';
  const headerPadding = isMobile ? '10px 12px' : '12px 16px';
  const boardPadding = isMobile ? '8px' : '12px 8px';
  const boardHeight = isMobile ? 'calc(100vh - 56px)' : 'calc(100vh - 60px)';
  const { api } = useAuthenticatedApi();
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  const { leadStatuses, isLoading: statusesLoading } = useLeadStatuses();
  const { notification } = App.useApp(); // 🎯 Hook pour notifications React 19
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false); // Track internal updates
  const lastUpdateByKanban = useRef(false); // 🚩 Flag pour éviter le refresh après nos modifications
  const boardRef = useRef<HTMLDivElement>(null); // Ref pour auto-scroll
  const isDraggingRef = useRef(false);
  const [isBoardDragging, setIsBoardDragging] = useState(false);
  const dragLastXRef = useRef<number | null>(null);

  // États pour les filtres
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterSource, setFilterSource] = useState<string | undefined>(undefined);
  const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined);
  const [filterAssignee, setFilterAssignee] = useState<string | undefined>(undefined);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  const [activeAlertsCount, setActiveAlertsCount] = useState(0); // Badge dynamique IA
  // � Système de gestion des notifications IA (snooze)
  const NOTIFICATION_STORAGE_KEY = 'ai_notifications_snoozed';
  const SNOOZE_DURATIONS = {
    critical: 2 * 60 * 60 * 1000, // 2 heures pour les critiques
    urgent: 4 * 60 * 60 * 1000,   // 4 heures pour les urgents
    overdue: 6 * 60 * 60 * 1000,  // 6 heures pour les retards
    default: 24 * 60 * 60 * 1000, // 24 heures pour les autres
  };

  // Vérifier si une notification est en snooze
  const isNotificationSnoozed = useCallback((type: string): boolean => {
    try {
      const snoozed = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (!snoozed) return false;
      
      const snoozedData = JSON.parse(snoozed);
      const notif = snoozedData[type];
      
      if (!notif) return false;
      
      // Vérifier si le snooze est encore actif
      const now = Date.now();
      return now < notif.until;
    } catch {
      return false;
    }
  }, []);

  // Mettre en snooze une notification
  const snoozeNotification = useCallback((type: string, duration: number) => {
    try {
      const snoozed = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const snoozedData = snoozed ? JSON.parse(snoozed) : {};
      
      snoozedData[type] = {
        snoozedAt: Date.now(),
        until: Date.now() + duration,
      };
      
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(snoozedData));
    } catch (error) {
      console.error('Erreur snooze notification:', error);
    }
  }, []);

  // �📊 Récupération des leads
  const fetchLeads = useCallback(async () => {
    if (!currentOrganization && !isSuperAdmin) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get('/api/leads');
      let leadsData: Lead[] = [];
      
      if (Array.isArray(response)) {
        leadsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        leadsData = response.data;
      }
      
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
    // Ne pas recharger si c'est le kanban qui vient de faire une modification
    if (isUpdatingLead) {
      return;
    }

    // Éviter le refresh si c'est notre propre modification qui a déclenché le refreshTrigger
    if (lastUpdateByKanban.current && refreshTrigger > 0) {
      lastUpdateByKanban.current = false; // Reset le flag
      return;
    }
    
    if (user && (currentOrganization || isSuperAdmin)) {
      fetchLeads();
    }
  }, [user, currentOrganization, isSuperAdmin, fetchLeads, refreshTrigger, isUpdatingLead]);

  // 🎯 Gestion du drag & drop
  const handleDropLead = useCallback(async (leadId: string, newStatusId: string) => {
    try {
      // Mise à jour optimiste
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, statusId: newStatusId } : lead
        )
      );

      // Appel API pour mise à jour
      await api.put(`/api/leads/${leadId}`, { statusId: newStatusId });
      
      message.success('Lead déplacé avec succès !');
      
      // 🔄 NOUVEAU: Déclencher un refresh des autres vues (mais pas du kanban)
      if (onLeadUpdated) {
        // 🚩 Marquer que c'est nous qui faisons la modification
        lastUpdateByKanban.current = true;
        
        setIsUpdatingLead(true); // Flag pour éviter le refresh du kanban
        onLeadUpdated();
        
        // Reset le flag après que les autres vues aient été mises à jour
        setTimeout(() => {
          setIsUpdatingLead(false);
        }, 600);
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

  // 📋 Filtrage des leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Filtre par source
      if (filterSource && lead.source !== filterSource) return false;
      
      // Filtre par priorité
      if (filterPriority) {
        const priority = getLeadPriority(lead.createdAt, lead.source, lead.lastContactDate);
        if (priority !== filterPriority) return false;
      }
      
      // Filtre par commercial assigné
      if (filterAssignee) {
        if (!lead.assignedToId || lead.assignedToId !== filterAssignee) return false;
      }
      
      return true;
    });
  }, [leads, filterSource, filterPriority, filterAssignee]);

  // 📋 Groupement des leads par statut dynamique
  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    // Initialiser toutes les colonnes avec les statuts dynamiques
    leadStatuses.forEach(status => {
      grouped[status.id] = [];
    });
    
    // Grouper les leads FILTRÉS directement par statusId
    filteredLeads.forEach(lead => {
      const statusId = lead.statusId;
      
      // Ajouter le lead dans la colonne correspondante (ou dans une colonne par défaut)
      if (statusId && grouped[statusId]) {
        grouped[statusId].push(lead);
      } else {
        // Fallback: mettre dans le premier statut disponible ou créer une colonne "Autre"
        const firstStatus = leadStatuses[0];
        if (firstStatus) {
          grouped[firstStatus.id].push(lead);
        }
      }
    });
    return grouped;
  }, [filteredLeads, leadStatuses]);

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
      commercialScore,
    };
  }, [leads, leadsByStatus]);

  // 🎯 Mettre à jour le badge au chargement et quand les metrics changent
  useEffect(() => {
    let count = 0;
    if (metrics.critical > 0 && !isNotificationSnoozed('critical')) count++;
    if (metrics.urgent > 0 && metrics.critical === 0 && !isNotificationSnoozed('urgent')) count++;
    if (metrics.overdue > 0 && !isNotificationSnoozed('overdue')) count++;
    setActiveAlertsCount(count);
  }, [metrics, isNotificationSnoozed]);

  // 🤖 Fonction pour afficher les alertes IA sous forme de notifications
  const showAIAlerts = useCallback(() => {
    console.log('🤖 showAIAlerts appelée !', metrics);
    
    const { critical, urgent, overdue, total, conversionRate, commercialScore } = metrics;

    // Calculer le nombre d'alertes actives (non snoozées)
    let alertsCount = 0;
    if (critical > 0 && !isNotificationSnoozed('critical')) alertsCount++;
    if (urgent > 0 && critical === 0 && !isNotificationSnoozed('urgent')) alertsCount++;
    if (overdue > 0 && !isNotificationSnoozed('overdue')) alertsCount++;
    
    // Mettre à jour le badge
    setActiveAlertsCount(alertsCount);

    // Notification critique - Cliquer pour filtrer les leads critiques
    if (critical > 0 && !isNotificationSnoozed('critical')) {
      notification.error({
        message: <span style={{ fontWeight: 600 }}>🚨 Leads critiques détectés !</span>,
        description: (
          <div>
            <p style={{ margin: 0 }}>{critical} lead(s) nécessitent une action immédiate</p>
            <small style={{ color: '#888' }}>Plus de 48h sans contact · <strong>Cliquer pour filtrer</strong></small>
          </div>
        ),
        placement: 'topRight',
        duration: 0, // Ne disparaît pas automatiquement
        style: {
          width: 380,
          borderLeft: '4px solid #ff4d4f',
          cursor: 'pointer',
        },
        onClick: () => {
          // Appliquer le filtre "critical"
          setFilterPriority('critical');
          message.success('Filtre appliqué : Leads critiques');
        },
        onClose: () => {
          // Mettre en snooze pour 2 heures quand l'utilisateur ferme
          snoozeNotification('critical', SNOOZE_DURATIONS.critical);
          setActiveAlertsCount(prev => Math.max(0, prev - 1)); // Décrémenter le badge
          message.info('Alerte masquée pour 2 heures. Elle réapparaîtra si le problème persiste.');
        },
      });
    }

    // Notification urgente - Cliquer pour filtrer les leads urgents
    if (urgent > 0 && critical === 0 && !isNotificationSnoozed('urgent')) {
      notification.warning({
        message: <span style={{ fontWeight: 600 }}>⚠️ Leads urgents</span>,
        description: (
          <div>
            <p style={{ margin: 0 }}>{urgent} lead(s) nécessitent un suivi rapide</p>
            <small style={{ color: '#888' }}><strong>Cliquer pour filtrer</strong></small>
          </div>
        ),
        placement: 'topRight',
        duration: 10,
        style: {
          width: 380,
          borderLeft: '4px solid #faad14',
          cursor: 'pointer',
        },
        onClick: () => {
          setFilterPriority('high');
          message.success('Filtre appliqué : Leads urgents');
        },
        onClose: () => {
          snoozeNotification('urgent', SNOOZE_DURATIONS.urgent);
          setActiveAlertsCount(prev => Math.max(0, prev - 1)); // Décrémenter le badge
          message.info('Alerte masquée pour 4 heures.');
        },
      });
    }

    // Notification sur les retards - Cliquer pour voir tous les leads
    if (overdue > 0 && !isNotificationSnoozed('overdue')) {
      notification.info({
        message: <span style={{ fontWeight: 600 }}>📅 Leads en retard</span>,
        description: (
          <div>
            <p style={{ margin: 0 }}>{overdue} lead(s) ont dépassé le délai recommandé</p>
            <small style={{ color: '#888' }}><strong>Cliquer pour filtrer</strong></small>
          </div>
        ),
        placement: 'topRight',
        duration: 8,
        style: {
          width: 380,
          borderLeft: '4px solid #1890ff',
          cursor: 'pointer',
        },
        onClick: () => {
          // Réinitialiser tous les filtres pour voir tous les leads en retard
          setFilterPriority(undefined);
          setFilterSource(undefined);
          setFilterAssignee(undefined);
          message.info('Affichage de tous les leads');
        },
        onClose: () => {
          snoozeNotification('overdue', SNOOZE_DURATIONS.overdue);
          setActiveAlertsCount(prev => Math.max(0, prev - 1)); // Décrémenter le badge
          message.info('Alerte masquée pour 6 heures.');
        },
      });
    }

    // Score commercial positif - Cliquer pour réinitialiser les filtres
    if (commercialScore > 50 && total > 5) {
      notification.success({
        message: <span style={{ fontWeight: 600 }}>✅ Excellente performance !</span>,
        description: (
          <div>
            <p style={{ margin: 0 }}>Pipeline en bonne santé</p>
            <small style={{ color: '#888' }}>Taux de conversion: {conversionRate}% · <strong>Cliquer pour tout voir</strong></small>
          </div>
        ),
        placement: 'topRight',
        duration: 6,
        style: {
          width: 380,
          borderLeft: '4px solid #52c41a',
          cursor: 'pointer',
        },
        onClick: () => {
          // Réinitialiser tous les filtres
          setFilterPriority(undefined);
          setFilterSource(undefined);
          setFilterAssignee(undefined);
          message.success('Filtres réinitialisés');
        },
      });
    }

    // Score commercial négatif - Cliquer pour filtrer les leads qui nécessitent attention
    if (commercialScore < -20) {
      notification.warning({
        message: <span style={{ fontWeight: 600 }}>📉 Attention au pipeline</span>,
        description: (
          <div>
            <p style={{ margin: 0 }}>Plusieurs leads nécessitent votre attention</p>
            <small style={{ color: '#888' }}>Score commercial: {commercialScore} · <strong>Cliquer pour filtrer</strong></small>
          </div>
        ),
        placement: 'topRight',
        duration: 12,
        style: {
          width: 380,
          borderLeft: '4px solid #faad14',
          cursor: 'pointer',
        },
        onClick: () => {
          // Filtrer les leads critiques et urgents
          setFilterPriority('critical');
          message.warning('Filtre appliqué : Leads critiques');
        },
      });
    }

    // Notification générale si tout va bien - Cliquer pour réinitialiser
    if (critical === 0 && urgent === 0 && overdue === 0 && total > 0) {
      notification.success({
        message: <span style={{ fontWeight: 600 }}>🎯 Pipeline à jour !</span>,
        description: (
          <div>
            <p style={{ margin: 0 }}>{total} lead(s) actifs - Aucune action urgente requise</p>
            <small style={{ color: '#888' }}><strong>Cliquer pour réinitialiser les filtres</strong></small>
          </div>
        ),
        placement: 'topRight',
        duration: 5,
        style: {
          width: 380,
          borderLeft: '4px solid #52c41a',
          cursor: 'pointer',
        },
        onClick: () => {
          setFilterPriority(undefined);
          setFilterSource(undefined);
          setFilterAssignee(undefined);
          message.success('Filtres réinitialisés');
        },
      });
    }

    // Si aucun lead
    if (total === 0 && !isNotificationSnoozed('empty')) {
      notification.info({
        message: <span style={{ fontWeight: 600 }}>📊 Pipeline vide</span>,
        description: 'Aucun lead actif pour le moment',
        placement: 'topRight',
        duration: 4,
        style: {
          width: 380,
          borderLeft: '4px solid #1890ff',
        },
        onClose: () => {
          snoozeNotification('empty', SNOOZE_DURATIONS.default);
        },
      });
    }
  }, [metrics, notification, setFilterPriority, setFilterSource, setFilterAssignee, isNotificationSnoozed, snoozeNotification, SNOOZE_DURATIONS]);

  const handleCardDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setIsBoardDragging(true);
    dragLastXRef.current = null;
    console.log('🎯 [DRAG START] isDraggingRef = true, RAF loop va démarrer');
  }, []);

  const handleCardDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsBoardDragging(false);
    dragLastXRef.current = null;
    console.log('🛑 [DRAG END] isDraggingRef = false');
  }, []);


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

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      {/* 🎯 Layer de drag personnalisé pour mobile */}
      <CustomDragLayer />
      {/* 🎯 Auto-scroll pendant le drag */}
      <AutoScrollDragTracker boardRef={boardRef} />
      {/* Container principal - FOND BLANC */}
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ padding: headerPadding, borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#172B4D', fontWeight: 700, fontSize: '18px' }}>Pipeline commercial</span>
              <span style={{ color: '#6B778C', fontSize: '14px' }}>Board</span>
              
              {/* Boutons Nouveau Lead et Export */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    console.log('🆕 Bouton Nouveau Lead cliqué');
                    setIsAddLeadModalOpen(true);
                  }}
                >
                  Nouveau Lead
                </Button>
                <Button 
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    console.log('📥 Bouton Export cliqué, nombre de leads:', leads.length);
                    
                    try {
                      if (leads.length === 0) {
                        message.warning('Aucun lead à exporter');
                        return;
                      }
                      
                      // Export Excel complet avec toutes les informations
                      const excelData = leads.map(lead => {
                        const priority = getLeadPriority(
                          lead.createdAt, 
                          lead.source, 
                          lead.lastContactDate
                        );
                        const assignedName = lead.assignedTo 
                          ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim()
                          : '';

                        return {
                          'Nom': lead.data?.name || '',
                          'Email': lead.data?.email || '',
                          'Téléphone': lead.data?.phone || '',
                          'Entreprise': lead.data?.company || '',
                          'Statut': lead.status || '',
                          'Source': lead.source || '',
                          'Commercial assigné': assignedName,
                          'Priorité': priority,
                          'Dernier contact': lead.lastContactDate 
                            ? new Date(lead.lastContactDate).toLocaleDateString('fr-FR')
                            : '',
                          'Date de création': new Date(lead.createdAt).toLocaleDateString('fr-FR'),
                          'Valeur estimée': lead.data?.estimatedValue || '',
                          'Notes': lead.data?.notes || ''
                        };
                      });
                      
                      // Création du fichier Excel
                      const ws = XLSX.utils.json_to_sheet(excelData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
                      
                      // Téléchargement du fichier
                      XLSX.writeFile(wb, `leads-export-${new Date().toISOString().split('T')[0]}.xlsx`);
                      
                      message.success(`${leads.length} lead(s) exporté(s) en Excel !`);
                      console.log('✅ Export Excel réussi');
                    } catch (error) {
                      console.error('❌ Erreur export:', error);
                      message.error('Erreur lors de l\'export');
                    }
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button 
                size="small" 
                icon={<SettingOutlined />}
                onClick={() => window.location.href = '/leads/settings'}
                style={{ color: '#ff4d4f' }}
                type="text"
              >
                Paramètres
              </Button>
              <Button 
                size="small" 
                icon={<RobotOutlined />}
                onClick={showAIAlerts}
                style={{ color: '#5E6C84' }}
                type="text"
              >
                IA
                {activeAlertsCount > 0 && (
                  <span style={{ 
                    marginLeft: '4px', 
                    backgroundColor: metrics.critical > 0 && !isNotificationSnoozed('critical') ? '#ff4d4f' : '#faad14',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '0 6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {activeAlertsCount}
                  </span>
                )}
              </Button>
              <Button 
                size="small" 
                icon={<FilterOutlined />}
                onClick={() => setFilterModalVisible(true)}
                style={{ color: '#5E6C84' }}
                type={filterSource || filterPriority || filterAssignee ? 'primary' : 'text'}
              >
                Filter
                {(filterSource || filterPriority || filterAssignee) && ' (active)'}
              </Button>
              <Avatar size={28} style={{ backgroundColor: '#1890ff' }}>
                {user?.firstName?.[0] || 'U'}
              </Avatar>
            </div>
          </div>
        </div>

        {/* Board container - SCROLL HORIZONTAL - RESPONSIVE */}
        <div 
          ref={boardRef}
          style={{
            padding: boardPadding,
            overflowX: 'auto',
            overflowY: 'hidden',
            height: boardHeight,
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: isMobile && !isBoardDragging ? 'x mandatory' : undefined,
          }}
        >
          {/* Flex container pour les colonnes - HORIZONTAL */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: isMobile ? '12px' : '12px',
              height: '100%',
              paddingBottom: '12px',
            }}
          >
            {leadStatuses.map(status => {
              const columnLeads = leadsByStatus[status.id] || [];

              const columnData = {
                id: status.id,
                name: status.name,
                color: status.color,
                description: `Statut: ${status.name}`
              };

              return (
                <div 
                  key={status.id}
                  style={{
                    flex: `0 0 ${columnWidth}`,
                    width: columnWidth,
                    minWidth: columnWidth,
                    maxWidth: columnWidth,
                    scrollSnapAlign: isMobile ? 'start' : undefined,
                  }}
                >
                  <KanbanColumn
                    column={columnData}
                    leads={columnLeads}
                    onDropLead={handleDropLead}
                    onViewLead={onViewLead}
                    onCallLead={onCallLead}
                    onEmailLead={onEmailLead}
                    onScheduleLead={onScheduleLead}
                    onEditLead={onEditLead}
                    onDeleteLead={onDeleteLead}
                    isMobile={isMobile}
                    onCardDragStart={handleCardDragStart}
                    onCardDragEnd={handleCardDragEnd}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de filtres */}
      <Modal
        title="Filtrer les leads"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        onOk={() => setFilterModalVisible(false)}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Source
            </label>
            <Select
              allowClear
              placeholder="Toutes les sources"
              style={{ width: '100%' }}
              value={filterSource}
              onChange={setFilterSource}
              options={[
                { label: 'Site Web', value: 'Site Web' },
                { label: 'website_form', value: 'website_form' },
                { label: 'Referral', value: 'Referral' },
                { label: 'Partner', value: 'Partner' },
                { label: 'Direct', value: 'Direct' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Priorité
            </label>
            <Select
              allowClear
              placeholder="Toutes les priorités"
              style={{ width: '100%' }}
              value={filterPriority}
              onChange={setFilterPriority}
              options={[
                { label: '🔴 Critique', value: 'critical' },
                { label: '🟠 Haute', value: 'high' },
                { label: '🟡 Moyenne', value: 'medium' },
                { label: '🟢 Basse', value: 'low' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Commercial assigné
            </label>
            <Select
              allowClear
              placeholder="Tous les commerciaux"
              style={{ width: '100%' }}
              value={filterAssignee}
              onChange={setFilterAssignee}
              options={[
                { label: 'Non assigné', value: 'unassigned' },
                { label: 'Moi', value: user?.id },
              ]}
            />
          </div>

          {(filterSource || filterPriority || filterAssignee) && (
            <Button
              danger
              onClick={() => {
                setFilterSource(undefined);
                setFilterPriority(undefined);
                setFilterAssignee(undefined);
              }}
            >
              Réinitialiser tous les filtres
            </Button>
          )}
        </div>
      </Modal>

      <CreateLeadModal 
        open={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        onLeadCreated={() => {
          setIsAddLeadModalOpen(false);
          fetchLeads();
        }}
      />
    </DndProvider>
  );
};

export default LeadsKanban;
