/**
 * 🎯 Éditeur de Hero Section
 * Grande bannière avec titre, sous-titre, image de fond, boutons
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, Upload, ColorPicker, message, Radio } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { AIAssistant } from '../AIAssistant';
import { GridLayoutEditor } from '../GridLayoutEditor';
import { SectionHeaderEditor } from '../SectionHeaderEditor';

const { TextArea } = Input;

interface HeroEditorProps {
  section: any;
  onSave: (content: any) => void;
  onCancel: () => void;
}

export const HeroEditor: React.FC<HeroEditorProps> = ({ section, onSave, onCancel }) => {
  const [form] = Form.useForm();
    const [gridLayout, setGridLayout] = useState<any>(null);
  const [sectionHeader, setSectionHeader] = useState<any>(null);
  const [backgroundFile, setBackgroundFile] = useState<UploadFile[]>([]);
  const [buttons, setButtons] = useState<any[]>([]);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiCurrentValue, setAICurrentValue] = useState('');

  useEffect(() => {
    if (section) {
      form.setFieldsValue({
        name: section.name,
        backgroundColor: section.backgroundColor || '#1e3a8a',
        textColor: section.textColor || '#ffffff',
        ...section.content
      });
      setButtons(section.content?.buttons || []);
      if (section.content?.backgroundImage) {
        setBackgroundFile([{
          uid: '-1',
          name: 'background.jpg',
          status: 'done',
          url: section.content.backgroundImage
        }]);
      }
    } else {
      // Valeurs par défaut
      form.setFieldsValue({
        title: 'Votre partenaire en transition énergétique',
        subtitle: 'Solutions photovoltaïques sur mesure pour particuliers et professionnels',
        alignment: 'center'
      });
      setButtons([
        { label: 'Demander un devis', url: '/contact', style: 'primary' },
        { label: 'En savoir plus', url: '#services', style: 'secondary' }
      ]);
    }
  }, [section]);

  const handleAddButton = () => {
    setButtons([...buttons, { label: '', url: '', style: 'primary' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: string, value: string) => {
    const newButtons = [...buttons];
    newButtons[index][field] = value;
    setButtons(newButtons);
  };

  const handleSubmit = (values: any) => {
    onSave({
      name: values.name,
      content: {
        title: values.title,
        subtitle: values.subtitle,
        backgroundImage: backgroundFile[0]?.url || backgroundFile[0]?.response?.url || '',
        backgroundOverlay: values.backgroundOverlay,
        alignment: values.alignment,
        buttons,
        badge: values.badge
      },
      backgroundColor: values.backgroundColor,
      textColor: values.textColor
    ,
      gridLayout,
      sectionHeader
    });
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Vous ne pouvez uploader que des images !');
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('L\'image doit faire moins de 5MB !');
      }
      return isImage && isLt5M;
    },
    onChange: (info: any) => {
      setBackgroundFile(info.fileList);
    },
    maxCount: 1
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item label="Nom de la section" name="name" rules={[{ required: true }]}>
        <Input placeholder="Ex: Hero principal" />
      </Form.Item>

      <Form.Item label="Image de fond" help="Uploadez une image de fond (max 5MB)">
        <Upload
          {...uploadProps}
          fileList={backgroundFile}
          listType="picture-card"
          action="/api/upload"
        >
          {backgroundFile.length === 0 && <div><UploadOutlined /> Upload</div>}
        </Upload>
      </Form.Item>

      <Form.Item label="Titre principal" name="title" rules={[{ required: true }]}>
        <Input 
          placeholder="Votre partenaire en transition énergétique"
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

      <Form.Item label="Sous-titre" name="subtitle">
        <TextArea 
          rows={2} 
          placeholder="Solutions photovoltaïques sur mesure..."
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

      <Form.Item label="Badge (optionnel)" name="badge">
        <Input placeholder="🎯 N°1 en Belgique" />
      </Form.Item>

      <Form.Item label="Alignement du texte" name="alignment">
        <Radio.Group>
          <Radio.Button value="left">Gauche</Radio.Button>
          <Radio.Button value="center">Centre</Radio.Button>
          <Radio.Button value="right">Droite</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="Opacité de l'overlay (assombrir le fond)" name="backgroundOverlay">
        <Input type="number" min={0} max={1} step={0.1} placeholder="0.5" />
      </Form.Item>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Boutons d'action
        </label>
        {buttons.map((button, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
            <Input
              placeholder="Label"
              value={button.label}
              onChange={(e) => handleButtonChange(index, 'label', e.target.value)}
              style={{ width: 150 }}
            />
            <Input
              placeholder="URL"
              value={button.url}
              onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
              style={{ width: 150 }}
            />
            <Radio.Group
              value={button.style}
              onChange={(e) => handleButtonChange(index, 'style', e.target.value)}
            >
              <Radio.Button value="primary">Principal</Radio.Button>
              <Radio.Button value="secondary">Secondaire</Radio.Button>
            </Radio.Group>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveButton(index)}
            />
          </Space>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddButton}>
          Ajouter un bouton
        </Button>
      </div>

      <Form.Item label="Couleur de fond (si pas d'image)" name="backgroundColor">
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
          sectionType="hero"
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
