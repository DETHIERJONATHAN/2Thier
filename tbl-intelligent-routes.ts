/**
 * 🧠 TBL API V2.0 - ROUTES INTELLIGENTES MISES À JOUR
 * 
 * Nouvelles routes qui utilisent TBLIntelligentTranslator
 * pour générer des traductions françaises lisibles
 */

import express from 'express';
import TBLEvaluationEngine from '../intelligence/TBLEvaluationEngine';
import { CapacityCalculator } from '../../treebranchleaf-new/TBL-prisma/conditions/capacity-calculator';

const router = express.Router();
console.log('🧠 [TBL INTELLIGENCE] Initialisation du routeur avec traductions intelligentes');

// Import du traducteur intelligent (dynamique pour éviter les erreurs)
let TBLIntelligentTranslator: any = null;
try {
  const path = require('path');
  const translatorPath = path.join(process.cwd(), 'tbl-intelligent-translator.cjs');
  TBLIntelligentTranslator = require(translatorPath);
  console.log('✅ [TBL INTELLIGENCE] TBLIntelligentTranslator chargé avec succès');
} catch (error) {
  console.warn('⚠️ [TBL INTELLIGENCE] TBLIntelligentTranslator non trouvé:', error.message);
}

/**
 * 🔄 POST /api/tbl/update-database-with-intelligent-translations
 * NOUVEAU : Met à jour la base de données avec les traductions intelligentes
 */
router.post('/update-database-with-intelligent-translations', async (req, res) => {
  try {
    const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.body || {};
    
    console.log('🧠 [TBL INTELLIGENT UPDATE] Début mise à jour avec traductions intelligentes');
    
    if (!TBLIntelligentTranslator) {
      return res.status(500).json({ 
        success: false, 
        error: 'TBLIntelligentTranslator non disponible' 
      });
    }
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const translator = new TBLIntelligentTranslator(prisma);
    
    // Récupérer toutes les données de submission à traduire
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: submissionId,
        operationSource: {
          in: ['condition', 'formula', 'table']
        },
        operationDetail: {
          not: null
        }
      },
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    console.log(`🧠 [TBL INTELLIGENT UPDATE] Trouvé ${submissionData.length} données à traduire`);
    
    let updated = 0;
    const errors = [];
    
    for (const data of submissionData) {
      try {
        console.log(`🔧 [TBL INTELLIGENT] Traduction: ${data.TreeBranchLeafNode?.label || 'Sans nom'} (${data.operationSource})`);
        
        // Générer la traduction intelligente
        const intelligentResult = await translator.translateCapacity(
          data.operationSource,
          data.operationDetail,
          data.sourceRef || data.nodeId,
          data.submissionId
        );
        
        console.log(`✅ [TBL INTELLIGENT] Traduction générée: ${intelligentResult.substring(0, 100)}...`);
        
        // Mettre à jour en base
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: data.id },
          data: {
            operationResult: intelligentResult,
            lastResolved: new Date()
          }
        });
        
        updated++;
        console.log(`✅ [TBL INTELLIGENT] Mis à jour: ${data.id}`);
        
      } catch (error) {
        errors.push({
          dataId: data.id,
          nodeLabel: data.TreeBranchLeafNode?.label,
          error: error instanceof Error ? error.message : 'unknown'
        });
        console.error(`❌ [TBL INTELLIGENT] Erreur data ${data.id}:`, error);
      }
    }
    
    await prisma.$disconnect();
    
    return res.json({
      success: true,
      message: 'Traductions intelligentes appliquées',
      updated,
      total: submissionData.length,
      errors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL INTELLIGENT UPDATE] Erreur globale:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🔍 GET /api/tbl/check-intelligent-translations
 * NOUVEAU : Vérifier les traductions intelligentes en base
 */
router.get('/check-intelligent-translations', async (req, res) => {
  try {
    const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.query;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Récupérer les données avec traductions récentes
    const recentData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        submissionId: submissionId as string,
        operationSource: {
          in: ['condition', 'formula', 'table']
        },
        operationResult: {
          not: null
        }
      },
      include: {
        TreeBranchLeafNode: true
      },
      orderBy: {
        lastResolved: 'desc'
      },
      take: 10
    });
    
    await prisma.$disconnect();
    
    const translations = recentData.map(data => ({
      id: data.id,
      nodeLabel: data.TreeBranchLeafNode?.label,
      operationSource: data.operationSource,
      operationResult: data.operationResult,
      lastResolved: data.lastResolved,
      isIntelligent: typeof data.operationResult === 'string' && 
                     !data.operationResult.includes('Évalué dynamiquement par TBL Prisma') &&
                     (data.operationResult.includes('Si ') || 
                      data.operationResult.includes('(/)') || 
                      data.operationResult.includes('Tableau'))
    }));
    
    return res.json({
      success: true,
      submissionId,
      total: recentData.length,
      translations,
      stats: {
        intelligent: translations.filter(t => t.isIntelligent).length,
        old: translations.filter(t => !t.isIntelligent).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL CHECK INTELLIGENT] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🧠 POST /api/tbl/translate-capacity
 * NOUVEAU : Traduire une capacité spécifique en temps réel
 */
router.post('/translate-capacity', async (req, res) => {
  try {
    const { 
      operationSource, 
      operationDetail, 
      sourceRef, 
      submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' 
    } = req.body || {};
    
    if (!operationSource || !operationDetail) {
      return res.status(400).json({ 
        success: false, 
        error: 'operationSource et operationDetail requis' 
      });
    }
    
    if (!TBLIntelligentTranslator) {
      return res.status(500).json({ 
        success: false, 
        error: 'TBLIntelligentTranslator non disponible' 
      });
    }
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const translator = new TBLIntelligentTranslator(prisma);
    
    console.log(`🧠 [TBL TRANSLATE] Traduction en temps réel: ${operationSource}`);
    
    const translation = await translator.translateCapacity(
      operationSource,
      operationDetail,
      sourceRef || 'unknown',
      submissionId
    );
    
    await prisma.$disconnect();
    
    return res.json({
      success: true,
      translation,
      input: {
        operationSource,
        operationDetail,
        sourceRef,
        submissionId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL TRANSLATE] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

export default router;