import express from 'express';
import { db } from '../../lib/database';
import type { Request, Response } from 'express';
import * as mockFormulas from '../../global-mock-formulas.js';
import { evaluateFormula } from '../../utils/formulaEvaluator';

// Interface pour les requêtes avec paramètres fusionnés
interface MergedParamsRequest extends Request {
  params: {
    formulaId?: string;
    id?: string; // Le paramètre de la route parente /:id/formulas
    fieldId?: string;
  }
}

const router = express.Router({ mergeParams: true }); // Activer mergeParams pour accéder aux paramètres de route parent
const prisma = db;

// Déterminer si on utilise le mode développement avec mock (utilisé seulement dans le bloc catch)
// const useMockMode = process.env.NODE_ENV === 'development';

/**
 * Récupérer toutes les formules de tous les champs
 */
router.get('/all', async (_req, res) => {
  try {
    const formulas = await prisma.fieldFormula.findMany({
      include: {
        Field: {
          select: {
            id: true,
            label: true
          }
        }
      }
    });
    
    // Transformer les données pour le format attendu par le frontend
    const formattedFormulas = formulas.map(formula => ({
      id: formula.id,
      name: formula.name || formula.title || 'Formule sans nom', // Utiliser title si name est null
      fieldId: formula.fieldId,
      fieldLabel: formula.Field?.label || 'Champ inconnu'
    }));
    
    res.json(formattedFormulas);
  } catch (error) {
    console.error('Erreur lors de la récupération des formules:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des formules' });
  }
});

/**
 * Récupérer toutes les formules d'un champ spécifique
 */
router.get('/field/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const formulas = await prisma.fieldFormula.findMany({
      where: {
        fieldId
      },
      include: {
        Field: {
          select: {
            id: true,
            label: true
          }
        }
      }
    });
    
    // Transformer les données pour le format attendu par le frontend
    const formattedFormulas = formulas
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(formula => {
        let parsed: unknown = [];
        try {
          const raw = (formula as unknown as { sequence?: unknown }).sequence as unknown;
          if (typeof raw === 'string') parsed = JSON.parse(raw as string);
          else if (Array.isArray(raw) || (raw && typeof raw === 'object')) parsed = raw as object;
          else parsed = [];
        } catch {
          parsed = [];
        }
        const title = (formula as unknown as { title?: string }).title;
        const description = (formula as unknown as { description?: string }).description;
        return {
          id: formula.id,
          name: formula.name || title || 'Formule sans nom',
          title: formula.name || title || 'Formule',
          description: description ?? null,
          order: formula.order ?? 0,
          fieldId: formula.fieldId,
          fieldLabel: formula.Field?.label || 'Champ inconnu',
          sequence: parsed,
        };
      });
    
    res.json(formattedFormulas);
  } catch (error) {
    console.error(`Erreur lors de la récupération des formules pour le champ ${req.params.fieldId}:`, error);
    res.status(500).json({ error: `Erreur lors de la récupération des formules pour le champ ${req.params.fieldId}` });
  }
});

/**
 * Debug d'une formule: retourne séquence + trace d'évaluation sur un jeu de valeurs fourni.
 * GET /api/formulas/:formulaId/debug?values={"FIELD1":10,...}
 */
router.get('/:formulaId/debug', async (req: MergedParamsRequest, res: Response) => {
  const { formulaId } = req.params;
  try {
    if (!formulaId) return res.status(400).json({ error: 'formulaId manquant' });
    const f = await prisma.fieldFormula.findUnique({ where: { id: formulaId } });
    if (!f) return res.status(404).json({ error: 'Formule non trouvée' });
    let seq: unknown = [];
    try { seq = typeof f.sequence === 'string' ? JSON.parse(f.sequence as string) : (f.sequence as unknown); } catch { /* ignore */ }
    // Parser param values
    let testValues: Record<string, number> = {};
    if (req.query.values) {
      try { testValues = JSON.parse(String(req.query.values)); } catch { /* ignore */ }
    }
    const result = evaluateFormula({ id: f.id, name: f.name || f.id, sequence: Array.isArray(seq)?seq:[], targetProperty: '' }, testValues, { rawValues: testValues });
    return res.json({ id: f.id, name: f.name, fieldId: f.fieldId, sequence: seq, evaluation: result });
  } catch (e) {
    console.error('[API][FormulaDebug] Erreur', e);
    return res.status(500).json({ error: 'Erreur debug formule', details: (e as Error).message });
  }
});

/**
 * Mettre à jour une formule spécifique
 * Cette route gère les requêtes PUT à /api/fields/:id/formulas/:formulaId
 */
router.put('/:formulaId', async (req: MergedParamsRequest, res: Response) => {
  try {
    const { formulaId } = req.params;
    // Récupérer le fieldId depuis les paramètres de la route parent (grâce à mergeParams: true)
    const fieldId = req.params.id;
    const { name, sequence, order, id } = req.body;

    console.log(`[API] Mise à jour formule ${formulaId} pour champ ${fieldId}`);
    console.log(`[API] Données reçues:`, { id, name, sequence, order });

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
      console.error(`[API] Erreur lors de la création de la formule:`, createError);
    }

  const dataToUpdate: Record<string, unknown> = {};

    if (name !== undefined) {
      dataToUpdate.name = name;
    }
    if (sequence !== undefined) {
      // S'assurer que la séquence est bien une chaîne JSON
      dataToUpdate.sequence = JSON.stringify(sequence);
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

  } catch (err: unknown) {
    const { formulaId } = req.params;
    const fieldId = req.params.id || '';
    console.error(`Erreur API PUT /api/fields/.../formulas/${formulaId}:`, err);
    
    // En mode développement, utiliser le système de mock pour simuler la persistance
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Mode développement, utilisation du système de mock pour la persistance');
      
      // Récupérer les données de la formule depuis le body de la requête
      const { sequence, name, order } = req.body;
      
      // Utiliser le système de mock pour mettre à jour ou créer la formule
  mockFormulas.updateFormula(fieldId, formulaId, {
        name,
        sequence,
        order
      });
      
      // Récupérer toutes les formules mockées pour ce champ
      const allFormulas = mockFormulas.getFormulasForField(fieldId);
      console.log(`[API] Formules mockées retournées: ${allFormulas.length}`);
      
      return res.json(allFormulas);
    }
    
    // En production, renvoyer les erreurs normales
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Formule non trouvée' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule', details: err.message });
    }
  }
});

/**
 * Supprimer une formule par son ID (top-level): DELETE /api/formulas/:formulaId
 * 1) Récupère la formule pour obtenir son fieldId
 * 2) Supprime la formule
 * 3) Renvoye la liste des formules restantes pour ce fieldId (triée)
 */
router.delete('/:formulaId', async (req: MergedParamsRequest, res: Response) => {
  const { formulaId } = req.params;
  try {
    if (!formulaId) {
      return res.status(400).json({ error: 'ID de formule manquant' });
    }

    // Trouver la formule pour récupérer le fieldId
    const existing = await prisma.fieldFormula.findUnique({ where: { id: formulaId } });
    if (!existing) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    const fieldId = existing.fieldId;

    // Supprimer la formule
    await prisma.fieldFormula.delete({ where: { id: formulaId } });

    // Renvoyer la liste mise à jour des formules du champ
    const formulas = await prisma.fieldFormula.findMany({
      where: { fieldId },
      orderBy: { order: 'asc' }
    });

    const processedFormulas = formulas.map(f => ({
      ...f,
      sequence: f.sequence ? JSON.parse(f.sequence as string) : []
    }));

    return res.status(200).json(processedFormulas);

  } catch (err: unknown) {
    console.error(`[API] Erreur lors de la suppression de la formule ${req.params.formulaId}:`, err);
    const e = err as { code?: string };
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la suppression de la formule.' });
  }
});

export default router;
