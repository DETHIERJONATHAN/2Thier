import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Avatar, Spin, Empty, Modal, Button, Input, DatePicker, Upload, Carousel, Select, message } from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload';
import { PlusOutlined, EditOutlined, DeleteOutlined, HeartFilled, CalendarOutlined, CameraOutlined, LeftOutlined, RightOutlined, EyeOutlined, InboxOutlined, CloseCircleFilled, PlayCircleFilled, VideoCameraOutlined } from '@ant-design/icons';
import { SF } from './ZhiiveTheme';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

// ── Types ──
interface HiveLiveMomentMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string | null;
  sortOrder: number;
}

interface HiveLiveMoment {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  momentDate: string;
  coverUrl: string | null;
  visibility: string;
  sortOrder: number;
  linkedPostId: string | null;
  media: HiveLiveMomentMedia[];
  linkedPost?: {
    id: string;
    content: string;
    mediaUrls: string[];
    mediaType: string;
    createdAt: string;
  } | null;
  createdAt: string;
}

interface HiveLiveTimelineProps {
  userId: string;
  isOwner?: boolean;
}

// ── Constantes couleurs ──
const HIVE_COLORS = {
  line: SF.primary,
  lineGlow: SF.primaryLight,
  nodeBg: SF.cardBg,
  nodeBorder: SF.primary,
  nodeHover: SF.primaryLight,
  dateBg: SF.primaryAlpha08,
  dateText: SF.primary,
  titleText: SF.text,
  descText: SF.textSecondary,
  emptyBg: SF.bg,
};

// ── Helpers ──
function formatDate(dateStr: string): string {
  const d = dayjs(dateStr);
  return d.format('DD MMM YYYY');
}

function formatYear(dateStr: string): string {
  return dayjs(dateStr).format('YYYY');
}

// ══════════════════════════════════════════════════════════
// HiveLiveTimeline — S-curve proportional lifeline
// ══════════════════════════════════════════════════════════
const HiveLiveTimeline: React.FC<HiveLiveTimelineProps> = ({ userId, isOwner = false }) => {
  const { t } = useTranslation();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook, []);
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [moments, setMoments] = useState<HiveLiveMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMoment, setSelectedMoment] = useState<HiveLiveMoment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMoment, setEditingMoment] = useState<HiveLiveMoment | null>(null);

  // ── Fetch moments ──
  const fetchMoments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<HiveLiveMoment[]>(`/hive-live/${userId}`);
      setMoments(data || []);
    } catch (err) {
      console.error('[HIVE-LIVE] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  useEffect(() => {
    fetchMoments();
  }, [fetchMoments]);

  // ── Calculate proportional time gaps ──
  const timelineData = useMemo(() => {
    if (moments.length === 0) return [];

    const sorted = [...moments].sort(
      (a, b) => new Date(a.momentDate).getTime() - new Date(b.momentDate).getTime()
    );

    const firstTime = new Date(sorted[0].momentDate).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].momentDate).getTime();
    const totalSpan = lastTime - firstTime || 1;

    // Min/max gap constraints for visual readability
    const MIN_GAP = 80;
    const MAX_GAP = 300;
    const BASE_HEIGHT = 160;

    return sorted.map((moment, index) => {
      let proportionalGap = MIN_GAP;
      if (index > 0) {
        const prevTime = new Date(sorted[index - 1].momentDate).getTime();
        const gap = new Date(moment.momentDate).getTime() - prevTime;
        const ratio = gap / totalSpan;
        proportionalGap = Math.max(MIN_GAP, Math.min(MAX_GAP, MIN_GAP + ratio * (MAX_GAP - MIN_GAP) * sorted.length));
      }

      return {
        ...moment,
        side: index % 2 === 0 ? 'left' as const : 'right' as const,
        gapBefore: index === 0 ? 0 : proportionalGap,
        yOffset: 0,
        yearGroup: formatYear(moment.momentDate),
      };
    });
  }, [moments]);

  // ── CRUD handlers ──
  const handleDelete = useCallback(async (momentId: string) => {
    Modal.confirm({
      title: t('hive.deleteMomentTitle', 'Supprimer ce moment ?'),
      content: t('hive.deleteMomentContent', 'Cette action est irréversible.'),
      okText: t('common.delete', 'Supprimer'),
      okType: 'danger',
      cancelText: t('common.cancel', 'Annuler'),
      onOk: async () => {
        try {
          await api.delete(`/hive-live/${momentId}`);
          message.success(t('hive.momentDeleted', 'Moment supprimé'));
          setSelectedMoment(null);
          fetchMoments();
        } catch {
          message.error(t('hive.errorDeleting', 'Erreur lors de la suppression'));
        }
      },
    });
  }, [api, fetchMoments, t]);

  // ── Empty state ──
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: HIVE_COLORS.emptyBg,
        borderRadius: SF.radius,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
        <h3 style={{ color: SF.text, margin: '0 0 8px', fontSize: 18 }}>
          {isOwner
            ? t('hive.emptyTimelineOwner', 'Votre Hive Live est vide')
            : t('hive.emptyTimeline', 'Aucun moment partagé')}
        </h3>
        <p style={{ color: SF.textSecondary, margin: '0 0 20px', fontSize: 14 }}>
          {isOwner
            ? t('hive.emptyTimelineDesc', 'Commencez à raconter votre histoire en ajoutant un premier moment.')
            : t('hive.emptyTimelineDescOther', 'Cette personne n\'a pas encore partagé de moments.')}
        </p>
        {isOwner && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingMoment(null); setShowCreateModal(true); }}
            style={{
              background: SF.primary,
              borderColor: SF.primary,
              borderRadius: SF.radiusSm,
              height: 40,
            }}
          >
            {t('hive.addFirstMoment', 'Ajouter un moment')}
          </Button>
        )}

        {/* Create Modal — must be inside the empty state return */}
        <MomentFormModal
          visible={showCreateModal}
          moment={editingMoment}
          onClose={() => { setShowCreateModal(false); setEditingMoment(null); }}
          onSaved={() => { setShowCreateModal(false); setEditingMoment(null); fetchMoments(); }}
          api={api}
        />
      </div>
    );
  }

  // ── Calculate cumulative Y positions ──
  let cumulativeY = 40;
  const positionedData = timelineData.map((item, index) => {
    cumulativeY += item.gapBefore;
    const y = cumulativeY;
    cumulativeY += 100; // node height
    return { ...item, y };
  });
  const totalHeight = cumulativeY + 60;

  // ── Year separators ──
  const yearChanges: { year: string; y: number }[] = [];
  let lastYear = '';
  for (const item of positionedData) {
    if (item.yearGroup !== lastYear) {
      yearChanges.push({ year: item.yearGroup, y: item.y - 30 });
      lastYear = item.yearGroup;
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Header + Add button */}
      {isOwner && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '0 0 16px',
        }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingMoment(null); setShowCreateModal(true); }}
            style={{
              background: SF.primary,
              borderColor: SF.primary,
              borderRadius: SF.radiusSm,
              height: 36,
              fontSize: 13,
            }}
          >
            {t('hive.addMoment', 'Ajouter un moment')}
          </Button>
        </div>
      )}

      {/* Timeline container */}
      <div style={{
        position: 'relative',
        minHeight: totalHeight,
        padding: '0 16px',
      }}>
        {/* Central vertical S-line (SVG) */}
        <svg
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 200,
            height: totalHeight,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id="hive-line-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SF.primary} stopOpacity="0.3" />
              <stop offset="50%" stopColor={SF.primary} stopOpacity="1" />
              <stop offset="100%" stopColor={SF.primaryLight} stopOpacity="0.5" />
            </linearGradient>
            <filter id="hive-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* S-curve path connecting all nodes */}
          {positionedData.length > 1 && (
            <path
              d={buildSCurvePath(positionedData)}
              fill="none"
              stroke="url(#hive-line-grad)"
              strokeWidth="3"
              filter="url(#hive-glow)"
              strokeLinecap="round"
            />
          )}
          
          {/* Single dot for 1 moment */}
          {positionedData.length === 1 && (
            <circle cx={100} cy={positionedData[0].y + 40} r="6" fill={SF.primary} filter="url(#hive-glow)" />
          )}
        </svg>

        {/* Year labels */}
        {yearChanges.map(({ year, y }) => (
          <div
            key={year}
            style={{
              position: 'absolute',
              left: '50%',
              top: y,
              transform: 'translateX(-50%)',
              background: HIVE_COLORS.dateBg,
              color: HIVE_COLORS.dateText,
              padding: '4px 16px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              zIndex: 2,
            }}
          >
            {year}
          </div>
        ))}

        {/* Moment cards */}
        {positionedData.map((item, index) => (
          <MomentCard
            key={item.id}
            moment={item}
            side={item.side}
            y={item.y}
            isOwner={isOwner}
            onSelect={() => setSelectedMoment(item)}
            onEdit={() => { setEditingMoment(item); setShowCreateModal(true); }}
            onDelete={() => handleDelete(item.id)}
          />
        ))}

        {/* Center dots on the line for each moment */}
        {positionedData.map((item) => (
          <div
            key={`dot-${item.id}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: item.y + 36,
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: SF.primary,
              border: `3px solid ${SF.cardBg}`,
              boxShadow: `0 0 0 3px ${SF.primaryLight}`,
              zIndex: 3,
              cursor: 'pointer',
            }}
            onClick={() => setSelectedMoment(item)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      <MomentDetailModal
        moment={selectedMoment}
        onClose={() => setSelectedMoment(null)}
        isOwner={isOwner}
        onEdit={() => {
          if (selectedMoment) {
            setEditingMoment(selectedMoment);
            setSelectedMoment(null);
            setShowCreateModal(true);
          }
        }}
        onDelete={() => selectedMoment && handleDelete(selectedMoment.id)}
      />

      {/* Create/Edit Modal */}
      <MomentFormModal
        visible={showCreateModal}
        moment={editingMoment}
        onClose={() => { setShowCreateModal(false); setEditingMoment(null); }}
        onSaved={() => { setShowCreateModal(false); setEditingMoment(null); fetchMoments(); }}
        api={api}
      />
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// buildSCurvePath — Generate smooth S-curve SVG path
// ══════════════════════════════════════════════════════════
function buildSCurvePath(items: Array<{ side: 'left' | 'right'; y: number }>): string {
  const CENTER_X = 100;
  const AMPLITUDE = 60; // How far left/right the curve wanders

  const points = items.map((item) => ({
    x: CENTER_X + (item.side === 'left' ? -AMPLITUDE : AMPLITUDE),
    y: item.y + 40,
  }));

  if (points.length < 2) return '';

  let d = `M ${CENTER_X} ${points[0].y - 20}`;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) {
      d += ` C ${CENTER_X} ${p.y - 10}, ${p.x} ${p.y - 20}, ${p.x} ${p.y}`;
    } else {
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      d += ` C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    }
  }

  // End back at center
  const last = points[points.length - 1];
  d += ` C ${last.x} ${last.y + 20}, ${CENTER_X} ${last.y + 30}, ${CENTER_X} ${last.y + 40}`;

  return d;
}

// ══════════════════════════════════════════════════════════
// MomentCard — Individual timeline card
// ══════════════════════════════════════════════════════════
interface MomentCardProps {
  moment: HiveLiveMoment;
  side: 'left' | 'right';
  y: number;
  isOwner: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MomentCard: React.FC<MomentCardProps> = React.memo(({
  moment, side, y, isOwner, onSelect, onEdit, onDelete,
}) => {
  const [hovered, setHovered] = useState(false);
  const coverImg = moment.coverUrl || (moment.media?.[0]?.url);

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        [side === 'left' ? 'right' : 'left']: '52%',
        width: 'calc(46% - 16px)',
        maxWidth: 360,
        background: SF.cardBg,
        borderRadius: SF.radius,
        boxShadow: hovered ? SF.shadowMd : SF.shadow,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        zIndex: 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Cover image */}
      {coverImg && (
        <div style={{
          height: 120,
          background: `url(${coverImg}) center/cover`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 40,
            background: `linear-gradient(transparent, rgba(0,0,0,0.4))`,
          }} />
          {moment.media.length > 1 && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: SF.overlayDarkMd,
              color: SF.textLight,
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}>
              {moment.media.length} 📷
            </div>
          )}
        </div>
      )}

      {/* Card content */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}>
          <CalendarOutlined style={{ color: SF.primary, fontSize: 11 }} />
          <span style={{
            color: SF.primary,
            fontSize: 11,
            fontWeight: 600,
          }}>
            {formatDate(moment.momentDate)}
          </span>
        </div>

        <h4 style={{
          margin: '0 0 4px',
          fontSize: 14,
          fontWeight: 700,
          color: SF.text,
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {moment.title}
        </h4>

        {moment.description && (
          <p style={{
            margin: 0,
            fontSize: 12,
            color: SF.textSecondary,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {moment.description}
          </p>
        )}

        {/* Linked post badge */}
        {moment.linkedPostId && (
          <div style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: SF.primaryLight,
            fontSize: 11,
          }}>
            <HeartFilled style={{ fontSize: 10 }} />
            <span>{('hive.linkedToBuzz')}</span>
          </div>
        )}
      </div>

      {/* Owner actions */}
      {isOwner && hovered && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            gap: 4,
          }}
          onClick={e => e.stopPropagation()}
        >
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={onEdit}
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: 6,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: 6,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════
// MomentDetailModal — Full detail view with media carousel
// ══════════════════════════════════════════════════════════
interface MomentDetailModalProps {
  moment: HiveLiveMoment | null;
  onClose: () => void;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const MomentDetailModal: React.FC<MomentDetailModalProps> = ({
  moment, onClose, isOwner, onEdit, onDelete,
}) => {
  const { t } = useTranslation();
  if (!moment) return null;

  const allMedia = moment.media?.length > 0
    ? moment.media
    : moment.coverUrl
      ? [{ id: 'cover', url: moment.coverUrl, type: 'image' as const, caption: null, sortOrder: 0 }]
      : [];

  return (
    <Modal
      open={!!moment}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      styles={{
        body: { padding: 0 },
        content: { borderRadius: SF.radius, overflow: 'hidden' },
      }}
    >
      {/* Media carousel */}
      {allMedia.length > 0 && (
        <div style={{ position: 'relative', background: SF.black }}>
          <Carousel
            arrows
            prevArrow={<LeftOutlined />}
            nextArrow={<RightOutlined />}
            dots={allMedia.length > 1}
          >
            {allMedia.map((m) => (
              <div key={m.id}>
                {m.type === 'video' ? (
                  <video
                    src={m.url}
                    controls
                    style={{ width: '100%', maxHeight: 400, objectFit: 'contain', background: SF.black }}
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={m.caption || moment.title}
                    style={{ width: '100%', maxHeight: 400, objectFit: 'contain', background: SF.black }}
                  />
                )}
              </div>
            ))}
          </Carousel>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}>
          <CalendarOutlined style={{ color: SF.primary }} />
          <span style={{ color: SF.primary, fontWeight: 600, fontSize: 13 }}>
            {formatDate(moment.momentDate)}
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: SF.textMuted,
            padding: '2px 10px',
            background: HIVE_COLORS.dateBg,
            borderRadius: 12,
          }}>
            {moment.visibility === 'public' ? '🌍' : moment.visibility === 'crew' ? '👥' : '🔒'}
            {' '}
            {moment.visibility === 'public'
              ? t('hive.visibilityPublic', 'Public')
              : moment.visibility === 'crew'
                ? t('hive.visibilityCrew', 'Crew')
                : t('hive.visibilityPrivate', 'Privé')}
          </span>
        </div>

        <h2 style={{
          margin: '0 0 12px',
          fontSize: 20,
          fontWeight: 700,
          color: SF.text,
        }}>
          {moment.title}
        </h2>

        {moment.description && (
          <p style={{
            color: SF.textSecondary,
            fontSize: 14,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            margin: '0 0 16px',
          }}>
            {moment.description}
          </p>
        )}

        {/* Linked post reference */}
        {moment.linkedPost && (
          <div style={{
            padding: 12,
            background: HIVE_COLORS.dateBg,
            borderRadius: SF.radiusSm,
            borderLeft: `3px solid ${SF.primary}`,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: SF.primary, fontWeight: 600, marginBottom: 4 }}>
              <HeartFilled /> {t('hive.linkedBuzz', 'Buzz lié')}
            </div>
            <p style={{
              margin: 0,
              fontSize: 13,
              color: SF.textSecondary,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {moment.linkedPost.content}
            </p>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            borderTop: `1px solid ${SF.border}`,
            paddingTop: 14,
          }}>
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
              style={{ borderRadius: SF.radiusSm }}
            >
              {t('common.edit', 'Modifier')}
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              style={{ borderRadius: SF.radiusSm }}
            >
              {t('common.delete', 'Supprimer')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════
// MomentFormModal — Create / Edit moment
// ══════════════════════════════════════════════════════════
interface MediaItem {
  uid: string;
  file?: File;
  url?: string; // existing URL (edit mode)
  preview: string;
  type: 'image' | 'video';
  uploading?: boolean;
}

interface MomentFormModalProps {
  visible: boolean;
  moment: HiveLiveMoment | null;
  onClose: () => void;
  onSaved: () => void;
  api: ReturnType<typeof useAuthenticatedApi>;
}

const MomentFormModal: React.FC<MomentFormModalProps> = ({
  visible, moment, onClose, onSaved, api,
}) => {
  const { t } = useTranslation();
  const isEditing = !!moment;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [momentDate, setMomentDate] = useState<dayjs.Dayjs | null>(null);
  const [visibility, setVisibility] = useState<string>('public');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Populate on edit
  useEffect(() => {
    if (moment) {
      setTitle(moment.title);
      setDescription(moment.description || '');
      setMomentDate(dayjs(moment.momentDate));
      setVisibility(moment.visibility);
      // Convert existing media to MediaItem format
      const existing: MediaItem[] = (moment.media || []).map((m, i) => ({
        uid: `existing-${i}`,
        url: m.url,
        preview: m.url,
        type: m.type,
      }));
      if (existing.length === 0 && moment.coverUrl) {
        existing.push({ uid: 'cover-0', url: moment.coverUrl, preview: moment.coverUrl, type: 'image' });
      }
      setMediaItems(existing);
    } else {
      setTitle('');
      setDescription('');
      setMomentDate(dayjs());
      setVisibility('public');
      setMediaItems([]);
    }
  }, [moment, visible]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      mediaItems.forEach(item => {
        if (item.file && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  const handleFilesSelected = async (files: FileList | File[]) => {
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const allowed = /^(image|video)\//;
    const newItems: MediaItem[] = [];

    for (const file of Array.from(files)) {
      if (!allowed.test(file.type)) {
        message.warning(t('hive.fileTypeNotAllowed', 'Seules les images et vidéos sont autorisées'));
        continue;
      }
      if (file.size > MAX_SIZE) {
        message.warning(t('hive.fileTooLarge', 'Fichier trop volumineux (max 100 Mo)'));
        continue;
      }
      newItems.push({
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
      });
    }

    if (newItems.length > 0) {
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const handleRemoveMedia = (uid: string) => {
    setMediaItems(prev => {
      const item = prev.find(m => m.uid === uid);
      if (item?.file && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      return prev.filter(m => m.uid !== uid);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !momentDate) {
      message.warning(t('hive.fillRequired', 'Remplissez le titre et la date'));
      return;
    }

    setSaving(true);
    try {
      // Upload any new files first
      const uploadedUrls: { url: string; type: 'image' | 'video' }[] = [];
      const filesToUpload = mediaItems.filter(m => m.file);

      if (filesToUpload.length > 0) {
        setUploading(true);
        const formData = new FormData();
        filesToUpload.forEach(m => formData.append('files', m.file!));
        const uploadResult = await api.post('/wall/upload', formData) as { urls?: string[] };
        const urls = uploadResult?.urls || [];
        setUploading(false);

        if (urls.length !== filesToUpload.length) {
          message.error(t('hive.uploadError', "Erreur lors de l'upload des fichiers"));
          setSaving(false);
          return;
        }

        filesToUpload.forEach((item, i) => {
          uploadedUrls.push({ url: urls[i], type: item.type });
        });
      }

      // Build final media list: existing URLs + newly uploaded
      const finalMedia = mediaItems.map(item => {
        if (item.url && !item.file) {
          return { url: item.url, type: item.type };
        }
        const uploaded = uploadedUrls.shift();
        return uploaded || { url: '', type: item.type as 'image' | 'video' };
      }).filter(m => m.url);

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        momentDate: momentDate.toISOString(),
        visibility,
        coverUrl: finalMedia[0]?.url || undefined,
        media: finalMedia.map((m, i) => ({
          url: m.url,
          type: m.type,
          sortOrder: i,
        })),
      };

      if (isEditing) {
        await api.put(`/hive-live/${moment!.id}`, payload);
        message.success(t('hive.momentUpdated', 'Moment mis à jour'));
      } else {
        await api.post('/hive-live', payload);
        message.success(t('hive.momentCreated', 'Moment ajouté à votre Hive Live'));
      }
      onSaved();
    } catch (err) {
      message.error(t('hive.errorSaving', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <span style={{ color: SF.text, fontWeight: 700 }}>
          {isEditing
            ? t('hive.editMoment', 'Modifier le moment')
            : t('hive.newMoment', 'Nouveau moment')}
        </span>
      }
      okText={uploading ? t('hive.uploading', 'Upload...') : (isEditing ? t('common.save', 'Enregistrer') : t('hive.addMoment', 'Ajouter'))}
      cancelText={t('common.cancel', 'Annuler')}
      onOk={handleSave}
      confirmLoading={saving || uploading}
      width={540}
      centered
      styles={{ body: { padding: '16px 0' } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: SF.text, marginBottom: 4, display: 'block' }}>
            {t('hive.momentTitle', 'Titre')} *
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('hive.momentTitlePlaceholder', 'Ex: Premier jour chez Colony')}
            maxLength={200}
            style={{ borderRadius: SF.radiusSm }}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: SF.text, marginBottom: 4, display: 'block' }}>
            {t('hive.momentDate', 'Date')} *
          </label>
          <DatePicker
            value={momentDate}
            onChange={setMomentDate}
            style={{ width: '100%', borderRadius: SF.radiusSm }}
            format="DD/MM/YYYY"
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: SF.text, marginBottom: 4, display: 'block' }}>
            {t('hive.momentDescription', 'Description')}
          </label>
          <Input.TextArea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('hive.momentDescPlaceholder', 'Racontez ce moment...')}
            maxLength={5000}
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{ borderRadius: SF.radiusSm }}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: SF.text, marginBottom: 4, display: 'block' }}>
            {t('hive.momentVisibility', 'Visibilité')}
          </label>
          <Select
            value={visibility}
            onChange={setVisibility}
            style={{ width: '100%' }}
            options={[
              { value: 'public', label: `🌍 ${t('hive.visibilityPublic', 'Public')}` },
              { value: 'crew', label: `👥 ${t('hive.visibilityCrew', 'Crew')}` },
              { value: 'private', label: `🔒 ${t('hive.visibilityPrivate', 'Privé')}` },
            ]}
          />
        </div>

        {/* ── Media Upload Zone ── */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: SF.text, marginBottom: 4, display: 'block' }}>
            {t('hive.momentMedia', 'Photos / Vidéos')}
          </label>

          {/* Media previews grid */}
          {mediaItems.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 8,
              marginBottom: 10,
            }}>
              {mediaItems.map(item => (
                <div key={item.uid} style={{
                  position: 'relative',
                  borderRadius: 8,
                  overflow: 'hidden',
                  aspectRatio: '1',
                  background: SF.black,
                }}>
                  {item.type === 'video' ? (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, ${SF.dark}, ${SF.darkDeep})`,
                    }}>
                      <PlayCircleFilled style={{ fontSize: 32, color: SF.overlayPlayBtn }} />
                    </div>
                  ) : (
                    <img
                      src={item.preview}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <div
                    onClick={() => handleRemoveMedia(item.uid)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      cursor: 'pointer', background: SF.overlayDarkMd,
                      borderRadius: '50%', width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <CloseCircleFilled style={{ fontSize: 16, color: SF.textLight }} />
                  </div>
                  {item.type === 'video' && (
                    <div style={{
                      position: 'absolute', bottom: 4, left: 4,
                      background: SF.overlayDarkStrong, borderRadius: 4,
                      padding: '1px 6px', fontSize: 10, color: SF.textLight,
                    }}>
                      <VideoCameraOutlined /> {t('hive.videoLabel', 'Vidéo')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drop zone / file picker */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${SF.border}`,
              borderRadius: 10,
              padding: mediaItems.length > 0 ? '12px 16px' : '28px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: SF.primaryAlpha03,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = SF.primary; e.currentTarget.style.background = SF.primaryAlpha08; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = SF.border; e.currentTarget.style.background = SF.primaryAlpha03; }}
          >
            {mediaItems.length === 0 ? (
              <>
                <InboxOutlined style={{ fontSize: 36, color: SF.primary, marginBottom: 8 }} />
                <div style={{ fontSize: 14, color: SF.text, fontWeight: 500 }}>
                  {t('hive.dropMediaHere', 'Glissez vos photos & vidéos ici')}
                </div>
                <div style={{ fontSize: 12, color: SF.textMuted, marginTop: 4 }}>
                  {t('hive.orClickToSelect', 'ou cliquez pour parcourir')}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <PlusOutlined style={{ color: SF.primary }} />
                <span style={{ fontSize: 13, color: SF.primary, fontWeight: 500 }}>
                  {t('hive.addMoreMedia', 'Ajouter d\'autres fichiers')}
                </span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesSelected(e.target.files);
              }
              e.target.value = '';
            }}
          />

          <div style={{ fontSize: 11, color: SF.textMuted, marginTop: 6 }}>
            {t('hive.mediaFormats', 'Images (JPG, PNG, GIF, WebP) • Vidéos (MP4, MOV, WebM) • Max 100 Mo')}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HiveLiveTimeline;
