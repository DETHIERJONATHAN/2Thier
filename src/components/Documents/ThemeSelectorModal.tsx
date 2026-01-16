/**
 * 🎨 THEME SELECTOR MODAL
 * Interface visuelle pour sélectionner et prévisualiser les thèmes
 * Complètement INTERCHANGEABLE entre tous les templates
 */

import React, { useState } from 'react';
import { Modal, Button, Space, Row, Col, Card, Tooltip, message } from 'antd';
import { SwapOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ALL_THEMES, DocumentTheme } from './DocumentThemes';

interface ThemeSelectorProps {
  currentThemeId?: string;
  onThemeSelected: (theme: DocumentTheme) => void;
  visible: boolean;
  onCancel: () => void;
  title?: string;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentThemeId,
  onThemeSelected,
  visible,
  onCancel,
  title = '🎨 Choisir un Thème',
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>(
    currentThemeId
  );

  const handleThemeSelect = (theme: DocumentTheme) => {
    setSelectedThemeId(theme.id);
  };

  const handleApplyTheme = () => {
    const theme = ALL_THEMES.find((t) => t.id === selectedThemeId);
    if (theme) {
      onThemeSelected(theme);
      message.success(`✨ Thème "${theme.name}" appliqué avec succès!`);
      onCancel();
    }
  };

  return (
    <Modal
      title={title}
      visible={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Annuler
        </Button>,
        <Button
          key="apply"
          type="primary"
          onClick={handleApplyTheme}
          disabled={!selectedThemeId}
          icon={<SwapOutlined />}
        >
          Appliquer le Thème
        </Button>,
      ]}
    >
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Sélectionnez un thème magnifique pour votre document. Les thèmes sont
          complètement interchangeables et peuvent être appliqués à n'importe quel
          template.
        </p>
      </div>

      <Row gutter={[16, 16]}>
        {ALL_THEMES.map((theme) => (
          <Col key={theme.id} xs={24} sm={12} md={8}>
            <Card
              hoverable
              style={{
                cursor: 'pointer',
                border:
                  selectedThemeId === theme.id
                    ? `3px solid ${theme.primaryColor}`
                    : '2px solid #ddd',
                transition: 'all 0.3s ease',
              }}
              onClick={() => handleThemeSelect(theme)}
            >
              {/* Theme Preview Header */}
              <div
                style={{
                  height: '100px',
                  background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`,
                  borderRadius: '4px',
                  marginBottom: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* SVG Header Background */}
                <div
                  dangerouslySetInnerHTML={{ __html: theme.headerSvg }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/* Checkmark if selected */}
                {selectedThemeId === theme.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '32px',
                      color: '#fff',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    <CheckCircleOutlined />
                  </div>
                )}
              </div>

              {/* Theme Info */}
              <div>
                <h4 style={{ margin: '8px 0', color: '#333' }}>
                  {theme.name}
                </h4>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    margin: '4px 0 8px 0',
                    minHeight: '32px',
                  }}
                >
                  {theme.description}
                </p>

                {/* Color Preview */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <Tooltip title="Couleur primaire">
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: theme.primaryColor,
                        borderRadius: '3px',
                        border: '1px solid #ddd',
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Couleur secondaire">
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: theme.secondaryColor,
                        borderRadius: '3px',
                        border: '1px solid #ddd',
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Couleur d'accent">
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: theme.accentColor,
                        borderRadius: '3px',
                        border: '1px solid #ddd',
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Theme Details */}
      {selectedThemeId && (
        <Card
          style={{
            marginTop: '20px',
            backgroundColor: '#F6F8FB',
            borderColor: ALL_THEMES.find((t) => t.id === selectedThemeId)
              ?.primaryColor,
          }}
        >
          {(() => {
            const theme = ALL_THEMES.find((t) => t.id === selectedThemeId);
            if (!theme) return null;

            return (
              <div>
                <h3 style={{ marginBottom: '12px' }}>
                  Détails du thème: {theme.name}
                </h3>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}>
                    <div>
                      <strong>Primaire:</strong>
                      <p style={{ color: theme.primaryColor, fontSize: '12px' }}>
                        {theme.primaryColor}
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div>
                      <strong>Secondaire:</strong>
                      <p style={{ color: theme.secondaryColor, fontSize: '12px' }}>
                        {theme.secondaryColor}
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div>
                      <strong>Accent:</strong>
                      <p style={{ color: theme.accentColor, fontSize: '12px' }}>
                        {theme.accentColor}
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div>
                      <strong>Texte:</strong>
                      <p style={{ color: theme.textColor, fontSize: '12px' }}>
                        {theme.textColor}
                      </p>
                    </div>
                  </Col>
                  <Col xs={24} sm={6}>
                    <div>
                      <strong>Police:</strong>
                      <p style={{ fontFamily: theme.fontFamily, fontSize: '12px' }}>
                        {theme.fontFamily}
                      </p>
                    </div>
                  </Col>
                </Row>
              </div>
            );
          })()}
        </Card>
      )}
    </Modal>
  );
};

export default ThemeSelector;
