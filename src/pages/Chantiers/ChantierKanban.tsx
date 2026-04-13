import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGrabScroll } from '../../hooks/useGrabScroll';
import { Spin, message, Avatar, Tooltip, Empty, Tag, Button, Modal, DatePicker, Input, Select, Popconfirm, Badge, Grid } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import {
  UserOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  WarningOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  PlusOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

dayjs.locale('fr');
dayjs.extend(isBetween);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;

// ─── Presets de dates ───
type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'custom';
type DateField = 'createdAt' | 'signedAt' | 'plannedDate' | 'deliveryDate' | 'receptionDate' | 'completedDate';

const DATE_FIELDS: { key: DateField; label: string; icon: string; color: string }[] = [
  { key: 'createdAt', label: "Date d'arrivée", icon: '📥', color: '#8c8c8c' },
  { key: 'signedAt', label: 'Signature', icon: '✍️', color: '#1677ff' },
  { key: 'plannedDate', label: 'Chantier prévu', icon: '📅', color: '#fa8c16' },
  { key: 'deliveryDate', label: 'Livraison', icon: '📦', color: '#722ed1' },
  { key: 'receptionDate', label: 'Réception', icon: '✅', color: '#52c41a' },
  { key: 'completedDate', label: 'Fin chantier', icon: '🏁', color: '#f5222d' },
];

const DATE_PRESETS: { key: DatePreset; label: string; getRange: () => [Dayjs, Dayjs] }[] = [
  { key: 'today', label: "Aujourd'hui", getRange: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { key: 'yesterday', label: 'Hier', getRange: () => [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { key: 'this_week', label: 'Cette semaine', getRange: () => [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] },
  { key: '7days', label: '7 derniers jours', getRange: () => [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
  { key: 'this_month', label: 'Ce mois', getRange: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { key: 'last_month', label: 'Mois dernier', getRange: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { key: '30days', label: '30 derniers jours', getRange: () => [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] },
  { key: 'this_quarter', label: 'Ce trimestre', getRange: () => [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
];
import { renderProductIcon } from '../../components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/ProductFilterPanel';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';
import { useChantiers } from '../../hooks/useChantiers';
import { useChantierStatuses } from '../../hooks/useChantierStatuses';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useTeams } from '../../hooks/useTeams';
import type { Chantier, ChantierStatus, Team, Technician } from '../../types/chantier';
import { useTranslation } from 'react-i18next';
import { SF } from '../../components/zhiive/ZhiiveTheme';
import { logger } from '../../lib/logger';

// ─── Configuration MultiBackend ───
const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { enableMouseEvents: false, delayTouchStart: 300 },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

const ITEM_TYPE = 'CHANTIER_CARD';
const TECH_DRAG_TYPE = 'TECHNICIAN';
const TEAM_DRAG_TYPE = 'TEAM';

// 🎯 Custom Drag Layer — affiche "En déplacement..." pendant le drag (comme les Leads)
const CustomDragLayer: React.FC = () => {
  const { t } = useTranslation();
  const { isDragging, currentOffset } = useDragLayer((monitor) => ({
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) return null;

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        left: currentOffset.x,
        top: currentOffset.y,
        transform: 'rotate(5deg)',
        opacity: 0.9,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(9,30,66,.35)',
          padding: '12px 16px',
          minWidth: '180px',
          border: '2px solid #0079BF',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#172B4D' }}>
          🚚 En déplacement...
        </span>
      </div>
    </div>
  );
};

// 🎯 Auto-scroll du board pendant le drag (comme les Leads)
const AutoScrollDragTracker: React.FC<{ boardRef: React.RefObject<HTMLDivElement | null> }> = ({ boardRef }) => {
  const dragXRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);
  const { isDragging, clientOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));

  useEffect(() => {
    dragActiveRef.current = isDragging;
    dragXRef.current = clientOffset?.x ?? null;
  }, [isDragging, clientOffset]);

  useEffect(() => {
    if (!boardRef.current) return;
    const boardEl = boardRef.current;
    let rafId: number | null = null;
    let lastScrollTime = 0;

    const tick = () => {
      if (!dragActiveRef.current || dragXRef.current === null) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const now = Date.now();
      if (now - lastScrollTime < 16) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastScrollTime = now;

      const rect = boardEl.getBoundingClientRect();
      const x = dragXRef.current;
      const distFromLeft = x - rect.left;
      const distFromRight = rect.right - x;
      const edgeSize = 160;
      const maxSpeed = 40;

      if (distFromLeft >= 0 && distFromLeft < edgeSize) {
        const ratio = 1 - (distFromLeft / edgeSize);
        const speed = Math.pow(ratio, 1.6) * maxSpeed;
        boardEl.scrollLeft = Math.max(0, boardEl.scrollLeft - speed);
      } else if (distFromRight >= 0 && distFromRight < edgeSize) {
        const ratio = 1 - (distFromRight / edgeSize);
        const speed = Math.pow(ratio, 1.6) * maxSpeed;
        const maxScrollLeft = boardEl.scrollWidth - boardEl.clientWidth;
        boardEl.scrollLeft = Math.min(maxScrollLeft, boardEl.scrollLeft + speed);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [boardRef]);

  return null;
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(24, 144, 255, ${alpha})`;
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
};

interface DragItem {
  id: string;
  type: string;
  fromColumn: string;
}

// ═══ Chantier Card ═══
interface ChantierCardProps {
  chantier: Chantier;
  onView: () => void;
  onViewCompta?: () => void;
  onDragStart?: (statusId: string) => void;
  onDragEnd?: () => void;
  onTechDrop?: (chantierId: string, technicianId: string, role: 'CHEF_EQUIPE' | 'TECHNICIEN') => void;
  onTeamDrop?: (chantierId: string, teamId: string) => void;
  canEdit?: boolean;
  canFinances?: boolean;
  canValidate?: boolean;
}

const ChantierCard: React.FC<ChantierCardProps> = ({ chantier, onView, onViewCompta, onDragStart, onDragEnd, onTechDrop, onTeamDrop, canEdit = true, canFinances = true, canValidate = true }) => {
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Accept tech/team drops on this card
  const [{ isOverTech }, techDrop] = useDrop({
    accept: [TECH_DRAG_TYPE, TEAM_DRAG_TYPE],
    drop: (item: { type: string; technicianId?: string; teamId?: string }) => {
      if (item.type === TECH_DRAG_TYPE && item.technicianId) {
        onTechDrop?.(chantier.id, item.technicianId, 'TECHNICIEN');
      } else if (item.type === TEAM_DRAG_TYPE && item.teamId) {
        onTeamDrop?.(chantier.id, item.teamId);
      }
    },
    collect: (monitor) => ({
      isOverTech: monitor.isOver(),
    }),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: (): DragItem => {
      onDragStart?.(chantier.statusId || '');
      return {
        id: chantier.id,
        type: ITEM_TYPE,
        fromColumn: chantier.statusId || '',
      };
    },
    end: () => {
      onDragEnd?.();
    },
    canDrag: () => !!canEdit,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const displayName = chantier.clientName
    || (chantier.Lead
      ? [chantier.Lead.firstName, chantier.Lead.lastName].filter(Boolean).join(' ')
        || chantier.Lead.company
      : 'Client inconnu')
    || 'Client inconnu';

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) hasMoved.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (Date.now() - touchStartTime.current < 300 && !hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => onView(), 0);
    }
  };

  // Combine drag and drop refs
  const cardRef = useRef<HTMLDivElement>(null);
  drag(techDrop(cardRef));

  return (
    <div
      ref={cardRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: isDragging ? 'rotate(3deg)' : 'none',
        touchAction: 'auto',
        userSelect: 'none',
      }}
      role="button" tabIndex={0} onClick={() => !isDragging && onView()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          backgroundColor: isOverTech ? '#f0e6ff' : chantier.isValidated ? '#fff' : '#fffbe6',
          borderRadius: 6,
          boxShadow: isOverTech ? '0 0 0 2px #722ed1, 0 2px 8px rgba(114,46,209,0.25)' : '0 1px 0 rgba(9,30,66,.25)',
          padding: '6px 7px',
          cursor: 'pointer',
          transition: 'background-color 0.1s ease',
          marginBottom: 5,
          borderLeft: chantier.isValidated ? 'none' : '3px solid #faad14',
        }}
      >
        {/* Barre produit colorée */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              height: 4,
              flex: 1,
              borderRadius: 3,
              backgroundColor: chantier.productColor || '#722ed1',
            }}
          />
        </div>

        {/* Badge produit + validation + facturation */}
        <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Tag
            color={chantier.productColor || 'purple'}
            style={{ fontSize: 10, margin: 0, lineHeight: '18px', padding: '0 5px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {chantier.productIcon && <span style={{ marginRight: 2 }}>{renderProductIcon(chantier.productIcon, 11)}</span>}
            {chantier.productLabel}
            {chantier.customLabel && ` — ${chantier.customLabel}`}
          </Tag>
          {!chantier.isValidated && canValidate && (
            <Tooltip title="Non validé — cliquez pour valider">
              <Tag
                color="warning"
                style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCompta?.();
                }}
              >
                <SafetyCertificateOutlined style={{ fontSize: 10 }} />
              </Tag>
            </Tooltip>
          )}
          {/* Mini indicateur facturation en haut à droite */}
          {canFinances && chantier._invoiceSummary && (
            <Tooltip title={`Factures: ${chantier._invoiceSummary.paid}/${chantier._invoiceSummary.total} payées${chantier._invoiceSummary.overdue > 0 ? ` — ${chantier._invoiceSummary.overdue} en retard !` : ''}${chantier._invoiceSummary.totalAmount > 0 ? `\n${chantier._invoiceSummary.paidAmount.toLocaleString('fr-BE')} / ${chantier._invoiceSummary.totalAmount.toLocaleString('fr-BE')} €` : ''}`}>
              <div
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
                role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onViewCompta?.(); }}
              >
                <FileTextOutlined style={{ fontSize: 10, color: chantier._invoiceSummary.overdue > 0 ? '#ff4d4f' : chantier._invoiceSummary.paid === chantier._invoiceSummary.total ? '#52c41a' : '#faad14' }} />
                {/* Mini barre de progression */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: chantier._invoiceSummary.total }).map((_, i) => {
                    const inv = chantier._invoiceSummary!;
                    let color = '#e8e8e8'; // draft
                    if (i < inv.paid) color = '#52c41a'; // payé
                    else if (i < inv.paid + inv.sent) color = '#1677ff'; // envoyé
                    else if (inv.overdue > 0 && i >= inv.total - inv.overdue) color = '#ff4d4f'; // overdue
                    return <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />;
                  })}
                </div>
              </div>
            </Tooltip>
          )}
        </div>

        {/* Nom client */}
        <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </div>

        {/* Infos complémentaires */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          {chantier.siteAddress && (
            <Tooltip title={chantier.siteAddress}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#5e6c84' }}>
                <EnvironmentOutlined style={{ fontSize: 9 }} />
                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chantier.siteAddress}
                </span>
              </div>
            </Tooltip>
          )}

          {canFinances && chantier.amount != null && chantier.amount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#52c41a' }}>
              <DollarOutlined style={{ fontSize: 9 }} />
              <span>{chantier.amount.toLocaleString('fr-BE')} €</span>
            </div>
          )}

          {/* Date de signature */}
          {chantier.signedAt && (
            <div style={{ fontSize: 10, color: '#b3bac5' }}>
              {new Date(chantier.signedAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
            </div>
          )}

          {/* Date chantier prévu */}
          {chantier.plannedDate && (
            <Tooltip title={`Chantier prévu: ${new Date(chantier.plannedDate).toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' })}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#fa8c16' }}>
                📅 {new Date(chantier.plannedDate).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
              </div>
            </Tooltip>
          )}

          {/* Avatar responsable + badges techniciens */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Badges techniciens assignés */}
            {chantier.ChantierAssignments && chantier.ChantierAssignments.length > 0 && (
              <Tooltip title={chantier.ChantierAssignments.map(a => `${a.role === 'CHEF_EQUIPE' ? '👑 ' : '🔧 '}${a.Technician.firstName || ''} ${a.Technician.lastName || ''}${a.Technician.type === 'SUBCONTRACTOR' ? ' (ST)' : ''}`).join('\n')}>
                <Avatar.Group size={20} max={{ count: 3, style: { fontSize: 9, backgroundColor: '#722ed1' } }}>
                  {chantier.ChantierAssignments.map(a => (
                    <Avatar
                      key={a.id}
                      size={20}
                      style={{
                        backgroundColor: a.role === 'CHEF_EQUIPE' ? '#fa8c16' : (a.Technician.color || a.Team?.color || '#722ed1'),
                        fontSize: 9,
                        border: a.role === 'CHEF_EQUIPE' ? '2px solid #fa8c16' : a.Technician.type === 'SUBCONTRACTOR' ? '2px dashed #8c8c8c' : '1px solid #fff',
                      }}
                    >
                      {(a.Technician.firstName?.[0] || '') + (a.Technician.lastName?.[0] || '')}
                    </Avatar>
                  ))}
                </Avatar.Group>
              </Tooltip>
            )}
            {chantier.Responsable ? (
              <Tooltip title={`${chantier.Responsable.firstName} ${chantier.Responsable.lastName}`}>
                <Avatar size={22} style={{ backgroundColor: '#87d068', fontSize: 10 }}>
                  {(chantier.Responsable.firstName?.[0] || '') + (chantier.Responsable.lastName?.[0] || '')}
                </Avatar>
              </Tooltip>
            ) : chantier.Commercial ? (
              <Tooltip title={`${chantier.Commercial.firstName} ${chantier.Commercial.lastName}`}>
                <Avatar size={22} style={{ backgroundColor: '#1677ff', fontSize: 10 }}>
                  {(chantier.Commercial.firstName?.[0] || '') + (chantier.Commercial.lastName?.[0] || '')}
                </Avatar>
              </Tooltip>
            ) : (
              <Avatar size={22} icon={<UserOutlined />} style={{ backgroundColor: '#d9d9d9', fontSize: 10 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══ Kanban Column ═══
interface KanbanColumnProps {
  status: ChantierStatus;
  chantiers: Chantier[];
  onDrop: (chantierId: string, statusId: string) => void;
  onViewChantier: (chantierId: string) => void;
  onViewChantierCompta?: (chantierId: string) => void;
  dropState?: 'allowed' | 'blocked' | 'none';
  onDragStart?: (statusId: string) => void;
  onDragEnd?: () => void;
  onTechDrop?: (chantierId: string, technicianId: string, role: 'CHEF_EQUIPE' | 'TECHNICIEN') => void;
  onTeamDrop?: (chantierId: string, teamId: string) => void;
  canEdit?: boolean;
  canFinances?: boolean;
  canValidate?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, chantiers, onDrop, onViewChantier, onViewChantierCompta, dropState = 'none', onDragStart, onDragEnd, onTechDrop, onTeamDrop, canEdit = true, canFinances = true, canValidate = true }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: DragItem) => {
      if (item.fromColumn !== status.id) {
        onDrop(item.id, status.id);
      }
    },
    canDrop: (item: DragItem) => {
      // Block drop if transition is not allowed
      if (item.fromColumn === status.id) return false;
      return dropState !== 'blocked';
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;
  const isBlocked = isOver && !canDrop && dropState === 'blocked';

  // Visual indicator styles based on drop state
  const borderStyle = isActive
    ? `2px dashed ${status.color}`
    : isBlocked
    ? '2px dashed #ff4d4f'
    : dropState === 'allowed'
    ? `2px dashed ${hexToRgba(status.color, 0.4)}`
    : dropState === 'blocked'
    ? '2px dashed rgba(255, 77, 79, 0.3)'
    : '2px solid transparent';

  const bgStyle = isActive
    ? hexToRgba(status.color, 0.12)
    : isBlocked
    ? 'rgba(255, 77, 79, 0.06)'
    : dropState === 'allowed'
    ? hexToRgba(status.color, 0.05)
    : '#F4F5F7';

  return (
    <div
      ref={drop}
      style={{
        backgroundColor: bgStyle,
        borderRadius: 8,
        width: 'clamp(200px, 60vw, 280px)',
        minWidth: 'clamp(200px, 60vw, 280px)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        alignSelf: 'stretch',
        transition: 'background-color 0.2s, border-color 0.2s',
        border: borderStyle,
        position: 'relative',
      }}
    >
      {/* Blocked overlay icon */}
      {isBlocked && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          background: 'rgba(255,77,79,0.1)',
          borderRadius: '50%',
          padding: 16,
        }}>
          <LockOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
        </div>
      )}
      {/* Header */}
      <div
        style={{
          padding: '8px 10px 6px',
          borderBottom: `2px solid ${status.color}`,
          background: `linear-gradient(135deg, ${hexToRgba(status.color, 0.16)}, ${hexToRgba(status.color, 0.04)})`,
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: status.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status.name}
          </span>
          <span
            style={{
              fontSize: 10,
              color: '#5E6C84',
              backgroundColor: hexToRgba(status.color, 0.2),
              borderRadius: 8,
              padding: '1px 6px',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {chantiers.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          padding: '4px 5px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 80,
        }}
      >
        {chantiers.map(chantier => (
          <ChantierCard
            key={chantier.id}
            chantier={chantier}
            onView={() => onViewChantier(chantier.id)}
            onViewCompta={() => onViewChantierCompta?.(chantier.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onTechDrop={onTechDrop}
            onTeamDrop={onTeamDrop}
            canEdit={canEdit}
            canFinances={canFinances}
            canValidate={canValidate}
          />
        ))}
        {chantiers.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#b3bac5',
            fontSize: 12,
            padding: '20px 8px',
          }}>
            Aucun chantier
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ TechnicianDragItem (panel gauche) ═══
interface TechnicianDragItemProps {
  technician: Technician;
  isSelected: boolean;
  onClick: () => void;
  onDragStart?: () => void;
}

const TechnicianDragItem: React.FC<TechnicianDragItemProps> = ({ technician, isSelected, onClick, onDragStart }) => {
  const [{ isDragging }, drag] = useDrag({
    type: TECH_DRAG_TYPE,
    item: () => {
      onDragStart?.();
      return { type: TECH_DRAG_TYPE, technicianId: technician.id };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const initials = (technician.firstName?.[0] || '') + (technician.lastName?.[0] || '');
  const name = [technician.firstName, technician.lastName].filter(Boolean).join(' ') || technician.email || 'Inconnu';
  const isSubcontractor = technician.type === 'SUBCONTRACTOR';

  // Charge de travail semaine : vert (0-2), orange (3-4), rouge (5+)
  const wc = technician.weekChantierCount || 0;
  const loadColor = wc <= 2 ? '#52c41a' : wc <= 4 ? '#fa8c16' : '#ff4d4f';

  // Disponibilité
  const isBusy = technician.busyToday;
  const isUnavailable = technician.unavailableToday;

  // Spécialités labels
  const specLabels: Record<string, string> = { all: 'ALL', pc: 'PV' };

  // Tooltip détaillé
  const tooltipLines = [
    `${name}${isSubcontractor ? ' (Sous-traitant)' : ''}`,
    `Charge semaine: ${wc} chantier${wc > 1 ? 's' : ''}`,
    isBusy ? '⚡ Sur chantier aujourd\'hui' : '',
    isUnavailable ? '🚫 Indisponible aujourd\'hui' : '',
    technician.specialties?.length ? `Spécialités: ${technician.specialties.map(s => specLabels[s] || s).join(', ')}` : '',
    technician.weekChantiers?.length ? `Cette semaine:\n${technician.weekChantiers.map(c => `  • ${c.clientName || 'Sans nom'} (${c.status})`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line', fontSize: 11 }}>{tooltipLines}</span>} placement="right">
      <div
        ref={drag}
        role="button" tabIndex={0} onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          borderRadius: 6,
          border: isSelected ? '2px solid #722ed1' : isUnavailable ? '1px dashed #ff4d4f' : '1px solid transparent',
          background: isUnavailable ? '#fff1f0' : isSelected ? '#f9f0ff' : isDragging ? '#e6f4ff' : '#fff',
          cursor: isUnavailable ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.5 : isUnavailable ? 0.6 : 1,
          marginBottom: 3,
          transition: 'all 0.15s',
          fontSize: 12,
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar size={24} style={{ backgroundColor: technician.color || technician.teams?.[0]?.teamColor || '#1677ff', fontSize: 10, border: isSubcontractor ? '2px dashed #8c8c8c' : undefined }}>
            {initials}
          </Avatar>
          {isBusy && !isUnavailable && (
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fa8c16', border: '1px solid #fff' }} />
          )}
          {isUnavailable && (
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff4d4f', border: '1px solid #fff' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
            <span style={{ fontWeight: 500, color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
              {name}
            </span>
            {isSubcontractor && <span style={{ fontSize: 8, color: '#8c8c8c', flexShrink: 0 }}>🏢</span>}
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 1 }}>
            {technician.specialties?.map(s => (
              <span key={s} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: s === 'all' ? '#e6f7ff' : '#f6ffed', color: s === 'all' ? '#1890ff' : '#52c41a', lineHeight: '16px' }}>
                {specLabels[s] || s}
              </span>
            ))}
            {technician.teams && technician.teams.length > 0 && (
              <span style={{ fontSize: 8, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {technician.teams.map(t => t.memberRole === 'LEADER' ? `👑${t.teamName}` : t.teamName).join(', ')}
              </span>
            )}
          </div>
        </div>
        <Badge
          count={wc}
          showZero
          style={{ backgroundColor: loadColor, fontSize: 9, minWidth: 18, height: 18, lineHeight: '18px' }}
        />
      </div>
    </Tooltip>
  );
};

// ═══ TeamDragItem (panel gauche) ═══
interface TeamDragItemProps {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onAddMember?: () => void;
  onToggleLeader?: (memberId: string, currentRole: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onDragStart?: () => void;
}

const TeamDragItem: React.FC<TeamDragItemProps> = ({ team, isSelected, onClick, onDelete, onAddMember, onToggleLeader, onRemoveMember, onDragStart }) => {
  const [expanded, setExpanded] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: TEAM_DRAG_TYPE,
    item: () => {
      onDragStart?.();
      return { type: TEAM_DRAG_TYPE, teamId: team.id };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const leaders = team.Members.filter(m => m.role === 'LEADER');
  const members = team.Members.filter(m => m.role === 'MEMBER');

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        ref={drag}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          borderRadius: 6,
          border: isSelected ? `2px solid ${team.color}` : '1px solid transparent',
          background: isSelected ? `${team.color}12` : isDragging ? '#e6f4ff' : '#fff',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.15s',
          fontSize: 12,
        }}
      >
        <div
          style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: team.color, flexShrink: 0 }}
          role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onClick(); }}
        />
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <div style={{ fontWeight: 600, color: '#262626', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team.name}
          </div>
          <div style={{ fontSize: 10, color: '#8c8c8c' }}>
            {leaders.length > 0 && <span>👑 {leaders.map(l => l.Technician.firstName).join(', ')} </span>}
            {members.length > 0 && <span>🔧 {members.length}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: '#8c8c8c', padding: 4, minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={t('common.details')}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <Badge
            count={team._count?.ChantierAssignments || 0}
            showZero
            style={{ backgroundColor: team.color, fontSize: 9, minWidth: 18, height: 18, lineHeight: '18px' }}
          />
        </div>
      </div>

      {/* Détail étendu des membres */}
      {expanded && (
        <div style={{ padding: '4px 8px 4px 24px', fontSize: 10 }}>
          {team.Members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, color: '#595959' }}>
              <span style={{ cursor: onToggleLeader ? 'pointer' : 'default' }} role="button" tabIndex={0} onClick={() => onToggleLeader?.(m.id, m.role)} title={onToggleLeader ? (m.role === 'LEADER' ? 'Retirer chef' : 'Nommer chef') : undefined}>
                {m.role === 'LEADER' ? '👑' : '🔧'}
              </span>
              <span style={{ flex: 1 }}>{m.Technician.firstName} {m.Technician.lastName}{m.Technician.type === 'SUBCONTRACTOR' ? ' 🏢' : ''}</span>
              {onRemoveMember && (
                <button
                  onClick={() => onRemoveMember(m.id)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: 9, padding: 0 }}
                  title="Retirer"
                >
                  <CloseOutlined />
                </button>
              )}
            </div>
          ))}
          {onAddMember && (
            <button
              onClick={onAddMember}
              style={{ border: '1px dashed #d9d9d9', borderRadius: 4, background: '#fafafa', cursor: 'pointer', fontSize: 10, color: '#8c8c8c', padding: '2px 6px', width: '100%', marginTop: 2 }}
            >
              <PlusOutlined /> Ajouter
            </button>
          )}
          {onDelete && (
            <Popconfirm title="Supprimer cette équipe ?" onConfirm={onDelete} okText={t('common.yes')} cancelText={t('common.no')}>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: 10, padding: '2px 0', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <DeleteOutlined /> Supprimer l'équipe
              </button>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );
};

// ═══ ChantierKanban Main Component ═══
interface ChantierKanbanProps {
  onViewChantier?: (chantierId: string) => void;
  onSettings?: () => void;
}

const ChantierKanban: React.FC<ChantierKanbanProps> = ({ onViewChantier, onSettings }) => {
  const { chantiers, isLoading, refetch, updateChantierStatus } = useChantiers();
  const { statuses, isLoading: statusesLoading } = useChantierStatuses();
  const { teams, technicians, isLoading: _teamsLoading, createTeam, deleteTeam, addTeamMember, removeTeamMember, updateMemberRole, assignToChantier, assignTeamToChantier, removeAssignment: _removeAssignment, refetch: _refetchTeams, createTechnician, updateTechnician: _updateTechnician, deleteTechnician: _deleteTechnician, syncTechnicians, addUnavailability, removeUnavailability: _removeUnavailability } = useTeams();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);
  const [dateField, setDateField] = useState<DateField>('createdAt');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [allowedTargets, setAllowedTargets] = useState<Record<string, string[]>>({});
  const [draggingFromStatusId, setDraggingFromStatusId] = useState<string | null>(null);

  // Panel techniciens
  const [techPanelOpen, setTechPanelOpen] = useState(true);
  const [selectedTechFilter, setSelectedTechFilter] = useState<string | null>(null); // technicianId or 'unassigned' or team:teamId
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#1677ff');
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberTechId, setAddMemberTechId] = useState<string>('');

  // Modals technicien + indisponibilité
  const [techFormOpen, setTechFormOpen] = useState(false);
  const [techFormData, setTechFormData] = useState<{
    type: 'INTERNAL' | 'SUBCONTRACTOR';
    billingMode: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    specialties: string[];
    color: string;
    vatNumber: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    iban: string;
  }>({ type: 'INTERNAL', billingMode: '', firstName: '', lastName: '', email: '', phone: '', company: '', specialties: [], color: '#1677ff', vatNumber: '', address: '', postalCode: '', city: '', country: 'Belgique', iban: '' });
  const [unavailModalOpen, setUnavailModalOpen] = useState(false);
  const [unavailTechId, setUnavailTechId] = useState<string>('');
  const [unavailData, setUnavailData] = useState<{ startDate: string; endDate: string; type: string; note: string }>({ startDate: '', endDate: '', type: 'CONGE', note: '' });
  const [panelTab, setPanelTab] = useState<'techs' | 'teams'>('techs');

  // State pour le modal de blocage facturation
  const [billingBlock, setBillingBlock] = useState<{
    chantierId: string;
    statusId: string;
    unpaidInvoices: { label: string; type: string; percentage: number }[];
  } | null>(null);
  const [forceLoading, setForceLoading] = useState(false);

  // Grab-to-scroll: click + drag to scroll the kanban board horizontally on desktop
  const { ref: kanbanScrollRef, grabScrollProps } = useGrabScroll();

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { canDo, getScope } = useAuth();
  const canSeeTeamPanel = canDo('chantiers', 'team_panel');
  const editScope = getScope('chantiers', 'edit');
  const canManageTeams = editScope === 'all' || editScope === '*';
  const canSeeSettings = canDo('chantiers', 'settings');
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const canAssign = canDo('chantiers', 'assign');
  const canEdit = canDo('chantiers', 'edit');
  const canFinances = canDo('chantiers', 'finances');
  const canValidate = canDo('chantiers', 'validate');

  // Charger les transitions autorisées au montage
  useEffect(() => {
    const fetchAllowedTargets = async () => {
      try {
        const response = await api.get('/api/chantier-workflow/transitions/allowed-targets') as {
          success: boolean;
          data: Record<string, string[]>;
        };
        if (response.success) {
          setAllowedTargets(response.data);
        }
      } catch (err) {
        logger.warn('[Kanban] Impossible de charger les transitions autorisées:', err);
        // En cas d'erreur, on garde tout ouvert (backward compatible)
      }
    };
    fetchAllowedTargets();
  }, [api]);

  // Extraire les produits uniques depuis les chantiers existants
  const uniqueProducts = useMemo(() => {
    const map = new Map<string, { value: string; label: string; icon?: string | null; color?: string | null; count: number }>();
    for (const c of chantiers) {
      if (!c.productValue) continue;
      const existing = map.get(c.productValue);
      if (existing) {
        existing.count++;
      } else {
        map.set(c.productValue, {
          value: c.productValue,
          label: c.productLabel || c.productValue,
          icon: c.productIcon,
          color: c.productColor,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [chantiers]);

  // Chantiers filtrés : produit + type de date (présence) + plage de dates
  const filteredChantiers = useMemo(() => {
    let result = chantiers;

    // 1) Filtre produit
    if (selectedProducts.size > 0) {
      result = result.filter(c => selectedProducts.has(c.productValue));
    }

    // 2) Si un type de date spécifique est sélectionné (pas createdAt qui existe toujours),
    //    ne garder que les chantiers qui ont ce champ renseigné
    if (dateField !== 'createdAt') {
      result = result.filter(c => {
        const dateValue = (c as any)[dateField];
        return dateValue != null;
      });
    }

    // 3) Filtre plage de dates sur le champ sélectionné
    if (dateRange) {
      const [start, end] = dateRange;
      result = result.filter(c => {
        const dateValue = (c as any)[dateField];
        if (!dateValue) return false;
        const d = dayjs(dateValue);
        return d.isValid() && d.isBetween(start, end, 'day', '[]');
      });
    }

    // 4) Filtre technicien
    if (selectedTechFilter) {
      if (selectedTechFilter === 'unassigned') {
        result = result.filter(c => !c.ChantierAssignments || c.ChantierAssignments.length === 0);
      } else if (selectedTechFilter.startsWith('team:')) {
        const teamId = selectedTechFilter.replace('team:', '');
        result = result.filter(c => c.ChantierAssignments?.some(a => a.teamId === teamId));
      } else {
        result = result.filter(c => c.ChantierAssignments?.some(a => a.technicianId === selectedTechFilter));
      }
    }

    return result;
  }, [chantiers, selectedProducts, dateRange, dateField, selectedTechFilter]);

  // Handlers pour le filtre de dates
  const handlePresetClick = useCallback((preset: DatePreset) => {
    if (activePreset === preset) {
      setDateRange(null);
      setActivePreset(null);
    } else {
      const config = DATE_PRESETS.find(p => p.key === preset);
      if (config) {
        setDateRange(config.getRange());
        setActivePreset(preset);
      }
    }
  }, [activePreset]);

  const handleCustomRange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].startOf('day'), dates[1].endOf('day')]);
      setActivePreset('custom');
    } else {
      setDateRange(null);
      setActivePreset(null);
    }
  }, []);

  const clearDateFilter = useCallback(() => {
    setDateRange(null);
    setActivePreset(null);
    setDateField('createdAt');
  }, []);

  const toggleProduct = useCallback((value: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  // ── Handlers assignation tech ──
  const handleTechDrop = useCallback(async (chantierId: string, technicianId: string, role: 'CHEF_EQUIPE' | 'TECHNICIEN') => {
    if (!canAssign) { message.warning('🔒 Vous n\'avez pas la permission d\'assigner des techniciens'); return; }
    try {
      await assignToChantier(chantierId, technicianId, role);
      message.success('Technicien assigné !');
      refetch(); // Refresh chantiers to update badges
    } catch (err: unknown) {
      if (err?.message?.includes('déjà assigné')) {
        message.info('Ce technicien est déjà assigné à ce chantier');
      } else {
        message.error(err?.message || 'Erreur lors de l\'assignation');
      }
    }
  }, [assignToChantier, refetch, canAssign]);

  const handleTeamDrop = useCallback(async (chantierId: string, teamId: string) => {
    if (!canAssign) { message.warning('🔒 Vous n\'avez pas la permission d\'assigner des équipes'); return; }
    try {
      const result = await assignTeamToChantier(chantierId, teamId);
      message.success(result.message || 'Équipe assignée !');
      refetch();
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur lors de l\'assignation de l\'équipe');
    }
  }, [assignTeamToChantier, refetch, canAssign]);

  const handleCreateTeam = useCallback(async () => {
    if (!canManageTeams) { message.warning('🔒 Seul un contremaître ou administrateur peut créer des équipes'); return; }
    if (!newTeamName.trim() || creatingTeam) return;
    setCreatingTeam(true);
    try {
      await createTeam({ name: newTeamName.trim(), color: newTeamColor });
      message.success('Équipe créée !');
      setNewTeamName('');
      setTeamModalOpen(false);
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur création équipe');
    } finally {
      setCreatingTeam(false);
    }
  }, [createTeam, newTeamName, newTeamColor, canManageTeams, creatingTeam]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    if (!canManageTeams) { message.warning('🔒 Seul un contremaître ou administrateur peut supprimer des équipes'); return; }
    try {
      await deleteTeam(teamId);
      message.success('Équipe supprimée');
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur suppression équipe');
    }
  }, [deleteTeam, canManageTeams]);

  const handleAddMember = useCallback(async () => {
    if (!canManageTeams) { message.warning('🔒 Seul un contremaître ou administrateur peut modifier les équipes'); return; }
    if (!addMemberTeamId || !addMemberTechId) return;
    try {
      await addTeamMember(addMemberTeamId, addMemberTechId);
      message.success('Membre ajouté à l\'équipe');
      setAddMemberTechId('');
      setAddMemberTeamId(null);
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur ajout membre');
    }
  }, [addTeamMember, addMemberTeamId, addMemberTechId, canManageTeams]);

  const handleDrop = useCallback(async (chantierId: string, statusId: string) => {
    if (!canEdit) { message.warning('🔒 Vous n\'avez pas la permission de modifier le statut'); return; }
    try {
      await updateChantierStatus(chantierId, statusId);
      message.success('Statut mis à jour');
      setDraggingFromStatusId(null);
      refetch();
    } catch (err: unknown) {
      const responseData = err?.data;
      const errorCode = responseData?.code;
      const isBillingBlock = errorCode === 'BILLING_BLOCK'
        || err?.status === 409
        || err?.message?.includes('Facture(s) requise(s)');

      // ── Blocage facturation : ouvrir le modal state-driven ──
      if (isBillingBlock) {
        const unpaid = responseData?.unpaidInvoices
          || (err?.message ? [{ label: err.message.split(':').pop()?.trim() || 'Facture(s) requise(s)', type: 'UNKNOWN', percentage: null }] : []);
        setBillingBlock({
          chantierId,
          statusId,
          unpaidInvoices: unpaid,
        });
        setDraggingFromStatusId(null);
        return;
      }

      // Autres erreurs
      const errorMsg = err?.message || 'Erreur lors du changement de statut';
      if (errorMsg.includes('rôle') || errorMsg.includes('autorisé')) {
        message.warning(`🔒 ${errorMsg}`);
      } else {
        message.error(errorMsg);
      }
      setDraggingFromStatusId(null);
      refetch();
    }
  }, [updateChantierStatus, refetch, canEdit]);

  // Handler pour forcer le déplacement malgré le blocage facturation
  const handleForceMove = useCallback(async () => {
    if (!billingBlock) return;
    setForceLoading(true);
    try {
      await updateChantierStatus(billingBlock.chantierId, billingBlock.statusId, true);
      message.success('Statut mis à jour (facturation ignorée)');
      setBillingBlock(null);
      refetch();
    } catch (forceErr: unknown) {
      message.error(forceErr?.message || 'Erreur lors du déplacement forcé');
    } finally {
      setForceLoading(false);
    }
  }, [billingBlock, updateChantierStatus, refetch]);

  // Drag handlers pour tracker la colonne source
  const handleCardDragStart = useCallback((statusId: string) => {
    setDraggingFromStatusId(statusId);
  }, []);

  const handleCardDragEnd = useCallback(() => {
    setDraggingFromStatusId(null);
  }, []);

  // Calcul de l'état de drop pour chaque colonne (allowed / blocked / none)
  const getDropState = useCallback((targetStatusId: string): 'allowed' | 'blocked' | 'none' => {
    if (!draggingFromStatusId) return 'none';
    if (draggingFromStatusId === targetStatusId) return 'none';

    const targets = allowedTargets[draggingFromStatusId];
    // Si pas de données = pas de restrictions (backward compatible)
    if (!targets) return 'allowed';
    return targets.includes(targetStatusId) ? 'allowed' : 'blocked';
  }, [draggingFromStatusId, allowedTargets]);

  const handleViewChantier = useCallback((chantierId: string) => {
    if (onViewChantier) {
      onViewChantier(chantierId);
    } else {
      window.location.hash = `#/chantiers/${chantierId}`;
    }
  }, [onViewChantier]);

  const handleViewChantierCompta = useCallback((chantierId: string) => {
    if (onViewChantier) {
      onViewChantier(chantierId + '?tab=compta');
    } else {
      window.location.hash = `#/chantiers/${chantierId}?tab=compta`;
    }
  }, [onViewChantier]);

  // Grouper les chantiers filtrés par statut
  const chantiersByStatus = useMemo(() => {
    const map: Record<string, Chantier[]> = {};
    for (const status of statuses) {
      map[status.id] = [];
    }
    map['__none__'] = [];

    for (const chantier of filteredChantiers) {
      const key = chantier.statusId || '__none__';
      if (map[key]) {
        map[key].push(chantier);
      } else {
        map['__none__'].push(chantier);
      }
    }
    return map;
  }, [filteredChantiers, statuses]);

  if (isLoading || statusesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" tip="Chargement des chantiers..."><div /></Spin>
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Aucun statut de chantier configuré. Les statuts par défaut seront créés automatiquement." />
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: isMobile ? '10px 8px' : '8px 12px',
        display: 'flex',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        gap: isMobile ? 6 : 8,
        overflowX: isMobile ? 'auto' : undefined,
      }}>
        {/* Title + count badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
          {isMobile ? (
            <Badge count={filteredChantiers.length} size="small" offset={[-2, 2]} style={{ backgroundColor: '#5e6c84' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>🏗️</span>
            </Badge>
          ) : (
            <>
              <span style={{ fontSize: 16, fontWeight: 600 }}>🏗️ Chantiers</span>
              <span style={{ fontSize: 13, color: '#5e6c84' }}>
                {filteredChantiers.length} chantier{filteredChantiers.length > 1 ? 's' : ''}
                {(selectedProducts.size > 0 || dateField !== 'createdAt' || dateRange) && ` / ${chantiers.length}`}
              </span>
            </>
          )}
        </div>

        {/* Tech panel toggle — on mobile, right after the title as a badge icon */}
        {isMobile && canSeeTeamPanel && (
          <Badge count={technicians.length} size="small" offset={[-2, 2]} style={{ backgroundColor: techPanelOpen ? '#1677ff' : '#8c8c8c' }}>
            <div
              role="button" tabIndex={0} onClick={() => setTechPanelOpen(!techPanelOpen)}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: techPanelOpen ? '#e6f4ff' : '#f5f5f5',
                cursor: 'pointer',
              }}
            >
              <TeamOutlined style={{ fontSize: 14, color: techPanelOpen ? '#1677ff' : '#595959' }} />
            </div>
          </Badge>
        )}

        {/* ─── Filtre dates ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {isMobile ? (
            /* Mobile: just the calendar icon, colored when active */
            <div
              role="button" tabIndex={0} onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: (dateField !== 'createdAt' || dateRange)
                  ? `${DATE_FIELDS.find(f => f.key === dateField)?.color || '#1677ff'}18`
                  : '#f5f5f5',
                cursor: 'pointer',
                border: (dateField !== 'createdAt' || dateRange)
                  ? `2px solid ${DATE_FIELDS.find(f => f.key === dateField)?.color || '#1677ff'}`
                  : '1px solid #e8e8e8',
              }}
            >
              <CalendarOutlined style={{ fontSize: 14, color: (dateField !== 'createdAt' || dateRange) ? (DATE_FIELDS.find(f => f.key === dateField)?.color || '#1677ff') : '#595959' }} />
            </div>
          ) : (
            /* Desktop: full button with text */
            <>
              <button
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 16,
                  border: (dateField !== 'createdAt' || dateRange) ? `2px solid ${DATE_FIELDS.find(f => f.key === dateField)?.color || '#1677ff'}` : '1px solid #d9d9d9',
                  background: (dateField !== 'createdAt' || dateRange) ? `${DATE_FIELDS.find(f => f.key === dateField)?.color || '#1677ff'}12` : '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: (dateField !== 'createdAt' || dateRange) ? 600 : 400,
                  color: (dateField !== 'createdAt' || dateRange) ? (DATE_FIELDS.find(f => f.key === dateField)?.color || '#1677ff') : '#595959',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  minHeight: 32,
                }}
              >
                <CalendarOutlined style={{ fontSize: 13 }} />
                {dateField !== 'createdAt'
                  ? `${DATE_FIELDS.find(f => f.key === dateField)?.icon || '📅'} ${DATE_FIELDS.find(f => f.key === dateField)?.label}${dateRange ? (activePreset && activePreset !== 'custom'
                    ? ` · ${DATE_PRESETS.find(p => p.key === activePreset)?.label}`
                    : ` · ${dateRange[0].format('DD/MM')} — ${dateRange[1].format('DD/MM')}`) : ''}`
                  : dateRange
                    ? (activePreset && activePreset !== 'custom'
                      ? DATE_PRESETS.find(p => p.key === activePreset)?.label
                      : `${dateRange[0].format('DD/MM')} — ${dateRange[1].format('DD/MM')}`)
                    : 'Dates'
                }
              </button>
              {(dateField !== 'createdAt' || dateRange) && (
                <button
                  onClick={clearDateFilter}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 6px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#ff4d4f',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 10,
                    lineHeight: 1,
                    minWidth: 28,
                    minHeight: 28,
                  }}
                  title="Effacer le filtre date"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>

        {/* ─── Date filter panel (fixed overlay) ─── */}
        {dateDropdownOpen && (
          <>
            {/* CSS pour forcer le calendrier en colonne sur mobile */}
            <style>{`
              .kanban-range-popup .ant-picker-panels {
                flex-direction: column !important;
              }
              .kanban-range-popup .ant-picker-panel-container {
                max-width: calc(100vw - 16px) !important;
                overflow-x: auto !important;
              }
              .kanban-range-popup {
                max-width: calc(100vw - 8px) !important;
                inset: auto !important;
                left: 4px !important;
                right: 4px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                position: fixed !important;
              }
              @media (min-width: 600px) {
                .kanban-range-popup .ant-picker-panels {
                  flex-direction: row !important;
                }
                .kanban-range-popup {
                  position: absolute !important;
                  transform: none !important;
                  top: auto !important;
                  left: auto !important;
                  right: auto !important;
                }
              }
            `}</style>
            {/* Backdrop */}
            <div
              role="button" tabIndex={0} onClick={() => setDateDropdownOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.25)' }}
            />
            {/* Panel */}
            <div style={{
              position: 'fixed',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1001,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              padding: 16,
              width: 'min(calc(100vw - 24px), 340px)',
              maxHeight: 'calc(100vh - 24px)',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>📅 Filtre par date</span>
                <Button icon={<CloseOutlined />} size="small" type="text" onClick={() => setDateDropdownOpen(false)} style={{ color: '#8c8c8c' }} />
              </div>

              {/* Sélecteur du type de date */}
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8c8c8c', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sur quelle date ?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {DATE_FIELDS.map(df => (
                  <button
                    key={df.key}
                    onClick={() => setDateField(df.key)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      border: dateField === df.key ? `2px solid ${df.color}` : '1px solid #e8e8e8',
                      background: dateField === df.key ? `${df.color}12` : '#fafafa',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: dateField === df.key ? 600 : 400,
                      color: dateField === df.key ? df.color : '#8c8c8c',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {df.icon} {df.label}
                  </button>
                ))}
              </div>

              {/* Présets de période */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8c8c8c', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Période</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {DATE_PRESETS.map(preset => (
                    <button
                      key={preset.key}
                      onClick={() => { handlePresetClick(preset.key); setDateDropdownOpen(false); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        border: activePreset === preset.key ? '2px solid #1677ff' : '1px solid #d9d9d9',
                        background: activePreset === preset.key ? '#e6f4ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: activePreset === preset.key ? 600 : 400,
                        color: activePreset === preset.key ? '#1677ff' : '#595959',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plage personnalisée */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Plage personnalisée</div>
                <RangePicker
                  size="small"
                  format="DD/MM/YYYY"
                  value={activePreset === 'custom' && dateRange ? dateRange : undefined}
                  onChange={(dates) => { handleCustomRange(dates as [Dayjs | null, Dayjs | null] | null); setDateDropdownOpen(false); }}
                  style={{ width: '100%' }}
                  allowClear
                  placeholder={['Début', 'Fin']}
                  popupClassName="kanban-range-popup"
                  popupStyle={{ zIndex: 1100 }}
                  getPopupContainer={() => document.body}
                />
              </div>

              {/* Résumé actif + effacer */}
              {(dateField !== 'createdAt' || dateRange) && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#595959' }}>
                    {DATE_FIELDS.find(f => f.key === dateField)?.icon} {DATE_FIELDS.find(f => f.key === dateField)?.label}
                    {dateRange && <>: {dateRange[0].format('DD MMM')} → {dateRange[1].format('DD MMM YYYY')}</>}
                    {!dateRange && dateField !== 'createdAt' && <> — tous</>}
                  </span>
                  <button
                    onClick={() => { clearDateFilter(); setDateDropdownOpen(false); }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <CloseCircleOutlined style={{ fontSize: 11 }} /> Effacer
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Product filter buttons */}
        {uniqueProducts.length > 0 && (
          isMobile ? (
            /* Mobile: just icons with badge counts */
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {uniqueProducts.map(product => {
                const isActive = selectedProducts.has(product.value);
                const bgColor = product.color || '#1677ff';
                return (
                  <Tooltip key={product.value} title={`${product.label} (${product.count})`}>
                    <Badge count={product.count} size="small" offset={[-2, 2]} style={{ backgroundColor: isActive ? bgColor : '#bfbfbf' }}>
                      <div
                        role="button" tabIndex={0} onClick={() => toggleProduct(product.value)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isActive ? hexToRgba(bgColor, 0.15) : '#f5f5f5',
                          border: isActive ? `2px solid ${bgColor}` : '1px solid #e8e8e8',
                          cursor: 'pointer',
                          fontSize: 15,
                        }}
                      >
                        {product.icon ? renderProductIcon(product.icon, 15) : '📦'}
                      </div>
                    </Badge>
                  </Tooltip>
                );
              })}
              {selectedProducts.size > 0 && (
                <div
                  role="button" tabIndex={0} onClick={() => setSelectedProducts(new Set())}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#ff4d4f', color: '#fff', cursor: 'pointer', fontSize: 10,
                  }}
                >
                  ✕
                </div>
              )}
            </div>
          ) : (
            /* Desktop: full pill buttons */
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
              {uniqueProducts.map(product => {
                const isActive = selectedProducts.has(product.value);
                const bgColor = product.color || '#1677ff';
                return (
                  <Tooltip key={product.value} title={`${product.label} (${product.count})`}>
                    <button
                      onClick={() => toggleProduct(product.value)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 16,
                        border: isActive ? `2px solid ${bgColor}` : '1px solid #d9d9d9',
                        background: isActive ? hexToRgba(bgColor, 0.12) : '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? bgColor : '#595959',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                        minHeight: 32,
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>
                        {product.icon ? renderProductIcon(product.icon, 16) : '📦'}
                      </span>
                      <span>{product.label}</span>
                      <span style={{
                        background: isActive ? bgColor : '#e8e8e8',
                        color: isActive ? '#fff' : '#8c8c8c',
                        borderRadius: 8,
                        padding: '0 5px',
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: '16px',
                      }}>
                        {product.count}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
              {selectedProducts.size > 0 && (
                <button
                  onClick={() => setSelectedProducts(new Set())}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 8px',
                    borderRadius: 16,
                    border: '1px dashed #d9d9d9',
                    background: '#fafafa',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#8c8c8c',
                  }}
                >
                  ✕ Tous
                </button>
              )}
            </div>
          )
        )}

        {/* Right actions: tech panel toggle + settings */}
        <div style={{ display: 'flex', gap: isMobile ? 4 : 8, flexShrink: 0, marginLeft: isMobile ? 'auto' : undefined }}>
          {/* Toggle panel techniciens — desktop only (mobile uses badge above) */}
          {!isMobile && canSeeTeamPanel && (
          <Tooltip title={techPanelOpen ? 'Masquer le panel techniciens' : 'Afficher le panel techniciens'}>
            <Button
              icon={techPanelOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              size="small"
              type={techPanelOpen ? 'primary' : 'default'}
              ghost={techPanelOpen}
              onClick={() => setTechPanelOpen(!techPanelOpen)}
            >
              <TeamOutlined /> {technicians.length}
            </Button>
          </Tooltip>
          )}
          {/* Filtre technicien actif */}
          {!isMobile && selectedTechFilter && (
            <Tag
              closable
              onClose={() => setSelectedTechFilter(null)}
              color="purple"
              style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}
            >
              {selectedTechFilter === 'unassigned'
                ? '🚫 Sans technicien'
                : selectedTechFilter.startsWith('team:')
                  ? `👥 ${teams.find(t => t.id === selectedTechFilter.replace('team:', ''))?.name || 'Équipe'}`
                  : `🔧 ${technicians.find(t => t.id === selectedTechFilter)?.firstName || ''} ${technicians.find(t => t.id === selectedTechFilter)?.lastName || ''}`
              }
            </Tag>
          )}
          {onSettings && canSeeSettings && (
            isMobile ? (
              <div
                role="button" tabIndex={0} onClick={onSettings}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#f5f5f5', cursor: 'pointer',
                  border: '1px solid #e8e8e8',
                }}
              >
                <SettingOutlined style={{ fontSize: 14, color: '#595959' }} />
              </div>
            ) : (
              <Button icon={<SettingOutlined />} size="small" onClick={onSettings}>
                Paramètres
              </Button>
            )
          )}
        </div>
      </div>

      {/* Kanban Board + Panel techniciens */}
      <DndProvider backend={MultiBackend} options={HTML5toTouch}>
        <CustomDragLayer />
        <AutoScrollDragTracker boardRef={kanbanScrollRef} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
          {/* ═══ Backdrop overlay (mobile) ═══ */}
          {canSeeTeamPanel && techPanelOpen && (
            <div
              role="button" tabIndex={0} onClick={() => setTechPanelOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: SF.overlayDark,
                zIndex: 19,
                transition: 'opacity 0.3s',
              }}
            />
          )}

          {/* ═══ Panel Techniciens (gauche) — Sliding drawer ═══ */}
          {canSeeTeamPanel && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: techPanelOpen ? 0 : -260,
            bottom: 0,
            width: 250,
            zIndex: 20,
            borderRight: '1px solid #f0f0f0',
            backgroundColor: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: techPanelOpen ? '4px 0 12px ${SF.overlayDarkLight}' : 'none',
          }}>
            {/* Close button inside panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#262626' }}>
                <TeamOutlined style={{ marginRight: 6 }} /> Techniciens
              </span>
              <Button
                icon={<CloseOutlined />}
                size="small"
                type="text"
                onClick={() => setTechPanelOpen(false)}
                style={{ color: '#8c8c8c' }}
              />
            </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px 6px' }}>
                {/* Section : Actions rapides (admin/contremaître uniquement) */}
                {canManageTeams && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <button
                    onClick={async () => {
                      try {
                        const result = await syncTechnicians();
                        message.success(result.message || 'Synchronisation terminée');
                      } catch (err: unknown) {
                        message.error(err?.message || 'Erreur sync');
                      }
                    }}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#1677ff', minHeight: 36 }}
                    title="Importer les utilisateurs de l'organisation comme techniciens"
                  >
                    🔄 Sync
                  </button>
                  <button
                      onClick={() => { setTechFormData({ type: 'SUBCONTRACTOR', billingMode: 'FORFAIT', firstName: '', lastName: '', email: '', phone: '', company: '', specialties: [], color: '#8c8c8c', vatNumber: '', address: '', postalCode: '', city: '', country: 'Belgique', iban: '' }); setTechFormOpen(true); }}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px dashed #8c8c8c', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#8c8c8c', minHeight: 36 }}
                      title="Ajouter un sous-traitant"
                    >
                      🏢 + Sous-traitant
                    </button>
                </div>
                )}

                {/* Filtre rapide - Sans technicien (gestion uniquement) */}
                {canManageTeams && (
                <div style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setSelectedTechFilter(selectedTechFilter === 'unassigned' ? null : 'unassigned')}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: selectedTechFilter === 'unassigned' ? '2px solid #ff4d4f' : '1px solid #e8e8e8',
                      background: selectedTechFilter === 'unassigned' ? '#fff2f0' : '#fff',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: selectedTechFilter === 'unassigned' ? 600 : 400,
                      color: selectedTechFilter === 'unassigned' ? '#ff4d4f' : '#8c8c8c',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 36,
                    }}
                  >
                    🚫 Sans technicien
                    <span style={{
                      marginLeft: 'auto',
                      background: '#fff1f0',
                      color: '#ff4d4f',
                      borderRadius: 8,
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {chantiers.filter(c => !c.ChantierAssignments || c.ChantierAssignments.length === 0).length}
                    </span>
                  </button>
                </div>
                )}

                {/* Tabs: Techniciens / Équipes */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                  <button
                    onClick={() => setPanelTab('techs')}
                    style={{ flex: 1, padding: '6px 0', border: 'none', borderBottom: panelTab === 'techs' ? '2px solid #722ed1' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: panelTab === 'techs' ? 600 : 400, color: panelTab === 'techs' ? '#722ed1' : '#8c8c8c', minHeight: 36 }}
                  >
                    👤 Techniciens ({technicians.length})
                  </button>
                  <button
                    onClick={() => setPanelTab('teams')}
                    style={{ flex: 1, padding: '6px 0', border: 'none', borderBottom: panelTab === 'teams' ? '2px solid #722ed1' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: panelTab === 'teams' ? 600 : 400, color: panelTab === 'teams' ? '#722ed1' : '#8c8c8c', minHeight: 36 }}
                  >
                    👥 Équipes ({teams.length})
                  </button>
                </div>

                {panelTab === 'techs' && (
                  <>
                    {/* Internes */}
                    {technicians.filter(t => t.type !== 'SUBCONTRACTOR').length > 0 && (
                      <>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#52c41a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3, padding: '0 4px' }}>
                          Internes ({technicians.filter(t => t.type !== 'SUBCONTRACTOR').length})
                        </div>
                        {technicians.filter(t => t.type !== 'SUBCONTRACTOR').map(tech => (
                          <TechnicianDragItem
                            key={tech.id}
                            technician={tech}
                            isSelected={selectedTechFilter === tech.id}
                            onClick={() => setSelectedTechFilter(selectedTechFilter === tech.id ? null : tech.id)}
                            onDragStart={() => setTechPanelOpen(false)}
                          />
                        ))}
                      </>
                    )}

                    {/* Sous-traitants */}
                    {technicians.filter(t => t.type === 'SUBCONTRACTOR').length > 0 && (
                      <>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 8, marginBottom: 3, padding: '0 4px' }}>
                          🏢 Sous-traitants ({technicians.filter(t => t.type === 'SUBCONTRACTOR').length})
                        </div>
                        {technicians.filter(t => t.type === 'SUBCONTRACTOR').map(tech => (
                          <TechnicianDragItem
                            key={tech.id}
                            technician={tech}
                            isSelected={selectedTechFilter === tech.id}
                            onClick={() => setSelectedTechFilter(selectedTechFilter === tech.id ? null : tech.id)}
                            onDragStart={() => setTechPanelOpen(false)}
                          />
                        ))}
                      </>
                    )}

                    {technicians.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 11, padding: '16px 8px' }}>
                        {canManageTeams ? (
                          <>
                            Aucun technicien.<br />
                            <button onClick={async () => { try { const r = await syncTechnicians(); message.success(r.message || 'Sync OK'); } catch { message.error('Erreur sync'); } }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1677ff', textDecoration: 'underline', fontSize: 11 }}>
                              Synchroniser les utilisateurs
                            </button>
                          </>
                        ) : (
                          'Aucun technicien dans votre équipe'
                        )}
                      </div>
                    )}
                  </>
                )}

                {panelTab === 'teams' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4, padding: '0 4px' }}>
                      {canManageTeams && (
                        <button
                          onClick={() => setTeamModalOpen(true)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1677ff', fontSize: 12, padding: 0, lineHeight: 1 }}
                          title="Créer une équipe"
                        >
                          <PlusOutlined /> Nouvelle
                        </button>
                      )}
                    </div>
                    {teams.map(team => (
                      <TeamDragItem
                        key={team.id}
                        team={team}
                        isSelected={selectedTechFilter === `team:${team.id}`}
                        onClick={() => setSelectedTechFilter(selectedTechFilter === `team:${team.id}` ? null : `team:${team.id}`)}
                        onDelete={canManageTeams ? () => handleDeleteTeam(team.id) : undefined}
                        onAddMember={canManageTeams ? () => setAddMemberTeamId(team.id) : undefined}
                        onToggleLeader={canManageTeams ? (memberId, currentRole) => updateMemberRole(team.id, memberId, currentRole === 'LEADER' ? 'MEMBER' : 'LEADER') : undefined}
                        onRemoveMember={canManageTeams ? (memberId) => removeTeamMember(team.id, memberId) : undefined}
                        onDragStart={() => setTechPanelOpen(false)}
                      />
                    ))}
                    {teams.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 11, padding: '12px 8px' }}>
                        Aucune équipe créée
                      </div>
                    )}
                  </>
                )}
              </div>
          </div>
          )}

          {/* ═══ Toggle tab on left edge (visible when panel closed) ═══ */}
          {canSeeTeamPanel && !techPanelOpen && (
            <div
              role="button" tabIndex={0} onClick={() => setTechPanelOpen(true)}
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 15,
                width: 28,
                height: 80,
                background: 'linear-gradient(135deg, #722ed1, #9254de)',
                borderRadius: '0 8px 8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '2px 0 8px ${SF.overlayDarkLight}',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <MenuUnfoldOutlined style={{ color: '#fff', fontSize: 14 }} />
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 600, writingMode: 'vertical-lr', letterSpacing: 1 }}>
                {technicians.length}
              </span>
            </div>
          )}

          {/* ═══ Kanban Columns ═══ */}
          <div
            ref={kanbanScrollRef}
            {...grabScrollProps}
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 8px 8px 36px',
              overflowX: 'auto',
              flex: 1,
              alignItems: 'stretch',
              WebkitOverflowScrolling: 'touch',
              minHeight: 0,
              height: '100%',
              ...grabScrollProps.style,
            }}
          >
            {statuses.map(status => (
              <KanbanColumn
                key={status.id}
                status={status}
                chantiers={chantiersByStatus[status.id] || []}
                onDrop={handleDrop}
                onViewChantier={handleViewChantier}
                onViewChantierCompta={handleViewChantierCompta}
                dropState={getDropState(status.id)}
                onDragStart={handleCardDragStart}
                onDragEnd={handleCardDragEnd}
                onTechDrop={handleTechDrop}
                onTeamDrop={handleTeamDrop}
                canEdit={canEdit}
                canFinances={canFinances}
                canValidate={canValidate}
              />
            ))}
          </div>
        </div>
      </DndProvider>

      {/* Modal de blocage facturation (state-driven, compatible React 19) */}
      <Modal
        open={!!billingBlock}
        title={
          <span>
            <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Facture(s) non payée(s)
          </span>
        }
        onCancel={() => setBillingBlock(null)}
        footer={[
          <Button key="cancel" onClick={() => setBillingBlock(null)}>
            Annuler
          </Button>,
          ...(canFinances ? [<Button
            key="force"
            danger
            type="primary"
            loading={forceLoading}
            onClick={handleForceMove}
          >
            ⚡ Forcer le déplacement
          </Button>] : []),
        ]}
      >
        <p style={{ marginBottom: 12 }}>Ce chantier a des factures requises non payées :</p>
        <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
          {billingBlock?.unpaidInvoices.map((inv, i) => (
            <div key={i} style={{ fontWeight: 500 }}>• {inv.label} ({inv.percentage}%)</div>
          ))}
        </div>
        <p style={{ color: '#8c8c8c', fontSize: 13 }}>
          Vous pouvez ouvrir le chantier pour marquer les factures comme payées,
          ou forcer le déplacement.
        </p>
      </Modal>

      {/* Modal création équipe */}
      <Modal
        open={teamModalOpen}
        title={<span><TeamOutlined style={{ marginRight: 8 }} />Nouvelle équipe</span>}
        onCancel={() => setTeamModalOpen(false)}
        onOk={handleCreateTeam}
        confirmLoading={creatingTeam}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Nom de l'équipe</label>
            <Input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="Ex: Équipe Toiture, Équipe PV..."
              onPressEnter={handleCreateTeam}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Couleur</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#f5222d', '#13c2c2', '#eb2f96', '#faad14'].map(c => (
                <div
                  key={c}
                  role="button" tabIndex={0} onClick={() => setNewTeamColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: newTeamColor === c ? '3px solid #262626' : '2px solid transparent',
                    transition: 'border 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal ajout membre à équipe */}
      <Modal
        open={!!addMemberTeamId}
        title={<span><PlusOutlined style={{ marginRight: 8 }} />Ajouter un membre à {teams.find(t => t.id === addMemberTeamId)?.name}</span>}
        onCancel={() => { setAddMemberTeamId(null); setAddMemberTechId(''); }}
        onOk={handleAddMember}
        okText={t('common.add')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !addMemberTechId }}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Sélectionner un technicien..."
          value={addMemberTechId || undefined}
          onChange={v => setAddMemberTechId(v)}
          showSearch
          optionFilterProp="label"
          options={technicians
            .filter(t => !teams.find(team => team.id === addMemberTeamId)?.Members.some(m => m.technicianId === t.id))
            .map(t => ({
              value: t.id,
              label: `${t.firstName || ''} ${t.lastName || ''} ${t.type === 'SUBCONTRACTOR' ? '(ST)' : ''} (${t.email || ''})`,
            }))}
        />
      </Modal>

      {/* Modal création/édition technicien (sous-traitant) */}
      <Modal
        open={techFormOpen}
        title={<span>🏢 {techFormData.type === 'SUBCONTRACTOR' ? 'Nouveau sous-traitant' : 'Nouveau technicien'}</span>}
        onCancel={() => setTechFormOpen(false)}
        onOk={async () => {
          if (!techFormData.firstName.trim() || !techFormData.lastName.trim()) {
            message.warning('Prénom et nom requis');
            return;
          }
          if (techFormData.type === 'SUBCONTRACTOR') {
            if (!techFormData.company?.trim()) { message.warning('Entreprise requise pour un sous-traitant'); return; }
            if (!techFormData.vatNumber?.trim()) { message.warning('N° TVA requis pour un sous-traitant'); return; }
            if (!techFormData.address?.trim()) { message.warning('Adresse requise pour un sous-traitant'); return; }
            if (!techFormData.postalCode?.trim() || !techFormData.city?.trim()) { message.warning('Code postal et ville requis'); return; }
            if (!techFormData.iban?.trim()) { message.warning('IBAN requis pour un sous-traitant'); return; }
          }
          try {
            const payload = { ...techFormData, billingMode: techFormData.billingMode || null };
            await createTechnician(payload);
            message.success('Technicien créé !');
            setTechFormOpen(false);
            setTechFormData({ type: 'INTERNAL', billingMode: '', firstName: '', lastName: '', email: '', phone: '', company: '', specialties: [], color: '#1677ff', vatNumber: '', address: '', postalCode: '', city: '', country: 'Belgique', iban: '' });
          } catch (err: unknown) {
            message.error(err?.message || 'Erreur création');
          }
        }}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Type</label>
            <Select
              style={{ width: '100%' }}
              value={techFormData.type}
              onChange={v => setTechFormData(d => ({ ...d, type: v }))}
              options={[
                { value: 'INTERNAL', label: '👤 Interne' },
                { value: 'SUBCONTRACTOR', label: '🏢 Sous-traitant' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Prénom</label>
              <Input value={techFormData.firstName} onChange={e => setTechFormData(d => ({ ...d, firstName: e.target.value }))} placeholder="Prénom" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>{t('common.name')}</label>
              <Input value={techFormData.lastName} onChange={e => setTechFormData(d => ({ ...d, lastName: e.target.value }))} placeholder={t('fields.name')} />
            </div>
          </div>
          {techFormData.type === 'SUBCONTRACTOR' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Entreprise</label>
              <Input value={techFormData.company} onChange={e => setTechFormData(d => ({ ...d, company: e.target.value }))} placeholder="Nom de l'entreprise" />
            </div>
          )}
          {techFormData.type === 'SUBCONTRACTOR' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Mode de facturation</label>
              <Select
                style={{ width: '100%' }}
                value={techFormData.billingMode || 'FORFAIT'}
                onChange={v => setTechFormData(d => ({ ...d, billingMode: v }))}
                options={[
                  { value: 'FORFAIT', label: '💰 Forfait (pas de pointage)' },
                  { value: 'REGIE', label: '⏱️ Régie (pointage requis)' },
                ]}
              />
            </div>
          )}
          {techFormData.type === 'SUBCONTRACTOR' && (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>N° TVA <span style={{ color: '#ff4d4f' }}>*</span></label>
                <Input value={techFormData.vatNumber} onChange={e => setTechFormData(d => ({ ...d, vatNumber: e.target.value }))} placeholder="BE0123.456.789" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Adresse <span style={{ color: '#ff4d4f' }}>*</span></label>
                <Input value={techFormData.address} onChange={e => setTechFormData(d => ({ ...d, address: e.target.value }))} placeholder="Rue et numéro" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>Code postal <span style={{ color: '#ff4d4f' }}>*</span></label>
                  <Input value={techFormData.postalCode} onChange={e => setTechFormData(d => ({ ...d, postalCode: e.target.value }))} placeholder="1000" />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>Ville <span style={{ color: '#ff4d4f' }}>*</span></label>
                  <Input value={techFormData.city} onChange={e => setTechFormData(d => ({ ...d, city: e.target.value }))} placeholder="Bruxelles" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Pays</label>
                <Input value={techFormData.country} onChange={e => setTechFormData(d => ({ ...d, country: e.target.value }))} placeholder="Belgique" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500 }}>IBAN <span style={{ color: '#ff4d4f' }}>*</span></label>
                <Input value={techFormData.iban} onChange={e => setTechFormData(d => ({ ...d, iban: e.target.value }))} placeholder="BE68 5390 0754 7034" />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>{t('common.email')}</label>
              <Input value={techFormData.email} onChange={e => setTechFormData(d => ({ ...d, email: e.target.value }))} placeholder="email@exemple.com" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Téléphone</label>
              <Input value={techFormData.phone} onChange={e => setTechFormData(d => ({ ...d, phone: e.target.value }))} placeholder="+32..." />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Spécialités</label>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={techFormData.specialties}
              onChange={v => setTechFormData(d => ({ ...d, specialties: v }))}
              placeholder="Sélectionner les spécialités..."
              options={uniqueProducts.map(p => ({ value: p.value, label: p.label }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Couleur</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#f5222d', '#13c2c2', '#eb2f96', '#8c8c8c'].map(c => (
                <div
                  key={c}
                  role="button" tabIndex={0} onClick={() => setTechFormData(d => ({ ...d, color: c }))}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', backgroundColor: c, cursor: 'pointer',
                    border: techFormData.color === c ? '3px solid #262626' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal indisponibilité */}
      <Modal
        open={unavailModalOpen}
        title={<span>📅 Ajouter une indisponibilité</span>}
        onCancel={() => { setUnavailModalOpen(false); setUnavailTechId(''); setUnavailData({ startDate: '', endDate: '', type: 'CONGE', note: '' }); }}
        onOk={async () => {
          if (!unavailTechId || !unavailData.startDate || !unavailData.endDate) {
            message.warning('Technicien et dates requis');
            return;
          }
          try {
            await addUnavailability({
              technicianId: unavailTechId,
              startDate: unavailData.startDate,
              endDate: unavailData.endDate,
              type: unavailData.type,
              allDay: true,
              note: unavailData.note,
            });
            message.success('Indisponibilité ajoutée');
            setUnavailModalOpen(false);
            setUnavailTechId('');
            setUnavailData({ startDate: '', endDate: '', type: 'CONGE', note: '' });
          } catch (err: unknown) {
            message.error(err?.message || 'Erreur');
          }
        }}
        okText={t('common.add')}
        cancelText={t('common.cancel')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Technicien</label>
            <Select
              style={{ width: '100%' }}
              placeholder="Sélectionner un technicien..."
              value={unavailTechId || undefined}
              onChange={v => setUnavailTechId(v)}
              showSearch
              optionFilterProp="label"
              options={technicians.map(t => ({ value: t.id, label: `${t.firstName || ''} ${t.lastName || ''} ${t.type === 'SUBCONTRACTOR' ? '(ST)' : ''}`.trim() }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Type</label>
            <Select
              style={{ width: '100%' }}
              value={unavailData.type}
              onChange={v => setUnavailData(d => ({ ...d, type: v }))}
              options={[
                { value: 'CONGE', label: '🏖️ Congé' },
                { value: 'FORMATION', label: '📚 Formation' },
                { value: 'MALADIE', label: '🏥 Maladie' },
                { value: 'AUTRE', label: '📌 Autre' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Date début</label>
              <Input type="date" value={unavailData.startDate} onChange={e => setUnavailData(d => ({ ...d, startDate: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>Date fin</label>
              <Input type="date" value={unavailData.endDate} onChange={e => setUnavailData(d => ({ ...d, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Note (optionnel)</label>
            <Input.TextArea value={unavailData.note} onChange={e => setUnavailData(d => ({ ...d, note: e.target.value }))} placeholder="Note optionnelle..." rows={2} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChantierKanban;
