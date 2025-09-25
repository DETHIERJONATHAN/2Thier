import React from 'react';

interface FooterProps {
    activeTabLabel?: string;
    onSaveDraft?: () => void | Promise<void>;
    onComplete?: () => void | Promise<void>;
    saving?: boolean;
}

const Footer: React.FC<FooterProps> = ({ activeTabLabel, onSaveDraft, onComplete, saving }) => {
    return (
        <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Onglet actif : <b>{activeTabLabel}</b></span>
                <div className="flex items-center gap-2">
                    <button
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => { if (onSaveDraft) void onSaveDraft(); }}
                        disabled={saving}
                    >{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
                    <button
                        className="rounded-xl bg-emerald-600 text-white px-4 py-2 shadow hover:opacity-95 disabled:opacity-60"
                        onClick={() => { if (onComplete) void onComplete(); }}
                        disabled={saving}
                    >Soumettre</button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
