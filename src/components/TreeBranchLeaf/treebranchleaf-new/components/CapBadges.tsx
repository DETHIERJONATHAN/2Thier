import React from 'react';

export const CapBadges: React.FC<{ list?: string[]; show?: boolean }> = ({ list = [], show = false }) => {
  if (!show || list.length === 0) return null;
  return (
    <div className="ml-2 hidden md:flex items-center gap-1 text-sm">
      {list.map((b, i) => (
        <span key={i} className="opacity-80">{b}</span>
      ))}
    </div>
  );
};
