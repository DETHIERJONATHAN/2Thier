import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { RetweetOutlined } from '@ant-design/icons';

interface SwitchBlockPaletteProps { currentFieldId?: string; }

// Palette ultra simple : un seul bouton Switch générique
const SwitchBlockPalette: React.FC<SwitchBlockPaletteProps> = () => {
  return (
    <div className="mt-4 p-2 bg-white border border-indigo-200 rounded-md">
      <Typography.Text strong>Bloc Multi-cas (Switch)</Typography.Text>
      <div className="text-[10px] text-indigo-600 mb-2 leading-snug">Glisse le bouton puis dépose un champ advanced_select dans la zone violette du bloc.</div>
      <Tooltip title="Créer un bloc switch (multi-cas)">
        <Button
          icon={<RetweetOutlined />}
          size="small"
          draggable
          onDragStart={e=>{ e.dataTransfer.setData('formula-element-type','switch'); e.dataTransfer.effectAllowed='copy'; }}
        >
          Switch
        </Button>
      </Tooltip>
    </div>
  );
};

export default SwitchBlockPalette;
