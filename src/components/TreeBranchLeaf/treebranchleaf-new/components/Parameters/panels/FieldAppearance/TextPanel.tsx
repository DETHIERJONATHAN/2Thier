import React, { useCallback, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Typography, Tooltip, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useDebouncedCallback } from '../../../../hooks/useDebouncedCallback';
import { FlexibleTooltip } from './FlexibleTooltip';
import { TOOLTIP_CONFIGS } from './tooltipConfigs';

const { Title, Text } = Typography;

// 🔍 Composant de prévisualisation avec tooltip personnalisé
const PreviewField: React.FC<{ localValues: Record<string, unknown> }> = ({ localValues }) => {
  const { helpTooltipType, helpTooltipText, helpTooltipImage } = localValues;
  
  // Construire le contenu du tooltip
  const tooltipContent = React.useMemo(() => {
    if (!helpTooltipType || helpTooltipType === 'none') return null;
    
    if (helpTooltipType === 'text') {
      return helpTooltipText ? (
        <div style={{ maxWidth: 250 }}>
          {String(helpTooltipText)}
        </div>
      ) : null;
    }
    
    if (helpTooltipType === 'image') {
      return helpTooltipImage ? (
        <div style={{ maxWidth: 300 }}>
          <img 
            src={String(helpTooltipImage)}
            alt="Image d'aide"
            style={{ 
              width: '100%', 
              height: 'auto', 
              maxHeight: 300,
              border: '1px solid #f0f0f0', 
              borderRadius: 4 
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.style.display = 'block';
            }}
          />
          <div style={{ display: 'none', color: '#ff4d4f', fontSize: 12 }}>
            ❌ Impossible de charger l'image
          </div>
        </div>
      ) : null;
    }
    
    if (helpTooltipType === 'both') {
      return (helpTooltipText || helpTooltipImage) ? (
        <div style={{ maxWidth: 300 }}>
          {helpTooltipText && (
            <div style={{ marginBottom: helpTooltipImage ? 8 : 0 }}>
              {String(helpTooltipText)}
            </div>
          )}
          {helpTooltipImage && (
            <img 
              src={String(helpTooltipImage)}
              alt="Image d'aide"
              style={{ 
                width: '100%', 
                height: 'auto', 
                maxHeight: 200,
                border: '1px solid #f0f0f0', 
                borderRadius: 4 
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.style.display = 'block';
              }}
            />
          )}
        </div>
      ) : null;
    }
    
    return null;
  }, [helpTooltipType, helpTooltipText, helpTooltipImage]);
  
  // Le champ de base
  const fieldElement = (
    <Input 
      placeholder={localValues.placeholder as string || "Prévisualisation du champ"}
      maxLength={localValues.maxLength as number || undefined}
      style={{ 
        width: localValues.size === 'sm' ? '200px' : localValues.size === 'lg' ? '400px' : '300px'
      }}
    />
  );
  
  // Avec ou sans tooltip selon la configuration
  if (tooltipContent) {
    return (
      <div>
        <Tooltip 
          title={tooltipContent}
          styles={{ root: { maxWidth: 320 } }}
        >
          {fieldElement}
        </Tooltip>
        <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
          ✨ Survolez le champ pour voir le tooltip personnalisé
        </div>
      </div>
    );
  }
  
  return fieldElement;
};

interface TextPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const TextPanel: React.FC<TextPanelProps> = ({ value = {}, onChange, readOnly }) => {
  // État local pour l'édition en temps réel
  const [localValues, setLocalValues] = useState(() => {
    const initialValues = {
      size: 'md',
      variant: 'singleline',
      placeholder: '',
      maxLength: 255,
      mask: '',
      regex: '',
      helpTooltipType: 'none',
      helpTooltipText: '',
      helpTooltipImage: '',
      ...value
    };
    
    // S'assurer que helpTooltipImage est toujours une string
    if (initialValues.helpTooltipImage && typeof initialValues.helpTooltipImage !== 'string') {
      initialValues.helpTooltipImage = '';
    }
    
    return initialValues;
  });

  // Référence au formulaire pour manipulation programmatique
  const [form] = Form.useForm();

  // Flag pour éviter les conflits entre sauvegarde manuelle et debounced
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  // ✅ INITIALISER le formulaire au montage
  useEffect(() => {
    form.setFieldsValue(localValues);
  }, [form, localValues]);

  // Synchroniser avec la valeur externe
  useEffect(() => {
    const newValues = {
      size: 'md',
      variant: 'singleline',
      placeholder: '',
      maxLength: 255,
      mask: '',
      regex: '',
      helpTooltipType: 'none',
      helpTooltipText: '',
      helpTooltipImage: '',
      ...value
    };
    
    // S'assurer que helpTooltipImage est toujours une string
    if (newValues.helpTooltipImage && typeof newValues.helpTooltipImage !== 'string') {
      newValues.helpTooltipImage = '';
    }
    
    setLocalValues(newValues);
    // ✅ SYNCHRONISER LE FORMULAIRE avec les nouvelles valeurs
    form.setFieldsValue(newValues);
    
    // 🔥 SYNCHRONISER uploadFileList avec l'image
    if (newValues.helpTooltipImage && typeof newValues.helpTooltipImage === 'string' && newValues.helpTooltipImage.trim()) {
      setUploadFileList([{
        uid: '-1',
        name: 'tooltip-image',
        status: 'done',
        url: String(newValues.helpTooltipImage)
      }]);
    } else {
      setUploadFileList([]);
    }
  }, [value, form]);

  // Sauvegarde debounced pour éviter les appels trop fréquents
  const debouncedSave = useDebouncedCallback((vals: Record<string, unknown>) => {
    console.log('🔄 [TextPanel] Sauvegarde debounced:', vals);
    onChange?.(vals);
  }, 500); // 500ms de délai comme pour les autres paramètres

  // Gestionnaire de changement avec mise à jour locale immédiate
  const handleValuesChange = useCallback((changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => {
    console.log('📝 [TextPanel] Changement:', { changedValues, allValues });
    
    // 🛑 BLOQUER si on est en train de supprimer l'image
    if (isRemovingImage) {
      console.log('🛑 [TextPanel] Suppression en cours, skip onChange');
      return;
    }
    
    // Log spécial pour les images
    if (changedValues.helpTooltipImage) {
      console.log('🖼️ [TextPanel] Image dans changedValues, taille:', String(changedValues.helpTooltipImage).length, 'caractères');
    }
    if (allValues.helpTooltipImage) {
      console.log('🖼️ [TextPanel] Image dans allValues, taille:', String(allValues.helpTooltipImage).length, 'caractères');
      console.log('🖼️ [TextPanel] Début de l\'image:', String(allValues.helpTooltipImage).substring(0, 50) + '...');
    }
    
    // Mise à jour immédiate de l'état local pour l'UI
    setLocalValues(allValues);
    
    // Ne pas utiliser debounce si on est en train d'uploader image (pour éviter conflit)
    if (isUploadingImage) {
      console.log('🖼️ [TextPanel] Upload en cours, skip debounce');
      return;
    }
    
    // Sauvegarde debounced pour les autres champs
    debouncedSave(allValues);
  }, [debouncedSave, isUploadingImage, isRemovingImage]);

  return (
    <Card size="small" variant="outlined">
      <Title level={5}>Aspect — Texte</Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={localValues}
        values={localValues} // Utiliser values au lieu d'initialValues pour la mise à jour dynamique
        onValuesChange={handleValuesChange}
        disabled={readOnly}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}
      >
        <Form.Item name="size" label={
          <FlexibleTooltip config={TOOLTIP_CONFIGS.FIELD_SIZE_IMAGE}>
            🔢 Taille
          </FlexibleTooltip>
        }>
          <Select options={[
            { value: 'sm', label: 'Petite (200px)' },
            { value: 'md', label: 'Moyenne (300px)' },
            { value: 'lg', label: 'Grande (400px)' }
          ]} />
        </Form.Item>
        
        <Form.Item name="variant" label={
          <FlexibleTooltip config={TOOLTIP_CONFIGS.TEXT_VARIANTS_IMAGE}>
            📝 Variante
          </FlexibleTooltip>
        }>
          <Select options={[
            { value: 'singleline', label: 'Ligne simple' },
            { value: 'textarea', label: 'Zone de texte' }
          ]} />
        </Form.Item>
        
        <Form.Item name="placeholder" label={
          <FlexibleTooltip config={TOOLTIP_CONFIGS.PLACEHOLDER_SIMPLE}>
            💡 Placeholder
          </FlexibleTooltip>
        }>
          <Input allowClear />
        </Form.Item>
        
        <Form.Item name="maxLength" label={
          <FlexibleTooltip config={{ title: "Nombre maximum de caractères autorisés" }}>
            📏 Longueur max
          </FlexibleTooltip>
        }>
          <Input type="number" />
        </Form.Item>
        
        <Form.Item name="mask" label={
          <FlexibleTooltip config={TOOLTIP_CONFIGS.INPUT_MASK}>
            🎭 Masque
          </FlexibleTooltip>
        }>
          <Input placeholder="99/99/9999" />
        </Form.Item>
        
        <Form.Item name="regex" label={
          <FlexibleTooltip config={{ title: "Expression régulière de validation" }}>
            🔍 Regex
          </FlexibleTooltip>
        }>
          <Input placeholder="^[A-Za-z]+$" />
        </Form.Item>

        {/* 🆕 SECTION TOOLTIP PERSONNALISÉ */}
        <div style={{ 
          gridColumn: '1 / -1', 
          marginTop: 16, 
          marginBottom: 8, 
          borderTop: '1px solid #f0f0f0', 
          paddingTop: 16 
        }}>
          <Title level={5} style={{ margin: 0, marginBottom: 12 }}>💡 Tooltip d'aide personnalisé</Title>
        </div>

        <Form.Item name="helpTooltipType" label="Type d'aide">
          <Select 
            placeholder="Choisir le type"
            options={[
              { value: 'none', label: '❌ Aucun tooltip' },
              { value: 'text', label: '📝 Texte seul' },
              { value: 'image', label: '🖼️ Image seule' },
              { value: 'both', label: '📝🖼️ Texte + Image' }
            ]} 
          />
        </Form.Item>

        <Form.Item name="helpTooltipText" label="Texte d'aide">
          <Input.TextArea 
            rows={2}
            placeholder="Entrez le texte explicatif qui apparaîtra au survol du champ..."
            disabled={!localValues.helpTooltipType || localValues.helpTooltipType === 'image'}
          />
        </Form.Item>

        <Form.Item name="helpTooltipImage" label="Image d'aide">
          <Upload
            name="tooltipImage"
            listType="picture"
            maxCount={1}
            fileList={uploadFileList}
            beforeUpload={(file) => {
              // Vérifier le type de fichier
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Vous ne pouvez uploader que des images!');
                return Upload.LIST_IGNORE;
              }
              
              // Vérifier la taille (max 5MB)
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                message.error('L\'image doit faire moins de 5MB!');
                return Upload.LIST_IGNORE;
              }
              
              // Marquer comme upload en cours pour bloquer le debounce
              setIsUploadingImage(true);
              
              // Convertir en base64 pour stockage local
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                console.log('🖼️ [TextPanel] Image convertie en base64, taille:', base64.length, 'caractères');
                
                // 🔥 Mettre à jour uploadFileList avec la nouvelle image
                setUploadFileList([{
                  uid: '-1',
                  name: file.name,
                  status: 'done',
                  url: base64
                }]);
                
                // Créer une nouvelle valeur propre sans référence circulaire
                const cleanValues = {
                  size: localValues.size || 'md',
                  variant: localValues.variant || 'singleline',
                  placeholder: localValues.placeholder || '',
                  maxLength: localValues.maxLength || 255,
                  mask: localValues.mask || '',
                  regex: localValues.regex || '',
                  helpTooltipType: localValues.helpTooltipType || 'none',
                  helpTooltipText: localValues.helpTooltipText || '',
                  helpTooltipImage: base64
                };
                
                // Mettre à jour l'état local d'abord
                setLocalValues(cleanValues);
                
                // Puis déclencher la sauvegarde immédiate (sans debounce)
                if (onChange) {
                  console.log('🖼️ [TextPanel] Sauvegarde immédiate de l\'image');
                  onChange(cleanValues);
                }
                
                // Réactiver le debounce après 1 seconde
                setTimeout(() => {
                  setIsUploadingImage(false);
                  console.log('🖼️ [TextPanel] Upload terminé, debounce réactivé');
                }, 1000);
              };
              reader.readAsDataURL(file);
              
              return false; // Empêcher l'upload automatique
            }}
            disabled={!localValues.helpTooltipType || localValues.helpTooltipType === 'text'}
            showUploadList={{
              showPreviewIcon: true,
              showRemoveIcon: true,
              showDownloadIcon: false
            }}
            onRemove={() => {
              console.log('🗑️ [TextPanel] Suppression de l\'image tooltip');
              
              // Activer le flag de blocage
              setIsRemovingImage(true);
              
              // Vider la liste de fichiers Upload IMMÉDIATEMENT
              setUploadFileList([]);
              
              // Mettre à jour l'état local immédiatement pour l'UI
              setLocalValues(prev => ({ ...prev, helpTooltipImage: null }));
              
              // Mettre à null au lieu de chaîne vide pour éviter les problèmes de sérialisation
              form.setFieldsValue({ helpTooltipImage: null });
              
              // Forcer la sauvegarde immédiate
              const currentValues = { ...form.getFieldsValue(), helpTooltipImage: null };
              console.log('💾 [TextPanel] Valeurs envoyées pour suppression:', JSON.stringify(currentValues, null, 2));
              onChange?.(currentValues);
              
              // Désactiver le flag après un court délai
              setTimeout(() => {
                setIsRemovingImage(false);
                console.log('✅ [TextPanel] Flag de suppression désactivé');
              }, 100);
              
              return true; // Confirmer la suppression
            }}
          >
            <Button 
              icon={<UploadOutlined />} 
              disabled={!localValues.helpTooltipType || localValues.helpTooltipType === 'text'}
            >
              Choisir une image
            </Button>
          </Upload>
        </Form.Item>
        
        <Form.Item name="preview" label="🔍 Prévisualisation temps réel" style={{ gridColumn: '1 / -1' }}>
          <PreviewField localValues={localValues} />
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 11 }}>
        Les paramètres sont automatiquement appliqués dans TBL.
      </Text>
    </Card>
  );
};

export default TextPanel;
