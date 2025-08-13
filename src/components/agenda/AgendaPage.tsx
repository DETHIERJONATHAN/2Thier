import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal, Form, Input, DatePicker, Select, Switch, message, Space, Typography, Row, Col, Tag } from 'antd';
import { PlusOutlined, CalendarOutlined, FilterOutlined, SyncOutlined } from '@ant-design/icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import './AgendaPage.css';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  type: string;
  status?: string;
  notes?: string;
  location?: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  participants?: Array<{
    id: string;
    role: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
    client?: {
      id: string;
      data: any;
    };
  }>;
}

interface EventType {
  value: string;
  label: string;
}

const AgendaPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [filters, setFilters] = useState({
    view: 'all', // 'own', 'organization', 'all'
    type: '',
    status: ''
  });
  
  const { api } = useAuthenticatedApi();

  // Récupérer les événements
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.view !== 'all') params.append('view', filters.view);
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/api/calendar/events?${params.toString()}`);
      setEvents(response);
    } catch (error) {
      console.error('[Agenda] Erreur lors de la récupération des événements:', error);
      message.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  // Récupérer les types d'événements
  const fetchEventTypes = useCallback(async () => {
    try {
      const response = await api.get('/api/calendar/types');
      setEventTypes(response);
    } catch (error) {
      console.error('[Agenda] Erreur lors de la récupération des types:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
    fetchEventTypes();
  }, [fetchEvents, fetchEventTypes]);

  // Convertir les événements pour FullCalendar
  const fullCalendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.startDate,
    end: event.endDate || undefined,
    allDay: event.allDay,
    backgroundColor: getEventColor(event.type),
    borderColor: getEventColor(event.type),
    extendedProps: {
      description: event.description,
      type: event.type,
      status: event.status,
      notes: event.notes,
      location: event.location,
      owner: event.owner,
      participants: event.participants
    }
  }));

  // Couleurs par type d'événement
  function getEventColor(type: string): string {
    const colors: Record<string, string> = {
      'rendez-vous': '#1890ff',
      'relance': '#52c41a',
      'facture': '#fa8c16',
      'chantier': '#722ed1',
      'formation': '#13c2c2',
      'reunion': '#eb2f96',
      'maintenance': '#faad14',
      'autre': '#8c8c8c'
    };
    return colors[type] || '#1890ff';
  }

  // Créer ou modifier un événement
  const handleEventSubmit = async (values: any) => {
    try {
      const eventData = {
        ...values,
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1] ? values.dateRange[1].toISOString() : null,
        participants: [] // TODO: Ajouter la gestion des participants
      };

      if (editingEvent) {
        // Modification
        await api.put(`/api/calendar/events/${editingEvent.id}`, eventData);
        message.success('Événement modifié avec succès');
      } else {
        // Création
        await api.post('/api/calendar/events', eventData);
        message.success('Événement créé avec succès');
      }

      setModalVisible(false);
      setEditingEvent(null);
      form.resetFields();
      fetchEvents();
    } catch (error) {
      console.error('[Agenda] Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  // Supprimer un événement
  const handleEventDelete = async (eventId: string) => {
    try {
      await api.delete(`/api/calendar/events/${eventId}`);
      message.success('Événement supprimé avec succès');
      fetchEvents();
    } catch (error) {
      console.error('[Agenda] Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  // Clic sur un événement
  const handleEventClick = (clickInfo: any) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setEditingEvent(event);
      form.setFieldsValue({
        title: event.title,
        description: event.description,
        dateRange: [
          event.startDate ? new Date(event.startDate) : null,
          event.endDate ? new Date(event.endDate) : null
        ],
        allDay: event.allDay,
        type: event.type,
        status: event.status,
        notes: event.notes,
        location: event.location
      });
      setModalVisible(true);
    }
  };

  // Sélection de date pour créer un événement
  const handleDateSelect = (selectInfo: any) => {
    setEditingEvent(null);
    form.setFieldsValue({
      title: '',
      description: '',
      dateRange: [selectInfo.start, selectInfo.end],
      allDay: selectInfo.allDay,
      type: 'rendez-vous',
      status: 'confirmé',
      notes: '',
      location: ''
    });
    setModalVisible(true);
  };

  return (
    <div className="agenda-page">
      <Card>
        <div className="agenda-header">
          <div className="agenda-title">
            <Title level={2}>
              <CalendarOutlined /> Agenda
            </Title>
          </div>
          
          <div className="agenda-actions">
            <Space>
              {/* Filtres */}
              <Select
                value={filters.view}
                onChange={(value) => setFilters(prev => ({ ...prev, view: value }))}
                style={{ width: 120 }}
              >
                <Option value="all">Tous</Option>
                <Option value="own">Mes événements</Option>
                <Option value="organization">Organisation</Option>
              </Select>

              <Select
                value={filters.type}
                onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                placeholder="Type"
                allowClear
                style={{ width: 120 }}
              >
                {eventTypes.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>

              <Select
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                placeholder="Statut"
                allowClear
                style={{ width: 120 }}
              >
                <Option value="confirmé">Confirmé</Option>
                <Option value="en attente">En attente</Option>
                <Option value="annulé">Annulé</Option>
              </Select>

              {/* Vues du calendrier */}
              <Select
                value={calendarView}
                onChange={setCalendarView}
                style={{ width: 120 }}
              >
                <Option value="dayGridMonth">Mois</Option>
                <Option value="timeGridWeek">Semaine</Option>
                <Option value="timeGridDay">Jour</Option>
                <Option value="listWeek">Planning</Option>
              </Select>

              <Button 
                icon={<SyncOutlined />} 
                onClick={fetchEvents} 
                loading={loading}
              >
                Actualiser
              </Button>

              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingEvent(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
              >
                Nouvel événement
              </Button>
            </Space>
          </div>
        </div>

        {/* Calendrier */}
        <div className="agenda-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            initialView={calendarView}
            locale={frLocale}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            height="auto"
            events={fullCalendarEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            loading={setLoading}
            eventDisplay="block"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false
            }}
          />
        </div>
      </Card>

      {/* Modal de création/modification d'événement */}
      <Modal
        title={editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingEvent(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEventSubmit}
        >
          <Form.Item
            name="title"
            label="Titre"
            rules={[{ required: true, message: 'Le titre est obligatoire' }]}
          >
            <Input placeholder="Titre de l'événement" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Description de l'événement" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="Date et heure"
                rules={[{ required: true, message: 'La date est obligatoire' }]}
              >
                <RangePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  placeholder={['Début', 'Fin']}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="allDay" label="Toute la journée" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true, message: 'Le type est obligatoire' }]}
              >
                <Select placeholder="Sélectionner un type">
                  {eventTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      <Tag color={getEventColor(type.value)}>{type.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Statut">
                <Select placeholder="Statut de l'événement">
                  <Option value="confirmé">Confirmé</Option>
                  <Option value="en attente">En attente</Option>
                  <Option value="annulé">Annulé</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="Lieu">
            <Input placeholder="Lieu de l'événement" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Notes supplémentaires" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEvent ? 'Modifier' : 'Créer'}
              </Button>
              {editingEvent && (
                <Button 
                  danger 
                  onClick={() => {
                    Modal.confirm({
                      title: 'Supprimer l\'événement',
                      content: 'Êtes-vous sûr de vouloir supprimer cet événement ?',
                      okText: 'Supprimer',
                      cancelText: 'Annuler',
                      onOk: () => handleEventDelete(editingEvent.id)
                    });
                  }}
                >
                  Supprimer
                </Button>
              )}
              <Button onClick={() => setModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AgendaPage;
