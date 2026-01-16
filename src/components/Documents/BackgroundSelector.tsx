import React, { useState, useMemo } from 'react';
import { Modal, Tabs, Button, Space, Row, Col, Empty, Spin } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import { PAGE_BACKGROUNDS, getBackgroundsByCategory } from './PageBackgrounds';
import type { PageBackground } from './PageBackgrounds';

interface BackgroundSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (backgroundId: string, backgroundSvg: string) => void;
  globalTheme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    backgroundColor?: string;
  };
  selectedBackgroundId?: string;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  open,
  onClose,
  onSelect,
  globalTheme = {
    primaryColor: '#1890ff',
    secondaryColor: '#722ed1',
    accentColor: '#fa8c16',
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
  selectedBackgroundId,
}) => {
  const [loading, setLoading] = useState(false);

  // Préparer les couleurs pour les générateurs
  const colors = {
    primary: globalTheme.primaryColor || '#1890ff',
    secondary: globalTheme.secondaryColor || '#722ed1',
    accent: globalTheme.accentColor || '#fa8c16',
    text: globalTheme.textColor || '#000000',
    bg: globalTheme.backgroundColor || '#ffffff',
  };

  // Catégories disponibles
  const categories = [
    { key: 'pro', label: '👔 Professionnel', value: 'pro' as const },
    { key: 'modern', label: '🎨 Moderne', value: 'modern' as const },
    { key: 'geometric', label: '🔷 Géométrique', value: 'geometric' as const },
    { key: 'vintage', label: '✨ Vintage', value: 'vintage' as const },
    { key: 'abstract', label: '🎭 Abstrait', value: 'abstract' as const },
    { key: 'minimal', label: '⚪ Minimal', value: 'minimal' as const },
  ];

  // Récupérer les backgrounds pour une catégorie
  const getBackgroundsForCategory = (category: PageBackground['category']) => {
    return getBackgroundsByCategory(category);
  };

  // Composant pour une carte de background
  const BackgroundCard: React.FC<{ background: PageBackground }> = ({ background }) => {
    const svgUri = background.svgGenerator(colors);
    const isSelected = selectedBackgroundId === background.id;

    const handleSelect = () => {
      setLoading(true);
      try {
        onSelect(background.id, svgUri);
        setTimeout(() => {
          setLoading(false);
          onClose();
        }, 300);
      } catch (error) {
        console.error('Erreur lors de la sélection du fond:', error);
        setLoading(false);
      }
    };

    return (
      <div
        style={{
          border: isSelected ? '3px solid #1890ff' : '2px solid #d9d9d9',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: '#fafafa',
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isSelected ? '0 4px 12px rgba(24, 144, 255, 0.3)' : 'none',
        }}
        onClick={handleSelect}
      >
        {/* Aperçu du fond */}
        <div
          style={{
            width: '100%',
            paddingTop: '66.67%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: colors.bg,
          }}
        >
          <img
            src={svgUri}
            alt={background.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Infos du fond */}
        <div style={{ padding: '12px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.text,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {background.name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#8c8c8c',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {background.description}
          </div>

          {/* Bouton de sélection */}
          <Button
            type={isSelected ? 'primary' : 'dashed'}
            size="small"
            style={{ marginTop: '8px', width: '100%' }}
            onClick={(e) => {
              e.stopPropagation();
              handleSelect();
            }}
            loading={loading}
          >
            {isSelected ? '✓ Sélectionné' : 'Choisir'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <BgColorsOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <span>🎨 Choisir le Fond du Document</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
      centered
    >
      <Spin spinning={loading}>
        <Tabs
          items={categories.map(({ key, label, value }) => {
            const backgrounds = getBackgroundsForCategory(value);
            return {
              key,
              label,
              children: (
                <div style={{ padding: '20px 0' }}>
                  {backgrounds.length === 0 ? (
                    <Empty
                      description="Aucun fond disponible"
                      style={{ marginTop: '40px', marginBottom: '40px' }}
                    />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {backgrounds.map((bg) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={bg.id}>
                          <BackgroundCard background={bg} />
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            };
          })}
          defaultActiveKey="pro"
        />

        {/* Info sur les adaptations */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: '#e6f7ff',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#0050b3',
            borderLeft: '4px solid #1890ff',
          }}
        >
          <strong>💡 Conseil :</strong> Le fond s'adapte automatiquement aux couleurs de votre
          thème. Changez de thème pour voir le fond se transformer en temps réel !
        </div>
      </Spin>
    </Modal>
  );
};

export default BackgroundSelector;
