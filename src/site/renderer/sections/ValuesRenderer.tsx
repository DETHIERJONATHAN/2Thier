/**
 * 💚 VALUES RENDERER
 * 
 * Renderer pour la section "Pourquoi nous choisir".
 * Affiche une grille de cards avec icônes, titres et descriptions.
 * 
 * @module site/renderer/sections/ValuesRenderer
 * @author 2Thier CRM Team
 */

import React from 'react';
import { Row, Col, Card, Typography, Space } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { renderIconNode } from '../utils/icon';

const { Title, Paragraph } = Typography;

interface ValuesRendererProps {
  content: {
    title?: string;
    subtitle?: string;
    items?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    grid?: {
      columns?: { mobile: number; tablet: number; desktop: number };
      gap?: string;
      alignment?: string;
      justifyContent?: string;
    };
    style?: {
      backgroundColor?: string;
      iconColor?: string;
      cardBackground?: string;
      textAlign?: 'left' | 'center' | 'right';
      iconAlign?: string;
    };
  };
  mode?: 'preview' | 'edit';
}

export const ValuesRenderer: React.FC<ValuesRendererProps> = ({ content }) => {
  const {
    title = 'Pourquoi Nous Choisir ?',
    subtitle = '',
    items = [],
    grid = {},
    style = {}
  } = content;

  const {
    columns = { mobile: 1, tablet: 2, desktop: 4 },
    gap = '24px',
    justifyContent = 'center'
  } = grid;

  const {
    backgroundColor = '#f9fafb',
    iconColor = '#10b981',
    cardBackground = '#ffffff',
    textAlign = 'center',
    iconAlign = 'center'
  } = style;

  // Calculer les spans de colonnes pour Ant Design Grid
  const getColSpan = () => {
    return {
      xs: Math.floor(24 / columns.mobile),
      sm: Math.floor(24 / columns.tablet),
      md: Math.floor(24 / columns.desktop)
    };
  };

  return (
    <div style={{ background: backgroundColor, padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Paragraph style={{ fontSize: '18px', color: '#64748b', marginTop: '16px' }}>
              {subtitle}
            </Paragraph>
          )}
        </div>

        {/* Grille de valeurs avec configuration grid */}
        <Row gutter={[parseInt(gap), parseInt(gap)]} justify={justifyContent as any}>
          {items.map((item, index) => (
            <Col {...getColSpan()} key={index}>
              <Card 
                bordered={false} 
                style={{ 
                  textAlign: textAlign,
                  height: '100%',
                  background: cardBackground,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                <Space 
                  direction="vertical" 
                  size="middle" 
                  style={{ 
                    width: '100%',
                    alignItems: iconAlign as any
                  }}
                >
                  <div>
                    {renderIconNode(item.icon, {
                      size: '48px',
                      color: iconColor
                    }) || <CheckCircleOutlined style={{ fontSize: '48px', color: iconColor }} />}
                  </div>
                  <Title level={4} style={{ margin: 0 }}>{item.title}</Title>
                  <Paragraph style={{ color: '#64748b', margin: 0 }}>
                    {item.description}
                  </Paragraph>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default ValuesRenderer;
