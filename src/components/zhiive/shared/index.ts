/**
 * Shared Zhiive social components and hooks — barrel export
 *
 * Usage:
 *   import { usePostInteractions, useDoubleTap, timeAgo } from './shared';
 *   import InteractionBar from './shared/InteractionBar';
 *   import HeartBurstOverlay from './shared/HeartBurstOverlay';
 */
export { usePostInteractions } from './usePostInteractions';
export { useDoubleTap } from './useDoubleTap';
export { timeAgo } from './timeUtils';
export { default as InteractionBar } from './InteractionBar';
export { default as HeartBurstOverlay, heartBurstKeyframes } from './HeartBurstOverlay';
