/**
 * 🎨 PAGE BACKGROUND SELECTOR
 * Sélecteur de backgrounds visuels qui s'adaptent aux thèmes
 * 18+ designs magnifiques paramétrés par les couleurs du thème
 */

import React, { useState, useMemo } from 'react';
import { Modal, Row, Col, Card, Button, Space, Tooltip, message, Tabs } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { ADAPTIVE_BACKGROUNDS, AdaptiveBackground } from './AdaptiveBackgrounds';

interface PageBackgroundSelectorProps {
  visible: boolean;
  onCancel: () => void;
  onBackgroundSelected: (background: AdaptiveBackground, svg: string) => void;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  currentBackgroundId?: string;
}

const PageBackgroundSelector: React.FC<PageBackgroundSelectorProps> = ({
  visible,
  onCancel,
  onBackgroundSelected,
  primaryColor,
  secondaryColor,
  accentColor,
  textColor,
  backgroundColor,
  currentBackgroundId,
}) => {
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | undefined>(
    currentBackgroundId
  );

  // Générer les SVGs adaptatifs avec les couleurs du thème
  const generatedBackgrounds = useMemo(() => {
    return ADAPTIVE_BACKGROUNDS.map(bg => {
      const svg = bg.generateSVG({
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        text: textColor,
        background: backgroundColor,
      });
      return { ...bg, generatedSvg: svg };
    });
  }, [primaryColor, secondaryColor, accentColor, textColor, backgroundColor]);

  const handleApplyBackground = () => {
    const bg = generatedBackgrounds.find(b => b.id === selectedBackgroundId);
    if (bg) {
      onBackgroundSelected(bg, bg.generatedSvg);
      message.success(`✨ Fond "${bg.name}" appliqué au document`);
      onCancel();
    }
  };

  // Grouper par catégorie
  const categories = Array.from(new Set(generatedBackgrounds.map(bg => bg.category)));

  return (
    <Modal
      title="🎨 Choisir un Fond pour votre Page"
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Annuler
        </Button>,
        <Button
          key="apply"
          type="primary"
          onClick={handleApplyBackground}
          disabled={!selectedBackgroundId}
        >
          ✨ Appliquer le Fond
        </Button>,
      ]}
    >
      <Tabs
        items={categories.map(category => ({
          key: category,
          label: `${category} (${generatedBackgrounds.filter(b => b.category === category).length})`,
          children: (
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              {generatedBackgrounds
                .filter(bg => bg.category === category)
                .map(bg => (
                  <Col key={bg.id} xs={24} sm={12} md={8} lg={6}>
                    <Tooltip title={`${bg.name} - ${bg.description}`}>
                      <Card
                        hoverable
                        style={{
                          cursor: 'pointer',
                          border:
                            selectedBackgroundId === bg.id
                              ? `3px solid ${primaryColor}`
                              : '2px solid #e0e0e0',
                          padding: '8px',
                          minHeight: '180px',
                        }}
                        onClick={() => setSelectedBackgroundId(bg.id)}
                      >
                        {/* Aperçu du fond */}
                        <div
                          style={{
                            width: '100%',
                            height: '120px',
                            background: `url('data:image/svg+xml,${encodeURIComponent(
                              bg.generatedSvg
                            )}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            position: 'relative',
                          }}
                        >
                          {selectedBackgroundId === bg.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                fontSize: '20px',
                                color: primaryColor,
                              }}
                            >
                              <CheckCircleOutlined />
                            </div>
                          )}
                        </div>

                        {/* Nom et description */}
                        <p style={{ margin: '4px 0', fontWeight: 600, fontSize: '12px' }}>
                          {bg.name}
                        </p>
                        <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>
                          {bg.description}
                        </p>
                      </Card>
                    </Tooltip>
                  </Col>
                ))}
            </Row>
          ),
        }))}
      />

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
        <p>💡 <strong>Conseil:</strong> Les couleurs des fonds s'adaptent automatiquement au thème choisi pour votre document!</p>
      </div>
    </Modal>
  );
};

export default PageBackgroundSelector;
