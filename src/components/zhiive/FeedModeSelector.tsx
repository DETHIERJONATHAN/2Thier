import React from 'react';
import { useZhiiveNav, FeedMode } from '../../contexts/ZhiiveNavContext';
import { useAuth } from '../../auth/useAuth';
import { SF } from './ZhiiveTheme';

/**
 * Compact toggle to switch between Personal (public network) and Org (internal) feed mode.
 * Only renders for users who have an organization.
 */
const FeedModeSelector: React.FC = () => {
  const { feedMode, setFeedMode } = useZhiiveNav();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) return null;

  const modes: { key: FeedMode; label: string; icon: string }[] = [
    { key: 'personal', label: 'My Hive', icon: '🐝' },
    { key: 'org', label: 'Colony', icon: '⬡' },
  ];

  return (
    <div style={{
      display: 'flex', gap: 4, padding: 3,
      background: SF.bg, borderRadius: 20,
      border: `1px solid ${SF.border}`,
    }}>
      {modes.map(m => {
        const active = feedMode === m.key;
        return (
          <div
            key={m.key}
            role="button" tabIndex={0} onClick={() => setFeedMode(m.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 16,
              fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s',
              background: active
                ? (m.key === 'personal' ? SF.secondary + '20' : SF.primary + '20')
                : 'transparent',
              color: active
                ? (m.key === 'personal' ? SF.secondary : SF.primary)
                : SF.textSecondary,
            }}
          >
            <span style={{ fontSize: 14 }}>{m.icon}</span>
            {m.label}
          </div>
        );
      })}
    </div>
  );
};

export default FeedModeSelector;
