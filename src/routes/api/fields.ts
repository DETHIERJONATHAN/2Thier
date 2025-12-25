import express from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import formulasRouter from './formulas.js';
import { db } from '../../lib/database';

const router = express.Router();
const prisma = db;

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware as any);

// Vérifier l'existence des formules pour debug
router.get('/debug/check-formulas', async (_req, res) => {
  try {
    const formulas = await prisma.fieldFormula.findMany();
    console.log(`[DEBUG] Nombre total de formules: ${formulas.length}`);
    
    res.json({
      count: formulas.length,
      formulas: formulas.map(f => ({
        id: f.id,
        fieldId: f.fieldId,
        name: f.name
      }))
    });
  } catch (error) {
    console.error('[DEBUG] Erreur lors de la vérification des formules:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification des formules' });
  }
});

// Créer une formule de test pour vérifier la création et la persistance
router.get('/create-test-formula', async (_req, res) => {
  try {
    // Utiliser directement l'ID d'un champ connu
    const fieldId = "431fa081-7e9e-47df-8231-6e0d75b6da3d"; // ID du premier champ récupéré précédemment
    
    console.log(`[DEBUG] Création de formule pour le champ avec ID:`, fieldId);
    
    const testFormula = await prisma.fieldFormula.create({
      data: {
        id: `test-formula-${Date.now()}`,
        fieldId: fieldId,
        name: `Formule de test ${new Date().toLocaleString('fr')}`,
        sequence: JSON.stringify([{ type: "test", value: "Valeur de test" }]),
        order: 0
      }
    });
    
    console.log(`[DEBUG] Formule de test créée:`, testFormula);
    
    // Vérifier que la formule a bien été créée
    const allFormulas = await prisma.fieldFormula.findMany();
    
    res.json({
      success: true,
      formula: {
        id: testFormula.id,
        fieldId: testFormula.fieldId,
        name: testFormula.name
      },
      totalFormulas: allFormulas.length
    });
  } catch (error) {
    console.error('[DEBUG] Erreur lors de la création de la formule de test:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la formule de test', details: String(error) });
  }
});

// Monter les sous-routeurs en utilisant :id pour la cohérence
router.use('/:id/formulas', formulasRouter);

export default router;
