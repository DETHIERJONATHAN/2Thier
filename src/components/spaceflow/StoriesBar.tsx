import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Tooltip } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { SF } from './SpaceFlowTheme';

interface Story {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  viewed: boolean;
  createdAt: string;
}

interface StoriesBarProps {
  api: any;
  currentUser?: any;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ api, currentUser }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const data = await api.get('/api/spaceflow/stories/feed');
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
  }));

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
        <Tooltip title="Ajouter une story">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: SF.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}>
            <Avatar size={50} src={currentUser?.avatarUrl}
              icon={!currentUser?.avatarUrl ? <UserOutlined /> : undefined}
              style={{ background: !currentUser?.avatarUrl ? SF.primary : undefined }}
            />
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
          Ma Story
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
          <div key={su.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
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
          Aucune story active — soyez le premier ! 🚀
        </div>
      )}
    </div>
  );
};

export default StoriesBar;
