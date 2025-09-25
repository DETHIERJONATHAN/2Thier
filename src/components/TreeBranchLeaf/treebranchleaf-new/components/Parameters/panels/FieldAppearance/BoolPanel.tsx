import React from 'react';
import { Card, Form, Input, Select, Switch, Typography, Tooltip, Checkbox, Button } from 'antd';

const { Title, Text } = Typography;

interface BoolPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const BoolPanel: React.FC<BoolPanelProps> = ({ value = {}, onChange, readOnly }) => {
  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Booléen</Title>
      <Form
        layout="vertical"
        initialValues={{
          size: 'md',
          variant: 'checkbox',
          defaultValue: false,
          trueLabel: 'Oui',
          falseLabel: 'Non',
          ...value
        }}
        onValuesChange={(_, all) => onChange?.(all)}
        disabled={readOnly}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}
      >
        <Form.Item name="size" label={<Tooltip title="Taille visuelle du champ">Taille</Tooltip>}>
          <Select options={[
            { value: 'sm', label: 'Petite' },
            { value: 'md', label: 'Moyenne' },
            { value: 'lg', label: 'Grande' }
          ]} />
        </Form.Item>
        
        <Form.Item name="variant" label={<Tooltip title="Type d'affichage du champ booléen">Variante</Tooltip>}>
          <Select options={[
            { value: 'checkbox', label: 'Case à cocher' },
            { value: 'switch', label: 'Interrupteur' },
            { value: 'segmented', label: 'Boutons segments' }
          ]} />
        </Form.Item>
        
        <Form.Item name="defaultValue" label={<Tooltip title="Valeur par défaut (true/false)">Défaut</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
        
        <Form.Item name="required" label={<Tooltip title="Champ obligatoire">Requis</Tooltip>} valuePropName="checked">
          <Switch />
        </Form.Item>
        
        <Form.Item name="trueLabel" label={<Tooltip title="Texte affiché pour la valeur vraie">Label Vrai</Tooltip>}>
          <Input placeholder="Oui" />
        </Form.Item>
        
        <Form.Item name="falseLabel" label={<Tooltip title="Texte affiché pour la valeur fausse">Label Faux</Tooltip>}>
          <Input placeholder="Non" />
        </Form.Item>
        
        <Form.Item name="preview" label="Preview" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {value.variant === 'checkbox' && (
              <Checkbox disabled defaultChecked={value.defaultValue as boolean}>
                {value.defaultValue ? value.trueLabel : value.falseLabel}
              </Checkbox>
            )}
            {value.variant === 'switch' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{value.falseLabel}</span>
                <Switch 
                  disabled 
                  defaultChecked={value.defaultValue as boolean}
                  size={value.size as 'small' | 'default' | undefined}
                />
                <span>{value.trueLabel}</span>
              </div>
            )}
            {value.variant === 'segmented' && (
              <div style={{ display: 'flex', gap: 4 }}>
                <Button 
                  size={value.size === 'sm' ? 'small' : value.size === 'lg' ? 'large' : 'middle'}
                  type={value.defaultValue ? 'default' : 'primary'}
                  disabled
                >
                  {value.falseLabel}
                </Button>
                <Button 
                  size={value.size === 'sm' ? 'small' : value.size === 'lg' ? 'large' : 'middle'}
                  type={value.defaultValue ? 'primary' : 'default'}
                  disabled
                >
                  {value.trueLabel}
                </Button>
              </div>
            )}
          </div>
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 11 }}>
        Les paramètres sont automatiquement appliqués dans TBL.
      </Text>
    </Card>
  );
};

export default BoolPanel;
