/**
 * 🏟️ ArenaPage — Tournois & Championnats multi-sports
 * 
 * Vue principale Arena:
 * - Liste des tournois (filtrable par sport, statut)
 * - Création de tournoi (modale)
 * - Vue détail avec onglets (Matchs, Classement, Équipes, Terrains)
 * - Scores en temps réel via Socket.IO
 */

import { PageHelmet } from '../components/common/PageHelmet';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Tag, Modal, Form, Input, Select, InputNumber,
  Switch, DatePicker, Tabs, Table, Space, Avatar, Badge, Empty,
  Tooltip, Typography, Row, Col, Divider, App, Spin, Progress,
  Drawer, List, Popconfirm,
} from 'antd';
import {
  TrophyOutlined, TeamOutlined, PlusOutlined, PlayCircleOutlined,
  ReloadOutlined, EnvironmentOutlined, CalendarOutlined,
  ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, EditOutlined, EyeOutlined, UserAddOutlined,
  CrownOutlined, ArrowUpOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { SF } from '../components/zhiive/ZhiiveTheme';
import { getSportConfig, TEAM_TYPE_SIZES } from '../services/arena/sportConfigs';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

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
  nbRounds: number;
  allowMixedTeams: boolean;
  withCourts: boolean;
  courtsCount: number | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  rules: string | null;
  isPublic: boolean;
  status: string;
  creatorId: string;
  organizationId: string;
  Creator: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  Organization: { id: string; name: string; logoUrl: string | null };
  _count: { TeamEntries: number; PlayerEntries: number; Matches: number };
  Rounds?: Round[];
  TeamEntries?: TeamEntry[];
  PlayerEntries?: PlayerEntry[];
  Courts?: Court[];
  Standings?: Standing[];
}

interface Round {
  id: string;
  roundNumber: number;
  name: string | null;
  Matches: Match[];
}

interface Match {
  id: string;
  matchNumber: number;
  status: string;
  score1: number | null;
  score2: number | null;
  team1Id: string | null;
  team2Id: string | null;
  Team1: TeamEntry | null;
  Team2: TeamEntry | null;
  Winner: { id: string; name: string } | null;
  Court: { id: string; name: string } | null;
  Round?: { id: string; roundNumber: number; name: string | null };
}

interface TeamEntry {
  id: string;
  name: string;
  status: string;
  Members?: TeamMember[];
}

interface TeamMember {
  id: string;
  isCaptain: boolean;
  User: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

interface PlayerEntry {
  id: string;
  status: string;
  User: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

interface Court {
  id: string;
  name: string;
  location: string | null;
  isAvailable: boolean;
  Matches?: { id: string; matchNumber: number; status: string }[];
}

interface Standing {
  id: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
  TeamEntry: { id: string; name: string };
}

// ── Constantes ──

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

// ── Composant Principal ──

const ArenaPage: React.FC = () => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const { user, isSuperAdmin } = useAuth();
  const { message: antMessage } = App.useApp();

  // Stabiliser l'instance API
  const stableApi = useMemo(() => api, []);

  // ── State ──
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCourtsModal, setShowCourtsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const [filterSport, setFilterSport] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }[]>([]);
  const [myRegistration, setMyRegistration] = useState<{ isRegistered: boolean; asPlayer: any; asTeamMember: any; isCaptain: boolean; team: any } | null>(null);
  const [scoreForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [courtsForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // ── Socket.IO realtime ──
  useEffect(() => {
    if (!selectedTournament) return;
    let socket: any;
    try {
      const io = (window as any).__ZHIIVE_SOCKET_IO__;
      if (io) {
        socket = io;
        socket.emit('arena:join', { tournamentId: selectedTournament.id });

        socket.on('arena:score-updated', () => fetchTournamentDetail(selectedTournament.id));
        socket.on('arena:tournament-updated', () => fetchTournamentDetail(selectedTournament.id));
        socket.on('arena:standings-updated', () => fetchTournamentDetail(selectedTournament.id));
        socket.on('arena:round-generated', () => fetchTournamentDetail(selectedTournament.id));
        socket.on('arena:teams-generated', () => fetchTournamentDetail(selectedTournament.id));
        socket.on('arena:tournament-status', () => fetchTournamentDetail(selectedTournament.id));
      }
    } catch (_) { /* socket optional */ }

    return () => {
      if (socket && selectedTournament) {
        socket.emit('arena:leave', { tournamentId: selectedTournament.id });
        socket.off('arena:score-updated');
        socket.off('arena:tournament-updated');
        socket.off('arena:standings-updated');
        socket.off('arena:round-generated');
        socket.off('arena:teams-generated');
        socket.off('arena:tournament-status');
      }
    };
  }, [selectedTournament?.id]);

  // ── Data fetching ──

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSport) params.set('sport', filterSport);
      if (filterStatus) params.set('status', filterStatus);
      const res = await stableApi.get<{ success: boolean; data: Tournament[] }>(
        `/api/arena/tournaments?${params.toString()}`
      );
      if (res.success) setTournaments(res.data);
    } catch (err: any) {
      antMessage.error(t('messages.loadingError'));
    } finally {
      setLoading(false);
    }
  }, [stableApi, filterSport, filterStatus, t, antMessage]);

  const fetchTournamentDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await stableApi.get<{ success: boolean; data: Tournament }>(
        `/api/arena/tournaments/${id}`
      );
      if (res.success) setSelectedTournament(res.data);
    } catch (err: any) {
      antMessage.error(t('messages.loadingError'));
    } finally {
      setDetailLoading(false);
    }
  }, [stableApi, t, antMessage]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // ── Helpers ──

  const isOrganizer = useCallback((tournament: Tournament) => {
    return tournament.creatorId === user?.id || isSuperAdmin;
  }, [user?.id, isSuperAdmin]);

  // ── Actions ──

  const handleCreateTournament = useCallback(async (values: Record<string, unknown>) => {
    try {
      const res = await stableApi.post<{ success: boolean; data: Tournament }>(
        '/api/arena/tournaments', {
          ...values,
          startsAt: values.startsAt ? (values.startsAt as any).toISOString() : null,
          endsAt: values.endsAt ? (values.endsAt as any).toISOString() : null,
        }
      );
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

  const handleStatusChange = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/start`);
      fetchTournamentDetail(selectedTournament.id);
      fetchTournaments();
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, fetchTournaments, t, antMessage]);

  const handleGenerateRound = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/generate-round`);
      antMessage.success(t('arena.round') + ' ' + t('common.created'));
      fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const handleGenerateTeams = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/generate-teams`);
      antMessage.success(t('arena.teams') + ' ' + t('common.created'));
      fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const handleSubmitScore = useCallback(async (values: { score1: number; score2: number }) => {
    if (!selectedMatch) return;
    try {
      await stableApi.put(`/api/arena/matches/${selectedMatch.id}/score`, values);
      antMessage.success(t('arena.score') + ' ' + t('common.saved'));
      setShowScoreModal(false);
      scoreForm.resetFields();
      if (selectedTournament) fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedMatch, selectedTournament, fetchTournamentDetail, scoreForm, t, antMessage]);

  // ── Charger mon inscription + joueurs disponibles quand on ouvre un tournoi ──
  const fetchMyRegistration = useCallback(async (tournamentId: string) => {
    try {
      const res = await stableApi.get<any>(`/api/arena/tournaments/${tournamentId}/my-registration`);
      setMyRegistration(res.data);
    } catch {
      setMyRegistration(null);
    }
  }, [stableApi]);

  const fetchAvailablePlayers = useCallback(async (tournamentId: string, query = '') => {
    try {
      const res = await stableApi.get<any>(`/api/arena/tournaments/${tournamentId}/available-players?q=${encodeURIComponent(query)}`);
      setAvailablePlayers(res.data || []);
    } catch {
      setAvailablePlayers([]);
    }
  }, [stableApi]);

  // Quand on sélectionne un tournoi, charger l'inscription
  useEffect(() => {
    if (selectedTournament) {
      fetchMyRegistration(selectedTournament.id);
    } else {
      setMyRegistration(null);
    }
  }, [selectedTournament, fetchMyRegistration]);

  const handleRegisterPlayer = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/players`);
      antMessage.success(t('arena.confirmed'));
      fetchTournamentDetail(selectedTournament.id);
      fetchMyRegistration(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, fetchMyRegistration, t, antMessage]);

  const handleRegisterTeam = useCallback(async (values: { name: string; memberIds?: string[] }) => {
    if (!selectedTournament) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/teams`, values);
      antMessage.success(t('arena.confirmed'));
      setShowRegisterModal(false);
      registerForm.resetFields();
      fetchTournamentDetail(selectedTournament.id);
      fetchMyRegistration(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, fetchMyRegistration, registerForm, t, antMessage]);

  const handleAddCourts = useCallback(async (values: { courtsCount: number; prefix: string }) => {
    if (!selectedTournament) return;
    const courts = Array.from({ length: values.courtsCount }, (_, i) => ({
      name: `${values.prefix || t('arena.court')} ${i + 1}`,
    }));
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/courts`, { courts });
      antMessage.success(t('arena.courts') + ' ' + t('common.created'));
      setShowCourtsModal(false);
      courtsForm.resetFields();
      fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, courtsForm, t, antMessage]);

  // ── Court CRUD individuel ──

  const handleAddSingleCourt = useCallback(async () => {
    if (!selectedTournament) return;
    const courts = selectedTournament.Courts || [];
    const nextNum = courts.length + 1;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/courts/add`, {
        name: `Terrain ${nextNum}`,
        teamType: 'DOUBLETTE',
      });
      fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const handleUpdateCourt = useCallback(async (courtId: string, data: { name?: string; teamType?: string }) => {
    try {
      await stableApi.patch(`/api/arena/courts/${courtId}`, data);
      if (selectedTournament) fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const handleDeleteCourt = useCallback(async (courtId: string) => {
    try {
      await stableApi.delete(`/api/arena/courts/${courtId}`);
      if (selectedTournament) fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const handleDeleteTournament = useCallback(async (id: string) => {
    try {
      await stableApi.delete(`/api/arena/tournaments/${id}`);
      antMessage.success(t('common.deleted'));
      setSelectedTournament(null);
      fetchTournaments();
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, fetchTournaments, t, antMessage]);

  // ═══════════════════════════════════════════════
  // RENDER — Liste des tournois
  // ═══════════════════════════════════════════════

  const renderTournamentsList = () => (
    <div>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          allowClear
          placeholder={t('arena.allSports')}
          value={filterSport}
          onChange={setFilterSport}
          style={{ minWidth: 160 }}
        >
          {SPORTS.map(s => (
            <Select.Option key={s} value={s}>{t(`arena.sports.${s}`)}</Select.Option>
          ))}
        </Select>
        <Select
          allowClear
          placeholder={t('arena.allStatuses')}
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ minWidth: 180 }}
        >
          {['DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED'].map(s => (
            <Select.Option key={s} value={s}>
              <Space>{STATUS_ICONS[s]}{t(`arena.status.${s}`)}</Space>
            </Select.Option>
          ))}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchTournaments}>{t('common.refresh')}</Button>
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
          style={{ background: SF.gradientPrimary, border: 'none' }}
        >
          {t('arena.createTournament')}
        </Button>
      </div>

      {/* Grille de tournois */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : tournaments.length === 0 ? (
        <Empty
          image={<TrophyOutlined style={{ fontSize: 64, color: SF.textSecondary }} />}
          description={t('arena.noTournaments')}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            {t('arena.createTournament')}
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {tournaments.map(tournament => (
            <Col key={tournament.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                hoverable
                onClick={() => fetchTournamentDetail(tournament.id)}
                style={{
                  borderRadius: SF.radius,
                  border: `1px solid ${SF.border}`,
                  overflow: 'hidden',
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Tag
                    color={STATUS_COLORS[tournament.status]}
                    icon={STATUS_ICONS[tournament.status]}
                    style={{ borderRadius: 12 }}
                  >
                    {t(`arena.status.${tournament.status}`)}
                  </Tag>
                  <Tag style={{ borderRadius: 12 }}>{t(`arena.sports.${tournament.sport}`)}</Tag>
                </div>

                <Title level={5} style={{ margin: '8px 0 4px', color: SF.text }} ellipsis>
                  {tournament.name}
                </Title>

                <Space size={4} style={{ marginBottom: 8 }}>
                  <Tag color="purple">{t(`arena.formats.${tournament.format}`)}</Tag>
                  <Tag color="blue">{t(`arena.teamTypes.${tournament.teamType}`)}</Tag>
                </Space>

                {tournament.location && (
                  <div style={{ color: SF.textSecondary, fontSize: 12, marginBottom: 4 }}>
                    <EnvironmentOutlined /> {tournament.location}
                  </div>
                )}
                {tournament.startsAt && (
                  <div style={{ color: SF.textSecondary, fontSize: 12, marginBottom: 8 }}>
                    <CalendarOutlined /> {dayjs(tournament.startsAt).format('DD/MM/YYYY HH:mm')}
                  </div>
                )}

                <Divider style={{ margin: '8px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SF.textSecondary }}>
                  <span><TeamOutlined /> {tournament._count.TeamEntries} {t('arena.teams').toLowerCase()}</span>
                  <span><ThunderboltOutlined /> {tournament._count.Matches} {t('arena.matches').toLowerCase()}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Avatar size={20} src={tournament.Organization.logoUrl}>
                    {tournament.Organization.name[0]}
                  </Avatar>
                  <Text style={{ fontSize: 11, color: SF.textSecondary }}>{tournament.Organization.name}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════
  // RENDER — Vue détail tournoi (Drawer)
  // ═══════════════════════════════════════════════

  const renderTournamentDetail = () => {
    if (!selectedTournament) return null;
    const t_ = selectedTournament;
    const isOrg = isOrganizer(t_);

    return (
      <Drawer
        open={!!selectedTournament}
        onClose={() => setSelectedTournament(null)}
        width={Math.min(window.innerWidth * 0.9, 900)}
        title={
          <Space>
            <TrophyOutlined style={{ color: SF.primary }} />
            <span>{t_.name}</span>
            <Tag color={STATUS_COLORS[t_.status]}>{t(`arena.status.${t_.status}`)}</Tag>
          </Space>
        }
        extra={
          <Space>
            {isOrg && t_.status === 'DRAFT' && (
              <Popconfirm title={t('actions.confirmDelete')} onConfirm={() => handleDeleteTournament(t_.id)}>
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Spin spinning={detailLoading}>
          {/* Info header */}
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Tag color="purple">{t(`arena.formats.${t_.format}`)}</Tag>
              <Tag color="blue">{t(`arena.teamTypes.${t_.teamType}`)}</Tag>
              <Tag>{t(`arena.sports.${t_.sport}`)}</Tag>
              {t_.allowMixedTeams && <Tag color="green">{t('arena.mixedTeams')}</Tag>}
              {t_.isPublic ? <Tag color="cyan">{t('arena.public')}</Tag> : <Tag>{t('arena.private')}</Tag>}
              <Tag>{t('arena.pointsToWin')}: {t_.pointsToWin}</Tag>
            </Space>
            {t_.description && (
              <Paragraph style={{ marginTop: 8, color: SF.textSecondary }}>{t_.description}</Paragraph>
            )}
            {t_.location && (
              <div style={{ color: SF.textSecondary }}><EnvironmentOutlined /> {t_.location}</div>
            )}
          </div>

          {/* Actions organisateur */}
          {isOrg && (
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: `${SF.primary}08`,
                borderColor: `${SF.primary}30`,
                borderRadius: SF.radius,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Text strong style={{ marginRight: 8 }}>{t('arena.organizerOnly')}</Text>
                {(t_.status === 'DRAFT' || t_.status === 'REGISTRATION_OPEN' || t_.status === 'REGISTRATION_CLOSED') && (
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStatusChange}>
                    {t_.status === 'DRAFT' ? t('arena.openRegistrations') : t('arena.startTournament')}
                  </Button>
                )}
                {t_.status === 'IN_PROGRESS' && (
                  <>
                    <Button icon={<ThunderboltOutlined />} onClick={handleGenerateRound}>
                      {t('arena.generateRound')}
                    </Button>
                    {t_.format === 'RANDOM_DRAW' && (
                      <Button icon={<TeamOutlined />} onClick={handleGenerateTeams}>
                        {t('arena.generateTeams')}
                      </Button>
                    )}
                  </>
                )}
                <Button icon={<EnvironmentOutlined />} onClick={() => setShowCourtsModal(true)}>
                  {t('arena.addCourts')}
                </Button>
              </div>
            </Card>
          )}

          {/* Inscription joueur/équipe — adaptatif selon format */}
          {(t_.status === 'REGISTRATION_OPEN' || t_.status === 'DRAFT') && !isOrg && (
            <Card size="small" style={{ marginBottom: 16, borderRadius: SF.radius }}>
              {myRegistration?.isRegistered ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag color="green" icon={<CheckCircleOutlined />}>{t('arena.alreadyRegistered')}</Tag>
                  {myRegistration.isCaptain && myRegistration.team && (
                    <Button size="small" icon={<EditOutlined />} onClick={() => {
                      setShowRegisterModal(true);
                      fetchAvailablePlayers(t_.id);
                    }}>
                      {t('arena.manageTeam')}
                    </Button>
                  )}
                </div>
              ) : (
                <Space>
                  {t_.format === 'RANDOM_DRAW' ? (
                    /* Mêlée : inscription solo uniquement */
                    <Button type="primary" icon={<UserAddOutlined />} onClick={handleRegisterPlayer}>
                      {t('arena.registerMelee')}
                    </Button>
                  ) : t_.teamType === 'SOLO' ? (
                    /* Solo : inscription individuelle */
                    <Button type="primary" icon={<UserAddOutlined />} onClick={handleRegisterPlayer}>
                      {t('arena.registerPlayer')}
                    </Button>
                  ) : (
                    /* Équipes formées (DOUBLETTE, TRIPLETTE, etc.) : le capitaine inscrit son équipe */
                    <Button type="primary" icon={<TeamOutlined />} onClick={() => {
                      setShowRegisterModal(true);
                      fetchAvailablePlayers(t_.id);
                    }}>
                      {t('arena.registerTeam')}
                    </Button>
                  )}
                </Space>
              )}
            </Card>
          )}

          {/* Onglets */}
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab={<span><ThunderboltOutlined /> {t('arena.matches')}</span>} key="matches">
              {renderMatchesTab()}
            </TabPane>
            <TabPane tab={<span><TrophyOutlined /> {t('arena.standings')}</span>} key="standings">
              {renderStandingsTab()}
            </TabPane>
            <TabPane tab={<span><TeamOutlined /> {t('arena.players')} ({(selectedTournament?.PlayerEntries?.length || 0) + (selectedTournament?.TeamEntries?.filter(te => te.status === 'CONFIRMED').length || 0)})</span>} key="teams">
              {renderTeamsTab()}
            </TabPane>
            <TabPane tab={<span><EnvironmentOutlined /> {t('arena.courts')}</span>} key="courts">
              {renderCourtsTab()}
            </TabPane>
          </Tabs>
        </Spin>
      </Drawer>
    );
  };

  // ═══════════════════════════════════════════════
  // Onglet Matchs
  // ═══════════════════════════════════════════════

  const renderMatchesTab = () => {
    const rounds = selectedTournament?.Rounds || [];
    if (rounds.length === 0) return <Empty description={t('arena.noMatches')} />;

    return (
      <div>
        {rounds.map(round => (
          <Card
            key={round.id}
            title={`${t('arena.round')} ${round.roundNumber}${round.name ? ` — ${round.name}` : ''}`}
            size="small"
            style={{ marginBottom: 12, borderRadius: SF.radius }}
          >
            {round.Matches.map(match => (
              <div
                key={match.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: `1px solid ${SF.border}`,
                  borderRadius: 8,
                  marginBottom: 4,
                  background: match.status === 'COMPLETED' ? `${SF.success}08` : undefined,
                }}
              >
                {/* Équipe 1 */}
                <div style={{ flex: 1, textAlign: 'right', fontWeight: match.winnerId === match.team1Id ? 700 : 400 }}>
                  {selectedTournament?.format === 'RANDOM_DRAW' ? getTeamPlayerNames(match.Team1) : (match.Team1?.name || t('arena.bye'))}
                </div>

                {/* Score */}
                <div style={{
                  flex: '0 0 120px',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                  {match.status === 'COMPLETED' ? (
                    <Space>
                      <span style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: (match.score1 ?? 0) > (match.score2 ?? 0) ? SF.success : SF.text,
                      }}>
                        {match.score1}
                      </span>
                      <span style={{ color: SF.textSecondary }}>-</span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: (match.score2 ?? 0) > (match.score1 ?? 0) ? SF.success : SF.text,
                      }}>
                        {match.score2}
                      </span>
                    </Space>
                  ) : (
                    <Button
                      size="small"
                      type="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMatch(match);
                        setShowScoreModal(true);
                      }}
                    >
                      {t('arena.submitScore')}
                    </Button>
                  )}
                </div>

                {/* Équipe 2 */}
                <div style={{ flex: 1, textAlign: 'left', fontWeight: match.winnerId === match.team2Id ? 700 : 400 }}>
                  {selectedTournament?.format === 'RANDOM_DRAW' ? getTeamPlayerNames(match.Team2) : (match.Team2?.name || t('arena.bye'))}
                </div>

                {/* Terrain */}
                {match.Court && (
                  <Tooltip title={match.Court.name}>
                    <Tag style={{ marginLeft: 8 }}><EnvironmentOutlined /> {match.Court.name}</Tag>
                  </Tooltip>
                )}
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // Onglet Classement
  // ═══════════════════════════════════════════════

  const renderStandingsTab = () => {
    const standings = selectedTournament?.Standings || [];
    if (standings.length === 0) return <Empty description={t('arena.noMatches')} />;

    const columns = [
      {
        title: t('arena.rank'),
        dataIndex: 'rank',
        key: 'rank',
        width: 60,
        render: (rank: number) => (
          <span style={{ fontWeight: 700, color: rank <= 3 ? SF.gold : SF.text }}>
            {rank <= 3 ? <CrownOutlined style={{ marginRight: 4, color: ['#FFD700', '#C0C0C0', '#CD7F32'][rank - 1] }} /> : null}
            {rank}
          </span>
        ),
      },
      {
        title: t('arena.team'),
        dataIndex: ['TeamEntry', 'name'],
        key: 'team',
        render: (name: string) => <Text strong>{name}</Text>,
      },
      { title: t('arena.played'), dataIndex: 'played', key: 'played', width: 50, align: 'center' as const },
      { title: t('arena.wins'), dataIndex: 'wins', key: 'wins', width: 50, align: 'center' as const,
        render: (v: number) => <span style={{ color: SF.success, fontWeight: 600 }}>{v}</span> },
      { title: t('arena.draws'), dataIndex: 'draws', key: 'draws', width: 50, align: 'center' as const },
      { title: t('arena.losses'), dataIndex: 'losses', key: 'losses', width: 50, align: 'center' as const,
        render: (v: number) => <span style={{ color: v > 0 ? SF.danger : SF.text }}>{v}</span> },
      { title: t('arena.pointsFor'), dataIndex: 'pointsFor', key: 'pf', width: 55, align: 'center' as const },
      { title: t('arena.pointsAgainst'), dataIndex: 'pointsAgainst', key: 'pa', width: 55, align: 'center' as const },
      { title: t('arena.diff'), key: 'diff', width: 55, align: 'center' as const,
        render: (_: unknown, record: Standing) => {
          const diff = record.pointsFor - record.pointsAgainst;
          return <span style={{ color: diff > 0 ? SF.success : diff < 0 ? SF.danger : SF.text, fontWeight: 600 }}>
            {diff > 0 ? '+' : ''}{diff}
          </span>;
        }
      },
      {
        title: t('arena.points'),
        dataIndex: 'points',
        key: 'points',
        width: 60,
        align: 'center' as const,
        render: (pts: number) => <span style={{ fontWeight: 700, fontSize: 16, color: SF.primary }}>{pts}</span>,
      },
    ];

    return (
      <Table
        dataSource={standings}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ borderRadius: SF.radius }}
      />
    );
  };

  // ═══════════════════════════════════════════════
  // Onglet Équipes
  // ═══════════════════════════════════════════════

  // Helper: noms des joueurs d'une équipe (pour affichage mêlée)
  const getTeamPlayerNames = (team: { name: string; Members?: { id: string; isCaptain: boolean; User: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }[] } | null): string => {
    if (!team?.Members || team.Members.length === 0) return team?.name || '?';
    return team.Members.map(m => `${m.User.firstName} ${m.User.lastName?.[0] || ''}.`).join(' · ');
  };

  const renderTeamsTab = () => {
    const teams = selectedTournament?.TeamEntries || [];
    const players = selectedTournament?.PlayerEntries || [];
    const isMelee = selectedTournament?.format === 'RANDOM_DRAW';

    if (teams.length === 0 && players.length === 0) return <Empty description={t('arena.noTeams')} />;

    // ── Mode mêlée : liste numérotée de joueurs individuels ──
    if (isMelee && players.length > 0) {
      return (
        <div>
          <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: SF.radius, background: `${SF.primary}08`, border: `1px solid ${SF.primary}20`, fontSize: 12 }}>
            <TeamOutlined /> {players.filter(p => p.status === 'CONFIRMED').length} {t('arena.players')} {t('arena.confirmed').toLowerCase()}
          </div>
          <List
            dataSource={players}
            renderItem={(p, idx) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Space size={8}>
                      <span style={{ color: SF.textSecondary, minWidth: 24, textAlign: 'right', display: 'inline-block' }}>{idx + 1}.</span>
                      <Avatar src={p.User.avatarUrl}>{p.User.firstName?.[0]}</Avatar>
                    </Space>
                  }
                  title={`${p.User.firstName} ${p.User.lastName}`}
                />
                <Tag color={p.status === 'CONFIRMED' ? 'green' : 'orange'}>
                  {t(`arena.${p.status.toLowerCase()}`)}
                </Tag>
              </List.Item>
            )}
          />
        </div>
      );
    }

    // ── Mode équipe formée : liste des équipes avec membres ──
    return (
      <div>
        {teams.length > 0 && (
          <List
            dataSource={teams}
            renderItem={team => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ background: team.status === 'CONFIRMED' ? SF.success : SF.textSecondary }}>
                      <TeamOutlined />
                    </Avatar>
                  }
                  title={
                    <Space>
                      {team.name}
                      <Tag color={team.status === 'CONFIRMED' ? 'green' : team.status === 'REJECTED' ? 'red' : 'orange'}>
                        {t(`arena.${team.status.toLowerCase()}`)}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space wrap>
                      {team.Members?.map(m => (
                        <Space key={m.id} size={4}>
                          <Avatar size={20} src={m.User.avatarUrl}>{m.User.firstName?.[0]}</Avatar>
                          <span>{m.User.firstName} {m.User.lastName}</span>
                          {m.isCaptain && <CrownOutlined style={{ color: SF.gold }} />}
                        </Space>
                      ))}
                    </Space>
                  }
                />
                {isOrganizer(selectedTournament!) && team.status === 'PENDING' && (
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={async () => {
                        await stableApi.put(`/api/arena/entries/${team.id}/status`, { status: 'CONFIRMED', type: 'team' });
                        fetchTournamentDetail(selectedTournament!.id);
                      }}
                    >
                      {t('arena.confirmed')}
                    </Button>
                  </Space>
                )}
              </List.Item>
            )}
          />
        )}

        {players.length > 0 && (
          <>
            <Divider>{t('arena.players')}</Divider>
            <List
              dataSource={players}
              renderItem={(p, idx) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Space size={8}>
                        <span style={{ color: SF.textSecondary, minWidth: 24, textAlign: 'right', display: 'inline-block' }}>{idx + 1}.</span>
                        <Avatar src={p.User.avatarUrl}>{p.User.firstName?.[0]}</Avatar>
                      </Space>
                    }
                    title={`${p.User.firstName} ${p.User.lastName}`}
                  />
                  <Tag color={p.status === 'CONFIRMED' ? 'green' : 'orange'}>
                    {t(`arena.${p.status.toLowerCase()}`)}
                  </Tag>
                </List.Item>
              )}
            />
          </>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // Onglet Terrains
  // ═══════════════════════════════════════════════

  const renderCourtsTab = () => {
    const courts = selectedTournament?.Courts || [];
    const activeCount = courts.filter(c => c.teamType !== 'IDLE').length;
    const doublCount = courts.filter(c => c.teamType === 'DOUBLETTE').length;
    const triplCount = courts.filter(c => c.teamType === 'TRIPLETTE').length;

    return (
      <div>
        {/* Résumé */}
        {courts.length > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: SF.radius, background: `${SF.primary}08`, border: `1px solid ${SF.primary}20`, fontSize: 12 }}>
            <TeamOutlined /> {courts.length} terrains · {activeCount} actifs
            {doublCount > 0 && ` · ${doublCount} doublette(s)`}
            {triplCount > 0 && ` · ${triplCount} triplette(s)`}
          </div>
        )}

        {courts.length === 0 && (
          <Empty description={t('arena.noCourts')} style={{ padding: 16 }} />
        )}

        <Row gutter={[12, 12]}>
          {courts.map(court => {
            const isIdle = court.teamType === 'IDLE';
            return (
              <Col key={court.id} xs={12} sm={8} md={6}>
                <Card
                  size="small"
                  style={{
                    borderRadius: SF.radius,
                    borderColor: isIdle ? SF.border : (court.isAvailable ? SF.success : SF.fire),
                    opacity: isIdle ? 0.55 : 1,
                    position: 'relative',
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong><EnvironmentOutlined /> {court.name}</Text>
                    <Select
                      size="small"
                      value={court.teamType}
                      onChange={(val) => handleUpdateCourt(court.id, { teamType: val })}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="DOUBLETTE">{t('arena.teamTypes.DOUBLETTE')} (2v2)</Select.Option>
                      <Select.Option value="TRIPLETTE">{t('arena.teamTypes.TRIPLETTE')} (3v3)</Select.Option>
                      <Select.Option value="IDLE">{t('common.inactive')}</Select.Option>
                    </Select>
                    {!isIdle && (
                      <Badge
                        status={court.isAvailable ? 'success' : 'processing'}
                        text={court.isAvailable ? t('common.available') : t('common.inUse')}
                      />
                    )}
                  </Space>
                  <Popconfirm
                    title={t('arena.deleteCourtConfirm')}
                    onConfirm={() => handleDeleteCourt(court.id)}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                  >
                    <Button
                      type="text" danger size="small"
                      icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: 4, right: 4 }}
                    />
                  </Popconfirm>
                </Card>
              </Col>
            );
          })}
          {/* Carte + Ajouter */}
          <Col xs={12} sm={8} md={6}>
            <Card
              size="small"
              hoverable
              onClick={handleAddSingleCourt}
              style={{
                borderRadius: SF.radius,
                borderStyle: 'dashed',
                borderColor: SF.primary,
                minHeight: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: `${SF.primary}05`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <PlusOutlined style={{ fontSize: 22, color: SF.primary }} />
                <div style={{ fontSize: 12, color: SF.primary, marginTop: 4 }}>{t('arena.addCourt')}</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Bouton proposition intelligente */}
        <div style={{ marginTop: 12 }}>
          <Button size="small" icon={<ThunderboltOutlined />}
            onClick={() => setShowCourtsModal(true)}>
            {t('arena.propose')}
          </Button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // Modales
  // ═══════════════════════════════════════════════

  const renderCreateModal = () => (
    <Modal
      open={showCreateModal}
      onCancel={() => setShowCreateModal(false)}
      title={<Space><TrophyOutlined style={{ color: SF.primary }} />{t('arena.createTournament')}</Space>}
      footer={null}
      width={600}
    >
      <Form
        form={createForm}
        layout="vertical"
        onFinish={handleCreateTournament}
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
        <Form.Item name="name" label={<>{t('arena.tournament')} <Tooltip title={t('arena.tooltips.name')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>} rules={[{ required: true }]}>
          <Input placeholder={t('arena.tournament')} />
        </Form.Item>

        <Form.Item name="description" label={<>{t('common.description')} <Tooltip title={t('arena.tooltips.description')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
          <TextArea rows={2} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="sport" label={<>{t('arena.sport')} <Tooltip title={t('arena.tooltips.sport')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <Select>
                {SPORTS.map(s => <Select.Option key={s} value={s}>{t(`arena.sports.${s}`)}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="format" label={<>{t('arena.format')} <Tooltip title={t('arena.tooltips.format')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <Select>
                {FORMATS.map(f => <Select.Option key={f} value={f}>{t(`arena.formats.${f}`)}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="teamType" label={<>{t('arena.teamType')} <Tooltip title={t('arena.tooltips.teamType')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <Select onChange={(val) => {
                const sizes: Record<string, number> = { SOLO: 1, DOUBLETTE: 2, TRIPLETTE: 3, QUADRETTE: 4 };
                if (sizes[val]) createForm.setFieldsValue({ playersPerTeam: sizes[val] });
              }}>
                {TEAM_TYPES.map(tt => <Select.Option key={tt} value={tt}>{t(`arena.teamTypes.${tt}`)}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="playersPerTeam" label={t('arena.players')}>
              <InputNumber min={1} max={11} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="pointsToWin" label={<>{t('arena.pointsToWin')} <Tooltip title={t('arena.tooltips.pointsToWin')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item noStyle shouldUpdate={(prev, next) => prev.format !== next.format}>
              {({ getFieldValue }) => {
                const isMelee = getFieldValue('format') === 'RANDOM_DRAW';
                return (
                  <Form.Item name="maxTeams" label={<>{isMelee ? t('arena.maxPlayers') : t('arena.maxTeams')} <Tooltip title={isMelee ? t('arena.tooltips.maxPlayers') : t('arena.tooltips.maxTeams')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
                    <InputNumber min={2} style={{ width: '100%' }} />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="nbRounds" label={<>{t('arena.rounds')} <Tooltip title={t('arena.tooltips.nbRounds')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="location" label={<>{t('arena.location')} <Tooltip title={t('arena.tooltips.location')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
          <Input prefix={<EnvironmentOutlined />} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="startsAt" label={<>{t('common.startDate')} <Tooltip title={t('arena.tooltips.startsAt')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="endsAt" label={<>{t('common.endDate')} <Tooltip title={t('arena.tooltips.endsAt')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="rules" label={t('arena.rules')}>
          <TextArea rows={2} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="allowMixedTeams" valuePropName="checked">
              <Tooltip title={t('arena.tooltips.mixedTeams')}>
                <Switch checkedChildren={t('arena.mixedTeams')} unCheckedChildren={t('arena.mixedTeams')} />
              </Tooltip>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="withCourts" valuePropName="checked">
              <Switch checkedChildren={t('arena.courts')} unCheckedChildren={t('arena.courts')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isPublic" valuePropName="checked">
              <Tooltip title={t('arena.tooltips.isPublic')}>
                <Switch checkedChildren={t('arena.public')} unCheckedChildren={t('arena.private')} />
              </Tooltip>
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
  );

  const renderScoreModal = () => (
    <Modal
      open={showScoreModal}
      onCancel={() => { setShowScoreModal(false); setSelectedMatch(null); }}
      title={<Space><ThunderboltOutlined />{t('arena.submitScore')}</Space>}
      footer={null}
      width={400}
    >
      {selectedMatch && (
        <Form form={scoreForm} layout="vertical" onFinish={handleSubmitScore}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text strong style={{ fontSize: 16 }}>
              {selectedMatch.Team1?.name || '?'} {t('arena.vs')} {selectedMatch.Team2?.name || '?'}
            </Text>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="score1" label={selectedMatch.Team1?.name || t('arena.team') + ' 1'} rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%', fontSize: 24, textAlign: 'center' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="score2" label={selectedMatch.Team2?.name || t('arena.team') + ' 2'} rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%', fontSize: 24, textAlign: 'center' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>{t('arena.submitScore')}</Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );

  const renderRegisterTeamModal = () => {
    if (!selectedTournament) return null;
    const t_ = selectedTournament;
    const teamSize = TEAM_TYPE_SIZES[t_.teamType] || t_.playersPerTeam;
    const membersNeeded = teamSize - 1; // -1 car le capitaine est déjà compté
    const isManaging = myRegistration?.isCaptain && myRegistration?.team;

    return (
      <Modal
        open={showRegisterModal}
        onCancel={() => { setShowRegisterModal(false); registerForm.resetFields(); }}
        title={
          <Space>
            <TeamOutlined />
            {isManaging ? t('arena.manageTeam') : t('arena.registerTeam')}
          </Space>
        }
        footer={null}
        width={480}
      >
        <Form
          form={registerForm}
          layout="vertical"
          onFinish={handleRegisterTeam}
          initialValues={isManaging ? { name: myRegistration.team.name } : {}}
        >
          {/* Nom de l'équipe */}
          <Form.Item
            name="name"
            label={t('arena.teamName')}
            rules={[{ required: true, message: t('arena.teamName') }]}
          >
            <Input placeholder={t('arena.teamName')} disabled={!!isManaging} />
          </Form.Item>

          {/* Info : Vous êtes capitaine */}
          <div style={{
            background: `${SF.primary}10`,
            borderRadius: SF.radius,
            padding: '8px 12px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <CrownOutlined style={{ color: SF.gold }} />
            <Text style={{ color: SF.text, fontSize: 13 }}>
              {t('arena.captain')} : {user?.firstName} {user?.lastName}
            </Text>
          </div>

          {/* Sélecteur de coéquipiers */}
          {membersNeeded > 0 && (
            <Form.Item
              name="memberIds"
              label={t('arena.selectMembers')}
              rules={[{
                required: true,
                type: 'array',
                len: membersNeeded,
                message: t('arena.membersRequired', { count: membersNeeded }),
              }]}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('arena.membersRequired', { count: membersNeeded })}
                </Text>
              }
            >
              <Select
                mode="multiple"
                placeholder={t('arena.searchMember')}
                showSearch
                filterOption={false}
                onSearch={(q) => fetchAvailablePlayers(t_.id, q)}
                onFocus={() => fetchAvailablePlayers(t_.id)}
                maxCount={membersNeeded}
                style={{ width: '100%' }}
                optionLabelProp="label"
              >
                {availablePlayers.map(p => (
                  <Select.Option key={p.id} value={p.id} label={`${p.firstName} ${p.lastName}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar size="small" src={p.avatarUrl}>
                        {(p.firstName?.[0] || '') + (p.lastName?.[0] || '')}
                      </Avatar>
                      <span>{p.firstName} {p.lastName}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ background: SF.gradientPrimary, border: 'none' }}>
              {isManaging ? t('common.save') : t('arena.registerTeam')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  const renderCourtsModal = () => (
    <Modal
      open={showCourtsModal}
      onCancel={() => setShowCourtsModal(false)}
      title={<Space><EnvironmentOutlined />{t('arena.addCourts')}</Space>}
      footer={null}
    >
      <Form
        form={courtsForm}
        layout="vertical"
        onFinish={handleAddCourts}
        initialValues={{ courtsCount: 4, prefix: t('arena.court') }}
      >
        <Form.Item name="courtsCount" label={t('arena.courts')} rules={[{ required: true }]}>
          <InputNumber min={1} max={50} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="prefix" label="Préfixe">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>{t('arena.addCourts')}</Button>
        </Form.Item>
      </Form>
    </Modal>
  );

  // ═══════════════════════════════════════════════
  // RENDER Principal
  // ═══════════════════════════════════════════════

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <PageHelmet title="Arena" description="Tournois et compétitions Zhiive" />
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingTop: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: SF.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrophyOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: SF.text }}>{t('arena.title')}</Title>
            <Text style={{ color: SF.textSecondary, fontSize: 13 }}>{t('arena.subtitle')}</Text>
          </div>
        </div>
      </div>

      {renderTournamentsList()}
      {renderTournamentDetail()}
      {renderCreateModal()}
      {renderScoreModal()}
      {renderRegisterTeamModal()}
      {renderCourtsModal()}
    </div>
  );
};

export default ArenaPage;
