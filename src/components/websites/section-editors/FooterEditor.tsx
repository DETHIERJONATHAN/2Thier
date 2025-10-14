/**
 * 📍 Éditeur de Footer
 * Pied de page avec liens, coordonnées, réseaux sociaux
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, Upload, ColorPicker, message } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { AIAssistant } from '../AIAssistant';
import { GridLayoutEditor } from '../GridLayoutEditor';
import { SectionHeaderEditor } from '../SectionHeaderEditor';

const { TextArea } = Input;

interface FooterEditorProps {
  section: any;
  onSave: (content: any) => void;
  onCancel: () => void;
}

export const FooterEditor: React.FC<FooterEditorProps> = ({ section, onSave, onCancel }) => {
  const [form] = Form.useForm();
      const [gridLayout, setGridLayout] = useState<any>(null);
  const [sectionHeader, setSectionHeader] = useState<any>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiCurrentValue, setAICurrentValue] = useState('');
  const [logoFile, setLogoFile] = useState<UploadFile[]>([]);
  const [linkGroups, setLinkGroups] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    if (section) {
      form.setFieldsValue({
        name: section.name,
        backgroundColor: section.backgroundColor || '#1f2937',
        textColor: section.textColor || '#ffffff',
        ...section.content
      });
      setLinkGroups(section.content?.linkGroups || []);
      setSocialLinks(section.content?.socialLinks || []);
      if (section.content?.logo) {
        setLogoFile([{ uid: '-1', name: 'logo.png', status: 'done', url: section.content.logo }]);
      }
    } else {
      // Valeurs par défaut
      form.setFieldsValue({
        companyName: '2Thier Énergies',
        description: 'Votre partenaire en transition énergétique depuis 2014'
      });
      setLinkGroups([
        {
          title: 'Services',
          links: [
            { label: 'Photovoltaïque', url: '/services/photovoltaique' },
            { label: 'Bornes de recharge', url: '/services/bornes' },
            { label: 'Pompes à chaleur', url: '/services/pompes' }
          ]
        },
        {
          title: 'Entreprise',
          links: [
            { label: 'À propos', url: '/a-propos' },
            { label: 'Contact', url: '/contact' },
            { label: 'Carrières', url: '/carrieres' }
          ]
        }
      ]);
      setSocialLinks([
        { platform: 'Facebook', icon: 'facebook', url: 'https://facebook.com/2thier' },
        { platform: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/company/2thier' }
      ]);
    }
  }, [section]);

  const handleAddLinkGroup = () => {
    setLinkGroups([...linkGroups, { title: '', links: [{ label: '', url: '' }] }]);
  };

  const handleRemoveLinkGroup = (index: number) => {
    setLinkGroups(linkGroups.filter((_, i) => i !== index));
  };

  const handleLinkGroupChange = (groupIndex: number, field: string, value: any) => {
    const newGroups = [...linkGroups];
    newGroups[groupIndex][field] = value;
    setLinkGroups(newGroups);
  };

  const handleAddLink = (groupIndex: number) => {
    const newGroups = [...linkGroups];
    newGroups[groupIndex].links.push({ label: '', url: '' });
    setLinkGroups(newGroups);
  };

  const handleRemoveLink = (groupIndex: number, linkIndex: number) => {
    const newGroups = [...linkGroups];
    newGroups[groupIndex].links = newGroups[groupIndex].links.filter((_: any, i: number) => i !== linkIndex);
    setLinkGroups(newGroups);
  };

  const handleLinkChange = (groupIndex: number, linkIndex: number, field: string, value: string) => {
    const newGroups = [...linkGroups];
    newGroups[groupIndex].links[linkIndex][field] = value;
    setLinkGroups(newGroups);
  };

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', icon: '', url: '' }]);
  };

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSocialLinkChange = (index: number, field: string, value: string) => {
    const newLinks = [...socialLinks];
    newLinks[index][field] = value;
    setSocialLinks(newLinks);
  };

  const handleSubmit = (values: any) => {
    onSave({
      name: values.name,
      content: {
        logo: logoFile[0]?.url || logoFile[0]?.response?.url || '',
        companyName: values.companyName,
        description: values.description,
        address: values.address,
        phone: values.phone,
        email: values.email,
        linkGroups,
        socialLinks,
        copyrightText: values.copyrightText,
        legalLinks: values.legalLinks
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
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('L\'image doit faire moins de 2MB !');
      }
      return isImage && isLt2M;
    },
    onChange: (info: any) => {
      setLogoFile(info.fileList);
    },
    maxCount: 1
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item label="Nom de la section" name="name" rules={[{ required: true }]}>
        <Input placeholder="Ex: Footer principal" />
      </Form.Item>

      <Form.Item label="Logo" help="Logo en version claire pour fond sombre">
        <Upload
          {...uploadProps}
          fileList={logoFile}
          listType="picture-card"
          action="/api/upload"
        >
          {logoFile.length === 0 && <div><UploadOutlined /> Upload</div>}
        </Upload>
      </Form.Item>

      <Form.Item label="Nom de l'entreprise" name="companyName">
        <Input placeholder="2Thier Énergies" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <TextArea rows={2} placeholder="Votre partenaire en transition énergétique..."
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

      <Form.Item label="Adresse" name="address">
        <Input placeholder="Rue de l'Exemple 123, 1000 Bruxelles" />
      </Form.Item>

      <Form.Item label="Téléphone" name="phone">
        <Input placeholder="+32 XXX XX XX XX" />
      </Form.Item>

      <Form.Item label="Email" name="email">
        <Input placeholder="contact@2thier.be" />
      </Form.Item>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Groupes de liens
        </label>
        {linkGroups.map((group, groupIndex) => (
          <div key={groupIndex} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
            <Space style={{ width: '100%', marginBottom: 8 }}>
              <Input
                placeholder="Titre du groupe"
                value={group.title}
                onChange={(e) => handleLinkGroupChange(groupIndex, 'title', e.target.value)}
                style={{ width: 200 }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveLinkGroup(groupIndex)}
              />
            </Space>
            {group.links.map((link: any, linkIndex: number) => (
              <Space key={linkIndex} style={{ display: 'flex', marginBottom: 4 }}>
                <Input
                  placeholder="Label"
                  value={link.label}
                  onChange={(e) => handleLinkChange(groupIndex, linkIndex, 'label', e.target.value)}
                  style={{ width: 150 }}
                />
                <Input
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => handleLinkChange(groupIndex, linkIndex, 'url', e.target.value)}
                  style={{ width: 200 }}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveLink(groupIndex, linkIndex)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddLink(groupIndex)}
              style={{ marginTop: 4 }}
            >
              Ajouter un lien
            </Button>
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLinkGroup}>
          Ajouter un groupe
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Réseaux sociaux
        </label>
        {socialLinks.map((social, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
            <Input
              placeholder="Plateforme"
              value={social.platform}
              onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
              style={{ width: 120 }}
            />
            <Input
              placeholder="Icône"
              value={social.icon}
              onChange={(e) => handleSocialLinkChange(index, 'icon', e.target.value)}
              style={{ width: 100 }}
            />
            <Input
              placeholder="URL"
              value={social.url}
              onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
              style={{ width: 300 }}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveSocialLink(index)}
            />
          </Space>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSocialLink}>
          Ajouter un réseau social
        </Button>
      </div>

      <Form.Item label="Texte de copyright" name="copyrightText">
        <Input placeholder="© 2025 2Thier Énergies. Tous droits réservés." />
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
          sectionType="footer"
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
