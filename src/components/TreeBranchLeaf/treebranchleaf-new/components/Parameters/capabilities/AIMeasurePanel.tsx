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
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';

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

const DEFAULT_CONFIG: AIMeasureConfig = {
  enabled: false,
  prompt: '',
  measureKeys: [],
  mappings: [],
  autoTrigger: true
};

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<AIMeasureConfig>(value ?? DEFAULT_CONFIG);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; mode: string } | null>(null);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      try {
        setLoading(true);

        // 🔧 FIX: Utiliser GET /nodes/:nodeId (simple) au lieu de /full
        // Le endpoint /full retourne { nodes: [...] } alors qu'on veut juste 1 nœud
        const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}`);
        const node = response?.data || response;
        
        // 🔍 DEBUG: Voir ce que le backend retourne vraiment
        console.log('📊 [AIMeasurePanel] Réponse backend simple GET:', {
          nodeKeys: node ? Object.keys(node).filter(k => k.startsWith('aiMeasure_')) : [],
          aiMeasure_enabled: node?.aiMeasure_enabled,
          aiMeasure_autoTrigger: node?.aiMeasure_autoTrigger,
          aiMeasure_prompt: node?.aiMeasure_prompt,
          aiMeasure_keys: node?.aiMeasure_keys
        });

        // 🔧 IMPORTANT: Charger depuis les colonnes dédiées EN PRIORITÉ
        // Contrairement au metadata.aiMeasure, les colonnes dédiées sont toujours là après save
        if (node?.aiMeasure_enabled !== undefined || node?.aiMeasure_prompt !== undefined || node?.aiMeasure_keys !== undefined || node?.aiMeasure_autoTrigger !== undefined) {
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
        } else {
          setConfig(DEFAULT_CONFIG);
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

  const handleToggleEnabled = useCallback((enabled: boolean) => {
    const newConfig = { ...config, enabled };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handlePromptChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const prompt = event.target.value;
    const newConfig = { ...config, prompt };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handleAutoTriggerChange = useCallback((autoTrigger: boolean) => {
    const newConfig = { ...config, autoTrigger };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

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
