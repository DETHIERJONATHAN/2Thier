import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Switch,
  Statistic,
  List,
  Avatar,
  Drawer,
  Space,
  Divider,
  message,
  theme,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Badge,
  Popover,
  Slider,
  Grid
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  SyncOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  PushpinOutlined,
  CheckOutlined,
  WarningOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import FullCalendar, { EventClickArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import isBetween from 'dayjs/plugin/isBetween';
import { computeNotesSummary, countNotesCompletedToday, sortNotesByUrgency } from './googleAgenda/noteUtils';
import type { AgendaNote } from './googleAgenda/noteUtils';

// Extension des plugins dayjs utilisés (isBetween pour les stats de notes)
dayjs.extend(isBetween);

dayjs.locale('fr');

const { Content, Sider } = Layout;
const { Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// --- INTERFACES ---
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start?: string;
  end?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  attendees?: Attendee[];
  organizer?: Attendee;
  status?: 'confirmed' | 'tentative' | 'cancelled' | 'needsAction' | string;
  eventType?: 'meeting' | 'call' | 'rdv' | 'deadline' | 'reminder' | 'other';
  type?: 'note' | 'meeting' | 'call' | 'rdv' | 'deadline' | 'reminder' | 'other';
  meetingUrl?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  isAllDay?: boolean;
  leadId?: string;
  dueDate?: string;
  statusLabel?: string;
  completedAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface Attendee {
  email: string;
  name?: string;
  status: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  avatar?: string;
}

interface Lead {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    company?: string;
}

interface CalendarStats {
  totalEvents: number;
  todayEvents: number;
  weekEvents: number;
  upcomingMeetings: number;
  conflicts: number;
  completionRate: number;
  avgMeetingDuration: number;
 }

interface ExtendedCalendarStats extends CalendarStats {
  notesPending: number;
  notesToday: number;
  notesOverdue: number;
  notesDueSoon: number;
  notesDueNextWeek: number;
  notesCompletedToday: number;
}

type IncomingAgendaPayload = Partial<CalendarEvent> & { id: string };

// --- COMPOSANT PRINCIPAL ---
const GoogleAgendaPage: React.FC = () => {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  const { token } = theme.useToken();
  const calendarRef = useRef<FullCalendar>(null);
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg;
  const contentPadding = isDesktop ? '0 24px 24px' : '0 16px 24px';

  // --- ÉTATS ---
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewTitle, setViewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<ExtendedCalendarStats | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  // Dernière mise à jour
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [noteForm] = Form.useForm();
  const [creatingNote, setCreatingNote] = useState(false);
  interface NoteFormValues { title: string; description?: string; dueDate?: dayjs.Dayjs; priority?: string; category?: string }
  const [showNotes, setShowNotes] = useState(true);
  const [hideDoneNotes, setHideDoneNotes] = useState(true);
  const [pollInterval, setPollInterval] = useState<number>(() => {
    const saved = localStorage.getItem('agendaNotesPollMs');
    return saved ? parseInt(saved, 10) : 60000;
  });
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const previousOverdueCount = useRef<number>(0);
  const [sseStatus, setSseStatus] = useState<'disconnected'|'connecting'|'connected'>('disconnected');
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean>(false);
  const sseRef = useRef<EventSource | null>(null);

  const noteEvents = useMemo<AgendaNote[]>(() => events.filter(event => event.type === 'note') as AgendaNote[], [events]);
  const activeNotes = useMemo<AgendaNote[]>(() => noteEvents.filter(note => note.status !== 'done'), [noteEvents]);
  const sortedActiveNotes = useMemo(() => sortNotesByUrgency(activeNotes), [activeNotes]);
  const noteMetrics = useMemo(() => {
    const now = dayjs();
    const summaryThreeDays = computeNotesSummary(noteEvents, now, { dueSoonWindowDays: 3 });
    const summarySevenDays = computeNotesSummary(noteEvents, now, { dueSoonWindowDays: 7 });
    const dueNextWeek = Math.max(summarySevenDays.dueSoonCount - summaryThreeDays.dueSoonCount, 0);
    const completedToday = countNotesCompletedToday(noteEvents, now);
    return {
      summary: summaryThreeDays,
      dueNextWeek,
      completedToday,
    };
  }, [noteEvents]);
  const notesSummary = noteMetrics.summary;

  const eventCategories = useMemo(() => [
    { value: 'meeting', label: 'Réunion', color: token.colorPrimary },
    { value: 'call', label: 'Appel', color: token.colorSuccess },
    { value: 'rdv', label: 'Rendez-vous', color: token.colorWarning },
    { value: 'deadline', label: 'Échéance', color: token.colorError },
    { value: 'reminder', label: 'Rappel', color: '#722ed1' },
    { value: 'other', label: 'Autre', color: token.colorTextSecondary },
  ], [token]);

  const stableApi = useMemo(() => api, [api]);

  // --- LOGIQUE DE DONNÉES ---
  const loadData = useCallback(async (options?: { forceSync?: boolean; silent?: boolean }) => {
    if (!stableApi) return;
    if (!options?.silent) setLoading(true);
    try {
      const query = options?.forceSync ? '?forceSync=true' : '';
      console.log('🔍 [GoogleAgenda] Chargement des données...', query);
      const [eventsResponse, leadsResponse] = await Promise.all([
        stableApi.get(`/api/calendar/events${query}`),
        stableApi.get('/api/leads?limit=1000')
      ]);
      
      // Vérifier la structure des données
      let eventsData;
      if (Array.isArray(eventsResponse)) {
        eventsData = eventsResponse;
        console.log('📅 [GoogleAgenda] Données directement en array');
      } else if (eventsResponse?.data && Array.isArray(eventsResponse.data)) {
        eventsData = eventsResponse.data;
        console.log('📅 [GoogleAgenda] Données dans response.data');
      } else if (eventsResponse?.events && Array.isArray(eventsResponse.events)) {
        eventsData = eventsResponse.events;
        console.log('📅 [GoogleAgenda] Données dans response.events');
      } else {
        eventsData = [];
        console.log('🚨 [GoogleAgenda] Format de données non reconnu, utilisation array vide');
        console.log('🚨 [GoogleAgenda] Structure complète:', JSON.stringify(eventsResponse, null, 2));
      }
      
      console.log('📅 [GoogleAgenda] Données finales events:', eventsData);
      console.log('📅 [GoogleAgenda] Nombre d\'événements:', eventsData.length);
      
      if (eventsData.length > 0) {
        console.log('📅 [GoogleAgenda] Premier événement:', eventsData[0]);
        console.log('📅 [GoogleAgenda] Structure clés premier événement:', Object.keys(eventsData[0] || {}));
      }
      
      setEvents(eventsData);
      calculateStats(eventsData);

      if (leadsResponse.data && Array.isArray(leadsResponse.data.data)) {
        const formattedLeads = leadsResponse.data.data.map((lead: Lead) => ({
          id: lead.id,
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.company || `Lead #${lead.id.substring(0,4)}`
        }));
        setLeads(formattedLeads);
      }
      setLastRefreshTime(new Date());
      if (!options?.silent) message.success("Données de l'agenda chargées.");
    } catch (error) {
      console.error('❌ [GoogleAgenda] Erreur lors du chargement des données:', error);
      if (!options?.silent) message.error('Erreur lors du chargement des données.');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [stableApi]);

  // --- SYNC AVEC GOOGLE CALENDAR ---
  const syncWithGoogleCalendar = useCallback(async () => {
    if (!stableApi || !calendarRef.current) return;
    setSyncing(true);
    try {
      const calendarApi = calendarRef.current.getApi();
      const view = calendarApi.view;
      const startDate = view.activeStart;
      const endDate = view.activeEnd;
      // POST pour forcer synchro Google
      await stableApi.post('/api/calendar/sync', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      // Rechargement (forceSync pour s'assurer que la vue reflète bien la synchro)
      await loadData({ forceSync: true, silent: true });
      message.success('Synchronisation effectuée.');
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      message.error('La synchronisation a échoué.');
    } finally {
      setSyncing(false);
    }
  }, [stableApi, loadData]);

  useEffect(() => {
    // Chargement initial = forceSync pour toujours récupérer les données Google à l'ouverture
    loadData({ forceSync: true });
  }, [loadData]);

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    const desiredView = isDesktop ? 'dayGridMonth' : 'listWeek';
    if (calendarApi.view.type !== desiredView) {
      calendarApi.changeView(desiredView);
    }
  }, [isDesktop]);

  // --- NOTIFICATIONS SYSTÈME ---
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotificationsAllowed(true);
      else if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => setNotificationsAllowed(p === 'granted'));
      }
    }
  }, []);

  const showSystemNotification = useCallback((title: string, body: string) => {
    try {
      if (!notificationsAllowed || !('Notification' in window)) return;
      new Notification(title, { body });
  } catch {
      /* silencieux */
    }
  }, [notificationsAllowed]);

  // --- SSE TEMPS RÉEL ---
  useEffect(() => {
    if (sseRef.current || !user) return; // déjà connecté ou pas d'user
    setSseStatus('connecting');
  // Transmet l'organizationId pour fallback super_admin si req.user.organizationId est null côté serveur
  const orgIdParam = user?.organizationId ? `?organizationId=${encodeURIComponent(user.organizationId)}` : '';
  const es = new EventSource(`/api/calendar/stream${orgIdParam}`);
    sseRef.current = es;
    console.log('[GoogleAgenda][SSE] Ouverture connexion...');
    es.addEventListener('connected', (e) => {
      console.log('[GoogleAgenda][SSE] Connecté:', (e as MessageEvent).data);
      setSseStatus('connected');
    });
  const handleInsertOrUpdate = (payload: IncomingAgendaPayload | null, origin: string) => {
      if (!payload) return;
      const normalized: CalendarEvent = {
        id: payload.id,
        title: payload.title ?? 'Sans titre',
        category: payload.category ?? payload.type ?? 'other',
        priority: payload.priority ?? 'medium',
        isAllDay: payload.isAllDay ?? false,
        status: payload.status,
        ...payload,
      };

      setEvents(prev => {
        const idx = prev.findIndex(ev => ev.id === normalized.id);
        if (idx === -1) {
          return [...prev, normalized];
        }
        const clone = [...prev];
        clone[idx] = { ...clone[idx], ...normalized };
        return clone;
      });

      if (payload.type === 'note') {
        if (origin === 'note.created' && (payload.priority === 'urgent' || payload.priority === 'high')) {
          showSystemNotification('Nouvelle note prioritaire', payload.title || 'Sans titre');
        }
        if (origin === 'note.updated' && payload.status === 'done') {
          showSystemNotification('Note complétée', payload.title || '');
        }
      } else if (origin === 'event.created') {
        showSystemNotification('Nouvel événement', payload.title || '');
      }
    };
    es.addEventListener('event.created', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as IncomingAgendaPayload;
        handleInsertOrUpdate(payload, 'event.created');
      } catch (err) {
        console.warn('[SSE] parse event.created', err);
      }
    });
    es.addEventListener('note.created', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as IncomingAgendaPayload;
        handleInsertOrUpdate(payload, 'note.created');
      } catch (err) {
        console.warn('[SSE] parse note.created', err);
      }
    });
    es.addEventListener('note.updated', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as IncomingAgendaPayload;
        handleInsertOrUpdate(payload, 'note.updated');
      } catch (err) {
        console.warn('[SSE] parse note.updated', err);
      }
    });
    es.onerror = (err) => {
      console.warn('[GoogleAgenda][SSE] Erreur / tentative reconnexion dans 5s', err);
      setSseStatus('disconnected');
      es.close();
      sseRef.current = null;
      setTimeout(() => { /* relance */ }, 5000);
    };
    return () => {
      console.log('[GoogleAgenda][SSE] Fermeture connexion');
      es.close();
      sseRef.current = null;
      setSseStatus('disconnected');
    };
  }, [user, showSystemNotification]);

  // Rafraîchissement périodique léger (toutes les 15 minutes) sans forcer si non nécessaire
  useEffect(() => {
    const interval = setInterval(() => {
      loadData({ silent: true });
    }, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(interval);
  }, [loadData]);

  // --- FILTRAGE ---
  useEffect(() => {
    console.log('🔍 [GoogleAgenda] Filtrage des événements...');
    console.log('🔍 [GoogleAgenda] Events bruts:', events);
    console.log('🔍 [GoogleAgenda] Nombre d\'events bruts:', events.length);
    console.log('🔍 [GoogleAgenda] searchTerm:', searchTerm);
    console.log('🔍 [GoogleAgenda] filterCategory:', filterCategory);
    
  let filtered = events;
  // Afficher les notes si showNotes === true (ancienne condition inversée supprimait les notes)
  if (!showNotes) filtered = filtered.filter(e => e.type !== 'note');
    if (hideDoneNotes) filtered = filtered.filter(e => e.type !== 'note' || e.status !== 'done');
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('🔍 [GoogleAgenda] Après filtrage par terme de recherche:', filtered.length);
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(event => event.category === filterCategory);
      console.log('🔍 [GoogleAgenda] Après filtrage par catégorie:', filtered.length);
    }
    
    console.log('✅ [GoogleAgenda] Events filtrés finaux:', filtered);
    console.log('✅ [GoogleAgenda] Nombre d\'events filtrés:', filtered.length);
    
    setFilteredEvents(filtered);
  }, [events, searchTerm, filterCategory, showNotes, hideDoneNotes]);

  // --- HELPERS POUR ICÔNES ET COULEURS ---
  const getEventIcon = useCallback((category: string) => {
    switch (category) {
      case 'reunion': return '🏢';
      case 'appel': return '📞';
      case 'rendez-vous': return '👥';
      case 'echeance': return '⏰';
      case 'rappel': return '🔔';
      case 'note': return '🗒️';
      default: return '📝';
    }
  }, []);

  const getEventColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return '#ff4d4f'; // Rouge
      case 'high': return '#fa8c16'; // Orange  
      case 'medium': return '#1890ff'; // Bleu
      case 'low': return '#52c41a'; // Vert
      default: return '#1890ff'; // Bleu par défaut
    }
  }, []);

  const calendarEvents = useMemo(() => {
    console.log('🔄 [GoogleAgenda] Transformation pour FullCalendar...');
    console.log('🔄 [GoogleAgenda] filteredEvents à transformer:', filteredEvents);
    console.log('🔄 [GoogleAgenda] Nombre d\'filteredEvents:', filteredEvents.length);
    
    const transformedEvents = filteredEvents.map(event => {
      console.log('🔄 [GoogleAgenda] Transformation événement:', event);
      console.log('🔄 [GoogleAgenda] Clés événement:', Object.keys(event || {}));
      
      // 🎯 Récupérer category et priority depuis les champs corrects
  const category = event.type === 'note' ? (event.category || 'note') : (event.type || 'rendez-vous');
  const priority = event.type === 'note' ? (event.priority || 'medium') : (event.status || 'medium');
      const icon = getEventIcon(category);
      const color = getEventColor(priority);
      
      console.log('🎨 [GoogleAgenda] Category:', category, 'Priority:', priority, 'Icon:', icon, 'Color:', color);
      
      const transformed = {
        id: event.id,
        title: `${icon} ${event.title}`,
        start: event.startDate || event.start,
        end: event.endDate || event.end,
        allDay: event.allDay || event.isAllDay || event.type === 'note',
        backgroundColor: event.type === 'note' ? (event.status === 'done' ? '#52c41a' : (event.dueDate && dayjs(event.dueDate).isBefore(dayjs(), 'day') ? '#ff4d4f' : '#faad14')) : color,
        borderColor: event.type === 'note' ? (event.status === 'done' ? '#52c41a' : (event.dueDate && dayjs(event.dueDate).isBefore(dayjs(), 'day') ? '#ff4d4f' : '#faad14')) : color,
        classNames: event.type === 'note' ? ['agenda-note-event'] : [],
        extendedProps: {
          ...event,
          category,
          priority,
          isNote: event.type === 'note'
        },
      };
      
      console.log('✅ [GoogleAgenda] Événement transformé:', transformed);
      return transformed;
    });
    
    console.log('🎯 [GoogleAgenda] Tous les événements transformés pour FullCalendar:', transformedEvents);
    console.log('🎯 [GoogleAgenda] Nombre final d\'événements pour FullCalendar:', transformedEvents.length);
    
    return transformedEvents;
  }, [filteredEvents, getEventIcon, getEventColor]);

  // --- GESTIONNAIRES D'ÉVÉNEMENTS CALENDRIER ---
  const handleDateClick = useCallback((arg: DateClickArg) => {
    setSelectedEvent(null);
    form.resetFields();
    form.setFieldsValue({
      dateTime: [dayjs(arg.dateStr), dayjs(arg.dateStr).add(1, 'hour')],
      isAllDay: arg.allDay,
      priority: 'medium',
      category: 'rdv',
    });
    setIsModalVisible(true);
  }, [form]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
    setIsDetailsDrawerVisible(true);
  }, []);

  // --- GESTIONNAIRES CRUD ---
  const handleFormSubmit = async (values: Partial<CalendarEvent & { dateTime: [dayjs.Dayjs, dayjs.Dayjs] }>) => {
    if (!stableApi) return;
    const eventData = {
      ...values,
      start: values.dateTime?.[0].toISOString(),
      end: values.dateTime?.[1].toISOString(),
      organizer: { email: user?.email, name: `${user?.firstName} ${user?.lastName}` },
    };
    delete eventData.dateTime;

    try {
      if (selectedEvent?.event.id) {
        await stableApi.put(`/calendar/events/${selectedEvent.event.id}`, eventData);
        message.success('Événement mis à jour !');
      } else {
        await stableApi.post('/api/calendar/events', eventData);
        message.success('Événement créé !');
      }
      setIsModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('La sauvegarde a échoué.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    console.log('🗑️ [GoogleAgenda] handleDeleteEvent appelé avec ID:', eventId);
    if (!stableApi) {
      console.error('🗑️ [GoogleAgenda] stableApi non disponible');
      return;
    }
    
    console.log('🗑️ [GoogleAgenda] 🎯 SUPPRESSION DIRECTE - Début de la suppression...');
    
    try {
      console.log('🗑️ [GoogleAgenda] URL de suppression:', `/calendar/events/${eventId}`);
      await stableApi.delete(`/calendar/events/${eventId}`);
      console.log('🗑️ [GoogleAgenda] ✅ Suppression réussie');
      message.success('Événement supprimé avec succès !');
      setIsDetailsDrawerVisible(false);
      loadData();
    } catch (error) {
      console.error('🗑️ [GoogleAgenda] ❌ Erreur suppression:', error);
      message.error('La suppression a échoué.');
    }
  };

  const handleNoteFinish = useCallback(async (values: NoteFormValues) => {
    setCreatingNote(true);
    try {
      console.log('[Notes] Soumission note valeurs:', values);
      const payload = {
        title: values.title?.trim(),
        description: values.description || null,
        dueDate: values.dueDate ? values.dueDate.endOf('day').toISOString() : null,
        priority: values.priority || 'medium',
        category: values.category || 'general'
      };
      if (!payload.title) {
        message.error('Titre vide.');
        return;
      }
      await stableApi.post('/api/calendar/notes', payload);
      message.success('Note ajoutée');
      noteForm.resetFields();
      setIsNoteModalVisible(false);
      loadData({ forceSync: true, silent: true });
    } catch (e) {
      console.error('[Notes] Erreur création note:', e);
      message.error('Erreur création note');
    } finally {
      setCreatingNote(false);
    }
  }, [stableApi, noteForm, loadData]);

  const markNoteDone = useCallback(async (id: string) => {
    try {
      await stableApi.patch(`/api/calendar/notes/${id}/done`, {});
      await loadData({ forceSync: true, silent: true });
      message.success('Note complétée');
    } catch {
      message.error('Erreur maj note');
    }
  }, [stableApi, loadData]);

  // --- CALCULS & HELPERS ---
  const calculateStats = (eventsData: CalendarEvent[]) => {
    const now = dayjs();
    const todayEvents = eventsData.filter(e => dayjs(e.startDate || e.start).isSame(now, 'day') && e.type !== 'note').length;
    const weekStart = now.startOf('week');
    const weekEnd = now.endOf('week');
    const weekEvents = eventsData.filter(e => {
      const eventDate = dayjs(e.startDate || e.start);
      return eventDate.isAfter(weekStart) && eventDate.isBefore(weekEnd) && e.type !== 'note';
    }).length;
    const upcomingMeetings = eventsData.filter(e => {
      const eventDate = dayjs(e.startDate || e.start);
      return eventDate.isAfter(now) && eventDate.isBefore(now.add(7, 'days')) && e.type !== 'note';
    }).length;
   // Notes
   const noteEntries = eventsData.filter(e => e.type === 'note') as AgendaNote[];
   const notesSummaryThreeDays = computeNotesSummary(noteEntries, now, { dueSoonWindowDays: 3 });
   const notesSummarySevenDays = computeNotesSummary(noteEntries, now, { dueSoonWindowDays: 7 });
   const notesPending = notesSummaryThreeDays.totalActive;
   const notesToday = notesSummaryThreeDays.todayCount;
   const notesOverdue = notesSummaryThreeDays.overdueCount;
   const notesDueSoon = notesSummaryThreeDays.dueSoonCount;
   const notesDueNextWeek = Math.max(notesSummarySevenDays.dueSoonCount - notesSummaryThreeDays.dueSoonCount, 0);
   const notesCompletedToday = countNotesCompletedToday(noteEntries, now);
    const nextStats: ExtendedCalendarStats = {
       totalEvents: eventsData.filter(e => e.type !== 'note').length,
       todayEvents,
       weekEvents,
       upcomingMeetings,
       conflicts: 0,
       completionRate: 100,
       avgMeetingDuration: 30,
       notesPending,
       notesToday,
     notesOverdue,
     notesDueSoon,
     notesDueNextWeek,
     notesCompletedToday,
    };
    setStats(nextStats);
  };

  const changeView = (view: string) => {
    calendarRef.current?.getApi().changeView(view);
  };

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setViewTitle(calendarApi.view.title);
    }
  }, [calendarEvents]); // Re-render title on event change

  // --- RENDU DES COMPOSANTS ---
  const renderStatsPanel = (cardSize: 'default' | 'small' = 'default') => (
    <Card title="📊 Statistiques" size={cardSize} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Aujourd'hui" value={stats?.todayEvents} prefix={<CalendarOutlined />} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Cette semaine" value={stats?.weekEvents} prefix={<ClockCircleOutlined />} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Notes (actives)" value={stats?.notesPending} prefix={<FileTextOutlined />} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Notes en retard" value={stats?.notesOverdue} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: (stats?.notesOverdue || 0) > 0 ? token.colorError : token.colorText }} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Notes du jour" value={stats?.notesToday} prefix={<ClockCircleOutlined />} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Notes imminentes (≤3j)" value={stats?.notesDueSoon} prefix={<WarningOutlined />} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Notes semaine prochaine" value={stats?.notesDueNextWeek} prefix={<CalendarOutlined />} /></Col>
        <Col xs={12} sm={12} md={12} lg={12}><Statistic title="Notes terminées (aujourd'hui)" value={stats?.notesCompletedToday} prefix={<CheckOutlined />} /></Col>
      </Row>
    </Card>
  );

  const renderFiltersPanel = (cardSize: 'default' | 'small' = 'default') => (
    <Card title="🔍 Filtres & Recherche" size={cardSize} style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Input.Search placeholder="Rechercher un événement..." onSearch={setSearchTerm} allowClear />
        <Select placeholder="Catégorie" value={filterCategory} onChange={setFilterCategory} style={{ width: '100%' }}>
          <Option value="all">Toutes les catégories</Option>
          {eventCategories.map(cat => <Option key={cat.value} value={cat.value}>{cat.label}</Option>)}
        </Select>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text>Afficher les notes</Text>
          <Switch checked={showNotes} onChange={setShowNotes} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text>Masquer notes faites</Text>
          <Switch checked={hideDoneNotes} onChange={setHideDoneNotes} />
        </div>
      </Space>
    </Card>
  );

  const renderUpcomingEvents = (cardSize: 'default' | 'small' = 'small') => (
    <Card title="📋 Prochains événements" size={cardSize} style={{ width: '100%' }}>
      <List
        loading={loading}
        dataSource={filteredEvents
          .filter(e => {
            const eventStart = dayjs(e.startDate || e.start);
            return eventStart.isValid() && eventStart.isAfter(dayjs());
          })
          .slice(0, 5)}
        renderItem={(event) => (
          <List.Item style={{ cursor: 'pointer' }} onClick={() => handleEventClick({ event: { extendedProps: event, id: event.id } } as EventClickArg)}>
            <List.Item.Meta
              avatar={<Avatar style={{ backgroundColor: eventCategories.find(c => c.value === event.category)?.color }} icon={<CalendarOutlined />} />}
              title={<Text style={{ fontSize: '12px' }}>{event.title}</Text>}
              description={<Text style={{ fontSize: '10px' }} type="secondary">{dayjs(event.startDate || event.start).format('DD/MM HH:mm')}</Text>}
            />
          </List.Item>
        )}
      />
    </Card>
  );
  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const markBatchDone = async () => {
    for (const id of selectedNoteIds) {
      await markNoteDone(id);
    }
    setSelectedNoteIds([]);
  };

  const renderNotesPanel = (cardSize: 'default' | 'small' = 'small') => (
    <Card
      title={(
        <Space size={6} wrap>
          <span role="img" aria-label="notes">🗒️</span>
          <Text strong>Notes</Text>
          <Text type="secondary">actives {notesSummary.totalActive}</Text>
          <Text type={notesSummary.overdueCount > 0 ? 'danger' : 'secondary'}>retard {notesSummary.overdueCount}</Text>
          <Text type="secondary">≤3j {notesSummary.dueSoonCount}</Text>
          {noteMetrics.dueNextWeek > 0 && <Text type="secondary">+7j {noteMetrics.dueNextWeek}</Text>}
          {noteMetrics.completedToday > 0 && <Text type="success">✔ {noteMetrics.completedToday}</Text>}
          <Popover
            content={(
              <div style={{ width: 220 }}>
                <p style={{ marginBottom: 4 }}>Intervalle polling (sec):</p>
                <Slider min={15} max={300} step={15} value={pollInterval / 1000} onChange={(v: number) => setPollInterval(v * 1000)} tooltip={{ open: false }} />
                <small>Actuel: {(pollInterval / 1000)}s</small>
              </div>
            )}
            trigger="click"
          >
            <Button size="small">⚙️</Button>
          </Popover>
        </Space>
      )}
      size={cardSize}
      style={{ width: '100%' }}
      extra={selectedNoteIds.length > 0 && <Button size="small" type="primary" onClick={markBatchDone}>Valider ({selectedNoteIds.length})</Button>}
    >
      <List
        size="small"
        dataSource={sortedActiveNotes}
        locale={{ emptyText: 'Aucune note active' }}
        renderItem={n => {
          const overdue = n.dueDate && dayjs(n.dueDate).isBefore(dayjs(), 'day');
          const selected = selectedNoteIds.includes(n.id);
          return (
            <List.Item style={{ padding: '4px 8px', background: selected ? '#e6f7ff' : undefined, cursor:'pointer' }} onClick={()=>toggleSelectNote(n.id)}>
              <Space direction="vertical" size={0} style={{ width:'100%' }}>
                <span style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span>{overdue && '⚠️ '}{n.title}</span>
                  {n.dueDate && <span style={{ color: overdue ? '#ff4d4f' : '#999' }}>{dayjs(n.dueDate).format('DD/MM')}</span>}
                </span>
                {n.description && <Text type="secondary" style={{ fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.description}</Text>}
              </Space>
            </List.Item>
          );
        }}
      />
    </Card>
  );

  useEffect(() => {
    console.log('[GoogleAgenda] Notes summary mise à jour', notesSummary);
    if (notesSummary.overdueCount === 0) {
      previousOverdueCount.current = 0;
    }
  }, [notesSummary]);

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: token.colorBgContainer,
        flexDirection: isDesktop ? 'row' : 'column'
      }}
    >
      {isDesktop && (
        <Sider
          width={320}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorder}`,
            padding: '24px 16px',
            overflowY: 'auto'
          }}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {renderStatsPanel('default')}
            {renderFiltersPanel('default')}
            {renderUpcomingEvents('small')}
            {renderNotesPanel('small')}
          </Space>
        </Sider>
      )}

      <Content style={{ padding: contentPadding, width: '100%' }}>
        {!isDesktop && (
          <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 16 }}>
            {renderStatsPanel('small')}
            {renderFiltersPanel('small')}
            {renderUpcomingEvents('small')}
            {renderNotesPanel('small')}
          </Space>
        )}

        <div
          style={{
            padding: isDesktop ? '24px 0' : '16px 0',
            display: 'flex',
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: isDesktop ? 'center' : 'stretch',
            justifyContent: isDesktop ? 'space-between' : 'flex-start',
            gap: isDesktop ? 12 : 16,
            width: '100%'
          }}
        >
          <Space
            wrap
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: isDesktop ? 'center' : 'flex-start',
              gap: 12,
              width: isDesktop ? 'auto' : '100%'
            }}
          >
            <Button icon={<LeftOutlined />} onClick={() => calendarRef.current?.getApi().prev()} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontSize: isDesktop ? 20 : 18, fontWeight: 600, whiteSpace: 'nowrap' }}>{viewTitle}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Maj {lastRefreshTime ? dayjs(lastRefreshTime).format('HH:mm') : '...'}
              </Text>
            </div>
            <Button icon={<RightOutlined />} onClick={() => calendarRef.current?.getApi().next()} />
            <Button onClick={() => calendarRef.current?.getApi().today()}>Aujourd'hui</Button>
          </Space>
          <Space
            wrap
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: isDesktop ? 'flex-end' : 'flex-start',
              width: isDesktop ? 'auto' : '100%'
            }}
          >
            <Space.Compact style={{ width: isDesktop ? 'auto' : '100%' }}>
              <Button onClick={() => changeView('dayGridMonth')} style={isDesktop ? undefined : { flex: 1 }}>Mois</Button>
              <Button onClick={() => changeView('timeGridWeek')} style={isDesktop ? undefined : { flex: 1 }}>Semaine</Button>
              <Button onClick={() => changeView('timeGridDay')} style={isDesktop ? undefined : { flex: 1 }}>Jour</Button>
            </Space.Compact>
            <Button icon={<SyncOutlined spin={syncing} />} onClick={syncWithGoogleCalendar} loading={syncing} />
            <Tooltip title={`Temps réel: ${sseStatus}`}>
              <Badge color={sseStatus === 'connected' ? 'green' : sseStatus === 'connecting' ? 'orange' : 'red'} />
            </Tooltip>
            <Tooltip title="Nouvel événement">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleDateClick({ dateStr: dayjs().toISOString(), allDay: false } as DateClickArg)} />
            </Tooltip>
            <Tooltip title={`Notes actives: ${notesSummary.totalActive} (retard: ${notesSummary.overdueCount})`}>
              <Badge count={notesSummary.overdueCount} showZero size="small" offset={[-2, 2]} color="red">
                <Button icon={<FileTextOutlined />} onClick={() => setIsNoteModalVisible(true)} />
              </Badge>
            </Tooltip>
          </Space>
        </div>

        <Card
          variant="borderless"
          style={{
            marginTop: isDesktop ? 0 : 16,
            borderRadius: 12,
            boxShadow: isDesktop ? 'none' : '0 8px 24px rgba(0,0,0,0.05)'
          }}
          bodyStyle={{ padding: isDesktop ? 0 : 8 }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={false}
            initialView={isDesktop ? 'dayGridMonth' : 'listWeek'}
            locale={frLocale}
            events={calendarEvents}
            height="auto"
            editable
            selectable
            selectMirror
            dayMaxEvents
            weekends
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={(dateInfo) => setViewTitle(dateInfo.view.title)}
          />
        </Card>
      </Content>

      <Modal
        title={selectedEvent?.event.id ? "📝 Modifier l'événement" : "✨ Créer un nouvel événement"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={isDesktop ? 700 : '100%'}
        style={!isDesktop ? { top: 0 } : undefined}
        bodyStyle={!isDesktop ? { padding: 16 } : undefined}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} initialValues={{ priority: 'medium' }}>
          <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
            <Input placeholder="Ex: Rendez-vous commercial" />
          </Form.Item>
          <Form.Item name="dateTime" label="Date et heure" rules={[{ required: true }]}>
            <RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isAllDay" label="Toute la journée" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Catégorie">
                <Select>
                  {eventCategories.map(cat => <Option key={cat.value} value={cat.value}>{cat.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priorité">
                <Select>
                  <Option value="low">🟢 Faible</Option>
                  <Option value="medium">🟡 Moyenne</Option>
                  <Option value="high">🟠 Élevée</Option>
                  <Option value="urgent">🔴 Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="leadId" label={<span><UserOutlined /> Lier à un lead</span>}>
            <Select showSearch placeholder="Rechercher un lead..." optionFilterProp="children" filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}>
              <Option value="">Aucun</Option>
              {leads.map(lead => <Option key={lead.id} value={lead.id}>{lead.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="location" label={<span><EnvironmentOutlined /> Lieu</span>}>
            <Input placeholder="Ex: Bureaux du client" />
          </Form.Item>
          <Form.Item name="meetingUrl" label={<span><LinkOutlined /> Lien de la réunion (Google Meet, etc.)</span>}>
            <Input placeholder="https://meet.google.com/..." />
          </Form.Item>
          <Form.Item name="description" label="Description / Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Sauvegarder</Button>
              <Button onClick={() => setIsModalVisible(false)}>Annuler</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nouvelle note"
        open={isNoteModalVisible}
        onCancel={() => setIsNoteModalVisible(false)}
        onOk={() => noteForm.submit()}
        okText={creatingNote ? 'Création...' : 'Créer'}
        confirmLoading={creatingNote}
        width={isDesktop ? 520 : '100%'}
        style={!isDesktop ? { top: 0 } : undefined}
        bodyStyle={!isDesktop ? { padding: 16 } : undefined}
        destroyOnHidden
      >
        <Form form={noteForm} layout="vertical" initialValues={{ priority: 'medium', category: 'general' }} onFinish={handleNoteFinish}>
          <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Titre requis' }]}>
            <Input placeholder="Ex: Appeler le client" autoFocus allowClear />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Détails de la tâche" allowClear />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="priority" label="Priorité">
                <Select>
                  <Option value="low">🟢 Faible</Option>
                  <Option value="medium">🟡 Moyenne</Option>
                  <Option value="high">🟠 Élevée</Option>
                  <Option value="urgent">🔴 Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Catégorie">
                <Select allowClear placeholder="Catégorie">
                  <Option value="general">Général</Option>
                  <Option value="follow_up">Relance</Option>
                  <Option value="admin">Administratif</Option>
                  <Option value="prospection">Prospection</Option>
                  <Option value="tech">Technique</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dueDate" label="Échéance (optionnel)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <p style={{ fontSize: 12, color: '#888', marginBottom:0 }}>La note se reporte chaque jour jusqu'à validation ou dépassement de l'échéance.</p>
        </Form>
      </Modal>

      <Drawer
        title={<Space><PushpinOutlined />{selectedEvent?.event.title}</Space>}
        placement={isDesktop ? 'right' : 'bottom'}
        size={isDesktop ? 'large' : 'default'}
        height={isDesktop ? undefined : '80vh'}
        width={isDesktop ? 480 : '100%'}
        onClose={() => setIsDetailsDrawerVisible(false)}
        open={isDetailsDrawerVisible}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => {
              if (!selectedEvent) return;
              setIsDetailsDrawerVisible(false);
              form.setFieldsValue({
                ...selectedEvent.event.extendedProps,
                dateTime: [dayjs(selectedEvent.event.start), dayjs(selectedEvent.event.end)]
              });
              setIsModalVisible(true);
            }}>Modifier</Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => {
              console.log('🗑️ [GoogleAgenda] Clic sur bouton supprimer');
              console.log('🗑️ [GoogleAgenda] selectedEvent:', selectedEvent);
              console.log('🗑️ [GoogleAgenda] selectedEvent.event.id:', selectedEvent?.event.id);
              if (selectedEvent && selectedEvent.event.id) {
                handleDeleteEvent(selectedEvent.event.id);
              } else {
                console.error('🗑️ [GoogleAgenda] ❌ Pas d\'événement sélectionné ou pas d\'ID');
              }
            }}>Supprimer</Button>
          </Space>
        }
      >
        {selectedEvent?.event.extendedProps && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <p><strong>📅 Date :</strong> {dayjs(selectedEvent.event.start).format('dddd D MMMM YYYY')}</p>
            <p><strong>⏰ Heure :</strong> {selectedEvent.event.allDay ? 'Toute la journée' : `${dayjs(selectedEvent.event.start).format('HH:mm')} - ${dayjs(selectedEvent.event.end).format('HH:mm')}`}</p>
            {/* 🎯 Affichage de la catégorie et priorité */}
            {selectedEvent.event.extendedProps.category && !selectedEvent.event.extendedProps.isNote && (
              <p><strong>{getEventIcon(selectedEvent.event.extendedProps.category)} Type :</strong> {selectedEvent.event.extendedProps.category}</p>
            )}
            {selectedEvent.event.extendedProps.isNote && (
              <p><strong>🗒️ Note</strong> {selectedEvent.event.extendedProps.status === 'done' ? ' (terminée)' : ''}</p>
            )}
            {selectedEvent.event.extendedProps.isNote && selectedEvent.event.extendedProps.status !== 'done' && (
              <Space>
                <Button type="primary" icon={<CheckOutlined />} onClick={() => markNoteDone(selectedEvent.event.id)}>Marquer fait</Button>
                <Button onClick={() => {
                  // Planifier: pré-remplit un événement (30 min à partir de maintenant) et marque la note comme faite
                  const start = dayjs();
                  const end = start.add(30, 'minute');
                  form.setFieldsValue({
                    title: selectedEvent.event.extendedProps.title || selectedEvent.event.title.replace(/^.*?\s/, ''),
                    dateTime: [start, end],
                    category: 'rdv',
                    priority: 'medium'
                  });
                  setIsDetailsDrawerVisible(false);
                  setIsModalVisible(true);
                  markNoteDone(selectedEvent.event.id);
                }}>Planifier</Button>
              </Space>
            )}
            {selectedEvent.event.extendedProps.location && <p><strong>📍 Lieu :</strong> {selectedEvent.event.extendedProps.location}</p>}
            <Divider />
            <Paragraph>{selectedEvent.event.extendedProps.description || 'Aucune description.'}</Paragraph>
            <Divider />
            {selectedEvent.event.extendedProps.leadId && <p><strong>💼 Lead lié :</strong> {leads.find(l => l.id === selectedEvent?.event.extendedProps.leadId)?.name || 'Inconnu'}</p>}
            {selectedEvent.event.extendedProps.meetingUrl && <p><a href={selectedEvent.event.extendedProps.meetingUrl} target="_blank" rel="noopener noreferrer">Rejoindre la réunion</a></p>}
            {selectedEvent.event.extendedProps.isNote && selectedEvent.event.extendedProps.dueDate && (
              <p><strong>🗓️ Échéance :</strong> {dayjs(selectedEvent.event.extendedProps.dueDate).format('DD/MM/YYYY')} {dayjs(selectedEvent.event.extendedProps.dueDate).isBefore(dayjs(), 'day') && selectedEvent.event.extendedProps.status !== 'done' && <span style={{color:'#ff4d4f'}}> (En retard)</span>}</p>
            )}
          </Space>
        )}
      </Drawer>
    </Layout>
  );
};

export default GoogleAgendaPage;
