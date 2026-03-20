import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, Input, Tag, message } from 'antd';
import { SearchOutlined, UserOutlined, FireOutlined, CompassOutlined, TeamOutlined, RiseOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons';
import { SF } from './SpaceFlowTheme';

interface ExplorePost {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  authorName: string;
  authorAvatar?: string;
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
}

interface ExplorePanelProps {
  api: any;
  openModule?: (route: string) => void;
}

const ExplorePanel: React.FC<ExplorePanelProps> = ({ api }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'people' | 'hashtags'>('trending');
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  const handleLikePost = async (postId: string) => {
    const wasLiked = likedSet.has(postId);
    setLikedSet(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(postId); else next.add(postId);
      return next;
    });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? -1 : 1) } : p));
    try {
      await api.post(`/api/wall/posts/${postId}/reactions`, { type: 'LIKE' });
    } catch {
      // Revert on error
      setLikedSet(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(postId); else next.delete(postId);
        return next;
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? 1 : -1) } : p));
    }
  };

  const fetchExplore = useCallback(async () => {
    try {
      const [postsRes, hashtagsRes, usersRes] = await Promise.all([
        api.get('/api/spaceflow/explore/posts?limit=30').catch(() => ({ posts: [] })),
        api.get('/api/spaceflow/explore/hashtags?limit=20').catch(() => ({ hashtags: [] })),
        api.get('/api/spaceflow/explore/suggested-users?limit=10').catch(() => ({ users: [] })),
      ]);
      if (postsRes?.posts) setPosts(postsRes.posts);
      if (hashtagsRes?.hashtags) setHashtags(hashtagsRes.hashtags);
      if (usersRes?.users) setSuggestedUsers(usersRes.users);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchExplore(); }, [fetchExplore]);

  const handleFollow = async (userId: string) => {
    try {
      if (followingSet.has(userId)) {
        await api.delete(`/api/spaceflow/follow/${userId}`);
        setFollowingSet(prev => { const next = new Set(prev); next.delete(userId); return next; });
        message.success('Abonnement retiré');
      } else {
        await api.post(`/api/spaceflow/follow/${userId}`);
        setFollowingSet(prev => new Set(prev).add(userId));
        message.success('Suivi avec succès ! 🎉');
      }
    } catch {
      message.error('Erreur lors du suivi');
    }
  };

  const filteredPosts = posts; // Categories filter à implémenter quand le backend le supporte
  const filteredUsers = searchQuery
    ? suggestedUsers.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestedUsers;
  const filteredHashtags = searchQuery
    ? hashtags.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : hashtags;

  const tabs = [
    { key: 'trending' as const, label: 'Tendances', icon: <FireOutlined /> },
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
  ];

  return (
    <div ref={containerRef} style={{
      height: '100%', overflowY: 'auto', padding: '8px 12px',
      scrollbarWidth: 'none', background: SF.bg,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, background: SF.gradientSecondary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🔍 Explore
        </span>
      </div>

      {/* Search */}
      <Input
        prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
        placeholder="Rechercher personnes, hashtags, posts..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{ borderRadius: 20, background: SF.cardBg, border: 'none', marginBottom: 12 }}
        size="large"
      />

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none', paddingBottom: 2 }}>
        {categories.map(cat => (
          <Tag key={cat.label}
            onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
            style={{
            borderRadius: 20, padding: '4px 12px', cursor: 'pointer', border: 'none',
            background: activeCategory === cat.label ? SF.primary + '20' : SF.cardBg,
            color: activeCategory === cat.label ? SF.primary : SF.text,
            fontSize: 12, flexShrink: 0, boxShadow: SF.shadow,
          }}>
            {cat.emoji} {cat.label}
          </Tag>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: SF.cardBg, borderRadius: SF.radiusSm, overflow: 'hidden', boxShadow: SF.shadow }}>
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

      {/* Trending Posts — Masonry grid */}
      {activeTab === 'trending' && (
        <>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{
                  aspectRatio: i % 5 === 0 ? '1/2' : '1/1',
                  gridRow: i % 5 === 0 ? 'span 2' : 'span 1',
                  background: SF.border, borderRadius: SF.radiusSm,
                  animation: 'pulse 1.5s infinite',
                }} />
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {filteredPosts.map((post, i) => (
                <div key={post.id} style={{
                  position: 'relative', cursor: 'pointer',
                  aspectRatio: i % 7 === 0 ? '1/2' : '1/1',
                  gridRow: i % 7 === 0 ? 'span 2' : 'span 1',
                  borderRadius: SF.radiusSm, overflow: 'hidden',
                  background: SF.border,
                }}>
                  <img
                    src={post.mediaUrl}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    padding: '16px 6px 4px', display: 'flex', gap: 8,
                    color: 'white', fontSize: 10,
                  }}>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleLikePost(post.id); }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      {likedSet.has(post.id)
                        ? <HeartFilled style={{ color: '#ff2d55', fontSize: 12 }} />
                        : <HeartOutlined style={{ fontSize: 12 }} />}
                      {' '}{post.likesCount}
                    </span>
                    <span>💬 {post.commentsCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CompassOutlined style={{ fontSize: 40, color: SF.secondary }} />}
              title="Explorez le réseau"
              subtitle="Les posts populaires apparaîtront ici. Commencez par publier du contenu !"
            />
          )}
        </>
      )}

      {/* People tab */}
      {activeTab === 'people' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredUsers.length > 0 ? filteredUsers.map(su => (
            <div key={su.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: SF.cardBg, borderRadius: SF.radiusSm, boxShadow: SF.shadow,
              cursor: 'pointer',
            }}>
              <Avatar size={44} src={su.avatarUrl} icon={!su.avatarUrl ? <UserOutlined /> : undefined}
                style={{ background: !su.avatarUrl ? SF.primary : undefined, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: SF.text }}>{su.firstName} {su.lastName}</div>
                <div style={{ fontSize: 11, color: SF.textSecondary }}>{su.role}</div>
                {su.mutualFriends > 0 && (
                  <div style={{ fontSize: 10, color: SF.textMuted }}>{su.mutualFriends} ami(s) en commun</div>
                )}
              </div>
              <div
                onClick={() => handleFollow(su.id)}
                style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: followingSet.has(su.id) ? SF.bg : SF.gradientPrimary,
                color: followingSet.has(su.id) ? SF.textSecondary : 'white',
                cursor: 'pointer',
                border: followingSet.has(su.id) ? `1px solid ${SF.border}` : 'none',
              }}>
                {followingSet.has(su.id) ? 'Suivi ✓' : 'Suivre'}
              </div>
            </div>
          )) : (
            <EmptyState
              icon={<TeamOutlined style={{ fontSize: 40, color: SF.primary }} />}
              title="Suggestions bientôt !"
              subtitle="Plus vous interagissez, plus nos suggestions s'affinent."
            />
          )}
        </div>
      )}

      {/* Hashtags tab */}
      {activeTab === 'hashtags' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredHashtags.length > 0 ? filteredHashtags.map((ht, i) => (
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
