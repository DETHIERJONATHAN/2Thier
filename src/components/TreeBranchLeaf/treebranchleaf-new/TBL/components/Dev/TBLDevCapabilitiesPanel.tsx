import React, { useMemo } from 'react';
import { Card, Tag, Tooltip, Typography, Input } from 'antd';
import { useTBLCapabilitiesPreload } from '../../hooks/useTBLCapabilitiesPreload';

interface TBLDevCapabilitiesPanelProps {
  preload: ReturnType<typeof useTBLCapabilitiesPreload>;
  collapsed?: boolean;
}

// Petite fonction pour détecter si une ref est une formule / variable / condition
function classifyRef(ref: string) {
  if (ref.startsWith('formula:')) return 'formula';
  if (ref.startsWith('variable:')) return 'variable';
  if (ref.startsWith('condition:')) return 'condition';
  if (ref.startsWith('table:')) return 'table';
  return 'ref';
}

const colorMap: Record<string, string> = {
  formula: 'purple',
  variable: 'blue',
  condition: 'orange',
  table: 'gold',
  ref: 'default'
};

export const TBLDevCapabilitiesPanel: React.FC<TBLDevCapabilitiesPanelProps> = ({ preload, collapsed }) => {
  const [filter, setFilter] = React.useState('');
  const caps = preload.capabilities;

  const filtered = useMemo(() => {
    if (!filter.trim()) return caps;
    const f = filter.toLowerCase();
    return caps.filter(c => c.nodeId.toLowerCase().includes(f) || (c.sourceRef || '').toLowerCase().includes(f));
  }, [caps, filter]);

  const rows = useMemo(() => filtered.map(cap => {
    const deps = Array.from(preload.reverseGraph.get(cap.nodeId) || []);
    const dependants: string[] = [];
    // Collect dependants by searching dependencyGraph sets containing nodeId? quicker: iterate dependencyGraph keys
    preload.dependencyGraph.forEach((value, ref) => {
      if (value.has(cap.nodeId)) dependants.push(ref);
    });
    return { cap, deps, dependants };
  }), [filtered, preload.reverseGraph, preload.dependencyGraph]);

  return (
    <Card size="small" style={{ maxHeight: collapsed ? 120 : 600, overflow: 'auto', fontSize: 12 }} title={`TBL Capabilities (${caps.length})`}
      extra={<Input size="small" placeholder="filtre..." value={filter} onChange={e => setFilter(e.target.value)} allowClear />}
    >
      {rows.map(r => (
        <div key={r.cap.nodeId} style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography.Text code>{r.cap.nodeId}</Typography.Text>
            <Tag color={colorMap[r.cap.capacity] || 'default'}>{r.cap.capacity}</Tag>
            {r.cap.sourceRef && <Tag>{r.cap.sourceRef}</Tag>}
            {r.cap.fixedValue && <Tag color="green">fixed</Tag>}
            {r.deps.length > 0 && (
              <Tooltip title={r.deps.join(', ')}>
                <Tag color="geekblue">deps:{r.deps.length}</Tag>
              </Tooltip>
            )}
            {r.dependants.length > 0 && (
              <Tooltip title={r.dependants.join(', ')}>
                <Tag color="volcano">usedBy:{r.dependants.length}</Tag>
              </Tooltip>
            )}
          </div>
          {!collapsed && r.deps.length > 0 && (
            <div style={{ marginLeft: 8, fontSize: 11 }}>
              → deps: {r.deps.map(d => <Tag key={d} color={colorMap[classifyRef(d)]}>{d}</Tag>)}
            </div>
          )}
          {!collapsed && r.dependants.length > 0 && (
            <div style={{ marginLeft: 8, fontSize: 11 }}>
              ← usedBy: {r.dependants.map(d => <Tag key={d} color={colorMap[classifyRef(d)]}>{d}</Tag>)}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
};

export default TBLDevCapabilitiesPanel;
