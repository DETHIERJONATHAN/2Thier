import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from 'antd';
import {
  TeamOutlined, CalendarOutlined, UserOutlined,
  EnvironmentOutlined, ClockCircleOutlined, HeartOutlined,
  LockOutlined, GiftOutlined,
} from '@ant-design/icons';
import { SF } from './SpaceFlowTheme';

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
  title: string;
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
  const [activeSection, setActiveSection] = useState<'pulse' | 'events' | 'capsules' | 'orbit'>('pulse');
  const [events, setEvents] = useState<SocialEventData[]>([]);
  const [capsules, setCapsules] = useState<TimeCapsuleData[]>([]);
  const [orbitFriends, setOrbitFriends] = useState<OrbitFriend[]>([]);
  const [_loading, setLoading] = useState(true);
  const pulseCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, capsulesRes, orbitRes] = await Promise.all([
        api.get('/api/spaceflow/events?limit=10').catch(() => ({ events: [] })),
        api.get('/api/spaceflow/capsules?limit=10').catch(() => ({ capsules: [] })),
        api.get('/api/spaceflow/orbit').catch(() => ({ friends: [] })),
      ]);
      if (eventsRes?.events) setEvents(eventsRes.events);
      if (capsulesRes?.capsules) setCapsules(capsulesRes.capsules);
      if (orbitRes?.friends) setOrbitFriends(orbitRes.friends);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    { key: 'events' as const, label: 'Events', icon: '📅', color: SF.secondary },
    { key: 'capsules' as const, label: 'Capsules', icon: '⏳', color: SF.gold },
    { key: 'orbit' as const, label: 'Orbit', icon: '🪐', color: SF.accent },
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

      {/* === PULSE — Community Energy Sphere === */}
      {activeSection === 'pulse' && (
        <div>
          <div style={{
            background: '#1a1a2e', borderRadius: SF.radius, overflow: 'hidden',
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
              💫 Énergie de la communauté
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { emoji: '😊', label: 'Positif', pct: 68, color: SF.success },
                { emoji: '🔥', label: 'Actif', pct: 42, color: SF.fire },
                { emoji: '💡', label: 'Créatif', pct: 35, color: SF.gold },
                { emoji: '🤝', label: 'Social', pct: 55, color: SF.primary },
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
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>Créer un événement</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, marginBottom: 8 }}>
              Meetups, ateliers, job fairs...
            </div>
            <div style={{
              padding: '6px 18px', borderRadius: 20, display: 'inline-block',
              background: 'rgba(255,255,255,0.25)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
              📅 Créer
            </div>
          </div>

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
                      par {event.organizerName}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: SF.textSecondary, marginBottom: 8 }}>
                  <div><ClockCircleOutlined /> {new Date(event.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  {event.location && <div><EnvironmentOutlined /> {event.location}</div>}
                  <div><TeamOutlined /> {event.attendeesCount} participant(s){event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</div>
                </div>

                <div style={{
                  padding: '6px 0', textAlign: 'center', borderRadius: 20,
                  background: SF.gradientSecondary, color: 'white', fontWeight: 700,
                  fontSize: 12, cursor: 'pointer',
                }}>
                  Participer
                </div>
              </div>
            </div>
          )) : (
            <EmptyUniverse icon="📅" title="Aucun événement" subtitle="Organisez le premier événement de votre communauté !" />
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
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginTop: 6 }}>Capsule Temporelle</div>
            <div style={{ fontSize: 11, color: SF.text, opacity: 0.7, marginTop: 2, marginBottom: 8 }}>
              Envoyez un message vers le futur !
            </div>
            <div style={{
              padding: '6px 18px', borderRadius: 20, display: 'inline-block',
              background: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', color: SF.text,
            }}>
              ⏳ Créer une capsule
            </div>
          </div>

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
                    <div style={{ fontSize: 13, fontWeight: 700, color: SF.text }}>{cap.title}</div>
                    <div style={{ fontSize: 11, color: SF.textSecondary }}>
                      De {cap.creatorName}
                      {cap.recipientName && ` → ${cap.recipientName}`}
                    </div>
                    <div style={{ fontSize: 10, color: cap.isUnlocked ? SF.gold : SF.textMuted, marginTop: 2 }}>
                      {cap.isUnlocked
                        ? '✨ Déverrouillée ! Ouvrez-la !'
                        : `🔒 Se déverrouille dans ${daysLeft} jour(s)`}
                    </div>
                  </div>
                </div>

                {cap.isUnlocked && (
                  <div style={{
                    marginTop: 8, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: SF.gradientGold, color: SF.text, fontWeight: 700,
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    <GiftOutlined /> Ouvrir la capsule
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyUniverse icon="⏳" title="Aucune capsule" subtitle="Créez une capsule temporelle pour une surprise future !" />
          )}
        </div>
      )}

      {/* === ORBIT — Friend Constellation === */}
      {activeSection === 'orbit' && (
        <div>
          <div style={{
            background: '#1a1a2e', borderRadius: SF.radius, padding: 20, marginBottom: 12,
            boxShadow: SF.shadowMd, textAlign: 'center', minHeight: 200,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Central user */}
            <Avatar size={48} src={currentUser?.avatarUrl}
              icon={!currentUser?.avatarUrl ? <UserOutlined /> : undefined}
              style={{
                background: !currentUser?.avatarUrl ? SF.primary : undefined,
                border: `2px solid ${SF.primary}`,
                position: 'relative', zIndex: 2,
              }}
            />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginTop: 4 }}>Vous</div>

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
            🪐 Votre constellation ({orbitFriends.length})
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
                  Proximité: {f.interactionScore}%
                </div>
              </div>
              <HeartOutlined style={{ color: SF.accent, fontSize: 14 }} />
            </div>
          )) : (
            <EmptyUniverse icon="🪐" title="Votre orbite est vide" subtitle="Ajoutez des amis pour voir votre constellation !" />
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
