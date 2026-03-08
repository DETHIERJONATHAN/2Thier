import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Tag, Modal, Form, Input, Select, DatePicker, Empty, Typography, Popconfirm, Badge, Alert, Calendar, App, Spin,
  Divider,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, CalendarOutlined,
  CheckCircleOutlined, WarningOutlined, LockOutlined,
  ExclamationCircleOutlined, FileProtectOutlined,
} from '@ant-design/icons';
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

const ChantierEventsTab: React.FC<Props> = ({ chantierId, chantierAddress, chantierLabel }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { isSuperAdmin, userRole } = useAuth();
  const isAdminOrAbove = isSuperAdmin || userRole === 'admin' || userRole === 'comptable';
  const { message, modal } = App.useApp();

  const [events, setEvents] = useState<ChantierEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChantierEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Calendrier existants pour lier un événement
  const [existingCalendarEvents, setExistingCalendarEvents] = useState<CalendarEventInfo[]>([]);
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new');

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
                      {event.status === 'PLANNED' && (
                        <>
                          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleValidate(event.id, event.type)} style={{ minHeight: 36 }}>
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
                  {/* Mini-calendrier visuel des événements existants */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                      📅 Vos événements existants sont marqués en bleu. Cliquez sur un jour pour le sélectionner.
                    </Text>
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                      <style>{`
                        .event-mini-calendar .ant-picker-calendar-header { padding: 4px 8px !important; }
                        .event-mini-calendar .ant-picker-cell { padding: 2px 0 !important; }
                        .event-mini-calendar .ant-picker-cell-inner { height: 28px !important; line-height: 28px !important; width: 28px !important; }
                        .event-mini-calendar .ant-picker-content th { padding: 4px 0 !important; font-size: 11px !important; }
                        .event-mini-calendar .ant-picker-body { padding: 4px 8px !important; }
                      `}</style>
                      <Calendar
                        fullscreen={false}
                        className="event-mini-calendar"
                        onSelect={(date: Dayjs) => {
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
                    {/* Légende */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10, color: '#8c8c8c' }}>
                      <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1890ff', marginRight: 3 }} />Calendrier</span>
                      <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#faad14', marginRight: 3 }} />Ce chantier</span>
                    </div>
                  </div>

                  {/* Heures début/fin */}
                  <Form.Item
                    name="dateRange"
                    label="Date et heures"
                    rules={[{ required: true, message: 'Sélectionnez la date et les heures' }]}
                  >
                    <RangePicker
                      showTime={{ format: 'HH:mm' }}
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
