import React from 'react';
import { Card, Form, Switch, Typography, Tooltip } from 'antd';

const { Title } = Typography;

interface SelectPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const SelectPanel: React.FC<SelectPanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Sélection</Title>
  <Form
        layout="vertical"
        initialValues={value}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
      >
  <Form.Item name="searchable" label={<Tooltip title="Permet la recherche parmi les options">Recherchable</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
  <Form.Item name="allowCustom" label={<Tooltip title="Autorise l'utilisateur à saisir une option personnalisée">Valeur libre</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SelectPanel;
