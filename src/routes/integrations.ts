import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware, impersonationMiddleware);

// Helper to get the effective organization ID from the request
const getEffectiveOrgId = (req: Request): string | undefined => {
  const headerOrgId = req.headers['x-organization-id'];
  if (typeof headerOrgId === 'string' && headerOrgId !== 'all') {
    return headerOrgId;
  }
  // Fallback for non-super-admins or when no header is present
  const user = (req as AuthenticatedRequest).user;
  return user?.organizationId;
};

// GET all integrations for the selected organization
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  
  if (!organizationId) {
    // Return empty array if no specific organization is selected (e.g., "All organizations" view)
    res.json({ success: true, data: [] });
    return;
  }

  try {
    const integrationsSettings = await prisma.integrationsSettings.findMany({
      where: { organizationId: organizationId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, data: integrationsSettings });
  } catch (error) {
    console.error('Failed to get integrations:', error);
    res.status(500).json({ success: false, message: 'Failed to get integrations' });
  }
});

// POST to create or update an integration
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);
  const { type, config, enabled } = req.body;

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required to create or update an integration.' });
    return;
  }

  if (!type) {
    res.status(400).json({ success: false, message: 'Integration type is required.' });
    return;
  }

  try {
    const upsertedIntegration = await prisma.integrationsSettings.upsert({
      where: {
        organizationId_type: {
          organizationId: organizationId,
          type: type,
        },
      },
      update: {
        config,
        enabled,
        userId: user.id,
      },
      create: {
        type,
        config,
        enabled,
        organizationId: organizationId,
        userId: user.id,
      },
    });

    res.status(201).json({ success: true, data: upsertedIntegration });
  } catch (error) {
    console.error('Failed to upsert integration:', error);
    res.status(500).json({ success: false, message: 'Failed to upsert integration' });
  }
});

// DELETE to remove an integration by type
router.delete('/:type', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);
  const { type } = req.params;

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization context is missing.' });
    return;
  }

  try {
    await prisma.integrationsSettings.delete({
      where: {
        organizationId_type: {
          organizationId: organizationId,
          type: type,
        },
      },
    });

    res.status(200).json({ success: true, message: 'Integration deleted successfully.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }
    console.error('Failed to delete integration:', error);
    res.status(500).json({ success: false, message: 'Failed to delete integration' });
  }
});

export default router;
