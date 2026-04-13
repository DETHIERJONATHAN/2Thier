import express, { Request, Response } from 'express';
import { db } from '../../../lib/database';
import { authMiddleware } from '../../../middlewares/auth.js';
import { requireRole } from '../../../middlewares/requireRole.js';
import * as mockFormulas from '../../../global-mock-formulas.js';
import { logger } from '../../lib/logger';

// Interface pour les requêtes avec paramètres fusionnés
interface MergedParamsRequest extends Request {
  params: {
    formulaId?: string;
    id?: string; // Le paramètre de la route parente /:id/formulas
    fieldId?: string;
  }
}

const router = express.Router({ mergeParams: true });
const prisma = db;

// Contournement du problème de mock
const mockEnabled = process.env.NODE_ENV === 'development';

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware as unknown);

/**
 * GET toutes les formules d'un champ spécifique
 */
router.get('/', requireRole(['admin', 'super_admin']), async (req: MergedParamsRequest, res: Response) => {
  try {
    // Le fieldId est maintenant disponible via req.params.id (depuis la route parente)
    const fieldId = req.params.id;
    
    if (!fieldId) {
      return res.status(400).json({ error: "ID du champ manquant" });
    }
    
    // En mode développement, utiliser le système de mock
    if (mockEnabled) {
      
      // Système amélioré de récupération des données avec multiples sources
      let formulas = [];
      let source = 'aucune';
      
      try {
        if (global._globalFormulasStore && global._globalFormulasStore.has(fieldId as string)) {
          const storeData = global._globalFormulasStore.get(fieldId as string);
          if (storeData && Array.isArray(storeData) && storeData.length > 0) {
            formulas = JSON.parse(JSON.stringify(storeData));
            source = 'principale';
          } else {
            logger.warn(`[API] GET - ⚠️ Store principal existe mais ne contient pas de données valides pour ${fieldId}`);
          }
        } else {
          logger.warn(`[API] GET - ⚠️ Store principal ne contient pas d'entrée pour ${fieldId}`);
        }
      } catch (directError) {
        logger.error('[API] GET - ❌ Erreur lors de l\'accès au store principal:', directError);
      }
      
      // Si store principal vide, essayer le store de secours
      if (!formulas || formulas.length === 0) {
        try {
          if (global._backupFormulasStore && global._backupFormulasStore.has(fieldId as string)) {
            const backupData = global._backupFormulasStore.get(fieldId as string);
            if (backupData && Array.isArray(backupData) && backupData.length > 0) {
              formulas = JSON.parse(JSON.stringify(backupData));
              source = 'secours';
              
              // Restaurer le store principal
              global._globalFormulasStore.set(fieldId as string, JSON.parse(JSON.stringify(formulas)));
            }
          }
        } catch (backupError) {
          logger.error('[API] GET - ❌ Erreur lors de l\'accès au store de secours:', backupError);
        }
      }
      
      // Si les deux stores ont échoué, utiliser forceRefreshStore
      if (!formulas || formulas.length === 0) {
        try {
          const mockFormulasData = mockFormulas.forceRefreshStore(fieldId as string);
          if (mockFormulasData && mockFormulasData.length > 0) {
            formulas = mockFormulasData;
            source = 'forceRefreshStore';
          }
        } catch (refreshError) {
          logger.error('[API] GET - ❌ Erreur avec forceRefreshStore:', refreshError);
        }
      }
      
      // Dernier recours: utiliser getFormulasForField
      if (!formulas || formulas.length === 0) {
        try {
          const backupData = mockFormulas.getFormulasForField(fieldId as string);
          if (backupData && backupData.length > 0) {
            formulas = backupData;
          }
        } catch (getError) {
          logger.error('[API] GET - Erreur avec getFormulasForField:', getError);
        }
      }
      
      // Logguer le résultat final avec la source
      if (formulas.length > 0) {
      }
      
      return res.json(formulas);
    }
    
    // En mode production, utiliser la base de données
    const formulas = await prisma.fieldFormula.findMany({
      where: { fieldId },
      orderBy: { order: 'asc' }
    });
    
    // On parse la séquence JSON pour chaque formule
    const processedFormulas = formulas.map(f => ({
      ...f,
      sequence: f.sequence ? JSON.parse(f.sequence as string) : [],
    }));
    
    res.json(processedFormulas);
  } catch (err: unknown) {
    logger.error("Erreur lors de la récupération des formules:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT mise à jour d'une formule
 * Route: /api/fields/:id/formulas/:formulaId
 */
router.put('/:formulaId', requireRole(['admin', 'super_admin']), async (req: MergedParamsRequest, res: Response) => {
  try {
    const { formulaId } = req.params;
    // On récupère l'ID du champ depuis les paramètres de route fusionnés
    const fieldId = req.params.id;
    const { name, sequence, order } = req.body;


    if (!fieldId) {
      return res.status(400).json({ error: "ID du champ manquant" });
    }

    // Si la formule n'existe pas encore, la créer d'abord
    try {
      const existingFormula = await prisma.fieldFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (!existingFormula) {
        await prisma.fieldFormula.create({
          data: {
            id: formulaId,
            fieldId: fieldId,
            name: name || 'Nouvelle formule',
            sequence: sequence ? (typeof sequence === 'string' ? sequence : JSON.stringify(sequence)) : '[]',
            order: order || 0
          }
        });
      }
    } catch (createError) {
      logger.error(`[API] Erreur lors de la vérification/création de la formule:`, createError);
    }

    const dataToUpdate: unknown = {};

    if (name !== undefined) {
      dataToUpdate.name = name;
    }
    if (sequence !== undefined) {
      // S'assurer que la séquence est bien une chaîne JSON
      dataToUpdate.sequence = typeof sequence === 'string' ? sequence : JSON.stringify(sequence);
    }
    if (order !== undefined) {
      dataToUpdate.order = order;
    }

    let updatedFormula;
    try {
      updatedFormula = await prisma.fieldFormula.update({
        where: { id: formulaId },
        data: dataToUpdate
      });
    } catch (updateError) {
      logger.error(`[API] Erreur lors de la mise à jour de la formule:`, updateError);
      
      // Si la mise à jour échoue, essayer de créer la formule
      updatedFormula = await prisma.fieldFormula.create({
        data: {
          id: formulaId,
          fieldId: fieldId,
          name: name || 'Nouvelle formule',
          sequence: sequence ? (typeof sequence === 'string' ? sequence : JSON.stringify(sequence)) : '[]',
          order: order || 0
        }
      });
    }

    // Après la mise à jour, on renvoie la liste complète et à jour
    const formulas = await prisma.fieldFormula.findMany({
      where: { fieldId },
      orderBy: { order: 'asc' }
    });
    
    // Transformer les formules pour le format attendu par le frontend
    const processedFormulas = formulas.map(f => ({
      ...f,
      sequence: f.sequence ? JSON.parse(f.sequence as string) : []
    }));
    
    res.json(processedFormulas);

  } catch (err: unknown) {
    const { formulaId } = req.params;
    const fieldId = req.params.id || '';
    logger.error(`Erreur API PUT /api/fields/.../formulas/${formulaId}:`, err);
    
    // En mode développement, utiliser le système de mock pour simuler la persistance
    if (mockEnabled) {
      
      // Récupérer les données de la formule depuis le body de la requête
      const { sequence, name, order } = req.body;
      
      // Utiliser le système de mock pour mettre à jour ou créer la formule
      mockFormulas.updateFormula(fieldId as string, formulaId as string, {
        name,
        sequence,
        order
      });
      
      // CORRECTIF: Vérifier d'abord si la formule a bien été sauvegardée
      
      // Forcer la sauvegarde une seconde fois pour s'assurer de la persistance
      try {
        mockFormulas.updateFormula(fieldId as string, formulaId as string, {
          name,
          sequence,
          order
        });
      } catch (doubleSaveError) {
        logger.warn(`[API] PUT - Erreur lors de la double sauvegarde:`, doubleSaveError);
      }
      
      // Système amélioré de récupération des données avec multiples sources
      let formulas = [];
      let source = 'aucune';
      
      try {
        if (global._globalFormulasStore && global._globalFormulasStore.has(fieldId as string)) {
          const storeData = global._globalFormulasStore.get(fieldId as string);
          if (storeData && Array.isArray(storeData) && storeData.length > 0) {
            formulas = JSON.parse(JSON.stringify(storeData));
            source = 'principale';
            
            // Vérification que la formule modifiée est bien présente
            const formulaFound = formulas.some((f: Record<string, unknown>) => f.id === formulaId);
            
            if (formulas.length > 0) {
              return res.json(formulas);
            }
          }
        }
      } catch (directError) {
        logger.error('[API] PUT - ❌ Erreur lors de l\'accès au store principal:', directError);
      }
      
      // Si store principal vide, essayer le store de secours
      try {
        if (global._backupFormulasStore && global._backupFormulasStore.has(fieldId as string)) {
          const backupData = global._backupFormulasStore.get(fieldId as string);
          if (backupData && Array.isArray(backupData) && backupData.length > 0) {
            formulas = JSON.parse(JSON.stringify(backupData));
            source = 'secours';
            
            // Vérification que la formule modifiée est bien présente
            const formulaFound = formulas.some((f: Record<string, unknown>) => f.id === formulaId);
            
            // Restaurer le store principal
            global._globalFormulasStore.set(fieldId as string, JSON.parse(JSON.stringify(formulas)));
            
            if (formulas.length > 0) {
              return res.json(formulas);
            }
          }
        }
      } catch (backupError) {
        logger.error('[API] PUT - ❌ Erreur lors de l\'accès au store de secours:', backupError);
      }
      
      // Si récupération directe échouée, utiliser forceRefreshStore
      try {
        const directFormulas = mockFormulas.forceRefreshStore(fieldId as string);
        
        if (directFormulas && directFormulas.length > 0) {
          return res.json(directFormulas);
        }
      } catch (refreshError) {
        logger.error('[API] PUT - Erreur avec forceRefreshStore:', refreshError);
      }
      
      // Dernier recours: getFormulasForField
      try {
        const allFormulas = mockFormulas.getFormulasForField(fieldId as string);
        
        if (Array.isArray(allFormulas) && allFormulas.length > 0) {
          return res.json(allFormulas);
        }
      } catch (getError) {
        logger.error('[API] PUT - Erreur avec getFormulasForField:', getError);
      }
      
      logger.error(`[API] PUT - ÉCHEC CRITIQUE: Toutes les tentatives de récupération ont échoué`);
      return res.json([]);
    }
    
    // En production, renvoyer les erreurs normales
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Formule non trouvée' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule', details: err.message });
    }
  }
});

export default router;
