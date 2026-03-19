import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Progress, Tag, Badge } from 'antd';
import {
  ThunderboltOutlined, EyeInvisibleOutlined, TrophyOutlined,
  UserOutlined, LikeOutlined, DislikeOutlined,
  ClockCircleOutlined, StarOutlined,
} from '@ant-design/icons';
import { SF } from './SpaceFlowTheme';

interface SparkPost {
  id: string;
  content: string;
  votesCount: number;
  revealThreshold: number;
  isRevealed: boolean;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  userVote?: 'UP' | 'DOWN' | null;
}

interface BattleData {
  id: string;
  title: string;
  theme: string;
  status: 'OPEN' | 'ACTIVE' | 'VOTING' | 'ENDED';
  creatorName: string;
  creatorAvatar?: string;
  opponentName?: string;
  opponentAvatar?: string;
  endsAt: string;
  entriesCount: number;
}

interface QuestData {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';
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
  const [activeSection, setActiveSection] = useState<'spark' | 'battles' | 'quests'>('spark');
  const [sparks, setSparks] = useState<SparkPost[]>([]);
  const [battles, setBattles] = useState<BattleData[]>([]);
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [_loading, setLoading] = useState(true);

  const fetchFlow = useCallback(async () => {
    try {
      const [sparksRes, battlesRes, questsRes] = await Promise.all([
        api.get('/api/spaceflow/sparks?limit=20').catch(() => ({ sparks: [] })),
        api.get('/api/spaceflow/battles?limit=10').catch(() => ({ battles: [] })),
        api.get('/api/spaceflow/quests/available').catch(() => ({ quests: [] })),
      ]);
      if (sparksRes?.sparks) setSparks(sparksRes.sparks);
      if (battlesRes?.battles) setBattles(battlesRes.battles);
      if (questsRes?.quests) setQuests(questsRes.quests);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchFlow(); }, [fetchFlow]);

  const sections = [
    { key: 'spark' as const, label: 'Spark', icon: <ThunderboltOutlined />, color: SF.gold },
    { key: 'battles' as const, label: 'Battles', icon: <TrophyOutlined />, color: SF.accent },
    { key: 'quests' as const, label: 'Quests', icon: <StarOutlined />, color: SF.success },
  ];

  const getQuestTypeStyle = (type: QuestData['type']) => {
    const styles: Record<string, { bg: string; label: string; emoji: string }> = {
      DAILY: { bg: SF.gradientSecondary, label: 'Quotidien', emoji: '☀️' },
      WEEKLY: { bg: SF.gradientPrimary, label: 'Hebdo', emoji: '📅' },
      MONTHLY: { bg: SF.gradientHot, label: 'Mensuel', emoji: '🏆' },
      SPECIAL: { bg: SF.gradientGold, label: 'Spécial', emoji: '⭐' },
    };
    return styles[type] || styles.DAILY;
  };

  const getBattleStatusTag = (status: BattleData['status']) => {
    const map: Record<string, { color: string; label: string }> = {
      OPEN: { color: 'green', label: '🟢 Ouvert' },
      ACTIVE: { color: 'blue', label: '⚔️ En cours' },
      VOTING: { color: 'orange', label: '🗳️ Votes' },
      ENDED: { color: 'default', label: '🏁 Terminé' },
    };
    return map[status] || map.OPEN;
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'none', background: SF.bg }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12, paddingTop: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, background: SF.gradientPrimary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌊 Flow
        </span>
        <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 2 }}>
          Exister, Créer, Gagner !
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

      {/* === SPARK — Anonymous Posts === */}
      {activeSection === 'spark' && (
        <div>
          {/* Create Spark */}
          <div style={{
            background: SF.cardBg, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            boxShadow: SF.shadow, textAlign: 'center',
          }}>
            <EyeInvisibleOutlined style={{ fontSize: 28, color: SF.gold }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: SF.text, marginTop: 6 }}>
              Postez anonymement
            </div>
            <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 2, marginBottom: 10 }}>
              À 100 votes, votre identité est révélée !
            </div>
            <div style={{
              padding: '8px 20px', borderRadius: 20, display: 'inline-block',
              background: SF.gradientGold, color: SF.text, fontWeight: 700,
              fontSize: 13, cursor: 'pointer',
            }}>
              ⚡ Créer un Spark
            </div>
          </div>

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
                    {spark.isRevealed ? spark.authorName : 'Anonyme'}
                  </div>
                  <div style={{ fontSize: 10, color: SF.textMuted }}>
                    {spark.isRevealed ? '✨ Identité révélée !' : `⚡ ${spark.votesCount}/${spark.revealThreshold} votes`}
                  </div>
                </div>
                {!spark.isRevealed && (
                  <Progress
                    type="circle"
                    percent={Math.round((spark.votesCount / spark.revealThreshold) * 100)}
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
                  <div style={{
                    flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: spark.userVote === 'UP' ? SF.success + '20' : SF.bg,
                    color: spark.userVote === 'UP' ? SF.success : SF.textSecondary,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}>
                    <LikeOutlined /> Voter
                  </div>
                  <div style={{
                    flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: spark.userVote === 'DOWN' ? SF.fire + '20' : SF.bg,
                    color: spark.userVote === 'DOWN' ? SF.fire : SF.textSecondary,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}>
                    <DislikeOutlined /> Passer
                  </div>
                </div>
              )}
            </div>
          )) : (
            <EmptyFlow
              icon="⚡"
              title="Aucun Spark actif"
              subtitle="Soyez le premier à poster anonymement !"
            />
          )}
        </div>
      )}

      {/* === BATTLES — Creative Duels === */}
      {activeSection === 'battles' && (
        <div>
          {/* Create Battle CTA */}
          <div style={{
            background: SF.gradientHot, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            textAlign: 'center', color: 'white',
          }}>
            <TrophyOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>Lancez un Battle !</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, marginBottom: 10 }}>
              Défiez quelqu'un dans un duel créatif
            </div>
            <div style={{
              padding: '8px 20px', borderRadius: 20, display: 'inline-block',
              background: 'rgba(255,255,255,0.25)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              ⚔️ Lancer un Battle
            </div>
          </div>

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
                  Thème : {battle.theme}
                </div>

                {/* VS display */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,  padding: '8px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar size={40} src={battle.creatorAvatar}
                      icon={!battle.creatorAvatar ? <UserOutlined /> : undefined}
                      style={{ background: !battle.creatorAvatar ? SF.primary : undefined }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: SF.text, marginTop: 4 }}>
                      {battle.creatorName}
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
                  <div style={{
                    marginTop: 8, padding: '6px 0', textAlign: 'center', borderRadius: 20,
                    background: SF.gradientHot, color: 'white', fontWeight: 700,
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    🥊 Relever le défi !
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyFlow
              icon="⚔️"
              title="Aucun Battle en cours"
              subtitle="Lancez le premier duel créatif !"
            />
          )}
        </div>
      )}

      {/* === QUESTS — Gamified Missions === */}
      {activeSection === 'quests' && (
        <div>
          {/* Quest intro */}
          <div style={{
            background: SF.gradientPrimary, borderRadius: SF.radius, padding: 16, marginBottom: 12,
            textAlign: 'center', color: 'white',
          }}>
            <StarOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>Quêtes SpaceFlow</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              Complétez des missions, gagnez des points et des badges !
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

                {quest.expiresAt && (
                  <div style={{ fontSize: 10, color: SF.textMuted, marginTop: 4 }}>
                    <ClockCircleOutlined /> Expire : {new Date(quest.expiresAt).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyFlow
              icon="🎯"
              title="Aucune quête disponible"
              subtitle="De nouvelles quêtes arrivent bientôt !"
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
