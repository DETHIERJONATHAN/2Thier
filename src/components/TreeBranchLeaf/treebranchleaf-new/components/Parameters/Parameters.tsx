/**
 * 🔧 Parameters - Panneau de paramètres TreeBranchLeaf
 * 
 * Composant de la colonne droite qui affiche et permet d'éditer
 * les paramètres du nœud sélectionné dans la structure
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Empty, Space, Input, Select, Tooltip, Button } from 'antd';
import type { InputRef } from 'antd';
import { 
  SettingOutlined, 
  AppstoreOutlined, 
  BgColorsOutlined,
  DatabaseOutlined,
  FunctionOutlined,
  FilterOutlined,
  TableOutlined,
  ApiOutlined,
  LinkOutlined,
  TagsOutlined
} from '@ant-design/icons';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { CapabilityPanels, FieldAppearancePanels, TreeBranchLeafRegistry } from '../../core/registry';
import type { 
  TreeBranchLeafTree, 
  TreeBranchLeafNode, 
  UIState,
  TreeBranchLeafRegistry as TreeBranchLeafRegistryType 
} from '../../types';

const { Title, Text } = Typography;

interface ParametersProps {
  tree: TreeBranchLeafTree | null;
  selectedNode: TreeBranchLeafNode | null;
  panelState: UIState['panelState'];
  onNodeUpdate: (node: Partial<TreeBranchLeafNode> & { id: string }) => Promise<TreeBranchLeafNode | null>;
  onCapabilityConfig: (node: Partial<TreeBranchLeafNode> & { id: string }) => Promise<TreeBranchLeafNode | null>;
  readOnly?: boolean;
  registry: TreeBranchLeafRegistryType;
}

const Parameters: React.FC<ParametersProps> = (props) => {
  const { tree, selectedNode, panelState, registry, onNodeUpdate } = props;
  
  // Refs pour cleanup
  const mountedRef = useRef<boolean>(true);

  const capabilities = useMemo(() => registry.getAllCapabilities(), [registry]);
  const [openCaps, setOpenCaps] = useState<Set<string>>(new Set<string>(Array.from(panelState.openCapabilities || [])));
  // État pour le panneau d'apparence
  const [appearanceOpen, setAppearanceOpen] = useState<boolean>(false);
  // ancres pour scroll auto des panneaux de capacités
  const capRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Drawer pour l'apparence
  const labelInputRef = useRef<InputRef | null>(null);

  // Etat local pour édition basique
  const [label, setLabel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  // Repliable supprimé: état supprimé pour simplifier l'UI
  const [fieldType, setFieldType] = useState<string | undefined>(undefined);
  const [capsState, setCapsState] = useState<Record<string, boolean>>({});
  // Mémorise l'état précédent des capacités pour détecter les activations externes
  const prevCapsRef = useRef<Record<string, boolean>>({});

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Hydratation à la sélection
  useEffect(() => {
    if (!selectedNode) return;
    setLabel(selectedNode.label || '');
    setDescription(selectedNode.description || '');
    setIsRequired(!!selectedNode.isRequired);
    setIsVisible(selectedNode.isVisible !== false);
    // Fermer le panneau d'apparence lors du changement de nœud
    setAppearanceOpen(false);
    // Repliable supprimé: on ignore metadata.collapsible
    const nodeType = registry.getNodeType(selectedNode.type);
    const ft = (selectedNode.subType as string | undefined)
        || (selectedNode.metadata?.fieldType as string | undefined)
        || nodeType?.defaultFieldType;
    setFieldType(ft);
    
    // Initialiser l'apparence par défaut si elle n'existe pas et que c'est un champ
    if (ft && !selectedNode.appearanceConfig && selectedNode.type !== 'branch' && selectedNode.type !== 'section') {
      const defaultAppearance = TreeBranchLeafRegistry.getDefaultAppearanceConfig(ft);
      const tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(defaultAppearance);
      
      // Mettre à jour le nœud avec l'apparence par défaut
      patchNode({ 
        appearanceConfig: defaultAppearance,
        ...tblMapping
      });
    }
    // 🔧 FIX: Détecter si des conditions existent via l'API et hasCondition
    // Note: Les conditions sont maintenant dans une table séparée, pas dans conditionConfig
    const conditionActive = !!selectedNode.hasCondition;
    // Init état local des capacités pour rendu instantané des toggles
    setCapsState({
      data: !!selectedNode.hasData,
      formula: !!selectedNode.hasFormula,
      condition: conditionActive,
      table: !!selectedNode.hasTable,
      api: !!selectedNode.hasAPI,
      link: !!selectedNode.hasLink,
      markers: !!selectedNode.hasMarkers
    });
    // Initialiser les panneaux ouverts SEULEMENT au premier chargement du node
    if (selectedNode) {
      setOpenCaps(new Set<string>(Array.from(panelState.openCapabilities || [])));
    }
  }, [selectedNode?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- Volontairement limité à l'ID pour éviter les re-synchronisations intempestives
  
  // Auto-focus sur le libellé pour édition rapide
  useEffect(() => {
    if (selectedNode) {
      setTimeout(() => {
        try {
          labelInputRef.current?.focus?.({ cursor: 'end' });
        } catch {
          // noop
        }
      }, 50);
    }
  }, [selectedNode?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- Seulement au changement de node

  // Suivi des changements d'état pour diagnostic, sans auto-ouverture
  useEffect(() => {
    prevCapsRef.current = { ...capsState };
  }, [capsState]);

  // Sauvegarde debounced avec l'API optimisée
  const patchNode = useDebouncedCallback(async (payload: Record<string, unknown>) => {
    if (!selectedNode || !tree) return;
    
    console.log('🔄 [Parameters] Sauvegarde avec debounce:', {
      nodeId: selectedNode.id,
      payload: payload,
      hasAppearanceConfig: !!payload.appearanceConfig
    });
    
    try {
      // 🔄 NOUVEAU : Flatten appearanceConfig vers metadata.appearance pour compatibilité API
      const apiData = { ...payload };
      if (payload.appearanceConfig) {
        apiData.metadata = {
          ...(apiData.metadata as Record<string, unknown> || {}),
          appearance: payload.appearanceConfig
        };
        
        console.log('🔄 [Parameters] Transformation appearanceConfig vers metadata.appearance:', {
          original: payload.appearanceConfig,
          metadata: apiData.metadata
        });
      }
      
      await onNodeUpdate({ ...apiData, id: selectedNode.id });
      console.log('✅ [Parameters] Sauvegarde réussie');
    } catch (error) {
      console.error('❌ [Parameters] Erreur lors de la sauvegarde:', error);
    }
  }, [selectedNode, tree, onNodeUpdate]);

  // Gestionnaire de changement de label
  const handleLabelChange = useCallback((value: string) => {
    setLabel(value);
    patchNode({ label: value });
  }, [patchNode]);

  // Gestionnaire de changement de description
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    patchNode({ description: value });
  }, [patchNode]);

  // Gestionnaire de changement de visibilité
  const handleVisibilityChange = useCallback((value: boolean) => {
    setIsVisible(value);
    patchNode({ isVisible: value });
  }, [patchNode]);

  // Gestionnaire de changement de required
  const handleRequiredChange = useCallback((value: boolean) => {
    setIsRequired(value);
    patchNode({ isRequired: value });
  }, [patchNode]);

  // Gestionnaire de changement de fieldType
  const handleFieldTypeChange = useCallback((value: string) => {
    setFieldType(value);
    // Fermer le panneau d'apparence quand on change de type
    setAppearanceOpen(false);
    
    // Appliquer l'apparence par défaut pour le nouveau type
    const defaultAppearance = TreeBranchLeafRegistry.getDefaultAppearanceConfig(value);
    const tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(defaultAppearance);
    
    patchNode({ 
      subType: value,
      appearanceConfig: defaultAppearance,
      ...tblMapping
    });
  }, [patchNode]);

  if (!selectedNode) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Sélectionnez un nœud pour voir ses paramètres"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>Paramètres du nœud</span>
        </Space>
      }
      size="small"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Section Apparence */}
        <div>
          <Title level={5} style={{ marginBottom: 12 }}>
            <BgColorsOutlined style={{ marginRight: 8 }} />
            Apparence
          </Title>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* Libellé avec boutons de visibilité à droite */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Text strong>Libellé</Text>
                <Input
                  ref={labelInputRef}
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Libellé du champ"
                  disabled={props.readOnly}
                  size="small"
                />
              </div>
              
              {/* Boutons de visibilité à droite */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 20 }}>
                <Tooltip title="Visible">
                  <Button
                    type={isVisible ? "primary" : "default"}
                    size="small"
                    style={{ width: 24, height: 24, padding: 0 }}
                    onClick={() => handleVisibilityChange(!isVisible)}
                    disabled={props.readOnly}
                  >
                    👁
                  </Button>
                </Tooltip>
                
                <Tooltip title="Requis">
                  <Button
                    type={isRequired ? "primary" : "default"}
                    size="small"
                    style={{ width: 24, height: 24, padding: 0 }}
                    onClick={() => handleRequiredChange(!isRequired)}
                    disabled={props.readOnly}
                  >
                    *
                  </Button>
                </Tooltip>
              </div>
            </div>
            
            <div>
              <Text strong>Description</Text>
              <Input.TextArea
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Description du champ"
                rows={2}
                disabled={props.readOnly}
              />
            </div>
            
            {/* Type de champ avec bouton Apparence à droite */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Text strong>Type de champ</Text>
                {selectedNode?.type === 'branch' || selectedNode?.type === 'section' ? (
                  <div style={{ 
                    padding: '4px 8px', 
                    backgroundColor: '#f0f0f0', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    color: '#666',
                    textAlign: 'center',
                    marginTop: '4px'
                  }}>
                    {selectedNode.type === 'branch' ? '🌿 Branche (pas de champ)' : '📋 Section (pas de champ)'}
                  </div>
                ) : (
                  <Select
                    value={fieldType}
                    onChange={handleFieldTypeChange}
                    style={{ width: '100%' }}
                    disabled={props.readOnly}
                    size="small"
                    placeholder="Sélectionner un type de champ"
                  >
                    <Select.Option value="text">📝 Texte (TEXT)</Select.Option>
                    <Select.Option value="number">🔢 Nombre (NUMBER)</Select.Option>
                    <Select.Option value="boolean">✅ Booléen (BOOL)</Select.Option>
                    <Select.Option value="select">📋 Sélection (SELECT)</Select.Option>
                    <Select.Option value="multiselect">📋✅ Sélection multiple (MULTISELECT)</Select.Option>
                    <Select.Option value="date">📅 Date/Heure (DATE)</Select.Option>
                    <Select.Option value="image">🖼️ Image (IMAGE)</Select.Option>
                    <Select.Option value="file">📎 Fichier (FILE)</Select.Option>
                  </Select>
                )}
              </div>
              
              {/* Bouton Apparence à droite */}
              <div style={{ marginTop: 20 }}>
                <Tooltip title={
                  selectedNode?.type === 'branch' || selectedNode?.type === 'section' 
                    ? 'Les branches et sections n\'ont pas d\'apparence de champ' 
                    : 'Apparence du champ'
                }>
                  <Button
                    type={appearanceOpen ? "primary" : "default"}
                    size="small"
                    icon={<BgColorsOutlined />}
                    style={{ width: 32, height: 24 }}
                    disabled={props.readOnly || !fieldType || selectedNode?.type === 'branch' || selectedNode?.type === 'section'}
                    onClick={() => {
                      setAppearanceOpen(!appearanceOpen);
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          </Space>
        </div>

        {/* Panneau d'apparence spécifique au type de champ */}
        {appearanceOpen && fieldType && (
          <div style={{ marginTop: 12, border: '1px solid #e8e8e8', borderRadius: 6, backgroundColor: '#fbfbfb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e8e8e8', backgroundColor: '#f7f7f7' }}>
              <Text strong style={{ fontSize: 12 }}>
                <BgColorsOutlined style={{ marginRight: 6, fontSize: 11 }} />
                Configuration Apparence ({fieldType?.toUpperCase()})
              </Text>
              <Button 
                type="text" 
                size="small" 
                onClick={() => setAppearanceOpen(false)}
                style={{ fontSize: 12, padding: 0, width: 18, height: 18, lineHeight: '18px' }}
              >
                ×
              </Button>
            </div>
            
            <div style={{ padding: 8 }}>
              {(() => {
                const fieldTypeUpper = fieldType?.toUpperCase();
                const panelImporter = (FieldAppearancePanels as Record<string, () => Promise<{ default: React.ComponentType<unknown> }>>)[fieldTypeUpper || ''];
                if (!panelImporter) {
                  return (
                    <div style={{ padding: 8, fontSize: 11, color: '#999', textAlign: 'center' }}>
                      Panneau d'apparence pour "{fieldType}" en cours de développement...
                    </div>
                  );
                }
                
                const LazyAppearancePanel = React.lazy(panelImporter);
                return (
                  <React.Suspense fallback={<div style={{ padding: 8, fontSize: 11, textAlign: 'center' }}>Chargement...</div>}>
                    <div 
                      style={{ 
                        fontSize: '11px',
                        // Compactage des éléments internes
                        '--ant-typography-margin-bottom': '4px',
                        '--ant-form-item-margin-bottom': '6px'
                      } as React.CSSProperties & Record<string, string>}
                    >
                      <LazyAppearancePanel 
                        value={selectedNode?.appearanceConfig || {}}
                        onChange={(config: Record<string, unknown>) => {
                          // Mapper vers les champs TBL
                          const tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(config);
                          patchNode({ 
                            appearanceConfig: config,
                            ...tblMapping 
                          });
                        }}
                        readOnly={props.readOnly}
                      />
                    </div>
                  </React.Suspense>
                );
              })()}
            </div>
          </div>
        )}

        {/* Section Capacités */}
        <div>
          <Title level={5} style={{ marginBottom: 12 }}>
            <AppstoreOutlined style={{ marginRight: 8 }} />
            Capacités
          </Title>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {capabilities.map(cap => {
              const isActive = capsState[cap.key] || false;
              const isOpen = openCaps.has(cap.key);
              const hasData = selectedNode?.config?.[cap.key] && Object.keys(selectedNode.config[cap.key]).length > 0;
              
              const getCapabilityIcon = (key: string) => {
                switch(key) {
                  case 'data': return <DatabaseOutlined />;
                  case 'formula': return <FunctionOutlined />;
                  case 'condition': return <FilterOutlined />;
                  case 'conditions': return <FilterOutlined />;
                  case 'table': return <TableOutlined />;
                  case 'api': return <ApiOutlined />;
                  case 'link': return <LinkOutlined />;
                  case 'markers': return <TagsOutlined />;
                  default: return <AppstoreOutlined />;
                }
              };
              
              const getButtonType = () => {
                if (hasData) return 'primary'; // Bleu si a des données
                if (isActive) return 'default'; // Gris si activé mais pas de données
                return 'text'; // Très discret si pas activé
              };
              
              return (
                <Tooltip key={cap.key} title={`${cap.label}${hasData ? ' (avec données)' : isActive ? ' (activé)' : ' (désactivé)'}`}>
                  <Button
                    type={getButtonType()}
                    size="small"
                    icon={getCapabilityIcon(cap.key)}
                    onClick={() => {
                      if (!props.readOnly) {
                        // Simple toggle de l'ouverture du panneau - PAS d'activation automatique
                        setOpenCaps(prev => {
                          const next = new Set(prev);
                          if (next.has(cap.key)) {
                            next.delete(cap.key);
                          } else {
                            next.add(cap.key);
                          }
                          return next;
                        });
                      }
                    }}
                    disabled={props.readOnly}
                    style={{ 
                      width: 32, 
                      height: 24,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: isOpen ? '#1890ff' : undefined,
                      backgroundColor: hasData ? '#1890ff' : isOpen ? '#f0f9ff' : undefined,
                      color: hasData ? 'white' : undefined
                    }}
                  />
                </Tooltip>
              );
            })}
          </div>

          {/* Panneaux auto-ouverts */}
          <div style={{ marginTop: 12 }}>
            {capabilities.map(cap => {
              if (!openCaps.has(cap.key)) return null;
              const importer = (CapabilityPanels as Record<string, () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>>)[cap.key];
              if (!importer) return null;
              const LazyPanel = React.lazy(importer);
              return (
                <React.Suspense fallback={<div style={{ padding: 8, fontSize: 12 }}>Chargement {cap.label}…</div>} key={`cap-panel-${cap.key}`}>
                  <div style={{ marginTop: 8 }} ref={(el) => { capRefs.current[cap.key] = el; }}>
                    <LazyPanel 
                      treeId={tree?.id || ''} 
                      nodeId={selectedNode!.id} 
                      onNodeUpdate={onNodeUpdate}
                    />
                  </div>
                </React.Suspense>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Parameters;
