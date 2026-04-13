/**
 * 📊 Éditeur de section Statistiques
 * Compteurs de réalisations (500 maisons, 15 MW, 4.9★, 5 régions)
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, ColorPicker, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { AIAssistant } from '../AIAssistant';
import { GridLayoutEditor } from '../GridLayoutEditor';
import { SectionHeaderEditor } from '../SectionHeaderEditor';

interface StatsEditorProps {
  section: unknown;
  onSave: (content: unknown) => void;
  onCancel: () => void;
}

export const StatsEditor: React.FC<StatsEditorProps> = ({ section, onSave, onCancel }) => {
  const [form] = Form.useForm();
      const [gridLayout, setGridLayout] = useState<any>(null);
  const [sectionHeader, setSectionHeader] = useState<any>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiCurrentValue, setAICurrentValue] = useState('');
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    if (section) {
      form.setFieldsValue({
        name: section.name,
        backgroundColor: section.backgroundColor || '#f9fafb',
        textColor: section.textColor || '#000000',
        ...section.content
      });
      setStats(section.content?.stats || []);
    } else {
      // Valeurs par défaut
      form.setFieldsValue({
        title: 'Nos réalisations en chiffres',
        subtitle: 'Plus de 10 ans d\'expérience à votre service'
      });
      setStats([
        { icon: '🏠', value: '500+', label: 'Maisons équipées', suffix: '' },
        { icon: '⚡', value: '15', label: 'Mégawatts installés', suffix: 'MW' },
        { icon: '⭐', value: '4.9', label: 'Note moyenne', suffix: '/5' },
        { icon: '📍', value: '5', label: 'Régions couvertes', suffix: '' }
      ]);
    }
  }, [section]);

  const handleAddStat = () => {
    setStats([...stats, { icon: '📊', value: '', label: '', suffix: '' }]);
  };

  const handleRemoveStat = (index: number) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const handleStatChange = (index: number, field: string, value: unknown) => {
    const newStats = [...stats];
    newStats[index][field] = value;
    setStats(newStats);
  };

  const handleSubmit = (values: unknown) => {
    onSave({
      name: values.name,
      content: {
        title: values.title,
        subtitle: values.subtitle,
        stats,
        animateCounters: values.animateCounters
      },
      backgroundColor: values.backgroundColor,
      textColor: values.textColor
    ,
      gridLayout,
      sectionHeader
    });
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item label="Nom de la section" name="name" rules={[{ required: true }]}>
        <Input placeholder="Ex: Statistiques" />
      </Form.Item>

      <Form.Item label="Titre (optionnel)" name="title">
        <Input placeholder="Nos réalisations en chiffres"
          suffix={
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setAIContext('title');
                setAICurrentValue(form.getFieldValue('title') || '');
                setShowAI(true);
              }}
            />
          }
         />
      </Form.Item>

      <Form.Item label="Sous-titre (optionnel)" name="subtitle">
        <Input placeholder="Plus de 10 ans d'expérience"
          suffix={
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setAIContext('subtitle');
                setAICurrentValue(form.getFieldValue('subtitle') || '');
                setShowAI(true);
              }}
            />
          }
         />
      </Form.Item>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Statistiques (4 max recommandé)
        </label>
        {stats.map((stat, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 12 }} align="baseline">
            <Input
              placeholder="Icône"
              value={stat.icon}
              onChange={(e) => handleStatChange(index, 'icon', e.target.value)}
              style={{ width: 60 }}
            />
            <Input
              placeholder="Valeur"
              value={stat.value}
              onChange={(e) => handleStatChange(index, 'value', e.target.value)}
              style={{ width: 100 }}
            />
            <Input
              placeholder="Suffixe"
              value={stat.suffix}
              onChange={(e) => handleStatChange(index, 'suffix', e.target.value)}
              style={{ width: 60 }}
            />
            <Input
              placeholder="Label"
              value={stat.label}
              onChange={(e) => handleStatChange(index, 'label', e.target.value)}
              style={{ width: 180 }}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveStat(index)}
            />
          </Space>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddStat}>
          Ajouter une statistique
        </Button>
      </div>

      <Form.Item label="Couleur de fond" name="backgroundColor">
        <ColorPicker format="hex" showText />
      </Form.Item>

      <Form.Item label="Couleur du texte" name="textColor">
        <ColorPicker format="hex" showText />
      </Form.Item>

      
      {/* LAYOUT GRID */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>⚙️ Configuration du Layout</h4>
        <GridLayoutEditor
          config={gridLayout}
          onChange={setGridLayout}
        />
      </div>

      {/* HEADER DE SECTION */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>📋 En-tête de Section</h4>
        <SectionHeaderEditor
          config={sectionHeader}
          onChange={setSectionHeader}
        />
      </div>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            Sauvegarder
          </Button>
          <Button onClick={onCancel}>
            Annuler
          </Button>
        </Space>
      </Form.Item>
    

      {/* ASSISTANT IA */}
      {showAI && (
        <AIAssistant
          visible={showAI}
          onClose={() => setShowAI(false)}
          context={aiContext}
          sectionType="stats"
          currentValue={aiCurrentValue}
          onApply={(value) => {
            form.setFieldsValue({ [aiContext]: value });
            setShowAI(false);
          }}
        />
      )}
    </Form>
  );
};
