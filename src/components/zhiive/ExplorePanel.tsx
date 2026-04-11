import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Avatar, Button, Dropdown, Input, Tag, Tooltip, message, Modal } from 'antd';
import type { InputRef } from 'antd';
import {
  SearchOutlined, UserOutlined, CameraOutlined,
  TeamOutlined, RiseOutlined, HeartOutlined, HeartFilled,
  PlusOutlined, DownOutlined,
  CloseOutlined, MessageOutlined, SendOutlined,
  PictureOutlined, VideoCameraOutlined, PlayCircleOutlined,
  AppstoreOutlined, ClockCircleOutlined, CompassOutlined,
  BookOutlined, BookFilled, ShareAltOutlined,
  LoadingOutlined, CopyOutlined, EyeOutlined,
} from '@ant-design/icons';
import { SF } from './ZhiiveTheme';
import { useZhiiveNav } from '../../contexts/ZhiiveNavContext';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';
import { useSocialIdentity } from '../../contexts/SocialIdentityContext';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ZhiiveModuleHeader from './ZhiiveModuleHeader';

// ── Constants ──
const PAGE_SIZE = 40;
const DOUBLE_TAP_MS = 300;
const SWIPE_MIN_PX = 50;
const SWIPE_MAX_MS = 500;
const HEART_ANIM_MS = 900;

// ── Relative time ──
const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}m`;
};

// ── Horizontal scrollable row ──
const ScrollRow: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = rowRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.isDown) return;
    e.preventDefault();
    const el = rowRef.current!;
    el.scrollLeft = dragState.current.scrollLeft - (e.pageX - el.offsetLeft - dragState.current.startX) * 1.5;
  }, []);

  const onMouseUp = useCallback(() => {
    dragState.current.isDown = false;
    const el = rowRef.current;
    if (el) { el.style.cursor = 'grab'; el.style.userSelect = ''; }
  }, []);

  return (
    <div ref={rowRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', cursor: 'grab', ...style }}>
      {children}
    </div>
  );
};

// ── Types ──
interface GalleryItem {
  id: string;
  source: 'post' | 'story';
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaCount?: number;
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
  isSaved?: boolean;
  isLiked?: boolean;
  viewCount?: number;
  createdAt?: string;
}

interface TrendingHashtag { id: string; name: string; postCount: number; }

interface SuggestedUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  mutualFriends: number;
  isFollowing?: boolean;
  friendStatus?: string | null;
  friendDirection?: 'sent' | 'received' | null;
  friendshipId?: string | null;
  sameOrg?: boolean;
}

// ══════════════════════════════════════════════════════════════════
// ExplorePanel — Friends (Instagram-style)
// ══════════════════════════════════════════════════════════════════
const ExplorePanel: React.FC<{ api: any; openModule?: (route: string) => void; compact?: boolean }> = ({ api, compact }) => {
  const { feedMode } = useZhiiveNav();
  const { currentOrganization, user } = useAuth();
  const navigate = useNavigate();
  const identity = useActiveIdentity();
  const { isAppEnabled } = useSocialIdentity();
  const { t } = useTranslation();

  // ── Core state ──
  const [activeTab, setActiveTab] = useState<'gallery' | 'people' | 'hashtags'>('gallery');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInputRef = useRef<InputRef | null>(null);

  // ── Filters ──
  const [scope, setScope] = useState<'all' | 'friends' | 'org' | 'private'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'popular' | 'recent'>('popular');
  const [peopleScope, setPeopleScope] = useState<'all' | 'friends' | 'org'>('all');

  // ── Interaction sets ──
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  // ── Fullscreen viewer ──
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedPost = selectedIndex !== null ? items[selectedIndex] ?? null : null;
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const touchRef = useRef<{ startX: number; startY: number; startTime: number } | null>(null);

  // ── Double-tap ──
  const [heartAnimId, setHeartAnimId] = useState<string | null>(null);
  const lastTapRef = useRef<{ time: number; id: string } | null>(null);

  // ── Comments ──
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [likedCommentsSet, setLikedCommentsSet] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);

  // ── Create Post ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createMediaType, setCreateMediaType] = useState<'photo' | 'video'>('photo');
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createCaption, setCreateCaption] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const createFileRef = useRef<HTMLInputElement | null>(null);

  const categoryMap = useMemo<Record<string, string>>(() => ({
    popular: 'promotion', creative: 'conseil', combs: 'chantier_realise',
    business: 'projet', learning: 'actualite', local: 'actualite',
    jobs: 'emploi', market: 'market',
  }), []);

  const categories = useMemo(() => [
    { emoji: '🔥', label: t('explore.popular'), key: 'popular' },
    { emoji: '🎨', label: t('explore.creative'), key: 'creative' },
    { emoji: '🏗️', label: t('explore.combs'), key: 'combs' },
    { emoji: '💼', label: t('explore.business'), key: 'business' },
    { emoji: '🎓', label: t('explore.learning'), key: 'learning' },
    { emoji: '🌍', label: t('explore.local'), key: 'local' },
    { emoji: '🧑‍💼', label: t('explore.jobs'), key: 'jobs' },
    { emoji: '🛒', label: 'Market', key: 'market' },
  ], [t]);

  // ════════════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════════════

  const fetchGallery = useCallback(async (search?: string, category?: string | null, append = false) => {
    try {
      if (append) setLoadingMore(true); else setLoading(true);

      const offset = append ? items.length : 0;
      const galleryParams = new URLSearchParams({
        limit: String(PAGE_SIZE), offset: String(offset),
        type: mediaFilter, scope, sort: sortMode, mode: feedMode,
      });
      if (category) galleryParams.set('category', categoryMap[category] || category);
      if (search && search.trim().length >= 2) galleryParams.set('search', search.trim());

      const requests: Promise<any>[] = [
        api.get(`/api/zhiive/explore/gallery?${galleryParams}`).catch(() => ({ items: [] })),
      ];
      if (!append) {
        const hp = new URLSearchParams({ limit: '20' });
        if (search && search.trim().length >= 1) hp.set('search', search.trim());
        requests.push(
          api.get(`/api/zhiive/explore/hashtags?${hp}`).catch(() => ({ hashtags: [] })),
          api.get(`/api/zhiive/explore/suggested-users?limit=30&scope=${peopleScope}`).catch(() => ({ users: [] })),
        );
      }

      const [galleryRes, hashtagsRes, usersRes] = await Promise.all(requests);

      if (galleryRes?.items) {
        const newItems: GalleryItem[] = galleryRes.items;
        if (append) {
          setItems(prev => [...prev, ...newItems]);
          setLikedSet(prev => { const n = new Set(prev); newItems.forEach((p: any) => { if (p.isLiked) n.add(p.id); }); return n; });
          setSavedSet(prev => { const n = new Set(prev); newItems.forEach((p: any) => { if (p.isSaved) n.add(p.id); }); return n; });
        } else {
          setItems(newItems);
          const liked = new Set<string>(); const saved = new Set<string>();
          newItems.forEach((p: any) => { if (p.isLiked) liked.add(p.id); if (p.isSaved) saved.add(p.id); });
          setLikedSet(liked); setSavedSet(saved);
        }
        setHasMore(galleryRes.hasMore ?? newItems.length >= PAGE_SIZE);
      }

      if (hashtagsRes?.hashtags) setHashtags(hashtagsRes.hashtags);
      if (usersRes?.users) {
        setSuggestedUsers(usersRes.users);
        const fSet = new Set<string>();
        usersRes.users.forEach((u: any) => { if (u.isFollowing) fSet.add(u.id); });
        setFollowingSet(fSet);
      }
    } catch { /* non-blocking */ }
    finally { setLoading(false); setLoadingMore(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, mediaFilter, scope, sortMode, feedMode, peopleScope, categoryMap]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);
  useEffect(() => () => { clearTimeout(searchTimerRef.current); }, []);
  useEffect(() => { fetchGallery(searchQuery, activeCategory); }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchGallery(value, activeCategory), 400);
  }, [fetchGallery, activeCategory]);

  const handleRefresh = useCallback(() => fetchGallery(searchQuery, activeCategory), [fetchGallery, searchQuery, activeCategory]);

  // ── Infinite scroll ──
  useEffect(() => {
    if (activeTab !== 'gallery' || !hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) fetchGallery(searchQuery, activeCategory, true);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, hasMore, loading, loadingMore, fetchGallery, searchQuery, activeCategory]);

  // ════════════════════════════════════════════════════════
  // INTERACTIONS
  // ════════════════════════════════════════════════════════

  // 🐝 Like — works for both posts and stories (stories have linked WallPost IDs)
  const handleLikePost = useCallback(async (postId: string) => {
    const wasLiked = likedSet.has(postId);
    setLikedSet(prev => { const n = new Set(prev); if (wasLiked) n.delete(postId); else n.add(postId); return n; });
    setItems(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? -1 : 1) } : p));
    try {
      await api.post(`/api/wall/posts/${postId}/reactions`, { type: 'LIKE' });
    } catch {
      setLikedSet(prev => { const n = new Set(prev); if (wasLiked) n.add(postId); else n.delete(postId); return n; });
      setItems(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? 1 : -1) } : p));
    }
  }, [api, likedSet]);

  // 🐝 Save — works for both posts and stories (stories have linked WallPost IDs)
  const handleSave = useCallback(async (postId: string) => {
    const wasSaved = savedSet.has(postId);
    setSavedSet(prev => { const n = new Set(prev); if (wasSaved) n.delete(postId); else n.add(postId); return n; });
    try {
      if (wasSaved) await api.delete(`/api/zhiive/saved-reels/${postId}`);
      else await api.post(`/api/zhiive/saved-reels/${postId}`);
    } catch {
      setSavedSet(prev => { const n = new Set(prev); if (wasSaved) n.add(postId); else n.delete(postId); return n; });
    }
  }, [api, savedSet]);

  // 🐝 Share — works for both posts and stories (stories have linked WallPost IDs)
  const handleShare = useCallback(async (postId: string) => {
    try {
      await api.post(`/api/wall/posts/${postId}/share`, { targetType: 'INTERNAL' });
      message.success(t('explore.shared'));
    } catch { message.error(t('explore.shareError')); }
  }, [api, t]);

  const handleFollow = useCallback(async (userId: string) => {
    try {
      if (followingSet.has(userId)) {
        await api.delete(`/api/zhiive/follow/${userId}`);
        setFollowingSet(prev => { const n = new Set(prev); n.delete(userId); return n; });
      } else {
        await api.post(`/api/zhiive/follow/${userId}`);
        setFollowingSet(prev => new Set(prev).add(userId));
      }
    } catch { message.error(t('explore.followError')); }
  }, [api, followingSet, t]);

  const handleSendDM = useCallback(async (authorId: string) => {
    try {
      const res = await api.post('/api/messenger/conversations', { participantIds: [authorId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
        message.success(t('explore.whisperOpened'));
      }
    } catch { message.error(t('explore.whisperError')); }
  }, [api, t]);

  const handleFriendAction = useCallback(async (userId: string, currentStatus: string | null | undefined, direction?: 'sent' | 'received' | null, friendshipId?: string | null) => {
    try {
      const u = suggestedUsers.find(u => u.id === userId);
      const fId = friendshipId || u?.friendshipId;
      if (currentStatus === 'accepted' && fId) {
        await api.delete(`/api/friends/${fId}`);
        setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: null, friendDirection: null, friendshipId: null } : u));
        message.success(t('explore.friendRemoved'));
      } else if (currentStatus === 'pending' && direction === 'received' && fId) {
        await api.post(`/api/friends/${fId}/accept`);
        setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: 'accepted', friendDirection: null } : u));
        message.success(t('explore.requestAccepted'));
      } else if (currentStatus === 'pending' && direction === 'sent' && fId) {
        await api.delete(`/api/friends/${fId}`);
        setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: null, friendDirection: null, friendshipId: null } : u));
        message.success(t('explore.requestCancelled'));
      } else {
        const res = await api.post('/api/friends/request', { userId });
        setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: 'pending', friendDirection: 'sent', friendshipId: res?.friendship?.id || null } : u));
        message.success(t('explore.friendAdded'));
      }
    } catch { message.error('Erreur'); }
  }, [api, suggestedUsers, t]);

  const handleOpenMessenger = useCallback(async (userId: string) => {
    try {
      const res = await api.post('/api/messenger/conversations', { participantIds: [userId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
        message.success(t('explore.whisperOpened'));
      } else { message.error(t('explore.whisperError')); }
    } catch { message.error(t('explore.whisperError')); }
  }, [api, t]);

  const handleCreatePost = useCallback((type: 'photo' | 'video') => {
    setCreateMediaType(type); setCreateFile(null); setCreateCaption(''); setCreateModalOpen(true);
  }, []);

  const handleSubmitPost = useCallback(async () => {
    if (!createFile) { message.warning(t('explore.selectFile')); return; }
    setCreateLoading(true);
    try {
      const formData = new FormData();
      formData.append('files', createFile);
      const uploadRes = await api.post('/api/wall/upload', formData);
      const mediaUrl = uploadRes?.urls?.[0];
      if (!mediaUrl) throw new Error('Upload failed');
      await api.post('/api/wall/posts', {
        content: createCaption.trim(), mediaUrl,
        mediaType: createMediaType === 'photo' ? 'image' : 'video',
        publishAsOrg: identity.publishAsOrg,
      });
      message.success(t('explore.postCreated'));
      setCreateModalOpen(false);
      handleRefresh();
    } catch { message.error(t('explore.postError')); }
    finally { setCreateLoading(false); }
  }, [api, createFile, createCaption, createMediaType, identity.publishAsOrg, t, handleRefresh]);

  // ════════════════════════════════════════════════════════
  // FULLSCREEN VIEWER
  // ════════════════════════════════════════════════════════

  const openPostDetail = useCallback((item: GalleryItem) => {
    const idx = items.findIndex(i => i.id === item.id);
    setSelectedIndex(idx >= 0 ? idx : 0);
    setPostComments([]); setCommentText(''); setLikedCommentsSet(new Set()); setSlideDir(null); setShowComments(false);
  }, [items]);

  const loadComments = useCallback(async (postId: string) => {
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/wall/posts/${postId}/comments?limit=20`);
      if (res?.comments) {
        setPostComments(res.comments);
        const ids: string[] = res.comments.map((c: any) => c.id);
        if (ids.length > 0) {
          try { const lr = await api.post('/api/zhiive/comments/liked', { commentIds: ids }); if (lr?.likedIds) setLikedCommentsSet(new Set(lr.likedIds)); } catch { /* non-blocking */ }
        }
      }
    } catch { /* non-blocking */ } finally { setCommentsLoading(false); }
  }, [api]);

  const navigateFullscreen = useCallback((dir: 'prev' | 'next') => {
    setSelectedIndex(prev => {
      if (prev === null) return null;
      const next = dir === 'next' ? prev + 1 : prev - 1;
      return (next < 0 || next >= items.length) ? prev : next;
    });
    setSlideDir(dir === 'next' ? 'left' : 'right');
    setTimeout(() => setSlideDir(null), 300);
  }, [items.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const item = items[selectedIndex];
    if (!item) return;
    setPostComments([]); setCommentText(''); setLikedCommentsSet(new Set()); setShowComments(false);
    // 🐝 Load comments for ALL items (stories now have linked WallPost IDs)
    loadComments(item.id);
  }, [selectedIndex, items, loadComments]);

  useEffect(() => {
    if (selectedIndex === null) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndex(null);
      else if (e.key === 'ArrowRight') navigateFullscreen('next');
      else if (e.key === 'ArrowLeft') navigateFullscreen('prev');
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [selectedIndex, navigateFullscreen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, startTime: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;
    const dt = Date.now() - touchRef.current.startTime;
    touchRef.current = null;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < SWIPE_MAX_MS) {
      if (dx < 0) navigateFullscreen('next'); else navigateFullscreen('prev');
    }
  }, [navigateFullscreen]);

  const handleDoubleTap = useCallback((postId: string) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === postId && now - last.time < DOUBLE_TAP_MS) {
      if (!likedSet.has(postId)) handleLikePost(postId);
      setHeartAnimId(postId);
      setTimeout(() => setHeartAnimId(null), HEART_ANIM_MS);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, id: postId };
    }
  }, [likedSet, handleLikePost]);

  // 🐝 Comments — works for both posts and stories (stories have linked WallPost IDs)
  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !selectedPost) return;
    try {
      const res = await api.post(`/api/wall/posts/${selectedPost.id}/comments`, {
        content: commentText.trim(), publishAsOrg: identity.publishAsOrg,
      });
      if (res) {
        setPostComments(prev => [...prev, res]);
        setCommentText('');
        setItems(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      }
    } catch { message.error(t('explore.buzzError')); }
  }, [api, commentText, selectedPost, identity.publishAsOrg, t]);

  const filteredUsers = useMemo(() =>
    searchQuery
      ? suggestedUsers.filter(u =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.role.toLowerCase().includes(searchQuery.toLowerCase()))
      : suggestedUsers,
  [suggestedUsers, searchQuery]);

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  return (
    <div ref={containerRef} style={{
      height: '100%', overflowY: 'auto', scrollbarWidth: 'none',
      background: SF.bg, display: 'flex', flexDirection: 'column',
      width: '100%', maxWidth: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <ZhiiveModuleHeader
        icon={
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
            <CameraOutlined style={{ fontSize: 18, color: '#00CEC9' }} />
            <UserOutlined style={{ position: 'absolute', fontSize: 8, color: '#00CEC9', top: 4, left: 6 }} />
          </span>
        }
        title="Friends"
        center={
          <Input ref={searchInputRef} prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
            placeholder={t('explore.searchPlaceholder')} value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)} allowClear
            style={{ height: 28, borderRadius: SF.radiusSm, fontSize: 12, width: '100%', minWidth: 0 }} />
        }
        actions={<>
          <Tooltip title={t('explore.people')}>
            <Button type="text" size="small" icon={<TeamOutlined />}
              style={{ color: activeTab === 'people' ? SF.primary : undefined }}
              onClick={() => setActiveTab('people')} />
          </Tooltip>
          <Tooltip title={t('explore.gallery')}>
            <Button type="text" size="small" icon={<AppstoreOutlined />}
              style={{ color: activeTab === 'gallery' ? SF.primary : undefined }}
              onClick={() => setActiveTab('gallery')} />
          </Tooltip>
          <Dropdown menu={{
            items: [
              { key: 'photo', icon: <PictureOutlined />, label: t('explore.photos'), onClick: () => handleCreatePost('photo') },
              { key: 'video', icon: <VideoCameraOutlined />, label: t('explore.videos'), onClick: () => handleCreatePost('video') },
            ],
          }} trigger={['click']}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: SF.primary, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12,
            }}><PlusOutlined /></div>
          </Dropdown>
        </>}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', scrollbarWidth: 'none' }}>

        {/* ═══ GALLERY TAB ═══ */}
        {activeTab === 'gallery' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', flexWrap: 'nowrap' }}>
              <FilterPill label={scope === 'all' ? t('explore.allFilter') : scope === 'friends' ? t('explore.friendsFilter') : scope === 'org' ? '⬡ Colony' : '🔒 Privé'}
                items={[ { key: 'all', label: t('explore.allFilter') }, { key: 'friends', label: t('explore.friendsFilter') }, ...(currentOrganization ? [{ key: 'org', label: '⬡ Colony' }] : []), { key: 'private', label: '🔒 Privé' } ]}
                selected={scope} onSelect={k => setScope(k as typeof scope)} />
              <FilterPill label={mediaFilter === 'all' ? t('common.all') : mediaFilter === 'photo' ? t('explore.photos') : t('explore.videos')}
                items={[ { key: 'all', label: t('common.all') }, { key: 'photo', label: t('explore.photos') }, { key: 'video', label: t('explore.videos') } ]}
                selected={mediaFilter} onSelect={k => setMediaFilter(k as typeof mediaFilter)} />
              <FilterPill
                label={activeCategory ? `${categories.find(c => c.key === activeCategory)?.emoji || ''} ${categories.find(c => c.key === activeCategory)?.label || ''}` : t('explore.popular')}
                items={[ { key: '_none', label: t('common.all') }, ...categories.map(c => ({ key: c.key, label: `${c.emoji} ${c.label}` })) ]}
                selected={activeCategory || '_none'} onSelect={k => setActiveCategory(k === '_none' ? null : k)} />
              <div onClick={() => setSortMode(s => s === 'popular' ? 'recent' : 'popular')} style={{
                padding: '4px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: SF.cardBg, color: SF.text, boxShadow: SF.shadow,
                display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', marginLeft: 'auto',
              }}>
                {sortMode === 'popular'
                  ? <><RiseOutlined style={{ color: SF.fire, fontSize: 12 }} /> {t('explore.trending')}</>
                  : <><ClockCircleOutlined style={{ color: SF.primary, fontSize: 12 }} /> {t('explore.recent')}</>}
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 2 : 3}, 1fr)`, gap: 3 }}>
                {Array.from({ length: compact ? 4 : 9 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', background: SF.border, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <InstaGrid items={items} likedSet={likedSet} onOpen={openPostDetail} cols={compact ? 2 : 3} />
                {hasMore && (
                  <div ref={sentinelRef} style={{ textAlign: 'center', padding: 20 }}>
                    {loadingMore && <LoadingOutlined style={{ fontSize: 20, color: SF.primary }} />}
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={<CompassOutlined style={{ fontSize: 40, color: SF.secondary }} />}
                title={t('explore.noMediaFound')} subtitle={scope === 'friends' ? t('explore.noFriendsMedia') : t('explore.publishHint')} />
            )}
          </>
        )}

        {/* ═══ PEOPLE TAB ═══ */}
        {activeTab === 'people' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScrollRow style={{ gap: 4, marginBottom: 4 }}>
              {([ { key: 'all' as const, label: t('explore.allFilter') }, { key: 'friends' as const, label: t('explore.friendsFilter') },
                ...(currentOrganization ? [{ key: 'org' as const, label: '⬡ Colony' }] : []),
              ]).map(s => (
                <div key={s.key} onClick={() => setPeopleScope(s.key)} style={{
                  flexShrink: 0, padding: '6px 12px', textAlign: 'center', cursor: 'pointer', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  background: peopleScope === s.key ? SF.gradientPrimary : SF.cardBg,
                  color: peopleScope === s.key ? SF.textLight : SF.textSecondary,
                  boxShadow: peopleScope === s.key ? SF.shadowMd : SF.shadow, transition: 'all 0.2s',
                }}>{s.label}</div>
              ))}
            </ScrollRow>
            {filteredUsers.length > 0 ? filteredUsers.map(su => (
              <PeopleCard key={su.id} user={su} isFollowed={followingSet.has(su.id)}
                onNavigate={() => navigate(`/profile/${su.id}`)} onMessage={() => handleOpenMessenger(su.id)}
                onFriend={isAppEnabled('friendRequests') ? () => handleFriendAction(su.id, su.friendStatus, su.friendDirection, su.friendshipId) : undefined}
                onFollow={isAppEnabled('allowFollowColony') ? () => handleFollow(su.id) : undefined} t={t} />
            )) : (
              <EmptyState icon={<TeamOutlined style={{ fontSize: 40, color: SF.primary }} />}
                title={peopleScope === 'friends' ? t('explore.noFriendsYet') : t('explore.noBeesFound')}
                subtitle={peopleScope === 'friends' ? t('explore.addFriendsHint') : t('explore.betterSuggestions')} />
            )}
          </div>
        )}

        {/* ═══ HASHTAGS TAB ═══ */}
        {activeTab === 'hashtags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hashtags.length > 0 ? hashtags.map((ht, i) => (
              <div key={ht.id} onClick={() => { setSearchQuery(`#${ht.name}`); setActiveTab('gallery'); fetchGallery(`#${ht.name}`, null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: SF.cardBg, borderRadius: SF.radiusSm, boxShadow: SF.shadow, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: SF.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < 3 ? SF.gradientHot : SF.bg, fontSize: 18 }}>{i < 3 ? '🔥' : '#'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: SF.text }}>#{ht.name}</div>
                  <div style={{ fontSize: 11, color: SF.textSecondary }}>{ht.postCount} buzzes</div>
                </div>
                {i < 3 && <Tag color="volcano" style={{ borderRadius: 10, fontSize: 10 }}>{t('explore.trending')}</Tag>}
              </div>
            )) : (
              <EmptyState icon={<RiseOutlined style={{ fontSize: 40, color: SF.accent }} />}
                title={t('explore.noHashtags')} subtitle={t('explore.addHashtagsHint')} />
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FULLSCREEN GALLERY VIEWER                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        {selectedPost && selectedIndex !== null && (
          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
            style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.96)',
              display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>
            <style>{`
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @keyframes slideInL{from{transform:translateX(40px);opacity:.5}to{transform:translateX(0);opacity:1}}
              @keyframes slideInR{from{transform:translateX(-40px);opacity:.5}to{transform:translateX(0);opacity:1}}
              @keyframes heartBurst{0%{transform:scale(0);opacity:1}50%{transform:scale(1.3);opacity:1}100%{transform:scale(1);opacity:0}}
            `}</style>

            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{selectedIndex + 1} / {items.length}</div>
              <div onClick={() => setSelectedIndex(null)} style={{
                width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <CloseOutlined style={{ color: '#fff', fontSize: 16 }} />
              </div>
            </div>

            {/* Media — double-tap zone */}
            <div onClick={() => handleDoubleTap(selectedPost.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden', minHeight: 0, cursor: 'pointer' }}>
              {heartAnimId === selectedPost.id && (
                <div style={{ position: 'absolute', zIndex: 10, pointerEvents: 'none', animation: `heartBurst ${HEART_ANIM_MS}ms ease forwards` }}>
                  <HeartFilled style={{ fontSize: 80, color: SF.like, filter: 'drop-shadow(0 4px 12px rgba(255,45,85,0.6))' }} />
                </div>
              )}
              <div key={selectedPost.id} style={{
                maxWidth: '94%', maxHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: slideDir === 'left' ? 'slideInL 0.25s ease' : slideDir === 'right' ? 'slideInR 0.25s ease' : undefined }}>
                {selectedPost.mediaType === 'video' ? (
                  <video src={selectedPost.mediaUrl} controls autoPlay muted playsInline
                    style={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 8, objectFit: 'contain' }} />
                ) : (
                  <img src={selectedPost.mediaUrl} alt="" draggable={false}
                    style={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 8, objectFit: 'contain', userSelect: 'none' }} />
                )}
              </div>
            </div>

            {/* Bottom panel */}
            <div style={{ flexShrink: 0, maxHeight: '38vh', overflowY: 'auto',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 15%)', padding: '16px 16px 12px', scrollbarWidth: 'thin' }}>

              {/* Author + Follow + time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Avatar size={36} src={selectedPost.authorAvatar}
                  icon={!selectedPost.authorAvatar ? <UserOutlined /> : undefined}
                  style={{ background: !selectedPost.authorAvatar ? SF.primary : undefined, cursor: 'pointer' }}
                  onClick={() => { setSelectedIndex(null); if (selectedPost.authorId) navigate(`/profile/${selectedPost.authorId}`); }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', cursor: 'pointer' }}
                      onClick={() => { setSelectedIndex(null); if (selectedPost.authorId) navigate(`/profile/${selectedPost.authorId}`); }}>
                      {selectedPost.authorName}
                    </span>
                    {selectedPost.authorId && selectedPost.authorId !== user?.id && !followingSet.has(selectedPost.authorId) && (
                      <span onClick={() => selectedPost.authorId && handleFollow(selectedPost.authorId)}
                        style={{ fontSize: 11, color: SF.primary, fontWeight: 700, cursor: 'pointer', padding: '2px 8px', borderRadius: 10, border: `1px solid ${SF.primary}` }}>
                        {t('common.follow')}
                      </span>
                    )}
                    {selectedPost.authorId && followingSet.has(selectedPost.authorId) && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>✓ {t('common.following')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedPost.isStory && (
                      <span style={{ fontSize: 11, color: SF.accent, fontWeight: 600 }}>{selectedPost.isHighlight ? '⭐ Highlight' : '◉ Story'}</span>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{timeAgo(selectedPost.createdAt)}</span>
                  </div>
                </div>
              </div>

              {selectedPost.caption && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8, lineHeight: 1.4 }}>{selectedPost.caption}</div>
              )}

              {/* 🐝 Action bar — fully unified for posts AND stories */}
              <>
                <div style={{ display: 'flex', gap: 16, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.12)', alignItems: 'center' }}>
                  <ActionBtn icon={likedSet.has(selectedPost.id) ? <HeartFilled style={{ fontSize: 20 }} /> : <HeartOutlined style={{ fontSize: 20 }} />}
                    label={String(selectedPost.likesCount)} color={likedSet.has(selectedPost.id) ? SF.like : 'rgba(255,255,255,0.7)'}
                    onClick={() => handleLikePost(selectedPost.id)} />
                  <ActionBtn icon={<MessageOutlined style={{ fontSize: 20 }} />}
                    label={selectedPost.commentsCount > 0 ? String(selectedPost.commentsCount) : '0'}
                    color="rgba(255,255,255,0.7)" onClick={() => setShowComments(s => !s)} />
                  {selectedPost.isStory && (
                    <ActionBtn icon={<EyeOutlined style={{ fontSize: 18 }} />}
                      label={`${selectedPost.viewCount ?? 0}`}
                      color="rgba(255,255,255,0.4)" />
                  )}
                  <ActionBtn icon={<ShareAltOutlined style={{ fontSize: 20 }} />} color="rgba(255,255,255,0.7)"
                    onClick={() => handleShare(selectedPost.id)} />
                  {selectedPost.authorId && selectedPost.authorId !== user?.id && (
                    <ActionBtn icon={<SendOutlined style={{ fontSize: 18 }} />} color="rgba(255,255,255,0.7)"
                      onClick={() => selectedPost.authorId && handleSendDM(selectedPost.authorId)} />
                  )}
                  <div style={{ flex: 1 }} />
                  <ActionBtn icon={savedSet.has(selectedPost.id) ? <BookFilled style={{ fontSize: 20 }} /> : <BookOutlined style={{ fontSize: 20 }} />}
                    color={savedSet.has(selectedPost.id) ? '#FFD700' : 'rgba(255,255,255,0.7)'}
                    onClick={() => handleSave(selectedPost.id)} />
                </div>

                {/* "View N comments" toggle */}
                {selectedPost.commentsCount > 0 && !showComments && (
                  <div onClick={() => setShowComments(true)}
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px 0' }}>
                    {t('explore.viewComments', { count: selectedPost.commentsCount })}
                  </div>
                )}

                {showComments && (
                  <>
                    <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 4, scrollbarWidth: 'thin' }}>
                      {commentsLoading ? (
                        <div style={{ textAlign: 'center', padding: 8, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                          <LoadingOutlined /> {t('common.loading')}
                        </div>
                      ) : postComments.length > 0 ? (
                        postComments.map((c: any) => {
                          const cIsOrg = c.publishAsOrg && c.organization;
                          const cAvatar = cIsOrg ? c.organization?.logoUrl : (c.authorAvatar || c.author?.avatarUrl);
                          const cName = cIsOrg ? c.organization.name : (c.authorName || [c.author?.firstName, c.author?.lastName].filter(Boolean).join(' ') || 'Utilisateur');
                          return (
                            <div key={c.id} style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'flex-start' }}>
                              <Avatar size={22} src={cAvatar} icon={!cAvatar ? <UserOutlined /> : undefined}
                                style={{ background: !cAvatar ? SF.primary : undefined, flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 600, fontSize: 12, color: '#fff' }}>{cName} </span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{c.content}</span>
                                {c.createdAt && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>{timeAgo(c.createdAt)}</span>}
                              </div>
                              <HeartFilled
                                onClick={async () => {
                                  try { const res = await api.post(`/api/zhiive/comments/${c.id}/like`); setLikedCommentsSet(prev => { const n = new Set(prev); if (res.liked) n.add(c.id); else n.delete(c.id); return n; }); } catch { /* non-blocking */ }
                                }}
                                style={{ fontSize: 12, color: likedCommentsSet.has(c.id) ? SF.like : 'rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0, marginTop: 2 }} />
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ textAlign: 'center', padding: 8, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t('explore.noBuzzesYet')}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <Input value={commentText} onChange={e => setCommentText(e.target.value)} onPressEnter={handleAddComment}
                        placeholder={t('explore.dropABuzz')}
                        style={{ borderRadius: 20, flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} size="small" />
                      <SendOutlined onClick={handleAddComment}
                        style={{ fontSize: 16, color: commentText.trim() ? SF.primary : 'rgba(255,255,255,0.3)', cursor: commentText.trim() ? 'pointer' : 'default' }} />
                    </div>
                  </>
                )}
              </>
            </div>
          </div>
        )}

        {/* ═══ Create Post Modal ═══ */}
        <Modal open={createModalOpen} onCancel={() => setCreateModalOpen(false)} onOk={handleSubmitPost}
          confirmLoading={createLoading}
          title={createMediaType === 'photo' ? t('explore.addPhoto') : t('explore.addVideo')}
          okText={t('common.publish')} cancelText={t('common.cancel')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input ref={createFileRef} type="file" accept={createMediaType === 'photo' ? 'image/*' : 'video/*'}
              onChange={e => setCreateFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            <div onClick={() => createFileRef.current?.click()} style={{
              border: `2px dashed ${SF.border}`, borderRadius: 12, padding: 32,
              textAlign: 'center', cursor: 'pointer', background: SF.cardBg }}>
              {createFile ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: SF.text }}>{createFile.name}</div>
              ) : (
                <>
                  {createMediaType === 'photo'
                    ? <PictureOutlined style={{ fontSize: 32, color: SF.textMuted }} />
                    : <VideoCameraOutlined style={{ fontSize: 32, color: SF.textMuted }} />}
                  <div style={{ fontSize: 12, color: SF.textMuted, marginTop: 8 }}>{t('explore.clickToSelect')}</div>
                </>
              )}
            </div>
            <Input.TextArea value={createCaption} onChange={e => setCreateCaption(e.target.value)}
              placeholder={t('explore.captionPlaceholder')} rows={3} maxLength={500} showCount style={{ borderRadius: 8 }} />
          </div>
        </Modal>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

const FilterPill: React.FC<{ label: string; items: { key: string; label: string }[]; selected: string; onSelect: (key: string) => void }> = ({ label, items, selected, onSelect }) => (
  <Dropdown menu={{ items: items.map(i => ({ key: i.key, label: i.label })), onClick: ({ key }) => onSelect(key), selectedKeys: [selected] }} trigger={['click']}>
    <div style={{ padding: '4px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: SF.cardBg, color: SF.text, boxShadow: SF.shadow, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      {label} <DownOutlined style={{ fontSize: 8, color: SF.textMuted }} />
    </div>
  </Dropdown>
);

const ActionBtn: React.FC<{ icon: React.ReactNode; label?: string; color: string; onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <span onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13, color, transition: 'color 0.15s' }}>
    {icon} {label && <span>{label}</span>}
  </span>
);

/** Instagram-style mixed grid */
const InstaGrid: React.FC<{ items: GalleryItem[]; likedSet: Set<string>; onOpen: (item: GalleryItem) => void; cols?: number }> = ({ items, likedSet, onOpen, cols = 3 }) => {
  const rows: React.ReactNode[] = [];
  let i = 0;

  while (i < items.length) {
    const groupIndex = Math.floor(i / 9) % 2;

    // 2 normal rows (cols each)
    for (let row = 0; row < 2 && i < items.length; row++) {
      const rowItems = items.slice(i, Math.min(i + cols, items.length));
      rows.push(
        <div key={`r-${i}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
          {rowItems.map(item => <GridCell key={item.id} item={item} liked={likedSet.has(item.id)} onOpen={onOpen} />)}
        </div>
      );
      i += rowItems.length;
    }

    // 1 featured row (big + 2 small)
    if (i < items.length) {
      const bigItem = items[i];
      const sm1 = items[i + 1];
      const sm2 = items[i + 2];
      const bigLeft = groupIndex === 0;
      rows.push(
        <div key={`f-${i}`} style={{ display: 'grid', gridTemplateColumns: bigLeft ? '2fr 1fr' : '1fr 2fr', gridTemplateRows: '1fr 1fr', gap: 3 }}>
          {bigLeft ? (
            <>
              <div style={{ gridRow: 'span 2' }}><GridCell item={bigItem} liked={likedSet.has(bigItem.id)} onOpen={onOpen} tall /></div>
              {sm1 && <GridCell item={sm1} liked={likedSet.has(sm1.id)} onOpen={onOpen} />}
              {sm2 && <GridCell item={sm2} liked={likedSet.has(sm2.id)} onOpen={onOpen} />}
            </>
          ) : (
            <>
              {sm1 && <GridCell item={sm1} liked={likedSet.has(sm1.id)} onOpen={onOpen} />}
              <div style={{ gridRow: 'span 2' }}><GridCell item={bigItem} liked={likedSet.has(bigItem.id)} onOpen={onOpen} tall /></div>
              {sm2 && <GridCell item={sm2} liked={likedSet.has(sm2.id)} onOpen={onOpen} />}
            </>
          )}
        </div>
      );
      i += 1 + (sm1 ? 1 : 0) + (sm2 ? 1 : 0);
    }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{rows}</div>;
};

/** Single grid cell */
const GridCell: React.FC<{ item: GalleryItem; liked: boolean; onOpen: (item: GalleryItem) => void; tall?: boolean }> = React.memo(({ item, liked, onOpen, tall }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div onClick={() => onOpen(item)}
      onMouseEnter={() => { if (item.mediaType === 'video' && videoRef.current) videoRef.current.play().catch(() => {}); }}
      onMouseLeave={() => { if (item.mediaType === 'video' && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
      style={{ position: 'relative', cursor: 'pointer', aspectRatio: tall ? undefined : '1/1',
        height: tall ? '100%' : undefined, borderRadius: 4, overflow: 'hidden', background: '#000' }}>
      {item.mediaType === 'video' ? (
        <video ref={videoRef} src={item.mediaUrl} muted preload="metadata" playsInline loop
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <img src={item.mediaUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Badges top-right */}
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3 }}>
        {item.mediaType === 'video' && <span style={{ color: '#fff', fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}><PlayCircleOutlined /></span>}
        {(item.mediaCount ?? 0) > 1 && <span style={{ color: '#fff', fontSize: 11, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}><CopyOutlined /></span>}
      </div>

      {item.isStory && (
        <div style={{ position: 'absolute', top: 4, left: 4, background: SF.gradientStory, padding: '1px 6px', borderRadius: 8, fontSize: 9, color: '#fff', fontWeight: 700 }}>
          {item.isHighlight ? '⭐' : '◉'} Story
        </div>
      )}

      {/* Hover overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12, opacity: 0, transition: 'opacity 0.2s', color: '#fff', fontSize: 13, fontWeight: 700 }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HeartFilled /> {item.likesCount}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageOutlined /> {item.commentsCount}</span>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
        padding: '10px 5px 3px', display: 'flex', gap: 6, color: '#fff', fontSize: 9 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {liked ? <HeartFilled style={{ color: SF.like, fontSize: 10 }} /> : <HeartOutlined style={{ fontSize: 10 }} />} {item.likesCount}
        </span>
        <span>💬 {item.commentsCount}</span>
      </div>
    </div>
  );
});

/** People card */
const PeopleCard: React.FC<{
  user: SuggestedUser; isFollowed: boolean;
  onNavigate: () => void; onMessage: () => void; onFriend?: () => void; onFollow?: () => void;
  t: (key: string) => string;
}> = React.memo(({ user: su, isFollowed, onNavigate, onMessage, onFriend, onFollow, t }) => {
  const isFriend = su.friendStatus === 'accepted';
  const isPending = su.friendStatus === 'pending';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: SF.cardBg, borderRadius: SF.radiusSm, boxShadow: SF.shadow }}>
      <Avatar size={48} src={su.avatarUrl} icon={!su.avatarUrl ? <UserOutlined /> : undefined}
        style={{ background: !su.avatarUrl ? SF.primary : undefined, flexShrink: 0, cursor: 'pointer' }} onClick={onNavigate} />
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onNavigate}>
        <div style={{ fontSize: 14, fontWeight: 600, color: SF.text }}>
          {su.firstName} {su.lastName}
          {isFriend && <span style={{ marginLeft: 4, fontSize: 11, color: SF.successAlt }}>{t('explore.isFriend')}</span>}
          {su.sameOrg && <span style={{ marginLeft: 4, fontSize: 9, background: SF.primary + '20', color: SF.primary, padding: '1px 5px', borderRadius: 6 }}>Org</span>}
        </div>
        <div style={{ fontSize: 11, color: SF.textSecondary }}>{su.role}</div>
        {su.mutualFriends > 0 && <div style={{ fontSize: 10, color: SF.textMuted }}>{su.mutualFriends} {t('explore.mutualFriends')}</div>}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <CircleBtn icon={<MessageOutlined />} bg={SF.bgInfoTint} color={SF.info} onClick={onMessage} />
        {onFriend && <CircleBtn
          icon={isFriend ? '🤝' : (isPending && su.friendDirection === 'received') ? '✅' : isPending ? '⏳' : <TeamOutlined />}
          bg={isFriend ? SF.bgSuccessTint : (isPending && su.friendDirection === 'received') ? SF.bgInfoTint : isPending ? SF.bgWarningTint : SF.bgCard}
          color={isFriend ? SF.successAlt : (isPending && su.friendDirection === 'received') ? SF.info : isPending ? SF.orangeAlt : SF.textSecondary}
          border={isFriend ? `1px solid ${SF.successBorder}` : (isPending && su.friendDirection === 'received') ? `2px solid ${SF.info}` : isPending ? `1px solid ${SF.warningBorder}` : `1px solid ${SF.borderLight}`}
          pulse={isPending && su.friendDirection === 'received'} onClick={onFriend} />}
        {onFollow && <div onClick={onFollow} style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: isFollowed ? SF.bg : SF.gradientPrimary, color: isFollowed ? SF.textSecondary : 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          border: isFollowed ? `1px solid ${SF.border}` : 'none', transition: 'all 0.15s' }}>
          {isFollowed ? t('common.following') : t('common.follow')}
        </div>}
      </div>
    </div>
  );
});

const CircleBtn: React.FC<{ icon: React.ReactNode; bg: string; color: string; border?: string; pulse?: boolean; onClick: () => void }> = ({ icon, bg, color, border, pulse, onClick }) => (
  <div onClick={onClick} style={{
    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', background: bg, color, fontSize: 14, transition: 'all 0.15s',
    border: border || 'none', animation: pulse ? 'pulse 1.5s infinite' : 'none' }}>
    {icon}
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    {icon}
    <div style={{ fontSize: 16, fontWeight: 700, color: SF.text, marginTop: 12 }}>{title}</div>
    <div style={{ fontSize: 12, color: SF.textSecondary, marginTop: 4 }}>{subtitle}</div>
  </div>
);

export default ExplorePanel;
