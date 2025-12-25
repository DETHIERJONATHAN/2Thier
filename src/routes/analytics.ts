import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { db } from '../lib/database';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = db;

// 🔒 TYPES ANALYTICS
interface DateFilter {
  gte?: Date;
  lte?: Date;
}

interface WhereClause {
  organizationId?: string;
  userId?: string;
  action?: { contains: string };
}

interface ExportData {
  [key: string]: string | number | Date | null;
}

// 🚀 RATE LIMITING ANALYTICS
const analyticsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute
  message: { success: false, message: 'Trop de requêtes analytics' }
});

router.use(authMiddleware);
router.use(analyticsRateLimit);

// 📊 GET /api/analytics/dashboard - Métriques tableau de bord
router.get('/dashboard', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ANALYTICS] 📊 Génération métriques dashboard');
  
  try {
    const requestingUser = req.user;
    const { startDate, endDate } = req.query;
    
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) })
    };

    let metrics;
    
    if (requestingUser?.role === 'super_admin') {
      // 👑 SUPER ADMIN : Métriques globales
      const [totalUsers, totalOrganizations, activeModules, totalLeads] = await Promise.all([
        prisma.user.count({ where: { createdAt: dateFilter } }),
        prisma.organization.count({ where: { createdAt: dateFilter } }),
        prisma.organizationModuleStatus.count({ where: { active: true } }),
        prisma.lead?.count({ where: { createdAt: dateFilter } }) || 0
      ]);

      metrics = {
        totalUsers,
        totalOrganizations,
        activeModules,
        totalLeads,
        growth: {
          users: await calculateGrowth('user', dateFilter),
          organizations: await calculateGrowth('organization', dateFilter)
        }
      };
    } else {
      // 🏢 ORGANISATION : Métriques locales
      const orgId = requestingUser.organizationId;
      const [orgUsers, orgModules, orgLeads] = await Promise.all([
        prisma.userOrganization.count({ 
          where: { organizationId: orgId, createdAt: dateFilter } 
        }),
        prisma.organizationModuleStatus.count({ 
          where: { organizationId: orgId, active: true } 
        }),
        prisma.lead?.count({ 
          where: { organizationId: orgId, createdAt: dateFilter } 
        }) || 0
      ]);

      metrics = {
        users: orgUsers,
        activeModules: orgModules,
        leads: orgLeads,
        conversion: await calculateConversionRate(orgId, dateFilter)
      };
    }

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('[ANALYTICS] Erreur métriques dashboard:', error);
    res.status(500).json({ success: false, message: 'Erreur génération métriques' });
  }
});

// 📈 GET /api/analytics/export - Export données CSV/Excel
router.get('/export', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ANALYTICS] 📈 Export données');
  
  try {
    const { format = 'csv', type = 'users' } = req.query;
    const requestingUser = req.user;
    
    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await exportUsers(requestingUser);
        filename = `users_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      case 'organizations':
        if (requestingUser?.role !== 'super_admin') {
          return res.status(403).json({ success: false, message: 'Super admin requis' });
        }
        data = await exportOrganizations();
        filename = `organizations_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Type export invalide' });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(convertToCSV(data));
    } else {
      res.json({ success: true, data, filename });
    }
  } catch (error) {
    console.error('[ANALYTICS] Erreur export:', error);
    res.status(500).json({ success: false, message: 'Erreur export données' });
  }
});

// 📋 GET /api/analytics/audit-trail - Journal d'audit
router.get('/audit-trail', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ANALYTICS] 📋 Récupération audit trail');
  
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const requestingUser = req.user;
    
    const whereClause: WhereClause = {};
    
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId) {
      // Non-super admin : seulement son organisation
      whereClause.organizationId = requestingUser.organizationId;
    }
    
    if (userId) whereClause.userId = userId as string;
    if (action) whereClause.action = { contains: action as string };

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog?.findMany({
        where: whereClause,
        include: {
          User: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }) || [],
      prisma.auditLog?.count({ where: whereClause }) || 0
    ]);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Erreur audit trail:', error);
    res.status(500).json({ success: false, message: 'Erreur récupération audit' });
  }
});

// 🔧 UTILITAIRES ANALYTICS
async function calculateGrowth(model: string, dateFilter: DateFilter) {
  try {
    const currentPeriod = await (model === 'user' ? prisma.user : prisma.organization).count({
      where: { createdAt: dateFilter }
    });
    
    const previousPeriod = await (model === 'user' ? prisma.user : prisma.organization).count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 jours avant
          lte: dateFilter.gte
        }
      }
    });

    return previousPeriod > 0 ? 
      Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100) : 
      0;
  } catch {
    return 0;
  }
}

async function calculateConversionRate(organizationId: string, dateFilter: DateFilter) {
  try {
    const [totalLeads, convertedLeads] = await Promise.all([
      prisma.lead?.count({
        where: { organizationId, createdAt: dateFilter }
      }) || 0,
      prisma.lead?.count({
        where: { 
          organizationId, 
          status: 'converted',
          createdAt: dateFilter 
        }
      }) || 0
    ]);

    return totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  } catch {
    return 0;
  }
}

async function exportUsers(requestingUser: { role?: string; organizationId?: string }) {
  const whereClause = requestingUser?.role === 'super_admin' 
    ? {} 
    : { organizationId: requestingUser.organizationId };

  return prisma.user.findMany({
    where: whereClause,
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
      UserOrganization: {
        select: {
          Organization: { select: { name: true } }
        }
      }
    }
  });
}

async function exportOrganizations() {
  return prisma.organization.findMany({
    select: {
      name: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          UserOrganization: true,
          OrganizationModuleStatus: { where: { active: true } }
        }
      }
    }
  });
}

function convertToCSV(data: ExportData[]): string {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value}"` : value
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

export default router;
