/**
 * 🏟️ ArenaPanel — Panel swipeable pour le Dashboard Zhiive
 * 
 * Affiche la liste des tournois + actions rapides.
 * S'intègre dans le système de swipe du MainLayoutNew.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Tag, Space, Avatar, Empty, Spin, Divider,
  Typography, Badge, Modal, Form, Input, Select, InputNumber,
  Switch, DatePicker, Row, Col, App,
} from 'antd';
import {
  TrophyOutlined, TeamOutlined, PlusOutlined,
  ThunderboltOutlined, EnvironmentOutlined, CalendarOutlined,
  EditOutlined, UserAddOutlined, ClockCircleOutlined, DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { SF } from './ZhiiveTheme';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Types ──

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  format: string;
  teamType: string;
  playersPerTeam: number;
  maxTeams: number | null;
  maxPlayers: number | null;
  pointsToWin: number;
  location: string | null;
  startsAt: string | null;
  status: string;
  isPublic: boolean;
  creatorId: string;
  Creator: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  Organization: { id: string; name: string; logoUrl: string | null };
  _count: { TeamEntries: number; PlayerEntries: number; Matches: number };
}

interface ArenaPanelProps {
  api: unknown;
  currentUser?: unknown;
}

// ── Constants ──

const SPORTS = ['petanque', 'football', 'basketball', 'volleyball', 'tennis', 'badminton', 'other'];
const FORMATS = ['RANDOM_DRAW', 'ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'SWISS', 'CHAMPIONSHIP'];
const TEAM_TYPES = ['SOLO', 'DOUBLETTE', 'TRIPLETTE', 'QUADRETTE', 'CUSTOM'];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: SF.textSecondary,
  REGISTRATION_OPEN: SF.success,
  REGISTRATION_CLOSED: SF.fire,
  IN_PROGRESS: SF.primary,
  COMPLETED: SF.gold,
  CANCELLED: SF.danger,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT: <EditOutlined />,
  REGISTRATION_OPEN: <UserAddOutlined />,
  REGISTRATION_CLOSED: <ClockCircleOutlined />,
  IN_PROGRESS: <ThunderboltOutlined />,
  COMPLETED: <TrophyOutlined />,
  CANCELLED: <DeleteOutlined />,
};

// ── Panel Component ──

const ArenaPanel: React.FC<ArenaPanelProps> = () => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const { user, isSuperAdmin } = useAuth();
  const { message: antMessage } = App.useApp();
  const navigate = useNavigate();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableApi = useMemo(() => api, []);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm] = Form.useForm();

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stableApi.get<{ success: boolean; data: Tournament[] }>('/api/arena/tournaments');
      if (res.success) setTournaments(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleCreate = useCallback(async (values: Record<string, unknown>) => {
    try {
      const res = await stableApi.post<{ success: boolean }>('/api/arena/tournaments', {
        ...values,
        startsAt: values.startsAt ? (values.startsAt as any).toISOString() : null,
        endsAt: values.endsAt ? (values.endsAt as any).toISOString() : null,
      });
      if (res.success) {
        antMessage.success(t('arena.tournament') + ' ' + t('common.created'));
        setShowCreateModal(false);
        createForm.resetFields();
        fetchTournaments();
      }
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, t, antMessage, createForm, fetchTournaments]);

  const handleRegisterPlayer = useCallback(async (tournamentId: string) => {
    try {
      await stableApi.post(`/api/arena/tournaments/${tournamentId}/players`);
      antMessage.success(t('arena.confirmed'));
      fetchTournaments();
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, t, antMessage, fetchTournaments]);

  // ── Active tournaments (in progress) ──
  const activeTournaments = useMemo(() =>
    tournaments.filter(t => t.status === 'IN_PROGRESS'), [tournaments]);
  
  const openTournaments = useMemo(() =>
    tournaments.filter(t => t.status === 'REGISTRATION_OPEN'), [tournaments]);

  const otherTournaments = useMemo(() =>
    tournaments.filter(t => !['IN_PROGRESS', 'REGISTRATION_OPEN'].includes(t.status)), [tournaments]);

  const renderTournamentCard = (tournament: Tournament, compact?: boolean) => {
    const isOrganizer = tournament.creatorId === user?.id || isSuperAdmin;

    return (
      <Card
        key={tournament.id}
        size="small"
        style={{
          marginBottom: 10,
          borderRadius: SF.radius,
          border: `1px solid ${SF.border}`,
          cursor: 'pointer',
        }}
        bodyStyle={{ padding: compact ? 10 : 14 }}
        onClick={() => {
          navigate(`/arena?id=${tournament.id}`);
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <Tag
                color={STATUS_COLORS[tournament.status]}
                icon={STATUS_ICONS[tournament.status]}
                style={{ borderRadius: 12, fontSize: 11 }}
              >
                {t(`arena.status.${tournament.status}`)}
              </Tag>
              <Tag style={{ borderRadius: 12, fontSize: 11 }}>{t(`arena.sports.${tournament.sport}`)}</Tag>
            </div>

            <Text strong style={{ fontSize: 14, color: SF.text, display: 'block' }}>
              {tournament.name}
            </Text>

            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              <Tag color="purple" style={{ fontSize: 10 }}>{t(`arena.formats.${tournament.format}`)}</Tag>
              <Tag color="blue" style={{ fontSize: 10 }}>{t(`arena.teamTypes.${tournament.teamType}`)}</Tag>
            </div>

            {tournament.location && (
              <div style={{ color: SF.textSecondary, fontSize: 11, marginTop: 4 }}>
                <EnvironmentOutlined /> {tournament.location}
              </div>
            )}
            {tournament.startsAt && (
              <div style={{ color: SF.textSecondary, fontSize: 11 }}>
                <CalendarOutlined /> {dayjs(tournament.startsAt).format('DD/MM/YYYY HH:mm')}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Badge count={tournament._count.TeamEntries} style={{ background: SF.primary }} overflowCount={99}>
              <TeamOutlined style={{ fontSize: 18, color: SF.textSecondary }} />
            </Badge>
            {tournament.status === 'REGISTRATION_OPEN' && !isOrganizer && (
              <Button
                size="small"
                type="primary"
                icon={<UserAddOutlined />}
                onClick={(e) => { e.stopPropagation(); handleRegisterPlayer(tournament.id); }}
                style={{ fontSize: 11 }}
              >
                {t('arena.register')}
              </Button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Avatar size={16} src={tournament.Organization.logoUrl}>
            {tournament.Organization.name[0]}
          </Avatar>
          <Text style={{ fontSize: 10, color: SF.textSecondary }}>{tournament.Organization.name}</Text>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: SF.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrophyOutlined style={{ fontSize: 16, color: '#fff' }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 15, color: SF.text }}>{t('arena.title')}</Title>
            <Text style={{ fontSize: 11, color: SF.textSecondary }}>{t('arena.subtitle')}</Text>
          </div>
        </div>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTournaments} />
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
            style={{ background: SF.gradientPrimary, border: 'none' }}
          >
            {t('arena.createTournament')}
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : tournaments.length === 0 ? (
        <Empty
          image={<TrophyOutlined style={{ fontSize: 48, color: SF.textSecondary }} />}
          description={t('arena.noTournaments')}
          style={{ marginTop: 40 }}
        >
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setShowCreateModal(true)}
          >
            {t('arena.createTournament')}
          </Button>
        </Empty>
      ) : (
        <>
          {/* En cours */}
          {activeTournaments.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ThunderboltOutlined style={{ color: SF.primary }} />
                <Text strong style={{ color: SF.primary, fontSize: 13 }}>{t('arena.status.IN_PROGRESS')}</Text>
                <Badge count={activeTournaments.length} style={{ background: SF.primary }} />
              </div>
              {activeTournaments.map(t => renderTournamentCard(t))}
            </>
          )}

          {/* Inscriptions ouvertes */}
          {openTournaments.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 12 }}>
                <UserAddOutlined style={{ color: SF.success }} />
                <Text strong style={{ color: SF.success, fontSize: 13 }}>{t('arena.status.REGISTRATION_OPEN')}</Text>
                <Badge count={openTournaments.length} style={{ background: SF.success }} />
              </div>
              {openTournaments.map(t => renderTournamentCard(t))}
            </>
          )}

          {/* Autres */}
          {otherTournaments.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0 8px', fontSize: 12 }}>{t('arena.tournaments')}</Divider>
              {otherTournaments.map(t => renderTournamentCard(t, true))}
            </>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        title={<Space><TrophyOutlined style={{ color: SF.primary }} />{t('arena.createTournament')}</Space>}
        footer={null}
        width={520}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            sport: 'petanque',
            format: 'RANDOM_DRAW',
            teamType: 'DOUBLETTE',
            playersPerTeam: 2,
            pointsToWin: 13,
            nbRounds: 5,
            allowMixedTeams: true,
            withCourts: true,
            isPublic: true,
          }}
        >
          <Form.Item name="name" label={t('arena.tournament')} rules={[{ required: true }]}>
            <Input placeholder={t('arena.tournament')} />
          </Form.Item>

          <Form.Item name="description" label={t('common.description')}>
            <TextArea rows={2} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="sport" label={t('arena.sport')}>
                <Select>
                  {SPORTS.map(s => <Select.Option key={s} value={s}>{t(`arena.sports.${s}`)}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="format" label={t('arena.format')}>
                <Select>
                  {FORMATS.map(f => <Select.Option key={f} value={f}>{t(`arena.formats.${f}`)}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="teamType" label={t('arena.teamType')}>
                <Select onChange={(val) => {
                  const sizes: Record<string, number> = { SOLO: 1, DOUBLETTE: 2, TRIPLETTE: 3, QUADRETTE: 4 };
                  if (sizes[val]) createForm.setFieldsValue({ playersPerTeam: sizes[val] });
                }}>
                  {TEAM_TYPES.map(tt => <Select.Option key={tt} value={tt}>{t(`arena.teamTypes.${tt}`)}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="pointsToWin" label={t('arena.pointsToWin')}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxTeams" label={t('arena.maxTeams')}>
                <InputNumber min={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nbRounds" label={t('arena.rounds')}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label={t('arena.location')}>
            <Input prefix={<EnvironmentOutlined />} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startsAt" label={t('common.startDate')}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endsAt" label={t('common.endDate')}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="allowMixedTeams" valuePropName="checked">
                <Switch checkedChildren={t('arena.mixedTeams')} unCheckedChildren={t('arena.mixedTeams')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isPublic" valuePropName="checked">
                <Switch checkedChildren={t('arena.public')} unCheckedChildren={t('arena.private')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ background: SF.gradientPrimary, border: 'none' }}>
              {t('arena.createTournament')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ArenaPanel;
