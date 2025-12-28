/**
 * 📞 CONTACT RENDERER
 * 
 * Renderer pour la section Contact.
 * Affiche formulaire, informations de contact et/ou carte.
 * 
 * @module site/renderer/sections/ContactRenderer
 * @author 2Thier CRM Team
 */

import React from 'react';
import { Row, Col, Typography, Card, Form, Input, Button, Space } from 'antd';
import { MailOutlined, PhoneOutlined, EnvironmentOutlined, SendOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface ContactRendererProps {
  content: {
    title?: string;
    subtitle?: string;
    showForm?: boolean;
    showMap?: boolean;
    showInfo?: boolean;
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    style?: {
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
    };
  };
  mode?: 'preview' | 'edit';
}

export const ContactRenderer: React.FC<ContactRendererProps> = ({ content }) => {
  const {
    title = 'Contactez-nous',
    subtitle = 'Notre équipe est à votre disposition',
    showForm = true,
    showMap = false,
    showInfo = true,
    contactInfo = {},
    style = {}
  } = content;

  const {
    backgroundColor = '#f9fafb',
    textColor = '#1f2937',
    accentColor = '#10b981'
  } = style;

  const {
    email = 'contact@2thier.be',
    phone = '+32 4 123 45 67',
    address = ''
  } = contactInfo;

  return (
    <div style={{ background: backgroundColor, padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <Title level={2} style={{ 
            color: textColor, 
            fontSize: 'clamp(28px, 6vw, 42px)', 
            marginBottom: '16px' 
          }}>
            {title}
          </Title>
          {subtitle && (
            <Paragraph style={{ 
              color: textColor, 
              opacity: 0.7, 
              fontSize: '18px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {subtitle}
            </Paragraph>
          )}
        </div>

        <Row gutter={[48, 48]}>
          {/* Formulaire de contact */}
          {showForm && (
            <Col xs={24} md={showInfo ? 14 : 24}>
              <Card 
                bordered={false} 
                style={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}
              >
                <Form layout="vertical" size="large">
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Nom" name="name">
                        <Input placeholder="Votre nom" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Email" name="email">
                        <Input placeholder="votre@email.com" type="email" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="Téléphone" name="phone">
                    <Input placeholder="+32 xxx xx xx xx" />
                  </Form.Item>
                  <Form.Item label="Message" name="message">
                    <TextArea rows={4} placeholder="Comment pouvons-nous vous aider ?" />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<SendOutlined />}
                      style={{ 
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        height: '48px',
                        paddingInline: '32px'
                      }}
                    >
                      Envoyer le message
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          )}

          {/* Informations de contact */}
          {showInfo && (
            <Col xs={24} md={showForm ? 10 : 24}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                {email && (
                  <Card bordered={false} style={{ borderRadius: '12px' }}>
                    <Space size={16}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px',
                        background: `${accentColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <MailOutlined style={{ fontSize: '24px', color: accentColor }} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '14px' }}>Email</Text>
                        <div>
                          <a href={`mailto:${email}`} style={{ color: textColor, fontWeight: 500, fontSize: '16px' }}>
                            {email}
                          </a>
                        </div>
                      </div>
                    </Space>
                  </Card>
                )}

                {phone && (
                  <Card bordered={false} style={{ borderRadius: '12px' }}>
                    <Space size={16}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px',
                        background: `${accentColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <PhoneOutlined style={{ fontSize: '24px', color: accentColor }} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '14px' }}>Téléphone</Text>
                        <div>
                          <a href={`tel:${phone}`} style={{ color: textColor, fontWeight: 500, fontSize: '16px' }}>
                            {phone}
                          </a>
                        </div>
                      </div>
                    </Space>
                  </Card>
                )}

                {address && (
                  <Card bordered={false} style={{ borderRadius: '12px' }}>
                    <Space size={16} align="start">
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px',
                        background: `${accentColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <EnvironmentOutlined style={{ fontSize: '24px', color: accentColor }} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '14px' }}>Adresse</Text>
                        <div style={{ color: textColor, fontWeight: 500, fontSize: '16px' }}>
                          {address}
                        </div>
                      </div>
                    </Space>
                  </Card>
                )}
              </Space>
            </Col>
          )}
        </Row>
      </div>
    </div>
  );
};

export default ContactRenderer;
