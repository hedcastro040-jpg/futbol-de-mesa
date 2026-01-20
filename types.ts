

export interface Vector {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vector;
  vel: Vector;
  radius: number;
}

export interface PlayerConfig {
  offsetY: number; // Offset from the center of the rod (0 is center)
  color: string;
}

export interface Rod {
  id: number;
  isPlayer: boolean; // True = Human (Left), False = AI (Right)
  role: 'goalie' | 'defense' | 'midfield' | 'attack';
  x: number; // Horizontal position on board
  y: number; // Current vertical displacement of the rod
  targetY: number; // For smooth movement
  players: PlayerConfig[];
  isSpinning: boolean;
  spinAngle: number; // 0 to 360
}

export type GameMode = 'arcade' | 'worldcup' | 'league' | 'penalties';

export interface Team {
  id: string;
  name: string;
  code: string; // 3 letter code
  primaryColor: string;
  secondaryColor: string;
}

export interface LeagueStats {
  team: Team; // Link stats to a specific team
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

export type PenaltyResult = 'goal' | 'miss' | 'pending';

export interface GameState {
  status: 'menu' | 'teamSelect' | 'nextLevel' | 'playing' | 'halftime' | 'gameover' | 'victory' | 'leagueTable';
  mode: GameMode;
  scorePlayer: number;
  scoreAI: number;
  ballsPlayed: number; // Used for Arcade Mode
  timeLeft: number;    // Used for World Cup Mode (in seconds)
  half: 1 | 2;         // Used for World Cup Mode (Only 1 half now)
  winner: 'player' | 'ai' | 'draw' | null;
  playerTeam?: Team;   // Selected team for player
  aiTeam?: Team;       // Selected team for AI
  tournamentRound: number; // 0=Qualifiers, 1=Quarters, 2=Semis, 3=Final
  leagueTable?: LeagueStats[]; // Full table of all teams
  penaltyTurn?: 'player' | 'ai'; // NEW: Tracks whose turn it is to kick in penalties
  previousMode?: GameMode | null; // NEW: To return after penalties in a tournament
  penaltyResults?: {
    player: PenaltyResult[];
    ai: PenaltyResult[];
  };
}
