import React from 'react';
import { Button, Card, Space, Typography, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ConditionSet, ConditionBranch, ConditionAction, Expr } from '../../../../types';
import ExpressionBuilder from './ExpressionBuilder';

const { Title } = Typography;

type Props = {
  tokens: string[];
  value: ConditionSet;
  onChange: (val: ConditionSet) => void;
};

const newAction = (): ConditionAction => ({ id: 'a_' + Math.random().toString(36).slice(2), type: 'SHOW', nodeIds: [] });
const newBranch = (): ConditionBranch => ({ id: 'b_' + Math.random().toString(36).slice(2), label: 'Alors', actions: [] });

export const BranchesEditor: React.FC<Props> = ({ tokens, value, onChange }) => {
  const updateBranch = (idx: number, patch: Partial<ConditionBranch>) => {
    const list = [...value.branches];
    list[idx] = { ...list[idx], ...patch };
    onChange({ ...value, branches: list });
  };

  const removeBranch = (idx: number) => {
    const list = [...value.branches];
    list.splice(idx, 1);
    onChange({ ...value, branches: list });
  };

  const addBranch = () => {
    onChange({ ...value, branches: [...value.branches, newBranch()] });
  };

  const updateAction = (bIdx: number, aIdx: number, patch: Partial<ConditionAction>) => {
    const list = [...value.branches];
    const acts = [...(list[bIdx].actions || [])];
    acts[aIdx] = { ...acts[aIdx], ...patch } as ConditionAction;
    list[bIdx] = { ...list[bIdx], actions: acts };
    onChange({ ...value, branches: list });
  };

  const addAction = (bIdx: number) => {
    const list = [...value.branches];
    list[bIdx] = { ...list[bIdx], actions: [...(list[bIdx].actions || []), newAction()] };
    onChange({ ...value, branches: list });
  };

  const removeAction = (bIdx: number, aIdx: number) => {
    const list = [...value.branches];
    const acts = [...(list[bIdx].actions || [])];
    acts.splice(aIdx, 1);
    list[bIdx] = { ...list[bIdx], actions: acts };
    onChange({ ...value, branches: list });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Title level={5}>Branches</Title>
      {(value.branches || []).map((br, idx) => (
        <Card size="small" key={br.id} title={`ALORS #${idx + 1}`}
          extra={<Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeBranch(idx)} />}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Input size="small" placeholder="Libellé" value={br.label || ''} onChange={(e) => updateBranch(idx, { label: e.target.value })} />
            <ExpressionBuilder
              tokens={tokens}
              value={br.when as Expr}
              onChange={(expr) => updateBranch(idx, { when: expr })}
            />
            <Space direction="vertical" style={{ width: '100%' }}>
              {(br.actions || []).map((a, aIdx) => (
                <Space key={a.id} wrap>
                  <Select
                    size="small"
                    style={{ minWidth: 160 }}
                    value={a.type}
                    onChange={(v) => updateAction(idx, aIdx, { type: v as ConditionAction['type'] })}
                    options={[
                      { value: 'SHOW', label: 'Afficher nœuds' },
                      { value: 'HIDE', label: 'Masquer nœuds' },
                      { value: 'GOTO_NODE', label: 'Aller au nœud' },
                      { value: 'GOTO_TREE', label: 'Aller à l\'arbre' },
                      { value: 'SET_VAR', label: 'Définir variable' },
                      { value: 'EVAL_FORMULA', label: 'Évaluer formule' },
                      { value: 'APPEND_SECTION', label: 'Ajouter section' }
                    ]}
                  />
                  {/* Inputs simples pour démo; à remplacer par pickers dédiés */}
                  <Input size="small" placeholder="nodeIds (csv)" value={(a.nodeIds || []).join(',')} onChange={(e) => updateAction(idx, aIdx, { nodeIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  <Input size="small" placeholder="targetId" value={a.targetId || ''} onChange={(e) => updateAction(idx, aIdx, { targetId: e.target.value })} />
                  <Input size="small" placeholder="var clé" value={a.variableKey || ''} onChange={(e) => updateAction(idx, aIdx, { variableKey: e.target.value })} />
                  <Input size="small" placeholder="valeur" value={typeof a.value === 'undefined' ? '' : String(a.value)} onChange={(e) => updateAction(idx, aIdx, { value: e.target.value })} />
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeAction(idx, aIdx)} />
                </Space>
              ))}
              <Button size="small" icon={<PlusOutlined />} onClick={() => addAction(idx)}>Ajouter une action</Button>
            </Space>
          </Space>
        </Card>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addBranch}>Ajouter une branche</Button>
    </Space>
  );
};

export default BranchesEditor;
