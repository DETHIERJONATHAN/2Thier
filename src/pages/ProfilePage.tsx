import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useNavigate, useParams } from 'react-router-dom';
import { useModuleNavigation } from '../contexts/WallNavigationContext';
import { Avatar, Spin, message, Modal, Form, Input, Dropdown } from 'antd';
import {
  UserOutlined, CameraOutlined, MailOutlined, PhoneOutlined,
  HomeOutlined, BankOutlined, TeamOutlined, CrownOutlined,
  SettingOutlined, EditOutlined,
  LinkOutlined, SafetyCertificateOutlined, SwapOutlined,
  EllipsisOutlined, DragOutlined, CheckOutlined, CloseOutlined,
  DeleteOutlined, PlayCircleOutlined, VideoCameraOutlined, PictureOutlined,
  ShopOutlined, UserAddOutlined, UserDeleteOutlined, MessageOutlined, StopOutlined,
} from '@ant-design/icons';
import { WallPostCard, WallPostData } from './DashboardPageUnified';
import HiveLiveTimeline from '../components/zhiive/HiveLiveTimeline';

/* ═══════════════════════════════════════════════════════════════
   FACEBOOK COLORS — exactement les mêmes tokens
   ═══════════════════════════════════════════════════════════════ */
const FB = {
  bg: '#f0f2f5',
  white: '#ffffff',
  text: '#050505',
  textSecondary: '#65676b',
  blue: '#1877f2',
  blueHover: '#166fe5',
  border: '#ced0d4',
  btnGray: '#e4e6eb',
  btnGrayHover: '#d8dadf',
  activeBlue: '#e7f3ff',
  shadow: '0 1px 2px rgba(0,0,0,0.1)',
  shadowHover: '0 2px 8px rgba(0,0,0,0.1)',
  radius: 8,
};

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE HOOK
   ═══════════════════════════════════════════════════════════════ */
const useScreenSize = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1024, width };
};

/* ═══════════════════════════════════════════════════════════════ */
const ROLE_MAP: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  super_admin: { label: 'Super Administrateur', color: '#d4a20a', icon: <CrownOutlined /> },
  admin: { label: 'Administrateur', color: FB.blue },
  manager: { label: 'Manager', color: '#0891b2' },
  commercial: { label: 'Commercial', color: '#16a34a' },
  user: { label: 'Utilisateur', color: FB.textSecondary },
  support: { label: 'Support', color: '#7c3aed' },
  client: { label: 'Client', color: '#ea580c' },
  prestataire: { label: 'Prestataire', color: '#db2777' },
};

/* ── Facebook-style section card ────────────────────────────── */
const FBCard: React.FC<{
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}> = ({ title, onEdit, children }) => (
  <div style={{
    background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
    padding: 16, marginBottom: 16,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: FB.text }}>{title}</span>
      {onEdit && (
        <span
          onClick={onEdit}
          style={{
            width: 36, height: 36, borderRadius: '50%', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: 'transparent', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = FB.bg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <EditOutlined style={{ color: FB.textSecondary, fontSize: 16 }} />
        </span>
      )}
    </div>
    {children}
  </div>
);

/* ── Info line (icon + text) ─────────────────────────────────── */
const InfoLine: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
    <span style={{ color: FB.textSecondary, fontSize: 20, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 15, color: FB.text, wordBreak: 'break-word' }}>{children}</span>
  </div>
);

/* ── Facebook Button ─────────────────────────────────────────── */
const FBButton: React.FC<{
  primary?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  mobileIconOnly?: boolean;
  isMobile?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ primary, icon, children, mobileIconOnly, isMobile, onClick, style }) => {
  const [hover, setHover] = useState(false);
  const showLabel = !(mobileIconOnly && isMobile);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 36, padding: showLabel && children ? '0 16px' : '0 12px',
        borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 15, fontWeight: 600, transition: 'background 0.15s',
        background: primary ? (hover ? FB.blueHover : FB.blue) : (hover ? FB.btnGrayHover : FB.btnGray),
        color: primary ? '#fff' : FB.text,
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}{showLabel && children}
    </button>
  );
};

/* ── Photo cell with hover overlay ─────────────────────────── */
const PhotoCell: React.FC<{
  photo: { id: string; url: string };
  onView: () => void;
  onDelete: () => void;
}> = ({ photo, onView, onDelete }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        position: 'relative', paddingBottom: '100%', overflow: 'hidden',
        borderRadius: 4, cursor: 'pointer',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onView}
    >
      <img
        src={photo.url}
        alt=""
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
        }}
      />
      {hover && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          padding: 6,
        }}>
          <span
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <DeleteOutlined style={{ fontSize: 13 }} />
          </span>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════════════════════════ */
const ProfilePage = () => {
  const { user, loading: userLoading, refetchUser, isSuperAdmin, currentOrganization, organizations, selectOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const navigate = useNavigate();
  const { userId: viewUserId } = useParams<{ userId?: string }>();
  const isViewingOther = !!viewUserId && viewUserId !== user?.id;
  const { moduleNavigate } = useModuleNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const orgLogoInputRef = useRef<HTMLInputElement>(null);
  const orgLogoTargetId = useRef<string | null>(null);
  const { isMobile, width } = useScreenSize();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', avatarUrl: '', coverUrl: '', coverPositionY: 50, address: '', vatNumber: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverDragging, setCoverDragging] = useState(false);
  const [coverPosY, setCoverPosY] = useState(50);
  const [coverRepositioning, setCoverRepositioning] = useState(false);
  const coverContainerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartPos = useRef(50);
  const [activeTab, setActiveTab] = useState('about');
  const [changingOrg, setChangingOrg] = useState(false);
  const [wallPosts, setWallPosts] = useState<WallPostData[]>([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [wallCursor, setWallCursor] = useState<string | null>(null);
  const [wallHasMore, setWallHasMore] = useState(true);
  const [userPhotos, setUserPhotos] = useState<{ id: string; url: string; category: string; createdAt: string }[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIsVideo, setLightboxIsVideo] = useState(false);
  const [photosTab, setPhotosTab] = useState<string>('all');
  const [userMedia, setUserMedia] = useState<{ id: string; postId: string; url: string; mediaType: string; category: string | null; caption: string; likesCount: number; commentsCount: number; createdAt: string }[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<string>('all'); // 'all', 'image', 'video'
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<string | null>(null);

  // ═══ Friend request state ═══
  const [friendStatus, setFriendStatus] = useState<string | null>(null); // null | 'pending' | 'accepted' | 'blocked'
  const [friendDirection, setFriendDirection] = useState<string | null>(null); // 'sent' | 'received'
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  // ═══ Colony invite state ═══
  const [inviteLoading, setInviteLoading] = useState(false);
  const viewedUserOrgId = (profile as any)?.organization?.id;
  const isAlreadyInMyColony = !!viewedUserOrgId && viewedUserOrgId === currentOrganization?.id;
  const canInviteToColony = isViewingOther && currentOrganization && !isAlreadyInMyColony && (currentOrganization.role === 'admin' || currentOrganization.role === 'super_admin' || isSuperAdmin);

  // Business: créer une Colony (admin d'une org existante ne peut pas, mais un simple membre oui)
  const canFoundColony = !isSuperAdmin && (!currentOrganization || (currentOrganization.role !== 'admin' && currentOrganization.role !== 'super_admin'));
  const [isCreateOrgModalVisible, setIsCreateOrgModalVisible] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgForm] = Form.useForm();

  const handleCreateOrganization = async (values: { name: string; address: string; vatNumber: string; phone: string; email: string; description?: string }) => {
    setIsCreatingOrg(true);
    try {
      await api.post('/api/organizations/create-my-org', {
        name: values.name,
        address: values.address,
        vatNumber: values.vatNumber,
        phone: values.phone,
        email: values.email,
        description: values.description || '',
      });
      message.success(`Colony "${values.name}" créée avec succès !`);
      setIsCreateOrgModalVisible(false);
      orgForm.resetFields();
      window.location.reload();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || "Erreur lors de la création de la Colony";
      message.error(msg);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Upload logo organisation
  const [orgLogoUploading, setOrgLogoUploading] = useState(false);
  const handleOrgLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const orgId = orgLogoTargetId.current;
    if (!file || !orgId) return;
    setOrgLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const resp: any = await api.post(`/api/organizations/${orgId}/logo`, formData);
      if (resp.success) {
        message.success('Logo mis à jour !');
        if (refetchUser) await refetchUser();
      }
    } catch {
      message.error("Erreur lors de l'upload du logo.");
    } finally {
      setOrgLogoUploading(false);
      if (orgLogoInputRef.current) orgLogoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const endpoint = isViewingOther ? `/api/profile/user/${viewUserId}` : '/api/profile';
    api.get(endpoint).then((r: any) => {
      setProfile(r);
      setCoverPosY(r.coverPositionY ?? 50);
      setLoading(false);
    }).catch(() => { message.error('Impossible de charger le profil.'); setLoading(false); });
  }, [user, api, viewUserId, isViewingOther]);

  /* ── Fetch photos when Photos tab is activated ──────────── */
  const fetchPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const r: any = await api.get('/api/profile/photos');
      setUserPhotos(r.photos || []);
    } catch { /* silently fail */ }
    finally { setPhotosLoading(false); }
  }, [api]);

  useEffect(() => {
    if (activeTab === 'photos' && user) fetchPhotos();
  }, [activeTab, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const deletePhoto = async (photoId: string) => {
    try {
      await api.delete(`/api/profile/photos/${photoId}`);
      setUserPhotos(prev => prev.filter(p => p.id !== photoId));
      message.success('Photo supprimée');
    } catch { message.error('Erreur lors de la suppression'); }
  };

  /* ── Fetch media (images + videos from WallPosts) ────────── */
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (isViewingOther && viewUserId) params.set('userId', viewUserId);
      if (mediaFilter !== 'all') params.set('type', mediaFilter);
      if (mediaCategoryFilter) params.set('category', mediaCategoryFilter);
      const r: any = await api.get(`/api/profile/media?${params}`);
      setUserMedia(r.media || []);
    } catch { /* silently fail */ }
    finally { setMediaLoading(false); }
  }, [api, mediaFilter, mediaCategoryFilter, isViewingOther, viewUserId]);

  useEffect(() => {
    if (activeTab === 'media' && user) fetchMedia();
  }, [activeTab, user, fetchMedia]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Cover drag-to-reposition ────────────────────────────── */
  const handleCoverDragStart = useCallback((clientY: number) => {
    setCoverDragging(true);
    dragStartY.current = clientY;
    dragStartPos.current = coverPosY;
  }, [coverPosY]);

  const handleCoverDragMove = useCallback((clientY: number) => {
    if (!coverContainerRef.current) return;
    const containerH = coverContainerRef.current.clientHeight;
    const deltaPixels = clientY - dragStartY.current;
    // Convert pixel delta to percentage (invert: drag down = image goes up = posY decreases)
    const deltaPct = -(deltaPixels / containerH) * 100;
    const newPos = Math.min(100, Math.max(0, dragStartPos.current + deltaPct));
    setCoverPosY(newPos);
  }, []);

  const handleCoverDragEnd = useCallback(() => {
    setCoverDragging(false);
  }, []);

  // Mouse events
  useEffect(() => {
    if (!coverRepositioning) return;
    const onMove = (e: MouseEvent) => { if (coverDragging) handleCoverDragMove(e.clientY); };
    const onUp = () => { if (coverDragging) handleCoverDragEnd(); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [coverRepositioning, coverDragging, handleCoverDragMove, handleCoverDragEnd]);

  // Touch events
  useEffect(() => {
    if (!coverRepositioning) return;
    const onMove = (e: TouchEvent) => { if (coverDragging && e.touches[0]) handleCoverDragMove(e.touches[0].clientY); };
    const onEnd = () => { if (coverDragging) handleCoverDragEnd(); };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
  }, [coverRepositioning, coverDragging, handleCoverDragMove, handleCoverDragEnd]);

  const saveCoverPosition = async () => {
    try {
      await api.put('/api/profile/cover-position', { positionY: Math.round(coverPosY * 100) / 100 });
      setProfile(p => ({ ...p, coverPositionY: coverPosY }));
      setCoverRepositioning(false);
      message.success('Position de la couverture enregistrée !');
    } catch { message.error("Erreur lors de la sauvegarde."); }
  };

  const cancelCoverPosition = () => {
    setCoverPosY(profile.coverPositionY ?? 50);
    setCoverRepositioning(false);
  };

  /* ── Wall feed fetch ─────────────────────────────────────── */
  const fetchWallPosts = useCallback(async (reset = false) => {
    if (wallLoading) return;
    setWallLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '10');
      if (!reset && wallCursor) params.set('cursor', wallCursor);
      const r: any = await api.get(`/api/wall/my-feed?${params.toString()}`);
      const posts: WallPostData[] = r.posts || [];
      setWallPosts(prev => reset ? posts : [...prev, ...posts]);
      setWallCursor(r.nextCursor || null);
      setWallHasMore(!!r.nextCursor);
    } catch { /* silently fail */ }
    finally { setWallLoading(false); }
  }, [api, wallCursor, wallLoading]);

  useEffect(() => {
    if (user) fetchWallPosts(true);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshWall = useCallback(() => {
    setWallCursor(null);
    setWallHasMore(true);
    setWallPosts([]);
    setTimeout(() => fetchWallPosts(true), 100);
  }, [fetchWallPosts]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', e.target.files[0]);
      const r: any = await api.post('/api/profile/avatar', fd);
      const newUrl = r.avatarUrl ? `${r.avatarUrl}?t=${Date.now()}` : '';
      setProfile(p => ({ ...p, avatarUrl: newUrl }));
      message.success('Photo mise à jour !');
      refetchUser?.();
    } catch { message.error("Erreur lors du téléversement."); }
    finally { setAvatarUploading(false); }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('cover', e.target.files[0]);
      const r: any = await api.post('/api/profile/cover', fd);
      // Add cache-buster to force browser to reload the new image
      const newUrl = r.coverUrl ? `${r.coverUrl}?t=${Date.now()}` : '';
      setProfile(p => ({ ...p, coverUrl: newUrl, coverPositionY: 50 }));
      setCoverPosY(50);
      setCoverRepositioning(false);
      message.success('Photo de couverture mise à jour !');
    } catch { message.error("Erreur lors du téléversement de la couverture."); }
    finally { setCoverUploading(false); }
  };

  const handleOrgChange = async (orgId: string) => {
    setChangingOrg(true);
    try { await selectOrganization(orgId); message.success('Colony changée'); }
    catch { message.error("Erreur"); }
    finally { setChangingOrg(false); }
  };

  // ═══ Fetch friendship status when viewing another profile ═══
  useEffect(() => {
    if (!isViewingOther || !viewUserId) return;
    (async () => {
      try {
        const r: any = await api.get(`/api/friends/status/${viewUserId}`);
        setFriendStatus(r.status || null);
        setFriendDirection(r.direction || null);
        setFriendshipId(r.friendshipId || null);
      } catch {
        setFriendStatus(null);
      }
    })();
  }, [api, isViewingOther, viewUserId]);

  // ═══ Friend action handlers ═══
  const handleFriendAction = async () => {
    if (!viewUserId || friendLoading) return;
    setFriendLoading(true);
    try {
      if (friendStatus === 'accepted') {
        // Unfriend
        if (friendshipId) await api.delete(`/api/friends/${friendshipId}`);
        setFriendStatus(null);
        setFriendshipId(null);
        setFriendDirection(null);
        message.success('Ami retiré');
      } else if (friendStatus === 'pending' && friendDirection === 'received') {
        // Accept request
        if (friendshipId) await api.post(`/api/friends/${friendshipId}/accept`);
        setFriendStatus('accepted');
        message.success('Demande acceptée ! Vous êtes maintenant amis 🎉');
      } else if (friendStatus === 'pending' && friendDirection === 'sent') {
        // Cancel request
        if (friendshipId) await api.delete(`/api/friends/${friendshipId}`);
        setFriendStatus(null);
        setFriendshipId(null);
        setFriendDirection(null);
        message.info('Demande annulée');
      } else {
        // Send friend request
        const r: any = await api.post('/api/friends/request', { userId: viewUserId });
        if (r.friendship) {
          setFriendStatus('pending');
          setFriendDirection('sent');
          setFriendshipId(r.friendship.id);
        }
        message.success('Demande d\'ami envoyée ! 🐝');
      }
    } catch {
      message.error('Erreur lors de l\'action');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleOpenMessenger = async () => {
    if (!viewUserId) return;
    try {
      const res: any = await api.post('/api/messenger/conversations', { participantIds: [viewUserId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
      }
    } catch {
      message.error('Erreur lors de l\'ouverture du chat');
    }
  };

  const handleBlockUser = async () => {
    if (!viewUserId || friendLoading) return;
    Modal.confirm({
      title: 'Bloquer cet utilisateur ?',
      content: 'Cette personne ne pourra plus voir vos publications et ne pourra plus vous contacter.',
      okText: 'Bloquer',
      cancelText: 'Annuler',
      okButtonProps: { danger: true },
      onOk: async () => {
        setFriendLoading(true);
        try {
          await api.post('/api/friends/block-user', { userId: viewUserId });
          setFriendStatus('blocked');
          message.success('Utilisateur bloqué');
        } catch {
          message.error('Erreur');
        } finally {
          setFriendLoading(false);
        }
      },
    });
  };

  const handleBlockColony = async () => {
    const orgId = (profile as any)?.organization?.id;
    const orgName = (profile as any)?.organization?.name;
    if (!orgId || friendLoading) return;
    Modal.confirm({
      title: `Bloquer la Colony « ${orgName} » ?`,
      content: 'Tous les contenus de cette Colony seront masqués de votre fil.',
      okText: 'Bloquer la Colony',
      cancelText: 'Annuler',
      okButtonProps: { danger: true },
      onOk: async () => {
        setFriendLoading(true);
        try {
          await api.post('/api/friends/block-org', { organizationId: orgId });
          message.success(`Colony « ${orgName} » bloquée`);
        } catch {
          message.error('Erreur');
        } finally {
          setFriendLoading(false);
        }
      },
    });
  };

  // Helper to get friend button label & icon
  const getFriendButtonProps = () => {
    if (friendStatus === 'accepted') return { label: 'Ami ✓', icon: <CheckOutlined />, primary: true };
    if (friendStatus === 'pending' && friendDirection === 'sent') return { label: 'Demande envoyée', icon: <UserAddOutlined />, primary: false };
    if (friendStatus === 'pending' && friendDirection === 'received') return { label: 'Accepter la demande', icon: <UserAddOutlined />, primary: true };
    if (friendStatus === 'blocked') return { label: 'Bloqué', icon: <StopOutlined />, primary: false };
    return { label: 'Ajouter en ami', icon: <UserAddOutlined />, primary: true };
  };

  // ═══ Invite to Colony handler ═══
  const handleInviteToColony = async (roleName: string = 'user') => {
    if (!viewUserId || !currentOrganization) return;
    setInviteLoading(true);
    try {
      const result: any = await api.post('/api/invitations/invite-user', {
        targetUserId: viewUserId,
        roleName,
      });
      message.success(result?.message || 'Invitation envoyée !');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Erreur lors de l'envoi de l'invitation";
      message.error(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  // ═══ Profile ⋯ menu items ═══
  const profileMoreMenuItems = useMemo(() => {
    const items: any[] = [];
    if (canInviteToColony) {
      items.push({
        key: 'invite-colony',
        icon: <TeamOutlined />,
        label: inviteLoading ? 'Invitation en cours...' : `Inviter dans ${currentOrganization?.name || 'ma Colony'}`,
        disabled: inviteLoading,
        onClick: () => handleInviteToColony('user'),
      });
    }
    if (friendStatus !== 'blocked') {
      items.push({ key: 'block-user', icon: <StopOutlined />, label: 'Bloquer la personne', danger: true, onClick: handleBlockUser });
    }
    const viewedOrgId = (profile as any)?.organization?.id;
    const viewedOrgName = (profile as any)?.organization?.name;
    if (viewedOrgId && viewedOrgId !== currentOrganization?.id) {
      items.push({ key: 'block-colony', icon: <StopOutlined />, label: `Bloquer la Colony « ${viewedOrgName} »`, danger: true, onClick: handleBlockColony });
    }
    return items;
  }, [canInviteToColony, inviteLoading, currentOrganization?.name, currentOrganization?.id, friendStatus, profile, viewUserId]);

  if (userLoading || loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const displayRole = isViewingOther ? ((profile as any)?.role || 'user') : (user?.role || 'user');
  const rl = ROLE_MAP[displayRole] || { label: displayRole || 'Utilisateur', color: FB.textSecondary };
  const displayOrg = isViewingOther ? (profile as any)?.organization : currentOrganization;
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Utilisateur';

  const tabs = [
    { key: 'about', label: 'À propos' },
    { key: 'publications', label: 'Publications' },
    { key: 'media', label: 'Médias' },
    { key: 'photos', label: 'Photos' },
    { key: 'hivelive', label: 'Hive Live' },
  ];

  /* ── Responsive dimensions ─────────────────────────────────── */
  const coverH = isMobile ? 200 : 350;
  const avatarSize = isMobile ? 120 : 168;
  const avatarOverlap = isMobile ? 60 : 40;
  const nameFontSize = isMobile ? 24 : 32;
  const cameraBtnSize = isMobile ? 32 : 36;

  return (
    <>
    <div style={{ background: FB.bg, minHeight: '100vh' }}>

      {/* ════════ TOP WHITE SECTION (cover + name + tabs) ════════ */}
      <div style={{ background: FB.white, boxShadow: FB.shadow }}>
        <div style={{ width: '100%', padding: isMobile ? 0 : '0 16px' }}>

          {/* Cover photo */}
          <div
            ref={coverContainerRef}
            onMouseDown={e => { if (coverRepositioning) { e.preventDefault(); handleCoverDragStart(e.clientY); } }}
            onTouchStart={e => { if (coverRepositioning && e.touches[0]) { handleCoverDragStart(e.touches[0].clientY); } }}
            style={{
              height: coverH, borderRadius: isMobile ? 0 : '0 0 8px 8px', overflow: 'hidden',
              position: 'relative',
              cursor: coverRepositioning ? (coverDragging ? 'grabbing' : 'grab') : 'default',
              userSelect: coverRepositioning ? 'none' : undefined,
              background: !profile.coverUrl
                ? 'linear-gradient(135deg, #1a4951 0%, #2C5967 30%, #3d7a8a 60%, #4a9aad 100%)'
                : '#000',
            }}
          >
            {/* Cover image — <img> for object-position control */}
            {profile.coverUrl && (
              <img
                src={profile.coverUrl}
                alt="Couverture"
                draggable={false}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: `center ${coverPosY}%`,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Repositioning overlay */}
            {coverRepositioning && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 20px',
                  borderRadius: 8, fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <DragOutlined /> Glissez pour repositionner
                </div>
              </div>
            )}

            {/* Bottom action buttons */}
            {!isViewingOther && <div style={{
              position: 'absolute', bottom: isMobile ? 8 : 16, right: isMobile ? 8 : 16,
              display: 'flex', gap: 8,
            }}>
              {coverRepositioning ? (
                <>
                  <div onClick={cancelCoverPosition} style={{
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    padding: isMobile ? '4px 10px' : '6px 16px',
                    borderRadius: 6, fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}><CloseOutlined /> Annuler</div>
                  <div onClick={saveCoverPosition} style={{
                    background: FB.blue, color: '#fff',
                    padding: isMobile ? '4px 10px' : '6px 16px',
                    borderRadius: 6, fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}><CheckOutlined /> Enregistrer</div>
                </>
              ) : (
                <>
                  {profile.coverUrl && (
                    <div onClick={() => setCoverRepositioning(true)} style={{
                      background: 'rgba(0,0,0,0.5)', color: '#fff',
                      padding: isMobile ? '4px 10px' : '6px 16px',
                      borderRadius: 6, fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}><DragOutlined />{!isMobile && ' Repositionner'}</div>
                  )}
                  <div onClick={() => coverInputRef.current?.click()} style={{
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    padding: isMobile ? '4px 10px' : '6px 16px',
                    borderRadius: 6, fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>{coverUploading ? <Spin size="small" /> : <CameraOutlined />}{!isMobile && ' Modifier la couverture'}</div>
                </>
              )}
            </div>}
            {!isViewingOther && <input type="file" accept="image/*" onChange={handleCoverChange} ref={coverInputRef} style={{ display: 'none' }} />}
          </div>

          {/* ─── MOBILE: avatar centré au-dessus du nom ─── */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
              {/* Avatar centré, chevauchant la cover */}
              <div style={{ marginTop: -avatarOverlap, position: 'relative', zIndex: 2 }}>
                <Avatar
                  size={avatarSize}
                  src={profile.avatarUrl || undefined}
                  icon={!profile.avatarUrl ? <UserOutlined style={{ fontSize: 48 }} /> : undefined}
                  style={{
                    border: '4px solid white', background: '#2C5967',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 48,
                  }}
                />
                {!isViewingOther && <span
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 4, right: 4,
                    width: cameraBtnSize, height: cameraBtnSize, borderRadius: '50%',
                    background: FB.btnGray,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  {avatarUploading ? <Spin size="small" /> : <CameraOutlined style={{ fontSize: 14, color: FB.text }} />}
                </span>}
                {!isViewingOther && <input type="file" accept="image/*" onChange={handleAvatarChange} ref={fileInputRef} style={{ display: 'none' }} />}
              </div>

              {/* Nom + rôle centré */}
              <h1 style={{
                fontSize: nameFontSize, fontWeight: 700, color: FB.text,
                margin: '8px 0 0', textAlign: 'center', lineHeight: 1.2,
              }}>{fullName}</h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                flexWrap: 'wrap', justifyContent: 'center',
                fontSize: 14, color: FB.textSecondary,
              }}>
                <span style={{ color: rl.color, fontWeight: 600 }}>{rl.icon} {rl.label}</span>
                {displayOrg && (
                  <>
                    <span>·</span>
                    <span onClick={() => navigate(`/colony/${displayOrg.id}`)} style={{ cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                    ><TeamOutlined style={{ marginRight: 4 }} />{displayOrg.name}</span>
                  </>
                )}
              </div>
              {!isViewingOther ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12, width: '100%', justifyContent: 'center' }}>
                  <FBButton primary icon={<SettingOutlined />} onClick={() => moduleNavigate('/settings')} isMobile={isMobile} mobileIconOnly>
                    Paramètres
                  </FBButton>
                  <FBButton icon={<EditOutlined />} onClick={() => moduleNavigate('/settings')} isMobile={isMobile} mobileIconOnly>
                    Modifier
                  </FBButton>
                  {canFoundColony && <FBButton icon={<ShopOutlined />} onClick={() => setIsCreateOrgModalVisible(true)} isMobile={isMobile} mobileIconOnly
                    style={{ background: '#0f766e', color: '#fff' }}>
                    Business
                  </FBButton>}
                  <FBButton icon={<EllipsisOutlined />} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12, width: '100%', justifyContent: 'center' }}>
                  {(() => { const fp = getFriendButtonProps(); return (
                    <FBButton primary={fp.primary} icon={fp.icon} onClick={handleFriendAction} isMobile={isMobile}
                      style={friendStatus === 'blocked' ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                      {friendLoading ? <Spin size="small" /> : fp.label}
                    </FBButton>
                  ); })()}
                  {friendStatus === 'pending' && friendDirection === 'received' && (
                    <FBButton icon={<CloseOutlined />} onClick={() => { if (friendshipId) api.delete(`/api/friends/${friendshipId}`).then(() => { setFriendStatus(null); setFriendshipId(null); setFriendDirection(null); message.info('Demande refusée'); }); }} isMobile={isMobile}>
                      Refuser
                    </FBButton>
                  )}
                  <FBButton icon={<MessageOutlined />} onClick={handleOpenMessenger} isMobile={isMobile} mobileIconOnly>
                    Message
                  </FBButton>
                  <Dropdown menu={{ items: profileMoreMenuItems }} trigger={['click']} placement="bottomRight">
                    <span><FBButton icon={<EllipsisOutlined />} /></span>
                  </Dropdown>
                </div>
              )}
            </div>
          ) : (
            /* ─── DESKTOP: avatar à gauche, nom à côté ─── */
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', padding: '0 16px', position: 'relative' }}>
              <div style={{ marginTop: -avatarOverlap, position: 'relative', zIndex: 2 }}>
                <Avatar
                  size={avatarSize}
                  src={profile.avatarUrl || undefined}
                  icon={!profile.avatarUrl ? <UserOutlined style={{ fontSize: 64 }} /> : undefined}
                  style={{
                    border: '4px solid white', background: '#2C5967',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 64,
                  }}
                />
                {!isViewingOther && <span
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    width: cameraBtnSize, height: cameraBtnSize, borderRadius: '50%',
                    background: FB.btnGray,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  {avatarUploading ? <Spin size="small" /> : <CameraOutlined style={{ fontSize: 16, color: FB.text }} />}
                </span>}
                {!isViewingOther && <input type="file" accept="image/*" onChange={handleAvatarChange} ref={fileInputRef} style={{ display: 'none' }} />}
              </div>

              <div style={{ marginLeft: 16, paddingBottom: 16, flex: 1, minWidth: 200 }}>
                <h1 style={{ fontSize: nameFontSize, fontWeight: 700, color: FB.text, margin: 0, lineHeight: 1.2 }}>{fullName}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap', fontSize: 15, color: FB.textSecondary }}>
                  <span style={{ color: rl.color, fontWeight: 600 }}>{rl.icon} {rl.label}</span>
                  {displayOrg && (
                    <>
                      <span>·</span>
                      <span onClick={() => navigate(`/colony/${displayOrg.id}`)} style={{ cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                      ><TeamOutlined style={{ marginRight: 4 }} />{displayOrg.name}</span>
                    </>
                  )}
                </div>
              </div>

              {!isViewingOther ? (
                <div style={{ display: 'flex', gap: 8, paddingBottom: 16, alignItems: 'flex-end' }}>
                  <FBButton primary icon={<SettingOutlined />} onClick={() => moduleNavigate('/settings')}>Paramètres</FBButton>
                  <FBButton icon={<EditOutlined />} onClick={() => moduleNavigate('/settings')}>Modifier</FBButton>
                  {canFoundColony && <FBButton icon={<ShopOutlined />} onClick={() => setIsCreateOrgModalVisible(true)}
                    style={{ background: '#0f766e', color: '#fff' }}>Business</FBButton>}
                  <FBButton icon={<EllipsisOutlined />} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, paddingBottom: 16, alignItems: 'flex-end' }}>
                  {(() => { const fp = getFriendButtonProps(); return (
                    <FBButton primary={fp.primary} icon={fp.icon} onClick={handleFriendAction}
                      style={friendStatus === 'blocked' ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                      {friendLoading ? <Spin size="small" /> : fp.label}
                    </FBButton>
                  ); })()}
                  {friendStatus === 'pending' && friendDirection === 'received' && (
                    <FBButton icon={<CloseOutlined />} onClick={() => { if (friendshipId) api.delete(`/api/friends/${friendshipId}`).then(() => { setFriendStatus(null); setFriendshipId(null); setFriendDirection(null); message.info('Demande refusée'); }); }}>
                      Refuser
                    </FBButton>
                  )}
                  <FBButton icon={<MessageOutlined />} onClick={handleOpenMessenger}>Message</FBButton>
                  <Dropdown menu={{ items: profileMoreMenuItems }} trigger={['click']} placement="bottomRight">
                    <span><FBButton icon={<EllipsisOutlined />} /></span>
                  </Dropdown>
                </div>
              )}
            </div>
          )}

          {/* Separator */}
          <div style={{ borderTop: `1px solid ${FB.border}`, margin: '0 16px' }} />

          {/* Tabs — scrollable on mobile */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: isMobile ? '0 8px' : '0 16px',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: isMobile ? '12px 12px' : '16px 16px',
                  fontSize: isMobile ? 14 : 15, fontWeight: 600, cursor: 'pointer',
                  background: 'none', border: 'none', whiteSpace: 'nowrap',
                  borderBottom: activeTab === tab.key ? '3px solid #1877f2' : '3px solid transparent',
                  color: activeTab === tab.key ? FB.blue : FB.textSecondary,
                  borderRadius: activeTab === tab.key ? 0 : '6px 6px 0 0',
                  transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.background = FB.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ BODY (gray background, responsive layout) ════════ */}
      <div style={{
        width: '100%',
        padding: isMobile ? '12px 8px 32px' : '16px 16px 40px',
      }}>
        {activeTab === 'about' && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 16,
            alignItems: 'flex-start',
          }}>

            {/* ── LEFT COLUMN (sticky on desktop) ── */}
            <div style={{
              position: isMobile ? 'static' : 'sticky',
              top: 56,
              width: isMobile ? '100%' : 360,
              flexShrink: 0,
              alignSelf: 'flex-start',
            }}>
              {/* Informations personnelles */}
              <FBCard title="Informations personnelles" onEdit={() => moduleNavigate('/settings')}>
                {profile.firstName && <InfoLine icon={<UserOutlined />}>{profile.firstName}</InfoLine>}
                {profile.lastName && <InfoLine icon={<UserOutlined />}>{profile.lastName}</InfoLine>}
                {profile.address && <InfoLine icon={<HomeOutlined />}>{profile.address}</InfoLine>}
                {!profile.firstName && !profile.lastName && !profile.address && (
                  <div style={{ padding: '12px 0', color: FB.textSecondary, fontSize: 14 }}>
                    Aucune information renseignée.
                    <span
                      onClick={() => moduleNavigate('/settings')}
                      style={{ color: FB.blue, cursor: 'pointer', marginLeft: 4, fontWeight: 500 }}
                    >
                      Ajouter
                    </span>
                  </div>
                )}
              </FBCard>

              {/* Liens */}
              <FBCard title="Liens" onEdit={!isViewingOther ? () => moduleNavigate('/settings') : undefined}>
                {displayOrg?.name && (
                  <InfoLine icon={<LinkOutlined />}>
                    <span style={{ color: FB.blue }}>{displayOrg.name.toLowerCase().replace(/\s+/g, '')}.be</span>
                  </InfoLine>
                )}
                {profile.vatNumber && (
                  <InfoLine icon={<BankOutlined />}>TVA : {profile.vatNumber}</InfoLine>
                )}
                {!profile.vatNumber && !displayOrg && (
                  <div style={{ padding: '12px 0', color: FB.textSecondary, fontSize: 14 }}>Aucun lien.</div>
                )}
              </FBCard>

              {/* Coordonnées */}
              <FBCard title="Coordonnées" onEdit={() => moduleNavigate('/settings')}>
                <InfoLine icon={<MailOutlined />}>
                  <span>E-mail : <span style={{ color: FB.blue }}>{user?.email}</span></span>
                </InfoLine>
                {profile.phoneNumber && (
                  <InfoLine icon={<PhoneOutlined />}>
                    Numéro de téléphone : {profile.phoneNumber}
                  </InfoLine>
                )}
              </FBCard>

              {/* Rôle & Colony */}
              <FBCard title="Rôle & Colony">
                <InfoLine icon={<SafetyCertificateOutlined />}>
                  <span style={{ color: rl.color, fontWeight: 600 }}>{rl.icon} {rl.label}</span>
                </InfoLine>
                {displayOrg && (
                  <InfoLine icon={<TeamOutlined />}>
                    <span onClick={() => navigate(`/colony/${displayOrg.id}`)} style={{ cursor: 'pointer', color: FB.blue }}
                      onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                    >{displayOrg.name}</span>
                  </InfoLine>
                )}
                {isSuperAdmin && (
                  <div style={{ marginTop: 4, fontSize: 13, color: FB.textSecondary }}>
                    Accès complet à toutes les fonctionnalités.
                  </div>
                )}
              </FBCard>

              {/* Colonies — visible pour tout utilisateur membre de plusieurs organisations */}
              {organizations && organizations.length > 1 && (
                <FBCard title="Mes Colonies">
                  {organizations.map(org => {
                    const isActive = currentOrganization?.id === org.id;
                    const orgLogo = (org as any).logoUrl;
                    return (
                      <div
                        key={org.id}
                        onClick={() => !isActive && !changingOrg && handleOrgChange(org.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: isActive ? 'default' : 'pointer',
                          background: isActive ? FB.activeBlue : 'transparent',
                          transition: 'background 0.15s',
                          opacity: changingOrg ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = FB.bg; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: '50%', position: 'relative',
                            background: orgLogo ? 'transparent' : (isActive ? FB.blue : FB.btnGray),
                            color: isActive ? '#fff' : FB.textSecondary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, overflow: 'hidden', flexShrink: 0,
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            orgLogoTargetId.current = org.id;
                            orgLogoInputRef.current?.click();
                          }}
                          title="Cliquer pour changer le logo"
                        >
                          {orgLogo ? (
                            <img src={orgLogo} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            org.name?.[0]?.toUpperCase() || <SwapOutlined />
                          )}
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                          >
                            <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 400, color: isActive ? FB.blue : FB.text }}>
                          {org.name}
                        </span>
                        {isActive && <span style={{ marginLeft: 'auto', fontSize: 13, color: FB.blue }}>Actif</span>}
                      </div>
                    );
                  })}
                  {/* Hidden file input pour upload logo org */}
                  <input
                    ref={orgLogoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleOrgLogoUpload}
                  />
                  {orgLogoUploading && (
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <Spin size="small" /> <span style={{ fontSize: 13, color: FB.textSecondary, marginLeft: 8 }}>Upload en cours...</span>
                    </div>
                  )}
                </FBCard>
              )}
            </div>

            {/* ── RIGHT COLUMN (scrolls infinitely) ── */}
            <div style={{ 
              flex: 1,
              minWidth: 0,
            }}>
              {/* À la une */}
              <FBCard title="À la une">
                <div style={{
                  background: FB.bg, borderRadius: 8,
                  padding: isMobile ? 20 : 32,
                  textAlign: 'center', color: FB.textSecondary, fontSize: 15,
                }}>
                  Ajoutez des éléments à la une pour mettre en avant vos réalisations.
                </div>
              </FBCard>

              {/* Résumé */}
              <FBCard title="Résumé">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 12,
                }}>
                  <div style={{ background: FB.bg, borderRadius: 8, padding: isMobile ? 16 : 20, textAlign: 'center' }}>
                    <TeamOutlined style={{ fontSize: 28, color: FB.blue }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginTop: 8 }}>
                      {displayOrg?.name || '-'}
                    </div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>Colony</div>
                  </div>
                  <div style={{ background: FB.bg, borderRadius: 8, padding: isMobile ? 16 : 20, textAlign: 'center' }}>
                    <SafetyCertificateOutlined style={{ fontSize: 28, color: rl.color }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginTop: 8 }}>{rl.label}</div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>Rôle</div>
                  </div>
                </div>
              </FBCard>

              {/* Recent publications in About tab */}
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
                  padding: 16, marginBottom: 12,
                }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: FB.text }}>Publications</span>
                  <span
                    onClick={() => setActiveTab('publications')}
                    style={{ fontSize: 14, color: FB.blue, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Voir tout
                  </span>
                </div>
                {wallPosts.length === 0 && !wallLoading && (
                  <div style={{
                    background: FB.white, borderRadius: 8, boxShadow: FB.shadow,
                    padding: 32, textAlign: 'center', color: FB.textSecondary, fontSize: 15,
                  }}>
                    Aucune publication pour le moment.
                  </div>
                )}
                {wallPosts.slice(0, 3).map(post => (
                  <WallPostCard
                    key={post.id}
                    post={post}
                    isMobile={isMobile}
                    currentUserId={user?.id || ''}
                    api={api}
                    onUpdate={refreshWall}
                  />
                ))}
                {wallPosts.length > 3 && (
                  <div
                    onClick={() => setActiveTab('publications')}
                    style={{
                      textAlign: 'center', padding: 12, fontSize: 14, fontWeight: 600,
                      color: FB.blue, cursor: 'pointer', background: FB.white,
                      borderRadius: 8, boxShadow: FB.shadow,
                    }}
                  >
                    Voir toutes les publications
                  </div>
                )}
                {wallLoading && <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'publications' && (
          <div style={{
            maxWidth: 680, margin: '0 auto',
          }}>
            {wallPosts.length === 0 && !wallLoading && (
              <div style={{
                background: FB.white, borderRadius: 8, boxShadow: FB.shadow,
                padding: 40, textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: FB.text }}>Aucune publication</div>
                <div style={{ fontSize: 15, color: FB.textSecondary, marginTop: 8 }}>
                  Vos publications sur le mur apparaîtront ici.
                </div>
              </div>
            )}
            {wallPosts.map(post => (
              <WallPostCard
                key={post.id}
                post={post}
                isMobile={isMobile}
                currentUserId={user?.id || ''}
                api={api}
                onUpdate={refreshWall}
              />
            ))}
            {wallLoading && <div style={{ textAlign: 'center', padding: 24 }}><Spin size="large" /></div>}
            {!wallLoading && wallHasMore && wallPosts.length > 0 && (
              <div
                onClick={() => fetchWallPosts(false)}
                style={{
                  textAlign: 'center', padding: 14, fontSize: 15, fontWeight: 600,
                  color: FB.blue, cursor: 'pointer', background: FB.white,
                  borderRadius: 8, boxShadow: FB.shadow, marginBottom: 16,
                }}
              >
                Charger plus de publications
              </div>
            )}
            {!wallLoading && !wallHasMore && wallPosts.length > 0 && (
              <div style={{ textAlign: 'center', padding: 16, color: FB.textSecondary, fontSize: 14 }}>
                Vous avez vu toutes vos publications.
              </div>
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Header + type filter */}
            <div style={{
              background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
              padding: '12px 16px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Médias</span>
                <span style={{ fontSize: 13, color: FB.textSecondary }}>
                  {userMedia.length} élément{userMedia.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Type filter: Tout / Images / Vidéos */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'Tout', icon: <PictureOutlined /> },
                  { key: 'image', label: 'Images', icon: <PictureOutlined /> },
                  { key: 'video', label: 'Vidéos', icon: <VideoCameraOutlined /> },
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setMediaFilter(f.key)}
                    style={{
                      padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                      background: mediaFilter === f.key ? FB.activeBlue : FB.btnGray,
                      color: mediaFilter === f.key ? FB.blue : FB.text,
                      transition: 'all 0.15s',
                    }}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter pills */}
            <div style={{
              background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
              padding: '10px 16px', marginBottom: 16,
              display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
            }}>
              <button
                type="button"
                onClick={() => setMediaCategoryFilter(null)}
                style={{
                  padding: '4px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                  background: !mediaCategoryFilter ? FB.activeBlue : FB.btnGray,
                  color: !mediaCategoryFilter ? FB.blue : FB.textSecondary,
                }}
              >
                Toutes catégories
              </button>
              {[
                { key: 'projet', label: '💼 Projet' },
                { key: 'chantier_realise', label: '🏗️ Chantier' },
                { key: 'promotion', label: '📣 Promo' },
                { key: 'conseil', label: '🎨 Conseil' },
                { key: 'actualite', label: '📰 Actu' },
                { key: 'emploi', label: '🧑‍💼 Emploi' },
                { key: 'market', label: '🛒 Market' },
              ].map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setMediaCategoryFilter(mediaCategoryFilter === cat.key ? null : cat.key)}
                  style={{
                    padding: '4px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                    background: mediaCategoryFilter === cat.key ? FB.activeBlue : FB.btnGray,
                    color: mediaCategoryFilter === cat.key ? FB.blue : FB.textSecondary,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Media grid */}
            {mediaLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
            ) : userMedia.length === 0 ? (
              <div style={{
                background: FB.white, borderRadius: 8, boxShadow: FB.shadow,
                padding: 40, textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>
                  {mediaFilter === 'video' ? '🎬' : mediaFilter === 'image' ? '📷' : '🖼️'}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: FB.text }}>
                  Aucun{mediaFilter === 'video' ? 'e vidéo' : mediaFilter === 'image' ? 'e image' : ' média'}
                </div>
                <div style={{ fontSize: 15, color: FB.textSecondary, marginTop: 8 }}>
                  {mediaCategoryFilter
                    ? 'Aucune publication avec média dans cette catégorie.'
                    : 'Les images et vidéos de vos publications apparaîtront ici.'}
                </div>
              </div>
            ) : (
              <div style={{
                background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
                padding: 8,
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                  gap: 4,
                }}>
                  {userMedia.map(item => (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative', paddingBottom: '100%', overflow: 'hidden',
                        borderRadius: 4, cursor: 'pointer',
                        background: '#f0f0f0',
                      }}
                      onClick={() => { setLightboxUrl(item.url); setLightboxIsVideo(item.mediaType === 'video'); }}
                    >
                      {item.mediaType === 'video' ? (
                        <>
                          <video
                            src={item.url}
                            style={{
                              position: 'absolute', top: 0, left: 0,
                              width: '100%', height: '100%', objectFit: 'cover',
                            }}
                            muted
                            preload="metadata"
                          />
                          <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <PlayCircleOutlined style={{ color: '#fff', fontSize: 22 }} />
                          </div>
                        </>
                      ) : (
                        <img
                          src={item.url}
                          alt=""
                          loading="lazy"
                          style={{
                            position: 'absolute', top: 0, left: 0,
                            width: '100%', height: '100%', objectFit: 'cover',
                          }}
                        />
                      )}
                      {/* Overlay with stats */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        padding: '12px 6px 4px',
                        display: 'flex', gap: 8, color: '#fff', fontSize: 11,
                      }}>
                        <span>❤️ {item.likesCount}</span>
                        <span>💬 {item.commentsCount}</span>
                      </div>
                      {/* Category badge */}
                      {item.category && (
                        <div style={{
                          position: 'absolute', top: 4, left: 4,
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        }}>
                          {item.category === 'projet' ? '💼' : item.category === 'chantier_realise' ? '🏗️' : item.category === 'promotion' ? '📣' : item.category === 'conseil' ? '🎨' : item.category === 'actualite' ? '📰' : item.category === 'emploi' ? '🧑‍💼' : item.category === 'market' ? '🛒' : '📌'} {item.category.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Category sub-tabs */}
            <div style={{
              background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
              padding: '12px 16px', marginBottom: 16,
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: FB.text, marginRight: 8 }}>Photos</span>
              {[
                { key: 'all', label: 'Toutes' },
                { key: 'profile', label: 'Photos de profil' },
                { key: 'cover', label: 'Photos de couverture' },
                { key: 'wall', label: 'Publications' },
              ].map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setPhotosTab(cat.key)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 600,
                    background: photosTab === cat.key ? FB.activeBlue : FB.btnGray,
                    color: photosTab === cat.key ? FB.blue : FB.text,
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {photosLoading && (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
            )}

            {!photosLoading && (() => {
              const CATEGORY_LABELS: Record<string, string> = {
                profile: 'Photos de profil',
                cover: 'Photos de couverture',
                wall: 'Publications',
                other: 'Autres',
              };

              const filtered = photosTab === 'all' ? userPhotos : userPhotos.filter(p => p.category === photosTab);

              if (filtered.length === 0) {
                return (
                  <div style={{
                    background: FB.white, borderRadius: 8, boxShadow: FB.shadow,
                    padding: 40, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: FB.text }}>Aucune photo</div>
                    <div style={{ fontSize: 15, color: FB.textSecondary, marginTop: 8 }}>
                      Vos photos de profil, couverture et publications apparaîtront ici.
                    </div>
                  </div>
                );
              }

              if (photosTab !== 'all') {
                // Single category grid
                return (
                  <div style={{
                    background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
                    padding: 16,
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                      gap: 4,
                    }}>
                    {filtered.map(photo => (
                        <PhotoCell
                          key={photo.id}
                          photo={photo}
                          onView={() => setLightboxUrl(photo.url)}
                          onDelete={() => deletePhoto(photo.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              // "All" view — grouped by category
              const grouped: Record<string, typeof filtered> = {};
              for (const p of filtered) {
                const cat = p.category || 'other';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(p);
              }

              return Object.entries(grouped).map(([cat, photos]) => (
                <div
                  key={cat}
                  style={{
                    background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
                    padding: 16, marginBottom: 16,
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: FB.text }}>
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                    <span
                      onClick={() => setPhotosTab(cat)}
                      style={{ fontSize: 14, color: FB.blue, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Voir tout
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                    gap: 4,
                  }}>
                  {photos.slice(0, isMobile ? 4 : 10).map(photo => (
                      <PhotoCell
                        key={photo.id}
                        photo={photo}
                        onView={() => setLightboxUrl(photo.url)}
                        onDelete={() => deletePhoto(photo.id)}
                      />
                    ))}
                  </div>
                </div>
              ));
            })()}

            {/* Lightbox overlay */}
            {lightboxUrl && (
              <div
                onClick={() => { setLightboxUrl(null); setLightboxIsVideo(false); }}
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.9)', zIndex: 10000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'zoom-out',
                }}
              >
                {lightboxIsVideo ? (
                  <video
                    src={lightboxUrl}
                    controls
                    autoPlay
                    onClick={e => e.stopPropagation()}
                    style={{
                      maxWidth: '90vw', maxHeight: '90vh',
                      objectFit: 'contain', borderRadius: 8,
                      cursor: 'default',
                    }}
                  />
                ) : (
                  <img
                    src={lightboxUrl}
                    alt=""
                    onClick={e => e.stopPropagation()}
                    style={{
                      maxWidth: '90vw', maxHeight: '90vh',
                      objectFit: 'contain', borderRadius: 8,
                      cursor: 'default',
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => { setLightboxUrl(null); setLightboxIsVideo(false); }}
                  style={{
                    position: 'absolute', top: 20, right: 20,
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    color: '#fff', fontSize: 20, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <CloseOutlined />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hivelive' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <HiveLiveTimeline
              userId={viewUserId || user?.id || ''}
              isOwner={!isViewingOther}
            />
          </div>
        )}
      </div>
    </div>
    <Modal
      title="Fonder votre Colony"
      open={isCreateOrgModalVisible}
      onCancel={() => setIsCreateOrgModalVisible(false)}
      footer={null}
      destroyOnClose
    >
      <Form form={orgForm} layout="vertical" onFinish={handleCreateOrganization}>
        <Form.Item
          label="Nom de la Colony"
          name="name"
          rules={[
            { required: true, message: "Le nom de la Colony est requis" },
            { min: 2, message: 'Le nom doit faire au moins 2 caractères' }
          ]}
        >
          <Input placeholder="Ex: Mon Entreprise SARL" />
        </Form.Item>
        <Form.Item
          label="Adresse postale"
          name="address"
          rules={[
            { required: true, message: "L'adresse est requise" },
            { min: 5, message: 'Adresse minimum 5 caractères' }
          ]}
        >
          <Input placeholder="Ex: Rue de la Loi 16, 1000 Bruxelles" />
        </Form.Item>
        <Form.Item
          label="Numéro de TVA"
          name="vatNumber"
          rules={[
            { required: true, message: 'Le numéro de TVA est requis' },
            { min: 2, message: 'TVA minimum 2 caractères' }
          ]}
        >
          <Input placeholder="Ex: BE0123456789" />
        </Form.Item>
        <Form.Item
          label="Téléphone"
          name="phone"
          rules={[
            { required: true, message: 'Le téléphone est requis' },
            { min: 5, message: 'Téléphone minimum 5 caractères' },
            { pattern: /^[\d\s\-+().]+$/, message: 'Format de téléphone invalide' }
          ]}
        >
          <Input placeholder="Ex: +32 2 123 45 67" />
        </Form.Item>
        <Form.Item
          label="Email de contact"
          name="email"
          rules={[
            { required: true, message: "L'email est requis" },
            { type: 'email', message: 'Adresse email invalide' }
          ]}
        >
          <Input placeholder="Ex: contact@monentreprise.be" />
        </Form.Item>
        <Form.Item label="Description (optionnel)" name="description">
          <Input.TextArea rows={2} placeholder="Décrivez brièvement votre Colony..." />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <button type="button" onClick={() => setIsCreateOrgModalVisible(false)}
            style={{ marginRight: 8, padding: '6px 16px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, cursor: 'pointer', fontSize: 14 }}>
            Annuler
          </button>
          <button type="submit" disabled={isCreatingOrg}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: isCreatingOrg ? 0.7 : 1 }}>
            {isCreatingOrg ? 'Création...' : "Fonder la Colony"}
          </button>
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
};

export default ProfilePage;
