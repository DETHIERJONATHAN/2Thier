import React from 'react';
import { Card, Form, InputNumber, Input, Select, Typography, Tooltip } from 'antd';

const { Title, Text } = Typography;

interface NumberPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const NumberPanel: React.FC<NumberPanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Nombre</Title>
      <Form
        layout="vertical"
        initialValues={{
          size: 'md',
          variant: 'input',
          min: null,
          max: null,
          step: 1,
          decimals: 0,
          prefix: '',
          suffix: '',
          ...value
        }}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}
      >
        <Form.Item name="size" label={<Tooltip title="Taille visuelle du champ">Taille</Tooltip>}>
          <Select options={[
            { value: 'sm', label: 'Petite (200px)' },
            { value: 'md', label: 'Moyenne (300px)' },
            { value: 'lg', label: 'Grande (400px)' }
          ]} />
        </Form.Item>
        
        <Form.Item name="variant" label={<Tooltip title="Type d'affichage du nombre">Variante</Tooltip>}>
          <Select options={[
            { value: 'input', label: 'Saisie libre' },
            { value: 'stepper', label: 'Compteur +/-' },
            { value: 'slider', label: 'Curseur' }
          ]} />
        </Form.Item>
        
        <Form.Item name="min" label={<Tooltip title="Valeur minimale autorisée">Min</Tooltip>}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item name="max" label={<Tooltip title="Valeur maximale autorisée">Max</Tooltip>}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item name="step" label={<Tooltip title="Incrément entre deux valeurs">Pas</Tooltip>}>
          <InputNumber style={{ width: '100%' }} min={0.01} />
        </Form.Item>
        
        <Form.Item name="decimals" label={<Tooltip title="Nombre de chiffres après la virgule">Décimales</Tooltip>}>
          <InputNumber style={{ width: '100%' }} min={0} max={10} />
        </Form.Item>
        
        <Form.Item name="prefix" label={<Tooltip title="Texte affiché avant la valeur (ex: €, $)">Préfixe</Tooltip>}>
          <Input placeholder="€" />
        </Form.Item>
        
        <Form.Item name="suffix" label={<Tooltip title="Texte affiché après la valeur (ex: %, km)">Suffixe</Tooltip>}>
          <Input placeholder="%" />
        </Form.Item>
        
        <Form.Item name="preview" label="Preview" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{value.prefix}</span>
            <InputNumber 
              disabled 
              placeholder="123"
              precision={value.decimals as number || 0}
              min={value.min as number || undefined}
              max={value.max as number || undefined}
              step={value.step as number || 1}
              style={{ 
                width: value.size === 'sm' ? '200px' : value.size === 'lg' ? '400px' : '300px'
              }}
            />
            <span>{value.suffix}</span>
          </div>
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 11 }}>
        Les paramètres sont automatiquement appliqués dans TBL.
      </Text>
    </Card>
  );
};

export default NumberPanel;
