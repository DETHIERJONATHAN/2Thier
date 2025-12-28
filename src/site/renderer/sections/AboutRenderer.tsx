/**
 * 📄 ABOUT RENDERER
 * 
 * Renderer pour la section "À Propos" - Présentation de l'entreprise.
 * Affiche image, texte et valeurs/points forts.
 * 
 * @module site/renderer/sections/AboutRenderer
 * @author 2Thier CRM Team
 */

import React from 'react';
import { Row, Col, Typography, Space, Card } from 'antd';
import { renderIconNode } from '../utils/icon';

const { Title, Paragraph } = Typography;

interface AboutRendererProps {
  content: {
    title?: string;
    text?: string;
    image?: string;
    values?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    layout?: 'image-left' | 'image-right' | 'image-top';
    style?: {
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
    };
  };
  mode?: 'preview' | 'edit';
}

export const AboutRenderer: React.FC<AboutRendererProps> = ({ content }) => {
  const {
    title = 'Qui sommes-nous ?',
    text = '',
    image = '/about-team.jpg',
    values = [],
    layout = 'image-left',
    style = {}
  } = content;

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    accentColor = '#10b981'
  } = style;

  const imageOrder = layout === 'image-right' ? 2 : 1;
  const contentOrder = layout === 'image-right' ? 1 : 2;

  return (
    <div style={{ background: backgroundColor, padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {layout === 'image-top' ? (
          // Layout vertical
          <div style={{ textAlign: 'center' }}>
            {image && (
              <div style={{ marginBottom: '40px' }}>
                <img
                  src={image}
                  alt={title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '16px',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}
            <Title level={2} style={{ color: textColor, fontSize: 'clamp(28px, 6vw, 42px)', marginBottom: '24px' }}>
              {title}
            </Title>
            <Paragraph style={{ 
              color: textColor, 
              fontSize: '18px', 
              lineHeight: '1.8',
              maxWidth: '800px',
              margin: '0 auto 40px'
            }}>
              {text}
            </Paragraph>
          </div>
        ) : (
          // Layout horizontal (image-left ou image-right)
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={12} style={{ order: imageOrder }}>
              {image && (
                <img
                  src={image}
                  alt={title}
                  style={{
                    width: '100%',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
                  }}
                />
              )}
            </Col>
            <Col xs={24} md={12} style={{ order: contentOrder }}>
              <Title level={2} style={{ color: textColor, fontSize: 'clamp(28px, 5vw, 38px)', marginBottom: '24px' }}>
                {title}
              </Title>
              <Paragraph style={{ 
                color: textColor, 
                fontSize: '17px', 
                lineHeight: '1.8',
                opacity: 0.9
              }}>
                {text}
              </Paragraph>
            </Col>
          </Row>
        )}

        {/* Valeurs / Points forts */}
        {values && values.length > 0 && (
          <Row gutter={[24, 24]} style={{ marginTop: '60px' }}>
            {values.map((value, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Card
                  bordered={false}
                  style={{
                    textAlign: 'center',
                    height: '100%',
                    background: 'transparent',
                    boxShadow: 'none'
                  }}
                  bodyStyle={{ padding: '24px 16px' }}
                >
                  <div style={{ 
                    fontSize: '36px', 
                    color: accentColor,
                    marginBottom: '16px'
                  }}>
                    {renderIconNode(value.icon)}
                  </div>
                  <Title level={4} style={{ color: textColor, marginBottom: '8px', fontSize: '18px' }}>
                    {value.title}
                  </Title>
                  <Paragraph style={{ color: textColor, opacity: 0.7, margin: 0, fontSize: '14px' }}>
                    {value.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
};

export default AboutRenderer;
