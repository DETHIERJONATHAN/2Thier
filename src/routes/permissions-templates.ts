import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware, impersonationMiddleware);

// CRUD PermissionTemplate
router.get('/templates', async (req: Request, res: Response): Promise<void> => {
  const templates = await prisma.permissionTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(templates);
});

router.get('/templates/:id', async (req: Request, res: Response): Promise<void> => {
  const template = await prisma.permissionTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Template non trouvé' });
  res.json(template);
});

router.post('/templates', async (req: Request, res: Response): Promise<void> => {
  const { name, description, permissions } = req.body;
  const tpl = await prisma.permissionTemplate.create({
    data: { name, description, permissions }
  });
  res.json(tpl);
});

router.put('/templates/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, description, permissions } = req.body;
  const tpl = await prisma.permissionTemplate.update({
    where: { id: req.params.id },
    data: { name, description, permissions }
  });
  res.json(tpl);
});

router.delete('/templates/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.permissionTemplate.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Appliquer un template à un rôle
router.post('/templates/:id/apply', async (req: Request, res: Response): Promise<void> => {
  const { roleId } = req.body;
  const template = await prisma.permissionTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Template non trouvé' });
  const permissions = Array.isArray(template.permissions) ? template.permissions : [];
  // Supprime les permissions existantes du rôle
  await prisma.permission.deleteMany({ where: { roleId } });
  // Ajoute les permissions du template
  for (const p of permissions) {
    await prisma.permission.create({
      data: { ...p, roleId }
    });
  }
  res.json({ success: true });
});

// Audit des modifications de permissions
router.get('/audit', async (req: Request, res: Response): Promise<void> => {
  const logs = await prisma.permissionAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(logs);
});

export default router;
