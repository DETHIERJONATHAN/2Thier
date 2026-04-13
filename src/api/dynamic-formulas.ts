/**
 * Ã°Å¸Å’Å¸ API POUR SYSTÃƒË†ME DYNAMIQUE DE FORMULES
 * 
 * Cette API s'adapte automatiquement aux configurations des formulaires
 * et permet de gÃƒÂ©rer TOUS les devis et formules de maniÃƒÂ¨re dynamique.
 */

import { getFieldMapping } from '../config/fieldMapping';

import express from 'express';
import DynamicFormulaEngine from '../services/DynamicFormulaEngine';
import { logger } from '../lib/logger';

const router = express.Router();

/**
 * Ã°Å¸â€Â GET /api/dynamic-formulas/configurations
 * RÃƒÂ©cupÃƒÂ¨re toutes les configurations de champs pour une organisation
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
    logger.error('Ã¢ÂÅ’ [DynamicFormulaAPI] Erreur rÃƒÂ©cupÃƒÂ©ration configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃƒÂ©cupÃƒÂ©ration des configurations',
      details: error.message
    });
  }
});

/**
 * Ã°Å¸Â§Â® POST /api/dynamic-formulas/calculate
 * ExÃƒÂ©cute les calculs dynamiques selon les valeurs fournies
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
        error: 'fieldValues requis dans le body de la requÃƒÂªte'
      });
    }


    const engine = new DynamicFormulaEngine();
    
    // Charger les configurations
    const fieldConfigs = await engine.loadFieldConfigurations(organizationId);
    
    // Contexte de calcul
    const context = {
      fieldValues,
      fieldConfigs,
      organizationId
    };

    // ExÃƒÂ©cuter les calculs
    const results = await engine.executeCalculations(context);
    
    await engine.cleanup();


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
    logger.error('Ã¢ÂÅ’ [DynamicFormulaAPI] Erreur calculs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors des calculs dynamiques',
      details: error.message
    });
  }
});

/**
 * Ã¢Å¡Â¡ POST /api/dynamic-formulas/calculate-prix-kwh
 * Calcul spÃƒÂ©cifique pour Prix Kw/h selon votre logique
 */
router.post('/calculate-prix-kwh', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { 
      selectedOption, // 'prix-kwh' ou 'calcul-du-prix-kwh'
      prixDefini,     // Valeur actuelle Prix Kw/h - DÃƒÂ©fini
      consommation,   // Consommation annuelle Kw/h
      calculBase,     // Base de calcul si nÃƒÂ©cessaire
      directValue     // Valeur directe si saisie
    } = req.body;


    const engine = new DynamicFormulaEngine();
    const fieldConfigs = await engine.loadFieldConfigurations(organizationId);
    
    // RÃƒÂ©cupÃƒÂ©rer le mapping des champs dynamique
    const fieldMapping = getFieldMapping();
    
    // Construire le contexte avec les valeurs spÃƒÂ©cifiques
    const context = {
      fieldValues: {
        [fieldMapping.prix_kwh]: selectedOption, // Prix Kw/h (advanced_select)
        [fieldMapping.prix_mois]: prixDefini,     // Prix Kw/h - DÃƒÂ©fini
        [fieldMapping.consommation_kwh]: consommation,  // Consommation annuelle
        'direct_prix_kwh_input': directValue,
        'calcul_du_prix_base': calculBase || prixDefini
      },
      fieldConfigs,
      organizationId
    };

    // Calcul spÃƒÂ©cifique
    const results = await engine.executeCalculations(context);
    
    await engine.cleanup();

    // RÃƒÂ©sultat spÃƒÂ©cifique pour Prix Kw/h - DÃƒÂ©fini
    const finalPrixKwh = results['52c7f63b-7e57-4ba8-86da-19a176f09220'];


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
    logger.error('Ã¢ÂÅ’ [Prix Kw/h API] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul Prix Kw/h',
      details: error.message
    });
  }
});

/**
 * Ã°Å¸â€â€ž PUT /api/dynamic-formulas/configurations/:fieldId
 * Met ÃƒÂ  jour la configuration d'un champ (systÃƒÂ¨me adaptatif)
 */
router.put('/configurations/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { advancedConfig, formulas, dependencies } = req.body;


    const engine = new DynamicFormulaEngine();
    
    await engine.updateFieldConfiguration(fieldId, {
      advancedConfig,
      formulas,
      dependencies
    });

    await engine.cleanup();


    res.json({
      success: true,
      data: {
        fieldId,
        updated: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ [DynamicFormulaAPI] Erreur mise ÃƒÂ  jour:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise ÃƒÂ  jour de la configuration',
      details: error.message
    });
  }
});

/**
 * Ã°Å¸Å½Â¯ GET /api/dynamic-formulas/field/:fieldId/logic
 * Analyse les logiques conditionnelles d'un champ spÃƒÂ©cifique
 */
router.get('/field/:fieldId/logic', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;


    const engine = new DynamicFormulaEngine();
    const configurations = await engine.loadFieldConfigurations(organizationId);
    
    const fieldConfig = configurations[fieldId];
    if (!fieldConfig) {
      return res.status(404).json({
        success: false,
        error: 'Champ non trouvÃƒÂ©'
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
    logger.error('Ã¢ÂÅ’ [DynamicFormulaAPI] Erreur analyse logique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse de la logique',
      details: error.message
    });
  }
});

/**
 * Ã°Å¸â€œÅ  GET /api/dynamic-formulas/analytics
 * Statistiques du systÃƒÂ¨me dynamique
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


    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ [DynamicFormulaAPI] Erreur analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃƒÂ©cupÃƒÂ©ration des statistiques',
      details: error.message
    });
  }
});

export default router;
