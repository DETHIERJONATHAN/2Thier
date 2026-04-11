import React from 'react';
import { SF } from './ZhiiveTheme';

interface ZhiiveModuleHeaderProps {
  /** Emoji or Ant icon shown before the title */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Optional center content (filter pills, etc.) */
  center?: React.ReactNode;
  /** Right-side action buttons */
  actions?: React.ReactNode;
}

/**
 * 48 px sticky header bar — same pattern as Agenda / Mail mobile headers.
 * Icon + title left · optional center · action buttons right.
 */
const ZhiiveModuleHeader: React.FC<ZhiiveModuleHeaderProps> = ({ icon, title, center, actions }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 44,
        padding: '0 6px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: 4,
        flexShrink: 0,
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Left: icon + title */}
      {icon && <span style={{ fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0, color: SF.text, whiteSpace: 'nowrap' }}>{title}</span>

      {/* Center: optional pills / filters */}
      {center ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 4, overflow: 'hidden', minWidth: 0 }}>
          {center}
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }} />
      )}

      {/* Right: action buttons */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default ZhiiveModuleHeader;