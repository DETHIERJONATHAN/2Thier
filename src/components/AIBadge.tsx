import React from 'react';
import useAIStatus from '../hooks/useAIStatus';

export const AIBadge: React.FC = () => {
  const { badge, data, loading, fallbackWarning } = useAIStatus(30000);
  if (loading && !badge) return null;
  const b = badge || { text: 'IA', color: 'gray', title: 'Statut IA inconnu' };
  const colorMap: Record<string,string> = { green: 'bg-green-600', orange: 'bg-orange-500', gray: 'bg-gray-500' };
  return (
    <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-1">
      <div
        className={`text-xs text-white px-2 py-1 rounded shadow cursor-default select-none ${colorMap[b.color] || 'bg-gray-500'}`}
        title={b.title + (data?.lastError ? `\nDernière erreur: ${data.lastError}` : '') + (data?.degraded ? `\nMode dégradé jusqu'à: ${data.degradedUntil}`:'' )}
      >
        {b.text}
      </div>
      {fallbackWarning && (
        <div className="text-[10px] text-orange-700 bg-orange-100 border border-orange-300 rounded px-2 py-1 max-w-xs shadow">
          {fallbackWarning}
        </div>
      )}
    </div>
  );
};

export default AIBadge;
