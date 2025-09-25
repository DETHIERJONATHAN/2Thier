import React from 'react';
import useAIStatus from '../../hooks/useAIStatus';

interface AIModeBadgeProps { compact?: boolean; }

export const AIModeBadge: React.FC<AIModeBadgeProps> = ({ compact }) => {
  const { badge, loading, error } = useAIStatus(90000);
  if (loading) return <span className="text-xs text-gray-400">IA…</span>;
  if (error) return <span className="text-xs text-red-500" title={error}>IA Erreur</span>;
  if (!badge) return null;
  const base = 'px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 border';
  const colorMap: Record<string,string> = {
    green: 'bg-green-50 text-green-700 border-green-300',
    orange: 'bg-amber-50 text-amber-700 border-amber-300',
    gray: 'bg-gray-100 text-gray-600 border-gray-300'
  };
  return <span className={`${base} ${colorMap[badge.color] || ''}`} title={badge.title}>
    <span>🤖</span>{!compact && <span>{badge.text}</span>}
  </span>;
};

export default AIModeBadge;
