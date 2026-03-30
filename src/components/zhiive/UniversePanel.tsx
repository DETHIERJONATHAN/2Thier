import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, Modal, Input, DatePicker, Select, message } from 'antd';
import {
  TeamOutlined, CalendarOutlined, UserOutlined,
  EnvironmentOutlined, ClockCircleOutlined, HeartOutlined,
  LockOutlined, GiftOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SF } from './ZhiiveTheme';
import { useZhiiveNav } from '../../contexts/ZhiiveNavContext';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';

interface SocialEventData {
  id: string;
  title: string;
  description: string;
  type: 'MEETUP' | 'WORKSHOP' | 'JOB_FAIR' | 'OPEN_DAY' | 'OTHER';
  location?: string;
  startDate: string;
  endDate?: string;
  attendeesCount: number;
  maxAttendees?: number;
  organizerName: string;
  organizerAvatar?: string;
  coverImage?: string;
}

interface TimeCapsuleData {
  id: string;
  content: string;
  creatorName: string;
  creatorAvatar?: string;
  unlocksAt: string;
  isUnlocked: boolean;
  recipientName?: string;
}

interface OrbitFriend {
  id: string;
  name: string;
  avatarUrl?: string;
  interactionScore: number; // 0-100 : proximity in orbit
  lastInteraction: string;
  online: boolean;
}

interface UniversePanelProps {
  api: any;
  currentUser?: any;
}

const UniversePanel: React.FC<UniversePanelProps> = ({ api, currentUser }) => {
  const { feedMode } = useZhiiveNav();
  // 🐝 Identité centralisée — source unique pour l'identité de publication
  const identity = useActiveIdentity();
  const { t } = useTranslation();
  const { isOrgMode, organization: currentOrganization } = identity;
  const orgLogo = currentOrganization?.logoUrl || null;
  const [activeSection, setActiveSection] = useState<'pulse' | 'events' | 'capsules' | 'orbit'>('pulse');
  const [events, setEvents] = useState<SocialEventData[]>([]);
  const [capsules, setCapsules] = useState<TimeCapsuleData[]>([]);
  const [orbitFriends, setOrbitFriends] = useState<OrbitFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const pulseCanvasRef = useRef<HTMLCanvasElement>(null);

  // Event modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('meetup');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartDate, setEventStartDate] = useState<any>(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventVisibility, setEventVisibility] = useState<string>(currentOrganization ? 'IN' : 'ALL');

  // 🐝 Sync visibilité quand le mode change (Bee ↔ Colony)
  useEffect(() => {
    setEventVisibility(currentOrganization ? 'IN' : 'ALL');
  }, [currentOrganization]);

  // Capsule modal
  const [capsuleModalOpen, setCapsuleModalOpen] = useState(false);
  const [capsuleContent, setCapsuleContent] = useState('');
  const [capsuleUnlocksAt, setCapsuleUnlocksAt] = useState<any>(null);
  const [capsuleSubmitting, setCapsuleSubmitting] = useState(false);

  // RSVP tracking
  const [rsvpSet, setRsvpSet] = useState<Set<string>>(new Set());

  // Pulse metrics — computed from real data
  const [pulseMetrics, setPulseMetrics] = useState({ positive: 0, active: 0, creative: 0, social: 0 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, capsulesRes, orbitRes, pulseRes] = await Promise.all([
        api.get(`/api/zhiive/events?limit=10&mode=${feedMode}`).catch(() => ({ events: [] })),
        api.get(`/api/zhiive/capsules?limit=10&mode=${feedMode}`).catch(() => ({ capsules: [] })),
        api.get(`/api/zhiive/orbit?mode=${feedMode}`).catch(() => ({ friends: [] })),
        api.get(`/api/zhiive/pulse?mode=${feedMode}`).catch(() => null),
      ]);
      if (eventsRes?.events) {
        setEvents(eventsRes.events);
        // Hydrater le RSVP set depuis les données backend
        const attending = new Set<string>();
        eventsRes.events.forEach((e: any) => { if (e.isAttending) attending.add(e.id); });
        setRsvpSet(attending);
      }
      if (capsulesRes?.capsules) setCapsules(capsulesRes.capsules);
      if (orbitRes?.friends) setOrbitFriends(orbitRes.friends);
      if (pulseRes) {
        setPulseMetrics({
          positive: pulseRes.positive ?? 50,
          active: pulseRes.active ?? 30,
          creative: pulseRes.creative ?? 20,
          social: pulseRes.social ?? 40,
        });
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [api, feedMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── EVENT ACTIONS ──
  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventStartDate) return;
    setEventSubmitting(true);
    try {
      await api.post('/api/zhiive/events', {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        type: eventType,
        location: eventLocation.trim(),
        startDate: eventStartDate.toISOString(),
        visibility: eventVisibility,
        // 🐝 publishAsOrg piloté par le système d'identité centralisé
        publishAsOrg: identity.publishAsOrg,
      });
      message.success(t('universe.eventCreated'));
      setEventTitle(''); setEventDesc(''); setEventLocation('');
      setEventStartDate(null); setEventModalOpen(false);
      fetchData();
    } catch {
      message.error(t('universe.creationFailed'));
    } finally {
      setEventSubmitting(false);
    }
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
    } catch {
      message.error(t('universe.rsvpFailed'));
    }
  };

  // ── CAPSULE ACTIONS ──
  const handleCreateCapsule = async () => {
    if (!capsuleContent.trim() || !capsuleUnlocksAt) return;
    setCapsuleSubmitting(true);
    try {
      await api.post('/api/zhiive/capsules', {
        content: capsuleContent.trim(),
        unlocksAt: capsuleUnlocksAt.toISOString(),
        publishAsOrg: identity.publishAsOrg,
      });
      message.success(t('universe.capsuleSealed'));
      setCapsuleContent(''); setCapsuleUnlocksAt(null);
      setCapsuleModalOpen(false);
      fetchData();
    } catch {
      message.error(t('universe.creationFailed'));
    } finally {
      setCapsuleSubmitting(false);
    }
  };

  const handleOpenCapsule = (capsule: TimeCapsuleData) => {
    Modal.info({
      title: t('universe.capsuleOpened'),
      content: (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: SF.textSecondary, marginBottom: 8 }}>{t('universe.from', { name: capsule.creatorName })}</p>
          <div style={{ padding: 16, background: SF.bg, borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>
            {capsule.content || t('universe.emptyContent')}
          </div>
        </div>
      ),
      okText: t('common.close'),
      width: 400,
    });
  };

  // Pulse animation — simple animated sphere
  useEffect(() => {
    if (activeSection !== 'pulse') return;
    const canvas = pulseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let animFrame: number;
    let t = 0;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string }[] = [];
    const cx = w / 2, cy = h / 2;

    // Create orbital particles
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 1.5 + Math.random() * 2.5,
        color: [SF.primary, SF.secondary, SF.accent, SF.gold][Math.floor(Math.random() * 4)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.008;

      // Central pulse sphere
      const pulseR = 35 + Math.sin(t * 2) * 8;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 1.5);
      gradient.addColorStop(0, SF.primary + 'CC');
      gradient.addColorStop(0.5, SF.accent + '66');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = SF.primary;
      ctx.fill();

      // Particles orbit
      particles.forEach(p => {
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const newAngle = angle + 0.005;
        p.x = cx + Math.cos(newAngle) * dist + p.vx;
        p.y = cy + Math.sin(newAngle) * dist + p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + Math.sin(t + dist * 0.05) * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '99';
        ctx.fill();
      });

      // Central text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('PULSE', cx, cy + 4);

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [activeSection]);

  const getEventTypeEmoji = (type: SocialEventData['type']) => {
    const map: Record<string, string> = {
      MEETUP: '🤝', WORKSHOP: '🎓', JOB_FAIR: '💼', OPEN_DAY: '🏠', OTHER: '📅',
    };
    return map[type] || '📅';
  };

  const sections = [
    { key: 'pulse' as const, label: 'Pulse', icon: '💫', color: SF.primary },
    { key: 'events' as const, label: t('universe.events'), icon: '📅', color: SF.secondary },
    { key: 'capsules' as const, label: t('universe.capsules'), icon: '⏳', color: SF.gold },
    { key: 'orbit' as const, label: t('universe.orbit'), icon: '🪐', color: SF.accent },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'none', background: SF.bg }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, background: SF.gradientHot, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌌 Universe
        </span>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {sections.map(sec => (
          <div key={sec.key} onClick={() => setActiveSection(sec.key)} style={{
            flex: 1, padding: '8px 0', textAlign: 'center', cursor: 'pointer',
            borderRadius: SF.radiusSm, fontSize: 11, fontWeight: 700,
            transition: 'all 0.25s',
            background: activeSection === sec.key ? sec.color + '18' : SF.cardBg,
            color: activeSection === sec.key ? sec.color : SF.textSecondary,
            boxShadow: activeSection === sec.key ? `0 2px 8px ${sec.color}30` : SF.shadow,
            border: activeSection === sec.key ? `1.5px solid ${sec.color}40` : '1.5px solid transparent',
          }}>
            {sec.icon} {sec.label}
          </div>
        ))}
      </div>

      {/* === LOADING STATE === */}
      {loading && activeSection !== 'pulse' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>🌌</div>
          <div style={{ fontSize: 12, color: SF.textMuted }}>{t('common.loading')}</div>
        </div>
      )}

      {/* === PULSE — Community Energy Sphere === */}
      {activeSection === 'pulse' && (
        <div>
          <div style={{
            background: SF.dark, borderRadius: SF.radius, overflow: 'hidden',
            boxShadow: SF.shadowMd, marginBottom: 12,
          }}>
            <canvas
              ref={pulseCanvasRef}
              style={{ width: '100%', height: 250, display: 'block' }}
            />
          </div>

          {/* Community mood summary */}
          <div style={{
            background: SF.cardBg, borderRadius: SF.radius, padding: 14,
            boxShadow: SF.shadow, marginBottom: 8,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginBottom: 8 }}>
              {t('universe.communityEnergy')}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { emoji: '😊', label: t('universe.positive'), pct: pulseMetrics.positive, color: SF.success },
                { emoji: '🔥', label: t('universe.active'), pct: pulseMetrics.active, color: SF.fire },
                { emoji: '💡', label: t('universe.creative'), pct: pulseMetrics.creative, color: SF.gold },
                { emoji: '🤝', label: t('universe.social'), pct: pulseMetrics.social, color: SF.primary },
              ].map(m => (
                <div key={m.label} style={{
                  flex: '1 0 45%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 8px', borderRadius: SF.radiusSm, background: SF.bg,
                }}>
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: SF.text }}>{m.label}</div>
                    <div style={{ height: 4, borderRadius: 2, background: SF.border, marginTop: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: m.color, width: `${m.pct}%`, transition: 'width 1s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === EVENTS === */}
      {activeSection === 'events' && (
        <div>
          {/* Create event CTA */}
          <div style={{
            background: SF.gradientSecondary, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            textAlign: 'center', color: 'white',
          }}>
            <CalendarOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{t('universe.createEvent')}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, marginBottom: 8 }}>
              {t('universe.meetupsWorkshops')}
            </div>
            <div
              onClick={() => setEventModalOpen(true)}
              style={{
              padding: '6px 18px', borderRadius: 20, display: 'inline-block',
              background: SF.overlayLight, fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
              📅 Create
            </div>
          </div>

          {/* Event creation modal */}
          <Modal
            open={eventModalOpen}
            onCancel={() => setEventModalOpen(false)}
            onOk={handleCreateEvent}
            confirmLoading={eventSubmitting}
            title={t('universe.createEvent')}
            okText={t('common.create')}
            cancelText={t('common.cancel')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder={t('universe.eventTitle')} />
              <Input.TextArea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder={t('universe.description')} rows={3} />
              <Select value={eventType} onChange={setEventType} style={{ width: '100%' }} options={[
                { value: 'meetup', label: t('universe.meetup') },
                { value: 'workshop', label: t('universe.workshop') },
                { value: 'jobfair', label: t('universe.jobFair') },
                { value: 'openday', label: t('universe.openDay') },
                { value: 'other', label: t('universe.other') },
              ]} />
              <Input value={eventLocation} onChange={e => setEventLocation(e.target.value)} prefix={<EnvironmentOutlined />} placeholder={t('universe.location')} />
              <DatePicker value={eventStartDate} onChange={setEventStartDate} showTime placeholder={t('universe.dateTime')} style={{ width: '100%' }} />

              {/* Visibility selector */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(currentOrganization ? ['IN', 'ALL', 'OUT'] : ['ALL', 'OUT']).map(v => {
                  const labels: Record<string, { icon: string; label: string; color: string }> = {
                    IN: { icon: '⬡', label: 'Colony', color: SF.scopeColony },
                    ALL: { icon: '🌐', label: 'Public', color: SF.scopePublic },
                    OUT: { icon: '🔒', label: 'Private', color: SF.scopePrivate },
                  };
                  const opt = labels[v];
                  const active = eventVisibility === v;
                  return (
                    <div key={v} onClick={() => setEventVisibility(v)} style={{
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
            </div>
          </Modal>

          {events.length > 0 ? events.map(event => (
            <div key={event.id} style={{
              background: SF.cardBg, borderRadius: SF.radius, overflow: 'hidden', marginBottom: 8,
              boxShadow: SF.shadow,
            }}>
              {event.coverImage && (
                <img src={event.coverImage} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
              )}
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{getEventTypeEmoji(event.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: SF.text }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: SF.textSecondary }}>
                      {t('universe.by', { name: event.organizerName })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: SF.textSecondary, marginBottom: 8 }}>
                  <div><ClockCircleOutlined /> {new Date(event.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  {event.location && <div><EnvironmentOutlined /> {event.location}</div>}
                  <div><TeamOutlined /> {t('universe.attendees', { count: event.attendeesCount })}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</div>
                </div>

                <div
                  onClick={() => handleRSVP(event.id)}
                  style={{
                  padding: '6px 0', textAlign: 'center', borderRadius: 20,
                  background: rsvpSet.has(event.id) ? SF.success + '20' : SF.gradientSecondary,
                  color: rsvpSet.has(event.id) ? SF.success : 'white',
                  fontWeight: 700,
                  fontSize: 12, cursor: 'pointer',
                }}>
                  {rsvpSet.has(event.id) ? t('universe.going') : t('universe.attend')}
                </div>
              </div>
            </div>
          )) : (
            <EmptyUniverse icon="📅" title={t('universe.noEvents')} subtitle={t('universe.hostFirstEvent')} />
          )}
        </div>
      )}

      {/* === TIME CAPSULES === */}
      {activeSection === 'capsules' && (
        <div>
          {/* Create capsule CTA */}
          <div style={{
            background: SF.gradientGold, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            textAlign: 'center',
          }}>
            <LockOutlined style={{ fontSize: 28, color: SF.text }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginTop: 6 }}>{t('universe.timeCapsule')}</div>
            <div style={{ fontSize: 11, color: SF.text, opacity: 0.7, marginTop: 2, marginBottom: 8 }}>
              {t('universe.sendToFuture')}
            </div>
            <div
              onClick={() => setCapsuleModalOpen(true)}
              style={{
              padding: '6px 18px', borderRadius: 20, display: 'inline-block',
              background: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', color: SF.text,
            }}>
              {t('universe.createCapsule')}
            </div>
          </div>

          {/* Capsule creation modal */}
          <Modal
            open={capsuleModalOpen}
            onCancel={() => setCapsuleModalOpen(false)}
            onOk={handleCreateCapsule}
            confirmLoading={capsuleSubmitting}
            title={t('universe.newTimeCapsule')}
            okText={t('universe.seal')}
            cancelText={t('common.cancel')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Input.TextArea
                value={capsuleContent}
                onChange={e => setCapsuleContent(e.target.value)}
                placeholder={t('universe.futureMessage')}
                rows={4}
                maxLength={5000}
                showCount
              />
              <DatePicker
                value={capsuleUnlocksAt}
                onChange={setCapsuleUnlocksAt}
                placeholder={t('universe.unlockDate')}
                style={{ width: '100%' }}
              />
            </div>
          </Modal>

          {capsules.length > 0 ? capsules.map(cap => {
            const now = new Date();
            const unlockDate = new Date(cap.unlocksAt);
            const daysLeft = Math.max(0, Math.ceil((unlockDate.getTime() - now.getTime()) / 86400000));

            return (
              <div key={cap.id} style={{
                background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8,
                boxShadow: SF.shadow, position: 'relative',
                border: cap.isUnlocked ? `1.5px solid ${SF.gold}` : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: cap.isUnlocked ? SF.gradientGold : SF.bg,
                    fontSize: 20,
                  }}>
                    {cap.isUnlocked ? '🎁' : '🔒'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: SF.text }}>{cap.content ? (cap.content.length > 40 ? cap.content.substring(0, 40) + '...' : cap.content) : t('universe.mysteryCapsule')}</div>
                    <div style={{ fontSize: 11, color: SF.textSecondary }}>
                      {t('universe.from', { name: cap.creatorName })}
                      {cap.recipientName && ` → ${cap.recipientName}`}
                    </div>
                    <div style={{ fontSize: 10, color: cap.isUnlocked ? SF.gold : SF.textMuted, marginTop: 2 }}>
                      {cap.isUnlocked
                        ? t('universe.unlocked')
                        : t('universe.unlocksIn', { days: daysLeft })}
                    </div>
                  </div>
                </div>

                {cap.isUnlocked && (
                  <div
                    onClick={() => handleOpenCapsule(cap)}
                    style={{
                    marginTop: 8, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: SF.gradientGold, color: SF.text, fontWeight: 700,
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    <GiftOutlined /> {t('universe.openCapsule')}
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyUniverse icon="⏳" title={t('universe.noCapsules')} subtitle={t('universe.createCapsuleHint')} />
          )}
        </div>
      )}

      {/* === ORBIT — Friend Constellation === */}
      {activeSection === 'orbit' && (
        <div>
          <div style={{
            background: SF.dark, borderRadius: SF.radius, padding: 20, marginBottom: 12,
            boxShadow: SF.shadowMd, textAlign: 'center', minHeight: 200,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Central user */}
            <Avatar size={48} src={isOrgMode ? (orgLogo || undefined) : (currentUser?.avatarUrl || undefined)}
              icon={!isOrgMode && !currentUser?.avatarUrl ? <UserOutlined /> : undefined}
              style={{
                background: isOrgMode ? (orgLogo ? 'transparent' : SF.primary) : (!currentUser?.avatarUrl ? SF.primary : undefined),
                border: `2px solid ${isOrgMode ? SF.primary : SF.primary}`,
                position: 'relative', zIndex: 2,
              }}
            >
              {isOrgMode && !orgLogo && (currentOrganization?.name?.[0]?.toUpperCase() || 'O')}
            </Avatar>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginTop: 4 }}>{isOrgMode ? currentOrganization?.name : t('universe.you')}</div>

            {/* Orbital friends */}
            {orbitFriends.slice(0, 8).map((f, i) => {
              const angle = (i / Math.min(orbitFriends.length, 8)) * Math.PI * 2 - Math.PI / 2;
              const radius = 60 + (100 - f.interactionScore) * 0.8;
              const x = 50 + Math.cos(angle) * (radius / 3);
              const y = 50 + Math.sin(angle) * (radius / 3);
              const size = 24 + (f.interactionScore / 100) * 12;

              return (
                <div key={f.id} style={{
                  position: 'absolute', left: `${x}%`, top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}>
                  <Avatar size={size} src={f.avatarUrl}
                    icon={!f.avatarUrl ? <UserOutlined /> : undefined}
                    style={{
                      background: !f.avatarUrl ? SF.accent : undefined,
                      border: f.online ? `2px solid ${SF.success}` : `1px solid ${SF.textMuted}`,
                      cursor: 'pointer',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Friends list */}
          <div style={{ fontSize: 13, fontWeight: 700, color: SF.text, marginBottom: 8 }}>
            {t('universe.yourConstellation', { count: orbitFriends.length })}
          </div>
          {orbitFriends.length > 0 ? orbitFriends.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: SF.cardBg, borderRadius: SF.radiusSm, marginBottom: 4,
              boxShadow: SF.shadow, cursor: 'pointer',
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar size={36} src={f.avatarUrl}
                  icon={!f.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ background: !f.avatarUrl ? SF.primary : undefined }} />
                {f.online && (
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 10, height: 10, borderRadius: '50%',
                    background: SF.success, border: '2px solid white',
                  }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: SF.text }}>{f.name}</div>
                <div style={{ fontSize: 10, color: SF.textMuted }}>
                  {t('universe.proximity', { score: f.interactionScore })}
                </div>
              </div>
              <HeartOutlined style={{ color: SF.accent, fontSize: 14 }} />
            </div>
          )) : (
            <EmptyUniverse icon="🪐" title={t('universe.orbitEmpty')} subtitle={t('universe.addFriendsHint')} />
          )}
        </div>
      )}
    </div>
  );
};

const EmptyUniverse: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ fontSize: 40 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: SF.text, marginTop: 12 }}>{title}</div>
    <div style={{ fontSize: 12, color: SF.textSecondary, marginTop: 4 }}>{subtitle}</div>
  </div>
);

export default UniversePanel;
