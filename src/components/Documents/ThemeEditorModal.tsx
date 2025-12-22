import { Modal, Form, Input, ColorPicker, Upload, Button, Switch, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { Color } from 'antd/es/color-picker';

interface ThemeEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (theme: any) => Promise<void>;
  initialTheme?: any;
}

const ThemeEditorModal = ({ visible, onClose, onSave, initialTheme }: ThemeEditorModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Convertir les Color objects en strings hex
      const themeData = {
        ...values,
        primaryColor: typeof values.primaryColor === 'object' 
          ? values.primaryColor.toHexString() 
          : values.primaryColor,
        secondaryColor: typeof values.secondaryColor === 'object'
          ? values.secondaryColor.toHexString()
          : values.secondaryColor,
        accentColor: values.accentColor && typeof values.accentColor === 'object'
          ? values.accentColor.toHexString()
          : values.accentColor,
        textColor: typeof values.textColor === 'object'
          ? values.textColor.toHexString()
          : values.textColor,
        backgroundColor: typeof values.backgroundColor === 'object'
          ? values.backgroundColor.toHexString()
          : values.backgroundColor,
      };

      await onSave(themeData);
      message.success('Thème enregistré avec succès');
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde thème:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={initialTheme ? "Éditer le Thème" : "Nouveau Thème Visuel"}
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      width={700}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialTheme || {
          primaryColor: '#1890ff',
          secondaryColor: '#52c41a',
          textColor: '#000000',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: 12,
          isActive: true,
          isPublic: false,
          isDefault: false
        }}
      >
        <Form.Item
          name="name"
          label="Nom du thème"
          rules={[{ required: true, message: 'Nom requis' }]}
        >
          <Input placeholder="Ex: Thème Corporate Bleu" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="primaryColor"
            label="Couleur Principale"
            rules={[{ required: true }]}
          >
            <ColorPicker 
              showText 
              format="hex"
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="secondaryColor"
            label="Couleur Secondaire"
            rules={[{ required: true }]}
          >
            <ColorPicker 
              showText 
              format="hex"
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="accentColor"
            label="Couleur d'Accentuation"
          >
            <ColorPicker 
              showText 
              format="hex"
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="textColor"
            label="Couleur du Texte"
            rules={[{ required: true }]}
          >
            <ColorPicker 
              showText 
              format="hex"
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="backgroundColor"
            label="Couleur de Fond"
            rules={[{ required: true }]}
          >
            <ColorPicker 
              showText 
              format="hex"
              className="w-full"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="fontFamily"
            label="Police de caractères"
            rules={[{ required: true }]}
          >
            <Input placeholder="Arial, sans-serif" />
          </Form.Item>

          <Form.Item
            name="fontSize"
            label="Taille de police (pt)"
            rules={[{ required: true }]}
          >
            <Input type="number" min={8} max={20} />
          </Form.Item>
        </div>

        <Form.Item
          name="logoUrl"
          label="Logo de l'entreprise"
        >
          <Input placeholder="URL du logo" />
        </Form.Item>

        <Form.Item
          name="headerImageUrl"
          label="Image d'en-tête"
        >
          <Input placeholder="URL de l'image d'en-tête" />
        </Form.Item>

        <Form.Item
          name="footerImageUrl"
          label="Image de pied de page"
        >
          <Input placeholder="URL de l'image de pied de page" />
        </Form.Item>

        <div className="grid grid-cols-3 gap-4">
          <Form.Item
            name="isDefault"
            label="Thème par défaut"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Actif"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="isPublic"
            label="Public"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default ThemeEditorModal;
