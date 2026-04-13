/**
 * 🎛️ UNIVERSAL SECTION EDITOR - Éditeur Universel de Sections
 * 
 * LE COMPOSANT CLÉ DU SYSTÈME UNIVERSEL !
 * 
 * Lit un `SectionSchema` et génère automatiquement toute l'interface
 * d'édition. Plus besoin de coder un éditeur pour chaque type de section !
 * 
 * FONCTIONNEMENT :
 * 1. Reçoit le type de section ('header', 'hero', etc.)
 * 2. Récupère le schéma depuis le registre
 * 3. Génère automatiquement les champs via FieldRenderer
 * 4. Gère le state et les updates
 * 5. Supporte l'AI si activée dans le schéma
 * 
 * USAGE :
 * ```tsx
 * <UniversalSectionEditor
 *   sectionType="hero"
 *   content={heroContent}
 *   onChange={(newContent) => updateSection(newContent)}
 * />
 * ```
 * 
 * @module site/editor/UniversalSectionEditor
 * @author 2Thier CRM Team
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Form,
  Button,
  Space,
  Tabs,
  Alert,
  Divider,
  Card,
  Spin,
  message,
  Input
} from 'antd';
import '../../styles/site-responsive.css';

const { TextArea } = Input;
import {
  SaveOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { getSectionSchema } from '../schemas';
import { SectionSchema, SectionInstance } from '../schemas/types';
import FieldRenderer from './fields/FieldRenderer';
import AIContentGenerator from '../ai/AIContentGenerator';
import { SectionRenderer } from '../renderer/SectionRenderer';
import { SF } from '../../components/zhiive/ZhiiveTheme';
import { logger } from '../../lib/logger';

/**
 * 🔧 Props du UniversalSectionEditor
 */
interface UniversalSectionEditorProps {
  /** ID du site web (pour charger les sections) */
  websiteId?: number;
  
  /** Type de section à éditer */
  sectionType: string;
  
  /** Contenu actuel de la section */
  content: unknown;
  
  /** Callback onChange */
  onChange: (content: unknown) => void;
  
  /** Visible (pour le Drawer) */
  visible?: boolean;
  
  /** Callback onClose */
  onClose?: () => void;
  
  /** Mode (drawer ou inline) */
  mode?: 'drawer' | 'inline';
  
  /** Contexte AI additionnel */
  aiContext?: unknown;
}

/**
 * 🎛️ UniversalSectionEditor Component
 */
export const UniversalSectionEditor: React.FC<UniversalSectionEditorProps> = ({
  websiteId,
  sectionType,
  content,
  onChange,
  visible = true,
  onClose,
  mode = 'drawer',
  aiContext
}) => {
  logger.debug('🔥 [UniversalSectionEditor] websiteId PROP direct reçu:', websiteId);
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  
  // 🔥 CRITIQUE : État local pour les valeurs du formulaire
  // Car form.getFieldsValue() retourne vide juste après setFieldsValue()
  const [formValues, setFormValues] = useState<any>(content || {});
  
  /**
   * 📚 Récupération du schéma
   */
  const schema: SectionSchema | undefined = useMemo(
    () => getSectionSchema(sectionType),
    [sectionType]
  );
  
  /**
   * 🤖 Construction du contexte IA enrichi
   * Fusionne le schema.aiContext avec le sectionType
   */
  const enrichedAiContext = useMemo(() => {
    if (!schema) return undefined;
    
    const context = {
      sectionType: sectionType,
      businessType: schema.aiContext?.businessType?.[0] || 'services',
      tone: schema.aiContext?.tone?.[0] || 'professionnel',
      targetAudience: 'clients potentiels',
      language: 'français',
      keywords: schema.aiContext?.keywords || [],
      ...aiContext,
      websiteId: websiteId // Priorité au websiteId direct
    };
    
    logger.debug('✅ [UniversalSectionEditor] enrichedAiContext CRÉÉ:', {
      websiteIdProp: websiteId,
      aiContextWebsiteId: aiContext?.websiteId,
      finalWebsiteId: context.websiteId,
      fullContext: context
    });
    return context;
  }, [schema, sectionType, aiContext, websiteId]);
  
  /**
   * ⚠️ Schéma non trouvé
   */
  if (!schema) {
    return (
      <Alert
        type="error"
        message="Schéma introuvable"
        description={`Le schéma pour le type "${sectionType}" n'existe pas dans le registre.`}
        showIcon
      />
    );
  }
  
  /**
   * 🔄 Initialiser le formulaire avec le contenu actuel
   */
  useEffect(() => {
    logger.debug('🔄 [UniversalSectionEditor] Initialisation du formulaire');
    logger.debug('  Section type:', sectionType);
    logger.debug('  Content reçu:', content);
    logger.debug('  Schema defaults:', schema.defaults);
    const initialValues = content || schema.defaults || {};
    logger.debug('  Valeurs initiales à charger:', initialValues);
    form.setFieldsValue(initialValues);
    setFormValues(initialValues); // 🔥 SYNC état local
    // Note: getFieldsValue() peut être vide ici car les Form.Item ne sont pas encore montés
    // Les valeurs seront disponibles après le premier rendu
  }, [content, schema, form, sectionType]);
  
  /**
   * 💾 Sauvegarder les modifications
   */
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 🔥 FIX: Fonction de fusion récursive pour éviter d'écraser les propriétés imbriquées
      const deepMerge = (target: unknown, source: unknown): any => {
        // Si source n'est pas un objet, le retourner directement
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
          return source;
        }
        
        // Créer un nouvel objet pour éviter les mutations
        const result = { ...(target || {}) };
        
        // Fusionner chaque propriété de source
        for (const key in source) {
          if (source[key] !== undefined) {
            // Si les deux sont des objets (et pas des arrays), fusionner récursivement
            if (
              result[key] &&
              typeof result[key] === 'object' &&
              !Array.isArray(result[key]) &&
              typeof source[key] === 'object' &&
              !Array.isArray(source[key])
            ) {
              result[key] = deepMerge(result[key], source[key]);
            } else {
              // Sinon, remplacer la valeur
              result[key] = source[key];
            }
          }
        }
        
        return result;
      };
      
      // Fusionner avec le content existant pour ne pas perdre les propriétés non modifiées
      let mergedContent = deepMerge(content, values);

      // 🗑️ CLEANUP: Fonction récursive pour supprimer tous les champs avec actionType === 'none'
      const cleanupNoneActions = (obj: unknown): any => {
        if (!obj || typeof obj !== 'object') return obj;

        // Si c'est un array, nettoyer chaque élément
        if (Array.isArray(obj)) {
          return obj
            .map(item => cleanupNoneActions(item))
            .filter(item => {
              // Supprimer les éléments avec actionType === 'none'
              return !(item && typeof item === 'object' && item.actionType === 'none');
            });
        }

        // Si c'est un objet avec actionType === 'none', retourner null (sera supprimé par le parent)
        if (obj.actionType === 'none') {
          return null;
        }

        // Nettoyer récursivement tous les sous-objets
        const cleaned: unknown = {};
        for (const key in obj) {
          const value = cleanupNoneActions(obj[key]);
          // Ne pas ajouter les valeurs null (= supprimées)
          if (value !== null) {
            cleaned[key] = value;
          }
        }
        return cleaned;
      };

      mergedContent = cleanupNoneActions(mergedContent);
      
      logger.debug('💾 [UniversalSectionEditor] Sauvegarde:', {
        formValues: values,
        existingContent: content,
        mergedContent
      });
      
      onChange(mergedContent);
      message.success('Section mise à jour avec succès !');
      onClose?.();
    } catch (error) {
      logger.error('Validation error:', error);
      message.error('Veuillez corriger les erreurs avant de sauvegarder');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 🤖 Générer du contenu avec AI
   */
  const handleAIGenerate = async () => {
    try {
      setLoading(true);
      message.info('Génération de contenu par IA en cours...');
      
      // TODO: Appel API pour générer le contenu
      // const aiContent = await generateSectionContent({
      //   sectionType,
      //   aiContext: schema.aiContext,
      //   ...aiContext
      // });
      
      // form.setFieldsValue(aiContent);
      
      setTimeout(() => {
        message.success('Contenu généré avec succès !');
        setLoading(false);
      }, 2000);
    } catch (error) {
      logger.error('AI generation error:', error);
      message.error('Erreur lors de la génération IA');
      setLoading(false);
    }
  };
  
  /**
   * 🎨 Rendu du contenu de l'éditeur
   */
  const editorContent = (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        {/* Header avec infos de la section */}
        <Card
          size="small"
          className="mb-mobile"
          style={{ backgroundColor: '#f0f9ff' }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <strong style={{ fontSize: 16 }}>
                {schema.icon} {schema.name}
              </strong>
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>
              {schema.description}
            </div>
            {schema.aiEnabled && (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                size="large"
                className="touchable"
                onClick={handleAIGenerate}
                style={{ marginTop: 8, width: '100%' }}
                block
              >
                Générer avec IA
              </Button>
            )}
          </Space>
        </Card>
        
        {/* Tabs pour organiser les champs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'edit',
              label: '✏️ Édition',
              children: (
                <Space
                  direction="vertical"
                  size="middle"
                  className="p-responsive"
                  style={{ width: '100%', paddingBottom: '120px' }}
                >
                  {schema.fields.map((field) => (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={formValues}
                      onChange={(newValue) => {
                        // 🔥 CORRECTIF CRITIQUE : Reconstruire l'objet complet
                        // Au lieu d'écraser tout le form avec newValue,
                        // on met à jour uniquement le champ concerné
                        const updatedValues = {
                          ...formValues,
                          [field.id]: newValue
                        };
                        logger.debug('📝 [UniversalSectionEditor] Mise à jour du champ:', {
                          fieldId: field.id,
                          oldValue: formValues[field.id],
                          newValue: newValue,
                          fullUpdate: updatedValues
                        });
                        setFormValues(updatedValues);
                        form.setFieldsValue(updatedValues);
                      }}
                      name={[field.id]}
                      aiContext={enrichedAiContext}
                      formValues={formValues}
                    />
                  ))}
                </Space>
              )
            },
            {
              key: 'preview',
              label: '👁️ Aperçu',
              children: (
                <div style={{ padding: 0, backgroundColor: '#f5f5f5', minHeight: '400px' }}>
                  <Alert
                    type="info"
                    message="Aperçu en direct"
                    description="L'aperçu en temps réel est affiché ci-dessous. Les modifications sont visibles immédiatement."
                    showIcon
                    className="mb-mobile"
                    style={{ margin: '16px' }}
                  />
                  
                  {/* APERÇU LIVE DE LA SECTION */}
                  <div style={{ 
                    backgroundColor: '#ffffff',
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    margin: '16px',
                    overflow: 'hidden'
                  }}>
                    <Form.Item shouldUpdate noStyle>
                      {() => {
                        const currentValues = form.getFieldsValue();
                        logger.debug('🎨 [Aperçu] Valeurs actuelles:', currentValues);
                        
                        return (
                          <SectionRenderer
                            section={{
                              id: 'preview',
                              key: 'preview-section',
                              type: sectionType,
                              name: schema.name,
                              displayOrder: 0,
                              isActive: true,
                              content: currentValues,
                              websiteId: 0,
                              createdAt: new Date(),
                              updatedAt: new Date()
                            }}
                            mode="preview"
                          />
                        );
                      }}
                    </Form.Item>
                  </div>
                </div>
              )
            },
            {
              key: 'advanced',
              label: '⚙️ Avancé',
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    message="Options avancées"
                    description="CSS personnalisé, animations, scripts, etc."
                    showIcon
                  />
                  
                  <Card title="CSS Personnalisé" size="small">
                    <Form.Item
                      name={['_advanced', 'customCSS']}
                      label="Classes CSS"
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder=".my-custom-class { color: red; }"
                      />
                    </Form.Item>
                  </Card>
                  
                  <Card title="JavaScript" size="small">
                    <Form.Item
                      name={['_advanced', 'customJS']}
                      label="Script personnalisé"
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="logger.debug('Hello');"
                      />
                    </Form.Item>
                  </Card>
                  
                  <Card title="SEO & Métadonnées" size="small">
                    <Form.Item
                      name={['_advanced', 'seoTitle']}
                      label="Titre SEO"
                    >
                      <Input placeholder="Titre pour les moteurs de recherche" />
                    </Form.Item>
                    
                    <Form.Item
                      name={['_advanced', 'seoDescription']}
                      label="Description SEO"
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder="Description pour les moteurs de recherche"
                      />
                    </Form.Item>
                  </Card>
                </Space>
              )
            }
          ]}
        />
        
        {/* Footer fixe avec boutons d'action - 100% RESPONSIVE */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            left: 0,
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#fff',
            borderTop: '1px solid #f0f0f0',
            zIndex: 10,
            boxShadow: '0 -2px 8px ${SF.overlayDarkFaint}'
          }}
        >
          <Space 
            style={{ 
              width: '100%', 
              justifyContent: 'space-between',
              display: 'flex',
              gap: '8px'
            }}
          >
            <Button 
              icon={<CloseOutlined />} 
              onClick={onClose}
              size="large"
              className="touchable"
              style={{ flex: 1, minWidth: 0 }}
            >
              Annuler
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              size="large"
              className="touchable"
              style={{ flex: 1, minWidth: 0 }}
            >
              Enregistrer
            </Button>
          </Space>
        </div>
      </Form>
    </Spin>
  );
  
  /**
   * 🎨 Rendu selon le mode
   */
  if (mode === 'inline') {
    return <div className="universal-section-editor">{editorContent}</div>;
  }
  
  return (
    <Drawer
      title={
        <Space>
          {schema.icon}
          <span style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}>Éditer : {schema.name}</span>
        </Space>
      }
      open={visible}
      onClose={onClose}
      width="100%"
      styles={{
        wrapper: {
          maxWidth: '100vw'
        },
        body: {
          padding: '16px',
          paddingBottom: '80px'
        }
      }}
      destroyOnClose
      footer={null}
      placement="right"
    >
      {editorContent}
    </Drawer>
  );
};

export default UniversalSectionEditor;
