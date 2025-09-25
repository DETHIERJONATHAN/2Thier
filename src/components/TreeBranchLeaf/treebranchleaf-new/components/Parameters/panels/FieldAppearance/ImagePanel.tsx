import React from 'react';
import { Card, Form, InputNumber, Select, Switch, Typography, Tooltip } from 'antd';

const { Title, Text } = Typography;

interface ImagePanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const ImagePanel: React.FC<ImagePanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Image</Title>
      <Form
        layout="vertical"
        initialValues={value}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
      >
  <Form.Item name="formats" label={<Tooltip title="Formats d'image autorisés">Formats</Tooltip>}>
          <Select mode="tags" placeholder="jpeg,png,webp,avif" />
        </Form.Item>
  <Form.Item name="maxSize" label={<Tooltip title="Taille maximale du fichier en mégaoctets">Taille max (Mo)</Tooltip>}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
  <Form.Item name="ratio" label={<Tooltip title="Contraindre le ratio d'image">Ratio</Tooltip>}>
          <Select options={[
            { value: '1:1', label: '1:1' },
            { value: '4:3', label: '4:3' },
            { value: '16:9', label: '16:9' }
          ]} />
        </Form.Item>
  <Form.Item name="crop" label={<Tooltip title="Activer l'outil de recadrage">Activer le crop</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
  <Form.Item name="thumbnails" label={<Tooltip title="Tailles de miniatures à générer">Thumbnails</Tooltip>}>
          <Select mode="tags" placeholder="96x96, 320x180, 640x360" />
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 11 }}>Sources (caméra/URL/bibliothèque) et transformations avancées à intégrer ensuite.</Text>
    </Card>
  );
};

export default ImagePanel;
