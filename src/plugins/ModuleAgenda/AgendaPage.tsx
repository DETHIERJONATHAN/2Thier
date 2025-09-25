// src/plugins/ModuleAgenda/AgendaPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Modal, Form, Input, DatePicker, Select, Switch, message, Space, Typography, Row, Col } from 'antd';
import { PlusOutlined, GoogleOutlined, SyncOutlined } from '@ant-design/icons';
import FullCalendar from '@fullcalendar/react';
import { CalendarApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import dayjs from 'dayjs';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Interfaces... (gardées identiques)
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
  googleEventId?: string;
  meetingLink?: string;
  // 🔗 Liaisons CRM
  linkedEmailId?: string;
  linkedLeadId?: string;
  linkedClientId?: string;
  linkedProjectId?: string;
  // ... autres champs
}

interface EventType {
  value: string;
  label: string;
}

interface EventFormValues {
  title: string;
  description?: string;
  notes?: string;
  dateRange: [Date, Date];
  allDay: boolean;
  type: string;
  status: string;
  location?: string;
  createMeetLink: boolean;
  // 🔗 Liaisons CRM
  linkedClientId?: string;
  linkedLeadId?: string;
  linkedProjectId?: string;
  linkedEmailId?: string;
}

export default function AgendaPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();
  const calendarRef = useRef<FullCalendar>(null);
  
  // 🔗 Données CRM pour les liaisons
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  
  const { api } = useAuthenticatedApi();

  const getCalendarApi = useCallback(() => {
    return calendarRef.current?.getApi();
  }, []);

  const fetchEvents = useCallback(async (calendarApi?: CalendarApi) => {
    try {
      setLoading(true);
      const calendar = calendarApi || getCalendarApi();
      if (!calendar) return;

      const view = calendar.view;
      const startDate = view.activeStart.toISOString();
      const endDate = view.activeEnd.toISOString();
      
      const response = await api.get(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      setEvents(response);
    } catch (error) {
      console.error('[Agenda] Erreur lors de la récupération des événements:', error);
      message.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, [api, getCalendarApi]);

  const handleSyncWithGoogle = async () => {
    const calendarApi = getCalendarApi();
    if (!calendarApi) {
      message.error("Le calendrier n'est pas prêt.");
      return;
    }
    try {
      setSyncing(true);
      message.info('Synchronisation avec Google Calendar en cours...');
      const view = calendarApi.view;
      const startDate = view.activeStart.toISOString();
      const endDate = view.activeEnd.toISOString();

      await api.post('/api/calendar/sync', { startDate, endDate });
      
      message.success('Synchronisation avec Google Calendar terminée avec succès !');
      fetchEvents(calendarApi);
    } catch (error) {
      console.error('[Agenda] Erreur lors de la synchronisation Google:', error);
      message.error('Une erreur est survenue lors de la synchronisation.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Le premier chargement se fera via la prop `datesSet` de FullCalendar
  }, [fetchEvents]);

  // 🔗 Chargement des données CRM pour les liaisons
  useEffect(() => {
    const loadCrmData = async () => {
      try {
        // Chargement des clients (API peut ne pas exister)
        try {
          const clientsResponse = await api.get('/api/clients');
          const clientsData = clientsResponse.data || clientsResponse || [];
          setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch {
          console.warn('[Agenda] API clients non disponible, utilisation de données vides');
          setClients([]);
        }

        // Chargement des leads/prospects (API peut ne pas exister)
        try {
          const leadsResponse = await api.get('/api/leads');
          const leadsData = leadsResponse.data || leadsResponse || [];
          setLeads(Array.isArray(leadsData) ? leadsData : []);
        } catch {
          console.warn('[Agenda] API leads non disponible, utilisation de données vides');
          setLeads([]);
        }

        // Chargement des projets (API peut ne pas exister)
        try {
          const projectsResponse = await api.get('/api/projects');
          const projectsData = projectsResponse.data || projectsResponse || [];
          setProjects(Array.isArray(projectsData) ? projectsData : []);
        } catch {
          console.warn('[Agenda] API projects non disponible, utilisation de données vides');
          setProjects([]);
        }

        // Chargement des emails récents (API peut ne pas exister)
        try {
          const emailsResponse = await api.get('/api/emails?limit=100');
          const emailsData = emailsResponse.data || emailsResponse || [];
          setEmails(Array.isArray(emailsData) ? emailsData : []);
        } catch {
          console.warn('[Agenda] API emails non disponible, utilisation de données vides');
          setEmails([]);
        }
      } catch (error) {
        console.error('[Agenda] Erreur générale lors du chargement des données CRM:', error);
        // Initialiser avec des tableaux vides pour éviter les erreurs
        setClients([]);
        setLeads([]);
        setProjects([]);
        setEmails([]);
      }
    };

    loadCrmData();
  }, [api]);

  const fullCalendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    allDay: event.allDay,
    backgroundColor: '#10b981', // Vert pour les événements CRM
    borderColor: '#059669',
    extendedProps: { ...event }
  }));

  const handleEventSubmit = async (values: EventFormValues) => {
    try {
      const [start, end] = values.dateRange;
      
      const eventData = {
        title: values.title,
        description: values.description,
        notes: values.notes,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        allDay: values.allDay || false,
        type: values.type || 'event',
        status: values.status || 'confirmé',
        location: values.location,
        createMeetLink: values.createMeetLink || false,
        // 🔗 Liaisons CRM
        linkedClientId: values.linkedClientId || null,
        linkedLeadId: values.linkedLeadId || null,
        linkedProjectId: values.linkedProjectId || null,
        linkedEmailId: values.linkedEmailId || null,
      };

      if (editingEvent) {
        await api.put(`/api/calendar/events/${editingEvent.id}`, eventData);
        message.success('Événement modifié avec succès');
      } else {
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

  const handleEventDelete = async (eventId: string) => {
    try {
      await api.delete(`/api/calendar/events/${eventId}`);
      message.success('Événement supprimé avec succès');
      setModalVisible(false);
      fetchEvents();
    } catch (error) {
      console.error('[Agenda] Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleEventClick = (clickInfo: { event: { id: string, extendedProps: CalendarEvent } }) => {
    const event = clickInfo.event.extendedProps;
    if (event) {
      setEditingEvent(event);
      form.setFieldsValue({
        title: event.title,
        description: event.description,
        notes: event.notes,
        dateRange: [
          event.startDate ? dayjs(event.startDate) : null,
          event.endDate ? dayjs(event.endDate) : null
        ],
        allDay: event.allDay,
        type: event.type || 'rendez-vous',
        status: event.status || 'confirmé',
        location: event.location,
        createMeetLink: false,
        // 🔗 Liaisons CRM
        linkedClientId: event.linkedClientId,
        linkedLeadId: event.linkedLeadId,
        linkedProjectId: event.linkedProjectId,
        linkedEmailId: event.linkedEmailId,
      });
      setModalVisible(true);
    }
  };

  const handleDateSelect = (selectInfo: { start: Date; end: Date; allDay: boolean }) => {
    setEditingEvent(null);
    form.setFieldsValue({
      dateRange: [dayjs(selectInfo.start), dayjs(selectInfo.end)],
      allDay: selectInfo.allDay,
      type: 'rendez-vous',
      status: 'confirmé',
      createMeetLink: true,
    });
    setModalVisible(true);
  };

  return (
    <div className="agenda-page p-6">
      <Card>
        <div className="agenda-header flex justify-between items-center mb-4">
          <Title level={2}>
            <GoogleOutlined style={{ color: '#3b82f6' }} /> Agenda
          </Title>
          
          <Space>
            <Button 
              icon={<SyncOutlined />} 
              onClick={handleSyncWithGoogle} 
              loading={syncing}
            >
              Synchroniser avec Google
            </Button>

            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleDateSelect({ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000), allDay: false })}
            >
              Nouvel événement
            </Button>
          </Space>
        </div>

        <div className="agenda-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            initialView="dayGridMonth"
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
            datesSet={(dateInfo) => fetchEvents(dateInfo.view.calendar)}
            eventDisplay="block"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false
            }}
          />
        </div>
      </Card>

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
          initialValues={{ type: 'rendez-vous', status: 'confirmé', createMeetLink: true }}
        >
          <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Le titre est obligatoire' }]}>
            <Input placeholder="Titre de l'événement" />
          </Form.Item>

          <Form.Item name="description" label="Description publique">
            <TextArea rows={2} placeholder="Description visible par tous les participants" />
          </Form.Item>

          <Form.Item name="notes" label="Notes privées">
            <TextArea rows={2} placeholder="Notes personnelles (visibles uniquement par vous)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={18}>
              <Form.Item name="dateRange" label="Date et heure" rules={[{ required: true, message: 'La date est obligatoire' }]}>
                <RangePicker showTime format="DD/MM/YYYY HH:mm" placeholder={['Début', 'Fin']} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="allDay" label="Journée" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          {/* 🔗 LIAISONS CRM */}
          <div style={{ background: '#f6f8fa', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
            <Typography.Text strong style={{ color: '#1890ff', marginBottom: '12px', display: 'block' }}>
              🔗 Liaisons CRM
            </Typography.Text>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="linkedClientId" label="Client">
                  <Select placeholder="Sélectionner un client..." allowClear showSearch>
                    {(clients && Array.isArray(clients) ? clients : []).map((client) => (
                      <Option key={client.id} value={client.id}>
                        {client.name || `${client.firstName} ${client.lastName}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="linkedLeadId" label="Lead/Prospect">
                  <Select placeholder="Sélectionner un prospect..." allowClear showSearch>
                    {(leads && Array.isArray(leads) ? leads : []).map((lead) => (
                      <Option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} - {lead.email}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="linkedProjectId" label="Projet">
                  <Select placeholder="Sélectionner un projet..." allowClear showSearch>
                    {(projects && Array.isArray(projects) ? projects : []).map((project) => (
                      <Option key={project.id} value={project.id}>
                        {project.name} - {project.clientName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="linkedEmailId" label="Email lié">
                  <Select placeholder="Lier à un email..." allowClear showSearch>
                    {(emails && Array.isArray(emails) ? emails : []).map((email) => (
                      <Option key={email.id} value={email.id}>
                        {email.subject?.substring(0, 50)}... - {email.from}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
          
          <Form.Item name="location" label="Lieu / Localisation">
            <Input placeholder="Adresse, bureau, lien de visioconférence..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Type d'événement" rules={[{ required: true, message: 'Le type est obligatoire' }]}>
                <Select placeholder="Sélectionner un type">
                  <Option value="rendez-vous">🤝 Rendez-vous client</Option>
                  <Option value="reunion">👥 Réunion équipe</Option>
                  <Option value="demo">💻 Démonstration produit</Option>
                  <Option value="formation">📚 Formation</Option>
                  <Option value="prospection">📞 Appel prospection</Option>
                  <Option value="suivi">📋 Suivi projet</Option>
                  <Option value="livraison">🚚 Livraison/installation</Option>
                  <Option value="maintenance">🔧 Maintenance</Option>
                  <Option value="personnel">👤 Événement personnel</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Statut">
                <Select placeholder="Statut de l'événement">
                  <Option value="confirmé">✅ Confirmé</Option>
                  <Option value="en attente">⏳ En attente confirmation</Option>
                  <Option value="tentative">❓ Tentative</Option>
                  <Option value="annulé">❌ Annulé</Option>
                  <Option value="reporte">📅 Reporté</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="createMeetLink" label="🎥 Ajouter un lien de visioconférence Google Meet" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          {editingEvent?.meetingLink && (
            <Form.Item label="Lien Google Meet">
              <a href={editingEvent.meetingLink} target="_blank" rel="noopener noreferrer">{editingEvent.meetingLink}</a>
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEvent ? 'Enregistrer les modifications' : 'Créer l\'événement'}
              </Button>
              {editingEvent && (
                <Button danger onClick={() => Modal.confirm({
                  title: 'Supprimer l\'événement',
                  content: 'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
                  okText: 'Supprimer',
                  cancelText: 'Annuler',
                  onOk: () => handleEventDelete(editingEvent.id)
                })}>
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