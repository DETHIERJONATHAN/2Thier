// src/plugins/ModuleAgenda/AgendaPage.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Button, Modal, Form, Input, DatePicker, Select, Switch, message, Space, Typography, Row, Col, Checkbox, Tag, Badge, List, Tooltip, Dropdown, Segmented, Drawer, Grid } from 'antd';
import { PlusOutlined, CalendarOutlined, CheckSquareOutlined, PhoneOutlined, ToolOutlined } from '@ant-design/icons';
import FullCalendar from '@fullcalendar/react';
import { CalendarApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import dayjs from 'dayjs';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { SF } from '../../components/zhiive/ZhiiveTheme';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Hook responsive removed — using Grid.useBreakpoint() like MailPage

// Priorités des tâches
const TASK_PRIORITIES = [
  { value: 'urgent', label: '🔴 Urgent', color: '#f5222d' },
  { value: 'haute', label: '🟠 Haute', color: '#fa8c16' },
  { value: 'normale', label: '🟡 Normale', color: '#fadb14' },
  { value: 'basse', label: '🟢 Basse', color: '#52c41a' },
];

// Statuts des tâches
const TASK_STATUSES = [
  { value: 'a-faire', label: 'À faire' },
  { value: 'en-cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
];

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
  // 🔗 Liaisons
  linkedEmailId?: string;
  linkedLeadId?: string;
  linkedClientId?: string;
  linkedProjectId?: string;
  linkedChantierId?: string;
  // 🏗️ Données enrichies chantier
  chantierEventType?: string;
  chantierId?: string;
  chantierClientName?: string;
  chantierSiteAddress?: string;
  chantierProduct?: string;
  chantierProductColor?: string;
  chantierStatus?: { name: string; color: string };
  chantierResponsable?: { firstName: string; lastName: string };
  // 📞 Données enrichies appel
  callDirection?: string;
  callDuration?: number;
  callStatus?: string;
  callFrom?: string;
  callTo?: string;
  callRecordingUrl?: string;
  leadName?: string;
  // Source  
  _source?: 'calendar' | 'chantier' | 'telnyx';
}

interface EventFormValues {
  title: string;
  description?: string;
  notes?: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  allDay: boolean;
  type: string;
  status: string;
  location?: string;
  priority?: string;
  // 🔗 Liaisons
  linkedClientId?: string;
  linkedLeadId?: string;
  linkedProjectId?: string;
  linkedEmailId?: string;
}

// Helper pour extraire la priorité depuis les notes (format: [priority:xxx])
function extractPriority(notes?: string): string | null {
  if (!notes) return null;
  const match = notes.match(/\[priority:(\w+)\]/);
  return match ? match[1] : null;
}

function encodePriority(notes: string | undefined, priority: string | undefined): string {
  const cleaned = (notes || '').replace(/\[priority:\w+\]\s*/g, '').trim();
  if (!priority) return cleaned;
  return `[priority:${priority}] ${cleaned}`.trim();
}

export default function AgendaPage({ compact }: { compact?: boolean }) {
  const screens = Grid.useBreakpoint();
  const isMobile = compact || !screens.md; // compact = sidebar mode, or <768px viewport
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalMode, setModalMode] = useState<'event' | 'task'>('event');
  const [showTasks, setShowTasks] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showChantier, setShowChantier] = useState(true);
  const [showCalls, setShowCalls] = useState(true);
  const [mobileView, setMobileView] = useState<'calendar' | 'tasks'>('calendar');
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const calendarRef = useRef<FullCalendar>(null);
  
  // 🔗 Données pour les liaisons
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
      
      const safeGet = async (url: string): Promise<CalendarEvent[]> => {
        try {
          const response = await api.get(url);
          const data = Array.isArray(response) ? response : (response?.data || response || []);
          return Array.isArray(data) ? data : [];
        } catch { return []; }
      };

      const [calEvents, chantierEvts, telnyxCalls] = await Promise.all([
        safeGet(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`),
        safeGet(`/api/calendar/chantier-events?startDate=${startDate}&endDate=${endDate}`),
        safeGet(`/api/calendar/telnyx-calls?startDate=${startDate}&endDate=${endDate}`),
      ]);

      const taggedCalendar = calEvents.map(e => ({ ...e, _source: 'calendar' as const }));
      const taggedChantier = chantierEvts.map(e => ({ ...e, _source: 'chantier' as const }));
      const taggedTelnyx = telnyxCalls.map(e => ({ ...e, _source: 'telnyx' as const }));

      setEvents([...taggedCalendar, ...taggedChantier, ...taggedTelnyx]);
    } catch (error) {
      console.error('[Agenda] Erreur lors de la récupération des événements:', error);
      message.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, [api, getCalendarApi]);

  useEffect(() => {
    // Premier chargement via datesSet de FullCalendar
  }, [fetchEvents]);

  // 🔗 Chargement des données pour les liaisons
  useEffect(() => {
    const loadCrmData = async () => {
      const safeGet = async (url: string) => {
        try {
          const res = await api.get(url);
          const data = res?.data || res || [];
          return Array.isArray(data) ? data : [];
        } catch { return []; }
      };
      const [c, l, p, e] = await Promise.all([
        safeGet('/api/clients'),
        safeGet('/api/leads'),
        safeGet('/api/projects'),
        safeGet('/api/postal/emails?limit=100'),
      ]);
      setClients(c); setLeads(l); setProjects(p); setEmails(e);
    };
    loadCrmData();
  }, [api]);

  // Séparer tâches et événements
  const tasks = events.filter(e => e.type === 'tache');
  const calendarEvents = events.filter(e => e.type !== 'tache');

  // Préparer les événements pour FullCalendar
  const fullCalendarEvents = events
    .filter(e => {
      if (e.type === 'tache') return showTasks;
      if (e._source === 'chantier') return showChantier;
      if (e._source === 'telnyx') return showCalls;
      return showEvents;
    })
    .map(event => {
      const isTask = event.type === 'tache';
      const isChantier = event._source === 'chantier';
      const isTelnyx = event._source === 'telnyx';
      const hasLink = !!(event.linkedChantierId || event.linkedLeadId || event.linkedClientId);
      const priority = extractPriority(event.notes);
      const isCompleted = event.status === 'terminee' || event.status === 'COMPLETED';
      
      let bgColor: string;
      let borderColor: string;
      
      if (isTask) {
        if (isCompleted) {
          bgColor = '#d9d9d9'; borderColor = '#bfbfbf';
        } else {
          const p = TASK_PRIORITIES.find(tp => tp.value === priority);
          bgColor = p?.color || '#722ed1'; borderColor = p?.color || '#531dab';
        }
      } else if (isChantier) {
        const chantierColor = event.chantierProductColor || event.chantierStatus?.color || '#e67e22';
        bgColor = chantierColor; borderColor = chantierColor;
      } else if (isTelnyx) {
        bgColor = event.callDirection === 'outbound' ? '#3498db' : '#27ae60';
        borderColor = event.callDirection === 'outbound' ? '#2980b9' : '#219a52';
      } else if (hasLink) {
        bgColor = SF.blue; borderColor = SF.blueDark;
      } else {
        bgColor = SF.emerald; borderColor = SF.emeraldDark;
      }

      let prefix = '';
      if (isTask) prefix = isCompleted ? '✅ ' : '☐ ';
      else if (isChantier) prefix = '🏗️ ';
      else if (isTelnyx) prefix = '';
      else if (hasLink) prefix = '🔗 ';
      
      return {
        id: event.id,
        title: `${prefix}${event.title}`,
        start: event.startDate,
        end: event.endDate,
        allDay: event.allDay,
        backgroundColor: bgColor,
        borderColor,
        textColor: isCompleted ? '#8c8c8c' : '#fff',
        editable: !isChantier && !isTelnyx,
        classNames: [
          ...(hasLink ? ['cursor-pointer', 'event-linked'] : []),
          ...(isTask ? ['event-task'] : []),
          ...(isCompleted ? ['event-completed'] : []),
          ...(isChantier ? ['event-chantier'] : []),
          ...(isTelnyx ? ['event-telnyx'] : []),
        ],
        extendedProps: { ...event }
      };
    });

  // Toggle complétion d'une tâche
  const handleToggleTask = async (task: CalendarEvent) => {
    try {
      const newStatus = task.status === 'terminee' ? 'a-faire' : 'terminee';
      await api.put(`/api/calendar/events/${task.id}`, { status: newStatus });
      message.success(newStatus === 'terminee' ? 'Tâche terminée !' : 'Tâche rouverte');
      fetchEvents();
    } catch (error) {
      console.error('[Agenda] Erreur toggle tâche:', error);
      message.error('Erreur lors de la mise à jour');
    }
  };

  const handleEventSubmit = async (values: EventFormValues) => {
    try {
      const [start, end] = values.dateRange;
      const isTask = values.type === 'tache';
      
      const eventData: Record<string, unknown> = {
        title: values.title,
        description: values.description,
        notes: isTask ? encodePriority(values.notes, values.priority) : values.notes,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        allDay: values.allDay || false,
        type: values.type || 'rendez-vous',
        status: isTask ? (values.status || 'a-faire') : (values.status || 'confirmé'),
        location: values.location,
        // 🔗 Liaisons
        linkedClientId: values.linkedClientId || null,
        linkedLeadId: values.linkedLeadId || null,
        linkedProjectId: values.linkedProjectId || null,
        linkedEmailId: values.linkedEmailId || null,
      };

      if (editingEvent) {
        await api.put(`/api/calendar/events/${editingEvent.id}`, eventData);
        message.success(isTask ? 'Tâche modifiée' : 'Événement modifié');
      } else {
        await api.post('/api/calendar/events', eventData);
        message.success(isTask ? 'Tâche créée' : 'Événement créé');
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
      message.success('Supprimé avec succès');
      setModalVisible(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('[Agenda] Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleEventClick = (clickInfo: { event: { id: string, extendedProps: CalendarEvent } }) => {
    const event = clickInfo.event.extendedProps;
    if (!event) return;
    
    // Pour les événements chantier et appels Telnyx : afficher une modale d'info (lecture seule)
    if (event._source === 'chantier') {
      Modal.info({
        title: `🏗️ ${event.title}`,
        width: 500,
        content: (
          <div style={{ marginTop: 12 }}>
            {event.chantierClientName && <p><strong>Client :</strong> {event.chantierClientName}</p>}
            {event.chantierSiteAddress && <p><strong>Adresse :</strong> {event.chantierSiteAddress}</p>}
            {event.chantierProduct && <p><strong>Produit :</strong> {event.chantierProduct}</p>}
            {event.chantierStatus && <p><strong>Statut :</strong> <Tag color={event.chantierStatus.color}>{event.chantierStatus.name}</Tag></p>}
            {event.chantierResponsable && <p><strong>Responsable :</strong> {event.chantierResponsable.firstName} {event.chantierResponsable.lastName}</p>}
            {event.chantierEventType && <p><strong>Type :</strong> {event.chantierEventType}</p>}
            {event.problemNote && <p><strong>Problème :</strong> <Text type="danger">{event.problemNote}</Text></p>}
            {event.location && <p><strong>Lieu :</strong> {event.location}</p>}
            <p><strong>Date :</strong> {dayjs(event.startDate).format('DD/MM/YYYY HH:mm')}</p>
          </div>
        ),
      });
      return;
    }
    
    if (event._source === 'telnyx') {
      const durationMin = event.callDuration ? Math.ceil(event.callDuration / 60) : 0;
      Modal.info({
        title: `📞 Appel ${event.callDirection === 'outbound' ? 'sortant' : 'entrant'}`,
        width: 450,
        content: (
          <div style={{ marginTop: 12 }}>
            {event.leadName && <p><strong>Contact :</strong> {event.leadName}</p>}
            <p><strong>De :</strong> {event.callFrom}</p>
            <p><strong>Vers :</strong> {event.callTo}</p>
            <p><strong>Statut :</strong> {event.callStatus}</p>
            {durationMin > 0 && <p><strong>Durée :</strong> {durationMin} min</p>}
            <p><strong>Date :</strong> {dayjs(event.startDate).format('DD/MM/YYYY HH:mm')}</p>
            {event.callRecordingUrl && (
              <p><a href={event.callRecordingUrl} target="_blank" rel="noopener noreferrer">🎙️ Écouter l'enregistrement</a></p>
            )}
          </div>
        ),
      });
      return;
    }

    // Pour les événements normaux : ouvrir le formulaire d'édition
    const isTask = event.type === 'tache';
    setEditingEvent(event);
    setModalMode(isTask ? 'task' : 'event');
    const priority = extractPriority(event.notes);
    const cleanNotes = (event.notes || '').replace(/\[priority:\w+\]\s*/g, '').trim();
    form.setFieldsValue({
      title: event.title,
      description: event.description,
      notes: cleanNotes,
      dateRange: [
        event.startDate ? dayjs(event.startDate) : null,
        event.endDate ? dayjs(event.endDate) : null
      ],
      allDay: event.allDay,
      type: event.type || 'rendez-vous',
      status: event.status || (isTask ? 'a-faire' : 'confirmé'),
      location: event.location,
      priority: priority || 'normale',
      linkedClientId: event.linkedClientId,
      linkedLeadId: event.linkedLeadId,
      linkedProjectId: event.linkedProjectId,
      linkedEmailId: event.linkedEmailId,
    });
    setModalVisible(true);
  };

  const handleDateSelect = (selectInfo: { start: Date; end: Date; allDay: boolean }) => {
    setEditingEvent(null);
    setModalMode('event');
    form.resetFields();
    form.setFieldsValue({
      dateRange: [dayjs(selectInfo.start), dayjs(selectInfo.end)],
      allDay: selectInfo.allDay,
      type: 'rendez-vous',
      status: 'confirmé',
      priority: 'normale',
    });
    setModalVisible(true);
  };

  const openNewTask = () => {
    setEditingEvent(null);
    setModalMode('task');
    form.resetFields();
    form.setFieldsValue({
      type: 'tache',
      status: 'a-faire',
      priority: 'normale',
      allDay: true,
      dateRange: [dayjs(), dayjs().add(1, 'day')],
    });
    setModalVisible(true);
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setModalMode('event');
    form.resetFields();
    form.setFieldsValue({
      type: 'rendez-vous',
      status: 'confirmé',
      allDay: false,
      dateRange: [dayjs(), dayjs().add(1, 'hour')],
    });
    setModalVisible(true);
  };

  const watchedType = Form.useWatch('type', form);
  const isTaskMode = watchedType === 'tache' || modalMode === 'task';

  // Panneau latéral des tâches
  const pendingTasks = tasks.filter(t => t.status !== 'terminee' && t.status !== 'annulee');
  const completedTasks = tasks.filter(t => t.status === 'terminee');

  const renderTaskItem = (task: CalendarEvent) => {
    const priority = extractPriority(task.notes);
    const pInfo = TASK_PRIORITIES.find(p => p.value === priority);
    const isCompleted = task.status === 'terminee';
    const isOverdue = !isCompleted && dayjs(task.endDate || task.startDate).isBefore(dayjs(), 'day');

    return (
      <List.Item
        key={task.id}
        style={{ padding: '8px 12px', cursor: 'pointer', opacity: isCompleted ? 0.6 : 1 }}
        onClick={() => handleEventClick({ event: { id: task.id, extendedProps: task } })}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <Checkbox
            checked={isCompleted}
            onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              delete={isCompleted}
              style={{ display: 'block', fontSize: 13 }}
              ellipsis
            >
              {task.title}
            </Text>
            <Space size={4} style={{ marginTop: 2 }}>
              {pInfo && <Tag color={pInfo.color} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>{pInfo.label}</Tag>}
              {isOverdue && <Tag color="red" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>⏰ En retard</Tag>}
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(task.endDate || task.startDate).format('DD/MM')}
              </Text>
            </Space>
          </div>
        </div>
      </List.Item>
    );
  };

  // Composant liste des tâches réutilisé desktop + mobile
  const TaskListPanel = ({ maxHeight }: { maxHeight?: string }) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 14 }}>
          <CheckSquareOutlined style={{ marginRight: 4, color: '#722ed1' }} />
          Tâches
          {pendingTasks.length > 0 && (
            <Badge count={pendingTasks.length} style={{ marginLeft: 8, backgroundColor: '#722ed1' }} />
          )}
        </Text>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={openNewTask}>
          Ajouter
        </Button>
      </div>

      {pendingTasks.length === 0 && completedTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#bfbfbf' }}>
          <CheckSquareOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
          <Text type="secondary">Aucune tâche</Text>
        </div>
      ) : (
        <div style={{ maxHeight: maxHeight || 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {pendingTasks.length > 0 && (
            <List
              size="small"
              dataSource={pendingTasks}
              renderItem={renderTaskItem}
              style={{ marginBottom: 8 }}
            />
          )}
          {completedTasks.length > 0 && (
            <>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', margin: '8px 0 4px 12px' }}>
                Terminées ({completedTasks.length})
              </Text>
              <List
                size="small"
                dataSource={completedTasks.slice(0, 5)}
                renderItem={renderTaskItem}
              />
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="agenda-page" style={{ padding: isMobile ? 0 : 24, maxWidth: '100%', overflow: 'hidden' }}>
      {/* === MOBILE CSS FullCalendar === */}
      {isMobile && (
        <style>{`
          .agenda-page .fc { font-size: 11px; max-width: 100%; overflow: hidden; }
          .agenda-page .fc .fc-toolbar { padding: 6px 8px; margin-bottom: 0 !important; gap: 4px; flex-wrap: wrap; justify-content: center; }
          .agenda-page .fc .fc-toolbar-title { font-size: 13px !important; font-weight: 700; color: ${SF.text}; text-transform: capitalize; }
          .agenda-page .fc .fc-button {
            padding: 0 8px !important; font-size: 11px !important;
            height: 28px !important; min-height: 28px !important; max-height: 28px !important;
            border-radius: 14px !important;
            font-weight: 600; border: 1.5px solid ${SF.border} !important;
            background: ${SF.cardBg} !important; color: ${SF.text} !important;
            box-shadow: none !important; text-transform: capitalize;
            transition: all 0.2s ease;
            box-sizing: border-box !important; line-height: 25px !important;
            vertical-align: middle !important; margin: 0 !important;
          }
          .agenda-page .fc .fc-button:hover { background: ${SF.primary}10 !important; border-color: ${SF.primary}60 !important; }
          .agenda-page .fc .fc-button-active {
            background: ${SF.primary} !important; color: #fff !important;
            border-color: ${SF.primary} !important;
          }
          .agenda-page .fc .fc-button-group { border-radius: 14px; overflow: hidden; display: inline-flex !important; align-items: center !important; }
          .agenda-page .fc .fc-button-group .fc-button { border-radius: 0 !important; margin: 0 !important; border-left-width: 0 !important; height: 28px !important; min-height: 28px !important; max-height: 28px !important; line-height: 25px !important; padding: 0 8px !important; }
          .agenda-page .fc .fc-button-group .fc-button:first-child { border-radius: 14px 0 0 14px !important; border-left-width: 1.5px !important; }
          .agenda-page .fc .fc-button-group .fc-button:last-child { border-radius: 0 14px 14px 0 !important; }
          .agenda-page .fc .fc-prev-button, .agenda-page .fc .fc-next-button {
            width: 28px !important; height: 28px !important; min-height: 28px !important; max-height: 28px !important;
            padding: 0 !important;
            display: inline-flex !important; align-items: center !important; justify-content: center !important;
            border-radius: 50% !important; background: ${SF.cardBg} !important;
            color: ${SF.primary} !important; border: 1.5px solid ${SF.primary}30 !important;
            box-sizing: border-box !important;
          }
          .agenda-page .fc .fc-prev-button:hover, .agenda-page .fc .fc-next-button:hover {
            background: ${SF.primary}15 !important; border-color: ${SF.primary} !important;
          }
          .agenda-page .fc .fc-today-button { font-size: 10px !important; padding: 0 8px !important; height: 28px !important; min-height: 28px !important; max-height: 28px !important; border-radius: 14px !important; line-height: 25px !important; }
          .agenda-page .fc .fc-toolbar-chunk { overflow: hidden; display: flex !important; flex-wrap: wrap; gap: 4px; align-items: center !important; }
          .agenda-page .fc .fc-daygrid-day { min-height: 50px; }
          .agenda-page .fc .fc-daygrid-day-number { font-size: 11px; padding: 2px 3px; }
          .agenda-page .fc .fc-daygrid-event { font-size: 10px; padding: 1px 3px; margin: 0 1px 1px; border-radius: 4px; }
          .agenda-page .fc .fc-list-event { font-size: 12px; }
          .agenda-page .fc .fc-list-event-time { font-size: 11px; }
          .agenda-page .fc .fc-list-day-cushion { padding: 4px 6px; font-size: 12px; }
          .agenda-page .fc .fc-col-header-cell { font-size: 10px; padding: 3px 0; }
          .agenda-page .fc .fc-scrollgrid { border: none; max-width: 100%; }
          .agenda-page .fc .fc-scrollgrid-section > td,
          .agenda-page .fc .fc-scrollgrid-section > th { overflow: hidden; }
          .agenda-page .fc .fc-more-link { font-size: 10px; }
          .agenda-page .fc .fc-view-harness { overflow-x: auto; overflow-y: hidden; }
          .agenda-page .fc table { table-layout: fixed; width: 100% !important; }
          .agenda-page .ant-card { max-width: 100% !important; overflow: hidden; }
          .agenda-page .mf { display: inline-flex; align-items: center; gap: 2px; padding: 0 6px; height: 28px; border-radius: 14px; border: 1.5px solid #e0e0e0; cursor: pointer; transition: all 0.15s; background: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; color: #666; }
          .agenda-page .mf.on { color: #fff; border-color: transparent; }
          .agenda-page .mf.off { opacity: 0.35; }
          .agenda-page .mobile-segment { padding: 6px 6px 0; }
          .agenda-page .mobile-segment .ant-segmented { border-radius: 8px; width: 100%; }
          .agenda-page .mobile-segment .ant-segmented-item { min-height: 32px; font-size: 12px; }
        `}</style>
      )}

      {!isMobile && (
        <style>{`
          .agenda-page .fc .fc-toolbar-title { font-size: 16px; font-weight: 700; color: ${SF.text}; text-transform: capitalize; }
          .agenda-page .fc .fc-button {
            padding: 0 12px !important; font-size: 12px !important;
            height: 30px !important; min-height: 30px !important; max-height: 30px !important;
            border-radius: 15px !important;
            font-weight: 600; border: 1.5px solid ${SF.border} !important;
            background: ${SF.cardBg} !important; color: ${SF.text} !important;
            box-shadow: none !important; text-transform: capitalize;
            transition: all 0.2s ease;
            box-sizing: border-box !important; line-height: 27px !important;
            vertical-align: middle !important; margin: 0 !important;
          }
          .agenda-page .fc .fc-button:hover { background: ${SF.primary}12 !important; border-color: ${SF.primary}60 !important; color: ${SF.primary} !important; }
          .agenda-page .fc .fc-button-active {
            background: ${SF.primary} !important; color: #fff !important;
            border-color: ${SF.primary} !important;
          }
          .agenda-page .fc .fc-button-group { border-radius: 15px; overflow: hidden; gap: 0; display: inline-flex !important; align-items: center !important; }
          .agenda-page .fc .fc-button-group .fc-button { border-radius: 0 !important; margin: 0 !important; border-left-width: 0 !important; height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 27px !important; }
          .agenda-page .fc .fc-button-group .fc-button:first-child { border-radius: 15px 0 0 15px !important; border-left-width: 1.5px !important; }
          .agenda-page .fc .fc-button-group .fc-button:last-child { border-radius: 0 15px 15px 0 !important; }
          .agenda-page .fc .fc-prev-button, .agenda-page .fc .fc-next-button {
            width: 30px !important; height: 30px !important; min-height: 30px !important; max-height: 30px !important;
            padding: 0 !important;
            display: inline-flex !important; align-items: center !important; justify-content: center !important;
            border-radius: 50% !important; background: ${SF.cardBg} !important;
            color: ${SF.primary} !important; border: 1.5px solid ${SF.primary}30 !important;
            box-sizing: border-box !important;
          }
          .agenda-page .fc .fc-prev-button:hover, .agenda-page .fc .fc-next-button:hover {
            background: ${SF.primary}15 !important; border-color: ${SF.primary} !important; transform: scale(1.05);
          }
          .agenda-page .fc .fc-today-button {
            height: 30px !important; min-height: 30px !important; max-height: 30px !important;
            border-radius: 15px !important; background: ${SF.primary}10 !important;
            color: ${SF.primary} !important; border-color: ${SF.primary}40 !important; font-weight: 600;
          }
          .agenda-page .fc .fc-today-button:hover { background: ${SF.primary}20 !important; }
          .agenda-page .fc .fc-today-button:disabled { opacity: 0.4; }
          .agenda-page .fc .fc-toolbar-chunk { display: flex !important; align-items: center !important; gap: 4px; }
          .agenda-page .fc .fc-daygrid-event { border-radius: 4px; font-size: 12px; padding: 1px 4px; }
          .agenda-page .fc .fc-toolbar { margin-bottom: 12px !important; }
          .agenda-page .fc .fc-daygrid-day-frame { padding: 2px 4px; }
          .agenda-page .fc .fc-daygrid-day.fc-day-today { background: ${SF.primary}08 !important; }
          .agenda-page .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { 
            background: ${SF.primary}; color: #fff; border-radius: 50%; width: 22px; height: 22px;
            display: flex; align-items: center; justify-content: center; font-size: 12px;
          }
          .agenda-page > .ant-card { border-radius: 12px !important; box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important; border: 1px solid ${SF.border} !important; }
          .agenda-page > .ant-card > .ant-card-body { padding: 0 !important; }
        `}</style>
      )}

      <Card
        bodyStyle={{ padding: isMobile ? 0 : 0 }}
        style={{ borderRadius: isMobile ? 0 : undefined, border: isMobile ? 'none' : undefined, maxWidth: '100%', overflow: 'hidden' }}
      >
        {/* === HEADER === */}
        {isMobile ? (
          // ------- MOBILE: single-line header with filters -------
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              height: 44,
              padding: '0 4px',
              borderBottom: '1px solid #f0f0f0',
              background: '#fff',
              position: 'sticky' as const,
              top: 0,
              zIndex: 10,
              gap: 3,
              maxWidth: '100%',
              overflow: 'hidden',
            }}>
              {/* Left: title */}
              <CalendarOutlined style={{ color: SF.primary, fontSize: 14, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>Agenda</span>

              {/* Center: filter pills — icons only to save space */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 3, overflow: 'hidden' }}>
                <Tooltip title="RDV"><div
                  className={`mf ${showEvents ? 'on' : 'off'}`}
                  style={showEvents ? { background: SF.emerald } : {}}
                  onClick={() => setShowEvents(!showEvents)}
                ><CalendarOutlined style={{ fontSize: 11 }} /></div></Tooltip>
                <Tooltip title="Tâches"><div
                  className={`mf ${showTasks ? 'on' : 'off'}`}
                  style={showTasks ? { background: '#722ed1' } : {}}
                  onClick={() => setShowTasks(!showTasks)}
                ><CheckSquareOutlined style={{ fontSize: 11 }} /></div></Tooltip>
                <Tooltip title="Sites"><div
                  className={`mf ${showChantier ? 'on' : 'off'}`}
                  style={showChantier ? { background: '#e67e22' } : {}}
                  onClick={() => setShowChantier(!showChantier)}
                ><ToolOutlined style={{ fontSize: 11 }} /></div></Tooltip>
                <Tooltip title="Appels"><div
                  className={`mf ${showCalls ? 'on' : 'off'}`}
                  style={showCalls ? { background: '#3498db' } : {}}
                  onClick={() => setShowCalls(!showCalls)}
                ><PhoneOutlined style={{ fontSize: 11 }} /></div></Tooltip>
              </div>

              {/* Right: tasks badge + add button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div
                  onClick={() => setTaskDrawerOpen(true)}
                  style={{ position: 'relative', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CheckSquareOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                  {pendingTasks.length > 0 && (
                    <Badge
                      count={pendingTasks.length}
                      size="small"
                      style={{ backgroundColor: '#722ed1', position: 'absolute', top: -4, right: -6, fontSize: 9 }}
                    />
                  )}
                </div>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'event', icon: <CalendarOutlined />, label: 'Événement', onClick: openNewEvent },
                      { key: 'task', icon: <CheckSquareOutlined />, label: 'Tâche', onClick: openNewTask },
                    ],
                  }}
                  trigger={['click']}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: SF.primary, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 16,
                    boxShadow: `0 2px 6px ${SF.primary}50`,
                  }}>
                    <PlusOutlined />
                  </div>
                </Dropdown>
              </div>
            </div>

            {/* ------- MOBILE TABS ------- */}
            <div className="mobile-segment">
              <Segmented
                block
                value={mobileView}
                onChange={(val) => setMobileView(val as 'calendar' | 'tasks')}
                options={[
                  { value: 'calendar', icon: <CalendarOutlined />, label: 'Calendrier' },
                  { value: 'tasks', icon: <CheckSquareOutlined />, label: `Tâches (${pendingTasks.length})` },
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>
          </>
        ) : (
          // ------- DESKTOP HEADER -------
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px 12px',
            borderBottom: `1px solid ${SF.border}`,
            background: '#fff',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {/* Left: title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `linear-gradient(135deg, ${SF.primary}20, ${SF.primary}10)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${SF.primary}30`,
              }}>
                <CalendarOutlined style={{ color: SF.primary, fontSize: 16 }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 18, color: SF.text, letterSpacing: -0.3 }}>Agenda</span>
            </div>

            {/* Right: filter pills + add */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'events', icon: <CalendarOutlined />, label: 'RDV', color: SF.emerald, active: showEvents, toggle: () => setShowEvents(!showEvents) },
                { key: 'tasks', icon: <CheckSquareOutlined />, label: 'Tâches', color: '#722ed1', active: showTasks, toggle: () => setShowTasks(!showTasks) },
                { key: 'chantier', icon: <ToolOutlined />, label: 'Sites', color: '#e67e22', active: showChantier, toggle: () => setShowChantier(!showChantier) },
                { key: 'calls', icon: <PhoneOutlined />, label: 'Appels', color: '#3498db', active: showCalls, toggle: () => setShowCalls(!showCalls) },
              ].map(f => (
                <Tooltip key={f.key} title={f.label}>
                  <div
                    onClick={f.toggle}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '0 12px', height: 30, borderRadius: 15, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, transition: 'all 0.18s',
                      background: f.active ? f.color + '15' : SF.bg,
                      color: f.active ? f.color : SF.textSecondary,
                      border: `1.5px solid ${f.active ? f.color + '50' : SF.border}`,
                    }}
                  >
                    {f.icon}
                    <span>{f.label}</span>
                  </div>
                </Tooltip>
              ))}

              <div style={{ width: 1, height: 20, background: SF.border, margin: '0 2px' }} />

              <Dropdown
                menu={{
                  items: [
                    { key: 'event', icon: <CalendarOutlined />, label: 'Événement', onClick: openNewEvent },
                    { key: 'task', icon: <CheckSquareOutlined />, label: 'Tâche', onClick: openNewTask },
                  ],
                }}
                trigger={['click']}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 14px', height: 30, borderRadius: 15, cursor: 'pointer',
                  background: SF.primary, color: '#fff',
                  fontWeight: 700, fontSize: 13,
                  boxShadow: `0 2px 8px ${SF.primary}40`,
                  transition: 'all 0.18s',
                }}>
                  <PlusOutlined style={{ fontSize: 13 }} />
                  <span>Nouveau</span>
                </div>
              </Dropdown>
            </div>
          </div>
        )}

        {/* === CONTENU PRINCIPAL === */}
        {isMobile ? (
          // Mobile layout
          <>
            {mobileView === 'calendar' && (
              <div style={{ padding: '4px 0 0' }}>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: 'listWeek,dayGridMonth'
                  }}
                  initialView="listWeek"
                  locale={frLocale}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={3}
                  weekends={true}
                  height="auto"
                  contentHeight="auto"
                  events={fullCalendarEvents}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  loading={setLoading}
                  datesSet={(dateInfo) => fetchEvents(dateInfo.view.calendar)}
                  eventDisplay="block"
                  editable={false}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                  }}
                  titleFormat={{ year: 'numeric', month: 'short' }}
                  dayHeaderFormat={{ weekday: 'narrow' }}
                />
              </div>
            )}
            {mobileView === 'tasks' && (
              <div style={{ padding: '12px 12px 0' }}>
                <TaskListPanel maxHeight="calc(100vh - 240px)" />
              </div>
            )}
          </>
        ) : (
          // Desktop layout
          <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
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
                editable={true}
                eventDrop={async (info) => {
                  try {
                    await api.put(`/api/calendar/events/${info.event.id}`, {
                      startDate: info.event.start?.toISOString(),
                      endDate: info.event.end?.toISOString() || info.event.start?.toISOString(),
                      allDay: info.event.allDay,
                    });
                    message.success('Déplacé');
                    fetchEvents();
                  } catch {
                    info.revert();
                    message.error('Erreur lors du déplacement');
                  }
                }}
                eventResize={async (info) => {
                  try {
                    await api.put(`/api/calendar/events/${info.event.id}`, {
                      startDate: info.event.start?.toISOString(),
                      endDate: info.event.end?.toISOString(),
                    });
                    fetchEvents();
                  } catch {
                    info.revert();
                    message.error('Erreur lors du redimensionnement');
                  }
                }}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: false
                }}
              />
            </div>

            {/* Panneau latéral des tâches — desktop */}
            <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid #f0f0f0', paddingLeft: 16 }}>
              <TaskListPanel />
            </div>
          </div>
          </div>
        )}
      </Card>

      {/* Drawer tâches mobile */}
      {isMobile && (
        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <CheckSquareOutlined style={{ color: '#722ed1', fontSize: 16 }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Tâches</span>
                {pendingTasks.length > 0 && <Badge count={pendingTasks.length} style={{ backgroundColor: '#722ed1' }} />}
              </Space>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNewTask}
                style={{ borderRadius: 8, background: '#722ed1', borderColor: '#722ed1' }}>
                Ajouter
              </Button>
            </div>
          }
          placement="bottom"
          open={taskDrawerOpen}
          onClose={() => setTaskDrawerOpen(false)}
          height="75vh"
          styles={{ body: { padding: '8px 12px' }, header: { padding: '12px 16px' } }}
          closable={false}
        >
          <TaskListPanel maxHeight="calc(75vh - 80px)" />
        </Drawer>
      )}

      {/* Modal création/édition — responsive */}
      <Modal
        title={
          <span style={{ fontSize: isMobile ? 15 : 16 }}>
            {editingEvent
              ? (isTaskMode ? '✏️ Modifier la tâche' : '✏️ Modifier l\'événement')
              : (isTaskMode ? '✅ Nouvelle tâche' : '📅 Nouvel événement')}
          </span>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingEvent(null);
          form.resetFields();
        }}
        footer={null}
        width={isMobile ? '100%' : 600}
        style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 } : undefined}
        styles={isMobile ? { body: { maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', padding: '12px 16px' } } : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEventSubmit}
          initialValues={{ type: 'rendez-vous', status: 'confirmé', priority: 'normale' }}
          size={isMobile ? 'middle' : undefined}
        >
          <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Le titre est obligatoire' }]}>
            <Input placeholder={isTaskMode ? 'Titre de la tâche' : "Titre de l'événement"} />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Description..." />
          </Form.Item>

          <Row gutter={[12, 0]}>
            <Col xs={24} sm={18}>
              <Form.Item name="dateRange" label={isTaskMode ? 'Échéance' : 'Date et heure'} rules={[{ required: true, message: 'La date est obligatoire' }]}>
                <RangePicker
                  showTime={!isTaskMode}
                  format={isTaskMode ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:mm'}
                  placeholder={['Début', 'Fin']}
                  style={{ width: '100%' }}
                  inputReadOnly={isMobile}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="allDay" label="Journée" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 0]}>
            <Col xs={isTaskMode ? 24 : 12} sm={isTaskMode ? 8 : 12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select placeholder="Type">
                  <Option value="tache">✅ Tâche</Option>
                  <Option value="rendez-vous">🤝 Rendez-vous</Option>
                  <Option value="reunion">👥 Réunion</Option>
                  <Option value="demo">💻 Démo</Option>
                  <Option value="formation">📚 Formation</Option>
                  <Option value="prospection">📞 Prospection</Option>
                  <Option value="suivi">📋 Suivi</Option>
                  <Option value="livraison">🚚 Livraison</Option>
                  <Option value="maintenance">🔧 Maintenance</Option>
                  <Option value="personnel">👤 Personnel</Option>
                </Select>
              </Form.Item>
            </Col>
            {isTaskMode && (
              <Col xs={12} sm={8}>
                <Form.Item name="priority" label="Priorité">
                  <Select placeholder="Priorité">
                    {TASK_PRIORITIES.map(p => (
                      <Option key={p.value} value={p.value}>{p.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col xs={isTaskMode ? 12 : 12} sm={isTaskMode ? 8 : 12}>
              <Form.Item name="status" label="Statut">
                <Select placeholder="Statut">
                  {isTaskMode ? (
                    TASK_STATUSES.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)
                  ) : (
                    <>
                      <Option value="confirmé">✅ Confirmé</Option>
                      <Option value="en attente">⏳ En attente</Option>
                      <Option value="tentative">❓ Tentative</Option>
                      <Option value="annulé">❌ Annulé</Option>
                      <Option value="reporte">📅 Reporté</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Notes personnelles..." />
          </Form.Item>

          {!isTaskMode && (
            <Form.Item name="location" label="Lieu / Localisation">
              <Input placeholder="Adresse, bureau, lien de visioconférence..." />
            </Form.Item>
          )}

          {/* 🔗 Liaisons */}
          <div style={{ background: '#f6f8fa', padding: isMobile ? 12 : 16, borderRadius: 6, marginBottom: 16 }}>
            <Text strong style={{ color: '#1890ff', marginBottom: 12, display: 'block' }}>
              🔗 Liaisons
            </Text>
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item name="linkedClientId" label="Client">
                  <Select placeholder="Client..." allowClear showSearch filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                  }>
                    {clients.map(c => (
                      <Option key={c.id} value={c.id}>{c.name || `${c.firstName} ${c.lastName}`}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="linkedLeadId" label="Lead/Prospect">
                  <Select placeholder="Prospect..." allowClear showSearch filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                  }>
                    {leads.map(l => (
                      <Option key={l.id} value={l.id}>{l.firstName} {l.lastName} - {l.email}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item name="linkedProjectId" label="Projet">
                  <Select placeholder="Projet..." allowClear showSearch filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                  }>
                    {projects.map(p => (
                      <Option key={p.id} value={p.id}>{p.name} - {p.clientName}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="linkedEmailId" label="Email lié">
                  <Select placeholder="Email..." allowClear showSearch filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                  }>
                    {emails.map(e => (
                      <Option key={e.id} value={e.id}>{e.subject?.substring(0, 50)}... - {e.from}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button type="primary" htmlType="submit" block size="large" style={{ borderRadius: 8, height: 44 }}>
                  {editingEvent ? 'Enregistrer' : (isTaskMode ? 'Créer la tâche' : 'Créer l\'événement')}
                </Button>
                {editingEvent && (
                  <Button danger block size="large" style={{ borderRadius: 8, height: 44 }} onClick={() => Modal.confirm({
                    title: 'Supprimer',
                    content: 'Êtes-vous sûr ? Cette action est irréversible.',
                    okText: 'Supprimer',
                    cancelText: 'Annuler',
                    onOk: () => handleEventDelete(editingEvent.id)
                  })}>
                    Supprimer
                  </Button>
                )}
                <Button block size="large" style={{ borderRadius: 8, height: 44 }} onClick={() => setModalVisible(false)}>Annuler</Button>
              </div>
            ) : (
              <Space wrap>
                <Button type="primary" htmlType="submit">
                  {editingEvent ? 'Enregistrer' : (isTaskMode ? 'Créer la tâche' : 'Créer l\'événement')}
                </Button>
                {editingEvent && (
                  <Button danger onClick={() => Modal.confirm({
                    title: 'Supprimer',
                    content: 'Êtes-vous sûr ? Cette action est irréversible.',
                    okText: 'Supprimer',
                    cancelText: 'Annuler',
                    onOk: () => handleEventDelete(editingEvent.id)
                  })}>
                    Supprimer
                  </Button>
                )}
                <Button onClick={() => setModalVisible(false)}>Annuler</Button>
              </Space>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};