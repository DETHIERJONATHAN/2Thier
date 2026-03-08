import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Tag, Modal, Form, Input, Select, DatePicker, message, Empty, Typography, Space, Popconfirm, Badge, Alert, Calendar, TimePicker,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, CalendarOutlined,
  CheckCircleOutlined, WarningOutlined, LockOutlined,
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
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  CalendarEvent?: CalendarEventInfo | null;
  ValidatedBy?: { id: string; firstName: string; lastName: string } | null;
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

  const [events, setEvents] = useState<ChantierEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChantierEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Calendrier existants pour lier un événement
  const [existingCalendarEvents, setExistingCalendarEvents] = useState<CalendarEventInfo[]>([]);
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new');

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
  }, [api, chantierId, editingEvent, form, fetchEvents, linkMode, chantierAddress, chantierLabel]);

  const handleValidate = useCallback((eventId: string) => {
    let subAmount = '';
    Modal.confirm({
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
  }, [api, fetchEvents]);

  const handleReportProblem = useCallback((eventId: string) => {
    let problemText = '';
    Modal.confirm({
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
  }, [api, fetchEvents]);

  const handleLockSubcontract = useCallback(async (eventId: string) => {
    try {
      await api.put(`/api/chantier-workflow/events/${eventId}/lock-subcontract`);
      message.success('Montant sous-traitance verrouillé');
      fetchEvents();
    } catch {
      message.error('Erreur verrouillage');
    }
  }, [api, fetchEvents]);

  const handleDelete = useCallback(async (eventId: string) => {
    try {
      await api.delete(`/api/chantier-workflow/events/${eventId}`);
      message.success('Événement supprimé');
      fetchEvents();
    } catch {
      message.error('Erreur suppression');
    }
  }, [api, fetchEvents]);

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
          <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Chargement...</Text></div>
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
                          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleValidate(event.id)}>
                            Valider
                          </Button>
                          <Button size="small" danger icon={<WarningOutlined />} onClick={() => handleReportProblem(event.id)}>
                            Problème
                          </Button>
                        </>
                      )}
                      {isAdminOrAbove && event.subcontractAmount != null && !event.subcontractLocked && (
                        <Popconfirm title="Verrouiller le montant de sous-traitance ?" onConfirm={() => handleLockSubcontract(event.id)}>
                          <Button size="small" icon={<LockOutlined />}>Verrouiller</Button>
                        </Popconfirm>
                      )}
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(event)} />
                      {isAdminOrAbove && (
                        <Popconfirm title="Supprimer cet événement ?" onConfirm={() => handleDelete(event.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
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
    </div>
  );
};

export default ChantierEventsTab;
