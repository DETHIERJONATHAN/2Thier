import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, Spin, message, Modal, Input, Dropdown } from 'antd';
import {
  HeartOutlined, HeartFilled, MessageOutlined, ShareAltOutlined,
  SoundOutlined, PauseCircleOutlined, PlayCircleOutlined,
  PlusOutlined, UserOutlined, VideoCameraOutlined, PictureOutlined,
  CloseOutlined, SendOutlined, LoadingOutlined, DeleteOutlined, MoreOutlined,
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
        message.success(`Désabonné de @${authorName.replace(/\s+/g, '').toLowerCase()}`);
      } else {
        await api.post(`/api/spaceflow/follow/${authorId}`);
        setFollowedSet(prev => new Set(prev).add(authorId));
        message.success(`Suivi @${authorName.replace(/\s+/g, '').toLowerCase()} ! 🎉`);
      }
    } catch {
      message.error('Erreur lors du suivi');
    }
  };

  const handleShare = (reel: Reel) => {
    if (navigator.share) {
      navigator.share({
        title: `Reel de @${reel.authorName}`,
        text: reel.caption || 'Regardez ce reel !',
      }).catch(() => {});
    } else {
      message.info('Lien copié !');
    }
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
      message.error('Seules les vidéos et images sont acceptées');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      message.error('Fichier trop volumineux (max 100 Mo)');
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
        message.error('Échec de l\'upload du fichier');
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

      message.success('Reel publié ! 🎬');
      setCreateModalOpen(false);
      if (reelPreview) URL.revokeObjectURL(reelPreview);
      setReelFile(null);
      setReelPreview(null);
      setReelCaption('');
      // Recharger les reels
      loadReels();
    } catch (err) {
      console.error('[REELS] Erreur publication:', err);
      message.error('Erreur lors de la publication du reel');
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
    try {
      const data = await api.get(`/api/wall/posts/${reelId}/comments`);
      setComments(data?.comments || []);
    } catch {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !commentReelId) return;
    try {
      await api.post(`/api/wall/posts/${commentReelId}/comments`, { content: commentText.trim() });
      setCommentText('');
      // Recharger les commentaires
      const data = await api.get(`/api/wall/posts/${commentReelId}/comments`);
      setComments(data?.comments || []);
      // Mettre à jour le compteur
      setReels(prev => prev.map(r => r.id === commentReelId ? { ...r, commentsCount: r.commentsCount + 1 } : r));
    } catch {
      message.error('Erreur lors de l\'envoi du commentaire');
    }
  };

  // === Suppression ===
  const handleDeleteReel = async (reelId: string) => {
    try {
      await api.delete(`/api/wall/posts/${reelId}`);
      setReels(prev => prev.filter(r => r.id !== reelId));
      message.success('Reel supprimé');
    } catch {
      message.error('Erreur lors de la suppression');
    }
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
        <span style={{ fontSize: 18, fontWeight: 800, color: SF.text, letterSpacing: -0.5 }}>
          🎬 Reels
        </span>
        <div onClick={openCreateModal} style={{
          width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <PlusOutlined style={{ color: SF.text, fontSize: 16 }} />
        </div>
      </div>

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
              {/* Author avatar */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Avatar size={44} src={reel.authorAvatar}
                  icon={!reel.authorAvatar ? <UserOutlined /> : undefined}
                  style={{ border: '2px solid #fff', background: SF.primary }} />
                <div style={{
                  position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                  width: 20, height: 20, borderRadius: '50%', background: SF.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PlusOutlined style={{ fontSize: 10, color: '#fff' }} />
                </div>
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
                  {reel.sharesCount}
                </div>
              </div>

              {/* Delete (own posts only) */}
              {reel.authorId && currentUser?.id === reel.authorId && (
                <Dropdown
                  menu={{ items: [{ key: 'delete', label: 'Supprimer', icon: <DeleteOutlined />, danger: true, onClick: () => Modal.confirm({ title: 'Supprimer ce reel ?', okText: 'Supprimer', cancelText: 'Annuler', okButtonProps: { danger: true }, onOk: () => handleDeleteReel(reel.id) }) }] }}
                  trigger={['click']}
                  placement="topRight"
                >
                  <div style={{ cursor: 'pointer', textAlign: 'center' }}>
                    <MoreOutlined style={{ fontSize: 26, color: SF.text }} />
                  </div>
                </Dropdown>
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
      `}</style>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
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

      {/* Modal de commentaires */}
      <Modal
        open={commentModalOpen}
        onCancel={() => { setCommentModalOpen(false); setComments([]); setCommentText(''); }}
        footer={null}
        title="💬 Commentaires"
        centered
        width={380}
      >
        <div style={{ maxHeight: 350, overflowY: 'auto', marginBottom: 12 }}>
          {commentLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : comments.length > 0 ? comments.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Avatar size={28} src={c.author?.avatarUrl} icon={<UserOutlined />} />
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {c.author?.firstName} {c.author?.lastName}
                </span>
                <div style={{ fontSize: 13, color: '#333' }}>{c.content}</div>
                <div style={{ fontSize: 10, color: '#999' }}>
                  {new Date(c.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Aucun commentaire</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Écrire un commentaire..."
            onPressEnter={handlePostComment}
            style={{ flex: 1 }}
          />
          <div
            onClick={handlePostComment}
            style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: commentText.trim() ? SF.primary : '#eee',
              color: commentText.trim() ? '#fff' : '#999',
            }}
          >
            <SendOutlined style={{ fontSize: 14 }} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReelsPanel;
