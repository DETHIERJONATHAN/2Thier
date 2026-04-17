/**
 * 🔄 DraftRecoveryModal - Récupération automatique de brouillons
 * 
 * Modal qui s'affiche automatiquement au chargement d'une page de devis
 * si des brouillons non sauvegardés existent pour ce lead/arbre.
 * 
 * Fonctionnalités:
 * - Détection automatique au montage du composant
 * - Liste des brouillons avec date de dernière activité
 * - Aperçu des données du brouillon
 * - Actions: Restaurer / Supprimer / Ignorer
 * 
 * Usage:
 * ```tsx
 * const { checkForDrafts, restoreDraft } = useTblSubmission(...);
 * 
 * <DraftRecoveryModal 
 *   leadId={leadId}
 *   treeId={treeId}
 *   onCheckDrafts={checkForDrafts}
 *   onRestore={restoreDraft}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import { Modal, List, Button, Space, Typography, Tag, Card, Spin, Empty } from 'antd';
import { 
  HistoryOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CloseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { logger } from '../lib/logger';

const { Title, Text, Paragraph } = Typography;

export interface DraftInfo {
  stageId: string;
  treeId: string;
  leadId: string;
  lastActivity: string;
  expiresAt: string;
  formData: Record<string, unknown>;
  tree?: {
    name?: string;
  };
  lead?: {
    firstName?: string;
    lastName?: string;
    company?: string;
  };
}

export interface DraftRecoveryModalProps {
  /** ID du lead courant */
  leadId?: string;
  
  /** ID de l'arbre courant */
  treeId?: string;
  
  /** Fonction pour récupérer les brouillons */
  onCheckDrafts: () => Promise<DraftInfo[]>;
  
  /** Fonction pour restaurer un brouillon */
  onRestore: (stageId: string) => Promise<void>;
  
  /** Fonction pour supprimer un brouillon */
  onDiscard?: (stageId: string) => Promise<void>;
  
  /** Désactiver la détection automatique */
  disableAutoCheck?: boolean;
  
  /** Callback après restauration réussie */
  onRestoreSuccess?: (draft: DraftInfo) => void;
}

/**
 * Modal de récupération de brouillons
 */
export const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
  leadId,
  treeId,
  onCheckDrafts,
  onRestore,
  onDiscard,
  disableAutoCheck = false,
  onRestoreSuccess
}) => {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /**
   * Vérifier les brouillons au montage
   */
  useEffect(() => {
    if (disableAutoCheck) return;

    const checkDrafts = async () => {
      setLoading(true);
      try {
        const foundDrafts = await onCheckDrafts();
        
        if (foundDrafts.length > 0) {
          setDrafts(foundDrafts);
          setOpen(true);
        }
      } catch (error) {
        logger.error('[DraftRecoveryModal] Erreur checkDrafts:', error);
      } finally {
        setLoading(false);
      }
    };

    // Délai de 500ms pour éviter le flash si chargement rapide
    const timer = setTimeout(checkDrafts, 500);
    return () => clearTimeout(timer);
  }, [disableAutoCheck, onCheckDrafts]);

  /**
   * Restaurer un brouillon
   */
  const handleRestore = async (draft: DraftInfo) => {
    setActionLoading(draft.stageId);
    try {
      await onRestore(draft.stageId);
      setOpen(false);
      onRestoreSuccess?.(draft);
    } catch (error) {
      logger.error('[DraftRecoveryModal] Erreur restore:', error);
      // Error is logged above; user notification could be added
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Supprimer un brouillon
   */
  const handleDiscard = async (draft: DraftInfo) => {
    if (!onDiscard) return;

    Modal.confirm({
      title: 'Supprimer ce brouillon ?',
      icon: <ExclamationCircleOutlined />,
      content: 'Cette action est irréversible. Le brouillon sera définitivement supprimé.',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        setActionLoading(draft.stageId);
        try {
          await onDiscard(draft.stageId);
          setDrafts(prev => prev.filter(d => d.stageId !== draft.stageId));
          
          // Fermer la modal si plus de brouillons
          if (drafts.length <= 1) {
            setOpen(false);
          }
        } catch (error) {
          logger.error('[DraftRecoveryModal] Erreur discard:', error);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  /**
   * Formater la date de dernière activité
   */
  const formatLastActivity = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  /**
   * Compter les champs remplis
   */
  const countFilledFields = (formData: Record<string, unknown>): number => {
    return Object.values(formData).filter(v => 
      v !== null && v !== undefined && v !== ''
    ).length;
  };

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>Brouillons non enregistrés</Title>
        </Space>
      }
      open={open}
      onCancel={() => setOpen(false)}
      width={700}
      footer={[
        <Button 
          key="close" 
          icon={<CloseOutlined />}
          onClick={() => setOpen(false)}
        >
          Ignorer
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        {drafts.length === 0 ? (
          <Empty 
            description="Aucun brouillon trouvé"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Vous avez {drafts.length} brouillon{drafts.length > 1 ? 's' : ''} non enregistré{drafts.length > 1 ? 's' : ''}. 
              Voulez-vous continuer là où vous vous êtes arrêté ?
            </Paragraph>

            <List
              dataSource={drafts}
              renderItem={(draft) => (
                <List.Item style={{ padding: 0, marginBottom: 16 }}>
                  <Card
                    size="small"
                    style={{ width: '100%' }}
                    hoverable
                    actions={[
                      <Button
                        key="restore"
                        type="primary"
                        icon={<ReloadOutlined />}
                        loading={actionLoading === draft.stageId}
                        onClick={() => handleRestore(draft)}
                      >
                        Restaurer
                      </Button>,
                      onDiscard && (
                        <Button
                          key="delete"
                          danger
                          icon={<DeleteOutlined />}
                          loading={actionLoading === draft.stageId}
                          onClick={() => handleDiscard(draft)}
                        >
                          Supprimer
                        </Button>
                      )
                    ].filter(Boolean)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Space>
                        <Tag color="blue">
                          {draft.tree?.name || 'Devis'}
                        </Tag>
                        <Text type="secondary">
                          {formatLastActivity(draft.lastActivity)}
                        </Text>
                      </Space>

                      {draft.lead && (
                        <Text>
                          <strong>Lead :</strong> {draft.lead.firstName} {draft.lead.lastName}
                          {draft.lead.company && ` (${draft.lead.company})`}
                        </Text>
                      )}

                      <Text type="secondary">
                        <strong>{countFilledFields(draft.formData)}</strong> champ{countFilledFields(draft.formData) > 1 ? 's' : ''} rempli{countFilledFields(draft.formData) > 1 ? 's' : ''}
                      </Text>

                      <Text type="warning" style={{ fontSize: 12 }}>
                        ⏰ Expire le {new Date(draft.expiresAt).toLocaleString('fr-FR')}
                      </Text>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default DraftRecoveryModal;
