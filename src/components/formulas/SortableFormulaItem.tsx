import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Button, Segmented, Select } from 'antd';
import { useAdvancedSelectCache } from '../../hooks/useAdvancedSelectCache';
import useCRMStore from '../../store';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import FormulaExplorer from './FormulaExplorer';
import './formula-editor.css';

// Déclaration pour étendre Window avec notre propriété de débogage
declare global {
    interface Window {
        lastDeleteClickTime?: number;
        __switchPrev?: Record<string, string | undefined>;
        __condAdvNav?: Record<string, { fieldId?: string; path: string[] }>;
    }
}

// Types locaux (compat souple)
export type BasicItem = {
    type: 'field' | 'operator' | 'value' | 'function' | 'formula_ref' | 'adv_part' | 'cond' | 'switch';
    label?: string;
    value?: unknown;
    id?: string;
    refFormulaId?: string;
    fieldId?: string;
    part?: 'selection' | 'extra' | 'nodeId';
    condExpr?: BasicItem[];
    then?: BasicItem[];
    else?: BasicItem[];
    elseBehavior?: 'zero' | 'ignore';
    // switch
    switchFieldId?: string;
    switchPart?: 'selection' | 'extra' | 'nodeId';
    cases?: { value: string; label?: string; seq: BasicItem[] }[];
    defaultSeq?: BasicItem[];
};

interface SortableFormulaItemProps {
    id: string;
    item: BasicItem;
    formulaId: string | number;
    onRemove?: () => void;
    onUpdate?: (next: BasicItem) => void;
}

const SortableFormulaItem: React.FC<SortableFormulaItemProps> = ({ id, item, formulaId, onRemove, onUpdate }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style: React.CSSProperties = useMemo(() => ({ transform: CSS.Transform.toString(transform), transition }), [transform, transition]);

    const { fetchFullTree } = useAdvancedSelectCache();

    // États UI auxiliaires
    const [condInsertTargets, setCondInsertTargets] = useState<Record<string, { opt: 'expr' | 'then' | 'else'; formula: 'expr' | 'then' | 'else' }>>({});
    const [showCascade, setShowCascade] = useState<Record<string, boolean>>({});
    const [showFormulaExplorer, setShowFormulaExplorer] = useState(false);
    const [explorerTargetZone, setExplorerTargetZone] = useState<'expr' | 'then' | 'else'>('expr');
    const [condAdvNav] = useState<Record<string, { fieldId?: string; path: string[] }>>(() => {
        try { return window.__condAdvNav || {}; } catch { return {}; }
    });

    // Préchargement éventuel de l'arbre quand un champ advanced_select est sélectionné
    useEffect(() => {
        if (item.type !== 'cond') return;
        const cid = item.id || 'no-id';
        const nav = condAdvNav[cid];
        const fieldId = nav?.fieldId;
        if (!fieldId) return;
        try {
            const store = useCRMStore.getState();
            let typ: string | undefined;
            outer: for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) { if (String(f.id) === String(fieldId)) { typ = f.type; break outer; } }
            if (typ === 'advanced_select') { fetchFullTree(fieldId); }
        } catch { /* noop */ }
    }, [item.type, item.id, condAdvNav, fetchFullTree]);

    // Persister la navigation pour éviter perte d'arborescence lors de rafraîchissements transitoires
    useEffect(() => {
        try { window.__condAdvNav = condAdvNav; } catch { /* noop */ }
    }, [condAdvNav]);

    const getBackgroundColor = () => {
        if (item.type === 'cond') return 'bg-green-50 border-green-300';
        if (item.type === 'switch') return 'bg-indigo-50 border-indigo-300';
        return 'bg-white border-gray-200';
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        if (!window.lastDeleteClickTime || now - window.lastDeleteClickTime > 350) {
            window.lastDeleteClickTime = now;
            return; // double clic pour confirmer
        }
        onRemove?.();
    };

    const tokenColor = (tok: BasicItem) => {
        switch (tok.type) {
            case 'operator': return 'bg-yellow-50 border-yellow-300 text-yellow-700';
            case 'field': return 'bg-blue-50 border-blue-300 text-blue-700';
            case 'value': return 'bg-gray-50 border-gray-300 text-gray-700';
            case 'function': return 'bg-purple-50 border-purple-300 text-purple-700';
            case 'formula_ref': return 'bg-teal-50 border-teal-300 text-teal-700';
            case 'adv_part': return 'bg-amber-50 border-amber-300 text-amber-700';
            case 'cond': return 'bg-green-50 border-green-300 text-green-700';
            default: return 'bg-white border-gray-200';
        }
    };

    const buildFromDataTransfer = (e: React.DragEvent): BasicItem | null => {
        const t = e.dataTransfer.getData('formula-element-type');
        if (!t) return null;
        if (t === 'field') {
            const fid = e.dataTransfer.getData('field-id') || e.dataTransfer.getData('field-value');
            const flabel = e.dataTransfer.getData('field-label') || fid;
            if (!fid) return null;
            return { type: 'field', value: fid, label: flabel, id: `field-${fid}-${Date.now()}` };
        }
        if (t === 'operator') {
            const v = e.dataTransfer.getData('operator-value');
            return { type: 'operator', value: v, label: v, id: `op-${Date.now()}` };
        }
        if (t === 'function') {
            const v = e.dataTransfer.getData('function-value');
            const l = e.dataTransfer.getData('function-label') || v;
            return { type: 'function', value: v, label: l, id: `func-${Date.now()}` };
        }
        if (t === 'value') {
            const v = e.dataTransfer.getData('value-value');
            return { type: 'value', value: v, label: v, id: `val-${Date.now()}` };
        }
        if (t === 'formula_ref') {
            const ref = e.dataTransfer.getData('formula-ref-id');
            if (!ref) return null;
            return { type: 'formula_ref', refFormulaId: ref, value: ref, label: e.dataTransfer.getData('formula-ref-label') || ref, id: `fref-${ref}-${Date.now()}` };
        }
        if (t === 'adv_part') {
            const fid = e.dataTransfer.getData('adv-field-id');
            const part = e.dataTransfer.getData('adv-part') as 'selection' | 'extra' | 'nodeId';
            if (!fid || !part) return null;
            return { type: 'adv_part', fieldId: fid, part, value: `${fid}.${part}`, label: e.dataTransfer.getData('adv-label') || `${fid}.${part}`, id: `adv-${fid}-${part}-${Date.now()}` };
        }
        return null;
    };

    const buildCondExprToken = (type: string, e: React.DragEvent): BasicItem | null => {
        // réutilise buildFromDataTransfer
        return buildFromDataTransfer(e);
    };

    const removeCondExpr = (idx: number) => {
        const next: BasicItem = { ...item, condExpr: [...(item.condExpr || [])] };
        next.condExpr!.splice(idx, 1);
        onUpdate?.(next);
    };

    const makeDropHandler = (target: 'then' | 'else') => (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const created = buildFromDataTransfer(e);
        if (!created) return;
        const next: BasicItem = { ...item };
        if (target === 'then') next.then = [...(next.then || []), created];
        else next.else = [...(next.else || []), created];
        onUpdate?.(next);
    };

    const removeNested = (where: 'then' | 'else', idx: number) => {
        const next: BasicItem = { ...item };
        if (where === 'then') { next.then = [...(item.then || [])]; next.then.splice(idx, 1); }
        else { next.else = [...(item.else || [])]; next.else.splice(idx, 1); }
        onUpdate?.(next);
    };

    // Handler pour FormulaExplorer
    const handleExplorerSelect = (selectedItem: BasicItem, targetZone?: 'expr' | 'then' | 'else') => {
        const zone = targetZone || explorerTargetZone;
        const next: BasicItem = { ...item };
        
        if (zone === 'expr') {
            next.condExpr = [...(next.condExpr || []), selectedItem];
        } else if (zone === 'then') {
            next.then = [...(next.then || []), selectedItem];
        } else if (zone === 'else') {
            next.else = [...(next.else || []), selectedItem];
        }
        
        onUpdate?.(next);
        setShowFormulaExplorer(false);
    };

    const openExplorerForZone = (zone: 'expr' | 'then' | 'else') => {
        console.log('[SortableFormulaItem] Opening FormulaExplorer for zone:', zone);
        setExplorerTargetZone(zone);
        setShowFormulaExplorer(true);
        console.log('[SortableFormulaItem] showFormulaExplorer set to true');
    };

    const switchJustBound = false; // simplifié

    return (
        <div ref={setNodeRef} style={style} {...attributes} className={`flex flex-col gap-1 p-2 rounded-md shadow-sm border ${getBackgroundColor()} text-sm font-medium text-gray-800 relative group ${item.type === 'cond' ? 'w-full' : 'min-w-[140px]'}`}>
            <div className="flex items-center w-full">
                <div {...listeners} className="cursor-grab touch-none p-1"><GripVertical size={16} className="text-gray-500" /></div>
                <span className="mx-2 select-none truncate flex-1">{item.type === 'cond' ? (item.label || 'Condition') : (item.label || (item.value as string))}</span>
                <button type="button" onClick={handleRemoveClick} onPointerDown={e => e.stopPropagation()} className="ml-2 p-1 rounded-full bg-red-200 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-opacity"><X size={14} /></button>
            </div>
            
            {/* FormulaExplorer Modal */}
            <FormulaExplorer
                visible={showFormulaExplorer}
                onClose={() => {
                    console.log('[SortableFormulaItem] Closing FormulaExplorer');
                    setShowFormulaExplorer(false);
                }}
                onSelect={handleExplorerSelect}
                targetZone={explorerTargetZone}
            />
            
            {item.type === 'cond' && (
                <div className="mt-1 space-y-2">
                    {/* Ligne d'expression conditionnelle */}
                    <div className="bg-white/90 border border-green-200 rounded p-1 flex flex-col gap-1">
                        {(() => {
                            // Validation simple du pattern valeur / opérateur / valeur ...
                            const tokens = (item.condExpr || []);
                            const isValue = (t?: BasicItem) => !!t && ['field', 'value', 'formula_ref', 'adv_part', 'cond', 'function'].includes(t.type);
                            let complete = false;
                            if (tokens.length > 0 && tokens[0]?.type === 'function') complete = true; else {
                                complete = tokens.length >= 3;
                                if (complete) {
                                    for (let i = 0; i < tokens.length; i++) {
                                        if (i % 2 === 0) { if (!isValue(tokens[i])) { complete = false; break; } }
                                        else { if (tokens[i]?.type !== 'operator') { complete = false; break; } }
                                    }
                                }
                            }
                            const statusColor = complete ? 'text-green-600' : 'text-red-600';
                            const statusLabel = complete ? 'OK' : 'Incomplet';
                            return (
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[10px] font-semibold ${statusColor}`}>SI (fonction comme IF) ou (champ/valeur opérateur champ/valeur) …</span>
                                    <div className="flex items-center gap-1">
                                        <Tag color={complete ? 'green' : 'red'} className="text-[10px] py-0 px-1">{statusLabel}</Tag>
                                        {(tokens.length > 0) && (
                                            <Button size="small" onClick={() => onUpdate && onUpdate({ ...item, condExpr: [] })}>
                                                Vider
                                            </Button>
                                        )}
                                        <Button size="small" type="primary" onClick={() => openExplorerForZone('expr')}>
                                            📚 Explorateur
                                        </Button>
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500/90 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold pointer-events-none shadow-sm">Expression</div>
                            <div
                                className="formula-subdrop-zone min-w-[60px] min-h-[80px] px-2 py-2 rounded-lg flex items-center justify-center flex-wrap gap-1"
                                id={`cond-expr-${formulaId}-${item.id}`}
                                data-cond-item-id={item.id}
                                onDragOver={e => {
                                    if (item.type !== 'cond') return;
                                    const t = e.dataTransfer.getData('formula-element-type');
                                    if (['field', 'operator', 'formula_ref', 'adv_part', 'value', 'function'].includes(t)) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        (e.currentTarget as HTMLDivElement).classList.add('ring', 'ring-blue-300');
                                    }
                                }}
                                onDragLeave={e => { (e.currentTarget as HTMLDivElement).classList.remove('ring', 'ring-blue-300'); }}
                                onDrop={(e) => {
                                    if (item.type !== 'cond') return;
                                    const container = e.currentTarget as HTMLDivElement;
                                    container.classList.remove('ring', 'ring-blue-300');
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const type = e.dataTransfer.getData('formula-element-type');
                                    if (!['field', 'operator', 'formula_ref', 'adv_part', 'value', 'function'].includes(type)) return;
                                    const created = buildCondExprToken(type, e);
                                    if (!created) return;
                                    const next: BasicItem = { ...item, condExpr: [...(item.condExpr || []), created] };
                                    if (onUpdate) { onUpdate(next); }
                                }}
                            >
                                {(item.condExpr || []).length === 0 && (
                                    <div className="empty-state">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                                            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                            <path d="M18 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v6z" />
                                        </svg>
                                        <p className="empty-title">Déposer une expression (ex: Champ 1 &gt; Champ 2)</p>
                                    </div>
                                )}
                                {(item.condExpr || []).length > 0 && (
                                    <div className="flex gap-1 flex-wrap w-full justify-start">
                                        {(item.condExpr || []).map((tok, idx) => (
                                            <span key={idx} className={`px-1 py-0.5 rounded border text-[10px] flex items-center gap-1 ${tokenColor(tok)}`}>
                                                {tok.label || (tok.value as string)}
                                                <button type="button" className="text-red-500" onClick={() => removeCondExpr(idx)}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">Construire l'expression: soit une fonction (IF, etc.) soit valeur (champ / part / formule / nombre) puis opérateur (+, -, &gt;, =, etc.) puis autre valeur. Répéter pour chaîner: Champ1 &gt; Champ2 &amp;&amp; Champ3 &lt; 10.</p>
                    </div>
                    
                    {/* Sélecteurs d'insertion rapide: formules et options */}
                    {item.type === 'cond' && (() => {
                        const cid = item.id || 'no-id';
                        const targets = condInsertTargets[cid] || { opt: 'expr' as 'expr' | 'then' | 'else', formula: 'expr' as 'expr' | 'then' | 'else' };
                        const setTargets = (patch: Partial<{ opt: 'expr' | 'then' | 'else'; formula: 'expr' | 'then' | 'else' }>) => {
                            setCondInsertTargets(prev => ({ ...prev, [cid]: { ...targets, ...patch } }));
                        };
                        const inject = (target: 'expr' | 'then' | 'else', token: BasicItem) => {
                            const next: BasicItem = { ...item };
                            if (target === 'expr') next.condExpr = [...(next.condExpr || []), token];
                            else if (target === 'then') next.then = [...(next.then || []), token];
                            else next.else = [...(next.else || []), token];
                            if (onUpdate) onUpdate(next);
                        };
                        // Scope des formules: uniquement celles du même champ que la formule en cours
                        let allFormulas: { id: string; name: string }[] = [];
                        try {
                            const store = useCRMStore.getState();
                            let ownerFieldId: string | undefined;
                            outerFind: for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) {
                                if (Array.isArray(f.formulas) && f.formulas.some(fm => fm && String(fm.id) === String(formulaId))) { ownerFieldId = String(f.id); break outerFind; }
                            }
                            if (ownerFieldId) {
                                for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) {
                                    if (String(f.id) !== ownerFieldId) continue;
                                    if (Array.isArray(f.formulas)) for (const fm of f.formulas) {
                                        if (fm && fm.id && String(fm.id) !== String(formulaId)) allFormulas.push({ id: String(fm.id), name: fm.name || `Formule ${fm.id}` });
                                    }
                                }
                            }
                            allFormulas = Array.from(new Map(allFormulas.map(f => [f.id, f])).values()).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
                        } catch { /* noop */ }
                        return (
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Bloc Options */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-semibold text-green-700">Options</span>
                                        <Segmented size="small" options={[{ label: 'Expr', value: 'expr' }, { label: 'ALORS', value: 'then' }, { label: 'SINON', value: 'else' }]} value={targets.opt} onChange={(v) => setTargets({ opt: v as 'expr' | 'then' | 'else' })} />
                                        <Button size="small" onClick={() => { const cid = item.id || 'no-id'; setShowCascade(prev => ({ ...prev, [cid]: !prev[cid] })); }}>{(showCascade[item.id || 'no-id']) ? 'Masquer' : 'Explorer'}</Button>
                                    </div>
                                    {/* Bloc Formules */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-semibold text-green-700">Formules</span>
                                        <Segmented size="small" options={[{ label: 'Expr', value: 'expr' }, { label: 'ALORS', value: 'then' }, { label: 'SINON', value: 'else' }]} value={targets.formula} onChange={(v) => setTargets({ formula: v as 'expr' | 'then' | 'else' })} />
                                        {allFormulas.length > 0 ? (
                                            <Select size="small" placeholder="-- formule --" style={{ minWidth: 160 }} onChange={(fid) => { const fObj = allFormulas.find(f => f.id === fid); if (!fObj) return; const token: BasicItem = { type: 'formula_ref', refFormulaId: fid as string, value: fid as string, label: fObj.name, id: `fref-${fid}-${Date.now()}` }; inject(targets.formula, token); }} options={allFormulas.map(f => ({ value: f.id, label: f.name }))} />
                                        ) : (
                                            <span className="text-[9px] italic opacity-50">Aucune</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Comportement si condition FAUSSE */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 flex-wrap">
                        <span>Si condition FAUSSE =&gt;</span>
                        <Segmented size="small" value={item.elseBehavior} onChange={(v) => { if (onUpdate) onUpdate({ ...item, elseBehavior: (v as 'zero' | 'ignore') }); }} options={[{ label: 'Résultat 0', value: 'zero' }, { label: 'Ignorer', value: 'ignore' }]} />
                    </div>
                    
                    {/* LES 2 ZONES DE DROP PRINCIPALES : ALORS et SINON */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="border rounded bg-white/80 p-1">
                            <div className="relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold pointer-events-none shadow-sm">ALORS</div>
                                <div className="flex justify-end mb-1">
                                    <Button size="small" type="link" onClick={() => openExplorerForZone('then')} className="text-[9px] p-0">
                                        📚
                                    </Button>
                                </div>
                                <div className="formula-subdrop-zone min-h-[80px] flex flex-col gap-1 p-2"
                                    onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).classList.add('ring', 'ring-green-300'); }}
                                    onDragLeave={e => { (e.currentTarget as HTMLDivElement).classList.remove('ring', 'ring-green-300'); }}
                                    onDrop={makeDropHandler('then')}
                                >
                                    {(item.then || []).map((sub, idx) => (
                                        <div key={idx} className="px-1 py-0.5 bg-green-50 border border-green-200 rounded flex items-center justify-between text-[10px]">
                                            <span className="truncate">{sub.label || sub.value as string}</span>
                                            <button type="button" className="text-red-500 ml-1" onClick={() => removeNested('then', idx)}>×</button>
                                        </div>
                                    ))}
                                    {(item.then || []).length === 0 && (
                                        <div className="empty-state">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                                                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                                <path d="M18 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v6z" />
                                            </svg>
                                            <p className="empty-title">Déposer des éléments…</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="border rounded bg-white/80 p-1">
                            <div className="relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold pointer-events-none shadow-sm">SINON</div>
                                <div className="flex justify-end mb-1">
                                    <Button size="small" type="link" onClick={() => openExplorerForZone('else')} className="text-[9px] p-0">
                                        📚
                                    </Button>
                                </div>
                                <div className="formula-subdrop-zone min-h-[80px] flex flex-col gap-1 p-2"
                                    onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).classList.add('ring', 'ring-red-300'); }}
                                    onDragLeave={e => { (e.currentTarget as HTMLDivElement).classList.remove('ring', 'ring-red-300'); }}
                                    onDrop={makeDropHandler('else')}
                                >
                                    {(item.else || []).map((sub, idx) => (
                                        <div key={idx} className="px-1 py-0.5 bg-red-50 border border-red-200 rounded flex items-center justify-between text-[10px]">
                                            <span className="truncate">{sub.label || sub.value as string}</span>
                                            <button type="button" className="text-red-500 ml-1" onClick={() => removeNested('else', idx)}>×</button>
                                        </div>
                                    ))}
                                    {(item.else || []).length === 0 && (
                                        <div className="empty-state">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                                                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                                <path d="M18 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v6z" />
                                            </svg>
                                            <p className="empty-title">Déposer des éléments…</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {item.type === 'switch' && (
                <div className="mt-1 space-y-2">
                    <div className={`bg-white/80 border border-indigo-200 rounded p-1 text-[10px] flex flex-col gap-1 ${switchJustBound ? 'animate-pulse ring-2 ring-indigo-400' : ''}`}>
                        {switchJustBound && (
                            <div className="mb-1 px-1 py-0.5 rounded bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                                ✅ Champ associé au switch. Choisissez une part et ajoutez des cas.
                            </div>
                        )}
                        {(() => {
                            let fieldLabel: string | undefined;
                            if (item.switchFieldId) {
                                try {
                                    const store = useCRMStore.getState();
                                    outer: for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) { if (String(f.id) === String(item.switchFieldId)) { fieldLabel = f.label || String(f.id); break outer; } }
                                } catch { /* noop */ }
                            }
                            return (
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                    <span className="font-semibold text-indigo-700 truncate max-w-[180px]">
                                        {item.switchFieldId ? `Switch sur ${fieldLabel || item.switchFieldId}` : 'Switch (glisser un champ adv_select ici)'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {item.switchFieldId && (
                                            <div className="flex gap-1">
                                                {(['selection', 'extra', 'nodeId'] as const).map(p => (
                                                    <button key={p} type="button" className={`px-1 py-0.5 border rounded text-[9px] ${item.switchPart === p ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white hover:bg-indigo-50'}`} onClick={() => { const next = { ...item, switchPart: p } as BasicItem; onUpdate?.(next); }}>
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <button type="button" className="text-[9px] px-1 py-0.5 border rounded bg-white hover:bg-indigo-50 disabled:opacity-40" disabled={!item.switchFieldId} onClick={() => {
                                            if (!item.switchFieldId) return;
                                            const next = { ...item, cases: [...(item.cases || []), { value: '', seq: [] as BasicItem[] }] } as BasicItem;
                                            onUpdate?.(next);
                                        }}>+ Cas</button>
                                        {item.switchFieldId && (
                                            <button type="button" className="text-[9px] px-1 py-0.5 border rounded bg-white hover:bg-red-50" title="Changer de champ" onClick={() => {
                                                const next = { ...item, switchFieldId: undefined, cases: [], defaultSeq: [], switchPart: undefined } as BasicItem;
                                                onUpdate?.(next);
                                            }}>↺</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                        {!item.switchFieldId && (
                            <div className="border border-dashed border-indigo-300 rounded p-1 text-[10px] text-indigo-600 bg-indigo-50/50"
                                onDragOver={e => {
                                    const listed = Array.from(e.dataTransfer.types || []);
                                    const hasField = listed.includes('field-id') || listed.includes('adv-field-id');
                                    if (hasField) { e.preventDefault(); (e.currentTarget as HTMLDivElement).classList.add('ring', 'ring-indigo-300'); }
                                }}
                                onDragLeave={e => { (e.currentTarget as HTMLDivElement).classList.remove('ring', 'ring-indigo-300'); }}
                                onDrop={e => {
                                    e.preventDefault();
                                    (e.currentTarget as HTMLDivElement).classList.remove('ring', 'ring-indigo-300');
                                    const t = e.dataTransfer.getData('formula-element-type');
                                    if (t !== 'field' && t !== 'adv_part') return;
                                    if (t === 'field') {
                                        const fid = e.dataTransfer.getData('field-id') || e.dataTransfer.getData('field-value');
                                        if (!fid) return;
                                        let fieldType: string | undefined;
                                        try { const store = useCRMStore.getState(); outerF: for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) { if (String(f.id) === String(fid)) { fieldType = f.type; break outerF; } } } catch { /* noop */ }
                                        if (fieldType !== 'advanced_select') return;
                                        const next = { ...item, switchFieldId: fid, switchPart: 'selection' } as BasicItem; onUpdate?.(next);
                                    } else if (t === 'adv_part') {
                                        const fid = e.dataTransfer.getData('adv-field-id');
                                        const part = e.dataTransfer.getData('adv-part') as 'selection' | 'extra' | 'nodeId';
                                        if (!fid || !part) return;
                                        let fieldType: string | undefined;
                                        try { const store = useCRMStore.getState(); outerP: for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) { if (String(f.id) === String(fid)) { fieldType = f.type; break outerP; } } } catch { /* noop */ }
                                        if (fieldType !== 'advanced_select') return;
                                        const next = { ...item, switchFieldId: fid, switchPart: part } as BasicItem; onUpdate?.(next);
                                    }
                                }}
                            >Déposer ici un champ advanced_select (ou une part) pour le baser</div>
                        )}
                        {!item.switchFieldId && (() => {
                            try {
                                const store = useCRMStore.getState();
                                const advFields: { id: string; label: string }[] = [];
                                for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) { if (f.type === 'advanced_select') advFields.push({ id: String(f.id), label: f.label || String(f.id) }); }
                                if (advFields.length === 0) return null;
                                return (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-[9px] text-indigo-600">Ou choisir:</span>
                                        <select className="text-[10px] border rounded px-1 py-0.5" onChange={e => { const fid = e.target.value; if (!fid) return; const next = { ...item, switchFieldId: fid, switchPart: 'selection' } as BasicItem; onUpdate?.(next); }}>
                                            <option value="">-- champ --</option>
                                            {advFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                        </select>
                                    </div>
                                );
                            } catch { return null; }
                        })()}
                        {(() => {
                            const store = useCRMStore.getState();
                            const advOptions = item.switchFieldId ? ((): { value: string; label: string }[] => {
                                for (const b of store.blocks) for (const s of b.sections) for (const f of s.fields) { if (String(f.id) === String(item.switchFieldId)) { return (f.options || []).map((o: { value?: unknown; id?: unknown; label?: unknown }) => ({ value: String(o.value || o.id || ''), label: String(o.label || String(o.value || o.id || '')) })); } }
                                return [];
                            })() : [];
                            const addCaseValue = (val: string, label?: string) => { if (!val) return; const exists = (item.cases || []).some(c => c.value === val); if (exists) return; const next = { ...item, cases: [...(item.cases || []), { value: val, label, seq: [] as BasicItem[] }] } as BasicItem; onUpdate?.(next); };
                            return (
                                <div className="space-y-1">
                                    {item.switchFieldId && advOptions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {advOptions.map(opt => (
                                                <button key={opt.value} type="button" className="px-1 py-0.5 border rounded bg-indigo-50 hover:bg-indigo-100 text-[9px]" onClick={() => addCaseValue(String(opt.value), opt.label)}>{opt.label}</button>
                                            ))}
                                            <button type="button" className="px-1 py-0.5 border rounded bg-green-50 hover:bg-green-100 text-[9px] font-semibold" onClick={() => {
                                                const missing = advOptions.filter(o => !(item.cases || []).some(c => c.value === o.value));
                                                if (missing.length === 0) return;
                                                const next = { ...item, cases: [...(item.cases || []), ...missing.map(m => ({ value: m.value, label: m.label, seq: [] as BasicItem[] }))] } as BasicItem;
                                                onUpdate?.(next);
                                            }}>+ Tous les cas</button>
                                        </div>
                                    )}
                                    {item.switchFieldId && advOptions.length === 0 && (
                                        <div className="text-[9px] text-indigo-500 italic mb-1">Aucune option pour ce champ (vous pouvez saisir des valeurs manuellement).</div>
                                    )}
                                    {(item.cases || []).map((c, idx) => (
                                        <div key={idx} className="border border-indigo-300 bg-indigo-50 rounded p-1">
                                            <div className="flex items-center gap-1 mb-1">
                                                <input className="h-5 px-1 text-[10px] border rounded flex-1" placeholder="Valeur exacte" value={c.value}
                                                    onChange={e => { const next = { ...item, cases: [...(item.cases || [])] } as BasicItem; next.cases![idx] = { ...c, value: (e.target as HTMLInputElement).value }; onUpdate?.(next); }} />
                                                <button type="button" className="text-red-500 text-xs" onClick={() => { const next = { ...item, cases: [...(item.cases || [])] } as BasicItem; next.cases!.splice(idx, 1); onUpdate?.(next); }}>×</button>
                                            </div>
                                            <div className="min-h-[28px] text-[10px] flex flex-col gap-1 border border-dashed border-indigo-300 rounded p-1"
                                                onDragOver={e => { e.preventDefault(); }}
                                                onDrop={e => {
                                                    e.preventDefault();
                                                    const created = buildFromDataTransfer(e);
                                                    if (!created) return;
                                                    const next = { ...item, cases: [...(item.cases || [])] } as BasicItem;
                                                    const target = next.cases![idx];
                                                    target.seq = [...(target.seq || []), created];
                                                    onUpdate?.(next);
                                                }}>
                                                {(c.seq || []).length === 0 && <span className="text-gray-400">Déposer éléments de calcul…</span>}
                                                {(c.seq || []).length > 0 && c.seq!.map((s, i) => (
                                                    <span key={i} className="px-1 py-0.5 rounded border bg-white flex items-center gap-1">
                                                        {s.label || (s.value as string)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="border border-dashed border-indigo-300 rounded p-1 min-h-[28px]"
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                            e.preventDefault();
                                            const created = buildFromDataTransfer(e);
                                            if (!created) return;
                                            const next = { ...item, defaultSeq: [...(item.defaultSeq || []), created] } as BasicItem;
                                            onUpdate?.(next);
                                        }}>
                                        <p className="text-[9px] text-indigo-600 mb-1">Défaut</p>
                                        {(item.defaultSeq || []).length === 0 && <span className="text-gray-400 text-[10px]">Déposer séquence par défaut…</span>}
                                        {(item.defaultSeq || []).length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {item.defaultSeq!.map((s, i) => (<span key={i} className="px-1 py-0.5 rounded border bg-white text-[10px]">{s.label || (s.value as string)}</span>))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SortableFormulaItem;
