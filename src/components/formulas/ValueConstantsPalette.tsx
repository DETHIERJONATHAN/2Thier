import React, { useState, useCallback, memo, useMemo } from 'react';
import type { FormulaItem } from '../../store/slices/types';
import type { Formula } from '../../store/slices/types';
import { validateFormula, getAPIHeaders } from '../../utils/formulaValidator';
import { Input, Select, Button, Tooltip, Space, Tag } from 'antd';

interface ValueConstantsPaletteProps {
  formulaId?: string;
  formula?: Formula; // optionnel pour ajout direct via API
}

/**
 * Palette pour ajouter rapidement des constantes (nombres ou texte) dans une formule.
 * UX: saisie + choix type => bouton Ajouter (click) ou drag du chip.
 */
const ValueConstantsPalette: React.FC<ValueConstantsPaletteProps> = memo(({ formulaId, formula }) => {
  const [rawValue, setRawValue] = useState('');
  const [mode, setMode] = useState<'auto' | 'number' | 'string'>('auto');
  const [feedback, setFeedback] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  // Nouvelle sélection de destination: séquence principale ou zones d'une condition
  const [destination, setDestination] = useState<'sequence'|'expr'|'then'|'else'>('sequence');
  const [targetCondId, setTargetCondId] = useState<string|undefined>(undefined);

  interface CondItemLike { id?: string; type?: string; label?: string; condExpr?: FormulaItem[]; then?: FormulaItem[]; else?: FormulaItem[]; }
  const condItems: CondItemLike[] = useMemo(()=>{
    if(!formula || !Array.isArray(formula.sequence)) return [];
    return (formula.sequence as unknown as CondItemLike[]).filter(it => it && it.type === 'cond');
  }, [formula]);

  // Si plus de conditions ou condition supprimée: réinitialiser targetCondId
  React.useEffect(()=>{
    if(targetCondId && !condItems.some(c=>c.id===targetCondId)) setTargetCondId(undefined);
  }, [condItems, targetCondId]);

  const resolveValueType = useCallback((val: string): 'number' | 'string' => {
    if (mode === 'string') return 'string';
    if (mode === 'number') return 'number';
    const trimmed = val.trim();
    if (/^-?\d+(\.\d+)?%$/.test(trimmed)) return 'number';
    return /^-?\d+(\.\d+)?$/.test(trimmed) ? 'number' : 'string';
  }, [mode]);

  const addConstant = useCallback(() => {
    if (isSaving) return;
    if (!formulaId || !formula) { setFeedback('Formule indisponible'); return; }
    const value = rawValue.trim();
    if (!value) { setFeedback('Valeur vide'); return; }

    const fieldId = (formula as unknown as { fieldId?: string; targetFieldId?: string }).fieldId || (formula as unknown as { targetFieldId?: string }).targetFieldId;
    if (!fieldId) { setFeedback('fieldId manquant'); return; }

    const valueType = resolveValueType(value);
    // Séquence actuelle (sans altérer les types avancés comme cond / switch / formula_ref)
    const baseSeq = Array.isArray(formula.sequence) ? [...formula.sequence] : [];

    // Garantir un id pour chaque item existant (défensif)
    const normalizedSeq = baseSeq.map((it, idx) => !it.id ? ({ ...it, id: `auto-${it.type || 'item'}-${idx}-${Date.now()}` }) : it);

    const newItem = {
      type: 'value' as const,
      value,
      label: value,
      id: `val-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      valueType
    };
    let newSequence = normalizedSeq;
    if(destination === 'sequence') {
      newSequence = [...normalizedSeq, newItem];
    } else {
      // Insertion dans une condition
      const condId = targetCondId || condItems[0]?.id;
      if(!condId) { setFeedback('Pas de condition'); return; }
      newSequence = normalizedSeq.map(it => {
        if(it.id !== condId) return it;
        const clone = { ...it } as unknown as CondItemLike & { [k:string]: unknown };
  if(destination === 'expr') clone.condExpr = [ ...(clone.condExpr||[]), newItem ] as FormulaItem[];
  else if(destination === 'then') clone.then = [ ...(clone.then||[]), newItem ] as FormulaItem[];
  else if(destination === 'else') clone.else = [ ...(clone.else||[]), newItem ] as FormulaItem[];
        return clone as unknown as Formula['sequence'][number];
      });
    }

    validateFormula({ ...formula, sequence: newSequence }, 'ValueConstantsPalette');

    setIsSaving(true);
    setFeedback('Envoi...');
    fetch(`/api/fields/${fieldId}/formulas/${formulaId}`, {
      method: 'PUT',
      headers: getAPIHeaders(),
      body: JSON.stringify({ id: formulaId, name: formula.name || 'Nouvelle formule', sequence: newSequence })
    })
    .then(r=>{ if(!r.ok) throw new Error(r.statusText||'Bad Request');
      setFeedback('Ajouté'); setRawValue('');
      document.dispatchEvent(new CustomEvent('formula-updated', { detail: { formulaId, isEssential: true, action: 'add' } }));
      setTimeout(()=> setFeedback(''), 1500);
    })
    .catch(e=>{ setFeedback('Erreur API'); console.error('[ValueConstantsPalette] Erreur ajout constante', e); })
    .finally(()=> setIsSaving(false));
  }, [isSaving, formulaId, formula, rawValue, resolveValueType, destination, targetCondId, condItems]);

  // Drag helper: on crée un petit chip draggable qui transporte la valeur actuelle
  const currentValueType = resolveValueType(rawValue);

  return (
    <div className="mt-2 p-2 bg-white rounded-md border border-gray-200">
      <p className="text-sm font-medium mb-2">Constantes <span className="text-[10px] text-gray-500">(nombres, % ou texte)</span></p>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Ex: 1.2 ou 15% ou kWh"
            value={rawValue}
            onChange={e=> setRawValue(e.target.value)}
            onPressEnter={addConstant}
          />
          <Select
            value={mode}
            onChange={(v)=> setMode(v)}
            style={{ width: 120 }}
            options={[{value:'auto',label:'Auto'},{value:'number',label:'Nombre'},{value:'string',label:'Texte'}]}
          />
          <Button type="primary" disabled={!rawValue.trim() || !formulaId || isSaving} onClick={addConstant}>{isSaving?'...':'Ajouter'}</Button>
        </Space.Compact>
        <div className="text-xs text-gray-500">Type déduit: <span className="font-semibold">{currentValueType}</span> {feedback && <span className="ml-2 text-gray-700">{feedback}</span>}</div>
        <Space size={6} wrap>
          {rawValue.trim() && (
            <Tooltip title="Glisser pour déposer la constante">
              <Tag
                color="default"
                style={{ cursor:'grab' }}
                draggable
                onDragStart={e=>{
                  const value = rawValue.trim();
                  e.dataTransfer.setData('formula-element-type','value');
                  e.dataTransfer.setData('value-value', value);
                  e.dataTransfer.setData('value-label', value);
                  e.dataTransfer.setData('value-valueType', currentValueType);
                  e.dataTransfer.effectAllowed='copy';
                }}
              >{rawValue.trim()}</Tag>
            </Tooltip>
          )}
          {['0','1','100','10%','50%'].map(sug => (
            <Button key={sug} size="small" onClick={()=> setRawValue(sug)}>{sug}</Button>
          ))}
        </Space>
        {condItems.length>0 && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-600">
            <span>Destination:</span>
            <Select size="small" value={destination} onChange={(v)=> setDestination(v)} options={[{value:'sequence',label:'Séquence'},{value:'expr',label:'Condition (SI)'},{value:'then',label:'ALORS'},{value:'else',label:'SINON'}]} style={{ width: 140 }} />
            {destination!=='sequence' && condItems.length>1 && (
              <Select size="small" value={targetCondId||''} onChange={(v)=> setTargetCondId(v||undefined)} style={{ minWidth: 160 }}
                options={[{value:'',label:'(1ère condition)'}, ...condItems.map(c=>({ value: c.id as string, label: c.label || (c.id as string) }))]} />
            )}
            {destination!=='sequence' && condItems.length===1 && (
              <span className="italic opacity-60">{condItems[0].label || 'Condition'}</span>
            )}
          </div>
        )}
        <div className="text-[10px] text-gray-400 leading-snug">Drag & drop possible du tag ou cliquez sur Ajouter pour insérer. Auto détecte nombre/%/texte. “15%” devient 0.15.</div>
      </Space>
    </div>
  );
});

export default ValueConstantsPalette;
