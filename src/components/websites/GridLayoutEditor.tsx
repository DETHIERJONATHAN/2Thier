/**
 * 🎯 GridLayoutEditor - Éditeur de layout de grille
 * Permet de configurer la disposition des éléments (3x3, 5x1, custom, etc.)
 */

import React, { useState, useEffect } from 'react';
import {
  Space,
  Radio,
  Slider,
  InputNumber,
  Select,
  Card,
  Row,
  Col,
  Alert,
  Tooltip,
  Button,
  Collapse
} from 'antd';
import {
  AppstoreOutlined,
  LayoutOutlined,
  BgColorsOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  RobotOutlined
} from '@ant-design/icons';

export interface GridLayoutConfig {
  preset: 'auto' | '1x1' | '2x1' | '2x2' | '3x1' | '3x2' | '3x3' | '4x1' | '4x2' | '4x3' | '4x4' | '5x1' | 'custom';
  columns: number;
  rows?: number;
  gap: number;
  responsive: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  alignment: 'start' | 'center' | 'end' | 'stretch';
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  autoFlow?: 'row' | 'column' | 'dense';
  minHeight?: number;
  maxWidth?: string;
}

interface GridLayoutEditorProps {
  value: GridLayoutConfig | null;
  onChange: (config: GridLayoutConfig) => void;
  itemCount?: number;
}

const DEFAULT_LAYOUT: GridLayoutConfig = {
  preset: 'auto',
  columns: 3,
  gap: 24,
  responsive: { mobile: 1, tablet: 2, desktop: 3 },
  alignment: 'start',
  justifyContent: 'start',
  autoFlow: 'row'
};

const GRID_PRESETS: Record<string, Partial<GridLayoutConfig>> = {
  'auto': { columns: 3, responsive: { mobile: 1, tablet: 2, desktop: 3 }, gap: 24 },
  '1x1': { columns: 1, rows: 1, responsive: { mobile: 1, tablet: 1, desktop: 1 }, gap: 0 },
  '2x1': { columns: 2, rows: 1, responsive: { mobile: 1, tablet: 2, desktop: 2 }, gap: 24 },
  '2x2': { columns: 2, rows: 2, responsive: { mobile: 1, tablet: 2, desktop: 2 }, gap: 24 },
  '3x1': { columns: 3, rows: 1, responsive: { mobile: 1, tablet: 2, desktop: 3 }, gap: 24 },
  '3x2': { columns: 3, rows: 2, responsive: { mobile: 1, tablet: 2, desktop: 3 }, gap: 24 },
  '3x3': { columns: 3, rows: 3, responsive: { mobile: 1, tablet: 2, desktop: 3 }, gap: 24 },
  '4x1': { columns: 4, rows: 1, responsive: { mobile: 1, tablet: 2, desktop: 4 }, gap: 20 },
  '4x2': { columns: 4, rows: 2, responsive: { mobile: 1, tablet: 2, desktop: 4 }, gap: 20 },
  '4x3': { columns: 4, rows: 3, responsive: { mobile: 1, tablet: 2, desktop: 4 }, gap: 20 },
  '4x4': { columns: 4, rows: 4, responsive: { mobile: 2, tablet: 3, desktop: 4 }, gap: 20 },
  '5x1': { columns: 5, rows: 1, responsive: { mobile: 1, tablet: 3, desktop: 5 }, gap: 16 }
};

export const GridLayoutEditor: React.FC<GridLayoutEditorProps> = ({
  value,
  onChange,
  itemCount = 6
}) => {
  const [layout, setLayout] = useState<GridLayoutConfig>(value || DEFAULT_LAYOUT);

  useEffect(() => {
    setLayout(value || DEFAULT_LAYOUT);
  }, [value]);

  const handlePresetChange = (preset: string) => {
    const presetConfig = GRID_PRESETS[preset];
    const newLayout = {
      ...layout,
      preset: preset as GridLayoutConfig['preset'],
      ...presetConfig
    };
    setLayout(newLayout);
    onChange(newLayout);
  };

  const updateLayout = (key: string, val: any) => {
    const keys = key.split('.');
    const newLayout = { ...layout };
    
    if (keys.length === 1) {
      (newLayout as any)[keys[0]] = val;
    } else if (keys.length === 2) {
      (newLayout as any)[keys[0]][keys[1]] = val;
    }
    
    setLayout(newLayout);
    onChange(newLayout);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Presets rapides */}
      <div>
        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
          <AppstoreOutlined /> Disposition rapide
        </label>
        <Radio.Group 
          value={layout.preset} 
          onChange={(e) => handlePresetChange(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space wrap size="small">
            <Radio.Button value="auto">🎯 Auto</Radio.Button>
            <Radio.Button value="1x1">📱 1 colonne</Radio.Button>
            <Radio.Button value="2x1">📊 2 colonnes</Radio.Button>
            <Radio.Button value="3x1">🎨 3 colonnes</Radio.Button>
            <Radio.Button value="4x1">🌐 4 colonnes</Radio.Button>
            <Radio.Button value="5x1">🌟 5 colonnes</Radio.Button>
            <Radio.Button value="2x2">📐 2×2</Radio.Button>
            <Radio.Button value="3x2">🎯 3×2</Radio.Button>
            <Radio.Button value="3x3">🌈 3×3</Radio.Button>
            <Radio.Button value="4x2">🎨 4×2</Radio.Button>
            <Radio.Button value="4x3">🔲 4×3</Radio.Button>
            <Radio.Button value="4x4">🌐 4×4</Radio.Button>
            <Radio.Button value="custom">⚙️ Personnalisé</Radio.Button>
          </Space>
        </Radio.Group>
      </div>

      {/* Configuration avancée (mode custom) */}
      {layout.preset === 'custom' && (
        <Collapse defaultActiveKey={['grid']} ghost>
          <Collapse.Panel header="⚙️ Configuration avancée" key="grid">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Colonnes */}
              <div>
                <label>📊 Nombre de colonnes (Desktop)</label>
                <Slider 
                  min={1} 
                  max={12} 
                  value={layout.columns}
                  onChange={(v) => updateLayout('columns', v)}
                  marks={{ 1: '1', 3: '3', 6: '6', 9: '9', 12: '12' }}
                />
              </div>

              {/* Lignes */}
              <div>
                <label>📏 Nombre de lignes (optionnel)</label>
                <InputNumber
                  min={1}
                  max={10}
                  value={layout.rows}
                  onChange={(v) => updateLayout('rows', v)}
                  placeholder="Auto"
                  style={{ width: '100%' }}
                  addonAfter="lignes"
                />
              </div>

              {/* Auto Flow */}
              <div>
                <label>🔄 Direction de remplissage</label>
                <Select
                  value={layout.autoFlow || 'row'}
                  onChange={(v) => updateLayout('autoFlow', v)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="row">Par ligne</Select.Option>
                  <Select.Option value="column">Par colonne</Select.Option>
                  <Select.Option value="dense">Dense (comble les trous)</Select.Option>
                </Select>
              </div>
            </Space>
          </Collapse.Panel>
        </Collapse>
      )}

      {/* Responsive */}
      <Card size="small" title={<><MobileOutlined /> Configuration responsive</>}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <label>📱 Mobile</label>
            <InputNumber
              min={1}
              max={4}
              value={layout.responsive.mobile}
              onChange={(v) => updateLayout('responsive.mobile', v || 1)}
              style={{ width: '100%' }}
              addonBefore={<MobileOutlined />}
            />
            <small style={{ color: '#999' }}>{'< 576px'}</small>
          </Col>
          <Col span={8}>
            <label>💻 Tablette</label>
            <InputNumber
              min={1}
              max={6}
              value={layout.responsive.tablet}
              onChange={(v) => updateLayout('responsive.tablet', v || 2)}
              style={{ width: '100%' }}
              addonBefore={<TabletOutlined />}
            />
            <small style={{ color: '#999' }}>576-992px</small>
          </Col>
          <Col span={8}>
            <label>🖥️ Desktop</label>
            <InputNumber
              min={1}
              max={12}
              value={layout.responsive.desktop}
              onChange={(v) => updateLayout('responsive.desktop', v || layout.columns)}
              style={{ width: '100%' }}
              addonBefore={<DesktopOutlined />}
            />
            <small style={{ color: '#999' }}>{'> 992px'}</small>
          </Col>
        </Row>
      </Card>

      {/* Espacement */}
      <div>
        <label>🔲 Espacement entre les éléments</label>
        <Slider
          min={0}
          max={100}
          value={layout.gap}
          onChange={(v) => updateLayout('gap', v)}
          marks={{
            0: '0px',
            16: '16px',
            24: '24px',
            32: '32px',
            48: '48px',
            64: '64px',
            100: '100px'
          }}
        />
      </div>

      {/* Alignement */}
      <Row gutter={16}>
        <Col span={12}>
          <label>⬍ Alignement vertical</label>
          <Select
            value={layout.alignment}
            onChange={(v) => updateLayout('alignment', v)}
            style={{ width: '100%' }}
          >
            <Select.Option value="start">Haut</Select.Option>
            <Select.Option value="center">Centre</Select.Option>
            <Select.Option value="end">Bas</Select.Option>
            <Select.Option value="stretch">Étirer</Select.Option>
          </Select>
        </Col>
        <Col span={12}>
          <label>⬌ Justification horizontale</label>
          <Select
            value={layout.justifyContent}
            onChange={(v) => updateLayout('justifyContent', v)}
            style={{ width: '100%' }}
          >
            <Select.Option value="start">Gauche</Select.Option>
            <Select.Option value="center">Centre</Select.Option>
            <Select.Option value="end">Droite</Select.Option>
            <Select.Option value="space-between">Espacé entre</Select.Option>
            <Select.Option value="space-around">Espacé autour</Select.Option>
            <Select.Option value="space-evenly">Espacé uniformément</Select.Option>
          </Select>
        </Col>
      </Row>

      {/* Preview visuel */}
      <Card 
        title="👁️ Aperçu de la grille" 
        size="small"
        extra={
          <Tooltip title="Suggérer un layout optimal avec IA">
            <Button icon={<RobotOutlined />} size="small" type="primary" ghost>
              Optimiser avec IA
            </Button>
          </Tooltip>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gridTemplateRows: layout.rows ? `repeat(${layout.rows}, 80px)` : 'auto',
            gap: `${layout.gap}px`,
            alignItems: layout.alignment,
            justifyContent: layout.justifyContent,
            border: '2px dashed #d9d9d9',
            borderRadius: '8px',
            padding: '20px',
            background: '#fafafa'
          }}
        >
          {Array.from({ length: itemCount }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: '1px solid #ddd',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                minHeight: '80px',
                padding: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <LayoutOutlined style={{ fontSize: '24px', marginBottom: '4px' }} />
                <div>Élément {i + 1}</div>
              </div>
            </div>
          ))}
        </div>

        <Alert
          message={`Cette grille affichera ${itemCount} éléments sur ${layout.columns} colonnes${layout.rows ? ` et ${layout.rows} lignes` : ''} avec ${layout.gap}px d'espacement.`}
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Card>
    </Space>
  );
};

export default GridLayoutEditor;
