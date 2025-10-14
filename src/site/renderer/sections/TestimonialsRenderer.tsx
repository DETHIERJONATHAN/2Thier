import React from 'react';
import { Card, Carousel, Space, Typography } from 'antd';
import { StarFilled } from '@ant-design/icons';
import { RenderText } from '../components/RenderText';

const { Title, Paragraph, Text } = Typography;

/**
 * 🎨 TESTIMONIALS RENDERER - REPRODUCTION EXACTE SITE VITRINE 2THIER
 */

interface TestimonialsRendererProps {
  content: any;
  mode: 'preview' | 'edit';
}

export const TestimonialsRenderer: React.FC<TestimonialsRendererProps> = ({ content }) => {
  const {
    title = null,
    subtitle = null,
    items = [],
    style = {},
    autoplay = true,
    autoplaySpeed = 5000
  } = content;

  return (
    <div style={{
      background: style.backgroundColor || '#f9fafb',
      padding: style.padding || '80px 24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* HEADER */}
        {(title || subtitle) && (
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            {title && (
              <Title level={2} style={{
                fontSize: title.fontSize || 'clamp(28px, 6vw, 42px)',
                color: title.color || '#111827',
                fontWeight: title.fontWeight || 'bold',
                margin: 0
              }}>
                <RenderText value={title.text} />
              </Title>
            )}
            {subtitle && (
              <Paragraph style={{
                fontSize: subtitle.fontSize || '18px',
                color: subtitle.color || '#6b7280',
                margin: '16px 0 0'
              }}>
                <RenderText value={subtitle.text} />
              </Paragraph>
            )}
          </div>
        )}

        {/* CAROUSEL */}
        <Carousel autoplay={autoplay} autoplaySpeed={autoplaySpeed} dots={{ className: 'custom-dots' }}>
          {items.map((testimonial: any, index: number) => (
            <div key={index}>
              <Card
                style={{
                  maxWidth: '800px',
                  margin: '0 auto',
                  padding: '24px',
                  borderRadius: '16px'
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* STARS */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <StarFilled key={i} style={{ color: '#faad14', fontSize: '24px' }} />
                    ))}
                  </div>

                  {/* TEXT */}
                  <Paragraph style={{ fontSize: '18px', fontStyle: 'italic', margin: 0 }}>
                    "<RenderText value={testimonial.text} />"
                  </Paragraph>

                  {/* AUTHOR */}
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>
                      {testimonial.name}
                    </Text>
                    <br />
                    <Text type="secondary">
                      {testimonial.location}
                    </Text>
                  </div>
                </Space>
              </Card>
            </div>
          ))}
        </Carousel>

        {/* FOOTER NOTE */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Text style={{ fontSize: '16px' }}>
            📊 Note moyenne : <Text strong>4.9/5</Text> sur 124 avis Google Reviews
          </Text>
        </div>
      </div>
    </div>
  );
};
