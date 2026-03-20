import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, Spin, Modal, Input } from 'antd';
import {
  HeartOutlined, HeartFilled, MessageOutlined, ShareAltOutlined,
  SoundOutlined, PauseCircleOutlined, PlayCircleOutlined,
  PlusOutlined, UserOutlined, VideoCameraOutlined, PictureOutlined,
  CloseOutlined, SendOutlined, LoadingOutlined, DeleteOutlined,
  BookOutlined, BookFilled, RetweetOutlined, CopyOutlined,
} from '@ant-design/icons';

const SF = {
  primary: '#6C5CE7',
  secondary: '#00CEC9',
  accent: '#FD79A8',
  dark: '#1a1a2e',
  text: '#fff',
  textMuted: 'rgba(255,255,255,0.7)',
};

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
  api: any;
  currentUser: any;
}

const ReelsPanel: React.FC<ReelsPanelProps> = ({ api, currentUser }) => {
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
  const [reelMediaType, setReelMediaType] = useState<'video' | 'image'>('video');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === Commentaires ===
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // === Partage et enregistrement ===
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareReel, setShareReel] = useState<Reel | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('sf_saved_reels'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = useCallback((text: string, type: 'ok' | 'err' = 'ok') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    loadReels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReels = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/spaceflow/explore/posts?limit=20');
      const posts = (data?.posts || []).map((p: any, i: number) => ({
        id: p.id || `reel-${i}`,
        authorId: p.authorId || '',
        authorName: p.authorName || 'Utilisateur',
        authorAvatar: p.authorAvatar,
        caption: p.caption || '',
        mediaUrl: p.mediaUrl || '',
        mediaType: (p.mediaType === 'video' ? 'video' : 'image') as 'video' | 'image',
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        sharesCount: 0,
        isLiked: p.isLiked || false,
        hashtags: [],
        musicName: undefined,
      }));
      setReels(posts.length > 0 ? posts : getDemoReels());
    } catch {
      setReels(getDemoReels());
    } finally {
      setLoading(false);
    }
  };

  const getDemoReels = (): Reel[] => [
    { id: 'd1', authorId: '', authorName: 'SpaceFlow', caption: '🚀 Bienvenue sur les Reels SpaceFlow ! Partagez vos moments créatifs en vidéo courte.', mediaUrl: '', mediaType: 'image', likesCount: 234, commentsCount: 18, sharesCount: 5, isLiked: false, hashtags: ['SpaceFlow', 'Reels'], musicName: '🎵 Trending Sound' },
    { id: 'd2', authorId: '', authorName: 'Créateur Pro', caption: '💡 Montrez votre savoir-faire ! Chantiers, installations, tutoriels...', mediaUrl: '', mediaType: 'image', likesCount: 156, commentsCount: 12, sharesCount: 3, isLiked: false, hashtags: ['Pro', 'Tutoriel'], musicName: '🎵 Creative Vibes' },
    { id: 'd3', authorId: '', authorName: 'L\'équipe', caption: '🎬 Filmez vos réalisations et inspirez la communauté !', mediaUrl: '', mediaType: 'image', likesCount: 89, commentsCount: 7, sharesCount: 2, isLiked: false, hashtags: ['Motivation', 'Team'] },
  ];

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
    setReels(prev => prev.map((r, i) => i === index ? {
      ...r, isLiked: !r.isLiked,
      likesCount: r.likesCount + (r.isLiked ? -1 : 1),
    } : r));
    // Persist like to API (fire and forget)
    if (reel?.id && !reel.id.startsWith('d')) {
      api.post(`/api/wall/posts/${reel.id}/reactions`, { type: 'LIKE' }).catch(() => {});
    }
  };

  const handleFollow = async (authorId: string, authorName: string) => {
    if (!authorId) return;
    try {
      if (followedSet.has(authorId)) {
        await api.delete(`/api/spaceflow/follow/${authorId}`);
        setFollowedSet(prev => { const next = new Set(prev); next.delete(authorId); return next; });
        showToast(`Désabonné de @${authorName.replace(/\s+/g, '').toLowerCase()}`);
      } else {
        await api.post(`/api/spaceflow/follow/${authorId}`);
        setFollowedSet(prev => new Set(prev).add(authorId));
        showToast(`Suivi @${authorName.replace(/\s+/g, '').toLowerCase()} ! 🎉`);
      }
    } catch {
      showToast('Erreur lors du suivi', 'err');
    }
  };

  const handleShare = (reel: Reel) => {
    setShareReel(reel);
    setShareSheetOpen(true);
  };

  const handleCopyLink = () => {
    const text = `Reel de @${shareReel?.authorName}: ${shareReel?.caption || 'Regardez ce reel !'}`;
    navigator.clipboard?.writeText(text).then(() => showToast('Lien copié !')).catch(() => showToast('Copié !'));
    setShareSheetOpen(false);
  };

  const handleRepost = async () => {
    if (!shareReel || shareReel.id.startsWith('d')) { setShareSheetOpen(false); return; }
    try {
      await api.post('/api/wall/posts', {
        content: `🔄 Republié : ${shareReel.caption || ''}`.trim(),
        mediaUrls: shareReel.mediaUrl ? [shareReel.mediaUrl] : [],
        mediaType: shareReel.mediaType,
        visibility: 'ALL',
      });
      showToast('Reel republié sur votre mur ! 🔄');
    } catch { showToast('Erreur lors de la republication', 'err'); }
    setShareSheetOpen(false);
  };

  const handleSendReel = () => {
    if (navigator.share && shareReel) {
      navigator.share({ title: `Reel de @${shareReel.authorName}`, text: shareReel.caption || 'Regardez ce reel !' }).catch(() => {});
    } else { handleCopyLink(); }
    setShareSheetOpen(false);
  };

  const handleSaveReel = (reelId: string) => {
    setSavedSet(prev => {
      const next = new Set(prev);
      if (next.has(reelId)) { next.delete(reelId); showToast('Retiré des enregistrements'); }
      else { next.add(reelId); showToast('Reel enregistré ! 📌'); }
      try { localStorage.setItem('sf_saved_reels', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleCommentLike = (commentId: string) => {
    setLikedComments(prev => { const next = new Set(prev); if (next.has(commentId)) next.delete(commentId); else next.add(commentId); return next; });
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
    setReelMediaType('video');
    setCreateModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      showToast('Seules les vidéos et images sont acceptées', 'err');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('Fichier trop volumineux (max 100 Mo)', 'err');
      return;
    }

    setReelFile(file);
    setReelMediaType(isVideo ? 'video' : 'image');
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
        showToast('Échec de l\'upload du fichier', 'err');
        setSubmitting(false);
        return;
      }

      // 2. Créer le post avec les médias
      await api.post('/api/wall/posts', {
        content: reelCaption.trim() || undefined,
        mediaUrls,
        mediaType: reelMediaType,
        visibility: 'ALL',
      });

      showToast('Reel publié ! 🎬');
      setCreateModalOpen(false);
      if (reelPreview) URL.revokeObjectURL(reelPreview);
      setReelFile(null);
      setReelPreview(null);
      setReelCaption('');
      // Recharger les reels
      loadReels();
    } catch (err) {
      console.error('[REELS] Erreur publication:', err);
      showToast('Erreur lors de la publication du reel', 'err');
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
      setComments(Array.isArray(data) ? data : (data?.comments || []));
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
      const body: Record<string, string> = { content: text.trim() };
      if (parentCommentId) body.parentCommentId = parentCommentId;
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
      showToast('Erreur lors de l\'envoi du commentaire', 'err');
    }
  };

  // === Suppression ===
  const handleDeleteReel = async (reelId: string) => {
    try {
      await api.delete(`/api/wall/posts/${reelId}`);
    } catch (err: any) {
      if (err?.status !== 404 && err?.response?.status !== 404) {
        showToast('Erreur lors de la suppression', 'err');
        return;
      }
    }
    setReels(prev => prev.filter(r => r.id !== reelId));
    showToast('Reel supprimé');
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
    <div style={{ height: '100%', background: SF.dark, position: 'relative' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
      }}>
        <span onClick={() => showSaved && setShowSaved(false)} style={{ fontSize: 18, fontWeight: 800, color: SF.text, letterSpacing: -0.5, cursor: showSaved ? 'pointer' : 'default' }}>
          {showSaved ? '← Reels' : '🎬 Reels'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div onClick={() => setShowSaved(!showSaved)} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: showSaved ? SF.primary : 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            {showSaved ? <BookFilled style={{ color: '#FDCB6E', fontSize: 16 }} /> : <BookOutlined style={{ color: SF.text, fontSize: 16 }} />}
          </div>
          {!showSaved && (
            <div onClick={openCreateModal} style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <PlusOutlined style={{ color: SF.text, fontSize: 16 }} />
            </div>
          )}
        </div>
      </div>

      {/* Saved reels gallery */}
      {showSaved ? (
        <div style={{ paddingTop: 56, height: '100%', overflowY: 'auto' }}>
          {savedSet.size === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70%', color: SF.textMuted }}>
              <BookOutlined style={{ fontSize: 48, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Aucun reel enregistré</div>
              <div style={{ fontSize: 13 }}>Appuyez sur 📌 Enregistrer sur un reel pour le retrouver ici</div>
            </div>
          ) : (
            <div style={{ padding: '4px 4px 80px' }}>
              <div style={{ padding: '0 12px 12px', color: SF.textMuted, fontSize: 13 }}>
                {savedSet.size} reel{savedSet.size > 1 ? 's' : ''} enregistré{savedSet.size > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {reels.filter(r => savedSet.has(r.id)).map(reel => (
                  <div key={reel.id}
                    onClick={() => {
                      const idx = reels.findIndex(r => r.id === reel.id);
                      if (idx >= 0) { setActiveIndex(idx); setShowSaved(false); }
                    }}
                    style={{
                      aspectRatio: '9/16', position: 'relative', cursor: 'pointer',
                      borderRadius: 4, overflow: 'hidden', background: '#222',
                    }}>
                    {reel.mediaUrl && reel.mediaType === 'video' ? (
                      <video src={reel.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : reel.mediaUrl ? (
                      <img src={reel.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, #6C5CE7 0%, #FD79A8 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 8,
                      }}>
                        <div style={{ fontSize: 11, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>
                          {reel.caption?.slice(0, 60) || '🎬'}
                        </div>
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '12px 4px 4px', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 10, color: '#fff' }}>❤️ {reel.likesCount}</span>
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); handleSaveReel(reel.id); }}
                      style={{ position: 'absolute', top: 4, right: 4, cursor: 'pointer' }}>
                      <BookFilled style={{ fontSize: 14, color: '#FDCB6E' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Vertical scroll snap container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none', msOverflowStyle: 'none' as any,
        }}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} style={{
            height: '100%', scrollSnapAlign: 'start', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: SF.dark,
          }}>
            {/* Media (video or image placeholder) */}
            {reel.mediaUrl && reel.mediaType === 'video' ? (
              <video
                ref={el => { videoRefs.current[index] = el; }}
                src={reel.mediaUrl}
                loop muted={muted} playsInline
                onClick={togglePause}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              />
            ) : (
              /* Gradient placeholder for reels without video */
              <div onClick={togglePause} style={{
                width: '100%', height: '100%', cursor: 'pointer',
                background: [
                  'linear-gradient(135deg, #6C5CE7 0%, #FD79A8 50%, #FDCB6E 100%)',
                  'linear-gradient(135deg, #00CEC9 0%, #6C5CE7 50%, #e84393 100%)',
                  'linear-gradient(135deg, #0984e3 0%, #00CEC9 50%, #55efc4 100%)',
                  'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 50%, #6c5ce7 100%)',
                ][index % 4],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
                  <div style={{ fontSize: 16, color: SF.text, fontWeight: 600, lineHeight: 1.5, maxWidth: 280 }}>
                    {reel.caption}
                  </div>
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {paused && index === activeIndex && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)', pointerEvents: 'none',
              }}>
                <PlayCircleOutlined style={{ fontSize: 64, color: 'rgba(255,255,255,0.8)' }} />
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
                  style={{ border: '2px solid #fff', background: SF.primary }} />
                {reel.authorId && reel.authorId !== currentUser?.id && (
                  <div onClick={(e) => { e.stopPropagation(); handleFollow(reel.authorId, reel.authorName); }}
                    style={{
                      position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                      width: 20, height: 20, borderRadius: '50%',
                      background: followedSet.has(reel.authorId) ? '#4CAF50' : SF.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                    {followedSet.has(reel.authorId)
                      ? <span style={{ fontSize: 10, color: '#fff', lineHeight: 1 }}>✓</span>
                      : <PlusOutlined style={{ fontSize: 10, color: '#fff' }} />}
                  </div>
                )}
              </div>

              {/* Like */}
              <div onClick={() => toggleLike(index)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                {reel.isLiked ? (
                  <HeartFilled style={{ fontSize: 28, color: '#ff2d55' }} />
                ) : (
                  <HeartOutlined style={{ fontSize: 28, color: SF.text }} />
                )}
                <div style={{ fontSize: 11, color: SF.text, fontWeight: 600, marginTop: 2 }}>
                  {reel.likesCount > 999 ? `${(reel.likesCount / 1000).toFixed(1)}k` : reel.likesCount}
                </div>
              </div>

              {/* Comment */}
              <div onClick={() => openComments(reel.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <MessageOutlined style={{ fontSize: 26, color: SF.text }} />
                <div style={{ fontSize: 11, color: SF.text, fontWeight: 600, marginTop: 2 }}>
                  {reel.commentsCount}
                </div>
              </div>

              {/* Share */}
              <div onClick={() => handleShare(reel)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <ShareAltOutlined style={{ fontSize: 26, color: SF.text }} />
                <div style={{ fontSize: 11, color: SF.text, fontWeight: 600, marginTop: 2 }}>
                  Partager
                </div>
              </div>

              {/* Save/Bookmark */}
              <div onClick={() => handleSaveReel(reel.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                {savedSet.has(reel.id) ? (
                  <BookFilled style={{ fontSize: 26, color: '#FDCB6E' }} />
                ) : (
                  <BookOutlined style={{ fontSize: 26, color: SF.text }} />
                )}
                <div style={{ fontSize: 11, color: SF.text, fontWeight: 600, marginTop: 2 }}>
                  {savedSet.has(reel.id) ? 'Enregistré' : 'Enregistrer'}
                </div>
              </div>

              {/* Delete (own posts or admin) */}
              {!['d1','d2','d3'].includes(reel.id) && (currentUser?.id === reel.authorId || currentUser?.isSuperAdmin || currentUser?.role === 'admin') && (
                <div onClick={() => setDeleteConfirmId(reel.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <DeleteOutlined style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }} />
                </div>
              )}

              {/* Mute toggle */}
              <div onClick={() => setMuted(!muted)} style={{ cursor: 'pointer' }}>
                {muted ? (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SoundOutlined style={{ fontSize: 14, color: SF.text }} />
                  </div>
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PauseCircleOutlined style={{ fontSize: 14, color: SF.text }} />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 60,
              padding: '60px 16px 24px',
              background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
            }}>
              {/* Author name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: SF.text }}>
                  @{reel.authorName.replace(/\s+/g, '').toLowerCase()}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); handleFollow(reel.authorId, reel.authorName); }}
                  style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: followedSet.has(reel.authorId) ? SF.textMuted : SF.primary,
                  color: '#fff', fontWeight: 600, cursor: 'pointer',
                }}>
                  {followedSet.has(reel.authorId) ? 'Suivi ✓' : 'Suivre'}
                </span>
              </div>

              {/* Caption */}
              {reel.caption && (
                <div style={{ fontSize: 13, color: SF.text, lineHeight: 1.4, marginBottom: 8, maxHeight: 60, overflow: 'hidden' }}>
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
                    width: 16, height: 16, borderRadius: '50%', background: SF.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'spin 3s linear infinite',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SF.dark }} />
                  </div>
                  <span style={{ fontSize: 12, color: SF.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
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
                  background: i === activeIndex ? SF.text : 'rgba(255,255,255,0.3)',
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
      `}</style>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      </>
      )}

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
            <span style={{ fontSize: 18, fontWeight: 800, color: SF.text }}>🎬 Nouveau Reel</span>
            <CloseOutlined
              onClick={() => { if (!submitting) setCreateModalOpen(false); }}
              style={{ color: SF.textMuted, fontSize: 18, cursor: 'pointer' }}
            />
          </div>

          {/* Zone de sélection de fichier */}
          {!reelPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${SF.primary}`,
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(108, 92, 231, 0.1)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                <VideoCameraOutlined style={{ fontSize: 36, color: SF.primary }} />
                <PictureOutlined style={{ fontSize: 36, color: SF.secondary }} />
              </div>
              <div style={{ fontSize: 15, color: SF.text, fontWeight: 600, marginBottom: 4 }}>
                Tapez pour sélectionner
              </div>
              <div style={{ fontSize: 12, color: SF.textMuted }}>
                Vidéo ou image (max 100 Mo)
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              {reelMediaType === 'video' ? (
                <video
                  src={reelPreview}
                  style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 16 }}
                  controls
                  muted
                />
              ) : (
                <img
                  src={reelPreview}
                  alt="Aperçu"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 16 }}
                />
              )}
              <div
                onClick={removeSelectedFile}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CloseOutlined style={{ color: '#fff', fontSize: 12 }} />
              </div>
            </div>
          )}

          {/* Caption */}
          <Input.TextArea
            value={reelCaption}
            onChange={e => setReelCaption(e.target.value)}
            placeholder="Ajoutez une description... #hashtags"
            maxLength={500}
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{
              marginTop: 16,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: SF.text,
              resize: 'none',
            }}
          />

          {/* Bouton publier */}
          <div
            onClick={handlePublishReel}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              borderRadius: 12,
              background: reelFile ? `linear-gradient(135deg, ${SF.primary}, ${SF.accent})` : 'rgba(255,255,255,0.1)',
              color: reelFile ? '#fff' : SF.textMuted,
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
              <><LoadingOutlined spin /> Publication en cours...</>
            ) : (
              <><SendOutlined /> Publier le Reel</>
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
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>💬 Commentaires</span>
          <CloseOutlined onClick={() => { setCommentModalOpen(false); setComments([]); setCommentText(''); setReplyingTo(null); }}
            style={{ fontSize: 16, cursor: 'pointer', color: '#999' }} />
        </div>

        {/* Comments list */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '12px 16px' }}>
          {commentLoading ? (
            <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
          ) : comments.length > 0 ? comments.map((c: any) => (
            <div key={c.id} style={{ marginBottom: 16 }}>
              {/* Main comment */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar size={32} src={c.author?.avatarUrl}
                  icon={!c.author?.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ flexShrink: 0, background: '#ddd' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ background: '#f0f2f5', borderRadius: 12, padding: '8px 12px', width: 'fit-content', maxWidth: '90%' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', display: 'block' }}>
                      {[c.author?.firstName, c.author?.lastName].filter(Boolean).join(' ') || 'Utilisateur'}
                    </span>
                    <div style={{ fontSize: 14, color: '#333', marginTop: 2, wordBreak: 'break-word' }}>{c.content}</div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#999' }}>{timeAgo(c.createdAt)}</span>
                    <span onClick={() => handleCommentLike(c.id)}
                      style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', color: likedComments.has(c.id) ? '#e74c3c' : '#65676b' }}>
                      {likedComments.has(c.id) ? '❤️ Aimé' : "J'aime"}
                    </span>
                    <span onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(''); }}
                      style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#65676b' }}>
                      Répondre
                    </span>
                  </div>

                  {/* Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div style={{ marginTop: 8, marginLeft: 8 }}>
                      {c.replies.map((reply: any) => (
                        <div key={reply.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8 }}>
                          <Avatar size={24} src={reply.author?.avatarUrl}
                            icon={!reply.author?.avatarUrl ? <UserOutlined /> : undefined}
                            style={{ flexShrink: 0, background: '#ddd' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ background: '#f0f2f5', borderRadius: 10, padding: '6px 10px', width: 'fit-content', maxWidth: '85%' }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: '#1a1a2e' }}>
                                {[reply.author?.firstName, reply.author?.lastName].filter(Boolean).join(' ')}
                              </span>
                              <div style={{ fontSize: 13, color: '#333', wordBreak: 'break-word' }}>{reply.content}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: '#999' }}>{timeAgo(reply.createdAt)}</span>
                              <span onClick={() => handleCommentLike(reply.id)}
                                style={{ fontSize: 11, fontWeight: 600, cursor: 'pointer', color: likedComments.has(reply.id) ? '#e74c3c' : '#65676b' }}>
                                {likedComments.has(reply.id) ? '❤️' : "J'aime"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingTo === c.id && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, marginLeft: 8 }}>
                      <Avatar size={24} src={currentUser?.avatarUrl}
                        icon={!currentUser?.avatarUrl ? <UserOutlined /> : undefined}
                        style={{ flexShrink: 0, background: '#ddd' }} />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f0f2f5', borderRadius: 20, padding: '4px 12px' }}>
                        <input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handlePostComment(c.id)}
                          placeholder={`Répondre à ${c.author?.firstName || 'ce commentaire'}...`}
                          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13 }}
                          autoFocus
                        />
                        <div onClick={() => handlePostComment(c.id)}
                          style={{ cursor: replyText.trim() ? 'pointer' : 'default', color: replyText.trim() ? SF.primary : '#999', padding: '0 4px' }}>
                          <SendOutlined style={{ fontSize: 14 }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 30 }}>
              <MessageOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
              Aucun commentaire. Soyez le premier !
            </div>
          )}
        </div>

        {/* New comment input */}
        <div style={{ borderTop: '1px solid #eee', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Avatar size={28} src={currentUser?.avatarUrl}
            icon={!currentUser?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ flexShrink: 0, background: '#ddd' }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f0f2f5', borderRadius: 20, padding: '6px 12px' }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePostComment()}
              placeholder="Écrire un commentaire..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
            />
            <div onClick={() => handlePostComment()}
              style={{ cursor: commentText.trim() ? 'pointer' : 'default', color: commentText.trim() ? SF.primary : '#999', padding: '0 4px' }}>
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
          <DeleteOutlined style={{ fontSize: 36, color: '#ff4d4f', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Supprimer ce reel ?</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Cette action est irréversible.</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div onClick={() => setDeleteConfirmId(null)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#f0f2f5', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Annuler
            </div>
            <div onClick={async () => { if (deleteConfirmId) { await handleDeleteReel(deleteConfirmId); setDeleteConfirmId(null); } }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#ff4d4f', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Supprimer
            </div>
          </div>
        </div>
      </Modal>

      {/* Share bottom sheet - 100% mobile */}
      {shareSheetOpen && (
        <>
          <div onClick={() => setShareSheetOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 51,
            background: '#fff', borderRadius: '16px 16px 0 0',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ padding: '12px 0' }}>
              {/* Drag handle */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ddd', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>Partager</div>

              {/* Share options grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 16px', marginBottom: 16 }}>
                <div onClick={handleRepost} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RetweetOutlined style={{ fontSize: 22, color: '#4CAF50' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>Republier</span>
                </div>
                <div onClick={handleSendReel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SendOutlined style={{ fontSize: 22, color: '#2196F3' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>Envoyer</span>
                </div>
                <div onClick={() => { if (shareReel) handleSaveReel(shareReel.id); setShareSheetOpen(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOutlined style={{ fontSize: 22, color: '#FF9800' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>Enregistrer</span>
                </div>
                <div onClick={handleCopyLink} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F3E5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CopyOutlined style={{ fontSize: 22, color: '#9C27B0' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>Copier le lien</span>
                </div>
              </div>

              {/* Cancel */}
              <div onClick={() => setShareSheetOpen(false)}
                style={{ textAlign: 'center', padding: '12px 16px', borderTop: '1px solid #eee', fontSize: 15, fontWeight: 600, color: '#999', cursor: 'pointer' }}>
                Annuler
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'err' ? '#ff4d4f' : 'rgba(0,0,0,0.85)',
          color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: 13,
          fontWeight: 600, zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
