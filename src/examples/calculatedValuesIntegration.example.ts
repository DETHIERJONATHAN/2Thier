/**
 * 📝 EXEMPLE D'INTÉGRATION - Comment utiliser le système de valeurs calculées
 * 
 * Ce fichier montre comment intégrer le stockage des valeurs calculées
 * dans ton endpoint de soumission de formulaire
 * 
 * 🎯 À adapter selon ta structure réelle d'endpoint
 */

import { storeCalculatedValues, getCalculatedValues } from '@/services/calculatedValuesService';

// ============================================================================
// 📋 EXEMPLE 1: ENDPOINT DE SOUMISSION AVEC STOCKAGE
// ============================================================================

export async function exampleFormSubmitEndpoint(req: any, res: any) {
  try {
    const { formData, treeId, submissionId } = req.body;

    console.log('📝 [FormSubmit] Soumission reçue:', { treeId, submissionId });

    // =====================================
    // ÉTAPE 1: Calculer toutes les valeurs
    // =====================================
    // C'est ICI que tu fais tes calculs (formules, tables, conditions)
    // Exemple simple :
    
    const calculatedData = {
      'node-formula-surface': {
        value: calculateSurfaceFormula(formData), // Ton calcul custom
        source: 'formula-abc'
      },
      'node-formula-prix': {
        value: calculatePriceFormula(formData),
        source: 'formula-def'
      },
      'node-table-lookup': {
        value: lookupTableValue(formData),
        source: 'table-ghi'
      },
      // ...
    };

    // =====================================
    // ÉTAPE 2: Préparer le format pour stockage
    // =====================================
    const valuesToStore = Object.entries(calculatedData).map(([nodeId, data]) => ({
      nodeId,
      calculatedValue: data.value,
      calculatedBy: data.source,
      submissionId // Pour audit optionnel
    }));

    console.log('🔍 [FormSubmit] Valeurs à stocker:', valuesToStore);

    // =====================================
    // ÉTAPE 3: Stocker TOUTES les valeurs
    // =====================================
    const storeResult = await storeCalculatedValues(valuesToStore, submissionId);

    if (!storeResult.success) {
      console.warn('⚠️ [FormSubmit] Erreurs lors du stockage:', storeResult.errors);
      // Optionnel: tu peux décider de échouer ou non
    }

    // =====================================
    // ÉTAPE 4: Répondre au frontend
    // =====================================
    return res.json({
      success: true,
      submissionId,
      treeId,
      calculated: storeResult.stored,
      failed: storeResult.failed,
      calculatedValues: calculatedData // Optionnel: retourner aussi les valeurs
    });

  } catch (error) {
    console.error('❌ [FormSubmit] Erreur:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la soumission du formulaire',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// ============================================================================
// 📋 EXEMPLE 2: FONCTIONS DE CALCUL
// ============================================================================

/**
 * Exemple: Calculer la surface (en utilisant les données du formulaire)
 */
function calculateSurfaceFormula(formData: Record<string, any>): number {
  const longueur = formData['node-longueur'] || 0;
  const largeur = formData['node-largeur'] || 0;
  
  const surface = parseFloat(longueur) * parseFloat(largeur);
  
  console.log(`📐 [Calculate] Surface = ${longueur} × ${largeur} = ${surface}m²`);
  
  return surface;
}

/**
 * Exemple: Calculer le prix (basé sur la surface + tarif)
 */
function calculatePriceFormula(formData: Record<string, any>): number {
  const surface = calculateSurfaceFormula(formData);
  const tarif = formData['node-tarif'] || 100; // Par défaut 100€/m²
  
  const prix = surface * parseFloat(tarif);
  
  console.log(`💰 [Calculate] Prix = ${surface}m² × ${tarif}€ = ${prix}€`);
  
  return prix;
}

/**
 * Exemple: Faire une recherche en table
 */
function lookupTableValue(formData: Record<string, any>): string {
  const type = formData['node-type'] || 'standard';
  
  // Exemple: table de correspondance
  const lookup: Record<string, string> = {
    'simple': 'Forfait Simple',
    'standard': 'Forfait Standard',
    'premium': 'Forfait Premium'
  };
  
  const result = lookup[type] || 'Inconnu';
  
  console.log(`🔍 [Lookup] Type "${type}" → "${result}"`);
  
  return result;
}

// ============================================================================
// 📋 EXEMPLE 3: RÉCUPÉRER LES VALEURS CALCULÉES APRÈS SOUMISSION
// ============================================================================

export async function exampleRetrieveCalculatedEndpoint(req: any, res: any) {
  try {
    const { submissionId } = req.params;
    const { nodeIds } = req.query; // CSV: "node-1,node-2,node-3"

    const ids = nodeIds ? nodeIds.split(',') : [];

    if (ids.length === 0) {
      return res.status(400).json({ error: 'nodeIds requis' });
    }

    // 🎯 Récupérer les valeurs stockées
    const values = await getCalculatedValues(ids);

    console.log('📊 [Retrieve] Valeurs récupérées:', {
      submissionId,
      count: Object.keys(values).length,
      values
    });

    return res.json({
      success: true,
      submissionId,
      values // Map nodeId -> value
    });

  } catch (error) {
    console.error('❌ [Retrieve] Erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
}

// ============================================================================
// 📋 EXEMPLE 4: INTÉGRATION COMPLÈTE AVEC VALIDATION
// ============================================================================

export async function exampleCompleteSubmitEndpoint(req: any, res: any) {
  try {
    const { formData, treeId, submissionId } = req.body;

    // ÉTAPE 1: Validation
    if (!formData || !treeId) {
      return res.status(400).json({ 
        error: 'formData et treeId requis' 
      });
    }

    console.log('🚀 [CompleteSubmit] Soumission reçue:', {
      treeId,
      submissionId,
      fieldCount: Object.keys(formData).length
    });

    // ÉTAPE 2: Calculer
    const calculations = {
      surface: calculateSurfaceFormula(formData),
      prix: calculatePriceFormula(formData),
      type: lookupTableValue(formData)
    };

    console.log('✅ [CompleteSubmit] Calculs terminés:', calculations);

    // ÉTAPE 3: Préparer stockage
    const valuesToStore = [
      {
        nodeId: 'node-formula-surface',
        calculatedValue: calculations.surface,
        calculatedBy: 'formula-surface',
        submissionId
      },
      {
        nodeId: 'node-formula-prix',
        calculatedValue: calculations.prix,
        calculatedBy: 'formula-prix',
        submissionId
      },
      {
        nodeId: 'node-lookup-type',
        calculatedValue: calculations.type,
        calculatedBy: 'table-lookup',
        submissionId
      }
    ];

    // ÉTAPE 4: Stocker
    const storeResult = await storeCalculatedValues(valuesToStore, submissionId);

    if (storeResult.failed > 0) {
      console.warn('⚠️ [CompleteSubmit] Erreurs:', storeResult.errors);
    }

    // ÉTAPE 5: Retourner complètement
    return res.json({
      success: true,
      submissionId,
      treeId,
      message: `✅ Soumission acceptée: ${storeResult.stored} valeurs stockées`,
      calculations,
      storage: {
        stored: storeResult.stored,
        failed: storeResult.failed,
        errors: storeResult.errors
      }
    });

  } catch (error) {
    console.error('❌ [CompleteSubmit] Erreur fatale:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ============================================================================
// 🔗 INTÉGRATION AVEC ROUTER EXPRESS
// ============================================================================

import express from 'express';

export function setupCalculatedValuesExampleRoutes() {
  const router = express.Router();

  // Route POST: soumettre formulaire + calculer + stocker
  router.post('/form-submit', exampleFormSubmitEndpoint);

  // Route GET: récupérer valeurs calculées
  router.get('/submission/:submissionId/calculated-values', exampleRetrieveCalculatedEndpoint);

  return router;
}

// À monter dans api-server-clean.ts:
// app.use('/api/examples', setupCalculatedValuesExampleRoutes());
