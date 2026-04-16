/**
 * 🏟️ Routes API Arena — Tournois & Championnats
 * 
 * Endpoints:
 *   GET    /api/arena/tournaments             — Liste des tournois
 *   GET    /api/arena/tournaments/:id         — Détail d'un tournoi
 *   POST   /api/arena/tournaments             — Créer un tournoi
 *   PUT    /api/arena/tournaments/:id         — Modifier un tournoi
 *   DELETE /api/arena/tournaments/:id         — Supprimer un tournoi (DRAFT only)
 *   POST   /api/arena/tournaments/:id/start   — Lancer le tournoi
 *   POST   /api/arena/tournaments/:id/generate-round — Générer un nouveau tour
 *   POST   /api/arena/tournaments/:id/generate-teams — Générer les équipes (mêlée)
 *
 *   GET    /api/arena/tournaments/:id/standings — Classement
 *   GET    /api/arena/tournaments/:id/matches   — Tous les matchs
 *   PUT    /api/arena/matches/:id/score         — Soumettre / modifier un score
 *   PUT    /api/arena/matches/:id/validate      — Valider un score (organisateur)
 *
 *   POST   /api/arena/tournaments/:id/teams     — Inscrire une équipe
 *   POST   /api/arena/tournaments/:id/players   — Inscrire un joueur (solo/mêlée)
 *   PUT    /api/arena/entries/:id/status         — Accepter/refuser une inscription
 *
 *   POST   /api/arena/tournaments/:id/courts    — Ajouter des terrains
 *   GET    /api/arena/tournaments/:id/courts    — Lister les terrains
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getIO, emitToUser } from '../lib/socket';
import {
  generateRound,
  recalculateStandings,
  assignCourts,
  createTeamsFromRandomDraw,
} from '../services/arena/tournamentEngine';
import { logger } from '../lib/logger';
import type { ArenaTournamentStatus } from '@prisma/client';

const router = Router();

// ── Helpers ──
const getOrganizationId = (req: Request): string | null =>
  (req as any).user?.organizationId ||
  (req.headers['x-organization-id'] as string) ||
  null;

const getUserId = (req: Request): string =>
  (req as any).user?.id || (req as any).user?.userId || '';

// ═══════════════════════════════════════════════════════════
// GET /tournaments — Liste des tournois
// ═══════════════════════════════════════════════════════════

router.get('/tournaments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const status = req.query.status as string | undefined;
    const sport = req.query.sport as string | undefined;

    const where: Record<string, unknown> = {};

    if (organizationId) {
      // Tournois de mon org + tournois publics d'autres orgs
      where.OR = [
        { organizationId },
        { isPublic: true },
      ];
    } else {
      where.isPublic = true;
    }

    if (status) where.status = status;
    if (sport) where.sport = sport;

    const tournaments = await db.arenaTournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        Creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        Organization: { select: { id: true, name: true, logoUrl: true } },
        _count: {
          select: {
            TeamEntries: true,
            PlayerEntries: true,
            Matches: true,
          },
        },
      },
    });

    res.json({ success: true, data: tournaments });
  } catch (error: any) {
    logger.error('[ARENA] GET /tournaments error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id — Détail complet d'un tournoi
// ═══════════════════════════════════════════════════════════

router.get('/tournaments/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tournament = await db.arenaTournament.findUnique({
      where: { id: req.params.id },
      include: {
        Creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        Organization: { select: { id: true, name: true, logoUrl: true } },
        Rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            Matches: {
              orderBy: { matchNumber: 'asc' },
              include: {
                Team1: { include: { Members: { include: { User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } } },
                Team2: { include: { Members: { include: { User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } } },
                Winner: { select: { id: true, name: true } },
                Court: { select: { id: true, name: true } },
              },
            },
          },
        },
        TeamEntries: {
          orderBy: { createdAt: 'asc' },
          include: {
            Members: {
              include: {
                User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
        PlayerEntries: {
          include: {
            User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        Courts: { orderBy: { name: 'asc' } },
        Standings: {
          orderBy: { rank: 'asc' },
          include: {
            TeamEntry: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    }

    res.json({ success: true, data: tournament });
  } catch (error: any) {
    logger.error('[ARENA] GET /tournaments/:id error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments — Créer un tournoi
// ═══════════════════════════════════════════════════════════

router.post('/tournaments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const userId = getUserId(req);

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organisation requise' });
    }

    const {
      name, description, sport, format, teamType, playersPerTeam,
      maxTeams, maxPlayers, pointsToWin, nbRounds, allowMixedTeams,
      withCourts, courtsCount, location, startsAt, endsAt, rules,
      isPublic, settings,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du tournoi est requis' });
    }

    const tournament = await db.arenaTournament.create({
      data: {
        organizationId,
        creatorId: userId,
        name: name.trim(),
        description: description?.trim() || null,
        sport: sport || 'petanque',
        format: format || 'RANDOM_DRAW',
        teamType: teamType || 'DOUBLETTE',
        playersPerTeam: playersPerTeam ?? 2,
        maxTeams: maxTeams ?? null,
        maxPlayers: maxPlayers ?? null,
        pointsToWin: pointsToWin ?? 13,
        nbRounds: nbRounds ?? 5,
        allowMixedTeams: allowMixedTeams ?? true,
        withCourts: withCourts ?? true,
        courtsCount: courtsCount ?? null,
        location: location?.trim() || null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        rules: rules?.trim() || null,
        isPublic: isPublic ?? true,
        settings: settings ?? null,
        status: 'DRAFT',
      },
      include: {
        Creator: { select: { id: true, firstName: true, lastName: true } },
        Organization: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: tournament });
  } catch (error: any) {
    logger.error('[ARENA] POST /tournaments error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /tournaments/:id — Modifier un tournoi
// ═══════════════════════════════════════════════════════════

router.put('/tournaments/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    }
    if (tournament.creatorId !== userId && (req as any).user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const allowedFields = [
      'name', 'description', 'sport', 'format', 'teamType', 'playersPerTeam',
      'maxTeams', 'maxPlayers', 'pointsToWin', 'nbRounds', 'allowMixedTeams',
      'withCourts', 'courtsCount', 'location', 'startsAt', 'endsAt', 'rules',
      'isPublic', 'settings', 'status',
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'startsAt' || field === 'endsAt') {
          data[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          data[field] = req.body[field];
        }
      }
    }

    const updated = await db.arenaTournament.update({
      where: { id: req.params.id },
      data,
    });

    // Notifier via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`arena:${tournament.id}`).emit('arena:tournament-updated', { tournamentId: tournament.id });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('[ARENA] PUT /tournaments/:id error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /tournaments/:id — Supprimer (DRAFT uniquement)
// ═══════════════════════════════════════════════════════════

router.delete('/tournaments/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    }
    if (tournament.creatorId !== userId && (req as any).user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    if (tournament.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Seuls les tournois en brouillon peuvent être supprimés' });
    }

    await db.arenaTournament.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Tournoi supprimé' });
  } catch (error: any) {
    logger.error('[ARENA] DELETE /tournaments/:id error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PATCH /tournaments/:id/round-dates — Planifier les dates des journées
// ═══════════════════════════════════════════════════════════

router.patch('/tournaments/:id/round-dates', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({
      where: { id: req.params.id },
      include: { Rounds: { select: { id: true, roundNumber: true } } },
    });
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    const isSuperAdmin = (req as any).user?.role === 'SUPER_ADMIN';
    if (tournament.creatorId !== userId && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { roundDates } = req.body as { roundDates: Record<string, string | null> };

    // Si les rounds existent déjà → mettre à jour ArenaRound.startsAt directement
    if (tournament.Rounds.length > 0) {
      await db.$transaction(
        tournament.Rounds.map(round =>
          db.arenaRound.update({
            where: { id: round.id },
            data: {
              startsAt: roundDates[String(round.roundNumber)]
                ? new Date(roundDates[String(round.roundNumber)]!)
                : null,
            },
          })
        )
      );
    }

    // Toujours stocker dans settings pour la génération future
    const currentSettings = (tournament.settings as Record<string, unknown>) ?? {};
    await db.arenaTournament.update({
      where: { id: req.params.id },
      data: { settings: { ...currentSettings, roundDates } },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[ARENA] PATCH /round-dates error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/start — Ouvrir les inscriptions ou démarrer
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    if (tournament.creatorId !== userId && (req as any).user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    let newStatus: ArenaTournamentStatus;
    if (tournament.status === 'DRAFT') {
      newStatus = 'REGISTRATION_OPEN';
    } else if (tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'REGISTRATION_CLOSED') {
      newStatus = 'IN_PROGRESS';
    } else {
      return res.status(400).json({ success: false, message: `Impossible de démarrer depuis le statut ${tournament.status}` });
    }

    const updated = await db.arenaTournament.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${tournament.id}`).emit('arena:tournament-status', {
        tournamentId: tournament.id,
        status: newStatus,
      });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('[ARENA] POST /tournaments/:id/start error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/generate-round — Générer un tour
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/generate-round', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    if (tournament.creatorId !== userId && (req as any).user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const result = await generateRound(req.params.id);

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('[ARENA] POST /generate-round error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/generate-teams — Mêlée auto
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/generate-teams', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    if (tournament.creatorId !== userId && (req as any).user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const result = await createTeamsFromRandomDraw(req.params.id);

    const io = getIO();
    if (io) {
      io.to(`arena:${tournament.id}`).emit('arena:teams-generated', {
        tournamentId: tournament.id,
        teamCount: result.teamCount,
      });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('[ARENA] POST /generate-teams error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id/standings — Classement
// ═══════════════════════════════════════════════════════════

router.get('/tournaments/:id/standings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const standings = await db.arenaStanding.findMany({
      where: { tournamentId: req.params.id },
      orderBy: [{ rank: 'asc' }],
      include: {
        TeamEntry: {
          select: {
            id: true,
            name: true,
            Members: {
              include: {
                User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    res.json({ success: true, data: standings });
  } catch (error: any) {
    logger.error('[ARENA] GET /standings error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id/matches — Tous les matchs
// ═══════════════════════════════════════════════════════════

router.get('/tournaments/:id/matches', authenticateToken, async (req: Request, res: Response) => {
  try {
    const roundId = req.query.roundId as string | undefined;
    const where: Record<string, unknown> = { tournamentId: req.params.id };
    if (roundId) where.roundId = roundId;

    const matches = await db.arenaMatch.findMany({
      where,
      orderBy: [{ Round: { roundNumber: 'asc' } }, { matchNumber: 'asc' }],
      include: {
        Round: { select: { id: true, roundNumber: true, name: true } },
        Team1: { select: { id: true, name: true } },
        Team2: { select: { id: true, name: true } },
        Winner: { select: { id: true, name: true } },
        Court: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: matches });
  } catch (error: any) {
    logger.error('[ARENA] GET /matches error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /matches/:id/score — Soumettre un score
// ═══════════════════════════════════════════════════════════

router.put('/matches/:id/score', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { score1, score2 } = req.body;

    if (score1 == null || score2 == null) {
      return res.status(400).json({ success: false, message: 'score1 et score2 requis' });
    }
    if (typeof score1 !== 'number' || typeof score2 !== 'number' || score1 < 0 || score2 < 0) {
      return res.status(400).json({ success: false, message: 'Scores invalides' });
    }

    const match = await db.arenaMatch.findUnique({
      where: { id: req.params.id },
      include: { Tournament: true },
    });
    if (!match) return res.status(404).json({ success: false, message: 'Match introuvable' });

    // Déterminer le gagnant
    const winnerId = score1 > score2 ? match.team1Id
      : score2 > score1 ? match.team2Id
      : null; // Égalité

    // Mettre à jour le match
    const updated = await db.arenaMatch.update({
      where: { id: req.params.id },
      data: {
        score1,
        score2,
        winnerId,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Enregistrer la soumission
    await db.arenaMatchScore.create({
      data: {
        matchId: match.id,
        submitterId: userId,
        score1,
        score2,
        isValidated: match.Tournament.creatorId === userId, // Auto-validé si c'est l'organisateur
      },
    });

    // Recalculer le classement
    await recalculateStandings(match.tournamentId);

    // Notifier en temps réel
    const io = getIO();
    if (io) {
      io.to(`arena:${match.tournamentId}`).emit('arena:score-updated', {
        tournamentId: match.tournamentId,
        matchId: match.id,
        score1,
        score2,
        winnerId,
      });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('[ARENA] PUT /matches/:id/score error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /matches/:id/validate — Valider un score (organisateur)
// ═══════════════════════════════════════════════════════════

router.put('/matches/:id/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const match = await db.arenaMatch.findUnique({
      where: { id: req.params.id },
      include: { Tournament: true },
    });
    if (!match) return res.status(404).json({ success: false, message: 'Match introuvable' });

    if (match.Tournament.creatorId !== userId && (req as any).user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut valider' });
    }

    await db.arenaMatchScore.updateMany({
      where: { matchId: match.id },
      data: { isValidated: true },
    });

    res.json({ success: true, message: 'Score validé' });
  } catch (error: any) {
    logger.error('[ARENA] PUT /matches/:id/validate error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/teams — Inscrire une équipe
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/teams', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, memberIds } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Nom d\'équipe requis' });
    }

    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournoi introuvable' });

    if (tournament.status !== 'REGISTRATION_OPEN' && tournament.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Les inscriptions sont fermées' });
    }

    // Vérifier la limite d'équipes
    if (tournament.maxTeams) {
      const count = await db.arenaTeamEntry.count({
        where: { tournamentId: tournament.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      if (count >= tournament.maxTeams) {
        return res.status(400).json({ success: false, message: 'Nombre maximum d\'équipes atteint' });
      }
    }

    const isOrganizer = tournament.creatorId === userId || (req as any).user?.role === 'super_admin';

    const entry = await db.$transaction(async (tx) => {
      const teamEntry = await tx.arenaTeamEntry.create({
        data: {
          tournamentId: tournament.id,
          name: name.trim(),
          status: isOrganizer ? 'CONFIRMED' : 'PENDING',
        },
      });

      // Ajouter le créateur comme capitaine
      const allMembers = [userId, ...(memberIds || []).filter((id: string) => id !== userId)];

      await tx.arenaTeamMember.createMany({
        data: allMembers.map((memberId: string, idx: number) => ({
          teamEntryId: teamEntry.id,
          userId: memberId,
          isCaptain: idx === 0,
        })),
      });

      return teamEntry;
    });

    // Notifier l'organisateur si besoin d'approbation
    if (!isOrganizer) {
      emitToUser(tournament.creatorId, 'arena:registration-received', {
        tournamentId: tournament.id,
        teamName: name,
      });
    }

    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    logger.error('[ARENA] POST /teams error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/players — Inscrire un joueur solo
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/players', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournament = await db.arenaTournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournoi introuvable' });

    if (tournament.status !== 'REGISTRATION_OPEN' && tournament.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Les inscriptions sont fermées' });
    }

    if (tournament.maxPlayers) {
      const count = await db.arenaPlayerEntry.count({
        where: { tournamentId: tournament.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      if (count >= tournament.maxPlayers) {
        return res.status(400).json({ success: false, message: 'Nombre maximum de joueurs atteint' });
      }
    }

    // Vérifier doublon
    const existing = await db.arenaPlayerEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: tournament.id, userId } },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Déjà inscrit' });
    }

    const isOrganizer = tournament.creatorId === userId || (req as any).user?.role === 'super_admin';

    const entry = await db.arenaPlayerEntry.create({
      data: {
        tournamentId: tournament.id,
        userId,
        status: isOrganizer ? 'CONFIRMED' : 'PENDING',
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    logger.error('[ARENA] POST /players error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /entries/:id/status — Accepter/refuser une inscription
// ═══════════════════════════════════════════════════════════

router.put('/entries/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, type } = req.body; // type: 'team' | 'player'
    
    if (!['CONFIRMED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    if (type === 'team') {
      const entry = await db.arenaTeamEntry.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json({ success: true, data: entry });
    } else {
      const entry = await db.arenaPlayerEntry.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json({ success: true, data: entry });
    }
  } catch (error: any) {
    logger.error('[ARENA] PUT /entries/:id/status error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/courts — Ajouter des terrains (avec teamType)
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/courts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courts } = req.body; // [{ name: "Terrain 1", teamType: "DOUBLETTE" }, ...]

    if (!Array.isArray(courts) || courts.length === 0) {
      return res.status(400).json({ success: false, message: 'Liste de terrains requise' });
    }

    // Supprimer les anciens terrains avant de recréer
    await db.arenaCourt.deleteMany({ where: { tournamentId: req.params.id } });

    const created = await db.arenaCourt.createMany({
      data: courts.map((c: { name: string; teamType?: string; location?: string }) => ({
        tournamentId: req.params.id,
        name: c.name,
        teamType: c.teamType || 'DOUBLETTE',
        location: c.location || null,
      })),
      skipDuplicates: true,
    });

    // Mettre à jour courtsCount sur le tournoi
    await db.arenaTournament.update({
      where: { id: req.params.id },
      data: { courtsCount: courts.length },
    });

    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (error: any) {
    logger.error('[ARENA] POST /courts error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id/court-proposal — Proposition de configuration des terrains
// ═══════════════════════════════════════════════════════════
// Algo : N joueurs, C terrains disponibles (1 terrain = 1 match)
// Doublette = 2v2 = 4 joueurs/terrain. Triplette = 3v3 = 6 joueurs/terrain.
// On maximise le nombre de joueurs qui jouent en minimisant les BYE.
// t = triplettes, d = doublettes, x = terrains inactifs
// Contraintes : d+t+x=C, 4d+6t ≤ N, maximiser 4d+6t
// Stratégie : d'abord remplir en doublettes (plus efficace), puis convertir si reste ≥ 2 joueurs

router.get('/tournaments/:id/court-proposal', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tournament = await db.arenaTournament.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, courtsCount: true,
        _count: { select: { PlayerEntries: true } },
      },
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    }

    const C = Number(req.query.courts) || tournament.courtsCount || 4;
    const N = Number(req.query.players) || tournament._count.PlayerEntries;

    // Phase 1 : remplir au max avec doublettes
    let doublettes = Math.min(C, Math.floor(N / 4));
    let triplettes = 0;
    let playersUsed = doublettes * 4;
    const leftover = N - playersUsed;

    // Phase 2 : si reste ≥ 6 et terrains libres, ajouter triplettes
    if (leftover >= 6 && doublettes + triplettes < C) {
      const extraTriplettes = Math.min(Math.floor(leftover / 6), C - doublettes);
      triplettes = extraTriplettes;
      playersUsed += triplettes * 6;
    }

    // Phase 3 : si reste = 2 (pas assez pour triplette), convertir 1 doublette en triplette
    // 1 doublette (4j) + 2 restants = 6j = 1 triplette
    const remaining2 = N - playersUsed;
    if (remaining2 === 2 && doublettes > 0) {
      doublettes--;
      triplettes++;
      playersUsed = doublettes * 4 + triplettes * 6;
    }

    const activeCount = doublettes + triplettes;
    const idleCount = C - activeCount;
    const playersOut = N - playersUsed;

    // Construire la proposition par terrain
    const courts: { name: string; teamType: string; playersNeeded: number; active: boolean }[] = [];
    for (let i = 0; i < C; i++) {
      if (i < doublettes) {
        courts.push({ name: `Terrain ${i + 1}`, teamType: 'DOUBLETTE', playersNeeded: 4, active: true });
      } else if (i < doublettes + triplettes) {
        courts.push({ name: `Terrain ${i + 1}`, teamType: 'TRIPLETTE', playersNeeded: 6, active: true });
      } else {
        courts.push({ name: `Terrain ${i + 1}`, teamType: 'IDLE', playersNeeded: 0, active: false });
      }
    }

    res.json({
      success: true,
      data: {
        playerCount: N,
        courtsCount: C,
        doublettes,
        triplettes,
        idleCount,
        activeCount,
        playersUsed,
        playersOut,
        courts,
      },
    });
  } catch (error: any) {
    logger.error('[ARENA] GET /court-proposal error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id/courts — Lister les terrains
// ═══════════════════════════════════════════════════════════

router.get('/tournaments/:id/courts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const courts = await db.arenaCourt.findMany({
      where: { tournamentId: req.params.id },
      orderBy: { name: 'asc' },
      include: {
        Matches: {
          where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
          select: { id: true, matchNumber: true, status: true },
          take: 1,
        },
      },
    });

    res.json({ success: true, data: courts });
  } catch (error: any) {
    logger.error('[ARENA] GET /courts error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/courts/add — Ajouter UN terrain
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/courts/add', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, teamType, location } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nom du terrain requis' });
    }
    const court = await db.arenaCourt.create({
      data: {
        tournamentId: req.params.id,
        name,
        teamType: teamType || 'DOUBLETTE',
        location: location || null,
      },
    });
    // Mettre à jour courtsCount
    const count = await db.arenaCourt.count({ where: { tournamentId: req.params.id } });
    await db.arenaTournament.update({ where: { id: req.params.id }, data: { courtsCount: count } });
    res.status(201).json({ success: true, data: court });
  } catch (error: any) {
    logger.error('[ARENA] POST /courts/add error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PATCH /courts/:courtId — Modifier un terrain
// ═══════════════════════════════════════════════════════════

router.patch('/courts/:courtId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, teamType, location } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (teamType !== undefined) data.teamType = teamType;
    if (location !== undefined) data.location = location;
    const court = await db.arenaCourt.update({
      where: { id: req.params.courtId },
      data,
    });
    res.json({ success: true, data: court });
  } catch (error: any) {
    logger.error('[ARENA] PATCH /courts/:courtId error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /courts/:courtId — Supprimer un terrain
// ═══════════════════════════════════════════════════════════

router.delete('/courts/:courtId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const court = await db.arenaCourt.findUnique({ where: { id: req.params.courtId } });
    if (!court) {
      return res.status(404).json({ success: false, message: 'Terrain introuvable' });
    }
    await db.arenaCourt.delete({ where: { id: req.params.courtId } });
    // Mettre à jour courtsCount
    const count = await db.arenaCourt.count({ where: { tournamentId: court.tournamentId } });
    await db.arenaTournament.update({ where: { id: court.tournamentId }, data: { courtsCount: count } });
    res.json({ success: true });
  } catch (error: any) {
    logger.error('[ARENA] DELETE /courts/:courtId error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /matches/:id/reassign — Déplacer un match (terrain/équipe)
// ═══════════════════════════════════════════════════════════

router.put('/matches/:id/reassign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courtId, team1Id, team2Id } = req.body;
    const data: Record<string, unknown> = {};
    if (courtId !== undefined) data.courtId = courtId;
    if (team1Id !== undefined) data.team1Id = team1Id;
    if (team2Id !== undefined) data.team2Id = team2Id;

    const match = await db.arenaMatch.update({
      where: { id: req.params.id },
      data,
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${match.tournamentId}`).emit('arena:match-reassigned', {
        matchId: match.id,
        courtId,
        team1Id,
        team2Id,
      });
    }

    res.json({ success: true, data: match });
  } catch (error: any) {
    logger.error('[ARENA] PUT /matches/:id/reassign error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id/my-registration — Mon inscription dans ce tournoi
// ═══════════════════════════════════════════════════════════

router.get('/tournaments/:id/my-registration', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tournamentId = req.params.id;

    // Chercher en tant que joueur solo
    const playerEntry = await db.arenaPlayerEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });

    // Chercher en tant que membre d'équipe
    const teamMembership = await db.arenaTeamMember.findFirst({
      where: {
        userId,
        TeamEntry: { tournamentId },
      },
      include: {
        TeamEntry: {
          include: {
            Members: {
              include: {
                User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        isRegistered: !!(playerEntry || teamMembership),
        asPlayer: playerEntry || null,
        asTeamMember: teamMembership || null,
        isCaptain: teamMembership?.isCaptain || false,
        team: teamMembership?.TeamEntry || null,
      },
    });
  } catch (error: any) {
    logger.error('[ARENA] GET /my-registration error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /teams/:id/members — Ajouter des membres à une équipe (capitaine)
// ═══════════════════════════════════════════════════════════

router.put('/teams/:id/members', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const teamEntryId = req.params.id;
    const { addUserIds, removeUserIds } = req.body;

    // Vérifier que c'est le capitaine ou l'organisateur
    const teamEntry = await db.arenaTeamEntry.findUnique({
      where: { id: teamEntryId },
      include: {
        Members: true,
        Tournament: true,
      },
    });

    if (!teamEntry) return res.status(404).json({ success: false, message: 'Équipe introuvable' });

    const isCaptain = teamEntry.Members.some(m => m.userId === userId && m.isCaptain);
    const isOrganizer = teamEntry.Tournament.creatorId === userId || (req as any).user?.role === 'super_admin';

    if (!isCaptain && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Seul le capitaine ou l\'organisateur peut gérer l\'équipe' });
    }

    // Vérifier que le tournoi est encore en inscription
    if (!['DRAFT', 'REGISTRATION_OPEN'].includes(teamEntry.Tournament.status)) {
      return res.status(400).json({ success: false, message: 'Le tournoi n\'est plus en phase d\'inscription' });
    }

    // Vérifier la limite de joueurs par équipe
    const currentCount = teamEntry.Members.length;
    const addCount = (addUserIds || []).length;
    const removeCount = (removeUserIds || []).length;
    const newCount = currentCount + addCount - removeCount;

    if (newCount > teamEntry.Tournament.playersPerTeam) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${teamEntry.Tournament.playersPerTeam} joueurs par équipe (actuellement ${currentCount})`,
      });
    }

    await db.$transaction(async (tx) => {
      // Ajouter des membres
      if (addUserIds && addUserIds.length > 0) {
        // Vérifier que les utilisateurs ne sont pas déjà dans une autre équipe du même tournoi
        for (const newUserId of addUserIds) {
          const existingMembership = await tx.arenaTeamMember.findFirst({
            where: {
              userId: newUserId,
              TeamEntry: { tournamentId: teamEntry.tournamentId },
            },
          });
          if (existingMembership) {
            throw new Error(`L'utilisateur est déjà dans une équipe de ce tournoi`);
          }
        }

        await tx.arenaTeamMember.createMany({
          data: addUserIds.map((uid: string) => ({
            teamEntryId,
            userId: uid,
            isCaptain: false,
          })),
          skipDuplicates: true,
        });
      }

      // Retirer des membres (pas le capitaine !)
      if (removeUserIds && removeUserIds.length > 0) {
        // Empêcher de retirer le capitaine
        const captainMember = teamEntry.Members.find(m => m.isCaptain);
        if (captainMember && removeUserIds.includes(captainMember.userId)) {
          throw new Error('Impossible de retirer le capitaine');
        }

        await tx.arenaTeamMember.deleteMany({
          where: {
            teamEntryId,
            userId: { in: removeUserIds },
          },
        });
      }
    });

    // Retourner l'équipe mise à jour
    const updated = await db.arenaTeamEntry.findUnique({
      where: { id: teamEntryId },
      include: {
        Members: {
          include: {
            User: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('[ARENA] PUT /teams/:id/members error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /tournaments/:id/available-players — Joueurs disponibles pour ajout en équipe
// ═══════════════════════════════════════════════════════════

router.get('/tournaments/:id/available-players', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const tournamentId = req.params.id;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organisation requise' });
    }

    // Récupérer les utilisateurs de l'organisation
    const query = (req.query.q as string || '').trim().toLowerCase();

    // Exclure les utilisateurs déjà inscrits dans une équipe de ce tournoi
    const alreadyInTeam = await db.arenaTeamMember.findMany({
      where: { TeamEntry: { tournamentId } },
      select: { userId: true },
    });
    const excludeIds = new Set(alreadyInTeam.map(m => m.userId));

    // Aussi exclure les joueurs déjà inscrits individuellement
    const alreadyAsPlayer = await db.arenaPlayerEntry.findMany({
      where: { tournamentId },
      select: { userId: true },
    });
    alreadyAsPlayer.forEach(p => excludeIds.add(p.userId));

    const users = await db.user.findMany({
      where: {
        organizationId,
        id: { notIn: Array.from(excludeIds) },
        isActive: true,
        ...(query ? {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' as const } },
            { lastName: { contains: query, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      take: 20,
    });

    res.json({ success: true, data: users });
  } catch (error: any) {
    logger.error('[ARENA] GET /available-players error:', error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /tournaments/:id/seed-fake-players — Générer des faux joueurs/équipes (SUPER ADMIN ONLY)
// ═══════════════════════════════════════════════════════════

const FAKE_FIRST_NAMES = [
  'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Louis', 'Manon',
  'Raphaël', 'Camille', 'Julien', 'Inès', 'Antoine', 'Sarah', 'Maxime',
  'Jade', 'Thomas', 'Zoé', 'Théo', 'Lina', 'Arthur', 'Alice', 'Gabriel',
  'Louise', 'Enzo', 'Margaux', 'Paul', 'Marie', 'Victor', 'Clara',
  'Adam', 'Eva', 'Romain', 'Juliette', 'Baptiste', 'Rose', 'Clément',
  'Anna', 'Nicolas', 'Agathe',
];

const FAKE_LAST_NAMES = [
  'Dupont', 'Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon',
  'Michel', 'Lefèvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel',
  'Fournier', 'Girard', 'Bonnet', 'Durand', 'Lambert', 'Fontaine',
  'Rousseau', 'Vincent', 'Muller', 'Lefebvre', 'Faure', 'André',
  'Mercier', 'Blanc', 'Guérin', 'Boyer', 'Garcia', 'Perrin', 'Robin',
  'Clément', 'Morin', 'Nicolas', 'Henry', 'Mathieu', 'Gauthier', 'Masson',
];

const TEAM_NAME_ADJECTIVES = [
  'Furieux', 'Intrépides', 'Invincibles', 'Sauvages', 'Enragés',
  'Électriques', 'Redoutables', 'Infernaux', 'Cosmiques', 'Légendaires',
  'Fous', 'Rapides', 'Tonnants', 'Brûlants', 'Glaciaux',
];

const TEAM_NAME_NOUNS = [
  'Lions', 'Aigles', 'Requins', 'Loups', 'Tigres', 'Dragons',
  'Faucons', 'Ours', 'Panthères', 'Cobras', 'Mustangs', 'Spartiates',
  'Gladiateurs', 'Vikings', 'Samouraïs',
];

router.post('/tournaments/:id/seed-fake-players', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super Admin uniquement' });
    }

    const tournamentId = req.params.id;
    const tournament = await db.arenaTournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, teamType: true, playersPerTeam: true, format: true, organizationId: true, maxTeams: true, maxPlayers: true },
    });
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournoi introuvable' });
    }

    const count = Math.min(Number(req.body.count) || 16, 128); // max 128 joueurs
    const orgId = tournament.organizationId;
    const { randomUUID } = await import('crypto');

    // Mélanger les noms pour éviter les doublons
    const shuffledFirst = [...FAKE_FIRST_NAMES].sort(() => Math.random() - 0.5);
    const shuffledLast = [...FAKE_LAST_NAMES].sort(() => Math.random() - 0.5);

    // Créer les faux utilisateurs
    const fakeUsers: { id: string; firstName: string; lastName: string }[] = [];
    for (let i = 0; i < count; i++) {
      const firstName = shuffledFirst[i % shuffledFirst.length];
      const lastName = shuffledLast[i % shuffledLast.length];
      const uid = randomUUID();
      const email = `fake-${uid.slice(0, 8)}@arena-test.local`;

      await db.user.create({
        data: {
          id: uid,
          email,
          passwordHash: 'FAKE_PLAYER_NO_LOGIN',
          firstName,
          lastName,
          status: 'active',
          role: 'user',
          organizationId: orgId,
          updatedAt: new Date(),
        },
      });
      fakeUsers.push({ id: uid, firstName, lastName });
    }

    let teamsCreated = 0;
    let playersCreated = 0;

    if (tournament.format === 'RANDOM_DRAW') {
      // Mêlée : inscrire en joueurs individuels
      for (const fu of fakeUsers) {
        await db.arenaPlayerEntry.create({
          data: { tournamentId, userId: fu.id, status: 'CONFIRMED' },
        });
        playersCreated++;
      }
    } else if (tournament.teamType === 'SOLO') {
      // Solo : inscrire individuellement
      for (const fu of fakeUsers) {
        await db.arenaPlayerEntry.create({
          data: { tournamentId, userId: fu.id, status: 'CONFIRMED' },
        });
        playersCreated++;
      }
    } else {
      // Équipes : grouper les joueurs en équipes
      const teamSize = tournament.playersPerTeam || 2;
      const nbTeams = Math.floor(fakeUsers.length / teamSize);
      const shuffledAdj = [...TEAM_NAME_ADJECTIVES].sort(() => Math.random() - 0.5);
      const shuffledNoun = [...TEAM_NAME_NOUNS].sort(() => Math.random() - 0.5);

      for (let t = 0; t < nbTeams; t++) {
        const teamName = `${shuffledAdj[t % shuffledAdj.length]} ${shuffledNoun[t % shuffledNoun.length]}`;
        const members = fakeUsers.slice(t * teamSize, (t + 1) * teamSize);

        const teamEntry = await db.arenaTeamEntry.create({
          data: {
            tournamentId,
            name: teamName,
            status: 'CONFIRMED',
          },
        });

        for (let m = 0; m < members.length; m++) {
          await db.arenaTeamMember.create({
            data: {
              teamEntryId: teamEntry.id,
              userId: members[m].id,
              isCaptain: m === 0, // premier = capitaine
            },
          });
        }
        teamsCreated++;
      }
    }

    logger.info(`[ARENA] Seed fake: ${playersCreated} joueurs, ${teamsCreated} équipes pour tournoi ${tournamentId}`);

    res.json({
      success: true,
      data: {
        usersCreated: fakeUsers.length,
        playersCreated,
        teamsCreated,
      },
    });
  } catch (error: any) {
    logger.error('[ARENA] POST /seed-fake-players error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /tournaments/:id/fake-players — Nettoyer TOUT le tournoi + faux joueurs (SUPER ADMIN ONLY)
// ═══════════════════════════════════════════════════════════

router.delete('/tournaments/:id/fake-players', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super Admin uniquement' });
    }

    const tournamentId = req.params.id;

    // Trouver les faux utilisateurs liés à ce tournoi (par PlayerEntry ou TeamMember)
    const fakePlayerEntries = await db.arenaPlayerEntry.findMany({
      where: { tournamentId, User: { email: { endsWith: '@arena-test.local' } } },
      select: { userId: true },
    });
    const fakeTeamMembers = await db.arenaTeamMember.findMany({
      where: { TeamEntry: { tournamentId }, User: { email: { endsWith: '@arena-test.local' } } },
      select: { userId: true },
    });
    const fakeUserIds = [...new Set([
      ...fakePlayerEntries.map(p => p.userId),
      ...fakeTeamMembers.map(m => m.userId),
    ])];

    await db.$transaction(async (tx) => {
      // 1. Supprimer les scores/standings
      await tx.arenaStanding.deleteMany({ where: { tournamentId } });

      // 2. Supprimer tous les matchs
      await tx.arenaMatch.deleteMany({ where: { tournamentId } });

      // 3. Supprimer tous les rounds
      await tx.arenaRound.deleteMany({ where: { tournamentId } });

      // 4. Supprimer membres d'équipes + équipes
      await tx.arenaTeamMember.deleteMany({ where: { TeamEntry: { tournamentId } } });
      await tx.arenaTeamEntry.deleteMany({ where: { tournamentId } });

      // 5. Supprimer inscriptions individuelles
      await tx.arenaPlayerEntry.deleteMany({ where: { tournamentId } });

      // 6. Supprimer les faux utilisateurs
      if (fakeUserIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { in: fakeUserIds } } });
      }

      // 7. Remettre le tournoi en état initial
      await tx.arenaTournament.update({
        where: { id: tournamentId },
        data: { status: 'DRAFT', currentRound: 0 },
      });
    });

    logger.info(`[ARENA] Cleanup complet: rounds/matchs/équipes/joueurs supprimés pour tournoi ${tournamentId}, ${fakeUserIds.length} faux users supprimés`);

    res.json({
      success: true,
      data: { fakeUsersDeleted: fakeUserIds.length },
    });
  } catch (error: any) {
    logger.error('[ARENA] DELETE /fake-players error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

export default router;
