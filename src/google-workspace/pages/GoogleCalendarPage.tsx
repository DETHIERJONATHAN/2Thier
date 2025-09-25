import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Spin, Button, Space, Row, Col, Calendar, Badge, Modal, Form, Input, DatePicker, Select, TimePicker, Switch, List, Avatar, Tag, Tooltip, message, Divider, Popover, Alert, Tabs, Table, Progress, Timeline, Statistic, Drawer, Radio, Checkbox } from 'antd';
import { CalendarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined, VideoCameraOutlined, EnvironmentOutlined, ClockCircleOutlined, BellOutlined, SyncOutlined, SettingOutlined, FilterOutlined, PhoneOutlined, PlayCircleOutlined, BookOutlined, EyeOutlined, SearchOutlined, ExportOutlined, ImportOutlined, ShareAltOutlined, NotificationOutlined, MailOutlined, FileTextOutlined, LinkOutlined, CopyOutlined, PrinterOutlined, DownloadOutlined, CloudOutlined, MobileOutlined, DesktopOutlined, ApiOutlined, RobotOutlined, ThunderboltOutlined, StarOutlined, HeartOutlined, TrophyOutlined, CrownOutlined } from '@ant-design/icons';
import type { CalendarProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees: string[];
  meetingType: 'client' | 'internal' | 'demo' | 'followup' | 'personal' | 'recurring' | 'urgent' | 'all-day';
  projectId?: string;
  leadId?: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'confirmed' | 'tentative' | 'cancelled';
  reminders: number[];
  recurrence?: string;
  tags: string[];
  organizer: string;
  visibility: 'public' | 'private' | 'confidential';
}

interface CalendarStats {
  totalMeetings: number;
  todayMeetings: number;
  weekMeetings: number;
  monthMeetings: number;
  completedMeetings: number;
  cancelledMeetings: number;
  averageDuration: number;
  busyHours: number;
}

const GoogleCalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [calendarStats, setCalendarStats] = useState<CalendarStats>({
    totalMeetings: 0,
    todayMeetings: 0,
    weekMeetings: 0,
    monthMeetings: 0,
    completedMeetings: 0,
    cancelledMeetings: 0,
    averageDuration: 0,
    busyHours: 0
  });

  // Mock data pour démonstration
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Réunion client - Projet E-commerce',
      start: new Date(2025, 0, 24, 14, 0),
      end: new Date(2025, 0, 24, 15, 30),
      description: 'Discussion des spécifications détaillées du site e-commerce',
      attendees: ['client@example.com', 'dev@2thier.be'],
      meetingType: 'client',
      projectId: 'proj_1',
      location: 'Bureau 2Thier',
      isOnline: false,
      priority: 'high',
      status: 'confirmed',
      reminders: [15, 60],
      tags: ['e-commerce', 'spécifications'],
      organizer: 'dethier.jls@gmail.com',
      visibility: 'public'
    },
    {
      id: '2',
      title: 'Demo produit - Lead Startup',
      start: new Date(2025, 0, 25, 10, 0),
      end: new Date(2025, 0, 25, 11, 0),
      description: 'Présentation de nos solutions CRM',
      attendees: ['prospect@startup.com'],
      meetingType: 'demo',
      leadId: 'lead_1',
      isOnline: true,
      meetingUrl: 'https://meet.google.com/xyz-abc-def',
      priority: 'medium',
      status: 'confirmed',
      reminders: [10],
      tags: ['demo', 'CRM'],
      organizer: 'contact@2thier.be',
      visibility: 'public'
    },
    {
      id: '3',
      title: 'Standup équipe développement',
      start: new Date(2025, 0, 24, 9, 0),
      end: new Date(2025, 0, 24, 9, 30),
      description: 'Point quotidien de l\'équipe dev',
      attendees: ['dev1@2thier.be', 'dev2@2thier.be', 'pm@2thier.be'],
      meetingType: 'internal',
      isOnline: true,
      meetingUrl: 'https://meet.google.com/daily-standup',
      priority: 'medium',
      status: 'confirmed',
      reminders: [5],
      recurrence: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
      tags: ['standup', 'équipe'],
      organizer: 'pm@2thier.be',
      visibility: 'public'
    }
  ];

  useEffect(() => {
    setEvents(mockEvents);
    calculateStats(mockEvents);
  }, []);

  const calculateStats = (events: CalendarEvent[]) => {
    const today = dayjs();
    const todayEvents = events.filter(e => dayjs(e.start).isSame(today, 'day'));
    const weekEvents = events.filter(e => dayjs(e.start).isSame(today, 'week'));
    const monthEvents = events.filter(e => dayjs(e.start).isSame(today, 'month'));
    const completed = events.filter(e => dayjs(e.end).isBefore(today));
    const cancelled = events.filter(e => e.status === 'cancelled');

    const totalDuration = events.reduce((acc, event) => {
      return acc + (dayjs(event.end).diff(dayjs(event.start), 'minutes'));
    }, 0);

    setCalendarStats({
      totalMeetings: events.length,
      todayMeetings: todayEvents.length,
      weekMeetings: weekEvents.length,
      monthMeetings: monthEvents.length,
      completedMeetings: completed.length,
      cancelledMeetings: cancelled.length,
      averageDuration: events.length > 0 ? Math.round(totalDuration / events.length) : 0,
      busyHours: Math.round(totalDuration / 60 * 10) / 10
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const getEventColor = (event: CalendarEvent) => {
    const colors = {
      client: '#1890ff',
      internal: '#52c41a',
      demo: '#722ed1',
      followup: '#fa8c16',
      personal: '#eb2f96',
      recurring: '#13c2c2',
      urgent: '#f5222d',
      'all-day': '#faad14'
    };
    return colors[event.meetingType] || '#d9d9d9';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <ThunderboltOutlined className="text-red-500" />;
      case 'high': return <StarOutlined className="text-orange-500" />;
      case 'medium': return <HeartOutlined className="text-blue-500" />;
      case 'low': return <BookOutlined className="text-gray-400" />;
      default: return null;
    }
  };

  const dateCellRender = (value: Dayjs) => {
    const dayEvents = events.filter(event => 
      dayjs(event.start).isSame(value, 'day')
    );

    return (
      <ul className="events">
        {dayEvents.slice(0, 3).map(event => (
          <li key={event.id}>
            <Badge 
              color={getEventColor(event)}
              text={event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title}
              className="cursor-pointer text-xs"
              onClick={() => handleEventClick(event)}
            />
          </li>
        ))}
        {dayEvents.length > 3 && (
          <li className="text-xs text-gray-500">
            +{dayEvents.length - 3} autres...
          </li>
        )}
      </ul>
    );
  };

  const upcomingEvents = events
    .filter(event => dayjs(event.start).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
    .slice(0, 5);

  const todayEvents = events.filter(event => 
    dayjs(event.start).isSame(dayjs(), 'day')
  ).sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Title level={2} className="flex items-center gap-3 mb-2">
          <CalendarOutlined className="text-blue-500" />
          Google Calendar Pro - Planification Avancée CRM
        </Title>
        <Text className="text-gray-600">
          Interface complète de gestion calendrier avec statistiques, synchronisation CRM et fonctionnalités avancées
        </Text>
      </div>

      {/* Statistiques rapides */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} sm={6}>
          <Statistic
            title="Aujourd'hui"
            value={calendarStats.todayMeetings}
            prefix={<CalendarOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Cette semaine"
            value={calendarStats.weekMeetings}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Durée moy."
            value={calendarStats.averageDuration}
            suffix="min"
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Heures occupées"
            value={calendarStats.busyHours}
            suffix="h"
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Col>
      </Row>

      <Tabs defaultActiveKey="calendar" className="flex-1">
        <TabPane tab={<span><CalendarOutlined /> Calendrier</span>} key="calendar">
          <Row gutter={[16, 16]} className="h-full">
            {/* Sidebar gauche */}
            <Col xs={24} lg={6}>
              <Space direction="vertical" className="w-full" size="middle">
                {/* Actions rapides */}
                <Card size="small" title="⚡ Actions Rapides">
                  <Space direction="vertical" className="w-full">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateModal(true)}
                      className="w-full"
                    >
                      Nouveau RDV
                    </Button>
                    <Button
                      icon={<SyncOutlined />}
                      className="w-full"
                      onClick={() => {
                        setLoading(true);
                        setTimeout(() => setLoading(false), 1000);
                        message.success('Calendrier synchronisé !');
                      }}
                    >
                      Synchroniser
                    </Button>
                    <Button
                      icon={<SettingOutlined />}
                      className="w-full"
                      onClick={() => setShowSettingsDrawer(true)}
                    >
                      Paramètres
                    </Button>
                  </Space>
                </Card>

                {/* Mini calendrier */}
                <Card size="small" title="📅 Navigation">
                  <Calendar
                    fullscreen={false}
                    value={selectedDate}
                    onSelect={setSelectedDate}
                    dateCellRender={(date) => {
                      const dayEvents = events.filter(event => 
                        dayjs(event.start).isSame(date, 'day')
                      );
                      return dayEvents.length > 0 ? (
                        <Badge count={dayEvents.length} size="small" />
                      ) : null;
                    }}
                  />
                </Card>

                {/* Événements d'aujourd'hui */}
                <Card size="small" title="🎯 Aujourd'hui" className="max-h-64 overflow-y-auto">
                  {todayEvents.length > 0 ? (
                    <List
                      size="small"
                      dataSource={todayEvents}
                      renderItem={(event) => (
                        <List.Item className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <Space direction="vertical" size="small" className="w-full">
                            <div className="flex items-center justify-between">
                              <Text strong className="text-sm">{event.title}</Text>
                              {getPriorityIcon(event.priority)}
                            </div>
                            <Text type="secondary" className="text-xs">
                              {dayjs(event.start).format('HH:mm')} - {dayjs(event.end).format('HH:mm')}
                            </Text>
                            <Tag color={getEventColor(event)} size="small">
                              {event.meetingType}
                            </Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary" className="text-center block">
                      Aucun événement aujourd'hui
                    </Text>
                  )}
                </Card>
              </Space>
            </Col>

            {/* Calendrier principal */}
            <Col xs={24} lg={18}>
              <Card 
                className="h-full"
                title={
                  <div className="flex items-center justify-between">
                    <span>📅 Calendrier Google Intégré</span>
                    <Space>
                      <Radio.Group 
                        value={calendarView} 
                        onChange={(e) => setCalendarView(e.target.value)}
                        size="small"
                      >
                        <Radio.Button value="month">Mois</Radio.Button>
                        <Radio.Button value="week">Semaine</Radio.Button>
                        <Radio.Button value="day">Jour</Radio.Button>
                        <Radio.Button value="agenda">Agenda</Radio.Button>
                      </Radio.Group>
                      <Button icon={<FilterOutlined />} size="small">Filtres</Button>
                      <Button icon={<ExportOutlined />} size="small">Export</Button>
                    </Space>
                  </div>
                }
                bodyStyle={{ padding: 0, height: 'calc(100vh - 400px)' }}
              >
                <div className="relative w-full h-full">
                  <Spin size="large" spinning={loading} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10" />
                  <iframe
                    src={`https://calendar.google.com/calendar/embed?showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=1&showTz=1&mode=${calendarView.toUpperCase()}&wkst=2&hl=fr`}
                    className="w-full h-full border-0"
                    title="Google Calendar"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                    onLoad={(e) => {
                      const spinner = e.currentTarget.parentElement?.querySelector('.ant-spin');
                      if (spinner) {
                        (spinner as HTMLElement).style.display = 'none';
                      }
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><TeamOutlined /> Événements</span>} key="events">
          <Card title="📋 Gestion des Événements" className="h-full">
            <div className="mb-4">
              <Space>
                <Input.Search
                  placeholder="Rechercher un événement..."
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
                <Select placeholder="Type" style={{ width: 120 }}>
                  <Option value="all">Tous</Option>
                  <Option value="client">Client</Option>
                  <Option value="internal">Interne</Option>
                  <Option value="demo">Demo</Option>
                </Select>
                <Select placeholder="Statut" style={{ width: 120 }}>
                  <Option value="all">Tous</Option>
                  <Option value="confirmed">Confirmé</Option>
                  <Option value="tentative">Tentative</Option>
                  <Option value="cancelled">Annulé</Option>
                </Select>
                <RangePicker />
              </Space>
            </div>
            
            <Table
              dataSource={events}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: 'Événement',
                  dataIndex: 'title',
                  key: 'title',
                  render: (text, record) => (
                    <Space direction="vertical" size="small">
                      <Text strong>{text}</Text>
                      <Space>
                        <Tag color={getEventColor(record)}>{record.meetingType}</Tag>
                        {getPriorityIcon(record.priority)}
                        {record.isOnline && <VideoCameraOutlined className="text-blue-500" />}
                      </Space>
                    </Space>
                  )
                },
                {
                  title: 'Date & Heure',
                  key: 'datetime',
                  render: (record) => (
                    <Space direction="vertical" size="small">
                      <Text>{dayjs(record.start).format('DD/MM/YYYY')}</Text>
                      <Text type="secondary">
                        {dayjs(record.start).format('HH:mm')} - {dayjs(record.end).format('HH:mm')}
                      </Text>
                    </Space>
                  )
                },
                {
                  title: 'Participants',
                  dataIndex: 'attendees',
                  key: 'attendees',
                  render: (attendees) => (
                    <Space>
                      <UserOutlined />
                      <Text>{attendees.length}</Text>
                    </Space>
                  )
                },
                {
                  title: 'Statut',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => {
                    const colors = {
                      confirmed: 'green',
                      tentative: 'orange',
                      cancelled: 'red'
                    };
                    return <Tag color={colors[status]}>{status}</Tag>;
                  }
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (record) => (
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleEventClick(record)}
                      />
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                      />
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><TrophyOutlined /> Statistiques</span>} key="stats">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="📊 Aperçu Général">
                <Space direction="vertical" className="w-full" size="large">
                  <Statistic
                    title="Total des événements"
                    value={calendarStats.totalMeetings}
                    prefix={<CalendarOutlined />}
                  />
                  <Progress
                    percent={Math.round((calendarStats.completedMeetings / calendarStats.totalMeetings) * 100)}
                    status="active"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                  <Statistic
                    title="Événements terminés"
                    value={calendarStats.completedMeetings}
                    suffix={`/ ${calendarStats.totalMeetings}`}
                  />
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card title="⏱️ Analyse Temporelle">
                <Timeline>
                  <Timeline.Item color="green">
                    <Text strong>Aujourd'hui:</Text> {calendarStats.todayMeetings} événements
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <Text strong>Cette semaine:</Text> {calendarStats.weekMeetings} événements
                  </Timeline.Item>
                  <Timeline.Item color="purple">
                    <Text strong>Ce mois:</Text> {calendarStats.monthMeetings} événements
                  </Timeline.Item>
                  <Timeline.Item>
                    <Text strong>Durée moyenne:</Text> {calendarStats.averageDuration} minutes
                  </Timeline.Item>
                </Timeline>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Modal de création d'événement */}
      <Modal
        title="✨ Créer un Nouvel Événement"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={800}
      >
        <Form layout="vertical" onFinish={(values) => {
          console.log('Nouvel événement:', values);
          message.success('Événement créé avec succès !');
          setShowCreateModal(false);
        }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Titre" name="title" rules={[{ required: true }]}>
                <Input placeholder="Titre de l'événement..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Type" name="meetingType" rules={[{ required: true }]}>
                <Select placeholder="Type d'événement">
                  <Option value="client">👥 Client</Option>
                  <Option value="internal">🏢 Interne</Option>
                  <Option value="demo">🎯 Démo</Option>
                  <Option value="followup">📞 Suivi</Option>
                  <Option value="personal">👤 Personnel</Option>
                  <Option value="urgent">⚡ Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date de début" name="startDate" rules={[{ required: true }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date de fin" name="endDate" rules={[{ required: true }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Description de l'événement..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Participants" name="attendees">
                <Select mode="tags" placeholder="Ajouter des participants...">
                  <Option value="client@example.com">Client Example</Option>
                  <Option value="dev@2thier.be">Développeur</Option>
                  <Option value="pm@2thier.be">Chef de projet</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priorité" name="priority">
                <Select placeholder="Priorité">
                  <Option value="low">🟢 Faible</Option>
                  <Option value="medium">🟡 Moyenne</Option>
                  <Option value="high">🟠 Élevée</Option>
                  <Option value="urgent">🔴 Urgente</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Lieu" name="location">
                <Input placeholder="Lieu de la réunion..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Rappels (minutes)" name="reminders">
                <Select mode="multiple" placeholder="Rappels...">
                  <Option value={5}>5 minutes</Option>
                  <Option value={15}>15 minutes</Option>
                  <Option value={30}>30 minutes</Option>
                  <Option value={60}>1 heure</Option>
                  <Option value={1440}>1 jour</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Switch /> Réunion en ligne
              <Switch /> Récurrent
              <Switch /> Toute la journée
            </Space>
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Créer l'événement
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer des paramètres */}
      <Drawer
        title="⚙️ Paramètres du Calendrier"
        placement="right"
        onClose={() => setShowSettingsDrawer(false)}
        open={showSettingsDrawer}
        width={400}
      >
        <Space direction="vertical" className="w-full" size="large">
          <Card size="small" title="🎨 Affichage">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between items-center">
                <Text>Vue par défaut</Text>
                <Select value={calendarView} onChange={setCalendarView} style={{ width: 120 }}>
                  <Option value="month">Mois</Option>
                  <Option value="week">Semaine</Option>
                  <Option value="day">Jour</Option>
                  <Option value="agenda">Agenda</Option>
                </Select>
              </div>
              <div className="flex justify-between items-center">
                <Text>Thème sombre</Text>
                <Switch />
              </div>
              <div className="flex justify-between items-center">
                <Text>Week-ends</Text>
                <Switch defaultChecked />
              </div>
            </Space>
          </Card>

          <Card size="small" title="🔔 Notifications">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between items-center">
                <Text>Notifications push</Text>
                <Switch defaultChecked />
              </div>
              <div className="flex justify-between items-center">
                <Text>Notifications email</Text>
                <Switch defaultChecked />
              </div>
              <div className="flex justify-between items-center">
                <Text>Son des rappels</Text>
                <Switch />
              </div>
            </Space>
          </Card>

          <Card size="small" title="🔄 Synchronisation">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between items-center">
                <Text>Sync automatique</Text>
                <Switch defaultChecked />
              </div>
              <div className="flex justify-between items-center">
                <Text>Sync avec CRM</Text>
                <Switch defaultChecked />
              </div>
              <Button icon={<SyncOutlined />} className="w-full">
                Forcer la synchronisation
              </Button>
            </Space>
          </Card>
        </Space>
      </Drawer>

      {/* Modal détails événement */}
      <Modal
        title={selectedEvent ? selectedEvent.title : ''}
        open={showEventDetails}
        onCancel={() => setShowEventDetails(false)}
        footer={[
          <Button key="edit" icon={<EditOutlined />}>Modifier</Button>,
          <Button key="delete" danger icon={<DeleteOutlined />}>Supprimer</Button>,
          <Button key="close" onClick={() => setShowEventDetails(false)}>Fermer</Button>
        ]}
      >
        {selectedEvent && (
          <Space direction="vertical" className="w-full" size="middle">
            <div>
              <Text strong>📅 Date & Heure:</Text>
              <br />
              <Text>
                {dayjs(selectedEvent.start).format('DD/MM/YYYY à HH:mm')} - {dayjs(selectedEvent.end).format('HH:mm')}
              </Text>
            </div>
            
            <div>
              <Text strong>📝 Description:</Text>
              <br />
              <Text>{selectedEvent.description || 'Aucune description'}</Text>
            </div>

            <div>
              <Text strong>👥 Participants:</Text>
              <br />
              <Space wrap>
                {selectedEvent.attendees.map((attendee, index) => (
                  <Tag key={index} icon={<UserOutlined />}>{attendee}</Tag>
                ))}
              </Space>
            </div>

            <div>
              <Text strong>📍 Lieu:</Text>
              <br />
              <Text>{selectedEvent.location || 'Non spécifié'}</Text>
              {selectedEvent.isOnline && selectedEvent.meetingUrl && (
                <div>
                  <Button 
                    type="link" 
                    icon={<VideoCameraOutlined />}
                    href={selectedEvent.meetingUrl}
                    target="_blank"
                  >
                    Rejoindre la réunion
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Text strong>🏷️ Labels:</Text>
              <br />
              <Space wrap>
                <Tag color={getEventColor(selectedEvent)}>{selectedEvent.meetingType}</Tag>
                {selectedEvent.tags.map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))}
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default GoogleCalendarPage;
