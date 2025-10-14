/**
 * 📌 Éditeur de Header/Bandeau COMPLET
 * Logo, menu, boutons, styles avancés, responsive, sticky, animations
 */

import React, { useState, useEffect } from 'react';
import { 
  Form, Input, Button, Space, Upload, Switch, message, 
  Select, Slider, Collapse, Divider, InputNumber, Radio, Tooltip 
} from 'antd';
import { 
  UploadOutlined, PlusOutlined, DeleteOutlined, ThunderboltOutlined,
  BgColorsOutlined, FontSizeOutlined, AlignLeftOutlined, SettingOutlined,
  MobileOutlined, DesktopOutlined, EyeOutlined, LinkOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { AIAssistant } from '../AIAssistant';
import { GridLayoutEditor } from '../GridLayoutEditor';
import { SectionHeaderEditor } from '../SectionHeaderEditor';
import ColorInput from '../common/ColorInput';

const { Panel } = Collapse;
const { TextArea } = Input;

interface HeaderEditorProps {
  section: any;
  onSave: (content: any) => void;
  onCancel: () => void;
}

export const HeaderEditor: React.FC<HeaderEditorProps> = ({ section, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [gridLayout, setGridLayout] = useState<any>(null);
  const [sectionHeader, setSectionHeader] = useState<any>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAIContext] = useState('');
  const [aiCurrentValue, setAICurrentValue] = useState('');
  const [logoFile, setLogoFile] = useState<UploadFile[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    if (section) {
      const content = section.content || {};
      form.setFieldsValue({
        name: section.name,
        
        // Styles de base
        backgroundColor: section.backgroundColor || content.backgroundColor || '#ffffff',
        textColor: section.textColor || content.textColor || '#000000',
        
        // Logo
        logoUrl: content.logo || content.logoUrl || '',
        logoText: content.logoText || content.siteName || '',
        logoPosition: content.logoPosition || 'left',
        logoWidth: content.logoWidth || 150,
        logoHeight: content.logoHeight || 50,
        
        // Menu
        menuPosition: content.menuPosition || 'center',
        menuItems: content.menuItems || [],
        menuItemColor: content.menuItemColor || '#000000',
        menuItemHoverColor: content.menuItemHoverColor || '#10b981',
        menuFontSize: content.menuFontSize || 16,
        menuFontWeight: content.menuFontWeight || 500,
        menuSpacing: content.menuSpacing || 32,
        
        // CTA Buttons
        ctaButton: content.ctaButton || '',
        ctaButtonUrl: content.ctaButtonUrl || '',
        ctaButtonColor: content.ctaButtonColor || '#10b981',
        ctaButtonTextColor: content.ctaButtonTextColor || '#ffffff',
        ctaButtonSize: content.ctaButtonSize || 'default',
        ctaButtonStyle: content.ctaButtonStyle || 'solid',
        
        secondaryCta: content.secondaryCta || '',
        secondaryCtaUrl: content.secondaryCtaUrl || '',
        secondaryCtaColor: content.secondaryCtaColor || '#ffffff',
        secondaryCtaTextColor: content.secondaryCtaTextColor || '#000000',
        
        // Contact Info
        phone: content.phone || '',
        email: content.email || '',
        showContactInfo: content.showContactInfo !== false,
        
        // Layout
        height: content.height || 64,
        maxWidth: content.maxWidth || 1200,
        padding: content.padding || '0 24px',
        
        // Comportement
        sticky: content.sticky !== false,
        transparent: content.transparent || false,
        transparentScrollBg: content.transparentScrollBg || '#ffffff',
        showShadow: content.showShadow !== false,
        shadowOnScroll: content.shadowOnScroll !== false,
        
        // Responsive
        mobileMenuType: content.mobileMenuType || 'burger',
        mobileBreakpoint: content.mobileBreakpoint || 768,
        hiddenOnMobile: content.hiddenOnMobile || [],
        
        // Animations
        fadeInOnScroll: content.fadeInOnScroll || false,
        slideDownOnLoad: content.slideDownOnLoad || false,
        
        // Advanced
        customCSS: content.customCSS || '',
        zIndex: content.zIndex || 1000
      });
      
      setMenuItems(content.menuItems || [
        { label: 'Accueil', url: '#accueil' },
        { label: 'Services', url: '#services' },
        { label: 'Contact', url: '#contact' }
      ]);
      
      if (content.logo || content.logoUrl) {
        setLogoFile([{ 
          uid: '-1', 
          name: 'logo.png', 
          status: 'done', 
          url: content.logo || content.logoUrl 
        }]);
      }
    }
  }, [section]);


  const handleAddMenuItem = () => {
    setMenuItems([...menuItems, { label: '', url: '', icon: '', subMenu: [] }]);
  };

  const handleRemoveMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  const handleMenuItemChange = (index: number, field: string, value: any) => {
    const newItems = [...menuItems];
    newItems[index][field] = value;
    setMenuItems(newItems);
  };

  const handleSubmit = (values: any) => {
    const content = {
      // Logo
      logo: logoFile[0]?.url || logoFile[0]?.response?.url || values.logoUrl || '',
      logoUrl: logoFile[0]?.url || logoFile[0]?.response?.url || values.logoUrl || '',
      logoText: values.logoText,
      siteName: values.logoText,
      logoPosition: values.logoPosition,
      logoWidth: values.logoWidth,
      logoHeight: values.logoHeight,
      
      // Menu
      menuItems,
      menuPosition: values.menuPosition,
      menuItemColor: values.menuItemColor,
      menuItemHoverColor: values.menuItemHoverColor,
      menuFontSize: values.menuFontSize,
      menuFontWeight: values.menuFontWeight,
      menuSpacing: values.menuSpacing,
      
      // CTA Buttons
      ctaButton: values.ctaButton,
      ctaButtonUrl: values.ctaButtonUrl,
      ctaButtonColor: values.ctaButtonColor,
      ctaButtonTextColor: values.ctaButtonTextColor,
      ctaButtonSize: values.ctaButtonSize,
      ctaButtonStyle: values.ctaButtonStyle,
      
      secondaryCta: values.secondaryCta,
      secondaryCtaUrl: values.secondaryCtaUrl,
      secondaryCtaColor: values.secondaryCtaColor,
      secondaryCtaTextColor: values.secondaryCtaTextColor,
      
      // Contact Info
      phone: values.phone,
      email: values.email,
      showContactInfo: values.showContactInfo,
      
      // Layout
      height: values.height,
      maxWidth: values.maxWidth,
      padding: values.padding,
      
      // Comportement
      sticky: values.sticky,
      transparent: values.transparent,
      transparentScrollBg: values.transparentScrollBg,
      showShadow: values.showShadow,
      shadowOnScroll: values.shadowOnScroll,
      
      // Responsive
      mobileMenuType: values.mobileMenuType,
      mobileBreakpoint: values.mobileBreakpoint,
      hiddenOnMobile: values.hiddenOnMobile,
      
      // Animations
      fadeInOnScroll: values.fadeInOnScroll,
      slideDownOnLoad: values.slideDownOnLoad,
      
      // Advanced
      customCSS: values.customCSS,
      zIndex: values.zIndex
    };

    onSave({
      name: values.name,
      content,
      backgroundColor: values.backgroundColor,
      textColor: values.textColor,
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
        <Input placeholder="Ex: Header principal" />
      </Form.Item>

      <Collapse defaultActiveKey={['1']} ghost>
        {/* ======================== LOGO ======================== */}
        <Panel 
          header={<><BgColorsOutlined /> Logo et Branding</>} 
          key="1"
        >
          <Form.Item label="Logo (Image)" help="Uploadez le logo de votre entreprise (max 2MB)">
            <Upload
              {...uploadProps}
              fileList={logoFile}
              listType="picture-card"
              action="/api/upload"
            >
              {logoFile.length === 0 && <div><UploadOutlined /> Upload</div>}
            </Upload>
          </Form.Item>

          <Form.Item label="Logo (URL alternative)" name="logoUrl" help="Si vous n'uploadez pas, entrez l'URL du logo">
            <Input placeholder="https://exemple.com/logo.png" prefix={<LinkOutlined />} />
          </Form.Item>

          <Form.Item label="Texte du logo" name="logoText" help="Affiché si pas d'image">
            <Input placeholder="2Thier Énergies" />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item label="Largeur logo (px)" name="logoWidth">
              <InputNumber min={50} max={400} placeholder="150" />
            </Form.Item>

            <Form.Item label="Hauteur logo (px)" name="logoHeight">
              <InputNumber min={30} max={200} placeholder="50" />
            </Form.Item>
          </Space>

          <Form.Item label="Position du logo" name="logoPosition">
            <Select>
              <Select.Option value="left">Gauche</Select.Option>
              <Select.Option value="center">Centre</Select.Option>
              <Select.Option value="right">Droite</Select.Option>
            </Select>
          </Form.Item>
        </Panel>

        {/* ======================== MENU ======================== */}
        <Panel 
          header={<><AlignLeftOutlined /> Menu de Navigation</>} 
          key="2"
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Liens de navigation
            </label>
            {menuItems.map((item, index) => (
              <Space key={index} style={{ display: 'flex', marginBottom: 8, width: '100%' }} align="start" direction="vertical">
                <Space style={{ width: '100%' }}>
                  <Input
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => handleMenuItemChange(index, 'label', e.target.value)}
                    style={{ width: 120 }}
                  />
                  <Input
                    placeholder="URL"
                    value={item.url}
                    onChange={(e) => handleMenuItemChange(index, 'url', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Input
                    placeholder="Icône (optionnel)"
                    value={item.icon}
                    onChange={(e) => handleMenuItemChange(index, 'icon', e.target.value)}
                    style={{ width: 100 }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveMenuItem(index)}
                  />
                </Space>
              </Space>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddMenuItem} block>
              Ajouter un lien
            </Button>
          </div>

          <Divider />

          <Form.Item label="Position du menu" name="menuPosition">
            <Radio.Group>
              <Radio.Button value="left">Gauche</Radio.Button>
              <Radio.Button value="center">Centre</Radio.Button>
              <Radio.Button value="right">Droite</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="Couleur des liens" name="menuItemColor">
            <ColorInput />
          </Form.Item>

          <Form.Item label="Couleur au survol" name="menuItemHoverColor">
            <ColorInput />
          </Form.Item>

          <Form.Item label="Taille de police (px)" name="menuFontSize">
            <Slider min={12} max={24} marks={{ 12: '12', 16: '16', 20: '20', 24: '24' }} />
          </Form.Item>

          <Form.Item label="Épaisseur de police" name="menuFontWeight">
            <Select>
              <Select.Option value={300}>Light (300)</Select.Option>
              <Select.Option value={400}>Normal (400)</Select.Option>
              <Select.Option value={500}>Medium (500)</Select.Option>
              <Select.Option value={600}>Semi-Bold (600)</Select.Option>
              <Select.Option value={700}>Bold (700)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Espacement entre liens (px)" name="menuSpacing">
            <Slider min={8} max={64} marks={{ 8: '8', 32: '32', 64: '64' }} />
          </Form.Item>
        </Panel>

        {/* ======================== BOUTONS CTA ======================== */}
        <Panel 
          header={<><ThunderboltOutlined /> Boutons d'Action (CTA)</>} 
          key="3"
        >
          <h4>Bouton Principal</h4>
          <Form.Item label="Texte du bouton" name="ctaButton">
            <Input placeholder="Devis gratuit" />
          </Form.Item>

          <Form.Item label="URL du bouton" name="ctaButtonUrl">
            <Input placeholder="/contact" prefix={<LinkOutlined />} />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item label="Couleur de fond" name="ctaButtonColor">
              <ColorInput />
            </Form.Item>

            <Form.Item label="Couleur du texte" name="ctaButtonTextColor">
              <ColorInput />
            </Form.Item>
          </Space>

          <Form.Item label="Taille du bouton" name="ctaButtonSize">
            <Select>
              <Select.Option value="small">Petit</Select.Option>
              <Select.Option value="default">Normal</Select.Option>
              <Select.Option value="large">Grand</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Style du bouton" name="ctaButtonStyle">
            <Select>
              <Select.Option value="solid">Plein</Select.Option>
              <Select.Option value="outlined">Contour</Select.Option>
              <Select.Option value="ghost">Fantôme</Select.Option>
            </Select>
          </Form.Item>

          <Divider />

          <h4>Bouton Secondaire (optionnel)</h4>
          <Form.Item label="Texte" name="secondaryCta">
            <Input placeholder="En savoir plus" />
          </Form.Item>

          <Form.Item label="URL" name="secondaryCtaUrl">
            <Input placeholder="/about" prefix={<LinkOutlined />} />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item label="Couleur de fond" name="secondaryCtaColor">
              <ColorInput />
            </Form.Item>

            <Form.Item label="Couleur du texte" name="secondaryCtaTextColor">
              <ColorInput />
            </Form.Item>
          </Space>
        </Panel>

        {/* ======================== INFOS DE CONTACT ======================== */}
        <Panel 
          header={<><MobileOutlined /> Informations de Contact</>} 
          key="4"
        >
          <Form.Item label="Afficher les infos de contact" name="showContactInfo" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Téléphone" name="phone">
            <Input placeholder="+32 XXX XX XX XX" />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input placeholder="contact@2thier.be" type="email" />
          </Form.Item>
        </Panel>

        {/* ======================== APPARENCE ======================== */}
        <Panel 
          header={<><BgColorsOutlined /> Apparence et Couleurs</>} 
          key="5"
        >
          <Form.Item label="Couleur de fond" name="backgroundColor">
            <ColorInput />
          </Form.Item>

          <Form.Item label="Couleur du texte" name="textColor">
            <ColorInput />
          </Form.Item>

          <Form.Item label="Hauteur du header (px)" name="height">
            <Slider min={48} max={120} marks={{ 48: '48', 64: '64', 80: '80', 120: '120' }} />
          </Form.Item>

          <Form.Item label="Padding horizontal" name="padding">
            <Input placeholder="0 24px" />
          </Form.Item>

          <Form.Item label="Largeur maximale (px)" name="maxWidth">
            <InputNumber min={800} max={1920} placeholder="1200" style={{ width: '100%' }} />
          </Form.Item>
        </Panel>

        {/* ======================== COMPORTEMENT ======================== */}
        <Panel 
          header={<><SettingOutlined /> Comportement et Effets</>} 
          key="6"
        >
          <Form.Item label="Header collant (sticky)" name="sticky" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Transparent au chargement" name="transparent" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item 
            label="Couleur de fond au scroll" 
            name="transparentScrollBg"
            help="Seulement si transparent activé"
          >
            <ColorInput />
          </Form.Item>

          <Form.Item label="Afficher l'ombre" name="showShadow" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Ombre au scroll uniquement" name="shadowOnScroll" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Z-index" name="zIndex">
            <InputNumber min={100} max={9999} placeholder="1000" style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          <h4>Animations</h4>
          <Form.Item label="Fade-in au scroll" name="fadeInOnScroll" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Slide down au chargement" name="slideDownOnLoad" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Panel>

        {/* ======================== RESPONSIVE ======================== */}
        <Panel 
          header={<><MobileOutlined /> Responsive Mobile</>} 
          key="7"
        >
          <Form.Item label="Type de menu mobile" name="mobileMenuType">
            <Select>
              <Select.Option value="burger">Menu Burger (☰)</Select.Option>
              <Select.Option value="drawer">Tiroir latéral</Select.Option>
              <Select.Option value="dropdown">Dropdown</Select.Option>
              <Select.Option value="bottom">Barre inférieure</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Breakpoint mobile (px)" name="mobileBreakpoint">
            <InputNumber min={320} max={1024} placeholder="768" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item 
            label="Éléments masqués sur mobile" 
            name="hiddenOnMobile"
            help="Sélectionnez les éléments à cacher"
          >
            <Select mode="multiple" placeholder="Sélectionnez...">
              <Select.Option value="contact">Infos de contact</Select.Option>
              <Select.Option value="secondaryCta">Bouton secondaire</Select.Option>
              <Select.Option value="tagline">Slogan</Select.Option>
            </Select>
          </Form.Item>
        </Panel>

        {/* ======================== AVANCÉ ======================== */}
        <Panel 
          header={<><SettingOutlined /> Avancé</>} 
          key="8"
        >
          <Form.Item 
            label="CSS Personnalisé" 
            name="customCSS"
            help="CSS appliqué uniquement à ce header"
          >
            <TextArea 
              rows={6} 
              placeholder=".my-header { /* vos styles */ }"
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>
        </Panel>
      </Collapse>

      <Divider />

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
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onCancel}>
            Annuler
          </Button>
          <Button type="primary" htmlType="submit" size="large">
            💾 Sauvegarder
          </Button>
        </Space>
      </Form.Item>

      {/* ASSISTANT IA */}
      {showAI && (
        <AIAssistant
          visible={showAI}
          onClose={() => setShowAI(false)}
          context={aiContext}
          sectionType="header"
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
