import React from 'react';
import SectionCard from '../components/SectionCard';
import { IconO, IconC, IconOC } from '../components/Icons';
import { Answers } from '../types/types';

interface GeneralMeasuresTabProps {
    answers: Answers;
    update: (patch: Partial<Answers>) => void;
    derivedValues: {
        coutTotal?: number;
        isSolvable?: boolean;
    };
    debugMode?: boolean;
}

const GeneralMeasuresTab: React.FC<GeneralMeasuresTabProps> = ({ answers, update, derivedValues, debugMode }) => {
    return (
        <>
            <SectionCard
                title={<div className="flex items-center"><IconO /> Type de client</div>}
                subtitle="Choisissez le type de client"
                badges={["📊", "⚖️"]}
                debugMode={debugMode}
            >
                <div className="grid sm:grid-cols-3 gap-3">
                    {[
                        { key: "particulier", label: "Particulier" },
                        { key: "entreprise", label: "Entreprise" },
                        { key: "autre", label: "Autre" },
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => update({ typeClient: opt.key as any })}
                            className={`w-full rounded-xl border px-4 py-3 text-sm ${answers.typeClient === opt.key
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {answers.typeClient === "entreprise" && (
                    <div className="mt-3 border-t pt-3">
                        <label className="text-sm font-medium text-slate-700">Numéro de TVA (condition ⚖️)</label>
                        <input
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                            placeholder="BE0123.456.789"
                            value={answers.tva}
                            onChange={(e) => update({ tva: e.target.value })}
                        />
                    </div>
                )}
            </SectionCard>

            <SectionCard
                title={<div className="flex items-center"><IconC /> Budget global</div>}
                subtitle="Montant disponible pour le projet"
                badges={["🧮", "⚖️"]}
                debugMode={debugMode}
            >
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={2000}
                        max={60000}
                        step={500}
                        value={answers.budget ?? 2000}
                        onChange={(e) => update({ budget: Number(e.target.value) })}
                        className="w-full"
                    />
                    <div className="w-28 text-right text-sm font-medium tabular-nums">{(answers.budget ?? 0).toLocaleString("fr-BE")} €</div>
                </div>
            </SectionCard>

            <SectionCard
                title={<div className="flex items-center"><IconC /> Surface utile (m²)</div>}
                subtitle="Surface estimée disponible (toiture/façades)"
                badges={["🧮", "📊"]}
                debugMode={debugMode}
            >
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={10}
                        max={200}
                        step={5}
                        value={answers.surface ?? 10}
                        onChange={(e) => update({ surface: Number(e.target.value) })}
                        className="w-full"
                    />
                    <div className="w-16 text-right text-sm font-medium tabular-nums">{answers.surface ?? 0}</div>
                </div>
                <div className="text-sm text-slate-600">🧮 Coût PV estimé (@cout_total) ≈ <b>{derivedValues.coutTotal?.toLocaleString("fr-BE")} €</b></div>
            </SectionCard>

            {derivedValues.isSolvable !== undefined && (
                <div className={`rounded-2xl border p-4 ${derivedValues.isSolvable ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
                    <div className="text-sm">
                        {derivedValues.isSolvable ? (
                            <span>✅ Budget ≥ estimation PV : vous pouvez avancer sur les secteurs choisis.</span>
                        ) : (
                            <span>⚠️ Budget inférieur à l'estimation PV : ajustez la surface ou prévoyez un financement.</span>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default GeneralMeasuresTab;
