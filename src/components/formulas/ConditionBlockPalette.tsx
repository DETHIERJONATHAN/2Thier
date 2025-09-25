import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';

interface ConditionBlockPaletteProps { formulaId: string; }

const ConditionBlockPalette: React.FC<ConditionBlockPaletteProps> = () => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('formula-element-type', 'cond');
    e.dataTransfer.setData('cond-kind', 'expr');
    e.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <div className="mt-4 p-2 bg-white border border-green-200 rounded-md">
      <Typography.Text strong>Bloc Condition</Typography.Text>
      <div className="mt-2">
        <Tooltip title="Glisser pour créer un bloc condition (IF/ALORS/SINON)">
          <Button icon={<BranchesOutlined />} size="small" draggable onDragStart={handleDragStart}>
            Condition (IF)
          </Button>
        </Tooltip>
      </div>
      <div className="mt-2 text-[10px] text-green-700 leading-snug">
        Après dépôt: glissez opérandes (champs / formules / parties) et opérateurs (=, &gt;, &lt;, etc.) dans la ligne de condition.
      </div>
    </div>
  );
};

export default ConditionBlockPalette;
