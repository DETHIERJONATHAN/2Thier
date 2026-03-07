import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ═══════════════════════════════════════════════════
// ═══ ÉQUIPES (Teams) ══════════════════════════════
// ═══════════════════════════════════════════════════

const createTeamSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  color: z.string().default('#1677ff'),
  description: z.string().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

const teamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['LEADER', 'MEMBER']).default('MEMBER'),
});

// ── GET /api/teams ── Liste des équipes de l'organisation
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const teams = await db.team.findMany({
      where: { organizationId },
      include: {
        Members: {
          include: {
            User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }], // LEADER first
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

// ── POST /api/teams ── Créer une équipe
router.post('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const team = await db.team.create({
      data: {
        organizationId,
        name: parsed.data.name,
        color: parsed.data.color || '#1677ff',
        description: parsed.data.description,
      },
      include: {
        Members: {
          include: {
            User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: team });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Une équipe avec ce nom existe déjà' });
    }
    console.error('[Teams] Erreur création:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/:id ── Modifier une équipe
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { id } = req.params;

    const parsed = updateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const team = await db.team.update({
      where: { id, organizationId },
      data: parsed.data,
      include: {
        Members: {
          include: {
            User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: team });
  } catch (error: any) {
    console.error('[Teams] Erreur modification:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/:id ── Supprimer une équipe
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { id } = req.params;

    await db.team.delete({ where: { id, organizationId } });

    return res.json({ success: true, message: 'Équipe supprimée' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ MEMBRES D'ÉQUIPE (TeamMembers) ══════════════
// ═══════════════════════════════════════════════════

// ── POST /api/teams/:teamId/members ── Ajouter un membre
router.post('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { teamId } = req.params;

    const parsed = teamMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    // Vérifier que l'équipe appartient à l'organisation
    const team = await db.team.findFirst({ where: { id: teamId, organizationId } });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Équipe non trouvée' });
    }

    const member = await db.teamMember.create({
      data: {
        teamId,
        userId: parsed.data.userId,
        role: parsed.data.role,
      },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
      },
    });

    return res.status(201).json({ success: true, data: member });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ce membre est déjà dans l\'équipe' });
    }
    console.error('[Teams] Erreur ajout membre:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/teams/:teamId/members/:memberId ── Modifier rôle d'un membre
router.put('/:teamId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    if (!['LEADER', 'MEMBER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Rôle invalide (LEADER ou MEMBER)' });
    }

    const member = await db.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
      },
    });

    return res.json({ success: true, data: member });
  } catch (error: any) {
    console.error('[Teams] Erreur modif membre:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/teams/:teamId/members/:memberId ── Retirer un membre
router.delete('/:teamId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    await db.teamMember.delete({ where: { id: memberId } });

    return res.json({ success: true, message: 'Membre retiré de l\'équipe' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression membre:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ ASSIGNATIONS CHANTIER ═══════════════════════
// ═══════════════════════════════════════════════════

const assignmentSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['CHEF_EQUIPE', 'TECHNICIEN']).default('TECHNICIEN'),
  teamId: z.string().optional(),
});

const assignTeamSchema = z.object({
  teamId: z.string().min(1),
});

// ── GET /api/teams/assignments/by-chantier/:chantierId ── Assignations d'un chantier
router.get('/assignments/by-chantier/:chantierId', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;

    const assignments = await db.chantierAssignment.findMany({
      where: { chantierId },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
        Team: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ role: 'asc' }, { assignedAt: 'asc' }], // CHEF_EQUIPE first
    });

    return res.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error('[Teams] Erreur liste assignations:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/assignments/:chantierId ── Assigner un technicien à un chantier
router.post('/assignments/:chantierId', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;

    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const assignment = await db.chantierAssignment.create({
      data: {
        chantierId,
        userId: parsed.data.userId,
        role: parsed.data.role,
        teamId: parsed.data.teamId || null,
      },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
        Team: { select: { id: true, name: true, color: true } },
      },
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ce technicien est déjà assigné à ce chantier' });
    }
    console.error('[Teams] Erreur assignation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/teams/assignments/:chantierId/team ── Assigner toute une équipe à un chantier
router.post('/assignments/:chantierId/team', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;

    const parsed = assignTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides' });
    }

    // Récupérer tous les membres de l'équipe
    const members = await db.teamMember.findMany({
      where: { teamId: parsed.data.teamId },
      include: { User: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (members.length === 0) {
      return res.status(400).json({ success: false, message: 'L\'équipe n\'a aucun membre' });
    }

    // Créer les assignations pour chaque membre (ignorer les doublons)
    const results = [];
    for (const member of members) {
      try {
        const assignment = await db.chantierAssignment.upsert({
          where: {
            chantierId_userId: { chantierId, userId: member.userId },
          },
          update: {
            teamId: parsed.data.teamId,
            role: member.role === 'LEADER' ? 'CHEF_EQUIPE' : 'TECHNICIEN',
          },
          create: {
            chantierId,
            userId: member.userId,
            teamId: parsed.data.teamId,
            role: member.role === 'LEADER' ? 'CHEF_EQUIPE' : 'TECHNICIEN',
          },
          include: {
            User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true } },
            Team: { select: { id: true, name: true, color: true } },
          },
        });
        results.push(assignment);
      } catch (_e) {
        // Skip silently if constraint error
      }
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

// ── DELETE /api/teams/assignments/:assignmentId ── Retirer une assignation
router.delete('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    await db.chantierAssignment.delete({ where: { id: assignmentId } });

    return res.json({ success: true, message: 'Assignation supprimée' });
  } catch (error: any) {
    console.error('[Teams] Erreur suppression assignation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════
// ═══ TECHNICIENS (Users avec rôle technicien) ════
// ═══════════════════════════════════════════════════

// ── GET /api/teams/technicians ── Liste des techniciens de l'organisation
router.get('/technicians', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    // Récupérer tous les utilisateurs de l'organisation
    const userOrgs = await db.userOrganization.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
            role: true,
            phoneNumber: true,
          },
        },
        Role: { select: { id: true, name: true, label: true } },
      },
    });

    // Enrichir avec les assignations chantier en cours + membership équipe
    const users = await Promise.all(
      userOrgs.map(async (uo) => {
        const [assignmentCount, teamMemberships] = await Promise.all([
          db.chantierAssignment.count({ where: { userId: uo.userId } }),
          db.teamMember.findMany({
            where: { userId: uo.userId },
            include: { Team: { select: { id: true, name: true, color: true } } },
          }),
        ]);

        return {
          ...uo.User,
          orgRole: uo.Role,
          chantierCount: assignmentCount,
          teams: teamMemberships.map((tm) => ({
            teamId: tm.Team.id,
            teamName: tm.Team.name,
            teamColor: tm.Team.color,
            memberRole: tm.role,
          })),
        };
      })
    );

    return res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('[Teams] Erreur liste techniciens:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
