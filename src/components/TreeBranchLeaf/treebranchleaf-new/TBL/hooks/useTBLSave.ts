import { useCallback } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

export type TBLFormData = Record<string, string | number | boolean | null | undefined>;

export const useTBLSave = () => {
  const { api } = useAuthenticatedApi();

  // Fonction pour sauvegarder automatiquement avec TBL Prisma
  const autoSave = useCallback(async (formData: TBLFormData, treeId: string, clientId: string) => {
    console.log('🔄 [TBL-AUTO-SAVE] Sauvegarde automatique avec TBL Prisma...', { 
      treeId, 
      clientId, 
      fieldsCount: Object.keys(formData).length 
    });

    try {
      // 🔥 NOUVEAU: Utiliser l'endpoint TBL Prisma tout-en-un (BYPASS TreeBranchLeaf routes)
      console.log('🚀 [TBL-AUTO-SAVE] Création et évaluation via TBL Prisma pur...');
      
      const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
        treeId,
        clientId,
        formData,
        status: 'draft',
        providedName: `Devis automatique ${new Date().toLocaleDateString()}`
      });

      console.log('✅ [TBL-AUTO-SAVE] Soumission créée et évaluée via TBL Prisma:', response.submission?.id);
      
      return {
        success: true,
        submissionId: response.submission?.id,
        message: 'Sauvegarde automatique réussie avec TBL Prisma pur',
        evaluatedCapacities: response.evaluatedCapacities
      };

    } catch (error) {
      console.error('❌ [TBL-AUTO-SAVE] Erreur:', error);
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
    console.log('💾 [TBL-SAVE-DEVIS] Sauvegarde comme devis avec TBL Prisma...', { 
      treeId, 
      options, 
      fieldsCount: Object.keys(formData).length 
    });

    try {
      // 🔥 NOUVEAU: Utiliser l'endpoint TBL Prisma tout-en-un (BYPASS TreeBranchLeaf routes)
      console.log('🚀 [TBL-SAVE-DEVIS] Création et évaluation via TBL Prisma pur...');
      
      const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
        treeId,
        clientId: options.clientId,
        formData,
        status: options.isDraft ? 'draft' : 'completed',
        providedName: options.projectName || `Devis ${new Date().toLocaleDateString()}`
      });

      console.log('✅ [TBL-SAVE-DEVIS] Soumission créée et évaluée via TBL Prisma:', response.submission?.id);

      // 2. 🔥 FORCER L'ÉVALUATION COMPLÈTE TBL PRISMA !
      console.log('🔄 [TBL-SAVE-DEVIS] Lancement évaluation TBL Prisma...');
      
      const evaluationResponse = await api.post(`/api/tbl/submissions/${response.submission?.id}/evaluate-all`, {
        forceUpdate: true, // Forcer la mise à jour même si déjà évalué
        includeIntelligentTranslations: true // Activer les traductions intelligentes
      });

      console.log('✅ [TBL-SAVE-DEVIS] Évaluation TBL Prisma terminée:', evaluationResponse);

      // 3. Vérifier que toutes les traductions intelligentes sont bien sauvegardées
      const verificationResponse = await api.get(`/api/tbl/submissions/${response.submission?.id}/verification`);

      console.log('🎯 [TBL-SAVE-DEVIS] Vérification:', verificationResponse);

      return {
        success: true,
        devisId: response.submission?.id,
        message: 'Devis sauvegardé avec succès avec TBL Prisma',
        evaluation: evaluationResponse,
        verification: verificationResponse
      };

    } catch (error) {
      console.error('❌ [TBL-SAVE-DEVIS] Erreur:', error);
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