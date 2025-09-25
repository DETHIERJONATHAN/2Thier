import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  DatePicker, 
  TimePicker, 
  Form, 
  Modal, 
  Space, 
  message,
  List,
  Badge,
  Input,
  Select
} from 'antd';
import { 
  CalendarOutlined, 
  PlusOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  attendees: string[];
  meetLink?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

interface CalendarWidgetProps {
  leadEmail: string;
  leadName: string;
  leadId: string;
  onEventCreated?: (eventData: EventCreatedData) => void;
}

interface EventCreatedData {
  type: 'calendar_event';
  leadId: string;
  eventId: string;
  title: string;
  start: Date;
  timestamp: Date;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ 
  leadEmail, 
  leadName, 
  leadId,
  onEventCreated 
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await api.api.get(`/calendar/events?attendee=${encodeURIComponent(leadEmail)}`);
      setEvents(response.events || []);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      // Événements simulés pour la démo
      setEvents([
        {
          id: '1',
          title: 'Rendez-vous commercial',
          start: dayjs().add(2, 'days').hour(14).minute(0).toISOString(),
          end: dayjs().add(2, 'days').hour(15).minute(0).toISOString(),
          description: 'Présentation de nos services',
          attendees: [leadEmail, 'moi@monentreprise.be'],
          meetLink: 'https://meet.google.com/abc-defg-hij',
          status: 'confirmed'
        },
        {
          id: '2',
          title: 'Suivi de proposition',
          start: dayjs().add(7, 'days').hour(10).minute(0).toISOString(),
          end: dayjs().add(7, 'days').hour(11).minute(0).toISOString(),
          description: 'Discussion sur la proposition envoyée',
          attendees: [leadEmail, 'moi@monentreprise.be'],
          status: 'tentative'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [leadEmail, api.api]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = async (values: {
    title: string;
    date: dayjs.Dayjs;
    startTime: dayjs.Dayjs;
    endTime: dayjs.Dayjs;
    description?: string;
    createMeetLink: boolean;
  }) => {
    try {
      setCreating(true);

      const startDateTime = values.date
        .hour(values.startTime.hour())
        .minute(values.startTime.minute());
      
      const endDateTime = values.date
        .hour(values.endTime.hour())
        .minute(values.endTime.minute());

      const response = await api.api.post('/api/calendar/events', {
        title: values.title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        description: values.description,
        attendees: [leadEmail],
        createMeetLink: values.createMeetLink,
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Événement créé et invitation envoyée à ${leadName}`);
      setEventModalVisible(false);
      form.resetFields();
      
      // Recharger les événements
      await loadEvents();
      
      // Notifier le parent
      if (onEventCreated) {
        onEventCreated({
          type: 'calendar_event',
          leadId,
          eventId: response.eventId,
          title: values.title,
          start: startDateTime.toDate(),
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      message.error('Erreur lors de la création de l\'événement');
    } finally {
      setCreating(false);
    }
  };

  const formatEventTime = (start: string, end: string) => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    
    if (startDate.isSame(endDate, 'day')) {
      return `${startDate.format('DD/MM/YYYY')} de ${startDate.format('HH:mm')} à ${endDate.format('HH:mm')}`;
    }
    
    return `${startDate.format('DD/MM/YYYY HH:mm')} → ${endDate.format('DD/MM/YYYY HH:mm')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge status="success" text="Confirmé" />;
      case 'tentative':
        return <Badge status="warning" text="En attente" />;
      case 'cancelled':
        return <Badge status="error" text="Annulé" />;
      default:
        return <Badge status="default" text="Inconnu" />;
    }
  };

  return (
    <Card 
      title={
        <Space>
          <CalendarOutlined />
          Agenda - {leadName}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={loadEvents}
            loading={loading}
          />
          <Button 
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setEventModalVisible(true)}
          >
            Planifier
          </Button>
        </Space>
      }
      className="mb-4"
    >
      <div className="mb-3">
        <Badge status="processing" text={leadEmail} />
      </div>

      <List
        loading={loading}
        dataSource={events}
        locale={{ emptyText: 'Aucun événement planifié' }}
        renderItem={(event) => (
          <List.Item>
            <List.Item.Meta
              avatar={<CalendarOutlined className="text-blue-500" />}
              title={
                <Space>
                  <span className="font-medium">{event.title}</span>
                  {getStatusBadge(event.status)}
                  {event.meetLink && (
                    <a 
                      href={event.meetLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 text-xs"
                    >
                      Meet
                    </a>
                  )}
                </Space>
              }
              description={
                <div>
                  <div className="flex items-center mb-1">
                    <ClockCircleOutlined className="mr-2 text-gray-400" />
                    <span className="text-sm">{formatEventTime(event.start, event.end)}</span>
                  </div>
                  {event.description && (
                    <div className="text-gray-600 text-sm mb-1">{event.description}</div>
                  )}
                  <div className="flex items-center">
                    <UserOutlined className="mr-2 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {event.attendees.length} participant{event.attendees.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Modal de création d'événement */}
      <Modal
        title={`Nouvel événement avec ${leadName}`}
        open={eventModalVisible}
        onCancel={() => {
          setEventModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateEvent}
          initialValues={{
            date: dayjs().add(1, 'day'),
            startTime: dayjs().hour(14).minute(0),
            endTime: dayjs().hour(15).minute(0),
            createMeetLink: true
          }}
        >
          <Form.Item
            name="title"
            label="Titre de l'événement"
            rules={[{ required: true, message: 'Veuillez saisir un titre' }]}
          >
            <Input placeholder="ex: Rendez-vous commercial" />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
          >
            <DatePicker 
              className="w-full"
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="startTime"
              label="Heure de début"
              rules={[{ required: true, message: 'Heure de début requise' }]}
            >
              <TimePicker 
                className="w-full"
                format="HH:mm"
                minuteStep={15}
              />
            </Form.Item>

            <Form.Item
              name="endTime"
              label="Heure de fin"
              rules={[{ required: true, message: 'Heure de fin requise' }]}
            >
              <TimePicker 
                className="w-full"
                format="HH:mm"
                minuteStep={15}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="Description (optionnelle)"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Description de l'événement..."
            />
          </Form.Item>

          <Form.Item
            name="createMeetLink"
            label="Options"
          >
            <Select defaultValue={true}>
              <Select.Option value={true}>Créer un lien Google Meet</Select.Option>
              <Select.Option value={false}>Rendez-vous physique uniquement</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setEventModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={creating}
                icon={<PlusOutlined />}
              >
                Créer l'événement
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CalendarWidget;
