import { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Space, Upload, message, Tooltip, Badge } from 'antd';
import { DeleteOutlined, UploadOutlined, PictureOutlined, LinkOutlined, ThunderboltOutlined, BgColorsOutlined, FormatPainterOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../TreeBranchLeaf/treebranchleaf-new/components/Parameters/shared/NodeTreeSelector';
import ConditionEditorModal, { ConditionalConfig } from './ConditionEditorModal';
import StyleEditorModal, { FieldStyle } from './StyleEditorModal';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { getVariantsForSection } from '../../data/sectionStyleVariants';

const { TextArea } = Input;

interface SectionConfigPanelProps {
  section: any;
  onUpdate: (config: any) => void;
  onDelete: () => void;
  treeId?: string; // ID de l'arbre TBL pour le sélecteur
  nodeId?: string; // ID du nœud TBL actuel
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  COVER_PAGE: '📄 Page de couverture',
  COMPANY_PRESENTATION: '🏢 Présentation entreprise',
  PROJECT_SUMMARY: '📋 Résumé du projet',
  PRICING_TABLE: '💰 Tableau des prix',
  TERMS_CONDITIONS: '📜 Conditions générales',
  SIGNATURE_BLOCK: '✍️ Bloc signature',
  CONTACT_INFO: '📞 Informations de contact',
  TIMELINE: '📅 Calendrier',
  TECHNICAL_SPECS: '🔧 Spécifications techniques',
  TESTIMONIALS: '⭐ Témoignages',
  PORTFOLIO: '🎨 Portfolio',
  TEAM_PRESENTATION: '👥 Présentation équipe',
  FAQ: '❓ Questions fréquentes',
  CUSTOM_HTML: '🔤 HTML personnalisé'
};

const SectionConfigPanel = ({ section, onUpdate, onDelete }: SectionConfigPanelProps) => {
  const { api } = useAuthenticatedApi();
  const [form] = Form.useForm();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentFieldName, setCurrentFieldName] = useState<string>('');
  const [availableTrees, setAvailableTrees] = useState<Array<{ id: string; label: string; nodeId?: string }>>([]);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);
  const [loadingTrees, setLoadingTrees] = useState(false);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [currentConditionField, setCurrentConditionField] = useState<string>('section'); // 'section' ou nom du champ
  const [sectionCondition, setSectionCondition] = useState<ConditionalConfig | undefined>(section.config?.conditionalDisplay);
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [currentStyleField, setCurrentStyleField] = useState<string>('');
  const [currentStyleFieldLabel, setCurrentStyleFieldLabel] = useState<string>('');
  
  // Langues disponibles et actives
  const AVAILABLE_LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];
  const [activeLanguages, setActiveLanguages] = useState<string[]>(
    section.config?.activeLanguages || ['fr'] // Par défaut, seulement FR est actif
  );

  // Charger la liste des arbres TBL disponibles au montage
  useEffect(() => {
    const loadTrees = async () => {
      try {
        setLoadingTrees(true);
        const trees = await api.get('/api/treebranchleaf/trees') as Array<{ id: string; label: string }>;
        
        // Pour chaque arbre, récupérer le premier nœud disponible
        const treesWithNodes = await Promise.all(
          trees.map(async (tree) => {
            try {
              const nodes = await api.get(`/api/treebranchleaf/trees/${tree.id}/nodes`) as Array<{ id: string }>;
              return { ...tree, nodeId: nodes[0]?.id };
            } catch {
              return { ...tree, nodeId: undefined };
            }
          })
        );
        
        setAvailableTrees(treesWithNodes.filter(t => t.nodeId)); // Garder seulement les arbres avec au moins un nœud
        
        // Sélectionner le premier arbre par défaut
        if (treesWithNodes.length > 0 && treesWithNodes[0].nodeId) {
          setSelectedTreeNodeId(treesWithNodes[0].nodeId);
        }
      } catch (error) {
        console.error('Erreur chargement arbres TBL:', error);
        message.error('Impossible de charger les arbres TBL');
      } finally {
        setLoadingTrees(false);
      }
    };

    loadTrees();
  }, [api]);

  // Synchroniser le formulaire avec section.config quand section change
  useEffect(() => {
    const defaultValues = section.type === 'COVER_PAGE' ? {
      title: { fr: 'Titre de Votre Document', nl: 'Titel van Uw Document', de: 'Titel Ihres Dokuments', en: 'Title of Your Document' },
      subtitle: 'Sous-titre ou description courte',
      showDate: true,
      showCompanyLogo: true,
      companyImage: '', // Laissez vide par défaut pour que l'utilisateur remplisse
      backgroundImage: '', // Laissez vide par défaut
      layout: 'text-image',
      visible: true
    } : { visible: true };

    // IMPORTANT: Clone profond pour éviter les références partagées
    const clonedConfig = section.config ? JSON.parse(JSON.stringify(section.config)) : {};
    const mergedValues = { ...defaultValues, ...clonedConfig };
    
    // Mettre à jour le formulaire SEULEMENT si les valeurs ont changé
    const currentValues = form.getFieldsValue();
    const hasChanged = JSON.stringify(currentValues) !== JSON.stringify(mergedValues);
    
    if (hasChanged) {
      form.setFieldsValue(mergedValues);
    }
  }, [section, form]); // Surveiller toute la section

  const handleValuesChange = (_: any, allValues: any) => {
    // Mettre à jour immédiatement la section avec les nouvelles valeurs
    console.log('[SectionConfigPanel] Form values changed:', allValues);
    console.log('[SectionConfigPanel] Current section before update:', section);
    
    // Sauvegarder les langues actives dans la config
    allValues.activeLanguages = activeLanguages;
    
    // CRITIQUE: Fusionner _fieldStyles existants avec les nouveaux
    // pour éviter de perdre les styles des champs non affichés dans le formulaire
    const existingFieldStyles = section.config?._fieldStyles || {};
    const newFieldStyles = allValues._fieldStyles || {};
    const mergedFieldStyles = { ...existingFieldStyles, ...newFieldStyles };
    
    const updatedSection = { 
      ...section, 
      config: { 
        ...allValues, 
        _fieldStyles: mergedFieldStyles 
      } 
    };
    console.log('[SectionConfigPanel] Updated section:', updatedSection);
    onUpdate(updatedSection);
  };

  // Ouvrir le sélecteur pour un champ spécifique
  const openTreeSelector = (fieldName: string) => {
    if (!selectedTreeNodeId) {
      message.warning('Aucun arbre TBL disponible. Créez d\'abord un arbre dans le module TreeBranchLeaf.');
      return;
    }
    setCurrentFieldName(fieldName);
    setSelectorOpen(true);
  };

  // Gérer la sélection depuis l'arborescence TBL
  const handleTreeSelect = (val: NodeTreeSelectorValue) => {
    const currentValues = form.getFieldsValue();
    const newValues = { ...currentValues, [currentFieldName]: val.ref };
    form.setFieldsValue(newValues);
    handleValuesChange(null, newValues);
    setSelectorOpen(false);
    message.success('Référence TBL ajoutée');
  };

  // Ouvrir l'éditeur de conditions
  const openConditionEditor = (fieldName: string = 'section') => {
    setCurrentConditionField(fieldName);
    setConditionModalOpen(true);
  };

  // Sauvegarder la configuration de condition
  const handleSaveCondition = (config: ConditionalConfig) => {
    if (currentConditionField === 'section') {
      // Condition sur toute la section
      setSectionCondition(config);
      const currentValues = form.getFieldsValue();
      const newValues = { ...currentValues, conditionalDisplay: config };
      form.setFieldsValue(newValues);
      handleValuesChange(null, newValues);
    } else {
      // Condition sur un champ spécifique
      const currentValues = form.getFieldsValue();
      // IMPORTANT: Créer une COPIE pour éviter les mutations
      const conditionalFields = currentValues._conditionalFields ? { ...currentValues._conditionalFields } : {};
      conditionalFields[currentConditionField] = { ...config }; // Copier la config aussi
      const newValues = { 
        ...currentValues, 
        _conditionalFields: conditionalFields 
      };
      form.setFieldsValue(newValues);
      handleValuesChange(null, newValues);
    }
    message.success('Condition configurée');
  };

  // Ouvrir l'éditeur de style pour un champ
  const openStyleEditor = (name: string, label: string) => {
    setCurrentStyleField(name);
    setCurrentStyleFieldLabel(label);
    setStyleModalOpen(true);
  };

  // Sauvegarder le style d'un champ
  const handleSaveStyle = (style: FieldStyle) => {
    const currentValues = form.getFieldsValue();
    // IMPORTANT: Créer une COPIE PROFONDE pour éviter les mutations entre champs
    // JSON.parse/stringify pour copier en profondeur tous les styles existants
    const existingFieldStyles = currentValues._fieldStyles 
      ? JSON.parse(JSON.stringify(currentValues._fieldStyles))
      : {};
    
    // Ajouter/mettre à jour le style du champ actuel SANS toucher aux autres
    existingFieldStyles[currentStyleField] = { ...style };
    
    const newValues = { 
      ...currentValues, 
      _fieldStyles: existingFieldStyles 
    };
    form.setFieldsValue(newValues);
    handleValuesChange(null, newValues);
    message.success('Style appliqué');
  };

  // Créer des champs multilingues pour les langues actives uniquement (Input)
  const renderMultilingualInput = (baseName: string, labelBase: string, placeholder: Record<string, string>) => {
    return activeLanguages.map(lang => {
      const langInfo = AVAILABLE_LANGUAGES.find(l => l.code === lang);
      if (!langInfo) return null;
      
      const fieldName = [baseName, lang];
      const label = `${labelBase} ${langInfo.flag} ${langInfo.label.toUpperCase()}`;
      const placeholderText = placeholder[lang] || placeholder['fr'] || '';
      
      return (
        <Form.Item key={`${baseName}-${lang}`} name={fieldName} label={label}>
          <Input placeholder={placeholderText} />
        </Form.Item>
      );
    });
  };

  // Créer des champs multilingues pour les langues actives uniquement (TextArea)
  const renderMultilingualField = (baseName: string, labelBase: string, placeholder: Record<string, string>, rows: number = 1) => {
    return activeLanguages.map(lang => {
      const langInfo = AVAILABLE_LANGUAGES.find(l => l.code === lang);
      if (!langInfo) return null;
      
      const fieldName = [baseName, lang];
      const label = `${labelBase} ${langInfo.flag} ${langInfo.label.toUpperCase()}`;
      const placeholderText = placeholder[lang] || placeholder['fr'] || '';
      
      return (
        <Form.Item key={`${baseName}-${lang}`} name={fieldName} label={label}>
          <TextArea rows={rows} placeholder={placeholderText} />
        </Form.Item>
      );
    });
  };

  // Créer un champ avec sélecteur TBL ET bouton Condition
  const renderFieldWithSelector = (name: string | string[], label: string, placeholder: string, rows: number = 1) => {
    const fieldName = Array.isArray(name) ? name.join('.') : name;
    const hasCondition = section.config?._conditionalFields?.[fieldName];
    const hasStyle = section.config?._fieldStyles?.[fieldName];
    
    return (
      <Form.Item name={name} label={label}>
        <Space.Compact style={{ width: '100%' }}>
          {rows > 1 ? (
            <TextArea rows={rows} placeholder={placeholder} style={{ flex: 1 }} />
          ) : (
            <Input placeholder={placeholder} style={{ flex: 1 }} />
          )}
          <Tooltip title={availableTrees.length > 0 ? "Sélectionner depuis l'arborescence TBL" : "Aucun arbre TBL disponible"}>
            <Button
              icon={<LinkOutlined />}
              onClick={() => openTreeSelector(fieldName)}
              disabled={!selectedTreeNodeId}
              loading={loadingTrees}
            >
              TBL
            </Button>
          </Tooltip>
          <Tooltip title={hasCondition ? "Condition configurée" : "Ajouter une condition d'affichage"}>
            <Badge dot={hasCondition} color="green">
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => openConditionEditor(fieldName)}
                type={hasCondition ? "primary" : "default"}
                ghost={hasCondition}
              >
                Cond.
              </Button>
            </Badge>
          </Tooltip>
          <Tooltip title={hasStyle ? "Style personnalisé configuré" : "Personnaliser le style"}>
            <Badge dot={hasStyle} color="blue">
              <Button
                icon={<BgColorsOutlined />}
                onClick={() => openStyleEditor(fieldName, label)}
                type={hasStyle ? "primary" : "default"}
                ghost={hasStyle}
              >
                Style
              </Button>
            </Badge>
          </Tooltip>
        </Space.Compact>
      </Form.Item>
    );
  };

  // Configuration de l'upload d'images
  const getUploadProps = (fieldName: string): UploadProps => ({
    name: 'file',
    action: 'http://localhost:4000/api/image-upload/upload',
    headers: {
      // L'API d'upload gère automatiquement l'auth via cookies
    },
    maxCount: 1,
    listType: 'picture',
    onChange(info) {
      if (info.file.status === 'uploading') {
        console.log('[Upload] Uploading:', info.file.name);
      }
      if (info.file.status === 'done') {
        console.log('[Upload] Success response:', info.file.response);
        const imageUrl = info.file.response?.url;
        if (imageUrl) {
          // Mettre à jour le champ du formulaire avec l'URL de l'image
          const currentValues = form.getFieldsValue();
          currentValues[fieldName] = imageUrl;
          form.setFieldsValue(currentValues);
          handleValuesChange(null, currentValues);
          message.success(`${info.file.name} uploadé avec succès`);
        } else {
          message.error('Erreur: URL de l\'image non retournée');
        }
      } else if (info.file.status === 'error') {
        console.error('[Upload] Error:', info.file.error);
        message.error(`Erreur upload ${info.file.name}: ${info.file.error?.message || 'Inconnue'}`);
      }
    },
    onRemove() {
      const currentValues = form.getFieldsValue();
      currentValues[fieldName] = '';
      form.setFieldsValue(currentValues);
      handleValuesChange(null, currentValues);
    }
  });

  // Render le sélecteur de variante de style (UNIVERSEL pour tous types de sections)
  const renderStyleVariantSelector = () => {
    const variants = getVariantsForSection(section.type);
    
    return (
      <Form.Item 
        name="styleVariant" 
        label="🎨 Variante visuelle"
        initialValue="modern"
      >
        <Select placeholder="Choisissez un style">
          {variants.map(variant => (
            <Select.Option key={variant.value} value={variant.value}>
              {variant.label} - {variant.description}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    );
  };

  const renderConfigFields = () => {
    switch (section.type) {
      case 'COVER_PAGE':
        return (
          <>
            {renderStyleVariantSelector()}
            {activeLanguages.map(lang => {
              const langInfo = AVAILABLE_LANGUAGES.find(l => l.code === lang);
              if (!langInfo) return null;
              const placeholders: Record<string, string> = {
                fr: 'Titre ou {{client.name}}',
                nl: 'Titel of {{client.name}}',
                de: 'Titel oder {{client.name}}',
                en: 'Title or {{client.name}}'
              };
              return renderFieldWithSelector(
                ['title', lang],
                `Titre ${langInfo.flag} ${langInfo.label.toUpperCase()}`,
                placeholders[lang] || placeholders['fr']
              );
            })}
            {renderFieldWithSelector('subtitle', 'Sous-titre', 'Sous-titre ou {{project.title}}')}
            <Form.Item name="backgroundImage" label="Image de fond">
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="URL de l'image ou uploadez" />
                <Upload {...getUploadProps('backgroundImage')}>
                  <Button icon={<UploadOutlined />}>Upload</Button>
                </Upload>
                <Button
                  icon={<FormatPainterOutlined />}
                  onClick={() => {
                    setCurrentStyleField('backgroundImage');
                    setCurrentStyleFieldLabel('Image de fond');
                    setStyleModalOpen(true);
                  }}
                >
                  Style
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="companyImage" label="Logo entreprise">
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="URL du logo ou uploadez" />
                <Upload {...getUploadProps('companyImage')}>
                  <Button icon={<PictureOutlined />}>Upload</Button>
                </Upload>
                <Button
                  icon={<FormatPainterOutlined />}
                  onClick={() => {
                    setCurrentStyleField('companyImage');
                    setCurrentStyleFieldLabel('Logo entreprise');
                    setStyleModalOpen(true);
                  }}
                >
                  Style
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="showDate" label="Afficher la date" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="layout" label="Disposition">
              <Select defaultValue="text-image">
                <Select.Option value="text-only">Texte seul</Select.Option>
                <Select.Option value="text-image">Texte + Image</Select.Option>
                <Select.Option value="image-text">Image + Texte</Select.Option>
                <Select.Option value="two-columns">2 colonnes</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="showLogo" label="Afficher le logo" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="showStats" label="Afficher statistiques" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="statsData" label="Données statistiques (si activé)">
              <TextArea rows={2} placeholder='[{"label":"Projets","value":"100+"},{"label":"Clients","value":"50+"}]' />
            </Form.Item>
            <Form.Item name="showCompanyLogo" label="Afficher logo entreprise" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        );

      case 'COMPANY_PRESENTATION':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualField('description', 'Description', {
              fr: 'Présentation de l\'entreprise',
              nl: 'Bedrijfspresentatie',
              de: 'Unternehmenspräsentation',
              en: 'Company presentation'
            }, 4)}
            <Form.Item name="companyImage" label="Image entreprise">
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="URL de l'image ou uploadez" />
                <Upload {...getUploadProps('companyImage')}>
                  <Button icon={<PictureOutlined />}>Upload</Button>
                </Upload>
                <Button
                  icon={<FormatPainterOutlined />}
                  onClick={() => {
                    setCurrentStyleField('companyImage');
                    setCurrentStyleFieldLabel('Image entreprise');
                    setStyleModalOpen(true);
                  }}
                >
                  Style
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="layout" label="Disposition">
              <Select defaultValue="text-image">
                <Select.Option value="text-only">Texte seul</Select.Option>
                <Select.Option value="text-image">Texte + Image</Select.Option>
                <Select.Option value="image-text">Image + Texte</Select.Option>
                <Select.Option value="two-columns">2 colonnes</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="showStats" label="Afficher statistiques" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="statsData" label="Données statistiques (JSON)">
              <TextArea rows={2} placeholder='[{"label":"Projets","value":"100+"},{"label":"Clients","value":"50+"}]' />
            </Form.Item>
          </>
        );

      case 'PRICING_TABLE':
        return (
          <> {renderStyleVariantSelector()}
            {renderMultilingualInput('tableTitle', 'Titre du tableau', {
              fr: 'Détail des prix',
              nl: 'Prijsdetails',
              de: 'Preisdetails',
              en: 'Price details'
            })}
            <Form.Item name="tableStyle" label="Style de tableau">
              <Select defaultValue="striped">
                <Select.Option value="simple">Simple</Select.Option>
                <Select.Option value="striped">Lignes alternées</Select.Option>
                <Select.Option value="bordered">Avec bordures</Select.Option>
                <Select.Option value="modern">Moderne</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="showVAT" label="Afficher TVA" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="vatRate" label="Taux TVA (%)">
              <InputNumber min={0} max={50} defaultValue={21} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="showDiscount" label="Afficher réductions" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="showQuantity" label="Afficher quantités" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showUnitPrice" label="Afficher prix unitaires" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="currency" label="Devise">
              <Select defaultValue="EUR">
                <Select.Option value="EUR">€ Euro</Select.Option>
                <Select.Option value="USD">$ Dollar</Select.Option>
                <Select.Option value="GBP">£ Livre</Select.Option>
                <Select.Option value="CHF">CHF Franc suisse</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="highlightTotal" label="Mettre en évidence le total" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        );

      case 'TERMS_CONDITIONS':
        return (
          <>
            {renderMultilingualInput('termsTitle', 'Titre', {
              fr: 'Conditions générales',
              nl: 'Algemene voorwaarden',
              de: 'Allgemeine Geschäftsbedingungen',
              en: 'Terms and Conditions'
            })}
            {renderMultilingualField('termsText', 'Texte', {
              fr: 'Texte des conditions...',
              nl: 'Algemene voorwaarden...',
              de: 'Bedingungen...',
              en: 'Terms text...'
            }, 6)}
            <Form.Item name="fontSize" label="Taille du texte">
              <InputNumber min={8} max={14} defaultValue={10} />
            </Form.Item>
          </>
        );

      case 'SIGNATURE_BLOCK':
        return (
          <>
            <Form.Item name="showDate" label="Afficher date" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showLocation" label="Afficher lieu" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="signatureLabel" label="Label signature">
              <Input placeholder="Signature du client" />
            </Form.Item>
            <Form.Item name="showCompanySignature" label="Signature entreprise" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      case 'TIMELINE':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualInput('timelineTitle', 'Titre', {
              fr: 'Calendrier du projet',
              nl: 'Projectplanning',
              de: 'Projektplan',
              en: 'Project Timeline'
            })}
            <Form.Item name="timelineData" label="Données du calendrier (JSON)">
              <TextArea rows={6} placeholder='[{"phase":"Phase 1","duration":"2 semaines","tasks":["Tâche 1","Tâche 2"]}]' />
            </Form.Item>
            <Form.Item name="showMilestones" label="Afficher jalons" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="displayMode" label="Mode d'affichage">
              <Select defaultValue="vertical">
                <Select.Option value="vertical">Vertical</Select.Option>
                <Select.Option value="horizontal">Horizontal</Select.Option>
                <Select.Option value="gantt">Gantt</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'PORTFOLIO':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualInput('portfolioTitle', 'Titre', {
              fr: 'Nos réalisations',
              nl: 'Onze realisaties',
              de: 'Unsere Projekte',
              en: 'Our Projects'
            })}
            <Form.Item name="portfolioItems" label="Projets (JSON)">
              <TextArea rows={8} placeholder='[{"name":"Projet 1","image":"url","description":"Description"}]' />
            </Form.Item>
            <Form.Item name="itemsPerRow" label="Projets par ligne">
              <InputNumber min={1} max={4} defaultValue={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="showDescriptions" label="Afficher descriptions" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        );

      case 'CUSTOM_HTML':
        return (
          <>
            <Form.Item name="htmlContent" label="Code HTML">
              <TextArea rows={10} placeholder="<div>Votre HTML personnalisé...</div>" />
            </Form.Item>
            <Form.Item name="customCSS" label="CSS personnalisé">
              <TextArea rows={4} placeholder=".custom { color: red; }" />
            </Form.Item>
            <Form.Item name="allowJavaScript" label="Autoriser JavaScript" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      case 'CONTACT_INFO':
        return (
          <>
            <Form.Item name="showAddress" label="Adresse" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showPhone" label="Téléphone" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showEmail" label="Email" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showWebsite" label="Site web" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showSocial" label="Réseaux sociaux" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      case 'PROJECT_SUMMARY':
        return (
          <>            {renderStyleVariantSelector()}            {renderMultilingualField('summaryTitle', 'Titre', {
              fr: 'Résumé du projet',
              nl: 'Projectsamenvatting',
              de: 'Projektzusammenfassung',
              en: 'Project Summary'
            }, 1).map(field => ({ ...field, props: { ...field.props, children: <Input {...field.props.children.props} /> } }))}
            {renderMultilingualField('summaryText', 'Description', {
              fr: 'Description du projet',
              nl: 'Projectbeschrijving',
              de: 'Projektbeschreibung',
              en: 'Project Description'
            }, 4)}
            <Form.Item name="showObjectives" label="Afficher objectifs" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showScope" label="Afficher périmètre" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        );

      case 'TECHNICAL_SPECS':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualInput('specsTitle', 'Titre', {
              fr: 'Spécifications techniques',
              nl: 'Technische specificaties',
              de: 'Technische Spezifikationen',
              en: 'Technical Specifications'
            })}
            <Form.Item name="specsData" label="Spécifications (JSON)">
              <TextArea rows={8} placeholder='[{"category":"Infrastructure","specs":[{"name":"Serveur","value":"AWS EC2"}]}]' />
            </Form.Item>
            <Form.Item name="showDiagrams" label="Afficher diagrammes" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      case 'TESTIMONIALS':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualInput('testimonialsTitle', 'Titre', {
              fr: 'Témoignages clients',
              nl: 'Klanttestimonials',
              de: 'Kundenbewertungen',
              en: 'Customer Testimonials'
            })}
            <Form.Item name="testimonialsData" label="Témoignages (JSON)">
              <TextArea rows={8} placeholder='[{"name":"Client X","company":"Entreprise","text":"Témoignage...","rating":5}]' />
            </Form.Item>
            <Form.Item name="showRatings" label="Afficher notes" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showCompanyLogos" label="Afficher logos entreprises" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      case 'TEAM_PRESENTATION':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualInput('teamTitle', 'Titre', {
              fr: 'Notre équipe',
              nl: 'Ons team',
              de: 'Unser Team',
              en: 'Our Team'
            })}
            <Form.Item name="teamMembers" label="Membres de l'équipe (JSON)">
              <TextArea rows={8} placeholder='[{"name":"John Doe","role":"CEO","photo":"url","bio":"Bio..."}]' />
            </Form.Item>
            <Form.Item name="showPhotos" label="Afficher photos" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="showBios" label="Afficher biographies" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      case 'FAQ':
        return (
          <>
            {renderStyleVariantSelector()}
            {renderMultilingualInput('faqTitle', 'Titre', {
              fr: 'Questions fréquentes',
              nl: 'Veelgestelde vragen',
              de: 'Häufig gestellte Fragen',
              en: 'Frequently Asked Questions'
            })}
            <Form.Item name="faqData" label="Questions-Réponses (JSON)">
              <TextArea rows={10} placeholder='[{"question":"Question?","answer":"Réponse..."}]' />
            </Form.Item>
            <Form.Item name="showIcons" label="Afficher icônes" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        );

      default:
        return (
          <Form.Item name="content" label="Contenu">
            <TextArea rows={4} placeholder="Contenu de la section" />
          </Form.Item>
        );
    }
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#262626' }}>
            {SECTION_TYPE_LABELS[section.type] || section.type}
          </h4>
        <Space>
          <Tooltip title={sectionCondition ? "Condition de section configurée" : "Ajouter condition d'affichage à la section"}>
            <Badge dot={sectionCondition} color="green">
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => openConditionEditor('section')}
                type={sectionCondition ? "primary" : "default"}
                ghost={sectionCondition}
              >
                Condition
              </Button>
            </Badge>
          </Tooltip>
          <Button
            danger
            size="small"
            type="text"
            icon={<DeleteOutlined />}
            onClick={onDelete}
          >
            Supprimer
          </Button>
        </Space>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 4 }}>
          <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>🌐 Langues actives:</span>
          <Select
            mode="multiple"
            size="small"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Sélectionner les langues"
            value={activeLanguages}
            onChange={(values) => {
              if (values.length === 0) {
                message.warning('Au moins une langue doit être activée');
                return;
              }
              setActiveLanguages(values);
              // Mettre à jour immédiatement dans la config
              const currentValues = form.getFieldsValue();
              handleValuesChange(null, { ...currentValues, activeLanguages: values });
            }}
          >
            {AVAILABLE_LANGUAGES.map(lang => (
              <Select.Option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          // Valeurs par d\u00e9faut pour COVER_PAGE
          title: {
            fr: 'Titre de Votre Document',
            nl: 'Titel van Uw Document',
            de: 'Titel Ihres Dokuments',
            en: 'Title of Your Document'
          },
          subtitle: 'Sous-titre ou description courte',
          logoPosition: 'top-left',
          showDate: true,
          showCompanyLogo: true,
          layout: 'text-image',
          visible: true,
          ...section.config // Les vraies valeurs de la section \u00e9crasent les d\u00e9fauts
        }}
        onValuesChange={handleValuesChange}
        size="small"
      >
        <Form.Item name="sectionTitle" label="Titre de la section">
          <Input placeholder="Titre affiché dans le PDF" />
        </Form.Item>

        {renderConfigFields()}

        <Form.Item 
          name="visible" 
          label="Section visible" 
          valuePropName="checked" 
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Form>

      {/* Sélection de l'arbre TBL (optionnel - afficher si plusieurs arbres) */}
      {availableTrees.length > 1 && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              🌳 Arbre TBL pour les références dynamiques :
            </span>
            <Select
              value={selectedTreeNodeId}
              onChange={setSelectedTreeNodeId}
              style={{ width: '100%' }}
              placeholder="Choisir un arbre TBL"
            >
              {availableTrees.map(tree => (
                <Select.Option key={tree.nodeId} value={tree.nodeId}>
                  {tree.label}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </div>
      )}

      {/* Modal de sélection dans l'arborescence TBL */}
      {selectedTreeNodeId && (
        <NodeTreeSelector
          nodeId={selectedTreeNodeId} 
          open={selectorOpen}
          onClose={() => setSelectorOpen(false)}
          onSelect={handleTreeSelect}
        />
      )}

      {/* Modal d'édition des conditions */}
      <ConditionEditorModal
        open={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        onSave={handleSaveCondition}
        initialConfig={
          currentConditionField === 'section' 
            ? sectionCondition 
            : section.config?._conditionalFields?.[currentConditionField]
        }
        nodeId={selectedTreeNodeId || undefined}
      />
      {/* Modal d'édition des styles */}
      <StyleEditorModal
        open={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        onSave={handleSaveStyle}
        initialStyle={section.config?._fieldStyles?.[currentStyleField]}
        fieldLabel={currentStyleFieldLabel}
        fieldName={currentStyleField}
      />    </div>
  );
};

export default SectionConfigPanel;
