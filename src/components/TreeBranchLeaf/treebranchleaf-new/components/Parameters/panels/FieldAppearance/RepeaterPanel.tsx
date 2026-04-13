import React from 'react';
import { Card, Form, InputNumber, Input, Select, Typography } from 'antd';
import TextPanel from './TextPanel';
import { logger } from '../../../../../../../lib/logger';

const { Title, Text } = Typography;

interface RepeaterPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const RepeaterPanel: React.FC<RepeaterPanelProps> = ({ value = {}, onChange, readOnly }) => {
  const [form] = Form.useForm();
  
  // 🔄 Synchroniser le formulaire avec les valeurs externes
  React.useEffect(() => {
    form.setFieldsValue({
      minItems: 0,
      maxItems: 10,
      addButtonLabel: '',
      buttonSize: 'middle',
      buttonWidth: 'auto',
      iconOnly: false,
      columnsPerRow: 2,
      ...value
    });
  }, [value, form]);

  return (
    <div>
      {/* ✅ RÉUTILISER LE PANNEAU TEXT EXISTANT pour toutes les options de base */}
      <TextPanel value={value} onChange={onChange} readOnly={readOnly} />
      
      {/* 🔵 AJOUTER LES OPTIONS SPÉCIFIQUES AU REPEATER */}
      <Card size="small" variant="outlined" style={{ marginTop: 12 }}>
        <Title level={5}>🔢 Options du bloc répétable</Title>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
          💡 Par défaut, le bouton affichera "Ajouter [Nom du champ]" (ex: "Ajouter Versant")
        </Text>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            logger.debug('🔁 [RepeaterPanel] Changement détecté:', changedValues, 'Toutes valeurs:', allValues);
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

          <Form.Item name="addButtonLabel" label="Texte du bouton d'ajout (optionnel)" style={{ gridColumn: '1 / -1' }}>
            <Input placeholder='Laissez vide pour utiliser "Ajouter [Nom du champ]"' />
          </Form.Item>

          <Form.Item name="buttonSize" label="Taille du bouton">
            <Select options={[
              { value: 'tiny', label: 'Très petit (icône)' },
              { value: 'small', label: 'Petit' },
              { value: 'middle', label: 'Moyen' },
              { value: 'large', label: 'Grand' }
            ]} placeholder="Moyen" />
          </Form.Item>

          <Form.Item name="iconOnly" label="Affichage" valuePropName="checked">
            <Select options={[
              { value: false, label: 'Texte + icône' },
              { value: true, label: 'Icône seule (+)' }
            ]} placeholder="Texte + icône" />
          </Form.Item>

          <Form.Item name="buttonWidth" label="Largeur du bouton">
            <Select options={[
              { value: 'auto', label: 'Automatique (responsive)' },
              { value: 'half', label: 'Moitié de la largeur' },
              { value: 'full', label: 'Pleine largeur' }
            ]} placeholder="Automatique" />
          </Form.Item>

          <Form.Item name="columnsPerRow" label="Colonnes par ligne" style={{ gridColumn: '1 / -1' }}>
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
