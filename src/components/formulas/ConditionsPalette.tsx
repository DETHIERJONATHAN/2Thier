import React, { useMemo, useState } from 'react';
import useCRMStore from '../../store';
import type { FormulaItem, Field } from '../../store/slices/types';

interface ConditionsPaletteProps {
  formulaId: string;
  currentFieldId?: string;
}

const ConditionsPalette: React.FC<ConditionsPaletteProps> = ({ formulaId, currentFieldId }) => {
  const blocks = useCRMStore(s => s.blocks);
  const updateFormula = useCRMStore(s => s.updateFormula);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [operator, setOperator] = useState<'=' | '!=' | '>' | '>=' | '<' | '<=' | 'in'>('=');
  const [value, setValue] = useState('');

  const allFields: Field[] = useMemo(() => {
    const list: Field[] = [];
    blocks.forEach(b => b.sections.forEach(sec => sec.fields.forEach(f => {
      if (f.id !== currentFieldId) list.push(f);
    })));
    return list;
  }, [blocks, currentFieldId]);

  const addCondition = () => {
    if (!formulaId || !selectedFieldId || value.trim() === '') return;

    // Récupérer la formule cible
    const store = useCRMStore.getState();
    let current = undefined;
    for (const b of store.blocks) {
      for (const s of b.sections) {
        for (const f of s.fields) {
          const found = (f.formulas || []).find(ff => ff.id === formulaId);
          if (found) { current = found; break; }
        }
        if (current) break;
      }
      if (current) break;
    }
    if (!current) return;

    const item: FormulaItem = {
      type: 'cond',
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      label: `SI ${selectedFieldId} ${operator} ${value}`,
      condition: {
        kind: 'field_cmp',
        fieldId: selectedFieldId,
        operator,
        value: operator === 'in' ? value.split(',').map(v => v.trim()).filter(Boolean) : value
      },
      then: [/* vide pour l'instant; utilisateur ajoutera ensuite */],
      elseBehavior: 'zero'
    };

    const newSeq = [...(current.sequence || []), item];
    updateFormula(formulaId, { sequence: newSeq });
    setValue('');
  };

  return (
    <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-md">
      <p className="text-sm font-semibold text-green-700 mb-2">Conditions simples</p>
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <select className="border rounded px-1 py-0.5" value={selectedFieldId} onChange={e => setSelectedFieldId(e.target.value)}>
          <option value="">Champ…</option>
          {allFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
  <select className="border rounded px-1 py-0.5" value={operator} onChange={e => setOperator(e.target.value as '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in')}>
          <option value="=">=</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value="in">in</option>
        </select>
        <input
          className="border rounded px-1 py-0.5 w-40"
          placeholder={operator === 'in' ? 'a,b,c' : 'Valeur'}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button type="button" className="px-2 py-1 bg-green-600 text-white rounded" onClick={addCondition} disabled={!selectedFieldId || !value.trim()}>Ajouter</button>
      </div>
      <p className="mt-2 text-[10px] text-green-600">Déposez ensuite des éléments dans la condition pour compléter (étape suivante).</p>
    </div>
  );
};

export default ConditionsPalette;
