/**
 * 🏟️ ArenaPanel — Panel swipeable pour le Dashboard Zhiive
 * 
 * Affiche la liste des tournois + vue détail inline.
 * S'intègre dans le système de swipe du MainLayoutNew.
 * Tout reste dans le Mur — pas de navigation vers une page externe.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Tag, Space, Avatar, Empty, Spin, Divider,
  Typography, Badge, Modal, Form, Input, Select, InputNumber,
  Switch, DatePicker, Row, Col, App, Tabs, Table,
  Popconfirm, Tooltip,
} from 'antd';
import {
  TrophyOutlined, TeamOutlined, PlusOutlined, PlayCircleOutlined,
  ThunderboltOutlined, EnvironmentOutlined, CalendarOutlined,
  EditOutlined, UserAddOutlined, ClockCircleOutlined, DeleteOutlined,
  ReloadOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  CrownOutlined, InfoCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { SF } from './ZhiiveTheme';
import ZhiiveModuleHeader from './ZhiiveModuleHeader';
import { TEAM_TYPE_SIZES } from '../../services/arena/sportConfigs';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
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
  settings: Record<string, unknown> | null;
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
  startsAt: string | null;
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
  winnerId?: string | null;
  Team1: TeamEntry | null;
  Team2: TeamEntry | null;
  Winner: { id: string; name: string } | null;
  Court: { id: string; name: string } | null;
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
  teamType: string;
  location: string | null;
  isAvailable: boolean;
}

interface CourtProposalEntry {
  name: string;
  teamType: string; // DOUBLETTE | TRIPLETTE | IDLE
  playersNeeded: number;
  active: boolean;
}

interface CourtProposal {
  playerCount: number;
  courtsCount: number;
  doublettes: number;
  triplettes: number;
  idleCount: number;
  activeCount: number;
  playersUsed: number;
  playersOut: number;
  courts: CourtProposalEntry[];
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

interface ArenaPanelProps {
  api: unknown;
  currentUser?: unknown;
}

// ── Constants ──

const SPORTS = ['petanque', 'football', 'basketball', 'volleyball', 'tennis', 'badminton', 'other'];
const FORMATS = ['ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'SWISS', 'CHAMPIONSHIP'];
// Defaults et config par sport
const SPORT_CONFIG: Record<string, {
  isMeleeAvailable: boolean;
  pointsToWinDefault: number;
  showPointsToWin: boolean;
  teamTypes: string[];
  playersPerTeam: number;
  teamType: string;
  format: string;
  nbRounds: number;
  isMelee: boolean;
}> = {
  petanque:   { isMeleeAvailable: true,  showPointsToWin: true,  pointsToWinDefault: 13, teamTypes: ['SOLO','DOUBLETTE','TRIPLETTE','CUSTOM'], playersPerTeam: 2,  teamType: 'DOUBLETTE', format: 'CHAMPIONSHIP', nbRounds: 5,  isMelee: true  },
  football:   { isMeleeAvailable: false, showPointsToWin: false, pointsToWinDefault: 0,  teamTypes: ['CUSTOM'],                                playersPerTeam: 11, teamType: 'CUSTOM',    format: 'CHAMPIONSHIP', nbRounds: 30, isMelee: false },
  basketball: { isMeleeAvailable: false, showPointsToWin: false, pointsToWinDefault: 0,  teamTypes: ['CUSTOM'],                                playersPerTeam: 5,  teamType: 'CUSTOM',    format: 'ROUND_ROBIN',  nbRounds: 10, isMelee: false },
  volleyball: { isMeleeAvailable: false, showPointsToWin: true,  pointsToWinDefault: 25, teamTypes: ['CUSTOM'],                                playersPerTeam: 6,  teamType: 'CUSTOM',    format: 'ROUND_ROBIN',  nbRounds: 5,  isMelee: false },
  tennis:     { isMeleeAvailable: false, showPointsToWin: true,  pointsToWinDefault: 6,  teamTypes: ['SOLO','DOUBLETTE'],                      playersPerTeam: 1,  teamType: 'SOLO',      format: 'SINGLE_ELIMINATION', nbRounds: 5, isMelee: false },
  badminton:  { isMeleeAvailable: false, showPointsToWin: true,  pointsToWinDefault: 21, teamTypes: ['SOLO','DOUBLETTE'],                      playersPerTeam: 1,  teamType: 'SOLO',      format: 'SINGLE_ELIMINATION', nbRounds: 5, isMelee: false },
  other:      { isMeleeAvailable: false, showPointsToWin: true,  pointsToWinDefault: 0,  teamTypes: ['SOLO','DOUBLETTE','TRIPLETTE','CUSTOM'], playersPerTeam: 2,  teamType: 'DOUBLETTE', format: 'ROUND_ROBIN',  nbRounds: 5,  isMelee: false },
};

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

const TOURNAMENT_STATUS_FILTERS = [
  'DRAFT',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

const normalizeArenaText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// ── Panel Component ──

const ArenaPanel: React.FC<ArenaPanelProps> = () => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const { user, isSuperAdmin } = useAuth();
  const { message: antMessage } = App.useApp();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableApi = useMemo(() => api, []);

  // ── State: Liste ──
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm] = Form.useForm();

  // ── State: Détail (inline) ──
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const [detailSearchQuery, setDetailSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterLocation, setFilterLocation] = useState<string | undefined>(undefined);
  const [filterFormat, setFilterFormat] = useState<string | undefined>(undefined);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCourtsModal, setShowCourtsModal] = useState(false);
  const [courtProposal, setCourtProposal] = useState<CourtProposal | null>(null);
  const [proposalCourts, setProposalCourts] = useState<{ name: string; teamType: string }[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<{ id: string; firstName: string; lastName: string; avatarUrl: string | null }[]>([]);
  const [myRegistration, setMyRegistration] = useState<{ isRegistered: boolean; asPlayer: any; asTeamMember: any; isCaptain: boolean; team: any } | null>(null);
  const [roundDates, setRoundDates] = useState<Record<number, string>>({});
  const [savingDates, setSavingDates] = useState(false);
  const [scoreForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [courtsForm] = Form.useForm();
  const selectedTournamentId = selectedTournament?.id;

  // ── Data fetching: Liste ──

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

  // ── Data fetching: Détail ──

  const fetchTournamentDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await stableApi.get<{ success: boolean; data: Tournament }>(
        `/api/arena/tournaments/${id}`
      );
      if (res.success) {
        setSelectedTournament(res.data);
        // Initialiser les roundDates depuis les rounds existants ou les settings
        const existingDates: Record<number, string> = {};
        if (res.data.Rounds?.length) {
          res.data.Rounds.forEach(r => { if (r.startsAt) existingDates[r.roundNumber] = r.startsAt; });
        } else {
          const stored = (res.data.settings?.roundDates as Record<string, string>) ?? {};
          Object.entries(stored).forEach(([k, v]) => { if (v) existingDates[Number(k)] = v; });
        }
        setRoundDates(existingDates);
      }
    } catch {
      antMessage.error(t('messages.loadingError'));
    } finally {
      setDetailLoading(false);
    }
  }, [stableApi, t, antMessage]);

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
    if (selectedTournamentId) {
      fetchMyRegistration(selectedTournamentId);
    } else {
      setMyRegistration(null);
    }
  }, [selectedTournamentId, fetchMyRegistration]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    setActiveTab('matches');
    setDetailSearchQuery('');
  }, [selectedTournamentId]);

  // ── Socket.IO realtime ──
  useEffect(() => {
    if (!selectedTournamentId) return;
    let socket: any;
    try {
      const io = (window as any).__ZHIIVE_SOCKET_IO__;
      if (io) {
        socket = io;
        socket.emit('arena:join', { tournamentId: selectedTournamentId });
        const refresh = () => fetchTournamentDetail(selectedTournamentId);
        socket.on('arena:score-updated', refresh);
        socket.on('arena:tournament-updated', refresh);
        socket.on('arena:standings-updated', refresh);
        socket.on('arena:round-generated', refresh);
        socket.on('arena:teams-generated', refresh);
        socket.on('arena:tournament-status', refresh);
      }
    } catch { /* socket optional */ }
    return () => {
      if (socket) {
        socket.emit('arena:leave', { tournamentId: selectedTournamentId });
        socket.off('arena:score-updated');
        socket.off('arena:tournament-updated');
        socket.off('arena:standings-updated');
        socket.off('arena:round-generated');
        socket.off('arena:teams-generated');
        socket.off('arena:tournament-status');
      }
    };
  }, [selectedTournamentId, fetchTournamentDetail]);

  // ── Actions ──

  const isOrganizer = useCallback((tournament: Tournament) => {
    return tournament.creatorId === user?.id || isSuperAdmin;
  }, [user?.id, isSuperAdmin]);

  const handleCreate = useCallback(async (values: Record<string, unknown>) => {
    try {
      const { isMelee, ...rest } = values as Record<string, unknown> & { isMelee?: boolean };
      const res = await stableApi.post<{ success: boolean }>('/api/arena/tournaments', {
        ...rest,
        format: isMelee ? 'RANDOM_DRAW' : rest.format,
        startsAt: rest.startsAt ? (rest.startsAt as any).toISOString() : null,
        endsAt: rest.endsAt ? (rest.endsAt as any).toISOString() : null,
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

  const handleRegisterPlayer = useCallback(async (tournamentId?: string) => {
    const id = tournamentId || selectedTournament?.id;
    if (!id) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${id}/players`);
      antMessage.success(t('arena.confirmed'));
      if (selectedTournament) {
        fetchTournamentDetail(selectedTournament.id);
        fetchMyRegistration(selectedTournament.id);
      }
      fetchTournaments();
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, fetchMyRegistration, fetchTournaments, t, antMessage]);

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

  // Recalcule les stats (joueurs utilisés, BYE) à partir de la liste éditable localement
  const computeProposalStats = useCallback((courts: { name: string; teamType: string }[], playerCount: number) => {
    let used = 0;
    let d = 0; let tr = 0; let idle = 0;
    for (const c of courts) {
      if (c.teamType === 'DOUBLETTE') { used += 4; d++; }
      else if (c.teamType === 'TRIPLETTE') { used += 6; tr++; }
      else { idle++; }
    }
    return { playersUsed: used, playersOut: playerCount - used, doublettes: d, triplettes: tr, idleCount: idle, activeCount: d + tr };
  }, []);

  const fetchCourtProposal = useCallback(async (courtsCount?: number) => {
    if (!selectedTournament) return;
    try {
      const q = courtsCount ? `?courts=${courtsCount}` : '';
      const res = await stableApi.get<{ success: boolean; data: CourtProposal }>(
        `/api/arena/tournaments/${selectedTournament.id}/court-proposal${q}`
      );
      if (res.success) {
        setCourtProposal(res.data);
        setProposalCourts(res.data.courts.map(c => ({ name: c.name, teamType: c.teamType })));
      }
    } catch { /* silent */ }
  }, [stableApi, selectedTournament]);

  const handleSaveCourts = useCallback(async () => {
    if (!selectedTournament || proposalCourts.length === 0) return;
    try {
      await stableApi.post(`/api/arena/tournaments/${selectedTournament.id}/courts`, {
        courts: proposalCourts,
      });
      antMessage.success(t('arena.courts') + ' ' + t('common.created'));
      setShowCourtsModal(false);
      setCourtProposal(null);
      fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    }
  }, [stableApi, selectedTournament, proposalCourts, fetchTournamentDetail, t, antMessage]);

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

  // ── Round dates ──
  const handleSaveRoundDates = useCallback(async () => {
    if (!selectedTournament) return;
    setSavingDates(true);
    try {
      const payload: Record<string, string | null> = {};
      Object.entries(roundDates).forEach(([k, v]) => { payload[k] = v || null; });
      await stableApi.patch(`/api/arena/tournaments/${selectedTournament.id}/round-dates`, { roundDates: payload });
      antMessage.success(t('common.success'));
      fetchTournamentDetail(selectedTournament.id);
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    } finally {
      setSavingDates(false);
    }
  }, [selectedTournament, roundDates, stableApi, t, antMessage, fetchTournamentDetail]);

  // ── Super Admin: Seed fake players/teams ──
  const [seeding, setSeeding] = useState(false);
  const [fakeCount, setFakeCount] = useState<number>(16);

  const handleSeedFakePlayers = useCallback(async (count: number) => {
    if (!selectedTournament) return;
    setSeeding(true);
    try {
      const res = await stableApi.post<{ success: boolean; data: { usersCreated: number; playersCreated: number; teamsCreated: number } }>(
        `/api/arena/tournaments/${selectedTournament.id}/seed-fake-players`,
        { count }
      );
      if (res.success) {
        const d = res.data;
        antMessage.success(`${d.usersCreated} joueurs créés${d.teamsCreated ? `, ${d.teamsCreated} équipes` : ''}`);
        fetchTournamentDetail(selectedTournament.id);
      }
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    } finally {
      setSeeding(false);
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const handleCleanFakePlayers = useCallback(async () => {
    if (!selectedTournament) return;
    setSeeding(true);
    try {
      const res = await stableApi.delete<{ success: boolean; data: { usersDeleted: number } }>(
        `/api/arena/tournaments/${selectedTournament.id}/fake-players`
      );
      if (res.success) {
        antMessage.success(`${res.data.usersDeleted} faux joueurs supprimés`);
        fetchTournamentDetail(selectedTournament.id);
      }
    } catch (err: any) {
      antMessage.error(err.message || t('messages.loadingError'));
    } finally {
      setSeeding(false);
    }
  }, [stableApi, selectedTournament, fetchTournamentDetail, t, antMessage]);

  const locationOptions = useMemo(() => {
    const uniqueLocations = new Map<string, string>();

    tournaments.forEach((tournament) => {
      const location = tournament.location?.trim();
      if (!location) return;

      const key = normalizeArenaText(location);
      if (!uniqueLocations.has(key)) uniqueLocations.set(key, location);
    });

    return Array.from(uniqueLocations.values()).sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    const queryTokens = normalizeArenaText(searchQuery).split(/\s+/).filter(Boolean);

    return tournaments.filter((tournament) => {
      if (filterSport && tournament.sport !== filterSport) return false;
      if (filterStatus && tournament.status !== filterStatus) return false;
      if (filterFormat && tournament.format !== filterFormat) return false;
      if (
        filterLocation &&
        normalizeArenaText(tournament.location) !== normalizeArenaText(filterLocation)
      ) {
        return false;
      }
      if (queryTokens.length === 0) return true;

      const searchIndex = normalizeArenaText([
        tournament.name,
        tournament.description,
        tournament.location,
        tournament.rules,
        tournament.Organization?.name,
        tournament.Creator ? `${tournament.Creator.firstName} ${tournament.Creator.lastName}` : '',
        t(`arena.sports.${tournament.sport}`),
        t(`arena.formats.${tournament.format}`),
        t(`arena.teamTypes.${tournament.teamType}`),
        t(`arena.status.${tournament.status}`),
        tournament.startsAt ? dayjs(tournament.startsAt).format('DD/MM/YYYY HH:mm') : '',
      ].join(' '));

      return queryTokens.every((token) => searchIndex.includes(token));
    });
  }, [tournaments, searchQuery, filterSport, filterStatus, filterLocation, filterFormat, t]);

  const hasActiveFilters = Boolean(
    searchQuery || filterSport || filterStatus || filterLocation || filterFormat
  );

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterSport(undefined);
    setFilterStatus(undefined);
    setFilterLocation(undefined);
    setFilterFormat(undefined);
  }, []);

  const detailSearchTokens = useMemo(() =>
    normalizeArenaText(detailSearchQuery).split(/\s+/).filter(Boolean), [detailSearchQuery]);

  const hasDetailSearch = detailSearchTokens.length > 0;

  const matchesDetailSearch = useCallback((values: unknown[]) => {
    if (detailSearchTokens.length === 0) return true;
    const haystack = normalizeArenaText(values.join(' '));
    return detailSearchTokens.every((token) => haystack.includes(token));
  }, [detailSearchTokens]);

  const renderDetailSearchEmpty = () => (
    <Empty
      image={<SearchOutlined style={{ fontSize: 40, color: SF.textMuted }} />}
      description={t('arena.noDetailResults')}
      style={{ padding: 16 }}
    >
      <Text style={{ display: 'block', color: SF.textSecondary, marginBottom: 12, fontSize: 12 }}>
        {t('arena.noDetailResultsHint')}
      </Text>
      <Button size="small" onClick={() => setDetailSearchQuery('')}>
        {t('arena.clearFilters')}
      </Button>
    </Empty>
  );

  // ── Active tournaments (in progress) ──
  const activeTournaments = useMemo(() =>
    filteredTournaments.filter(t => t.status === 'IN_PROGRESS'), [filteredTournaments]);
  
  const openTournaments = useMemo(() =>
    filteredTournaments.filter(t => t.status === 'REGISTRATION_OPEN'), [filteredTournaments]);

  const otherTournaments = useMemo(() =>
    filteredTournaments.filter(t => !['IN_PROGRESS', 'REGISTRATION_OPEN'].includes(t.status)), [filteredTournaments]);

  // ═══════════════════════════════════════════════
  // RENDER — Carte tournoi (liste)
  // ═══════════════════════════════════════════════

  const renderTournamentCard = (tournament: Tournament, compact?: boolean) => {
    const isOrg = tournament.creatorId === user?.id || isSuperAdmin;

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
          fetchTournamentDetail(tournament.id);
          setActiveTab('matches');
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
              {tournament.pointsToWin > 0 && (
                <Tag style={{ fontSize: 10 }}>{tournament.pointsToWin} pts</Tag>
              )}
              {tournament.nbRounds > 0 && (
                <Tag color="cyan" style={{ fontSize: 10 }}>{tournament.nbRounds} {t('arena.rounds')}</Tag>
              )}
              {(tournament.maxTeams ?? tournament.maxPlayers) && (
                <Tag color="orange" style={{ fontSize: 10 }}>
                  max {tournament.maxTeams ?? tournament.maxPlayers} {tournament.format === 'RANDOM_DRAW' ? t('arena.players') : t('arena.teams')}
                </Tag>
              )}
              {tournament.courtsCount && tournament.courtsCount > 0 && (
                <Tag color="green" style={{ fontSize: 10 }}>⛳ {tournament.courtsCount} {t('arena.courts')}</Tag>
              )}
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
            {tournament.status === 'REGISTRATION_OPEN' && !isOrg && (
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

  // ═══════════════════════════════════════════════
  // RENDER — Vue liste (page d'accueil du panel)
  // ═══════════════════════════════════════════════

  const renderListView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <ZhiiveModuleHeader
        icon={<TrophyOutlined style={{ color: SF.primary, fontSize: 16 }} />}
        title={t('arena.title')}
        center={(
          <Input
            allowClear
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
            placeholder={t('arena.searchPlaceholder')}
            style={{ height: 28, borderRadius: SF.radiusSm, fontSize: 12, width: '100%', minWidth: 0 }}
          />
        )}
        actions={(
          <>
            <Tooltip title={t('common.refresh')}>
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchTournaments} />
            </Tooltip>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowCreateModal(true)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: SF.primary,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <PlusOutlined />
            </div>
          </>
        )}
      />

      <div style={{ padding: '8px 12px 80px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: SF.textSecondary }}>{t('arena.subtitle')}</Text>
          <Text style={{ fontSize: 11, color: SF.textSecondary }}>
            {hasActiveFilters
              ? t('arena.resultsCountFiltered', { count: filteredTournaments.length, total: tournaments.length })
              : t('arena.resultsCount', { count: tournaments.length })}
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center', overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
          <Select
            allowClear
            showSearch
            size="small"
            placeholder={t('arena.allSports')}
            value={filterSport}
            onChange={(value) => setFilterSport(value || undefined)}
            style={{ minWidth: 122, flexShrink: 0 }}
            optionFilterProp="children"
          >
            {SPORTS.map((sport) => (
              <Select.Option key={sport} value={sport}>{t(`arena.sports.${sport}`)}</Select.Option>
            ))}
          </Select>

          <Select
            allowClear
            showSearch
            size="small"
            placeholder={t('arena.allLocations')}
            value={filterLocation}
            onChange={(value) => setFilterLocation(value || undefined)}
            style={{ minWidth: 138, flexShrink: 0 }}
            optionFilterProp="children"
          >
            {locationOptions.map((location) => (
              <Select.Option key={location} value={location}>{location}</Select.Option>
            ))}
          </Select>

          <Select
            allowClear
            size="small"
            placeholder={t('arena.allFormats')}
            value={filterFormat}
            onChange={(value) => setFilterFormat(value || undefined)}
            style={{ minWidth: 138, flexShrink: 0 }}
          >
            {FORMATS.map((format) => (
              <Select.Option key={format} value={format}>{t(`arena.formats.${format}`)}</Select.Option>
            ))}
          </Select>

          <Select
            allowClear
            size="small"
            placeholder={t('arena.allStatuses')}
            value={filterStatus}
            onChange={(value) => setFilterStatus(value || undefined)}
            style={{ minWidth: 142, flexShrink: 0 }}
          >
            {TOURNAMENT_STATUS_FILTERS.map((status) => (
              <Select.Option key={status} value={status}>
                <Space size={4}>{STATUS_ICONS[status]}{t(`arena.status.${status}`)}</Space>
              </Select.Option>
            ))}
          </Select>

          <Button size="small" onClick={resetFilters} disabled={!hasActiveFilters} style={{ flexShrink: 0 }}>
            {t('arena.clearFilters')}
          </Button>
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
        ) : filteredTournaments.length === 0 ? (
          <Empty
            image={<SearchOutlined style={{ fontSize: 44, color: SF.textMuted }} />}
            description={t('arena.noResults')}
            style={{ marginTop: 28 }}
          >
            <Text style={{ display: 'block', color: SF.textSecondary, marginBottom: 12, fontSize: 12 }}>
              {t('arena.noResultsHint')}
            </Text>
            <Button size="small" onClick={resetFilters}>{t('arena.clearFilters')}</Button>
          </Empty>
        ) : (
          <>
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

            {otherTournaments.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0 8px', fontSize: 12 }}>{t('arena.tournaments')}</Divider>
                {otherTournaments.map(t => renderTournamentCard(t, true))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // RENDER — Vue détail tournoi (inline dans le panel)
  // ═══════════════════════════════════════════════

  const renderDetailView = () => {
    if (!selectedTournament) return null;
    const t_ = selectedTournament;
    const isOrg = isOrganizer(t_);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <ZhiiveModuleHeader
          icon={(
            <Button
              type="text"
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedTournament(null)}
              style={{ paddingInline: 4 }}
            />
          )}
          title={
            <span style={{ display: 'block', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t_.name}
            </span>
          }
          center={(
            <Input
              allowClear
              value={detailSearchQuery}
              onChange={(event) => setDetailSearchQuery(event.target.value)}
              prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
              placeholder={t('arena.searchInTournamentPlaceholder')}
              style={{ height: 28, borderRadius: SF.radiusSm, fontSize: 12, width: '100%', minWidth: 0 }}
            />
          )}
          actions={(
            <>
              <Tooltip title={t('common.refresh')}>
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => fetchTournamentDetail(t_.id)}
                />
              </Tooltip>
              {isOrg && t_.status === 'DRAFT' && (
                <Popconfirm title={t('actions.confirmDelete')} onConfirm={() => handleDeleteTournament(t_.id)}>
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </>
          )}
        />

        <div style={{ padding: '8px 12px 80px', overflowY: 'auto', flex: 1 }}>
          <Spin spinning={detailLoading}>
          {/* Info tags */}
          <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Tag color={STATUS_COLORS[t_.status]} icon={STATUS_ICONS[t_.status]} style={{ borderRadius: 12, fontSize: 10 }}>
              {t(`arena.status.${t_.status}`)}
            </Tag>
            <Tag style={{ fontSize: 10 }}>{t(`arena.sports.${t_.sport}`)}</Tag>
            <Tag color="purple" style={{ fontSize: 10 }}>{t(`arena.formats.${t_.format}`)}</Tag>
            <Tag color="blue" style={{ fontSize: 10 }}>{t(`arena.teamTypes.${t_.teamType}`)}</Tag>
            {t_.allowMixedTeams && <Tag color="green" style={{ fontSize: 10 }}>{t('arena.mixedTeams')}</Tag>}
            {t_.pointsToWin > 0 && <Tag style={{ fontSize: 10 }}>{t_.pointsToWin} pts</Tag>}
            {t_.nbRounds > 0 && <Tag color="cyan" style={{ fontSize: 10 }}>{t_.nbRounds} {t('arena.rounds')}</Tag>}
            {(t_.maxTeams ?? t_.maxPlayers) && (
              <Tag color="orange" style={{ fontSize: 10 }}>
                max {t_.maxTeams ?? t_.maxPlayers} {t_.format === 'RANDOM_DRAW' ? t('arena.players') : t('arena.teams')}
              </Tag>
            )}
            {t_.courtsCount && t_.courtsCount > 0 && (
              <Tag color="green" style={{ fontSize: 10 }}>⛳ {t_.courtsCount} {t('arena.courts')}</Tag>
            )}
          </div>

          {t_.description && (
            <Paragraph style={{ fontSize: 12, color: SF.textSecondary, marginBottom: 8 }}>{t_.description}</Paragraph>
          )}
          {t_.location && (
            <div style={{ color: SF.textSecondary, fontSize: 11, marginBottom: 4 }}><EnvironmentOutlined /> {t_.location}</div>
          )}
          {t_.startsAt && (
            <div style={{ color: SF.textSecondary, fontSize: 11, marginBottom: 8 }}>
              <CalendarOutlined /> {dayjs(t_.startsAt).format('DD/MM/YYYY HH:mm')}
            </div>
          )}

          {/* Actions organisateur */}
          {isOrg && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10,
              padding: '8px 10px',
              background: `${SF.primary}08`,
              borderRadius: SF.radius,
              border: `1px solid ${SF.primary}20`,
            }}>
              {(t_.status === 'DRAFT' || t_.status === 'REGISTRATION_OPEN' || t_.status === 'REGISTRATION_CLOSED') && (
                <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleStatusChange}>
                  {t_.status === 'DRAFT' ? t('arena.openRegistrations') : t('arena.startTournament')}
                </Button>
              )}
              {t_.status === 'IN_PROGRESS' && (
                <Button size="small" icon={<ThunderboltOutlined />} onClick={handleGenerateRound}>
                  {t_.format === 'RANDOM_DRAW' ? t('arena.generateAllRounds') : t('arena.generateRound')}
                </Button>
              )}
              <Button size="small" icon={<EnvironmentOutlined />} onClick={() => { setShowCourtsModal(true); setCourtProposal(null); }}>
                {t_.Courts && t_.Courts.length > 0 ? t('arena.editCourts') : t('arena.addCourts')}
              </Button>
            </div>
          )}

          {/* 🧪 Super Admin Test Tools — Seed fake players */}
          {isSuperAdmin && (
            <div style={{
              marginBottom: 10, padding: '8px 10px',
              background: `${SF.fire}08`, borderRadius: SF.radius,
              border: `1px dashed ${SF.fire}40`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ThunderboltOutlined style={{ color: SF.fire }} />
                <Text strong style={{ fontSize: 11, color: SF.fire }}>🧪 Test Mode (Super Admin)</Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <InputNumber
                  size="small"
                  min={2} max={128}
                  value={fakeCount}
                  onChange={(v) => setFakeCount(v ?? 16)}
                  style={{ width: 70, fontSize: 10 }}
                />
                <Button size="small" type="primary" loading={seeding}
                  onClick={() => handleSeedFakePlayers(fakeCount)}
                  icon={<UserAddOutlined />}
                  style={{ fontSize: 10 }}>
                  Ajouter joueurs
                </Button>
                <Button size="small" loading={seeding}
                  onClick={handleGenerateRound}
                  icon={<ThunderboltOutlined />}
                  style={{ fontSize: 10 }}>
                  Générer matches
                </Button>
                <Popconfirm title="Supprimer tous les faux joueurs ?" onConfirm={handleCleanFakePlayers}>
                  <Button size="small" danger loading={seeding} icon={<DeleteOutlined />}
                    style={{ fontSize: 10 }}>
                    Nettoyer fakes
                  </Button>
                </Popconfirm>
              </div>
            </div>
          )}

          {/* Inscription joueur/équipe */}
          {(t_.status === 'REGISTRATION_OPEN' || t_.status === 'DRAFT') && !isOrg && (
            <div style={{ marginBottom: 10, padding: '8px 10px', background: `${SF.success}08`, borderRadius: SF.radius, border: `1px solid ${SF.success}20` }}>
              {myRegistration?.isRegistered ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 11 }}>{t('arena.alreadyRegistered')}</Tag>
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
                    <Button size="small" type="primary" icon={<UserAddOutlined />} onClick={() => handleRegisterPlayer()}>
                      {t('arena.registerMelee')}
                    </Button>
                  ) : t_.teamType === 'SOLO' ? (
                    <Button size="small" type="primary" icon={<UserAddOutlined />} onClick={() => handleRegisterPlayer()}>
                      {t('arena.registerPlayer')}
                    </Button>
                  ) : (
                    <Button size="small" type="primary" icon={<TeamOutlined />} onClick={() => {
                      setShowRegisterModal(true);
                      fetchAvailablePlayers(t_.id);
                    }}>
                      {t('arena.registerTeam')}
                    </Button>
                  )}
                </Space>
              )}
            </div>
          )}

          {/* Onglets: Matchs / Classement / Équipes / Terrains */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            style={{ fontSize: 12 }}
            items={[
              {
                key: 'matches',
                label: <span><ThunderboltOutlined /> {t('arena.matches')}</span>,
                children: renderMatchesTab(),
              },
              {
                key: 'standings',
                label: <span><TrophyOutlined /> {t('arena.standings')}</span>,
                children: renderStandingsTab(),
              },
              {
                key: 'teams',
                label: <span><TeamOutlined /> {t('arena.players')} ({(selectedTournament?.PlayerEntries?.length || 0) + (selectedTournament?.TeamEntries?.filter(te => te.status === 'CONFIRMED').length || 0)})</span>,
                children: renderTeamsTab(),
              },
              {
                key: 'courts',
                label: <span><EnvironmentOutlined /> {t('arena.courts')}</span>,
                children: renderCourtsTab(),
              },
            ]}
          />
        </Spin>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════ Onglet Matchs ══
  const renderMatchesTab = () => {
    const rounds = selectedTournament?.Rounds || [];
    const isOrg = selectedTournament ? isOrganizer(selectedTournament) : false;
    const isChampionship = selectedTournament?.format === 'CHAMPIONSHIP' || selectedTournament?.format === 'ROUND_ROBIN';
    const nbRounds = selectedTournament?.nbRounds || 0;

    // Pour un championnat, afficher le planificateur de journées même avant génération
    const roundCount = rounds.length > 0 ? rounds.length : nbRounds;
    const filteredRounds = hasDetailSearch
      ? rounds.reduce<Round[]>((acc, round) => {
          const roundMatches = round.Matches.filter((match) =>
            matchesDetailSearch([
              round.roundNumber,
              round.name,
              round.startsAt ? dayjs(round.startsAt).format('DD/MM/YYYY HH:mm') : '',
              match.matchNumber,
              selectedTournament?.format === 'RANDOM_DRAW' ? getTeamPlayerNames(match.Team1) : (match.Team1?.name || t('arena.bye')),
              selectedTournament?.format === 'RANDOM_DRAW' ? getTeamPlayerNames(match.Team2) : (match.Team2?.name || t('arena.bye')),
              match.Court?.name,
              match.status,
              match.score1,
              match.score2,
            ])
          );

          if (matchesDetailSearch([
            t('arena.round'),
            round.roundNumber,
            round.name,
            round.startsAt ? dayjs(round.startsAt).format('DD/MM/YYYY HH:mm') : '',
          ])) {
            acc.push(round);
            return acc;
          }

          if (roundMatches.length > 0) {
            acc.push({ ...round, Matches: roundMatches });
          }

          return acc;
        }, [])
      : rounds;

    return (
      <div>
        {/* Planificateur de dates — CHAMPIONSHIP/ROUND_ROBIN organisateur */}
        {isOrg && isChampionship && roundCount > 0 && (
          <Card
            size="small"
            style={{ marginBottom: 10, borderRadius: SF.radius, border: `1px solid ${SF.primary}30` }}
            title={<span style={{ fontSize: 12, color: SF.primary }}><CalendarOutlined /> {t('arena.scheduleRounds')}</span>}
            bodyStyle={{ padding: '8px 12px' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: roundCount }, (_, i) => i + 1).map(rn => {
                const round = rounds.find(r => r.roundNumber === rn);
                const label = round?.name || `J${rn}`;
                return (
                  <div key={rn} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, minWidth: 28 }}>{label}</Text>
                    <DatePicker
                      size="small"
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM HH:mm"
                      style={{ width: 130 }}
                      value={roundDates[rn] ? dayjs(roundDates[rn]) : null}
                      onChange={(d) => setRoundDates(prev => ({ ...prev, [rn]: d ? d.toISOString() : '' }))}
                    />
                  </div>
                );
              })}
            </div>
            <Button
              size="small"
              type="primary"
              style={{ marginTop: 8, background: SF.gradientPrimary, border: 'none' }}
              loading={savingDates}
              onClick={handleSaveRoundDates}
            >
              {t('common.save')}
            </Button>
          </Card>
        )}

        {rounds.length === 0
          ? <Empty description={t('arena.noMatches')} style={{ padding: 16 }} />
          : filteredRounds.length === 0
            ? renderDetailSearchEmpty()
            : filteredRounds.map(round => (
          <Card
            key={round.id}
            title={
              <span style={{ fontSize: 12 }}>
                {t('arena.round')} {round.roundNumber}{round.name ? ` — ${round.name}` : ''}
                {round.startsAt && (
                  <span style={{ marginLeft: 8, color: SF.textSecondary, fontWeight: 400 }}>
                    <CalendarOutlined /> {dayjs(round.startsAt).format('DD/MM/YYYY HH:mm')}
                  </span>
                )}
              </span>
            }
            size="small"
            style={{ marginBottom: 8, borderRadius: SF.radius }}
            bodyStyle={{ padding: 0 }}
          >
            {round.Matches.map(match => (
              <div
                key={match.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderBottom: `1px solid ${SF.border}`,
                  background: match.status === 'COMPLETED' ? `${SF.success}08` : undefined,
                  fontSize: 12,
                }}
              >
                <div style={{ flex: 1, textAlign: 'right', fontWeight: match.winnerId === match.team1Id ? 700 : 400 }}>
                  {selectedTournament?.format === 'RANDOM_DRAW' ? getTeamPlayerNames(match.Team1) : (match.Team1?.name || t('arena.bye'))}
                </div>
                <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
                  {match.status === 'COMPLETED' ? (
                    <span>
                      <span style={{ fontWeight: 700, color: (match.score1 ?? 0) > (match.score2 ?? 0) ? SF.success : SF.text }}>
                        {match.score1}
                      </span>
                      <span style={{ color: SF.textSecondary, margin: '0 4px' }}>-</span>
                      <span style={{ fontWeight: 700, color: (match.score2 ?? 0) > (match.score1 ?? 0) ? SF.success : SF.text }}>
                        {match.score2}
                      </span>
                    </span>
                  ) : (
                    <Button size="small" type="link" style={{ fontSize: 11, padding: 0 }}
                      onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); setShowScoreModal(true); }}>
                      {t('arena.submitScore')}
                    </Button>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'left', fontWeight: match.winnerId === match.team2Id ? 700 : 400 }}>
                  {selectedTournament?.format === 'RANDOM_DRAW' ? getTeamPlayerNames(match.Team2) : (match.Team2?.name || t('arena.bye'))}
                </div>
                {match.Court && (
                  <Tag style={{ marginLeft: 4, fontSize: 10 }}>{match.Court.name}</Tag>
                )}
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  };

  // ═══════════════════════════════ Onglet Classement ══
  const renderStandingsTab = () => {
    const standings = selectedTournament?.Standings || [];
    const filteredStandings = standings.filter((standing) =>
      matchesDetailSearch([
        standing.rank,
        standing.TeamEntry?.name,
        standing.played,
        standing.wins,
        standing.draws,
        standing.losses,
        standing.points,
        standing.pointsFor,
        standing.pointsAgainst,
      ])
    );

    if (standings.length === 0) return <Empty description={t('arena.noMatches')} style={{ padding: 16 }} />;
    if (filteredStandings.length === 0) return renderDetailSearchEmpty();

    return (
      <Table
        dataSource={filteredStandings}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: '#', dataIndex: 'rank', key: 'rank', width: 36,
            render: (rank: number) => (
              <span style={{ fontWeight: 700, color: rank <= 3 ? SF.gold : SF.text }}>
                {rank <= 3 && <CrownOutlined style={{ marginRight: 2, color: ['#FFD700', '#C0C0C0', '#CD7F32'][rank - 1] }} />}
                {rank}
              </span>
            ),
          },
          { title: t('arena.team'), dataIndex: ['TeamEntry', 'name'], key: 'team', ellipsis: true, render: (name: string) => <Text strong style={{ fontSize: 12 }}>{name}</Text> },
          { title: 'J', dataIndex: 'played', key: 'played', width: 30, align: 'center' as const },
          { title: 'V', dataIndex: 'wins', key: 'wins', width: 30, align: 'center' as const, render: (v: number) => <span style={{ color: SF.success, fontWeight: 600 }}>{v}</span> },
          { title: 'D', dataIndex: 'losses', key: 'losses', width: 30, align: 'center' as const, render: (v: number) => <span style={{ color: v > 0 ? SF.danger : SF.text }}>{v}</span> },
          { title: 'Pts', dataIndex: 'points', key: 'points', width: 36, align: 'center' as const, render: (pts: number) => <span style={{ fontWeight: 700, color: SF.primary }}>{pts}</span> },
        ]}
      />
    );
  };

  // ═══════════════════════════════ Onglet Joueurs ══

  // Helper: noms des joueurs d'une équipe (pour affichage mêlée)
  const getTeamPlayerNames = (team: TeamEntry | null): string => {
    if (!team?.Members || team.Members.length === 0) return team?.name || '?';
    return team.Members.map(m => `${m.User.firstName} ${m.User.lastName?.[0] || ''}.`).join(' · ');
  };

  const renderTeamsTab = () => {
    const teams = selectedTournament?.TeamEntries || [];
    const players = selectedTournament?.PlayerEntries || [];
    const isMelee = selectedTournament?.format === 'RANDOM_DRAW';
    const filteredTeams = teams.filter((team) =>
      matchesDetailSearch([
        team.name,
        team.status,
        team.Members?.map((member) => `${member.User.firstName} ${member.User.lastName}`).join(' '),
      ])
    );
    const filteredPlayers = players.filter((player) =>
      matchesDetailSearch([
        player.User.firstName,
        player.User.lastName,
        player.status,
      ])
    );

    if (teams.length === 0 && players.length === 0) return <Empty description={t('arena.noTeams')} style={{ padding: 16 }} />;
    if (filteredTeams.length === 0 && filteredPlayers.length === 0) return renderDetailSearchEmpty();

    // ── Mode mêlée : liste numérotée de joueurs individuels ──
    if (isMelee && players.length > 0) {
      return (
        <div>
          <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: SF.radius, background: `${SF.primary}08`, border: `1px solid ${SF.primary}20`, fontSize: 11 }}>
            <TeamOutlined /> {filteredPlayers.filter(p => p.status === 'CONFIRMED').length} {t('arena.players')} {t('arena.confirmed').toLowerCase()}
          </div>
          {filteredPlayers.map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderBottom: `1px solid ${SF.border}` }}>
              <span style={{ fontSize: 11, color: SF.textSecondary, minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
              <Avatar size={22} src={p.User.avatarUrl}>{p.User.firstName?.[0]}</Avatar>
              <Text style={{ fontSize: 12 }}>{p.User.firstName} {p.User.lastName}</Text>
              <Tag color={p.status === 'CONFIRMED' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                {t(`arena.${p.status.toLowerCase()}`)}
              </Tag>
            </div>
          ))}
        </div>
      );
    }

    // ── Mode équipe formée : liste des équipes avec membres ──
    return (
      <div>
        {filteredTeams.map(team => (
          <div key={team.id} style={{ padding: '8px 0', borderBottom: `1px solid ${SF.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Avatar size={20} style={{ background: team.status === 'CONFIRMED' ? SF.success : SF.textSecondary }}>
                <TeamOutlined style={{ fontSize: 10 }} />
              </Avatar>
              <Text strong style={{ fontSize: 12 }}>{team.name}</Text>
              <Tag color={team.status === 'CONFIRMED' ? 'green' : team.status === 'REJECTED' ? 'red' : 'orange'} style={{ fontSize: 10 }}>
                {t(`arena.${team.status.toLowerCase()}`)}
              </Tag>
              {isOrganizer(selectedTournament!) && team.status === 'PENDING' && (
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}
                  onClick={async () => {
                    await stableApi.put(`/api/arena/entries/${team.id}/status`, { status: 'CONFIRMED', type: 'team' });
                    fetchTournamentDetail(selectedTournament!.id);
                  }}>
                  {t('arena.confirmed')}
                </Button>
              )}
            </div>
            {team.Members && team.Members.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 28 }}>
                {team.Members.map(m => (
                  <Space key={m.id} size={2}>
                    <Avatar size={16} src={m.User.avatarUrl}>{m.User.firstName?.[0]}</Avatar>
                    <span style={{ fontSize: 11 }}>{m.User.firstName} {m.User.lastName}</span>
                    {m.isCaptain && <CrownOutlined style={{ color: SF.gold, fontSize: 10 }} />}
                  </Space>
                ))}
              </div>
            )}
          </div>
        ))}
        {filteredPlayers.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0', fontSize: 11 }}>{t('arena.players')}</Divider>
            {filteredPlayers.map((p, idx) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderBottom: `1px solid ${SF.border}` }}>
                <span style={{ fontSize: 11, color: SF.textSecondary, minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
                <Avatar size={22} src={p.User.avatarUrl}>{p.User.firstName?.[0]}</Avatar>
                <Text style={{ fontSize: 12 }}>{p.User.firstName} {p.User.lastName}</Text>
                <Tag color={p.status === 'CONFIRMED' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                  {t(`arena.${p.status.toLowerCase()}`)}
                </Tag>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  // ═══════════════════════════════ Onglet Terrains ══
  const renderCourtsTab = () => {
    const courts = selectedTournament?.Courts || [];
    const isOrg = isOrganizer(selectedTournament!);
    const filteredCourts = courts.filter((court) =>
      matchesDetailSearch([
        court.name,
        court.location,
        court.teamType,
        court.isAvailable ? t('common.available') : t('common.inUse'),
        court.teamType === 'IDLE' ? t('common.inactive') : t(`arena.teamTypes.${court.teamType}`),
      ])
    );
    const activeCount = filteredCourts.filter(c => c.teamType !== 'IDLE').length;
    const doublCount = filteredCourts.filter(c => c.teamType === 'DOUBLETTE').length;
    const triplCount = filteredCourts.filter(c => c.teamType === 'TRIPLETTE').length;

    return (
      <div>
        {/* Résumé */}
        {filteredCourts.length > 0 && (
          <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: SF.radius, background: `${SF.primary}08`, border: `1px solid ${SF.primary}20`, fontSize: 11 }}>
            <TeamOutlined /> {filteredCourts.length} terrains · {activeCount} actifs
            {doublCount > 0 && ` · ${doublCount} doublette(s)`}
            {triplCount > 0 && ` · ${triplCount} triplette(s)`}
          </div>
        )}

        {courts.length === 0 && !isOrg && (
          <Empty description={t('arena.noCourts')} style={{ padding: 16 }} />
        )}

        {courts.length > 0 && filteredCourts.length === 0 && renderDetailSearchEmpty()}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {filteredCourts.map(court => {
            const isIdle = court.teamType === 'IDLE';
            return (
              <Card key={court.id} size="small" style={{
                borderRadius: SF.radius,
                borderColor: isIdle ? SF.border : (court.isAvailable ? SF.success : SF.fire),
                minWidth: 140, opacity: isIdle ? 0.55 : 1, position: 'relative',
              }}>
                <Text strong style={{ fontSize: 11 }}><EnvironmentOutlined /> {court.name}</Text>
                {isOrg && (
                  <div style={{ marginTop: 4 }}>
                    <Select
                      size="small"
                      value={court.teamType}
                      onChange={(val) => handleUpdateCourt(court.id, { teamType: val })}
                      style={{ width: '100%', fontSize: 10 }}
                    >
                      <Select.Option value="DOUBLETTE">{t('arena.teamTypes.DOUBLETTE')} (2v2)</Select.Option>
                      <Select.Option value="TRIPLETTE">{t('arena.teamTypes.TRIPLETTE')} (3v3)</Select.Option>
                      <Select.Option value="IDLE">{t('common.inactive')}</Select.Option>
                    </Select>
                  </div>
                )}
                {!isOrg && (
                  <div>
                    {isIdle
                      ? <Tag style={{ fontSize: 10, marginTop: 2 }}>{t('common.inactive')}</Tag>
                      : <Tag color={court.teamType === 'TRIPLETTE' ? 'orange' : 'blue'} style={{ fontSize: 10, marginTop: 2 }}>
                          {court.teamType === 'TRIPLETTE' ? `${t('arena.teamTypes.TRIPLETTE')} (3v3)` : `${t('arena.teamTypes.DOUBLETTE')} (2v2)`}
                        </Tag>
                    }
                  </div>
                )}
                {!isIdle && (
                  <div>
                    <Badge status={court.isAvailable ? 'success' : 'processing'}
                      text={<span style={{ fontSize: 10 }}>{court.isAvailable ? t('common.available') : t('common.inUse')}</span>} />
                  </div>
                )}
                {isOrg && (
                  <Popconfirm
                    title={t('arena.deleteCourtConfirm')}
                    onConfirm={() => handleDeleteCourt(court.id)}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                  >
                    <Button
                      type="text" danger size="small"
                      icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: 2, right: 2, fontSize: 10 }}
                    />
                  </Popconfirm>
                )}
              </Card>
            );
          })}

          {/* Carte + Ajouter */}
          {isOrg && (
            <Card
              size="small"
              hoverable
              onClick={handleAddSingleCourt}
              style={{
                borderRadius: SF.radius,
                borderStyle: 'dashed',
                borderColor: SF.primary,
                minWidth: 140, minHeight: 80,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: `${SF.primary}05`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <PlusOutlined style={{ fontSize: 20, color: SF.primary }} />
                <div style={{ fontSize: 11, color: SF.primary, marginTop: 4 }}>{t('arena.addCourt')}</div>
              </div>
            </Card>
          )}
        </div>

        {/* Bouton proposition intelligente (garde l'ancien workflow) */}
        {isOrg && (
          <Button size="small" icon={<ThunderboltOutlined />}
            onClick={() => { setShowCourtsModal(true); setCourtProposal(null); }}>
            {t('arena.propose')}
          </Button>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // RENDER Principal
  // ═══════════════════════════════════════════════

  return (
    <div style={{ height: '100%', overflow: 'hidden', background: SF.bg }}>
      {selectedTournament ? (
        <div style={{ height: '100%', overflow: 'hidden' }}>
          {renderDetailView()}
        </div>
      ) : renderListView()}

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
            format: 'CHAMPIONSHIP',
            isMelee: true,
            teamType: 'DOUBLETTE',
            playersPerTeam: 2,
            pointsToWin: 13,
            nbRounds: 5,
            allowMixedTeams: true,
            withCourts: true,
            isPublic: true,
          }}
        >
          <Form.Item name="name" label={<>{t('arena.tournament')} <Tooltip title={t('arena.tooltips.name')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>} rules={[{ required: true }]}>
            <Input placeholder={t('arena.tournament')} />
          </Form.Item>
          <Form.Item name="description" label={<>{t('common.description')} <Tooltip title={t('arena.tooltips.description')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
            <TextArea rows={2} />
          </Form.Item>

          {/* Sport */}
          <Form.Item name="sport" label={<>{t('arena.sport')} <Tooltip title={t('arena.tooltips.sport')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
            <Select onChange={(val) => {
              const cfg = SPORT_CONFIG[val] ?? SPORT_CONFIG.other;
              createForm.setFieldsValue({
                format: cfg.format,
                teamType: cfg.teamType,
                playersPerTeam: cfg.playersPerTeam,
                pointsToWin: cfg.pointsToWinDefault,
                nbRounds: cfg.nbRounds,
                isMelee: cfg.isMelee,
              });
            }}>
              {SPORTS.map(s => <Select.Option key={s} value={s}>{t(`arena.sports.${s}`)}</Select.Option>)}
            </Select>
          </Form.Item>

          {/* Format — avec description claire */}
          <Form.Item
            name="format"
            label={<>{t('arena.format')} <Tooltip title={t('arena.tooltips.format')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 12 }} /></Tooltip></>}
            extra={
              <Form.Item noStyle shouldUpdate={(prev, next) => prev.format !== next.format}>
                {({ getFieldValue }) => {
                  const fmt = getFieldValue('format');
                  const hints: Record<string, string> = {
                    SINGLE_ELIMINATION: t('arena.formatHints.SINGLE_ELIMINATION'),
                    ROUND_ROBIN: t('arena.formatHints.ROUND_ROBIN'),
                    SWISS: t('arena.formatHints.SWISS'),
                    CHAMPIONSHIP: t('arena.formatHints.CHAMPIONSHIP'),
                    DOUBLE_ELIMINATION: t('arena.formatHints.DOUBLE_ELIMINATION'),
                  };
                  return hints[fmt] ? <Text style={{ fontSize: 11, color: SF.textSecondary }}>{hints[fmt]}</Text> : null;
                }}
              </Form.Item>
            }
          >
            <Select>
              {FORMATS.map(f => <Select.Option key={f} value={f}>{t(`arena.formats.${f}`)}</Select.Option>)}
            </Select>
          </Form.Item>

          {/* Type d'équipe — options filtrées par sport */}
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.sport !== next.sport || prev.isMelee !== next.isMelee}>
            {({ getFieldValue }) => {
              const sport = getFieldValue('sport') || 'petanque';
              const cfg = SPORT_CONFIG[sport] ?? SPORT_CONFIG.other;
              const isMelee = getFieldValue('isMelee');
              return (
                <Form.Item
                  name="teamType"
                  label={<>{t('arena.teamType')} <Tooltip title={t('arena.tooltips.teamType')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}
                  extra={isMelee ? <Text style={{ fontSize: 11, color: SF.primary }}><ThunderboltOutlined /> {t('arena.meleeHint')}</Text> : null}
                >
                  <Select onChange={(val) => {
                    const sizes: Record<string, number> = { SOLO: 1, DOUBLETTE: 2, TRIPLETTE: 3 };
                    if (sizes[val]) createForm.setFieldsValue({ playersPerTeam: sizes[val] });
                  }}>
                    {cfg.teamTypes.map(tt => <Select.Option key={tt} value={tt}>{t(`arena.teamTypes.${tt}`)}</Select.Option>)}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, next) => prev.sport !== next.sport || prev.isMelee !== next.isMelee}>
            {({ getFieldValue }) => {
              const sport = getFieldValue('sport') || 'petanque';
              const cfg = SPORT_CONFIG[sport] ?? SPORT_CONFIG.other;
              const isMelee = getFieldValue('isMelee');
              return (
                <Row gutter={12}>
                  {cfg.showPointsToWin && (
                    <Col span={6}>
                      <Form.Item name="pointsToWin" label={<>{t('arena.pointsToWin')} <Tooltip title={t('arena.tooltips.pointsToWin')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={cfg.showPointsToWin ? 6 : 8}>
                    <Form.Item name="maxTeams" label={<>{isMelee ? t('arena.maxPlayers') : t('arena.maxTeams')} <Tooltip title={isMelee ? t('arena.tooltips.maxPlayers') : t('arena.tooltips.maxTeams')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
                      <InputNumber min={2} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={cfg.showPointsToWin ? 6 : 8}>
                    <Form.Item name="nbRounds" label={<>{t('arena.rounds')} <Tooltip title={t('arena.tooltips.nbRounds')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
                      <InputNumber min={1} max={99} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={cfg.showPointsToWin ? 6 : 8}>
                    <Form.Item name="courtsCount" label={t('arena.courtsCount')}>
                      <InputNumber min={1} max={50} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              );
            }}
          </Form.Item>
          <Form.Item name="location" label={<>{t('arena.location')} <Tooltip title={t('arena.tooltips.location')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
            <Input prefix={<EnvironmentOutlined />} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startsAt" label={<>{t('common.startDate')} <Tooltip title={t('arena.tooltips.startsAt')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endsAt" label={<>{t('common.endDate')} <Tooltip title={t('arena.tooltips.endsAt')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.sport !== next.sport}>
            {({ getFieldValue }) => {
              const sport = getFieldValue('sport') || 'petanque';
              const cfg = SPORT_CONFIG[sport] ?? SPORT_CONFIG.other;
              return (
                <Row gutter={12}>
                  {cfg.isMeleeAvailable && (
                    <Col span={8}>
                      <Form.Item name="isMelee" valuePropName="checked" label={<>{t('arena.melee')} <Tooltip title={t('arena.tooltips.isMelee')}><InfoCircleOutlined style={{ color: SF.textSecondary, fontSize: 11 }} /></Tooltip></>}>
                        <Switch checkedChildren={t('arena.melee')} unCheckedChildren={t('arena.byTeam')} />
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={cfg.isMeleeAvailable ? 8 : 12}>
                    <Form.Item name="allowMixedTeams" valuePropName="checked" label=" ">
                      <Tooltip title={t('arena.tooltips.mixedTeams')}>
                        <Switch checkedChildren={t('arena.mixedTeams')} unCheckedChildren={t('arena.mixedTeams')} />
                      </Tooltip>
                    </Form.Item>
                  </Col>
                  <Col span={cfg.isMeleeAvailable ? 8 : 12}>
                    <Form.Item name="isPublic" valuePropName="checked" label=" ">
                      <Tooltip title={t('arena.tooltips.isPublic')}>
                        <Switch checkedChildren={t('arena.public')} unCheckedChildren={t('arena.private')} />
                      </Tooltip>
                    </Form.Item>
                  </Col>
                </Row>
              );
            }}
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ background: SF.gradientPrimary, border: 'none' }}>
              {t('arena.createTournament')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Score Modal */}
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
              <Text strong style={{ fontSize: 14 }}>
                {selectedMatch.Team1?.name || '?'} {t('arena.vs')} {selectedMatch.Team2?.name || '?'}
              </Text>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="score1" label={selectedMatch.Team1?.name || t('arena.team') + ' 1'} rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%', fontSize: 20, textAlign: 'center' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="score2" label={selectedMatch.Team2?.name || t('arena.team') + ' 2'} rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%', fontSize: 20, textAlign: 'center' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>{t('arena.submitScore')}</Button>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Register Team Modal */}
      {selectedTournament && (
        <Modal
          open={showRegisterModal}
          onCancel={() => { setShowRegisterModal(false); registerForm.resetFields(); }}
          title={<Space><TeamOutlined />{myRegistration?.isCaptain ? t('arena.manageTeam') : t('arena.registerTeam')}</Space>}
          footer={null}
          width={480}
        >
          <Form
            form={registerForm}
            layout="vertical"
            onFinish={handleRegisterTeam}
            initialValues={myRegistration?.isCaptain && myRegistration?.team ? { name: myRegistration.team.name } : {}}
          >
            <Form.Item name="name" label={t('arena.teamName')} rules={[{ required: true }]}>
              <Input placeholder={t('arena.teamName')} disabled={!!(myRegistration?.isCaptain && myRegistration?.team)} />
            </Form.Item>
            <div style={{ background: `${SF.primary}10`, borderRadius: SF.radius, padding: '8px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CrownOutlined style={{ color: SF.gold }} />
              <Text style={{ color: SF.text, fontSize: 13 }}>{t('arena.captain')} : {user?.firstName} {user?.lastName}</Text>
            </div>
            {(() => {
              const teamSize = TEAM_TYPE_SIZES[selectedTournament.teamType] || selectedTournament.playersPerTeam;
              const membersNeeded = teamSize - 1;
              if (membersNeeded <= 0) return null;
              return (
                <Form.Item
                  name="memberIds"
                  label={t('arena.selectMembers')}
                  rules={[{ required: true, type: 'array', len: membersNeeded, message: t('arena.membersRequired', { count: membersNeeded }) }]}
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>{t('arena.membersRequired', { count: membersNeeded })}</Text>}
                >
                  <Select
                    mode="multiple"
                    placeholder={t('arena.searchMember')}
                    showSearch
                    filterOption={false}
                    onSearch={(q) => fetchAvailablePlayers(selectedTournament.id, q)}
                    onFocus={() => fetchAvailablePlayers(selectedTournament.id)}
                    maxCount={membersNeeded}
                    style={{ width: '100%' }}
                    optionLabelProp="label"
                  >
                    {availablePlayers.map(p => (
                      <Select.Option key={p.id} value={p.id} label={`${p.firstName} ${p.lastName}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar size="small" src={p.avatarUrl}>{(p.firstName?.[0] || '') + (p.lastName?.[0] || '')}</Avatar>
                          <span>{p.firstName} {p.lastName}</span>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            })()}
            <Form.Item>
              <Button type="primary" htmlType="submit" block style={{ background: SF.gradientPrimary, border: 'none' }}>
                {myRegistration?.isCaptain ? t('common.save') : t('arena.registerTeam')}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* Courts Modal — Proposition intelligente */}
      <Modal
        open={showCourtsModal}
        onCancel={() => { setShowCourtsModal(false); setCourtProposal(null); }}
        title={<Space><EnvironmentOutlined />{t('arena.configureCourts')}</Space>}
        footer={courtProposal ? (() => {
          const stats = computeProposalStats(proposalCourts, courtProposal.playerCount);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: stats.playersOut === 0 ? SF.success : SF.fire }}>
                {stats.playersUsed}/{courtProposal.playerCount} {t('arena.players')}
                {stats.playersOut > 0 && ` · ${stats.playersOut} en attente`}
                {stats.playersOut < 0 && ` · ${-stats.playersOut} joueurs manquants`}
                {stats.playersOut === 0 && ` · tous placés ✓`}
              </Text>
              <Button type="primary" onClick={handleSaveCourts}>{t('common.save')}</Button>
            </div>
          );
        })() : null}
        width={560}
      >
        {/* Étape 1 : Nombre de terrains */}
        {!courtProposal && (
          <Form form={courtsForm} layout="vertical" onFinish={(v) => fetchCourtProposal(v.courtsCount)}
            initialValues={{ courtsCount: selectedTournament?.courtsCount || 4 }}>
            <div style={{ marginBottom: 12, padding: 8, background: `${SF.primary}08`, borderRadius: SF.radius }}>
              <Text style={{ fontSize: 12 }}>
                <TeamOutlined /> {selectedTournament?._count?.PlayerEntries || 0} {t('arena.players')} {t('common.registered')}
              </Text>
            </div>
            <Form.Item name="courtsCount" label={t('arena.courts')} rules={[{ required: true }]}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block icon={<ThunderboltOutlined />}>
                {t('arena.propose')}
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Étape 2 : Proposition modifiable par terrain */}
        {courtProposal && (() => {
          const stats = computeProposalStats(proposalCourts, courtProposal.playerCount);
          return (
            <div>
              {/* Récap statsn */}
              <div style={{ marginBottom: 10, padding: 8, borderRadius: SF.radius, background: stats.playersOut === 0 ? `${SF.success}15` : `${SF.fire}10`, border: `1px solid ${stats.playersOut === 0 ? SF.success : SF.fire}30` }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  <TeamOutlined /> {stats.activeCount} terrain(s) actifs ·{stats.doublettes > 0 ? ` ${stats.doublettes} doublette(s)` : ''}{stats.triplettes > 0 ? ` ${stats.triplettes} triplette(s)` : ''}{stats.idleCount > 0 ? ` · ${stats.idleCount} inactif(s)` : ''}
                </div>
                <div style={{ fontSize: 11, marginTop: 2, color: stats.playersOut === 0 ? SF.success : stats.playersOut < 0 ? SF.danger : SF.fire }}>
                  {stats.playersOut === 0 && `✓ ${stats.playersUsed}/${courtProposal.playerCount} joueurs — tous placés`}
                  {stats.playersOut > 0 && `⚠ ${stats.playersUsed}/${courtProposal.playerCount} — ${stats.playersOut} joueur(s) en attente`}
                  {stats.playersOut < 0 && `✗ Il manque ${-stats.playersOut} joueur(s) pour remplir tous les terrains actifs`}
                </div>
              </div>

              {/* Liste terrains éditables */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 320, overflowY: 'auto' }}>
                {proposalCourts.map((court, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', borderRadius: SF.radius,
                    border: `1px solid ${court.teamType === 'IDLE' ? SF.border : SF.primary}40`,
                    background: court.teamType === 'IDLE' ? `${SF.border}20` : SF.cardBg,
                    opacity: court.teamType === 'IDLE' ? 0.6 : 1,
                  }}>
                    <EnvironmentOutlined style={{ color: court.teamType === 'IDLE' ? SF.textSecondary : SF.primary }} />
                    <Text strong style={{ fontSize: 11, minWidth: 80, color: court.teamType === 'IDLE' ? SF.textSecondary : SF.text }}>
                      {court.name}
                    </Text>
                    <Select
                      size="small"
                      value={court.teamType}
                      onChange={(val) => {
                        const updated = [...proposalCourts];
                        updated[idx] = { ...updated[idx], teamType: val };
                        setProposalCourts(updated);
                      }}
                      style={{ flex: 1 }}
                    >
                      <Select.Option value="DOUBLETTE">Doublette (2v2 · 4 joueurs)</Select.Option>
                      <Select.Option value="TRIPLETTE">Triplette (3v3 · 6 joueurs)</Select.Option>
                      <Select.Option value="IDLE">Inactif (repos)</Select.Option>
                    </Select>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <Button size="small" onClick={() => setCourtProposal(null)}>{t('common.back')}</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default ArenaPanel;
