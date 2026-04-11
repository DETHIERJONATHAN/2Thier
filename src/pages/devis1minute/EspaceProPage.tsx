import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Button, Table, Tag, Progress, Space, Avatar, Divider, List, Timeline, Badge, Alert } from 'antd';
import { 
  UserOutlined, 
  TrophyOutlined, 
  EuroOutlined, 
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
  StarFilled,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;

interface Lead {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  service: string;
  budget: number;
  statut: 'nouveau' | 'contacte' | 'rdv' | 'devis' | 'termine';
  dateCreation: string;
  priority: 'haute' | 'moyenne' | 'basse';
}

interface StatsPartenaire {
  leadsTotal: number;
  leadsTraites: number;
  tauxConversion: number;
  chiffreAffaires: number;
  noteGlobale: number;
  avisClients: number;
}

const EspaceProPage: React.FC = () => {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsPartenaire>({
    leadsTotal: 127,
    leadsTraites: 89,
    tauxConversion: 23,
    chiffreAffaires: 45680,
    noteGlobale: 4.8,
    avisClients: 34
  });
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      nom: 'Martin',
      prenom: 'Jean',
      telephone: '0123456789',
      email: 'jean.martin@email.com',
      adresse: '123 Rue de la Paix, Paris',
      service: 'Plomberie',
      budget: 850,
      statut: 'nouveau',
      dateCreation: '2025-01-20',
      priority: 'haute'
    },
    {
      id: '2',
      nom: 'Dubois',
      prenom: 'Marie',
      telephone: '0987654321',
      email: 'marie.dubois@email.com',
      adresse: '456 Avenue Victor Hugo, Lyon',
      service: 'Électricité',
      budget: 1200,
      statut: 'contacte',
      dateCreation: '2025-01-19',
      priority: 'moyenne'
    }
  ]);

  const columns = [
    {
      title: 'Client',
      key: 'client',
      render: (record: Lead) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.prenom} {record.nom}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      render: (service: string) => <Tag color="blue">{service}</Tag>
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number) => <Text strong>{budget}€</Text>
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (statut: string) => {
        const colors = {
          nouveau: 'red',
          contacte: 'orange', 
          rdv: 'blue',
          devis: 'purple',
          termine: 'green'
        };
        return <Tag color={colors[statut as keyof typeof colors]}>{statut.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Priorité',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const icons = {
          haute: <ExclamationCircleOutlined style={{ color: 'red' }} />,
          moyenne: <ClockCircleOutlined style={{ color: 'orange' }} />,
          basse: <CheckCircleOutlined style={{ color: 'green' }} />
        };
        return icons[priority as keyof typeof icons];
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Lead) => (
        <Space>
          <Button size="small" icon={<PhoneOutlined />} type="primary">
            Appeler
          </Button>
          <Button size="small" icon={<MailOutlined />}>
            Email
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    // Simulation du chargement des données
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* En-tête avec informations du partenaire */}
      <Card className="mb-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Row align="middle">
          <Col span={4}>
            <Avatar size={80} icon={<UserOutlined />} />
          </Col>
          <Col span={16}>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              Espace Professionnel Devis1Minute
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
              Bienvenue {user?.prenom} {user?.nom}
            </Text>
            <br />
            <Space style={{ marginTop: '8px' }}>
              <StarFilled style={{ color: '#ffd700' }} />
              <Text style={{ color: 'white' }}>{stats.noteGlobale}/5</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                ({stats.avisClients} avis)
              </Text>
            </Space>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Badge count={leads.filter(l => l.statut === 'nouveau').length} offset={[10, 0]}>
              <Button type="primary" size="large" style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none' }}>
                Nouveaux Leads
              </Button>
            </Badge>
          </Col>
        </Row>
      </Card>

      {/* Statistiques principales */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="Leads Reçus" 
              value={stats.leadsTotal} 
              prefix={<TeamOutlined />} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="Leads Traités" 
              value={stats.leadsTraites} 
              prefix={<CheckCircleOutlined />} 
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={Math.round((stats.leadsTraites / stats.leadsTotal) * 100)} 
              size="small" 
              showInfo={false}
              strokeColor="#1890ff"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="Taux Conversion" 
              value={stats.tauxConversion} 
              suffix="%" 
              prefix={<RiseOutlined />} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic 
              title="CA Généré" 
              value={stats.chiffreAffaires} 
              prefix={<EuroOutlined />} 
              precision={0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alert d'information */}
      <Alert
        message="🎯 Optimisez votre taux de conversion"
        description="Répondez rapidement aux nouveaux leads ! Les partenaires qui contactent leurs prospects dans les 5 minutes ont 3x plus de chances de décrocher un contrat."
        type="info"
        showIcon
        className="mb-6"
        action={
          <Button size="small" type="primary">
            Conseils Pro
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        {/* Tableau des leads */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>Mes Leads Devis1Minute</span>
                <Badge count={leads.filter(l => l.statut === 'nouveau').length} style={{ backgroundColor: '#f5222d' }} />
              </Space>
            }
            extra={
              <Space>
                <Button type="primary">Filtrer</Button>
                <Button>Exporter</Button>
              </Space>
            }
          >
            <Table scroll={{ x: "max-content" }} 
              columns={columns} 
              dataSource={leads} 
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} leads`
              }}
            />
          </Card>
        </Col>

        {/* Panneau latéral */}
        <Col xs={24} lg={8}>
          {/* Activité récente */}
          <Card title="Activité Récente" className="mb-4">
            <Timeline
              items={[
                {
                  children: 'Nouveau lead reçu - Jean Martin',
                  color: 'red',
                },
                {
                  children: 'Appel programmé avec Marie Dubois',
                  color: 'blue',
                },
                {
                  children: 'Devis envoyé - Projet électricité',
                  color: 'green',
                },
                {
                  children: 'Contrat signé - 1 850€',
                  color: 'green',
                },
              ]}
            />
          </Card>

          {/* Objectifs du mois */}
          <Card title="Objectifs du Mois">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>Leads à traiter: {stats.leadsTraites}/100</Text>
                <Progress percent={(stats.leadsTraites/100)*100} size="small" />
              </div>
              <div>
                <Text>Chiffre d'affaires: {stats.chiffreAffaires}€/50 000€</Text>
                <Progress percent={(stats.chiffreAffaires/50000)*100} size="small" strokeColor="#722ed1" />
              </div>
              <div>
                <Text>Note moyenne: {stats.noteGlobale}/5.0</Text>
                <Progress percent={(stats.noteGlobale/5)*100} size="small" strokeColor="#ffd700" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EspaceProPage;
