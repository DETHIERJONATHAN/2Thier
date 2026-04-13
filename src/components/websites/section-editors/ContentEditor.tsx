/**
 * 📝 Éditeur de contenu libre
 * Section flexible avec texte, images, colonnes
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, Upload, ColorPicker, Radio, Select, message } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { AIAssistant } from '../AIAssistant';
import { GridLayoutEditor } from '../GridLayoutEditor';
import { SectionHeaderEditor } from '../SectionHeaderEditor';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;
const { Option } = Select;

interface ContentEditorProps {
  section: unknown;
  onSave: (content: unknown) => void;
  onCancel: () => void;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({ section, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
      const [gridLayout, setGridLayout] = useState<any>(null);
  const [sectionHeader, setSectionHeader] = useState<any>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiCurrentValue, setAICurrentValue] = useState('');
  const [imageFiles, setImageFiles] = useState<UploadFile[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    if (section) {
      form.setFieldsValue({
        name: section.name,
        backgroundColor: section.backgroundColor || '#ffffff',
        textColor: section.textColor || '#000000',
        ...section.content
      });
      setColumns(section.content?.columns || []);
      if (section.content?.images) {
        setImageFiles(section.content.images.map((url: string, i: number) => ({
          uid: `-${i}`,
          name: `image-${i}.jpg`,
          status: 'done',
          url
        })));
      }
    } else {
      // Valeurs par défaut
      form.setFieldsValue({
        title: 'Pourquoi choisir 2Thier ?',
        layout: '2-columns'
      });
      setColumns([
        {
          icon: '✓',
          title: 'Expertise reconnue',
          description: 'Plus de 10 ans d\'expérience dans le photovoltaïque'
        },
        {
          icon: '✓',
          title: 'Service complet',
          description: 'De l\'étude à la maintenance, nous vous accompagnons'
        }
      ]);
    }
  }, [section]);

  const handleAddColumn = () => {
    setColumns([...columns, { icon: '✓', title: '', description: '' }]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, field: string, value: string) => {
    const newColumns = [...columns];
    newColumns[index][field] = value;
    setColumns(newColumns);
  };

  const handleSubmit = (values: unknown) => {
    onSave({
      name: values.name,
      content: {
        title: values.title,
        subtitle: values.subtitle,
        description: values.description,
        layout: values.layout,
        columns,
        images: imageFiles.map(f => f.url || f.response?.url).filter(Boolean),
        alignment: values.alignment
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
    onChange: (info: unknown) => {
      setImageFiles(info.fileList);
    },
    multiple: true
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item label="Nom de la section" name="name" rules={[{ required: true }]}>
        <Input placeholder="Ex: Section À propos" />
      </Form.Item>

      <Form.Item label={t('fields.title')} name="title">
        <Input placeholder="Pourquoi choisir 2Thier ?"
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
        <Input placeholder="Nos engagements qualité"
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

      <Form.Item label={t('fields.description')} name="description">
        <TextArea rows={4} placeholder="Texte principal de la section..."
          suffix={
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setAIContext('description');
                setAICurrentValue(form.getFieldValue('description') || '');
                setShowAI(true);
              }}
            />
          }
         />
      </Form.Item>

      <Form.Item label="Mise en page" name="layout">
        <Radio.Group>
          <Radio.Button value="1-column">1 colonne</Radio.Button>
          <Radio.Button value="2-columns">2 colonnes</Radio.Button>
          <Radio.Button value="3-columns">3 colonnes</Radio.Button>
          <Radio.Button value="4-columns">4 colonnes</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="Alignement" name="alignment">
        <Radio.Group>
          <Radio.Button value="left">Gauche</Radio.Button>
          <Radio.Button value="center">Centre</Radio.Button>
          <Radio.Button value="right">Droite</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Colonnes de contenu
        </label>
        {columns.map((column, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 12 }} align="baseline">
            <Input
              placeholder="Icône"
              value={column.icon}
              onChange={(e) => handleColumnChange(index, 'icon', e.target.value)}
              style={{ width: 60 }}
            />
            <Input
              placeholder={t('fields.title')}
              value={column.title}
              onChange={(e) => handleColumnChange(index, 'title', e.target.value)}
              style={{ width: 200 }}
            />
            <TextArea
              placeholder={t('fields.description')}
              value={column.description}
              onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
              style={{ width: 300 }}
              rows={2}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveColumn(index)}
            />
          </Space>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddColumn}>
          Ajouter une colonne
        </Button>
      </div>

      <Form.Item label="Images" help="Uploadez des images pour illustrer la section">
        <Upload
          {...uploadProps}
          fileList={imageFiles}
          listType="picture-card"
          action="/api/upload"
        >
          <div><UploadOutlined /> Upload</div>
        </Upload>
      </Form.Item>

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
          sectionType="content"
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
