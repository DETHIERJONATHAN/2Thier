/**
 * 🔗 SharedReferencePanel - Gestion du mode de réutilisation des nœuds
 * 
 * Permet de définir si un nœud est :
 * - Une copie indépendante (par défaut)
 * - Une référence partagée (réutilisable ailleurs)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Radio, 
  Select, 
  Input, 
  Button, 
  Space, 
  Divider,
  message,
  Modal
} from 'antd';
import { 
  LinkOutlined,
  CopyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface SharedReferencePanelProps {
  nodeId: string; // ID du nœud sur lequel on travaille (pour lier les références)
  treeId?: string; // ID de l'arbre pour créer de nouvelles références partagées
  value?: SharedReferenceConfig;
  onChange?: (val: SharedReferenceConfig) => void;
  onNodeUpdate?: (updates: Partial<SharedReferenceConfig>) => Promise<void>;
  readOnly?: boolean;
}

export interface SharedReferenceConfig {
  isSharedReference: boolean;
  sharedReferenceId?: string | null;
  sharedReferenceName?: string | null;
  sharedReferenceDescription?: string | null;
  // Support multi-références
  sharedReferenceIds?: string[];
}

interface SharedReferenceTemplate {
  id: string;
  label: string;
  description?: string;
  usageCount: number;
  usages: Array<{ treeId: string; path: string }>;
}

const SharedReferencePanel: React.FC<SharedReferencePanelProps> = ({
  nodeId, // ID du nœud sur lequel on travaille (pour lier des références)
  treeId: _treeId, // ID de l'arbre pour créer de nouvelles références
  value,
  onChange,
  onNodeUpdate,
  readOnly = false
}) => {
  const { api } = useAuthenticatedApi();
  
  const [mode, setMode] = useState<'copy' | 'reference'>(
    value?.isSharedReference ? 'reference' : 'copy'
  );
  // ✅ MULTI-SÉLECTION : Array de références au lieu d'une seule
  const [selectedReferenceIds, _setSelectedReferenceIds] = useState<string[]>(
    value?.sharedReferenceIds || (value?.sharedReferenceId ? [value.sharedReferenceId] : [])
  );
  const [newReferenceName, setNewReferenceName] = useState('');
  const [newReferenceDescription, setNewReferenceDescription] = useState('');
  const [availableReferences, setAvailableReferences] = useState<SharedReferenceTemplate[]>([]);
  const [_selectedReferenceDetails, setSelectedReferenceDetails] = useState<SharedReferenceTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TreeBranchLeafNode | null>(null);
  const [editingReference, setEditingReference] = useState<SharedReferenceTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingReference, setDeletingReference] = useState<SharedReferenceTemplate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchNode = async () => {
      if (nodeId) {
        try {
          // 💡 Récupérer les détails complets du nœud pour avoir accès à ses options
          const response = await api.get<TreeBranchLeafNode>(`/api/treebranchleaf/nodes/${nodeId}`);
          setSelectedNode(response);
        } catch (error) {
          console.error("❌ [SharedRef] Impossible de charger les détails du nœud:", error);
        }
      }
    };
    fetchNode();
  }, [nodeId, api]);

  const loadAvailableReferences = useCallback(async () => {
    console.log('🔄 [SharedRef] Chargement des références disponibles...');
    try {
      setLoading(true);
      const response = await api.get<SharedReferenceTemplate[]>(
        `/api/treebranchleaf/shared-references`
      );
      console.log(`✅ [SharedRef] ${response?.length || 0} références chargées`);
      setAvailableReferences(response || []);
    } catch (error) {
      console.error('❌ [SharedRef] Erreur lors du chargement des références:', error);
      message.error('Impossible de charger les références disponibles');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadReferenceDetails = useCallback(async (refId: string) => {
    try {
      const response = await api.get<SharedReferenceTemplate>(
        `/api/treebranchleaf/shared-references/${refId}`
      );
      setSelectedReferenceDetails(response);
    } catch (error) {
      console.error('Erreur chargement info template:', error);
    }
  }, [api]);

  const handleModeChange = useCallback(async (newMode: 'copy' | 'reference') => {
    if (!selectedNode) return;

    setMode(newMode);

    const updates: Partial<TreeBranchLeafNode> = {
      id: selectedNode.id,
      isSharedReference: newMode === 'reference',
    };

    // Si on passe en mode copie, on nettoie toutes les références
    if (newMode === 'copy') {
      updates.sharedReferenceId = null;
      updates.sharedReferenceName = null;
      updates.sharedReferenceDescription = null;
      updates.sharedReferenceIds = [];
      
      // 💥 NOUVEAU: Forcer la suppression des références sur les options aussi
      if (selectedNode.options && selectedNode.options.length > 0) {
        updates.options = selectedNode.options.map(opt => ({
          ...opt,
          sharedReferenceIds: [], // Nettoyer les références de l'option
        }));
      }
    }
    
    // Appeler onNodeUpdate pour persister les changements globaux
    if (onNodeUpdate) {
      await onNodeUpdate(updates);
    }
    
    // Mettre à jour l'état local pour l'UI
    onChange?.({ ...value, ...updates } as SharedReferenceConfig);

  }, [selectedNode, onNodeUpdate, onChange, value]);

  const handleCreateReference = useCallback(async () => {
    if (!newReferenceName.trim()) {
      message.warning('Veuillez saisir un nom pour la référence');
      return;
    }

    if (!_treeId) {
      message.error('Impossible de déterminer l\'arbre du nœud');
      return;
    }

    try {
      setCreating(true);
      
      // ✅ NOUVEAU : Créer un NOUVEAU nœud référence partagé (au lieu de convertir l'actuel)
      const response = await api.post<{ id: string; node: SharedReferenceTemplate }>(
        `/api/treebranchleaf/trees/${_treeId}/create-shared-reference`,
        {
          name: newReferenceName.trim(),
          description: newReferenceDescription.trim() || undefined,
          fieldType: 'TEXT', // Par défaut, l'utilisateur peut le modifier après
          label: newReferenceName.trim()
        }
      );

      console.log('✅ [SharedRef] Nouveau nœud référence créé:', response.id);
      message.success('Référence partagée créée avec succès');
      
      // Réinitialiser le formulaire
      setNewReferenceName('');
      setNewReferenceDescription('');
      
      // ✅ Recharger la liste des références après création
      await loadAvailableReferences();
      
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      message.error('Impossible de créer la référence');
    } finally {
      setCreating(false);
    }
  }, [_treeId, newReferenceName, newReferenceDescription, api, loadAvailableReferences]);

  const handleEditReference = useCallback((ref: SharedReferenceTemplate) => {
    setEditingReference(ref);
    setEditName(ref.label);
    setEditDescription(ref.description || '');
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingReference || !editName.trim()) {
      message.warning('Le nom est requis');
      return;
    }

    try {
      await api.put(`/api/treebranchleaf/shared-references/${editingReference.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined
      });

      message.success('Référence modifiée avec succès');
      setIsEditModalOpen(false);
      setEditingReference(null);
      
      // Recharger la liste
      await loadAvailableReferences();
    } catch (error) {
      console.error('Erreur modification:', error);
      message.error('Impossible de modifier la référence');
    }
  }, [editingReference, editName, editDescription, api, loadAvailableReferences]);

  const handleDeleteReference = useCallback(async (refId: string) => {
    console.log('🗑️ [SharedRef] Début suppression:', refId);
    try {
      const response = await api.delete(`/api/treebranchleaf/shared-references/${refId}`);
      console.log('✅ [SharedRef] Suppression réussie:', response);
      message.success('Référence supprimée avec succès');
      
      // Retirer la référence supprimée de la sélection actuelle
      const updatedReferenceIds = (value?.sharedReferenceIds || []).filter(id => id !== refId);
      console.log('🔄 [SharedRef] Nouvelle sélection après suppression:', updatedReferenceIds);
      
      // Mettre à jour la sélection
      if (updatedReferenceIds.length === 0) {
        // Si plus aucune référence, revenir en mode copie indépendante
        onChange?.({
          isSharedReference: false,
          sharedReferenceId: null,
          sharedReferenceName: null,
          sharedReferenceDescription: null,
          sharedReferenceIds: []
        });
      } else {
        // Sinon, mettre à jour avec les références restantes
        const firstRef = availableReferences.find(r => r.id === updatedReferenceIds[0]);
        onChange?.({
          ...value,
          sharedReferenceIds: updatedReferenceIds,
          sharedReferenceId: firstRef?.id || null,
          sharedReferenceName: firstRef?.label || '',
          sharedReferenceDescription: firstRef?.description || null,
        } as SharedReferenceConfig);
      }
      
      // Notifier le parent si besoin
      if (onNodeUpdate && nodeId) {
        await onNodeUpdate({
          id: nodeId,
          sharedReferenceIds: updatedReferenceIds,
          sharedReferenceId: updatedReferenceIds[0] || null,
        });
      }
      
      // Recharger la liste
      await loadAvailableReferences();
      console.log('🔄 [SharedRef] Liste rechargée après suppression');
    } catch (error: any) {
      console.error('❌ [SharedRef] Erreur suppression:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Impossible de supprimer la référence');
      }
    }
  }, [api, loadAvailableReferences, value, onChange, onNodeUpdate, nodeId, availableReferences]);

  // Charger les références disponibles
  useEffect(() => {
    if (mode === 'reference') {
      loadAvailableReferences();
    }
  }, [mode, loadAvailableReferences]);

  // Charger les détails des références sélectionnées
  useEffect(() => {
    if (selectedReferenceIds.length > 0) {
      // Pour l'instant on charge les détails de la première référence
      // TODO: Adapter l'UI pour afficher les détails de toutes les références
      loadReferenceDetails(selectedReferenceIds[0]);
    } else {
      setSelectedReferenceDetails(null);
    }
  }, [selectedReferenceIds, loadReferenceDetails]);

  return (
    <Card 
      title={
        <Space>
          <LinkOutlined />
          <span>Mode de réutilisation</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Radio.Group
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          disabled={readOnly}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="copy">
              <Space>
                <CopyOutlined />
                <Text strong>Copie indépendante</Text>
                <Text type="secondary">(par défaut)</Text>
              </Space>
              <div style={{ marginLeft: 24, marginTop: 8 }}>
                <Text type="secondary">
                  Ce champ est unique et modifiable librement
                </Text>
              </div>
            </Radio>

            <Radio value="reference">
              <Space>
                <LinkOutlined />
                <Text strong>Référence partagée</Text>
              </Space>
              <div style={{ marginLeft: 24, marginTop: 8 }}>
                <Text type="secondary">
                  Ce champ est lié à un template réutilisable
                </Text>
              </div>
            </Radio>
          </Space>
        </Radio.Group>

        {mode === 'reference' && (
          <>
            <Divider />

            {/* Utiliser une ou plusieurs références existantes */}
            <Card size="small" title="✅ Choisir une ou plusieurs références">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  mode="multiple" // ✅ MULTI-SÉLECTION
                  style={{ width: '100%' }}
                  placeholder="Choisir une ou plusieurs références..."
                  value={value?.sharedReferenceIds || []}
                  onChange={async (newReferenceIds: string[], newOptions) => {
                    // CORRECTION FINALE : Utilisation de la prop `nodeId` qui est la bonne cible.
                    const targetNodeId = nodeId;

                    if (!targetNodeId) {
                      console.error("❌ [SharedRef] Pas de `nodeId` fourni au composant. Annulation.");
                      message.error("ID du nœud de travail manquant.");
                      return;
                    }

                    console.log(`🔗 [SharedRef] Cible de la mise à jour : ${targetNodeId}`);

                    try {
                      await api.post(
                        `/api/treebranchleaf/nodes/${targetNodeId}/link-shared-references`,
                        { referenceIds: newReferenceIds }
                      );
                      
                      console.log(`✅ [SharedRef] Liaison API réussie pour le noeud: ${targetNodeId}`);
                      
                      const firstRef = newOptions[0];
                      const updates = {
                        sharedReferenceIds: newReferenceIds,
                        sharedReferenceId: firstRef?.value || null,
                        sharedReferenceName: firstRef?.label || '',
                        sharedReferenceDescription: firstRef?.description || null,
                      };

                      // Notifier le parent pour la sauvegarde
                      if (onNodeUpdate) {
                        await onNodeUpdate({ id: targetNodeId, ...updates });
                      }
                      
                      // Mettre à jour l'état local du composant
                      onChange?.({ ...value, ...updates } as SharedReferenceConfig);

                      message.success('Référence(s) mise(s) à jour.');

                    } catch (error) {
                      console.error('❌ [SharedRef] Erreur liaison:', error);
                      message.error('Erreur lors de la liaison des références');
                    }
                  }}
                  disabled={readOnly || loading}
                  loading={loading}
                  showSearch
                  allowClear
                  maxTagCount="responsive"
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {availableReferences.map(ref => (
                    <Option key={ref.id} value={ref.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{ref.label}</strong>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {ref.usageCount}× utilisé
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>

                {/* Actions sur les références sélectionnées */}
                {value?.sharedReferenceIds && value.sharedReferenceIds.length > 0 && (
                  <Card size="small" title="Gérer les références sélectionnées" style={{ marginTop: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {availableReferences
                        .filter(ref => value?.sharedReferenceIds?.includes(ref.id))
                        .map((ref) => (
                          <Card key={ref.id} size="small" style={{ width: '100%' }}>
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                              <div>
                                <Space align="center">
                                  <strong>{ref.label}</strong>
                                  <Text copyable={{ text: ref.id }} type="secondary" code style={{ fontSize: '10px' }}>
                                    ID: {ref.id}
                                  </Text>
                                </Space>
                                <div>
                                  <Text type="secondary">{ref.description || 'Aucune description'}</Text>
                                </div>
                                <div>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Utilisé {ref.usageCount} fois
                                  </Text>
                                </div>
                              </div>
                              <Space>
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditReference(ref);
                                  }}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔘 [SharedRef] Bouton Supprimer cliqué pour:', ref.id);
                                    setDeletingReference(ref);
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </Space>
                            </Space>
                          </Card>
                        ))}
                    </Space>
                  </Card>
                )}
              </Space>
            </Card>

            {/* Créer une nouvelle référence */}
            <Card size="small" title="Ou créer une nouvelle référence">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>Nom de la référence *</Text>
                  <Input
                    placeholder="Ex: Template Surface Habitable"
                    value={newReferenceName}
                    onChange={(e) => setNewReferenceName(e.target.value)}
                    disabled={readOnly || creating}
                    style={{ marginTop: 4 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    💡 Ce nom sera visible quand vous réutiliserez ce champ ailleurs
                  </Text>
                </div>

                {/* Catégorie masquée - utilise toujours 'general' par défaut */}

                <div>
                  <Text>Description (optionnel)</Text>
                  <TextArea
                    placeholder="Ex: Champ standard pour la surface habitable d'un bien"
                    value={newReferenceDescription}
                    onChange={(e) => setNewReferenceDescription(e.target.value)}
                    disabled={readOnly || creating}
                    rows={2}
                    style={{ marginTop: 4 }}
                  />
                </div>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateReference}
                  loading={creating}
                  disabled={readOnly || !newReferenceName.trim()}
                  block
                >
                  Créer et utiliser cette référence
                </Button>
              </Space>
            </Card>
          </>
        )}
      </Space>

      {/* Modal d'édition */}
      <Modal
        title="Modifier la référence partagée"
        open={isEditModalOpen}
        onOk={handleSaveEdit}
        onCancel={() => setIsEditModalOpen(false)}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Nom de la référence *</Text>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ex: Template Surface Habitable"
              style={{ marginTop: 4 }}
            />
          </div>

          <div>
            <Text>Description (optionnel)</Text>
            <TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Ex: Champ standard pour la surface habitable d'un bien"
              rows={3}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        title="Supprimer cette référence ?"
        open={isDeleteModalOpen}
        onOk={async () => {
          console.log('✅ [SharedRef] Modal de suppression confirmé');
          if (deletingReference) {
            await handleDeleteReference(deletingReference.id);
          }
          setIsDeleteModalOpen(false);
          setDeletingReference(null);
        }}
        onCancel={() => {
          console.log('❌ [SharedRef] Modal de suppression annulé');
          setIsDeleteModalOpen(false);
          setDeletingReference(null);
        }}
        okText="Supprimer"
        okType="danger"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
      >
        {deletingReference && (
          <Space direction="vertical" style={{ width: '100%' }}>
            {deletingReference.usageCount > 0 ? (
              <>
                <Text strong>⚠️ ATTENTION</Text>
                <Text>
                  Cette référence est utilisée <strong>{deletingReference.usageCount} fois</strong>. 
                  La supprimer peut affecter les champs qui l'utilisent.
                </Text>
                <Text type="danger">Êtes-vous sûr de vouloir continuer ?</Text>
              </>
            ) : (
              <Text>Cette action est irréversible. Êtes-vous sûr ?</Text>
            )}
          </Space>
        )}
      </Modal>
    </Card>
  );
};

export default SharedReferencePanel;
