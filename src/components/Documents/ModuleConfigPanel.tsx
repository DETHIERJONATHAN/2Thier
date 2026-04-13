/**
 * 🔧 MODULE CONFIG PANEL - Panneau de configuration d'un module
 */

import { useEffect, useState, useRef } from 'react';
import { Form, Input, InputNumber, Select, Switch, ColorPicker, Button, Collapse, Space, Upload, message, Badge, Tooltip, Tabs, Tag, Divider, ConfigProvider } from 'antd';
import { DeleteOutlined, CopyOutlined, UploadOutlined, LinkOutlined, LoadingOutlined, ThunderboltOutlined, ApiOutlined, UserOutlined, FileTextOutlined, HomeOutlined } from '@ant-design/icons';
import { ModuleInstance } from './types';
import { getModuleById, ConfigField } from './ModuleRegistry';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../TreeBranchLeaf/treebranchleaf-new/components/Parameters/shared/NodeTreeSelector';
import ConditionEditorModal, { ConditionalConfig } from './ConditionEditorModal';
import PricingLinesEditor, { PricingLine } from './PricingLinesEditor';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';
import { logger } from '../../lib/logger';

const { TextArea } = Input;

/**
 * 📋 VARIABLES LEAD PRÉDÉFINIES
 * Ces variables seront remplacées par les données du Lead lors de la génération
 */
const LEAD_VARIABLES = [
  { key: 'lead.firstName', label: 'Prénom', icon: '👤', category: 'contact' },
  { key: 'lead.lastName', label: 'Nom', icon: '👤', category: 'contact' },
  { key: 'lead.fullName', label: 'Nom complet', icon: '👤', category: 'contact' },
  { key: 'lead.email', label: 'Email', icon: '📧', category: 'contact' },
  { key: 'lead.phone', label: 'Téléphone', icon: '📞', category: 'contact' },
  { key: 'lead.company', label: 'Société', icon: '🏢', category: 'contact' },
  { key: 'lead.website', label: 'Site web', icon: '🌐', category: 'contact' },
  { key: 'lead.linkedin', label: 'LinkedIn', icon: '💼', category: 'contact' },
  { key: 'lead.address', label: 'Adresse', icon: '📍', category: 'address' },
  { key: 'lead.city', label: 'Ville', icon: '🏙️', category: 'address' },
  { key: 'lead.postalCode', label: 'Code postal', icon: '📮', category: 'address' },
  { key: 'lead.country', label: 'Pays', icon: '🌍', category: 'address' },
  { key: 'lead.status', label: 'Statut', icon: '📊', category: 'info' },
  { key: 'lead.source', label: 'Source', icon: '📥', category: 'info' },
  { key: 'lead.leadNumber', label: 'Numéro Lead', icon: '🔢', category: 'info' },
  { key: 'lead.notes', label: 'Notes', icon: '📝', category: 'info' },
  { key: 'lead.createdAt', label: 'Date création', icon: '📅', category: 'dates' },
  { key: 'lead.lastContactDate', label: 'Dernier contact', icon: '📅', category: 'dates' },
];

/**
 * 📋 VARIABLES DEVIS PRÉDÉFINIES
 */
const QUOTE_VARIABLES = [
  { key: 'quote.number', label: 'Numéro devis', icon: '🔢', category: 'info' },
  { key: 'quote.date', label: 'Date du devis', icon: '📅', category: 'info' },
  { key: 'quote.validUntil', label: 'Valide jusqu\'au', icon: '📅', category: 'info' },
  { key: 'quote.totalHT', label: 'Total HT', icon: '💰', category: 'amounts' },
  { key: 'quote.totalTVA', label: 'Total TVA', icon: '💰', category: 'amounts' },
  { key: 'quote.totalTTC', label: 'Total TTC', icon: '💰', category: 'amounts' },
  { key: 'quote.discount', label: 'Remise', icon: '🏷️', category: 'amounts' },
  { key: 'quote.status', label: 'Statut', icon: '📊', category: 'info' },
];

/**
 * 📋 VARIABLES ORGANISATION
 */
const ORG_VARIABLES = [
  { key: 'org.name', label: 'Nom société', icon: '🏢', category: 'info' },
  { key: 'org.email', label: 'Email société', icon: '📧', category: 'contact' },
  { key: 'org.phone', label: 'Téléphone société', icon: '📞', category: 'contact' },
  { key: 'org.address', label: 'Adresse société', icon: '📍', category: 'address' },
  { key: 'org.vatNumber', label: 'N° TVA', icon: '📋', category: 'legal' },
  { key: 'org.bankAccount', label: 'IBAN', icon: '🏦', category: 'legal' },
];

interface ModuleConfigPanelProps {
  moduleInstance: ModuleInstance;
  onUpdate: (updates: Partial<ModuleInstance>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  tblNodeId?: string; // ID du nœud TBL pour le sélecteur (optionnel)
}

// Flag global pour bloquer le nettoyage pendant upload async
let isUploadingGlobal = false;

const ModuleConfigPanel = ({
  moduleInstance,
  onUpdate,
  onDelete,
  onDuplicate,
  tblNodeId,
}: ModuleConfigPanelProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();
  const moduleDef = getModuleById(moduleInstance.moduleId);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState<string | null>(null);
  const lastModuleIdRef = useRef<string | null>(null);
  
  // États pour le sélecteur TBL
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentFieldKey, setCurrentFieldKey] = useState<string>('');
  const [_availableTrees, setAvailableTrees] = useState<Array<{ id: string; label: string; nodeId?: string }>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(tblNodeId || null);
  const [loadingTrees, setLoadingTrees] = useState(false);
  
  // États pour les conditions
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [moduleCondition, setModuleCondition] = useState<ConditionalConfig | undefined>(
    moduleInstance.config?._conditionalDisplay
  );

  // 🔥 Synchroniser moduleCondition quand moduleInstance change
  useEffect(() => {
    setModuleCondition(moduleInstance.config?._conditionalDisplay);
  }, [moduleInstance.id, moduleInstance.config?._conditionalDisplay]);

  // Charger les arbres TBL disponibles
  useEffect(() => {
    const loadTrees = async () => {
      try {
        setLoadingTrees(true);
        const trees = await api.get('/api/treebranchleaf/trees') as Array<{ id: string; label: string }>;
        
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
        
        setAvailableTrees(treesWithNodes.filter(t => t.nodeId));
        
        if (!selectedNodeId && treesWithNodes.length > 0 && treesWithNodes[0].nodeId) {
          setSelectedNodeId(treesWithNodes[0].nodeId);
        }
      } catch (error) {
        logger.error('Erreur chargement arbres TBL:', error);
      } finally {
        setLoadingTrees(false);
      }
    };

    loadTrees();
  }, [api, selectedNodeId]);

  useEffect(() => {
    // Ne pas interférer pendant un upload en cours (vérifier aussi le flag global)
    if (uploadingField || isUploadingGlobal) {
      logger.debug('⏳ useEffect bloqué - upload en cours');
      return;
    }
    
    if (moduleInstance.config) {
      // Nettoyer les valeurs invalides seulement au changement de module (pas pendant l'upload)
      const cleanConfig = { ...moduleInstance.config };
      const isNewModule = lastModuleIdRef.current !== moduleInstance.id;
      
      Object.keys(cleanConfig).forEach(key => {
        const val = cleanConfig[key];
        if (typeof val === 'string' && (val.startsWith('file:///') || val.includes('fakepath'))) {
          // Ne nettoyer que si c'est un nouveau module sélectionné
          if (isNewModule) {
            logger.debug('🧹 Nettoyage URL locale invalide:', key);
            cleanConfig[key] = '';
          }
        }
      });
      
      lastModuleIdRef.current = moduleInstance.id;
      form.setFieldsValue(cleanConfig);
    }
  }, [moduleInstance.id, moduleInstance.config, form, uploadingField]);

  if (!moduleDef) {
    return <div style={{ padding: '20px', color: '#ff4d4f' }}>Module non trouvé</div>;
  }

  const handleValuesChange = (_: unknown, allValues: unknown) => {
    // Convertir les couleurs
    const processedValues = { ...allValues };
    Object.keys(processedValues).forEach(key => {
      if (processedValues[key]?.toHexString) {
        processedValues[key] = processedValues[key].toHexString();
      }
    });
    
    onUpdate({ config: { ...moduleInstance.config, ...processedValues } });
  };

  const handleThemeChange = (themeId: string) => {
    // Pour le module BACKGROUND, envoyer aussi la config pour synchroniser le fond
    if (moduleInstance.moduleId === 'BACKGROUND') {
      onUpdate({ themeId, config: moduleInstance.config });
    } else {
      onUpdate({ themeId });
    }
  };

  const renderField = (field: ConfigField) => {
    const commonProps = {
      key: field.key,
      label: field.label,
      name: field.key,
    };

    switch (field.type) {
      case 'text':
        return (
          <Form.Item {...commonProps}>
            <Input placeholder={field.placeholder} />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item {...commonProps}>
            <TextArea rows={3} placeholder={field.placeholder} />
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item {...commonProps}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'color':
        return (
          <Form.Item {...commonProps}>
            <ColorPicker format="hex" showText />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item {...commonProps}>
            <Select options={field.options} />
          </Form.Item>
        );

      case 'toggle':
        return (
          <Form.Item {...commonProps} valuePropName="checked">
            <Switch />
          </Form.Item>
        );

      case 'icon-picker': {
        // ═══ Bibliothèque d'icônes avec mapping vers catégorie vectorielle PDF ═══
        // Chaque emoji est mappé vers une clé icoFns du renderer PDF
        // Format stocké : "icoCategory:emoji" (ex: "lightning:⚡")
        // Le PDF extrait la catégorie, le frontend extrait l'emoji
        
        // Mapping emoji → catégorie vectorielle icoFns
        const EMOJI_TO_CAT: Record<string, string> = {
          // ⚡ energy → lightning / sun / fire / leaf / drop / globe
          '⚡': 'lightning', '🔋': 'lightning', '🔌': 'lightning', '🪫': 'lightning',
          '💡': 'sun', '☀️': 'sun', '🌞': 'sun', '🌤️': 'sun', '🔆': 'sun',
          '♻️': 'leaf', '🌱': 'leaf', '🍃': 'leaf', '🌿': 'leaf',
          '🌍': 'globe', '🏭': 'house', '⛽': 'car', '🛢️': 'gear',
          '💨': 'drop', '🌊': 'drop', '🔥': 'fire',
          // 💰 money → coin / diamond / chart / target
          '💰': 'coin', '💵': 'coin', '💶': 'coin', '💷': 'coin', '💸': 'coin',
          '🪙': 'coin', '💎': 'diamond', '🏦': 'house', '💳': 'coin', '🧾': 'chart',
          '📊': 'chart', '📈': 'chart', '📉': 'chart', '💹': 'chart',
          '🤑': 'coin', '🏧': 'coin', '💲': 'coin', '🫰': 'coin', '🎯': 'target', '🎰': 'diamond',
          // ⏱️ time → clock / leaf / chart / star
          '⏱️': 'clock', '⏰': 'clock', '🕐': 'clock', '🕑': 'clock', '🕒': 'clock',
          '🕓': 'clock', '🕔': 'clock', '🕕': 'clock', '⏳': 'clock', '⌛': 'clock',
          '📅': 'clock', '📆': 'clock', '🔄': 'leaf', '🔁': 'leaf', '🔃': 'leaf',
          '⏩': 'clock', '⏪': 'clock', '🗓️': 'clock', '📌': 'target', '🎗️': 'star',
          // 📊 chart / données
          '📋': 'chart', '📝': 'chart', '📑': 'chart', '🧮': 'chart',
          '📐': 'chart', '📏': 'chart', '🔢': 'chart', '🔣': 'chart',
          '➕': 'chart', '➖': 'chart', '✖️': 'chart', '➗': 'chart',
          '💯': 'trophy', '🔟': 'chart', '📃': 'chart', '📄': 'chart', '📜': 'chart',
          // 🏆 trophy / star / check / person
          '🏆': 'trophy', '🥇': 'trophy', '🥈': 'trophy', '🥉': 'trophy',
          '🎖️': 'trophy', '🏅': 'trophy', '⭐': 'star', '🌟': 'star',
          '✨': 'star', '💫': 'star', '🎉': 'star', '🎊': 'star',
          '👏': 'person', '👍': 'person', '✅': 'check', '☑️': 'check', '✔️': 'check',
          '🙌': 'person', '💪': 'person', '🚀': 'car',
          // 🌿 nature → leaf / drop / sun / gear
          '🍀': 'leaf', '🌳': 'leaf', '🌲': 'leaf', '🪴': 'leaf',
          '🌾': 'leaf', '🌻': 'leaf', '🌸': 'leaf', '🌺': 'leaf',
          '🦋': 'leaf', '🐝': 'leaf', '🌈': 'star', '☁️': 'drop', '🌧️': 'drop',
          '❄️': 'drop', '🌡️': 'sun', '🔬': 'gear', '🧪': 'gear',
          // 🏠 building → house / gear
          '🏠': 'house', '🏡': 'house', '🏢': 'house', '🏗️': 'house', '🏘️': 'house',
          '🏰': 'house', '🏛️': 'house', '🔧': 'gear', '🔨': 'gear', '⚙️': 'gear',
          '🛠️': 'gear', '🧱': 'house', '🪟': 'house', '🪜': 'gear', '🚪': 'house',
          '🏚️': 'house', '📡': 'gear', '🏙️': 'house', '🔩': 'gear', '🪛': 'gear',
          // 🚗 transport → car
          '🚗': 'car', '🚕': 'car', '🚙': 'car', '🚌': 'car', '🚐': 'car',
          '🚎': 'car', '🚲': 'car', '🛵': 'car', '🏎️': 'car',
          '✈️': 'car', '🚢': 'car', '🚂': 'car', '🚁': 'car', '🛸': 'car',
          '🚚': 'car', '🛒': 'car', '🛤️': 'car', '🗺️': 'globe',
          // 💻 tech → gear / globe / shield / person
          '💻': 'gear', '🖥️': 'gear', '📱': 'gear', '📲': 'gear', '⌨️': 'gear',
          '🖱️': 'gear', '🖨️': 'gear', '📶': 'gear', '🔗': 'chat', '🌐': 'globe',
          '🔒': 'shield', '🔓': 'shield', '🛡️': 'shield', '🤖': 'person', '🧠': 'person',
          '📸': 'gear', '🎥': 'gear', '📹': 'gear', '🔍': 'target',
          // 👥 people → person
          '👤': 'person', '👥': 'person', '👨‍💼': 'person', '👩‍💼': 'person', '🤝': 'person',
          '👨‍👩‍👧‍👦': 'person', '👷': 'person', '👨‍🔧': 'person', '👩‍🏫': 'person', '👨‍⚕️': 'person',
          '🧑‍💻': 'person', '👨‍🎨': 'person', '👩‍🔬': 'person', '🧑‍🌾': 'person', '👨‍🍳': 'person',
          '💼': 'person', '🎓': 'person', '📞': 'person', '✉️': 'person', '📧': 'person',
          // 🎯 misc → target / shield / drop / gear / bell / chat / heart
          '🔑': 'shield', '🗝️': 'shield', '🧲': 'gear', '🧊': 'drop', '🪨': 'house',
          '💧': 'drop', '🩺': 'gear', '🎲': 'diamond', '🎮': 'gear', '🎵': 'bell',
          '🔔': 'bell', '📣': 'bell', '💬': 'chat',
          '❤️': 'heart', '🩷': 'heart', '💜': 'heart', '💙': 'heart', '💚': 'heart', '🧡': 'heart',
        };

        const ICON_LIBRARY: Record<string, { label: string; icons: string[] }> = {
          energy: { label: '⚡ Énergie', icons: ['⚡', '🔋', '🔌', '💡', '☀️', '🌞', '🌤️', '🔆', '♻️', '🌱', '🍃', '🌿', '🌍', '🏭', '⛽', '🛢️', '💨', '🌊', '🔥', '🪫'] },
          money: { label: '💰 Finance', icons: ['💰', '💵', '💶', '💷', '💸', '🪙', '💎', '🏦', '💳', '🧾', '📊', '📈', '📉', '💹', '🤑', '🏧', '💲', '🫰', '🎯', '🎰'] },
          time: { label: '⏱️ Temps', icons: ['⏱️', '⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '⏳', '⌛', '📅', '📆', '🔄', '🔁', '🔃', '⏩', '⏪', '🗓️', '📌', '🎗️'] },
          chart: { label: '📊 Données', icons: ['📊', '📈', '📉', '📋', '📝', '📑', '🧮', '📐', '📏', '🔢', '🔣', '➕', '➖', '✖️', '➗', '💯', '🔟', '📃', '📄', '📜'] },
          trophy: { label: '🏆 Succès', icons: ['🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '👏', '👍', '✅', '☑️', '✔️', '🙌', '💪', '🚀'] },
          nature: { label: '🌿 Nature', icons: ['🌿', '🌱', '🍀', '🍃', '🌳', '🌲', '🪴', '🌾', '🌻', '🌸', '🌺', '🦋', '🐝', '🌈', '☁️', '🌧️', '❄️', '🌡️', '🔬', '🧪'] },
          building: { label: '🏠 Bâtiment', icons: ['🏠', '🏡', '🏢', '🏗️', '🏘️', '🏰', '🏛️', '🔧', '🔨', '⚙️', '🛠️', '🧱', '🪟', '🪜', '🚪', '🏚️', '📡', '🏙️', '🔩', '🪛'] },
          transport: { label: '🚗 Transport', icons: ['🚗', '🚕', '🚙', '🚌', '🚐', '🚎', '🚲', '🛵', '🏎️', '🚀', '✈️', '🚢', '🚂', '🚁', '🛸', '🚚', '🛒', '⛽', '🛤️', '🗺️'] },
          tech: { label: '💻 Tech', icons: ['💻', '🖥️', '📱', '📲', '⌨️', '🖱️', '🖨️', '📡', '📶', '🔗', '🌐', '🔒', '🔓', '🛡️', '🤖', '🧠', '📸', '🎥', '📹', '🔍'] },
          people: { label: '👥 Personnes', icons: ['👤', '👥', '👨‍💼', '👩‍💼', '🤝', '👨‍👩‍👧‍👦', '👷', '👨‍🔧', '👩‍🏫', '👨‍⚕️', '🧑‍💻', '👨‍🎨', '👩‍🔬', '🧑‍🌾', '👨‍🍳', '💼', '🎓', '📞', '✉️', '📧'] },
          misc: { label: '🎯 Divers', icons: ['🎯', '🔑', '🗝️', '🧲', '🧊', '🪨', '💧', '🩺', '🎲', '🎮', '🎵', '🔔', '📣', '💬', '❤️', '🩷', '💜', '💙', '💚', '🧡'] },
        };
        
        // Extraire l'emoji d'affichage depuis la valeur stockée (format "cat:emoji" ou emoji brut)
        const rawIcon = form.getFieldValue(field.key) || moduleInstance.config?.[field.key] || '';
        const currentIcon = rawIcon.includes(':') ? rawIcon.split(':').slice(1).join(':') : rawIcon;
        const isPickerOpen = iconPickerOpen === field.key;
        
        const selectIcon = (icon: string) => {
          if (!icon) {
            // Suppression
            form.setFieldValue(field.key, '');
            onUpdate({ config: { ...moduleInstance.config, [field.key]: '' } });
            setIconPickerOpen(null);
            return;
          }
          // Stocker au format "category:emoji" pour que le PDF puisse lire la catégorie directement
          const cat = EMOJI_TO_CAT[icon] || 'dot';
          const storedValue = `${cat}:${icon}`;
          form.setFieldValue(field.key, storedValue);
          onUpdate({ config: { ...moduleInstance.config, [field.key]: storedValue } });
          setIconPickerOpen(null);
        };
        
        return (
          <Form.Item {...commonProps} key={field.key}>
            <div>
              {/* Bouton d'ouverture avec aperçu */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  onClick={() => setIconPickerOpen(isPickerOpen ? null : field.key)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'flex-start',
                    height: '36px',
                  }}
                >
                  {currentIcon ? (
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{currentIcon}</span>
                  ) : (
                    <span style={{ color: '#888' }}>Choisir une icône…</span>
                  )}
                  {currentIcon && <span style={{ fontSize: '12px', color: '#aaa' }}>{currentIcon}</span>}
                </Button>
                {currentIcon && (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => selectIcon('')}
                  />
                )}
              </div>

              {/* Panneau d'icônes */}
              {isPickerOpen && (
                <div style={{
                  marginTop: '8px',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  backgroundColor: '#1f1f1f',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  padding: '8px',
                }}>
                  {/* Champ de saisie manuelle */}
                  <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
                    <Input
                      size="small"
                      placeholder="Coller un emoji ou taper un caractère…"
                      style={{ width: '100%' }}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val) selectIcon(val);
                      }}
                    />
                  </div>
                  
                  {/* Grille par catégorie */}
                  {Object.entries(ICON_LIBRARY).map(([catKey, cat]) => (
                    <div key={catKey} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontWeight: 600 }}>
                        {cat.label}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                        {cat.icons.map((icon) => (
                          <div
                            key={icon}
                            role="button" tabIndex={0} onClick={() => selectIcon(icon)}
                            style={{
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              backgroundColor: currentIcon === icon ? '#1677ff33' : 'transparent',
                              border: currentIcon === icon ? '1px solid #1677ff' : '1px solid transparent',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = '#ffffff15'; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = currentIcon === icon ? '#1677ff33' : 'transparent'; }}
                          >
                            {icon}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Item>
        );
      }
        const currentImageUrl = form.getFieldValue(field.key) || moduleInstance.config?.[field.key];
        // N'afficher l'aperçu que si c'est une vraie URL ou du base64
        const isValidImage = currentImageUrl && (
          currentImageUrl.startsWith('data:') || 
          currentImageUrl.startsWith('http://') || 
          currentImageUrl.startsWith('https://') ||
          currentImageUrl.startsWith('blob:')
        );
        return (
          <Form.Item {...commonProps} key={field.key}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Aperçu de l'image actuelle */}
              {isValidImage && (
                <div style={{ 
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                }}>
                  <img loading="lazy" src={currentImageUrl} 
                    alt="Aperçu" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '150px', 
                      objectFit: 'contain',
                      display: 'block',
                    }} 
                    onError={(e) => {
                      // Si l'image ne charge pas, cacher
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <Button 
                    danger 
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      right: '8px',
                      opacity: 0.9,
                    }}
                    onClick={() => {
                      form.setFieldValue(field.key, '');
                      onUpdate({ config: { ...moduleInstance.config, [field.key]: '' } });
                    }}
                  />
                </div>
              )}
              
              {/* Upload d'image - Convertir directement en base64 */}
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  logger.debug('📤 beforeUpload triggered, file:', file.name, file.size, file.type);
                  
                  // Vérification taille (max 10MB pour les images de fond)
                  const maxSize = 10 * 1024 * 1024; // 10MB
                  if (file.size > maxSize) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    logger.error(`❌ Image trop grande: ${sizeMB}MB (max 10MB)`);
                    message.error(`L'image fait ${sizeMB}MB, max autorisé: 10MB`);
                    alert(`L'image fait ${sizeMB}MB, maximum autorisé: 10MB`);
                    return false;
                  }

                  // Bloquer le nettoyage AVANT de commencer l'async
                  isUploadingGlobal = true;
                  setUploadingField(field.key);
                  logger.debug('🔒 Upload lock activé pour:', field.key);

                  // Convertir en base64 directement dans beforeUpload
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    logger.debug('📸 Image convertie en base64:', base64.substring(0, 80) + '...');
                    logger.debug('📸 Longueur base64:', base64.length);
                    logger.debug('📸 Module:', moduleInstance.moduleId, 'ThemeId:', moduleInstance.themeId);
                    logger.debug('📸 Field key:', field.key);
                    
                    form.setFieldValue(field.key, base64);
                    
                    const newConfig = { ...moduleInstance.config, [field.key]: base64 };
                    logger.debug('📸 Nouvelle config:', Object.keys(newConfig));
                    
                    onUpdate({ config: newConfig });
                    message.success('Image importée avec succès');
                    
                    // Délai pour laisser le temps à React de traiter la mise à jour
                    setTimeout(() => {
                      isUploadingGlobal = false;
                      setUploadingField(null);
                      logger.debug('🔓 Upload lock désactivé');
                    }, 100);
                  };
                  reader.onerror = (err) => {
                    logger.error('❌ FileReader error:', err);
                    message.error('Erreur lors de la lecture du fichier');
                    isUploadingGlobal = false;
                    setUploadingField(null);
                  };
                  reader.readAsDataURL(file);
                  
                  // Retourner false pour empêcher l'upload automatique
                  return false;
                }}
              >
                <Button 
                  icon={uploadingField === field.key ? <LoadingOutlined spin /> : <UploadOutlined />}
                  loading={uploadingField === field.key}
                  style={{ width: '100%' }}
                  disabled={uploadingField === field.key}
                >
                  {uploadingField === field.key ? 'Import en cours...' : '📤 Importer une image'}
                </Button>
              </Upload>

              {/* OU saisir une URL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#444' }} />
                <span style={{ fontSize: '11px', color: '#888' }}>OU</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#444' }} />
              </div>
              
              <Input 
                prefix={<LinkOutlined style={{ color: '#888' }} />}
                placeholder="Coller une URL d'image (https://...)..."
                value={isValidImage ? currentImageUrl : ''}
                onChange={(e) => {
                  const url = e.target.value;
                  // Bloquer les URLs file:///
                  if (url.startsWith('file:///') || url.includes('fakepath')) {
                    message.warning('Utilisez le bouton "Importer" pour charger une image locale');
                    return;
                  }
                  form.setFieldValue(field.key, url);
                  onUpdate({ config: { ...moduleInstance.config, [field.key]: url } });
                }}
              />
            </div>
          </Form.Item>
        );

      case 'data-binding':
        const currentValue = form.getFieldValue(field.key) || moduleInstance.config?.[field.key] || '';
        const hasBinding = currentValue && (currentValue.startsWith('@') || currentValue.startsWith('{'));
        
        // Fonction pour sélectionner une variable prédéfinie
        const selectPredefinedVar = (varKey: string) => {
          const newValue = `{${varKey}}`;
          form.setFieldValue(field.key, newValue);
          onUpdate({ config: { ...moduleInstance.config, [field.key]: newValue } });
          message.success(`Variable ${varKey} sélectionnée`);
        };
        
        // Rendu d'une liste de variables
        const renderVariableList = (variables: typeof LEAD_VARIABLES) => (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {variables.map(v => (
              <div
                key={v.key}
                role="button" tabIndex={0} onClick={() => selectPredefinedVar(v.key)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  backgroundColor: '#2d2d2d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d3d3d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2d2d2d'}
              >
                <span>{v.icon}</span>
                <span style={{ flex: 1, fontSize: '13px' }}>{v.label}</span>
                <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>
                  {`{${v.key}}`}
                </Tag>
              </div>
            ))}
          </div>
        );
        
        return (
          <Form.Item {...commonProps} key={field.key}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Affichage de la valeur liée actuelle */}
              {hasBinding && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#1d4ed8',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ApiOutlined style={{ color: '#60a5fa' }} />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#93c5fd' }}>
                      {currentValue}
                    </span>
                  </div>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      form.setFieldValue(field.key, '');
                      onUpdate({ config: { ...moduleInstance.config, [field.key]: '' } });
                    }}
                  />
                </div>
              )}
              
              {/* Onglets pour sélectionner les variables */}
              <Tabs
                size="small"
                type="card"
                style={{ 
                  backgroundColor: '#1f1f1f', 
                  borderRadius: '8px',
                  padding: '8px',
                }}
                items={[
                  {
                    key: 'lead',
                    label: <span><UserOutlined /> Client</span>,
                    children: renderVariableList(LEAD_VARIABLES),
                  },
                  {
                    key: 'quote',
                    label: <span><FileTextOutlined /> Devis</span>,
                    children: renderVariableList(QUOTE_VARIABLES),
                  },
                  {
                    key: 'org',
                    label: <span><HomeOutlined /> Société</span>,
                    children: renderVariableList(ORG_VARIABLES),
                  },
                  {
                    key: 'tbl',
                    label: <span>🌳 TBL</span>,
                    children: (
                      <div style={{ padding: '8px 0' }}>
                        <Button
                          icon={<ApiOutlined />}
                          style={{ width: '100%' }}
                          onClick={() => {
                            if (!selectedNodeId) {
                              message.warning('Aucun arbre TBL disponible.');
                              return;
                            }
                            setCurrentFieldKey(field.key);
                            setSelectorOpen(true);
                          }}
                          loading={loadingTrees}
                          disabled={!selectedNodeId}
                        >
                          🌳 Ouvrir l'arborescence TBL
                        </Button>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                          Pour les données techniques et personnalisées
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
              
              {/* Info sur l'utilisation */}
              <div style={{ fontSize: '11px', color: '#666', padding: '4px 8px', backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
                💡 Cliquez sur une variable pour la lier à ce champ
              </div>
            </div>
          </Form.Item>
        );

      case 'rich-text':
        return (
          <Form.Item {...commonProps}>
            <TextArea rows={6} placeholder="Contenu HTML..." />
            {/* TODO: Intégrer un éditeur rich text */}
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item {...commonProps}>
            <Input type="date" />
          </Form.Item>
        );

      default:
        return (
          <Form.Item {...commonProps}>
            <Input />
          </Form.Item>
        );
    }
  };

  // Filtrer et grouper les champs
  // Pour le module BACKGROUND, afficher uniquement les champs du groupe correspondant au thème
  const filteredFields = moduleDef.configFields.filter(field => {
    // Si c'est le module BACKGROUND avec un thème sélectionné
    if (moduleInstance.moduleId === 'BACKGROUND' && moduleInstance.themeId) {
      // Le champ 'type' est toujours visible
      if (field.key === 'type') return true;
      
      // Mapping des thèmes vers les groupes
      const themeToGroup: Record<string, string> = {
        'solid': 'color',
        'gradient': 'gradient',
        'image': 'image',
      };
      
      const allowedGroup = themeToGroup[moduleInstance.themeId];
      if (allowedGroup) {
        // Afficher uniquement les champs sans groupe ou du groupe correspondant
        return !field.group || field.group === allowedGroup;
      }
    }
    return true;
  });

  // Grouper les champs filtrés par groupe
  const groupedFields = filteredFields.reduce((acc, field) => {
    const group = field.group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, ConfigField[]>);

  // Handlers pour le sélecteur TBL
  const handleTreeSelect = (val: NodeTreeSelectorValue) => {
    const newValue = val.ref;
    
    // 🆕 Gestion spéciale pour les champs totaux liés à TBL
    const totalsFieldMap: Record<string, string> = {
      '__totalHTVASource__': 'totalHTVASource',
      '__totalTVASource__': 'totalTVASource',
      '__totalTVACSource__': 'totalTVACSource',
      '__remiseSource__': 'remiseSource',
    };
    if (totalsFieldMap[currentFieldKey]) {
      onUpdate({ config: { ...moduleInstance.config, [totalsFieldMap[currentFieldKey]]: newValue } });
      setSelectorOpen(false);
      setCurrentFieldKey('');
      message.success('Champ lié à TBL');
      return;
    }
    
    form.setFieldValue(currentFieldKey, newValue);
    onUpdate({ config: { ...moduleInstance.config, [currentFieldKey]: newValue } });
    setSelectorOpen(false);
    setCurrentFieldKey('');
    message.success('Référence TBL ajoutée');
  };

  // Handler pour sauvegarder la condition
  const handleSaveCondition = (config: ConditionalConfig) => {
    setModuleCondition(config);
    onUpdate({ 
      config: { 
        ...moduleInstance.config, 
        _conditionalDisplay: config 
      } 
    });
    message.success('Condition configurée');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgBase: '#1f1f1f',
          colorTextBase: '#fff',
          colorText: '#fff',
          colorTextSecondary: '#aaa',
          colorTextTertiary: '#666',
          colorBorder: '#333',
          colorBgContainer: '#2d2d2d',
          colorBgElevated: '#3d3d3d',
          colorBgLayout: '#1f1f1f',
          colorPrimary: '#1890ff',
          colorPrimaryBorder: '#0050b3',
          colorTextPlaceholder: '#666',
        },
        components: {
          Input: {
            colorTextPlaceholder: '#666',
            colorBgContainer: '#2d2d2d',
            colorText: '#fff', // Texte BLANC dans les inputs pour visibilité
            colorBorder: '#444',
          },
          InputNumber: {
            colorTextPlaceholder: '#666',
            colorBgContainer: '#2d2d2d',
            colorText: '#fff',
            colorBorder: '#444',
          },
          Select: {
            colorBgContainer: '#2d2d2d',
            colorText: '#fff',
            colorBorder: '#444',
            colorTextPlaceholder: '#666',
          },
          Form: {
            labelColor: '#fff',
          },
          Collapse: {
            colorBgContainer: '#2d2d2d',
            colorText: '#fff',
            colorBorder: '#444',
          },
        },
      }}
    >
      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        backgroundColor: '#1f1f1f',
      }}>
      {/* Header du module */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        backgroundColor: '#2d2d2d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '32px' }}>{moduleDef.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{moduleDef.name}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{moduleDef.description}</div>
          </div>
        </div>

        {/* Actions */}
        <Space>
          {onDuplicate && (
            <Button size="small" icon={<CopyOutlined />} onClick={onDuplicate}>
              Dupliquer
            </Button>
          )}
          <Tooltip title={moduleCondition?.enabled ? "Condition configurée" : "Ajouter une condition d'affichage"}>
            <Badge dot={moduleCondition?.enabled} color="green">
              <Button 
                size="small" 
                icon={<ThunderboltOutlined />} 
                onClick={() => setConditionModalOpen(true)}
                type={moduleCondition?.enabled ? "primary" : "default"}
                ghost={moduleCondition?.enabled}
              >
                Cond.
              </Button>
            </Badge>
          </Tooltip>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
            Supprimer
          </Button>
        </Space>
      </div>

      {/* Sélection du thème */}
      {moduleDef.themes.length > 0 && (
        <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
            🎨 Thème du module
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {moduleDef.themes.map((theme) => (
              <div
                key={theme.id}
                role="button" tabIndex={0} onClick={() => handleThemeChange(theme.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: moduleInstance.themeId === theme.id ? '#1890ff' : '#3d3d3d',
                  border: moduleInstance.themeId === theme.id ? '2px solid #1890ff' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '12px' }}>{theme.name}</div>
                <div style={{ fontSize: '10px', color: moduleInstance.themeId === theme.id ? '#fff' : '#888' }}>
                  {theme.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positionnement et dimensions */}
      {moduleInstance.position && (
        <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
            📐 Position & Dimensions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>X</div>
              <InputNumber
                size="small"
                value={moduleInstance.position.x}
                onChange={(value) => onUpdate({
                  position: { ...moduleInstance.position!, x: value || 0 }
                })}
                style={{ width: '100%' }}
                step={20}
              />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>Y</div>
              <InputNumber
                size="small"
                value={moduleInstance.position.y}
                onChange={(value) => onUpdate({
                  position: { ...moduleInstance.position!, y: value || 0 }
                })}
                style={{ width: '100%' }}
                step={20}
              />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>Largeur</div>
              <InputNumber
                size="small"
                value={moduleInstance.position.width}
                onChange={(value) => onUpdate({
                  position: { ...moduleInstance.position!, width: value || 100 }
                })}
                style={{ width: '100%' }}
                step={20}
                min={100}
              />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>Hauteur</div>
              <InputNumber
                size="small"
                value={moduleInstance.position.height}
                onChange={(value) => onUpdate({
                  position: { ...moduleInstance.position!, height: value || 50 }
                })}
                style={{ width: '100%' }}
                step={20}
                min={50}
              />
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
            💡 Utilisez la grille (20px) pour aligner les éléments
          </div>
        </div>
      )}

      {/* Formulaire de configuration */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={moduleInstance.config}
        >
          {Object.keys(groupedFields).length > 1 ? (
            <Collapse 
              defaultActiveKey={['general']}
              bordered={false}
              style={{ backgroundColor: 'transparent' }}
              items={Object.entries(groupedFields).map(([group, fields]) => ({
                key: group,
                label: <span style={{ color: '#fff', textTransform: 'capitalize' }}>{group}</span>,
                children: fields.map(renderField),
              }))}
            />
          ) : (
            moduleDef.configFields.map(renderField)
          )}
        </Form>
        
        {/* 🆕 ÉDITEUR DE LIGNES SPÉCIAL POUR PRICING_TABLE */}
        {moduleInstance.moduleId === 'PRICING_TABLE' && (
          <>
            <Divider style={{ borderColor: '#444', margin: '24px 0 16px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>📊 Configuration des lignes</span>
            </Divider>
            <PricingLinesEditor
              lines={moduleInstance.config?.pricingLines || []}
              onChange={(newLines: PricingLine[]) => {
                onUpdate({ 
                  config: { 
                    ...moduleInstance.config, 
                    pricingLines: newLines 
                  } 
                });
              }}
              nodeId={selectedNodeId || undefined}
            />

            {/* 🆕 TOTAUX liés via NodeTreeSelect */}
            <Divider style={{ borderColor: '#444', margin: '24px 0 16px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>💰 Totaux du tableau</span>
            </Divider>
            <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: '__totalHTVASource__', configKey: 'totalHTVASource', label: 'Total HTVA', icon: '📊' },
                { key: '__totalTVASource__', configKey: 'totalTVASource', label: 'TVA', icon: '💶' },
                { key: '__totalTVACSource__', configKey: 'totalTVACSource', label: 'Total TVAC', icon: '💰' },
                { key: '__remiseSource__', configKey: 'remiseSource', label: 'Remise', icon: '🏷️' },
              ].map((field) => {
                const boundRef = moduleInstance.config?.[field.configKey];
                return (
                  <div key={field.key}>
                    <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>{field.icon} {field.label}</div>
                    {boundRef ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag color="blue" style={{ flex: 1, margin: 0, padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🌳 {boundRef}
                        </Tag>
                        <Tooltip title={t('common.delete')}>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              onUpdate({ config: { ...moduleInstance.config, [field.configKey]: '' } });
                            }}
                          />
                        </Tooltip>
                      </div>
                    ) : (
                      <Button
                        size="small"
                        type="dashed"
                        block
                        onClick={() => {
                          if (!selectedNodeId) {
                            message.warning('Aucun arbre TBL disponible.');
                            return;
                          }
                          setCurrentFieldKey(field.key);
                          setSelectorOpen(true);
                        }}
                        disabled={!selectedNodeId}
                      >
                        🌳 Lier à un champ TBL
                      </Button>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                💡 Liez chaque total à un nœud TBL. Les valeurs apparaîtront en bas du tableau.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer avec info */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #333',
        backgroundColor: '#1a1a1a',
        fontSize: '11px',
        color: '#666',
      }}>
        <div>Module ID: {moduleInstance.id.slice(0, 8)}...</div>
        <div>Type: {moduleInstance.moduleId}</div>
        {moduleInstance.themeId && <div>Thème: {moduleInstance.themeId}</div>}
      </div>

      {/* Modal NodeTreeSelector */}
      {selectedNodeId && (
        <NodeTreeSelector
          nodeId={selectedNodeId}
          open={selectorOpen}
          onClose={() => {
            setSelectorOpen(false);
            setCurrentFieldKey('');
          }}
          onSelect={handleTreeSelect}
          selectionContext="token"
        />
      )}

      {/* Modal Condition */}
      <ConditionEditorModal
        open={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        onSave={handleSaveCondition}
        initialConfig={moduleCondition}
        nodeId={selectedNodeId || undefined}
      />
      </div>
    </ConfigProvider>
  );
};

export default ModuleConfigPanel;
