import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Table, Tag, Space, Modal, Select, Input, DatePicker,
  TimePicker, message, Empty, Tooltip, Statistic, Typography, Popconfirm,
} from 'antd';
import {
  PlusOutlined, ClockCircleOutlined, DeleteOutlined,
  CheckCircleOutlined, CarOutlined, CoffeeOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const { Text } = Typography;

interface TimeEntry {
  id: string;
  technicianId: string;
  chantierId: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  breakMinutes: number;
  type: string;
  durationMinutes: number | null;
  note: string | null;
  Technician: {
    id: string;
    firstName: string;
    lastName: string;
    color: string;
    type: string;
    billingMode: string | null;
    company?: string;
  };
  Chantier?: { id: string; clientName: string } | null;
}

interface ChantierPointageTabProps {
  chantierId: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CHANTIER: { label: 'Chantier', color: 'blue', icon: <ClockCircleOutlined /> },
  DEPLACEMENT: { label: 'Déplacement', color: 'orange', icon: <CarOutlined /> },
  PAUSE: { label: 'Pause', color: 'default', icon: <CoffeeOutlined /> },
  REGIE: { label: 'Régie', color: 'purple', icon: <ClockCircleOutlined /> },
};

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}min`;
}

const ChantierPointageTab: React.FC<ChantierPointageTabProps> = ({ chantierId }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [_loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Form state
  const [formTechId, setFormTechId] = useState('');
  const [formDate, setFormDate] = useState(dayjs());
  const [formStartTime, setFormStartTime] = useState<dayjs.Dayjs | null>(null);
  const [formEndTime, setFormEndTime] = useState<dayjs.Dayjs | null>(null);
  const [formBreak, setFormBreak] = useState(0);
  const [formType, setFormType] = useState('CHANTIER');
  const [formNote, setFormNote] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/teams/time-entries?chantierId=${chantierId}`) as any;
      setEntries(res.data || []);
    } catch (err) {
      console.error('[Pointage] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [api, chantierId]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/api/teams/technicians') as any;
      // Filtrer: internes + sous-traitants en régie uniquement
      const eligible = (res.data || []).filter((t: any) =>
        t.type === 'INTERNAL' || (t.type === 'SUBCONTRACTOR' && t.billingMode === 'REGIE')
      );
      setTechnicians(eligible);
    } catch (err) {
      console.error('[Pointage] Erreur fetch technicians:', err);
    }
  }, [api]);

  useEffect(() => {
    fetchEntries();
    fetchTechnicians();
  }, [fetchEntries, fetchTechnicians]);

  const handleCreate = useCallback(async () => {
    if (!formTechId || !formStartTime) {
      message.warning('Technicien et heure de début requis');
      return;
    }

    const dateStr = formDate.format('YYYY-MM-DD');
    const startTime = formDate.hour(formStartTime.hour()).minute(formStartTime.minute()).second(0).toISOString();
    const endTime = formEndTime ? formDate.hour(formEndTime.hour()).minute(formEndTime.minute()).second(0).toISOString() : null;

    try {
      await api.post('/api/teams/time-entries', {
        technicianId: formTechId,
        chantierId,
        date: dateStr,
        startTime,
        endTime,
        breakMinutes: formBreak,
        type: formType,
        note: formNote || null,
      });
      message.success('Pointage enregistré');
      setModalOpen(false);
      resetForm();
      fetchEntries();
    } catch (err: any) {
      message.error(err?.message || 'Erreur');
    }
  }, [api, chantierId, formTechId, formDate, formStartTime, formEndTime, formBreak, formType, formNote, fetchEntries]);

  const handleClockOut = useCallback(async (entryId: string) => {
    try {
      await api.put(`/api/teams/time-entries/${entryId}/clock-out`, {});
      message.success('Sortie pointée');
      fetchEntries();
    } catch (err: any) {
      message.error(err?.message || 'Erreur');
    }
  }, [api, fetchEntries]);

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await api.delete(`/api/teams/time-entries/${entryId}`);
      message.success('Pointage supprimé');
      fetchEntries();
    } catch (err: any) {
      message.error(err?.message || 'Erreur');
    }
  }, [api, fetchEntries]);

  const resetForm = () => {
    setFormTechId('');
    setFormDate(dayjs());
    setFormStartTime(null);
    setFormEndTime(null);
    setFormBreak(0);
    setFormType('CHANTIER');
    setFormNote('');
  };

  // Stats
  const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
  const activeEntries = entries.filter(e => !e.endTime);
  const todayEntries = entries.filter(e => dayjs(e.date).isSame(dayjs(), 'day'));

  const columns = [
    {
      title: 'Technicien',
      key: 'tech',
      width: 160,
      render: (_: any, r: TimeEntry) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: r.Technician.color }} />
          <span style={{ fontSize: 12 }}>
            {r.Technician.firstName} {r.Technician.lastName}
            {r.Technician.type === 'SUBCONTRACTOR' && <Tag style={{ marginLeft: 4, fontSize: 9, lineHeight: '14px', padding: '0 3px' }} color="default">🏢 ST</Tag>}
          </span>
        </div>
      ),
    },
    {
      title: 'Date',
      key: 'date',
      width: 100,
      render: (_: any, r: TimeEntry) => <span style={{ fontSize: 12 }}>{dayjs(r.date).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Arrivée',
      key: 'start',
      width: 70,
      render: (_: any, r: TimeEntry) => <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{dayjs(r.startTime).format('HH:mm')}</span>,
    },
    {
      title: 'Départ',
      key: 'end',
      width: 70,
      render: (_: any, r: TimeEntry) => (
        r.endTime
          ? <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{dayjs(r.endTime).format('HH:mm')}</span>
          : <Tag color="processing" style={{ fontSize: 10 }}>En cours</Tag>
      ),
    },
    {
      title: 'Pause',
      key: 'break',
      width: 60,
      render: (_: any, r: TimeEntry) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{r.breakMinutes > 0 ? `${r.breakMinutes}min` : '-'}</span>,
    },
    {
      title: 'Durée',
      key: 'duration',
      width: 70,
      render: (_: any, r: TimeEntry) => (
        <Text strong style={{ fontSize: 12, color: r.durationMinutes ? '#262626' : '#bfbfbf' }}>
          {formatDuration(r.durationMinutes)}
        </Text>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (_: any, r: TimeEntry) => {
        const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.CHANTIER;
        return <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: 10 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Note',
      key: 'note',
      ellipsis: true,
      render: (_: any, r: TimeEntry) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{r.note || '-'}</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, r: TimeEntry) => (
        <Space size={4}>
          {!r.endTime && (
            <Tooltip title="Pointer la sortie">
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleClockOut(r.id)} style={{ fontSize: 10 }} />
            </Tooltip>
          )}
          <Popconfirm title="Supprimer ce pointage ?" onConfirm={() => handleDelete(r.id)} okText="Oui" cancelText="Non">
            <Button danger size="small" icon={<DeleteOutlined />} style={{ fontSize: 10 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Stats résumé */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="Total heures" value={formatDuration(totalMinutes)} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: 18 }} />
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="Pointages" value={entries.length} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: 18 }} />
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="Aujourd'hui" value={todayEntries.length} prefix={<CalendarOutlined />} valueStyle={{ fontSize: 18 }} />
        </Card>
        {activeEntries.length > 0 && (
          <Card size="small" style={{ flex: 1, borderColor: '#52c41a' }}>
            <Statistic title="En cours" value={activeEntries.length} prefix={<CheckCircleOutlined />} valueStyle={{ fontSize: 18, color: '#52c41a' }} />
          </Card>
        )}
      </div>

      {/* Table + bouton */}
      <Card
        title={<span><ClockCircleOutlined /> Pointage des heures</span>}
        size="small"
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setModalOpen(true)}>
            Nouveau pointage
          </Button>
        }
      >
        {entries.length === 0 ? (
          <Empty description="Aucun pointage enregistré pour ce chantier" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            dataSource={entries}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showTotal: (t) => `${t} pointage(s)` }}
            style={{ fontSize: 12 }}
          />
        )}
      </Card>

      {/* Modal nouveau pointage */}
      <Modal
        open={modalOpen}
        title={<span><ClockCircleOutlined /> Nouveau pointage</span>}
        onCancel={() => { setModalOpen(false); resetForm(); }}
        onOk={handleCreate}
        okText="Enregistrer"
        cancelText="Annuler"
        okButtonProps={{ disabled: !formTechId || !formStartTime }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Technicien</label>
            <Select
              style={{ width: '100%' }}
              placeholder="Sélectionner un technicien..."
              value={formTechId || undefined}
              onChange={v => setFormTechId(v)}
              showSearch
              optionFilterProp="label"
              options={technicians.map((t: any) => ({
                value: t.id,
                label: `${t.firstName || ''} ${t.lastName || ''} ${t.type === 'SUBCONTRACTOR' ? '(ST-Régie)' : ''}`.trim(),
              }))}
            />
            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
              Seuls les internes et sous-traitants en régie sont éligibles
            </Text>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Date</label>
            <DatePicker
              style={{ width: '100%' }}
              value={formDate}
              onChange={v => v && setFormDate(v)}
              format="DD/MM/YYYY"
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Heure d'arrivée</label>
              <TimePicker
                style={{ width: '100%' }}
                value={formStartTime}
                onChange={v => setFormStartTime(v)}
                format="HH:mm"
                minuteStep={5}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Heure de départ</label>
              <TimePicker
                style={{ width: '100%' }}
                value={formEndTime}
                onChange={v => setFormEndTime(v)}
                format="HH:mm"
                minuteStep={5}
                placeholder="Laisser vide si en cours"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Pause (minutes)</label>
              <Input type="number" value={formBreak} onChange={e => setFormBreak(parseInt(e.target.value) || 0)} min={0} step={5} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Type</label>
              <Select
                style={{ width: '100%' }}
                value={formType}
                onChange={v => setFormType(v)}
                options={[
                  { value: 'CHANTIER', label: '🔧 Chantier' },
                  { value: 'DEPLACEMENT', label: '🚗 Déplacement' },
                  { value: 'PAUSE', label: '☕ Pause' },
                  { value: 'REGIE', label: '⏱️ Régie' },
                ]}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Note (optionnel)</label>
            <Input.TextArea value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Note optionnelle..." rows={2} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChantierPointageTab;
