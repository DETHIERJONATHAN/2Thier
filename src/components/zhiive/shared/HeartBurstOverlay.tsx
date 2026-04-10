/**
 * HeartBurstOverlay.tsx — Animated heart burst for double-tap like
 * Used by: ExplorePanel, ReelsPanel, StoriesBar
 */
import React from 'react';
import { HeartFilled } from '@ant-design/icons';
import { SF } from '../ZhiiveTheme';

interface HeartBurstOverlayProps {
  visible: boolean;
  animDurationMs?: number;
}

const HeartBurstOverlay: React.FC<HeartBurstOverlayProps> = ({ visible, animDurationMs = 900 }) => {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ animation: `heartBurst ${animDurationMs}ms ease forwards` }}>
        <HeartFilled style={{
          fontSize: 80, color: SF.like,
          filter: 'drop-shadow(0 4px 12px rgba(255,45,85,0.6))',
        }} />
      </div>
    </div>
  );
};

/** CSS keyframes — inject once in any parent using HeartBurstOverlay */
export const heartBurstKeyframes = `
  @keyframes heartBurst {
    0% { transform: scale(0); opacity: 1; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  }
`;

export default HeartBurstOverlay;
