import React from 'react';
import { Answers, TblTab } from '../types/types';
import Badge from './Badge';

interface SidebarProps {
    answers: Answers;
    derivedValues: {
        coutTotal?: number;
        rendementPv?: number;
    };
    tabs: TblTab[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ answers, derivedValues, tabs, activeTab, setActiveTab }) => {

    const handlePrev = () => {
        const currentIndex = tabs.findIndex(s => s.key === activeTab);
        const prevIndex = Math.max(0, currentIndex - 1);
        setActiveTab(tabs[prevIndex]?.key ?? activeTab);
    };

    const handleNext = () => {
        const currentIndex = tabs.findIndex(s => s.key === activeTab);
        const nextIndex = Math.min(tabs.length - 1, currentIndex + 1);
        setActiveTab(tabs[nextIndex]?.key ?? activeTab);
    };

    return (
        <aside className="xl:sticky xl:top-[148px] h-fit">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Résumé & Variables</h3>
                    <span className="text-xs text-slate-500">Auto</span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span>@budget</span><b>{answers.budget?.toLocaleString("fr-BE")} €</b></div>
                    <div className="flex items-center justify-between"><span>@surface</span><b>{answers.surface} m²</b></div>
                    <div className="flex items-center justify-between"><span>@cout_total</span><b>{derivedValues.coutTotal?.toLocaleString("fr-BE")} €</b></div>
                    <div className="flex items-center justify-between"><span>@rendement_pv</span><b>{derivedValues.rendementPv ?? "—"}%</b></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>📊</Badge>
                    <Badge>🧮</Badge>
                    <Badge>⚖️</Badge>
                    <Badge>🧩</Badge>
                    <Badge>🔌</Badge>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                    onClick={handlePrev}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                >
                    ◀︎ Précédent
                </button>
                <button
                    onClick={handleNext}
                    className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm shadow hover:opacity-95"
                >
                    Suivant ▶︎
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
