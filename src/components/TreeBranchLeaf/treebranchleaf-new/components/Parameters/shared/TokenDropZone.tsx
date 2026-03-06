import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Empty } from 'antd';
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { eventBus, ParameterDropEvent } from '../../../utils/eventBus';
import TokenChip from './TokenChip';

export type TokenDropZoneProps = {
  nodeId: string;
  capability: string; // formula | condition | table | api | link | markers
  label: string;
  placeholder?: string;
  value?: string[];
  onChange?: (tokens: string[]) => void;
  readOnly?: boolean;
  onTokenDoubleClick?: (token: string) => void;
  exposedNodeIds?: Set<string>;
};

export const TokenDropZone: React.FC<TokenDropZoneProps> = ({ nodeId, capability, label, placeholder, value, onChange, readOnly, onTokenDoubleClick, exposedNodeIds }) => {
  const [tokens, setTokens] = useState<string[]>(() => value || []);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  const { setNodeRef, isOver } = useDroppable({
    id: `param-${capability}-${nodeId}`,
    data: {
      type: 'parameter',
      nodeId,
      capability,
      position: 'token'
    }
  });
  useEffect(() => {
    setTokens(value || []);
  }, [value]);

  useEffect(() => {
    const unsub = eventBus.on<ParameterDropEvent>('parameter:drop', (evt) => {
      if (evt.nodeId === nodeId && evt.capability === capability) {
        setTokens((prev) => {
          const next = [...prev, evt.token];
          onChange?.(next);
          return next;
        });
      }
    });
    return () => { unsub(); };
  }, [nodeId, capability, onChange]);

  const sortableItems = useMemo(() => tokens.map((token, index) => ({
    id: `${nodeId}-${index}-${token}`,
    token,
    index
  })), [tokens, nodeId]);

  const handleReorder = useCallback((event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableItems.findIndex(item => item.id === active.id);
    const newIndex = sortableItems.findIndex(item => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setTokens((prev) => {
      const next = arrayMove(prev, oldIndex, newIndex);
      onChange?.(next);
      return next;
    });
  }, [sortableItems, onChange, readOnly]);

  const removeAtIndex = useCallback((targetIndex: number) => {
    setTokens((prev) => {
      const next = prev.filter((_, idx) => idx !== targetIndex);
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const extractNodeIdFromToken = useCallback((token: string): string | null => {
    if (token.startsWith('@value.')) return token.slice('@value.'.length);
    if (token.startsWith('@select.')) return token.slice('@select.'.length).split('.')[0];
    return null;
  }, []);

  const isTokenExposed = useCallback((token: string): boolean => {
    // @const. tokens are always gestionnaire-exposed
    if (token.startsWith('@const.')) return true;
    if (!exposedNodeIds || exposedNodeIds.size === 0) return false;
    const nid = extractNodeIdFromToken(token);
    return nid ? exposedNodeIds.has(nid) : false;
  }, [exposedNodeIds, extractNodeIdFromToken]);

  const body = useMemo(() => {
    if (!tokens.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={placeholder || 'Glissez des références ici'} />;
    }

    if (readOnly) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tokens.map((token, idx) => (
            <TokenChip
              key={`${token}-${idx}`}
              token={token}
              onDoubleClick={onTokenDoubleClick}
              isGestionnaireExposed={isTokenExposed(token)}
            />
          ))}
        </div>
      );
    }

    return (
      <DndContext sensors={sensors} onDragEnd={handleReorder}>
        <SortableContext items={sortableItems.map(item => item.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sortableItems.map((item) => (
              <SortableTokenChip
                key={item.id}
                id={item.id}
                token={item.token}
                onRemove={(_token) => removeAtIndex(item.index)}
                onDoubleClick={onTokenDoubleClick}
                isGestionnaireExposed={isTokenExposed(item.token)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }, [tokens, placeholder, readOnly, sensors, sortableItems, handleReorder, removeAtIndex, onTokenDoubleClick, isTokenExposed]);

  return (
    <div ref={setNodeRef}>
      <Card size="small" bordered style={{ background: isOver ? '#e6f7ff' : '#fafafa', transition: 'background 120ms' }} title={label}>
        {body}
      </Card>
    </div>
  );
};

type SortableTokenChipProps = {
  id: string;
  token: string;
  onRemove?: (token: string) => void;
  onDoubleClick?: (token: string) => void;
  isGestionnaireExposed?: boolean;
};

const SortableTokenChip: React.FC<SortableTokenChipProps> = ({ id, token, onRemove, onDoubleClick, isGestionnaireExposed }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.85 : 1,
    touchAction: 'none'
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TokenChip token={token} onRemove={onRemove} onDoubleClick={onDoubleClick} isGestionnaireExposed={isGestionnaireExposed} />
    </div>
  );
};

export default TokenDropZone;
