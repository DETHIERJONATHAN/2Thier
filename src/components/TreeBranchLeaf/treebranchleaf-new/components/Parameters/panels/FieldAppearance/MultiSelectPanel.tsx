import React from 'react';
import { Card, Form, InputNumber, Select, Switch, Typography, Tooltip } from 'antd';

const { Title } = Typography;

interface MultiSelectPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const MultiSelectPanel: React.FC<MultiSelectPanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Sélection multiple</Title>
      <Form
        layout="vertical"
        initialValues={value}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}
      >
        <Form.Item name="variant" label={<Tooltip title="Type d'affichage du champ multi-sélection">Variante</Tooltip>}>
          <Select options={[
            { value: 'checkboxes', label: 'Cases à cocher' },
            { value: 'tags', label: 'Étiquettes' },
            { value: 'dual-list', label: 'Double liste' }
          ]} />
        </Form.Item>
        <Form.Item name="maxSelections" label={<Tooltip title="Nombre maximum de sélections autorisées">Max sélections</Tooltip>}>
          <InputNumber style={{ width: '100%' }} min={1} />
        </Form.Item>
        <Form.Item name="searchable" label={<Tooltip title="Permet la recherche parmi les options">Recherchable</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="allowCustom" label={<Tooltip title="Autorise l'ajout d'options personnalisées">Valeur libre</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MultiSelectPanel;
