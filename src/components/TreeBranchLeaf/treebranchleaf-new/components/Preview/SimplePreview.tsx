import React, { useMemo } from 'react';
import { Card, Form, Input, InputNumber, DatePicker, Checkbox, Typography, Button, Space } from 'antd';
import type { TreeBranchLeafNode } from '../../types';

type Props = {
  nodes: TreeBranchLeafNode[];
  readOnly?: boolean;
};

const { Title, Text } = Typography;

function fieldForLeaf(node: TreeBranchLeafNode, readOnly?: boolean) {
  const label = node.label || 'Champ';
  const key = node.id;
  const type = (node.subType || 'TEXT').toUpperCase();

  switch (type) {
    case 'NUMBER':
      return (
        <Form.Item name={key} label={label} key={key}>
          <InputNumber style={{ width: '100%' }} disabled={readOnly} />
        </Form.Item>
      );
    case 'EMAIL':
      return (
        <Form.Item name={key} label={label} key={key}>
          <Input type="email" disabled={readOnly} />
        </Form.Item>
      );
    case 'TEL':
      return (
        <Form.Item name={key} label={label} key={key}>
          <Input disabled={readOnly} />
        </Form.Item>
      );
    case 'DATE':
      return (
        <Form.Item name={key} label={label} key={key}>
          <DatePicker style={{ width: '100%' }} disabled={readOnly} />
        </Form.Item>
      );
    default:
      return (
        <Form.Item name={key} label={label} key={key}>
          <Input disabled={readOnly} />
        </Form.Item>
      );
  }
}

function renderNode(node: TreeBranchLeafNode, depth: number, readOnly?: boolean): React.ReactNode {
  if (node.type === 'branch') {
    return (
      <div key={node.id} style={{ marginLeft: depth * 12 }}>
        <Title level={5} style={{ marginTop: depth === 0 ? 0 : 12 }}>{node.label}</Title>
        <div>
          {(node.children || []).map(child => renderNode(child, depth + 1, readOnly))}
        </div>
      </div>
    );
  }

  if (node.type === 'leaf_option_field') {
    // Option + Champ: case à cocher + champ
    return (
      <div key={node.id} style={{ marginLeft: depth * 12 }}>
        <Checkbox disabled={readOnly} style={{ marginBottom: 4 }}>{node.label}</Checkbox>
        <div style={{ marginLeft: 20 }}>
          {fieldForLeaf(node, readOnly)}
        </div>
      </div>
    );
  }

  if (node.type === 'leaf_option') {
    return (
      <div key={node.id} style={{ marginLeft: depth * 12 }}>
        <Checkbox disabled={readOnly}>{node.label}</Checkbox>
        {(node.children || []).map(child => renderNode(child, depth + 1, readOnly))}
      </div>
    );
  }

  // leaf_field par défaut
  return (
    <div key={node.id} style={{ marginLeft: depth * 12 }}>
      {fieldForLeaf(node, readOnly)}
      {(node.children || []).map(child => renderNode(child, depth + 1, readOnly))}
    </div>
  );
}

const SimplePreview: React.FC<Props> = ({ nodes, readOnly }) => {
  const ordered = useMemo(() => {
    const sortRec = (items: TreeBranchLeafNode[]): TreeBranchLeafNode[] =>
      [...items]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(n => ({ ...n, children: n.children ? sortRec(n.children) : [] }));
    return sortRec(nodes || []);
  }, [nodes]);

  const onFinish = () => {
    // Aperçu simple de soumission
  };

  return (
    <Card size="small" style={{ height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Text type="secondary">Aperçu simple du formulaire (lecture seule des capacités)</Text>
        <Form layout="vertical" onFinish={onFinish} disabled={readOnly}>
          {ordered.map(node => renderNode(node, 0, readOnly))}
          {!readOnly && (
            <Form.Item>
              <Button type="primary" htmlType="submit">Tester la soumission</Button>
            </Form.Item>
          )}
        </Form>
      </Space>
    </Card>
  );
};

export default SimplePreview;
