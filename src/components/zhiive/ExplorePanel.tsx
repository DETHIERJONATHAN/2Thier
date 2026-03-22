import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, Input, Tag, message, Modal } from 'antd';
import {
  SearchOutlined, UserOutlined, FireOutlined, CompassOutlined,
  TeamOutlined, RiseOutlined, HeartOutlined, HeartFilled,
  CloseOutlined, MessageOutlined, SendOutlined,
  PictureOutlined, VideoCameraOutlined, PlayCircleOutlined,
  AppstoreOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { SF } from './ZhiiveTheme';
import { useZhiiveNav } from '../../contexts/ZhiiveNavContext';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';

interface GalleryItem {
  id: string;
  source: 'post' | 'story';
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  authorName: string;
  authorAvatar?: string;
  publishAsOrg?: boolean;
  caption?: string;
  authorId?: string;
  category?: string | null;
  isStory?: boolean;
  isHighlight?: boolean;
  createdAt?: string;
}

interface TrendingHashtag {
  id: string;
  name: string;
  postCount: number;
}

interface SuggestedUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  mutualFriends: number;
  isFollowing?: boolean;
  friendStatus?: string | null; // null | 'pending' | 'accepted' | 'blocked'
  friendDirection?: 'sent' | 'received' | null;
  friendshipId?: string | null;
  sameOrg?: boolean;
}

interface ExplorePanelProps {
  api: any;
  openModule?: (route: string) => void;
}

const ExplorePanel: React.FC<ExplorePanelProps> = ({ api }) => {
  // ── State ──
  const { feedMode } = useZhiiveNav();
  const { currentOrganization, user } = useAuth();
  const navigate = useNavigate();
  const isOrgMode = feedMode === 'org' && !!currentOrganization;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'gallery' | 'people' | 'hashtags'>('gallery');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedPost, setSelectedPost] = useState<GalleryItem | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // ── People tab filters ──
  const [peopleScope, setPeopleScope] = useState<'all' | 'friends' | 'org'>('all');

  // ── NEW: Gallery filters ──
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [scope, setScope] = useState<'all' | 'friends' | 'org' | 'private'>('all');
  const [sortMode, setSortMode] = useState<'popular' | 'recent'>('popular');

  // ── Like ──
  const handleLikePost = async (postId: string) => {
    // Stories can't be liked via wall reactions
    if (postId.startsWith('story-')) return;
    const wasLiked = likedSet.has(postId);
    setLikedSet(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(postId); else next.add(postId);
      return next;
    });
    setItems(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? -1 : 1) } : p));
    try {
      await api.post(`/api/wall/posts/${postId}/reactions`, { type: 'LIKE' });
    } catch {
      setLikedSet(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(postId); else next.delete(postId);
        return next;
      });
      setItems(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? 1 : -1) } : p));
    }
  };

  // ── Post Detail Modal ──
  const openPostDetail = async (item: GalleryItem) => {
    setSelectedPost(item);
    setPostComments([]);
    setCommentText('');
    if (item.source === 'story') return; // No comments on stories
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/wall/posts/${item.id}/comments?limit=20`);
      if (res?.comments) setPostComments(res.comments);
    } catch {
      // Non-blocking
    } finally {
      setCommentsLoading(false);
    }
  };

  // ── Add Comment ──
  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPost || selectedPost.source === 'story') return;
    try {
      const res = await api.post(`/api/wall/posts/${selectedPost.id}/comments`, { content: commentText.trim(), publishAsOrg: isOrgMode ? true : undefined });
      if (res) {
        setPostComments(prev => [...prev, res]);
        setCommentText('');
        setItems(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        setSelectedPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      }
    } catch {
      message.error('Erreur lors du commentaire');
    }
  };

  // Category label → DB category value mapping
  const categoryMap: Record<string, string> = {
    'Populaire': 'promotion',
    'Créatif': 'conseil',
    'Chantiers': 'chantier_realise',
    'Business': 'projet',
    'Formation': 'actualite',
    'Local': 'actualite',
    'Emploi': 'emploi',
    'Market': 'market',
  };

  // ── Fetch Gallery Data ──
  const fetchGallery = useCallback(async (search?: string, category?: string | null) => {
    try {
      setLoading(true);

      // Gallery params
      const galleryParams = new URLSearchParams({
        limit: '40',
        type: mediaFilter,
        scope,
        sort: sortMode,
        mode: feedMode,
      });
      if (category) {
        const dbCategory = categoryMap[category] || category;
        galleryParams.set('category', dbCategory);
      }
      if (search && search.trim().length >= 2) {
        galleryParams.set('search', search.trim());
      }

      // Hashtags params
      const hashtagsParams = new URLSearchParams({ limit: '20' });
      if (search && search.trim().length >= 1) {
        hashtagsParams.set('search', search.trim());
      }

      const [galleryRes, hashtagsRes, usersRes] = await Promise.all([
        api.get(`/api/zhiive/explore/gallery?${galleryParams}`).catch(() => ({ items: [] })),
        api.get(`/api/zhiive/explore/hashtags?${hashtagsParams}`).catch(() => ({ hashtags: [] })),
        api.get(`/api/zhiive/explore/suggested-users?limit=30&scope=${peopleScope}`).catch(() => ({ users: [] })),
      ]);
      if (galleryRes?.items) {
        setItems(galleryRes.items);
        const liked = new Set<string>();
        galleryRes.items.forEach((p: any) => { if (p.isLiked) liked.add(p.id); });
        setLikedSet(liked);
      }
      if (hashtagsRes?.hashtags) setHashtags(hashtagsRes.hashtags);
      if (usersRes?.users) {
        setSuggestedUsers(usersRes.users);
        const fSet = new Set<string>();
        usersRes.users.forEach((u: any) => { if (u.isFollowing) fSet.add(u.id); });
        setFollowingSet(fSet);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, mediaFilter, scope, sortMode, feedMode, peopleScope]);

  // Initial load
  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => { clearTimeout(searchTimerRef.current); };
  }, []);

  // Re-fetch when category changes
  useEffect(() => {
    fetchGallery(searchQuery, activeCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchGallery(value, activeCategory);
    }, 400);
  };

  const handleFollow = async (userId: string) => {
    try {
      if (followingSet.has(userId)) {
        await api.delete(`/api/zhiive/follow/${userId}`);
        setFollowingSet(prev => { const next = new Set(prev); next.delete(userId); return next; });
        message.success('Abonnement retiré');
      } else {
        await api.post(`/api/zhiive/follow/${userId}`);
        setFollowingSet(prev => new Set(prev).add(userId));
        message.success('Suivi avec succès ! 🎉');
      }
    } catch {
      message.error('Erreur lors du suivi');
    }
  };

  const handleFriendAction = async (userId: string, currentStatus: string | null | undefined, direction?: 'sent' | 'received' | null, friendshipId?: string | null) => {
    try {
      if (currentStatus === 'accepted') {
        // Remove friend — need friendshipId
        const u = suggestedUsers.find(u => u.id === userId);
        const fId = friendshipId || u?.friendshipId;
        if (fId) {
          await api.delete(`/api/friends/${fId}`);
          setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: null, friendDirection: null, friendshipId: null } : u));
          message.success('Ami retiré');
        }
      } else if (currentStatus === 'pending' && direction === 'received') {
        // Accept received request
        const u = suggestedUsers.find(u => u.id === userId);
        const fId = friendshipId || u?.friendshipId;
        if (fId) {
          await api.post(`/api/friends/${fId}/accept`);
          setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: 'accepted', friendDirection: null } : u));
          message.success('Demande acceptée ! Vous êtes maintenant amis 🎉');
        }
      } else if (currentStatus === 'pending' && direction === 'sent') {
        // Cancel sent request
        const u = suggestedUsers.find(u => u.id === userId);
        const fId = friendshipId || u?.friendshipId;
        if (fId) {
          await api.delete(`/api/friends/${fId}`);
          setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: null, friendDirection: null, friendshipId: null } : u));
          message.success('Demande annulée');
        }
      } else {
        // Send friend request
        const res = await api.post('/api/friends/request', { userId });
        setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: 'pending', friendDirection: 'sent', friendshipId: res?.friendship?.id || null } : u));
        message.success('Demande d\'ami envoyée ! 🤝');
      }
    } catch {
      message.error('Erreur');
    }
  };

  const handleOpenMessenger = async (userId: string) => {
    try {
      const res = await api.post('/api/messenger/conversations', { participantIds: [userId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
        message.success('Chat ouvert 💬');
      } else {
        message.error('Impossible d\'ouvrir le chat');
      }
    } catch {
      message.error('Erreur lors de l\'ouverture du chat');
    }
  };

  const filteredUsers = searchQuery
    ? suggestedUsers.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestedUsers;

  const tabs = [
    { key: 'gallery' as const, label: 'Galerie', icon: <AppstoreOutlined /> },
    { key: 'people' as const, label: 'Personnes', icon: <TeamOutlined /> },
    { key: 'hashtags' as const, label: 'Hashtags', icon: <RiseOutlined /> },
  ];

  const categories = [
    { emoji: '🔥', label: 'Populaire' },
    { emoji: '🎨', label: 'Créatif' },
    { emoji: '🏗️', label: 'Chantiers' },
    { emoji: '💼', label: 'Business' },
    { emoji: '🎓', label: 'Formation' },
    { emoji: '🌍', label: 'Local' },
    { emoji: '🧑‍💼', label: 'Emploi' },
    { emoji: '🛒', label: 'Market' },
  ];

  return (
    <div ref={containerRef} style={{
      height: '100%', overflowY: 'auto', padding: '8px 12px',
      scrollbarWidth: 'none', background: SF.bg,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, background: SF.gradientSecondary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          � Explorer
        </span>
      </div>
      {/* Search */}
      <Input
        prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
        placeholder="Rechercher personnes, hashtags, médias..."
        value={searchQuery}
        onChange={e => handleSearchChange(e.target.value)}
        allowClear
        style={{ borderRadius: 20, background: SF.cardBg, border: 'none', marginBottom: 10 }}
        size="large"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 10, background: SF.cardBg, borderRadius: SF.radiusSm, overflow: 'hidden', boxShadow: SF.shadow }}>
        {tabs.map(tab => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '8px 0', textAlign: 'center', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              color: activeTab === tab.key ? SF.primary : SF.textSecondary,
              background: activeTab === tab.key ? SF.primary + '12' : 'transparent',
              borderBottom: activeTab === tab.key ? `2px solid ${SF.primary}` : '2px solid transparent',
            }}
          >
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* GALLERY TAB — Instagram-style media grid */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'gallery' && (
        <>
          {/* ── Scope filter: Amis / Organisation / Privé / Tout le monde ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {([
              { key: 'all' as const, label: '🌍 Tous', },
              { key: 'friends' as const, label: '👥 Amis' },
              ...(currentOrganization ? [{ key: 'org' as const, label: '🏢 Organisation' }] : []),
              { key: 'private' as const, label: '🔒 Privé' },
            ]).map(s => (
              <div
                key={s.key}
                onClick={() => setScope(s.key)}
                style={{
                  flex: 1, padding: '6px 0', textAlign: 'center', cursor: 'pointer',
                  borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: scope === s.key ? SF.gradientPrimary : SF.cardBg,
                  color: scope === s.key ? '#fff' : SF.textSecondary,
                  boxShadow: scope === s.key ? SF.shadowMd : SF.shadow,
                  transition: 'all 0.2s',
                }}
              >
                {s.label}
              </div>
            ))}
          </div>

          {/* ── Type + Sort filters ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
            {/* Type filters */}
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {([
                { key: 'all' as const, label: 'Tout', icon: <AppstoreOutlined style={{ fontSize: 11 }} /> },
                { key: 'photo' as const, label: 'Photos', icon: <PictureOutlined style={{ fontSize: 11 }} /> },
                { key: 'video' as const, label: 'Vidéos', icon: <VideoCameraOutlined style={{ fontSize: 11 }} /> },
              ]).map(t => (
                <Tag
                  key={t.key}
                  onClick={() => setMediaFilter(t.key)}
                  style={{
                    borderRadius: 16, padding: '3px 10px', cursor: 'pointer', border: 'none',
                    background: mediaFilter === t.key ? SF.secondary + '25' : SF.cardBg,
                    color: mediaFilter === t.key ? SF.secondary : SF.textSecondary,
                    fontSize: 11, fontWeight: 600, margin: 0,
                  }}
                >
                  {t.icon} {t.label}
                </Tag>
              ))}
            </div>

            {/* Sort toggle */}
            <div
              onClick={() => setSortMode(sortMode === 'popular' ? 'recent' : 'popular')}
              style={{
                padding: '4px 10px', borderRadius: 16, cursor: 'pointer',
                background: SF.cardBg, fontSize: 11, fontWeight: 600,
                color: SF.textSecondary, boxShadow: SF.shadow,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {sortMode === 'popular'
                ? <><RiseOutlined style={{ color: SF.fire, fontSize: 12 }} /> Tendances</>
                : <><ClockCircleOutlined style={{ color: SF.primary, fontSize: 12 }} /> Récent</>
              }
            </div>
          </div>

          {/* ── Category pills ── */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 10, scrollbarWidth: 'none', paddingBottom: 2 }}>
            {categories.map(cat => (
              <Tag key={cat.label}
                onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                style={{
                  borderRadius: 20, padding: '3px 10px', cursor: 'pointer', border: 'none',
                  background: activeCategory === cat.label ? SF.primary + '20' : SF.cardBg,
                  color: activeCategory === cat.label ? SF.primary : SF.text,
                  fontSize: 11, flexShrink: 0, boxShadow: SF.shadow, margin: 0,
                }}>
                {cat.emoji} {cat.label}
              </Tag>
            ))}
          </div>

          {/* ── Gallery Grid ── */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{
                  aspectRatio: '1/1', background: SF.border, borderRadius: 4,
                  animation: 'pulse 1.5s infinite',
                }} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {items.map((item) => (
                <div key={item.id} onClick={() => openPostDetail(item)} style={{
                  position: 'relative', cursor: 'pointer',
                  aspectRatio: '1/1',
                  borderRadius: 4, overflow: 'hidden',
                  background: '#000',
                }}>
                  {/* Thumbnail */}
                  {item.mediaType === 'video' ? (
                    <video
                      src={item.mediaUrl}
                      muted
                      preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {/* Video icon overlay */}
                  {item.mediaType === 'video' && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      color: '#fff', fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}>
                      <PlayCircleOutlined />
                    </div>
                  )}

                  {/* Story badge */}
                  {item.isStory && (
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      background: SF.gradientStory, padding: '1px 6px',
                      borderRadius: 8, fontSize: 9, color: '#fff', fontWeight: 700,
                    }}>
                      {item.isHighlight ? '⭐' : '◉'} Story
                    </div>
                  )}

                  {/* Hover overlay with stats */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 12, opacity: 0, transition: 'opacity 0.2s',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <HeartFilled /> {item.likesCount}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageOutlined /> {item.commentsCount}
                    </span>
                  </div>

                  {/* Bottom gradient for mobile (always visible) */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                    padding: '10px 5px 3px', display: 'flex', gap: 6,
                    color: 'white', fontSize: 9,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {likedSet.has(item.id)
                        ? <HeartFilled style={{ color: '#ff2d55', fontSize: 10 }} />
                        : <HeartOutlined style={{ fontSize: 10 }} />}
                      {item.likesCount}
                    </span>
                    <span>💬 {item.commentsCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CompassOutlined style={{ fontSize: 40, color: SF.secondary }} />}
              title="Aucun média trouvé"
              subtitle={scope === 'friends'
                ? "Vos amis n'ont pas encore publié de médias. Changez le scope !"
                : "Publiez des photos et vidéos sur le Mur pour les voir ici."
              }
            />
          )}
        </>
      )}

      {/* People tab */}
      {activeTab === 'people' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* ── Scope filter: Tous / Amis / Organisation ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {([
              { key: 'all' as const, label: '🌍 Tous' },
              { key: 'friends' as const, label: '💚 Amis' },
              ...(currentOrganization ? [{ key: 'org' as const, label: '🏢 Organisation' }] : []),
            ]).map(s => (
              <div
                key={s.key}
                onClick={() => setPeopleScope(s.key)}
                style={{
                  flex: 1, padding: '6px 0', textAlign: 'center', cursor: 'pointer',
                  borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: peopleScope === s.key ? SF.gradientPrimary : SF.cardBg,
                  color: peopleScope === s.key ? '#fff' : SF.textSecondary,
                  boxShadow: peopleScope === s.key ? SF.shadowMd : SF.shadow,
                  transition: 'all 0.2s',
                }}
              >
                {s.label}
              </div>
            ))}
          </div>

          {/* ── Users list ── */}
          {filteredUsers.length > 0 ? filteredUsers.map(su => {
            const isFriend = su.friendStatus === 'accepted';
            const isPending = su.friendStatus === 'pending';
            const isFollowed = followingSet.has(su.id);

            return (
              <div key={su.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: SF.cardBg, borderRadius: SF.radiusSm, boxShadow: SF.shadow,
              }}>
                {/* Avatar — clickable to open profile */}
                <Avatar size={48} src={su.avatarUrl} icon={!su.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ background: !su.avatarUrl ? SF.primary : undefined, flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${su.id}`)}
                />

                {/* Info — clickable */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${su.id}`)}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: SF.text }}>
                    {su.firstName} {su.lastName}
                    {isFriend && <span style={{ marginLeft: 4, fontSize: 11, color: '#52c41a' }}>✓ Ami</span>}
                    {su.sameOrg && <span style={{ marginLeft: 4, fontSize: 9, background: SF.primary + '20', color: SF.primary, padding: '1px 5px', borderRadius: 6 }}>Org</span>}
                  </div>
                  <div style={{ fontSize: 11, color: SF.textSecondary }}>{su.role}</div>
                  {su.mutualFriends > 0 && (
                    <div style={{ fontSize: 10, color: SF.textMuted }}>{su.mutualFriends} ami(s) en commun</div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {/* Messenger button */}
                  <div
                    onClick={() => handleOpenMessenger(su.id)}
                    title="Envoyer un message"
                    style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      background: '#e6f7ff', color: '#1890ff', fontSize: 14,
                      transition: 'all 0.15s',
                    }}
                  >
                    <MessageOutlined />
                  </div>

                  {/* Add friend / Friend status button */}
                  <div
                    onClick={() => handleFriendAction(su.id, su.friendStatus, su.friendDirection, su.friendshipId)}
                    title={isFriend ? 'Ami ✓' : (isPending && su.friendDirection === 'received') ? 'Accepter la demande' : isPending ? 'En attente (annuler)' : 'Ajouter en ami'}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      background: isFriend ? '#f6ffed' : (isPending && su.friendDirection === 'received') ? '#e6f7ff' : isPending ? '#fff7e6' : '#f0f0f0',
                      color: isFriend ? '#52c41a' : (isPending && su.friendDirection === 'received') ? '#1890ff' : isPending ? '#fa8c16' : '#666',
                      fontSize: 14, transition: 'all 0.15s',
                      border: isFriend ? '1px solid #b7eb8f' : (isPending && su.friendDirection === 'received') ? '2px solid #1890ff' : isPending ? '1px solid #ffd591' : '1px solid #d9d9d9',
                      animation: (isPending && su.friendDirection === 'received') ? 'pulse 1.5s infinite' : 'none',
                    }}
                  >
                    {isFriend ? '🤝' : (isPending && su.friendDirection === 'received') ? '✅' : isPending ? '⏳' : <TeamOutlined />}
                  </div>

                  {/* Follow button */}
                  <div
                    onClick={() => handleFollow(su.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: isFollowed ? SF.bg : SF.gradientPrimary,
                      color: isFollowed ? SF.textSecondary : 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      border: isFollowed ? `1px solid ${SF.border}` : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isFollowed ? 'Suivi ✓' : 'Suivre'}
                  </div>
                </div>
              </div>
            );
          }) : (
            <EmptyState
              icon={<TeamOutlined style={{ fontSize: 40, color: SF.primary }} />}
              title={peopleScope === 'friends' ? 'Aucun ami pour le moment' : 'Aucune personne trouvée'}
              subtitle={peopleScope === 'friends' ? 'Ajoutez des amis depuis l\'onglet "Tous" !' : 'Plus vous interagissez, plus nos suggestions s\'affinent.'}
            />
          )}
        </div>
      )}

      {/* Hashtags tab */}
      {activeTab === 'hashtags' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hashtags.length > 0 ? hashtags.map((ht, i) => (
            <div key={ht.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: SF.cardBg, borderRadius: SF.radiusSm, boxShadow: SF.shadow,
              cursor: 'pointer',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: SF.radiusSm, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: i < 3 ? SF.gradientHot : SF.bg, fontSize: 18,
              }}>
                {i < 3 ? '🔥' : '#'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: SF.text }}>#{ht.name}</div>
                <div style={{ fontSize: 11, color: SF.textSecondary }}>{ht.postCount} publications</div>
              </div>
              {i < 3 && <Tag color="volcano" style={{ borderRadius: 10, fontSize: 10 }}>Trending</Tag>}
            </div>
          )) : (
            <EmptyState
              icon={<RiseOutlined style={{ fontSize: 40, color: SF.accent }} />}
              title="Pas encore de hashtags"
              subtitle="Ajoutez #hashtags à vos posts pour lancer des tendances !"
            />
          )}
        </div>
      )}
      
      {/* Post / Story Detail Modal */}
      <Modal
        open={!!selectedPost}
        onCancel={() => setSelectedPost(null)}
        footer={null}
        width="95vw"
        style={{ maxWidth: 500, top: 20 }}
        styles={{ body: { padding: 0 } }}
        closeIcon={<CloseOutlined style={{ color: '#fff', fontSize: 16 }} />}
      >
        {selectedPost && (
          <div style={{ background: SF.bg, borderRadius: 12, overflow: 'hidden' }}>
            {/* Media */}
            {selectedPost.mediaType === 'video' ? (
              <video src={selectedPost.mediaUrl} controls autoPlay muted
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', background: '#000' }} />
            ) : (
              <img src={selectedPost.mediaUrl} alt=""
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', background: '#000' }} />
            )}

            {/* Author & Actions */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Avatar size={36} src={selectedPost.authorAvatar}
                  icon={!selectedPost.authorAvatar ? <UserOutlined /> : undefined}
                  style={{ background: !selectedPost.authorAvatar ? SF.primary : undefined }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: SF.text }}>{selectedPost.authorName}</div>
                  {selectedPost.isStory && (
                    <div style={{ fontSize: 11, color: SF.accent, fontWeight: 600 }}>
                      {selectedPost.isHighlight ? '⭐ Highlight' : '◉ Story'}
                    </div>
                  )}
                </div>
              </div>

              {selectedPost.caption && (
                <div style={{ fontSize: 13, color: SF.text, marginBottom: 10, lineHeight: 1.5 }}>
                  {selectedPost.caption}
                </div>
              )}

              {/* Action bar — only for posts, not stories */}
              {selectedPost.source === 'post' && (
                <>
                  <div style={{ display: 'flex', gap: 16, padding: '8px 0', borderTop: `1px solid ${SF.border}`, borderBottom: `1px solid ${SF.border}` }}>
                    <span
                      onClick={() => handleLikePost(selectedPost.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13, color: likedSet.has(selectedPost.id) ? '#ff2d55' : SF.textSecondary }}>
                      {likedSet.has(selectedPost.id) ? <HeartFilled style={{ fontSize: 18 }} /> : <HeartOutlined style={{ fontSize: 18 }} />}
                      {selectedPost.likesCount}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: SF.textSecondary }}>
                      <MessageOutlined style={{ fontSize: 18 }} /> {selectedPost.commentsCount}
                    </span>
                  </div>

                  {/* Comments */}
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, scrollbarWidth: 'thin' }}>
                    {commentsLoading ? (
                      <div style={{ textAlign: 'center', padding: 12, color: SF.textMuted, fontSize: 12 }}>Chargement...</div>
                    ) : postComments.length > 0 ? (
                      postComments.map((c: any) => {
                        const cIsOrg = c.publishAsOrg && c.organization;
                        const cAvatar = cIsOrg ? (c.organization?.logoUrl || null) : (c.authorAvatar || c.author?.avatarUrl || null);
                        const cName = cIsOrg ? c.organization.name : (c.authorName || [c.author?.firstName, c.author?.lastName].filter(Boolean).join(' ') || 'Utilisateur');
                        return (
                        <div key={c.id} style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
                          <Avatar size={24} src={cAvatar} icon={!cAvatar ? <UserOutlined /> : undefined}
                            style={{ background: !cAvatar ? (cIsOrg ? '#6C5CE7' : SF.primary) : undefined, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 12, color: SF.text }}>{cName} </span>
                            <span style={{ fontSize: 12, color: SF.text }}>{c.content}</span>
                          </div>
                        </div>
                      ); })
                    ) : (
                      <div style={{ textAlign: 'center', padding: 12, color: SF.textMuted, fontSize: 12 }}>Aucun commentaire</div>
                    )}
                  </div>

                  {/* Comment input */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <Input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onPressEnter={handleAddComment}
                      placeholder="Ajouter un commentaire..."
                      style={{ borderRadius: 20, flex: 1, background: SF.cardBg, border: 'none' }}
                      size="small"
                    />
                    <SendOutlined
                      onClick={handleAddComment}
                      style={{ fontSize: 16, color: commentText.trim() ? SF.primary : SF.textMuted, cursor: commentText.trim() ? 'pointer' : 'default' }}
                    />
                  </div>
                </>
              )}

              {/* Story info */}
              {selectedPost.source === 'story' && (
                <div style={{ padding: '8px 0', borderTop: `1px solid ${SF.border}`, fontSize: 12, color: SF.textMuted, textAlign: 'center' }}>
                  👁 {selectedPost.likesCount} vue{selectedPost.likesCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    {icon}
    <div style={{ fontSize: 16, fontWeight: 700, color: SF.text, marginTop: 12 }}>{title}</div>
    <div style={{ fontSize: 12, color: SF.textSecondary, marginTop: 4 }}>{subtitle}</div>
  </div>
);

export default ExplorePanel;
