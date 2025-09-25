import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker } from 'antd';
import { FileTextOutlined, EuroCircleOutlined, PlusOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';

const { Option } = Select;

interface Facture {
  key: string;
  numero: string;
  client: string;
  montant: number;
  statut: 'Payée' | 'En attente' | 'En retard' | 'Annulée';
  dateEmission: string;
  dateEcheance: string;
  description: string;
}

const FacturePage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Données mockées pour les factures
  const mockFactures: Facture[] = [
    {
      key: '1',
      numero: 'FAC-2024-001',
      client: 'Entreprise ABC',
      montant: 1250.00,
      statut: 'Payée',
      dateEmission: '2024-07-01',
      dateEcheance: '2024-07-31',
      description: 'Services de développement web'
    },
    {
      key: '2',
      numero: 'FAC-2024-002',
      client: 'Tech Solutions SPRL',
      montant: 2100.50,
      statut: 'En attente',
      dateEmission: '2024-07-15',
      dateEcheance: '2024-08-15',
      description: 'Licence logiciel CRM - 1 an'
    },
    {
      key: '3',
      numero: 'FAC-2024-003',
      client: 'Digital Corp',
      montant: 750.00,
      statut: 'En retard',
      dateEmission: '2024-06-01',
      dateEcheance: '2024-06-30',
      description: 'Maintenance serveur - juin 2024'
    },
    {
      key: '4',
      numero: 'FAC-2024-004',
      client: 'StartUp XYZ',
      montant: 3200.00,
      statut: 'En attente',
      dateEmission: '2024-07-20',
      dateEcheance: '2024-08-20',
      description: 'Développement application mobile'
    }
  ];

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Payée': return 'green';
      case 'En attente': return 'blue';
      case 'En retard': return 'red';
      case 'Annulée': return 'default';
      default: return 'default';
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
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      render: (montant: number) => `€${montant.toFixed(2)}`,
      sorter: (a: Facture, b: Facture) => a.montant - b.montant,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (statut: string) => (
        <Tag color={getStatutColor(statut)}>{statut}</Tag>
      ),
      filters: [
        { text: 'Payée', value: 'Payée' },
        { text: 'En attente', value: 'En attente' },
        { text: 'En retard', value: 'En retard' },
        { text: 'Annulée', value: 'Annulée' },
      ],
      onFilter: (value: boolean | React.Key, record: Facture) => record.statut === value,
    },
    {
      title: 'Date émission',
      dataIndex: 'dateEmission',
      key: 'dateEmission',
      sorter: true,
    },
    {
      title: 'Date échéance',
      dataIndex: 'dateEcheance',
      key: 'dateEcheance',
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>Voir</Button>
          <Button size="small">Modifier</Button>
          <Button size="small" icon={<ExportOutlined />}>PDF</Button>
        </Space>
      )
    }
  ];

  const handleCreateFacture = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      console.log('Nouvelle facture:', values);
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // Calculs statistiques
  const totalFactures = mockFactures.length;
  const facturesPayees = mockFactures.filter(f => f.statut === 'Payée').length;
  const facturesEnRetard = mockFactures.filter(f => f.statut === 'En retard').length;
  const montantTotal = mockFactures.reduce((sum, f) => sum + f.montant, 0);
  const montantPaye = mockFactures.filter(f => f.statut === 'Payée').reduce((sum, f) => sum + f.montant, 0);

  return (
    <div className="facture-page">
      <PageHeader 
        title="Gestion des Factures" 
        description="Créez, modifiez et suivez vos factures clients"
      />
      
      {/* Statistiques */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Factures"
              value={totalFactures}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Factures Payées"
              value={facturesPayees}
              suffix={`/ ${totalFactures}`}
              prefix={<EuroCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En Retard"
              value={facturesEnRetard}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Montant Total"
              value={montantTotal}
              prefix="€"
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="mb-6">
        <Col span={12}>
          <Card>
            <Statistic
              title="Montant Encaissé"
              value={montantPaye}
              prefix="€"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="En Attente d'Encaissement"
              value={montantTotal - montantPaye}
              prefix="€"
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions principales */}
      <div className="mb-4">
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateFacture}>
            Nouvelle Facture
          </Button>
          <Button icon={<ExportOutlined />}>
            Exporter Tout
          </Button>
          <Button>
            Relances
          </Button>
        </Space>
      </div>

      {/* Tableau des factures */}
      <Card title="Liste des Factures">
        <Table 
          columns={columns} 
          dataSource={mockFactures}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} factures`
          }}
        />
      </Card>

      {/* Modal création facture */}
      <Modal
        title="Créer une nouvelle facture"
        open={isModalVisible}
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
              <Form.Item name="montant" label="Montant (€)" rules={[{ required: true }]}>
                <Input type="number" placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dateEmission" label="Date d'émission" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dateEcheance" label="Date d'échéance" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Description des services ou produits facturés" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FacturePage;
