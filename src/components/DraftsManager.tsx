/**
 * COMPOSANT DE GESTION DES BROUILLONS
 * 
 * Interface pour voir, éditer et gérer tous les brouillons sauvegardés
 */

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Space, 
  Typography, 
  Empty, 
  Tooltip, 
  Popconfirm, 
  Tag, 
  Checkbox, 
  message,
  Badge 
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  SendOutlined, 
  ReloadOutlined, 
  FileTextOutlined,
  SelectOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useDrafts, DraftData } from '../hooks/useDrafts';
import { EmailComposer } from './EmailComposer';

const { Title, Text, Paragraph } = Typography;

export const DraftsManager: React.FC = () => {
  const { drafts, loading, fetchDrafts, deleteDraft, sendDraft } = useDrafts();
  const [selectedDraft, setSelectedDraft] = useState<DraftData | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  
  // 🆕 États pour la sélection multiple
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  /**
   * Chargement initial des brouillons
   */
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  /**
   * Éditer un brouillon
   */
  const handleEditDraft = (draft: DraftData) => {
    setSelectedDraft(draft);
    setComposerVisible(true);
  };

  /**
   * Envoyer directement un brouillon
   */
  const handleSendDraft = async (draftId: string) => {
    await sendDraft(draftId);
    // Rafraîchir immédiatement la liste après envoi
    fetchDrafts();
  };

  /**
   * Supprimer un brouillon
   */
  const handleDeleteDraft = async (draftId: string) => {
    await deleteDraft(draftId);
    // Rafraîchir immédiatement la liste après suppression
    fetchDrafts();
  };

  // 🆕 FONCTIONS DE SÉLECTION MULTIPLE

  /**
   * Activer/désactiver le mode sélection
   */
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedDraftIds([]); // Vider la sélection quand on change de mode
  };

  /**
   * Sélectionner/désélectionner tous les brouillons
   */
  const handleSelectAll = () => {
    if (selectedDraftIds.length === drafts.length) {
      // Tout désélectionner
      setSelectedDraftIds([]);
    } else {
      // Tout sélectionner
      setSelectedDraftIds(drafts.map(draft => draft.draftId));
    }
  };

  /**
   * Gérer la sélection d'un brouillon individuel
   */
  const handleDraftSelection = (draftId: string) => {
    setSelectedDraftIds(prev => {
      if (prev.includes(draftId)) {
        return prev.filter(id => id !== draftId);
      } else {
        return [...prev, draftId];
      }
    });
  };

  /**
   * Supprimer tous les brouillons sélectionnés
   */
  const handleDeleteSelected = async () => {
    message.loading({ content: 'Suppression en cours...', key: 'deleting' });
    
    try {
      // Supprimer chaque brouillon sélectionné
      for (const draftId of selectedDraftIds) {
        await deleteDraft(draftId);
      }
      
      message.success({ 
        content: `${selectedDraftIds.length} brouillon${selectedDraftIds.length > 1 ? 's' : ''} supprimé${selectedDraftIds.length > 1 ? 's' : ''} avec succès !`, 
        key: 'deleting' 
      });
      
      // Réinitialiser la sélection et rafraîchir
      setSelectedDraftIds([]);
      setSelectionMode(false);
      fetchDrafts();
    } catch {
      message.error({ content: 'Erreur lors de la suppression', key: 'deleting' });
    }
  };

  /**
   * Fermeture du compositeur
   */
  const handleComposerClose = () => {
    setComposerVisible(false);
    setSelectedDraft(null);
    fetchDrafts(); // Rafraîchir la liste
  };

  /**
   * Callback après envoi
   */
  const handleEmailSent = () => {
    setComposerVisible(false);
    setSelectedDraft(null);
    fetchDrafts(); // Rafraîchir la liste
  };

  /**
   * Formate la date de manière lisible
   */
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return 'Il y a moins d\'1 heure';
    } else if (diffHours < 24) {
      return `Il y a ${Math.floor(diffHours)} heure${Math.floor(diffHours) > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Il y a ${Math.floor(diffDays)} jour${Math.floor(diffDays) > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    }
  };

  /**
   * Tronque le texte pour l'aperçu
   */
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Space direction="vertical" size={0}>
            <Space>
              <FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>
                Brouillons ({drafts.length})
                {selectedDraftIds.length > 0 && (
                  <Badge 
                    count={selectedDraftIds.length} 
                    style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
                  />
                )}
              </Title>
            </Space>
            <Text type="secondary">
              {selectionMode 
                ? `Mode sélection actif - ${selectedDraftIds.length} brouillon${selectedDraftIds.length > 1 ? 's' : ''} sélectionné${selectedDraftIds.length > 1 ? 's' : ''}`
                : 'Tous vos emails sauvegardés automatiquement'
              }
            </Text>
          </Space>
          
          <div style={{ float: 'right', marginTop: '-40px' }}>
            <Space>
              {/* 🆕 Boutons de sélection multiple */}
              {selectionMode && (
                <>
                  <Button
                    size="small"
                    icon={<SelectOutlined />}
                    onClick={handleSelectAll}
                    type={selectedDraftIds.length === drafts.length ? 'primary' : 'default'}
                  >
                    {selectedDraftIds.length === drafts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                  
                  {selectedDraftIds.length > 0 && (
                    <Popconfirm
                      title={`Supprimer ${selectedDraftIds.length} brouillon${selectedDraftIds.length > 1 ? 's' : ''} ?`}
                      description="Cette action est irréversible."
                      onConfirm={handleDeleteSelected}
                      okText="Supprimer tout"
                      cancelText="Annuler"
                      okType="danger"
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        Supprimer ({selectedDraftIds.length})
                      </Button>
                    </Popconfirm>
                  )}
                  
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={toggleSelectionMode}
                  >
                    Annuler
                  </Button>
                </>
              )}
              
              {!selectionMode && drafts.length > 0 && (
                <Button
                  size="small"
                  icon={<SelectOutlined />}
                  onClick={toggleSelectionMode}
                >
                  Sélectionner
                </Button>
              )}
              
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchDrafts}
                loading={loading}
              >
                Actualiser
              </Button>
            </Space>
          </div>
        </div>

        {drafts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>Aucun brouillon sauvegardé</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Les brouillons sont automatiquement créés quand vous composez un email
                </Text>
              </Space>
            }
          />
        ) : (
          <List
            dataSource={drafts}
            loading={loading}
            renderItem={(draft: DraftData) => (
              <List.Item
                actions={[
                  // 🆕 Case à cocher en mode sélection
                  ...(selectionMode ? [
                    <Checkbox
                      key="select"
                      checked={selectedDraftIds.includes(draft.draftId)}
                      onChange={() => handleDraftSelection(draft.draftId)}
                    />
                  ] : []),
                  
                  // Boutons d'action normaux (masqués en mode sélection)
                  ...(!selectionMode ? [
                    <Tooltip key="edit" title="Modifier le brouillon">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditDraft(draft)}
                      >
                        Éditer
                      </Button>
                    </Tooltip>,
                    <Tooltip key="send" title="Envoyer directement">
                      <Button
                        type="text"
                        icon={<SendOutlined />}
                        onClick={() => handleSendDraft(draft.draftId)}
                      >
                        Envoyer
                      </Button>
                    </Tooltip>,
                    <Popconfirm
                      key="delete"
                      title="Supprimer ce brouillon ?"
                      description="Cette action est irréversible."
                      onConfirm={() => handleDeleteDraft(draft.draftId)}
                      okText="Supprimer"
                      cancelText="Annuler"
                      okType="danger"
                    >
                      <Tooltip title="Supprimer le brouillon">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          Supprimer
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  ] : [])
                ]}
                style={{
                  // 🆕 Mise en évidence visuelle des éléments sélectionnés
                  backgroundColor: selectedDraftIds.includes(draft.draftId) ? '#e6f7ff' : undefined,
                  border: selectedDraftIds.includes(draft.draftId) ? '1px solid #1890ff' : undefined,
                  borderRadius: selectedDraftIds.includes(draft.draftId) ? '4px' : undefined,
                  cursor: selectionMode ? 'pointer' : undefined
                }}
                onClick={() => {
                  // 🆕 Clic sur l'élément en mode sélection pour cocher/décocher
                  if (selectionMode) {
                    handleDraftSelection(draft.draftId);
                  }
                }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>
                        {draft.subject || 'Sans sujet'}
                      </Text>
                      <Tag color="blue" size="small">
                        brouillon
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">
                        <strong>À:</strong> {draft.to}
                      </Text>
                      {draft.cc && (
                        <Text type="secondary">
                          <strong>Cc:</strong> {draft.cc}
                        </Text>
                      )}
                      {draft.body && (
                        <Paragraph 
                          type="secondary" 
                          style={{ margin: 0, fontSize: '12px' }}
                        >
                          {truncateText(draft.body)}
                        </Paragraph>
                      )}
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {formatDate(draft.date)}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Compositeur d'email */}
      <EmailComposer
        visible={composerVisible}
        onClose={handleComposerClose}
        onSent={handleEmailSent}
        editingDraft={selectedDraft}
      />
    </div>
  );
};
