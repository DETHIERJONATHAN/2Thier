import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, ColorPicker, Input, Select, Button, message, Spin, Tabs, Row, Col } from 'antd';
import { SaveOutlined, ReloadOutlined, BgColorsOutlined } from '@ant-design/icons';
import type { Color } from 'antd/es/color-picker';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ThemeManagerProps {
  websiteId: number;
}

/**
 * 🎨 GESTIONNAIRE DE THÈMES NO-CODE
 * Interface visuelle pour gérer l'identité visuelle du site
 */
const ThemeManager: React.FC<ThemeManagerProps> = ({ websiteId }) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Chargement du thème
  useEffect(() => {
    fetchTheme();
  }, [websiteId]);

  const fetchTheme = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/website-themes/${websiteId}`);
      setTheme(response || getDefaultTheme());
      setHasChanges(false);
    } catch (error) {
      console.error('❌ Erreur chargement thème:', error);
      // Si pas de thème, on utilise le défaut
      setTheme(getDefaultTheme());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTheme = () => ({
    websiteId,
    name: 'Thème par défaut',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    accentColor: '#047857',
    textColor: '#1f2937',
    textLightColor: '#6b7280',
    backgroundColor: '#ffffff',
    surfaceColor: '#f9fafb',
    fontTitle: 'Poppins',
    fontText: 'Inter',
    fontSizeBase: 16,
    borderRadius: 12,
    shadowLevel: 'medium',
    spacingUnit: 8,
    customCss: ''
  });

  const updateField = (field: string, value: any) => {
    setTheme({ ...theme, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (theme.id) {
        await api.put(`/api/website-themes/${theme.id}`, theme);
      } else {
        await api.post('/api/website-themes', theme);
      }
      message.success('Thème enregistré avec succès !');
      await fetchTheme();
    } catch (error) {
      console.error('❌ Erreur sauvegarde thème:', error);
      message.error('Erreur lors de la sauvegarde du thème');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetName: string) => {
    const presets: any = {
      'vert-energie': {
        name: 'Vert Énergie',
        primaryColor: '#10b981',
        secondaryColor: '#059669',
        accentColor: '#047857',
        textColor: '#1f2937',
        textLightColor: '#6b7280',
        backgroundColor: '#ffffff',
        surfaceColor: '#f9fafb'
      },
      'bleu-business': {
        name: 'Bleu Business',
        primaryColor: '#3b82f6',
        secondaryColor: '#2563eb',
        accentColor: '#1d4ed8',
        textColor: '#1e293b',
        textLightColor: '#64748b',
        backgroundColor: '#ffffff',
        surfaceColor: '#f8fafc'
      },
      'violet-tech': {
        name: 'Violet Tech',
        primaryColor: '#8b5cf6',
        secondaryColor: '#7c3aed',
        accentColor: '#6d28d9',
        textColor: '#1f2937',
        textLightColor: '#6b7280',
        backgroundColor: '#ffffff',
        surfaceColor: '#faf5ff'
      },
      'orange-dynamique': {
        name: 'Orange Dynamique',
        primaryColor: '#f97316',
        secondaryColor: '#ea580c',
        accentColor: '#c2410c',
        textColor: '#1f2937',
        textLightColor: '#6b7280',
        backgroundColor: '#ffffff',
        surfaceColor: '#fff7ed'
      },
      'noir-premium': {
        name: 'Noir Premium',
        primaryColor: '#eab308',
        secondaryColor: '#ca8a04',
        accentColor: '#a16207',
        textColor: '#f9fafb',
        textLightColor: '#d1d5db',
        backgroundColor: '#111827',
        surfaceColor: '#1f2937'
      }
    };

    const preset = presets[presetName];
    if (preset) {
      setTheme({ ...theme, ...preset });
      setHasChanges(true);
      message.success(`Thème "${preset.name}" appliqué !`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Chargement du thème..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>🎨 Gestionnaire de Thèmes</Title>
            <Text type="secondary">Personnalisez l'identité visuelle de votre site</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTheme}>
              Réinitialiser
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              Enregistrer
            </Button>
          </Space>
        </div>

        {hasChanges && (
          <Card size="small" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
            <Text style={{ color: '#92400e' }}>⚠️ Vous avez des modifications non enregistrées</Text>
          </Card>
        )}

        {/* PRESETS */}
        <Card title={<><BgColorsOutlined /> Thèmes Prédéfinis</>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button 
                block 
                onClick={() => applyPreset('vert-energie')}
                style={{ 
                  height: '80px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Vert Énergie</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Actuel</div>
                </div>
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button 
                block 
                onClick={() => applyPreset('bleu-business')}
                style={{ 
                  height: '80px', 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Bleu Business</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Professionnel</div>
                </div>
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button 
                block 
                onClick={() => applyPreset('violet-tech')}
                style={{ 
                  height: '80px', 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Violet Tech</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Moderne</div>
                </div>
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button 
                block 
                onClick={() => applyPreset('orange-dynamique')}
                style={{ 
                  height: '80px', 
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Orange</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Dynamique</div>
                </div>
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button 
                block 
                onClick={() => applyPreset('noir-premium')}
                style={{ 
                  height: '80px', 
                  background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
                  color: '#eab308',
                  border: 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Noir Premium</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Élégant</div>
                </div>
              </Button>
            </Col>
          </Row>
        </Card>

        {/* TABS DE PERSONNALISATION */}
        <Tabs defaultActiveKey="colors" items={[
    {
      key: 'colors',
      label: '🎨 Couleurs',
      children: (
        <>
<Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Couleurs Principales">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Couleur Primaire</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.primaryColor}
                          onChange={(color: Color) => updateField('primaryColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Couleur Secondaire</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.secondaryColor}
                          onChange={(color: Color) => updateField('secondaryColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Couleur d'Accent</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.accentColor}
                          onChange={(color: Color) => updateField('accentColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Couleurs de Texte">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Texte Principal</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.textColor}
                          onChange={(color: Color) => updateField('textColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Texte Secondaire</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.textLightColor}
                          onChange={(color: Color) => updateField('textLightColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                  </Space>
                </Card>
                <Card title="Couleurs de Fond" style={{ marginTop: '24px' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Fond Principal</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.backgroundColor}
                          onChange={(color: Color) => updateField('backgroundColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Fond Cartes/Surfaces</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          value={theme.surfaceColor}
                          onChange={(color: Color) => updateField('surfaceColor', color.toHexString())}
                          showText
                          size="large"
                        />
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
        </>
      )
    },
    {
      key: 'typography',
      label: '🔤 Typographie',
      children: (
        <>
<Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Police des Titres</Text>
                  <Select
                    value={theme.fontTitle}
                    onChange={(value) => updateField('fontTitle', value)}
                    style={{ width: '100%', marginTop: '8px' }}
                    size="large"
                    options={[
                      { label: 'Poppins (Recommandé)', value: 'Poppins' },
                      { label: 'Montserrat', value: 'Montserrat' },
                      { label: 'Raleway', value: 'Raleway' },
                      { label: 'Roboto', value: 'Roboto' },
                      { label: 'Open Sans', value: 'Open Sans' },
                      { label: 'Lato', value: 'Lato' }
                    ]}
                  />
                </div>
                <div>
                  <Text strong>Police du Texte</Text>
                  <Select
                    value={theme.fontText}
                    onChange={(value) => updateField('fontText', value)}
                    style={{ width: '100%', marginTop: '8px' }}
                    size="large"
                    options={[
                      { label: 'Inter (Recommandé)', value: 'Inter' },
                      { label: 'Roboto', value: 'Roboto' },
                      { label: 'Open Sans', value: 'Open Sans' },
                      { label: 'Lato', value: 'Lato' },
                      { label: 'Source Sans Pro', value: 'Source Sans Pro' }
                    ]}
                  />
                </div>
                <div>
                  <Text strong>Taille de Base (px)</Text>
                  <Input
                    type="number"
                    value={theme.fontSizeBase}
                    onChange={(e) => updateField('fontSizeBase', parseInt(e.target.value))}
                    min={12}
                    max={20}
                    style={{ marginTop: '8px' }}
                    size="large"
                  />
                </div>
              </Space>
            </Card>
        </>
      )
    },
    {
      key: 'design',
      label: '✨ Design',
      children: (
        <>
<Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Arrondis des Coins (px)</Text>
                  <Input
                    type="number"
                    value={theme.borderRadius}
                    onChange={(e) => updateField('borderRadius', parseInt(e.target.value))}
                    min={0}
                    max={32}
                    style={{ marginTop: '8px' }}
                    size="large"
                  />
                </div>
                <div>
                  <Text strong>Niveau d'Ombres</Text>
                  <Select
                    value={theme.shadowLevel}
                    onChange={(value) => updateField('shadowLevel', value)}
                    style={{ width: '100%', marginTop: '8px' }}
                    size="large"
                    options={[
                      { label: 'Aucune', value: 'none' },
                      { label: 'Légère', value: 'light' },
                      { label: 'Moyenne', value: 'medium' },
                      { label: 'Forte', value: 'strong' }
                    ]}
                  />
                </div>
                <div>
                  <Text strong>Unité d'Espacement (px)</Text>
                  <Input
                    type="number"
                    value={theme.spacingUnit}
                    onChange={(e) => updateField('spacingUnit', parseInt(e.target.value))}
                    min={4}
                    max={16}
                    step={2}
                    style={{ marginTop: '8px' }}
                    size="large"
                  />
                </div>
              </Space>
            </Card>
        </>
      )
    },
    {
      key: 'custom',
      label: '💻 CSS Personnalisé',
      children: (
        <>
<Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text type="secondary">
                  Ajoutez du CSS personnalisé pour des ajustements avancés
                </Text>
                <TextArea
                  value={theme.customCss || ''}
                  onChange={(e) => updateField('customCss', e.target.value)}
                  placeholder=".hero-section { background: linear-gradient(...); }"
                  rows={12}
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </Space>
            </Card>
        </>
      )
    }
  ]} />
      </Space>
    </div>
  );
};

export default ThemeManager;
