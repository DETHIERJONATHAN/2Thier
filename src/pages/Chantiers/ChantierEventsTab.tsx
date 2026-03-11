import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Tag, Modal, Form, Input, Select, DatePicker, Empty, Typography, Popconfirm, Badge, Alert, Calendar, App, Spin,
  Divider, Segmented,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, CalendarOutlined,
  CheckCircleOutlined, WarningOutlined, LockOutlined,
  ExclamationCircleOutlined, FileProtectOutlined, SearchOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import dayjs, { Dayjs } from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface CalendarEventInfo {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
}

interface ChantierEvent {
  id: string;
  chantierId: string;
  calendarEventId?: string | null;
  type: string;
  status: string;
  problemNote?: string | null;
  validatedAt?: string | null;
  validatedById?: string | null;
  subcontractAmount?: number | null;
  subcontractLocked: boolean;
  reviewStatus?: string | null;
  reviewData?: any;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  CalendarEvent?: CalendarEventInfo | null;
  ValidatedBy?: { id: string; firstName: string; lastName: string } | null;
  TechnicianFieldReviews?: TechFieldReview[];
}

interface ReviewField {
  nodeId: string;
  label: string;
  fieldType?: string;
  unit?: string;
  originalValue: string | null;
  fieldLabel: string;
  options?: any;
}

interface TechFieldReview {
  id: string;
  nodeId: string;
  fieldLabel: string;
  originalValue: string | null;
  reviewedValue: string | null;
  isModified: boolean;
  modificationNote: string | null;
  reviewType: string;
  ReviewedBy?: { id: string; firstName: string; lastName: string };
  reviewedAt: string;
}

interface Props {
  chantierId: string;
  chantierAddress?: string;
  chantierLabel?: string;
  leadId?: string;
  submissionId?: string;
}

const EVENT_TYPES = [
  { value: 'VISITE_TECHNIQUE', label: '🔍 Visite technique', color: '#1890ff' },
  { value: 'CHANTIER', label: '🏗️ Chantier', color: '#faad14' },
  { value: 'RECEPTION', label: '✅ Réception', color: '#52c41a' },
  { value: 'CUSTOM', label: '📋 Autre', color: '#722ed1' },
];

const EVENT_STATUSES: Record<string, { label: string; color: string; badgeStatus: string }> = {
  PLANNED: { label: 'Planifié', color: 'processing', badgeStatus: 'processing' },
  COMPLETED: { label: 'Terminé', color: 'success', badgeStatus: 'success' },
  CANCELLED: { label: 'Annulé', color: 'default', badgeStatus: 'default' },
  PROBLEM: { label: 'Problème', color: 'error', badgeStatus: 'error' },
};

const ChantierEventsTab: React.FC<Props> = ({ chantierId, chantierAddress, chantierLabel, leadId, submissionId }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { isSuperAdmin, userRole } = useAuth();
  const isAdminOrAbove = isSuperAdmin || userRole === 'admin' || userRole === 'comptable';
  const { message, modal } = App.useApp();
  const navigate = useNavigate();

  const [events, setEvents] = useState<ChantierEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChantierEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Calendrier existants pour lier un événement
  const [existingCalendarEvents, setExistingCalendarEvents] = useState<CalendarEventInfo[]>([]);
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new');
  const [agendaView, setAgendaView] = useState<'month' | 'day' | 'week'>('month');
  const [agendaDate, setAgendaDate] = useState<Dayjs>(dayjs());

  // Revue technique
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  const [reviewFields, setReviewFields] = useState<ReviewField[]>([]);
  const [reviewChantierAmount, setReviewChantierAmount] = useState<number | null>(null);
  const [reviewEdits, setReviewEdits] = useState<Record<string, { value: string; note: string; modified: boolean }>>({});
  const [reviewSubAmount, setReviewSubAmount] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [_existingReviews, setExistingReviews] = useState<TechFieldReview[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/chantier-workflow/chantiers/${chantierId}/events`);
      setEvents(res.data || []);
    } catch {
      console.error('Erreur chargement événements');
    } finally {
      setLoading(false);
    }
  }, [api, chantierId]);

  // Charger les événements calendrier existants pour le select "lier un événement"
  const fetchCalendarEvents = useCallback(async () => {
    try {
      const res = await api.get('/api/calendar/events');
      const calEvents = (res.events || res.data || res || []) as CalendarEventInfo[];
      setExistingCalendarEvents(Array.isArray(calEvents) ? calEvents : []);
    } catch {
      // pas bloquant
      setExistingCalendarEvents([]);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenModal = useCallback((event?: ChantierEvent) => {
    if (event) {
      setEditingEvent(event);
      setLinkMode(event.calendarEventId ? 'existing' : 'new');
      form.setFieldsValue({
        type: event.type,
        status: event.status,
        problemNote: event.problemNote,
        subcontractAmount: event.subcontractAmount,
        notes: event.notes,
        calendarEventId: event.calendarEventId,
      });
    } else {
      setEditingEvent(null);
      setLinkMode('new');
      form.resetFields();
    }
    setModalVisible(true);
    fetchCalendarEvents();
  }, [form, fetchCalendarEvents]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();

      let calendarEventId = values.calendarEventId || null;

      // Si mode "new" et on crée un événement → créer d'abord un CalendarEvent via l'API calendrier existante
      if (!editingEvent && linkMode === 'new' && values.dateRange) {
        const [start, end] = values.dateRange;
        const typeLabel = EVENT_TYPES.find(t => t.value === values.type)?.label || values.type;
        const calTitle = `${typeLabel} — ${chantierLabel || 'Chantier'}`;

        try {
          const calRes = await api.post('/api/calendar/events', {
            title: calTitle,
            description: values.notes || `Événement lié au chantier`,
            start: start.toISOString(),
            end: end.toISOString(),
            location: chantierAddress || '',
            category: 'rendez-vous',
            priority: 'normal',
            linkedChantierId: chantierId,
          });
          calendarEventId = calRes.id || calRes.data?.id || null;
        } catch (calErr) {
          console.warn('Erreur création CalendarEvent (non bloquant):', calErr);
          // On continue quand même — l'événement chantier sera créé sans lien calendrier
        }
      }

      const payload: Record<string, any> = {
        type: values.type,
        status: values.status,
        problemNote: values.problemNote,
        notes: values.notes,
        ...(calendarEventId ? { calendarEventId } : {}),
      };

      // Sous-traitance uniquement en édition (pas en création)
      if (editingEvent && values.subcontractAmount !== undefined) {
        payload.subcontractAmount = values.subcontractAmount ? Number(values.subcontractAmount) : null;
      }

      if (editingEvent) {
        await api.put(`/api/chantier-workflow/events/${editingEvent.id}`, payload);
        message.success('Événement mis à jour');
      } else {
        await api.post(`/api/chantier-workflow/chantiers/${chantierId}/events`, payload);
        message.success('Événement créé' + (calendarEventId ? ' et ajouté au calendrier' : ''));
      }
      setModalVisible(false);
      fetchEvents();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }, [api, chantierId, editingEvent, form, fetchEvents, linkMode, chantierAddress, chantierLabel, message]);

  // === REVUE TECHNIQUE ===
  const openReviewModal = useCallback(async (eventId: string) => {
    setReviewEventId(eventId);
    setReviewModalVisible(true);
    setReviewLoading(true);
    setReviewEdits({});
    setReviewSubAmount('');
    setExistingReviews([]);
    try {
      const res = await api.get(`/api/chantier-workflow/events/${eventId}/review-fields`);
      const data = res.data || res;
      setReviewFields(data.fields || []);
      setReviewChantierAmount(data.chantierAmount || null);
      setExistingReviews(data.reviews || []);
      // Pré-remplir les edits avec les valeurs originales
      const edits: Record<string, { value: string; note: string; modified: boolean }> = {};
      for (const f of (data.fields || [])) {
        const existingReview = (data.reviews || []).find((r: TechFieldReview) => r.nodeId === f.nodeId);
        edits[f.nodeId] = {
          value: existingReview ? (existingReview.reviewedValue || '') : (f.originalValue || ''),
          note: existingReview?.modificationNote || '',
          modified: existingReview?.isModified || false,
        };
      }
      setReviewEdits(edits);
    } catch {
      message.error('Erreur chargement des champs à vérifier');
      setReviewModalVisible(false);
    } finally {
      setReviewLoading(false);
    }
  }, [api, message]);

  const handleReviewFieldChange = useCallback((nodeId: string, newValue: string) => {
    setReviewEdits(prev => {
      const field = reviewFields.find(f => f.nodeId === nodeId);
      const originalValue = field?.originalValue || '';
      const isModified = newValue !== originalValue;
      return { ...prev, [nodeId]: { ...prev[nodeId], value: newValue, modified: isModified } };
    });
  }, [reviewFields]);

  const handleReviewNoteChange = useCallback((nodeId: string, note: string) => {
    setReviewEdits(prev => ({ ...prev, [nodeId]: { ...prev[nodeId], note } }));
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewEventId) return;

    // Vérifier que tous les champs modifiés ont une note
    const modifiedWithoutNote = Object.entries(reviewEdits).filter(([_, edit]) => edit.modified && !edit.note.trim());
    if (modifiedWithoutNote.length > 0) {
      message.warning('Veuillez expliquer chaque modification (note obligatoire pour les champs modifiés)');
      return;
    }

    setReviewSubmitting(true);
    try {
      const reviews = reviewFields.map(f => ({
        nodeId: f.nodeId,
        reviewedValue: reviewEdits[f.nodeId]?.value || f.originalValue || null,
        isModified: reviewEdits[f.nodeId]?.modified || false,
        modificationNote: reviewEdits[f.nodeId]?.modified ? reviewEdits[f.nodeId]?.note : null,
      }));

      const payload: any = { reviews, reviewType: 'TECHNICAL' };
      if (reviewSubAmount.trim()) {
        payload.subcontractAmount = Number(reviewSubAmount);
      }

      const res = await api.post(`/api/chantier-workflow/events/${reviewEventId}/submit-review`, payload);
      message.success(res.message || 'Revue soumise');
      setReviewModalVisible(false);
      fetchEvents();
    } catch (err: any) {
      message.error(err?.message || 'Erreur soumission revue');
    } finally {
      setReviewSubmitting(false);
    }
  }, [reviewEventId, reviewEdits, reviewFields, reviewSubAmount, api, fetchEvents, message]);

  // Fallback: validation simple pour événements CUSTOM
  const handleValidateSimple = useCallback((eventId: string) => {
    let subAmount = '';
    modal.confirm({
      title: 'Valider cet événement',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      content: (
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Si un sous-traitant a été utilisé, indiquez le montant. Sinon, laissez vide.
          </Text>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Montant sous-traitance (€) — optionnel"
            onChange={e => { subAmount = e.target.value; }}
            prefix="€"
          />
        </div>
      ),
      okText: 'Valider',
      cancelText: 'Annuler',
      async onOk() {
        try {
          const payload: Record<string, any> = { status: 'COMPLETED' };
          if (subAmount.trim()) {
            payload.subcontractAmount = Number(subAmount);
          }
          await api.put(`/api/chantier-workflow/events/${eventId}`, payload);
          message.success('Événement validé');
          fetchEvents();
        } catch {
          message.error('Erreur validation');
        }
      },
    });
  }, [api, fetchEvents, modal, message]);

  const handleValidate = useCallback((eventId: string, eventType: string) => {
    // Pour les événements avec revue technique (visite technique, chantier, réception)
    if (['VISITE_TECHNIQUE', 'CHANTIER', 'RECEPTION'].includes(eventType)) {
      openReviewModal(eventId);
    } else {
      handleValidateSimple(eventId);
    }
  }, [openReviewModal, handleValidateSimple]);

  const handleReportProblem = useCallback((eventId: string) => {
    let problemText = '';
    modal.confirm({
      title: 'Signaler un problème',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <Input.TextArea
          rows={4}
          placeholder="Décrivez le problème rencontré..."
          onChange={e => { problemText = e.target.value; }}
        />
      ),
      okText: 'Signaler',
      okButtonProps: { danger: true },
      cancelText: 'Annuler',
      async onOk() {
        if (!problemText.trim()) {
          message.warning('Veuillez décrire le problème');
          throw new Error('empty'); // empêche la fermeture
        }
        try {
          await api.put(`/api/chantier-workflow/events/${eventId}`, { status: 'PROBLEM', problemNote: problemText.trim() });
          message.warning('Problème signalé — commercial et admin notifiés');
          fetchEvents();
        } catch (err: any) {
          if (err?.message === 'empty') throw err;
          message.error('Erreur signalement');
        }
      },
    });
  }, [api, fetchEvents, modal, message]);

  const handleLockSubcontract = useCallback(async (eventId: string) => {
    try {
      await api.put(`/api/chantier-workflow/events/${eventId}/lock-subcontract`);
      message.success('Montant sous-traitance verrouillé');
      fetchEvents();
    } catch {
      message.error('Erreur verrouillage');
    }
  }, [api, fetchEvents, message]);

  const handleDelete = useCallback(async (eventId: string) => {
    try {
      await api.delete(`/api/chantier-workflow/events/${eventId}`);
      message.success('Événement supprimé');
      fetchEvents();
    } catch {
      message.error('Erreur suppression');
    }
  }, [api, fetchEvents, message]);

  return (
    <div style={{ padding: '16px 0' }}>
      <Card
        size="small"
        title={<span><CalendarOutlined /> Événements du chantier</span>}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Nouvel événement
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="Chargement..." /></div>
        ) : events.length === 0 ? (
          <Empty description="Aucun événement planifié" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map(event => {
              const typeInfo = EVENT_TYPES.find(t => t.value === event.type);
              const statusInfo = EVENT_STATUSES[event.status];

              return (
                <Card key={event.id} size="small" style={{
                  borderLeft: `3px solid ${typeInfo?.color || '#d9d9d9'}`,
                  background: event.status === 'PROBLEM' ? '#fff2f0' : undefined,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* En-tête : type + statut */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Tag color={typeInfo?.color}>{typeInfo?.label || event.type}</Tag>
                      <Badge status={statusInfo?.badgeStatus as any || 'default'} text={statusInfo?.label || event.status} />
                    </div>

                    {/* Infos calendrier */}
                    {event.CalendarEvent && (
                      <div>
                        <Text strong style={{ wordBreak: 'break-word' }}>{event.CalendarEvent.title}</Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            📅 {dayjs(event.CalendarEvent.startDate).format('DD/MM/YYYY HH:mm')}
                            {event.CalendarEvent.endDate && ` — ${dayjs(event.CalendarEvent.endDate).format('HH:mm')}`}
                          </Text>
                          {event.CalendarEvent.location && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-word' }}>
                                📍 {event.CalendarEvent.location}
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {event.notes && <div><Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-word' }}>{event.notes}</Text></div>}

                    {/* Problème */}
                    {event.status === 'PROBLEM' && event.problemNote && (
                      <Alert type="error" message={event.problemNote} style={{ marginTop: 0 }} showIcon />
                    )}

                    {/* Sous-traitance */}
                    {event.subcontractAmount != null && (
                      <div>
                        <Text type="secondary">Sous-traitance: </Text>
                        <Text strong>{event.subcontractAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text>
                        {event.subcontractLocked && <Tag color="red" style={{ marginLeft: 4 }}><LockOutlined /> Verrouillé</Tag>}
                      </div>
                    )}

                    {/* Revue technique */}
                    {event.reviewStatus && (
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: event.reviewStatus === 'CONFIRMED' ? '#f6ffed' : '#fff7e6',
                        border: `1px solid ${event.reviewStatus === 'CONFIRMED' ? '#b7eb8f' : '#ffd591'}`,
                      }}>
                        {event.reviewStatus === 'CONFIRMED' ? (
                          <Text style={{ color: '#52c41a', fontSize: 12 }}>✅ Revue technique : toutes les données confirmées</Text>
                        ) : (
                          <Text style={{ color: '#fa8c16', fontSize: 12 }}>
                            ⚠️ Revue technique : {(event.reviewData as any)?.modifiedFields || '?'} modification(s) détectée(s)
                          </Text>
                        )}
                      </div>
                    )}

                    {/* Validation */}
                    {event.validatedAt && event.ValidatedBy && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, wordBreak: 'break-word' }}>
                          ✓ Validé par {event.ValidatedBy.firstName} {event.ValidatedBy.lastName} le {dayjs(event.validatedAt).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </div>
                    )}

                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Créé le {dayjs(event.createdAt).format('DD/MM/YYYY')}
                    </Text>

                    {/* Actions — toujours en dessous sur mobile */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                      {event.status === 'PLANNED' && ['VISITE_TECHNIQUE', 'CHANTIER', 'RECEPTION'].includes(event.type) && leadId && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<SearchOutlined />}
                          onClick={() => {
                            const url = `/tbl/${leadId}${submissionId ? `?devisId=${submissionId}&mode=review` : '?mode=review'}&eventId=${event.id}`;
                            navigate(url);
                          }}
                          style={{ minHeight: 36, background: '#1890ff', fontWeight: 600 }}
                        >
                          Analyser
                        </Button>
                      )}
                      {event.status === 'PLANNED' && !['VISITE_TECHNIQUE', 'CHANTIER', 'RECEPTION'].includes(event.type) && (
                        <>
                          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleValidateSimple(event.id)} style={{ minHeight: 36 }}>
                            Valider
                          </Button>
                          <Button size="small" danger icon={<WarningOutlined />} onClick={() => handleReportProblem(event.id)} style={{ minHeight: 36 }}>
                            Problème
                          </Button>
                        </>
                      )}
                      {isAdminOrAbove && event.subcontractAmount != null && !event.subcontractLocked && (
                        <Popconfirm title="Verrouiller le montant de sous-traitance ?" onConfirm={() => handleLockSubcontract(event.id)}>
                          <Button size="small" icon={<LockOutlined />} style={{ minHeight: 36 }}>Verrouiller</Button>
                        </Popconfirm>
                      )}
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(event)} style={{ minHeight: 36 }} />
                      {isAdminOrAbove && (
                        <Popconfirm title="Supprimer cet événement ?" onConfirm={() => handleDelete(event.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} style={{ minHeight: 36 }} />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        title={editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText={editingEvent ? 'Modifier' : 'Créer'}
        confirmLoading={saving}
        width="95vw"
        style={{ maxWidth: 520, top: 20 }}
        styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type d'événement" rules={[{ required: true }]} initialValue="CUSTOM">
            <Select options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))} />
          </Form.Item>

          {/* Mode de liaison au calendrier : nouveau ou existant */}
          {!editingEvent && (
            <>
              <Form.Item label="Planification">
                <Select
                  value={linkMode}
                  onChange={(v) => setLinkMode(v)}
                  style={{ marginBottom: 8 }}
                  options={[
                    { value: 'new', label: '📅 Créer un nouvel événement calendrier' },
                    { value: 'existing', label: '🔗 Lier à un événement calendrier existant' },
                  ]}
                />
              </Form.Item>

              {linkMode === 'new' && (
                <>
                  {/* Vue agenda avec onglets Mois / Jour / Semaine */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Segmented
                        size="small"
                        value={agendaView}
                        onChange={(v) => setAgendaView(v as 'month' | 'day' | 'week')}
                        options={[
                          { label: 'Mois', value: 'month' },
                          { label: 'Jour', value: 'day' },
                          { label: 'Semaine', value: 'week' },
                        ]}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Button size="small" icon={<LeftOutlined />} onClick={() => {
                          setAgendaDate(prev => agendaView === 'month' ? prev.subtract(1, 'month') : agendaView === 'week' ? prev.subtract(1, 'week') : prev.subtract(1, 'day'));
                        }} />
                        <Button size="small" onClick={() => setAgendaDate(dayjs())} style={{ fontSize: 11, padding: '0 6px' }}>
                          Aujourd'hui
                        </Button>
                        <Button size="small" icon={<RightOutlined />} onClick={() => {
                          setAgendaDate(prev => agendaView === 'month' ? prev.add(1, 'month') : agendaView === 'week' ? prev.add(1, 'week') : prev.add(1, 'day'));
                        }} />
                      </div>
                    </div>

                    {/* Titre de la période */}
                    <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#333' }}>
                      {agendaView === 'month' && agendaDate.format('MMMM YYYY')}
                      {agendaView === 'day' && agendaDate.format('dddd D MMMM YYYY')}
                      {agendaView === 'week' && `${agendaDate.startOf('week').format('D MMM')} — ${agendaDate.endOf('week').format('D MMM YYYY')}`}
                    </div>

                    {/* VUE MOIS */}
                    {agendaView === 'month' && (
                      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                        <style>{`
                          .event-mini-calendar .ant-picker-calendar-header { display: none !important; }
                          .event-mini-calendar .ant-picker-cell { padding: 2px 0 !important; }
                          .event-mini-calendar .ant-picker-cell-inner { height: 28px !important; line-height: 28px !important; width: 28px !important; }
                          .event-mini-calendar .ant-picker-content th { padding: 4px 0 !important; font-size: 11px !important; }
                          .event-mini-calendar .ant-picker-body { padding: 4px 8px !important; }
                        `}</style>
                        <Calendar
                          fullscreen={false}
                          className="event-mini-calendar"
                          value={agendaDate}
                          onSelect={(date: Dayjs) => {
                            setAgendaDate(date);
                            setAgendaView('day');
                            const current = form.getFieldValue('dateRange');
                            const startTime = current?.[0] ? dayjs(current[0]).format('HH:mm') : '09:00';
                            const endTime = current?.[1] ? dayjs(current[1]).format('HH:mm') : '10:00';
                            const [sh, sm] = startTime.split(':').map(Number);
                            const [eh, em] = endTime.split(':').map(Number);
                            form.setFieldsValue({
                              dateRange: [
                                date.hour(sh).minute(sm).second(0),
                                date.hour(eh).minute(em).second(0),
                              ],
                            });
                          }}
                          cellRender={(current: Dayjs) => {
                            const dateStr = current.format('YYYY-MM-DD');
                            const hasEvent = existingCalendarEvents.some(
                              ce => dayjs(ce.startDate).format('YYYY-MM-DD') === dateStr
                            );
                            const hasChantierEvent = events.some(
                              e => e.CalendarEvent && dayjs(e.CalendarEvent.startDate).format('YYYY-MM-DD') === dateStr
                            );
                            if (hasChantierEvent) {
                              return <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#faad14' }} />;
                            }
                            if (hasEvent) {
                              return <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#1890ff' }} />;
                            }
                            return null;
                          }}
                        />
                      </div>
                    )}

                    {/* VUE JOUR — grille horaire */}
                    {agendaView === 'day' && (() => {
                      const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h
                      const dayStr = agendaDate.format('YYYY-MM-DD');
                      const dayEvents = existingCalendarEvents.filter(
                        ce => dayjs(ce.startDate).format('YYYY-MM-DD') === dayStr
                      );
                      const dayChantierEvents = events.filter(
                        e => e.CalendarEvent && dayjs(e.CalendarEvent.startDate).format('YYYY-MM-DD') === dayStr
                      );
                      return (
                        <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, maxHeight: 320, overflowY: 'auto' }}>
                          {HOURS.map(hour => {
                            const eventsThisHour = dayEvents.filter(ce => {
                              const h = dayjs(ce.startDate).hour();
                              return h === hour;
                            });
                            const chantierThisHour = dayChantierEvents.filter(e => {
                              const h = dayjs(e.CalendarEvent!.startDate).hour();
                              return h === hour;
                            });
                            const hasAny = eventsThisHour.length > 0 || chantierThisHour.length > 0;
                            return (
                              <div
                                key={hour}
                                onClick={() => {
                                  const date = agendaDate.hour(hour).minute(0).second(0);
                                  form.setFieldsValue({
                                    dateRange: [date, date.add(1, 'hour')],
                                  });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'stretch',
                                  borderBottom: '1px solid #f5f5f5',
                                  cursor: 'pointer',
                                  background: hasAny ? '#fafafa' : 'white',
                                  minHeight: 36,
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => { if (!hasAny) e.currentTarget.style.background = '#e6f7ff'; }}
                                onMouseLeave={(e) => { if (!hasAny) e.currentTarget.style.background = 'white'; }}
                              >
                                <div style={{ width: 44, flexShrink: 0, padding: '6px 4px', textAlign: 'right', fontSize: 11, color: '#8c8c8c', borderRight: '1px solid #f0f0f0' }}>
                                  {String(hour).padStart(2, '0')}:00
                                </div>
                                <div style={{ flex: 1, padding: '3px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {chantierThisHour.map(e => (
                                    <div key={e.id} style={{
                                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                      background: '#fff7e6', border: '1px solid #ffd591', color: '#d48806',
                                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                      🏗️ {e.CalendarEvent?.title || 'Chantier'}
                                      <span style={{ marginLeft: 4, opacity: 0.7 }}>
                                        {dayjs(e.CalendarEvent!.startDate).format('HH:mm')}-{dayjs(e.CalendarEvent!.endDate).format('HH:mm')}
                                      </span>
                                    </div>
                                  ))}
                                  {eventsThisHour.map(ce => (
                                    <div key={ce.id} style={{
                                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                      background: '#e6f7ff', border: '1px solid #91d5ff', color: '#0050b3',
                                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                      📅 {ce.title}
                                      <span style={{ marginLeft: 4, opacity: 0.7 }}>
                                        {dayjs(ce.startDate).format('HH:mm')}-{dayjs(ce.endDate).format('HH:mm')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* VUE SEMAINE — 7 colonnes avec heures */}
                    {agendaView === 'week' && (() => {
                      const startOfWeek = agendaDate.startOf('week');
                      const DAYS = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
                      const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
                      return (
                        <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflowX: 'auto' }}>
                          {/* En-têtes jours */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                            <div style={{ width: 36, flexShrink: 0 }} />
                            {DAYS.map(d => {
                              const isToday = d.isSame(dayjs(), 'day');
                              return (
                                <div
                                  key={d.format('YYYY-MM-DD')}
                                  onClick={() => { setAgendaDate(d); setAgendaView('day'); }}
                                  style={{
                                    flex: 1, textAlign: 'center', padding: '4px 2px', fontSize: 10, cursor: 'pointer',
                                    fontWeight: isToday ? 700 : 400,
                                    color: isToday ? '#1890ff' : d.day() === 0 ? '#ff4d4f' : '#333',
                                    background: isToday ? '#e6f7ff' : 'transparent',
                                    borderLeft: '1px solid #f0f0f0',
                                  }}
                                >
                                  <div>{d.format('dd')}</div>
                                  <div style={{ fontSize: 12 }}>{d.format('D')}</div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Grille horaire */}
                          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                            {HOURS.map(hour => (
                              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', minHeight: 28 }}>
                                <div style={{ width: 36, flexShrink: 0, fontSize: 9, color: '#8c8c8c', textAlign: 'right', padding: '2px 3px 0 0', borderRight: '1px solid #f0f0f0' }}>
                                  {String(hour).padStart(2, '0')}h
                                </div>
                                {DAYS.map(d => {
                                  const dayStr = d.format('YYYY-MM-DD');
                                  const evts = existingCalendarEvents.filter(
                                    ce => dayjs(ce.startDate).format('YYYY-MM-DD') === dayStr && dayjs(ce.startDate).hour() === hour
                                  );
                                  const chEvts = events.filter(
                                    e => e.CalendarEvent && dayjs(e.CalendarEvent.startDate).format('YYYY-MM-DD') === dayStr && dayjs(e.CalendarEvent.startDate).hour() === hour
                                  );
                                  const hasAny = evts.length > 0 || chEvts.length > 0;
                                  return (
                                    <div
                                      key={dayStr}
                                      onClick={() => {
                                        const date = d.hour(hour).minute(0).second(0);
                                        form.setFieldsValue({ dateRange: [date, date.add(1, 'hour')] });
                                        setAgendaDate(d);
                                      }}
                                      style={{
                                        flex: 1, borderLeft: '1px solid #f0f0f0', padding: '1px 2px', cursor: 'pointer',
                                        background: hasAny ? (chEvts.length > 0 ? '#fff7e6' : '#e6f7ff') : 'white',
                                        transition: 'background 0.15s',
                                      }}
                                      onMouseEnter={(e) => { if (!hasAny) e.currentTarget.style.background = '#f0f5ff'; }}
                                      onMouseLeave={(e) => { if (!hasAny) e.currentTarget.style.background = 'white'; }}
                                      title={[
                                        ...chEvts.map(e => `🏗️ ${e.CalendarEvent?.title || ''}`),
                                        ...evts.map(ce => `📅 ${ce.title}`),
                                      ].join('\n') || `${d.format('DD/MM')} ${hour}h — Cliquer pour réserver`}
                                    >
                                      {chEvts.length > 0 && <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#faad14', marginBottom: 1 }} />}
                                      {evts.length > 0 && <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#1890ff' }} />}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Légende */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10, color: '#8c8c8c' }}>
                      <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1890ff', marginRight: 3 }} />Calendrier</span>
                      <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#faad14', marginRight: 3 }} />Ce chantier</span>
                      <span style={{ marginLeft: 'auto' }}>Cliquez pour sélectionner un créneau</span>
                    </div>
                  </div>

                  {/* Heures début/fin */}
                  <Form.Item
                    name="dateRange"
                    label="Date et heures"
                    rules={[{ required: true, message: 'Sélectionnez la date et les heures' }]}
                  >
                    <RangePicker
                      showTime={{ format: 'HH:mm', minuteStep: 15 }}
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder={['Début', 'Fin']}
                    />
                  </Form.Item>
                </>
              )}

              {linkMode === 'existing' && (
                <Form.Item name="calendarEventId" label="Événement calendrier">
                  <Select
                    showSearch
                    allowClear
                    placeholder="Rechercher un événement..."
                    optionFilterProp="label"
                    loading={existingCalendarEvents.length === 0}
                    options={existingCalendarEvents.map(ce => ({
                      value: ce.id,
                      label: `${ce.title} — ${dayjs(ce.startDate).format('DD/MM/YYYY HH:mm')}`,
                    }))}
                  />
                </Form.Item>
              )}
            </>
          )}

          {editingEvent && (
            <Form.Item name="status" label="Statut">
              <Select options={Object.entries(EVENT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
            </Form.Item>
          )}

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Détails de l'événement..." />
          </Form.Item>

          {editingEvent?.status === 'PROBLEM' && (
            <Form.Item name="problemNote" label="Note problème">
              <Input.TextArea rows={2} />
            </Form.Item>
          )}

          {/* Sous-traitance uniquement en mode édition si admin */}
          {editingEvent && isAdminOrAbove && (
            <Form.Item name="subcontractAmount" label="Montant sous-traitance (€)">
              <Input type="number" min={0} placeholder="Montant..." />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal Revue Technique */}
      <Modal
        title={<span><FileProtectOutlined /> Revue technique — Vérification des données du devis</span>}
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        width="95vw"
        style={{ maxWidth: 640, top: 20 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalVisible(false)}>Annuler</Button>,
          <Button
            key="submit"
            type="primary"
            loading={reviewSubmitting}
            onClick={handleSubmitReview}
            icon={<CheckCircleOutlined />}
            disabled={reviewLoading || reviewFields.length === 0}
          >
            Valider la revue
          </Button>,
        ]}
      >
        {reviewLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="Chargement des données du devis..." /></div>
        ) : reviewFields.length === 0 ? (
          <Alert
            type="info"
            showIcon
            message="Aucun champ configuré pour la revue technique"
            description="L'administrateur doit d'abord marquer des champs TBL comme 'Visible technicien' dans le configurateur de formulaires."
            style={{ marginBottom: 16 }}
          />
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message="Vérifiez chaque champ du devis"
              description="Si une donnée ne correspond pas au terrain, modifiez-la et expliquez la raison. L'ancienne valeur sera conservée."
              style={{ marginBottom: 16 }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviewFields.map(field => {
                const edit = reviewEdits[field.nodeId];
                const isModified = edit?.modified || false;

                return (
                  <Card
                    key={field.nodeId}
                    size="small"
                    style={{
                      borderLeft: `3px solid ${isModified ? '#fa8c16' : '#52c41a'}`,
                      background: isModified ? '#fffbe6' : '#f6ffed',
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 13 }}>{field.label}</Text>
                      {field.unit && <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>({field.unit})</Text>}
                    </div>

                    {/* Valeur originale (devis) */}
                    <div style={{ marginBottom: 6 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Valeur devis : </Text>
                      <Text style={{
                        textDecoration: isModified ? 'line-through' : 'none',
                        color: isModified ? '#8c8c8c' : '#262626',
                        fontWeight: isModified ? 'normal' : 'bold',
                      }}>
                        {field.originalValue || '—'}
                      </Text>
                    </div>

                    {/* Champ éditable */}
                    <Input
                      size="small"
                      value={edit?.value || ''}
                      onChange={e => handleReviewFieldChange(field.nodeId, e.target.value)}
                      style={{
                        borderColor: isModified ? '#fa8c16' : '#b7eb8f',
                        background: isModified ? '#fff7e6' : '#fff',
                      }}
                      suffix={isModified ? <ExclamationCircleOutlined style={{ color: '#fa8c16' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    />

                    {/* Note si modifié (obligatoire) */}
                    {isModified && (
                      <div style={{ marginTop: 6 }}>
                        <Text type="danger" style={{ fontSize: 11 }}>⚠️ Raison de la modification (obligatoire) :</Text>
                        <Input.TextArea
                          size="small"
                          rows={2}
                          placeholder="Expliquez pourquoi la valeur a changé..."
                          value={edit?.note || ''}
                          onChange={e => handleReviewNoteChange(field.nodeId, e.target.value)}
                          style={{ borderColor: '#fa8c16', marginTop: 2 }}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Sous-traitance */}
            <Divider style={{ margin: '16px 0 12px' }}>💰 Sous-traitance</Divider>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={reviewSubAmount}
                onChange={e => setReviewSubAmount(e.target.value)}
                placeholder="Montant sous-traitance (€)"
                prefix="€"
                style={{ maxWidth: 300 }}
              />
              {reviewChantierAmount && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Montant devis TTC : <Text strong>{reviewChantierAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €</Text>
                  </Text>
                  {reviewSubAmount && Number(reviewSubAmount) > 0 && (
                    <div>
                      <Text style={{
                        fontSize: 12,
                        color: Number(reviewSubAmount) > reviewChantierAmount * 0.5 ? '#ff4d4f' : Number(reviewSubAmount) > reviewChantierAmount * 0.3 ? '#fa8c16' : '#52c41a',
                        fontWeight: 'bold',
                      }}>
                        {(Number(reviewSubAmount) / reviewChantierAmount * 100).toFixed(1)}% du devis
                        {Number(reviewSubAmount) > reviewChantierAmount * 0.5 && ' ⚠️ Attention: plus de 50% du devis !'}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Résumé */}
            <Divider style={{ margin: '16px 0 8px' }} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Tag color="green">{Object.values(reviewEdits).filter(e => !e.modified).length} confirmé(s)</Tag>
              <Tag color="orange">{Object.values(reviewEdits).filter(e => e.modified).length} modifié(s)</Tag>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ChantierEventsTab;
