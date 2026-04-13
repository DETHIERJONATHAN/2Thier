import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MAX_PHOTO_SIZE } from '../../lib/constants';
import { Avatar, Tooltip, Modal, Input, message } from 'antd';
import {
  PlusOutlined, UserOutlined, CameraOutlined, LoadingOutlined,
  HeartOutlined, HeartFilled, ShareAltOutlined, SendOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SF } from './ZhiiveTheme';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';
import { useSocialIdentity } from '../../contexts/SocialIdentityContext';
import { useDoubleTap } from './shared/useDoubleTap';
import HeartBurstOverlay, { heartBurstKeyframes } from './shared/HeartBurstOverlay';

interface Story {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  publishAsOrg?: boolean;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  viewed: boolean;
  createdAt: string;
}

interface StoriesBarProps {
  api: unknown;
  currentUser?: unknown;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ api, currentUser }) => {
  const { t } = useTranslation();
  // 🐝 Identité centralisée — source unique pour savoir si on poste en tant qu'org ou personnel
  const identity = useActiveIdentity();
  const { isOrgMode, avatarUrl: storyAvatarSrc, organization: currentOrganization } = identity;
  const storyLabel = isOrgMode ? (currentOrganization?.name?.substring(0, 8) || 'Org') : 'My Story';
  const orgLogo = currentOrganization?.logoUrl || null;
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [storyVisibility, setStoryVisibility] = useState<string>(currentOrganization ? 'IN' : 'ALL');

  // 🐝 Sync visibilité quand le mode change (Bee ↔ Colony)
  useEffect(() => {
    setStoryVisibility(currentOrganization ? 'IN' : 'ALL');
  }, [currentOrganization]);

  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [viewingStoryList, setViewingStoryList] = useState<Story[]>([]);
  const [viewingStoryIndex, setViewingStoryIndex] = useState(0);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🐝 Hive Live integration
  const { isAppEnabled } = useSocialIdentity();
  const [hiveLiveModalOpen, setHiveLiveModalOpen] = useState(false);
  const [hiveLiveTitle, setHiveLiveTitle] = useState('');
  const [hiveLiveSaving, setHiveLiveSaving] = useState(false);

  // 🐝 Story interactions — like, share, DM, double-tap
  const [storyLikedSet, setStoryLikedSet] = useState<Set<string>>(new Set());

  const handleLikeStory = useCallback(async (storyId: string) => {
    const wasLiked = storyLikedSet.has(storyId);
    setStoryLikedSet(prev => {
      const n = new Set(prev);
      if (wasLiked) n.delete(storyId); else n.add(storyId);
      return n;
    });
    try {
      await api.post(`/api/zhiive/stories/${storyId}/react`, { type: 'LIKE' });
    } catch {
      setStoryLikedSet(prev => {
        const n = new Set(prev);
        if (wasLiked) n.add(storyId); else n.delete(storyId);
        return n;
      });
    }
  }, [api, storyLikedSet]);

  const { handleTap: handleDoubleTapStory, heartAnimId } = useDoubleTap({
    onDoubleTap: (id: string) => {
      if (!storyLikedSet.has(id)) handleLikeStory(id);
    },
  });

  const handleShareStory = useCallback(async (storyId: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Story', text: t('stories.sharedStory') });
      } else {
        await navigator.clipboard?.writeText(`Story ${storyId}`);
        message.success(t('explore.shared'));
      }
    } catch { /* cancelled */ }
  }, [t]);

  const handleStoryDM = useCallback(async (userId: string) => {
    try {
      const res = await api.post('/api/messenger/conversations', { participantIds: [userId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
        message.success(t('explore.whisperOpened'));
      }
    } catch {
      message.error(t('explore.whisperError'));
    }
  }, [api, t]);

  const fetchStories = useCallback(async () => {
    try {
      const data = await api.get('/api/zhiive/stories/feed');
      if (data?.stories) setStories(data.stories);
    } catch {
      // Stories failed to load — non-blocking
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Group stories by user
  const userStories = stories.reduce<Map<string, Story[]>>((map, s) => {
    const existing = map.get(s.userId) || [];
    existing.push(s);
    map.set(s.userId, existing);
    return map;
  }, new Map());

  const storyUsers = Array.from(userStories.entries()).map(([userId, stories]) => ({
    userId,
    userName: stories[0].userName,
    avatarUrl: stories[0].avatarUrl,
    count: stories.length,
    allViewed: stories.every(s => s.viewed),
    latestMedia: stories[0].mediaUrl,
  }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      message.error(t('stories.onlyImagesVideos'));
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      message.error(t('stories.fileTooLarge50'));
      return;
    }
    setStoryFile(file);
    if (storyPreview) URL.revokeObjectURL(storyPreview);
    setStoryPreview(URL.createObjectURL(file));
    setStoryMediaUrl('');
    e.target.value = '';
  };

  const removeStoryFile = () => {
    if (storyPreview) URL.revokeObjectURL(storyPreview);
    setStoryFile(null);
    setStoryPreview(null);
  };

  const handleCreateStory = async () => {
    if (!storyText.trim() && !storyMediaUrl.trim() && !storyFile) return;
    setStorySubmitting(true);
    try {
      let mediaUrl = storyMediaUrl.trim();
      let mediaType: string = 'image';

      // Upload file if selected
      if (storyFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('files', storyFile);
        const uploadResult = await api.post('/api/wall/upload', formData) as { urls?: string[] };
        setUploading(false);
        const urls = uploadResult?.urls || [];
        if (urls.length === 0) {
          message.error('Upload failed');
          setStorySubmitting(false);
          return;
        }
        mediaUrl = urls[0];
        mediaType = storyFile.type.startsWith('video/') ? 'video' : 'image';
      }

      await api.post('/api/zhiive/stories', {
        text: storyText.trim(),
        mediaUrl: mediaUrl || undefined,
        mediaType,
        visibility: storyVisibility,
        // 🐝 publishAsOrg piloté par le système d'identité centralisé
        publishAsOrg: identity.publishAsOrg,
      });
      message.success(t('stories.storyPublished'));
      setStoryText(''); setStoryMediaUrl('');
      removeStoryFile();
      setCreateModalOpen(false);
      fetchStories();
    } catch {
      message.error(t('stories.storyCreationFailed'));
    } finally {
      setStorySubmitting(false);
      setUploading(false);
    }
  };

  const handleViewStory = async (userId: string) => {
    const userStoriesList = userStories.get(userId);
    if (!userStoriesList?.length) return;
    setViewingStoryList(userStoriesList);
    setViewingStoryIndex(0);
    setViewingStory(userStoriesList[0]);
    try {
      await api.post(`/api/zhiive/stories/${userStoriesList[0].id}/view`);
      setStories(prev => prev.map(s => s.id === userStoriesList[0].id ? { ...s, viewed: true } : s));
    } catch {
      // Non-blocking
    }
  };

  const handleNextStory = async () => {
    const nextIndex = viewingStoryIndex + 1;
    if (nextIndex < viewingStoryList.length) {
      setViewingStoryIndex(nextIndex);
      setViewingStory(viewingStoryList[nextIndex]);
      try {
        await api.post(`/api/zhiive/stories/${viewingStoryList[nextIndex].id}/view`);
        setStories(prev => prev.map(s => s.id === viewingStoryList[nextIndex].id ? { ...s, viewed: true } : s));
      } catch { /* */ }
    } else {
      setViewingStory(null);
      setViewingStoryList([]);
    }
  };

  const handlePrevStory = () => {
    const prevIndex = viewingStoryIndex - 1;
    if (prevIndex >= 0) {
      setViewingStoryIndex(prevIndex);
      setViewingStory(viewingStoryList[prevIndex]);
    }
  };

  const handleAddToHiveLive = async () => {
    if (!viewingStory || !hiveLiveTitle.trim()) return;
    setHiveLiveSaving(true);
    try {
      const mediaType = viewingStory.mediaType === 'VIDEO' ? 'video' : 'image';
      await api.post('/api/hive-live', {
        title: hiveLiveTitle.trim(),
        momentDate: viewingStory.createdAt,
        visibility: 'colony',
        media: viewingStory.mediaUrl ? [{ url: viewingStory.mediaUrl, type: mediaType }] : [],
        coverUrl: mediaType === 'image' ? viewingStory.mediaUrl : undefined,
      });
      message.success(t('hive.addedToHiveLive'));
      setHiveLiveModalOpen(false);
      setHiveLiveTitle('');
    } catch {
      message.error(t('hive.errorAddingToHiveLive'));
    } finally {
      setHiveLiveSaving(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await api.delete(`/api/zhiive/stories/${storyId}`);
      setStories(prev => prev.filter(s => s.id !== storyId));
      setViewingStory(null);
      setViewingStoryList([]);
      message.success(t('stories.storyDeleted'));
    } catch {
      message.error(t('stories.deleteFailed'));
    }
  };

  const ringStyle = (viewed: boolean): React.CSSProperties => ({
    padding: 2,
    borderRadius: '50%',
    background: viewed ? SF.border : SF.gradientStory,
    cursor: 'pointer',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      overflowX: 'auto', padding: '8px 4px',
      scrollbarWidth: 'none',
    }}>
      <style>{`.stories-bar::-webkit-scrollbar { display: none; }`}</style>

      {/* My Story — Add button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Tooltip title={t('stories.addStory')}>
          <div
            role="button" tabIndex={0} onClick={() => setCreateModalOpen(true)}
            style={{
            width: 56, height: 56, borderRadius: '50%',
            background: SF.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}>
            <Avatar size={50} src={storyAvatarSrc}
              icon={!storyAvatarSrc ? <UserOutlined /> : undefined}
              style={{ background: isOrgMode ? (orgLogo ? undefined : SF.primary) : (!storyAvatarSrc ? SF.primary : undefined) }}
            >
              {isOrgMode && !orgLogo && (currentOrganization?.name?.[0]?.toUpperCase() || 'O')}
            </Avatar>
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 20, height: 20, borderRadius: '50%',
              background: SF.primary, border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PlusOutlined style={{ fontSize: 10, color: 'white' }} />
            </div>
          </div>
        </Tooltip>
        <span style={{ fontSize: 10, color: SF.textSecondary, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {storyLabel}
        </span>
      </div>

      {/* Other users' stories */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: SF.border, animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: 40, height: 8, borderRadius: 4, background: SF.border }} />
          </div>
        ))
      ) : (
        storyUsers.map(su => (
          <div key={su.userId} role="button" tabIndex={0} onClick={() => handleViewStory(su.userId)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <div style={ringStyle(su.allViewed)}>
              <Avatar size={50} src={su.avatarUrl}
                icon={!su.avatarUrl ? <UserOutlined /> : undefined}
                style={{ background: !su.avatarUrl ? SF.secondary : undefined, border: '2px solid white' }}
              />
            </div>
            <span style={{ fontSize: 10, color: su.allViewed ? SF.textMuted : SF.text, maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: su.allViewed ? 400 : 600 }}>
              {su.userName.split(' ')[0]}
            </span>
          </div>
        ))
      )}

      {!loading && storyUsers.length === 0 && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: SF.textMuted }}>
          {t('stories.noActiveStories')}
        </div>
      )}

      {/* Create story modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => { if (!storySubmitting) { setCreateModalOpen(false); removeStoryFile(); } }}
        onOk={handleCreateStory}
        confirmLoading={storySubmitting}
        title={t('stories.newStory')}
        okText={uploading ? t('common.upload') : t('common.publish')}
        cancelText={t('common.cancel')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <Input.TextArea
            value={storyText}
            onChange={e => setStoryText(e.target.value)}
            placeholder={t('stories.yourMessage')}
            rows={3}
            maxLength={500}
          />

          {/* File upload zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {storyPreview ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              {storyFile?.type.startsWith('video/') ? (
                <video src={storyPreview} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} controls muted />
              ) : (
                <img src={storyPreview} alt="Preview" loading="lazy" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} />
              )}
              <div
                role="button" tabIndex={0} onClick={removeStoryFile}
                style={{
                  position: 'absolute', top: 6, right: 6, width: 24, height: 24,
                  borderRadius: '50%', background: SF.overlayDarkStrong, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: SF.textLight, fontSize: 12, fontWeight: 700,
                }}
              >✕</div>
            </div>
          ) : (
            <div
              role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${SF.borderLight}`, borderRadius: 12, padding: '20px 16px',
                textAlign: 'center', cursor: 'pointer', background: SF.bgLightest,
                transition: 'border-color 0.2s',
              }}
            >
              <CameraOutlined style={{ fontSize: 28, color: SF.textPlaceholder, marginBottom: 4 }} />
              <div style={{ fontSize: 13, color: SF.textSecondary }}>{t('stories.tapToAdd')}</div>
              <div style={{ fontSize: 11, color: SF.textPlaceholder }}>max 50 Mo</div>
            </div>
          )}

          <div style={{ fontSize: 11, color: SF.textPlaceholder, textAlign: 'center' }}>{t('stories.pasteUrl')}</div>
          <Input
            value={storyMediaUrl}
            onChange={e => { setStoryMediaUrl(e.target.value); if (storyFile) removeStoryFile(); }}
            placeholder={t('stories.imageVideoUrl')}
            prefix="🖼️"
            disabled={!!storyFile}
          />

          {/* Visibility selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(currentOrganization ? ['IN', 'ALL', 'OUT'] : ['ALL', 'OUT']).map(v => {
              const labels: Record<string, { icon: string; label: string; color: string }> = {
                IN: { icon: '⬡', label: 'Colony', color: SF.scopeColony },
                ALL: { icon: '🌐', label: 'Public', color: SF.scopePublic },
                OUT: { icon: '🔒', label: 'Private', color: SF.scopePrivate },
              };
              const opt = labels[v];
              const active = storyVisibility === v;
              return (
                <div key={v} role="button" tabIndex={0} onClick={() => setStoryVisibility(v)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                  borderRadius: 14, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: active ? opt.color + '18' : SF.bgLighter,
                  color: active ? opt.color : SF.textPlaceholder,
                  border: active ? `1px solid ${opt.color}` : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <span>{opt.icon}</span> <span>{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* View story modal */}
      <Modal
        open={!!viewingStory}
        onCancel={() => { setViewingStory(null); setViewingStoryList([]); }}
        footer={null}
        closable
        width={360}
        styles={{ body: { padding: 0 } }}
      >
        {viewingStory && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            {/* Progress bar */}
            {viewingStoryList.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {viewingStoryList.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= viewingStoryIndex ? SF.primary : SF.border,
                  }} />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Avatar size={32} src={viewingStory.avatarUrl || undefined}
                icon={!viewingStory.avatarUrl ? <UserOutlined /> : undefined}
                style={{ background: viewingStory.publishAsOrg && !viewingStory.avatarUrl ? SF.primary : undefined }} />
              <span style={{ fontWeight: 600 }}>{viewingStory.userName}</span>
              <span style={{ fontSize: 10, color: SF.textMuted, marginLeft: 'auto' }}>
                {new Date(viewingStory.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {/* Actions for own stories */}
              {currentUser?.id === viewingStory.userId && (
                <>
                  {isAppEnabled('hiveLive') && <Tooltip title={t('hive.addToHiveLive')}>
                    <span
                      role="button" tabIndex={0} onClick={() => { setHiveLiveTitle(viewingStory.userName + ' — Story'); setHiveLiveModalOpen(true); }}
                      style={{ fontSize: 14, cursor: 'pointer' }}
                    >🐝</span>
                  </Tooltip>}
                  <span
                    role="button" tabIndex={0} onClick={() => handleDeleteStory(viewingStory.id)}
                    style={{ fontSize: 12, color: SF.danger, cursor: 'pointer', fontWeight: 600 }}
                  >🗑️</span>
                </>
              )}
            </div>
            {/* Media with double-tap to like */}
            <div role="button" tabIndex={0} onClick={() => handleDoubleTapStory(viewingStory.id)} style={{ position: 'relative', cursor: 'pointer' }}>
              <style>{heartBurstKeyframes}</style>
              <HeartBurstOverlay visible={heartAnimId === viewingStory.id} />
              {viewingStory.mediaUrl ? (
                viewingStory.mediaType === 'VIDEO' ? (
                  <video src={viewingStory.mediaUrl} controls autoPlay muted style={{ width: '100%', borderRadius: 12, maxHeight: 400 }} />
                ) : (
                  <img src={viewingStory.mediaUrl} alt="" loading="lazy" draggable={false} style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'cover', userSelect: 'none' }} />
                )
              ) : (
                <div style={{ padding: 40, background: SF.gradientPrimary, borderRadius: 12, color: 'white', fontSize: 18, fontWeight: 600 }}>
                  📸 Story
                </div>
              )}
            </div>

            {/* 🐝 Interaction bar — Like / Share / DM */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '10px 0 4px' }}>
              <span role="button" tabIndex={0} onClick={() => handleLikeStory(viewingStory.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: storyLikedSet.has(viewingStory.id) ? SF.like : SF.textSecondary, transition: 'color 0.15s' }}>
                {storyLikedSet.has(viewingStory.id) ? <HeartFilled style={{ fontSize: 20 }} /> : <HeartOutlined style={{ fontSize: 20 }} />}
              </span>
              <span role="button" tabIndex={0} onClick={() => handleShareStory(viewingStory.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: SF.textSecondary }}>
                <ShareAltOutlined style={{ fontSize: 20 }} />
              </span>
              {viewingStory.userId !== currentUser?.id && (
                <span role="button" tabIndex={0} onClick={() => handleStoryDM(viewingStory.userId)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: SF.textSecondary }}>
                  <SendOutlined style={{ fontSize: 18 }} />
                </span>
              )}
            </div>

            {/* Navigation arrows */}
            {viewingStoryList.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <div
                  role="button" tabIndex={0} onClick={handlePrevStory}
                  style={{
                    padding: '6px 16px', borderRadius: 20, cursor: viewingStoryIndex > 0 ? 'pointer' : 'default',
                    background: viewingStoryIndex > 0 ? SF.primary : SF.border,
                    color: viewingStoryIndex > 0 ? 'white' : SF.textMuted, fontSize: 12, fontWeight: 600,
                  }}
                >{t('stories.previousStory')}</div>
                <span style={{ fontSize: 11, color: SF.textMuted, alignSelf: 'center' }}>
                  {viewingStoryIndex + 1} / {viewingStoryList.length}
                </span>
                <div
                  role="button" tabIndex={0} onClick={handleNextStory}
                  style={{
                    padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
                    background: SF.primary, color: 'white', fontSize: 12, fontWeight: 600,
                  }}
                >{viewingStoryIndex < viewingStoryList.length - 1 ? t('stories.nextStory') : t('stories.closeStory')}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 🐝 Hive Live modal */}
      <Modal
        open={hiveLiveModalOpen}
        onCancel={() => { if (!hiveLiveSaving) setHiveLiveModalOpen(false); }}
        onOk={handleAddToHiveLive}
        confirmLoading={hiveLiveSaving}
        title={t('hive.addToHiveLive')}
        okText={t('hive.addToHiveLive')}
      >
        <p style={{ color: SF.textMuted, marginBottom: 12 }}>{t('hive.hiveLiveExplanation')}</p>
        <Input
          value={hiveLiveTitle}
          onChange={e => setHiveLiveTitle(e.target.value)}
          placeholder={t('hive.momentTitle')}
          maxLength={120}
        />
      </Modal>
    </div>
  );
};

export default StoriesBar;
