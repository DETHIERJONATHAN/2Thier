import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MAX_VIDEO_SIZE } from '../../lib/constants';
import { useNavigate } from 'react-router-dom';
import { Avatar, Spin, Modal, Input, message } from 'antd';
import {
  HeartOutlined, HeartFilled, MessageOutlined, ShareAltOutlined,
  SoundOutlined, PauseCircleOutlined, PlayCircleOutlined,
  PlusOutlined, UserOutlined, VideoCameraOutlined,
  CloseOutlined, SendOutlined, LoadingOutlined, DeleteOutlined,
  BookOutlined, BookFilled, RetweetOutlined, CopyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useZhiiveNav } from '../../contexts/ZhiiveNavContext';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';
import { useSocialIdentity } from '../../contexts/SocialIdentityContext';
import { SF } from './ZhiiveTheme';
import { useDoubleTap } from './shared/useDoubleTap';
import HeartBurstOverlay, { heartBurstKeyframes } from './shared/HeartBurstOverlay';
import { logger } from '../../lib/logger';

interface Reel {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  caption?: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  hashtags: string[];
  musicName?: string;
}

interface ReelsPanelProps {
  api: unknown;
  currentUser: unknown;
}

const ReelsPanel: React.FC<ReelsPanelProps> = ({ api, currentUser }) => {
  const { t } = useTranslation();
  const { feedMode } = useZhiiveNav();
  // 🐝 Identité centralisée — source unique pour l'identité de publication
  const identity = useActiveIdentity();
  const { isOrgMode, organization: currentOrganization } = identity;
  const orgLogo = currentOrganization?.logoUrl || null;
  const commentAvatarSrc = identity.avatarUrl;
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [followedSet, setFollowedSet] = useState<Set<string>>(new Set());

  // === Création de Reel ===
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reelCaption, setReelCaption] = useState('');
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelPreview, setReelPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reelVisibility, setReelVisibility] = useState<string>(currentOrganization ? 'IN' : 'ALL');

  // 🐝 Sync visibilité quand le mode change (Bee ↔ Colony)
  useEffect(() => {
    setReelVisibility(currentOrganization ? 'IN' : 'ALL');
  }, [currentOrganization]);

  // === Commentaires ===
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // === Partage et enregistrement ===
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareReel, setShareReel] = useState<Reel | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  // === Hive Live ===
  const { isAppEnabled } = useSocialIdentity();
  const [hiveLiveModalOpen, setHiveLiveModalOpen] = useState(false);
  const [hiveLiveTitle, setHiveLiveTitle] = useState('');
  const [hiveLiveSaving, setHiveLiveSaving] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const navigate = useNavigate();

  // 🐝 Double-tap like with heart animation
  const { handleTap: handleDoubleTap, heartAnimId } = useDoubleTap({
    onDoubleTap: (id: string) => {
      const idx = reels.findIndex(r => r.id === id);
      if (idx >= 0 && !reels[idx].isLiked) toggleLike(idx);
    },
  });

  // 🐝 Send DM
  const handleSendDM = useCallback(async (authorId: string) => {
    try {
      const res = await api.post('/api/messenger/conversations', { participantIds: [authorId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
        message.success(t('explore.whisperOpened'));
      }
    } catch {
      message.error(t('explore.whisperError'));
    }
  }, [api, t]);

  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((text: string, type: 'ok' | 'err' = 'ok') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    loadReels();
    return () => { if (reelPreview) URL.revokeObjectURL(reelPreview); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedMode]);

  const loadReels = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/zhiive/reels?limit=20&mode=${feedMode}`);
      const videos = (data?.reels || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        authorId: p.authorId || '',
        authorName: p.authorName || 'Bee',
        authorAvatar: p.authorAvatar,
        caption: p.caption || '',
        mediaUrl: p.mediaUrl,
        mediaType: 'video' as const,
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        sharesCount: 0,
        isLiked: p.isLiked || false,
        hashtags: [],
        musicName: undefined,
      }));
      setReels(videos);
      // Charger les reels sauvegardés depuis la DB
      try {
        const savedData = await api.get('/api/zhiive/saved-reels');
        if (savedData?.savedPostIds) setSavedSet(new Set(savedData.savedPostIds));
      } catch {}
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const newIndex = Math.round(el.scrollTop / el.offsetHeight);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      // Pause previous, play current
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if (i === newIndex) { v.play().catch(() => {}); }
        else { v.pause(); }
      });
    }
  }, [activeIndex]);

  const toggleLike = (index: number) => {
    const reel = reels[index];
    const wasLiked = reel.isLiked;
    // Mise à jour optimiste
    setReels(prev => prev.map((r, i) => i === index ? {
      ...r, isLiked: !r.isLiked,
      likesCount: r.likesCount + (r.isLiked ? -1 : 1),
    } : r));
    if (reel?.id) {
      api.post(`/api/wall/posts/${reel.id}/reactions`, { type: 'LIKE' }).catch(() => {
        // Rollback si l'API échoue
        setReels(prev => prev.map((r, i) => i === index ? {
          ...r, isLiked: wasLiked,
          likesCount: r.likesCount + (wasLiked ? 1 : -1),
        } : r));
      });
    }
  };

  const handleFollow = async (authorId: string, authorName: string) => {
    if (!authorId) return;
    try {
      if (followedSet.has(authorId)) {
        await api.delete(`/api/zhiive/follow/${authorId}`);
        setFollowedSet(prev => { const next = new Set(prev); next.delete(authorId); return next; });
        showToast(t('reels.unfollowedUser', { name: authorName.replace(/\s+/g, '').toLowerCase() }));
      } else {
        await api.post(`/api/zhiive/follow/${authorId}`);
        setFollowedSet(prev => new Set(prev).add(authorId));
        showToast(t('reels.followedUser', { name: authorName.replace(/\s+/g, '').toLowerCase() }));
      }
    } catch {
      showToast(t('reels.followFailed'), 'err');
    }
  };

  const handleShare = (reel: Reel) => {
    setShareReel(reel);
    setShareSheetOpen(true);
  };

  const handleCopyLink = () => {
    const text = t('reels.reelBy', { name: shareReel?.authorName }) + ': ' + (shareReel?.caption || t('reels.checkOutReel'));
    navigator.clipboard?.writeText(text).then(() => showToast(t('common.linkCopied'))).catch(() => showToast(t('common.copied')));
    setShareSheetOpen(false);
  };

  const handleRepost = async () => {
    if (!shareReel) { setShareSheetOpen(false); return; }
    try {
      await api.post('/api/wall/posts', {
        content: `${t('reels.rebuzzed')}: ${shareReel.caption || ''}`.trim(),
        mediaUrls: shareReel.mediaUrl ? [shareReel.mediaUrl] : [],
        mediaType: shareReel.mediaType,
        visibility: reelVisibility,
        publishAsOrg: identity.publishAsOrg,
      });
      showToast(t('reels.reelSharedOnHive'));
    } catch { showToast(t('reels.repostError'), 'err'); }
    setShareSheetOpen(false);
  };

  const handleSendReel = () => {
    if (navigator.share && shareReel) {
      navigator.share({ title: t('reels.reelBy', { name: shareReel.authorName }), text: shareReel.caption || t('reels.checkOutReel') }).catch(() => {});
    } else { handleCopyLink(); }
    setShareSheetOpen(false);
  };

  const handleAddToHiveLive = async () => {
    if (!shareReel || !hiveLiveTitle.trim()) return;
    setHiveLiveSaving(true);
    try {
      await api.post(`/api/hive-live/from-post/${shareReel.id}`, { title: hiveLiveTitle.trim() });
      showToast(t('hive.addedToHiveLive', 'Ajouté à votre Hive Live !'));
      setHiveLiveModalOpen(false);
      setHiveLiveTitle('');
    } catch {
      showToast(t('hive.errorAddingToHiveLive', 'Erreur'), 'err');
    } finally {
      setHiveLiveSaving(false);
    }
  };

  const handleSaveReel = async (reelId: string) => {
    const wasSaved = savedSet.has(reelId);
    // Optimistic update
    setSavedSet(prev => {
      const next = new Set(prev);
      if (wasSaved) { next.delete(reelId); showToast(t('reels.removedFromSaved')); }
      else { next.add(reelId); showToast(t('reels.reelSaved')); }
      return next;
    });
    try {
      if (wasSaved) await api.delete(`/api/zhiive/saved-reels/${reelId}`);
      else await api.post(`/api/zhiive/saved-reels/${reelId}`);
    } catch {
      // Rollback
      setSavedSet(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(reelId); else next.delete(reelId);
        return next;
      });
    }
  };

  const handleCommentLike = async (commentId: string) => {
    const wasLiked = likedComments.has(commentId);
    // Optimistic update
    setLikedComments(prev => { const next = new Set(prev); if (wasLiked) next.delete(commentId); else next.add(commentId); return next; });
    try {
      await api.post(`/api/zhiive/comments/${commentId}/like`);
    } catch {
      // Rollback
      setLikedComments(prev => { const next = new Set(prev); if (wasLiked) next.add(commentId); else next.delete(commentId); return next; });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'maintenant';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} j`;
    return `${Math.floor(days / 7)} sem`;
  };

  // === Création de Reel ===
  const openCreateModal = () => {
    setReelCaption('');
    setReelFile(null);
    setReelPreview(null);
    setCreateModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast(t('reels.onlyVideos'), 'err');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      showToast(t('reels.fileTooLarge100'), 'err');
      return;
    }

    setReelFile(file);
    if (reelPreview) URL.revokeObjectURL(reelPreview);
    setReelPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handlePublishReel = async () => {
    if (!reelFile || submitting) return;
    setSubmitting(true);
    try {
      // 1. Upload le fichier
      const formData = new FormData();
      formData.append('files', reelFile);
      const uploadResult = await api.post('/api/wall/upload', formData) as { urls?: string[] };
      const mediaUrls = uploadResult?.urls || [];

      if (mediaUrls.length === 0) {
        showToast(t('reels.uploadFailed'), 'err');
        setSubmitting(false);
        return;
      }

      // 2. Créer le post vidéo (Reel = toujours vidéo)
      await api.post('/api/wall/posts', {
        content: reelCaption.trim() || undefined,
        mediaUrls,
        mediaType: 'video',
        visibility: reelVisibility,
        // 🐝 publishAsOrg piloté par le système d'identité centralisé
        publishAsOrg: identity.publishAsOrg,
      });

      showToast(t('reels.reelPublished'));
      setCreateModalOpen(false);
      if (reelPreview) URL.revokeObjectURL(reelPreview);
      setReelFile(null);
      setReelPreview(null);
      setReelCaption('');
      // Recharger les reels
      loadReels();
    } catch (err) {
      logger.error('[REELS] Erreur publication:', err);
      showToast(t('reels.publishError'), 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const removeSelectedFile = () => {
    if (reelPreview) URL.revokeObjectURL(reelPreview);
    setReelFile(null);
    setReelPreview(null);
  };

  // === Commentaires ===
  const openComments = async (reelId: string) => {
    setCommentReelId(reelId);
    setCommentModalOpen(true);
    setCommentLoading(true);
    setReplyingTo(null);
    setReplyText('');
    try {
      const data = await api.get(`/api/wall/posts/${reelId}/comments`);
      const loadedComments = Array.isArray(data) ? data : (data?.comments || []);
      setComments(loadedComments);
      // Charger les likes de l'utilisateur pour ces commentaires
      const commentIds = loadedComments.map((c: Record<string, unknown>) => c.id);
      const allIds = [...commentIds, ...loadedComments.flatMap((c: unknown) => (c.replies || []).map((r: Record<string, unknown>) => r.id))];
      if (allIds.length > 0) {
        try {
          const likesData = await api.post('/api/zhiive/comments/liked', { commentIds: allIds });
          if (likesData?.likedIds) setLikedComments(new Set(likesData.likedIds));
        } catch {}
      }
    } catch {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const handlePostComment = async (parentCommentId?: string) => {
    const text = parentCommentId ? replyText : commentText;
    if (!text.trim() || !commentReelId) return;
    try {
      const body: Record<string, unknown> = { content: text.trim() };
      if (parentCommentId) body.parentCommentId = parentCommentId;
      // 🐝 publishAsOrg piloté par le système d'identité centralisé
      if (identity.publishAsOrg) body.publishAsOrg = true;
      const newComment = await api.post(`/api/wall/posts/${commentReelId}/comments`, body);
      if (parentCommentId) {
        setComments(prev => prev.map(c => c.id === parentCommentId ? { ...c, replies: [...(c.replies || []), newComment] } : c));
        setReplyText('');
        setReplyingTo(null);
      } else {
        setComments(prev => [...prev, newComment]);
        setCommentText('');
      }
      setReels(prev => prev.map(r => r.id === commentReelId ? { ...r, commentsCount: r.commentsCount + 1 } : r));
    } catch {
      showToast(t('reels.commentFailed'), 'err');
    }
  };

  // === Suppression ===
  const handleDeleteReel = async (reelId: string) => {
    try {
      await api.delete(`/api/wall/posts/${reelId}`);
    } catch (err: unknown) {
      if (err?.status !== 404 && err?.response?.status !== 404) {
        showToast(t('reels.deleteFailed'), 'err');
        return;
      }
    }
    setReels(prev => prev.filter(r => r.id !== reelId));
    showToast(t('reels.reelDeleted'));
  };

  const togglePause = () => {
    const video = videoRefs.current[activeIndex];
    if (video) {
      if (video.paused) { video.play(); setPaused(false); }
      else { video.pause(); setPaused(true); }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: SF.dark }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', background: SF.dark, position: 'relative', overflow: 'hidden', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: SF.gradientOverlayTop,
      }}>
        <span role="button" tabIndex={0} onClick={() => showSaved && setShowSaved(false)} style={{ fontSize: 18, fontWeight: 800, color: SF.textLight, letterSpacing: -0.5, cursor: showSaved ? 'pointer' : 'default' }}>
          {showSaved ? '← Reels' : '🎬 Reels'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div role="button" tabIndex={0} onClick={() => setShowSaved(!showSaved)} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: showSaved ? SF.primary : SF.overlayLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            {showSaved ? <BookFilled style={{ color: SF.gold, fontSize: 16 }} /> : <BookOutlined style={{ color: SF.textLight, fontSize: 16 }} />}
          </div>
          {!showSaved && (
            <div role="button" tabIndex={0} onClick={openCreateModal} style={{
              width: 32, height: 32, borderRadius: '50%', background: SF.overlayLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <PlusOutlined style={{ color: SF.textLight, fontSize: 16 }} />
            </div>
          )}
        </div>
      </div>

      {/* Saved reels gallery */}
      {showSaved ? (() => {
        const savedReels = reels.filter(r => savedSet.has(r.id));
        return (
        <div style={{ paddingTop: 56, height: '100%', overflowY: 'auto' }}>
          {savedReels.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70%', color: SF.textMuted }}>
              <BookOutlined style={{ fontSize: 48, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t('reels.noReelsSaved')}</div>
              <div style={{ fontSize: 13 }}>{t('reels.tapSaveHint')}</div>
            </div>
          ) : (
            <div style={{ padding: '4px 4px 80px' }}>
              <div style={{ padding: '0 12px 12px', color: SF.textMuted, fontSize: 13 }}>
                {t('reels.reelsSavedCount', { count: savedReels.length })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {savedReels.map(reel => (
                  <div key={reel.id}
                    role="button" tabIndex={0} onClick={() => {
                      const idx = reels.findIndex(r => r.id === reel.id);
                      if (idx >= 0) { setActiveIndex(idx); setShowSaved(false); }
                    }}
                    style={{
                      aspectRatio: '9/16', position: 'relative', cursor: 'pointer',
                      borderRadius: 4, overflow: 'hidden', background: SF.darkBg,
                    }}>
                    {reel.mediaUrl ? (
                      <video src={reel.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: SF.gradientAccent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <VideoCameraOutlined style={{ fontSize: 24, color: SF.textLight }} />
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: SF.gradientOverlayThumb,
                      padding: '12px 4px 4px', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 10, color: SF.textLight }}>❤️ {reel.likesCount}</span>
                    </div>
                    <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); handleSaveReel(reel.id); }}
                      style={{ position: 'absolute', top: 4, right: 4, cursor: 'pointer' }}>
                      <BookFilled style={{ fontSize: 14, color: SF.gold }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        );
      })() : (
      <>
      {reels.length === 0 ? (
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: SF.textMuted,
          paddingTop: 56,
        }}>
          <VideoCameraOutlined style={{ fontSize: 56, marginBottom: 16, opacity: 0.5 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: SF.textLight, marginBottom: 8 }}>{t('reels.noReelsYet')}</div>
          <div style={{ fontSize: 13, marginBottom: 20, textAlign: 'center', maxWidth: 260 }}>
            {t('reels.beFirstToPost')}
          </div>
          <div
            role="button" tabIndex={0} onClick={openCreateModal}
            style={{
              padding: '10px 28px', borderRadius: 24,
              background: SF.gradientAccent,
              color: SF.textLight, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            <PlusOutlined /> {t('reels.createReel')}
          </div>
        </div>
      ) : (
      <>
      {/* Vertical scroll snap container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none', msOverflowStyle: 'none' as unknown,
        }}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} style={{
            height: '100%', scrollSnapAlign: 'start', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: SF.dark,
          }}>
            {/* Media — always video — with double-tap to like */}
            <div role="button" tabIndex={0} onClick={() => handleDoubleTap(reel.id)} style={{ width: '100%', height: '100%', position: 'relative' }}>
              <HeartBurstOverlay visible={heartAnimId === reel.id} />
            {reel.mediaUrl ? (
              <video
                ref={el => { videoRefs.current[index] = el; }}
                src={reel.mediaUrl}
                loop muted={muted} playsInline
                onClick={(e) => { e.stopPropagation(); togglePause(); }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: SF.black, cursor: 'pointer' }}
              />
            ) : (
              /* Fallback if video URL is missing */
              <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); togglePause(); }} style={{
                width: '100%', height: '100%', cursor: 'pointer',
                background: SF.gradientFull,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <VideoCameraOutlined style={{ fontSize: 48, marginBottom: 16, color: SF.textLight }} />
                  <div style={{ fontSize: 14, color: SF.textLight, fontWeight: 600 }}>{t('reels.videoUnavailable')}</div>
                </div>
              </div>
            )}
            </div>

            {/* Pause overlay */}
            {paused && index === activeIndex && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: SF.overlayDark, pointerEvents: 'none',
              }}>
                <PlayCircleOutlined style={{ fontSize: 64, color: SF.overlayPlayBtn }} />
              </div>
            )}

            {/* Right action bar */}
            <div style={{
              position: 'absolute', right: 12, bottom: 120, display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 20,
            }}>
              {/* Author avatar + follow */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Avatar size={44} src={reel.authorAvatar}
                  icon={!reel.authorAvatar ? <UserOutlined /> : undefined}
                  onClick={(e) => { e.stopPropagation(); if (reel.authorId) navigate(`/profile/${reel.authorId}`); }}
                  style={{ border: `2px solid ${SF.textLight}`, background: SF.primary, cursor: 'pointer' }} />
                {reel.authorId && reel.authorId !== currentUser?.id && (
                  <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); handleFollow(reel.authorId, reel.authorName); }}
                    style={{
                      position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                      width: 20, height: 20, borderRadius: '50%',
                      background: followedSet.has(reel.authorId) ? SF.successMd : SF.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                    {followedSet.has(reel.authorId)
                      ? <span style={{ fontSize: 10, color: SF.textLight, lineHeight: 1 }}>✓</span>
                      : <PlusOutlined style={{ fontSize: 10, color: SF.textLight }} />}
                  </div>
                )}
              </div>

              {/* Like */}
              <div role="button" tabIndex={0} onClick={() => toggleLike(index)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                {reel.isLiked ? (
                  <HeartFilled style={{ fontSize: 28, color: SF.like }} />
                ) : (
                  <HeartOutlined style={{ fontSize: 28, color: SF.textLight }} />
                )}
                <div style={{ fontSize: 11, color: SF.textLight, fontWeight: 600, marginTop: 2 }}>
                  {reel.likesCount > 999 ? `${(reel.likesCount / 1000).toFixed(1)}k` : reel.likesCount}
                </div>
              </div>

              {/* Comment */}
              <div role="button" tabIndex={0} onClick={() => openComments(reel.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <MessageOutlined style={{ fontSize: 26, color: SF.textLight }} />
                <div style={{ fontSize: 11, color: SF.textLight, fontWeight: 600, marginTop: 2 }}>
                  {reel.commentsCount}
                </div>
              </div>

              {/* Share */}
              <div role="button" tabIndex={0} onClick={() => handleShare(reel)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <ShareAltOutlined style={{ fontSize: 26, color: SF.textLight }} />
                <div style={{ fontSize: 11, color: SF.textLight, fontWeight: 600, marginTop: 2 }}>
                  {t('common.share')}
                </div>
              </div>

              {/* DM / Whisper */}
              {reel.authorId && reel.authorId !== currentUser?.id && (
                <div role="button" tabIndex={0} onClick={() => handleSendDM(reel.authorId)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <SendOutlined style={{ fontSize: 24, color: SF.textLight }} />
                  <div style={{ fontSize: 11, color: SF.textLight, fontWeight: 600, marginTop: 2 }}>DM</div>
                </div>
              )}

              {/* Save/Bookmark */}
              <div role="button" tabIndex={0} onClick={() => handleSaveReel(reel.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                {savedSet.has(reel.id) ? (
                  <BookFilled style={{ fontSize: 26, color: SF.gold }} />
                ) : (
                  <BookOutlined style={{ fontSize: 26, color: SF.textLight }} />
                )}
                <div style={{ fontSize: 11, color: SF.textLight, fontWeight: 600, marginTop: 2 }}>
                  {savedSet.has(reel.id) ? t('reels.saved') : t('reels.saveReel')}
                </div>
              </div>

              {/* Delete (own posts or admin) */}
              {!['d1','d2','d3'].includes(reel.id) && (currentUser?.id === reel.authorId || currentUser?.isSuperAdmin || currentUser?.role === 'admin') && (
                <div role="button" tabIndex={0} onClick={() => setDeleteConfirmId(reel.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <DeleteOutlined style={{ fontSize: 22, color: SF.textLightDimmed }} />
                </div>
              )}

              {/* Mute toggle */}
              <div role="button" tabIndex={0} onClick={() => setMuted(!muted)} style={{ cursor: 'pointer' }}>
                {muted ? (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: SF.overlayLighter,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SoundOutlined style={{ fontSize: 14, color: SF.textLight }} />
                  </div>
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: SF.overlayLightActive,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PauseCircleOutlined style={{ fontSize: 14, color: SF.textLight }} />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 60,
              padding: '60px 16px 24px',
              background: SF.gradientOverlayBottom,
            }}>
              {/* Author name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: SF.textLight }}>
                  @{reel.authorName.replace(/\s+/g, '').toLowerCase()}
                </span>
                <span
                  role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); handleFollow(reel.authorId, reel.authorName); }}
                  style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: followedSet.has(reel.authorId) ? SF.textMuted : SF.primary,
                  color: SF.textLight, fontWeight: 600, cursor: 'pointer',
                }}>
                  {followedSet.has(reel.authorId) ? t('common.following') : t('common.follow')}
                </span>
              </div>

              {/* Caption */}
              {reel.caption && (
                <div style={{ fontSize: 13, color: SF.textLight, lineHeight: 1.4, marginBottom: 8, maxHeight: 60, overflow: 'hidden' }}>
                  {reel.caption}
                </div>
              )}

              {/* Hashtags */}
              {reel.hashtags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {reel.hashtags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 12, color: SF.secondary, fontWeight: 600 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Music */}
              {reel.musicName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: SF.textLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'spin 3s linear infinite',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SF.dark }} />
                  </div>
                  <span style={{ fontSize: 12, color: SF.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {reel.musicName}
                  </span>
                </div>
              )}
            </div>

            {/* Progress dots */}
            <div style={{
              position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {reels.map((_, i) => (
                <div key={i} style={{
                  width: 4, height: i === activeIndex ? 16 : 4, borderRadius: 2,
                  background: i === activeIndex ? SF.textLight : SF.overlayLightActive,
                  transition: 'height 0.2s',
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        ${heartBurstKeyframes}
      `}</style>

      </>
      )}

      {/* Input file caché — toujours dans le DOM pour que le ref fonctionne */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Modal de création de Reel */}
      <Modal
        open={createModalOpen}
        onCancel={() => { if (!submitting) setCreateModalOpen(false); }}
        footer={null}
        title={null}
        closable={false}
        centered
        styles={{ body: { padding: 0, background: SF.dark, borderRadius: 16 }, content: { background: SF.dark, borderRadius: 16, overflow: 'hidden' } }}
        width={380}
      >
        <div style={{ padding: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: SF.textLight }}>🎬 Nouveau Reel</span>
            <CloseOutlined
              onClick={() => { if (!submitting) setCreateModalOpen(false); }}
              style={{ color: SF.textMuted, fontSize: 18, cursor: 'pointer' }}
            />
          </div>

          {/* Zone de sélection de fichier */}
          {!reelPreview ? (
            <div
              role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${SF.primary}`,
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                cursor: 'pointer',
                background: SF.bgPrimaryTint,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                <VideoCameraOutlined style={{ fontSize: 36, color: SF.primary }} />
              </div>
              <div style={{ fontSize: 15, color: SF.textLight, fontWeight: 600, marginBottom: 4 }}>
                {t('reels.selectVideo')}
              </div>
              <div style={{ fontSize: 12, color: SF.textMuted }}>
                {t('reels.videoOnly')}
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              <video
                src={reelPreview}
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 16 }}
                controls
                muted
              />
              <div
                role="button" tabIndex={0} onClick={removeSelectedFile}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 28, height: 28, borderRadius: '50%',
                  background: SF.overlayDarkStrong, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CloseOutlined style={{ color: SF.textLight, fontSize: 12 }} />
              </div>
            </div>
          )}

          {/* Caption */}
          <Input.TextArea
            value={reelCaption}
            onChange={e => setReelCaption(e.target.value)}
            placeholder={t('reels.addDescription')}
            maxLength={500}
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{
              marginTop: 16,
              background: SF.overlayLightest,
              border: `1px solid ${SF.overlayLighter}`,
              borderRadius: 12,
              color: SF.textLight,
              resize: 'none',
            }}
          />

          {/* Visibility selector */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {(currentOrganization ? ['IN', 'ALL', 'OUT'] : ['ALL', 'OUT']).map(v => {
              const labels: Record<string, { icon: string; label: string }> = {
                IN: { icon: '👥', label: t('reels.colony') },
                ALL: { icon: '🌐', label: t('reels.public') },
                OUT: { icon: '🔒', label: t('reels.private') },
              };
              const opt = labels[v];
              const active = reelVisibility === v;
              return (
                <div key={v} role="button" tabIndex={0} onClick={() => setReelVisibility(v)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  borderRadius: 16, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: active ? SF.overlayLight : SF.overlayLightFaint,
                  color: active ? SF.textLight : SF.textLightDimmed,
                  border: active ? `1px solid ${SF.overlayLightBorder}` : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <span>{opt.icon}</span> <span>{opt.label}</span>
                </div>
              );
            })}
          </div>

          {/* Bouton publier */}
          <div
            role="button" tabIndex={0} onClick={handlePublishReel}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              borderRadius: 12,
              background: reelFile ? `linear-gradient(135deg, ${SF.primary}, ${SF.accent})` : SF.overlayLightest,
              color: reelFile ? SF.textLight : SF.textMuted,
              fontWeight: 700,
              fontSize: 15,
              textAlign: 'center',
              cursor: reelFile && !submitting ? 'pointer' : 'not-allowed',
              opacity: reelFile && !submitting ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {submitting ? (
              <><LoadingOutlined spin /> {t('reels.buzzing')}</>
            ) : (
              <><SendOutlined /> {t('reels.buzzTheReel')}</>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de commentaires - style Mur */}
      <Modal
        open={commentModalOpen}
        onCancel={() => { setCommentModalOpen(false); setComments([]); setCommentText(''); setReplyingTo(null); setReplyText(''); }}
        footer={null}
        title={null}
        closable={false}
        centered
        width={400}
        styles={{ body: { padding: 0 }, content: { borderRadius: 16, overflow: 'hidden' } }}
      >
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SF.borderLighter}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>💬 Buzzes</span>
          <CloseOutlined onClick={() => { setCommentModalOpen(false); setComments([]); setCommentText(''); setReplyingTo(null); }}
            style={{ fontSize: 16, cursor: 'pointer', color: SF.textPlaceholder }} />
        </div>

        {/* Comments list */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '12px 16px' }}>
          {commentLoading ? (
            <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
          ) : comments.length > 0 ? comments.map((c: Record<string, unknown>) => {
            const cIsOrg = c.publishAsOrg && c.organization;
            const cAvatar = cIsOrg ? (c.organization?.logoUrl || null) : c.author?.avatarUrl;
            const cName = cIsOrg ? c.organization.name : [c.author?.firstName, c.author?.lastName].filter(Boolean).join(' ') || 'Bee';
            return (
            <div key={c.id} style={{ marginBottom: 16 }}>
              {/* Main comment */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar size={32} src={cAvatar}
                  icon={!cAvatar ? <UserOutlined /> : undefined}
                  style={{ flexShrink: 0, background: cIsOrg ? SF.primary : SF.borderLight }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ background: SF.bgLight, borderRadius: 12, padding: '8px 12px', width: 'fit-content', maxWidth: '90%' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: SF.dark, display: 'block' }}>
                      {cName}
                    </span>
                    <div style={{ fontSize: 14, color: SF.textDark, marginTop: 2, wordBreak: 'break-word' }}>{c.content}</div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: SF.textPlaceholder }}>{timeAgo(c.createdAt)}</span>
                    <span role="button" tabIndex={0} onClick={() => handleCommentLike(c.id)}
                      style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', color: likedComments.has(c.id) ? SF.dangerAlt : SF.textTertiary }}>
                      {likedComments.has(c.id) ? '❤️ ' + t('common.liked') : t('common.like')}
                    </span>
                    <span role="button" tabIndex={0} onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(''); }}
                      style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', color: SF.textTertiary }}>
                      {t('common.reply')}
                    </span>
                  </div>

                  {/* Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div style={{ marginTop: 8, marginLeft: 8 }}>
                      {c.replies.map((reply: Record<string, unknown>) => {
                        const rrIsOrg = reply.publishAsOrg && reply.organization;
                        const rrAvatar = rrIsOrg ? (reply.organization?.logoUrl || null) : reply.author?.avatarUrl;
                        const rrName = rrIsOrg ? reply.organization.name : [reply.author?.firstName, reply.author?.lastName].filter(Boolean).join(' ');
                        return (
                        <div key={reply.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8 }}>
                          <Avatar size={24} src={rrAvatar}
                            icon={!rrAvatar ? <UserOutlined /> : undefined}
                            style={{ flexShrink: 0, background: rrIsOrg ? SF.primary : SF.borderLight }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ background: SF.bgLight, borderRadius: 10, padding: '6px 10px', width: 'fit-content', maxWidth: '85%' }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: SF.dark }}>
                                {rrName}
                              </span>
                              <div style={{ fontSize: 13, color: SF.textDark, wordBreak: 'break-word' }}>{reply.content}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: SF.textPlaceholder }}>{timeAgo(reply.createdAt)}</span>
                              <span role="button" tabIndex={0} onClick={() => handleCommentLike(reply.id)}
                                style={{ fontSize: 11, fontWeight: 600, cursor: 'pointer', color: likedComments.has(reply.id) ? SF.dangerAlt : SF.textTertiary }}>
                                {likedComments.has(reply.id) ? '❤️' : t('common.like')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ); })}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingTo === c.id && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, marginLeft: 8 }}>
                      <Avatar size={24} src={commentAvatarSrc}
                        icon={!isOrgMode && !currentUser?.avatarUrl ? <UserOutlined /> : undefined}
                        style={{ flexShrink: 0, background: isOrgMode && !orgLogo ? SF.primary : SF.borderLight }}>
                        {isOrgMode && !orgLogo && (currentOrganization?.name?.[0]?.toUpperCase() || 'O')}
                      </Avatar>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: SF.bgLight, borderRadius: 20, padding: '4px 12px' }}>
                        <input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handlePostComment(c.id)}
                          placeholder={t('reels.replyTo', { name: c.author?.firstName || t('reels.thisComment') })}
                          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13 }}
                          autoFocus
                        />
                        <div role="button" tabIndex={0} onClick={() => handlePostComment(c.id)}
                          style={{ cursor: replyText.trim() ? 'pointer' : 'default', color: replyText.trim() ? SF.primary : SF.textPlaceholder, padding: '0 4px' }}>
                          <SendOutlined style={{ fontSize: 14 }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ); }) : (
            <div style={{ textAlign: 'center', color: SF.textPlaceholder, padding: 30 }}>
              <MessageOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
              {t('reels.noBuzzesYet')}
            </div>
          )}
        </div>

        {/* New comment input */}
        <div style={{ borderTop: `1px solid ${SF.borderLighter}`, padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Avatar size={28} src={commentAvatarSrc}
            icon={!isOrgMode && !currentUser?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ flexShrink: 0, background: isOrgMode && !orgLogo ? SF.primary : SF.borderLight }}>
            {isOrgMode && !orgLogo && (currentOrganization?.name?.[0]?.toUpperCase() || 'O')}
          </Avatar>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: SF.bgLight, borderRadius: 20, padding: '6px 12px' }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePostComment()}
              placeholder={t('reels.dropABuzz')}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
            />
            <div role="button" tabIndex={0} onClick={() => handlePostComment()}
              style={{ cursor: commentText.trim() ? 'pointer' : 'default', color: commentText.trim() ? SF.primary : SF.textPlaceholder, padding: '0 4px' }}>
              <SendOutlined style={{ fontSize: 16 }} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmation de suppression (state-based, pas Modal.confirm) */}
      <Modal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        centered
        width={320}
        footer={null}
        closable={false}
        styles={{ body: { padding: 0 }, content: { borderRadius: 16, overflow: 'hidden' } }}
      >
        <div style={{ padding: 24, textAlign: 'center' }}>
          <DeleteOutlined style={{ fontSize: 36, color: SF.danger, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t('reels.deleteReel')}</div>
          <div style={{ fontSize: 13, color: SF.textSecondary, marginBottom: 20 }}>{t('reels.irreversible')}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div role="button" tabIndex={0} onClick={() => setDeleteConfirmId(null)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: SF.bgLight, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {t('common.cancel')}
            </div>
            <div role="button" tabIndex={0} onClick={async () => { if (deleteConfirmId) { await handleDeleteReel(deleteConfirmId); setDeleteConfirmId(null); } }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: SF.danger, color: SF.textLight, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {t('common.delete')}
            </div>
          </div>
        </div>
      </Modal>

      {/* Share bottom sheet - 100% mobile */}
      {shareSheetOpen && (
        <>
          <div role="button" tabIndex={0} onClick={() => setShareSheetOpen(false)}
            style={{ position: 'absolute', inset: 0, background: SF.overlayDarkMd, zIndex: 50 }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 51,
            background: SF.cardBg, borderRadius: '16px 16px 0 0',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ padding: '12px 0' }}>
              {/* Drag handle */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: SF.borderLight, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>{t('reels.shareTitle')}</div>

              {/* Share options grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 16px', marginBottom: 16 }}>
                <div role="button" tabIndex={0} onClick={handleRepost} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: SF.bgGreenTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RetweetOutlined style={{ fontSize: 22, color: SF.successMd }} />
                  </div>
                  <span style={{ fontSize: 11, color: SF.textDark, textAlign: 'center' }}>{t('reels.rebuzz')}</span>
                </div>
                <div role="button" tabIndex={0} onClick={handleSendReel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: SF.bgBlueTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SendOutlined style={{ fontSize: 22, color: SF.infoAlt }} />
                  </div>
                  <span style={{ fontSize: 11, color: SF.textDark, textAlign: 'center' }}>{t('common.send')}</span>
                </div>
                <div role="button" tabIndex={0} onClick={() => { if (shareReel) handleSaveReel(shareReel.id); setShareSheetOpen(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: SF.bgDangerTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOutlined style={{ fontSize: 22, color: SF.orange }} />
                  </div>
                  <span style={{ fontSize: 11, color: SF.textDark, textAlign: 'center' }}>{t('reels.saveReel')}</span>
                </div>
                <div role="button" tabIndex={0} onClick={handleCopyLink} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: SF.bgPurpleTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CopyOutlined style={{ fontSize: 22, color: SF.purple }} />
                  </div>
                  <span style={{ fontSize: 11, color: SF.textDark, textAlign: 'center' }}>{t('reels.copyLink')}</span>
                </div>
                {isAppEnabled('hiveLive') && shareReel?.authorId === currentUser?.id && (
                  <div role="button" tabIndex={0} onClick={() => {
                    setHiveLiveTitle(shareReel?.caption?.substring(0, 100) || '');
                    setHiveLiveModalOpen(true);
                    setShareSheetOpen(false);
                  }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: SF.bgWarningTintAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22 }}>🐝</span>
                    </div>
                    <span style={{ fontSize: 11, color: SF.textDark, textAlign: 'center' }}>Hive Live</span>
                  </div>
                )}
              </div>

              {/* Cancel */}
              <div role="button" tabIndex={0} onClick={() => setShareSheetOpen(false)}
                style={{ textAlign: 'center', padding: '12px 16px', borderTop: `1px solid ${SF.borderLighter}`, fontSize: 15, fontWeight: 600, color: SF.textPlaceholder, cursor: 'pointer' }}>
                {t('common.cancel')}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 🐝 Hive Live modal */}
      {hiveLiveModalOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div role="button" tabIndex={0} onClick={() => { setHiveLiveModalOpen(false); setHiveLiveTitle(''); }}
            style={{ position: 'absolute', inset: 0, background: SF.overlayDarkStrong }} />
          <div style={{
            position: 'relative', zIndex: 61, background: SF.cardBg, borderRadius: 16,
            padding: 24, width: '90%', maxWidth: 360,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: SF.textDark }}>
              🐝 {t('hive.addToHiveLive', 'Ajouter à mon Hive Live')}
            </div>
            <p style={{ fontSize: 13, color: SF.textSecondary, marginBottom: 12 }}>
              {t('hive.hiveLiveExplanation', 'Ce reel sera ajouté à votre ligne de vie.')}
            </p>
            <input
              value={hiveLiveTitle}
              onChange={e => setHiveLiveTitle(e.target.value)}
              placeholder={t('hive.momentTitlePlaceholder', 'Donnez un titre à ce moment')}
              maxLength={200}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${SF.borderLight}`, fontSize: 14, outline: 'none',
                marginBottom: 16, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setHiveLiveModalOpen(false); setHiveLiveTitle(''); }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${SF.borderLight}`,
                  background: SF.cardBg, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: SF.textSecondary,
                }}
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleAddToHiveLive}
                disabled={hiveLiveSaving || !hiveLiveTitle.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: SF.primary, color: SF.textLight, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  opacity: hiveLiveSaving || !hiveLiveTitle.trim() ? 0.5 : 1,
                }}
              >
                {hiveLiveSaving ? '...' : t('hive.addMoment', 'Ajouter')}
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'err' ? SF.danger : SF.overlayDarkVeryHeavy,
          color: SF.textLight, padding: '8px 20px', borderRadius: 20, fontSize: 13,
          fontWeight: 600, zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: `0 4px 12px ${SF.overlayDark}`,
          animation: 'fadeInToast 0.2s ease-out',
        }}>
          {toast.text}
        </div>
      )}

      <style>{`@keyframes fadeInToast { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
};

export default ReelsPanel;
