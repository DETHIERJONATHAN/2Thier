/**
 * 🎴 IndividualCardEditor - Éditeur de carte individuelle
 * 
 * Configuration granulaire pour chaque carte d'une section :
 * - En-tête (titre, icône, couleurs, badge)
 * - Contenu (titre, description, image, position)
 * - Style (background, border, shadow, hover effects)
 * - Footer (bouton, lien, texte additionnel)
 * - Position grid (column/row span, order)
 * - IA : suggestions contextuelles pour chaque champ
 */

import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tabs,
  Space,
  Button,
  Divider,
  Typography,
  Row,
  Col,
  Slider,
  Tooltip,
  Tag,
} from 'antd';
import {
  BgColorsOutlined,
  BorderOutlined,
  ColumnHeightOutlined,
  FontSizeOutlined,
  PictureOutlined,
  StarOutlined,
  ThunderboltOutlined,
  EditOutlined,
  LinkOutlined,
  LayoutOutlined,
} from '@ant-design/icons';
import { ColorInput } from '../common/ColorInput';
import { ImageUploader } from './ImageUploader';
import { AIAssistant } from './AIAssistant';

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * Configuration d'une carte individuelle
 */
export interface IndividualCardConfig {
  // 🏷️ HEADER
  header?: {
    enabled: boolean;
    title?: string;
    titleColor?: string;
    titleSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    titleWeight?: 300 | 400 | 500 | 600 | 700 | 800 | 900;
    icon?: string; // URL ou emoji
    iconPosition?: 'left' | 'top' | 'right';
    iconSize?: number; // px
    iconColor?: string;
    badge?: {
      show: boolean;
      text: string;
      color: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    backgroundColor?: string;
    padding?: number; // px
  };

  // 📄 CONTENT
  content?: {
    title?: string;
    titleColor?: string;
    titleSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    titleWeight?: 300 | 400 | 500 | 600 | 700 | 800 | 900;
    
    description?: string;
    descriptionColor?: string;
    descriptionSize?: 'xs' | 'sm' | 'md' | 'lg';
    
    image?: {
      url?: string;
      alt?: string;
      position?: 'top' | 'left' | 'right' | 'bottom' | 'background';
      width?: string; // % ou px
      height?: string; // auto, px
      objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
      borderRadius?: number; // px
      overlay?: boolean; // Dark overlay si background
      overlayOpacity?: number; // 0-1
    };
    
    padding?: number; // px
    alignment?: 'left' | 'center' | 'right';
  };

  // 🎨 STYLE
  style?: {
    backgroundColor?: string;
    backgroundGradient?: {
      enabled: boolean;
      from?: string;
      to?: string;
      direction?: 'to-top' | 'to-right' | 'to-bottom' | 'to-left' | 'to-top-right' | 'to-bottom-right' | 'to-bottom-left' | 'to-top-left';
    };
    
    border?: {
      enabled: boolean;
      width?: number; // px
      style?: 'solid' | 'dashed' | 'dotted';
      color?: string;
      radius?: number; // px
    };
    
    shadow?: {
      enabled: boolean;
      x?: number;
      y?: number;
      blur?: number;
      spread?: number;
      color?: string;
    };
    
    hover?: {
      enabled: boolean;
      scale?: number; // 1 = 100%, 1.05 = 105%
      translateY?: number; // px (négatif = monte)
      shadowIntensity?: number; // 0-1
      borderColor?: string;
    };
    
    minHeight?: number; // px
    maxWidth?: string; // px, %, auto
  };

  // 🔗 FOOTER
  footer?: {
    enabled: boolean;
    
    button?: {
      show: boolean;
      text?: string;
      url?: string;
      variant?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
      icon?: string;
      fullWidth?: boolean;
    };
    
    link?: {
      show: boolean;
      text?: string;
      url?: string;
      icon?: string;
    };
    
    additionalText?: string;
    textColor?: string;
    backgroundColor?: string;
    padding?: number; // px
  };

  // 📍 GRID POSITION
  gridPosition?: {
    columnStart?: number; // 1-13
    columnEnd?: number; // span 1-12 ou absolute
    rowStart?: number; // 1-11
    rowEnd?: number; // span 1-10 ou absolute
    order?: number; // Ordre d'affichage
    alignSelf?: 'start' | 'center' | 'end' | 'stretch';
    justifySelf?: 'start' | 'center' | 'end' | 'stretch';
  };

  // 🎯 META
  id?: string;
  order?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface IndividualCardEditorProps {
  /**
   * Configuration actuelle de la carte
   */
  config?: IndividualCardConfig;
  
  /**
   * Callback quand la config change
   */
  onChange?: (config: IndividualCardConfig) => void;
  
  /**
   * Index de la carte (pour contexte IA)
   */
  cardIndex?: number;
  
  /**
   * Type de section parent (pour contexte IA)
   */
  sectionType?: string;
  
  /**
   * Nombre total de cartes (pour grid position)
   */
  totalCards?: number;
}

export const IndividualCardEditor: React.FC<IndividualCardEditorProps> = ({
  config = {},
  onChange,
  cardIndex = 0,
  sectionType = 'services',
  totalCards = 6,
}) => {
  const [localConfig, setLocalConfig] = useState<IndividualCardConfig>(config);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState<string>('');

  /**
   * Met à jour la config locale et notifie le parent
   */
  const updateConfig = (path: string, value: any) => {
    const newConfig = { ...localConfig };
    const keys = path.split('.');
    let current: any = newConfig;
    
    // Navigate to parent
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // Set value
    current[keys[keys.length - 1]] = value;
    
    setLocalConfig(newConfig);
    onChange?.(newConfig);
  };

  /**
   * Ouvre l'assistant IA pour un champ spécifique
   */
  const openAI = (context: string, currentValue: string) => {
    setAIContext(context);
    setShowAI(true);
  };

  /**
   * Applique une suggestion IA
   */
  const applyAISuggestion = (path: string, value: any) => {
    updateConfig(path, value);
    setShowAI(false);
  };

  return (
    <Card 
      title={
        <Space>
          <EditOutlined />
          <span>Configuration Carte #{cardIndex + 1}</span>
          <Tag color="blue">{sectionType}</Tag>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Tabs
        items={[
          {
            key: 'header',
            label: (
              <span>
                <StarOutlined /> En-tête
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Form.Item label="Activer l'en-tête">
                  <Switch
                    checked={localConfig.header?.enabled ?? true}
                    onChange={(checked) => updateConfig('header.enabled', checked)}
                  />
                </Form.Item>

                {localConfig.header?.enabled !== false && (
                  <>
                    <Divider />
                    
                    {/* TITRE EN-TÊTE */}
                    <Form.Item label="Titre de l'en-tête">
                      <Input
                        value={localConfig.header?.title}
                        onChange={(e) => updateConfig('header.title', e.target.value)}
                        placeholder="Ex: 🚀 Premium"
                        suffix={
                          <Button
                            type="link"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={() => openAI('header-title', localConfig.header?.title || '')}
                          />
                        }
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="Taille">
                          <Select
                            value={localConfig.header?.titleSize ?? 'md'}
                            onChange={(value) => updateConfig('header.titleSize', value)}
                          >
                            <Select.Option value="xs">Extra Small</Select.Option>
                            <Select.Option value="sm">Small</Select.Option>
                            <Select.Option value="md">Medium</Select.Option>
                            <Select.Option value="lg">Large</Select.Option>
                            <Select.Option value="xl">Extra Large</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Épaisseur">
                          <Select
                            value={localConfig.header?.titleWeight ?? 600}
                            onChange={(value) => updateConfig('header.titleWeight', value)}
                          >
                            <Select.Option value={300}>Light (300)</Select.Option>
                            <Select.Option value={400}>Normal (400)</Select.Option>
                            <Select.Option value={500}>Medium (500)</Select.Option>
                            <Select.Option value={600}>Semi-Bold (600)</Select.Option>
                            <Select.Option value={700}>Bold (700)</Select.Option>
                            <Select.Option value={800}>Extra Bold (800)</Select.Option>
                            <Select.Option value={900}>Black (900)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Couleur">
                          <ColorInput
                            value={localConfig.header?.titleColor}
                            onChange={(color) => updateConfig('header.titleColor', color)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ICÔNE */}
                    <Divider>Icône</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Icône (URL ou Emoji)">
                          <Input
                            value={localConfig.header?.icon}
                            onChange={(e) => updateConfig('header.icon', e.target.value)}
                            placeholder="https://... ou 🔥"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="Position">
                          <Select
                            value={localConfig.header?.iconPosition ?? 'left'}
                            onChange={(value) => updateConfig('header.iconPosition', value)}
                          >
                            <Select.Option value="left">Gauche</Select.Option>
                            <Select.Option value="top">Haut</Select.Option>
                            <Select.Option value="right">Droite</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="Taille (px)">
                          <InputNumber
                            value={localConfig.header?.iconSize ?? 24}
                            onChange={(value) => updateConfig('header.iconSize', value)}
                            min={12}
                            max={128}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* BADGE */}
                    <Divider>Badge</Divider>
                    <Form.Item label="Afficher un badge">
                      <Switch
                        checked={localConfig.header?.badge?.show ?? false}
                        onChange={(checked) => updateConfig('header.badge.show', checked)}
                      />
                    </Form.Item>

                    {localConfig.header?.badge?.show && (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="Texte du badge">
                            <Input
                              value={localConfig.header?.badge?.text}
                              onChange={(e) => updateConfig('header.badge.text', e.target.value)}
                              placeholder="NOUVEAU"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="Couleur">
                            <ColorInput
                              value={localConfig.header?.badge?.color}
                              onChange={(color) => updateConfig('header.badge.color', color)}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="Position">
                            <Select
                              value={localConfig.header?.badge?.position ?? 'top-right'}
                              onChange={(value) => updateConfig('header.badge.position', value)}
                            >
                              <Select.Option value="top-left">↖ Haut gauche</Select.Option>
                              <Select.Option value="top-right">↗ Haut droite</Select.Option>
                              <Select.Option value="bottom-left">↙ Bas gauche</Select.Option>
                              <Select.Option value="bottom-right">↘ Bas droite</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {/* STYLE EN-TÊTE */}
                    <Divider>Style de l'en-tête</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Couleur de fond">
                          <ColorInput
                            value={localConfig.header?.backgroundColor}
                            onChange={(color) => updateConfig('header.backgroundColor', color)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Padding (px)">
                          <Slider
                            value={localConfig.header?.padding ?? 16}
                            onChange={(value) => updateConfig('header.padding', value)}
                            min={0}
                            max={48}
                            marks={{ 0: '0', 16: '16', 32: '32', 48: '48' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}
              </Space>
            ),
          },

          {
            key: 'content',
            label: (
              <span>
                <FontSizeOutlined /> Contenu
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* TITRE PRINCIPAL */}
                <Form.Item label="Titre principal">
                  <Input
                    value={localConfig.content?.title}
                    onChange={(e) => updateConfig('content.title', e.target.value)}
                    placeholder="Titre de la carte"
                    suffix={
                      <Button
                        type="link"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={() => openAI('card-title', localConfig.content?.title || '')}
                      />
                    }
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Taille">
                      <Select
                        value={localConfig.content?.titleSize ?? 'lg'}
                        onChange={(value) => updateConfig('content.titleSize', value)}
                      >
                        <Select.Option value="sm">Small</Select.Option>
                        <Select.Option value="md">Medium</Select.Option>
                        <Select.Option value="lg">Large</Select.Option>
                        <Select.Option value="xl">Extra Large</Select.Option>
                        <Select.Option value="2xl">2X Large</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Épaisseur">
                      <Select
                        value={localConfig.content?.titleWeight ?? 700}
                        onChange={(value) => updateConfig('content.titleWeight', value)}
                      >
                        {[300, 400, 500, 600, 700, 800, 900].map(w => (
                          <Select.Option key={w} value={w}>{w}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Couleur">
                      <ColorInput
                        value={localConfig.content?.titleColor}
                        onChange={(color) => updateConfig('content.titleColor', color)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* DESCRIPTION */}
                <Form.Item label="Description">
                  <TextArea
                    value={localConfig.content?.description}
                    onChange={(e) => updateConfig('content.description', e.target.value)}
                    placeholder="Description détaillée de la carte"
                    rows={4}
                    suffix={
                      <Button
                        type="link"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={() => openAI('card-description', localConfig.content?.description || '')}
                      />
                    }
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Taille texte">
                      <Select
                        value={localConfig.content?.descriptionSize ?? 'md'}
                        onChange={(value) => updateConfig('content.descriptionSize', value)}
                      >
                        <Select.Option value="xs">Extra Small</Select.Option>
                        <Select.Option value="sm">Small</Select.Option>
                        <Select.Option value="md">Medium</Select.Option>
                        <Select.Option value="lg">Large</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Couleur">
                      <ColorInput
                        value={localConfig.content?.descriptionColor}
                        onChange={(color) => updateConfig('content.descriptionColor', color)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* IMAGE */}
                <Divider>Image</Divider>
                <Form.Item label="URL de l'image">
                  <Input
                    value={localConfig.content?.image?.url}
                    onChange={(e) => updateConfig('content.image.url', e.target.value)}
                    placeholder="https://..."
                    prefix={<PictureOutlined />}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Position">
                      <Select
                        value={localConfig.content?.image?.position ?? 'top'}
                        onChange={(value) => updateConfig('content.image.position', value)}
                      >
                        <Select.Option value="top">Haut</Select.Option>
                        <Select.Option value="left">Gauche</Select.Option>
                        <Select.Option value="right">Droite</Select.Option>
                        <Select.Option value="bottom">Bas</Select.Option>
                        <Select.Option value="background">Arrière-plan</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Object Fit">
                      <Select
                        value={localConfig.content?.image?.objectFit ?? 'cover'}
                        onChange={(value) => updateConfig('content.image.objectFit', value)}
                      >
                        <Select.Option value="cover">Cover</Select.Option>
                        <Select.Option value="contain">Contain</Select.Option>
                        <Select.Option value="fill">Fill</Select.Option>
                        <Select.Option value="none">None</Select.Option>
                        <Select.Option value="scale-down">Scale Down</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {localConfig.content?.image?.position === 'background' && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Overlay sombre">
                        <Switch
                          checked={localConfig.content?.image?.overlay ?? true}
                          onChange={(checked) => updateConfig('content.image.overlay', checked)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Opacité overlay">
                        <Slider
                          value={localConfig.content?.image?.overlayOpacity ?? 0.5}
                          onChange={(value) => updateConfig('content.image.overlayOpacity', value)}
                          min={0}
                          max={1}
                          step={0.1}
                          marks={{ 0: '0%', 0.5: '50%', 1: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* ALIGNEMENT */}
                <Divider />
                <Form.Item label="Alignement du contenu">
                  <Select
                    value={localConfig.content?.alignment ?? 'left'}
                    onChange={(value) => updateConfig('content.alignment', value)}
                  >
                    <Select.Option value="left">⬅️ Gauche</Select.Option>
                    <Select.Option value="center">↔️ Centré</Select.Option>
                    <Select.Option value="right">➡️ Droite</Select.Option>
                  </Select>
                </Form.Item>
              </Space>
            ),
          },

          {
            key: 'style',
            label: (
              <span>
                <BgColorsOutlined /> Style
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* FOND */}
                <Form.Item label="Couleur de fond">
                  <ColorInput
                    value={localConfig.style?.backgroundColor}
                    onChange={(color) => updateConfig('style.backgroundColor', color)}
                  />
                </Form.Item>

                <Form.Item label="Dégradé">
                  <Switch
                    checked={localConfig.style?.backgroundGradient?.enabled ?? false}
                    onChange={(checked) => updateConfig('style.backgroundGradient.enabled', checked)}
                  />
                </Form.Item>

                {localConfig.style?.backgroundGradient?.enabled && (
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="De">
                        <ColorInput
                          value={localConfig.style?.backgroundGradient?.from}
                          onChange={(color) => updateConfig('style.backgroundGradient.from', color)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="À">
                        <ColorInput
                          value={localConfig.style?.backgroundGradient?.to}
                          onChange={(color) => updateConfig('style.backgroundGradient.to', color)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Direction">
                        <Select
                          value={localConfig.style?.backgroundGradient?.direction ?? 'to-bottom'}
                          onChange={(value) => updateConfig('style.backgroundGradient.direction', value)}
                        >
                          <Select.Option value="to-top">↑ Haut</Select.Option>
                          <Select.Option value="to-right">→ Droite</Select.Option>
                          <Select.Option value="to-bottom">↓ Bas</Select.Option>
                          <Select.Option value="to-left">← Gauche</Select.Option>
                          <Select.Option value="to-top-right">↗</Select.Option>
                          <Select.Option value="to-bottom-right">↘</Select.Option>
                          <Select.Option value="to-bottom-left">↙</Select.Option>
                          <Select.Option value="to-top-left">↖</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* BORDURE */}
                <Divider>Bordure</Divider>
                <Form.Item label="Activer la bordure">
                  <Switch
                    checked={localConfig.style?.border?.enabled ?? true}
                    onChange={(checked) => updateConfig('style.border.enabled', checked)}
                  />
                </Form.Item>

                {localConfig.style?.border?.enabled !== false && (
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="Épaisseur (px)">
                        <InputNumber
                          value={localConfig.style?.border?.width ?? 1}
                          onChange={(value) => updateConfig('style.border.width', value)}
                          min={0}
                          max={10}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Style">
                        <Select
                          value={localConfig.style?.border?.style ?? 'solid'}
                          onChange={(value) => updateConfig('style.border.style', value)}
                        >
                          <Select.Option value="solid">Solide</Select.Option>
                          <Select.Option value="dashed">Tirets</Select.Option>
                          <Select.Option value="dotted">Pointillés</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Couleur">
                        <ColorInput
                          value={localConfig.style?.border?.color}
                          onChange={(color) => updateConfig('style.border.color', color)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                <Form.Item label="Border Radius (px)">
                  <Slider
                    value={localConfig.style?.border?.radius ?? 8}
                    onChange={(value) => updateConfig('style.border.radius', value)}
                    min={0}
                    max={50}
                    marks={{ 0: '0', 8: '8', 16: '16', 24: '24', 50: '50' }}
                  />
                </Form.Item>

                {/* OMBRE */}
                <Divider>Ombre</Divider>
                <Form.Item label="Activer l'ombre">
                  <Switch
                    checked={localConfig.style?.shadow?.enabled ?? true}
                    onChange={(checked) => updateConfig('style.shadow.enabled', checked)}
                  />
                </Form.Item>

                {localConfig.style?.shadow?.enabled !== false && (
                  <>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item label="X (px)">
                          <InputNumber
                            value={localConfig.style?.shadow?.x ?? 0}
                            onChange={(value) => updateConfig('style.shadow.x', value)}
                            min={-50}
                            max={50}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="Y (px)">
                          <InputNumber
                            value={localConfig.style?.shadow?.y ?? 4}
                            onChange={(value) => updateConfig('style.shadow.y', value)}
                            min={-50}
                            max={50}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="Blur (px)">
                          <InputNumber
                            value={localConfig.style?.shadow?.blur ?? 12}
                            onChange={(value) => updateConfig('style.shadow.blur', value)}
                            min={0}
                            max={100}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="Spread (px)">
                          <InputNumber
                            value={localConfig.style?.shadow?.spread ?? 0}
                            onChange={(value) => updateConfig('style.shadow.spread', value)}
                            min={-50}
                            max={50}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="Couleur de l'ombre">
                      <ColorInput
                        value={localConfig.style?.shadow?.color}
                        onChange={(color) => updateConfig('style.shadow.color', color)}
                      />
                    </Form.Item>
                  </>
                )}

                {/* HOVER */}
                <Divider>Effet Hover</Divider>
                <Form.Item label="Activer les effets hover">
                  <Switch
                    checked={localConfig.style?.hover?.enabled ?? true}
                    onChange={(checked) => updateConfig('style.hover.enabled', checked)}
                  />
                </Form.Item>

                {localConfig.style?.hover?.enabled !== false && (
                  <>
                    <Form.Item label="Scale (zoom)">
                      <Slider
                        value={localConfig.style?.hover?.scale ?? 1.02}
                        onChange={(value) => updateConfig('style.hover.scale', value)}
                        min={0.9}
                        max={1.2}
                        step={0.01}
                        marks={{ 0.9: '90%', 1: '100%', 1.1: '110%', 1.2: '120%' }}
                      />
                    </Form.Item>

                    <Form.Item label="Translate Y (déplacement vertical, px)">
                      <Slider
                        value={localConfig.style?.hover?.translateY ?? -4}
                        onChange={(value) => updateConfig('style.hover.translateY', value)}
                        min={-20}
                        max={20}
                        marks={{ '-20': '-20', 0: '0', 20: '20' }}
                      />
                    </Form.Item>

                    <Form.Item label="Intensité de l'ombre (0-1)">
                      <Slider
                        value={localConfig.style?.hover?.shadowIntensity ?? 1.5}
                        onChange={(value) => updateConfig('style.hover.shadowIntensity', value)}
                        min={0}
                        max={3}
                        step={0.1}
                        marks={{ 0: '0', 1: '1x', 2: '2x', 3: '3x' }}
                      />
                    </Form.Item>

                    <Form.Item label="Couleur de bordure au hover">
                      <ColorInput
                        value={localConfig.style?.hover?.borderColor}
                        onChange={(color) => updateConfig('style.hover.borderColor', color)}
                      />
                    </Form.Item>
                  </>
                )}

                {/* DIMENSIONS */}
                <Divider>Dimensions</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Hauteur minimale (px)">
                      <InputNumber
                        value={localConfig.style?.minHeight ?? 200}
                        onChange={(value) => updateConfig('style.minHeight', value)}
                        min={0}
                        max={1000}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Largeur maximale">
                      <Input
                        value={localConfig.style?.maxWidth ?? 'auto'}
                        onChange={(e) => updateConfig('style.maxWidth', e.target.value)}
                        placeholder="auto, 400px, 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Space>
            ),
          },

          {
            key: 'footer',
            label: (
              <span>
                <LinkOutlined /> Footer
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Form.Item label="Activer le footer">
                  <Switch
                    checked={localConfig.footer?.enabled ?? true}
                    onChange={(checked) => updateConfig('footer.enabled', checked)}
                  />
                </Form.Item>

                {localConfig.footer?.enabled !== false && (
                  <>
                    {/* BOUTON */}
                    <Divider>Bouton d'action</Divider>
                    <Form.Item label="Afficher le bouton">
                      <Switch
                        checked={localConfig.footer?.button?.show ?? true}
                        onChange={(checked) => updateConfig('footer.button.show', checked)}
                      />
                    </Form.Item>

                    {localConfig.footer?.button?.show !== false && (
                      <>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="Texte du bouton">
                              <Input
                                value={localConfig.footer?.button?.text}
                                onChange={(e) => updateConfig('footer.button.text', e.target.value)}
                                placeholder="En savoir plus"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="URL">
                              <Input
                                value={localConfig.footer?.button?.url}
                                onChange={(e) => updateConfig('footer.button.url', e.target.value)}
                                placeholder="/page"
                                prefix={<LinkOutlined />}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="Variante">
                              <Select
                                value={localConfig.footer?.button?.variant ?? 'primary'}
                                onChange={(value) => updateConfig('footer.button.variant', value)}
                              >
                                <Select.Option value="primary">Primary</Select.Option>
                                <Select.Option value="default">Default</Select.Option>
                                <Select.Option value="dashed">Dashed</Select.Option>
                                <Select.Option value="text">Text</Select.Option>
                                <Select.Option value="link">Link</Select.Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Pleine largeur">
                              <Switch
                                checked={localConfig.footer?.button?.fullWidth ?? false}
                                onChange={(checked) => updateConfig('footer.button.fullWidth', checked)}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    )}

                    {/* LIEN */}
                    <Divider>Lien secondaire</Divider>
                    <Form.Item label="Afficher un lien">
                      <Switch
                        checked={localConfig.footer?.link?.show ?? false}
                        onChange={(checked) => updateConfig('footer.link.show', checked)}
                      />
                    </Form.Item>

                    {localConfig.footer?.link?.show && (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="Texte du lien">
                            <Input
                              value={localConfig.footer?.link?.text}
                              onChange={(e) => updateConfig('footer.link.text', e.target.value)}
                              placeholder="Voir les détails"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="URL">
                            <Input
                              value={localConfig.footer?.link?.url}
                              onChange={(e) => updateConfig('footer.link.url', e.target.value)}
                              placeholder="/details"
                              prefix={<LinkOutlined />}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {/* STYLE FOOTER */}
                    <Divider>Style du footer</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Couleur de fond">
                          <ColorInput
                            value={localConfig.footer?.backgroundColor}
                            onChange={(color) => updateConfig('footer.backgroundColor', color)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Couleur du texte">
                          <ColorInput
                            value={localConfig.footer?.textColor}
                            onChange={(color) => updateConfig('footer.textColor', color)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label="Padding (px)">
                      <Slider
                        value={localConfig.footer?.padding ?? 16}
                        onChange={(value) => updateConfig('footer.padding', value)}
                        min={0}
                        max={48}
                        marks={{ 0: '0', 16: '16', 32: '32', 48: '48' }}
                      />
                    </Form.Item>
                  </>
                )}
              </Space>
            ),
          },

          {
            key: 'grid',
            label: (
              <span>
                <LayoutOutlined /> Position Grid
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Text type="secondary">
                  Configurez la position de cette carte dans la grille CSS Grid.
                  Utile pour des layouts personnalisés.
                </Text>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Column Start">
                      <InputNumber
                        value={localConfig.gridPosition?.columnStart}
                        onChange={(value) => updateConfig('gridPosition.columnStart', value)}
                        min={1}
                        max={13}
                        placeholder="Auto"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Column Span">
                      <InputNumber
                        value={localConfig.gridPosition?.columnEnd}
                        onChange={(value) => updateConfig('gridPosition.columnEnd', value)}
                        min={1}
                        max={12}
                        placeholder="1"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Row Start">
                      <InputNumber
                        value={localConfig.gridPosition?.rowStart}
                        onChange={(value) => updateConfig('gridPosition.rowStart', value)}
                        min={1}
                        max={11}
                        placeholder="Auto"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Row Span">
                      <InputNumber
                        value={localConfig.gridPosition?.rowEnd}
                        onChange={(value) => updateConfig('gridPosition.rowEnd', value)}
                        min={1}
                        max={10}
                        placeholder="1"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Order (ordre d'affichage)">
                  <InputNumber
                    value={localConfig.gridPosition?.order}
                    onChange={(value) => updateConfig('gridPosition.order', value)}
                    min={-10}
                    max={10}
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Align Self">
                      <Select
                        value={localConfig.gridPosition?.alignSelf ?? 'stretch'}
                        onChange={(value) => updateConfig('gridPosition.alignSelf', value)}
                      >
                        <Select.Option value="start">Start</Select.Option>
                        <Select.Option value="center">Center</Select.Option>
                        <Select.Option value="end">End</Select.Option>
                        <Select.Option value="stretch">Stretch</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Justify Self">
                      <Select
                        value={localConfig.gridPosition?.justifySelf ?? 'stretch'}
                        onChange={(value) => updateConfig('gridPosition.justifySelf', value)}
                      >
                        <Select.Option value="start">Start</Select.Option>
                        <Select.Option value="center">Center</Select.Option>
                        <Select.Option value="end">End</Select.Option>
                        <Select.Option value="stretch">Stretch</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Space>
            ),
          },
        ]}
      />

      {/* MODAL IA */}
      {showAI && (
        <AIAssistant
          visible={showAI}
          onClose={() => setShowAI(false)}
          context={aiContext}
          sectionType={sectionType}
          currentValue={
            aiContext === 'header-title' ? localConfig.header?.title :
            aiContext === 'card-title' ? localConfig.content?.title :
            aiContext === 'card-description' ? localConfig.content?.description :
            ''
          }
          onApply={(value) => {
            if (aiContext === 'header-title') applyAISuggestion('header.title', value);
            else if (aiContext === 'card-title') applyAISuggestion('content.title', value);
            else if (aiContext === 'card-description') applyAISuggestion('content.description', value);
          }}
        />
      )}
    </Card>
  );
};
