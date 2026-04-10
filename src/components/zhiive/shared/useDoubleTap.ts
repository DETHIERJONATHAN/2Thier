/**
 * useDoubleTap.ts — Double-tap detection hook with heart animation
 * Used by: ExplorePanel, ReelsPanel, StoriesBar
 */
import { useRef, useCallback, useState } from 'react';

const DOUBLE_TAP_MS = 300;
const HEART_ANIM_MS = 900;

interface UseDoubleTapOptions {
  onDoubleTap: (id: string) => void;
}

export const useDoubleTap = ({ onDoubleTap }: UseDoubleTapOptions) => {
  const lastTap = useRef<{ time: number; id: string } | null>(null);
  const [heartAnimId, setHeartAnimId] = useState<string | null>(null);

  const handleTap = useCallback((id: string) => {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.id === id && now - prev.time < DOUBLE_TAP_MS) {
      onDoubleTap(id);
      setHeartAnimId(id);
      setTimeout(() => setHeartAnimId(null), HEART_ANIM_MS);
      lastTap.current = null;
    } else {
      lastTap.current = { time: now, id };
    }
  }, [onDoubleTap]);

  return { handleTap, heartAnimId, HEART_ANIM_MS };
};
