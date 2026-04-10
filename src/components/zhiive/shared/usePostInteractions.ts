/**
 * usePostInteractions.ts — Shared hook for social interactions
 * Provides: like, save, share, follow, sendDM with optimistic UI + rollback
 * Used by: ExplorePanel, ReelsPanel, StoriesBar
 */
import { useState, useCallback} from 'react';
import { message } from 'antd';

interface UsePostInteractionsOptions {
  api: any;
  t: (key: string, opts?: any) => string;
  userId?: string;
}

export const usePostInteractions = ({ api, t, userId: _userId }: UsePostInteractionsOptions) => {
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  // ── Init from API data ──
  const initLiked = useCallback((ids: string[]) => setLikedSet(new Set(ids)), []);
  const initSaved = useCallback((ids: string[]) => setSavedSet(new Set(ids)), []);
  const initFollowing = useCallback((ids: string[]) => setFollowingSet(new Set(ids)), []);

  // ── Like / Unlike ──
  const toggleLike = useCallback(async (postId: string): Promise<boolean> => {
    if (postId.startsWith('story-')) return false;
    const wasLiked = likedSet.has(postId);
    setLikedSet(prev => {
      const n = new Set(prev);
      if (wasLiked) n.delete(postId); else n.add(postId);
      return n;
    });
    try {
      await api.post(`/api/wall/posts/${postId}/reactions`, { type: 'LIKE' });
      return !wasLiked;
    } catch {
      // Rollback
      setLikedSet(prev => {
        const n = new Set(prev);
        if (wasLiked) n.add(postId); else n.delete(postId);
        return n;
      });
      return wasLiked;
    }
  }, [api, likedSet]);

  // ── Save / Unsave ──
  const toggleSave = useCallback(async (postId: string) => {
    if (postId.startsWith('story-')) return;
    const wasSaved = savedSet.has(postId);
    setSavedSet(prev => {
      const n = new Set(prev);
      if (wasSaved) n.delete(postId); else n.add(postId);
      return n;
    });
    try {
      if (wasSaved) await api.delete(`/api/zhiive/saved-reels/${postId}`);
      else await api.post(`/api/zhiive/saved-reels/${postId}`);
    } catch {
      setSavedSet(prev => {
        const n = new Set(prev);
        if (wasSaved) n.add(postId); else n.delete(postId);
        return n;
      });
    }
  }, [api, savedSet]);

  // ── Share (internal) ──
  const sharePost = useCallback(async (postId: string) => {
    if (postId.startsWith('story-')) return;
    try {
      await api.post(`/api/wall/posts/${postId}/share`, { targetType: 'INTERNAL' });
      message.success(t('explore.shared'));
    } catch {
      message.error(t('explore.shareError'));
    }
  }, [api, t]);

  // ── Follow / Unfollow ──
  const toggleFollow = useCallback(async (targetUserId: string) => {
    try {
      if (followingSet.has(targetUserId)) {
        await api.delete(`/api/zhiive/follow/${targetUserId}`);
        setFollowingSet(prev => { const n = new Set(prev); n.delete(targetUserId); return n; });
      } else {
        await api.post(`/api/zhiive/follow/${targetUserId}`);
        setFollowingSet(prev => new Set(prev).add(targetUserId));
      }
    } catch {
      message.error(t('explore.followError'));
    }
  }, [api, followingSet, t]);

  // ── Send DM (open messenger conversation) ──
  const sendDM = useCallback(async (targetUserId: string) => {
    try {
      const res = await api.post('/api/messenger/conversations', { participantIds: [targetUserId] });
      const convId = res?.conversation?.id || res?.id;
      if (convId) {
        window.dispatchEvent(new CustomEvent('open-messenger', { detail: { conversationId: convId } }));
        message.success(t('explore.whisperOpened'));
      }
    } catch {
      message.error(t('explore.whisperError'));
    }
  }, [api, t]);

  return {
    likedSet, savedSet, followingSet,
    initLiked, initSaved, initFollowing,
    toggleLike, toggleSave, sharePost, toggleFollow, sendDM,
    isLiked: (id: string) => likedSet.has(id),
    isSaved: (id: string) => savedSet.has(id),
    isFollowing: (id: string) => followingSet.has(id),
  };
};
