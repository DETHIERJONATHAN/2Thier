/**
 * 📝 EXEMPLE D'INTÉGRATION COMPLÈTE DU SYSTÈME DE BROUILLONS
 * 
 * Ce fichier montre comment intégrer tous les composants du système
 * de sauvegarde automatique dans une page de formulaire TreeBranchLeaf.
 * 
 * Fonctionnalités démontrées:
 * - ✅ Sauvegarde automatique avec debounce
 * - 🔄 Récupération automatique des brouillons au chargement
 * - 🛡️ Protection contre perte de données (beforeunload)
 * - 💾 Indicateurs visuels d'état de sauvegarde
 * - ⚠️ Détection et résolution de conflits multi-utilisateurs
 * - ⏰ Indicateur d'expiration des brouillons
 */

import React, { useEffect, useState } from 'react';
import { Button, Space, Card, message, Row, Col } from 'antd';
import { SaveOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';

// Hooks et composants du système de brouillons
import { useTblSubmission } from '../hooks/useTblSubmission';
import { useBeforeUnloadSimple } from '../hooks/useBeforeUnload';
import DraftStatusIndicator, { DraftExpiryIndicator } from '../components/DraftStatusIndicator';
import DraftRecoveryModal from '../components/DraftRecoveryModal';
import ConflictResolutionModal, { ConflictField } from '../components/ConflictResolutionModal';

interface TblFormExampleProps {
  treeId: string;
  leadId: string;
  submissionId?: string;
}

/**
 * Exemple de composant de formulaire TBL avec système de brouillons complet
 */
export const TblFormExample: React.FC<TblFormExampleProps> = ({
  treeId,
  leadId,
  submissionId: initialSubmissionId
}) => {
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 HOOK PRINCIPAL - Gestion du formulaire et de la sauvegarde
  // ═══════════════════════════════════════════════════════════════════════
  const {
    // État
    formData,
    stageId,
    submissionId,
    dirty,
    loading,
    previewing,
    committing,
    error,
    results,
    availableDrafts,
    
    // Actions formulaire
    setField,
    setMany,
    
    // Actions sauvegarde
    stageNow,
    previewNow,
    commitToExisting,
    commitAsNew,
    discardStage,
    
    // Actions brouillons
    checkForDrafts,
    restoreDraft,
    
    // Utilitaires
    reset,
    getNodeResult
  } = useTblSubmission({
    treeId,
    leadId,
    submissionId: initialSubmissionId,
    debounceMs: 2000 // Prévisualisation toutes les 2 secondes
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 🛡️ PROTECTION CONTRE PERTE DE DONNÉES
  // ═══════════════════════════════════════════════════════════════════════
  useBeforeUnloadSimple(
    dirty, 
    'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?'
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ⚠️ GESTION DES CONFLITS
  // ═══════════════════════════════════════════════════════════════════════
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictField[]>([]);
  const [conflictMetadata, setConflictMetadata] = useState<{
    lastEditedBy?: string;
    lastEditedAt?: string;
  }>({});

  /**
   * Gestion de la sauvegarde avec détection de conflits
   */
  const handleSaveWithConflictDetection = async (asNew = false) => {
    try {
      const result = asNew 
        ? await commitAsNew() 
        : await commitToExisting();
      
      if (result) {
        message.success('Devis enregistré avec succès !');
      }
    } catch (err: any) {
      // Conflit détecté (HTTP 409)
      if (err?.response?.status === 409) {
        const conflictData = err.response.data;
        
        setConflicts(conflictData.conflicts || []);
        setConflictMetadata({
          lastEditedBy: conflictData.lastEditedBy,
          lastEditedAt: conflictData.lastEditedAt
        });
        setConflictModalOpen(true);
      } else {
        message.error('Erreur lors de la sauvegarde : ' + (err.message || 'Erreur inconnue'));
      }
    }
  };

  /**
   * Résolution des conflits champ par champ
   */
  const handleResolveConflicts = async (resolutions: Record<string, unknown>) => {
    try {
      // Appliquer les résolutions au formData
      setMany(resolutions);
      
      // Fermer le modal
      setConflictModalOpen(false);
      
      // Réessayer la sauvegarde
      await commitToExisting();
      
      message.success('Conflits résolus et devis enregistré !');
    } catch (err: any) {
      message.error('Erreur lors de la résolution : ' + (err.message || 'Erreur inconnue'));
    }
  };

  /**
   * Forcer l'écrasement (ignorer les modifications de l'autre utilisateur)
   */
  const handleForceOverwrite = async () => {
    try {
      // TODO: Appeler un endpoint spécial avec flag force=true
      await commitToExisting();
      setConflictModalOpen(false);
      message.warning('Modifications écrasées');
    } catch (err: any) {
      message.error('Erreur : ' + (err.message || 'Erreur inconnue'));
    }
  };

  /**
   * Abandonner vos modifications (garder la version de l'autre utilisateur)
   */
  const handleDiscardYours = async () => {
    try {
      await discardStage();
      setConflictModalOpen(false);
      message.info('Vos modifications ont été abandonnées');
      reset();
    } catch (err: any) {
      message.error('Erreur : ' + (err.message || 'Erreur inconnue'));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🎨 RENDU DU COMPOSANT
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: 24 }}>
      
      {/* ═══ MODAL DE RÉCUPÉRATION AUTOMATIQUE ═══ */}
      <DraftRecoveryModal
        leadId={leadId}
        treeId={treeId}
        onCheckDrafts={checkForDrafts}
        onRestore={restoreDraft}
        onDiscard={discardStage}
        onRestoreSuccess={(draft) => {
          message.success('Brouillon restauré !');
        }}
      />

      {/* ═══ MODAL DE RÉSOLUTION DE CONFLITS ═══ */}
      <ConflictResolutionModal
        open={conflictModalOpen}
        conflicts={conflicts}
        lastEditedBy={conflictMetadata.lastEditedBy}
        lastEditedAt={conflictMetadata.lastEditedAt}
        loading={committing}
        onCancel={() => setConflictModalOpen(false)}
        onResolve={handleResolveConflicts}
        onForceOverwrite={handleForceOverwrite}
        onDiscardYours={handleDiscardYours}
      />

      {/* ═══ BARRE D'ÉTAT ═══ */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <DraftStatusIndicator
                dirty={dirty}
                loading={committing}
                previewing={previewing}
              />
              
              {stageId && (
                <DraftExpiryIndicator 
                  expiresAt={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                  onExpired={() => {
                    message.warning('Votre brouillon a expiré. Sauvegardez vos modifications.');
                  }}
                />
              )}
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={previewNow}
                loading={previewing}
                disabled={!dirty}
              >
                Prévisualiser
              </Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleSaveWithConflictDetection(false)}
                loading={committing}
                disabled={!dirty}
              >
                Enregistrer
              </Button>

              <Button
                icon={<PlusOutlined />}
                onClick={() => handleSaveWithConflictDetection(true)}
                loading={committing}
              >
                Enregistrer comme nouveau
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ═══ FORMULAIRE (à implémenter selon vos besoins) ═══ */}
      <Card title="Formulaire de devis">
        <p>TODO: Intégrer vos champs de formulaire ici</p>
        <p>Utilisez <code>setField(nodeId, value)</code> pour mettre à jour les valeurs</p>
        <p>Utilisez <code>getNodeResult(nodeId)</code> pour obtenir les calculs</p>
        
        {/* Exemple */}
        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>Résultats des calculs :</h4>
            <pre>{JSON.stringify(results, null, 2)}</pre>
          </div>
        )}
      </Card>

      {/* ═══ MESSAGES D'ERREUR ═══ */}
      {error && (
        <Card style={{ marginTop: 16, borderColor: '#ff4d4f' }}>
          <p style={{ color: '#ff4d4f', margin: 0 }}>❌ {error}</p>
        </Card>
      )}
    </div>
  );
};

export default TblFormExample;
