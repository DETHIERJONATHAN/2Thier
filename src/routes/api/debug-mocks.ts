/**
 * Route de debug pour vérifier l'état des mocks
 */
import express from 'express';
import * as mockFormulas from '../../global-mock-formulas.js';

const router = express.Router();

// Route pour vérifier l'état des mocks
router.get('/mock-status', (_req, res) => {
  try {
    const status = mockFormulas.getStoreState();
    
    // Obtenir les détails des formules pour chaque champ
    const detailedFormulas: Record<string, any[]> = {};
    status.fields.forEach(fieldId => {
      detailedFormulas[fieldId] = mockFormulas.getFormulasForField(fieldId);
    });
    
    res.json({
      ...status,
      detailedFormulas
    });
  } catch (error) {
    console.error('[DEBUG] Erreur lors de la récupération du statut des mocks:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut des mocks' });
  }
});

// Route pour créer une formule de test dans les mocks
router.get('/create-test-formula/:fieldId', (req, res) => {
  try {
    const { fieldId } = req.params;
    const formulaId = `test-formula-${Date.now()}`;
    
    const formula = mockFormulas.updateFormula(fieldId, formulaId, {
      name: `Formule de test ${new Date().toLocaleString('fr')}`,
      sequence: [{ type: 'test', value: 'Valeur de test' }],
      order: 0
    });
    
    res.json({
      success: true,
      formula,
      allFormulas: mockFormulas.getFormulasForField(fieldId)
    });
  } catch (error) {
    console.error('[DEBUG] Erreur lors de la création de la formule de test:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la formule de test' });
  }
});

export default router;
