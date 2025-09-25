import React, { useMemo } from 'react';
import useCRMStore from '../../store';
import type { Field } from '../../store/slices/types';

interface AdvancedSelectPartsPaletteProps {
  currentFormulaId: string;
  currentFieldId?: string;
}

const PARTS: Array<{ part: 'selection' | 'extra' | 'nodeId'; label: string; desc: string }> = [
  { part: 'selection', label: 'Sélection', desc: 'Valeur choisie (texte ou nombre ou %)' },
  { part: 'extra', label: 'Extra', desc: 'Valeur saisie dans le champ supplémentaire' },
  { part: 'nodeId', label: 'Node ID', desc: 'Identifiant interne (numérique si convertible)' }
];

const AdvancedSelectPartsPalette: React.FC<AdvancedSelectPartsPaletteProps> = ({ currentFieldId }) => {
  const blocks = useCRMStore(s => s.blocks);

  const advancedSelectFields: Field[] = useMemo(() => {
    const list: Field[] = [];
    blocks.forEach(b => b.sections.forEach(sec => sec.fields.forEach(f => {
      if (f.type === 'advanced_select' && f.id !== currentFieldId) list.push(f);
    })));
    return list;
  }, [blocks, currentFieldId]);

  if (advancedSelectFields.length === 0) return null;

  return (
    <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-md">
      <p className="text-sm font-semibold text-amber-700 mb-2">Parties des sélections avancées</p>
      {advancedSelectFields.map(f => (
        <div key={f.id} className="mb-2">
          <p className="text-xs font-medium text-amber-600">{f.label}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {PARTS.map(p => (
              <button
                key={p.part}
                type="button"
                className="px-2 py-1 bg-white border border-amber-300 rounded text-xs hover:bg-amber-100"
                title={`${p.label}: ${p.desc}`}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('formula-element-type', 'adv_part');
                  e.dataTransfer.setData('adv-field-id', f.id);
                  e.dataTransfer.setData('adv-part', p.part);
                  e.dataTransfer.setData('adv-label', `${f.label}.${p.part}`);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                🔍 {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdvancedSelectPartsPalette;
