import React, { useEffect, useMemo, useState } from 'react';
import { Card, Empty } from 'antd';
import { useDroppable } from '@dnd-kit/core';
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
};

export const TokenDropZone: React.FC<TokenDropZoneProps> = ({ nodeId, capability, label, placeholder, value, onChange, readOnly }) => {
  const [tokens, setTokens] = useState<string[]>(() => value || []);

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
          if (prev.includes(evt.token)) return prev; // éviter doublons
          const next = [...prev, evt.token];
          onChange?.(next);
          return next;
        });
      }
    });
    return () => { unsub(); };
  }, [nodeId, capability, onChange]);

  const content = useMemo(() => {
    if (!tokens.length) return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={placeholder || 'Glissez des références ici'} />
    );
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tokens.map((t) => (
          <TokenChip key={t} token={t} onRemove={readOnly ? undefined : (tok) => {
            const next = tokens.filter(x => x !== tok);
            setTokens(next);
            onChange?.(next);
          }} />
        ))}
      </div>
    );
  }, [tokens, onChange, readOnly, placeholder]);

  return (
    <div ref={setNodeRef}>
      <Card size="small" bordered style={{ background: isOver ? '#e6f7ff' : '#fafafa', transition: 'background 120ms' }} title={label}>
        {content}
      </Card>
    </div>
  );
};

export default TokenDropZone;
