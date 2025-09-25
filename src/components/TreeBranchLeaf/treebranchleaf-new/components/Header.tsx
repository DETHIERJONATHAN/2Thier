import React from 'react';
import { Lead, TblTab } from '../types/types';
import Badge from './Badge';

interface HeaderProps {
    lead: Lead;
    debug: boolean;
    setDebug: (debug: boolean) => void;
    tabs: TblTab[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    unsaved?: boolean; // true si aucune soumission n'existe encore
}

const Tab: React.FC<{ label: string; index: string; activeTab: string; setActiveTab: (tab: string) => void; }> = ({ label, index, activeTab, setActiveTab }) => (
    <button
      onClick={() => setActiveTab(index)}
      className={[
        "px-4 py-2 rounded-2xl border whitespace-nowrap",
        activeTab === index
          ? "bg-slate-900 text-white border-slate-900 shadow"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700",
      ].join(" ")}
    >
      {label}
    </button>
  );

const Header: React.FC<HeaderProps> = ({ lead, debug, setDebug, tabs, activeTab, setActiveTab, unsaved }) => {
    return (
        <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-200">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">TBL</div>
                    <div>
                        <div className="text-lg font-semibold text-slate-900">Système Multi-secteurs — Devis</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>Lead: <b>{lead.name}</b> · {lead.address} · {lead.phone}</span>
                            {unsaved && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-2 py-[2px] border border-amber-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Non sauvegardé
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge>Progression : 0%</Badge>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" className="accent-slate-900" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
                        Mode debug admin
                    </label>
                </div>
            </div>
            <div className="mx-auto max-w-7xl px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(s => (
                        <Tab key={s.key} label={s.label} index={s.key} activeTab={activeTab} setActiveTab={setActiveTab} />
                    ))}
                </div>
            </div>
        </header>
    );
};

export default Header;
