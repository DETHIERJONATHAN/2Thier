import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Typography, Button, Space, Statistic, Carousel, Steps, Tag, List, Spin } from 'antd';
import {
  HomeOutlined,
  ThunderboltOutlined,
  StarFilled,
  EnvironmentOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  RocketOutlined,
  BulbOutlined,
  CarOutlined,
  FireOutlined,
  CloudOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

interface Section {
  id: number;
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
}

// Mapping complet des icônes Ant Design
const iconMap: Record<string, React.ReactNode> = {
  HomeOutlined: <HomeOutlined style={{ fontSize: '48px' }} />,
  ThunderboltOutlined: <ThunderboltOutlined style={{ fontSize: '48px' }} />,
  StarFilled: <StarFilled style={{ fontSize: '48px' }} />,
  EnvironmentOutlined: <EnvironmentOutlined style={{ fontSize: '48px' }} />,
  CheckCircleOutlined: <CheckCircleOutlined style={{ fontSize: '48px', color: '#10b981' }} />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#10b981' }} />,
  CustomerServiceOutlined: <CustomerServiceOutlined style={{ fontSize: '48px', color: '#10b981' }} />,
  RocketOutlined: <RocketOutlined style={{ fontSize: '32px', color: '#10b981' }} />,
  BulbOutlined: <BulbOutlined style={{ fontSize: '32px', color: '#f59e0b' }} />,
  CarOutlined: <CarOutlined style={{ fontSize: '32px', color: '#3b82f6' }} />,
  FireOutlined: <FireOutlined style={{ fontSize: '32px', color: '#ef4444' }} />,
  CloudOutlined: <CloudOutlined style={{ fontSize: '32px', color: '#06b6d4' }} />,
  ToolOutlined: <ToolOutlined style={{ fontSize: '32px', color: '#64748b' }} />,
  TeamOutlined: <TeamOutlined style={{ fontSize: '32px', color: '#10b981' }} />,
  PhoneOutlined: <PhoneOutlined style={{ fontSize: '32px', color: '#10b981' }} />
};

// Helper pour extraire le texte d'un champ (objet ou string)
const getText = (field: any, defaultText = ''): string => {
  if (!field) return defaultText;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.text) return field.text;
  return defaultText;
};

/**
 * 🎨 RENDU COMPLET D'UNE SECTION
 * Reproduit exactement le rendu du site vitrine original
 */
const SectionRenderer: React.FC<SectionRendererProps> = ({ section }) => {
  const { api } = useAuthenticatedApi();
  const bgColor = section.backgroundColor || '#ffffff';
  const textColor = section.textColor || '#000000';

  // États pour les données dynamiques
  const [services, setServices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les données dynamiques selon le type de section
  useEffect(() => {
    if (section.content?.dataSource === 'dynamic') {
      loadDynamicData();
    }
  }, [section.type]);

  const loadDynamicData = async () => {
    setLoading(true);
    try {
      if (section.type === 'services') {
        const data = await api.get(`/api/website-services/${section.websiteId}`);
        setServices(data || []);
      } else if (section.type === 'projects') {
        const data = await api.get(`/api/website-projects/${section.websiteId}`);
        setProjects(data || []);
      } else if (section.type === 'testimonials') {
        const data = await api.get(`/api/website-testimonials/${section.websiteId}`);
        setTestimonials(data || []);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  switch (section.type) {
    case 'header':
      const logoText = getText(section.content?.logo, 'Logo');
      const logoColor = typeof section.content?.logo === 'object' ? section.content.logo.color : '#10b981';
      const ctaButtonText = getText(section.content?.ctaButton, 'CTA');
      
      return (
        <Header 
          style={{ 
            position: 'sticky', 
            top: 0, 
            width: '100%', 
            zIndex: 1000,
            background: bgColor || 'rgba(255, 255, 255, 0.98)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px'
          }}
        >
          <Title level={3} style={{ margin: 0, color: logoColor }}>
            {logoText}
          </Title>
          <Button type="primary" size="large" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
            {ctaButtonText}
          </Button>
        </Header>
      );

    case 'hero':
      const buttons = Array.isArray(section.content?.buttons) ? section.content.buttons : [];
      const subtitleText = getText(section.content?.subtitle, 'Sous-titre');
      
      return (
        <div style={{
          background: section.content?.backgroundGradient || bgColor || 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          minHeight: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ maxWidth: '1200px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Title level={1} style={{ color: textColor || 'white', fontSize: 'clamp(32px, 8vw, 56px)', margin: 0 }}>
                {getText(section.content?.title, 'Titre Hero')}
              </Title>
              
              <Paragraph style={{ 
                color: textColor || 'rgba(255,255,255,0.95)', 
                fontSize: 'clamp(16px, 4vw, 20px)', 
                maxWidth: '800px', 
                margin: '0 auto',
                whiteSpace: 'pre-line'
              }}>
                {subtitleText}
              </Paragraph>
              
              {buttons.length > 0 && (
                <Space size="middle" wrap>
                  {buttons.map((btn: any, idx: number) => (
                    <Button 
                      key={idx}
                      type={idx === 0 ? 'primary' : 'default'}
                      size="large" 
                      icon={btn.icon ? iconMap[btn.icon] || null : null}
                      style={{ 
                        height: 'auto', 
                        padding: '16px 32px',
                        fontSize: '18px',
                        backgroundColor: btn.backgroundColor || (idx === 0 ? 'white' : 'rgba(255,255,255,0.1)'),
                        borderColor: btn.borderColor || 'white',
                        color: btn.textColor || (idx === 0 ? '#10b981' : 'white'),
                        fontWeight: btn.fontWeight || (idx === 0 ? 'bold' : 'normal')
                      }}
                    >
                      {getText(btn, btn.text)}
                    </Button>
                  ))}
                </Space>
              )}

              {section.content?.badge && (
                <div style={{ marginTop: '40px' }}>
                  <Text style={{ color: textColor || 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                    <CheckCircleOutlined /> {getText(section.content.badge)}
                  </Text>
                </div>
              )}
            </Space>
          </div>
        </div>
      );

    case 'stats':
      const stats = section.content?.stats || [];
      const statsIconMap: Record<string, any> = {
        HomeOutlined: <HomeOutlined />,
        ThunderboltOutlined: <ThunderboltOutlined />,
        StarFilled: <StarFilled />,
        EnvironmentOutlined: <EnvironmentOutlined />
      };

      return (
        <div style={{ background: bgColor || '#f9fafb', padding: '60px 24px' }}>
          <Row gutter={[24, 24]} justify="center" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {stats.map((stat: any, index: number) => (
              <Col xs={12} sm={12} md={6} key={index}>
                <Card 
                  variant="borderless"
                  style={{ 
                    textAlign: 'center',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '8px', color: stat.color || '#10b981' }}>
                    {statsIconMap[stat.icon] || stat.icon}
                  </div>
                  <Statistic 
                    title={stat.label}
                    value={stat.value}
                    valueStyle={{ color: stat.color || '#10b981', fontSize: '32px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      );

    case 'services':
      if (loading) {
        return (
          <div style={{ background: bgColor, padding: '80px 24px', textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        );
      }

      return (
        <div style={{ background: bgColor || '#ffffff', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', color: textColor || '#1f2937' }}>
                {getText(section.content?.title, '⚡ Nos Services')}
              </Title>
              {section.content?.subtitle && (
                <Paragraph style={{ fontSize: '18px', color: '#64748b', maxWidth: '700px', margin: '16px auto 0' }}>
                  {getText(section.content.subtitle)}
                </Paragraph>
              )}
            </div>

            <Row gutter={[24, 24]}>
              {services.map((service) => (
                <Col xs={24} sm={12} lg={8} key={service.id}>
                  <Card
                    hoverable
                    style={{ 
                      height: '100%',
                      borderRadius: '16px',
                      border: '2px solid #e5e7eb',
                      transition: 'all 0.3s ease'
                    }}
                    styles={{ body: { padding: '32px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    <Space direction="vertical" size="large" style={{ width: '100%', flex: 1 }}>
                      {/* Icône */}
                      <div style={{ fontSize: '56px', textAlign: 'center' }}>
                        {service.icon || '⚡'}
                      </div>

                      {/* Titre */}
                      <Title level={4} style={{ textAlign: 'center', margin: 0, fontSize: '20px' }}>
                        {service.title}
                      </Title>

                      {/* Description */}
                      <Paragraph style={{ color: '#64748b', textAlign: 'center', marginBottom: '16px' }}>
                        {service.description}
                      </Paragraph>

                      {/* Features */}
                      {service.features && service.features.length > 0 && (
                        <List
                          size="small"
                          dataSource={service.features}
                          renderItem={(feature: string) => (
                            <List.Item style={{ border: 'none', padding: '4px 0' }}>
                              <Text style={{ fontSize: '14px', color: '#475569' }}>
                                <CheckCircleOutlined style={{ color: '#10b981', marginRight: '8px' }} />
                                {feature}
                              </Text>
                            </List.Item>
                          )}
                        />
                      )}

                      {/* CTA Button */}
                      {service.ctaText && (
                        <Button 
                          type="primary" 
                          size="large"
                          block
                          style={{ 
                            marginTop: 'auto',
                            backgroundColor: '#10b981',
                            borderColor: '#10b981',
                            height: '48px',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}
                        >
                          {service.ctaText}
                        </Button>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      );

    case 'projects':
      if (loading) {
        return (
          <div style={{ background: bgColor, padding: '80px 24px', textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        );
      }

      return (
        <div style={{ background: bgColor || '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', color: textColor || '#1f2937' }}>
                {getText(section.content?.title, '📸 Nos Réalisations')}
              </Title>
              {section.content?.subtitle && (
                <Paragraph style={{ fontSize: '18px', color: '#64748b', maxWidth: '700px', margin: '16px auto 0' }}>
                  {getText(section.content.subtitle)}
                </Paragraph>
              )}
            </div>

            <Row gutter={[24, 24]}>
              {projects.map((project) => (
                <Col xs={24} sm={12} lg={6} key={project.id}>
                  <Card
                    hoverable
                    cover={
                      project.coverImage ? (
                        <div style={{ 
                          height: '200px', 
                          background: `url(${project.coverImage}) center/cover`,
                          borderRadius: '12px 12px 0 0'
                        }} />
                      ) : (
                        <div style={{ 
                          height: '200px', 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '64px',
                          borderRadius: '12px 12px 0 0'
                        }}>
                          📸
                        </div>
                      )
                    }
                    style={{ 
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '2px solid #e5e7eb'
                    }}
                    styles={{ body: { padding: '20px' } }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Title level={5} style={{ margin: 0 }}>
                        {project.title}
                      </Title>
                      {project.location && (
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>
                          <EnvironmentOutlined /> {project.location}
                        </Text>
                      )}
                      {project.description && (
                        <Paragraph 
                          ellipsis={{ rows: 2 }} 
                          style={{ color: '#475569', fontSize: '14px', margin: '8px 0 0' }}
                        >
                          {project.description}
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

    case 'testimonials':
      if (loading) {
        return (
          <div style={{ background: bgColor, padding: '80px 24px', textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        );
      }

      return (
        <div style={{ background: bgColor || '#ffffff', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', color: textColor || '#1f2937' }}>
                {getText(section.content?.title, '⭐ Témoignages Clients')}
              </Title>
              {section.content?.summary && (
                <Text style={{ fontSize: '20px', color: '#10b981', fontWeight: '600' }}>
                  ⭐ {getText(section.content.summary)}
                </Text>
              )}
            </div>

            <Carousel 
              autoplay={section.content?.carousel?.autoplay || true}
              dots={{ className: 'custom-dots' }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.id}>
                  <Card
                    style={{ 
                      margin: '0 16px',
                      borderRadius: '16px',
                      border: '2px solid #e5e7eb',
                      minHeight: '300px'
                    }}
                    styles={{ body: { padding: '40px' } }}
                  >
                    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                      {/* Rating */}
                      <div style={{ fontSize: '24px', color: '#fbbf24' }}>
                        {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                          <StarFilled key={i} />
                        ))}
                      </div>

                      {/* Content */}
                      <Paragraph 
                        style={{ 
                          fontSize: '18px', 
                          fontStyle: 'italic', 
                          color: '#475569',
                          margin: '24px 0'
                        }}
                      >
                        "{testimonial.content}"
                      </Paragraph>

                      {/* Author */}
                      <div>
                        <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '4px' }}>
                          {testimonial.clientName}
                        </Text>
                        {testimonial.location && (
                          <Text style={{ color: '#64748b', fontSize: '14px' }}>
                            <EnvironmentOutlined /> {testimonial.location}
                          </Text>
                        )}
                        {testimonial.projectType && (
                          <Tag color="green" style={{ marginTop: '8px' }}>
                            {testimonial.projectType}
                          </Tag>
                        )}
                      </div>
                    </Space>
                  </Card>
                </div>
              ))}
            </Carousel>
          </div>
        </div>
      );

    case 'content':
      // Charger les valeurs depuis le config
      const valuesCards = section.content?.dataSource === 'config.valuesJson' 
        ? [
            { icon: '🌱', title: 'Écologique', description: 'Solutions durables et respectueuses de l\'environnement' },
            { icon: '💰', title: 'Économique', description: 'Réduction significative de vos factures énergétiques' },
            { icon: '🛡️', title: 'Qualité', description: 'Matériaux et installations de haute qualité garantis' },
            { icon: '🤝', title: 'Accompagnement', description: 'Suivi personnalisé de A à Z par nos experts' }
          ]
        : [];

      return (
        <div style={{ background: bgColor || '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', color: textColor || '#1f2937' }}>
                {getText(section.content?.title, '💚 Nos Valeurs')}
              </Title>
              {section.content?.subtitle && (
                <Paragraph style={{ fontSize: '18px', color: '#64748b', maxWidth: '700px', margin: '16px auto 0' }}>
                  {getText(section.content.subtitle)}
                </Paragraph>
              )}
            </div>

            <Row gutter={[32, 32]}>
              {valuesCards.map((value, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <Card 
                    variant="borderless"
                    style={{ 
                      textAlign: 'center', 
                      height: '100%',
                      background: 'white',
                      borderRadius: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      padding: '16px'
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{ fontSize: '64px' }}>
                        {value.icon}
                      </div>
                      <Title level={4} style={{ margin: 0 }}>{value.title}</Title>
                      <Paragraph style={{ color: '#64748b', marginBottom: 0 }}>
                        {value.description}
                      </Paragraph>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      );

    case 'steps':
      const steps = section.content?.steps || [];
      
      return (
        <div style={{ background: bgColor || '#ffffff', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)', color: textColor || '#1f2937' }}>
                {getText(section.content?.title, '🚀 Notre Processus')}
              </Title>
              {section.content?.subtitle && (
                <Paragraph style={{ fontSize: '18px', color: '#64748b', maxWidth: '700px', margin: '16px auto 0' }}>
                  {getText(section.content.subtitle)}
                </Paragraph>
              )}
            </div>

            <Steps
              direction="vertical"
              current={-1}
              items={steps.map((step: any, index: number) => ({
                title: (
                  <Title level={4} style={{ margin: 0 }}>
                    {getText(step.title || step, `Étape ${index + 1}`)}
                  </Title>
                ),
                description: (
                  <Paragraph style={{ color: '#64748b', fontSize: '16px', marginTop: '8px' }}>
                    {getText(step.description, '')}
                  </Paragraph>
                ),
                icon: step.icon ? (
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white'
                  }}>
                    {iconMap[step.icon] || step.icon}
                  </div>
                ) : undefined
              }))}
              style={{ padding: '20px 0' }}
            />
          </div>
        </div>
      );

    case 'cta':
      const ctaButtons = Array.isArray(section.content?.buttons) ? section.content.buttons : [];
      
      return (
        <div style={{
          background: section.content?.backgroundGradient || bgColor || 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '80px 24px',
          textAlign: 'center'
        }}>
          <Space direction="vertical" size="large" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Title level={2} style={{ color: textColor || 'white', margin: 0 }}>
              {getText(section.content?.title, 'Call to Action')}
            </Title>
            <Paragraph style={{ color: textColor || 'rgba(255,255,255,0.95)', fontSize: '18px' }}>
              {getText(section.content?.subtitle, 'Description')}
            </Paragraph>
            {ctaButtons.length > 0 && (
              <Space size="large" wrap>
                {ctaButtons.map((btn: any, idx: number) => (
                  <Button 
                    key={idx}
                    type={idx === 0 ? 'primary' : 'default'}
                    size="large"
                    style={{ 
                      background: btn.backgroundColor || (idx === 0 ? 'white' : 'rgba(255,255,255,0.1)'),
                      borderColor: btn.borderColor || 'white',
                      color: btn.textColor || (idx === 0 ? '#10b981' : 'white'),
                      height: 'auto',
                      padding: '16px 32px',
                      fontSize: '18px',
                      fontWeight: btn.fontWeight || (idx === 0 ? 'bold' : 'normal')
                    }}
                  >
                    {btn.icon && <span>{btn.icon} </span>}
                    {getText(btn, btn.text)}
                  </Button>
                ))}
              </Space>
            )}
            {section.content?.address && (
              <Text style={{ color: textColor || 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                <EnvironmentOutlined /> {getText(section.content.address)}
              </Text>
            )}
          </Space>
        </div>
      );

    case 'footer':
      const columns = Array.isArray(section.content?.columns) ? section.content.columns : [];
      
      return (
        <Footer style={{ background: bgColor || '#1f2937', color: textColor || 'white', padding: '60px 24px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Row gutter={[32, 32]}>
              {columns.map((col: any, idx: number) => (
                <Col xs={24} sm={12} md={6} key={idx}>
                  <Title level={col.title?.length > 15 ? 5 : 4} style={{ color: textColor || 'white' }}>
                    {getText(col.title, `Colonne ${idx + 1}`)}
                  </Title>
                  {col.links && (
                    <Space direction="vertical">
                      {col.links.map((link: any, linkIdx: number) => (
                        <a key={linkIdx} href="#" style={{ color: '#9ca3af' }}>
                          {typeof link === 'string' ? link : getText(link, 'Lien')}
                        </a>
                      ))}
                    </Space>
                  )}
                </Col>
              ))}
            </Row>
            {section.content?.copyright && (
              <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #374151' }}>
                <Text style={{ color: '#6b7280', fontSize: '14px' }}>
                  {getText(section.content.copyright)}
                </Text>
              </div>
            )}
          </div>
        </Footer>
      );

    default:
      return (
        <div style={{ background: bgColor, padding: '40px 24px', minHeight: '100px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <Title level={3} style={{ color: textColor }}>
              {section.name}
            </Title>
            <Text style={{ color: '#666' }}>Type: {section.type}</Text>
          </div>
        </div>
      );
  }
};

export default SectionRenderer;
