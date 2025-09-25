import React from 'react';
import { CapBadges } from './CapBadges';

interface SectionCardProps {
  title: React.ReactNode;
  subtitle?: string;
  badges?: string[];
  children: React.ReactNode;
  debugMode?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, badges, children, debugMode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-900 flex items-center">
          {title}
          <CapBadges show={debugMode} list={badges} />
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
    <div className="mt-4 space-y-4">{children}</div>
  </div>
);

export default SectionCard;
