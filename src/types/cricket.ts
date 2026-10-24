/**
 * GullyScore Cricket Domain Types & Data Contracts
 */

export type UserRole = 'spectator' | 'organizer' | 'scorer' | 'admin';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type PlayerRole = 'batter' | 'bowler' | 'allRounder' | 'wicketKeeper';
export type BattingStyle = 'right' | 'left';
export type BowlingStyle = 'pace' | 'spin' | 'none';

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  ownerId: string;
  matches: number;
  runs: number;
  highestScore: number;
  wickets: number;
  fours: number;
  sixes: number;
  bestBowlingRuns?: number;
  bestBowlingWickets?: number;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  city: string;
  description?: string;
  primaryColor: string;
  homeVenue?: string;
  captainId?: string;
  viceCaptainId?: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed / aggregated
  matchesPlayed?: number;
  matchesWon?: number;
  matchesLost?: number;
}

export interface MatchRules {
  overs: number; // e.g. 5, 8, 10, 12, 15, 20
  playersPerTeam: number; // default 11, box/gully 6-10
  wideRuns: number; // 1
  noBallRuns: number; // 1
  freeHitOnNoBall: boolean;
  lbwAllowed: boolean; // Many street cricket rules don't use LBW
  maxOversPerBowler: number;
}

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'abandoned' | 'cancelled';
export type TossDecision = 'bat' | 'bowl';

export interface MatchTeamSquad {
  id: string;
  name: string;
  shortCode: string;
  playingXI: string[]; // Player IDs in playing order
}

export interface TossDetails {
  winnerTeamId: string;
  decision: TossDecision;
}

export interface MatchResult {
  winnerTeamId?: string;
  margin?: string;
  resultType: 'win_runs' | 'win_wickets' | 'tie' | 'super_over' | 'abandoned' | 'no_result';
  summary: string;
}

export interface BatterScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalText?: string; // e.g. "b Bumrah", "c Kohli b Shami", "not out"
  dismissalType?: string;
  bowlerId?: string;
  fielderName?: string;
}

export interface BowlerFigure {
  playerId: string;
  name: string;
  overs: string; // e.g. "2.4"
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string;
  playerId: string;
  playerName: string;
}

export interface Partnership {
  runs: number;
  balls: number;
  batter1Id: string;
  batter2Id: string;
}

export interface InningsExtras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
  total: number;
}

export interface InningsData {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  legalBalls: number;
  oversLimit: number;
  oversCompleted: string; // e.g. "3.2"
  extras: InningsExtras;
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  currentBowlerId?: string;
  battingScorecard: Record<string, BatterScore>;
  bowlingScorecard: Record<string, BowlerFigure>;
  fallOfWickets: FallOfWicket[];
  isCompleted: boolean;
  target?: number; // Target for innings 2
  updatedAt: string;
}

export type ExtraType = 'wide' | 'noBall' | 'bye' | 'legBye' | 'penalty';
export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'runOut'
  | 'lbw'
  | 'stumped'
  | 'hitWicket'
  | 'retiredOut'
  | 'retiredHurt';

export interface BallDismissal {
  type: DismissalType;
  playerOutId: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  runsCompletedBeforeOut?: number; // for run-outs
}

export interface BallEvent {
  id: string;
  matchId: string;
  inningsId: string;
  sequenceNumber: number;
  overNumber: number; // 0-indexed over: 0 = 1st over
  ballInOver: number; // 1 to 6 (legal balls only)
  legalBall: boolean;
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  runsBat: number;
  extras?: {
    type?: ExtraType;
    runs: number;
  };
  dismissal?: BallDismissal;
  totalRunsOnBall: number;
  comment?: string;
  scorerId: string;
  timestamp: string;
  isUndone?: boolean;
}

export interface Match {
  id: string;
  title: string;
  tournamentId?: string;
  venue: string;
  scheduledDate: string;
  rules: MatchRules;
  status: MatchStatus;
  teamA: MatchTeamSquad;
  teamB: MatchTeamSquad;
  toss?: TossDetails;
  currentInnings: 1 | 2;
  innings1Id?: string;
  innings2Id?: string;
  innings1Summary?: {
    totalRuns: number;
    totalWickets: number;
    oversCompleted: string;
  };
  innings2Summary?: {
    totalRuns: number;
    totalWickets: number;
    oversCompleted: string;
    target?: number;
  };
  ownerId: string;
  assignedScorerIds: string[];
  isPublic: boolean;
  result?: MatchResult;
  createdAt: string;
  updatedAt: string;
  teamAId?: string;
  teamBId?: string;
  overs?: number;
  playersPerTeam?: number;
}

export type TournamentFormat = 'league' | 'knockout' | 'league_knockout';

export interface TournamentPointsRules {
  win: number;
  tie: number;
  noResult: number;
  loss: number;
}

export interface Tournament {
  id: string;
  name: string;
  city: string;
  venue: string;
  format: TournamentFormat;
  teamCapacity: number;
  pointsRules: TournamentPointsRules;
  teamIds: string[];
  ownerId: string;
  isPublished: boolean;
  status: 'upcoming' | 'ongoing' | 'completed';
  startDate: string;
  endDate?: string;
  description?: string;
  winnerTeamId?: string;
  runnerUpTeamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentStanding {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
  updatedAt: string;
}

export interface Fixture {
  id: string;
  tournamentId: string;
  matchId?: string;
  round: string; // "Round 1", "Quarter-Final", "Semi-Final", "Final"
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  venue: string;
  dateTime: string;
  status: 'scheduled' | 'live' | 'completed';
  winnerTeamId?: string;
  ownerId: string;
}

export interface AuditLog {
  id: string;
  entityId: string;
  action: 'score_correction' | 'ball_undone' | 'match_status_change' | 'manual_override';
  userId: string;
  details: string;
  timestamp: string;
}
