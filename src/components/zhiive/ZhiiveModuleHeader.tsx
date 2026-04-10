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
        height: 48,
        padding: '0 10px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Left: icon + title */}
      {icon && <span style={{ fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0, color: SF.text }}>{title}</span>

      {/* Center: optional pills / filters */}
      {center ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 4, overflow: 'hidden' }}>
          {center}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Right: action buttons */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default ZhiiveModuleHeader;