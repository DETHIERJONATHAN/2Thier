/**
 * 🏟️ Configuration sportive pour Arena
 * 
 * Chaque sport a ses propres :
 * - Types d'équipe disponibles
 * - Formats de tournoi pertinents
 * - Valeurs par défaut (joueurs par équipe, points pour gagner, durée, etc.)
 * - Champs à afficher dans le formulaire
 * - Terminologie (manches → mi-temps, sets, etc.)
 */

export interface SportConfig {
  key: string;
  /** Types d'équipe disponibles pour ce sport */
  teamTypes: string[];
  /** Formats de tournoi pertinents */
  formats: string[];
  /** Valeurs par défaut */
  defaults: {
    teamType: string;
    playersPerTeam: number;
    pointsToWin: number | null;
    nbRounds: number;
    format: string;
    /** Durée d'un match en minutes (null = pas de durée, on joue au score) */
    matchDuration: number | null;
    /** Nombre de sets/mi-temps/manches par match */
    periods: number | null;
    /** Mode de scoring : 'points' = premier à X points | 'goals' = buts | 'sets' = sets gagnants */
    scoringMode: 'points' | 'goals' | 'sets' | 'time';
  };
  /** Champs visibles dans le formulaire */
  fields: {
    teamType: boolean;
    playersPerTeam: boolean;
    pointsToWin: boolean;
    nbRounds: boolean;
    matchDuration: boolean;
    periods: boolean;
    allowMixedTeams: boolean;
    withCourts: boolean;
  };
  /** Clé i18n pour la terminologie spécifique */
  terminology: {
    /** Clé i18n pour "round" singular */
    roundKey: string;
    /** Clé i18n pour "rounds" plural (label du formulaire) */
    roundsLabel: string;
    /** Clé i18n pour "court" / "terrain" / "pitch" */
    courtKey: string;
    /** Clé i18n pour le champ score dans le formulaire */
    scoreKey: string;
    /** Clé i18n pour "team" type */
    teamTypeKey: string;
  };
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  petanque: {
    key: 'petanque',
    teamTypes: ['SOLO', 'DOUBLETTE', 'TRIPLETTE', 'QUADRETTE'],
    formats: ['RANDOM_DRAW', 'ROUND_ROBIN', 'SINGLE_ELIMINATION', 'SWISS', 'CHAMPIONSHIP'],
    defaults: {
      teamType: 'DOUBLETTE',
      playersPerTeam: 2,
      pointsToWin: 13,
      nbRounds: 5,
      format: 'RANDOM_DRAW',
      matchDuration: null,
      periods: null,
      scoringMode: 'points',
    },
    fields: {
      teamType: true,
      playersPerTeam: false, // auto-calculé depuis teamType
      pointsToWin: true,
      nbRounds: true,
      matchDuration: false,
      periods: false,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.round',
      roundsLabel: 'arena.rounds',
      courtKey: 'arena.court',
      scoreKey: 'arena.pointsToWin',
      teamTypeKey: 'arena.teamType',
    },
  },

  football: {
    key: 'football',
    teamTypes: ['CUSTOM'],
    formats: ['ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'CHAMPIONSHIP'],
    defaults: {
      teamType: 'CUSTOM',
      playersPerTeam: 11,
      pointsToWin: null,
      nbRounds: 1,
      format: 'ROUND_ROBIN',
      matchDuration: 90,
      periods: 2,
      scoringMode: 'goals',
    },
    fields: {
      teamType: false,
      playersPerTeam: true,
      pointsToWin: false,
      nbRounds: false,
      matchDuration: true,
      periods: true,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.matchDay',
      roundsLabel: 'arena.matchDays',
      courtKey: 'arena.pitch',
      scoreKey: 'arena.goals',
      teamTypeKey: 'arena.squadSize',
    },
  },

  basketball: {
    key: 'basketball',
    teamTypes: ['CUSTOM'],
    formats: ['ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'CHAMPIONSHIP'],
    defaults: {
      teamType: 'CUSTOM',
      playersPerTeam: 5,
      pointsToWin: null,
      nbRounds: 1,
      format: 'SINGLE_ELIMINATION',
      matchDuration: 40,
      periods: 4,
      scoringMode: 'goals',
    },
    fields: {
      teamType: false,
      playersPerTeam: true,
      pointsToWin: false,
      nbRounds: true,
      matchDuration: true,
      periods: true,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.round',
      roundsLabel: 'arena.rounds',
      courtKey: 'arena.court',
      scoreKey: 'arena.goals',
      teamTypeKey: 'arena.squadSize',
    },
  },

  volleyball: {
    key: 'volleyball',
    teamTypes: ['CUSTOM'],
    formats: ['ROUND_ROBIN', 'SINGLE_ELIMINATION', 'CHAMPIONSHIP'],
    defaults: {
      teamType: 'CUSTOM',
      playersPerTeam: 6,
      pointsToWin: 25,
      nbRounds: 1,
      format: 'ROUND_ROBIN',
      matchDuration: null,
      periods: 3,
      scoringMode: 'sets',
    },
    fields: {
      teamType: false,
      playersPerTeam: true,
      pointsToWin: true,
      nbRounds: true,
      matchDuration: false,
      periods: true,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.round',
      roundsLabel: 'arena.rounds',
      courtKey: 'arena.court',
      scoreKey: 'arena.pointsPerSet',
      teamTypeKey: 'arena.squadSize',
    },
  },

  tennis: {
    key: 'tennis',
    teamTypes: ['SOLO', 'DOUBLETTE'],
    formats: ['SINGLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS'],
    defaults: {
      teamType: 'SOLO',
      playersPerTeam: 1,
      pointsToWin: null,
      nbRounds: 3,
      format: 'SINGLE_ELIMINATION',
      matchDuration: null,
      periods: 3,
      scoringMode: 'sets',
    },
    fields: {
      teamType: true,
      playersPerTeam: false,
      pointsToWin: false,
      nbRounds: true,
      matchDuration: false,
      periods: true,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.round',
      roundsLabel: 'arena.rounds',
      courtKey: 'arena.court',
      scoreKey: 'arena.setsToWin',
      teamTypeKey: 'arena.teamType',
    },
  },

  badminton: {
    key: 'badminton',
    teamTypes: ['SOLO', 'DOUBLETTE'],
    formats: ['SINGLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS'],
    defaults: {
      teamType: 'SOLO',
      playersPerTeam: 1,
      pointsToWin: 21,
      nbRounds: 3,
      format: 'SINGLE_ELIMINATION',
      matchDuration: null,
      periods: 3,
      scoringMode: 'points',
    },
    fields: {
      teamType: true,
      playersPerTeam: false,
      pointsToWin: true,
      nbRounds: true,
      matchDuration: false,
      periods: true,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.round',
      roundsLabel: 'arena.rounds',
      courtKey: 'arena.court',
      scoreKey: 'arena.pointsToWin',
      teamTypeKey: 'arena.teamType',
    },
  },

  other: {
    key: 'other',
    teamTypes: ['SOLO', 'DOUBLETTE', 'TRIPLETTE', 'QUADRETTE', 'CUSTOM'],
    formats: ['RANDOM_DRAW', 'ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'SWISS', 'CHAMPIONSHIP'],
    defaults: {
      teamType: 'CUSTOM',
      playersPerTeam: 5,
      pointsToWin: null,
      nbRounds: 3,
      format: 'ROUND_ROBIN',
      matchDuration: null,
      periods: null,
      scoringMode: 'goals',
    },
    fields: {
      teamType: true,
      playersPerTeam: true,
      pointsToWin: true,
      nbRounds: true,
      matchDuration: true,
      periods: true,
      allowMixedTeams: true,
      withCourts: true,
    },
    terminology: {
      roundKey: 'arena.round',
      roundsLabel: 'arena.rounds',
      courtKey: 'arena.court',
      scoreKey: 'arena.pointsToWin',
      teamTypeKey: 'arena.teamType',
    },
  },
};

/** Team type → fixed player count mapping (for sports like pétanque) */
export const TEAM_TYPE_SIZES: Record<string, number> = {
  SOLO: 1,
  DOUBLETTE: 2,
  TRIPLETTE: 3,
  QUADRETTE: 4,
};

/** Get config for a sport, fallback to 'other' */
export const getSportConfig = (sport: string): SportConfig =>
  SPORT_CONFIGS[sport] || SPORT_CONFIGS.other;
