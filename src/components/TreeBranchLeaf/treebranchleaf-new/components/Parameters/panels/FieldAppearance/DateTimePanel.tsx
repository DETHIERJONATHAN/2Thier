import React from 'react';
import { Card, Form, Input, Typography, Tooltip } from 'antd';

const { Title } = Typography;

interface DateTimePanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const DateTimePanel: React.FC<DateTimePanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Date/Heure</Title>
  <Form
        layout="vertical"
        initialValues={value}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
      >
  <Form.Item name="format" label={<Tooltip title="Format d'affichage/saisie (ex: YYYY-MM-DD)">Format</Tooltip>}>
          <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
  <Form.Item name="locale" label={<Tooltip title="Paramètre régional (ex: fr-BE)">Locale</Tooltip>}>
          <Input placeholder="fr-BE" />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DateTimePanel;
