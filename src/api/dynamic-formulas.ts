/**
 * 🌟 API POUR SYSTÈME DYNAMIQUE DE FORMULES
 * 
 * Cette API s'adapte automatiquement aux configurations des formulaires
 * et permet de gérer TOUS les devis et formules de manière dynamique.
 */

import { getFieldMapping } from '../config/fieldMapping';

import express from 'express';
import DynamicFormulaEngine from '../services/DynamicFormulaEngine';

const router = express.Router();

/**
 * 🔍 GET /api/dynamic-formulas/configurations
 * Récupère toutes les configurations de champs pour une organisation
 */
router.get('/configurations', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID requis dans les headers'
      });
    }

    const engine = new DynamicFormulaEngine();
    const configurations = await engine.loadFieldConfigurations(organizationId);
    await engine.cleanup();

    console.log('✅ [DynamicFormulaAPI] Configurations récupérées:', Object.keys(configurations).length);

    res.json({
      success: true,
      data: {
        configurations,
        organizationId,
        totalFields: Object.keys(configurations).length,
        conditionalFields: Object.values(configurations).filter(
          config => config.type === 'advanced_select' || 
                   (config.formulas && config.formulas.length > 0)
        ).length
      }
    });

  } catch (error) {
    console.error('❌ [DynamicFormulaAPI] Erreur récupération configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des configurations',
      details: error.message
    });
  }
});

/**
 * 🧮 POST /api/dynamic-formulas/calculate
 * Exécute les calculs dynamiques selon les valeurs fournies
 */
router.post('/calculate', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { fieldValues } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID requis dans les headers'
      });
    }

    if (!fieldValues || typeof fieldValues !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'fieldValues requis dans le body de la requête'
      });
    }

    console.log('🧮 [DynamicFormulaAPI] Début calculs pour org:', organizationId);
    console.log('📝 Valeurs reçues:', Object.keys(fieldValues).length);

    const engine = new DynamicFormulaEngine();
    
    // Charger les configurations
    const fieldConfigs = await engine.loadFieldConfigurations(organizationId);
    
    // Contexte de calcul
    const context = {
      fieldValues,
      fieldConfigs,
      organizationId
    };

    // Exécuter les calculs
    const results = await engine.executeCalculations(context);
    
    await engine.cleanup();

    console.log('✅ [DynamicFormulaAPI] Calculs terminés:', Object.keys(results).length);

    res.json({
      success: true,
      data: {
        results,
        calculatedFields: Object.keys(results),
        organizationId,
        timestamp: new Date().toISOString(),
        inputFieldsCount: Object.keys(fieldValues).length,
        outputFieldsCount: Object.keys(results).length
      }
    });

  } catch (error) {
    console.error('❌ [DynamicFormulaAPI] Erreur calculs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors des calculs dynamiques',
      details: error.message
    });
  }
});

/**
 * ⚡ POST /api/dynamic-formulas/calculate-prix-kwh
 * Calcul spécifique pour Prix Kw/h selon votre logique
 */
router.post('/calculate-prix-kwh', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { 
      selectedOption, // 'prix-kwh' ou 'calcul-du-prix-kwh'
      prixDefini,     // Valeur actuelle Prix Kw/h - Défini
      consommation,   // Consommation annuelle Kw/h
      calculBase,     // Base de calcul si nécessaire
      directValue     // Valeur directe si saisie
    } = req.body;

    console.log('⚡ [Prix Kw/h API] Calcul spécifique - Option:', selectedOption);
    console.log('⚡ [Prix Kw/h API] Prix défini:', prixDefini);
    console.log('⚡ [Prix Kw/h API] Consommation:', consommation);

    const engine = new DynamicFormulaEngine();
    const fieldConfigs = await engine.loadFieldConfigurations(organizationId);
    
    // Récupérer le mapping des champs dynamique
    const fieldMapping = getFieldMapping();
    
    // Construire le contexte avec les valeurs spécifiques
    const context = {
      fieldValues: {
        [fieldMapping.prix_kwh]: selectedOption, // Prix Kw/h (advanced_select)
        [fieldMapping.prix_mois]: prixDefini,     // Prix Kw/h - Défini
        [fieldMapping.consommation_kwh]: consommation,  // Consommation annuelle
        'direct_prix_kwh_input': directValue,
        'calcul_du_prix_base': calculBase || prixDefini
      },
      fieldConfigs,
      organizationId
    };

    // Calcul spécifique
    const results = await engine.executeCalculations(context);
    
    await engine.cleanup();

    // Résultat spécifique pour Prix Kw/h - Défini
    const finalPrixKwh = results['52c7f63b-7e57-4ba8-86da-19a176f09220'];

    console.log('✅ [Prix Kw/h API] Résultat final:', finalPrixKwh);

    res.json({
      success: true,
      data: {
        prixKwhDefini: finalPrixKwh,
        selectedOption,
        calculation: {
          method: selectedOption === 'prix-kwh' ? 'Valeur directe' : 'Division par consommation',
          baseValue: selectedOption === 'prix-kwh' ? directValue : (calculBase || prixDefini),
          divisor: selectedOption === 'calcul-du-prix-kwh' ? consommation : null,
          result: finalPrixKwh
        },
        allResults: results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Prix Kw/h API] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul Prix Kw/h',
      details: error.message
    });
  }
});

/**
 * 🔄 PUT /api/dynamic-formulas/configurations/:fieldId
 * Met à jour la configuration d'un champ (système adaptatif)
 */
router.put('/configurations/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { advancedConfig, formulas, dependencies } = req.body;

    console.log('🔄 [DynamicFormulaAPI] Mise à jour configuration:', fieldId);

    const engine = new DynamicFormulaEngine();
    
    await engine.updateFieldConfiguration(fieldId, {
      advancedConfig,
      formulas,
      dependencies
    });

    await engine.cleanup();

    console.log('✅ [DynamicFormulaAPI] Configuration mise à jour');

    res.json({
      success: true,
      data: {
        fieldId,
        updated: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [DynamicFormulaAPI] Erreur mise à jour:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la configuration',
      details: error.message
    });
  }
});

/**
 * 🎯 GET /api/dynamic-formulas/field/:fieldId/logic
 * Analyse les logiques conditionnelles d'un champ spécifique
 */
router.get('/field/:fieldId/logic', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    console.log('🎯 [DynamicFormulaAPI] Analyse logique pour champ:', fieldId);

    const engine = new DynamicFormulaEngine();
    const configurations = await engine.loadFieldConfigurations(organizationId);
    
    const fieldConfig = configurations[fieldId];
    if (!fieldConfig) {
      return res.status(404).json({
        success: false,
        error: 'Champ non trouvé'
      });
    }

    const logics = engine.analyzeConditionalLogic(fieldConfig);
    await engine.cleanup();

    res.json({
      success: true,
      data: {
        fieldId,
        fieldLabel: fieldConfig.label,
        fieldType: fieldConfig.type,
        logics,
        hasConditionalLogic: logics.length > 0,
        optionsCount: fieldConfig.options?.length || 0,
        formulasCount: fieldConfig.formulas?.length || 0,
        dependenciesCount: fieldConfig.dependencies?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ [DynamicFormulaAPI] Erreur analyse logique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse de la logique',
      details: error.message
    });
  }
});

/**
 * 📊 GET /api/dynamic-formulas/analytics
 * Statistiques du système dynamique
 */
router.get('/analytics', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    const engine = new DynamicFormulaEngine();
    const configurations = await engine.loadFieldConfigurations(organizationId);
    await engine.cleanup();

    const fields = Object.values(configurations);
    
    const analytics = {
      totalFields: fields.length,
      advancedSelectFields: fields.filter(f => f.type === 'advanced_select').length,
      fieldsWithFormulas: fields.filter(f => f.formulas && f.formulas.length > 0).length,
      fieldsWithDependencies: fields.filter(f => f.dependencies && f.dependencies.length > 0).length,
      fieldsWithValidations: fields.filter(f => f.validations && f.validations.length > 0).length,
      totalOptions: fields.reduce((sum, f) => sum + (f.options?.length || 0), 0),
      totalFormulas: fields.reduce((sum, f) => sum + (f.formulas?.length || 0), 0),
      totalDependencies: fields.reduce((sum, f) => sum + (f.dependencies?.length || 0), 0),
      organizationId,
      timestamp: new Date().toISOString()
    };

    console.log('📊 [DynamicFormulaAPI] Statistiques:', analytics);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ [DynamicFormulaAPI] Erreur analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message
    });
  }
});

export default router;
