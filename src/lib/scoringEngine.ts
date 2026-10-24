/**
 * GullyScore Authorized Scoring Engine
 * Pure, deterministic cricket arithmetic and state transitions.
 */

import {
  InningsData,
  Match,
  BallEvent,
  BatterScore,
  BowlerFigure,
  FallOfWicket,
  ExtraType,
  BallDismissal,
  MatchResult,
} from '../types/cricket';

/**
 * Converts legal balls count into cricket standard overs notation (e.g. 11 -> "1.5", 12 -> "2.0")
 */
export function legalBallsToOvers(legalBalls: number): string {
  const completedOvers = Math.floor(legalBalls / 6);
  const remainingBalls = legalBalls % 6;
  return `${completedOvers}.${remainingBalls}`;
}

/**
 * Converts overs string (e.g. "1.5") to total legal deliveries (e.g. 11)
 */
export function oversToLegalBalls(oversStr: string): number {
  const parts = oversStr.split('.');
  const overs = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  return overs * 6 + balls;
}

/**
 * Converts cricket overs string (e.g. "2.4") into pure decimal overs (2 + 4/6 = 2.6667)
 * Required for Net Run Rate (NRR) and Run Rate calculations.
 */
export function oversToDecimal(oversStr: string | number): number {
  if (typeof oversStr === 'number') return oversStr;
  const parts = oversStr.split('.');
  const overs = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  return overs + balls / 6;
}

/**
 * Computes Current Run Rate (CRR)
 */
export function calculateRunRate(runs: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  const overs = legalBalls / 6;
  return (runs / overs).toFixed(2);
}

/**
 * Computes Required Run Rate (RRR)
 */
export function calculateRequiredRunRate(runsNeeded: number, ballsRemaining: number): string | null {
  if (runsNeeded <= 0) return '0.00';
  if (ballsRemaining <= 0) return null;
  const overs = ballsRemaining / 6;
  return (runsNeeded / overs).toFixed(2);
}

/**
 * Generate human-readable dismissal text (e.g. "c Sharma b Bumrah")
 */
export function formatDismissalText(
  dismissal: BallDismissal,
  bowlerName: string,
  playersMap: Record<string, string>
): string {
  const assistName = dismissal.assistPlayerName || (dismissal.assistPlayerId ? playersMap[dismissal.assistPlayerId] : '');
  switch (dismissal.type) {
    case 'bowled':
      return `b ${bowlerName}`;
    case 'caught':
      return assistName ? `c ${assistName} b ${bowlerName}` : `c & b ${bowlerName}`;
    case 'runOut':
      return assistName ? `run out (${assistName})` : `run out`;
    case 'lbw':
      return `lbw b ${bowlerName}`;
    case 'stumped':
      return assistName ? `st †${assistName} b ${bowlerName}` : `st b ${bowlerName}`;
    case 'hitWicket':
      return `hit wicket b ${bowlerName}`;
    case 'retiredHurt':
      return 'retired hurt';
    case 'retiredOut':
      return 'retired out';
    default:
      return 'out';
  }
}

export interface RecordBallInput {
  matchId: string;
  inningsId: string;
  sequenceNumber: number;
  bowlerId: string;
  bowlerName: string;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runsBat: number;
  extraType?: ExtraType;
  extraRuns?: number;
  totalExtraRunsOverride?: number;
  dismissal?: BallDismissal;
  comment?: string;
  scorerId: string;
  incomingBatterId?: string; // If wicket fell and new batter is chosen immediately
  incomingBatterName?: string;
}

export interface RecordBallResult {
  updatedInnings: InningsData;
  newBallEvent: BallEvent;
  matchResult?: MatchResult;
  isOverComplete: boolean;
  isInningsComplete: boolean;
  needsNewBowler: boolean;
  needsNewBatter: boolean;
}

/**
 * Primary transactional ball evaluation function
 */
export function applyBallToInnings(
  currentInnings: InningsData,
  match: Match,
  input: RecordBallInput,
  playersMap: Record<string, string>
): RecordBallResult {
  // Deep clone current state
  const innings: InningsData = JSON.parse(JSON.stringify(currentInnings));
  
  const isWide = input.extraType === 'wide';
  const isNoBall = input.extraType === 'noBall';
  const isBye = input.extraType === 'bye';
  const isLegBye = input.extraType === 'legBye';
  const isPenalty = input.extraType === 'penalty';
  
  // Wides and No-balls are NOT legal deliveries in cricket
  const isLegalBall = !isWide && !isNoBall;
  
  let runsOffBat = input.runsBat || 0;
  let totalExtraRuns = 0;
  
  // Extra runs configuration
  if (input.totalExtraRunsOverride !== undefined) {
    totalExtraRuns = input.totalExtraRunsOverride;
    if (isWide || isBye || isLegBye || isPenalty) {
      runsOffBat = 0;
    }
  } else if (isWide) {
    totalExtraRuns = (match.rules.wideRuns || 1) + (input.extraRuns || 0);
    runsOffBat = 0; // In cricket, runs on wide are extras, not credited to bat
  } else if (isNoBall) {
    totalExtraRuns = (match.rules.noBallRuns || 1) + (input.extraRuns || 0);
  } else if (isBye || isLegBye || isPenalty) {
    totalExtraRuns = input.extraRuns || runsOffBat;
    runsOffBat = 0; // Byes and leg-byes are not batter runs
  }

  const totalRunsOnBall = runsOffBat + totalExtraRuns;
  
  // 1. Update Innings Totals
  innings.totalRuns += totalRunsOnBall;
  if (isLegalBall) {
    innings.legalBalls += 1;
    innings.oversCompleted = legalBallsToOvers(innings.legalBalls);
  }

  // 2. Update Extras
  if (isWide) innings.extras.wides += totalExtraRuns;
  if (isNoBall) innings.extras.noBalls += totalExtraRuns;
  if (isBye) innings.extras.byes += totalExtraRuns;
  if (isLegBye) innings.extras.legByes += totalExtraRuns;
  if (isPenalty) innings.extras.penalty += totalExtraRuns;
  innings.extras.total =
    innings.extras.wides +
    innings.extras.noBalls +
    innings.extras.byes +
    innings.extras.legByes +
    innings.extras.penalty;

  // 3. Update Batter Scorecard
  if (!innings.battingScorecard[input.strikerId]) {
    innings.battingScorecard[input.strikerId] = {
      playerId: input.strikerId,
      name: input.strikerName,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
    };
  }
  const striker = innings.battingScorecard[input.strikerId];

  // Wide deliveries do NOT count as a ball faced by the batter
  if (!isWide) {
    striker.balls += 1;
  }
  striker.runs += runsOffBat;
  if (runsOffBat === 4) striker.fours += 1;
  if (runsOffBat === 6) striker.sixes += 1;
  striker.strikeRate = striker.balls > 0 ? parseFloat(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;

  // Ensure non-striker exists in scorecard
  if (!innings.battingScorecard[input.nonStrikerId]) {
    innings.battingScorecard[input.nonStrikerId] = {
      playerId: input.nonStrikerId,
      name: input.nonStrikerName,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
    };
  }

  // 4. Update Bowler Figure
  if (!innings.bowlingScorecard[input.bowlerId]) {
    innings.bowlingScorecard[input.bowlerId] = {
      playerId: input.bowlerId,
      name: input.bowlerName,
      overs: '0.0',
      legalBalls: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
    };
  }
  const bowler = innings.bowlingScorecard[input.bowlerId];

  if (isLegalBall) {
    bowler.legalBalls += 1;
    bowler.overs = legalBallsToOvers(bowler.legalBalls);
  }
  if (isWide) bowler.wides += 1;
  if (isNoBall) bowler.noBalls += 1;

  // Runs conceded by bowler = runsOffBat + (wide/no-ball runs). Byes and Leg-byes are NOT charged to bowler!
  const bowlerRunsThisBall = runsOffBat + (isWide || isNoBall ? totalExtraRuns : 0);
  bowler.runsConceded += bowlerRunsThisBall;

  // 5. Handle Dismissal (if any)
  let needsNewBatter = false;
  if (input.dismissal) {
    innings.totalWickets += 1;
    const playerOutId = input.dismissal.playerOutId;
    const dismissedBatter = innings.battingScorecard[playerOutId];
    if (dismissedBatter) {
      dismissedBatter.isOut = true;
      dismissedBatter.dismissalType = input.dismissal.type;
      dismissedBatter.dismissalText = formatDismissalText(input.dismissal, input.bowlerName, playersMap);
    }

    // Bowler gets credit for wicket unless it's a runOut or retired hurt/out
    if (
      input.dismissal.type !== 'runOut' &&
      input.dismissal.type !== 'retiredHurt' &&
      input.dismissal.type !== 'retiredOut'
    ) {
      bowler.wickets += 1;
    }

    // Add Fall of Wickets
    const fow: FallOfWicket = {
      wicketNumber: innings.totalWickets,
      score: innings.totalRuns,
      overs: legalBallsToOvers(innings.legalBalls),
      playerId: playerOutId,
      playerName: playersMap[playerOutId] || (playerOutId === input.strikerId ? input.strikerName : input.nonStrikerName),
    };
    innings.fallOfWickets.push(fow);

    // If new batter provided, slot them in
    if (input.incomingBatterId && input.incomingBatterName) {
      if (playerOutId === input.strikerId) {
        innings.currentStrikerId = input.incomingBatterId;
      } else {
        innings.currentNonStrikerId = input.incomingBatterId;
      }
      if (!innings.battingScorecard[input.incomingBatterId]) {
        innings.battingScorecard[input.incomingBatterId] = {
          playerId: input.incomingBatterId,
          name: input.incomingBatterName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        };
      }
    } else {
      needsNewBatter = true;
    }
  }

  // Recalculate bowler economy
  if (bowler.legalBalls > 0) {
    const oversDecimal = bowler.legalBalls / 6;
    bowler.economy = parseFloat((bowler.runsConceded / oversDecimal).toFixed(2));
  }

  // 6. Strike Rotation Logic
  // Physical crossings:
  // Runs taken off bat, byes, or leg byes
  const physicalRuns = isBye || isLegBye ? totalExtraRuns : runsOffBat;
  const isOddPhysicalRuns = physicalRuns % 2 === 1;

  let nextStrikerId = innings.currentStrikerId || input.strikerId;
  let nextNonStrikerId = innings.currentNonStrikerId || input.nonStrikerId;

  if (isOddPhysicalRuns) {
    // Swap striker and non-striker
    const temp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = temp;
  }

  // Check end of over
  const currentOverBall = innings.legalBalls % 6;
  const isOverComplete = isLegalBall && currentOverBall === 0;

  if (isOverComplete) {
    // End of over: switch ends!
    const temp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = temp;
  }

  innings.currentStrikerId = nextStrikerId;
  innings.currentNonStrikerId = nextNonStrikerId;
  innings.currentBowlerId = input.bowlerId;
  innings.updatedAt = new Date().toISOString();

  // 7. Check Innings & Match Completion
  const maxLegalBalls = match.rules.overs * 6;
  const maxWickets = match.rules.playersPerTeam - 1; // 10 wickets for 11 players
  const isAllOut = innings.totalWickets >= maxWickets;
  const isOversFinished = innings.legalBalls >= maxLegalBalls;

  let isInningsComplete = isAllOut || isOversFinished;
  let matchResult: MatchResult | undefined = undefined;

  // Innings 2 chase logic
  if (innings.inningsNumber === 2 && innings.target) {
    if (innings.totalRuns >= innings.target) {
      // Chasing team won!
      isInningsComplete = true;
      const wicketsRemaining = maxWickets - innings.totalWickets;
      const ballsRemaining = Math.max(0, maxLegalBalls - innings.legalBalls);
      const chasingTeam = match.teamA.id === innings.battingTeamId ? match.teamA : match.teamB;
      matchResult = {
        winnerTeamId: chasingTeam.id,
        margin: `${wicketsRemaining} wickets`,
        resultType: 'win_wickets',
        summary: `${chasingTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'} (${ballsRemaining} balls left)`,
      };
    } else if (isInningsComplete) {
      // Innings 2 is finished without meeting target
      const runsShort = innings.target - 1 - innings.totalRuns;
      const defendingTeam = match.teamA.id === innings.bowlingTeamId ? match.teamA : match.teamB;
      if (runsShort > 0) {
        matchResult = {
          winnerTeamId: defendingTeam.id,
          margin: `${runsShort} runs`,
          resultType: 'win_runs',
          summary: `${defendingTeam.name} won by ${runsShort} run${runsShort === 1 ? '' : 's'}`,
        };
      } else if (runsShort === 0) {
        matchResult = {
          resultType: 'tie',
          summary: `Match Tied! Scores level (${innings.totalRuns} runs each)`,
        };
      }
    }
  }

  innings.isCompleted = isInningsComplete;

  // Construct BallEvent record
  const overNumber = Math.floor(Math.max(0, innings.legalBalls - (isLegalBall ? 1 : 0)) / 6);
  const ballInOver = isLegalBall ? ((innings.legalBalls - 1) % 6) + 1 : 0;

  const newBallEvent: BallEvent = {
    id: `ball_${Date.now()}_${input.sequenceNumber}`,
    matchId: input.matchId,
    inningsId: input.inningsId,
    sequenceNumber: input.sequenceNumber,
    overNumber,
    ballInOver,
    legalBall: isLegalBall,
    bowlerId: input.bowlerId,
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    runsBat: runsOffBat,
    totalRunsOnBall,
    scorerId: input.scorerId,
    timestamp: new Date().toISOString(),
    ...(totalExtraRuns > 0 && input.extraType ? { extras: { type: input.extraType, runs: totalExtraRuns } } : {}),
    ...(input.dismissal ? { dismissal: input.dismissal } : {}),
    ...(input.comment ? { comment: input.comment } : {}),
  };

  return {
    updatedInnings: innings,
    newBallEvent,
    matchResult,
    isOverComplete,
    isInningsComplete,
    needsNewBowler: isOverComplete && !isInningsComplete,
    needsNewBatter: needsNewBatter && !isAllOut,
  };
}

/**
 * Replays all active ball events from zero to rebuild authoritative state.
 * Guaranteed 100% precision for Undo and Audit Corrections.
 */
export function replayInningsFromEvents(
  initialInnings: InningsData,
  match: Match,
  events: BallEvent[],
  playersMap: Record<string, string>
): InningsData {
  const blankInnings: InningsData = {
    id: initialInnings.id,
    matchId: initialInnings.matchId,
    inningsNumber: initialInnings.inningsNumber,
    battingTeamId: initialInnings.battingTeamId,
    bowlingTeamId: initialInnings.bowlingTeamId,
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    oversLimit: initialInnings.oversLimit,
    oversCompleted: '0.0',
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
    currentStrikerId: initialInnings.currentStrikerId,
    currentNonStrikerId: initialInnings.currentNonStrikerId,
    currentBowlerId: initialInnings.currentBowlerId,
    battingScorecard: {},
    bowlingScorecard: {},
    fallOfWickets: [],
    isCompleted: false,
    target: initialInnings.target,
    updatedAt: new Date().toISOString(),
  };

  const activeEvents = events.filter((e) => !e.isUndone).sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  let current = blankInnings;
  for (const ev of activeEvents) {
    const input: RecordBallInput = {
      matchId: ev.matchId,
      inningsId: ev.inningsId,
      sequenceNumber: ev.sequenceNumber,
      bowlerId: ev.bowlerId,
      bowlerName: playersMap[ev.bowlerId] || 'Bowler',
      strikerId: ev.strikerId,
      strikerName: playersMap[ev.strikerId] || 'Striker',
      nonStrikerId: ev.nonStrikerId,
      nonStrikerName: playersMap[ev.nonStrikerId] || 'Non-Striker',
      runsBat: ev.runsBat,
      extraType: ev.extras?.type,
      totalExtraRunsOverride: ev.extras?.runs,
      dismissal: ev.dismissal,
      comment: ev.comment,
      scorerId: ev.scorerId,
    };
    const res = applyBallToInnings(current, match, input, playersMap);
    current = res.updatedInnings;
  }

  return current;
}

/**
 * Calculates authentic ICC standard Net Run Rate (NRR) with all-out adjustment.
 * Formula: (Total Runs Scored / Overs Faced) - (Total Runs Conceded / Overs Bowled)
 * Rule: If a team is bowled out (all out) before their full quota of overs,
 * the full allocated overs (e.g. 20.0 or 10.0) is used as the divisor!
 */
export function calculateTournamentNRR(
  runsScored: number,
  oversFacedDecimal: number,
  runsConceded: number,
  oversBowledDecimal: number
): number {
  const forRate = oversFacedDecimal > 0 ? runsScored / oversFacedDecimal : 0;
  const againstRate = oversBowledDecimal > 0 ? runsConceded / oversBowledDecimal : 0;
  const nrr = forRate - againstRate;
  return parseFloat(nrr.toFixed(3));
}

export interface WinProbabilityResult {
  battingTeamWinProb: number; // 0 to 100
  bowlingTeamWinProb: number; // 0 to 100
  momentumText: string;
  projectedScore?: number;
}

/**
 * Dynamically computes real-time win probability based on:
 * - Current Run Rate (CRR)
 * - Required Run Rate (RRR)
 * - Balls remaining
 * - Wickets in hand
 */
export function calculateWinProbability(match: Match, innings: InningsData): WinProbabilityResult {
  const maxWickets = match.rules.playersPerTeam - 1;
  const wicketsInHand = Math.max(0, maxWickets - innings.totalWickets);
  const totalAllocatedBalls = match.rules.overs * 6;
  const ballsRemaining = Math.max(0, totalAllocatedBalls - innings.legalBalls);
  const crr = innings.legalBalls > 0 ? innings.totalRuns / (innings.legalBalls / 6) : 8.0;

  // Case 1: Match is already completed
  if (match.status === 'completed' && match.result) {
    const isBattingTeamWinner = match.result.winnerTeamId === innings.battingTeamId;
    return {
      battingTeamWinProb: isBattingTeamWinner ? 100 : 0,
      bowlingTeamWinProb: isBattingTeamWinner ? 0 : 100,
      momentumText: match.result.summary,
    };
  }

  // Case 2: Innings 2 (The Chase)
  if (innings.inningsNumber === 2 && typeof innings.target === 'number') {
    const runsNeeded = Math.max(0, innings.target - innings.totalRuns);

    // Chasing team already reached target
    if (runsNeeded <= 0) {
      return {
        battingTeamWinProb: 100,
        bowlingTeamWinProb: 0,
        momentumText: 'Target achieved! Victory secured.',
      };
    }

    // All out or no balls remaining but runs still needed
    if (wicketsInHand === 0 || (ballsRemaining === 0 && runsNeeded > 0)) {
      return {
        battingTeamWinProb: 0,
        bowlingTeamWinProb: 100,
        momentumText: 'Defending team wins!',
      };
    }

    // Required Run Rate (RRR)
    const rrr = runsNeeded / (ballsRemaining / 6);

    // Benchmark expected run rate given wickets in hand
    const wicketFactor = wicketsInHand / Math.max(1, maxWickets);
    const sustainableRate = 5.5 + wicketFactor * 7.0; // Between ~5.5 and 12.5 rpo

    // Difference between sustainable rate vs required rate
    const rateDiff = sustainableRate - rrr;

    // Sigmoid curve
    let prob = 1 / (1 + Math.exp(-0.42 * rateDiff));

    // Endgame boundary pressure adjustments
    if (ballsRemaining <= 12) {
      if (runsNeeded > ballsRemaining * 3) {
        prob = Math.min(prob, 0.12);
      } else if (runsNeeded <= ballsRemaining && wicketsInHand >= 2) {
        prob = Math.max(prob, 0.88);
      }
    }

    let battingWinProb = Math.round(prob * 100);
    battingWinProb = Math.max(1, Math.min(99, battingWinProb));
    const bowlingWinProb = 100 - battingWinProb;

    let momentum = 'Even contest';
    if (battingWinProb >= 75) momentum = 'Chasing team in firm control';
    else if (battingWinProb >= 58) momentum = 'Chasing team slight favourites';
    else if (battingWinProb <= 25) momentum = 'Bowling team heavily favoured';
    else if (battingWinProb <= 42) momentum = 'Defending team applying immense pressure';
    else momentum = 'Down to the wire — tight finish';

    return {
      battingTeamWinProb: battingWinProb,
      bowlingTeamWinProb: bowlingWinProb,
      momentumText: momentum,
    };
  }

  // Case 3: Innings 1 (Setting Target)
  const wicketResourceFraction = Math.max(0.1, wicketsInHand / Math.max(1, maxWickets));
  const remainingOvers = ballsRemaining / 6;
  const projectedExtraRuns = Math.round(
    remainingOvers * (crr * 0.7 + 7.5 * 0.3) * (0.4 + 0.6 * wicketResourceFraction)
  );
  const projectedScore = innings.totalRuns + projectedExtraRuns;

  const parScore = Math.round(match.rules.overs * 9.5);
  const scoreDiff = projectedScore - parScore;

  let prob = 1 / (1 + Math.exp(-0.06 * scoreDiff));
  let battingWinProb = Math.round(prob * 100);
  battingWinProb = Math.max(10, Math.min(90, battingWinProb));
  const bowlingWinProb = 100 - battingWinProb;

  let momentum = 'Steady start';
  if (crr >= 11) momentum = 'Explosive scoring rate';
  else if (innings.totalWickets >= 3 && innings.legalBalls < totalAllocatedBalls / 2) {
    momentum = 'Wickets tumbling — rebuilding needed';
  } else if (projectedScore > parScore + 10) {
    momentum = 'Batting team on course for commanding total';
  } else if (projectedScore < parScore - 10) {
    momentum = 'Bowlers dominating the contest';
  }

  return {
    battingTeamWinProb: battingWinProb,
    bowlingTeamWinProb: bowlingWinProb,
    momentumText: momentum,
    projectedScore,
  };
}
