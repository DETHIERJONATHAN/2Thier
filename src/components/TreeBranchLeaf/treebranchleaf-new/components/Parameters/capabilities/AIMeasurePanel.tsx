/**
 * 📐 AIMeasurePanel - Panneau de configuration pour l'analyse d'images avec IA
 * 
 * Permet de configurer:
 * - Le prompt d'analyse pour Gemini Vision
 * - Les clés/mesures à extraire de l'image
 * - Le mapping vers les champs cibles via NodeTreeSelector
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Typography,
  Space,
  message,
  Divider,
  Alert,
  Tag,
  Tooltip,
  Popconfirm,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CameraOutlined,
  RobotOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';
import { InputNumber, Collapse } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// 📋 TYPES
// =============================================================================

interface AIMeasureMapping {
  id: string;
  key: string;          // Clé du résultat (ex: "largeur", "hauteur")
  label: string;        // Label affiché (ex: "Largeur (cm)")
  targetRef: string;    // Référence du champ cible (@value.nodeId)
  targetLabel?: string; // Label du champ cible (pour affichage)
  type: 'number' | 'text' | 'boolean';
}

interface AIMeasureConfig {
  enabled: boolean;
  prompt: string;
  measureKeys: string[];
  mappings: AIMeasureMapping[];
  autoTrigger: boolean;
}

interface AIMeasurePanelProps {
  treeId: string;
  nodeId: string;
  value?: AIMeasureConfig;
  onChange?: (val: AIMeasureConfig) => void;
  readOnly?: boolean;
}

// =============================================================================
// 🎯 COMPOSANT PRINCIPAL
// =============================================================================

const AIMeasurePanel: React.FC<AIMeasurePanelProps> = ({
  treeId,
  nodeId,
  value,
  onChange,
  readOnly = false
}) => {
  const { api } = useAuthenticatedApi();
  const [messageApi, contextHolder] = message.useMessage();
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; mode: string } | null>(null);

  // État local du formulaire
  const [config, setConfig] = useState<AIMeasureConfig>({
    enabled: false,
    prompt: '',
    measureKeys: [],
    mappings: [],
    autoTrigger: true
  });

  // État pour le NodeTreeSelector
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

  // État pour l'ajout de nouvelle clé
  const [newKeyInput, setNewKeyInput] = useState('');

  // 🎯 État pour la configuration du marqueur Métré A4 V1.2
  const [markerConfig, setMarkerConfig] = useState({
    sizeCm: 13, // Largeur Métré A4 V1.2
    loading: false
  });

  // =============================================================================
  // 🔄 CHARGEMENT INITIAL
  // =============================================================================

  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // Charger la config depuis les colonnes dédiées du nœud
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as {
          // Colonnes dédiées pour aiMeasure
          aiMeasure_enabled?: boolean;
          aiMeasure_autoTrigger?: boolean;
          aiMeasure_prompt?: string;
          aiMeasure_keys?: Array<{
            id: string;
            key: string;
            label: string;
            type: string;
            targetRef?: string;
            targetLabel?: string;
          }>;
          // Fallback legacy metadata
          metadata?: { aiMeasure?: AIMeasureConfig }
        };
        
        // 🔧 NOUVEAU: Lire depuis les colonnes dédiées d'abord
        if (node?.aiMeasure_enabled !== undefined) {
          const loadedConfig: AIMeasureConfig = {
            enabled: node.aiMeasure_enabled ?? false,
            autoTrigger: node.aiMeasure_autoTrigger ?? true,
            prompt: node.aiMeasure_prompt ?? '',
            measureKeys: (node.aiMeasure_keys ?? []).map((k: any) => k.key || k),
            mappings: (node.aiMeasure_keys ?? []).map((k: any) => ({
              id: k.id || k.key,
              key: k.key,
              label: k.label || k.key,
              type: k.type || 'text',
              targetRef: k.targetRef || '',
              targetLabel: k.targetLabel || ''
            }))
          };
          console.log('📊 [AIMeasurePanel] Config chargée depuis colonnes dédiées:', loadedConfig);
          setConfig(loadedConfig);
        } else if (node?.metadata?.aiMeasure) {
          // Fallback legacy: lire depuis metadata JSON
          console.log('⚠️ [AIMeasurePanel] Fallback legacy metadata.aiMeasure');
          setConfig(node.metadata.aiMeasure);
        } else if (value) {
          setConfig(value);
        }

        // Vérifier le statut du service IA
        try {
          const status = await api.get('/api/ai/measure-image/status') as { available: boolean; mode: string };
          setAiStatus(status);
        } catch {
          setAiStatus({ available: false, mode: 'unavailable' });
        }

      } catch (error) {
        console.error('❌ [AIMeasurePanel] Erreur chargement:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      mountedRef.current = false;
    };
  }, [api, nodeId, value]);

  // =============================================================================
  // 💾 SAUVEGARDE
  // =============================================================================

  const saveConfig = useDebouncedCallback(async (newConfig: AIMeasureConfig) => {
    if (!mountedRef.current) return;
    
    try {
      setSaving(true);
      
      // 🔧 NOUVEAU: Convertir en format metadata.aiMeasure pour le backend
      // Le backend convertira automatiquement vers les colonnes dédiées
      const aiMeasurePayload = {
        enabled: newConfig.enabled,
        autoTrigger: newConfig.autoTrigger,
        customPrompt: newConfig.prompt,
        keys: newConfig.mappings.map(m => ({
          id: m.id,
          key: m.key,
          label: m.label,
          type: m.type,
          targetRef: m.targetRef,
          targetLabel: m.targetLabel
        }))
      };
      
      // Envoyer via metadata.aiMeasure - le backend extraira vers les colonnes
      await api.put(`/api/treebranchleaf/nodes/${nodeId}`, {
        metadata: {
          aiMeasure: aiMeasurePayload
        }
      });
      
      onChange?.(newConfig);
      
      console.log('✅ [AIMeasurePanel] Configuration sauvegardée vers colonnes dédiées:', aiMeasurePayload);
      
    } catch (error) {
      console.error('❌ [AIMeasurePanel] Erreur sauvegarde:', error);
      messageApi.error('Erreur lors de la sauvegarde');
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, 800);

  // =============================================================================
  // 🎛️ HANDLERS
  // =============================================================================

  const handleToggleEnabled = useCallback((checked: boolean) => {
    const newConfig = { ...config, enabled: checked };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newConfig = { ...config, prompt: e.target.value };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handleAutoTriggerChange = useCallback((checked: boolean) => {
    const newConfig = { ...config, autoTrigger: checked };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // =============================================================================
  // � GESTION DU MARQUEUR ARUCO
  // =============================================================================

  // Charger la config du marqueur au démarrage
  useEffect(() => {
    const loadMarkerConfig = async () => {
      try {
        const response = await api.get('/api/settings/ai-measure') as { success: boolean; data?: { markerSizeCm: number } };
        if (response.success && response.data?.markerSizeCm) {
          setMarkerConfig(prev => ({ ...prev, sizeCm: response.data!.markerSizeCm }));
        }
      } catch (e) {
        console.warn('[AIMeasurePanel] Config marqueur non trouvée, utilisation par défaut');
      }
    };
    loadMarkerConfig();
  }, [api]);

  // Sauvegarder la taille du marqueur
  const handleSaveMarkerSize = useCallback(async (sizeCm: number) => {
    setMarkerConfig(prev => ({ ...prev, loading: true }));
    try {
      await api.post('/api/settings/ai-measure', { markerSizeCm: sizeCm });
      setMarkerConfig(prev => ({ ...prev, sizeCm, loading: false }));
      messageApi.success(`✅ Taille du marqueur sauvegardée: ${sizeCm} cm`);
    } catch (e) {
      messageApi.error('Erreur lors de la sauvegarde');
      setMarkerConfig(prev => ({ ...prev, loading: false }));
    }
  }, [api, messageApi]);

  // Générer le SVG du marqueur
  const generateMarkerSVG = useCallback((sizeCm: number) => {
    const sizeMm = sizeCm * 10;
    const band = sizeMm / 6;
    const magentaRadius = sizeMm * 0.028;
    const whiteRadius = sizeMm * 0.006;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizeMm} ${sizeMm}" width="${sizeMm}mm" height="${sizeMm}mm">
      <rect x="0" y="0" width="${sizeMm}" height="${sizeMm}" fill="#000000"/>
      <rect x="${band}" y="${band}" width="${sizeMm - 2*band}" height="${sizeMm - 2*band}" fill="#FFFFFF"/>
      <rect x="${2*band}" y="${2*band}" width="${sizeMm - 4*band}" height="${sizeMm - 4*band}" fill="#000000"/>
      <circle cx="0" cy="0" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="${sizeMm}" cy="0" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="${sizeMm}" cy="${sizeMm}" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="0" cy="${sizeMm}" r="${magentaRadius}" fill="#FF00FF"/>
      <circle cx="0" cy="0" r="${whiteRadius}" fill="#FFFFFF"/>
      <circle cx="${sizeMm}" cy="0" r="${whiteRadius}" fill="#FFFFFF"/>
      <circle cx="${sizeMm}" cy="${sizeMm}" r="${whiteRadius}" fill="#FFFFFF"/>
      <circle cx="0" cy="${sizeMm}" r="${whiteRadius}" fill="#FFFFFF"/>
    </svg>`;
  }, []);

  // Télécharger le marqueur
  const handleDownloadMarker = useCallback(() => {
    const svg = generateMarkerSVG(markerConfig.sizeCm);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marqueur-aruco-${markerConfig.sizeCm}cm.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    messageApi.success(`📥 Marqueur ${markerConfig.sizeCm}cm téléchargé !`);
  }, [generateMarkerSVG, markerConfig.sizeCm, messageApi]);

  // =============================================================================
  // �🔑 GESTION DES CLÉS DE MESURE
  // =============================================================================

  const handleAddKey = useCallback(() => {
    const trimmedKey = newKeyInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!trimmedKey) return;
    
    if (config.measureKeys.includes(trimmedKey)) {
      messageApi.warning('Cette clé existe déjà');
      return;
    }

    const newConfig = {
      ...config,
      measureKeys: [...config.measureKeys, trimmedKey],
      // Ajouter aussi un mapping vide pour cette clé
      mappings: [
        ...config.mappings,
        {
          id: `mapping_${Date.now()}`,
          key: trimmedKey,
          label: newKeyInput.trim(),
          targetRef: '',
          type: 'number' as const
        }
      ]
    };
    
    setConfig(newConfig);
    setNewKeyInput('');
    saveConfig(newConfig);
  }, [config, newKeyInput, messageApi, saveConfig]);

  const handleRemoveKey = useCallback((keyToRemove: string) => {
    const newConfig = {
      ...config,
      measureKeys: config.measureKeys.filter(k => k !== keyToRemove),
      mappings: config.mappings.filter(m => m.key !== keyToRemove)
    };
    
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // =============================================================================
  // 🔗 GESTION DES MAPPINGS
  // =============================================================================

  const handleOpenSelector = useCallback((mappingId: string) => {
    setEditingMappingId(mappingId);
    setSelectorOpen(true);
  }, []);

  const handleSelectTarget = useCallback((selection: NodeTreeSelectorValue) => {
    if (!editingMappingId) return;

    const newMappings = config.mappings.map(m => {
      if (m.id === editingMappingId) {
        return {
          ...m,
          targetRef: selection.ref,
          targetLabel: selection.ref // Sera remplacé par le vrai label
        };
      }
      return m;
    });

    const newConfig = {
      ...config,
      mappings: newMappings
    };

    setConfig(newConfig);
    setSelectorOpen(false);
    setEditingMappingId(null);
    saveConfig(newConfig);
  }, [config, editingMappingId, saveConfig]);

  const handleMappingLabelChange = useCallback((mappingId: string, newLabel: string) => {
    const newMappings = config.mappings.map(m => {
      if (m.id === mappingId) {
        return { ...m, label: newLabel };
      }
      return m;
    });

    const newConfig = { ...config, mappings: newMappings };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handleMappingTypeChange = useCallback((mappingId: string, newType: 'number' | 'text' | 'boolean') => {
    const newMappings = config.mappings.map(m => {
      if (m.id === mappingId) {
        return { ...m, type: newType };
      }
      return m;
    });

    const newConfig = { ...config, mappings: newMappings };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // =============================================================================
  // 🧪 TEST DE L'ANALYSE
  // =============================================================================

  const handleTestAnalysis = useCallback(async () => {
    if (!config.prompt || config.measureKeys.length === 0) {
      messageApi.warning('Configurez d\'abord le prompt et au moins une clé de mesure');
      return;
    }

    setTesting(true);

    try {
      // Créer une image de test (placeholder)
      // En production, on utiliserait une vraie image uploadée
      messageApi.info('Test en mode simulation (pas d\'image réelle)');
      
      // Simuler un appel pour voir les clés qui seraient extraites
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      messageApi.success(`✅ Configuration valide ! ${config.measureKeys.length} clés seront extraites`);
      
    } catch (error) {
      messageApi.error('Erreur lors du test');
    } finally {
      setTesting(false);
    }
  }, [config, messageApi]);

  // =============================================================================
  // 🎨 PROMPTS PRÉDÉFINIS
  // =============================================================================

  const presetPrompts = useMemo(() => [
    {
      label: '🪟 Châssis / Fenêtre',
      prompt: `Analyse cette photo de châssis ou fenêtre. Mesure précisément:
- La largeur totale du cadre
- La hauteur totale du cadre
- Le nombre de vantaux (parties ouvrantes)
- Le type d'ouverture (oscillo-battant, à soufflet, fixe, coulissant)
- La couleur dominante du cadre
- Le matériau visible (PVC, aluminium, bois)`,
      keys: ['largeur_cm', 'hauteur_cm', 'nb_vantaux', 'type_ouverture', 'couleur', 'materiau']
    },
    {
      label: '🧱 Mur / Cloison',
      prompt: `Analyse cette photo de mur ou cloison. Mesure:
- La largeur approximative visible
- La hauteur approximative visible
- L'épaisseur estimée (si visible)
- Le type de matériau (plâtre, béton, brique, placo)
- L'état général (bon, moyen, à rénover)`,
      keys: ['largeur_cm', 'hauteur_cm', 'epaisseur_cm', 'materiau', 'etat']
    },
    {
      label: '🚪 Porte',
      prompt: `Analyse cette photo de porte. Mesure:
- La largeur de passage
- La hauteur totale
- Le type de porte (pleine, vitrée, coulissante)
- Le sens d'ouverture (gauche, droite)
- Le matériau (bois, PVC, alu, verre)`,
      keys: ['largeur_cm', 'hauteur_cm', 'type_porte', 'sens_ouverture', 'materiau']
    },
    {
      label: '📐 Mesure générale',
      prompt: `Analyse cette image et extrait les dimensions principales visibles:
- Longueur/largeur de l'élément principal
- Hauteur si applicable
- Profondeur si visible
- Description de l'élément`,
      keys: ['longueur_cm', 'largeur_cm', 'hauteur_cm', 'profondeur_cm', 'description']
    }
  ], []);

  const handleApplyPreset = useCallback((preset: typeof presetPrompts[0]) => {
    const newMappings: AIMeasureMapping[] = preset.keys.map((key, idx) => ({
      id: `mapping_${Date.now()}_${idx}`,
      key,
      label: key.replace(/_/g, ' ').replace(/cm$/, ' (cm)'),
      targetRef: '',
      type: key.includes('nb_') || key.includes('cm') ? 'number' : 'text'
    }));

    const newConfig: AIMeasureConfig = {
      ...config,
      prompt: preset.prompt,
      measureKeys: preset.keys,
      mappings: newMappings
    };

    setConfig(newConfig);
    saveConfig(newConfig);
    messageApi.success(`Preset "${preset.label}" appliqué`);
  }, [config, saveConfig, messageApi]);

  // =============================================================================
  // 🎨 RENDU
  // =============================================================================

  if (loading) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
          <div style={{ marginTop: 8 }}>Chargement...</div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {contextHolder}

      {/* En-tête avec statut */}
      <div style={{ marginBottom: 16 }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <CameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0 }}>IA Mesure Photo</Title>
            {saving && <Tag color="processing">Sauvegarde...</Tag>}
          </Space>
          
          <Switch
            checked={config.enabled}
            onChange={handleToggleEnabled}
            disabled={readOnly}
            checkedChildren="Activé"
            unCheckedChildren="Désactivé"
          />
        </Space>

        {/* Statut du service IA */}
        {aiStatus && (
          <div style={{ marginTop: 8 }}>
            {aiStatus.available ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                Service IA disponible ({aiStatus.mode})
              </Tag>
            ) : (
              <Tag icon={<ExclamationCircleOutlined />} color="warning">
                Service IA en mode démo
              </Tag>
            )}
          </div>
        )}
      </div>

      {!config.enabled ? (
        <Alert
          message="Fonctionnalité désactivée"
          description="Activez cette capacité pour analyser les photos et extraire automatiquement des mesures avec l'IA."
          type="info"
          showIcon
          icon={<RobotOutlined />}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          
          {/* Presets */}
          <Card size="small" title="📋 Modèles prédéfinis">
            <Space wrap>
              {presetPrompts.map((preset, idx) => (
                <Button
                  key={idx}
                  size="small"
                  onClick={() => handleApplyPreset(preset)}
                  disabled={readOnly}
                >
                  {preset.label}
                </Button>
              ))}
            </Space>
          </Card>

          {/* 📐 Configuration du marqueur ArUco */}
          <Collapse 
            size="small"
            items={[{
              key: 'marker-config',
              label: (
                <Space>
                  <SettingOutlined />
                  <span>📐 Configuration du marqueur de référence</span>
                </Space>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Alert
                    message="Marqueur Métré A4 V1.2 (AprilTag 13×21.7cm)"
                    description="Ce marqueur doit être imprimé et placé à côté de l'objet à mesurer. La taille configurée doit correspondre EXACTEMENT à la taille imprimée."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Taille du marqueur */}
                    <div>
                      <Text strong>Taille du marqueur :</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <InputNumber
                          min={5}
                          max={50}
                          step={0.1}
                          value={markerConfig.sizeCm}
                          onChange={(val) => setMarkerConfig(prev => ({ ...prev, sizeCm: val || 13 }))}
                          addonAfter="cm"
                          style={{ width: 150 }}
                          precision={1}
                          disabled={readOnly}
                        />
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => handleSaveMarkerSize(markerConfig.sizeCm)}
                          loading={markerConfig.loading}
                          disabled={readOnly}
                        >
                          Sauvegarder
                        </Button>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Largeur du marqueur Métré A4 V1.2 (AprilTag 13×21.7cm).
                      </Text>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Aperçu et téléchargement */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {/* Aperçu */}
                      <div 
                        style={{ 
                          width: 100, 
                          height: 100, 
                          border: '1px solid #d9d9d9', 
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#fafafa'
                        }}
                        dangerouslySetInnerHTML={{ __html: generateMarkerSVG(markerConfig.sizeCm) }}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <Text strong>Télécharger le marqueur :</Text>
                        <div style={{ marginTop: 8 }}>
                          <Button 
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadMarker}
                            type="primary"
                          >
                            Télécharger SVG ({markerConfig.sizeCm} cm)
                          </Button>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                          Imprimez à 100% (sans mise à l'échelle) puis vérifiez avec une règle.
                        </Text>
                      </div>
                    </div>
                  </Space>
                </div>
              )
            }]}
          />

          {/* Prompt */}
          <Card size="small" title="🎯 Prompt d'analyse">
            <TextArea
              value={config.prompt}
              onChange={handlePromptChange}
              placeholder="Décrivez ce que l'IA doit analyser et mesurer dans l'image..."
              autoSize={{ minRows: 4, maxRows: 10 }}
              disabled={readOnly}
              style={{ marginBottom: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined /> L'IA utilisera ce prompt pour analyser chaque photo uploadée dans ce champ.
            </Text>
          </Card>

          {/* Clés de mesure */}
          <Card 
            size="small" 
            title={`🔑 Clés à extraire (${config.measureKeys.length})`}
            extra={
              <Switch
                size="small"
                checked={config.autoTrigger}
                onChange={handleAutoTriggerChange}
                disabled={readOnly}
                checkedChildren="Auto"
                unCheckedChildren="Manuel"
              />
            }
          >
            {/* Liste des clés existantes */}
            <div style={{ marginBottom: 12 }}>
              {config.measureKeys.length === 0 ? (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="Aucune clé définie"
                  style={{ margin: '8px 0' }}
                />
              ) : (
                <Space wrap>
                  {config.measureKeys.map(key => (
                    <Tag
                      key={key}
                      closable={!readOnly}
                      onClose={() => handleRemoveKey(key)}
                      color="blue"
                    >
                      {key}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>

            {/* Ajout de nouvelle clé */}
            {!readOnly && (
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={newKeyInput}
                  onChange={e => setNewKeyInput(e.target.value)}
                  placeholder="Nouvelle clé (ex: largeur, hauteur...)"
                  onPressEnter={handleAddKey}
                />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleAddKey}
                >
                  Ajouter
                </Button>
              </Space.Compact>
            )}
          </Card>

          {/* Mappings vers les champs */}
          <Card size="small" title="🔗 Mapping vers les champs">
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              Associez chaque mesure extraite à un champ du formulaire qui recevra la valeur.
            </Paragraph>

            {config.mappings.length === 0 ? (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="Ajoutez des clés ci-dessus pour configurer les mappings"
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {config.mappings.map(mapping => (
                  <div 
                    key={mapping.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: '#fafafa',
                      borderRadius: 6,
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    {/* Clé source */}
                    <Tag color="blue" style={{ margin: 0 }}>{mapping.key}</Tag>
                    
                    {/* Label éditable */}
                    <Input
                      size="small"
                      value={mapping.label}
                      onChange={e => handleMappingLabelChange(mapping.id, e.target.value)}
                      style={{ width: 150 }}
                      placeholder="Label"
                      disabled={readOnly}
                    />

                    {/* Flèche */}
                    <span style={{ color: '#999' }}>→</span>

                    {/* Bouton sélection champ cible */}
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => handleOpenSelector(mapping.id)}
                      disabled={readOnly}
                      type={mapping.targetRef ? 'default' : 'dashed'}
                    >
                      {mapping.targetRef ? (
                        <Tooltip title={mapping.targetRef}>
                          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                            {mapping.targetLabel || mapping.targetRef.split('.').pop()}
                          </span>
                        </Tooltip>
                      ) : (
                        'Choisir le champ'
                      )}
                    </Button>

                    {/* Type de valeur */}
                    <select
                      value={mapping.type}
                      onChange={e => handleMappingTypeChange(mapping.id, e.target.value as 'number' | 'text' | 'boolean')}
                      disabled={readOnly}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        border: '1px solid #d9d9d9',
                        fontSize: 12
                      }}
                    >
                      <option value="number">Nombre</option>
                      <option value="text">Texte</option>
                      <option value="boolean">Booléen</option>
                    </select>
                  </div>
                ))}
              </Space>
            )}
          </Card>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              icon={<PlayCircleOutlined />}
              onClick={handleTestAnalysis}
              loading={testing}
              disabled={readOnly || !config.prompt || config.measureKeys.length === 0}
            >
              Tester la configuration
            </Button>
          </div>

        </Space>
      )}

      {/* NodeTreeSelector Modal */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={selectorOpen}
        onClose={() => {
          setSelectorOpen(false);
          setEditingMappingId(null);
        }}
        onSelect={handleSelectTarget}
        selectionContext="nodeId"
      />
    </div>
  );
};

export default AIMeasurePanel;
