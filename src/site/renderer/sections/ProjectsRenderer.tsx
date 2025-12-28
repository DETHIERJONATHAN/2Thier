/**
 * 📸 PROJECTS RENDERER
 * 
 * Renderer pour la section projets/réalisations.
 * Affiche une galerie de projets avec images, tags et détails.
 * 
 * @module site/renderer/sections/ProjectsRenderer
 * @author 2Thier CRM Team
 */

import React from 'react';
import { Row, Col, Card, Typography, Tag, Button, Space } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface ProjectsRendererProps {
  content: {
    title?: string;
    subtitle?: string;
    showAllLink?: boolean;
    items?: Array<{
      image: string;
      title: string;
      location: string;
      details: string;
      tags: string[];
      date?: string;
    }>;
    layout?: {
      grid?: {
        columns?: { mobile: number; tablet: number; desktop: number };
        gap?: string;
      };
    };
    style?: {
      backgroundColor?: string;
      tagColor?: string;
    };
  };
  mode?: 'preview' | 'edit';
}

export const ProjectsRenderer: React.FC<ProjectsRendererProps> = ({ content, mode = 'preview' }) => {
  const {
    title = 'Nos Dernières Réalisations',
    subtitle = '',
    showAllLink = true,
    items = [],
    layout = {},
    style = {}
  } = content;

  const { grid = { columns: { mobile: 1, tablet: 2, desktop: 4 }, gap: '24px' } } = layout;
  const { backgroundColor = '#ffffff', tagColor = '#10b981' } = style;

  const gutter = parseInt(grid.gap || '24px');

  return (
    <div style={{ background: backgroundColor, padding: '80px 24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
          {showAllLink && (
            <Button type="link" style={{ fontSize: '16px', marginTop: '8px' }}>
              Voir toutes nos réalisations →
            </Button>
          )}
        </div>

        {/* Grille de projets */}
        <Row gutter={[gutter, gutter]}>
          {items.map((project, index) => (
            <Col 
              xs={24 / grid.columns.mobile} 
              sm={24 / grid.columns.tablet} 
              md={24 / grid.columns.desktop} 
              key={index}
            >
              <Card
                hoverable
                cover={
                  <img 
                    alt={project.title} 
                    src={project.image} 
                    style={{ 
                      height: '200px', 
                      objectFit: 'cover',
                      borderRadius: '12px 12px 0 0'
                    }} 
                  />
                }
                style={{ 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '1px solid #f1f5f9'
                }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Title level={5} style={{ margin: 0 }}>{project.title}</Title>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    <EnvironmentOutlined /> {project.location}
                  </Text>
                  <Paragraph style={{ fontSize: '13px', margin: '8px 0' }}>
                    {project.details}
                  </Paragraph>
                  <Space wrap size="small">
                    {project.tags.map((tag) => (
                      <Tag key={tag} color="green" style={{ borderColor: tagColor, color: tagColor }}>
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                  {project.date && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>{project.date}</Text>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default ProjectsRenderer;
