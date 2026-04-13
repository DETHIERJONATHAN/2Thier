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
// POST /tournaments/:id/courts — Ajouter des terrains
// ═══════════════════════════════════════════════════════════

router.post('/tournaments/:id/courts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courts } = req.body; // [{ name: "Terrain 1" }, ...]

    if (!Array.isArray(courts) || courts.length === 0) {
      return res.status(400).json({ success: false, message: 'Liste de terrains requise' });
    }

    const created = await db.arenaCourt.createMany({
      data: courts.map((c: { name: string; location?: string }) => ({
        tournamentId: req.params.id,
        name: c.name,
        location: c.location || null,
      })),
      skipDuplicates: true,
    });

    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (error: any) {
    logger.error('[ARENA] POST /courts error:', error.message);
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

export default router;
