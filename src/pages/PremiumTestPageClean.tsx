import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Table, 
  Form, 
  Input, 
  Select, 
  Modal,
  Badge,
  Progress,
  Statistic,
  Alert,
  Tooltip,
  Avatar
} from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined,
  UserOutlined,
  StarOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * 🎨 PAGE DE DÉMONSTRATION - STYLE ÉPURÉ PROFESSIONNEL
 * Design inspiré du CallModule que vous appréciez :
 * - Fond gris clair (bg-gray-50)
 * - Cartes blanches avec ombre douce
 * - Bordures colorées fines uniquement
 * - Icônes colorées sur fond blanc
 */

const PremiumTestPageClean: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Données de test épurées
  const tableData = [
    {
      key: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@exemple.com',
      phone: '01 23 45 67 89',
      status: 'Actif'
    },
    {
      key: '2',
      name: 'Marie Martin',
      email: 'marie.martin@exemple.com',
      phone: '01 23 45 67 90',
      status: 'En attente'
    },
    {
      key: '3',
      name: 'Pierre Durand',
      email: 'pierre.durand@exemple.com',
      phone: '01 23 45 67 91',
      status: 'Inactif'
    }
  ];

  const tableColumns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Space>
          <MailOutlined className="text-blue-500" />
          <Text>{email}</Text>
        </Space>
      )
    },
    {
      title: 'Téléphone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <PhoneOutlined className="text-green-500" />
          <Text>{phone}</Text>
        </Space>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'Actif' ? 'green' : status === 'En attente' ? 'orange' : 'gray';
        return <Badge color={color} text={status} />;
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* Header épuré comme CallModule */}
      <div className="bg-white p-6 mb-6 rounded-lg shadow-sm border border-gray-200">
        <Title level={2} className="text-gray-900 mb-2">
          🎨 Interface Épurée & Professionnelle
        </Title>
        <Text className="text-gray-600 text-lg">
          Design inspiré de votre CallModule préféré - propre, épuré et efficace
        </Text>
      </div>

      {/* Section 1: Composants de base */}
      <Row gutter={[16, 16]} className="mb-6">
        
        {/* Boutons épurés */}
        <Col span={8}>
          <Card 
            title={
              <Space>
                <span className="text-blue-500">🔘</span>
                <span className="text-gray-900">Boutons</span>
              </Space>
            } 
            className="shadow-sm border border-gray-200"
          >
            <Space direction="vertical" className="w-full">
              <Button type="primary" className="w-full">
                Bouton Principal
              </Button>
              <Button className="w-full border-blue-300 text-blue-600 hover:border-blue-500">
                Bouton Secondaire
              </Button>
              <Button 
                icon={<PhoneOutlined className="text-green-500" />} 
                className="w-full border-green-300 text-green-600 hover:border-green-500"
              >
                Appeler Contact
              </Button>
              <Button 
                danger 
                className="w-full"
              >
                Action Critique
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Statistiques épurées */}
        <Col span={8}>
          <Card 
            title={
              <Space>
                <span className="text-green-500">📊</span>
                <span className="text-gray-900">Statistiques</span>
              </Space>
            }
            className="shadow-sm border border-gray-200"
          >
            <Space direction="vertical" className="w-full">
              <div className="border-l-4 border-blue-500 pl-4">
                <Statistic title="Clients Actifs" value={142} className="mb-0" />
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <Statistic title="Leads Ce Mois" value={28} className="mb-0" />
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <Statistic title="Taux Conversion" value={73.5} suffix="%" className="mb-0" />
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <Statistic title="CA Mensuel" value={45750} prefix="€" className="mb-0" />
              </div>
            </Space>
          </Card>
        </Col>

        {/* Alertes épurées */}
        <Col span={8}>
          <Card 
            title={
              <Space>
                <span className="text-orange-500">⚠️</span>
                <span className="text-gray-900">Notifications</span>
              </Space>
            }
            className="shadow-sm border border-gray-200"
          >
            <Space direction="vertical" className="w-full">
              <Alert 
                message="Succès" 
                description="Action réalisée avec succès"
                type="success" 
                showIcon 
                className="border border-green-200"
              />
              <Alert 
                message="Information" 
                description="Nouvelle mise à jour disponible"
                type="info" 
                showIcon 
                className="border border-blue-200"
              />
              <Alert 
                message="Attention" 
                description="Vérifiez les paramètres"
                type="warning" 
                showIcon 
                className="border border-orange-200"
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Section 2: Formulaire épuré */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={12}>
          <Card 
            title={
              <Space>
                <span className="text-purple-500">📝</span>
                <span className="text-gray-900">Formulaire Contact</span>
              </Space>
            }
            className="shadow-sm border border-gray-200"
          >
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Prénom" name="firstName">
                    <Input placeholder="Entrez le prénom" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Nom" name="lastName">
                    <Input placeholder="Entrez le nom" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Email" name="email">
                <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="email@exemple.com" />
              </Form.Item>
              <Form.Item label="Téléphone" name="phone">
                <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="01 23 45 67 89" />
              </Form.Item>
              <Form.Item label="Statut" name="status">
                <Select placeholder="Sélectionnez un statut">
                  <Option value="prospect">Prospect</Option>
                  <Option value="client">Client</Option>
                  <Option value="inactif">Inactif</Option>
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Progression et actions */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <span className="text-indigo-500">⚡</span>
                <span className="text-gray-900">Progression & Actions</span>
              </Space>
            }
            className="shadow-sm border border-gray-200"
          >
            <Space direction="vertical" className="w-full">
              
              {/* Barres de progression épurées */}
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <Text className="text-sm text-gray-600 mb-2 block">Objectif Mensuel</Text>
                <Progress percent={75} strokeColor="#3b82f6" />
              </div>
              
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <Text className="text-sm text-gray-600 mb-2 block">Satisfaction Client</Text>
                <Progress percent={92} strokeColor="#10b981" />
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <Text className="text-sm text-gray-600 mb-2 block">Performance Équipe</Text>
                <Progress percent={84} strokeColor="#f59e0b" />
              </div>

              {/* Actions rapides */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Space>
                  <Button 
                    type="primary" 
                    icon={<CalendarOutlined />}
                    onClick={() => setModalVisible(true)}
                  >
                    Planifier RDV
                  </Button>
                  <Button 
                    icon={<MailOutlined />}
                    className="border-blue-300 text-blue-600 hover:border-blue-500"
                  >
                    Envoyer Email
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Section 3: Tableau épuré */}
      <Card 
        title={
          <Space>
            <span className="text-cyan-500">📋</span>
            <span className="text-gray-900">Liste des Contacts</span>
          </Space>
        }
        className="shadow-sm border border-gray-200 mb-6"
      >
        <Table 
          dataSource={tableData} 
          columns={tableColumns} 
          pagination={{ pageSize: 5 }}
          className="border border-gray-200 rounded"
        />
      </Card>

      {/* Section 4: Fonctionnalités avancées */}
      <Row gutter={[16, 16]}>
        
        <Col span={8}>
          <Card 
            title={
              <Space>
                <span className="text-red-500">🎯</span>
                <span className="text-gray-900">Actions Critiques</span>
              </Space>
            }
            className="shadow-sm border border-red-200"
          >
            <Space direction="vertical" className="w-full">
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <Space>
                  <ExclamationCircleOutlined className="text-red-500" />
                  <div>
                    <Text strong className="text-red-800">Action sensible</Text>
                    <div className="text-red-600 text-sm">Cette action nécessite confirmation</div>
                  </div>
                </Space>
              </div>
              <Button danger block>
                Confirmer l'action
              </Button>
            </Space>
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={
              <Space>
                <span className="text-green-500">✅</span>
                <span className="text-gray-900">Système OK</span>
              </Space>
            }
            className="shadow-sm border border-green-200"
          >
            <Space direction="vertical" className="w-full">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Interface</Text>
                <Badge color="green" text="Opérationnelle" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Base de données</Text>
                <Badge color="green" text="Connectée" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">API</Text>
                <Badge color="green" text="Réactive" />
              </div>
              <div className="flex items-center justify-between py-2">
                <Text className="text-gray-600">Sécurité</Text>
                <Badge color="green" text="Activée" />
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={
              <Space>
                <span className="text-blue-500">ℹ️</span>
                <span className="text-gray-900">Informations</span>
              </Space>
            }
            className="shadow-sm border border-blue-200"
          >
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <Text className="text-blue-800 font-medium block">Design Épuré Activé</Text>
                <Text className="text-blue-600 text-sm">Interface optimisée pour la productivité</Text>
              </div>
              <div className="text-center">
                <Avatar.Group maxCount={3}>
                  <Avatar style={{ backgroundColor: '#1890ff' }}>U1</Avatar>
                  <Avatar style={{ backgroundColor: '#52c41a' }}>U2</Avatar>
                  <Avatar style={{ backgroundColor: '#faad14' }}>U3</Avatar>
                  <Avatar style={{ backgroundColor: '#f5222d' }}>U4</Avatar>
                </Avatar.Group>
                <div className="mt-2 text-sm text-gray-600">
                  4 utilisateurs connectés
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal épuré */}
      <Modal
        title="Planifier un Rendez-vous"
        open={modalVisible}
        onOk={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
        className="rounded-lg"
      >
        <div className="py-4">
          <Space direction="vertical" className="w-full">
            <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded">
              <CalendarOutlined className="text-blue-500 mr-3" />
              <div>
                <Text strong>Nouveau Rendez-vous</Text>
                <div className="text-sm text-gray-600">Sélectionnez un créneau disponible</div>
              </div>
            </div>
            <Input placeholder="Objet du rendez-vous" />
            <Input.TextArea placeholder="Description (optionnelle)" rows={3} />
          </Space>
        </div>
      </Modal>

    </div>
  );
};

export default PremiumTestPageClean;
