import React from 'react';

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-slate-600 border-slate-200 bg-white/70 ${className}`}>
    {children}
  </span>
);

export default Badge;
