import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../middlewares/auth.js';
import { requireRole } from '../../../middlewares/requireRole.js';
import * as mockFormulas from '../../../global-mock-formulas.js';

// Interface pour les requêtes avec paramètres fusionnés
interface MergedParamsRequest extends Request {
  params: {
    formulaId?: string;
    id?: string; // Le paramètre de la route parente /:id/formulas
    fieldId?: string;
  }
}

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// Contournement du problème de mock
const mockEnabled = process.env.NODE_ENV === 'development';
console.log(`[CONFIG] Mode mock ${mockEnabled ? 'activé' : 'désactivé'}`);

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware as any);

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
      console.log('[API] GET - Mode développement, récupération des formules mockées pour le champ', fieldId);
      
      // Système amélioré de récupération des données avec multiples sources
      let formulas = [];
      let source = 'aucune';
      
      try {
        console.log('[API] GET - Vérification du store global principal...');
        if (global._globalFormulasStore && global._globalFormulasStore.has(fieldId as string)) {
          const storeData = global._globalFormulasStore.get(fieldId as string);
          if (storeData && Array.isArray(storeData) && storeData.length > 0) {
            formulas = JSON.parse(JSON.stringify(storeData));
            source = 'principale';
            console.log(`[API] GET - ✅ Récupération directe du store principal: ${formulas.length} formules trouvées`);
          } else {
            console.warn(`[API] GET - ⚠️ Store principal existe mais ne contient pas de données valides pour ${fieldId}`);
          }
        } else {
          console.warn(`[API] GET - ⚠️ Store principal ne contient pas d'entrée pour ${fieldId}`);
        }
      } catch (directError) {
        console.error('[API] GET - ❌ Erreur lors de l\'accès au store principal:', directError);
      }
      
      // Si store principal vide, essayer le store de secours
      if (!formulas || formulas.length === 0) {
        try {
          console.log('[API] GET - Tentative avec le store de secours...');
          if (global._backupFormulasStore && global._backupFormulasStore.has(fieldId as string)) {
            const backupData = global._backupFormulasStore.get(fieldId as string);
            if (backupData && Array.isArray(backupData) && backupData.length > 0) {
              formulas = JSON.parse(JSON.stringify(backupData));
              source = 'secours';
              console.log(`[API] GET - ✅ Récupération depuis le store de secours: ${formulas.length} formules trouvées`);
              
              // Restaurer le store principal
              global._globalFormulasStore.set(fieldId as string, JSON.parse(JSON.stringify(formulas)));
              console.log(`[API] GET - 🔄 Store principal restauré depuis le store de secours`);
            }
          }
        } catch (backupError) {
          console.error('[API] GET - ❌ Erreur lors de l\'accès au store de secours:', backupError);
        }
      }
      
      // Si les deux stores ont échoué, utiliser forceRefreshStore
      if (!formulas || formulas.length === 0) {
        try {
          console.log('[API] GET - ⚠️ Les deux stores sont vides, utilisation de forceRefreshStore...');
          const mockFormulasData = mockFormulas.forceRefreshStore(fieldId as string);
          if (mockFormulasData && mockFormulasData.length > 0) {
            formulas = mockFormulasData;
            source = 'forceRefreshStore';
            console.log(`[API] GET - ✅ forceRefreshStore a trouvé ${formulas.length} formules`);
          }
        } catch (refreshError) {
          console.error('[API] GET - ❌ Erreur avec forceRefreshStore:', refreshError);
        }
      }
      
      // Dernier recours: utiliser getFormulasForField
      if (!formulas || formulas.length === 0) {
        try {
          console.log('[API] GET - Tentative avec getFormulasForField...');
          const backupData = mockFormulas.getFormulasForField(fieldId as string);
          if (backupData && backupData.length > 0) {
            formulas = backupData;
            console.log(`[API] GET - getFormulasForField a trouvé ${formulas.length} formules`);
          }
        } catch (getError) {
          console.error('[API] GET - Erreur avec getFormulasForField:', getError);
        }
      }
      
      // Logguer le résultat final avec la source
      console.log(`[API] GET - RÉSULTAT FINAL (source: ${source}): ${formulas.length} formules mockées trouvées`);
      console.log("[API] GET - Debug: Type de retour:", typeof formulas, "Est un tableau:", Array.isArray(formulas), "Longueur:", formulas?.length || 0);
      if (formulas.length > 0) {
        console.log(`[API] GET - Contenu des formules (premier élément):`, JSON.stringify(formulas[0]));
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
  } catch (err: any) {
    console.error("Erreur lors de la récupération des formules:", err);
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

    console.log(`[API] Mise à jour formule ${formulaId} pour champ ${fieldId}`);
    console.log(`[API] Données reçues:`, { name, sequence, order });

    if (!fieldId) {
      return res.status(400).json({ error: "ID du champ manquant" });
    }

    // Si la formule n'existe pas encore, la créer d'abord
    try {
      const existingFormula = await prisma.fieldFormula.findUnique({
        where: { id: formulaId }
      });
      
      if (!existingFormula) {
        console.log(`[API] Formule ${formulaId} n'existe pas encore, création...`);
        await prisma.fieldFormula.create({
          data: {
            id: formulaId,
            fieldId: fieldId,
            name: name || 'Nouvelle formule',
            sequence: sequence ? (typeof sequence === 'string' ? sequence : JSON.stringify(sequence)) : '[]',
            order: order || 0
          }
        });
        console.log(`[API] Formule ${formulaId} créée avec succès`);
      }
    } catch (createError) {
      console.error(`[API] Erreur lors de la vérification/création de la formule:`, createError);
    }

    const dataToUpdate: any = {};

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
      
      console.log(`[API] Formule mise à jour avec succès:`, { 
        id: updatedFormula.id, 
        name: updatedFormula.name
      });
    } catch (updateError) {
      console.error(`[API] Erreur lors de la mise à jour de la formule:`, updateError);
      
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
      
      console.log(`[API] Formule créée avec succès comme alternative:`, { 
        id: updatedFormula.id, 
        name: updatedFormula.name
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
    
    console.log(`[API] Retour de ${processedFormulas.length} formules au client`);
    res.json(processedFormulas);

  } catch (err: any) {
    const { formulaId } = req.params;
    const fieldId = req.params.id || '';
    console.error(`Erreur API PUT /api/fields/.../formulas/${formulaId}:`, err);
    
    // En mode développement, utiliser le système de mock pour simuler la persistance
    if (mockEnabled) {
      console.log(`[API] PUT - Mode développement (catch), utilisation du système de mock pour la persistance`);
      
      // Récupérer les données de la formule depuis le body de la requête
      const { sequence, name, order } = req.body;
      
      // Utiliser le système de mock pour mettre à jour ou créer la formule
      /* eslint-disable */
      mockFormulas.updateFormula(fieldId as string, formulaId as string, {
        name,
        sequence,
        order
      });
      
      // CORRECTIF: Vérifier d'abord si la formule a bien été sauvegardée
      console.log(`[API] PUT - Vérifiant si la formule ${formulaId} a été correctement sauvegardée...`);
      
      // Forcer la sauvegarde une seconde fois pour s'assurer de la persistance
      try {
        console.log(`[API] PUT - DOUBLE SAUVEGARDE de sécurité pour ${formulaId}`);
        mockFormulas.updateFormula(fieldId as string, formulaId as string, {
          name,
          sequence,
          order
        });
      } catch (doubleSaveError) {
        console.warn(`[API] PUT - Erreur lors de la double sauvegarde:`, doubleSaveError);
      }
      
      // Système amélioré de récupération des données avec multiples sources
      let formulas = [];
      let source = 'aucune';
      
      try {
        console.log('[API] PUT - Vérification du store global principal...');
        if (global._globalFormulasStore && global._globalFormulasStore.has(fieldId as string)) {
          const storeData = global._globalFormulasStore.get(fieldId as string);
          if (storeData && Array.isArray(storeData) && storeData.length > 0) {
            formulas = JSON.parse(JSON.stringify(storeData));
            source = 'principale';
            console.log(`[API] PUT - ✅ Récupération directe du store principal: ${formulas.length} formules trouvées`);
            
            // Vérification que la formule modifiée est bien présente
            const formulaFound = formulas.some((f: any) => f.id === formulaId);
            console.log(`[API] PUT - Formule ${formulaId} ${formulaFound ? 'trouvée' : 'NON TROUVÉE'} dans le store principal`);
            
            if (formulas.length > 0) {
              console.log(`[API] PUT - Contenu du store principal (source: ${source}):`, JSON.stringify(formulas[0]));
              return res.json(formulas);
            }
          }
        }
      } catch (directError) {
        console.error('[API] PUT - ❌ Erreur lors de l\'accès au store principal:', directError);
      }
      
      // Si store principal vide, essayer le store de secours
      try {
        console.log('[API] PUT - Tentative avec le store de secours...');
        if (global._backupFormulasStore && global._backupFormulasStore.has(fieldId as string)) {
          const backupData = global._backupFormulasStore.get(fieldId as string);
          if (backupData && Array.isArray(backupData) && backupData.length > 0) {
            formulas = JSON.parse(JSON.stringify(backupData));
            source = 'secours';
            console.log(`[API] PUT - ✅ Récupération depuis le store de secours: ${formulas.length} formules trouvées`);
            
            // Vérification que la formule modifiée est bien présente
            const formulaFound = formulas.some((f: any) => f.id === formulaId);
            console.log(`[API] PUT - Formule ${formulaId} ${formulaFound ? 'trouvée' : 'NON TROUVÉE'} dans le store de secours`);
            
            // Restaurer le store principal
            global._globalFormulasStore.set(fieldId as string, JSON.parse(JSON.stringify(formulas)));
            console.log(`[API] PUT - 🔄 Store principal restauré depuis le store de secours`);
            
            if (formulas.length > 0) {
              console.log(`[API] PUT - Contenu du store de secours (source: ${source}):`, JSON.stringify(formulas[0]));
              return res.json(formulas);
            }
          }
        }
      } catch (backupError) {
        console.error('[API] PUT - ❌ Erreur lors de l\'accès au store de secours:', backupError);
      }
      
      // Si récupération directe échouée, utiliser forceRefreshStore
      try {
        console.log('[API] PUT - Utilisation de forceRefreshStore comme fallback...');
        const directFormulas = mockFormulas.forceRefreshStore(fieldId as string);
        
        if (directFormulas && directFormulas.length > 0) {
          console.log(`[API] PUT - forceRefreshStore a trouvé ${directFormulas.length} formules`);
          return res.json(directFormulas);
        }
      } catch (refreshError) {
        console.error('[API] PUT - Erreur avec forceRefreshStore:', refreshError);
      }
      
      // Dernier recours: getFormulasForField
      try {
        console.log(`[API] PUT - Dernier recours: getFormulasForField`);
        const allFormulas = mockFormulas.getFormulasForField(fieldId as string);
        
        if (Array.isArray(allFormulas) && allFormulas.length > 0) {
          console.log(`[API] PUT - getFormulasForField a trouvé ${allFormulas.length} formules`);
          return res.json(allFormulas);
        }
      } catch (getError) {
        console.error('[API] PUT - Erreur avec getFormulasForField:', getError);
      }
      
      console.error(`[API] PUT - ÉCHEC CRITIQUE: Toutes les tentatives de récupération ont échoué`);
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
