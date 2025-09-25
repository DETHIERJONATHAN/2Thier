import React, { useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Space, message, TimePicker } from 'antd';
import { CalendarOutlined, UserOutlined, ProjectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCalendarIntegration, CalendarEvent } from '../services/CalendarIntegrationService';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface CreateMeetingModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (event: CalendarEvent) => void;
  projectId?: string;
  leadId?: string;
  prefilledData?: Partial<{
    title: string;
    description: string;
    attendees: string[];
    meetingType: CalendarEvent['meetingType'];
  }>;
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  projectId,
  leadId,
  prefilledData
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { createProjectMeeting, createLeadMeeting } = useCalendarIntegration();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const [start, end] = values.dateRange;
      const meetingData = {
        title: values.title,
        description: values.description,
        start: start.toDate(),
        end: end.toDate(),
        meetingType: values.meetingType,
        location: values.location,
        attendees: values.attendees || []
      };

      let createdEvent: CalendarEvent;

      if (leadId) {
        createdEvent = await createLeadMeeting({
          leadId,
          ...meetingData
        });
      } else if (projectId) {
        createdEvent = await createProjectMeeting({
          projectId,
          ...meetingData
        });
      } else {
        throw new Error('Projet ou Lead requis');
      }

      message.success('Rendez-vous créé avec succès !');
      onSuccess(createdEvent);
      form.resetFields();
    } catch (error) {
      console.error('Erreur lors de la création du RDV:', error);
      message.error('Erreur lors de la création du rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          Planifier un rendez-vous
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          meetingType: 'client',
          ...prefilledData
        }}
      >
        <Form.Item
          label="Titre du rendez-vous"
          name="title"
          rules={[{ required: true, message: 'Le titre est requis' }]}
        >
          <Input placeholder="Ex: Réunion de suivi projet X" />
        </Form.Item>

        <Form.Item
          label="Type de rendez-vous"
          name="meetingType"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="client">🤝 Rendez-vous client</Option>
            <Option value="internal">👥 Réunion interne</Option>
            <Option value="demo">💻 Démonstration</Option>
            <Option value="followup">📞 Suivi commercial</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Date et heure"
          name="dateRange"
          rules={[{ required: true, message: 'La date est requise' }]}
        >
          <RangePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            placeholder={['Date de début', 'Date de fin']}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label="Participants (emails)"
          name="attendees"
        >
          <Select
            mode="tags"
            placeholder="Ajouter des emails des participants"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label="Lieu / Lien de réunion"
          name="location"
        >
          <Input placeholder="Bureau, Zoom, Teams, ou adresse..." />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
        >
          <TextArea 
            rows={3} 
            placeholder="Ordre du jour, objectifs, documents à préparer..."
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Space className="w-full justify-end">
            <Button onClick={onCancel}>
              Annuler
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CalendarOutlined />}
            >
              Créer le rendez-vous
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateMeetingModal;
