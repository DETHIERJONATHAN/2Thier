import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { renderIconNode } from '../utils/icon';

/**
 * 🎨 STATS RENDERER - REPRODUCTION EXACTE SITE VITRINE 2THIER
 */

// 🔧 Helper pour ajouter 'px' aux valeurs numériques
const ensureUnit = (value: string | number | undefined, defaultValue: string): string => {
  if (!value) return defaultValue;
  const str = String(value);
  if (/^\d+$/.test(str)) return `${str}px`;
  return str;
};

interface StatsRendererProps {
  content: any;
  mode: 'preview' | 'edit';
}

export const StatsRenderer: React.FC<StatsRendererProps> = ({ content }) => {
  const {
    title: _title = '',
    subtitle: _subtitle = '',
    items = [],
    style = {},
    layout = {}
  } = content;

  // 🔥 Configuration de grille depuis schema ou defaults
  // Rétrocompatibilité: layout.grid peut être soit GridConfig complet, soit juste {mobile, tablet, desktop}
  const gridConfig = layout.grid || {};
  
  // Extraire les colonnes (nouveau format: grid.columns, ancien format: grid directement)
  const columnsConfig = gridConfig.columns || gridConfig;
  const columns = typeof columnsConfig === 'object' ? (columnsConfig.desktop || 4) : columnsConfig;
  
  // Extraire gap et autres propriétés (nouveau format uniquement)
  const gridGap = gridConfig.gap || style.gap || '24px';
  const gutterValue = parseInt(gridGap) || 24;
  
  const spanMap: Record<number, number> = { 1: 24, 2: 12, 3: 8, 4: 6 };
  const mdSpan = spanMap[columns] || 6;

  return (
    <div style={{
      background: style.backgroundColor || '#f9fafb',
      padding: style.padding || '60px 24px'
    }}>
      <Row gutter={[gutterValue, gutterValue]} justify="center">
        {items.map((stat: any, index: number) => {
          const iconNode = renderIconNode(stat.icon, {
            size: ensureUnit(style.iconSize, '48px'),
            color: style.iconColor
          }) || <CheckCircleOutlined style={{ fontSize: ensureUnit(style.iconSize, '48px'), color: style.iconColor }} />;

          return (
            <Col xs={24} sm={12} md={mdSpan} key={index}>
              <Card
                bordered={false}
                style={{
                  textAlign: 'center',
                  background: style.cardBackground || 'white',
                  borderRadius: ensureUnit(style.cardBorderRadius, '12px'),
                  boxShadow: style.cardShadow || '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                <div style={{ 
                  fontSize: ensureUnit(style.iconSize, '48px'), 
                  marginBottom: '8px',
                  color: style.iconColor || undefined
                }}>
                  {iconNode}
                </div>
                <Statistic
                  title={stat.label}
                  value={stat.value}
                  valueStyle={{
                    color: stat.valueColor || '#10b981',
                    fontSize: ensureUnit(stat.valueFontSize, '32px'),
                    fontWeight: stat.valueFontWeight || 'bold'
                  }}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
