/**
 * 🚀 PROCESS RENDERER
 * 
 * Renderer pour la section processus/étapes.
 * Utilise le composant Steps d'Ant Design.
 * 
 * @module site/renderer/sections/ProcessRenderer
 * @author 2Thier CRM Team
 */

import React from 'react';
import { Steps, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { renderIconNode } from '../utils/icon';

const { Title, Paragraph } = Typography;

interface ProcessRendererProps {
  content: {
    title?: string;
    subtitle?: string;
    steps?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    style?: {
      backgroundColor?: string;
      iconColor?: string;
      lineColor?: string;
      textAlign?: 'left' | 'center' | 'right';
      stepsDirection?: 'horizontal' | 'vertical';
      iconPosition?: 'top' | 'left';
    };
  };
  mode?: 'preview' | 'edit';
}

export const ProcessRenderer: React.FC<ProcessRendererProps> = ({ content }) => {
  const {
    title = 'Comment Ça Marche ?',
    subtitle = '',
    steps = [],
    style = {}
  } = content;

  const {
    backgroundColor = '#ffffff',
    iconColor = '#10b981',
    lineColor = '#10b981',
    textAlign = 'center',
    stepsDirection = 'horizontal',
    iconPosition = 'top'
  } = style;

  return (
    <div style={{ background: backgroundColor, padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Titre */}
        <div style={{ textAlign: textAlign as any, marginBottom: '60px' }}>
          <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Paragraph style={{ fontSize: '18px', color: '#64748b', marginTop: '16px' }}>
              {subtitle}
            </Paragraph>
          )}
        </div>

        {/* Steps avec direction configurable */}
        <Steps
          current={-1} // Pas d'étape active (toutes complétées)
          direction={stepsDirection}
          labelPlacement={iconPosition === 'top' ? 'vertical' : 'horizontal'}
          items={steps.map((step) => ({
            title: step.title,
            description: step.description,
            icon:
              renderIconNode(step.icon, {
                size: '32px',
                color: iconColor
              }) || <CheckCircleOutlined />
          }))}
          responsive
          style={{
            '--ant-steps-icon-color': iconColor,
            '--ant-steps-finish-color': lineColor,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

export default ProcessRenderer;
