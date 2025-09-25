import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import {
  Layout,
  Card,
  Button,
  Typography,
  Row,
  Col,
  Space,
  List,
  Avatar,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Switch,
  Statistic,
  Progress,
  Tabs,
  Divider,
  FloatButton,
  message,
  theme,
  Badge,
  Timeline,
  Empty
} from 'antd';
import {
  VideoCameraOutlined,
  PlusOutlined,
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  CopyOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 🎥 INTERFACES ULTRA COMPLÈTES GOOGLE MEET
interface GoogleMeetRoom {
  id: string;
  name: string;
  meetingCode: string;
  meetingUrl: string;
  hostEmail: string;
  hostName: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  participantCount: number;
  maxParticipants: number;
  isRecording: boolean;
  recordingUrl?: string;
  description?: string;
  agenda?: string;
  participants: MeetParticipant[];
  settings: MeetSettings;
  stats: MeetStats;
  eventId?: string;
  projectId?: string;
  clientId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MeetParticipant {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'host' | 'co-host' | 'participant';
  joinedAt?: string;
  leftAt?: string;
  duration?: number;
  isMuted: boolean;
  isCameraOn: boolean;
  isPresenting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  device: string;
  location?: string;
}

interface MeetSettings {
  allowScreenShare: boolean;
  allowRecording: boolean;
  requireAuth: boolean;
  muteOnJoin: boolean;
  enableChat: boolean;
  enableBreakoutRooms: boolean;
  maxDuration: number;
  enableWaitingRoom: boolean;
  allowExternalParticipants: boolean;
}

interface MeetStats {
  totalDuration: number;
  averageParticipants: number;
  peakParticipants: number;
  totalJoins: number;
  screenShareTime: number;
  recordingDuration: number;
  chatMessages: number;
  audioQualityScore: number;
  videoQualityScore: number;
}

interface MeetingAnalytics {
  totalMeetings: number;
  totalDuration: number;
  averageDuration: number;
  totalParticipants: number;
  averageParticipants: number;
  recordingUsage: number;
  qualityScore: number;
  topHosts: Array<{ name: string; meetings: number }>;
  usageByDay: Array<{ date: string; meetings: number; duration: number }>;
  deviceStats: { [key: string]: number };
}

// 🎯 COMPOSANT PRINCIPAL GOOGLE MEET ULTRA COMPLET
const GoogleMeetPage: React.FC = () => {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  const { token } = theme.useToken();

  // 📊 ÉTATS POUR LA GESTION COMPLÈTE
  const [meetings, setMeetings] = useState<GoogleMeetRoom[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<GoogleMeetRoom[]>([]);
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [currentTab, setCurrentTab] = useState('upcoming');
  
  // 📝 ÉTATS POUR LES MODALES
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [joinForm] = Form.useForm();
  
  // 🔍 ÉTATS POUR LES FILTRES
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // 🔧 API STABILISÉE
  const stableApi = useMemo(() => api, [api]);

  // 📊 CHARGEMENT DES DONNÉES
  const loadMeetings = useCallback(async () => {
    if (!stableApi) return;
    
    try {
      const [meetingsResponse, analyticsResponse] = await Promise.all([
        stableApi.get('/api/google-meet/meetings'),
        stableApi.get('/api/google-meet/analytics')
      ]);
      
      setMeetings(meetingsResponse.data || []);
      setFilteredMeetings(meetingsResponse.data || []);
      setAnalytics(analyticsResponse.data || null);
      
      message.success('Données Google Meet chargées');
    } catch (error) {
      console.error('Erreur chargement Google Meet:', error);
      message.error('Erreur lors du chargement');
    }
  }, [stableApi]);

  // 🎥 CRÉATION D'UNE RÉUNION
  const handleCreateMeeting = async (values: {
    name: string;
    description: string;
    scheduledDateTime: [Dayjs, Dayjs];
    maxParticipants: number;
    settings: MeetSettings;
  }) => {
    if (!stableApi) return;

    try {
      const meetingData = {
        name: values.name,
        description: values.description,
        scheduledStart: values.scheduledDateTime[0].toISOString(),
        scheduledEnd: values.scheduledDateTime[1].toISOString(),
        maxParticipants: values.maxParticipants,
        settings: values.settings,
        hostEmail: user?.email
      };

      const response = await stableApi.post('/api/google-meet/meetings', meetingData);
      const newMeeting = response.data;

      message.success(`Réunion créée : ${newMeeting.meetingCode}`);
      setIsCreateModalVisible(false);
      form.resetFields();
      loadMeetings();

      // Copier automatiquement le lien
      navigator.clipboard.writeText(newMeeting.meetingUrl);
      message.info('Lien de la réunion copié dans le presse-papiers');
    } catch (error) {
      console.error('Erreur création réunion:', error);
      message.error('Erreur lors de la création de la réunion');
    }
  };

  // 🔗 REJOINDRE UNE RÉUNION
  const handleJoinMeeting = async (values: { meetingCode: string }) => {
    if (!stableApi) return;

    try {
      const response = await stableApi.post(`/google-meet/join/${values.meetingCode}`);
      const meeting = response.data;
      
      // Ouvrir Google Meet dans un nouvel onglet
      window.open(meeting.meetingUrl, '_blank');
      
      setIsJoinModalVisible(false);
      joinForm.resetFields();
      message.success('Redirection vers Google Meet...');
    } catch (error) {
      console.error('Erreur rejoindre réunion:', error);
      message.error('Code de réunion invalide ou réunion non trouvée');
    }
  };

  // 📊 DÉMARRER UNE RÉUNION IMMÉDIATE
  const startInstantMeeting = async () => {
    if (!stableApi) return;

    try {
      const response = await stableApi.post('/api/google-meet/instant');
      const meeting = response.data;
      
      window.open(meeting.meetingUrl, '_blank');
      loadMeetings();
      
      message.success('Réunion instantanée créée !');
    } catch (error) {
      console.error('Erreur réunion instantanée:', error);
      message.error('Erreur lors de la création de la réunion instantanée');
    }
  };

  // 🗑️ SUPPRIMER UNE RÉUNION
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!stableApi) return;

    Modal.confirm({
      title: 'Supprimer cette réunion ?',
      content: 'Cette action est irréversible et supprimera également l\'enregistrement.',
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okType: 'danger',
      onOk: async () => {
        try {
          await stableApi.delete(`/google-meet/meetings/${meetingId}`);
          message.success('Réunion supprimée');
          loadMeetings();
        } catch (error) {
          console.error('Erreur suppression:', error);
          message.error('Erreur lors de la suppression');
        }
      }
    });
  };

  // 🔍 FILTRAGE DES RÉUNIONS
  useEffect(() => {
    let filtered = meetings;

    // Filtrage par onglet
    switch (currentTab) {
      case 'upcoming':
        filtered = filtered.filter(m => 
          dayjs(m.scheduledStart).isAfter(dayjs()) && m.status !== 'cancelled'
        );
        break;
      case 'live':
        filtered = filtered.filter(m => m.status === 'live');
        break;
      case 'past':
        filtered = filtered.filter(m => 
          dayjs(m.scheduledEnd).isBefore(dayjs()) || m.status === 'ended'
        );
        break;
    }

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(meeting =>
        meeting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.meetingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrage par statut
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(meeting => meeting.status === filterStatus);
    }

    // Filtrage par plage de dates
    if (dateRange) {
      filtered = filtered.filter(meeting => {
        const meetingDate = dayjs(meeting.scheduledStart);
        return meetingDate.isAfter(dateRange[0]) && meetingDate.isBefore(dateRange[1]);
      });
    }

    setFilteredMeetings(filtered);
  }, [meetings, currentTab, searchTerm, filterStatus, dateRange]);

  // 🚀 CHARGEMENT INITIAL
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // 📊 RENDU DES STATISTIQUES
  const renderStatsCards = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="Réunions ce mois"
            value={analytics?.totalMeetings || 0}
            prefix={<VideoCameraOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Temps total (h)"
            value={(analytics?.totalDuration || 0) / 60}
            precision={1}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: token.colorSuccess }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Participants total"
            value={analytics?.totalParticipants || 0}
            prefix={<TeamOutlined />}
            valueStyle={{ color: token.colorWarning }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <div>
            <Text strong>Qualité moyenne</Text>
            <Progress 
              percent={analytics?.qualityScore || 0} 
              size="small"
              status={
                (analytics?.qualityScore || 0) > 80 ? 'success' :
                (analytics?.qualityScore || 0) > 60 ? 'normal' : 'exception'
              }
            />
          </div>
        </Card>
      </Col>
    </Row>
  );

  // 🎥 RENDU D'UNE CARTE RÉUNION
  const renderMeetingCard = (meeting: GoogleMeetRoom) => {
    const isLive = meeting.status === 'live';
    
    return (
      <Card
        key={meeting.id}
        style={{ marginBottom: 16 }}
        actions={[
          <Button 
            key="join"
            type={isLive ? "primary" : "default"}
            icon={<VideoCameraOutlined />}
            onClick={() => window.open(meeting.meetingUrl, '_blank')}
            disabled={meeting.status === 'cancelled'}
          >
            {isLive ? 'Rejoindre' : 'Ouvrir'}
          </Button>,
          <Button 
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(meeting.meetingUrl);
              message.success('Lien copié !');
            }}
          >
            Copier lien
          </Button>,
          <Button 
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteMeeting(meeting.id)}
            disabled={isLive}
          >
            Supprimer
          </Button>
        ]}
      >
        <Row justify="space-between" align="top">
          <Col span={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {meeting.name}
                  {isLive && <Badge status="processing" text="En direct" />}
                  {meeting.isRecording && <VideoCameraOutlined style={{ color: token.colorError }} />}
                </Title>
                <Text type="secondary">Code: {meeting.meetingCode}</Text>
              </div>
              
              <div>
                <Space size="middle">
                  <Text>
                    <CalendarOutlined /> {dayjs(meeting.scheduledStart).format('DD/MM/YYYY HH:mm')}
                  </Text>
                  <Text>
                    <ClockCircleOutlined /> {dayjs(meeting.scheduledEnd).diff(dayjs(meeting.scheduledStart), 'minutes')} min
                  </Text>
                  <Text>
                    <TeamOutlined /> {meeting.participantCount}/{meeting.maxParticipants}
                  </Text>
                </Space>
              </div>

              {meeting.description && (
                <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                  {meeting.description}
                </Paragraph>
              )}
            </Space>
          </Col>
          
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size="small">
              <Tag color={
                meeting.status === 'live' ? 'green' :
                meeting.status === 'scheduled' ? 'blue' :
                meeting.status === 'ended' ? 'default' : 'red'
              }>
                {meeting.status === 'live' ? '🔴 En direct' :
                 meeting.status === 'scheduled' ? '📅 Programmé' :
                 meeting.status === 'ended' ? '✅ Terminé' : '❌ Annulé'}
              </Tag>
              
              <Avatar.Group maxCount={3} size="small">
                {meeting.participants.slice(0, 5).map(participant => (
                  <Avatar
                    key={participant.id}
                    src={participant.avatar}
                    title={participant.name}
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </Avatar>
                ))}
              </Avatar.Group>
              
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Host: {meeting.hostName}
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgContainer }}>
      <Content style={{ padding: '24px' }}>
        {/* 🎯 EN-TÊTE */}
        <div style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                🎥 Google Meet
              </Title>
              <Text type="secondary">
                Gestion complète de vos visioconférences et réunions
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<VideoCameraOutlined />}
                  onClick={startInstantMeeting}
                  size="large"
                >
                  Réunion instantanée
                </Button>
                <Button
                  icon={<LinkOutlined />}
                  onClick={() => setIsJoinModalVisible(true)}
                >
                  Rejoindre
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalVisible(true)}
                  size="large"
                >
                  Programmer
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 📊 STATISTIQUES */}
        {renderStatsCards()}

        {/* 🔍 FILTRES */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Input.Search
                placeholder="Rechercher une réunion..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Statut"
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: '100%' }}
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="scheduled">📅 Programmé</Option>
                <Option value="live">🔴 En direct</Option>
                <Option value="ended">✅ Terminé</Option>
                <Option value="cancelled">❌ Annulé</Option>
              </Select>
            </Col>
            <Col span={10}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
                placeholder={['Date début', 'Date fin']}
              />
            </Col>
          </Row>
        </Card>

        {/* 📋 LISTE DES RÉUNIONS */}
        <Card>
          <Tabs activeKey={currentTab} onChange={setCurrentTab}>
            <TabPane tab="📅 À venir" key="upcoming">
              {filteredMeetings.length > 0 ? (
                filteredMeetings.map(renderMeetingCard)
              ) : (
                <Empty 
                  description="Aucune réunion à venir"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateModalVisible(true)}
                  >
                    Programmer une réunion
                  </Button>
                </Empty>
              )}
            </TabPane>
            
            <TabPane tab="🔴 En direct" key="live">
              {filteredMeetings.length > 0 ? (
                filteredMeetings.map(renderMeetingCard)
              ) : (
                <Empty 
                  description="Aucune réunion en cours"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </TabPane>
            
            <TabPane tab="📚 Historique" key="past">
              {filteredMeetings.length > 0 ? (
                filteredMeetings.map(renderMeetingCard)
              ) : (
                <Empty 
                  description="Aucun historique de réunion"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </TabPane>
            
            <TabPane tab="📊 Analytics" key="analytics">
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <Card title="📈 Utilisation par jour">
                    <Timeline>
                      {analytics?.usageByDay?.slice(0, 7).map((day, index) => (
                        <Timeline.Item key={index}>
                          <Text strong>{dayjs(day.date).format('DD/MM')}</Text>
                          <br />
                          <Text type="secondary">
                            {day.meetings} réunions - {Math.round(day.duration / 60)}h
                          </Text>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="👑 Top organisateurs">
                    <List
                      size="small"
                      dataSource={analytics?.topHosts?.slice(0, 5)}
                      renderItem={(host, index) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar>{index + 1}</Avatar>}
                            title={host.name}
                            description={`${host.meetings} réunions organisées`}
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Card>

        {/* 🔄 BOUTONS FLOTTANTS */}
        <FloatButton.Group shape="circle" style={{ right: 24 }}>
          <FloatButton 
            icon={<VideoCameraOutlined />} 
            type="primary"
            onClick={startInstantMeeting}
            tooltip="Réunion instantanée"
          />
          <FloatButton 
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
            tooltip="Programmer"
          />
          <FloatButton 
            icon={<LinkOutlined />}
            onClick={() => setIsJoinModalVisible(true)}
            tooltip="Rejoindre"
          />
        </FloatButton.Group>
      </Content>

      {/* 📝 MODAL CRÉATION RÉUNION */}
      <Modal
        title="📝 Programmer une réunion"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateMeeting}
          initialValues={{
            maxParticipants: 25,
            settings: {
              allowScreenShare: true,
              allowRecording: true,
              requireAuth: false,
              muteOnJoin: true,
              enableChat: true,
              enableBreakoutRooms: false,
              enableWaitingRoom: false,
              allowExternalParticipants: true
            }
          }}
        >
          <Form.Item
            name="name"
            label="Nom de la réunion"
            rules={[{ required: true, message: 'Le nom est obligatoire' }]}
          >
            <Input placeholder="Ex: Réunion équipe commerciale" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea 
              rows={3} 
              placeholder="Ordre du jour, objectifs..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="scheduledDateTime"
                label="Date et heure"
                rules={[{ required: true, message: 'La date est obligatoire' }]}
              >
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxParticipants" label="Max participants">
                <Select>
                  <Option value={10}>10 participants</Option>
                  <Option value={25}>25 participants</Option>
                  <Option value={50}>50 participants</Option>
                  <Option value={100}>100 participants</Option>
                  <Option value={250}>250 participants</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Paramètres avancés</Divider>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item 
                name={['settings', 'allowScreenShare']} 
                valuePropName="checked"
              >
                <Switch /> Partage d'écran
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name={['settings', 'allowRecording']} 
                valuePropName="checked"
              >
                <Switch /> Enregistrement
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name={['settings', 'muteOnJoin']} 
                valuePropName="checked"
              >
                <Switch /> Muet à l'entrée
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name={['settings', 'enableWaitingRoom']} 
                valuePropName="checked"
              >
                <Switch /> Salle d'attente
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Créer la réunion
              </Button>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                form.resetFields();
              }}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 🔗 MODAL REJOINDRE RÉUNION */}
      <Modal
        title="🔗 Rejoindre une réunion"
        open={isJoinModalVisible}
        onCancel={() => {
          setIsJoinModalVisible(false);
          joinForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={joinForm}
          layout="vertical"
          onFinish={handleJoinMeeting}
        >
          <Form.Item
            name="meetingCode"
            label="Code de la réunion"
            rules={[{ required: true, message: 'Le code est obligatoire' }]}
          >
            <Input 
              placeholder="Ex: abc-defg-hij ou lien complet"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                Rejoindre
              </Button>
              <Button onClick={() => {
                setIsJoinModalVisible(false);
                joinForm.resetFields();
              }}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default GoogleMeetPage;
