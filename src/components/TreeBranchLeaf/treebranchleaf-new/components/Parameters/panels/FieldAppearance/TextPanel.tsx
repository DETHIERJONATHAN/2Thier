import React, { useCallback, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Typography, Tooltip } from 'antd';
import { useDebouncedCallback } from '../../../../hooks/useDebouncedCallback';

const { Title, Text } = Typography;

interface TextPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const TextPanel: React.FC<TextPanelProps> = ({ value = {}, onChange, readOnly }) => {
  // État local pour l'édition en temps réel
  const [localValues, setLocalValues] = useState({
    size: 'md',
    variant: 'singleline',
    placeholder: '',
    maxLength: 255,
    mask: '',
    regex: '',
    ...value
  });

  // Synchroniser avec la valeur externe
  useEffect(() => {
    setLocalValues({
      size: 'md',
      variant: 'singleline',
      placeholder: '',
      maxLength: 255,
      mask: '',
      regex: '',
      ...value
    });
  }, [value]);

  // Sauvegarde debounced pour éviter les appels trop fréquents
  const debouncedSave = useDebouncedCallback((vals: Record<string, unknown>) => {
    console.log('🔄 [TextPanel] Sauvegarde debounced:', vals);
    onChange?.(vals);
  }, 500); // 500ms de délai comme pour les autres paramètres

  // Gestionnaire de changement avec mise à jour locale immédiate
  const handleValuesChange = useCallback((changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => {
    console.log('📝 [TextPanel] Changement:', { changedValues, allValues });
    
    // Mise à jour immédiate de l'état local pour l'UI
    setLocalValues(allValues);
    
    // Sauvegarde debounced
    debouncedSave(allValues);
  }, [debouncedSave]);

  return (
    <Card size="small" bordered>
      <Title level={5}>Aspect — Texte</Title>
      <Form
        layout="vertical"
        initialValues={localValues}
        values={localValues} // Utiliser values au lieu d'initialValues pour la mise à jour dynamique
        onValuesChange={handleValuesChange}
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
        
        <Form.Item name="variant" label={<Tooltip title="Type d'affichage du texte">Variante</Tooltip>}>
          <Select options={[
            { value: 'singleline', label: 'Ligne simple' },
            { value: 'textarea', label: 'Zone de texte' }
          ]} />
        </Form.Item>
        
        <Form.Item name="placeholder" label={<Tooltip title="Texte d'aide affiché quand le champ est vide">Placeholder</Tooltip>}>
          <Input allowClear />
        </Form.Item>
        
        <Form.Item name="maxLength" label={<Tooltip title="Nombre maximum de caractères autorisés">Longueur max</Tooltip>}>
          <Input type="number" />
        </Form.Item>
        
        <Form.Item name="mask" label={<Tooltip title="Masque de saisie (ex: 99/99/9999 pour une date)">Masque</Tooltip>}>
          <Input placeholder="99/99/9999" />
        </Form.Item>
        
        <Form.Item name="regex" label={<Tooltip title="Expression régulière de validation">Regex</Tooltip>}>
          <Input placeholder="^[A-Za-z]+$" />
        </Form.Item>
        
        <Form.Item name="preview" label="Preview" style={{ gridColumn: '1 / -1' }}>
          <Input 
            placeholder={localValues.placeholder as string || "Prévisualisation"}
            maxLength={localValues.maxLength as number || undefined}
            disabled 
            style={{ 
              width: localValues.size === 'sm' ? '200px' : localValues.size === 'lg' ? '400px' : '300px'
            }}
          />
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 11 }}>
        Les paramètres sont automatiquement appliqués dans TBL.
      </Text>
    </Card>
  );
};

export default TextPanel;
