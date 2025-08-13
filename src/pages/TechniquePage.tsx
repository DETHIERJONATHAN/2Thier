import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Modal, Form, Input, Select } from 'antd';
import { ToolOutlined, BugOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';

const { Option } = Select;
const { TextArea } = Input;

interface Ticket {
  key: string;
  numero: string;
  titre: string;
  client: string;
  priorite: 'Faible' | 'Normale' | 'Haute' | 'Critique';
  statut: 'Ouvert' | 'En cours' | 'Résolu' | 'Fermé';
  type: 'Bug' | 'Demande' | 'Maintenance' | 'Installation';
  assigneA: string;
  dateCreation: string;
  derniereMAJ: string;
}

const TechniquePage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Données mockées pour les tickets techniques
  const mockTickets: Ticket[] = [
    {
      key: '1',
      numero: 'TECH-001',
      titre: 'Problème de connexion base de données',
      client: 'Entreprise ABC',
      priorite: 'Haute',
      statut: 'En cours',
      type: 'Bug',
      assigneA: 'Jean Technicien',
      dateCreation: '2024-07-30',
      derniereMAJ: '2024-07-30'
    },
    {
      key: '2',
      numero: 'TECH-002',
      titre: 'Installation nouveau serveur',
      client: 'Tech Solutions SPRL',
      priorite: 'Normale',
      statut: 'Ouvert',
      type: 'Installation',
      assigneA: 'Marie Admin',
      dateCreation: '2024-07-29',
      derniereMAJ: '2024-07-29'
    },
    {
      key: '3',
      numero: 'TECH-003',
      titre: 'Maintenance programmée système',
      client: 'Digital Corp',
      priorite: 'Faible',
      statut: 'Résolu',
      type: 'Maintenance',
      assigneA: 'Pierre Expert',
      dateCreation: '2024-07-25',
      derniereMAJ: '2024-07-28'
    },
    {
      key: '4',
      numero: 'TECH-004',
      titre: 'Demande de nouvelle fonctionnalité',
      client: 'StartUp XYZ',
      priorite: 'Normale',
      statut: 'En cours',
      type: 'Demande',
      assigneA: 'Sophie Dev',
      dateCreation: '2024-07-28',
      derniereMAJ: '2024-07-30'
    }
  ];

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'Faible': return 'green';
      case 'Normale': return 'blue';
      case 'Haute': return 'orange';
      case 'Critique': return 'red';
      default: return 'default';
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Ouvert': return 'blue';
      case 'En cours': return 'orange';
      case 'Résolu': return 'green';
      case 'Fermé': return 'default';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Bug': return <BugOutlined />;
      case 'Demande': return <ExclamationCircleOutlined />;
      case 'Maintenance': return <ToolOutlined />;
      case 'Installation': return <CheckCircleOutlined />;
      default: return <ToolOutlined />;
    }
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'numero',
      key: 'numero',
      sorter: true,
    },
    {
      title: 'Titre',
      dataIndex: 'titre',
      key: 'titre',
      render: (titre: string, record: Ticket) => (
        <div>
          {getTypeIcon(record.type)} {titre}
        </div>
      )
    },
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
    },
    {
      title: 'Priorité',
      dataIndex: 'priorite',
      key: 'priorite',
      render: (priorite: string) => (
        <Tag color={getPrioriteColor(priorite)}>{priorite}</Tag>
      ),
      filters: [
        { text: 'Critique', value: 'Critique' },
        { text: 'Haute', value: 'Haute' },
        { text: 'Normale', value: 'Normale' },
        { text: 'Faible', value: 'Faible' },
      ],
      onFilter: (value: boolean | React.Key, record: Ticket) => record.priorite === value,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (statut: string) => (
        <Tag color={getStatutColor(statut)}>{statut}</Tag>
      ),
      filters: [
        { text: 'Ouvert', value: 'Ouvert' },
        { text: 'En cours', value: 'En cours' },
        { text: 'Résolu', value: 'Résolu' },
        { text: 'Fermé', value: 'Fermé' },
      ],
      onFilter: (value: boolean | React.Key, record: Ticket) => record.statut === value,
    },
    {
      title: 'Assigné à',
      dataIndex: 'assigneA',
      key: 'assigneA',
    },
    {
      title: 'Création',
      dataIndex: 'dateCreation',
      key: 'dateCreation',
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button size="small">Voir</Button>
          <Button size="small">Modifier</Button>
          <Button size="small">Clôturer</Button>
        </Space>
      )
    }
  ];

  const handleCreateTicket = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      console.log('Nouveau ticket:', values);
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // Calculs statistiques
  const totalTickets = mockTickets.length;
  const ticketsOuverts = mockTickets.filter(t => t.statut === 'Ouvert').length;
  const ticketsEnCours = mockTickets.filter(t => t.statut === 'En cours').length;
  const ticketsResolus = mockTickets.filter(t => t.statut === 'Résolu').length;
  const ticketsCritiques = mockTickets.filter(t => t.priorite === 'Critique').length;

  return (
    <div className="technique-page">
      <PageHeader 
        title="Support Technique" 
        description="Gérez les tickets de support et les interventions techniques"
      />
      
      {/* Statistiques */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tickets"
              value={totalTickets}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ouverts"
              value={ticketsOuverts}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En Cours"
              value={ticketsEnCours}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Résolus"
              value={ticketsResolus}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="Tickets Critiques"
              value={ticketsCritiques}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Temps Moyen Résolution"
              value={2.5}
              suffix="jours"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Satisfaction Client"
              value={4.2}
              suffix="/ 5"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions principales */}
      <div className="mb-4">
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTicket}>
            Nouveau Ticket
          </Button>
          <Button icon={<ToolOutlined />}>
            Maintenance Programmée
          </Button>
          <Button>
            Rapport Technique
          </Button>
        </Space>
      </div>

      {/* Tableau des tickets */}
      <Card title="Tickets de Support">
        <Table 
          columns={columns} 
          dataSource={mockTickets}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} tickets`
          }}
        />
      </Card>

      {/* Modal création ticket */}
      <Modal
        title="Créer un nouveau ticket"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Créer"
        cancelText="Annuler"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="client" label="Client" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner un client">
                  <Option value="abc">Entreprise ABC</Option>
                  <Option value="tech">Tech Solutions SPRL</Option>
                  <Option value="digital">Digital Corp</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select placeholder="Type de ticket">
                  <Option value="Bug">Bug</Option>
                  <Option value="Demande">Demande</Option>
                  <Option value="Maintenance">Maintenance</Option>
                  <Option value="Installation">Installation</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priorite" label="Priorité" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner priorité">
                  <Option value="Faible">Faible</Option>
                  <Option value="Normale">Normale</Option>
                  <Option value="Haute">Haute</Option>
                  <Option value="Critique">Critique</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assigneA" label="Assigné à" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner technicien">
                  <Option value="jean">Jean Technicien</Option>
                  <Option value="marie">Marie Admin</Option>
                  <Option value="pierre">Pierre Expert</Option>
                  <Option value="sophie">Sophie Dev</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="titre" label="Titre du ticket" rules={[{ required: true }]}>
            <Input placeholder="Résumé du problème technique" />
          </Form.Item>
          <Form.Item name="description" label="Description détaillée" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Description complète du problème, étapes de reproduction, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TechniquePage;
