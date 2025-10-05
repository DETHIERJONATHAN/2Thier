import React, { useMemo, useState, useCallback } from 'react';
import { Card, Space, Select, Typography, Button, Tooltip, Input } from 'antd';
import type { ConditionSet, ConditionBranch, Expr, ValueRef, BinaryOp, ConditionAction } from '../../../../types';
import { DeleteOutlined } from '@ant-design/icons';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../../shared/NodeTreeSelector';
import TokenChip from '../../shared/TokenChip';

// type NodeSummary = { id: string; label: string; type: string };

const { Text } = Typography;

type Props = {
  nodeId: string;
  value: ConditionSet;
  onChange: (next: ConditionSet) => void;
  readOnly?: boolean;
};

// Helpers
const tokenToValueRef = (t: string): ValueRef => {
  if (t.startsWith('@value.')) return { kind: 'nodeValue', ref: t };
  if (t.startsWith('@select.')) return { kind: 'nodeOption', ref: t };
  if (t.startsWith('@') && !t.startsWith('@value.') && !t.startsWith('@select.')) return { kind: 'variable', ref: t };
  if (t.startsWith('#')) return { kind: 'marker', ref: t };
  return { kind: 'const', value: t };
};

const ensureBranch = (cs: ConditionSet): ConditionBranch => {
  if (!cs.branches || !cs.branches.length) {
    return { id: 'b_' + Math.random().toString(36).slice(2), label: 'Alors', actions: [] };
  }
  return cs.branches[0];
};

const ensureBinary = (expr?: Expr): Expr => {
  if (!expr || expr.type !== 'binary') return { id: 'bin_' + Math.random().toString(36).slice(2), type: 'binary', op: '==', left: undefined, right: undefined };
  return expr;
};

const OPS: { value: BinaryOp; label: string; needsRight?: boolean }[] = [
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
  { value: 'isNotEmpty', label: "n'est pas vide", needsRight: false },
];

// Plus de DnD: on affiche simplement une capsule avec le contenu sélectionné
const DisplaySlot: React.FC<{ label: string; content?: React.ReactNode; onClear?: () => void; readOnly?: boolean; }>
  = ({ label, content, onClear, readOnly }) => (
  <div style={{
    minWidth: 220,
    minHeight: 36,
    padding: '4px 8px',
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
  }}>
    <Tooltip title={label}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' /* textOverflow: 'ellipsis' TEMPORAIREMENT DÉSACTIVÉ */ }}>
        {content || <Text type="secondary">{label}</Text>}
      </span>
    </Tooltip>
    {!!content && !readOnly && (
      <Button size="small" type="text" icon={<DeleteOutlined />} onClick={onClear} />
    )}
  </div>
);

const ConditionsDnDComposer: React.FC<Props> = ({ nodeId, value, onChange, readOnly }) => {
  const branch = useMemo(() => ensureBranch(value), [value]);
  const binary = useMemo(() => ensureBinary(branch.when as Expr | undefined), [branch.when]);

  const leftToken = (binary.left?.ref) || (typeof binary.left?.value !== 'undefined' ? String(binary.left?.value) : undefined);
  const rightToken = (binary.right?.ref) || (typeof binary.right?.value !== 'undefined' ? String(binary.right?.value) : undefined);
  const currentOp = binary.op as BinaryOp;
  const needsRight = (OPS.find(o => o.value === currentOp)?.needsRight !== false);

  // Zone de test locale
  const [testLeft, setTestLeft] = useState<string>('');
  const [testRight, setTestRight] = useState<string>('');
  const opLabel = useMemo(() => (OPS.find(o => o.value === currentOp)?.label || String(currentOp)), [currentOp]);

  const evaluate = useCallback((l: string, r: string): boolean | null => {
    if (!currentOp) return null;
    const op = currentOp;
    // Gestion vide / non vide
    if (op === 'isEmpty') return l.trim().length === 0;
    if (op === 'isNotEmpty') return l.trim().length > 0;
    // Comparaisons
    // Essayer numériques si possible
    const ln = Number(l);
    const rn = Number(r);
    const bothNum = !Number.isNaN(ln) && !Number.isNaN(rn);
    switch (op) {
      case '==': return bothNum ? ln === rn : l === r;
      case '!=': return bothNum ? ln !== rn : l !== r;
      case '>': return bothNum ? ln > rn : l > r;
      case '>=': return bothNum ? ln >= rn : l >= r;
      case '<': return bothNum ? ln < rn : l < rn;
      case '<=': return bothNum ? ln <= rn : l <= rn;
      case 'contains': return l.includes(r);
      case 'startsWith': return l.startsWith(r);
      case 'endsWith': return l.endsWith(r);
      default: return null;
    }
  }, [currentOp]);
  const evalResult = useMemo(() => evaluate(testLeft, testRight), [testLeft, testRight, evaluate]);

  const updateExpr = (patch: Partial<Expr>) => {
    const nextExpr: Expr = { ...binary, ...patch };
    const nextBranch: ConditionBranch = { ...branch, when: nextExpr };
    const branches = value.branches && value.branches.length ? [nextBranch, ...value.branches.slice(1)] : [nextBranch];
    onChange({ ...value, branches });
  };

  // Actions "ALORS" simplifiées (type SHOW avec nodeIds)
  const showAction: ConditionAction | undefined = (branch.actions || []).find(a => a.type === 'SHOW');
  const nodeIds = (showAction?.nodeIds || []) as string[];

  const updateShowAction = (nextIds: string[]) => {
    const acts = [...(branch.actions || [])];
    const idx = acts.findIndex(a => a.type === 'SHOW');
    if (idx >= 0) acts[idx] = { ...acts[idx], nodeIds: nextIds } as ConditionAction;
    else acts.push({ id: 'a_' + Math.random().toString(36).slice(2), type: 'SHOW', nodeIds: nextIds });
    const nextBranch: ConditionBranch = { ...branch, actions: acts };
    const branches = value.branches && value.branches.length ? [nextBranch, ...value.branches.slice(1)] : [nextBranch];
    onChange({ ...value, branches });
  };

  // ELSE branch (fallback)
  const elseAction: ConditionAction | undefined = (value.fallback?.actions || []).find(a => a.type === 'SHOW');
  const elseNodeIds = (elseAction?.nodeIds || []) as string[];

  const updateElseShowAction = (nextIds: string[]) => {
    const fb: ConditionBranch = value.fallback ? { ...value.fallback } : { id: 'fb_' + Math.random().toString(36).slice(2), label: 'Sinon', actions: [] };
    const acts = [...(fb.actions || [])];
    const idx = acts.findIndex(a => a.type === 'SHOW');
    if (idx >= 0) acts[idx] = { ...acts[idx], nodeIds: nextIds } as ConditionAction;
    else acts.push({ id: 'a_' + Math.random().toString(36).slice(2), type: 'SHOW', nodeIds: nextIds });
    const nextFallback: ConditionBranch = { ...fb, actions: acts };
    onChange({ ...value, fallback: nextFallback });
  };

  // Plus d'abonnement DnD: la sélection se fait via le sélecteur

  // Sélecteurs (sans DnD)
  const [pickLeft, setPickLeft] = React.useState(false);
  const [pickRight, setPickRight] = React.useState(false);
  const [pickThen, setPickThen] = React.useState(false);
  const [pickElse, setPickElse] = React.useState(false);

  const renderToken = (ref?: string): React.ReactNode => {
    if (!ref) return null;
    return <TokenChip token={ref} />;
  };

  const applyPicker = (slot: 'left' | 'right' | 'then' | 'else') => (val: NodeTreeSelectorValue) => {
    if (slot === 'left') {
      updateExpr({ left: tokenToValueRef(val.ref) });
    } else if (slot === 'right') {
      updateExpr({ right: tokenToValueRef(val.ref) });
    } else if (slot === 'then') {
      // ✅ CORRECTION: Préserver les références de formules
      let nodeIdRef: string;
      if (val.ref.startsWith('node-formula:') || val.ref.startsWith('formula:')) {
        // Garder les références de formules telles quelles
        nodeIdRef = val.ref;
      } else if (val.ref.startsWith('@value.')) {
        // Extraire l'ID du nœud des références @value.
        nodeIdRef = val.ref.slice('@value.'.length);
      } else {
        // Garder la référence telle quelle pour les autres cas
        nodeIdRef = val.ref;
      }
      updateShowAction(Array.from(new Set([...(nodeIds || []), nodeIdRef])));
    } else if (slot === 'else') {
      // ✅ CORRECTION: Préserver les références de formules pour SINON
      let nodeIdRef: string;
      if (val.ref.startsWith('node-formula:') || val.ref.startsWith('formula:')) {
        // Garder les références de formules telles quelles
        nodeIdRef = val.ref;
      } else if (val.ref.startsWith('@value.')) {
        // Extraire l'ID du nœud des références @value.
        nodeIdRef = val.ref.slice('@value.'.length);
      } else {
        // Garder la référence telle quelle pour les autres cas
        nodeIdRef = val.ref;
      }
      updateElseShowAction(Array.from(new Set([...(elseNodeIds || []), nodeIdRef])));
    }
  };

  return (
    <Card size="small" variant="outlined" style={{ background: '#fff' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {/* Résumé et test rapide */}
        <div style={{ padding: '4px 6px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Text type="secondary">Résumé:</Text>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Text>SI</Text>
              {renderToken(leftToken) || <Text type="secondary">(champ)</Text>}
              <Text>{opLabel}</Text>
              {needsRight ? (renderToken(rightToken) || <Text type="secondary">(valeur)</Text>) : null}
              <Text>→ ALORS ({(nodeIds || []).length}) / SINON ({(elseNodeIds || []).length})</Text>
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 6 }}>
            <Text type="secondary">Test:</Text>
            <Input size="small" placeholder="Valeur test gauche" value={testLeft} onChange={(e) => setTestLeft(e.target.value)} style={{ width: 160 }} />
            {needsRight && (
              <Input size="small" placeholder="Valeur test droite" value={testRight} onChange={(e) => setTestRight(e.target.value)} style={{ width: 160 }} />
            )}
            <Text>
              Résultat: {' '}
              {evalResult === null ? (
                <Text type="secondary">—</Text>
              ) : evalResult ? (
                <Text type="success">VRAI → ALORS</Text>
              ) : (
                <Text type="danger">FAUX → SINON</Text>
              )}
            </Text>
          </div>
        </div>
        <Text strong>SI</Text>
        <Space wrap>
          <DisplaySlot
            label="Référence (gauche)"
            content={renderToken(leftToken)}
            onClear={() => updateExpr({ left: undefined })}
            readOnly={readOnly}
          />
          <Button size="small" onClick={() => setPickLeft(true)}>Sélectionner…</Button>
          <Select
            size="small"
            value={binary.op as BinaryOp}
            style={{ minWidth: 160 }}
            onChange={(v) => updateExpr({ op: v as BinaryOp })}
            options={OPS.map(o => ({ value: o.value, label: o.label }))}
            disabled={readOnly}
          />
          {needsRight && (
            <>
              <DisplaySlot
                label="Valeur (droite)"
                content={renderToken(rightToken)}
                onClear={() => updateExpr({ right: undefined })}
                readOnly={readOnly}
              />
              <Button size="small" onClick={() => setPickRight(true)}>Sélectionner…</Button>
            </>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Utilisez les boutons « Sélectionner… » pour choisir vos références. Le glisser-déposer depuis la Structure est désactivé ici.
        </Text>
        <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
        <Text strong>ALORS</Text>
        {(!nodeIds || !nodeIds.length) ? (
          <Text type="secondary">Aucun nœud sélectionné</Text>
        ) : (
          <Space wrap>
            {nodeIds.map(id => {
              // ✅ CORRECTION: Gérer les formats formula: ET node-formula:
              const tokenVal = (id.startsWith('formula:') || id.startsWith('node-formula:')) ? id : `@value.${id}`;
              return (
                <TokenChip key={id} token={tokenVal} onRemove={() => !readOnly && updateShowAction(nodeIds.filter(x => x !== id))} />
              );
            })}
          </Space>
        )}
        <Button size="small" onClick={() => setPickThen(true)}>Sélectionner des nœuds…</Button>

        <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
        <Text strong>SINON</Text>
        {(!elseNodeIds || !elseNodeIds.length) ? (
          <Text type="secondary">Aucun nœud sélectionné</Text>
        ) : (
          <Space wrap>
            {elseNodeIds.map(id => {
              // ✅ CORRECTION: Gérer les formats formula: ET node-formula:
              const tokenVal = (id.startsWith('formula:') || id.startsWith('node-formula:')) ? id : `@value.${id}`;
              return (
                <TokenChip key={id} token={tokenVal} onRemove={() => !readOnly && updateElseShowAction(elseNodeIds.filter(x => x !== id))} />
              );
            })}
          </Space>
        )}
        <Button size="small" onClick={() => setPickElse(true)}>Sélectionner des nœuds…</Button>
      </Space>
  <NodeTreeSelector nodeId={nodeId} open={pickLeft} onClose={() => setPickLeft(false)} onSelect={applyPicker('left')} />
  <NodeTreeSelector nodeId={nodeId} open={pickRight} onClose={() => setPickRight(false)} onSelect={applyPicker('right')} />
  <NodeTreeSelector nodeId={nodeId} open={pickThen} onClose={() => setPickThen(false)} onSelect={applyPicker('then')} selectionContext="nodeId" />
  <NodeTreeSelector nodeId={nodeId} open={pickElse} onClose={() => setPickElse(false)} onSelect={applyPicker('else')} selectionContext="nodeId" />
    </Card>
  );
};

export default ConditionsDnDComposer;
