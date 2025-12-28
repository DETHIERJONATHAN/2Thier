/**
 * 📐 GRID CONFIG EDITOR - Configuration de grille responsive
 * 
 * Permet de configurer un layout en grille avec :
 * - Nombre de colonnes (mobile, tablet, desktop)
 * - Gap entre items
 * - Alignement
 * - Justification
 * 
 * Génère une configuration GridConfig utilisable par le renderer.
 * 
 * @module site/editor/fields/GridConfigEditor
 * @author 2Thier CRM Team
 */

import React from 'react';
import { Card, Space, InputNumber, Select, Divider } from 'antd';
import { GridConfig } from '../../schemas/types';
import { MobileOutlined, TabletOutlined, DesktopOutlined } from '@ant-design/icons';

const { Option } = Select;

// 🔥 Type pour gérer l'ancien format (rétrocompatibilité)
type LegacyColumnsConfig = {
  mobile: number;
  tablet: number;
  desktop: number;
};

interface GridConfigEditorProps {
  value?: GridConfig | LegacyColumnsConfig; // Accepte ancien et nouveau format
  onChange?: (value: GridConfig) => void;
  responsive?: boolean;
}

const GridConfigEditor: React.FC<GridConfigEditorProps> = ({
  value,
  onChange,
  responsive = true
}) => {
  // 🔥 CRITIQUE : Toujours avoir une valeur valide même si undefined est passé
  const defaultValue: GridConfig = {
    columns: { mobile: 1, tablet: 2, desktop: 3 },
    gap: '16px',
    alignment: 'stretch',
    justifyContent: 'start'
  };
  
  // 🔥 RÉTROCOMPATIBILITÉ: Gérer les anciennes données qui ne stockent que {mobile, tablet, desktop}
  // Si value contient directement mobile/tablet/desktop, c'est l'ancien format
  const isOldFormat = value && 'mobile' in value && 'tablet' in value && 'desktop' in value;
  
  const currentValue: GridConfig = (() => {
    if (!value) return defaultValue;
    
    // Ancien format: {mobile: 1, tablet: 2, desktop: 3} → Convertir en nouveau format
    if (isOldFormat) {
      return {
        columns: value as { mobile: number; tablet: number; desktop: number },
        gap: defaultValue.gap,
        alignment: defaultValue.alignment,
        justifyContent: defaultValue.justifyContent
      };
    }
    
    // Nouveau format: Vérifier que columns existe
    if (value.columns) {
      return value as GridConfig;
    }
    
    // Fallback si structure incorrecte
    return defaultValue;
  })();
  
  const updateValue = (key: keyof GridConfig, newValue: any) => {
    onChange?.({ ...currentValue, [key]: newValue });
  };
  
  const updateColumns = (device: 'mobile' | 'tablet' | 'desktop', cols: number) => {
    onChange?.({
      ...currentValue,
      columns: { ...currentValue.columns, [device]: cols }
    });
  };
  
  return (
    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        
        {/* Colonnes */}
        <div>
          <strong>📊 Nombre de colonnes</strong>
          <Divider style={{ margin: '8px 0' }} />
          
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {responsive && (
              <>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <MobileOutlined />
                    <span>Mobile</span>
                  </Space>
                  <InputNumber
                    min={1}
                    max={4}
                    value={currentValue.columns.mobile}
                    onChange={(v) => updateColumns('mobile', v || 1)}
                  />
                </Space>
                
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <TabletOutlined />
                    <span>Tablet</span>
                  </Space>
                  <InputNumber
                    min={1}
                    max={6}
                    value={currentValue.columns.tablet}
                    onChange={(v) => updateColumns('tablet', v || 2)}
                  />
                </Space>
              </>
            )}
            
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <DesktopOutlined />
                <span>Desktop</span>
              </Space>
              <InputNumber
                min={1}
                max={12}
                value={currentValue.columns.desktop}
                onChange={(v) => updateColumns('desktop', v || 3)}
              />
            </Space>
          </Space>
        </div>
        
        {/* Gap */}
        <div>
          <strong>📏 Espacement (Gap)</strong>
          <Divider style={{ margin: '8px 0' }} />
          <Select
            style={{ width: '100%' }}
            value={currentValue.gap}
            onChange={(v) => updateValue('gap', v)}
          >
            <Option value="8px">Petit (8px)</Option>
            <Option value="16px">Moyen (16px)</Option>
            <Option value="24px">Grand (24px)</Option>
            <Option value="32px">Très grand (32px)</Option>
          </Select>
        </div>
        
        {/* Alignement */}
        <div>
          <strong>⬆️ Alignement vertical</strong>
          <Divider style={{ margin: '8px 0' }} />
          <Select
            style={{ width: '100%' }}
            value={currentValue.alignment}
            onChange={(v) => updateValue('alignment', v)}
          >
            <Option value="start">Haut</Option>
            <Option value="center">Centre</Option>
            <Option value="end">Bas</Option>
            <Option value="stretch">Étirer</Option>
          </Select>
        </div>
        
        {/* Justification */}
        <div>
          <strong>↔️ Justification horizontale</strong>
          <Divider style={{ margin: '8px 0' }} />
          <Select
            style={{ width: '100%' }}
            value={currentValue.justifyContent}
            onChange={(v) => updateValue('justifyContent', v)}
          >
            <Option value="start">Début</Option>
            <Option value="center">Centre</Option>
            <Option value="end">Fin</Option>
            <Option value="space-between">Espacement entre</Option>
            <Option value="space-around">Espacement autour</Option>
            <Option value="space-evenly">Espacement uniforme</Option>
          </Select>
        </div>
        
      </Space>
    </Card>
  );
};

export default GridConfigEditor;
