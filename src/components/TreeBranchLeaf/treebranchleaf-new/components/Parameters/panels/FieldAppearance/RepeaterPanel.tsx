import React from 'react';
import { Card, Form, InputNumber, Input, Select, Typography } from 'antd';
import TextPanel from './TextPanel';

const { Title, Text } = Typography;

interface RepeaterPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const RepeaterPanel: React.FC<RepeaterPanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <div>
      {/* ✅ RÉUTILISER LE PANNEAU TEXT EXISTANT pour toutes les options de base */}
      <TextPanel value={value} onChange={onChange} readOnly={readOnly} />
      
      {/* 🔵 AJOUTER LES OPTIONS SPÉCIFIQUES AU REPEATER */}
      <Card size="small" variant="outlined" style={{ marginTop: 12 }}>
        <Title level={5}>🔢 Options du bloc répétable</Title>
        <Form
          layout="vertical"
          initialValues={{
            minItems: 0,
            maxItems: 10,
            addButtonLabel: 'Ajouter un élément',
            columnsPerRow: 2,
            ...value
          }}
          onValuesChange={(_, allValues) => {
            // Fusionner avec les valeurs existantes
            onChange?.({ ...value, ...allValues });
          }}
          disabled={readOnly}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}
        >
          <Form.Item name="minItems" label="Nombre minimum d'entrées">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>

          <Form.Item name="maxItems" label="Nombre maximum d'entrées">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Illimité" />
          </Form.Item>

          <Form.Item name="addButtonLabel" label="Texte du bouton d'ajout" style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="Ajouter un élément" />
          </Form.Item>

          <Form.Item name="columnsPerRow" label="Colonnes par ligne">
            <Select options={[
              { value: 1, label: '1 colonne (pleine largeur)' },
              { value: 2, label: '2 colonnes (côte à côte)' },
              { value: 3, label: '3 colonnes' },
              { value: 4, label: '4 colonnes' }
            ]} />
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Configuration spécifique à la répétition des champs.
        </Text>
      </Card>
    </div>
  );
};

export default RepeaterPanel;
