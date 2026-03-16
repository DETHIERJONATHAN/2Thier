import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge, Popover, Button, Tabs, Empty, Tooltip, Tag, Segmented } from 'antd';
import {
  BellOutlined, CheckOutlined, DeleteOutlined, ClearOutlined,
  UserAddOutlined, FormOutlined, MailOutlined, PhoneOutlined,
  CalendarOutlined, FileProtectOutlined, TeamOutlined, DollarOutlined,
  RobotOutlined, MessageOutlined, AlertOutlined, RocketOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface Notification {
  id: string;
  type: string;
  data: any;
  status: string;
  priority?: string;
  actionUrl?: string;
  readAt?: string | null;
  createdAt: string;
  organization?: { name: string };
}

type FilterCategory = 'all' | 'leads' | 'forms' | 'invitations' | 'calendar' | 'documents' | 'telephony' | 'chantiers' | 'quotes' | 'ai';

// ═══════════════════════════════════════════════════════
// CONFIGURATION DES TYPES DE NOTIFICATIONS
// ═══════════════════════════════════════════════════════

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; category: FilterCategory }> = {
  NEW_LEAD_RECEIVED:          { icon: <UserAddOutlined />,       color: '#D67D35', label: 'Nouveau lead',          category: 'leads' },
  NEW_LEAD_ASSIGNED:          { icon: <RocketOutlined />,        color: '#D67D35', label: 'Lead assigné',           category: 'leads' },
  LEAD_STATUS_CHANGED:        { icon: <RocketOutlined />,        color: '#fa8c16', label: 'Statut lead',            category: 'leads' },
  FORM_SUBMISSION_RECEIVED:   { icon: <FormOutlined />,          color: '#1890ff', label: 'Formulaire',             category: 'forms' },
  INVITATION_CREATED:         { icon: <MailOutlined />,          color: '#722ed1', label: 'Invitation envoyée',     category: 'invitations' },
  INVITATION_ACCEPTED:        { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Invitation acceptée',    category: 'invitations' },
  JOIN_REQUEST_RECEIVED:      { icon: <TeamOutlined />,          color: '#13c2c2', label: 'Demande adhésion',       category: 'invitations' },
  JOIN_REQUEST_APPROVED:      { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Adhésion approuvée',     category: 'invitations' },
  JOIN_REQUEST_REJECTED:      { icon: <CloseCircleOutlined />,   color: '#ff4d4f', label: 'Adhésion refusée',       category: 'invitations' },
  QUOTE_SENT:                 { icon: <DollarOutlined />,        color: '#1890ff', label: 'Devis envoyé',           category: 'quotes' },
  QUOTE_ACCEPTED:             { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Devis accepté',          category: 'quotes' },
  QUOTE_REJECTED:             { icon: <CloseCircleOutlined />,   color: '#ff4d4f', label: 'Devis rejeté',           category: 'quotes' },
  DOCUMENT_SIGNED:            { icon: <FileProtectOutlined />,   color: '#52c41a', label: 'Document signé',         category: 'documents' },
  DOCUMENT_VIEWED:            { icon: <EyeOutlined />,           color: '#1890ff', label: 'Document consulté',      category: 'documents' },
  CALENDAR_EVENT_INVITATION:  { icon: <CalendarOutlined />,      color: '#1890ff', label: 'Événement',              category: 'calendar' },
  CALENDAR_EVENT_UPDATED:     { icon: <CalendarOutlined />,      color: '#fa8c16', label: 'Événement modifié',      category: 'calendar' },
  CALENDAR_EVENT_CANCELLED:   { icon: <CalendarOutlined />,      color: '#ff4d4f', label: 'Événement annulé',       category: 'calendar' },
  CALENDAR_EVENT_REMINDER:    { icon: <AlertOutlined />,         color: '#faad14', label: 'Rappel',                 category: 'calendar' },
  MISSED_CALL:                { icon: <PhoneOutlined />,         color: '#ff4d4f', label: 'Appel manqué',           category: 'telephony' },
  INCOMING_SMS:               { icon: <MessageOutlined />,       color: '#1890ff', label: 'SMS reçu',               category: 'telephony' },
  INCOMING_CALL:              { icon: <PhoneOutlined />,         color: '#52c41a', label: 'Appel entrant',          category: 'telephony' },
  CHANTIER_STATUS_CHANGED:    { icon: <AlertOutlined />,         color: '#fa8c16', label: 'Chantier',               category: 'chantiers' },
  CHANTIER_PROBLEM_REPORTED:  { icon: <AlertOutlined />,         color: '#ff4d4f', label: 'Problème chantier',      category: 'chantiers' },
  CHANTIER_INVOICE_PAID:      { icon: <DollarOutlined />,        color: '#52c41a', label: 'Facture payée',          category: 'chantiers' },
  CHANTIER_VISIT_VALIDATED:   { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Visite validée',         category: 'chantiers' },
  CHANTIER_MATERIAL_RECEIVED: { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Matériel reçu',          category: 'chantiers' },
  CHANTIER_INVOICE_CREATED:   { icon: <DollarOutlined />,        color: '#fa8c16', label: 'Nouvelle facture',       category: 'chantiers' },
  NEW_MAIL_RECEIVED:          { icon: <MailOutlined />,          color: '#1890ff', label: 'Email reçu',             category: 'forms' },
  TASK_COMPLETED:             { icon: <CheckOutlined />,         color: '#52c41a', label: 'Tâche terminée',         category: 'calendar' },
  ROLE_UPDATE_AVAILABLE:      { icon: <TeamOutlined />,          color: '#722ed1', label: 'Rôle mis à jour',        category: 'invitations' },
  AI_DAILY_DIGEST:            { icon: <RobotOutlined />,         color: '#722ed1', label: 'Résumé IA',              category: 'ai' },
};

const CATEGORY_OPTIONS = [
  { label: 'Tout', value: 'all' },
  { label: '📥 Leads', value: 'leads' },
  { label: '📋 Forms', value: 'forms' },
  { label: '👥 Invit.', value: 'invitations' },
  { label: '📅 Agenda', value: 'calendar' },
  { label: '📄 Docs', value: 'documents' },
  { label: '📞 Tél.', value: 'telephony' },
  { label: '🏗️ Chant.', value: 'chantiers' },
  { label: '💰 Devis', value: 'quotes' },
];

const PRIORITY_STYLES: Record<string, { border: string; bg: string }> = {
  urgent: { border: 'border-l-4 border-l-red-500', bg: 'bg-red-50' },
  high:   { border: 'border-l-4 border-l-orange-400', bg: 'bg-orange-50' },
  normal: { border: 'border-l-2 border-l-transparent', bg: '' },
  low:    { border: 'border-l-2 border-l-gray-200', bg: 'bg-gray-50' },
};

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
}

function getNotifConfig(type: string) {
  return NOTIF_CONFIG[type] || { icon: <BellOutlined />, color: '#8c8c8c', label: type, category: 'all' as FilterCategory };
}

// ═══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════

const NotificationsBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
  const [hasNewSinceLastOpen, setHasNewSinceLastOpen] = useState(false);
  const lastCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { api } = useAuthenticatedApi();

  // Son de notification (simplifié, pas de fichier externe)
  useEffect(() => {
    // Utiliser un son subtil via Web Audio API
    audioRef.current = null; // Placeholder: futur son personnalisable
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response: any = await api.get('/api/notifications?includeRead=true');
      const notifs: Notification[] = (Array.isArray(response) ? response : response?.data) || [];
      
      // Détecter nouvelles notifications depuis dernière vérification
      if (notifs.length > lastCountRef.current && lastCountRef.current > 0 && !isOpen) {
        setHasNewSinceLastOpen(true);
        // Essayer de jouer un son de notification
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.1;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.stop(ctx.currentTime + 0.3);
        } catch (_) { /* audio non-bloquant */ }
      }
      lastCountRef.current = notifs.length;
      setNotifications(notifs);
    } catch (error) {
      console.error("[NotificationsBell] Erreur fetch:", error);
    }
  }, [api, isOpen]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n));
    } catch (error) {
      console.error("[NotificationsBell] Erreur mark read:", error);
    }
  }, [api]);

  const markAllAsRead = useCallback(async () => {
    try {
      const pending = notifications.filter(n => n.status === 'PENDING');
      await Promise.allSettled(pending.map(n => api.patch(`/api/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ', readAt: n.readAt || new Date().toISOString() })));
    } catch (error) {
      console.error("[NotificationsBell] Erreur mark all read:", error);
    }
  }, [api, notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("[NotificationsBell] Erreur delete:", error);
    }
  }, [api]);

  const clearAll = useCallback(async () => {
    try {
      await Promise.allSettled(notifications.map(n => api.delete(`/api/notifications/${n.id}`)));
      setNotifications([]);
    } catch (error) {
      console.error("[NotificationsBell] Erreur clear all:", error);
    }
  }, [api, notifications]);

  // Navigation vers la source
  const handleNavigate = useCallback((notif: Notification) => {
    markAsRead(notif.id);
    const url = notif.actionUrl || notif.data?.actionUrl;
    if (url) {
      window.location.hash = url.startsWith('/') ? `#${url}` : `#/${url}`;
      setIsOpen(false);
    }
  }, [markAsRead]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s au lieu de 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Quand on ouvre le dropdown, reset le flag "nouveaux"
  useEffect(() => {
    if (isOpen) setHasNewSinceLastOpen(false);
  }, [isOpen]);

  const unreadCount = useMemo(() => notifications.filter(n => n.status === 'PENDING').length, [notifications]);

  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (activeTab === 'unread') result = result.filter(n => n.status === 'PENDING');
    if (filter !== 'all') result = result.filter(n => getNotifConfig(n.type).category === filter);
    // Trier : urgent d'abord, puis par date
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return result.sort((a, b) => {
      const pa = priorityOrder[a.priority || 'normal'] ?? 2;
      const pb = priorityOrder[b.priority || 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications, filter, activeTab]);

  // Compteurs par catégorie
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const pending = notifications.filter(n => n.status === 'PENDING');
    pending.forEach(n => {
      const cat = getNotifConfig(n.type).category;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  // ═══════════════════════════════════════════════════════
  // RENDER NOTIFICATION ITEM
  // ═══════════════════════════════════════════════════════

  const renderNotifItem = (notif: Notification) => {
    const config = getNotifConfig(notif.type);
    const priorityStyle = PRIORITY_STYLES[notif.priority || 'normal'] || PRIORITY_STYLES.normal;
    const isUnread = notif.status === 'PENDING';

    return (
      <div
        key={notif.id}
        className={`flex items-start gap-3 p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${priorityStyle.border} ${isUnread ? priorityStyle.bg || 'bg-blue-50/40' : 'opacity-70'}`}
        onClick={() => handleNavigate(notif)}
      >
        {/* Icône avec couleur */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: config.color }}
        >
          {config.icon}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Tag color={config.color} className="text-xs px-1.5 py-0 leading-5 m-0">
              {config.label}
            </Tag>
            {notif.priority === 'urgent' && <Tag color="red" className="text-xs px-1 py-0 leading-5 m-0 animate-pulse">URGENT</Tag>}
            {notif.priority === 'high' && <Tag color="orange" className="text-xs px-1 py-0 leading-5 m-0">Important</Tag>}
          </div>
          <p className={`text-sm mb-0.5 break-words ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
            {notif.data?.message || 'Notification'}
          </p>
          <span className="text-xs text-gray-400">{getRelativeTime(notif.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
          {isUnread && (
            <Tooltip title="Marquer lu">
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                onClick={() => markAsRead(notif.id)}
              >
                <CheckOutlined style={{ fontSize: 12 }} />
              </button>
            </Tooltip>
          )}
          <Tooltip title="Supprimer">
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              onClick={() => deleteNotification(notif.id)}
            >
              <DeleteOutlined style={{ fontSize: 12 }} />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // DROPDOWN CONTENT
  // ═══════════════════════════════════════════════════════

  const dropdownContent = (
    <div className="w-[420px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden" style={{ maxHeight: '80vh' }}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#D67D35] to-[#e8954f] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellOutlined className="text-lg" />
            <span className="font-bold text-base">Notifications</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ backgroundColor: '#fff', color: '#D67D35', fontWeight: 700, boxShadow: 'none' }} />
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Tooltip title="Tout marquer lu">
                <button className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/20 transition-all" onClick={markAllAsRead}>
                  <CheckOutlined style={{ fontSize: 14 }} />
                </button>
              </Tooltip>
            )}
            {notifications.length > 0 && (
              <Tooltip title="Tout supprimer">
                <button className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/20 transition-all" onClick={clearAll}>
                  <ClearOutlined style={{ fontSize: 14 }} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Non lues / Toutes */}
      <div className="px-3 pt-2 border-b border-gray-100">
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'unread' | 'all')}
          size="small"
          items={[
            { key: 'unread', label: <span>Non lues {unreadCount > 0 && <Badge count={unreadCount} size="small" style={{ marginLeft: 4 }} />}</span> },
            { key: 'all', label: `Toutes (${notifications.length})` },
          ]}
          className="notification-tabs"
        />
      </div>

      {/* Filtres par catégorie */}
      {notifications.length > 3 && (
        <div className="px-3 py-2 border-b border-gray-50 overflow-x-auto">
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as FilterCategory)}
            options={CATEGORY_OPTIONS.filter(opt => opt.value === 'all' || (categoryCounts[opt.value] && categoryCounts[opt.value] > 0)).map(opt => ({
              ...opt,
              label: opt.value !== 'all' && categoryCounts[opt.value]
                ? <span>{opt.label} <Badge count={categoryCounts[opt.value]} size="small" style={{ marginLeft: 2 }} /></span>
                : opt.label,
            }))}
            size="small"
            className="w-full"
          />
        </div>
      )}

      {/* Liste */}
      <div className="overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: 'calc(80vh - 180px)' }}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(renderNotifItem)
        ) : (
          <div className="py-12">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-gray-400">
                  {activeTab === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                  {filter !== 'all' && ' dans cette catégorie'}
                </span>
              }
            />
          </div>
        )}
      </div>

      {/* Footer stats */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
          <span>{unreadCount} non lue{unreadCount !== 1 ? 's' : ''}</span>
          <span>Actualisation toutes les 15s</span>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={dropdownContent}
      trigger="click"
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottomRight"
      overlayInnerStyle={{ padding: 0 }}
      arrow={false}
    >
      <div className="relative cursor-pointer">
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined style={{ fontSize: 20, color: 'inherit' }} />}
          className={`flex items-center justify-center transition-all duration-300 hover:bg-[#D67D35]/20 ${hasNewSinceLastOpen ? 'animate-bounce' : ''}`}
          style={{ width: 40, height: 40 }}
        />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-xs font-bold flex items-center justify-center text-white ${unreadCount > 0 ? 'bg-[#D67D35]' : 'bg-gray-400'} ${hasNewSinceLastOpen ? 'animate-pulse' : ''}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Popover>
  );
};

export default NotificationsBell;
