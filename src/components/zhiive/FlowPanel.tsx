import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Progress, Tag, Badge, Modal, Input, message, DatePicker } from 'antd';
import {
  ThunderboltOutlined, EyeInvisibleOutlined, TrophyOutlined,
  UserOutlined, LikeOutlined, DislikeOutlined,
  ClockCircleOutlined, StarOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { SF } from './ZhiiveTheme';
import { useZhiiveNav } from '../../contexts/ZhiiveNavContext';
import { useAuth } from '../../auth/useAuth';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';

interface SparkPost {
  id: string;
  content: string;
  sparkCount: number;
  revealThreshold: number;
  isRevealed: boolean;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  hasVoted: boolean;
}

interface BattleData {
  id: string;
  title: string;
  description: string;
  status: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentName?: string;
  opponentAvatar?: string;
  endsAt: string;
  entriesCount: number;
}

interface QuestData {
  id: string;
  title: string;
  description: string;
  type: string;
  rewardPoints: number;
  progress: number;
  maxProgress: number;
  expiresAt?: string;
}

interface FlowPanelProps {
  api: any;
  currentUser?: any;
}

const FlowPanel: React.FC<FlowPanelProps> = ({ api }) => {
  const { t, i18n } = useTranslation();
  const { feedMode } = useZhiiveNav();
  const { currentOrganization } = useAuth();
  // 🐝 Identité centralisée — source unique pour l'identité de publication
  const identity = useActiveIdentity();
  const [activeSection, setActiveSection] = useState<'spark' | 'battles' | 'quests'>('spark');
  const [sparks, setSparks] = useState<SparkPost[]>([]);
  const [battles, setBattles] = useState<BattleData[]>([]);
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [sparkModalOpen, setSparkModalOpen] = useState(false);
  const [sparkContent, setSparkContent] = useState('');
  const [sparkSubmitting, setSparkSubmitting] = useState(false);
  const [sparkVisibility, setSparkVisibility] = useState<'IN' | 'ALL' | 'OUT'>(currentOrganization ? 'IN' : 'ALL');

  // 🐝 Sync visibilité quand le mode change (Bee ↔ Colony)
  useEffect(() => {
    setSparkVisibility(currentOrganization ? 'IN' : 'ALL');
  }, [currentOrganization]);

  const [battleModalOpen, setBattleModalOpen] = useState(false);
  const [battleTitle, setBattleTitle] = useState('');
  const [battleDesc, setBattleDesc] = useState('');
  const [battleEndsAt, setBattleEndsAt] = useState<any>(null);
  const [battleSubmitting, setBattleSubmitting] = useState(false);

  const fetchFlow = useCallback(async () => {
    try {
      setLoading(true);
      const [sparksRes, battlesRes, questsRes] = await Promise.all([
        api.get(`/api/zhiive/sparks?limit=20&mode=${feedMode}`).catch(() => ({ sparks: [] })),
        api.get(`/api/zhiive/battles?limit=10&mode=${feedMode}`).catch(() => ({ battles: [] })),
        api.get(`/api/zhiive/quests/available?mode=${feedMode}`).catch(() => ({ quests: [] })),
      ]);
      if (sparksRes?.sparks) setSparks(sparksRes.sparks);
      if (battlesRes?.battles) setBattles(battlesRes.battles);
      if (questsRes?.quests) setQuests(questsRes.quests);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [api, feedMode]);

  useEffect(() => { fetchFlow(); }, [fetchFlow]);

  // ── SPARK ACTIONS ──
  const handleCreateSpark = async () => {
    if (!sparkContent.trim()) return;
    setSparkSubmitting(true);
    try {
      await api.post('/api/zhiive/sparks', { content: sparkContent.trim(), visibility: sparkVisibility, publishAsOrg: identity.publishAsOrg });
      message.success(t('flow.sparkPosted'));
      setSparkContent('');
      setSparkModalOpen(false);
      fetchFlow();
    } catch {
      message.error(t('flow.sparkError'));
    } finally {
      setSparkSubmitting(false);
    }
  };

  const handleVoteSpark = async (sparkId: string) => {
    // Mise à jour optimiste pour éviter le double-clic
    setSparks(prev => prev.map(s => s.id === sparkId ? { ...s, hasVoted: true, sparkCount: s.sparkCount + 1 } : s));
    try {
      const res = await api.post(`/api/zhiive/sparks/${sparkId}/vote`);
      setSparks(prev => prev.map(s => s.id === sparkId ? {
        ...s,
        sparkCount: res.sparkCount ?? s.sparkCount,
        isRevealed: res.isRevealed ?? s.isRevealed,
        hasVoted: true,
      } : s));
      message.success(t('flow.voteRecorded'));
    } catch {
      // Rollback si l'API échoue
      setSparks(prev => prev.map(s => s.id === sparkId ? { ...s, hasVoted: false, sparkCount: s.sparkCount - 1 } : s));
      message.warning(t('flow.alreadyVoted'));
    }
  };

  // ── BATTLE ACTIONS ──
  const handleCreateBattle = async () => {
    if (!battleTitle.trim()) return;
    setBattleSubmitting(true);
    try {
      await api.post('/api/zhiive/battles', {
        title: battleTitle.trim(),
        description: battleDesc.trim(),
        endsAt: battleEndsAt?.toISOString(),
        publishAsOrg: identity.publishAsOrg,
      });
      message.success(t('flow.battleCreated'));
      setBattleTitle('');
      setBattleDesc('');
      setBattleEndsAt(null);
      setBattleModalOpen(false);
      fetchFlow();
    } catch {
      message.error(t('flow.battleError'));
    } finally {
      setBattleSubmitting(false);
    }
  };

  const handleJoinBattle = async (battleId: string) => {
    try {
      await api.post(`/api/zhiive/battles/${battleId}/join`);
      message.success(t('flow.challengeAccepted'));
      fetchFlow();
    } catch {
      message.warning(t('flow.unableToJoin'));
    }
  };

  const sections = [
    { key: 'spark' as const, label: 'Spark', icon: <ThunderboltOutlined />, color: SF.gold },
    { key: 'battles' as const, label: t('flow.battles'), icon: <TrophyOutlined />, color: SF.accent },
    { key: 'quests' as const, label: t('flow.quests'), icon: <StarOutlined />, color: SF.success },
  ];

  const getQuestTypeStyle = (type: QuestData['type']) => {
    const styles: Record<string, { bg: string; label: string; emoji: string }> = {
      DAILY: { bg: SF.gradientSecondary, label: t('flow.daily'), emoji: '☀️' },
      WEEKLY: { bg: SF.gradientPrimary, label: t('flow.weekly'), emoji: '📅' },
      MONTHLY: { bg: SF.gradientHot, label: t('flow.monthly'), emoji: '🏆' },
      SPECIAL: { bg: SF.gradientGold, label: t('flow.special'), emoji: '⭐' },
    };
    return styles[type] || styles.DAILY;
  };

  const getBattleStatusTag = (status: BattleData['status']) => {
    const map: Record<string, { color: string; label: string }> = {
      OPEN: { color: 'green', label: t('flow.statusOpen') },
      ACTIVE: { color: 'blue', label: t('flow.statusActive') },
      VOTING: { color: 'orange', label: t('flow.statusVoting') },
      ENDED: { color: 'default', label: t('flow.statusEnded') },
    };
    return map[status] || map.OPEN;
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'none', background: SF.bg }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, background: SF.gradientPrimary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌊 Flow
        </span>
        <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 2 }}>
          {t('flow.tagline')}
        </div>
      </div>


      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {sections.map(sec => (
          <div
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            style={{
              flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer',
              borderRadius: SF.radiusSm, fontSize: 12, fontWeight: 700,
              transition: 'all 0.25s',
              background: activeSection === sec.key ? sec.color + '18' : SF.cardBg,
              color: activeSection === sec.key ? sec.color : SF.textSecondary,
              boxShadow: activeSection === sec.key ? `0 2px 8px ${sec.color}30` : SF.shadow,
              border: activeSection === sec.key ? `1.5px solid ${sec.color}40` : '1.5px solid transparent',
            }}
          >
            {sec.icon} {sec.label}
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>⚡</div>
          <div style={{ fontSize: 12, color: SF.textMuted }}>{t('common.loading')}</div>
        </div>
      )}

      {/* === SPARK — Anonymous Posts === */}
      {!loading && activeSection === 'spark' && (
        <div>
          {/* Create Spark */}
          <div style={{
            background: SF.cardBg, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            boxShadow: SF.shadow, textAlign: 'center',
          }}>
            <EyeInvisibleOutlined style={{ fontSize: 28, color: SF.gold }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginTop: 6 }}>
              {t('flow.postAnonymously')}
            </div>
            <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 2, marginBottom: 10 }}>
              {t('flow.revealAt100')}
            </div>
            <div
              onClick={() => setSparkModalOpen(true)}
              style={{
              padding: '8px 20px', borderRadius: 20, display: 'inline-block',
              background: SF.gradientGold, color: SF.text, fontWeight: 700,
              fontSize: 13, cursor: 'pointer',
            }}>
              {t('flow.createSpark')}
            </div>
          </div>

          {/* Spark creation modal */}
          <Modal
            open={sparkModalOpen}
            onCancel={() => setSparkModalOpen(false)}
            onOk={handleCreateSpark}
            confirmLoading={sparkSubmitting}
            title={t('flow.newSpark')}
            okText={t('flow.buzzIt')}
            cancelText={t('common.cancel')}
          >
            <Input.TextArea
              value={sparkContent}
              onChange={e => setSparkContent(e.target.value)}
              placeholder={t('flow.sparkFullPlaceholder')}
              maxLength={3000}
              rows={4}
              showCount
              style={{ marginTop: 8 }}
            />
            {/* Visibility selector */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {(currentOrganization ? ['IN', 'ALL', 'OUT'] as const : ['ALL', 'OUT'] as const).map(v => {
                const labels: Record<string, { icon: string; label: string; color: string }> = {
                  IN: { icon: '⬡', label: 'Colony', color: SF.scopeColony },
                  ALL: { icon: '🌐', label: 'Public', color: SF.scopePublic },
                  OUT: { icon: '🔒', label: 'Private', color: SF.scopePrivate },
                };
                const opt = labels[v];
                const active = sparkVisibility === v;
                return (
                  <div key={v} onClick={() => setSparkVisibility(v)} style={{
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
          </Modal>

          {/* Sparks list */}
          {sparks.length > 0 ? sparks.map(spark => (
            <div key={spark.id} style={{
              background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8,
              boxShadow: SF.shadow, position: 'relative',
            }}>
              {/* Anonymous header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar size={36} style={{ background: spark.isRevealed ? SF.primary : SF.gradientDark }}>
                  {spark.isRevealed ? (spark.authorName?.[0] || '?') : '?'}
                </Avatar>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: SF.text }}>
                    {spark.isRevealed ? spark.authorName : t('flow.anonymous')}
                  </div>
                  <div style={{ fontSize: 10, color: SF.textMuted }}>
                    {spark.isRevealed ? t('flow.identityRevealed') : `⚡ ${spark.sparkCount}/${spark.revealThreshold} votes`}
                  </div>
                </div>
                {!spark.isRevealed && (
                  <Progress
                    type="circle"
                    percent={Math.round((spark.sparkCount / spark.revealThreshold) * 100)}
                    size={32}
                    strokeColor={SF.gold}
                    trailColor={SF.border}
                    format={p => `${p}%`}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ fontSize: 14, color: SF.text, lineHeight: 1.5, marginBottom: 10 }}>
                {spark.content}
              </div>

              {/* Vote buttons */}
              {!spark.isRevealed && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    onClick={() => !spark.hasVoted && handleVoteSpark(spark.id)}
                    style={{
                    flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: spark.hasVoted ? SF.success + '20' : SF.bg,
                    color: spark.hasVoted ? SF.success : SF.textSecondary,
                    cursor: spark.hasVoted ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
                    opacity: spark.hasVoted ? 0.7 : 1,
                  }}>
                    <LikeOutlined /> {spark.hasVoted ? t('flow.voted') : t('flow.vote')}
                  </div>
                  <div onClick={async () => {
                    setSparks(prev => prev.filter(s => s.id !== spark.id));
                    try { await api.post(`/api/zhiive/sparks/${spark.id}/dismiss`); } catch {}
                  }} style={{
                    flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: SF.bg,
                    color: SF.textSecondary,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}>
                    <DislikeOutlined /> {t('flow.skip')}
                  </div>
                </div>
              )}
            </div>
          )) : (
            <EmptyFlow
              icon="⚡"
              title={t('flow.noSparks')}
              subtitle={t('flow.beFirstSpark')}
            />
          )}
        </div>
      )}

      {/* === BATTLES — Creative Duels === */}
      {!loading && activeSection === 'battles' && (
        <div>
          {/* Create Battle CTA */}
          <div style={{
            background: SF.gradientHot, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            textAlign: 'center', color: 'white',
          }}>
            <TrophyOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{t('flow.launchBattle')}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, marginBottom: 10 }}>
              {t('flow.challengeSomeone')}
            </div>
            <div
              onClick={() => setBattleModalOpen(true)}
              style={{
              padding: '8px 20px', borderRadius: 20, display: 'inline-block',
              background: SF.overlayLight, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              {t('flow.launchBattleBtn')}
            </div>
          </div>

          {/* Battle creation modal */}
          <Modal
            open={battleModalOpen}
            onCancel={() => setBattleModalOpen(false)}
            onOk={handleCreateBattle}
            confirmLoading={battleSubmitting}
            title={t('flow.newBattle')}
            okText={t('common.launch')}
            cancelText={t('common.cancel')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Input
                value={battleTitle}
                onChange={e => setBattleTitle(e.target.value)}
                placeholder={t('flow.battleTitlePlaceholder')}
                maxLength={200}
              />
              <Input.TextArea
                value={battleDesc}
                onChange={e => setBattleDesc(e.target.value)}
                placeholder={t('flow.battleDescPlaceholder')}
                rows={3}
              />
              <DatePicker
                value={battleEndsAt}
                onChange={setBattleEndsAt}
                showTime
                placeholder={t('flow.endDatePlaceholder')}
                style={{ width: '100%' }}
              />
            </div>
          </Modal>

          {/* Battles list */}
          {battles.length > 0 ? battles.map(battle => {
            const statusTag = getBattleStatusTag(battle.status);
            return (
              <div key={battle.id} style={{
                background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8,
                boxShadow: SF.shadow,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: SF.text }}>{battle.title}</div>
                  <Tag color={statusTag.color} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                    {statusTag.label}
                  </Tag>
                </div>
                <div style={{ fontSize: 11, color: SF.textSecondary, marginBottom: 10 }}>
                  Thème : {battle.description}
                </div>

                {/* VS display */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,  padding: '8px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar size={40} src={battle.challengerAvatar}
                      icon={!battle.challengerAvatar ? <UserOutlined /> : undefined}
                      style={{ background: !battle.challengerAvatar ? SF.primary : undefined }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: SF.text, marginTop: 4 }}>
                      {battle.challengerName}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 900, color: SF.accent,
                    background: SF.gradientHot, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    VS
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar size={40} src={battle.opponentAvatar}
                      icon={!battle.opponentAvatar ? <UserOutlined /> : undefined}
                      style={{ background: !battle.opponentAvatar ? SF.textMuted : undefined }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: SF.text, marginTop: 4 }}>
                      {battle.opponentName || '???'}
                    </div>
                  </div>
                </div>

                {battle.status === 'OPEN' && (
                  <div
                    onClick={() => handleJoinBattle(battle.id)}
                    style={{
                    marginTop: 8, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: SF.gradientHot, color: 'white', fontWeight: 700,
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    {t('flow.takeChallenge')}
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyFlow
              icon="⚔️"
              title={t('flow.noBattles')}
              subtitle={t('flow.launchFirst')}
            />
          )}
        </div>
      )}

      {/* === QUESTS — Gamified Missions === */}
      {!loading && activeSection === 'quests' && (
        <div>
          {/* Quest intro */}
          <div style={{
            background: SF.gradientPrimary, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            textAlign: 'center', color: 'white',
          }}>
            <StarOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{t('flow.zhiiveQuests')}</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              {t('flow.completeMissions')}
            </div>
          </div>

          {/* Quests list */}
          {quests.length > 0 ? quests.map(quest => {
            const typeStyle = getQuestTypeStyle(quest.type);
            const pct = Math.round((quest.progress / quest.maxProgress) * 100);
            return (
              <div key={quest.id} style={{
                background: SF.cardBg, borderRadius: SF.radius, padding: 14, marginBottom: 8,
                boxShadow: SF.shadow,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: SF.radiusSm, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: typeStyle.bg, fontSize: 18,
                  }}>
                    {typeStyle.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: SF.text }}>{quest.title}</div>
                    <div style={{ fontSize: 11, color: SF.textSecondary }}>{quest.description}</div>
                  </div>
                  <Badge count={`+${quest.rewardPoints}`} style={{
                    background: SF.gold, color: SF.text, fontWeight: 700, fontSize: 10,
                  }} />
                </div>

                <Progress
                  percent={pct}
                  size="small"
                  strokeColor={pct >= 100 ? SF.success : SF.primary}
                  trailColor={SF.border}
                  format={() => `${quest.progress}/${quest.maxProgress}`}
                />

                {pct < 100 && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/api/zhiive/quests/${quest.id}/progress`);
                        setQuests(prev => prev.map(q => q.id === quest.id
                          ? { ...q, progress: Math.min(q.progress + 1, q.maxProgress) }
                          : q
                        ));
                        message.success(t('flow.questProgress'));
                      } catch { message.error(t('flow.questError')); }
                    }}
                    style={{
                      marginTop: 8, width: '100%', padding: '6px 0', border: 'none',
                      borderRadius: SF.radiusSm, background: SF.primary, color: SF.textLight,
                      fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    <CheckCircleOutlined /> {t('flow.completeStep')}
                  </button>
                )}

                {pct >= 100 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: SF.success, fontWeight: 600 }}>
                    <CheckCircleOutlined /> {t('flow.questCompleted')}
                  </div>
                )}

                {quest.expiresAt && (
                  <div style={{ fontSize: 10, color: SF.textMuted, marginTop: 4 }}>
                    <ClockCircleOutlined /> {t('flow.expires', { date: new Date(quest.expiresAt).toLocaleDateString(i18n.language) })}
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyFlow
              icon="🎯"
              title={t('flow.noQuests')}
              subtitle={t('flow.checkBackSoon')}
            />
          )}
        </div>
      )}
    </div>
  );
};

const EmptyFlow: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ fontSize: 40 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: SF.text, marginTop: 12 }}>{title}</div>
    <div style={{ fontSize: 12, color: SF.textSecondary, marginTop: 4 }}>{subtitle}</div>
  </div>
);

export default FlowPanel;
