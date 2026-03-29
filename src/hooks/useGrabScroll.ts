import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook to enable click-and-drag horizontal scrolling on desktop.
 * Returns a ref to attach to the scrollable container and mouse event handlers.
 */
export function useGrabScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const state = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only activate on left mouse button, and not when clicking interactive elements
    if (e.button !== 0) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'A' || tag === 'SELECT') return;
    const el = ref.current;
    if (!el) return;
    state.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!state.current.isDown) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - state.current.startX) * 1.5; // speed multiplier
    el.scrollLeft = state.current.scrollLeft - walk;
  }, []);

  const stopDrag = useCallback(() => {
    state.current.isDown = false;
    const el = ref.current;
    if (el) {
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
    }
  }, []);

  // Also stop if mouse leaves the window entirely
  useEffect(() => {
    const handleUp = () => stopDrag();
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [stopDrag]);

  return {
    ref,
    grabScrollProps: {
      onMouseDown,
      onMouseMove,
      onMouseUp: stopDrag,
      onMouseLeave: stopDrag,
      style: { cursor: 'grab' } as React.CSSProperties,
    },
  };
}
