import React from 'react';
import { Card, Row, Col, Space, List, Button, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { RenderText } from '../components/RenderText';
import { renderIconNode, resolveIconValue } from '../utils/icon';
import { usePublicFormModal } from '../../hooks/usePublicFormModal';
import { WebsiteFormModal } from '../../components/WebsiteFormModal';
import '../../../styles/site-responsive.css';
import { getResponsivePadding } from '../utils/responsive';

const { Title, Paragraph, Text } = Typography;

const normalizeSingleValue = (input: any): string | undefined => {
  if (Array.isArray(input)) {
    return input.length > 0 ? String(input[0]).trim() || undefined : undefined;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

/**
 * 🎨 SERVICES RENDERER - 100% MOBILE RESPONSIVE
 * Lecture dynamique des données avec grilles adaptatives
 */

interface ServicesRendererProps {
  content: any;
  mode: 'preview' | 'edit';
}

export const ServicesRenderer: React.FC<ServicesRendererProps> = ({ content }) => {
  const { openFormModal, modalProps } = usePublicFormModal();
  
  const {
    title = null,
    subtitle = null,
    items = [],
    style = {},
    layout = {}
  } = content;

  // 🔥 Configuration de grille depuis schema ou defaults
  // Rétrocompatibilité: layout.grid peut être soit GridConfig complet, soit juste {mobile, tablet, desktop}
  const gridConfig = layout.grid || {};
  
  // Extraire les colonnes (nouveau format: grid.columns, ancien format: grid directement)
  const columnsConfig = gridConfig.columns || gridConfig;
  const grid = typeof columnsConfig === 'object' && 'mobile' in columnsConfig 
    ? columnsConfig 
    : { mobile: 1, tablet: 2, desktop: 4 };
  
  // Extraire gap (nouveau format: grid.gap, ancien format: layout.gap)
  const gap = gridConfig.gap || layout.gap || '24px';

  return (
    <div className="site-section" style={{
      backgroundColor: style.backgroundColor || '#ffffff',
      padding: style.padding || getResponsivePadding('medium')
    }}>
      <div className="site-container" style={{
        maxWidth: layout?.maxWidth || '1400px',
        margin: '0 auto'
      }}>
        {/* HEADER */}
        {(title || subtitle) && (
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            {title && (
              <Title level={2} style={{
                fontSize: style.titleFontSize || 'clamp(28px, 6vw, 42px)',
                color: style.titleColor || '#111827',
                fontWeight: 'bold',
                margin: 0
              }}>
                <RenderText value={typeof title === 'string' ? title : title.text || title} />
              </Title>
            )}
            {subtitle && (
              <Paragraph style={{
                fontSize: style.subtitleFontSize || '18px',
                color: style.subtitleColor || '#64748b',
                maxWidth: '700px',
                margin: '16px auto 0'
              }}>
                <RenderText value={typeof subtitle === 'string' ? subtitle : subtitle.text || subtitle} />
              </Paragraph>
            )}
          </div>
        )}

        {/* SERVICES GRID */}
        <Row gutter={[parseInt(gap), parseInt(gap)]}>
          {items.map((service: any, index: number) => {
            const legacyImage = service.image;

            const normalizedImage = (() => {
              if (!legacyImage) return '';
              if (typeof legacyImage === 'string') return legacyImage;
              return legacyImage.url || legacyImage.src || legacyImage.path || '';
            })();

            let iconSource = service.icon as any;

            if ((!iconSource || resolveIconValue(iconSource).type === 'none') && normalizedImage) {
              iconSource = { mode: 'image', image: normalizedImage };
            }

            if (service.iconType === 'image' && normalizedImage) {
              iconSource = { mode: 'image', image: normalizedImage };
            }

            const legacyCtaText = service.ctaText;
            const legacyCtaUrl = service.ctaUrl;
            const ctaConfig = service.cta || {};
            const actionType = ctaConfig.actionType || (legacyCtaUrl ? 'external-url' : legacyCtaText ? 'contact-form' : 'none');
            const buttonText = ctaConfig.text || legacyCtaText;

            let href: string | undefined;
            let target: string | undefined;
            let formId: string | undefined;

            if (actionType && actionType !== 'none') {
              switch (actionType) {
                case 'contact-form': {
                  const formAnchor = normalizeSingleValue(ctaConfig.formAnchor);
                  if (formAnchor && formAnchor.startsWith('form:')) {
                    // 🔥 Nouveau format: form:ID
                    formId = formAnchor.replace('form:', '');
                  } else {
                    // Ancien format: ancre #contact
                    href = formAnchor || '#contact';
                  }
                  break;
                }
                case 'scroll-to-section': {
                  href = normalizeSingleValue(ctaConfig.sectionAnchor);
                  break;
                }
                case 'internal-page': {
                  href = normalizeSingleValue(ctaConfig.pageSlug) || undefined;
                  break;
                }
                case 'external-url': {
                  href = normalizeSingleValue(ctaConfig.customUrl) || legacyCtaUrl;
                  if (href) {
                    const trimmed = href.trim();
                    href = trimmed.length ? trimmed : undefined;
                    if (href && /^https?:/i.test(href)) {
                      target = '_blank';
                    }
                  }
                  break;
                }
                default: {
                  href = legacyCtaUrl;
                }
              }
            }

            const hasButton = Boolean(buttonText && (href || formId));

            // 🔥 Handler pour ouvrir la modal de formulaire
            const handleCtaClick = (event: React.MouseEvent<HTMLElement>) => {
              if (actionType === 'contact-form' && formId) {
                event.preventDefault();
                openFormModal(formId);
              }
              // Sinon, laisser le href faire son travail
            };

            return (
              <Col 
                xs={24} 
                sm={24 / (grid.tablet || 2)} 
                md={24 / (grid.tablet || 2)} 
                lg={24 / (grid.desktop || 4)} 
                key={index}
              >
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: style.cardBorderRadius || '12px',
                    border: `1px solid ${style.cardBorder || '#f1f5f9'}`,
                    backgroundColor: style.cardBackground || '#ffffff'
                  }}
                  styles={{ body: { padding: '24px' } }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* VISUEL DYNAMIQUE */}
                    {resolveIconValue(iconSource).type !== 'none' && (
                      <div>
                        {renderIconNode(iconSource, {
                          size: service.iconSize || '32px',
                          color: service.iconColor
                        }) || (
                          <CheckCircleOutlined
                            style={{ fontSize: service.iconSize || '32px', color: service.iconColor || '#10b981' }}
                          />
                        )}
                      </div>
                    )}

                    {/* TITLE */}
                    <Title level={4} style={{ 
                      margin: 0, 
                      fontSize: style.serviceTitleFontSize || '18px',
                      color: style.serviceTitleColor || '#111827'
                    }}>
                      <RenderText value={service.title} />
                    </Title>

                    {/* DESCRIPTION */}
                    <Paragraph style={{ 
                      color: style.serviceDescriptionColor || '#64748b', 
                      fontSize: style.serviceDescriptionFontSize || '14px', 
                      margin: 0 
                    }}>
                      <RenderText value={service.description} />
                    </Paragraph>

                    {/* FEATURES LIST */}
                    {service.features && service.features.length > 0 && (
                      <List
                        size="small"
                        dataSource={service.features}
                        renderItem={(item: string) => (
                          <List.Item style={{ padding: '4px 0', border: 'none' }}>
                            <Text style={{ fontSize: '13px', color: '#374151' }}>
                              <CheckCircleOutlined style={{ 
                                color: style.featureCheckColor || '#10b981', 
                                marginRight: '8px' 
                              }} />
                              {item}
                            </Text>
                          </List.Item>
                        )}
                      />
                    )}

                    {/* CTA BUTTON */}
                    {hasButton && (
                      <Button
                        type="primary"
                        block
                        href={href}
                        target={target}
                        rel={target === '_blank' ? 'noreferrer' : undefined}
                        onClick={handleCtaClick}
                        style={{
                          backgroundColor: style.ctaBackgroundColor || '#10b981',
                          borderColor: style.ctaBorderColor || '#10b981',
                          color: style.ctaTextColor || '#ffffff',
                          marginTop: 'auto'
                        }}
                      >
                        <RenderText value={buttonText} />
                      </Button>
                    )}
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* MODAL DE FORMULAIRE */}
      <WebsiteFormModal {...modalProps} />
    </div>
  );
};

