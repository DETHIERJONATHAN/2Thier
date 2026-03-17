import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Popover, Tooltip } from 'antd';
import {
  BellOutlined, CheckOutlined, DeleteOutlined,
  UserAddOutlined, FormOutlined, MailOutlined, PhoneOutlined,
  CalendarOutlined, FileProtectOutlined, TeamOutlined, DollarOutlined,
  RobotOutlined, MessageOutlined, AlertOutlined, RocketOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

interface NotificationItem {
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

type TabFilter = 'all' | 'unread';

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  NEW_LEAD_RECEIVED:          { icon: <UserAddOutlined />,       color: '#D67D35', label: 'Nouveau lead' },
  NEW_LEAD_ASSIGNED:          { icon: <RocketOutlined />,        color: '#D67D35', label: 'Lead assigné' },
  LEAD_STATUS_CHANGED:        { icon: <RocketOutlined />,        color: '#fa8c16', label: 'Statut lead' },
  FORM_SUBMISSION_RECEIVED:   { icon: <FormOutlined />,          color: '#1890ff', label: 'Formulaire' },
  INVITATION_CREATED:         { icon: <MailOutlined />,          color: '#722ed1', label: 'Invitation envoyée' },
  INVITATION_ACCEPTED:        { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Invitation acceptée' },
  JOIN_REQUEST_RECEIVED:      { icon: <TeamOutlined />,          color: '#13c2c2', label: 'Demande adhésion' },
  JOIN_REQUEST_APPROVED:      { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Adhésion approuvée' },
  JOIN_REQUEST_REJECTED:      { icon: <CloseCircleOutlined />,   color: '#ff4d4f', label: 'Adhésion refusée' },
  QUOTE_SENT:                 { icon: <DollarOutlined />,        color: '#1890ff', label: 'Devis envoyé' },
  QUOTE_ACCEPTED:             { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Devis accepté' },
  QUOTE_REJECTED:             { icon: <CloseCircleOutlined />,   color: '#ff4d4f', label: 'Devis rejeté' },
  DOCUMENT_SIGNED:            { icon: <FileProtectOutlined />,   color: '#52c41a', label: 'Document signé' },
  DOCUMENT_VIEWED:            { icon: <EyeOutlined />,           color: '#1890ff', label: 'Document consulté' },
  CALENDAR_EVENT_INVITATION:  { icon: <CalendarOutlined />,      color: '#1890ff', label: 'Événement' },
  CALENDAR_EVENT_UPDATED:     { icon: <CalendarOutlined />,      color: '#fa8c16', label: 'Événement modifié' },
  CALENDAR_EVENT_CANCELLED:   { icon: <CalendarOutlined />,      color: '#ff4d4f', label: 'Événement annulé' },
  CALENDAR_EVENT_REMINDER:    { icon: <AlertOutlined />,         color: '#faad14', label: 'Rappel' },
  MISSED_CALL:                { icon: <PhoneOutlined />,         color: '#ff4d4f', label: 'Appel manqué' },
  INCOMING_SMS:               { icon: <MessageOutlined />,       color: '#1890ff', label: 'SMS reçu' },
  INCOMING_CALL:              { icon: <PhoneOutlined />,         color: '#52c41a', label: 'Appel entrant' },
  CHANTIER_STATUS_CHANGED:    { icon: <AlertOutlined />,         color: '#fa8c16', label: 'Chantier' },
  CHANTIER_PROBLEM_REPORTED:  { icon: <AlertOutlined />,         color: '#ff4d4f', label: 'Problème chantier' },
  CHANTIER_INVOICE_PAID:      { icon: <DollarOutlined />,        color: '#52c41a', label: 'Facture payée' },
  CHANTIER_VISIT_VALIDATED:   { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Visite validée' },
  CHANTIER_MATERIAL_RECEIVED: { icon: <CheckCircleOutlined />,   color: '#52c41a', label: 'Matériel reçu' },
  CHANTIER_INVOICE_CREATED:   { icon: <DollarOutlined />,        color: '#fa8c16', label: 'Nouvelle facture' },
  NEW_MAIL_RECEIVED:          { icon: <MailOutlined />,          color: '#1890ff', label: 'Email reçu' },
  TASK_COMPLETED:             { icon: <CheckOutlined />,         color: '#52c41a', label: 'Tâche terminée' },
  ROLE_UPDATE_AVAILABLE:      { icon: <TeamOutlined />,          color: '#722ed1', label: 'Rôle mis à jour' },
  AI_DAILY_DIGEST:            { icon: <RobotOutlined />,         color: '#722ed1', label: 'Résumé IA' },
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  const w = Math.floor(d / 7);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  if (h < 24) return `${h} h`;
  if (d < 7) return `${d} j`;
  if (w < 4) return `${w} sem.`;
  return new Date(dateStr).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
}

function cfg(type: string) {
  return NOTIF_CONFIG[type] || { icon: <BellOutlined />, color: '#65676B', label: type };
}

const NotificationsBell = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const lastCountRef = useRef(0);
  const isOpenRef = useRef(false);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response: any = await api.get('/api/notifications?includeRead=true');
      const notifs: NotificationItem[] = (Array.isArray(response) ? response : response?.data) || [];
      const pendingCount = notifs.filter(n => n.status === 'PENDING').length;
      if (pendingCount > lastCountRef.current && lastCountRef.current > 0 && !isOpenRef.current) {
        setHasNew(true);
      }
      lastCountRef.current = pendingCount;
      setNotifications(notifs);
    } catch (_) {}
  }, [api]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n));
    } catch (_) {}
  }, [api]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => n.status === 'PENDING' ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n));
    } catch (_) {}
  }, [api]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (_) {}
  }, [api]);

  const handleNavigate = useCallback((notif: NotificationItem) => {
    markAsRead(notif.id);
    const url = notif.actionUrl || notif.data?.actionUrl;
    if (url) {
      window.location.hash = url.startsWith('/') ? `#${url}` : `#/${url}`;
      setIsOpen(false);
    }
  }, [markAsRead]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => { if (isOpen) setHasNew(false); }, [isOpen]);

  const unreadCount = useMemo(() => notifications.filter(n => n.status === 'PENDING').length, [notifications]);

  const filtered = useMemo(() => {
    const list = tab === 'unread' ? notifications.filter(n => n.status === 'PENDING') : notifications;
    const po: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return [...list].sort((a, b) => {
      const pa = po[a.priority || 'normal'] ?? 2;
      const pb = po[b.priority || 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications, tab]);

  // Facebook-style notification item
  const renderItem = (notif: NotificationItem) => {
    const c = cfg(notif.type);
    const isUnread = notif.status === 'PENDING';
    const isHovered = hoveredId === notif.id;

    return (
      <div
        key={notif.id}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '8px 12px', cursor: 'pointer', borderRadius: 8,
          backgroundColor: isHovered ? '#f2f2f2' : isUnread ? '#E7F3FF' : 'transparent',
          transition: 'background 0.15s',
          position: 'relative',
        }}
        onMouseEnter={() => setHoveredId(notif.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => handleNavigate(notif)}
      >
        {/* Avatar avec badge icône */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            backgroundColor: '#E4E6EB', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: '#65676B',
          }}>
            <span style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
          </div>
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 22, height: 22, borderRadius: '50%',
            backgroundColor: c.color, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '2px solid white', fontSize: 10, color: 'white',
          }}>
            {c.icon}
          </div>
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{
            fontSize: 13, lineHeight: '18px', color: '#050505',
            fontWeight: isUnread ? 600 : 400,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {notif.data?.message || c.label}
          </div>
          <div style={{
            fontSize: 12, marginTop: 2, fontWeight: isUnread ? 600 : 400,
            color: isUnread ? '#0866FF' : '#65676B',
          }}>
            {getRelativeTime(notif.createdAt)}
          </div>
        </div>

        {/* Point bleu non-lu + actions hover */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 12 }}>
          {isHovered && (
            <>
              {isUnread && (
                <Tooltip title="Marquer comme lu">
                  <div
                    onClick={e => { e.stopPropagation(); markAsRead(notif.id); }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                  >
                    <CheckOutlined style={{ fontSize: 14, color: '#65676B' }} />
                  </div>
                </Tooltip>
              )}
              <Tooltip title="Supprimer">
                <div
                  onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}
                >
                  <DeleteOutlined style={{ fontSize: 14, color: '#65676B' }} />
                </div>
              </Tooltip>
            </>
          )}
          {isUnread && !isHovered && (
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              backgroundColor: '#0866FF', flexShrink: 0,
            }} />
          )}
        </div>
      </div>
    );
  };

  const panelContent = (
    <div style={{
      width: 360, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#fff', borderRadius: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    }}>
      {/* Header Facebook-style */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#050505', margin: 0 }}>Notifications</h2>
          <Tooltip title="Options">
            <div
              onClick={e => { e.stopPropagation(); if (unreadCount > 0) markAllAsRead(); }}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                backgroundColor: 'transparent', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f2f2f2')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <EllipsisOutlined style={{ fontSize: 20, color: '#65676B' }} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Tabs Facebook-style (pills) */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px 4px' }}>
        {([
          { key: 'all' as TabFilter, label: 'Toutes' },
          { key: 'unread' as TabFilter, label: 'Non lues' },
        ]).map(t => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              backgroundColor: tab === t.key ? '#E7F3FF' : 'transparent',
              color: tab === t.key ? '#0866FF' : '#65676B',
            }}
            onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.backgroundColor = '#f2f2f2'; }}
            onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Section header */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px 4px',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#050505' }}>
            {tab === 'unread' ? 'Non lues' : 'Plus récentes'}
          </span>
          {unreadCount > 0 && (
            <span
              onClick={markAllAsRead}
              style={{ fontSize: 14, color: '#0866FF', cursor: 'pointer', fontWeight: 400 }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              Tout marquer comme lu
            </span>
          )}
        </div>
      )}

      {/* Liste */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '4px 8px 8px',
        maxHeight: 'calc(85vh - 140px)',
      }}>
        {filtered.length > 0 ? (
          filtered.map(renderItem)
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', color: '#65676B',
          }}>
            <BellOutlined style={{ fontSize: 48, color: '#BEC3C9', marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: '#050505', marginBottom: 4 }}>
              {tab === 'unread' ? 'Vous êtes à jour !' : 'Aucune notification'}
            </div>
            <div style={{ fontSize: 14, textAlign: 'center' }}>
              {tab === 'unread'
                ? 'Aucune notification non lue pour le moment.'
                : "Vos notifications apparaîtront ici."
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={panelContent}
      trigger="click"
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottomRight"
      styles={{ body: { padding: 0, borderRadius: 8, overflow: 'hidden' } }}
      overlayStyle={{ zIndex: 1050 }}
      arrow={false}
    >
      <div
        className="header-2thier-item"
        style={{
          position: 'relative', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          padding: 6, border: 'none',
        }}
      >
        <BellOutlined style={{ fontSize: 16 }} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: 0, right: -2,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, backgroundColor: '#D67D35',
            color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #1F3B53',
            animation: hasNew ? 'notif-pop 0.3s ease' : undefined,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        <style>{`
          @keyframes notif-pop {
            0% { transform: scale(0.5); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </Popover>
  );
};

export default NotificationsBell;
