import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import rolesRouter from './roles.js';
import modulesRouter from './modules.js';
import servicesRouter from './services.js'; // Ajouter la nouvelle route de service

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);
router.use('/modules', modulesRouter);
router.use('/services', servicesRouter); // Monter la nouvelle route

export default router;
