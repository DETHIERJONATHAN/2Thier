import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spin, message, Avatar, Tooltip, Empty, Tag, Button, Modal } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { renderProductIcon } from '../../components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/ProductFilterPanel';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';
import { useChantiers } from '../../hooks/useChantiers';
import { useChantierStatuses } from '../../hooks/useChantierStatuses';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import type { Chantier, ChantierStatus } from '../../types/chantier';

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
      options: { enableMouseEvents: false, delayTouchStart: 150 },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

const ITEM_TYPE = 'CHANTIER_CARD';

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
}

const ChantierCard: React.FC<ChantierCardProps> = ({ chantier, onView, onViewCompta, onDragStart, onDragEnd }) => {
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

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

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: isDragging ? 'rotate(3deg)' : 'none',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onClick={() => !isDragging && onView()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          backgroundColor: chantier.isValidated ? '#fff' : '#fffbe6',
          borderRadius: 8,
          boxShadow: '0 1px 0 rgba(9,30,66,.25)',
          padding: 8,
          cursor: 'pointer',
          transition: 'background-color 0.1s ease',
          marginBottom: 6,
          borderLeft: chantier.isValidated ? 'none' : '3px solid #faad14',
        }}
      >
        {/* Barre produit colorée */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              height: 6,
              flex: 1,
              borderRadius: 3,
              backgroundColor: chantier.productColor || '#722ed1',
            }}
          />
        </div>

        {/* Badge produit + validation + facturation */}
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tag
            color={chantier.productColor || 'purple'}
            style={{ fontSize: 11, margin: 0 }}
          >
            {chantier.productIcon && <span style={{ marginRight: 3 }}>{renderProductIcon(chantier.productIcon, 12)}</span>}
            {chantier.productLabel}
            {chantier.customLabel && ` — ${chantier.customLabel}`}
          </Tag>
          {!chantier.isValidated && (
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
          {chantier._invoiceSummary && (
            <Tooltip title={`Factures: ${chantier._invoiceSummary.paid}/${chantier._invoiceSummary.total} payées${chantier._invoiceSummary.overdue > 0 ? ` — ${chantier._invoiceSummary.overdue} en retard !` : ''}${chantier._invoiceSummary.totalAmount > 0 ? `\n${chantier._invoiceSummary.paidAmount.toLocaleString('fr-BE')} / ${chantier._invoiceSummary.totalAmount.toLocaleString('fr-BE')} €` : ''}`}>
              <div
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onViewCompta?.(); }}
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
        <div style={{ fontSize: 13, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>
          {displayName}
        </div>

        {/* Infos complémentaires */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {chantier.siteAddress && (
            <Tooltip title={chantier.siteAddress}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#5e6c84' }}>
                <EnvironmentOutlined style={{ fontSize: 10 }} />
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chantier.siteAddress}
                </span>
              </div>
            </Tooltip>
          )}

          {chantier.amount != null && chantier.amount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#52c41a' }}>
              <DollarOutlined style={{ fontSize: 10 }} />
              <span>{chantier.amount.toLocaleString('fr-BE')} €</span>
            </div>
          )}

          {/* Date de signature */}
          {chantier.signedAt && (
            <div style={{ fontSize: 10, color: '#b3bac5' }}>
              {new Date(chantier.signedAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
            </div>
          )}

          {/* Avatar responsable */}
          <div style={{ marginLeft: 'auto' }}>
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
  dropState?: 'allowed' | 'blocked' | 'none';
  onDragStart?: (statusId: string) => void;
  onDragEnd?: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, chantiers, onDrop, onViewChantier, onViewChantierCompta, dropState = 'none', onDragStart, onDragEnd }) => {
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
        width: 280,
        minWidth: 280,
        maxHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
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
          padding: '10px 12px 8px',
          borderBottom: `2px solid ${status.color}`,
          background: `linear-gradient(135deg, ${hexToRgba(status.color, 0.16)}, ${hexToRgba(status.color, 0.04)})`,
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: status.color,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>
            {status.name}
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#5E6C84',
              backgroundColor: hexToRgba(status.color, 0.2),
              borderRadius: 8,
              padding: '1px 8px',
              fontWeight: 500,
            }}
          >
            {chantiers.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          padding: '6px 6px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 100,
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

// ═══ ChantierKanban Main Component ═══
interface ChantierKanbanProps {
  onViewChantier?: (chantierId: string) => void;
  onSettings?: () => void;
}

const ChantierKanban: React.FC<ChantierKanbanProps> = ({ onViewChantier, onSettings }) => {
  const { chantiers, isLoading, refetch, updateChantierStatus } = useChantiers();
  const { statuses, isLoading: statusesLoading } = useChantierStatuses();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [allowedTargets, setAllowedTargets] = useState<Record<string, string[]>>({});
  const [draggingFromStatusId, setDraggingFromStatusId] = useState<string | null>(null);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

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
        console.warn('[Kanban] Impossible de charger les transitions autorisées:', err);
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

  // Chantiers filtrés selon les produits sélectionnés
  const filteredChantiers = useMemo(() => {
    if (selectedProducts.size === 0) return chantiers;
    return chantiers.filter(c => selectedProducts.has(c.productValue));
  }, [chantiers, selectedProducts]);

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

  const handleDrop = useCallback(async (chantierId: string, statusId: string) => {
    try {
      await updateChantierStatus(chantierId, statusId);
      message.success('Statut mis à jour');
      setDraggingFromStatusId(null);
      refetch();
    } catch (err: any) {
      const responseData = err?.data;
      const errorCode = responseData?.code;

      // ── Blocage facturation : afficher un Modal interactif ──
      if (errorCode === 'BILLING_BLOCK') {
        const unpaid = responseData?.unpaidInvoices || [];
        
        Modal.confirm({
          title: '💰 Facture(s) non payée(s)',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: (
            <div>
              <p style={{ marginBottom: 12 }}>Ce chantier a des factures requises non payées :</p>
              <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                {unpaid.map((inv: any, i: number) => (
                  <div key={i} style={{ fontWeight: 500 }}>• {inv.label} ({inv.percentage}%)</div>
                ))}
              </div>
              <p style={{ color: '#8c8c8c', fontSize: 13 }}>
                Vous pouvez ouvrir le chantier pour marquer les factures comme payées,
                ou forcer le déplacement.
              </p>
            </div>
          ),
          okText: '⚡ Forcer le déplacement',
          cancelText: 'Annuler',
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              await updateChantierStatus(chantierId, statusId, true);
              message.success('Statut mis à jour (facturation ignorée)');
              refetch();
            } catch (forceErr: any) {
              message.error(forceErr?.message || 'Erreur lors du déplacement forcé');
            }
          },
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
  }, [updateChantierStatus, refetch]);

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>🏗️ Chantiers</span>
          <span style={{ fontSize: 13, color: '#5e6c84' }}>
            {filteredChantiers.length} chantier{filteredChantiers.length > 1 ? 's' : ''}
            {selectedProducts.size > 0 && ` / ${chantiers.length}`}
          </span>
        </div>

        {/* Product filter buttons */}
        {uniqueProducts.length > 0 && (
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
                      padding: '3px 10px',
                      borderRadius: 16,
                      border: isActive ? `2px solid ${bgColor}` : '1px solid #d9d9d9',
                      background: isActive ? hexToRgba(bgColor, 0.12) : '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? bgColor : '#595959',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
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
        )}

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {onSettings && (
            <Button icon={<SettingOutlined />} size="small" onClick={onSettings}>
              Paramètres
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndProvider backend={MultiBackend} options={HTML5toTouch}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: 12,
            overflowX: 'auto',
            flex: 1,
            alignItems: 'flex-start',
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
            />
          ))}
        </div>
      </DndProvider>
    </div>
  );
};

export default ChantierKanban;
