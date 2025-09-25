import React from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';

const ClientPage: React.FC = () => {
  // Données mockées pour les clients
  const mockClients = [
    {
      key: '1',
      id: 'CLI001',
      nom: 'Entreprise ABC',
      contact: 'Jean Dupont',
      email: 'jean.dupont@abc.com',
      telephone: '+32 2 123 45 67',
      ville: 'Bruxelles',
      statut: 'Actif',
      dernierContact: '2024-07-15'
    },
    {
      key: '2',
      id: 'CLI002',
      nom: 'Tech Solutions SPRL',
      contact: 'Marie Martin',
      email: 'marie.martin@techsol.be',
      telephone: '+32 9 987 65 43',
      ville: 'Gand',
      statut: 'Actif',
      dernierContact: '2024-07-12'
    },
    {
      key: '3',
      id: 'CLI003',
      nom: 'Digital Corp',
      contact: 'Pierre Legrand',
      email: 'pierre@digitalcorp.be',
      telephone: '+32 4 456 78 90',
      ville: 'Liège',
      statut: 'Inactif',
      dernierContact: '2024-06-20'
    }
  ];

  const columns = [
    {
      title: 'ID Client',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Nom de l\'entreprise',
      dataIndex: 'nom',
      key: 'nom',
    },
    {
      title: 'Contact principal',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <a href={`mailto:${email}`}>{email}</a>
    },
    {
      title: 'Téléphone',
      dataIndex: 'telephone',
      key: 'telephone',
    },
    {
      title: 'Ville',
      dataIndex: 'ville',
      key: 'ville',
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (statut: string) => (
        <span style={{ 
          color: statut === 'Actif' ? '#52c41a' : '#faad14',
          fontWeight: 'bold'
        }}>
          {statut}
        </span>
      )
    },
    {
      title: 'Dernier contact',
      dataIndex: 'dernierContact',
      key: 'dernierContact',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button size="small">Modifier</Button>
          <Button size="small">Contacter</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="client-page">
      <PageHeader 
        title="Gestion des Clients" 
        description="Gérez vos clients et leurs informations"
      />
      
      {/* Statistiques */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Clients"
              value={mockClients.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Clients Actifs"
              value={mockClients.filter(c => c.statut === 'Actif').length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Nouveaux ce mois"
              value={1}
              prefix={<PlusOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Contacts cette semaine"
              value={5}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions principales */}
      <div className="mb-4">
        <Space>
          <Button type="primary" icon={<PlusOutlined />}>
            Nouveau Client
          </Button>
          <Button icon={<MailOutlined />}>
            Campagne Email
          </Button>
          <Button>
            Exporter
          </Button>
        </Space>
      </div>

      {/* Tableau des clients */}
      <Card title="Liste des Clients">
        <Table 
          columns={columns} 
          dataSource={mockClients}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} clients`
          }}
        />
      </Card>
    </div>
  );
};

export default ClientPage;
