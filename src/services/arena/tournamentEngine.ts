/**
 * Arena Tournament Engine
 * 
 * Moteur de génération de matchs, calcul de classements et gestion des tours.
 * Supporte : tirage aléatoire (mêlée), poules, élimination directe, suisse.
 */

import { db } from '../../lib/database';
import { getIO } from '../../lib/socket';

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
 * Tirage aléatoire simple (mêlée pétanque) :
 * Mélange les équipes et crée des matchs 1v2, 3v4, etc.
 * Si nombre impair, la dernière équipe est "exempt" (bye).
 */
function generateRandomDraw(teams: TeamForDraw[]): GeneratedMatch[] {
  const shuffled = shuffleArray(teams);
  const matches: GeneratedMatch[] = [];
  let matchNumber = 1;

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      matchNumber,
      team1Id: shuffled[i].id,
      team2Id: i + 1 < shuffled.length ? shuffled[i + 1].id : null, // bye
    });
    matchNumber++;
  }

  return matches;
}

/**
 * Poules (round-robin) :
 * Chaque équipe joue contre toutes les autres une fois.
 */
function generateRoundRobin(teams: TeamForDraw[]): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  let matchNumber = 1;

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        matchNumber,
        team1Id: teams[i].id,
        team2Id: teams[j].id,
      });
      matchNumber++;
    }
  }

  return matches;
}

/**
 * Élimination directe :
 * Bracket classique. Si nombre de joueurs pas puissance de 2, 
 * certaines équipes ont un bye au 1er tour.
 */
function generateSingleElimination(teams: TeamForDraw[]): GeneratedMatch[] {
  // Trier par seed si disponible, sinon mélanger
  const sorted = teams.some(t => t.seed != null)
    ? [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
    : shuffleArray(teams);

  // Trouver la puissance de 2 supérieure
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(sorted.length)));
  const byes = bracketSize - sorted.length;

  const matches: GeneratedMatch[] = [];
  let matchNumber = 1;

  // Premier tour avec byes
  const firstRoundTeams = [...sorted];
  // Les équipes en haut du seed obtiennent les byes
  for (let i = 0; i < bracketSize / 2; i++) {
    const team1 = firstRoundTeams[i] || null;
    const team2Idx = bracketSize - 1 - i;
    const team2 = team2Idx < firstRoundTeams.length ? firstRoundTeams[team2Idx] : null;

    // Si une des deux est null, c'est un bye (le match sera auto-résolu)
    if (team1 && team2) {
      matches.push({
        matchNumber,
        team1Id: team1.id,
        team2Id: team2.id,
      });
    } else if (team1) {
      matches.push({
        matchNumber,
        team1Id: team1.id,
        team2Id: null, // bye
      });
    }
    matchNumber++;
  }

  return matches;
}

/**
 * Système suisse :
 * Apparie les équipes par niveau (points similaires).
 * Évite les re-matches.
 */
async function generateSwissRound(
  tournamentId: string,
  roundNumber: number
): Promise<GeneratedMatch[]> {
  // Récupérer les standings actuels
  const standings = await db.arenaStanding.findMany({
    where: { tournamentId },
    orderBy: { totalPoints: 'desc' },
    include: { TeamEntry: true },
  });

  // Récupérer les matchs déjà joués pour éviter les re-matches
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

    // Trouver le meilleur adversaire (points proches, pas encore joué)
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
 * Génère un nouveau tour de matchs pour un tournoi.
 */
export async function generateRound(tournamentId: string): Promise<{
  roundId: string;
  matchCount: number;
}> {
  const tournament = await db.arenaTournament.findUnique({
    where: { id: tournamentId },
    include: {
      TeamEntries: { where: { status: 'CONFIRMED' } },
      Rounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
    },
  });

  if (!tournament) throw new Error('Tournament not found');

  const teams: TeamForDraw[] = tournament.TeamEntries.map(t => ({
    id: t.id,
    name: t.name,
    seed: t.seed,
  }));

  if (teams.length < 2) throw new Error('Not enough teams to generate matches');

  const nextRound = (tournament.Rounds[0]?.roundNumber ?? 0) + 1;

  // Déterminer le nom du tour
  let roundName: string;
  if (tournament.format === 'SINGLE_ELIMINATION' || tournament.format === 'DOUBLE_ELIMINATION') {
    const totalRounds = Math.ceil(Math.log2(teams.length));
    const remaining = totalRounds - nextRound + 1;
    if (remaining === 1) roundName = 'Finale';
    else if (remaining === 2) roundName = 'Demi-finale';
    else if (remaining === 3) roundName = 'Quart de finale';
    else roundName = `Tour ${nextRound}`;
  } else {
    roundName = `Tour ${nextRound}`;
  }

  // Générer les matchs selon le format
  let generatedMatches: GeneratedMatch[];
  switch (tournament.format) {
    case 'RANDOM_DRAW':
      generatedMatches = generateRandomDraw(teams);
      break;
    case 'ROUND_ROBIN':
      if (nextRound === 1) {
        generatedMatches = generateRoundRobin(teams);
      } else {
        throw new Error('Round-robin generates all matches in round 1');
      }
      break;
    case 'SINGLE_ELIMINATION':
      generatedMatches = generateSingleElimination(teams);
      break;
    case 'SWISS':
      generatedMatches = await generateSwissRound(tournamentId, nextRound);
      break;
    default:
      generatedMatches = generateRandomDraw(teams);
  }

  // Récupérer les terrains disponibles pour assignation automatique
  const courts = tournament.withCourts
    ? await db.arenaCourt.findMany({
        where: { tournamentId, isAvailable: true },
        orderBy: { name: 'asc' },
      })
    : [];

  // Créer le tour et les matchs dans une transaction
  const result = await db.$transaction(async (tx) => {
    const round = await tx.arenaRound.create({
      data: {
        tournamentId,
        roundNumber: nextRound,
        name: roundName,
        status: 'SCHEDULED',
      },
    });

    const matchData = generatedMatches.map((m, idx) => ({
      tournamentId,
      roundId: round.id,
      matchNumber: m.matchNumber,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      courtId: courts[idx % courts.length]?.id ?? null, // Assignation cyclique des terrains
      status: 'SCHEDULED' as const,
    }));

    await tx.arenaMatch.createMany({ data: matchData });

    // Mettre à jour le tour courant du tournoi
    await tx.arenaTournament.update({
      where: { id: tournamentId },
      data: { currentRound: nextRound, status: 'IN_PROGRESS' },
    });

    return { roundId: round.id, matchCount: matchData.length };
  });

  // Émettre via Socket.IO
  const io = getIO();
  if (io) {
    io.to(`arena:${tournamentId}`).emit('arena:round-generated', {
      tournamentId,
      roundId: result.roundId,
      roundNumber: nextRound,
      roundName,
      matchCount: result.matchCount,
    });
  }

  return result;
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
