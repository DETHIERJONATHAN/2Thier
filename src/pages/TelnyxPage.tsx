import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import {
  Layout,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Statistic,
  List,
  Avatar,
  Drawer,
  Space,
  message,
  theme,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Alert,
  Tabs,
  // Collapse
} from 'antd';
import {
  PhoneOutlined,
  MessageOutlined,
  PlusOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  MutedOutlined,
  PhoneTwoTone,
  DashboardOutlined,
  NumberOutlined,
  AudioOutlined,
  ApiOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
// const { Panel } = Collapse;

// --- INTERFACES ---
interface TelnyxConnection {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: 'voice' | 'messaging' | 'mixed';
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: 'active' | 'pending' | 'ported' | 'disabled';
  country_code: string;
  number_type: 'local' | 'toll-free' | 'national' | 'mobile';
  features: string[];
  monthly_cost: number;
  connection_id?: string;
  purchased_at: string;
}

interface CallRecord {
  id: string;
  call_id: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'busy' | 'no-answer' | 'failed' | 'in-progress';
  duration: number;
  cost: number;
  started_at: string;
  ended_at?: string;
  recording_url?: string;
  lead_id?: string;
}

interface MessageRecord {
  id: string;
  message_id: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  type: 'sms' | 'mms';
  text: string;
  status: 'delivered' | 'failed' | 'pending' | 'sent';
  cost: number;
  sent_at: string;
  delivered_at?: string;
  media_urls?: string[];
  lead_id?: string;
}

interface TelnyxStats {
  totalCalls: number;
  todayCalls: number;
  totalMessages: number;
  todayMessages: number;
  activeNumbers: number;
  monthlyCost: number;
  successRate: number;
  avgCallDuration: number;
  totalMinutes: number;
  activeConnections: number;
}

interface Lead {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

// --- COMPOSANT PRINCIPAL ---
const TelnyxPage: React.FC = () => {
  const [msgApi, msgCtx] = message.useMessage();
  // const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  const { token } = theme.useToken();

  // --- ÉTATS ---
  const [connections, setConnections] = useState<TelnyxConnection[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<TelnyxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Modals & Drawers
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isSmsModalVisible, setIsSmsModalVisible] = useState(false);
  const [isNumberModalVisible, setIsNumberModalVisible] = useState(false);
  const [isCallDrawerVisible, setIsCallDrawerVisible] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  
  // Call State
  const [currentCall, setCurrentCall] = useState<CallRecord | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Forms
  const [configForm] = Form.useForm();
  const [callForm] = Form.useForm();
  const [smsForm] = Form.useForm();
  const [numberForm] = Form.useForm();

  const stableApi = useMemo(() => api, [api]);

  // --- LOGIQUE DE DONNÉES ---
  const loadData = useCallback(async () => {
    if (!stableApi) return;
    setLoading(true);
    try {
      console.log('🔍 [Telnyx] Chargement des données...');
      const [
        connectionsResponse,
        numbersResponse,
        callsResponse,
        messagesResponse,
        leadsResponse
      ] = await Promise.all([
        stableApi.get('/api/telnyx/connections'),
        stableApi.get('/api/telnyx/phone-numbers'),
        stableApi.get('/api/telnyx/calls?limit=50'),
        stableApi.get('/api/telnyx/messages?limit=50'),
        stableApi.get('/api/leads?limit=1000')
      ]);

      // Traitement des réponses
      const connectionsData = Array.isArray(connectionsResponse) ? connectionsResponse : 
                             connectionsResponse?.data || [];
      const numbersData = Array.isArray(numbersResponse) ? numbersResponse : 
                         numbersResponse?.data || [];
      const callsData = Array.isArray(callsResponse) ? callsResponse : 
                       callsResponse?.data || [];
      const messagesData = Array.isArray(messagesResponse) ? messagesResponse : 
                          messagesResponse?.data || [];
      const leadsData = Array.isArray(leadsResponse?.data?.data) ? leadsResponse.data.data : [];

      setConnections(connectionsData);
      setPhoneNumbers(numbersData);
      setCallHistory(callsData);
      setMessageHistory(messagesData);
      
      // Format leads
      const formattedLeads = leadsData.map((lead: {
        id: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        company?: string;
      }) => ({
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 
              lead.company || `Lead #${lead.id.substring(0,4)}`,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        company: lead.company
      }));
      setLeads(formattedLeads);

      // Calcul des stats
      calculateStats(connectionsData, numbersData, callsData, messagesData);
      
      msgApi.success('Données Telnyx chargées avec succès');
    } catch (error) {
      console.error('❌ [Telnyx] Erreur lors du chargement:', error);
      msgApi.error('Erreur lors du chargement des données Telnyx');
    } finally {
      setLoading(false);
    }
  }, [stableApi, msgApi]);

  const calculateStats = (connections: TelnyxConnection[], numbers: PhoneNumber[], 
                         calls: CallRecord[], messages: MessageRecord[]) => {
    const today = dayjs().startOf('day');
    const todayCalls = calls.filter(call => dayjs(call.started_at).isAfter(today)).length;
    const todayMessages = messages.filter(msg => dayjs(msg.sent_at).isAfter(today)).length;
    const totalMinutes = calls.reduce((sum, call) => sum + call.duration, 0);
    const monthlyCost = numbers.reduce((sum, num) => sum + num.monthly_cost, 0);
    const successfulCalls = calls.filter(call => call.status === 'completed').length;
    const successRate = calls.length > 0 ? (successfulCalls / calls.length) * 100 : 100;
    const avgDuration = calls.length > 0 ? totalMinutes / calls.length : 0;

    setStats({
      totalCalls: calls.length,
      todayCalls,
      totalMessages: messages.length,
      todayMessages,
      activeNumbers: numbers.filter(num => num.status === 'active').length,
      monthlyCost,
      successRate,
      avgCallDuration: avgDuration,
      totalMinutes: Math.floor(totalMinutes / 60), // Convert to minutes
      activeConnections: connections.filter(conn => conn.status === 'active').length
    });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- GESTIONNAIRES D'APPELS ---
  const handleMakeCall = async (values: { to: string; from: string; leadId?: string }) => {
    if (!stableApi) return;
    try {
      console.log('📞 [Telnyx] Initiation d\'appel:', values);
      const response = await stableApi.post('/api/telnyx/calls', {
        to: values.to,
        from: values.from,
        connection_id: connections.find(c => c.status === 'active')?.id,
        lead_id: values.leadId,
        webhook_url: `${window.location.origin}/api/telnyx/webhooks/calls`
      });

      setCurrentCall(response.data);
      setIsCallActive(true);
      setCallDuration(0);
      setIsCallModalVisible(false);
  msgApi.success('Appel initié avec succès');
      
      // Démarrer le compteur de durée
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Stocker le timer pour pouvoir l'arrêter
  (window as unknown as { callTimer?: number | null }).callTimer = timer as unknown as number;
      
    } catch (error) {
      console.error('❌ [Telnyx] Erreur lors de l\'appel:', error);
      msgApi.error('Erreur lors de l\'initiation de l\'appel');
    }
  };

  const handleEndCall = async () => {
    if (!currentCall || !stableApi) return;
    try {
      await stableApi.post(`/api/telnyx/calls/${currentCall.id}/hangup`);
      setIsCallActive(false);
      setCurrentCall(null);
      setCallDuration(0);
      setIsMuted(false);
      
      // Arrêter le timer
  const w = window as unknown as { callTimer?: number | null };
      if (w.callTimer) {
        clearInterval(w.callTimer);
        w.callTimer = null;
      }
      
      msgApi.success('Appel terminé');
      loadData(); // Recharger pour mettre à jour l'historique
    } catch (error) {
      console.error('❌ [Telnyx] Erreur fin d\'appel:', error);
      msgApi.error('Erreur lors de la fin d\'appel');
    }
  };

  const handleToggleMute = async () => {
    if (!currentCall || !stableApi) return;
    try {
      const action = isMuted ? 'unmute' : 'mute';
      await stableApi.post(`/api/telnyx/calls/${currentCall.id}/${action}`);
      setIsMuted(!isMuted);
      msgApi.success(isMuted ? 'Micro activé' : 'Micro coupé');
    } catch (error) {
      console.error('❌ [Telnyx] Erreur mute/unmute:', error);
      msgApi.error('Erreur lors du changement de micro');
    }
  };

  // --- GESTIONNAIRES SMS ---
  const handleSendSms = async (values: { to: string; from: string; text: string; leadId?: string }) => {
    if (!stableApi) return;
    try {
      console.log('💬 [Telnyx] Envoi SMS:', values);
      await stableApi.post('/api/telnyx/messages', {
        to: values.to,
        from: values.from,
        text: values.text,
        lead_id: values.leadId,
        type: 'SMS'
      });

      setIsSmsModalVisible(false);
      smsForm.resetFields();
      msgApi.success('SMS envoyé avec succès');
      loadData(); // Recharger pour mettre à jour l'historique
    } catch (error) {
      console.error('❌ [Telnyx] Erreur envoi SMS:', error);
      msgApi.error('Erreur lors de l\'envoi du SMS');
    }
  };

  // --- GESTIONNAIRES NUMÉROS ---
  const handlePurchaseNumber = async (values: { country: string; type: string; area_code?: string }) => {
    if (!stableApi) return;
    try {
      console.log('🔢 [Telnyx] Achat numéro:', values);
      await stableApi.post('/api/telnyx/phone-numbers/purchase', values);
      
      setIsNumberModalVisible(false);
      numberForm.resetFields();
      msgApi.success('Numéro acheté avec succès');
      loadData();
    } catch (error) {
      console.error('❌ [Telnyx] Erreur achat numéro:', error);
      msgApi.error('Erreur lors de l\'achat du numéro');
    }
  };

  // --- SYNCHRONISATION ---
  const syncWithTelnyx = useCallback(async () => {
    if (!stableApi) return;
    setSyncing(true);
    try {
      await stableApi.post('/api/telnyx/sync');
      await loadData();
      msgApi.success('Synchronisation Telnyx réussie !');
    } catch (error) {
      console.error('❌ [Telnyx] Erreur sync:', error);
      msgApi.error('Erreur lors de la synchronisation Telnyx');
    } finally {
      setSyncing(false);
    }
  }, [stableApi, loadData, msgApi]);

  // --- HELPERS FORMATAGE ---
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'active': 'green',
      'completed': 'green',
      'delivered': 'green',
      'pending': 'orange',
      'failed': 'red',
      'error': 'red',
      'busy': 'orange',
      'no-answer': 'gray',
      'inactive': 'gray',
      'disabled': 'red'
    };
    return colors[status] || 'default';
  };

  // --- RENDU DES COMPOSANTS ---
  const renderStatsPanel = () => (
    <Card title="📊 Statistiques Telnyx" className="mb-4">
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Statistic 
            title="Appels Aujourd'hui" 
            value={stats?.todayCalls} 
            prefix={<PhoneOutlined style={{ color: token.colorPrimary }} />} 
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="SMS Aujourd'hui" 
            value={stats?.todayMessages} 
            prefix={<MessageOutlined style={{ color: token.colorSuccess }} />} 
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Numéros Actifs" 
            value={stats?.activeNumbers} 
            prefix={<NumberOutlined style={{ color: token.colorWarning }} />} 
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Coût Mensuel" 
            value={stats?.monthlyCost || 0} 
            precision={2}
            prefix="€"
            valueStyle={{ color: token.colorError }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Taux de Réussite" 
            value={stats?.successRate || 0} 
            precision={1}
            suffix="%"
            valueStyle={{ color: stats?.successRate && stats.successRate > 90 ? token.colorSuccess : token.colorWarning }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Minutes Totales" 
            value={stats?.totalMinutes} 
            prefix={<ClockCircleOutlined style={{ color: token.colorInfo }} />} 
          />
        </Col>
      </Row>
    </Card>
  );

  const renderCurrentCall = () => {
    if (!isCallActive || !currentCall) return null;

    return (
      <Card 
        title={
          <Space>
            <PhoneTwoTone twoToneColor="#52c41a" />
            <Text strong>Appel en cours</Text>
          </Space>
        }
        className="mb-4"
        style={{ border: `2px solid ${token.colorSuccess}` }}
      >
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Text strong>Vers: {currentCall.to}</Text><br/>
            <Text type="secondary">De: {currentCall.from}</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: token.colorSuccess }}>
              {formatDuration(callDuration)}
            </Title>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button 
                icon={isMuted ? <SoundOutlined /> : <MutedOutlined />}
                onClick={handleToggleMute}
                type={isMuted ? "primary" : "default"}
              >
                {isMuted ? 'Activer' : 'Couper'}
              </Button>
              <Button 
                danger
                icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
                onClick={handleEndCall}
              >
                Raccrocher
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Card title="🚀 Actions Rapides" className="mb-4">
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Button 
            type="primary" 
            icon={<PhoneOutlined />} 
            onClick={() => setIsCallModalVisible(true)}
            block
            size="large"
          >
            Passer un Appel
          </Button>
        </Col>
        <Col span={8}>
          <Button 
            type="primary" 
            icon={<MessageOutlined />} 
            onClick={() => setIsSmsModalVisible(true)}
            block
            size="large"
            style={{ backgroundColor: token.colorSuccess }}
          >
            Envoyer SMS
          </Button>
        </Col>
        <Col span={8}>
          <Button 
            type="primary" 
            icon={<NumberOutlined />} 
            onClick={() => setIsNumberModalVisible(true)}
            block
            size="large"
            style={{ backgroundColor: token.colorWarning }}
          >
            Acheter Numéro
          </Button>
        </Col>
      </Row>
    </Card>
  );

  const renderConnectionsStatus = () => (
    <Card title="🔗 État des Connexions" size="small">
      <List
        loading={loading}
        dataSource={connections}
        renderItem={(connection) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar 
                  style={{ 
                    backgroundColor: connection.status === 'active' ? token.colorSuccess : token.colorError 
                  }} 
                  icon={<ApiOutlined />} 
                />
              }
              title={<Text style={{ fontSize: '12px' }}>{connection.name}</Text>}
              description={
                <Space>
                  <Tag color={getStatusColor(connection.status)}>{connection.status}</Tag>
                  <Text style={{ fontSize: '10px' }} type="secondary">{connection.type}</Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgContainer }}>
      {msgCtx}
      <Sider width={300} style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorder}`, padding: '16px' }}>
        {renderStatsPanel()}
        {renderQuickActions()}
        {renderConnectionsStatus()}
      </Sider>

      <Content style={{ padding: '0 24px 24px' }}>
        <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <PhoneTwoTone style={{ fontSize: '24px' }} />
            <Title level={2} style={{ margin: 0 }}>Telnyx - Communications</Title>
          </Space>
          <Space>
            <Button 
              icon={<SyncOutlined spin={syncing} />} 
              onClick={syncWithTelnyx} 
              loading={syncing}
            >
              Synchroniser
            </Button>
          </Space>
        </div>

        {renderCurrentCall()}

        <Tabs defaultActiveKey="dashboard" items={[
          {
            key: 'dashboard',
            label: (
              <span>
                <DashboardOutlined />
                Tableau de Bord
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <Card title="📞 Historique des Appels" extra={<Button size="small">Voir tout</Button>}>
                    <Table
                      dataSource={callHistory.slice(0, 10)}
                      columns={[
                        {
                          title: 'Direction',
                          dataIndex: 'direction',
                          key: 'direction',
                          render: (direction) => (
                            <Tag color={direction === 'inbound' ? 'blue' : 'green'}>
                              {direction === 'inbound' ? '↓ Entrant' : '↑ Sortant'}
                            </Tag>
                          ),
                          width: 100
                        },
                        {
                          title: 'Numéro',
                          key: 'number',
                          render: (_, record) => (
                            <Text>{record.direction === 'inbound' ? record.from : record.to}</Text>
                          )
                        },
                        {
                          title: 'Durée',
                          dataIndex: 'duration',
                          key: 'duration',
                          render: (duration) => formatDuration(duration),
                          width: 80
                        },
                        {
                          title: 'Statut',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
                          width: 100
                        },
                        {
                          title: 'Date',
                          dataIndex: 'started_at',
                          key: 'started_at',
                          render: (date) => dayjs(date).format('DD/MM HH:mm'),
                          width: 100
                        }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey="id"
                      onRow={(record) => ({
                        onClick: () => {
                          setSelectedCall(record);
                          setIsCallDrawerVisible(true);
                        }
                      })}
                    />
                  </Card>
                </Col>
                
                <Col span={12}>
                  <Card title="💬 Historique des Messages" extra={<Button size="small">Voir tout</Button>}>
                    <Table
                      dataSource={messageHistory.slice(0, 10)}
                      columns={[
                        {
                          title: 'Direction',
                          dataIndex: 'direction',
                          key: 'direction',
                          render: (direction) => (
                            <Tag color={direction === 'inbound' ? 'blue' : 'green'}>
                              {direction === 'inbound' ? '↓ Reçu' : '↑ Envoyé'}
                            </Tag>
                          ),
                          width: 80
                        },
                        {
                          title: 'Numéro',
                          key: 'number',
                          render: (_, record) => (
                            <Text>{record.direction === 'inbound' ? record.from : record.to}</Text>
                          )
                        },
                        {
                          title: 'Message',
                          dataIndex: 'text',
                          key: 'text',
                          render: (text) => (
                            <Text ellipsis={{ tooltip: text }}>
                              {text.length > 30 ? `${text.substring(0, 30)}...` : text}
                            </Text>
                          )
                        },
                        {
                          title: 'Statut',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
                          width: 80
                        },
                        {
                          title: 'Date',
                          dataIndex: 'sent_at',
                          key: 'sent_at',
                          render: (date) => dayjs(date).format('DD/MM HH:mm'),
                          width: 100
                        }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey="id"
                    />
                  </Card>
                </Col>
                
                <Col span={24}>
                  <Card title="📞 Numéros de Téléphone">
                    <Table
                      dataSource={phoneNumbers}
                      columns={[
                        {
                          title: 'Numéro',
                          dataIndex: 'phone_number',
                          key: 'phone_number',
                          render: (number) => <Text strong>{number}</Text>
                        },
                        {
                          title: 'Type',
                          dataIndex: 'number_type',
                          key: 'number_type',
                          render: (type) => {
                            const colors = {
                              'local': 'blue',
                              'toll-free': 'green',
                              'national': 'orange',
                              'mobile': 'purple'
                            };
                            return <Tag color={colors[type as keyof typeof colors]}>{type}</Tag>;
                          }
                        },
                        {
                          title: 'Pays',
                          dataIndex: 'country_code',
                          key: 'country_code',
                          render: (code) => <Text>{code.toUpperCase()}</Text>
                        },
                        {
                          title: 'Fonctionnalités',
                          dataIndex: 'features',
                          key: 'features',
                          render: (features) => (
                            <Space wrap>
                              {features.map((feature: string) => (
                                <Tag key={feature} size="small">{feature}</Tag>
                              ))}
                            </Space>
                          )
                        },
                        {
                          title: 'Coût/Mois',
                          dataIndex: 'monthly_cost',
                          key: 'monthly_cost',
                          render: (cost) => formatCurrency(cost)
                        },
                        {
                          title: 'Statut',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>
                        },
                        {
                          title: 'Date d\'achat',
                          dataIndex: 'purchased_at',
                          key: 'purchased_at',
                          render: (date) => dayjs(date).format('DD/MM/YYYY')
                        }
                      ]}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'analytics',
            label: (
              <span>
                <BarChartOutlined />
                Analytiques
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col span={24}>
                  <Alert
                    message="Analytiques Telnyx"
                    description="Fonctionnalité en cours de développement. Statistiques détaillées et rapports à venir."
                    type="info"
                    showIcon
                  />
                </Col>
              </Row>
            )
          }
        ]} />
      </Content>

      {/* Modal Configuration */}
      <Modal
        title="⚙️ Configuration Telnyx"
        open={isConfigModalVisible}
        onCancel={() => setIsConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={configForm} layout="vertical">
          <Alert
            message="Configuration API Telnyx"
            description="Entrez vos clés API Telnyx pour activer l'intégration complète."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Form.Item name="api_key" label="Clé API Telnyx" rules={[{ required: true }]}>
            <Input.Password placeholder="KEY_..." />
          </Form.Item>
          
          <Form.Item name="webhook_url" label="URL Webhook">
            <Input placeholder="https://votre-domaine.com/api/telnyx/webhooks" />
          </Form.Item>
          
          <Form.Item name="default_connection" label="Connexion par défaut">
            <Select placeholder="Sélectionner une connexion">
              {connections.map(conn => (
                <Option key={conn.id} value={conn.id}>{conn.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Sauvegarder
              </Button>
              <Button onClick={() => setIsConfigModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Appel */}
      <Modal
        title="📞 Passer un Appel"
        open={isCallModalVisible}
        onCancel={() => setIsCallModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={callForm} layout="vertical" onFinish={handleMakeCall}>
          <Form.Item name="to" label="Numéro à appeler" rules={[{ required: true }]}>
            <Input placeholder="+33123456789" prefix={<PhoneOutlined />} />
          </Form.Item>
          
          <Form.Item name="from" label="Depuis le numéro" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un numéro">
              {phoneNumbers.filter(num => num.status === 'active').map(num => (
                <Option key={num.id} value={num.phone_number}>{num.phone_number}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="leadId" label="Lier à un lead">
            <Select placeholder="Sélectionner un lead" allowClear>
              {leads.map(lead => (
                <Option key={lead.id} value={lead.id}>{lead.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PhoneOutlined />}>
                Appeler
              </Button>
              <Button onClick={() => setIsCallModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal SMS */}
      <Modal
        title="💬 Envoyer un SMS"
        open={isSmsModalVisible}
        onCancel={() => setIsSmsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={smsForm} layout="vertical" onFinish={handleSendSms}>
          <Form.Item name="to" label="Numéro destinataire" rules={[{ required: true }]}>
            <Input placeholder="+33123456789" prefix={<PhoneOutlined />} />
          </Form.Item>
          
          <Form.Item name="from" label="Depuis le numéro" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un numéro">
              {phoneNumbers.filter(num => num.status === 'active' && num.features.includes('SMS')).map(num => (
                <Option key={num.id} value={num.phone_number}>{num.phone_number}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="text" label="Message" rules={[{ required: true, max: 160 }]}>
            <TextArea rows={4} placeholder="Votre message..." showCount maxLength={160} />
          </Form.Item>
          
          <Form.Item name="leadId" label="Lier à un lead">
            <Select placeholder="Sélectionner un lead" allowClear>
              {leads.map(lead => (
                <Option key={lead.id} value={lead.id}>{lead.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<MessageOutlined />}>
                Envoyer
              </Button>
              <Button onClick={() => setIsSmsModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Achat Numéro */}
      <Modal
        title="🔢 Acheter un Numéro"
        open={isNumberModalVisible}
        onCancel={() => setIsNumberModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={numberForm} layout="vertical" onFinish={handlePurchaseNumber}>
          <Form.Item name="country" label="Pays" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un pays">
              <Option value="FR">🇫🇷 France</Option>
              <Option value="BE">🇧🇪 Belgique</Option>
              <Option value="US">🇺🇸 États-Unis</Option>
              <Option value="GB">🇬🇧 Royaume-Uni</Option>
              <Option value="DE">🇩🇪 Allemagne</Option>
              <Option value="ES">🇪🇸 Espagne</Option>
              <Option value="IT">🇮🇹 Italie</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="type" label="Type de numéro" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un type">
              <Option value="local">📍 Local</Option>
              <Option value="toll-free">🆓 Numéro vert</Option>
              <Option value="national">🌍 National</Option>
              <Option value="mobile">📱 Mobile</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="area_code" label="Indicatif régional (optionnel)">
            <Input placeholder="Ex: 01, 02, 03..." />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Acheter
              </Button>
              <Button onClick={() => setIsNumberModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer Détails Appel */}
      <Drawer
        title="📞 Détails de l'Appel"
        placement="right"
        size="large"
        onClose={() => setIsCallDrawerVisible(false)}
        open={isCallDrawerVisible}
      >
        {selectedCall && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card title="Informations Générales" size="small">
              <p><strong>ID Appel:</strong> {selectedCall.call_id}</p>
              <p><strong>Direction:</strong> <Tag color={selectedCall.direction === 'inbound' ? 'blue' : 'green'}>
                {selectedCall.direction === 'inbound' ? 'Entrant' : 'Sortant'}
              </Tag></p>
              <p><strong>De:</strong> {selectedCall.from}</p>
              <p><strong>Vers:</strong> {selectedCall.to}</p>
              <p><strong>Statut:</strong> <Tag color={getStatusColor(selectedCall.status)}>{selectedCall.status}</Tag></p>
              <p><strong>Durée:</strong> {formatDuration(selectedCall.duration)}</p>
              <p><strong>Coût:</strong> {formatCurrency(selectedCall.cost)}</p>
            </Card>
            
            <Card title="Horodatage" size="small">
              <p><strong>Début:</strong> {dayjs(selectedCall.started_at).format('DD/MM/YYYY HH:mm:ss')}</p>
              {selectedCall.ended_at && (
                <p><strong>Fin:</strong> {dayjs(selectedCall.ended_at).format('DD/MM/YYYY HH:mm:ss')}</p>
              )}
            </Card>
            
            {selectedCall.recording_url && (
              <Card title="Enregistrement" size="small">
                <Button icon={<AudioOutlined />} type="primary">
                  Écouter l'enregistrement
                </Button>
              </Card>
            )}
            
            {selectedCall.lead_id && (
              <Card title="Lead Associé" size="small">
                <p><strong>Lead:</strong> {leads.find(l => l.id === selectedCall.lead_id)?.name || 'Inconnu'}</p>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </Layout>
  );
};

export default TelnyxPage;
