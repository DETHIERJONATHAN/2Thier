import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Popover, Tooltip } from 'antd';
import {
  BellOutlined, CheckOutlined, DeleteOutlined,
  UserAddOutlined, FormOutlined, MailOutlined, PhoneOutlined,
  CalendarOutlined, FileProtectOutlined, TeamOutlined, DollarOutlined,
  RobotOutlined, MessageOutlined, AlertOutlined, RocketOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  EllipsisOutlined, ArrowLeftOutlined,
  StarFilled, GlobalOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { setNotificationBadgeCount } from '../lib/pwaBadge';
import { useBookmarks, Bookmark } from '../hooks/useBookmarks';
import { useTranslation } from 'react-i18next';
import { SF, FB } from '../components/zhiive/ZhiiveTheme';

interface NotificationItem {
  id: string;
  type: string;
  data: unknown;
  status: string;
  priority?: string;
  actionUrl?: string;
  readAt?: string | null;
  createdAt: string;
  organization?: { name: string };
}

type TabFilter = 'all' | 'unread';

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  NEW_LEAD_RECEIVED:          { icon: <UserAddOutlined />,       color: FB.leadOrange, label: 'Nouveau lead' },
  NEW_LEAD_ASSIGNED:          { icon: <RocketOutlined />,        color: FB.leadOrange, label: 'Lead assigné' },
  LEAD_STATUS_CHANGED:        { icon: <RocketOutlined />,        color: SF.orangeAlt, label: 'Statut lead' },
  FORM_SUBMISSION_RECEIVED:   { icon: <FormOutlined />,          color: SF.info, label: 'Formulaire' },
  INVITATION_CREATED:         { icon: <MailOutlined />,          color: FB.purple, label: 'Invitation envoyée' },
  INVITATION_ACCEPTED:        { icon: <CheckCircleOutlined />,   color: SF.successAlt, label: 'Invitation acceptée' },
  INVITATION_RECEIVED:        { icon: <MailOutlined />,          color: FB.purple, label: 'Invitation reçue' },
  JOIN_REQUEST_RECEIVED:      { icon: <TeamOutlined />,          color: FB.teal, label: 'Demande adhésion' },
  JOIN_REQUEST_APPROVED:      { icon: <CheckCircleOutlined />,   color: SF.successAlt, label: 'Adhésion approuvée' },
  JOIN_REQUEST_REJECTED:      { icon: <CloseCircleOutlined />,   color: SF.danger, label: 'Adhésion refusée' },
  QUOTE_SENT:                 { icon: <DollarOutlined />,        color: SF.info, label: 'Devis envoyé' },
  QUOTE_ACCEPTED:             { icon: <CheckCircleOutlined />,   color: SF.successAlt, label: 'Devis accepté' },
  QUOTE_REJECTED:             { icon: <CloseCircleOutlined />,   color: SF.danger, label: 'Devis rejeté' },
  DOCUMENT_SIGNED:            { icon: <FileProtectOutlined />,   color: SF.successAlt, label: 'Document signé' },
  DOCUMENT_VIEWED:            { icon: <EyeOutlined />,           color: SF.info, label: 'Document consulté' },
  CALENDAR_EVENT_INVITATION:  { icon: <CalendarOutlined />,      color: SF.info, label: 'Événement' },
  CALENDAR_EVENT_UPDATED:     { icon: <CalendarOutlined />,      color: SF.orangeAlt, label: 'Événement modifié' },
  CALENDAR_EVENT_CANCELLED:   { icon: <CalendarOutlined />,      color: SF.danger, label: 'Événement annulé' },
  CALENDAR_EVENT_REMINDER:    { icon: <AlertOutlined />,         color: SF.warning, label: 'Rappel' },
  MISSED_CALL:                { icon: <PhoneOutlined />,         color: SF.danger, label: 'Appel manqué' },
  INCOMING_SMS:               { icon: <MessageOutlined />,       color: SF.info, label: 'SMS reçu' },
  INCOMING_CALL:              { icon: <PhoneOutlined />,         color: SF.successAlt, label: 'Appel entrant' },
  CHANTIER_STATUS_CHANGED:    { icon: <AlertOutlined />,         color: SF.orangeAlt, label: 'Chantier' },
  CHANTIER_PROBLEM_REPORTED:  { icon: <AlertOutlined />,         color: SF.danger, label: 'Problème chantier' },
  CHANTIER_INVOICE_PAID:      { icon: <DollarOutlined />,        color: SF.successAlt, label: 'Facture payée' },
  CHANTIER_VISIT_VALIDATED:   { icon: <CheckCircleOutlined />,   color: SF.successAlt, label: 'Visite validée' },
  CHANTIER_MATERIAL_RECEIVED: { icon: <CheckCircleOutlined />,   color: SF.successAlt, label: 'Matériel reçu' },
  CHANTIER_INVOICE_CREATED:   { icon: <DollarOutlined />,        color: SF.orangeAlt, label: 'Nouvelle facture' },
  NEW_MAIL_RECEIVED:          { icon: <MailOutlined />,          color: SF.info, label: 'Email reçu' },
  TASK_COMPLETED:             { icon: <CheckOutlined />,         color: SF.successAlt, label: 'Tâche terminée' },
  ROLE_UPDATE_AVAILABLE:      { icon: <TeamOutlined />,          color: FB.purple, label: 'Rôle mis à jour' },
  AI_DAILY_DIGEST:            { icon: <RobotOutlined />,         color: FB.purple, label: 'Résumé IA' },
  FRIEND_REQUEST_RECEIVED:    { icon: <UserAddOutlined />,       color: FB.teal, label: 'Demande d\'ami' },
  FRIEND_REQUEST_ACCEPTED:    { icon: <TeamOutlined />,          color: SF.successAlt, label: 'Ami accepté' },
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
  return NOTIF_CONFIG[type] || { icon: <BellOutlined />, color: FB.textSecondary, label: type };
}

const NotificationsBell = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const lastCountRef = useRef(0);
  const isOpenRef = useRef(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 480 : false);
  const [mobilePanel, setMobilePanel] = useState<'notifs' | 'bookmarks'>('notifs');

  const { bookmarks, removeBookmark } = useBookmarks();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response: unknown = await api.get('/api/notifications?includeRead=true');
      const notifs: NotificationItem[] = (Array.isArray(response) ? response : response?.data) || [];
      const pendingCount = notifs.filter(n => n.status === 'PENDING').length;
      if (pendingCount > lastCountRef.current && lastCountRef.current > 0 && !isOpenRef.current) {
        setHasNew(true);
      }
      lastCountRef.current = pendingCount;
      setNotifications(notifs);
    } catch (_) { /* ok */ }
  }, [api]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n));
    } catch (_) { /* ok */ }
  }, [api]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => n.status === 'PENDING' ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n));
    } catch (_) { /* ok */ }
  }, [api]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (_) { /* ok */ }
  }, [api]);

  const handleNavigate = useCallback((notif: NotificationItem) => {
    markAsRead(notif.id);
    const url = notif.actionUrl || notif.data?.actionUrl;
    if (url) {
      window.location.hash = url.startsWith('/') ? `#${url}` : `#/${url}`;
      setIsOpen(false);
    }
  }, [markAsRead]);

  const handleFriendRequestAction = useCallback(async (notif: NotificationItem, action: 'accept' | 'reject' | 'block') => {
    const friendshipId = notif.data?.friendshipId;
    if (!friendshipId) return;
    try {
      if (action === 'accept') {
        await api.post(`/api/friends/${friendshipId}/accept`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, data: { ...n.data, handled: 'accepted' }, status: 'READ' } : n));
      } else if (action === 'block') {
        await api.post(`/api/friends/${friendshipId}/block`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, data: { ...n.data, handled: 'blocked' }, status: 'READ' } : n));
      } else {
        await api.delete(`/api/friends/${friendshipId}`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, data: { ...n.data, handled: 'rejected' }, status: 'READ' } : n));
      }
      // Persist handled state in notification data via PATCH
      try {
        await api.patch(`/api/notifications/${notif.id}/read`);
      } catch (_) { /* ok */ }
    } catch (err: unknown) {
      // If 404 = friendship was cancelled by the other party, remove notification
      const status = err?.status || err?.response?.status || err?.data?.status;
      if (status === 404 || err?.message?.includes('404')) {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, data: { ...n.data, handled: 'cancelled' }, status: 'READ' } : n));
        try { await api.delete(`/api/notifications/${notif.id}`); } catch (_) { /* ok */ }
      }
    }
  }, [api]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => { if (isOpen) setHasNew(false); }, [isOpen]);

  const unreadCount = useMemo(() => notifications.filter(n => n.status === 'PENDING').length, [notifications]);

  // Mettre à jour le badge PWA (icône écran d'accueil) quand le compteur change
  useEffect(() => {
    setNotificationBadgeCount(unreadCount);
  }, [unreadCount]);

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
          backgroundColor: isHovered ? FB.hover : isUnread ? FB.activeBlue : 'transparent',
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
            backgroundColor: FB.btnGray, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: FB.textSecondary,
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
            fontSize: 13, lineHeight: '18px', color: FB.text,
            fontWeight: isUnread ? 600 : 400,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {notif.data?.message || c.label}
          </div>
          <div style={{
            fontSize: 12, marginTop: 2, fontWeight: isUnread ? 600 : 400,
            color: isUnread ? FB.blueStrong : FB.textSecondary,
          }}>
            {getRelativeTime(notif.createdAt)}
          </div>
          {/* Accept/Reject buttons for friend requests */}
          {notif.type === 'FRIEND_REQUEST_RECEIVED' && !notif.data?.handled && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <div
                role="button" tabIndex={0} onClick={e => { e.stopPropagation(); handleFriendRequestAction(notif, 'accept'); }}
                style={{
                  padding: '4px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: FB.blueStrong, color: 'white', cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                Accepter
              </div>
              <div
                role="button" tabIndex={0} onClick={e => { e.stopPropagation(); handleFriendRequestAction(notif, 'reject'); }}
                style={{
                  padding: '4px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: FB.btnGray, color: FB.text, cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                Refuser
              </div>
              <div
                role="button" tabIndex={0} onClick={e => { e.stopPropagation(); handleFriendRequestAction(notif, 'block'); }}
                style={{
                  padding: '4px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: FB.dangerLightBg, color: FB.dangerDark, cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                Bloquer
              </div>
            </div>
          )}
          {notif.type === 'FRIEND_REQUEST_RECEIVED' && notif.data?.handled === 'accepted' && (
            <div style={{ fontSize: 11, marginTop: 4, color: SF.successAlt, fontWeight: 600 }}>Demande acceptée ✅</div>
          )}
          {notif.type === 'FRIEND_REQUEST_RECEIVED' && notif.data?.handled === 'rejected' && (
            <div style={{ fontSize: 11, marginTop: 4, color: SF.danger, fontWeight: 600 }}>Demande refusée</div>
          )}
          {notif.type === 'FRIEND_REQUEST_RECEIVED' && notif.data?.handled === 'blocked' && (
            <div style={{ fontSize: 11, marginTop: 4, color: FB.dangerDark, fontWeight: 600 }}>Utilisateur bloqué 🚫</div>
          )}
          {notif.type === 'FRIEND_REQUEST_RECEIVED' && notif.data?.handled === 'cancelled' && (
            <div style={{ fontSize: 11, marginTop: 4, color: SF.textQuaternary, fontWeight: 600 }}>Demande annulée</div>
          )}
        </div>

        {/* Point bleu non-lu + actions hover */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 12 }}>
          {isHovered && (
            <>
              {isUnread && (
                <Tooltip title="Marquer comme lu">
                  <div
                    role="button" tabIndex={0} onClick={e => { e.stopPropagation(); markAsRead(notif.id); }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      backgroundColor: '#fff', boxShadow: '0 1px 3px ${SF.overlayDarkLight}',
                    }}
                  >
                    <CheckOutlined style={{ fontSize: 14, color: FB.textSecondary }} />
                  </div>
                </Tooltip>
              )}
              <Tooltip title={t('common.delete')}>
                <div
                  role="button" tabIndex={0} onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    backgroundColor: '#fff', boxShadow: '0 1px 3px ${SF.overlayDarkLight}',
                  }}
                >
                  <DeleteOutlined style={{ fontSize: 14, color: FB.textSecondary }} />
                </div>
              </Tooltip>
            </>
          )}
          {isUnread && !isHovered && (
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              backgroundColor: FB.blueStrong, flexShrink: 0,
            }} />
          )}
        </div>
      </div>
    );
  };

  // ── Bookmarks panel (right side) ──
  const bookmarksPanel = (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ padding: '12px 16px 8px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: FB.text, margin: 0 }}>
          <StarFilled style={{ color: SF.warning, marginRight: 8, fontSize: 16 }} />
          Favoris
        </h2>
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '4px 8px 8px',
      }}>
        {bookmarks.length > 0 ? (
          bookmarks.map((bm: Bookmark) => (
            <div
              key={bm.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', cursor: 'pointer', borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = FB.hover; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              onClick={() => { window.open(bm.url, '_blank'); }}
            >
              {/* Favicon / thumbnail */}
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                overflow: 'hidden', background: SF.bgCard,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {bm.imageUrl ? (
                  <img loading="lazy" src={bm.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : bm.favicon ? (
                  <img loading="lazy" src={bm.favicon} alt="" style={{ width: 20, height: 20 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <GlobalOutlined style={{ fontSize: 18, color: FB.placeholderIcon }} />
                )}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: FB.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {bm.title}
                </div>
                <div style={{
                  fontSize: 11, color: FB.textSecondary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {bm.domain || bm.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </div>
              </div>
              {/* Remove */}
              <Tooltip title="Retirer des favoris">
                <div
                  role="button" tabIndex={0} onClick={e => { e.stopPropagation(); removeBookmark(bm.id); }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    flexShrink: 0, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = FB.dangerHoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <DeleteOutlined style={{ fontSize: 12, color: SF.danger }} />
                </div>
              </Tooltip>
            </div>
          ))
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '40px 20px', color: FB.textSecondary,
          }}>
            <StarFilled style={{ fontSize: 40, color: FB.btnGray, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: FB.text, marginBottom: 4 }}>
              Aucun favori
            </div>
            <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.4 }}>
              Recherchez un site web et cliquez sur l'étoile ⭐ pour l'ajouter ici.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Notifications panel (left side) ──
  const notifsPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header Facebook-style */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isMobile && (
            <div
              role="button" tabIndex={0} onClick={() => setIsOpen(false)}
              style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                marginRight: 8,
              }}
            >
              <ArrowLeftOutlined style={{ fontSize: 18, color: FB.text }} />
            </div>
          )}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: FB.text, margin: 0, flex: 1 }}>{t('common.notifications')}</h2>
          <Tooltip title="Tout marquer comme lu">
            <div
              role="button" tabIndex={0} onClick={e => { e.stopPropagation(); if (unreadCount > 0) markAllAsRead(); }}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                backgroundColor: 'transparent', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = FB.hover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <EllipsisOutlined style={{ fontSize: 20, color: FB.textSecondary }} />
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
            role="button" tabIndex={0} onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              backgroundColor: tab === t.key ? FB.activeBlue : 'transparent',
              color: tab === t.key ? FB.blueStrong : FB.textSecondary,
            }}
            onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.backgroundColor = FB.hover; }}
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
          <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>
            {tab === 'unread' ? 'Non lues' : 'Plus récentes'}
          </span>
          {unreadCount > 0 && (
            <span
              role="button" tabIndex={0} onClick={markAllAsRead}
              style={{ fontSize: 14, color: FB.blueStrong, cursor: 'pointer', fontWeight: 400 }}
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
      }}>
        {filtered.length > 0 ? (
          filtered.map(renderItem)
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', color: FB.textSecondary,
          }}>
            <BellOutlined style={{ fontSize: 48, color: FB.emptyIcon, marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text, marginBottom: 4 }}>
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

  const panelContent = isMobile ? (
    // Mobile: tabbed view
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#fff',
    }}>
      {/* Mobile tabs: Notifications / Favoris */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #e4e6eb',
      }}>
        {([
          { key: 'notifs' as const, label: 'Notifications', icon: <BellOutlined /> },
          { key: 'bookmarks' as const, label: 'Favoris', icon: <StarFilled style={{ color: SF.warning }} /> },
        ]).map(p => (
          <div
            key={p.key}
            role="button" tabIndex={0} onClick={() => setMobilePanel(p.key)}
            style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              color: mobilePanel === p.key ? FB.blueStrong : FB.textSecondary,
              borderBottom: mobilePanel === p.key ? '2px solid #0866FF' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {p.icon}
            {p.label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mobilePanel === 'notifs' ? notifsPanel : bookmarksPanel}
      </div>
    </div>
  ) : (
    // Desktop: side-by-side
    <div style={{
      width: 680,
      maxHeight: '85vh',
      display: 'flex', flexDirection: 'row',
      backgroundColor: '#fff', borderRadius: 8,
      boxShadow: '0 2px 12px ${SF.overlayDarkLight}, 0 0 0 1px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      {/* Left: Notifications */}
      <div style={{
        width: 380, borderRight: '1px solid #e4e6eb',
        display: 'flex', flexDirection: 'column',
        maxHeight: '85vh', overflow: 'hidden',
      }}>
        {notifsPanel}
      </div>
      {/* Right: Bookmarks */}
      <div style={{
        width: 300,
        display: 'flex', flexDirection: 'column',
        maxHeight: '85vh', overflow: 'hidden',
      }}>
        {bookmarksPanel}
      </div>
    </div>
  );

  // On mobile, render as a fixed full-screen overlay instead of a Popover
  if (isMobile) {
    return (
      <>
        <div
          className="header-2thier-item"
          role="button" tabIndex={0} onClick={() => setIsOpen(!isOpen)}
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
              borderRadius: 8, backgroundColor: FB.leadOrange,
              color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #1F3B53',
              animation: hasNew ? 'notif-pop 0.3s ease' : undefined,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
        {isOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1050,
            backgroundColor: '#fff',
          }}>
            {panelContent}
          </div>
        )}
        <style>{`
          @keyframes notif-pop {
            0% { transform: scale(0.5); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
          }
        `}</style>
      </>
    );
  }

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
            borderRadius: 8, backgroundColor: FB.leadOrange,
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
