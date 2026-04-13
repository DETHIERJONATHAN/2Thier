/**
 * 📌 MessageReactions — Display reactions on a message + add reaction button
 * Shows grouped emoji reactions with counts and user tooltips
 */
import React from 'react';
import { Tooltip } from 'antd';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { PlusOutlined } from '@ant-design/icons';

interface Reaction {
  emoji: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string };
}

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onToggleReaction,
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Group by emoji
  const grouped: Record<string, { emoji: string; users: Reaction['user'][]; hasMyReaction: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, users: [], hasMyReaction: false };
    }
    grouped[r.emoji].users.push(r.user);
    if (r.userId === currentUserId) {
      grouped[r.emoji].hasMyReaction = true;
    }
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(grouped).map(({ emoji, users, hasMyReaction }) => (
        <Tooltip
          key={emoji}
          title={users.map(u => `${u.firstName} ${u.lastName}`.trim()).join(', ')}
          placement="top"
        >
          <button
            onClick={() => onToggleReaction(emoji)}
            className={`
              inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-xs cursor-pointer
              transition-all border min-h-[36px]
              ${hasMyReaction
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-gray-700/50 border-gray-600/30 text-gray-300 hover:bg-gray-600/50'
              }
            `}
          >
            <span style={{ fontSize: 13 }}>{emoji}</span>
            {users.length > 1 && <span className="font-medium">{users.length}</span>}
          </button>
        </Tooltip>
      ))}
      {/* Add reaction button */}
      <EmojiReactionPicker onSelect={onToggleReaction} placement="top">
        <button
          className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs cursor-pointer min-h-[36px]
            bg-gray-700/30 border border-gray-600/20 text-gray-400 hover:bg-gray-600/40 hover:text-gray-200
            transition-all opacity-0 group-hover:opacity-100"
        >
          <PlusOutlined style={{ fontSize: 10 }} />
        </button>
      </EmojiReactionPicker>
    </div>
  );
};

export default MessageReactions;
