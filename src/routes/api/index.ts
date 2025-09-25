import express from 'express';
import fieldsRouter from './fields.js';
import formulasRouter from './formulas.js';

const router = express.Router();

// Monter les routeurs d'API
router.use('/fields', fieldsRouter);
router.use('/formulas', formulasRouter);

export default router;
