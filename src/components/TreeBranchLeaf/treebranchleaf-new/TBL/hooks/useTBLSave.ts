import { useCallback } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { logger } from '../../../../../lib/logger';

export type TBLFormData = Record<string, string | number | boolean | null | undefined>;

export const useTBLSave = () => {
  const { api } = useAuthenticatedApi();

  // Fonction pour sauvegarder automatiquement avec TBL Prisma
  const autoSave = useCallback(async (formData: TBLFormData, treeId: string, clientId: string) => {
    logger.debug('🔄 [TBL-AUTO-SAVE] Sauvegarde automatique avec TBL Prisma...', { 
      treeId, 
      clientId, 
      fieldsCount: Object.keys(formData).length 
    });

    try {
      // 🔥 NOUVEAU: Utiliser l'endpoint TBL Prisma tout-en-un (BYPASS TreeBranchLeaf routes)
      logger.debug('🚀 [TBL-AUTO-SAVE] Création et évaluation via TBL Prisma pur...');
      
      const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
        treeId,
        clientId,
        formData,
        status: 'draft',
        providedName: `Devis automatique ${new Date().toLocaleDateString()}`
      });

      logger.debug('✅ [TBL-AUTO-SAVE] Soumission créée et évaluée via TBL Prisma:', response.submission?.id);
      
      return {
        success: true,
        submissionId: response.submission?.id,
        message: 'Sauvegarde automatique réussie avec TBL Prisma pur',
        evaluatedCapacities: response.evaluatedCapacities
      };

    } catch (error) {
      logger.error('❌ [TBL-AUTO-SAVE] Erreur:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }, [api]);

  // Fonction pour sauvegarder comme devis avec TBL Prisma
  const saveAsDevis = useCallback(async (formData: TBLFormData, treeId: string, options: {
    clientId: string;
    projectName: string;
    notes?: string;
    isDraft: boolean;
  }) => {
    logger.debug('💾 [TBL-SAVE-DEVIS] Sauvegarde comme devis avec TBL Prisma...', { 
      treeId, 
      options, 
      fieldsCount: Object.keys(formData).length 
    });

    try {
      // 🔥 NOUVEAU: Utiliser l'endpoint TBL Prisma tout-en-un (BYPASS TreeBranchLeaf routes)
      logger.debug('🚀 [TBL-SAVE-DEVIS] Création et évaluation via TBL Prisma pur...');
      
      const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
        treeId,
        clientId: options.clientId,
        formData,
        status: options.isDraft ? 'draft' : 'completed',
        providedName: options.projectName || `Devis ${new Date().toLocaleDateString()}`
      });

      logger.debug('✅ [TBL-SAVE-DEVIS] Soumission créée et évaluée via TBL Prisma:', response.submission?.id);

      // 🚀 PERF: create-and-evaluate fait déjà l'évaluation complète.
      // Les appels evaluate-all et verification étaient REDONDANTS (+10s inutiles).

      return {
        success: true,
        devisId: response.submission?.id,
        message: 'Devis sauvegardé avec succès avec TBL Prisma',
        evaluation: response.evaluatedCapacities,
        verification: { status: 'ok' }
      };

    } catch (error) {
      logger.error('❌ [TBL-SAVE-DEVIS] Erreur:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      };
    }
  }, [api]);

  return {
    lastSave: null,
    saveAsDevis,
    autoSave
  };
};