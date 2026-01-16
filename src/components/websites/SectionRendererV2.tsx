/**
 * 🎨 SECTION RENDERER V2 - ULTRA PIXEL-PERFECT
 * 
 * Ce composant est un TRADUCTEUR VISUEL :
 * - Il prend les données JSON de la BDD
 * - Il les transforme en rendu HTML/CSS exact
 * - Respecte 100% les couleurs, textes, tailles, espacements
 * - 1000% mobile responsive
 * - Support complet des animations
 * - Logos, images, icônes, formulaires
 */

import React, { useEffect, useState } from 'react';
import './animations.css'; // 🎨 ANIMATIONS CSS
import { 
  Card, Row, Col, Typography, Button, Space, Statistic, Carousel, Steps, Tag, List, 
  Form, Input, Select, message, Divider, Spin
} from 'antd';
import * as Icons from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { GridRenderer } from './GridRenderer';
import { SectionHeaderRenderer } from './SectionHeaderRenderer';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// ============================================================
// TYPES
// ============================================================

interface Section {
  id: number;
  key: string;
  type: string;
  name: string;
  content: any;
  backgroundColor?: string;
  textColor?: string;
  isActive: boolean;
  websiteId: number;
}

interface SectionRendererProps {
  section: Section;
  previewMode?: boolean; // Mode preview pour Canvas (désactive interactions)
}

// ============================================================
// ICON MAPPING - Mapping dynamique de TOUTES les icônes Ant Design
// ============================================================

const getIcon = (iconName: string, size = '48px', color?: string): React.ReactNode => {
  if (!iconName) return null;
  
  // Créer le style pour l'icône
  const style = { fontSize: size, color: color || '#10b981' };
  
  // Récupérer le composant d'icône dynamiquement
  const IconComponent = (Icons as any)[iconName];
  
  // Si l'icône existe, la retourner avec le style
  if (IconComponent) {
    return <IconComponent style={style} />;
  }
  
  // Sinon, retourner l'emoji/texte brut
  return <span style={{ fontSize: size, color: color || '#10b981' }}>{iconName}</span>;
};

// ============================================================
// HELPERS
// ============================================================

const getText = (field: any, defaultText = ''): string => {
  if (!field) return defaultText;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.text) return field.text;
  return defaultText;
};

const getColor = (field: any, defaultColor = '#000000'): string => {
  if (typeof field === 'string') return defaultColor;
  if (typeof field === 'object' && field.color) return field.color;
  return defaultColor;
};

const getFontSize = (field: any, defaultSize = '16px'): string => {
  if (typeof field === 'string') return defaultSize;
  if (typeof field === 'object' && field.fontSize) return field.fontSize;
  return defaultSize;
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const SectionRendererV2: React.FC<SectionRendererProps> = ({ section, previewMode = false }) => {
  const { api } = useAuthenticatedApi();
  const [form] = Form.useForm();
  
  // États pour les données dynamiques
  const [services, setServices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * 🎯 Wrapper universel qui inclut SectionHeader et GridLayout
   */
  const renderWithEnhancements = (content: React.ReactNode) => {
    return (
      <>
        {/* HEADER DE SECTION */}
        {section.sectionHeader && (
          <SectionHeaderRenderer config={section.sectionHeader} />
        )}
        
        {/* CONTENU (potentiellement dans GridRenderer) */}
        {section.gridLayout ? (
          <GridRenderer config={section.gridLayout}>
            {content}
          </GridRenderer>
        ) : (
          content
        )}
      </>
    );
  };

  // Charger les données dynamiques
  useEffect(() => {
    if (section.content?.dataSource === 'dynamic') {
      loadDynamicData();
    }
  }, [section.type]);

  const loadDynamicData = async () => {
    setLoading(true);
    try {
      if (section.type === 'services') {
        console.log('🔍 [SectionRendererV2] Chargement services pour websiteId:', section.websiteId);
        const data = await api.get(`/api/website-services/${section.websiteId}`);
        console.log('✅ [SectionRendererV2] Services chargés:', data);
        setServices(data || []);
      } else if (section.type === 'projects') {
        const data = await api.get(`/api/website-projects/${section.websiteId}`);
        setProjects(data || []);
      } else if (section.type === 'testimonials') {
        const data = await api.get(`/api/website-testimonials/${section.websiteId}`);
        setTestimonials(data || []);
      }
    } catch (error) {
      console.error('❌ [SectionRendererV2] Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler formulaire de contact
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      await api.post('/api/contact-form', {
        ...values,
        websiteId: section.websiteId
      });
      message.success(section.content.contactForm?.successMessage || 'Message envoyé !');
      form.resetFields();
    } catch (error) {
      message.error(section.content.contactForm?.errorMessage || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // RENDU PAR TYPE DE SECTION
  // ============================================================

  const { content } = section;
  
  // Variables de style globales
  const bgColor = content?.backgroundColor || '#ffffff';
  const textColor = content?.textColor || '#333333';

  // 1. HEADER STICKY
  if (section.type === 'header') {
    const logo = content.logo || {};
    const navigation = content.navigation || [];
    const ctaButton = content.ctaButton || {};

    return renderWithEnhancements(


      <div
        style={{
          position: previewMode ? 'relative' : (content.sticky ? 'fixed' : 'relative'),
          top: 0,
          width: '100%',
          zIndex: content.zIndex || 1000,
          background: content.backgroundColor || 'rgba(255, 255, 255, 0.98)',
          boxShadow: content.boxShadow || '0 2px 8px rgba(0,0,0,0.06)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}
      >
        <Title
          level={3}
          style={{
            margin: 0,
            color: logo.color || '#10b981',
            fontSize: logo.fontSize || '24px',
            fontWeight: logo.fontWeight || 'bold'
          }}
        >
          {logo.emoji} {logo.text || 'LOGO'}
        </Title>
        
        <Space size="large" style={{ display: window.innerWidth > 768 ? 'flex' : 'none' }}>
          {navigation.map((item: any, idx: number) => (
            <a key={idx} href={item.href} style={{ color: '#64748b', fontWeight: 500 }}>
              {item.label}
            </a>
          ))}
        </Space>

        <Button
          type="primary"
          size={ctaButton.size || 'large'}
          href={ctaButton.href}
          style={{
            backgroundColor: ctaButton.backgroundColor || '#10b981',
            borderColor: ctaButton.borderColor || '#10b981'
          }}
        >
          {ctaButton.text || 'CTA'}
        </Button>
      </div>
    


    );
  }

  // 2. HERO SECTION
  if (section.type === 'hero') {
    const title = content.title || {};
    const subtitle = content.subtitle || {};
    const buttons = content.buttons || [];
    const badge = content.badge || {};

    return renderWithEnhancements(


      <div
        className="gradient-animated" // 🎨 Animation gradient
        style={{
          background: content.backgroundGradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          minHeight: content.minHeight || '500px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '1200px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title
              level={1}
              className="animate-fade-in" // 🎨 Animation entrée
              style={{
                color: getColor(title, 'white'),
                fontSize: getFontSize(title, 'clamp(32px, 8vw, 56px)'),
                margin: 0,
                fontWeight: title.fontWeight || 'bold'
              }}
            >
              {getText(title, 'Titre Hero')}
            </Title>

            <Paragraph
              style={{
                color: getColor(subtitle, 'rgba(255,255,255,0.95)'),
                fontSize: getFontSize(subtitle, 'clamp(16px, 4vw, 20px)'),
                maxWidth: subtitle.maxWidth || '800px',
                margin: '0 auto',
                whiteSpace: 'pre-line'
              }}
            >
              {getText(subtitle, 'Sous-titre')}
            </Paragraph>

            <Space size="middle" wrap>
              {buttons.map((btn: any, idx: number) => (
                <Button
                  key={idx}
                  type={idx === 0 ? 'primary' : 'default'}
                  size="large"
                  icon={btn.icon ? getIcon(btn.icon, '18px', btn.textColor) : null}
                  href={btn.href}
                  style={{
                    height: 'auto',
                    padding: btn.padding || '16px 32px',
                    fontSize: btn.fontSize || '18px',
                    backgroundColor: btn.backgroundColor || 'white',
                    borderColor: btn.borderColor || 'white',
                    color: btn.textColor || '#10b981',
                    fontWeight: btn.fontWeight || 'normal'
                  }}
                >
                  {btn.text}
                </Button>
              ))}
            </Space>

            {badge.text && (
              <div style={{ marginTop: '20px' }}>
                <Text
                  style={{
                    color: badge.color || 'rgba(255,255,255,0.9)',
                    fontSize: badge.fontSize || '16px'
                  }}
                >
                  {badge.icon && getIcon(badge.icon, '16px', badge.color)} {badge.text}
                </Text>
              </div>
            )}
          </Space>
        </div>
      </div>
    


    );
  }

  // 3. STATS SECTION
  if (section.type === 'stats') {
    const stats = content.items || content.stats || [];
    const cardStyle = content.cardStyle || {};
    const layout = content.layout || {};
    const gridConfig = layout.grid || {};
    const style = content.style || {};

    // 🔥 FIX: Lire columns depuis la nouvelle structure layout.grid.columns
    const columns = gridConfig.columns || cardStyle.columns || 4;
    const spanMap = { 2: 12, 3: 8, 4: 6 };
    
    // 🔥 FIX: Lire gap depuis layout.grid.gap ou style
    const gap = gridConfig.gap || style.gridGap || cardStyle.gap || '24px';
    const gutter = [parseInt(gap), parseInt(gap)];

    return renderWithEnhancements(


      <div style={{ background: content.backgroundColor || '#f9fafb', padding: style.padding || content.padding || '32px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Row gutter={gutter} justify={layout.alignment || 'center'}>
            {stats.map((stat: any, idx: number) => (
              <Col xs={24} sm={12} md={spanMap[columns] || 6} key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                <Card
                  hoverable={style.hoverable !== false && cardStyle.hoverable !== false}
                  variant={style.bordered === false || cardStyle.bordered === false ? 'borderless' : 'outlined'}
                  className={`stagger-item hover-lift`}
                  style={{
                    textAlign: layout.alignment || cardStyle.textAlign || 'center',
                    maxWidth: style.maxWidth || cardStyle.maxWidth || '100%',
                    width: '100%',
                    minHeight: style.minHeight || cardStyle.minHeight,
                    background: style.cardBackground || cardStyle.backgroundColor || 'white',
                    borderRadius: style.borderRadius || cardStyle.borderRadius || '12px',
                    boxShadow: style.boxShadow || cardStyle.boxShadow || '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  styles={{
                    body: {
                      padding: style.cardPadding || cardStyle.padding || '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }
                  }}
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{
                      width: '100%',
                      alignItems: layout.alignment === 'left' ? 'flex-start' : 
                                  layout.alignment === 'right' ? 'flex-end' : 
                                  cardStyle.textAlign === 'left' ? 'flex-start' : 
                                  cardStyle.textAlign === 'right' ? 'flex-end' : 'center',
                      justifyContent: 'flex-start',
                      height: '100%'
                    }}
                  >
                    <div style={{ 
                      fontSize: stat.iconSize || style.iconSize || cardStyle.iconSize || '48px',
                      lineHeight: 1
                    }}>
                      {getIcon(stat.icon, stat.iconSize || style.iconSize || cardStyle.iconSize || '48px', stat.iconColor || style.iconColor || cardStyle.iconColor || '#10b981')}
                    </div>
                    
                    <Statistic
                      title={stat.label}
                      value={stat.value}
                      valueStyle={{
                        color: stat.valueColor || style.valueColor || cardStyle.valueColor || '#1f2937',
                        fontSize: style.valueFontSize || cardStyle.valueFontSize || '40px',
                        fontWeight: stat.fontWeight || style.fontWeight || 'bold'
                      }}
                      style={{ 
                        textAlign: layout.alignment || cardStyle.textAlign || 'center',
                        width: '100%'
                      }}
                    />

                    {stat.description && (
                      <Paragraph 
                        style={{ 
                          fontSize: stat.fontSize || style.labelFontSize || cardStyle.labelFontSize || '14px',
                          color: stat.color || style.labelColor || cardStyle.labelColor || '#6b7280',
                          margin: 0,
                          flex: 1
                        }}
                      >
                        {stat.description}
                      </Paragraph>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    


    );
  }

  // 4. SERVICES SECTION (Dynamique)
  if (section.type === 'services') {
    const heading = content.heading || {};
    const columns = content.columns || { xs: 1, sm: 2, md: 2, lg: 4 };
    const cardStyle = content.cardStyle || {};
    const ctaButtonStyle = content.ctaButtonStyle || {};

    // Calculer l'espacement
    const gutter = cardStyle.gap ? [parseInt(cardStyle.gap), parseInt(cardStyle.gap)] : [24, 24];

    if (loading) return <Spin size="large" />;

    return renderWithEnhancements(


      <div style={{ background: content.backgroundColor || '#ffffff', padding: content.padding || '40px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: heading.textAlign || 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ fontSize: heading.titleSize || 'clamp(28px, 6vw, 42px)', color: heading.titleColor }}>
              {getIcon(heading.emoji, '32px', heading.titleColor) || heading.emoji} {heading.title}
            </Title>
            <Paragraph style={{ fontSize: heading.subtitleSize || '18px', color: heading.subtitleColor, maxWidth: '700px', margin: '16px auto 0' }}>
              {heading.subtitle}
            </Paragraph>
          </div>

          <Row gutter={gutter} justify="center">
            {services.map((service: any) => (
              <Col {...columns} key={service.key} style={{ display: 'flex', justifyContent: 'center' }}>
                <Card
                  hoverable={cardStyle.hoverable !== false}
                  style={{
                    height: cardStyle.height || '100%',
                    maxWidth: cardStyle.maxWidth || '100%',
                    width: '100%',
                    borderRadius: cardStyle.borderRadius || '12px',
                    border: cardStyle.border || '2px solid #f1f5f9',
                    textAlign: cardStyle.textAlign || 'left',
                    boxShadow: cardStyle.boxShadow
                  }}
                  styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <Space 
                    direction="vertical" 
                    size="middle" 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: cardStyle.textAlign === 'left' ? 'flex-start' : 
                                  cardStyle.textAlign === 'right' ? 'flex-end' : 
                                  cardStyle.textAlign === 'center' ? 'center' : 'flex-start',
                      justifyContent: 'flex-start'
                    }}
                  >
                    <div style={{ 
                      fontSize: service.iconSize || cardStyle.iconSize || '48px',
                      color: service.iconColor || cardStyle.iconColor || '#10b981',
                      lineHeight: 1
                    }}>
                      {getIcon(
                        service.icon, 
                        service.iconSize || cardStyle.iconSize || '48px', 
                        service.iconColor || cardStyle.iconColor || '#10b981'
                      ) || service.icon}
                    </div>
                    <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                      {service.title}
                    </Title>
                    <Paragraph style={{ color: '#64748b', fontSize: '14px', margin: 0, flex: 1 }}>
                      {service.description}
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={service.features || []}
                      renderItem={(item: string) => {
                        const CheckIcon = (Icons as any).CheckCircleOutlined;
                        return (
                          <List.Item style={{ padding: '4px 0', border: 'none' }}>
                            <Text style={{ fontSize: '13px' }}>
                              {CheckIcon && <CheckIcon style={{ color: '#10b981', marginRight: '8px' }} />}
                              {item}
                            </Text>
                          </List.Item>
                        );
                      }}
                    />
                    <Button
                      type={ctaButtonStyle.type || 'primary'}
                      block={ctaButtonStyle.block}
                      style={{
                        backgroundColor: ctaButtonStyle.backgroundColor || '#10b981',
                        borderColor: ctaButtonStyle.borderColor || '#10b981',
                        marginTop: 'auto'
                      }}
                    >
                      {service.cta}
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    


    );
  }

  // 5. VALUES SECTION
  if (section.type === 'values') {
    const heading = content.heading || {};
    const values = content.values || [];
    const layout = content.layout || { xs: 1, sm: 2, md: 4 };
    const cardStyle = content.cardStyle || {};

    // Calculer l'espacement (gutter) depuis cardStyle.gap
    const gutter = cardStyle.gap ? [parseInt(cardStyle.gap), parseInt(cardStyle.gap)] : [32, 32];

    return renderWithEnhancements(


      <div style={{ background: content.backgroundColor || '#f9fafb', padding: content.padding || '40px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: heading.textAlign || 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ fontSize: heading.titleSize, color: heading.titleColor }}>
              {getIcon(heading.emoji, '32px', heading.titleColor) || heading.emoji} {heading.title}
            </Title>
          </div>

          <Row gutter={gutter} justify="center">
            {values.map((value: any, idx: number) => (
              <Col {...layout} key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                <Card 
                  variant={cardStyle.bordered === false ? 'borderless' : 'outlined'}
                  style={{ 
                    textAlign: cardStyle.textAlign || 'center',
                    height: cardStyle.height || '100%',
                    minHeight: cardStyle.minHeight,
                    maxWidth: cardStyle.maxWidth || '100%',
                    width: '100%',
                    backgroundColor: cardStyle.backgroundColor,
                    borderRadius: cardStyle.borderRadius,
                    boxShadow: cardStyle.boxShadow,
                    border: cardStyle.bordered === false ? 'none' : undefined
                  }}
                  styles={{ 
                    body: { 
                      padding: cardStyle.padding || '24px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    } 
                  }}
                >
                  <Space 
                    direction="vertical" 
                    size="middle" 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: cardStyle.textAlign === 'left' ? 'flex-start' : 
                                  cardStyle.textAlign === 'right' ? 'flex-end' : 'center',
                      justifyContent: 'flex-start'
                    }}
                  >
                    <div style={{ 
                      fontSize: value.iconSize || cardStyle.iconSize || '48px',
                      color: value.color || cardStyle.iconColor || '#10b981',
                      lineHeight: 1
                    }}>
                      {getIcon(
                        value.emoji, 
                        value.iconSize || cardStyle.iconSize || '48px', 
                        value.color || cardStyle.iconColor || '#10b981'
                      ) || value.emoji}
                    </div>
                    <Title level={4} style={{ margin: 0 }}>{value.title}</Title>
                    <Paragraph style={{ color: '#64748b', margin: 0, flex: 1 }}>{value.description}</Paragraph>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    


    );
  }

  // 6. PROJECTS SECTION (Dynamique)
  if (section.type === 'projects') {
    const heading = content.heading || {};
    const cardStyle = content.cardStyle || {};
    const columns = cardStyle.columns || 3;
    const spanMap = { 2: 12, 3: 8, 4: 6 };
    const gutter = cardStyle.gap ? [parseInt(cardStyle.gap), parseInt(cardStyle.gap)] : [32, 32];

    if (loading) return <Spin size="large" />;

    // Créer l'overlay style pour les images
    const getOverlayStyle = () => {
      const overlay = cardStyle.imageOverlay || 'none';
      const opacity = cardStyle.imageOverlayOpacity || 0.3;
      
      if (overlay === 'none') return {};
      if (overlay === 'dark') return {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `rgba(0,0,0,${opacity})`,
        pointerEvents: 'none'
      };
      if (overlay === 'light') return {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `rgba(255,255,255,${opacity})`,
        pointerEvents: 'none'
      };
      if (overlay === 'gradient') return {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(to bottom, transparent, rgba(0,0,0,${opacity}))`,
        pointerEvents: 'none'
      };
    };

    return renderWithEnhancements(


      <div style={{ 
        background: content.backgroundColor || '#ffffff',
        padding: content.padding || '40px 24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {content.sectionTitle && (
            <div style={{ textAlign: cardStyle.textAlign || 'center', marginBottom: '32px' }}>
              <Title level={2}>{content.sectionTitle}</Title>
            </div>
          )}

          <Row gutter={gutter} justify="center">
            {projects.map((project: any) => (
              <Col xs={24} sm={12} md={spanMap[columns] || 8} key={project.id} style={{ display: 'flex', justifyContent: 'center' }}>
                <Card
                  hoverable={cardStyle.hoverable !== false}
                  cover={
                    project.image ? (
                      <div style={{ 
                        position: 'relative',
                        height: cardStyle.imageHeight || '250px',
                        overflow: 'hidden'
                      }}>
                        <img 
                          alt={project.title} 
                          src={project.image} 
                          style={{ 
                            height: '100%',
                            width: '100%',
                            objectFit: cardStyle.imageObjectFit || 'cover',
                            transition: cardStyle.imageHoverEffect === 'zoom' ? 'transform 0.3s ease' : 'none'
                          }} 
                          className={cardStyle.imageHoverEffect === 'zoom' ? 'hover-zoom' : ''}
                        />
                        <div style={getOverlayStyle()} />
                      </div>
                    ) : null
                  }
                  style={{
                    height: '100%',
                    maxWidth: cardStyle.maxWidth || '100%',
                    width: '100%',
                    minHeight: cardStyle.minHeight,
                    borderRadius: cardStyle.borderRadius || '16px',
                    overflow: 'hidden',
                    boxShadow: cardStyle.boxShadow || '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: project.backgroundColor || cardStyle.backgroundColor || '#ffffff'
                  }}
                  styles={{
                    body: {
                      padding: cardStyle.contentPadding || '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }
                  }}
                >
                  <Space 
                    direction="vertical" 
                    size="small" 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      alignItems: cardStyle.textAlign === 'left' ? 'flex-start' : 
                                  cardStyle.textAlign === 'right' ? 'flex-end' : 'center',
                      textAlign: cardStyle.textAlign || 'left'
                    }}
                  >
                    <Title 
                      level={5} 
                      style={{ 
                        margin: 0,
                        fontSize: cardStyle.titleFontSize || '20px',
                        color: cardStyle.titleColor || '#1f2937'
                      }}
                    >
                      {project.title}
                    </Title>
                    
                    {project.location && (
                      <Text 
                        type="secondary" 
                        style={{ 
                          fontSize: cardStyle.detailsFontSize || '14px',
                          color: cardStyle.detailsColor || '#6b7280'
                        }}
                      >
                        {(() => {
                          const EnvIcon = (Icons as any).EnvironmentOutlined;
                          return EnvIcon ? <EnvIcon /> : null;
                        })()} {project.location}
                      </Text>
                    )}
                    
                    {project.details && (
                      <Paragraph 
                        style={{ 
                          fontSize: cardStyle.detailsFontSize || '14px',
                          color: cardStyle.detailsColor || '#6b7280',
                          margin: '8px 0',
                          flex: 1
                        }}
                      >
                        {project.details}
                      </Paragraph>
                    )}
                    
                    {project.tags && project.tags.length > 0 && (
                      <Space wrap size="small">
                        {project.tags.map((tag: string) => (
                          <Tag 
                            key={tag} 
                            color={project.badgeColor || '#10b981'}
                            style={{ borderRadius: '12px' }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    )}
                    
                    {project.date && (
                      <Text 
                        type="secondary" 
                        style={{ 
                          fontSize: '12px',
                          color: cardStyle.detailsColor || '#6b7280'
                        }}
                      >
                        {project.date}
                      </Text>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <style>{`
          .hover-zoom:hover {
            transform: scale(1.1);
          }
        `}</style>
      </div>
    


    );
  }

  // 7. TESTIMONIALS SECTION (Dynamique)
  if (section.type === 'testimonials') {
    const heading = content.heading || {};
    const carouselSettings = content.carouselSettings || {};
    const cardStyle = content.cardStyle || {};
    const footer = content.footer || {};

    if (loading) return <Spin size="large" />;

    return renderWithEnhancements(


      <div style={{ background: content.backgroundColor || '#f9fafb', padding: content.padding || '40px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: heading.textAlign || 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ fontSize: heading.titleSize, color: heading.titleColor }}>
              {getIcon(heading.emoji, '32px', heading.titleColor) || heading.emoji} {heading.title}
            </Title>
          </div>

          <Carousel autoplay={carouselSettings.autoplay} dots={carouselSettings.dots}>
            {testimonials.map((testimonial: any) => (
              <div key={testimonial.id}>
                <Card
                  style={{
                    maxWidth: cardStyle.maxWidth || '800px',
                    margin: cardStyle.margin || '0 auto',
                    padding: cardStyle.padding || '24px',
                    borderRadius: cardStyle.borderRadius || '16px'
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {(() => {
                        const StarIcon = (Icons as any).StarFilled;
                        return [...Array(testimonial.rating || 5)].map((_, i) => 
                          StarIcon ? <StarIcon key={i} style={{ color: '#faad14', fontSize: '24px' }} /> : null
                        );
                      })()}
                    </div>
                    <Paragraph style={{ fontSize: '18px', fontStyle: 'italic', margin: 0 }}>
                      "{testimonial.text}"
                    </Paragraph>
                    <div>
                      <Text strong style={{ fontSize: '16px' }}>{testimonial.name}</Text>
                      <br />
                      <Text type="secondary">
                        {testimonial.location} • {testimonial.service} • {testimonial.date}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </div>
            ))}
          </Carousel>

          {footer.text && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Text style={{ fontSize: '16px' }}>{footer.text}</Text>
              <br />
              {footer.linkText && (
                <Button type="link" href={footer.linkHref} style={{ fontSize: '16px' }}>
                  {footer.linkText}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    


    );
  }

  // 8. STEPS/PROCESS SECTION
  if (section.type === 'steps') {
    const heading = content.heading || {};
    const steps = content.steps || [];
    const stepStyle = content.stepStyle || {};

    return renderWithEnhancements(


      <div style={{ padding: content.padding || '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: heading.textAlign || 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ fontSize: heading.titleSize, color: heading.titleColor }}>
            {getIcon(heading.emoji, '32px', heading.titleColor) || heading.emoji} {heading.title}
          </Title>
        </div>

        <Steps
          current={stepStyle.current ?? -1}
          responsive={stepStyle.responsive}
          items={steps.map((step: any) => ({
            title: step.title,
            description: step.description,
            icon: step.icon ? getIcon(step.icon, '24px', stepStyle.color) : null,
            status: step.status
          }))}
        />
      </div>
    


    );
  }

  // 9. CTA SECTION (avec formulaire de contact optionnel)
  if (section.type === 'cta') {
    const heading = content.heading || {};
    const buttons = content.buttons || [];
    const footer = content.footer || {};
    const contactForm = content.contactForm || {};

    return renderWithEnhancements(


      <div
        style={{
          background: content.backgroundGradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: content.padding || '40px 24px',
          textAlign: content.textAlign || 'center'
        }}
      >
        <Space direction="vertical" size="large" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <Title level={2} style={{ color: heading.titleColor || 'white', margin: 0, fontSize: heading.titleSize }}>
            {getIcon(heading.emoji, '32px', heading.titleColor || 'white') || heading.emoji} {heading.title}
          </Title>
          
          <Paragraph style={{ color: heading.subtitleColor, fontSize: heading.subtitleSize, whiteSpace: 'pre-line' }}>
            {heading.subtitle}
          </Paragraph>

          <Space size="large" wrap>
            {buttons.map((btn: any, idx: number) => (
              <Button
                key={idx}
                type="primary"
                size={btn.size || 'large'}
                icon={btn.icon ? getIcon(btn.icon, '18px', btn.textColor) : null}
                href={btn.href}
                style={{
                  background: btn.backgroundColor,
                  borderColor: btn.borderColor,
                  color: btn.textColor,
                  height: 'auto',
                  padding: btn.padding || '16px 32px',
                  fontSize: btn.fontSize || '18px',
                  fontWeight: btn.fontWeight
                }}
              >
                {btn.text}
              </Button>
            ))}
          </Space>

          {footer.text && (
            <Text style={{ color: footer.color, fontSize: footer.fontSize }}>
              {footer.icon && getIcon(footer.icon, '16px', footer.color)} {footer.text}
            </Text>
          )}

          {/* Formulaire de contact intégré - Version Preview */}
          {contactForm.enabled && previewMode && (
            <Card style={{ maxWidth: '600px', margin: '40px auto 0', textAlign: 'left', opacity: 0.7 }}>
              <Title level={4} style={{ marginBottom: '24px', textAlign: 'center' }}>
                Demande de devis gratuit
              </Title>
              <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <Text type="secondary">
                  📝 Formulaire de contact (visible en prévisualisation)
                </Text>
              </div>
            </Card>
          )}

          {/* Formulaire de contact intégré */}
          {contactForm.enabled && !previewMode && (
            <Card style={{ maxWidth: '600px', margin: '40px auto 0', textAlign: 'left' }}>
              <Title level={4} style={{ marginBottom: '24px', textAlign: 'center' }}>
                Demande de devis gratuit
              </Title>
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {(contactForm.fields || []).map((field: any) => (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={[{ required: field.required, message: `${field.label} est requis` }]}
                  >
                    {field.type === 'textarea' ? (
                      <TextArea rows={4} />
                    ) : field.type === 'select' ? (
                      <Select placeholder={`Sélectionnez ${field.label.toLowerCase()}`}>
                        {(field.options || []).map((opt: string) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <Input type={field.type} placeholder={field.label} />
                    )}
                  </Form.Item>
                ))}
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={submitting}
                  style={{
                    backgroundColor: contactForm.submitButton?.backgroundColor,
                    borderColor: contactForm.submitButton?.backgroundColor,
                    color: contactForm.submitButton?.textColor
                  }}
                >
                  {contactForm.submitButton?.text || 'ENVOYER'}
                </Button>
              </Form>
            </Card>
          )}
        </Space>
      </div>
    


    );
  }

  // 10. FOOTER
  if (section.type === 'footer') {
    const columns = content.columns || [];
    const divider = content.divider || {};
    const copyright = content.copyright || {};

    return renderWithEnhancements(


      <div style={{ background: content.backgroundColor || '#1f2937', color: content.color || 'white', padding: content.padding || '32px 24px 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Row gutter={[32, 24]}>
            {columns.map((col: any, idx: number) => (
              <Col xs={24} sm={12} md={6} key={idx}>
                <Title level={col.type === 'text' ? 4 : 5} style={{ color: col.titleColor || 'white' }}>
                  {col.title}
                </Title>
                
                {col.type === 'text' && (
                  <Paragraph style={{ color: col.contentColor || '#9ca3af' }}>
                    {col.content}
                  </Paragraph>
                )}
                
                {col.type === 'links' && (
                  <Space direction="vertical">
                    {(col.links || []).map((link: any, linkIdx: number) => (
                      <a key={linkIdx} href={link.href} style={{ color: col.linkColor || '#9ca3af' }}>
                        {link.label}
                      </a>
                    ))}
                  </Space>
                )}
                
                {col.type === 'text-list' && (
                  <Space direction="vertical">
                    {(col.items || []).map((item: string, itemIdx: number) => (
                      <Text key={itemIdx} style={{ color: col.itemColor || '#9ca3af' }}>
                        {item}
                      </Text>
                    ))}
                  </Space>
                )}
              </Col>
            ))}
          </Row>
          
          <Divider style={{ borderColor: divider.color || '#374151', margin: divider.margin || '40px 0 24px' }} />
          
          <div style={{ textAlign: copyright.textAlign || 'center' }}>
            <Text style={{ color: copyright.color || '#6b7280', fontSize: copyright.fontSize || '14px' }}>
              {copyright.text}
            </Text>
          </div>
        </div>
      </div>
    


    );
  }

  // Type inconnu
  return renderWithEnhancements(

    <div style={{ padding: '40px', textAlign: 'center', background: bgColor, color: textColor }}>
      <Text>Section type "{section.type}" non supporté</Text>
    </div>
  

  );
};

export default SectionRendererV2;
