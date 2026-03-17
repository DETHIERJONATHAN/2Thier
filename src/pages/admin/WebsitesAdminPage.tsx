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

// ── FB Tokens + Toggle (identique à UsersAdminPageNew) ──
const FB = { bg: '#f0f2f5', white: '#ffffff', text: '#050505', textSecondary: '#65676b', blue: '#1877f2', blueHover: '#166fe5', border: '#ced0d4', btnGray: '#e4e6eb', btnGrayHover: '#d8dadf', green: '#42b72a', red: '#e4405f', orange: '#f7931a', purple: '#722ed1', shadow: '0 1px 2px rgba(0,0,0,0.1)', radius: 8 as number };
const FBToggle = React.forwardRef<HTMLDivElement, { checked?: boolean; onChange?: (v: boolean) => void; disabled?: boolean }>(
  ({ checked = false, onChange, disabled }, ref) => {
    const w = 44, h = 24, dot = 20;
    return (
      <div ref={ref} onClick={() => !disabled && onChange?.(!checked)} style={{
        width: w, height: h, borderRadius: h,
        background: disabled ? '#ccc' : checked ? FB.blue : '#ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}>
        <div style={{
          width: dot, height: dot, borderRadius: '50%', background: FB.white,
          position: 'absolute', top: (h - dot) / 2,
          left: checked ? w - dot - (h - dot) / 2 : (h - dot) / 2,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    );
  }
);

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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => handleView(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#e7f3ff', color: FB.blue, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span>👁️</span><span>Voir</span></button>
          <button onClick={() => handleEdit(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#f9f0ff', color: FB.purple, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span>✏️</span><span>Éditer</span></button>
          <button onClick={() => handleDelete(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ffeef0', color: FB.red, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span>🗑️</span><span>Supprimer</span></button>
        </div>
      )
    }
  ];

  return (
    <div style={{ background: FB.bg, minHeight: '100vh', width: '100%', padding: '20px 24px' }}>
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: '18px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: FB.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlobalOutlined style={{ color: FB.blue }} /> Gestion des Sites Web
              </div>
              <div style={{ fontSize: 13, color: FB.textSecondary }}>
                Gérez tous vos sites : Site Vitrine 2Thier, Devis1Minute, etc.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AIContentAssistant
                type="page"
                onContentGenerated={(content) => {
                  console.log('Contenu page généré:', content);
                  message.success('Utilisez ce contenu pour créer un nouveau site');
                }}
                buttonText="🤖 Générer un nouveau site"
              />
              <button
                onClick={() => {
                  setCurrentWebsite(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                <span>➕</span><span>Nouveau site</span>
              </button>
            </div>
          </div>

          <Alert
            message="🤖 Assistant IA disponible"
            description="Utilisez l'IA pour générer automatiquement du contenu pour vos services, projets et témoignages. Cliquez sur les boutons IA dans les formulaires !"
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
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
      </div>

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
                    <FBToggle />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Publié"
                    name="isPublished"
                    valuePropName="checked"
                    initialValue={false}
                  >
                    <FBToggle />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Mode maintenance"
                    name="maintenanceMode"
                    valuePropName="checked"
                    initialValue={false}
                  >
                    <FBToggle />
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
            <button
              onClick={() => setModalVisible(false)}
              style={{ padding: '10px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14, minWidth: 120, flex: 1, maxWidth: 200 }}
            >❌ Annuler</button>
            <button
              type="submit"
              style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, minWidth: 120, flex: 1, maxWidth: 200 }}
            >➕ Créer le site</button>
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
