import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Card, Button, Input, Tag, message, Popconfirm, Empty, Typography, ColorPicker,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, ArrowLeftOutlined, HolderOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useChantierStatuses } from '../../hooks/useChantierStatuses';
import type { ChantierStatus } from '../../types/chantier';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Text, Title } = Typography;

// ─── Sortable Status Row ───
const SortableStatusRow: React.FC<{
  status: ChantierStatus;
  onEdit: (id: string, data: Partial<ChantierStatus>) => void;
  onDelete: (id: string) => void;
}> = ({ status, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commitEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== status.name) {
      onEdit(status.id, { name: trimmed });
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        backgroundColor: '#fff',
        borderRadius: 6,
        border: '1px solid #f0f0f0',
        marginBottom: 6,
      }}
    >
      {/* Row 1: grip + color + name (takes full remaining width) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 0', minWidth: 0 }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: '#bbb', flexShrink: 0 }}
        >
          <HolderOutlined />
        </span>

        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            backgroundColor: status.color,
            flexShrink: 0,
          }}
        />

        {isEditing ? (
          <Input
            size="small"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitEdit}
            onPressEnter={commitEdit}
            autoFocus
            style={{ flex: 1, minWidth: 0 }}
          />
        ) : (
          <Text strong style={{ flex: 1, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status.name}
          </Text>
        )}
      </div>

      {/* Row 2: tag + actions (wrap below on narrow screens) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Tag style={{ margin: 0, fontSize: 11 }}>{status._count?.Chantier || 0} chantier(s)</Tag>

        <ColorPicker
          value={status.color}
          size="small"
          disabledAlpha
          onChange={(val) => {
            const hex = typeof val === 'string' ? val : (val?.toHexString?.() || '#1677ff');
            onEdit(status.id, { color: hex.slice(0, 7) });
          }}
          presets={[{
            label: 'Couleurs',
            colors: ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'],
          }]}
        />

        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => { setEditName(status.name); setIsEditing(true); }}
        />

        <Popconfirm
          title="Supprimer ce statut ?"
          description={status._count?.Chantier ? 'Des chantiers utilisent ce statut !' : undefined}
          onConfirm={() => onDelete(status.id)}
          okText="Supprimer"
          cancelText="Annuler"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
  );
};

// ═══ Main Settings Page ═══
const ChantierSettingsPage: React.FC<{ onBack?: () => void; onWorkflowSettings?: () => void }> = ({ onBack, onWorkflowSettings }) => {
  const navigate = useNavigate();
  const goBack = onBack || (() => navigate('/chantiers'));
  const goToWorkflow = onWorkflowSettings || (() => navigate('/chantiers/settings/workflow'));
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { statuses, refetch } = useChantierStatuses();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#1677ff');
  const [orderedStatuses, setOrderedStatuses] = useState<ChantierStatus[]>([]);

  useEffect(() => {
    setOrderedStatuses(statuses);
  }, [statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/api/chantier-statuses', {
        name: newName.trim(),
        color: newColor,
      });
      setNewName('');
      setNewColor('#1677ff');
      message.success('Statut ajouté');
      refetch();
    } catch {
      message.error('Erreur lors de l\'ajout');
    }
  }, [api, newName, newColor, refetch]);

  const handleEdit = useCallback(async (id: string, data: Partial<ChantierStatus>) => {
    try {
      await api.put(`/api/chantier-statuses/${id}`, data);
      message.success('Statut mis à jour');
      refetch();
    } catch {
      message.error('Erreur lors de la mise à jour');
    }
  }, [api, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/chantier-statuses/${id}`);
      message.success('Statut supprimé');
      refetch();
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur lors de la suppression');
    }
  }, [api, refetch]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedStatuses.findIndex(s => s.id === active.id);
    const newIndex = orderedStatuses.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedStatuses, oldIndex, newIndex);
    setOrderedStatuses(reordered);

    try {
      await api.post('/api/chantier-statuses/reorder', {
        statusIds: reordered.map(s => s.id),
      });
    } catch {
      message.error('Erreur lors de la réorganisation');
      refetch();
    }
  }, [api, orderedStatuses, refetch]);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 'clamp(10px, 3vw, 24px)' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack} size="middle">
          Retour
        </Button>
        <Title level={4} style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 22px)' }}>⚙️ Paramètres Chantiers</Title>
      </div>

      <Card title="Pipeline — Statuts de chantier" size="small">
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Définissez les étapes du pipeline chantier. Glissez-déposez pour réordonner.
        </Text>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {orderedStatuses.map(status => (
              <SortableStatusRow
                key={status.id}
                status={status}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </DndContext>

        {orderedStatuses.length === 0 && (
          <Empty description="Aucun statut. Ajoutez-en ci-dessous." />
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Nouveau statut..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onPressEnter={handleAdd}
            style={{ flex: '1 1 120px', minWidth: 0 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ColorPicker
              value={newColor}
              disabledAlpha
              onChange={(val) => {
                const hex = typeof val === 'string' ? val : (val?.toHexString?.() || '#1677ff');
                setNewColor(hex.slice(0, 7));
              }}
              presets={[{
                label: 'Couleurs',
                colors: ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'],
              }]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              disabled={!newName.trim()}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Card>

      {/* Lien vers les paramètres workflow */}
      <Card size="small" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <Text strong><ThunderboltOutlined /> Workflow & Facturation</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>Transitions, déclencheurs automatiques, templates de factures</Text></div>
          </div>
          <Button type="primary" ghost onClick={goToWorkflow}>
            Configurer
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChantierSettingsPage;
