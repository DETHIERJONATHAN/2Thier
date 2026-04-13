/**
 * InteractionBar.tsx — Unified action bar for like / comment / share / DM / save
 * Used by: ExplorePanel fullscreen, ReelsPanel action bar, StoriesBar viewer
 *
 * Renders a horizontal row of interaction buttons with consistent styling.
 */
import React from 'react';
import {
  HeartOutlined, HeartFilled, MessageOutlined,
  ShareAltOutlined, SendOutlined, BookOutlined, BookFilled,
} from '@ant-design/icons';
import { SF } from '../ZhiiveTheme';

interface InteractionBarProps {
  /** Post / content ID */
  postId: string;
  /** Counts */
  likesCount: number;
  commentsCount?: number;
  /** State */
  isLiked: boolean;
  isSaved: boolean;
  /** Callbacks */
  onLike: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onDM?: (postId: string) => void;
  /** Styling variant */
  variant?: 'light' | 'dark';
  /** Show comment button */
  showComment?: boolean;
  /** Show DM button */
  showDM?: boolean;
}

const InteractionBar: React.FC<InteractionBarProps> = ({
  postId, likesCount, commentsCount = 0,
  isLiked, isSaved,
  onLike, onComment, onShare, onSave, onDM,
  variant = 'dark', showComment = true, showDM = true,
}) => {
  const textColor = variant === 'dark' ? SF.textLightMuted : SF.textSecondary;
  const iconSize = 20;

  return (
    <div style={{
      display: 'flex', gap: 16, padding: '8px 0',
      borderTop: variant === 'dark' ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${SF.border}`,
      alignItems: 'center',
    }}>
      {/* Like */}
      <ActionItem
        icon={isLiked ? <HeartFilled style={{ fontSize: iconSize }} /> : <HeartOutlined style={{ fontSize: iconSize }} />}
        label={String(likesCount)}
        color={isLiked ? SF.like : textColor}
        onClick={() => onLike(postId)}
      />

      {/* Comment */}
      {showComment && onComment && (
        <ActionItem
          icon={<MessageOutlined style={{ fontSize: iconSize }} />}
          label={commentsCount > 0 ? String(commentsCount) : '0'}
          color={textColor}
          onClick={() => onComment(postId)}
        />
      )}

      {/* Share */}
      <ActionItem
        icon={<ShareAltOutlined style={{ fontSize: iconSize }} />}
        color={textColor}
        onClick={() => onShare(postId)}
      />

      {/* DM */}
      {showDM && onDM && (
        <ActionItem
          icon={<SendOutlined style={{ fontSize: 18 }} />}
          color={textColor}
          onClick={() => onDM(postId)}
        />
      )}

      <div style={{ flex: 1 }} />

      {/* Save */}
      <ActionItem
        icon={isSaved ? <BookFilled style={{ fontSize: iconSize }} /> : <BookOutlined style={{ fontSize: iconSize }} />}
        color={isSaved ? '#FFD700' : textColor}
        onClick={() => onSave(postId)}
      />
    </div>
  );
};

const ActionItem: React.FC<{
  icon: React.ReactNode;
  label?: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, color, onClick }) => (
  <span role="button" tabIndex={0} onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 4,
    cursor: 'pointer', fontSize: 13, color, transition: 'color 0.15s',
  }}>
    {icon} {label && <span>{label}</span>}
  </span>
);

export default InteractionBar;
