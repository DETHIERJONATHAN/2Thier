/**
 * 📋 SectionHeaderEditor - Éditeur de header de section
 * Permet de personnaliser le titre, sous-titre, description, badge, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  Space,
  Input,
  Select,
  Switch,
  Slider,
  Checkbox,
  Collapse,
  Card,
  Row,
  Col,
  Button,
  Tooltip
} from 'antd';
import {
  RobotOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined
} from '@ant-design/icons';
import { ColorInput } from '../common/ColorInput';

const { TextArea } = Input;

export interface SectionHeaderConfig {
  enabled: boolean;
  
  // Contenu
  title: string;
  subtitle: string;
  description: string;
  showBadge: boolean;
  badgeText: string;
  badgeColor: string;
  
  // Style
  titleColor: string;
  titleSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  titleWeight: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  titleAlignment: 'left' | 'center' | 'right';
  
  subtitleColor: string;
  subtitleSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  descriptionColor: string;
  descriptionMaxWidth: number;
  
  // Layout
  alignment: 'left' | 'center' | 'right';
  spacing: number;
  
  // Fond
  backgroundColor: string;
  backgroundGradient?: string;
  paddingTop: number;
  paddingBottom: number;
  
  // Séparateur
  showDivider: boolean;
  dividerColor: string;
  dividerWidth: number;
  dividerStyle: 'solid' | 'dashed' | 'dotted' | 'gradient';
}

interface SectionHeaderEditorProps {
  value: SectionHeaderConfig | null;
  onChange: (config: SectionHeaderConfig) => void;
  sectionType?: string;
}

const DEFAULT_HEADER: SectionHeaderConfig = {
  enabled: false,
  title: '',
  subtitle: '',
  description: '',
  showBadge: false,
  badgeText: '',
  badgeColor: '#10b981',
  titleColor: '#1f2937',
  titleSize: 'xl',
  titleWeight: 700,
  titleAlignment: 'center',
  subtitleColor: '#6b7280',
  subtitleSize: 'md',
  descriptionColor: '#6b7280',
  descriptionMaxWidth: 800,
  alignment: 'center',
  spacing: 16,
  backgroundColor: 'transparent',
  paddingTop: 48,
  paddingBottom: 32,
  showDivider: false,
  dividerColor: '#e5e7eb',
  dividerWidth: 60,
  dividerStyle: 'solid'
};

export const SectionHeaderEditor: React.FC<SectionHeaderEditorProps> = ({
  value,
  onChange,
  sectionType = 'section'
}) => {
  const [config, setConfig] = useState<SectionHeaderConfig>(value || DEFAULT_HEADER);

  useEffect(() => {
    setConfig(value || DEFAULT_HEADER);
  }, [value]);

  const updateConfig = (key: string, val: any) => {
    const newConfig = { ...config, [key]: val };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleAIGenerate = (field: 'title' | 'subtitle' | 'description') => {
    // TODO: Intégrer l'IA pour générer du contenu
    console.log(`Générer ${field} avec IA pour section ${sectionType}`);
  };

  return (
    <Collapse defaultActiveKey={config.enabled ? ['header'] : []}>
      <Collapse.Panel header="📋 Header de section" key="header">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Toggle header */}
          <Switch
            checked={config.enabled}
            onChange={(v) => updateConfig('enabled', v)}
            checkedChildren="Header activé"
            unCheckedChildren="Header désactivé"
            style={{ marginBottom: 16 }}
          />

          {config.enabled && (
            <>
              {/* Contenu */}
              <Card title="📝 Contenu" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* Titre */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Titre principal</label>
                    <Input
                      value={config.title}
                      onChange={(e) => updateConfig('title', e.target.value)}
                      placeholder="Ex: Nos Services"
                      suffix={
                        <Tooltip title="Générer avec IA">
                          <Button
                            icon={<RobotOutlined />}
                            size="small"
                            type="text"
                            onClick={() => handleAIGenerate('title')}
                          />
                        </Tooltip>
                      }
                    />
                  </div>

                  {/* Sous-titre */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Sous-titre</label>
                    <Input
                      value={config.subtitle}
                      onChange={(e) => updateConfig('subtitle', e.target.value)}
                      placeholder="Ex: Ce que nous offrons"
                      suffix={
                        <Tooltip title="Générer avec IA">
                          <Button
                            icon={<RobotOutlined />}
                            size="small"
                            type="text"
                            onClick={() => handleAIGenerate('subtitle')}
                          />
                        </Tooltip>
                      }
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Description</label>
                    <TextArea
                      rows={3}
                      value={config.description}
                      onChange={(e) => updateConfig('description', e.target.value)}
                      placeholder="Texte explicatif de la section..."
                    />
                    <Button
                      icon={<RobotOutlined />}
                      size="small"
                      type="dashed"
                      block
                      style={{ marginTop: 8 }}
                      onClick={() => handleAIGenerate('description')}
                    >
                      Générer description avec IA
                    </Button>
                  </div>

                  {/* Badge */}
                  <div>
                    <Checkbox
                      checked={config.showBadge}
                      onChange={(e) => updateConfig('showBadge', e.target.checked)}
                    >
                      Afficher un badge
                    </Checkbox>
                    {config.showBadge && (
                      <Space style={{ marginTop: 8, width: '100%' }}>
                        <Input
                          placeholder="Texte du badge"
                          value={config.badgeText}
                          onChange={(e) => updateConfig('badgeText', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <ColorInput
                          value={config.badgeColor}
                          onChange={(v) => updateConfig('badgeColor', v)}
                        />
                      </Space>
                    )}
                  </div>
                </Space>
              </Card>

              {/* Style */}
              <Card title="🎨 Style" size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* Style du titre */}
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                      <FontSizeOutlined /> Style du titre
                    </label>
                    <Row gutter={8}>
                      <Col span={8}>
                        <Select
                          value={config.titleSize}
                          onChange={(v) => updateConfig('titleSize', v)}
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <Select.Option value="sm">Petit</Select.Option>
                          <Select.Option value="md">Moyen</Select.Option>
                          <Select.Option value="lg">Grand</Select.Option>
                          <Select.Option value="xl">XL</Select.Option>
                          <Select.Option value="2xl">XXL</Select.Option>
                          <Select.Option value="3xl">XXXL</Select.Option>
                        </Select>
                      </Col>
                      <Col span={8}>
                        <Select
                          value={config.titleWeight}
                          onChange={(v) => updateConfig('titleWeight', v)}
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <Select.Option value={300}>Light</Select.Option>
                          <Select.Option value={400}>Normal</Select.Option>
                          <Select.Option value={500}>Medium</Select.Option>
                          <Select.Option value={600}>Semibold</Select.Option>
                          <Select.Option value={700}>Bold</Select.Option>
                          <Select.Option value={800}>Extrabold</Select.Option>
                          <Select.Option value={900}>Black</Select.Option>
                        </Select>
                      </Col>
                      <Col span={8}>
                        <ColorInput
                          value={config.titleColor}
                          onChange={(v) => updateConfig('titleColor', v)}
                        />
                      </Col>
                    </Row>
                  </div>

                  {/* Style du sous-titre */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Style du sous-titre</label>
                    <Space style={{ width: '100%' }}>
                      <Select
                        value={config.subtitleSize}
                        onChange={(v) => updateConfig('subtitleSize', v)}
                        style={{ flex: 1 }}
                        size="small"
                      >
                        <Select.Option value="xs">XS</Select.Option>
                        <Select.Option value="sm">S</Select.Option>
                        <Select.Option value="md">M</Select.Option>
                        <Select.Option value="lg">L</Select.Option>
                        <Select.Option value="xl">XL</Select.Option>
                      </Select>
                      <ColorInput
                        value={config.subtitleColor}
                        onChange={(v) => updateConfig('subtitleColor', v)}
                      />
                    </Space>
                  </div>

                  {/* Couleur description */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Couleur de la description</label>
                    <ColorInput
                      value={config.descriptionColor}
                      onChange={(v) => updateConfig('descriptionColor', v)}
                    />
                  </div>

                  {/* Largeur max description */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Largeur max de la description</label>
                    <Slider
                      min={300}
                      max={1200}
                      value={config.descriptionMaxWidth}
                      onChange={(v) => updateConfig('descriptionMaxWidth', v)}
                      marks={{ 300: '300px', 600: '600px', 900: '900px', 1200: '1200px' }}
                    />
                  </div>
                </Space>
              </Card>

              {/* Layout */}
              <Card title="📐 Layout" size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* Alignement */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Alignement</label>
                    <Space style={{ width: '100%' }} size="small">
                      <Button
                        icon={<AlignLeftOutlined />}
                        type={config.alignment === 'left' ? 'primary' : 'default'}
                        onClick={() => updateConfig('alignment', 'left')}
                      >
                        Gauche
                      </Button>
                      <Button
                        icon={<AlignCenterOutlined />}
                        type={config.alignment === 'center' ? 'primary' : 'default'}
                        onClick={() => updateConfig('alignment', 'center')}
                      >
                        Centre
                      </Button>
                      <Button
                        icon={<AlignRightOutlined />}
                        type={config.alignment === 'right' ? 'primary' : 'default'}
                        onClick={() => updateConfig('alignment', 'right')}
                      >
                        Droite
                      </Button>
                    </Space>
                  </div>

                  {/* Espacement */}
                  <div>
                    <label style={{ fontWeight: 600 }}>Espacement (marge basse)</label>
                    <Slider
                      min={0}
                      max={120}
                      value={config.spacing}
                      onChange={(v) => updateConfig('spacing', v)}
                      marks={{ 0: '0px', 30: '30px', 60: '60px', 90: '90px', 120: '120px' }}
                    />
                  </div>

                  {/* Padding */}
                  <Row gutter={16}>
                    <Col span={12}>
                      <label style={{ fontWeight: 600 }}>Padding haut</label>
                      <Slider
                        min={0}
                        max={100}
                        value={config.paddingTop}
                        onChange={(v) => updateConfig('paddingTop', v)}
                      />
                    </Col>
                    <Col span={12}>
                      <label style={{ fontWeight: 600 }}>Padding bas</label>
                      <Slider
                        min={0}
                        max={100}
                        value={config.paddingBottom}
                        onChange={(v) => updateConfig('paddingBottom', v)}
                      />
                    </Col>
                  </Row>
                </Space>
              </Card>

              {/* Séparateur */}
              <Card title="〰️ Séparateur" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox
                    checked={config.showDivider}
                    onChange={(e) => updateConfig('showDivider', e.target.checked)}
                  >
                    Afficher un séparateur
                  </Checkbox>

                  {config.showDivider && (
                    <>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Select
                            value={config.dividerStyle}
                            onChange={(v) => updateConfig('dividerStyle', v)}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="solid">Solide</Select.Option>
                            <Select.Option value="dashed">Tirets</Select.Option>
                            <Select.Option value="dotted">Pointillés</Select.Option>
                            <Select.Option value="gradient">Dégradé</Select.Option>
                          </Select>
                        </Col>
                        <Col span={12}>
                          <ColorInput
                            value={config.dividerColor}
                            onChange={(v) => updateConfig('dividerColor', v)}
                          />
                        </Col>
                      </Row>
                      <div>
                        <label style={{ fontWeight: 600 }}>Largeur du séparateur</label>
                        <Slider
                          min={50}
                          max={500}
                          value={config.dividerWidth}
                          onChange={(v) => updateConfig('dividerWidth', v)}
                          marks={{ 50: '50px', 150: '150px', 300: '300px', 500: '500px' }}
                        />
                      </div>
                    </>
                  )}
                </Space>
              </Card>
            </>
          )}
        </Space>
      </Collapse.Panel>
    </Collapse>
  );
};

export default SectionHeaderEditor;
