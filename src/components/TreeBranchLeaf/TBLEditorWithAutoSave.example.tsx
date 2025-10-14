/**
 * 📝 Exemple d'intégration complète du système de sauvegarde TBL
 * 
 * Ce fichier montre comment utiliser tous les hooks et composants ensemble
 * dans un composant TBL avec :
 * - Gestion des brouillons automatiques
 * - Alerte avant fermeture
 * - Résolution des conflits
 * - Récupération automatique
 */

import React, { useEffect, useState } from 'react';
import { Button, Space, Tag, Modal, Alert, message } from 'antd';
import { SaveOutlined, CloseOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTblSubmission } from '../../../hooks/useTblSubmission';
import { useBeforeUnload } from '../../../hooks/useBeforeUnload';
import { ConflictResolutionModal, ConflictField } from '../ConflictResolutionModal';

interface TBLEditorWithAutoSaveProps {
  treeId: string;
  leadId: string;
  submissionId?: string | null;
  onSaveSuccess?: (submissionId: string) => void;
  onClose?: () => void;
}

/**
 * Composant éditeur TBL avec système de sauvegarde complet
 */
export const TBLEditorWithAutoSave: React.FC<TBLEditorWithAutoSaveProps> = ({
  treeId,
  leadId,
  submissionId,
  onSaveSuccess,
  onClose
}) => {
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 HOOK PRINCIPAL - Gestion des submissions
  // ═══════════════════════════════════════════════════════════════════════
  const {
    stageId,
    formData,
    results,
    dirty,
    loading,
    committing,
    error,
    availableDrafts,
    setField,
    commitToExisting,
    commitAsNew,
    discardStage,
    checkForDrafts,
    restoreDraft
  } = useTblSubmission({
    initialTreeId: treeId,
    initialSubmissionId: submissionId,
    initialLeadId: leadId,
    debounceMs: 500,
    autoRecoverDrafts: true
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ⚠️ HOOK ALERTE FERMETURE - Protège contre perte de données
  // ═══════════════════════════════════════════════════════════════════════
  const { confirmNavigation } = useBeforeUnload({
    dirty,
    message: 'Vous avez des modifications non enregistrées dans ce devis',
    onSave: async () => {
      const result = submissionId 
        ? await commitToExisting()
        : await commitAsNew();
      
      if (result?.submissionId) {
        message.success('Devis sauvegardé');
        onSaveSuccess?.(result.submissionId);
      }
    },
    onDiscard: () => {
      if (stageId) {
        discardStage();
      }
      message.info('Modifications abandonnées');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 🤝 GESTION DES CONFLITS
  // ═══════════════════════════════════════════════════════════════════════
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictField[]>([]);
  const [conflictMetadata, setConflictMetadata] = useState<{
    lastEditedBy?: string;
    lastEditedAt?: Date;
  }>({});

  /**
   * Gère la sauvegarde avec détection de conflits
   */
  const handleSave = async () => {
    try {
      const result = submissionId 
        ? await commitToExisting()
        : await commitAsNew();
      
      if (result?.submissionId) {
        message.success('✅ Devis enregistré avec succès');
        onSaveSuccess?.(result.submissionId);
      }
    } catch (error: any) {
      // Détecter les conflits (HTTP 409)
      if (error?.response?.status === 409 && error?.response?.data?.conflicts) {
        console.log('⚠️ Conflits détectés, affichage modal');
        setConflicts(error.response.data.conflicts);
        setConflictMetadata({
          lastEditedBy: error.response.data.lastEditedBy,
          lastEditedAt: error.response.data.lastEditedAt
        });
        setConflictModalVisible(true);
      } else {
        message.error('Erreur lors de la sauvegarde: ' + (error?.message || 'Erreur inconnue'));
      }
    }
  };

  /**
   * Résout les conflits et re-sauvegarde
   */
  const handleResolveConflicts = async (resolutions: Record<string, 'yours' | 'theirs'>) => {
    try {
      // Appliquer les résolutions au formData
      const resolvedData = { ...formData };
      
      for (const conflict of conflicts) {
        if (resolutions[conflict.nodeId] === 'yours') {
          resolvedData[conflict.nodeId] = conflict.yourValue;
        } else {
          resolvedData[conflict.nodeId] = conflict.theirValue;
        }
      }

      // Mettre à jour les champs
      for (const [nodeId, value] of Object.entries(resolvedData)) {
        setField(nodeId, value);
      }

      // Fermer la modal
      setConflictModalVisible(false);
      
      // Attendre un peu puis re-sauvegarder
      setTimeout(async () => {
        const result = await commitToExisting();
        if (result?.submissionId) {
          message.success('✅ Conflits résolus et devis enregistré');
          onSaveSuccess?.(result.submissionId);
        }
      }, 500);
      
    } catch (error: any) {
      message.error('Erreur lors de la résolution: ' + (error?.message || 'Erreur inconnue'));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🔄 RÉCUPÉRATION AUTOMATIQUE DES BROUILLONS
  // ═══════════════════════════════════════════════════════════════════════
  const [draftModalVisible, setDraftModalVisible] = useState(false);

  useEffect(() => {
    // Vérifier les brouillons disponibles au montage
    if (availableDrafts.length > 0 && !submissionId) {
      setDraftModalVisible(true);
    }
  }, [availableDrafts, submissionId]);

  /**
   * Restaure un brouillon sélectionné
   */
  const handleRestoreDraft = async (draftStageId: string) => {
    try {
      await restoreDraft(draftStageId);
      setDraftModalVisible(false);
      message.success('✅ Brouillon restauré');
    } catch (error) {
      message.error('Erreur lors de la restauration du brouillon');
    }
  };

  /**
   * Ignore les brouillons et commence un nouveau devis
   */
  const handleIgnoreDrafts = () => {
    setDraftModalVisible(false);
    message.info('Nouveau devis créé');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🚪 FERMETURE AVEC CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════
  const handleClose = async () => {
    if (dirty) {
      const canNavigate = await confirmNavigation();
      if (!canNavigate) return;
    }
    
    onClose?.();
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🎨 RENDU
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: 24 }}>
      {/* Header avec statut */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <h2>Éditeur de devis TBL</h2>
          {dirty && <Tag color="warning">⚠️ Non enregistré</Tag>}
          {stageId && <Tag color="processing">📝 Brouillon actif</Tag>}
          {committing && <Tag color="blue">💾 Sauvegarde...</Tag>}
        </Space>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => checkForDrafts()}
            disabled={loading}
          >
            Vérifier brouillons
          </Button>
          
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={committing}
            disabled={!dirty || loading}
          >
            Enregistrer
          </Button>

          <Button
            icon={<CloseOutlined />}
            onClick={handleClose}
            disabled={loading}
          >
            Fermer
          </Button>
        </Space>
      </div>

      {/* Alerte d'erreur */}
      {error && (
        <Alert
          type="error"
          message="Erreur"
          description={error}
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Zone d'édition - À personnaliser selon vos besoins */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, minHeight: 400 }}>
        <p>Contenu de l'éditeur TBL ici...</p>
        <p>FormData: {JSON.stringify(formData, null, 2)}</p>
        <p>Results: {results.length} noeuds évalués</p>
      </div>

      {/* Modal récupération brouillons */}
      <Modal
        title="📋 Brouillons disponibles"
        open={draftModalVisible}
        onCancel={handleIgnoreDrafts}
        footer={null}
        width={600}
      >
        <Alert
          type="info"
          message="Nous avons trouvé des brouillons non enregistrés"
          description="Souhaitez-vous reprendre où vous en étiez ?"
          style={{ marginBottom: 16 }}
        />

        <Space direction="vertical" style={{ width: '100%' }}>
          {availableDrafts.map((draft) => (
            <div
              key={draft.stageId}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={() => handleRestoreDraft(draft.stageId)}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{draft.leadName}</strong>
                  <Tag color="blue">
                    <HistoryOutlined /> {new Date(draft.lastActivity).toLocaleString('fr-FR')}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Expire : {new Date(draft.expiresAt).toLocaleString('fr-FR')}
                </div>
              </Space>
            </div>
          ))}

          <Button block onClick={handleIgnoreDrafts} style={{ marginTop: 16 }}>
            Ignorer et créer un nouveau devis
          </Button>
        </Space>
      </Modal>

      {/* Modal résolution conflits */}
      <ConflictResolutionModal
        visible={conflictModalVisible}
        conflicts={conflicts}
        lastEditedBy={conflictMetadata.lastEditedBy}
        lastEditedAt={conflictMetadata.lastEditedAt}
        onResolve={handleResolveConflicts}
        onCancel={() => setConflictModalVisible(false)}
        loading={committing}
      />
    </div>
  );
};

export default TBLEditorWithAutoSave;
