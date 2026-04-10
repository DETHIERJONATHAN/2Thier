/**
 * timeUtils.ts — Shared relative time utility for all Zhiive panels
 * Used by: ExplorePanel, ReelsPanel, StoriesBar, UniversePanel
 */

/**
 * Returns a short human-readable relative time string.
 * Examples: "now", "5min", "3h", "2j", "1sem", "3m"
 */
export const timeAgo = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}m`;
};
