import { Modal, Form, ColorPicker, Select, InputNumber, Input, Space, Divider, Upload, Button } from 'antd';
import { PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import type { Color } from 'antd/es/color-picker';

export type DocumentGlobalTheme = {
  // Couleurs générales
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  
  // Typographie par défaut
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  
  // Images de fond
  headerBackgroundImage?: string;
  footerBackgroundImage?: string;
  watermarkImage?: string;
  watermarkOpacity?: number;
  
  // Marges et espacements
  pageMargin?: number;
  sectionSpacing?: number;
  
  // Bordures et ombres
  borderRadius?: number;
  shadowIntensity?: 'none' | 'light' | 'medium' | 'strong';
  
  // Style général
  theme?: 'modern' | 'classic' | 'minimal' | 'bold' | 'corporate' | 'creative';
};

interface DocumentGlobalThemeEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (theme: DocumentGlobalTheme) => void;
  initialTheme?: DocumentGlobalTheme;
}

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Garamond, serif', label: 'Garamond' },
  { value: 'Palatino, serif', label: 'Palatino' }
];

const THEME_PRESETS = [
  { value: 'modern', label: '✨ Modern', colors: { primary: '#1890ff', secondary: '#52c41a', accent: '#faad14' } },
  { value: 'classic', label: '📜 Classic', colors: { primary: '#2c3e50', secondary: '#34495e', accent: '#c0392b' } },
  { value: 'minimal', label: '⚪ Minimal', colors: { primary: '#000000', secondary: '#666666', accent: '#999999' } },
  { value: 'bold', label: '💪 Bold', colors: { primary: '#ff4d4f', secondary: '#ff7a45', accent: '#ffa940' } },
  { value: 'corporate', label: '🏢 Corporate', colors: { primary: '#003366', secondary: '#0066cc', accent: '#6699cc' } },
  { value: 'creative', label: '🎨 Creative', colors: { primary: '#722ed1', secondary: '#eb2f96', accent: '#13c2c2' } }
];

const DocumentGlobalThemeEditor = ({ open, onClose, onSave, initialTheme }: DocumentGlobalThemeEditorProps) => {
  const [form] = Form.useForm();
  const [selectedPreset, setSelectedPreset] = useState<string>('modern');

  useEffect(() => {
    if (initialTheme) {
      form.setFieldsValue(initialTheme);
    }
  }, [initialTheme, form]);

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    const preset = THEME_PRESETS.find(p => p.value === presetValue);
    if (preset) {
      form.setFieldsValue({
        theme: presetValue,
        primaryColor: preset.colors.primary,
        secondaryColor: preset.colors.secondary,
        accentColor: preset.colors.accent
      });
    }
  };

  const handleSave = () => {
    const values = form.getFieldsValue();
    const theme: DocumentGlobalTheme = {
      ...values,
      primaryColor: values.primaryColor?.toHexString?.() || values.primaryColor,
      secondaryColor: values.secondaryColor?.toHexString?.() || values.secondaryColor,
      accentColor: values.accentColor?.toHexString?.() || values.accentColor,
      textColor: values.textColor?.toHexString?.() || values.textColor,
      backgroundColor: values.backgroundColor?.toHexString?.() || values.backgroundColor
    };
    onSave(theme);
    onClose();
  };

  const uploadProps = {
    name: 'file',
    action: '/api/upload',
    onChange(info: any) {
      if (info.file.status === 'done') {
        // Mettre à jour le champ correspondant
      }
    }
  };

  return (
    <Modal
      title="🎨 Thème Global du Document"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      width={900}
      okText="Appliquer"
      cancelText="Annuler"
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            primaryColor: '#1890ff',
            secondaryColor: '#52c41a',
            accentColor: '#faad14',
            textColor: '#000000',
            backgroundColor: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            lineHeight: 1.6,
            watermarkOpacity: 0.1,
            pageMargin: 40,
            sectionSpacing: 30,
            borderRadius: 8,
            shadowIntensity: 'medium',
            theme: 'modern',
            ...initialTheme
          }}
        >
          <Divider orientation="left">🎨 Préréglage de thème</Divider>
          <Form.Item name="theme" label="Choisir un thème prédéfini">
            <Select onChange={handlePresetChange}>
              {THEME_PRESETS.map(preset => (
                <Select.Option key={preset.value} value={preset.value}>
                  {preset.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left">🌈 Couleurs</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <Form.Item name="primaryColor" label="Couleur primaire">
              <ColorPicker showText format="hex" />
            </Form.Item>

            <Form.Item name="secondaryColor" label="Couleur secondaire">
              <ColorPicker showText format="hex" />
            </Form.Item>

            <Form.Item name="accentColor" label="Couleur d'accent">
              <ColorPicker showText format="hex" />
            </Form.Item>

            <Form.Item name="textColor" label="Couleur du texte">
              <ColorPicker showText format="hex" />
            </Form.Item>

            <Form.Item name="backgroundColor" label="Fond de page">
              <ColorPicker showText format="hex" />
            </Form.Item>
          </div>

          <Divider orientation="left">🔤 Typographie</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
            <Form.Item name="fontFamily" label="Police par défaut">
              <Select options={FONT_FAMILIES} />
            </Form.Item>

            <Form.Item name="fontSize" label="Taille (px)">
              <InputNumber min={10} max={24} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="lineHeight" label="Hauteur ligne">
              <InputNumber min={1} max={3} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider orientation="left">🖼️ Images de fond</Divider>
          <Form.Item name="headerBackgroundImage" label="Image de fond en-tête">
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="URL de l'image" />
              <Upload {...uploadProps}>
                <Button icon={<PictureOutlined />}>Upload</Button>
              </Upload>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="footerBackgroundImage" label="Image de fond pied de page">
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="URL de l'image" />
              <Upload {...uploadProps}>
                <Button icon={<PictureOutlined />}>Upload</Button>
              </Upload>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="watermarkImage" label="Filigrane (Watermark)">
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="URL de l'image filigrane" />
              <Upload {...uploadProps}>
                <Button icon={<PictureOutlined />}>Upload</Button>
              </Upload>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="watermarkOpacity" label="Opacité du filigrane">
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left">📏 Espacements</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Form.Item name="pageMargin" label="Marge de page (px)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="sectionSpacing" label="Espacement sections (px)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider orientation="left">🎭 Style visuel</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Form.Item name="borderRadius" label="Arrondis bordures (px)">
              <InputNumber min={0} max={30} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="shadowIntensity" label="Intensité des ombres">
              <Select>
                <Select.Option value="none">❌ Aucune</Select.Option>
                <Select.Option value="light">☁️ Légère</Select.Option>
                <Select.Option value="medium">⛅ Moyenne</Select.Option>
                <Select.Option value="strong">☁️ Forte</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f2f5', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>
              💡 <strong>Info :</strong> Ce thème s'appliquera à toutes les sections du document sauf si vous définissez des styles personnalisés pour un champ spécifique.
            </p>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default DocumentGlobalThemeEditor;
