import React, { useCallback } from 'react';
import { Button, Space, Select, Input, Divider, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Expr, BinaryOp, ValueRef } from '../../../../types';

const { Text } = Typography;

type Props = {
  tokens: string[];
  value?: Expr;
  onChange: (expr?: Expr) => void;
};

const ALL_OPS: { value: BinaryOp; label: string; needsRight?: boolean }[] = [
  { value: '==', label: 'est égal à' },
  { value: '!=', label: 'est différent de' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: 'contains', label: 'contient' },
  { value: 'startsWith', label: 'commence par' },
  { value: 'endsWith', label: 'se termine par' },
  { value: 'isEmpty', label: 'est vide', needsRight: false },
  { value: 'isNotEmpty', label: 'n\'est pas vide', needsRight: false },
];

const tokenToValueRef = (t: string): ValueRef => {
  if (t.startsWith('@value.')) return { kind: 'nodeValue', ref: t };
  if (t.startsWith('@select.')) return { kind: 'nodeOption', ref: t };
  if (t.startsWith('@') && !t.startsWith('@value.') && !t.startsWith('@select.')) return { kind: 'variable', ref: t };
  if (t.startsWith('#')) return { kind: 'marker', ref: t };
  return { kind: 'const', value: t };
};

function ensureGroup(expr?: Expr): Expr {
  if (!expr) return { id: 'grp_' + Math.random().toString(36).slice(2), type: 'group', bool: 'AND', children: [] };
  if (expr.type !== 'group') return { id: 'grp_' + Math.random().toString(36).slice(2), type: 'group', bool: 'AND', children: [expr] };
  if (!expr.children) return { ...expr, children: [] };
  return expr;
}

const ClauseEditor: React.FC<{ tokens: string[]; clause: Expr; onChange: (e: Expr) => void; onRemove: () => void; }> = ({ tokens, clause, onChange, onRemove }) => {
  const isBinary = clause.type === 'binary';
  const opDef = ALL_OPS.find(o => o.value === clause.op);

  return (
    <Space align="baseline" wrap>
      <Select
        size="small"
        placeholder="Référence"
        style={{ minWidth: 220 }}
        value={clause.left?.ref || (typeof clause.left?.value !== 'undefined' ? String(clause.left?.value) : undefined)}
        onChange={(v) => onChange({ ...clause, type: 'binary', left: tokenToValueRef(v) })}
        options={tokens.map(t => ({ label: t, value: t }))}
      />
      <Select
        size="small"
        style={{ minWidth: 160 }}
        value={clause.op as BinaryOp}
        onChange={(v) => onChange({ ...clause, type: 'binary', op: v as BinaryOp })}
        options={ALL_OPS.map(o => ({ value: o.value, label: o.label }))}
      />
      {isBinary && (!opDef || opDef.needsRight !== false) && (
        <Input
          size="small"
          placeholder="Valeur"
          style={{ width: 220 }}
          value={clause.right?.ref || (typeof clause.right?.value !== 'undefined' ? String(clause.right?.value) : '')}
          onChange={(e) => onChange({ ...clause, right: { kind: 'const', value: e.target.value } })}
        />
      )}
      <Button size="small" danger type="text" onClick={onRemove} icon={<DeleteOutlined />} />
    </Space>
  );
};

export const ExpressionBuilder: React.FC<Props> = ({ tokens, value, onChange }) => {
  const expr = ensureGroup(value);

  const addClause = useCallback(() => {
    const next: Expr = {
      ...expr,
      children: [...(expr.children || []), { id: 'bin_' + Math.random().toString(36).slice(2), type: 'binary', op: '==', left: undefined, right: undefined }]
    };
    onChange(next);
  }, [expr, onChange]);

  const addGroup = useCallback(() => {
    const next: Expr = {
      ...expr,
      children: [...(expr.children || []), { id: 'grp_' + Math.random().toString(36).slice(2), type: 'group', bool: 'AND', children: [] }]
    };
    onChange(next);
  }, [expr, onChange]);

  const updateChild = (idx: number, child: Expr | undefined) => {
    const list = [...(expr.children || [])];
    if (typeof child === 'undefined') list.splice(idx, 1); else list[idx] = child;
    onChange({ ...expr, children: list });
  };

  return (
    <div style={{ border: '1px dashed #e5e7eb', borderRadius: 8, padding: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Space align="center" wrap>
          <Text>Combiner par</Text>
          <Select
            size="small"
            value={expr.bool || 'AND'}
            onChange={(v) => onChange({ ...expr, bool: v as 'AND' | 'OR' })}
            options={[{ value: 'AND', label: 'ET' }, { value: 'OR', label: 'OU' }]}
          />
        </Space>
        {(expr.children || []).map((c, i) => (
          <div key={c.id}>
            {c.type === 'group' ? (
              <div style={{ paddingLeft: 8 }}>
                <ExpressionBuilder tokens={tokens} value={c} onChange={(nc) => updateChild(i, nc)} />
                <Divider style={{ margin: '8px 0' }} />
                <Button size="small" danger type="text" onClick={() => updateChild(i, undefined)} icon={<DeleteOutlined />}>Supprimer le groupe</Button>
              </div>
            ) : (
              <ClauseEditor
                tokens={tokens}
                clause={c}
                onChange={(nc) => updateChild(i, nc)}
                onRemove={() => updateChild(i, undefined)}
              />
            )}
          </div>
        ))}
        <Space>
          <Button size="small" icon={<PlusOutlined />} onClick={addClause}>Ajouter condition</Button>
          <Button size="small" icon={<PlusOutlined />} onClick={addGroup}>Ajouter groupe</Button>
        </Space>
      </Space>
    </div>
  );
};

export default ExpressionBuilder;
