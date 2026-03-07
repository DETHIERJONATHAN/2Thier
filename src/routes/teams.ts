import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ═══ Helpers ═══
function getOrgId(req: any): string | null {
  return (req.headers['x-organization-id'] as string) || null;
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}
function endOfWeek(): Date {
  const s = startOfWeek();
  const end = new Date(s);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Common select for Technician in includes
const techSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  type: true,
  company: true,
  specialties: true,
  color: true,
  isActive: true,
  hourlyRate: true,
  notes: true,
  userId: true,
};

// ═══════════════════════════════════════════════════
// ═══ TECHNICIENS (CRUD) ══════════════════════════
// ═══════════════════════════════════════════════════

const createTechnicianSchema = z.object({
  type: z.enum(['INTERNAL', 'SUBCONTRACTOR']).default('INTERNAL'),
  userId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  hourlyRate: z.number().optional(),
  notes: z.string().optional(),
  color: z.string().default('#1677ff'),
});

const updateTechnicianSchema = createTechnicianSchema.partial();

// ── GET /api/teams/technicians ── Liste enrichie avec charge/semaine, dispo, spécialités
router.get('/technicians', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });

    const weekStart = startOfWeek();
    const weekEnd = endOfWeek();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const techs = await db.technician.findMany({
      where: { organizationId, isActive: true },
      include: {
        TeamMemberships: {
          include: {
            Team: { select: { id: true, name: true, color: true } },
          },
        },
        ChantierAssignments: {
          include: {
            Chantier: {
              select: {
                id: true,
                plannedDate: true,
                completedDate: true,
                statusId: true,
                productValue: true,
                clientName: true,
                customLabel: true,
                ChantierStatus: { select: { name: true, order: true } },
              },
            },
          },
        },
        Unavailabilities: {
          where: {
            startDate: { lte: weekEnd },
            endDate: { gte: weekStart },
          },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: [{ type: 'asc' }, { firstName: 'asc' }],
    });

    const enriched = techs.map(tech => {
      // Charge cette semaine : chantiers avec plannedDate cette semaine OU actifs (order 2-5)
      const weekChantiers = tech.ChantierAssignments.filter(a => {
        const ch = a.Chantier;
        if (!ch) return false;
        if (ch.plannedDate) {
          const pd = new Date(ch.plannedDate);
          if (pd >= weekStart && pd <= weekEnd) return true;
        }
        const order = ch.ChantierStatus?.order;
        if (order !== undefined && order >= 2 && order <= 5) return true;
        return false;
      });

      const busyToday = tech.ChantierAssignments.some(a => {
        const ch = a.Chantier;
        if (!ch?.plannedDate) return false;
        const pd = new Date(ch.plannedDate);
        return pd >= today && pd <= todayEnd;
      });

      const unavailableToday = tech.Unavailabilities.some(u => {
        return new Date(u.startDate) <= todayEnd && new Date(u.endDate) >= today;
      });

      const weekUnavailabilities = tech.Unavailabilities.map(u => ({
        id: u.id,
        startDate: u.startDate,
        endDate: u.endDate,
        type: u.type,
        allDay: u.allDay,
        note: u.note,
      }));

      return {
        id: tech.id,
        userId: tech.userId,
        type: tech.type,
        firstName: tech.firstName,
        lastName: tech.lastName,
        email: tech.email,
        phone: tech.phone,
        company: tech.company,
        specialties: tech.specialties,
        hourlyRate: tech.hourlyRate,
        notes: tech.notes,
        color: tech.color,
        isActive: tech.isActive,
        weekChantierCount: weekChantiers.length,
        totalChantierCount: tech.ChantierAssignments.length,
        busyToday,
        unavailableToday,
        weekUnavailabilities,
        teams: tech.TeamMemberships.map(tm => ({
          teamId: tm.Team.id,
          teamName: tm.Team.name,
          teamColor: tm.Team.color,
          memberRole: tm.role,
        })),
        weekChantiers: weekChantiers.map(a => ({
          chantierId: a.Chantier.id,
          plannedDate: a.Chantier.plannedDate,
          clientName: a.Chantier.clientName,
          product: a.Chantier.productValue,
          status: a.Chantier.ChantierStatus?.name,
          role: a.role,
        })),
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error('[Teams] Erreur liste techniciens:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/technicians ── Créer un technicien
router.post('/technicians', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });

    const parsed = createTechnicianSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const data = parsed.data;

    if (data.type === 'INTERNAL' && data.userId) {
      const uo = await db.userOrganization.findFirst({
        where: { userId: data.userId, organizationId, status: 'ACTIVE' },
      });
      if (!uo) return res.status(400).json({ success: false, message: 'Utilisateur non trouvé dans l\'organisation' });

      const existing = await db.technician.findFirst({ where: { organizationId, userId: data.userId } });
      if (existing) return res.status(409).json({ success: false, message: 'Cet utilisateur est déjà enregistré comme technicien' });
    }

    const tech = await db.technician.create({
      data: {
        organizationId,
        userId: data.type === 'INTERNAL' ? data.userId || null : null,
        type: data.type,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        specialties: data.specialties,
        hourlyRate: data.hourlyRate || null,
        notes: data.notes || null,
        color: data.color,
      },
    });

    return res.status(201).json({ success: true, data: tech });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Un technicien avec ces informations existe déjà' });
    console.error('[Teams] Erreur création technicien:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/technicians/:id ──
router.put('/technicians/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const parsed = updateTechnicianSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const tech = await db.technician.update({
      where: { id: req.params.id, organizationId },
      data: parsed.data,
    });

    return res.json({ success: true, data: tech });
  } catch (error: any) {
    console.error('[Teams] Erreur modif technicien:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/technicians/:id ── Soft delete
router.delete('/technicians/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    await db.technician.update({ where: { id: req.params.id, organizationId }, data: { isActive: false } });
    return res.json({ success: true, message: 'Technicien désactivé' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression technicien:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/technicians/sync ── Importer les users internes comme techniciens
router.post('/technicians/sync', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });

    const userOrgs = await db.userOrganization.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: { User: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } } },
    });

    const existingTechs = await db.technician.findMany({
      where: { organizationId, type: 'INTERNAL' },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingTechs.map(t => t.userId).filter(Boolean));

    const newTechs = [];
    for (const uo of userOrgs) {
      if (existingUserIds.has(uo.userId)) continue;
      const user = uo.User;
      const tech = await db.technician.create({
        data: {
          organizationId,
          userId: user.id,
          type: 'INTERNAL',
          firstName: user.firstName || 'Utilisateur',
          lastName: user.lastName || '',
          email: user.email,
          phone: user.phoneNumber || null,
        },
      });
      newTechs.push(tech);
    }

    return res.json({
      success: true,
      message: `${newTechs.length} technicien(s) synchronisé(s)`,
      data: { created: newTechs.length, total: userOrgs.length },
    });
  } catch (error: any) {
    console.error('[Teams] Erreur sync techniciens:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/teams/technicians/org-users ── Users pas encore techniciens
router.get('/technicians/org-users', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });

    const existingTechs = await db.technician.findMany({
      where: { organizationId, type: 'INTERNAL', userId: { not: null } },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingTechs.map(t => t.userId));

    const userOrgs = await db.userOrganization.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        Role: { select: { name: true, label: true } },
      },
    });

    const available = userOrgs
      .filter(uo => !existingUserIds.has(uo.userId))
      .map(uo => ({ ...uo.User, orgRole: uo.Role }));

    return res.json({ success: true, data: available });
  } catch (error: any) {
    console.error('[Teams] Erreur org-users:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ INDISPONIBILITÉS ════════════════════════════
// ═══════════════════════════════════════════════════

const unavailabilitySchema = z.object({
  technicianId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  type: z.enum(['CONGE', 'FORMATION', 'MALADIE', 'AUTRE']).default('AUTRE'),
  allDay: z.boolean().default(true),
  note: z.string().optional(),
});

// ── GET /api/teams/unavailabilities ──
router.get('/unavailabilities', authenticateToken, async (req, res) => {
  try {
    const { technicianId, startDate, endDate } = req.query;
    const where: any = {};
    if (technicianId) where.technicianId = technicianId;
    if (startDate && endDate) {
      where.startDate = { lte: new Date(endDate as string) };
      where.endDate = { gte: new Date(startDate as string) };
    }

    const items = await db.technicianUnavailability.findMany({
      where,
      include: { Technician: { select: { id: true, firstName: true, lastName: true, color: true } } },
      orderBy: { startDate: 'asc' },
    });

    return res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('[Teams] Erreur unavailabilities:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/unavailabilities ──
router.post('/unavailabilities', authenticateToken, async (req, res) => {
  try {
    const parsed = unavailabilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const item = await db.technicianUnavailability.create({
      data: {
        technicianId: parsed.data.technicianId,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        type: parsed.data.type,
        allDay: parsed.data.allDay,
        note: parsed.data.note || null,
      },
      include: { Technician: { select: techSelect } },
    });

    return res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    console.error('[Teams] Erreur création unavailability:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/unavailabilities/:id ──
router.delete('/unavailabilities/:id', authenticateToken, async (req, res) => {
  try {
    await db.technicianUnavailability.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Indisponibilité supprimée' });
  } catch (error: any) {
    console.error('[Teams] Erreur delete unavailability:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ ÉQUIPES (Teams) ══════════════════════════════
// ═══════════════════════════════════════════════════

const createTeamSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  color: z.string().default('#1677ff'),
  description: z.string().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

// ── GET /api/teams ──
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });

    const teams = await db.team.findMany({
      where: { organizationId },
      include: {
        Members: {
          include: { Technician: { select: techSelect } },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { ChantierAssignments: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: teams });
  } catch (error: any) {
    console.error('[Teams] Erreur liste:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams ──
router.post('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });

    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const team = await db.team.create({
      data: { organizationId, name: parsed.data.name, color: parsed.data.color || '#1677ff', description: parsed.data.description },
      include: { Members: { include: { Technician: { select: techSelect } } } },
    });

    return res.status(201).json({ success: true, data: team });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Une équipe avec ce nom existe déjà' });
    console.error('[Teams] Erreur création:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/:id ──
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const parsed = updateTeamSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const team = await db.team.update({
      where: { id: req.params.id, organizationId },
      data: parsed.data,
      include: { Members: { include: { Technician: { select: techSelect } } } },
    });

    return res.json({ success: true, data: team });
  } catch (error: any) {
    console.error('[Teams] Erreur modification:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/:id ──
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    await db.team.delete({ where: { id: req.params.id, organizationId } });
    return res.json({ success: true, message: 'Équipe supprimée' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ MEMBRES D'ÉQUIPE ════════════════════════════
// ═══════════════════════════════════════════════════

const teamMemberSchema = z.object({
  technicianId: z.string().min(1),
  role: z.enum(['LEADER', 'MEMBER']).default('MEMBER'),
});

// ── POST /api/teams/:teamId/members ──
router.post('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { teamId } = req.params;
    const parsed = teamMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const team = await db.team.findFirst({ where: { id: teamId, organizationId } });
    if (!team) return res.status(404).json({ success: false, message: 'Équipe non trouvée' });

    const member = await db.teamMember.create({
      data: { teamId, technicianId: parsed.data.technicianId, role: parsed.data.role },
      include: { Technician: { select: techSelect } },
    });

    return res.status(201).json({ success: true, data: member });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Ce technicien est déjà dans l\'équipe' });
    console.error('[Teams] Erreur ajout membre:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/:teamId/members/:memberId ──
router.put('/:teamId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['LEADER', 'MEMBER'].includes(role)) return res.status(400).json({ success: false, message: 'Rôle invalide' });

    const member = await db.teamMember.update({
      where: { id: req.params.memberId },
      data: { role },
      include: { Technician: { select: techSelect } },
    });

    return res.json({ success: true, data: member });
  } catch (error: any) {
    console.error('[Teams] Erreur modif membre:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/:teamId/members/:memberId ──
router.delete('/:teamId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    await db.teamMember.delete({ where: { id: req.params.memberId } });
    return res.json({ success: true, message: 'Membre retiré' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression membre:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ ASSIGNATIONS CHANTIER ═══════════════════════
// ═══════════════════════════════════════════════════

const assignmentSchema = z.object({
  technicianId: z.string().min(1),
  role: z.enum(['CHEF_EQUIPE', 'TECHNICIEN']).default('TECHNICIEN'),
  teamId: z.string().optional(),
});

// ── GET /api/teams/assignments/by-chantier/:chantierId ──
router.get('/assignments/by-chantier/:chantierId', authenticateToken, async (req, res) => {
  try {
    const assignments = await db.chantierAssignment.findMany({
      where: { chantierId: req.params.chantierId },
      include: {
        Technician: { select: techSelect },
        Team: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ role: 'asc' }, { assignedAt: 'asc' }],
    });
    return res.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error('[Teams] Erreur assignments:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/assignments/:chantierId ── Assigner un technicien
router.post('/assignments/:chantierId', authenticateToken, async (req, res) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.flatten() });

    const assignment = await db.chantierAssignment.create({
      data: {
        chantierId: req.params.chantierId,
        technicianId: parsed.data.technicianId,
        role: parsed.data.role,
        teamId: parsed.data.teamId || null,
      },
      include: {
        Technician: { select: techSelect },
        Team: { select: { id: true, name: true, color: true } },
      },
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Ce technicien est déjà assigné à ce chantier' });
    console.error('[Teams] Erreur assignation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/assignments/:chantierId/team ── Assigner toute une équipe
router.post('/assignments/:chantierId/team', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ success: false, message: 'teamId requis' });

    const members = await db.teamMember.findMany({
      where: { teamId },
      include: { Technician: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (members.length === 0) return res.status(400).json({ success: false, message: 'L\'équipe n\'a aucun membre' });

    const results = [];
    for (const member of members) {
      try {
        const assignment = await db.chantierAssignment.upsert({
          where: { chantierId_technicianId: { chantierId: req.params.chantierId, technicianId: member.technicianId } },
          update: { teamId, role: member.role === 'LEADER' ? 'CHEF_EQUIPE' : 'TECHNICIEN' },
          create: {
            chantierId: req.params.chantierId,
            technicianId: member.technicianId,
            teamId,
            role: member.role === 'LEADER' ? 'CHEF_EQUIPE' : 'TECHNICIEN',
          },
          include: {
            Technician: { select: techSelect },
            Team: { select: { id: true, name: true, color: true } },
          },
        });
        results.push(assignment);
      } catch { /* skip constraint errors */ }
    }

    return res.status(201).json({
      success: true,
      data: results,
      message: `${results.length} technicien(s) assigné(s) depuis l'équipe`,
    });
  } catch (error: any) {
    console.error('[Teams] Erreur assignation équipe:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/assignments/:assignmentId ──
router.delete('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    await db.chantierAssignment.delete({ where: { id: req.params.assignmentId } });
    return res.json({ success: true, message: 'Assignation supprimée' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression assignation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
