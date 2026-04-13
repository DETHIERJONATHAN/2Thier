import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Table, Tag, Space, Select,
  message, Empty, Tooltip, Statistic, Typography, Popconfirm,
  Image, Grid,
} from 'antd';
import {
  ClockCircleOutlined, DeleteOutlined,
  CarOutlined, CoffeeOutlined,
  EnvironmentOutlined, CameraOutlined, MobileOutlined, WarningOutlined,
  LoginOutlined, PauseCircleOutlined, PlayCircleOutlined,
  CarryOutOutlined, StopOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import PointageClockIn from './PointageClockIn';
import { STATUS_LABELS, POINTAGE_STATUS_OPTIONS } from './pointageConstants';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

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
  // Anti-fraud
  clockInLatitude: number | null;
  clockInLongitude: number | null;
  clockInAddress: string | null;
  clockInDistance: number | null;
  clockInPhotoUrl: string | null;
  clockOutLatitude: number | null;
  clockOutLongitude: number | null;
  clockOutAddress: string | null;
  clockOutDistance: number | null;
  clockOutPhotoUrl: string | null;
  deviceInfo: unknown;
  ipAddress: string | null;
  Technician: {
    id: string;
    firstName: string;
    lastName: string;
    color: string;
    type: string;
    billingMode: string | null;
    company?: string;
  };
  Chantier?: { id: string; clientName: string; latitude?: number; longitude?: number; geoFenceRadius?: number } | null;
}

interface ChantierPointageTabProps {
  chantierId: string;
  chantierName?: string;
  chantierLatitude?: number | null;
  chantierLongitude?: number | null;
  geoFenceRadius?: number | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ARRIVEE: { label: 'Arrivée', color: 'green', icon: <LoginOutlined /> },
  DEPART_PAUSE: { label: 'Départ pause', color: 'orange', icon: <PauseCircleOutlined /> },
  RETOUR_PAUSE: { label: 'Reprise pause', color: 'cyan', icon: <PlayCircleOutlined /> },
  DEPART_MIDI: { label: 'Départ midi', color: 'gold', icon: <CoffeeOutlined /> },
  RETOUR_MIDI: { label: 'Reprise midi', color: 'lime', icon: <PlayCircleOutlined /> },
  DEPART_DEPLACEMENT: { label: 'Départ déplac.', color: 'orange', icon: <CarOutlined /> },
  RETOUR_DEPLACEMENT: { label: 'Retour déplac.', color: 'blue', icon: <CarryOutOutlined /> },
  FIN: { label: 'Fin', color: 'red', icon: <StopOutlined /> },
  // Legacy
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

const ChantierPointageTab: React.FC<ChantierPointageTabProps> = ({ chantierId, chantierName, chantierLatitude, chantierLongitude, geoFenceRadius }) => {
  const { t } = useTranslation();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const screens = Grid.useBreakpoint();

  // Quick pointage state
  const [quickTechId, setQuickTechId] = useState('');
  const [quickStatus, setQuickStatus] = useState('ARRIVEE');
  const [settingGeo, setSettingGeo] = useState(false);

  const handleSetChantierGPS = useCallback(() => {
    if (!navigator.geolocation) {
      message.error('Géolocalisation non disponible');
      return;
    }
    setSettingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.put(`/api/chantiers/${chantierId}`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          message.success(`📍 Position du chantier enregistrée (±${Math.round(position.coords.accuracy)}m)`);
          // Force reload of the parent page to pick up new coordinates
          window.location.reload();
        } catch (err: unknown) {
          message.error(err?.message || 'Erreur');
        } finally {
          setSettingGeo(false);
        }
      },
      (_error) => {
        setSettingGeo(false);
        message.error('Impossible d\'obtenir la position GPS. Activez la localisation et réessayez.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [api, chantierId]);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/teams/time-entries?chantierId=${chantierId}`) as unknown;
      setEntries(res.data || []);
    } catch (err) {
      console.error('[Pointage] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [api, chantierId]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/api/teams/technicians?scopeAction=pointage') as unknown;
      // Filtrer: internes + sous-traitants en régie uniquement
      const eligible = (res.data || []).filter((t: Record<string, unknown>) =>
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

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await api.delete(`/api/teams/time-entries/${entryId}`);
      message.success('Pointage supprimé');
      fetchEntries();
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur');
    }
  }, [api, fetchEntries]);

  // Stats
  const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
  const gpsEntries = entries.filter(e => e.clockInLatitude != null).length;

  const columns = [
    {
      title: 'Technicien',
      key: 'tech',
      width: 150,
      render: (_: unknown, r: TimeEntry) => (
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
      width: 90,
      render: (_: unknown, r: TimeEntry) => <span style={{ fontSize: 12 }}>{dayjs(r.date).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Heure',
      key: 'start',
      width: 70,
      render: (_: unknown, r: TimeEntry) => <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{dayjs(r.startTime).format('HH:mm')}</span>,
    },
    {
      title: 'Statut',
      key: 'type',
      width: 130,
      render: (_: unknown, r: TimeEntry) => {
        const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.CHANTIER;
        const sl = STATUS_LABELS[r.type];
        return <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: 10 }}>{sl?.emoji || ''} {cfg.label}</Tag>;
      },
    },
    {
      title: 'Durée',
      key: 'duration',
      width: 70,
      render: (_: unknown, r: TimeEntry) => {
        if (!r.durationMinutes || r.durationMinutes <= 0) return <span style={{ fontSize: 11, color: '#bfbfbf' }}>-</span>;
        return (
          <Text strong style={{ fontSize: 12, color: '#262626' }}>
            {formatDuration(r.durationMinutes)}
          </Text>
        );
      },
    },
    {
      title: '📍',
      key: 'geo',
      width: 55,
      render: (_: unknown, r: TimeEntry) => {
        const hasIn = r.clockInLatitude != null;
        const hasOut = r.clockOutLatitude != null;
        const fenceRadius = r.Chantier?.geoFenceRadius || geoFenceRadius || 500;
        const inOk = r.clockInDistance != null && r.clockInDistance <= fenceRadius;
        const outOk = r.clockOutDistance != null && r.clockOutDistance <= fenceRadius;
        const inFar = r.clockInDistance != null && r.clockInDistance > fenceRadius;
        const outFar = r.clockOutDistance != null && r.clockOutDistance > fenceRadius;

        return (
          <Tooltip title={
            <div style={{ fontSize: 11 }}>
              {hasIn && <div>📍 Entrée: {r.clockInLatitude?.toFixed(5)}, {r.clockInLongitude?.toFixed(5)}</div>}
              {r.clockInDistance != null && <div>↳ Distance: {r.clockInDistance}m {inOk ? '✅' : '⚠️'}</div>}
              {hasOut && <div>📍 Sortie: {r.clockOutLatitude?.toFixed(5)}, {r.clockOutLongitude?.toFixed(5)}</div>}
              {r.clockOutDistance != null && <div>↳ Distance: {r.clockOutDistance}m {outOk ? '✅' : '⚠️'}</div>}
              {r.ipAddress && <div>🌐 IP: {r.ipAddress}</div>}
              {!hasIn && !hasOut && <div>Pas de données GPS</div>}
            </div>
          }>
            <Space size={2}>
              {hasIn && <EnvironmentOutlined style={{ color: inFar ? '#ff4d4f' : inOk ? '#52c41a' : '#8c8c8c', fontSize: 13 }} />}
              {hasOut && <EnvironmentOutlined style={{ color: outFar ? '#ff4d4f' : outOk ? '#52c41a' : '#8c8c8c', fontSize: 13 }} />}
              {!hasIn && !hasOut && <EnvironmentOutlined style={{ color: '#d9d9d9', fontSize: 13 }} />}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '📸',
      key: 'photos',
      width: 55,
      render: (_: unknown, r: TimeEntry) => {
        const hasInPhoto = !!r.clockInPhotoUrl;
        const hasOutPhoto = !!r.clockOutPhotoUrl;
        return (
          <Space size={2}>
            {hasInPhoto && (
              <Tooltip title="Photo d'arrivée">
                <Image
                  src={r.clockInPhotoUrl!}
                  width={30}
                  height={30}
                  style={{ borderRadius: 4, objectFit: 'cover', cursor: 'pointer', border: '1px solid #d9d9d9' }}
                  preview={{ mask: <CameraOutlined style={{ fontSize: 11 }} /> }}
                />
              </Tooltip>
            )}
            {hasOutPhoto && (
              <Tooltip title="Photo de départ">
                <Image
                  src={r.clockOutPhotoUrl!}
                  width={30}
                  height={30}
                  style={{ borderRadius: 4, objectFit: 'cover', cursor: 'pointer', border: '1px solid #ff4d4f' }}
                  preview={{ mask: <CameraOutlined style={{ fontSize: 11 }} /> }}
                />
              </Tooltip>
            )}
            {!hasInPhoto && !hasOutPhoto && <CameraOutlined style={{ color: '#d9d9d9', fontSize: 13 }} />}
          </Space>
        );
      },
    },
    {
      title: '📱',
      key: 'device',
      width: 35,
      render: (_: unknown, r: TimeEntry) => {
        if (!r.deviceInfo) return <MobileOutlined style={{ color: '#d9d9d9', fontSize: 13 }} />;
        const info = typeof r.deviceInfo === 'string' ? JSON.parse(r.deviceInfo) : r.deviceInfo;
        const isAndroid = /Android/i.test(info.userAgent || '');
        const isIOS = /iPhone|iPad/i.test(info.userAgent || '');
        return (
          <Tooltip title={
            <div style={{ fontSize: 10 }}>
              <div>{isAndroid ? '📱 Android' : isIOS ? '📱 iOS' : '💻 Desktop'}</div>
              <div>Écran: {info.screenWidth}×{info.screenHeight}</div>
              {r.ipAddress && <div>IP: {r.ipAddress}</div>}
            </div>
          }>
            <MobileOutlined style={{ color: '#1677ff', fontSize: 13 }} />
          </Tooltip>
        );
      },
    },
    {
      title: 'Note',
      key: 'note',
      ellipsis: true,
      render: (_: unknown, r: TimeEntry) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{r.note || '-'}</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, r: TimeEntry) => (
        <Space size={4}>
          <Popconfirm title="Supprimer ce pointage ?" onConfirm={() => handleDelete(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
            <Button danger size="small" icon={<DeleteOutlined />} style={{ fontSize: 10 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Quick pointage buttons (mobile-first) */}
      <Card size="small" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f6ffed 0%, #e6f7ff 100%)', border: '1px solid #b7eb8f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>📍 Pointage avec géolocalisation</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              GPS + photo + appareil capturés automatiquement
              {chantierLatitude && chantierLongitude && (
                <Tag color="blue" style={{ marginLeft: 6, fontSize: 9 }}>
                  <EnvironmentOutlined /> Géofencing actif ({geoFenceRadius || 500}m)
                </Tag>
              )}
            </Text>
          </div>
          <Space wrap>
            {technicians.length > 0 && (
              <Select
                style={{ minWidth: 140, flex: '1 1 140px', maxWidth: 200 }}
                placeholder="Technicien"
                value={quickTechId || undefined}
                onChange={setQuickTechId}
                size="small"
                showSearch
                optionFilterProp="label"
                options={technicians.map((t: Record<string, unknown>) => ({
                  value: t.id,
                  label: `${t.firstName} ${t.lastName}`.trim(),
                }))}
              />
            )}
            <Select
              style={{ minWidth: 140, flex: '1 1 140px', maxWidth: 200 }}
              value={quickStatus}
              onChange={setQuickStatus}
              size="small"
              options={POINTAGE_STATUS_OPTIONS}
            />
            {quickTechId && (
              <PointageClockIn
                chantierId={chantierId}
                chantierName={chantierName}
                chantierLatitude={chantierLatitude}
                chantierLongitude={chantierLongitude}
                geoFenceRadius={geoFenceRadius}
                api={api}
                onSuccess={fetchEntries}
                technicianId={quickTechId}
                pointageType={quickStatus}
              />
            )}
          </Space>
        </div>
        {/* Geofencing setup — if chantier has no GPS coordinates */}
        {(!chantierLatitude || !chantierLongitude) && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6 }}>
            <Space>
              <WarningOutlined style={{ color: '#fa8c16' }} />
              <Text style={{ fontSize: 12 }}>
                Le chantier n'a pas de coordonnées GPS — le géofencing est désactivé.
              </Text>
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EnvironmentOutlined />}
                loading={settingGeo}
                onClick={handleSetChantierGPS}
              >
                Géolocaliser maintenant
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* Stats résumé */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card size="small" style={{ flex: 1, minWidth: 120 }}>
          <Statistic title="Total heures" value={formatDuration(totalMinutes)} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: 18 }} />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 120 }}>
          <Statistic title="Pointages" value={entries.length} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: 18 }} />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 120 }}>
          <Statistic title="Avec GPS" value={gpsEntries} suffix={`/ ${entries.length}`} prefix={<EnvironmentOutlined />} valueStyle={{ fontSize: 18, color: gpsEntries === entries.length && entries.length > 0 ? '#52c41a' : '#1677ff' }} />
        </Card>
      </div>

      <Card
        title={<span><ClockCircleOutlined /> Pointage des heures</span>}
        size="small"
      >
        {entries.length === 0 ? (
          <Empty description="Aucun pointage enregistré pour ce chantier" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : !screens.md ? (
          /* ── Vue mobile : cartes ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.slice(0, 20).map(r => {
              const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.CHANTIER;
              const sl = STATUS_LABELS[r.type];
              const fenceRadius = r.Chantier?.geoFenceRadius || geoFenceRadius || 500;
              const inOk = r.clockInDistance != null && r.clockInDistance <= fenceRadius;
              const inFar = r.clockInDistance != null && r.clockInDistance > fenceRadius;
              return (
                <div key={r.id} style={{
                  padding: '10px 12px', borderRadius: 8, border: '1px solid #f0f0f0', background: '#fafafa',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: r.Technician.color }} />
                      <Text strong style={{ fontSize: 13 }}>
                        {r.Technician.firstName} {r.Technician.lastName}
                      </Text>
                      {r.Technician.type === 'SUBCONTRACTOR' && <Tag style={{ fontSize: 9, lineHeight: '14px', padding: '0 3px' }} color="default">🏢 ST</Tag>}
                    </div>
                    <Popconfirm title="Supprimer ?" onConfirm={() => handleDelete(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
                      <Button danger size="small" icon={<DeleteOutlined />} style={{ minWidth: 32, minHeight: 32 }} />
                    </Popconfirm>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: 11 }}>{sl?.emoji || ''} {cfg.label}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(r.date).format('DD/MM/YYYY')}</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{dayjs(r.startTime).format('HH:mm')}</Text>
                    {r.durationMinutes && r.durationMinutes > 0 && (
                      <Text strong style={{ fontSize: 12 }}>{formatDuration(r.durationMinutes)}</Text>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    {r.clockInLatitude != null && (
                      <Tag style={{ fontSize: 10, margin: 0 }} color={inFar ? 'red' : inOk ? 'green' : 'default'}>
                        📍 {r.clockInDistance != null ? `${r.clockInDistance}m` : 'GPS'}
                      </Tag>
                    )}
                    {r.clockInPhotoUrl && (
                      <Image src={r.clockInPhotoUrl} width={28} height={28} style={{ borderRadius: 4, objectFit: 'cover', border: '1px solid #d9d9d9' }} preview={{ mask: <CameraOutlined style={{ fontSize: 10 }} /> }} />
                    )}
                    {r.clockOutPhotoUrl && (
                      <Image src={r.clockOutPhotoUrl} width={28} height={28} style={{ borderRadius: 4, objectFit: 'cover', border: '1px solid #ff4d4f' }} preview={{ mask: <CameraOutlined style={{ fontSize: 10 }} /> }} />
                    )}
                    {r.note && <Text type="secondary" style={{ fontSize: 11 }}>{r.note}</Text>}
                  </div>
                </div>
              );
            })}
            {entries.length > 20 && <Text type="secondary" style={{ textAlign: 'center', padding: 8 }}>+{entries.length - 20} pointages...</Text>}
          </div>
        ) : (
          /* ── Vue desktop : table ── */
          <Table
            dataSource={entries}
            columns={columns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 20, showTotal: (t) => `${t} pointage(s)` }}
            style={{ fontSize: 12 }}
            scroll={{ x: 750 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ChantierPointageTab;
