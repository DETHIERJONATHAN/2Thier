import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Form, 
  Modal, 
  Space, 
  message,
  List,
  Input,
  DatePicker,
  TimePicker,
  Badge,
  Tooltip
} from 'antd';
import { 
  VideoCameraOutlined,
  PlusOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CopyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface MeetEvent {
  id: string;
  title: string;
  meetLink: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'live' | 'ended';
  attendees: string[];
  recording?: string;
  duration?: number;
}

interface MeetWidgetProps {
  leadEmail: string;
  leadName: string;
  leadId: string;
  onMeetCreated?: (meetData: MeetCreatedData) => void;
}

interface MeetCreatedData {
  type: 'meet_event';
  leadId: string;
  meetId: string;
  meetLink: string;
  title: string;
  startTime: Date;
  timestamp: Date;
}

const MeetWidget: React.FC<MeetWidgetProps> = ({ 
  leadEmail, 
  leadName, 
  leadId,
  onMeetCreated 
}) => {
  const [meetings, setMeetings] = useState<MeetEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [meetModalVisible, setMeetModalVisible] = useState(false);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await api.api.get(`/meet/events?leadId=${leadId}`);
      setMeetings(response.meetings || []);
    } catch (error) {
      console.error('Erreur lors du chargement des réunions:', error);
      // Réunions simulées pour la démo
      setMeetings([
        {
          id: '1',
          title: 'Présentation commerciale',
          meetLink: 'https://meet.google.com/abc-defg-hij',
          startTime: dayjs().add(2, 'hours').toISOString(),
          endTime: dayjs().add(3, 'hours').toISOString(),
          status: 'upcoming',
          attendees: [leadEmail, 'moi@monentreprise.be'],
        },
        {
          id: '2',
          title: 'Suivi de projet',
          meetLink: 'https://meet.google.com/xyz-uvwx-rst',
          startTime: dayjs().subtract(1, 'day').toISOString(),
          endTime: dayjs().subtract(1, 'day').add(1, 'hour').toISOString(),
          status: 'ended',
          attendees: [leadEmail, 'moi@monentreprise.be', 'tech@monentreprise.be'],
          recording: 'https://drive.google.com/file/d/recording123',
          duration: 58
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [leadId, leadEmail, api.api]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleCreateMeeting = async (values: {
    title: string;
    date: dayjs.Dayjs;
    startTime: dayjs.Dayjs;
    endTime: dayjs.Dayjs;
    description?: string;
    enableRecording: boolean;
  }) => {
    try {
      setCreating(true);

      const startDateTime = values.date
        .hour(values.startTime.hour())
        .minute(values.startTime.minute());
      
      const endDateTime = values.date
        .hour(values.endTime.hour())
        .minute(values.endTime.minute());

      const response = await api.api.post('/meet/create', {
        title: values.title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        description: values.description,
        attendees: [leadEmail],
        enableRecording: values.enableRecording,
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Réunion créée et invitation envoyée à ${leadName}`);
      setMeetModalVisible(false);
      form.resetFields();
      
      // Recharger les réunions
      await loadMeetings();
      
      // Notifier le parent
      if (onMeetCreated) {
        onMeetCreated({
          type: 'meet_event',
          leadId,
          meetId: response.meetId,
          meetLink: response.meetLink,
          title: values.title,
          startTime: startDateTime.toDate(),
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      message.error('Erreur lors de la création de la réunion');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMeeting = (meetLink: string) => {
    window.open(meetLink, '_blank');
  };

  const handleCopyMeetLink = (meetLink: string) => {
    navigator.clipboard.writeText(meetLink);
    message.success('Lien Meet copié dans le presse-papiers');
  };

  const formatMeetTime = (start: string, end: string) => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    
    if (startDate.isSame(endDate, 'day')) {
      return `${startDate.format('DD/MM/YYYY')} de ${startDate.format('HH:mm')} à ${endDate.format('HH:mm')}`;
    }
    
    return `${startDate.format('DD/MM/YYYY HH:mm')} → ${endDate.format('DD/MM/YYYY HH:mm')}`;
  };

  const getMeetStatusBadge = (status: string, startTime: string) => {
    const now = dayjs();
    const start = dayjs(startTime);
    
    if (status === 'ended') {
      return <Badge status="default" text="Terminé" />;
    }
    
    if (status === 'live' || (now.isAfter(start) && now.isBefore(start.add(30, 'minutes')))) {
      return <Badge status="processing" text="En cours" />;
    }
    
    if (start.isAfter(now)) {
      const diffMinutes = start.diff(now, 'minutes');
      if (diffMinutes < 60) {
        return <Badge status="warning" text={`Dans ${diffMinutes} min`} />;
      }
      return <Badge status="success" text="À venir" />;
    }
    
    return <Badge status="default" text="Inconnu" />;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    
    return `${mins}min`;
  };

  const canJoinMeeting = (startTime: string, endTime: string) => {
    const now = dayjs();
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    
    // Peut rejoindre 15 minutes avant le début et jusqu'à 30 minutes après la fin
    return now.isAfter(start.subtract(15, 'minutes')) && now.isBefore(end.add(30, 'minutes'));
  };

  return (
    <Card 
      title={
        <Space>
          <VideoCameraOutlined />
          Meet - {leadName}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={loadMeetings}
            loading={loading}
          />
          <Button 
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setMeetModalVisible(true)}
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
        dataSource={meetings}
        locale={{ emptyText: 'Aucune réunion planifiée' }}
        renderItem={(meeting) => (
          <List.Item
            actions={[
              canJoinMeeting(meeting.startTime, meeting.endTime) && (
                <Button 
                  key="join"
                  type="primary"
                  size="small" 
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleJoinMeeting(meeting.meetLink)}
                >
                  Rejoindre
                </Button>
              ),
              <Tooltip key="copy" title="Copier le lien">
                <Button 
                  size="small" 
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyMeetLink(meeting.meetLink)}
                />
              </Tooltip>,
              meeting.recording && (
                <Button 
                  key="recording"
                  size="small" 
                  icon={<VideoCameraOutlined />}
                  onClick={() => window.open(meeting.recording, '_blank')}
                >
                  Enregistrement
                </Button>
              )
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={<VideoCameraOutlined className="text-red-500" />}
              title={
                <Space>
                  <span className="font-medium">{meeting.title}</span>
                  {getMeetStatusBadge(meeting.status, meeting.startTime)}
                </Space>
              }
              description={
                <div>
                  <div className="flex items-center mb-1">
                    <ClockCircleOutlined className="mr-2 text-gray-400" />
                    <span className="text-sm">{formatMeetTime(meeting.startTime, meeting.endTime)}</span>
                  </div>
                  
                  <div className="flex items-center mb-1">
                    <UserOutlined className="mr-2 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {meeting.attendees.length} participant{meeting.attendees.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {meeting.duration && (
                    <div className="text-xs text-gray-500">
                      Durée: {formatDuration(meeting.duration)}
                    </div>
                  )}
                  
                  <div className="text-xs text-blue-600 mt-1">
                    <a 
                      href={meeting.meetLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {meeting.meetLink.replace('https://meet.google.com/', 'meet.google.com/')}
                    </a>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Modal de création de réunion */}
      <Modal
        title={`Nouvelle réunion Meet avec ${leadName}`}
        open={meetModalVisible}
        onCancel={() => {
          setMeetModalVisible(false);
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
            date: dayjs().add(1, 'day'),
            startTime: dayjs().hour(14).minute(0),
            endTime: dayjs().hour(15).minute(0),
            enableRecording: false
          }}
        >
          <Form.Item
            name="title"
            label="Titre de la réunion"
            rules={[{ required: true, message: 'Veuillez saisir un titre' }]}
          >
            <Input placeholder="ex: Présentation commerciale" />
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
              placeholder="Description de la réunion..."
            />
          </Form.Item>

          <Form.Item
            name="enableRecording"
            valuePropName="checked"
          >
            <input type="checkbox" className="mr-2" />
            Activer l'enregistrement automatique
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setMeetModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={creating}
                icon={<PlusOutlined />}
              >
                Créer la réunion
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MeetWidget;
