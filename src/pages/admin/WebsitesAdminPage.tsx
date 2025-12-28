/**
 * Page d'administration des sites web
 * Permet de gérer tous les sites (Site Vitrine 2Thier, Devis1Minute, etc.)
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  Select,
  Switch,
  message,
  Tabs,
  Row,
  Col,
  Divider,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  GlobalOutlined,
  SettingOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import AIContentAssistant from '../../components/AIContentAssistant';
import ServicesManager from '../../components/websites/ServicesManager';
import ProjectsManager from '../../components/websites/ProjectsManager';
import TestimonialsManager from '../../components/websites/TestimonialsManager';
import SectionsManager from '../../components/websites/SectionsManager';
import { NoCodeBuilder } from '../../site'; // 🔥 NOUVEAU SYSTÈME UNIVERSEL
import ThemeManager from '../../components/websites/ThemeManager';
import CloudRunDomainSelector from '../../components/websites/CloudRunDomainSelector';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Website {
  id: number;
  siteName: string;
  siteType: string;
  slug: string;
  domain: string;
  isActive: boolean;
  isPublished: boolean;
  config?: any;
}

export const WebsitesAdminPage: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<Website | null>(null);
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    setLoading(true);
    try {
      console.log('🌐 [WebsitesAdmin] Fetching websites...');
      // Super Admin voit tous les sites
      const response = await api.get('/api/websites?all=true');
      console.log('🌐 [WebsitesAdmin] Response:', response);
      console.log('🌐 [WebsitesAdmin] Response type:', typeof response, Array.isArray(response));
      // Le hook retourne directement les données, pas un objet {data: ...}
      setWebsites(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('❌ [WebsitesAdmin] Erreur chargement sites:', error);
      message.error('Erreur lors du chargement des sites');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (website: Website) => {
    // 🎨 Ouvrir le builder en mode édition
    setCurrentWebsite(website);
    form.setFieldsValue(website);
    setModalVisible(true);
  };

  const handleView = (website: Website) => {
    // 👁️ Ouvrir le site en preview dans un nouvel onglet
    window.open(`/${website.slug}`, '_blank');
  };

  const handleDelete = (website: Website) => {
    console.log('🗑️ handleDelete appelé pour:', website.siteName, website.id);
    setWebsiteToDelete(website);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!websiteToDelete) return;
    
    try {
      console.log(`🗑️ Suppression du site ${websiteToDelete.id}...`);
      setLoading(true);
      await api.delete(`/api/websites/${websiteToDelete.id}`);
      message.success(`Site "${websiteToDelete.siteName}" supprimé avec succès`);
      setDeleteModalVisible(false);
      setWebsiteToDelete(null);
      fetchWebsites();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      message.error('Erreur lors de la suppression du site');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Site',
      dataIndex: 'siteName',
      key: 'siteName',
      render: (text: string, record: Website) => (
        <Space direction="vertical" size="small">
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.domain}</Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'siteType',
      key: 'siteType',
      render: (type: string) => {
        const colors: Record<string, string> = {
          vitrine: 'blue',
          landing: 'green',
          blog: 'purple'
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      }
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <Text code>/{slug}</Text>
    },
    {
      title: 'Statut',
      key: 'status',
      render: (_: any, record: Website) => (
        <Space>
          {record.isActive && <Tag color="success">Actif</Tag>}
          {record.isPublished && <Tag color="processing">Publié</Tag>}
          {!record.isActive && <Tag>Inactif</Tag>}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Website) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record)}
          >
            Voir
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Éditer
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Supprimer
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <GlobalOutlined /> Gestion des Sites Web
              </Title>
              <Text type="secondary">
                Gérez tous vos sites : Site Vitrine 2Thier, Devis1Minute, etc.
              </Text>
            </div>
            <Space>
              <AIContentAssistant
                type="page"
                onContentGenerated={(content) => {
                  console.log('Contenu page généré:', content);
                  message.success('Utilisez ce contenu pour créer un nouveau site');
                }}
                buttonText="🤖 Générer un nouveau site"
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setCurrentWebsite(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
              >
                Nouveau site
              </Button>
            </Space>
          </div>

          <Alert
            message="🤖 Assistant IA disponible"
            description="Utilisez l'IA pour générer automatiquement du contenu pour vos services, projets et témoignages. Cliquez sur les boutons IA dans les formulaires !"
            type="info"
            showIcon
            closable
          />

          <Table
            columns={columns}
            dataSource={websites}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `${total} site(s)`
            }}
          />
        </Space>
      </Card>

      <Modal
        title={
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>{currentWebsite ? '✏️ Éditer le site' : '➕ Nouveau site'}</span>
            {currentWebsite && (
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'normal',
                color: '#52c41a' 
              }}>
                {currentWebsite.siteName}
              </span>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="100%"
        style={{ 
          top: 0, 
          maxWidth: '100vw', 
          padding: 0,
          margin: 0,
          height: '100vh'
        }}
        styles={{
          body: {
            padding: '24px',
            height: 'calc(100vh - 55px)', 
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            paddingBottom: '80px' // Espace pour la barre de boutons
          },
          content: {
            borderRadius: 0,
            height: '100vh'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              // Extraction des données Cloud Run mapping
              const cloudRunData = values.cloudRunMapping || {};
              const payload = {
                ...values,
                cloudRunDomain: cloudRunData.cloudRunDomain,
                cloudRunServiceName: cloudRunData.cloudRunServiceName,
                cloudRunRegion: cloudRunData.cloudRunRegion,
                cloudRunMapping: undefined // Suppression du champ temporaire
              };
              
              if (currentWebsite) {
                await api.put(`/api/websites/${currentWebsite.id}`, payload);
                message.success('Site mis à jour');
              } else {
                await api.post('/api/websites', payload);
                message.success('Site créé');
              }
              setModalVisible(false);
              fetchWebsites();
            } catch (error) {
              message.error('Erreur lors de la sauvegarde');
            }
          }}
        >
          {/* 🎨 NO-CODE BUILDER UNIFIÉ - Tout dans un seul composant */}
          {currentWebsite ? (
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              minHeight: '70vh',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <NoCodeBuilder
                websiteId={currentWebsite.id}
                siteName={currentWebsite.siteName}
              />
            </div>
          ) : (
            <Card title="➕ Créer un nouveau site" style={{ marginBottom: '80px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Nom du site"
                    name="siteName"
                    rules={[{ required: true, message: 'Le nom est requis' }]}
                  >
                    <Input 
                      size="large" 
                      placeholder="Ex: 2Thier Energy, Devis1Minute..." 
                    />
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Type de site"
                    name="siteType"
                    rules={[{ required: true, message: 'Le type est requis' }]}
                    initialValue="vitrine"
                  >
                    <Select size="large">
                      <Select.Option value="vitrine">Site Vitrine</Select.Option>
                      <Select.Option value="landing">Landing Page</Select.Option>
                      <Select.Option value="blog">Blog</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Slug (URL)"
                    name="slug"
                    rules={[
                      { required: true, message: 'Le slug est requis' },
                      { pattern: /^[a-z0-9-]+$/, message: 'Format: minuscules, chiffres et tirets uniquement' }
                    ]}
                  >
                    <Input 
                      size="large"
                      placeholder="Ex: 2thier, devis1minute..." 
                      prefix="/"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Domaine personnalisé (optionnel)"
                    name="domain"
                  >
                    <Input 
                      size="large"
                      placeholder="Ex: www.monsite.be" 
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Divider orientation="left">☁️ Mapping Cloud Run</Divider>
                  <Form.Item
                    label="Domaine Cloud Run"
                    name={['cloudRunMapping']}
                    tooltip="Liez ce site à un domaine déjà mappé dans Google Cloud Run"
                  >
                    <CloudRunDomainSelector />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Divider orientation="left">Paramètres</Divider>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Actif"
                    name="isActive"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Publié"
                    name="isPublished"
                    valuePropName="checked"
                    initialValue={false}
                  >
                    <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Mode maintenance"
                    name="maintenanceMode"
                    valuePropName="checked"
                    initialValue={false}
                  >
                    <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Alert
                    message="💡 Après création"
                    description="Vous pourrez gérer les sections, services, projets et témoignages après avoir créé le site."
                    type="info"
                    showIcon
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Form>

        {/* Boutons de sauvegarde FIXES en bas du modal */}
        {/* 🎯 BOUTONS D'ACTION - Affichés UNIQUEMENT pour la création, pas pour l'édition */}
        {!currentWebsite && (
          <div 
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              padding: '16px 24px',
              borderTop: '2px solid #f0f0f0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              zIndex: 2000,
              boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
            }}
            className="mobile-action-buttons"
          >
            <Button 
              size="large"
              onClick={() => setModalVisible(false)}
              style={{ 
                minWidth: '120px',
                flex: '1',
                maxWidth: '200px'
              }}
            >
              ❌ Annuler
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              style={{ 
                minWidth: '120px',
                flex: '1',
                maxWidth: '200px'
              }}
            >
              ➕ Créer le site
            </Button>
          </div>
        )}

        {/* Styles responsive pour mobile */}
        <style>{`
          @media (max-width: 768px) {
            .ant-tabs-tab {
              font-size: 14px !important;
              padding: 12px 8px !important;
            }
            
            .ant-form-item-label > label {
              font-size: 14px !important;
            }
            
            .ant-input-lg {
              font-size: 16px !important;
              padding: 8px 12px !important;
            }
            
            .ant-select-lg {
              font-size: 16px !important;
            }
            
            .mobile-action-buttons {
              flex-direction: column;
            }
            
            .mobile-action-buttons button {
              max-width: 100% !important;
            }
          }
          
          @media (max-width: 576px) {
            .ant-modal-body {
              padding: 16px !important;
            }
            
            .ant-card {
              margin: 0 !important;
            }
          }
        `}</style>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        title="🗑️ Supprimer ce site ?"
        open={deleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setWebsiteToDelete(null);
        }}
        okText="Supprimer"
        okType="danger"
        cancelText="Annuler"
        confirmLoading={loading}
      >
        {websiteToDelete && (
          <div style={{ padding: '20px 0' }}>
            <Alert
              message="Action irréversible"
              description={
                <div>
                  <p style={{ marginBottom: '12px' }}>
                    Êtes-vous sûr de vouloir supprimer <strong>"{websiteToDelete.siteName}"</strong> ?
                  </p>
                  <p style={{ marginBottom: '8px', color: '#ff4d4f' }}>
                    ⚠️ Cette action supprimera également :
                  </p>
                  <ul style={{ marginLeft: '20px', color: '#595959' }}>
                    <li>Toutes les sections du site</li>
                    <li>Tous les services</li>
                    <li>Tous les projets</li>
                    <li>Tous les témoignages</li>
                    <li>Tous les articles de blog</li>
                    <li>Tous les fichiers média</li>
                  </ul>
                </div>
              }
              type="warning"
              showIcon
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WebsitesAdminPage;
