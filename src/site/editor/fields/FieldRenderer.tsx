/**
 * 🎨 FIELD RENDERER - Générateur de Champs Universels
 * 
 * Composant qui transforme une `FieldDefinition` (depuis le schéma)
 * en composant React Ant Design approprié.
 * 
 * C'est le CŒUR du système universel : au lieu de coder chaque champ
 * manuellement, ce renderer lit la configuration JSON et génère l'UI.
 * 
 * FIELD TYPES SUPPORTÉS :
 * - text, textarea, rich-text
 * - number, slider, size, spacing
 * - color, icon, image
 * - select, boolean
 * - array (avec drag & drop)
 * - group (champs imbriqués)
 * - grid (configuration layout)
 * 
 * @module site/editor/fields/FieldRenderer
 * @author 2Thier CRM Team
 */

import React, { useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Slider,
  Space,
  Card,
  Collapse,
  Alert,
  Tooltip
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { FieldDefinition, FieldOptions } from '../../schemas/types';

// Composants spécialisés (à créer)
import { ColorInput } from '../../../components/common/ColorInput';
import IconPicker from './IconPicker';
import ImageUploader from './ImageUploader';
import IconOrImagePicker from './IconOrImagePicker';
import ArrayFieldEditor from './ArrayFieldEditor';
import RichTextEditor from './RichTextEditor';
import GridConfigEditor from './GridConfigEditor';
import ContactFormSelector from './ContactFormSelector';
import SectionAnchorSelector from './SectionAnchorSelector';
import SimulatorFormSelector from './SimulatorFormSelector';
import AIAssistButton from '../../ai/AIAssistButton';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 🔧 Props du FieldRenderer
 */
interface FieldRendererProps {
  /** Définition du champ (depuis le schéma) */
  field: FieldDefinition;
  
  /** Valeur actuelle du champ (peut être une valeur locale ou le form complet) */
  value: unknown;
  
  /** Callback onChange pour mettre à jour la valeur */
  onChange: (value: unknown) => void;
  
  /** Nom du champ Form.Item (path ex: ['logo', 'text']) */
  name?: (string | number)[];
  
  /** Contexte AI (optionnel) */
  aiContext?: unknown;
  
  /** 🔥 NOUVEAU : Toutes les valeurs du formulaire (pour les conditions) */
  formValues?: unknown;
}

/**
 * 🎨 FieldRenderer Component
 * 
 * Génère le composant approprié selon field.type
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  name = [],
  aiContext,
  formValues
}) => {
  // 🔥 NOUVEAU : Utiliser Form.useWatch pour obtenir les valeurs actuelles du formulaire
  // Cela permet aux conditions d'être évaluées avec les valeurs en temps réel
  const watchedValues = Form.useWatch([], { preserve: true });
  
  // 🔥 CRITIQUE : Pour les champs dans un array, il faut naviguer jusqu'à l'item courant
  // name = ['buttons', 0, 'actionType'] -> on veut buttons[0] pour les conditions
  const currentItemValues = useMemo(() => {
    if (!watchedValues || !name || name.length === 0) {
      return formValues || value || {};
    }
    
    // Si on est dans un array (ex: buttons[0].actionType)
    // On veut récupérer buttons[0] pour avoir accès à actionType
    let current = watchedValues;
    for (let i = 0; i < name.length - 1; i++) {
      current = current?.[name[i]];
      if (!current) break;
    }
    
    return current || formValues || value || {};
  }, [watchedValues, formValues, value, name]);
  
  // Utiliser watchedValues si disponible (dans un Form.Item), sinon formValues
  const currentFormValues = useMemo(
    () => currentItemValues,
    [currentItemValues]
  );
  
  /**
   * 🔍 Vérifie si le champ doit être affiché (condition)
   * CRITIQUE : Les conditions reçoivent currentFormValues (valeurs en temps réel),
   * pas juste value (valeur locale)
   */
  const shouldRender = useMemo(() => {
    if (!field.condition) return true;
    
    // 🔥 DEBUG POUR CONDITION
    if (field.id === 'formTarget' || field.id === 'sectionAnchor') {
      console.log(`🔍 [FieldRenderer] Évaluation condition pour ${field.id}:`, {
        watchedValues,
        formValues,
        currentFormValues,
        actionType: currentFormValues?.actionType,
        conditionResult: field.condition(currentFormValues)
      });
    }
    
    // 🔥 Passer currentFormValues pour les conditions
    return field.condition(currentFormValues);
  }, [field, currentFormValues, watchedValues, formValues]);
  
  if (!shouldRender) return null;
  
  /**
   * 🏷️ Label avec tooltip si description présente
   */
  const labelWithTooltip = field.description ? (
    <Space size={4}>
      {field.label}
      <Tooltip title={field.description}>
        <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
      </Tooltip>
    </Space>
  ) : field.label;
  
  /**
   * 🤖 Bouton AI si aiSuggest activé
   */
  const aiButton = field.options?.aiSuggest ? (
    <AIAssistButton
      fieldId={field.id}
      fieldType={field.type}
      fieldLabel={field.label}
      currentValue={name ? name.reduce((acc, key) => acc?.[key], value) : value}
      aiContext={{
        // Contexte par défaut
        sectionType: 'unknown',
        businessType: 'services',
        tone: 'professionnel',
        language: 'français',
        // Contexte du parent (UniversalSectionEditor)
        ...(aiContext && typeof aiContext === 'object' ? aiContext : {}),
        // Contexte spécifique du champ (si c'est un objet)
        ...(field.options.aiContext && typeof field.options.aiContext === 'object' ? field.options.aiContext : {}),
        // Si field.options.aiContext est une string, c'est un hint
        ...(field.options.aiContext && typeof field.options.aiContext === 'string' ? { fieldHint: field.options.aiContext } : {})
      }}
      onGenerated={(suggestion) => {
        // Mettre à jour la valeur avec la suggestion AI
        const newValue = { ...value };
        let current = newValue;
        
        // Naviguer jusqu'au champ à mettre à jour
        for (let i = 0; i < name.length - 1; i++) {
          current = current[name[i]];
        }
        
        current[name[name.length - 1]] = suggestion;
        onChange(newValue);
      }}
    />
  ) : null;
  
  /**
   * 🎛️ Rendu du champ selon son type
   */
  const renderField = () => {
    const opts = field.options || {} as FieldOptions;
    
    switch (field.type) {
      
      // ==================== TEXT ====================
      case 'text':
        return (
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name={name}
              label={labelWithTooltip}
              required={field.required}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input placeholder={field.label} />
            </Form.Item>
            {aiButton}
          </Space.Compact>
        );
      
      // ==================== TEXTAREA ====================
      case 'textarea':
        return (
          <div>
            <Form.Item
              name={name}
              label={labelWithTooltip}
              required={field.required}
            >
              <TextArea
                rows={4}
                placeholder={field.label}
              />
            </Form.Item>
            {aiButton}
          </div>
        );
      
      // ==================== RICH TEXT ====================
      case 'rich-text':
        return (
          <div>
            <Form.Item
              name={name}
              label={labelWithTooltip}
              required={field.required}
            >
              <RichTextEditor />
            </Form.Item>
            {aiButton}
          </div>
        );
      
      // ==================== NUMBER ====================
      case 'number':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <InputNumber
              min={opts.min}
              max={opts.max}
              step={opts.step}
              style={{ width: '100%' }}
            />
          </Form.Item>
        );
      
      // ==================== SLIDER ====================
      case 'slider':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <Slider
              min={opts.min || 0}
              max={opts.max || 100}
              step={opts.step || 1}
              marks={opts.presets}
            />
          </Form.Item>
        );
      
      // ==================== SIZE ====================
      case 'size':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <Input
              placeholder="ex: 24px, 2rem, 100%"
              addonAfter={
                <Select defaultValue="px" style={{ width: 70 }}>
                  <Option value="px">px</Option>
                  <Option value="rem">rem</Option>
                  <Option value="%">%</Option>
                  <Option value="em">em</Option>
                </Select>
              }
            />
          </Form.Item>
        );
      
      // ==================== SPACING ====================
      case 'spacing':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <Input
              placeholder="ex: 16px 24px, 2rem"
              addonBefore="📏"
            />
          </Form.Item>
        );
      
      // ==================== COLOR ====================
      case 'color':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <ColorInput presets={opts.presets} />
          </Form.Item>
        );
      
      // ==================== ICON ====================
      case 'icon': {
        const allowImage = opts.allowImage !== false;
        const imageMaxSize = opts.imageMaxSize ?? opts.maxSize;
        const imageAspectRatio = opts.imageAspectRatio ?? opts.aspectRatio;
        const imageAllowCrop = opts.imageAllowCrop ?? opts.allowCrop;

        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            {allowImage ? (
              <IconOrImagePicker
                imageMaxSize={imageMaxSize}
                imageAspectRatio={imageAspectRatio}
                imageAllowCrop={imageAllowCrop}
              />
            ) : (
              <IconPicker />
            )}
          </Form.Item>
        );
      }
      
      // ==================== IMAGE ====================
      case 'image':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <ImageUploader
              maxSize={opts.maxSize}
              aspectRatio={opts.aspectRatio}
              allowCrop={opts.allowCrop}
              aiOptimize={opts.aiSuggest}
            />
          </Form.Item>
        );
      
      // ==================== SELECT ====================
      case 'select':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <Select 
              placeholder={opts.placeholder || `Choisir ${field.label.toLowerCase()}`}
              mode={opts.mode}
              tokenSeparators={opts.mode === 'tags' ? [','] : undefined}
              maxTagCount={opts.maxItems}
            >
              {opts.choices?.map((choice) => (
                <Option key={choice.value} value={choice.value}>
                  {choice.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      // ==================== CONTACT FORM SELECTOR ====================
      case 'contact-form-selector':
        console.log('🎯 [FieldRenderer] CONTACT FORM SELECTOR RENDU:', {
          fieldId: field.id,
          name,
          currentValue: value,
          currentFormValues: currentFormValues,
          shouldRender,
          required: field.required
        });
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <ContactFormSelector
              placeholder={opts.placeholder}
              allowCreate={opts.allowCreate !== false}
            />
          </Form.Item>
        );
      
      // ==================== SIMULATOR FORM SELECTOR ====================
      case 'simulator-form-selector':
        console.log('📋 [FieldRenderer] SIMULATOR FORM SELECTOR:', { fieldId: field.id, name });
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <SimulatorFormSelector
              placeholder={opts.placeholder || 'Sélectionnez un simulateur/formulaire'}
              websiteId={aiContext?.websiteId}
            />
          </Form.Item>
        );

      // ==================== SECTION ANCHOR SELECTOR ====================
      case 'section-anchor-selector':
        const resolvedWebsiteId = opts.websiteId || aiContext?.websiteId;
        
        // 🔍 DEBUG COMPLET
        console.log('🔍 [FieldRenderer] section-anchor-selector RENDER:');
        console.log('  1. Field ID:', field.id);
        console.log('  2. Field Name Path:', name);
        console.log('  3. opts.websiteId:', opts.websiteId);
        console.log('  4. aiContext exists?', !!aiContext);
        console.log('  5. aiContext?.websiteId:', aiContext?.websiteId);
        console.log('  6. resolvedWebsiteId:', resolvedWebsiteId);
        
        if (aiContext) {
          console.log('  7. aiContext keys:', Object.keys(aiContext));
          console.log('  8. aiContext.websiteId direct:', aiContext.websiteId);
          console.log('  9. Full aiContext:', JSON.stringify(aiContext, null, 2));
        }
        
        // Sauvegarder dans window pour inspection dans la console
        (window as any).lastSectionAnchorDebug = {
          fieldId: field.id,
          name: name,
          optsWebsiteId: opts.websiteId,
          aiContext: aiContext,
          resolvedWebsiteId: resolvedWebsiteId
        };
        
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <SectionAnchorSelector
              placeholder={opts.placeholder}
              allowCustom={opts.allowCustom !== false}
              websiteId={resolvedWebsiteId}
            />
          </Form.Item>
        );
      
      // ==================== BOOLEAN ====================
      case 'boolean':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        );
      
      // ==================== ARRAY ====================
      case 'array':
        // Capturer 'name' avant Form.Item pour préserver la référence dans le render prop
        const arrayFieldName = name;
        
        return (
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>{field.label}</strong>
              {field.description && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {field.description}
                </div>
              )}
            </div>
            <Form.Item shouldUpdate noStyle>
              {(form) => {
                // Extraire la valeur depuis le form en suivant le path arrayFieldName
                const arrayValue = arrayFieldName.reduce((obj, key) => obj?.[key], form.getFieldsValue(true));
                
                // 🔥 CRITICAL: Créer un onChange qui utilise form.setFieldValue
                const handleArrayChange = (newValue: unknown) => {
                  form.setFieldValue(arrayFieldName, newValue);
                };
                
                return (
                  <ArrayFieldEditor
                    itemType={opts.itemType}
                    draggable={opts.draggable}
                    maxItems={opts.maxItems}
                    name={arrayFieldName}
                    value={arrayValue}
                    onChange={handleArrayChange}
                    aiContext={aiContext}
                    formValues={formValues || arrayValue}
                  />
                );
              }}
            </Form.Item>
          </div>
        );
      
      // ==================== GROUP ====================
      case 'group':
        // 🔥 CRITIQUE : Extraire la valeur spécifique au groupe !
        // Si name=['logo'], on doit passer value=allValues.logo aux sous-champs
        // Sinon les sous-champs reçoivent tout le form au lieu de leur valeur
        // 🆕 FIX: Utiliser currentFormValues (qui contient TOUT) pour extraire la valeur du groupe
        const groupValue = name.length > 0 && typeof currentFormValues === 'object' && currentFormValues !== null
          ? name.reduce((obj, key) => obj?.[key], currentFormValues)
          : currentFormValues;
        
        console.log('🔍 [FieldRenderer GROUP]', {
          fieldId: field.id,
          name,
          valueKeys: typeof value === 'object' ? Object.keys(value) : typeof value,
          formValueKeys: typeof currentFormValues === 'object' && currentFormValues !== null ? Object.keys(currentFormValues).slice(0, 10) : typeof currentFormValues,
          groupValueKeys: typeof groupValue === 'object' && groupValue !== null ? Object.keys(groupValue) : typeof groupValue
        });
        
        // 🔥 WRAPPER : Le groupe doit être wrappé dans un Form.Item pour préserver sa structure
        const groupFields = (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {opts.fields?.map((subField) => (
              <FieldRenderer
                key={subField.id}
                field={subField}
                value={groupValue}
                onChange={undefined} // 🔥 NE PAS passer onChange - laisser Form.Item gérer
                name={[...name, subField.id]}
                aiContext={aiContext}
                formValues={currentFormValues}
              />
            ))}
          </Space>
        );
        
        const GroupComponent = opts.collapsible ? (
          <Collapse
            defaultActiveOpen={[field.id]}
            items={[
              {
                key: field.id,
                label: field.label,
                children: groupFields
              }
            ]}
          />
        ) : (
          <Card
            title={field.label}
            size="small"
            style={{ marginBottom: 16 }}
          >
            {groupFields}
          </Card>
        );
        
        return GroupComponent;
      
      // ==================== GRID ====================
      case 'grid':
        return (
          <Form.Item
            name={name}
            label={labelWithTooltip}
            required={field.required}
          >
            <GridConfigEditor responsive={opts.responsive} />
          </Form.Item>
        );
      
      // ==================== DEFAULT ====================
      default:
        return (
          <Alert
            type="warning"
            message={`Type de champ non supporté : ${field.type}`}
            description={`Le champ "${field.label}" utilise un type inconnu.`}
            showIcon
          />
        );
    }
  };
  
  return <div className="field-renderer">{renderField()}</div>;
};

export default FieldRenderer;
