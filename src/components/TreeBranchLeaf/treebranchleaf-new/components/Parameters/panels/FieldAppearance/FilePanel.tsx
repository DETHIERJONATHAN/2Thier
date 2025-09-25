import React from 'react';
import { Card, Form, Input, InputNumber, Switch, Typography, Tooltip } from 'antd';

const { Title } = Typography;

interface FilePanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const FilePanel: React.FC<FilePanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Fichier</Title>
      <Form
        layout="vertical"
        initialValues={value}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
      >
  <Form.Item name="accept" label={<Tooltip title="Extensions autorisées (ex: .pdf,.docx)">Formats acceptés</Tooltip>}>
          <Input placeholder=".pdf,.docx,.xlsx" />
        </Form.Item>
  <Form.Item name="maxSize" label={<Tooltip title="Taille maximale du fichier en mégaoctets">Taille max (Mo)</Tooltip>}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
  <Form.Item name="multiple" label={<Tooltip title="Autoriser l'envoi de plusieurs fichiers">Multiple</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default FilePanel;
