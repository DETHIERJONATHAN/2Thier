import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../middlewares/requireRole';
import { isSuperAdmin } from "../utils/roles";

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware, impersonationMiddleware);

// GET all technical data
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`[TechnicalData] GET / request received. Query:`, req.query);
  try {
    const user = req.user;
    const { organizationId } = req.query;
    console.log(`[TechnicalData] User:`, user);
    if (!user) {
      console.error('[TechnicalData] Unauthorized access: no user.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isSuperAdmin(user.role)) {
      console.log(`[TechnicalData] User is Super Admin.`);
      if (!organizationId) {
        console.log(`[TechnicalData] Super Admin, but no organizationId provided. Returning empty array.`);
        return res.json([]);
      }
      console.log(`[TechnicalData] Super Admin fetching data for org:`, organizationId);
      const technicalData = await prisma.technicalData.findMany({
        where: {
          OR: [
            { organizationId: organizationId as string },
            { organizationId: null } 
          ]
        },
        include: { Organization: true },
        orderBy: { createdAt: 'desc' },
      });
      console.log(`[TechnicalData] Data found for Super Admin:`, technicalData);
      res.json(technicalData);
    } else {
      console.log(`[TechnicalData] User is not Super Admin.`);
      if (!user.organizationId) {
          console.error('[TechnicalData] User is not associated with an organization.');
          return res.status(400).json({ error: 'User is not associated with an organization' });
      }
      
      console.log(`[TechnicalData] Fetching data for user's org:`, user.organizationId);
      const technicalData = await prisma.technicalData.findMany({
        where: {
          OR: [
            { organizationId: user.organizationId },
            { organizationId: null } // Global data
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: { Organization: true },
      });
      console.log(`[TechnicalData] Data found for standard user:`, technicalData);
      res.json(technicalData);
    }
  } catch (error: any) {
    console.error('[TechnicalData] Error in GET /:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST a new technical data entry
router.post('/', [authMiddleware, requireRole(['admin', 'super_admin'])], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, label, value, data, organizationId } = req.body;
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let orgId: string | null = user.organizationId || null;

    if (isSuperAdmin(user.role)) {
        orgId = organizationId || null;
    } else if (!orgId) {
        return res.status(403).json({ error: 'Admin must belong to an organization to create data.' });
    }


    const newTechnicalData = await prisma.technicalData.create({
      data: {
        type,
        label,
        value,
        data,
        organizationId: orgId,
      },
    });
    res.status(201).json(newTechnicalData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT to update a technical data entry
router.put('/:id', [authMiddleware, requireRole(['admin', 'super_admin'])], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, label, value, data, organizationId } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existingData = await prisma.technicalData.findUnique({ where: { id } });
    if (!existingData) {
      return res.status(404).json({ error: 'Data not found' });
    }

    if (!isSuperAdmin(user.role) && existingData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    let orgId: string | null = existingData.organizationId;
    if (isSuperAdmin(user.role)) {
      orgId = organizationId !== undefined ? organizationId : existingData.organizationId;
    }

    const updatedTechnicalData = await prisma.technicalData.update({
      where: { id },
      data: { type, label, value, data, organizationId: orgId },
    });
    res.json(updatedTechnicalData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a technical data entry
router.delete('/:id', [authMiddleware, requireRole(['admin', 'super_admin'])], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existingData = await prisma.technicalData.findUnique({ where: { id } });
    if (!existingData) {
      return res.status(404).json({ error: 'Data not found' });
    }

    if (!isSuperAdmin(user.role) && existingData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.technicalData.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Special route to get technical data for a specific lead
router.get('/by-lead/:leadId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // First, get the lead to check for organization belonging
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { organizationId: true }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Security check: user must be super_admin or belong to the same organization as the lead
    if (!isSuperAdmin(user.role) && lead.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const technicalData = await prisma.technicalData.findMany({
      where: {
        leadId: leadId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(technicalData);
  } catch (error) {
    console.error("Failed to get technical data for lead:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
