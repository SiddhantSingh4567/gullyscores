/**
 * Scoring Engine Automated Unit & Edge-Case Tests
 */

import {
  applyBallToInnings,
  replayInningsFromEvents,
  legalBallsToOvers,
  calculateTournamentNRR,
  calculateRunRate,
  calculateRequiredRunRate,
  calculateWinProbability,
  RecordBallInput,
} from '../scoringEngine';
import { Match, InningsData } from '../../types/cricket';

export function runScoringTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`✓ PASS: ${testName}`);
    } else {
      failed++;
      errors.push(testName);
      console.error(`✗ FAIL: ${testName}`);
    }
  }

  const sampleMatch: Match = {
    id: 'match_test_1',
    title: 'Gully Cup Final',
    venue: 'Shivaji Park Pitch 2',
    scheduledDate: '2026-10-24',
    rules: {
      overs: 5,
      playersPerTeam: 6,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitOnNoBall: true,
      lbwAllowed: false,
      maxOversPerBowler: 2,
    },
    status: 'live',
    teamA: {
      id: 'team_a',
      name: 'Dharavi Daredevils',
      shortCode: 'DD',
      playingXI: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    },
    teamB: {
      id: 'team_b',
      name: 'Bandra Blasters',
      shortCode: 'BB',
      playingXI: ['p7', 'p8', 'p9', 'p10', 'p11', 'p12'],
    },
    currentInnings: 1,
    ownerId: 'user_123',
    assignedScorerIds: ['user_123'],
    isPublic: true,
    createdAt: '2026-10-24T00:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z',
  };

  const initialInnings: InningsData = {
    id: 'inn_1',
    matchId: 'match_test_1',
    inningsNumber: 1,
    battingTeamId: 'team_a',
    bowlingTeamId: 'team_b',
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    oversLimit: 5,
    oversCompleted: '0.0',
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
    currentStrikerId: 'p1',
    currentNonStrikerId: 'p2',
    currentBowlerId: 'p7',
    battingScorecard: {},
    bowlingScorecard: {},
    fallOfWickets: [],
    isCompleted: false,
    updatedAt: '2026-10-24T00:00:00Z',
  };

  const playersMap = {
    p1: 'Rohit K (Striker)',
    p2: 'Virat S (Non-Striker)',
    p3: 'Surya Y',
    p7: 'Jasprit B (Bowler)',
    p8: 'Hardik P',
  };

  // Test 1: Legal delivery with a FOUR
  const ball1Input: RecordBallInput = {
    matchId: 'match_test_1',
    inningsId: 'inn_1',
    sequenceNumber: 1,
    bowlerId: 'p7',
    bowlerName: 'Jasprit B',
    strikerId: 'p1',
    strikerName: 'Rohit K',
    nonStrikerId: 'p2',
    nonStrikerName: 'Virat S',
    runsBat: 4,
    scorerId: 'user_123',
  };

  const res1 = applyBallToInnings(initialInnings, sampleMatch, ball1Input, playersMap);
  assert(res1.updatedInnings.totalRuns === 4, 'Ball 1: Total runs should be 4');
  assert(res1.updatedInnings.legalBalls === 1, 'Ball 1: Legal balls should be 1');
  assert(res1.updatedInnings.oversCompleted === '0.1', 'Ball 1: Overs completed should be 0.1');
  assert(res1.updatedInnings.battingScorecard['p1'].runs === 4, 'Ball 1: Striker runs should be 4');
  assert(res1.updatedInnings.battingScorecard['p1'].balls === 1, 'Ball 1: Striker balls faced should be 1');
  assert(res1.updatedInnings.battingScorecard['p1'].fours === 1, 'Ball 1: Fours count should be 1');
  assert(res1.updatedInnings.currentStrikerId === 'p1', 'Ball 1: Striker stays on strike for even runs');

  // Test 2: Single run (Strike rotation)
  const ball2Input: RecordBallInput = {
    matchId: 'match_test_1',
    inningsId: 'inn_1',
    sequenceNumber: 2,
    bowlerId: 'p7',
    bowlerName: 'Jasprit B',
    strikerId: res1.updatedInnings.currentStrikerId!,
    strikerName: 'Rohit K',
    nonStrikerId: res1.updatedInnings.currentNonStrikerId!,
    nonStrikerName: 'Virat S',
    runsBat: 1,
    scorerId: 'user_123',
  };

  const res2 = applyBallToInnings(res1.updatedInnings, sampleMatch, ball2Input, playersMap);
  assert(res2.updatedInnings.totalRuns === 5, 'Ball 2: Total runs should be 5');
  assert(res2.updatedInnings.currentStrikerId === 'p2', 'Ball 2: Strike rotates on odd run (p2 on strike)');
  assert(res2.updatedInnings.currentNonStrikerId === 'p1', 'Ball 2: Non-striker is now p1');

  // Test 3: Wide delivery
  const ball3Input: RecordBallInput = {
    matchId: 'match_test_1',
    inningsId: 'inn_1',
    sequenceNumber: 3,
    bowlerId: 'p7',
    bowlerName: 'Jasprit B',
    strikerId: res2.updatedInnings.currentStrikerId!,
    strikerName: 'Virat S',
    nonStrikerId: res2.updatedInnings.currentNonStrikerId!,
    nonStrikerName: 'Rohit K',
    runsBat: 0,
    extraType: 'wide',
    extraRuns: 0,
    scorerId: 'user_123',
  };

  const res3 = applyBallToInnings(res2.updatedInnings, sampleMatch, ball3Input, playersMap);
  assert(res3.updatedInnings.totalRuns === 6, 'Ball 3: Total runs increases by 1 for wide');
  assert(res3.updatedInnings.legalBalls === 2, 'Ball 3: Legal balls unchanged on wide (still 2)');
  assert(res3.updatedInnings.extras.wides === 1, 'Ball 3: Wides extras recorded');
  assert(res3.updatedInnings.battingScorecard['p2'].balls === 0, 'Ball 3: Striker balls faced NOT incremented on wide');

  // Test 4: Wicket (Bowled)
  const ball4Input: RecordBallInput = {
    matchId: 'match_test_1',
    inningsId: 'inn_1',
    sequenceNumber: 4,
    bowlerId: 'p7',
    bowlerName: 'Jasprit B',
    strikerId: res3.updatedInnings.currentStrikerId!,
    strikerName: 'Virat S',
    nonStrikerId: res3.updatedInnings.currentNonStrikerId!,
    nonStrikerName: 'Rohit K',
    runsBat: 0,
    dismissal: {
      type: 'bowled',
      playerOutId: 'p2',
    },
    incomingBatterId: 'p3',
    incomingBatterName: 'Surya Y',
    scorerId: 'user_123',
  };

  const res4 = applyBallToInnings(res3.updatedInnings, sampleMatch, ball4Input, playersMap);
  assert(res4.updatedInnings.totalWickets === 1, 'Ball 4: Wickets count should be 1');
  assert(res4.updatedInnings.bowlingScorecard['p7'].wickets === 1, 'Ball 4: Bowler credited with 1 wicket');
  assert(res4.updatedInnings.battingScorecard['p2'].isOut === true, 'Ball 4: Batter p2 is marked Out');
  assert(res4.updatedInnings.battingScorecard['p2'].dismissalText === 'b Jasprit B', 'Ball 4: Dismissal text formatted');
  assert(res4.updatedInnings.fallOfWickets.length === 1, 'Ball 4: Fall of wickets recorded');
  assert(res4.updatedInnings.currentStrikerId === 'p3', 'Ball 4: New batter p3 is now striker');

  // Test 5: Net Run Rate calculation
  const nrr = calculateTournamentNRR(160, 20, 140, 20);
  assert(nrr === 1.0, `NRR should be 1.000, got ${nrr}`);

  const nrrAllOut = calculateTournamentNRR(120, 20, 121, 15.5);
  assert(typeof nrrAllOut === 'number' && !isNaN(nrrAllOut), 'NRR with all-out calculation handles decimal properly');

  // Test 6: Replay integrity
  const events = [res1.newBallEvent, res2.newBallEvent, res3.newBallEvent, res4.newBallEvent];
  const replayed = replayInningsFromEvents(initialInnings, sampleMatch, events, playersMap);
  assert(replayed.totalRuns === res4.updatedInnings.totalRuns, 'Replay total runs matches active score');
  assert(replayed.totalWickets === res4.updatedInnings.totalWickets, 'Replay total wickets matches active score');

  // Test 7: Win Probability - Innings 1 projection
  const winProb1 = calculateWinProbability(sampleMatch, res4.updatedInnings);
  assert(winProb1.battingTeamWinProb >= 0 && winProb1.battingTeamWinProb <= 100, 'Win Prob 1: Valid percentage');
  assert(winProb1.bowlingTeamWinProb >= 0 && winProb1.bowlingTeamWinProb <= 100, 'Win Prob 1: Bowling prob valid');
  assert(winProb1.battingTeamWinProb + winProb1.bowlingTeamWinProb === 100, 'Win Prob 1: Sums to 100%');
  assert(typeof winProb1.projectedScore === 'number', 'Win Prob 1: Calculates projected score');

  // Test 8: Win Probability - Innings 2 chase comfortable scenario
  const chasingInningsEasy: InningsData = {
    ...initialInnings,
    inningsNumber: 2,
    totalRuns: 45,
    target: 50, // Needs 5 runs
    legalBalls: 24, // 6 balls left in a 5 over match
    totalWickets: 1, // 4 wickets in hand (playersPerTeam = 6)
  };
  const winProbEasy = calculateWinProbability(sampleMatch, chasingInningsEasy);
  assert(winProbEasy.battingTeamWinProb >= 70, `Win Prob Chase Easy: Expected >= 70%, got ${winProbEasy.battingTeamWinProb}%`);

  // Test 9: Win Probability - Innings 2 chase difficult scenario
  const chasingInningsHard: InningsData = {
    ...initialInnings,
    inningsNumber: 2,
    totalRuns: 20,
    target: 50, // Needs 30 runs
    legalBalls: 24, // 6 balls left
    totalWickets: 4, // 1 wicket in hand
  };
  const winProbHard = calculateWinProbability(sampleMatch, chasingInningsHard);
  assert(winProbHard.battingTeamWinProb <= 25, `Win Prob Chase Hard: Expected <= 25%, got ${winProbHard.battingTeamWinProb}%`);

  return { passed, failed, errors };
}
