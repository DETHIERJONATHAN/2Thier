import React, { useCallback, useEffect, useState } from 'react';
import { Card, Typography, Space, Checkbox, Radio, Alert, message, Button, Popconfirm, Tag, Divider, Image } from 'antd';
import { LinkOutlined, AimOutlined, DeleteOutlined, SelectOutlined, PictureOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';

const { Title, Text } = Typography;

type LinkMode = 'JUMP' | 'APPEND_SECTION' | 'PHOTO';

interface LinkConfigValue {
  targetTreeId?: string;
  targetNodeId?: string;
  targetNodeLabel?: string;
  targetTreeName?: string;
  mode?: LinkMode;
  carryContext?: boolean;
}

interface LinkPanelProps {
  treeId?: string;
  nodeId: string;
  value?: LinkConfigValue | Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const LinkPanel: React.FC<LinkPanelProps> = ({ treeId, nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const [config, setConfig] = useState<LinkConfigValue>(() => ({
    targetTreeId: (value as LinkConfigValue)?.targetTreeId,
    targetNodeId: (value as LinkConfigValue)?.targetNodeId,
    targetNodeLabel: (value as LinkConfigValue)?.targetNodeLabel,
    targetTreeName: (value as LinkConfigValue)?.targetTreeName,
    mode: (value as LinkConfigValue)?.mode || 'JUMP',
    carryContext: Boolean((value as LinkConfigValue)?.carryContext)
  }));
  const [loading, setLoading] = useState(false);
  const [treeSelectorOpen, setTreeSelectorOpen] = useState(false);

  // Chargement initial depuis les colonnes directes de la DB
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { 
          link_targetNodeId?: string;
          link_targetTreeId?: string;
          link_mode?: string;
          link_carryContext?: boolean;
          hasLink?: boolean;
        };
        if (!mounted) return;
        
        // Charger depuis les colonnes directes
        if (node?.link_targetNodeId || node?.hasLink) {
          // Récupérer le label du nœud cible si on a un targetNodeId
          let targetNodeLabel = node.link_targetNodeId;
          let targetTreeName: string | undefined;
          
          if (node.link_targetNodeId) {
            try {
              const targetNode = await api.get(`/api/treebranchleaf/nodes/${node.link_targetNodeId}`) as {
                label?: string;
                TreeBranchLeafTree?: { name?: string };
              };
              targetNodeLabel = targetNode?.label || node.link_targetNodeId;
              targetTreeName = targetNode?.TreeBranchLeafTree?.name;
            } catch {
              // Nœud cible peut ne plus exister
            }
          }
          
          const initial: LinkConfigValue = {
            targetTreeId: node.link_targetTreeId,
            targetNodeId: node.link_targetNodeId,
            targetNodeLabel,
            targetTreeName,
            mode: (node.link_mode as LinkMode) || 'JUMP',
            carryContext: Boolean(node.link_carryContext)
          };
          setConfig(initial);
          onChange?.(initial as Record<string, unknown>);
        }
      } catch (err) {
        console.error('❌ [LinkPanel] Erreur chargement:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, onChange]);

  // Sauvegarde directement dans les colonnes de la DB (link_targetNodeId, link_mode, etc.)
  const save = useCallback(async (next: LinkConfigValue) => {
    if (next.targetNodeId && next.targetNodeId === nodeId) {
      message.error('Le lien ne peut pas cibler ce même nœud.');
      return;
    }
    try {
      // Récupérer le node actuel pour avoir le treeId
      const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { 
        metadata?: Record<string, unknown>;
        treeId?: string;
      };
      
      const hasTarget = !!next.targetNodeId;
      const effectiveTreeId = treeId || node?.treeId;
      
      // 🎯 Sauvegarder dans les colonnes directes de la DB
      const updatePayload = { 
        hasLink: hasTarget,
        link_targetNodeId: next.targetNodeId || null,
        link_targetTreeId: next.targetTreeId || null,
        link_mode: next.mode || 'JUMP',
        link_carryContext: next.carryContext || false
      };
      
      if (effectiveTreeId) {
        await api.put(`/api/treebranchleaf/trees/${effectiveTreeId}/nodes/${nodeId}`, updatePayload);
      } else {
        await api.put(`/api/treebranchleaf/nodes/${nodeId}`, updatePayload);
      }
      
      // Émettre l'événement pour rafraîchir l'UI
      window.dispatchEvent(new CustomEvent('tbl-node-updated', { 
        detail: { 
          node: { id: nodeId, hasLink: hasTarget, ...updatePayload }, 
          treeId: effectiveTreeId, 
          nodeId 
        } 
      }));
      
      onChange?.(next as Record<string, unknown>);
      console.log('✅ [LinkPanel] Lien sauvegardé:', updatePayload);
    } catch (err) {
      console.error('❌ [LinkPanel] Erreur sauvegarde:', err);
      message.error('Erreur de sauvegarde du lien');
    }
  }, [api, nodeId, treeId, onChange]);
  const debouncedSave = useDebouncedCallback(save, 400);

  // Handler pour la sélection via NodeTreeSelector
  const handleTreeSelection = useCallback(async (selection: NodeTreeSelectorValue) => {
    console.log('🔗 [LinkPanel] Sélection:', selection);
    
    // Extraire le nodeId depuis le ref
    let selectedNodeId = selection.ref;
    if (selectedNodeId.startsWith('@value.')) {
      selectedNodeId = selectedNodeId.replace('@value.', '');
    }
    if (selectedNodeId.startsWith('@select.')) {
      selectedNodeId = selectedNodeId.replace('@select.', '');
    }
    
    // Récupérer les infos du nœud sélectionné
    try {
      const nodeData = await api.get(`/api/treebranchleaf/nodes/${selectedNodeId}`) as { 
        id: string; 
        label?: string; 
        treeId?: string;
        TreeBranchLeafTree?: { id: string; name: string };
      };
      
      const targetTreeId = nodeData.treeId || nodeData.TreeBranchLeafTree?.id;
      const targetTreeName = nodeData.TreeBranchLeafTree?.name;
      const targetNodeLabel = nodeData.label || selectedNodeId;
      
      const next: LinkConfigValue = {
        ...config,
        targetNodeId: selectedNodeId,
        targetTreeId,
        targetNodeLabel,
        targetTreeName
      };
      
      setConfig(next);
      debouncedSave(next);
      message.success(`Lien configuré vers "${targetNodeLabel}"`);
    } catch (err) {
      console.error('Erreur récupération nœud:', err);
      const next: LinkConfigValue = {
        ...config,
        targetNodeId: selectedNodeId,
        targetNodeLabel: selectedNodeId
      };
      setConfig(next);
      debouncedSave(next);
    }
    
    setTreeSelectorOpen(false);
  }, [api, config, debouncedSave]);

  // Changer le mode
  const setMode = useCallback((mode: LinkMode) => {
    const next = { ...config, mode };
    setConfig(next);
    debouncedSave(next);
  }, [config, debouncedSave]);

  // Changer carryContext
  const setCarryContext = useCallback((carryContext: boolean) => {
    const next = { ...config, carryContext };
    setConfig(next);
    debouncedSave(next);
  }, [config, debouncedSave]);

  // Supprimer le lien (appelé par Popconfirm)
  const handleDeleteLink = useCallback(async () => {
    console.log('🗑️ [LinkPanel] handleDeleteLink appelé, nodeId:', nodeId);
    try {
          const empty: LinkConfigValue = { 
            targetTreeId: undefined, 
            targetNodeId: undefined, 
            targetNodeLabel: undefined,
            targetTreeName: undefined,
            mode: 'JUMP', 
            carryContext: false 
          };
          
          // Récupérer le treeId du node
          const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { 
            treeId?: string;
          };
          const effectiveTreeId = treeId || node?.treeId;
          
          // 🎯 Supprimer via les colonnes directes
          const updatePayload = { 
            hasLink: false,
            link_targetNodeId: null,
            link_targetTreeId: null,
            link_mode: 'JUMP',
            link_carryContext: false
          };
          
          if (effectiveTreeId) {
            await api.put(`/api/treebranchleaf/trees/${effectiveTreeId}/nodes/${nodeId}`, updatePayload);
          } else {
            await api.put(`/api/treebranchleaf/nodes/${nodeId}`, updatePayload);
          }
          
          // Émettre l'événement pour rafraîchir l'UI
          window.dispatchEvent(new CustomEvent('tbl-node-updated', { 
            detail: { 
              node: { id: nodeId, hasLink: false, ...updatePayload }, 
              treeId: effectiveTreeId, 
              nodeId 
            } 
          }));
          
      setConfig(empty);
      onChange?.(empty as Record<string, unknown>);
      message.success('Lien supprimé');
      console.log('✅ [LinkPanel] Lien supprimé');
    } catch (err) {
      console.error('❌ [LinkPanel] Erreur suppression:', err);
      message.error('Impossible de supprimer le lien');
    }
  }, [api, nodeId, treeId, onChange]);

  // Affichage de la cible actuelle
  const renderTargetDisplay = () => {
    if (!config.targetNodeId) {
      return (
        <div style={{ 
          padding: '16px', 
          background: '#fafafa', 
          borderRadius: 8, 
          border: '2px dashed #d9d9d9',
          textAlign: 'center'
        }}>
          <AimOutlined style={{ fontSize: 24, color: '#bfbfbf', marginBottom: 8 }} />
          <div>
            <Text type="secondary">Aucune cible sélectionnée</Text>
          </div>
          <Button 
            type="primary" 
            icon={<SelectOutlined />}
            onClick={() => setTreeSelectorOpen(true)}
            disabled={readOnly}
            style={{ marginTop: 12 }}
          >
            Sélectionner un nœud cible
          </Button>
        </div>
      );
    }

    return (
      <div style={{ 
        padding: '12px 16px', 
        background: '#f6ffed', 
        borderRadius: 8, 
        border: '1px solid #b7eb8f'
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <LinkOutlined style={{ color: '#52c41a' }} />
              <Text strong>Cible du lien</Text>
            </Space>
            <Space>
              <Button 
                size="small" 
                icon={<SelectOutlined />}
                onClick={() => setTreeSelectorOpen(true)}
                disabled={readOnly}
              >
                Modifier
              </Button>
              <Popconfirm
                title="Supprimer le lien ?"
                description="Cette action supprime la configuration du lien."
                onConfirm={handleDeleteLink}
                okText="Supprimer"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
                disabled={readOnly}
              >
                <Button 
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />}
                  disabled={readOnly}
                />
              </Popconfirm>
            </Space>
          </div>
          
          <div style={{ marginTop: 8 }}>
            {config.targetTreeName && (
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Arbre : </Text>
                <Tag color="blue">{config.targetTreeName}</Tag>
              </div>
            )}
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Nœud : </Text>
              <Tag color="green">{config.targetNodeLabel || config.targetNodeId}</Tag>
            </div>
          </div>
        </Space>
      </div>
    );
  };

  return (
    <Card size="small" variant="outlined" loading={loading}>
      <Title level={5}>
        <LinkOutlined style={{ marginRight: 8 }} />
        Lien de navigation
      </Title>
      
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Configure un lien pour naviguer vers un autre nœud ou ajouter une section.
      </Text>

      {/* Affichage de la cible */}
      {renderTargetDisplay()}

      {/* Options du lien (seulement si une cible est sélectionnée) */}
      {config.targetNodeId && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Mode */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Mode de liaison
              </Text>
              <Radio.Group
                value={config.mode}
                onChange={(e) => setMode(e.target.value as LinkMode)}
                disabled={readOnly}
              >
                <Radio.Button value="JUMP">
                  🚀 Aller à
                </Radio.Button>
                <Radio.Button value="APPEND_SECTION">
                  ➕ Ajouter section
                </Radio.Button>
                <Radio.Button value="PHOTO">
                  📷 Afficher photo
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* Description du mode PHOTO */}
            {config.mode === 'PHOTO' && (
              <Alert
                type="info"
                showIcon
                icon={<PictureOutlined />}
                message="Mode Photo"
                description="La photo du champ cible sera affichée en miniature dans une bulle. Cliquez dessus pour l'agrandir."
                style={{ marginTop: 8 }}
              />
            )}

            {/* Context - seulement pour les modes navigation */}
            {config.mode !== 'PHOTO' && (
              <Checkbox
                checked={!!config.carryContext}
                onChange={(e) => setCarryContext(e.target.checked)}
                disabled={readOnly}
              >
                📦 Transporter le contexte (données de session)
              </Checkbox>
            )}
          </Space>
        </>
      )}

      {/* Alerte si lien vers soi-même */}
      {config.targetNodeId === nodeId && (
        <Alert 
          type="warning" 
          showIcon 
          message="Le lien ne peut pas cibler ce même nœud."
          style={{ marginTop: 16 }}
        />
      )}

      {/* NodeTreeSelector Modal */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={treeSelectorOpen}
        onClose={() => setTreeSelectorOpen(false)}
        onSelect={handleTreeSelection}
        selectionContext="nodeId"
        allowMulti={false}
      />
    </Card>
  );
};

export default LinkPanel;
