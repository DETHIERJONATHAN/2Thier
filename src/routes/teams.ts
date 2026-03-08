import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

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

// ═══ Pointage photo helpers ═══
const POINTAGE_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'pointages');
if (!fs.existsSync(POINTAGE_UPLOADS_DIR)) {
  fs.mkdirSync(POINTAGE_UPLOADS_DIR, { recursive: true });
}

/** Save a base64 photo to disk, return relative URL */
function savePointagePhoto(base64Data: string, prefix: string): string {
  // Remove data:image/...;base64, prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const filepath = path.join(POINTAGE_UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/pointages/${filename}`;
}

/** Calculate distance in meters between two GPS points (Haversine) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Common select for Technician in includes
const techSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  type: true,
  billingMode: true,
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
  billingMode: z.enum(['FORFAIT', 'REGIE']).optional().nullable(),
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

// ═══════════════════════════════════════════════════
// ═══ POINTAGE / TIME ENTRIES ═════════════════════
// ═══════════════════════════════════════════════════

// ── GET /api/teams/time-entries ──
// Query: ?chantierId=xxx | ?technicianId=xxx | ?date=YYYY-MM-DD | ?startDate=&endDate=
router.get('/time-entries', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ error: 'Organization ID required' });
    const { chantierId, technicianId, date, startDate, endDate } = req.query;

    const where: any = { organizationId };
    if (chantierId) where.chantierId = chantierId;
    if (technicianId) where.technicianId = technicianId;
    if (date) {
      const d = new Date(date as string);
      where.date = d;
    } else if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }

    const entries = await db.timeEntry.findMany({
      where,
      include: {
        Technician: { select: { id: true, firstName: true, lastName: true, color: true, type: true, billingMode: true, company: true } },
        Chantier: { select: { id: true, clientName: true, productLabel: true, siteAddress: true } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    return res.json({ success: true, data: entries });
  } catch (error: any) {
    console.error('[Teams] Erreur liste pointages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/time-entries ──
router.post('/time-entries', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ error: 'Organization ID required' });
    const {
      technicianId, chantierId, date, startTime, endTime, breakMinutes, type, note,
      // Anti-fraud fields
      latitude, longitude, photo, deviceInfo,
    } = req.body;

    if (!technicianId || !date || !startTime) {
      return res.status(400).json({ success: false, message: 'technicianId, date et startTime requis' });
    }

    // Vérifier que le technicien est éligible au pointage (interne OU sous-traitant en régie)
    const tech = await db.technician.findFirst({ where: { id: technicianId, organizationId } });
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Technicien non trouvé' });
    }
    if (tech.type === 'SUBCONTRACTOR' && tech.billingMode !== 'REGIE') {
      return res.status(400).json({ success: false, message: 'Le pointage n\'est pas disponible pour les sous-traitants au forfait' });
    }

    // Calculer la durée
    let durationMinutes: number | null = null;
    if (endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      durationMinutes = Math.round((end - start) / 60000) - (breakMinutes || 0);
    }

    // 📸 Save clock-in photo if provided
    let clockInPhotoUrl: string | null = null;
    if (photo) {
      try {
        clockInPhotoUrl = savePointagePhoto(photo, 'in');
      } catch (e) {
        console.error('[Pointage] Erreur sauvegarde photo:', e);
      }
    }

    // 📍 Calculate distance from chantier if GPS provided
    let clockInDistance: number | null = null;
    if (latitude && longitude && chantierId) {
      const chantier = await db.chantier.findUnique({ where: { id: chantierId }, select: { latitude: true, longitude: true } });
      if (chantier?.latitude && chantier?.longitude) {
        clockInDistance = Math.round(haversineDistance(latitude, longitude, chantier.latitude, chantier.longitude));
      }
    }

    // 📱 Capture IP address
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

    // ⏱️ Calcul automatique de la durée de travail
    // Les types "fin de période" ferment un intervalle de travail ouvert par un type "début"
    const WORK_END_TYPES = ['FIN', 'DEPART_PAUSE', 'DEPART_MIDI', 'DEPART_DEPLACEMENT'];
    const WORK_START_TYPES = ['ARRIVEE', 'RETOUR_PAUSE', 'RETOUR_MIDI', 'RETOUR_DEPLACEMENT'];

    if (WORK_END_TYPES.includes(type) && !endTime) {
      // Chercher le dernier pointage "début" pour ce technicien ce jour-là (même chantier si fourni)
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const prevWhere: any = {
        organizationId,
        technicianId,
        date: { gte: dateStart, lte: dateEnd },
        type: { in: WORK_START_TYPES },
      };
      if (chantierId) prevWhere.chantierId = chantierId;

      const prevEntry = await db.timeEntry.findFirst({
        where: prevWhere,
        orderBy: { startTime: 'desc' },
      });

      if (prevEntry) {
        const start = new Date(prevEntry.startTime).getTime();
        const end = new Date(startTime).getTime();
        durationMinutes = Math.max(0, Math.round((end - start) / 60000));
      }
    }

    const entry = await db.timeEntry.create({
      data: {
        organizationId,
        technicianId,
        chantierId: chantierId || null,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        breakMinutes: breakMinutes || 0,
        type: type || 'CHANTIER',
        durationMinutes,
        note: note || null,
        // Anti-fraud data
        clockInLatitude: latitude || null,
        clockInLongitude: longitude || null,
        clockInPhotoUrl,
        clockInDistance,
        deviceInfo: deviceInfo || null,
        ipAddress,
      },
      include: {
        Technician: { select: { id: true, firstName: true, lastName: true, color: true, type: true } },
        Chantier: { select: { id: true, clientName: true, latitude: true, longitude: true, geoFenceRadius: true } },
      },
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    console.error('[Teams] Erreur création pointage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/teams/time-entries/summary ──
// Résumé des heures par technicien pour une période
// Query: ?startDate=&endDate= | ?technicianId=
router.get('/time-entries/summary', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ error: 'Organization ID required' });
    const { startDate, endDate, technicianId } = req.query;

    const where: any = { organizationId, endTime: { not: null } };
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }
    if (technicianId) where.technicianId = technicianId;

    const entries = await db.timeEntry.findMany({
      where,
      include: {
        Technician: { select: { id: true, firstName: true, lastName: true, type: true, billingMode: true, hourlyRate: true, color: true } },
      },
    });

    // Grouper par technicien
    const summaryMap = new Map<string, { technician: any; totalMinutes: number; totalEntries: number; byType: Record<string, number> }>();
    for (const e of entries) {
      const key = e.technicianId;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { technician: e.Technician, totalMinutes: 0, totalEntries: 0, byType: {} });
      }
      const s = summaryMap.get(key)!;
      s.totalMinutes += e.durationMinutes || 0;
      s.totalEntries += 1;
      s.byType[e.type] = (s.byType[e.type] || 0) + (e.durationMinutes || 0);
    }

    const summary = Array.from(summaryMap.values()).map(s => ({
      ...s,
      totalHours: Math.round(s.totalMinutes / 60 * 100) / 100,
      estimatedCost: s.technician.hourlyRate ? Math.round(s.totalMinutes / 60 * s.technician.hourlyRate * 100) / 100 : null,
    }));

    return res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('[Teams] Erreur résumé pointages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/time-entries/:id ──
router.put('/time-entries/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ error: 'Organization ID required' });
    const { startTime, endTime, breakMinutes, type, note } = req.body;

    const existing = await db.timeEntry.findFirst({ where: { id: req.params.id, organizationId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pointage non trouvé' });
    }

    // Recalculer la durée
    const effectiveStart = startTime ? new Date(startTime) : existing.startTime;
    const effectiveEnd = endTime ? new Date(endTime) : existing.endTime;
    const effectiveBreak = breakMinutes !== undefined ? breakMinutes : existing.breakMinutes;
    let durationMinutes: number | null = null;
    if (effectiveEnd) {
      durationMinutes = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000) - effectiveBreak;
    }

    const entry = await db.timeEntry.update({
      where: { id: req.params.id },
      data: {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(breakMinutes !== undefined && { breakMinutes }),
        ...(type && { type }),
        ...(note !== undefined && { note }),
        durationMinutes,
      },
      include: {
        Technician: { select: { id: true, firstName: true, lastName: true, color: true, type: true } },
        Chantier: { select: { id: true, clientName: true } },
      },
    });

    return res.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('[Teams] Erreur update pointage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/time-entries/:id/clock-out ── (Pointer la sortie)
router.put('/time-entries/:id/clock-out', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ error: 'Organization ID required' });

    const { latitude, longitude, photo, deviceInfo } = req.body || {};

    const existing = await db.timeEntry.findFirst({ where: { id: req.params.id, organizationId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pointage non trouvé' });
    }
    if (existing.endTime) {
      return res.status(400).json({ success: false, message: 'Déjà pointé' });
    }

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - existing.startTime.getTime()) / 60000) - existing.breakMinutes;

    // 📸 Save clock-out photo
    let clockOutPhotoUrl: string | null = null;
    if (photo) {
      try {
        clockOutPhotoUrl = savePointagePhoto(photo, 'out');
      } catch (e) {
        console.error('[Pointage] Erreur sauvegarde photo sortie:', e);
      }
    }

    // 📍 Calculate distance from chantier 
    let clockOutDistance: number | null = null;
    if (latitude && longitude && existing.chantierId) {
      const chantier = await db.chantier.findUnique({ where: { id: existing.chantierId }, select: { latitude: true, longitude: true } });
      if (chantier?.latitude && chantier?.longitude) {
        clockOutDistance = Math.round(haversineDistance(latitude, longitude, chantier.latitude, chantier.longitude));
      }
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

    const entry = await db.timeEntry.update({
      where: { id: req.params.id },
      data: {
        endTime,
        durationMinutes,
        clockOutLatitude: latitude || null,
        clockOutLongitude: longitude || null,
        clockOutPhotoUrl,
        clockOutDistance,
        // Update device info & IP if provided (captures clock-out device too)
        ...(deviceInfo && { deviceInfo }),
        ipAddress,
      },
      include: {
        Technician: { select: { id: true, firstName: true, lastName: true } },
        Chantier: { select: { id: true, clientName: true } },
      },
    });

    return res.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('[Teams] Erreur clock-out:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/time-entries/:id ──
router.delete('/time-entries/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    if (!organizationId) return res.status(400).json({ error: 'Organization ID required' });
    const existing = await db.timeEntry.findFirst({ where: { id: req.params.id, organizationId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pointage non trouvé' });
    }
    await db.timeEntry.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Pointage supprimé' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression pointage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
