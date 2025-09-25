import React, { useMemo } from 'react';
import { wouldCreateCycle } from '../../utils/formulaGraph';
import useCRMStore from '../../store';
import type { Formula, Field, Section, Block, FormulaItem } from '../../store/slices/types';
import { Button, Tooltip, Space, Tag, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

interface FormulaRefsPaletteProps {
  currentFormulaId: string;
  currentFieldId?: string;
}

/**
 * Palette listant les autres formules disponibles pour créer un item formula_ref (drag & click)
 * Ultra simple pour débutant: "Utiliser résultat: <Nom>"
 */
const FormulaRefsPalette: React.FC<FormulaRefsPaletteProps> = ({ currentFormulaId }) => {
  const blocks = useCRMStore(s => s.blocks);
  const updateFormula = useCRMStore(s => s.updateFormula);

  // Construire liste des formules (hors formule courante) avec leur champ parent
  const formulas = useMemo(() => {
    const list: Array<{ formula: Formula; field: Field; section: Section; block: Block }> = [];
    blocks.forEach(block => {
      block.sections.forEach(section => {
        section.fields.forEach(field => {
          (field.formulas || []).forEach(f => {
            if (!f || f.id === currentFormulaId) return;
            list.push({ formula: f, field, section, block });
          });
        });
      });
    });
    return list;
  }, [blocks, currentFormulaId]);

  const handleAddRef = (targetFormula: Formula) => {
    // Récupérer la formule courante dans le store
    const store = useCRMStore.getState();
    let current: Formula | undefined;
    for (const b of store.blocks) {
      for (const s of b.sections) {
        for (const fld of s.fields) {
          const found = (fld.formulas || []).find(ff => ff.id === currentFormulaId);
          if (found) { current = found; break; }
        }
        if (current) break;
      }
      if (current) break;
    }
    if (!current) return;

    // Détection cycle globale (transitive)
    if (wouldCreateCycle(currentFormulaId, targetFormula.id)) {
      alert('Référence impossible: créerait un cycle de dépendances');
      return;
    }

    const item: FormulaItem = {
      type: 'formula_ref',
      refFormulaId: targetFormula.id,
      id: `formula_ref-${targetFormula.id}-${Date.now()}`,
      label: targetFormula.name || targetFormula.id,
      value: targetFormula.id
    };
    const newSeq = [...(current.sequence || []), item];
    updateFormula(currentFormulaId, { sequence: newSeq });
  };

  return (
    <div className="mt-4 p-2 bg-white border border-purple-200 rounded-md">
      <Typography.Text strong>Formules existantes</Typography.Text>
      {formulas.length === 0 && (
        <div className="text-xs text-purple-500 italic mt-1">Aucune autre formule</div>
      )}
      <Space size={6} wrap className="mt-2">
        {formulas.map(({ formula, field }) => (
          <Tooltip key={formula.id} title={`Utiliser le résultat de ${formula.name}`}>
            <Button
              icon={<LinkOutlined />}
              size="small"
              onClick={() => handleAddRef(formula)}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('formula-element-type', 'formula_ref');
                e.dataTransfer.setData('formula-ref-id', formula.id);
                e.dataTransfer.setData('formula-ref-label', formula.name || formula.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              {formula.name || formula.id}
              <Tag style={{ marginLeft: 6 }} color="purple" bordered={false}>
                {field.label}
              </Tag>
            </Button>
          </Tooltip>
        ))}
      </Space>
    </div>
  );
};

export default FormulaRefsPalette;
