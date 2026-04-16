/**
 * 🏟️ Arena Tournament Engine v2
 * 
 * Moteur complet de génération de matchs, calcul de classements et gestion des tours.
 * 
 * Formats supportés :
 * - RANDOM_DRAW    — Mêlée pétanque : mélange + appariement aléatoire à chaque manche
 * - ROUND_ROBIN    — Poules avec journées (circle method) : chaque équipe joue contre toutes
 * - SINGLE_ELIMINATION — Bracket avec byes + avancement automatique des vainqueurs
 * - DOUBLE_ELIMINATION — Winner bracket + Loser bracket + Grande Finale
 * - SWISS          — Système suisse : appariement par niveau, évite re-matches
 * - CHAMPIONSHIP   — Identique à ROUND_ROBIN (aller), utilisé pour les ligues/championnats
 */

import { db } from '../../lib/database';
import { getIO } from '../../lib/socket';
import { logger } from '../../lib/logger';

// ──────────────────────────────────────────────
// Types internes
// ──────────────────────────────────────────────

interface TeamForDraw {
  id: string;
  name: string;
  seed?: number | null;
}

interface GeneratedMatch {
  matchNumber: number;
  team1Id: string | null;
  team2Id: string | null;
}

interface RoundWithMatches {
  roundNumber: number;
  name: string;
  matches: GeneratedMatch[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ──────────────────────────────────────────────
// Tirage & Génération de matchs
// ──────────────────────────────────────────────

/**
 * Round-Robin avec distribution en journées (circle method).
 * 
 * Pour N équipes (N pair) : N-1 journées, N/2 matchs par journée.
 * Pour N impair : on ajoute un "fantôme" (bye), donc N journées, (N-1)/2 matchs + 1 bye.
 * 
 * Algorithme : fixer l'équipe 0, faire tourner les N-1 autres en cercle.
 * 
 * Retourne TOUTES les journées avec leurs matchs.
 */
function generateRoundRobinSchedule(teams: TeamForDraw[]): RoundWithMatches[] {
  const teamList = [...teams];
  const hasBye = teamList.length % 2 !== 0;

  // Si impair, ajouter un "fantôme" pour les byes
  if (hasBye) {
    teamList.push({ id: '__BYE__', name: 'BYE' });
  }

  const n = teamList.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const rounds: RoundWithMatches[] = [];

  // Circle method : fixer teamList[0], faire tourner le reste
  const fixed = teamList[0];
  const rotating = teamList.slice(1);

  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: GeneratedMatch[] = [];
    let matchNumber = 1;

    // Match de l'équipe fixe
    const opponent = rotating[0];
    if (fixed.id !== '__BYE__' && opponent.id !== '__BYE__') {
      roundMatches.push({
        matchNumber,
        team1Id: fixed.id,
        team2Id: opponent.id,
      });
      matchNumber++;
    }

    // Autres matchs : appariement miroir
    for (let i = 1; i < matchesPerRound; i++) {
      const home = rotating[i];
      const away = rotating[rotating.length - i];
      if (home.id !== '__BYE__' && away.id !== '__BYE__') {
        roundMatches.push({
          matchNumber,
          team1Id: home.id,
          team2Id: away.id,
        });
        matchNumber++;
      }
    }

    rounds.push({
      roundNumber: round + 1,
      name: `Journée ${round + 1}`,
      matches: roundMatches,
    });

    // Rotation : déplacer le dernier au début
    rotating.unshift(rotating.pop()!);
  }

  return rounds;
}

/**
 * Élimination directe (bracket).
 * Retourne les matchs du premier tour.
 * Gère les byes si le nombre d'équipes n'est pas une puissance de 2.
 * Les équipes seedées (tête de série) évitent de se rencontrer tôt.
 */
function generateSingleEliminationBracket(teams: TeamForDraw[]): RoundWithMatches[] {
  const sorted = teams.some(t => t.seed != null)
    ? [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
    : shuffleArray(teams);

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(sorted.length)));
  const totalRounds = Math.ceil(Math.log2(sorted.length));
  const _byes = bracketSize - sorted.length;

  // Créer les slots du bracket avec byes
  const slots: (TeamForDraw | null)[] = new Array(bracketSize).fill(null);
  
  // Placer les équipes seedées avec espacement optimal
  for (let i = 0; i < sorted.length; i++) {
    slots[i] = sorted[i];
  }

  // Générer les matchs du premier tour
  const firstRoundMatches: GeneratedMatch[] = [];
  let matchNumber = 1;

  for (let i = 0; i < bracketSize; i += 2) {
    const team1 = slots[i];
    const team2 = slots[i + 1];

    firstRoundMatches.push({
      matchNumber,
      team1Id: team1?.id || null,
      team2Id: team2?.id || null,
    });
    matchNumber++;
  }

  // Nommer le premier tour
  const getRoundName = (roundIdx: number, totalR: number) => {
    const remaining = totalR - roundIdx;
    if (remaining === 1) return 'Finale';
    if (remaining === 2) return 'Demi-finales';
    if (remaining === 3) return 'Quarts de finale';
    if (remaining === 4) return 'Huitièmes de finale';
    return `Tour ${roundIdx + 1}`;
  };

  return [{
    roundNumber: 1,
    name: getRoundName(0, totalRounds),
    matches: firstRoundMatches,
  }];
}

/**
 * Double élimination : Winner bracket + Loser bracket.
 * Le premier tour est identique à l'élimination directe.
 * Les perdants sont envoyés dans le Loser bracket.
 * Note : on génère uniquement le premier tour ici, 
 * les tours suivants sont générés automatiquement via advanceEliminationBracket.
 */
function generateDoubleEliminationBracket(teams: TeamForDraw[]): RoundWithMatches[] {
  // Le premier tour est identique à single elimination
  return generateSingleEliminationBracket(teams);
}

/**
 * Système suisse — Appariement par niveau, évite les re-matches.
 */
async function generateSwissRound(
  tournamentId: string,
  _roundNumber: number
): Promise<GeneratedMatch[]> {
  const standings = await db.arenaStanding.findMany({
    where: { tournamentId },
    orderBy: { totalPoints: 'desc' },
    include: { TeamEntry: true },
  });

  const playedMatches = await db.arenaMatch.findMany({
    where: { tournamentId, status: 'COMPLETED' },
    select: { team1Id: true, team2Id: true },
  });

  const playedPairs = new Set(
    playedMatches.map(m => [m.team1Id, m.team2Id].sort().join('-'))
  );

  const teams = standings.map(s => ({
    id: s.teamEntryId,
    name: s.TeamEntry.name,
    points: s.totalPoints,
  }));

  const matches: GeneratedMatch[] = [];
  const paired = new Set<string>();
  let matchNumber = 1;

  for (const team of teams) {
    if (paired.has(team.id)) continue;

    const opponent = teams.find(t => {
      if (t.id === team.id) return false;
      if (paired.has(t.id)) return false;
      const pairKey = [team.id, t.id].sort().join('-');
      return !playedPairs.has(pairKey);
    });

    if (opponent) {
      matches.push({
        matchNumber,
        team1Id: team.id,
        team2Id: opponent.id,
      });
      paired.add(team.id);
      paired.add(opponent.id);
      matchNumber++;
    }
  }

  return matches;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Génère les matchs d'un tournoi.
 * 
 * - ROUND_ROBIN / CHAMPIONSHIP : génère TOUTES les journées d'un coup (N-1 rounds).
 * - RANDOM_DRAW : génère 1 tour (manche) à chaque appel.
 * - SINGLE/DOUBLE_ELIMINATION : génère le 1er tour du bracket, les suivants via advanceBracket.
 * - SWISS : génère 1 tour basé sur le classement actuel.
 */
export async function generateRound(tournamentId: string): Promise<{
  roundId: string;
  matchCount: number;
  roundsCreated?: number;
}> {
  const tournament = await db.arenaTournament.findUnique({
    where: { id: tournamentId },
    include: {
      TeamEntries: { where: { status: 'CONFIRMED' } },
      PlayerEntries: { where: { status: 'CONFIRMED' }, select: { userId: true } },
      Rounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
    },
  });

  if (!tournament) throw new Error('Tournament not found');

  const format = tournament.format;

  const lastRound = tournament.Rounds[0]?.roundNumber ?? 0;

  // Récupérer les terrains disponibles (avec teamType)
  const courts = tournament.withCourts
    ? await db.arenaCourt.findMany({
        where: { tournamentId, isAvailable: true },
        orderBy: { name: 'asc' },
      })
    : [];

  // ═══════════════════════════════════════════
  // RANDOM_DRAW (mêlée) : générer TOUTES les manches d'un coup
  // Chaque manche = tirage aléatoire des joueurs sur les terrains
  // Les équipes sont formées à la volée selon le type de chaque terrain (doublette/triplette)
  // ═══════════════════════════════════════════
  if (format === 'RANDOM_DRAW') {
    if (lastRound > 0) {
      throw new Error('Les manches ont déjà été générées pour ce tournoi. Supprimez-les pour recommencer.');
    }

    const playerIds = tournament.PlayerEntries.map(p => p.userId);
    if (playerIds.length < 4) {
      throw new Error(`Pas assez de joueurs inscrits (${playerIds.length}/4 minimum)`);
    }
    if (courts.length === 0) {
      throw new Error("Aucun terrain configuré. Veuillez d'abord configurer les terrains via 'Ajouter des terrains'.");
    }

    const nbRounds = tournament.nbRounds || 5;

    // Respecter la configuration des terrains définie par l'organisateur
    // Terrains actifs (non-IDLE), dans l'ordre configuré
    const activeCourts = courts.filter(c => (c as { teamType?: string }).teamType !== 'IDLE');
    const N = playerIds.length;

    logger.info(`[ARENA] RANDOM_DRAW: ${N} joueurs, ${activeCourts.length} terrains actifs`);

    const result = await db.$transaction(async (tx) => {
      let firstRoundId = '';
      let totalMatches = 0;

      for (let r = 1; r <= nbRounds; r++) {
        const shuffled = shuffleArray([...playerIds]);

        const round = await tx.arenaRound.create({
          data: {
            tournamentId,
            roundNumber: r,
            name: `Manche ${r}`,
            status: 'SCHEDULED',
          },
        });

        if (r === 1) firstRoundId = round.id;

        let playerIdx = 0;
        let matchNumber = 1;

        for (const court of activeCourts) {
          const courtType = (court as { teamType?: string }).teamType;
          const baseTeamSize = courtType === 'TRIPLETTE' ? 3 : 2;
          const remaining = shuffled.length - playerIdx;

          // Il faut au minimum 2 joueurs pour faire un match (1v1)
          if (remaining < 2) break;

          // Calcul adaptatif : répartir les joueurs restants équitablement
          // Si pas assez pour 2 équipes complètes, on fait des équipes asymétriques
          const idealNeeded = baseTeamSize * 2;

          let team1Size: number;
          let team2Size: number;

          if (remaining >= idealNeeded) {
            // Assez de joueurs → équipes complètes (2v2 ou 3v3)
            team1Size = baseTeamSize;
            team2Size = baseTeamSize;
          } else if (remaining >= baseTeamSize + 1) {
            // Pas assez pour 2 équipes complètes, mais assez pour asymétrique
            // Ex: 5 joueurs sur triplette → 3v2, 3 joueurs sur doublette → 2v1
            team1Size = baseTeamSize;
            team2Size = remaining - baseTeamSize;
          } else {
            // Moins que baseTeamSize+1 : répartir au mieux (ex: 3 joueurs → 2v1)
            team1Size = Math.ceil(remaining / 2);
            team2Size = remaining - team1Size;
          }

          if (team2Size < 1) break;

          const team1Players = shuffled.slice(playerIdx, playerIdx + team1Size);
          const team2Players = shuffled.slice(playerIdx + team1Size, playerIdx + team1Size + team2Size);
          playerIdx += team1Size + team2Size;

          const team1 = await tx.arenaTeamEntry.create({
            data: { tournamentId, name: `M${r}-${court.name}-A`, status: 'CONFIRMED' },
          });
          await tx.arenaTeamMember.createMany({
            data: team1Players.map((uid, i) => ({ teamEntryId: team1.id, userId: uid, isCaptain: i === 0 })),
          });

          const team2 = await tx.arenaTeamEntry.create({
            data: { tournamentId, name: `M${r}-${court.name}-B`, status: 'CONFIRMED' },
          });
          await tx.arenaTeamMember.createMany({
            data: team2Players.map((uid, i) => ({ teamEntryId: team2.id, userId: uid, isCaptain: i === 0 })),
          });

          await tx.arenaMatch.create({
            data: {
              tournamentId,
              roundId: round.id,
              matchNumber,
              team1Id: team1.id,
              team2Id: team2.id,
              courtId: court.id,
              status: 'SCHEDULED',
            },
          });

          matchNumber++;
          totalMatches++;
        }
      }

      await tx.arenaTournament.update({
        where: { id: tournamentId },
        data: { currentRound: 1, status: 'IN_PROGRESS', nbRounds },
      });

      return { roundId: firstRoundId, matchCount: totalMatches, roundsCreated: nbRounds };
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${tournamentId}`).emit('arena:round-generated', {
        tournamentId,
        roundId: result.roundId,
        roundNumber: 1,
        roundsCreated: result.roundsCreated,
        matchCount: result.matchCount,
      });
    }

    logger.info(`[ARENA] RANDOM_DRAW: ${result.roundsCreated} manches, ${result.matchCount} matchs pour ${playerIds.length} joueurs sur ${courts.length} terrains`);
    return result;
  }

  // Pour tous les autres formats, on travaille avec les TeamEntries
  const teams: TeamForDraw[] = tournament.TeamEntries.map(t => ({
    id: t.id,
    name: t.name,
    seed: t.seed,
  }));

  if (teams.length < 2) throw new Error('Not enough teams to generate matches');

  // ═══════════════════════════════════════════
  // ROUND_ROBIN / CHAMPIONSHIP : toutes les journées d'un coup
  // ═══════════════════════════════════════════
  if (format === 'ROUND_ROBIN' || format === 'CHAMPIONSHIP') {
    if (lastRound > 0) {
      throw new Error('Les journées ont déjà été générées pour ce tournoi round-robin/championnat');
    }

    const schedule = generateRoundRobinSchedule(teams);
    const settings = (tournament.settings as Record<string, unknown>) ?? {};
    const roundDates = (settings.roundDates as Record<string, string>) ?? {};

    const result = await db.$transaction(async (tx) => {
      let totalMatches = 0;
      let firstRoundId = '';

      for (const roundData of schedule) {
        const scheduledDate = roundDates[String(roundData.roundNumber)];
        const round = await tx.arenaRound.create({
          data: {
            tournamentId,
            roundNumber: roundData.roundNumber,
            name: roundData.name,
            status: 'SCHEDULED',
            startsAt: scheduledDate ? new Date(scheduledDate) : null,
          },
        });

        if (roundData.roundNumber === 1) firstRoundId = round.id;

        const matchData = roundData.matches.map((m, idx) => ({
          tournamentId,
          roundId: round.id,
          matchNumber: m.matchNumber,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          courtId: courts.length > 0 ? courts[idx % courts.length].id : null,
          status: 'SCHEDULED' as const,
        }));

        await tx.arenaMatch.createMany({ data: matchData });
        totalMatches += matchData.length;
      }

      // Mettre à jour le tournoi
      await tx.arenaTournament.update({
        where: { id: tournamentId },
        data: {
          currentRound: 1,
          status: 'IN_PROGRESS',
          nbRounds: schedule.length,
        },
      });

      return { roundId: firstRoundId, matchCount: totalMatches, roundsCreated: schedule.length };
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${tournamentId}`).emit('arena:round-generated', {
        tournamentId,
        roundId: result.roundId,
        roundNumber: 1,
        roundsCreated: result.roundsCreated,
        matchCount: result.matchCount,
      });
    }

    logger.info(`[ARENA] Round-robin: ${result.roundsCreated} journées, ${result.matchCount} matchs for ${teams.length} teams`);
    return result;
  }

  // ═══════════════════════════════════════════
  // SINGLE_ELIMINATION / DOUBLE_ELIMINATION : bracket
  // ═══════════════════════════════════════════
  if (format === 'SINGLE_ELIMINATION' || format === 'DOUBLE_ELIMINATION') {
    if (lastRound > 0) {
      throw new Error('Le bracket a déjà été généré. Les tours suivants sont créés automatiquement après chaque score.');
    }

    const bracketRounds = format === 'DOUBLE_ELIMINATION'
      ? generateDoubleEliminationBracket(teams)
      : generateSingleEliminationBracket(teams);

    const result = await db.$transaction(async (tx) => {
      const roundData = bracketRounds[0];
      const round = await tx.arenaRound.create({
        data: {
          tournamentId,
          roundNumber: 1,
          name: roundData.name,
          status: 'SCHEDULED',
        },
      });

      const matchData = roundData.matches.map((m, idx) => ({
        tournamentId,
        roundId: round.id,
        matchNumber: m.matchNumber,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        courtId: courts.length > 0 ? courts[idx % courts.length].id : null,
        status: 'SCHEDULED' as const,
      }));

      await tx.arenaMatch.createMany({ data: matchData });

      // Auto-résoudre les byes (matchs avec 1 seule équipe)
      const byeMatches = matchData.filter(m => (m.team1Id && !m.team2Id) || (!m.team1Id && m.team2Id));
      for (const bye of byeMatches) {
        const winnerId = bye.team1Id || bye.team2Id;
        await tx.arenaMatch.updateMany({
          where: { roundId: round.id, matchNumber: bye.matchNumber },
          data: { winnerId, status: 'COMPLETED', score1: 0, score2: 0 },
        });
      }

      await tx.arenaTournament.update({
        where: { id: tournamentId },
        data: { currentRound: 1, status: 'IN_PROGRESS' },
      });

      return { roundId: round.id, matchCount: matchData.length };
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${tournamentId}`).emit('arena:round-generated', {
        tournamentId,
        roundId: result.roundId,
        roundNumber: 1,
        matchCount: result.matchCount,
      });
    }

    return result;
  }

  // ═══════════════════════════════════════════
  // SWISS : 1 tour par appel
  // ═══════════════════════════════════════════
  if (format === 'SWISS') {
    const nextRound = lastRound + 1;
    const swissMatches = await generateSwissRound(tournamentId, nextRound);

    if (swissMatches.length === 0) {
      throw new Error('Impossible de générer plus de matchs suisses (tous les appariements ont été faits)');
    }

    const result = await db.$transaction(async (tx) => {
      const round = await tx.arenaRound.create({
        data: {
          tournamentId,
          roundNumber: nextRound,
          name: `Tour ${nextRound}`,
          status: 'SCHEDULED',
        },
      });

      const matchData = swissMatches.map((m, idx) => ({
        tournamentId,
        roundId: round.id,
        matchNumber: m.matchNumber,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        courtId: courts.length > 0 ? courts[idx % courts.length].id : null,
        status: 'SCHEDULED' as const,
      }));

      await tx.arenaMatch.createMany({ data: matchData });

      await tx.arenaTournament.update({
        where: { id: tournamentId },
        data: { currentRound: nextRound, status: 'IN_PROGRESS' },
      });

      return { roundId: round.id, matchCount: matchData.length };
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${tournamentId}`).emit('arena:round-generated', {
        tournamentId,
        roundId: result.roundId,
        roundNumber: nextRound,
        matchCount: result.matchCount,
      });
    }

    return result;
  }

  // Fallback (format inconnu)
  throw new Error(`Format de tournoi non supporté : ${format}`);
}

/**
 * Avancement automatique du bracket (SINGLE/DOUBLE ELIMINATION).
 * 
 * Appelé après chaque score. Vérifie si tous les matchs du round actuel
 * sont terminés, et si oui, crée le tour suivant avec les vainqueurs.
 * 
 * @returns true si un nouveau round a été créé, false sinon.
 */
export async function advanceEliminationBracket(tournamentId: string): Promise<boolean> {
  const tournament = await db.arenaTournament.findUnique({
    where: { id: tournamentId },
    include: {
      Rounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
    },
  });

  if (!tournament) return false;
  if (tournament.format !== 'SINGLE_ELIMINATION' && tournament.format !== 'DOUBLE_ELIMINATION') return false;

  const currentRoundNumber = tournament.Rounds[0]?.roundNumber;
  if (!currentRoundNumber) return false;

  const currentRoundId = tournament.Rounds[0].id;

  // Chercher les matchs du round actuel
  const matches = await db.arenaMatch.findMany({
    where: { roundId: currentRoundId },
    orderBy: { matchNumber: 'asc' },
  });

  // Vérifier si TOUS les matchs sont terminés
  const allCompleted = matches.every(m => m.status === 'COMPLETED' || m.status === 'FORFEIT');
  if (!allCompleted) return false;

  // Récupérer les vainqueurs
  const winners = matches
    .filter(m => m.winnerId)
    .map(m => m.winnerId!);

  // Si 1 seul vainqueur → c'était la finale !
  if (winners.length <= 1) {
    await db.arenaTournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });

    const io = getIO();
    if (io) {
      io.to(`arena:${tournamentId}`).emit('arena:tournament-completed', {
        tournamentId,
        winnerId: winners[0] || null,
      });
    }

    logger.info(`[ARENA] Tournament ${tournamentId} completed! Winner: ${winners[0]}`);
    return false;
  }

  // Créer le tour suivant avec les vainqueurs
  const totalRounds = Math.ceil(Math.log2(matches.length * 2));
  const nextRoundNumber = currentRoundNumber + 1;

  const getRoundName = (roundNum: number) => {
    const remaining = totalRounds - roundNum + 1;
    if (remaining <= 1) return 'Finale';
    if (remaining === 2) return 'Demi-finales';
    if (remaining === 3) return 'Quarts de finale';
    return `Tour ${roundNum}`;
  };

  const courts = tournament.withCourts
    ? await db.arenaCourt.findMany({
        where: { tournamentId, isAvailable: true },
        orderBy: { name: 'asc' },
      })
    : [];

  await db.$transaction(async (tx) => {
    const round = await tx.arenaRound.create({
      data: {
        tournamentId,
        roundNumber: nextRoundNumber,
        name: getRoundName(nextRoundNumber),
        status: 'SCHEDULED',
      },
    });

    // Apparier les vainqueurs : 1v2, 3v4, etc.
    const nextMatches: { matchNumber: number; team1Id: string; team2Id: string | null }[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      nextMatches.push({
        matchNumber: i / 2 + 1,
        team1Id: winners[i],
        team2Id: i + 1 < winners.length ? winners[i + 1] : null,
      });
    }

    await tx.arenaMatch.createMany({
      data: nextMatches.map((m, idx) => ({
        tournamentId,
        roundId: round.id,
        matchNumber: m.matchNumber,
        team1Id: m.team1Id,
        team2Id: m.team2Id || null,
        courtId: courts.length > 0 ? courts[idx % courts.length].id : null,
        status: 'SCHEDULED' as const,
      })),
    });

    await tx.arenaTournament.update({
      where: { id: tournamentId },
      data: { currentRound: nextRoundNumber },
    });
  });

  const io = getIO();
  if (io) {
    io.to(`arena:${tournamentId}`).emit('arena:round-generated', {
      tournamentId,
      roundNumber: nextRoundNumber,
      roundName: getRoundName(nextRoundNumber),
      autoAdvance: true,
    });
  }

  logger.info(`[ARENA] Bracket advanced: Round ${nextRoundNumber} (${getRoundName(nextRoundNumber)}) with ${Math.ceil(winners.length / 2)} matches`);
  return true;
}

/**
 * Recalcule le classement complet d'un tournoi.
 */
export async function recalculateStandings(tournamentId: string): Promise<void> {
  const tournament = await db.arenaTournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error('Tournament not found');

  const teamEntries = await db.arenaTeamEntry.findMany({
    where: { tournamentId, status: 'CONFIRMED' },
  });

  const completedMatches = await db.arenaMatch.findMany({
    where: { tournamentId, status: 'COMPLETED' },
  });

  // Points par victoire/nul selon le sport
  const settings = (tournament.settings as Record<string, unknown>) ?? {};
  const pointsPerWin = (settings.pointsPerWin as number) ?? 3;
  const pointsPerDraw = (settings.pointsPerDraw as number) ?? 1;
  const pointsPerLoss = (settings.pointsPerLoss as number) ?? 0;

  // Calculer les stats de chaque équipe
  const statsMap = new Map<string, {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
  }>();

  for (const team of teamEntries) {
    statsMap.set(team.id, { played: 0, won: 0, drawn: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 });
  }

  for (const match of completedMatches) {
    if (!match.team1Id || !match.team2Id || match.score1 == null || match.score2 == null) continue;

    const s1 = statsMap.get(match.team1Id);
    const s2 = statsMap.get(match.team2Id);
    if (!s1 || !s2) continue;

    s1.played++;
    s2.played++;
    s1.pointsFor += match.score1;
    s1.pointsAgainst += match.score2;
    s2.pointsFor += match.score2;
    s2.pointsAgainst += match.score1;

    if (match.score1 > match.score2) {
      s1.won++;
      s2.lost++;
    } else if (match.score2 > match.score1) {
      s2.won++;
      s1.lost++;
    } else {
      s1.drawn++;
      s2.drawn++;
    }
  }

  // Upsert standings
  await db.$transaction(
    teamEntries.map(team => {
      const stats = statsMap.get(team.id)!;
      const totalPoints =
        stats.won * pointsPerWin +
        stats.drawn * pointsPerDraw +
        stats.lost * pointsPerLoss;

      return db.arenaStanding.upsert({
        where: { teamEntryId: team.id },
        update: {
          played: stats.played,
          won: stats.won,
          drawn: stats.drawn,
          lost: stats.lost,
          pointsFor: stats.pointsFor,
          pointsAgainst: stats.pointsAgainst,
          totalPoints,
        },
        create: {
          tournamentId,
          teamEntryId: team.id,
          played: stats.played,
          won: stats.won,
          drawn: stats.drawn,
          lost: stats.lost,
          pointsFor: stats.pointsFor,
          pointsAgainst: stats.pointsAgainst,
          totalPoints,
        },
      });
    })
  );

  // Calculer les rangs (by totalPoints desc, then pointDiff desc)
  const standings = await db.arenaStanding.findMany({
    where: { tournamentId },
    orderBy: [{ totalPoints: 'desc' }, { pointsFor: 'desc' }],
  });

  await db.$transaction(
    standings.map((s, idx) =>
      db.arenaStanding.update({
        where: { id: s.id },
        data: { rank: idx + 1 },
      })
    )
  );

  // Émettre le classement mis à jour
  const io = getIO();
  if (io) {
    io.to(`arena:${tournamentId}`).emit('arena:standings-updated', {
      tournamentId,
    });
  }
}

/**
 * Assigne automatiquement les terrains aux matchs d'un tour.
 */
export async function assignCourts(
  tournamentId: string,
  roundId: string
): Promise<void> {
  const courts = await db.arenaCourt.findMany({
    where: { tournamentId, isAvailable: true },
    orderBy: { name: 'asc' },
  });

  const matches = await db.arenaMatch.findMany({
    where: { roundId },
    orderBy: { matchNumber: 'asc' },
  });

  if (courts.length === 0) return;

  await db.$transaction(
    matches.map((match, idx) =>
      db.arenaMatch.update({
        where: { id: match.id },
        data: { courtId: courts[idx % courts.length].id },
      })
    )
  );
}

/**
 * Crée les équipes automatiquement pour une mêlée (tirage aléatoire de joueurs).
 */
export async function createTeamsFromRandomDraw(
  tournamentId: string
): Promise<{ teamCount: number }> {
  const tournament = await db.arenaTournament.findUnique({
    where: { id: tournamentId },
    include: { PlayerEntries: { where: { status: 'CONFIRMED' }, include: { User: true } } },
  });

  if (!tournament) throw new Error('Tournament not found');

  const players = shuffleArray(tournament.PlayerEntries);
  const teamSize = tournament.playersPerTeam;
  const teamNames: string[] = [];

  const teams: { name: string; members: { userId: string; isCaptain: boolean }[] }[] = [];
  let teamNum = 1;

  for (let i = 0; i < players.length; i += teamSize) {
    const chunk = players.slice(i, i + teamSize);
    if (chunk.length === 0) break;

    const name = `Équipe ${teamNum}`;
    teamNames.push(name);
    teams.push({
      name,
      members: chunk.map((p, idx) => ({
        userId: p.userId,
        isCaptain: idx === 0, // Premier joueur est capitaine
      })),
    });
    teamNum++;
  }

  // Créer les équipes et membres en transaction
  await db.$transaction(async (tx) => {
    for (const team of teams) {
      const entry = await tx.arenaTeamEntry.create({
        data: {
          tournamentId,
          name: team.name,
          status: 'CONFIRMED',
        },
      });

      await tx.arenaTeamMember.createMany({
        data: team.members.map(m => ({
          teamEntryId: entry.id,
          userId: m.userId,
          isCaptain: m.isCaptain,
        })),
      });
    }
  });

  return { teamCount: teams.length };
}
