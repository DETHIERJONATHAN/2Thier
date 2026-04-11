/**
 * 🍯 NectarPanel — Fusion Flow + Universe
 * Gamification (Spark, Battles, Quests) + Social (Pulse, Events, Capsules, Orbit)
 * Replaces both FlowPanel and UniversePanel as a single unified experience.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Dropdown, Progress, Tag, Badge, Modal, Input, DatePicker, Select, Tooltip, message } from 'antd';
import {
  EyeInvisibleOutlined, TrophyOutlined,
  UserOutlined, LikeOutlined, DislikeOutlined,
  ClockCircleOutlined, StarOutlined, CheckCircleOutlined,
  TeamOutlined, CalendarOutlined,
  EnvironmentOutlined, HeartOutlined,
  LockOutlined, GiftOutlined,
  ReloadOutlined, MoreOutlined,
} from '@ant-design/icons';
import { SF } from './ZhiiveTheme';
import { useZhiiveNav } from '../../contexts/ZhiiveNavContext';
import { useAuth } from '../../auth/useAuth';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';
import { useSocialIdentity } from '../../contexts/SocialIdentityContext';
import ZhiiveModuleHeader from './ZhiiveModuleHeader';

// ── Types ──
interface SparkPost {
  id: string; content: string; sparkCount: number; revealThreshold: number;
  isRevealed: boolean; authorName?: string; authorAvatar?: string;
  createdAt: string; hasVoted: boolean;
}
interface BattleData {
  id: string; title: string; description: string; status: string;
  challengerName: string; challengerAvatar?: string;
  opponentName?: string; opponentAvatar?: string;
  endsAt: string; entriesCount: number;
}
interface QuestData {
  id: string; title: string; description: string; type: string;
  rewardPoints: number; progress: number; maxProgress: number; expiresAt?: string;
}
interface SocialEventData {
  id: string; title: string; description: string;
  type: 'MEETUP' | 'WORKSHOP' | 'JOB_FAIR' | 'OPEN_DAY' | 'OTHER';
  location?: string; startDate: string; endDate?: string;
  attendeesCount: number; maxAttendees?: number;
  organizerName: string; organizerAvatar?: string; coverImage?: string;
  isAttending?: boolean;
}
interface TimeCapsuleData {
  id: string; content: string; creatorName: string; creatorAvatar?: string;
  unlocksAt: string; isUnlocked: boolean; recipientName?: string;
}
interface OrbitFriend {
  id: string; name: string; avatarUrl?: string;
  interactionScore: number; lastInteraction: string; online: boolean;
}

type NectarSection = 'spark' | 'battles' | 'quests' | 'pulse' | 'events' | 'capsules' | 'orbit';

interface NectarPanelProps { api: any; currentUser?: any; }

// ── Empty state component ──
const EmptyState: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ fontSize: 40 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: SF.text, marginTop: 12 }}>{title}</div>
    <div style={{ fontSize: 12, color: SF.textSecondary, marginTop: 4 }}>{subtitle}</div>
  </div>
);

const NectarPanel: React.FC<NectarPanelProps> = ({ api, currentUser }) => {
  const { t, i18n } = useTranslation();
  const { feedMode } = useZhiiveNav();
  const { currentOrganization } = useAuth();
  const identity = useActiveIdentity();
  const { isAppEnabled } = useSocialIdentity();
  const { isOrgMode, organization: identityOrg } = identity;
  const orgLogo = identityOrg?.logoUrl || null;

  const [activeSection, setActiveSection] = useState<NectarSection>('spark');

  // ── Flow data ──
  const [sparks, setSparks] = useState<SparkPost[]>([]);
  const [battles, setBattles] = useState<BattleData[]>([]);
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [flowLoading, setFlowLoading] = useState(true);

  // ── Universe data ──
  const [events, setEvents] = useState<SocialEventData[]>([]);
  const [capsules, setCapsules] = useState<TimeCapsuleData[]>([]);
  const [orbitFriends, setOrbitFriends] = useState<OrbitFriend[]>([]);
  const [universeLoading, setUniverseLoading] = useState(true);
  const [rsvpSet, setRsvpSet] = useState<Set<string>>(new Set());
  const [pulseMetrics, setPulseMetrics] = useState({ positive: 0, active: 0, creative: 0, social: 0 });
  const pulseCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Spark modals ──
  const [sparkModalOpen, setSparkModalOpen] = useState(false);
  const [sparkContent, setSparkContent] = useState('');
  const [sparkSubmitting, setSparkSubmitting] = useState(false);
  const [sparkVisibility, setSparkVisibility] = useState<'IN' | 'ALL' | 'OUT'>(currentOrganization ? 'IN' : 'ALL');

  // ── Battle modal ──
  const [battleModalOpen, setBattleModalOpen] = useState(false);
  const [battleTitle, setBattleTitle] = useState('');
  const [battleDesc, setBattleDesc] = useState('');
  const [battleEndsAt, setBattleEndsAt] = useState<any>(null);
  const [battleSubmitting, setBattleSubmitting] = useState(false);

  // ── Event modal ──
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('meetup');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartDate, setEventStartDate] = useState<any>(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventVisibility, setEventVisibility] = useState<string>(currentOrganization ? 'IN' : 'ALL');

  // ── Capsule modal ──
  const [capsuleModalOpen, setCapsuleModalOpen] = useState(false);
  const [capsuleContent, setCapsuleContent] = useState('');
  const [capsuleUnlocksAt, setCapsuleUnlocksAt] = useState<any>(null);
  const [capsuleSubmitting, setCapsuleSubmitting] = useState(false);

  // Sync visibility
  useEffect(() => {
    setSparkVisibility(currentOrganization ? 'IN' : 'ALL');
    setEventVisibility(currentOrganization ? 'IN' : 'ALL');
  }, [currentOrganization]);

  // ── Fetch Flow data ──
  const fetchFlow = useCallback(async () => {
    try {
      setFlowLoading(true);
      const [sparksRes, battlesRes, questsRes] = await Promise.all([
        api.get(`/api/zhiive/sparks?limit=20&mode=${feedMode}`).catch(() => ({ sparks: [] })),
        api.get(`/api/zhiive/battles?limit=10&mode=${feedMode}`).catch(() => ({ battles: [] })),
        api.get(`/api/zhiive/quests/available?mode=${feedMode}`).catch(() => ({ quests: [] })),
      ]);
      if (sparksRes?.sparks) setSparks(sparksRes.sparks);
      if (battlesRes?.battles) setBattles(battlesRes.battles);
      if (questsRes?.quests) setQuests(questsRes.quests);
    } catch { /* non-blocking */ } finally { setFlowLoading(false); }
  }, [api, feedMode]);

  // ── Fetch Universe data ──
  const fetchUniverse = useCallback(async () => {
    try {
      setUniverseLoading(true);
      const [eventsRes, capsulesRes, orbitRes, pulseRes] = await Promise.all([
        api.get(`/api/zhiive/events?limit=10&mode=${feedMode}`).catch(() => ({ events: [] })),
        api.get(`/api/zhiive/capsules?limit=10&mode=${feedMode}`).catch(() => ({ capsules: [] })),
        api.get(`/api/zhiive/orbit?mode=${feedMode}`).catch(() => ({ friends: [] })),
        api.get(`/api/zhiive/pulse?mode=${feedMode}`).catch(() => null),
      ]);
      if (eventsRes?.events) {
        setEvents(eventsRes.events);
        const attending = new Set<string>();
        eventsRes.events.forEach((e: any) => { if (e.isAttending) attending.add(e.id); });
        setRsvpSet(attending);
      }
      if (capsulesRes?.capsules) setCapsules(capsulesRes.capsules);
      if (orbitRes?.friends) setOrbitFriends(orbitRes.friends);
      if (pulseRes) setPulseMetrics({ positive: pulseRes.positive ?? 50, active: pulseRes.active ?? 30, creative: pulseRes.creative ?? 20, social: pulseRes.social ?? 40 });
    } catch { /* non-blocking */ } finally { setUniverseLoading(false); }
  }, [api, feedMode]);

  useEffect(() => { fetchFlow(); }, [fetchFlow]);
  useEffect(() => { fetchUniverse(); }, [fetchUniverse]);

  // ── SPARK ACTIONS ──
  const handleCreateSpark = async () => {
    if (!sparkContent.trim()) return;
    setSparkSubmitting(true);
    try {
      await api.post('/api/zhiive/sparks', { content: sparkContent.trim(), visibility: sparkVisibility, publishAsOrg: identity.publishAsOrg });
      message.success(t('flow.sparkPosted'));
      setSparkContent(''); setSparkModalOpen(false); fetchFlow();
    } catch { message.error(t('flow.sparkError')); } finally { setSparkSubmitting(false); }
  };

  const handleVoteSpark = async (sparkId: string) => {
    setSparks(prev => prev.map(s => s.id === sparkId ? { ...s, hasVoted: true, sparkCount: s.sparkCount + 1 } : s));
    try {
      const res = await api.post(`/api/zhiive/sparks/${sparkId}/vote`);
      setSparks(prev => prev.map(s => s.id === sparkId ? { ...s, sparkCount: res.sparkCount ?? s.sparkCount, isRevealed: res.isRevealed ?? s.isRevealed, hasVoted: true } : s));
      message.success(t('flow.voteRecorded'));
    } catch {
      setSparks(prev => prev.map(s => s.id === sparkId ? { ...s, hasVoted: false, sparkCount: s.sparkCount - 1 } : s));
      message.warning(t('flow.alreadyVoted'));
    }
  };

  // ── BATTLE ACTIONS ──
  const handleCreateBattle = async () => {
    if (!battleTitle.trim()) return;
    setBattleSubmitting(true);
    try {
      await api.post('/api/zhiive/battles', { title: battleTitle.trim(), description: battleDesc.trim(), endsAt: battleEndsAt?.toISOString(), publishAsOrg: identity.publishAsOrg });
      message.success(t('flow.battleCreated'));
      setBattleTitle(''); setBattleDesc(''); setBattleEndsAt(null); setBattleModalOpen(false); fetchFlow();
    } catch { message.error(t('flow.battleError')); } finally { setBattleSubmitting(false); }
  };

  const handleJoinBattle = async (battleId: string) => {
    try { await api.post(`/api/zhiive/battles/${battleId}/join`); message.success(t('flow.challengeAccepted')); fetchFlow(); }
    catch { message.warning(t('flow.unableToJoin')); }
  };

  // ── EVENT ACTIONS ──
  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventStartDate) return;
    setEventSubmitting(true);
    try {
      await api.post('/api/zhiive/events', { title: eventTitle.trim(), description: eventDesc.trim(), type: eventType, location: eventLocation.trim(), startDate: eventStartDate.toISOString(), visibility: eventVisibility, publishAsOrg: identity.publishAsOrg });
      message.success(t('universe.eventCreated'));
      setEventTitle(''); setEventDesc(''); setEventLocation(''); setEventStartDate(null); setEventModalOpen(false); fetchUniverse();
    } catch { message.error(t('universe.creationFailed')); } finally { setEventSubmitting(false); }
  };

  const handleRSVP = async (eventId: string) => {
    try {
      if (rsvpSet.has(eventId)) {
        await api.delete(`/api/zhiive/events/${eventId}/rsvp`);
        setRsvpSet(prev => { const next = new Set(prev); next.delete(eventId); return next; });
        message.success(t('universe.rsvpCancelled'));
      } else {
        await api.post(`/api/zhiive/events/${eventId}/rsvp`, { status: 'going' });
        setRsvpSet(prev => new Set(prev).add(eventId));
        message.success(t('universe.attendanceConfirmed'));
      }
    } catch { message.error(t('universe.rsvpFailed')); }
  };

  // ── CAPSULE ACTIONS ──
  const handleCreateCapsule = async () => {
    if (!capsuleContent.trim() || !capsuleUnlocksAt) return;
    setCapsuleSubmitting(true);
    try {
      await api.post('/api/zhiive/capsules', { content: capsuleContent.trim(), unlocksAt: capsuleUnlocksAt.toISOString(), publishAsOrg: identity.publishAsOrg });
      message.success(t('universe.capsuleSealed'));
      setCapsuleContent(''); setCapsuleUnlocksAt(null); setCapsuleModalOpen(false); fetchUniverse();
    } catch { message.error(t('universe.creationFailed')); } finally { setCapsuleSubmitting(false); }
  };

  const handleOpenCapsule = (capsule: TimeCapsuleData) => {
    Modal.info({
      title: t('universe.capsuleOpened'),
      content: (<div style={{ marginTop: 12 }}><p style={{ color: SF.textSecondary, marginBottom: 8 }}>{t('universe.from', { name: capsule.creatorName })}</p><div style={{ padding: 16, background: SF.bg, borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>{capsule.content || t('universe.emptyContent')}</div></div>),
      okText: t('common.close'), width: 400,
    });
  };

  // ── Pulse canvas animation ──
  useEffect(() => {
    if (activeSection !== 'pulse') return;
    const canvas = pulseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);
    let animFrame: number; let time = 0;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string }[] = [];
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      particles.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, r: 1.5 + Math.random() * 2.5, color: [SF.primary, SF.secondary, SF.accent, SF.gold][Math.floor(Math.random() * 4)] });
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h); time += 0.008;
      const pulseR = 35 + Math.sin(time * 2) * 8;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 1.5);
      gradient.addColorStop(0, SF.primary + 'CC'); gradient.addColorStop(0.5, SF.accent + '66'); gradient.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, pulseR * 1.5, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, pulseR * 0.6, 0, Math.PI * 2); ctx.fillStyle = SF.primary; ctx.fill();
      particles.forEach(p => { const dx = p.x - cx, dy = p.y - cy; const dist = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx) + 0.005; p.x = cx + Math.cos(angle) * dist + p.vx; p.y = cy + Math.sin(angle) * dist + p.vy; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + Math.sin(time + dist * 0.05) * 0.5, 0, Math.PI * 2); ctx.fillStyle = p.color + '99'; ctx.fill(); });
      ctx.fillStyle = 'white'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PULSE', cx, cy + 4);
      animFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [activeSection]);

  // ── Helpers ──
  const getQuestTypeStyle = (type: string) => {
    const styles: Record<string, { bg: string; label: string; emoji: string }> = {
      DAILY: { bg: SF.gradientSecondary, label: t('flow.daily'), emoji: '☀️' },
      WEEKLY: { bg: SF.gradientPrimary, label: t('flow.weekly'), emoji: '📅' },
      MONTHLY: { bg: SF.gradientHot, label: t('flow.monthly'), emoji: '🏆' },
      SPECIAL: { bg: SF.gradientGold, label: t('flow.special'), emoji: '⭐' },
    };
    return styles[type] || styles.DAILY;
  };

  const getBattleStatusTag = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      OPEN: { color: 'green', label: t('flow.statusOpen') },
      ACTIVE: { color: 'blue', label: t('flow.statusActive') },
      VOTING: { color: 'orange', label: t('flow.statusVoting') },
      ENDED: { color: 'default', label: t('flow.statusEnded') },
    };
    return map[status] || map.OPEN;
  };

  const getEventTypeEmoji = (type: string) => {
    const map: Record<string, string> = { MEETUP: '🤝', WORKSHOP: '🎓', JOB_FAIR: '💼', OPEN_DAY: '🏠', OTHER: '📅' };
    return map[type] || '📅';
  };

  // Visibility selector (shared)
  const renderVisibilitySelector = (value: string, onChange: (v: string) => void) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {(currentOrganization ? ['IN', 'ALL', 'OUT'] : ['ALL', 'OUT']).map(v => {
        const labels: Record<string, { icon: string; label: string; color: string }> = {
          IN: { icon: '⬡', label: 'Colony', color: SF.scopeColony },
          ALL: { icon: '🌐', label: 'Public', color: SF.scopePublic },
          OUT: { icon: '🔒', label: 'Private', color: SF.scopePrivate },
        };
        const opt = labels[v]; const active = value === v;
        return (
          <div key={v} onClick={() => onChange(v)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
            borderRadius: 14, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: active ? opt.color + '18' : SF.bgLighter,
            color: active ? opt.color : SF.textPlaceholder,
            border: active ? `1px solid ${opt.color}` : '1px solid transparent',
            transition: 'all 0.15s',
          }}>
            <span>{opt.icon}</span> <span>{opt.label}</span>
          </div>
        );
      })}
    </div>
  );

  // Map NectarSection key → isAppEnabled key
  const SECTION_TO_APP: Record<NectarSection, string> = {
    spark: 'sparks', battles: 'battles', quests: 'quests',
    pulse: 'pulse', events: 'events', capsules: 'capsules', orbit: 'orbit',
  };

  const sections: { key: NectarSection; label: string; icon: string; color: string }[] = [
    { key: 'spark', label: t('flow.spark'), icon: '⚡', color: SF.gold },
    { key: 'battles', label: t('flow.battles'), icon: '⚔️', color: SF.accent },
    { key: 'quests', label: t('flow.quests'), icon: '🎯', color: SF.success },
    { key: 'pulse', label: t('flow.pulse'), icon: '💫', color: SF.primary },
    { key: 'events', label: t('universe.events'), icon: '📅', color: SF.secondary },
    { key: 'capsules', label: t('universe.capsules'), icon: '⏳', color: SF.gold },
    { key: 'orbit', label: t('universe.orbit'), icon: '🪐', color: SF.accent },
  ].filter(sec => isAppEnabled(SECTION_TO_APP[sec.key]));

  const isFlowSection = activeSection === 'spark' || activeSection === 'battles' || activeSection === 'quests';
  const loading = isFlowSection ? flowLoading : universeLoading;
  const handleRefresh = useCallback(() => {
    fetchFlow();
    fetchUniverse();
  }, [fetchFlow, fetchUniverse]);

  const sectionMenuItems = [
    { key: 'spark', label: t('flow.spark') },
    { key: 'battles', label: t('flow.battles') },
    { key: 'quests', label: t('flow.quests') },
    { key: 'pulse', label: t('flow.pulse') },
    { key: 'events', label: t('universe.events') },
    { key: 'capsules', label: t('universe.capsules') },
    { key: 'orbit', label: t('universe.orbit') },
  ].filter(item => isAppEnabled(SECTION_TO_APP[item.key as NectarSection]));

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', background: SF.bg, display: 'flex', flexDirection: 'column' as const, width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <ZhiiveModuleHeader
        icon="🍯"
        title={t('nectar')}
        actions={(
          <>
            <Tooltip title={t('common.refresh')}>
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={handleRefresh} />
            </Tooltip>
            <Dropdown
              menu={{
                items: sectionMenuItems,
                onClick: ({ key }) => setActiveSection(key as NectarSection),
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </>
        )}
      />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 12px', scrollbarWidth: 'none', minWidth: 0 }}>
      {/* Section tabs — icon-only with tooltips */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2, maxWidth: '100%', flexWrap: 'nowrap' }}>
        {sections.map(sec => (
          <Tooltip key={sec.key} title={sec.label} placement="bottom">
            <div onClick={() => setActiveSection(sec.key)} style={{
              flexShrink: 0, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', borderRadius: SF.radiusSm, fontSize: 16,
              transition: 'all 0.25s',
              background: activeSection === sec.key ? sec.color + '18' : SF.cardBg,
              color: activeSection === sec.key ? sec.color : SF.textSecondary,
              boxShadow: activeSection === sec.key ? `0 2px 8px ${sec.color}30` : SF.shadow,
              border: activeSection === sec.key ? `1.5px solid ${sec.color}40` : '1.5px solid transparent',
            }}>
              {sec.icon}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Loading */}
      {loading && activeSection !== 'pulse' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>🍯</div>
          <div style={{ fontSize: 12, color: SF.textMuted }}>{t('common.loading')}</div>
        </div>
      )}

      {/* ═══ SPARK ═══ */}
      {!loading && activeSection === 'spark' && (
        <div>
          <div style={{ background: SF.cardBg, borderRadius: SF.radius, padding: 16, marginBottom: 12, boxShadow: SF.shadow, textAlign: 'center' }}>
            <EyeInvisibleOutlined style={{ fontSize: 28, color: SF.gold }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginTop: 6 }}>{t('flow.postAnonymously')}</div>
            <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 2, marginBottom: 10 }}>{t('flow.revealAt100')}</div>
            <div onClick={() => setSparkModalOpen(true)} style={{ padding: '8px 20px', borderRadius: 20, display: 'inline-block', background: SF.gradientGold, color: SF.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('flow.createSpark')}</div>
          </div>
          <Modal open={sparkModalOpen} onCancel={() => setSparkModalOpen(false)} onOk={handleCreateSpark} confirmLoading={sparkSubmitting} title={t('flow.newSpark')} okText={t('flow.buzzIt')} cancelText={t('common.cancel')}>
            <Input.TextArea value={sparkContent} onChange={e => setSparkContent(e.target.value)} placeholder={t('flow.sparkFullPlaceholder')} maxLength={3000} rows={4} showCount style={{ marginTop: 8 }} />
            <div style={{ marginTop: 10 }}>{renderVisibilitySelector(sparkVisibility, v => setSparkVisibility(v as any))}</div>
          </Modal>
          {sparks.length > 0 ? sparks.map(spark => (
            <div key={spark.id} style={{ background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8, boxShadow: SF.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar size={36} style={{ background: spark.isRevealed ? SF.primary : SF.gradientDark }}>{spark.isRevealed ? (spark.authorName?.[0] || '?') : '?'}</Avatar>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: SF.text }}>{spark.isRevealed ? spark.authorName : t('flow.anonymous')}</div>
                  <div style={{ fontSize: 10, color: SF.textMuted }}>{spark.isRevealed ? t('flow.identityRevealed') : `⚡ ${spark.sparkCount}/${spark.revealThreshold} votes`}</div>
                </div>
                {!spark.isRevealed && <Progress type="circle" percent={Math.round((spark.sparkCount / spark.revealThreshold) * 100)} size={32} strokeColor={SF.gold} trailColor={SF.border} format={p => `${p}%`} style={{ marginLeft: 'auto' }} />}
              </div>
              <div style={{ fontSize: 14, color: SF.text, lineHeight: 1.5, marginBottom: 10 }}>{spark.content}</div>
              {!spark.isRevealed && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div onClick={() => !spark.hasVoted && handleVoteSpark(spark.id)} style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 20, background: spark.hasVoted ? SF.success + '20' : SF.bg, color: spark.hasVoted ? SF.success : SF.textSecondary, cursor: spark.hasVoted ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: spark.hasVoted ? 0.7 : 1 }}><LikeOutlined /> {spark.hasVoted ? t('flow.voted') : t('flow.vote')}</div>
                  <div onClick={async () => { setSparks(prev => prev.filter(s => s.id !== spark.id)); try { await api.post(`/api/zhiive/sparks/${spark.id}/dismiss`); } catch { /* ignore */ } }} style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 20, background: SF.bg, color: SF.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><DislikeOutlined /> {t('flow.skip')}</div>
                </div>
              )}
            </div>
          )) : <EmptyState icon="⚡" title={t('flow.noSparks')} subtitle={t('flow.beFirstSpark')} />}
        </div>
      )}

      {/* ═══ BATTLES ═══ */}
      {!loading && activeSection === 'battles' && (
        <div>
          <div style={{ background: SF.gradientHot, borderRadius: SF.radius, padding: 16, marginBottom: 12, textAlign: 'center', color: 'white' }}>
            <TrophyOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{t('flow.launchBattle')}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, marginBottom: 10 }}>{t('flow.challengeSomeone')}</div>
            <div onClick={() => setBattleModalOpen(true)} style={{ padding: '8px 20px', borderRadius: 20, display: 'inline-block', background: SF.overlayLight, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('flow.launchBattleBtn')}</div>
          </div>
          <Modal open={battleModalOpen} onCancel={() => setBattleModalOpen(false)} onOk={handleCreateBattle} confirmLoading={battleSubmitting} title={t('flow.newBattle')} okText={t('common.launch')} cancelText={t('common.cancel')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Input value={battleTitle} onChange={e => setBattleTitle(e.target.value)} placeholder={t('flow.battleTitlePlaceholder')} maxLength={200} />
              <Input.TextArea value={battleDesc} onChange={e => setBattleDesc(e.target.value)} placeholder={t('flow.battleDescPlaceholder')} rows={3} />
              <DatePicker value={battleEndsAt} onChange={setBattleEndsAt} showTime placeholder={t('flow.endDatePlaceholder')} style={{ width: '100%' }} />
            </div>
          </Modal>
          {battles.length > 0 ? battles.map(battle => {
            const statusTag = getBattleStatusTag(battle.status);
            return (
              <div key={battle.id} style={{ background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8, boxShadow: SF.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: SF.text }}>{battle.title}</div>
                  <Tag color={statusTag.color} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{statusTag.label}</Tag>
                </div>
                <div style={{ fontSize: 11, color: SF.textSecondary, marginBottom: 10 }}>{battle.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar size={40} src={battle.challengerAvatar} icon={!battle.challengerAvatar ? <UserOutlined /> : undefined} style={{ background: !battle.challengerAvatar ? SF.primary : undefined }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: SF.text, marginTop: 4 }}>{battle.challengerName}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: SF.accent, background: SF.gradientHot, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VS</div>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar size={40} src={battle.opponentAvatar} icon={!battle.opponentAvatar ? <UserOutlined /> : undefined} style={{ background: !battle.opponentAvatar ? SF.textMuted : undefined }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: SF.text, marginTop: 4 }}>{battle.opponentName || '???'}</div>
                  </div>
                </div>
                {battle.status === 'OPEN' && <div onClick={() => handleJoinBattle(battle.id)} style={{ marginTop: 8, padding: '6px 0', textAlign: 'center', borderRadius: 20, background: SF.gradientHot, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{t('flow.takeChallenge')}</div>}
              </div>
            );
          }) : <EmptyState icon="⚔️" title={t('flow.noBattles')} subtitle={t('flow.launchFirst')} />}
        </div>
      )}

      {/* ═══ QUESTS ═══ */}
      {!loading && activeSection === 'quests' && (
        <div>
          <div style={{ background: SF.gradientPrimary, borderRadius: SF.radius, padding: 16, marginBottom: 12, textAlign: 'center', color: 'white' }}>
            <StarOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{t('flow.zhiiveQuests')}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{t('flow.completeMissions')}</div>
          </div>
          {quests.length > 0 ? quests.map(quest => {
            const typeStyle = getQuestTypeStyle(quest.type);
            const pct = Math.round((quest.progress / quest.maxProgress) * 100);
            return (
              <div key={quest.id} style={{ background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8, boxShadow: SF.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: SF.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center', background: typeStyle.bg, fontSize: 18 }}>{typeStyle.emoji}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: SF.text }}>{quest.title}</div><div style={{ fontSize: 11, color: SF.textSecondary }}>{quest.description}</div></div>
                  <Badge count={`+${quest.rewardPoints}`} style={{ background: SF.gold, color: SF.text, fontWeight: 700, fontSize: 10 }} />
                </div>
                <Progress percent={pct} size="small" strokeColor={pct >= 100 ? SF.success : SF.primary} trailColor={SF.border} format={() => `${quest.progress}/${quest.maxProgress}`} />
                {pct < 100 && <button onClick={async () => { try { await api.post(`/api/zhiive/quests/${quest.id}/progress`); setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, progress: Math.min(q.progress + 1, q.maxProgress) } : q)); message.success(t('flow.questProgress')); } catch { message.error(t('flow.questError')); } }} style={{ marginTop: 8, width: '100%', padding: '6px 0', border: 'none', borderRadius: SF.radiusSm, background: SF.primary, color: SF.textLight, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}><CheckCircleOutlined /> {t('flow.completeStep')}</button>}
                {pct >= 100 && <div style={{ marginTop: 6, fontSize: 11, color: SF.success, fontWeight: 600 }}><CheckCircleOutlined /> {t('flow.questCompleted')}</div>}
                {quest.expiresAt && <div style={{ fontSize: 10, color: SF.textMuted, marginTop: 4 }}><ClockCircleOutlined /> {t('flow.expires', { date: new Date(quest.expiresAt).toLocaleDateString(i18n.language) })}</div>}
              </div>
            );
          }) : <EmptyState icon="🎯" title={t('flow.noQuests')} subtitle={t('flow.checkBackSoon')} />}
        </div>
      )}

      {/* ═══ PULSE ═══ */}
      {activeSection === 'pulse' && (
        <div>
          <div style={{ background: SF.dark, borderRadius: SF.radius, overflow: 'hidden', boxShadow: SF.shadowMd, marginBottom: 12 }}>
            <canvas ref={pulseCanvasRef} style={{ width: '100%', height: 250, display: 'block' }} />
          </div>
          <div style={{ background: SF.cardBg, borderRadius: SF.radius, padding: 14, boxShadow: SF.shadow, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginBottom: 8 }}>{t('universe.communityEnergy')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { emoji: '😊', label: t('universe.positive'), pct: pulseMetrics.positive, color: SF.success },
                { emoji: '🔥', label: t('universe.active'), pct: pulseMetrics.active, color: SF.fire },
                { emoji: '💡', label: t('universe.creative'), pct: pulseMetrics.creative, color: SF.gold },
                { emoji: '🤝', label: t('universe.social'), pct: pulseMetrics.social, color: SF.primary },
              ].map(m => (
                <div key={m.label} style={{ flex: '1 0 45%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: SF.radiusSm, background: SF.bg }}>
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: SF.text }}>{m.label}</div><div style={{ height: 4, borderRadius: 2, background: SF.border, marginTop: 2 }}><div style={{ height: '100%', borderRadius: 2, background: m.color, width: `${m.pct}%`, transition: 'width 1s' }} /></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ EVENTS ═══ */}
      {!universeLoading && activeSection === 'events' && (
        <div>
          <div style={{ background: SF.gradientSecondary, borderRadius: SF.radius, padding: 16, marginBottom: 12, textAlign: 'center', color: 'white' }}>
            <CalendarOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{t('universe.createEvent')}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, marginBottom: 8 }}>{t('universe.meetupsWorkshops')}</div>
            <div onClick={() => setEventModalOpen(true)} style={{ padding: '6px 18px', borderRadius: 20, display: 'inline-block', background: SF.overlayLight, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📅 {t('common.create')}</div>
          </div>
          <Modal open={eventModalOpen} onCancel={() => setEventModalOpen(false)} onOk={handleCreateEvent} confirmLoading={eventSubmitting} title={t('universe.createEvent')} okText={t('common.create')} cancelText={t('common.cancel')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder={t('universe.eventTitle')} />
              <Input.TextArea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder={t('universe.description')} rows={3} />
              <Select value={eventType} onChange={setEventType} style={{ width: '100%' }} options={[
                { value: 'meetup', label: t('universe.meetup') }, { value: 'workshop', label: t('universe.workshop') },
                { value: 'jobfair', label: t('universe.jobFair') }, { value: 'openday', label: t('universe.openDay') }, { value: 'other', label: t('universe.other') },
              ]} />
              <Input value={eventLocation} onChange={e => setEventLocation(e.target.value)} prefix={<EnvironmentOutlined />} placeholder={t('universe.location')} />
              <DatePicker value={eventStartDate} onChange={setEventStartDate} showTime placeholder={t('universe.dateTime')} style={{ width: '100%' }} />
              {renderVisibilitySelector(eventVisibility, setEventVisibility)}
            </div>
          </Modal>
          {events.length > 0 ? events.map(event => (
            <div key={event.id} style={{ background: SF.cardBg, borderRadius: SF.radius, overflow: 'hidden', marginBottom: 8, boxShadow: SF.shadow }}>
              {event.coverImage && <img src={event.coverImage} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />}
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{getEventTypeEmoji(event.type)}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: SF.text }}>{event.title}</div><div style={{ fontSize: 11, color: SF.textSecondary }}>{t('universe.by', { name: event.organizerName })}</div></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: SF.textSecondary, marginBottom: 8 }}>
                  <div><ClockCircleOutlined /> {new Date(event.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  {event.location && <div><EnvironmentOutlined /> {event.location}</div>}
                  <div><TeamOutlined /> {t('universe.attendees', { count: event.attendeesCount })}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</div>
                </div>
                <div onClick={() => handleRSVP(event.id)} style={{ padding: '6px 0', textAlign: 'center', borderRadius: 20, background: rsvpSet.has(event.id) ? SF.success + '20' : SF.gradientSecondary, color: rsvpSet.has(event.id) ? SF.success : 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{rsvpSet.has(event.id) ? t('universe.going') : t('universe.attend')}</div>
              </div>
            </div>
          )) : <EmptyState icon="📅" title={t('universe.noEvents')} subtitle={t('universe.hostFirstEvent')} />}
        </div>
      )}

      {/* ═══ CAPSULES ═══ */}
      {!universeLoading && activeSection === 'capsules' && (
        <div>
          <div style={{ background: SF.gradientGold, borderRadius: SF.radius, padding: 16, marginBottom: 12, textAlign: 'center' }}>
            <LockOutlined style={{ fontSize: 28, color: SF.text }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginTop: 6 }}>{t('universe.timeCapsule')}</div>
            <div style={{ fontSize: 11, color: SF.text, opacity: 0.7, marginTop: 2, marginBottom: 8 }}>{t('universe.sendToFuture')}</div>
            <div onClick={() => setCapsuleModalOpen(true)} style={{ padding: '6px 18px', borderRadius: 20, display: 'inline-block', background: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: SF.text }}>{t('universe.createCapsule')}</div>
          </div>
          <Modal open={capsuleModalOpen} onCancel={() => setCapsuleModalOpen(false)} onOk={handleCreateCapsule} confirmLoading={capsuleSubmitting} title={t('universe.newTimeCapsule')} okText={t('universe.seal')} cancelText={t('common.cancel')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Input.TextArea value={capsuleContent} onChange={e => setCapsuleContent(e.target.value)} placeholder={t('universe.futureMessage')} rows={4} maxLength={5000} showCount />
              <DatePicker value={capsuleUnlocksAt} onChange={setCapsuleUnlocksAt} placeholder={t('universe.unlockDate')} style={{ width: '100%' }} />
            </div>
          </Modal>
          {capsules.length > 0 ? capsules.map(cap => {
            const daysLeft = Math.max(0, Math.ceil((new Date(cap.unlocksAt).getTime() - Date.now()) / 86400000));
            return (
              <div key={cap.id} style={{ background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8, boxShadow: SF.shadow, border: cap.isUnlocked ? `1.5px solid ${SF.gold}` : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cap.isUnlocked ? SF.gradientGold : SF.bg, fontSize: 20 }}>{cap.isUnlocked ? '🎁' : '🔒'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: SF.text }}>{cap.content ? (cap.content.length > 40 ? cap.content.substring(0, 40) + '...' : cap.content) : t('universe.mysteryCapsule')}</div>
                    <div style={{ fontSize: 11, color: SF.textSecondary }}>{t('universe.from', { name: cap.creatorName })}{cap.recipientName && ` → ${cap.recipientName}`}</div>
                    <div style={{ fontSize: 10, color: cap.isUnlocked ? SF.gold : SF.textMuted, marginTop: 2 }}>{cap.isUnlocked ? t('universe.unlocked') : t('universe.unlocksIn', { days: daysLeft })}</div>
                  </div>
                </div>
                {cap.isUnlocked && <div onClick={() => handleOpenCapsule(cap)} style={{ marginTop: 8, padding: '6px 0', textAlign: 'center', borderRadius: 20, background: SF.gradientGold, color: SF.text, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}><GiftOutlined /> {t('universe.openCapsule')}</div>}
              </div>
            );
          }) : <EmptyState icon="⏳" title={t('universe.noCapsules')} subtitle={t('universe.createCapsuleHint')} />}
        </div>
      )}

      {/* ═══ ORBIT ═══ */}
      {!universeLoading && activeSection === 'orbit' && (
        <div>
          <div style={{ background: SF.dark, borderRadius: SF.radius, padding: 20, marginBottom: 12, boxShadow: SF.shadowMd, textAlign: 'center', minHeight: 200, position: 'relative', overflow: 'hidden' }}>
            <Avatar size={48} src={isOrgMode ? (orgLogo || undefined) : (currentUser?.avatarUrl || undefined)} icon={!isOrgMode && !currentUser?.avatarUrl ? <UserOutlined /> : undefined} style={{ background: isOrgMode ? (orgLogo ? 'transparent' : SF.primary) : (!currentUser?.avatarUrl ? SF.primary : undefined), border: `2px solid ${SF.primary}`, position: 'relative', zIndex: 2 }}>{isOrgMode && !orgLogo && (identityOrg?.name?.[0]?.toUpperCase() || 'O')}</Avatar>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginTop: 4 }}>{isOrgMode ? identityOrg?.name : t('universe.you')}</div>
            {orbitFriends.slice(0, 8).map((f, i) => {
              const angle = (i / Math.min(orbitFriends.length, 8)) * Math.PI * 2 - Math.PI / 2;
              const radius = 60 + (100 - f.interactionScore) * 0.8;
              const x = 50 + Math.cos(angle) * (radius / 3);
              const y = 50 + Math.sin(angle) * (radius / 3);
              const size = 24 + (f.interactionScore / 100) * 12;
              return (<div key={f.id} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}><Avatar size={size} src={f.avatarUrl} icon={!f.avatarUrl ? <UserOutlined /> : undefined} style={{ background: !f.avatarUrl ? SF.accent : undefined, border: f.online ? `2px solid ${SF.success}` : `1px solid ${SF.textMuted}`, cursor: 'pointer' }} /></div>);
            })}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: SF.text, marginBottom: 8 }}>{t('universe.yourConstellation', { count: orbitFriends.length })}</div>
          {orbitFriends.length > 0 ? orbitFriends.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: SF.cardBg, borderRadius: SF.radiusSm, marginBottom: 4, boxShadow: SF.shadow, cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <Avatar size={36} src={f.avatarUrl} icon={!f.avatarUrl ? <UserOutlined /> : undefined} style={{ background: !f.avatarUrl ? SF.primary : undefined }} />
                {f.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: SF.success, border: '2px solid white' }} />}
              </div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: SF.text }}>{f.name}</div><div style={{ fontSize: 10, color: SF.textMuted }}>{t('universe.proximity', { score: f.interactionScore })}</div></div>
              <HeartOutlined style={{ color: SF.accent, fontSize: 14 }} />
            </div>
          )) : <EmptyState icon="🪐" title={t('universe.orbitEmpty')} subtitle={t('universe.addFriendsHint')} />}
        </div>
      )}
    </div>
    </div>
  );
};

export default NectarPanel;
