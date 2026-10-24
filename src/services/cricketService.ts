/**
 * GullyScore Cricket Service
 * Robust Firestore integration with demo-mode isolation.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, sanitizeFirestoreData } from '../lib/firebase';
import {
  Team,
  Player,
  PlayerRole,
  Match,
  InningsData,
  BallEvent,
  Tournament,
  TournamentStanding,
  Fixture,
  AuditLog,
} from '../types/cricket';
import {
  applyBallToInnings,
  RecordBallInput,
  RecordBallResult,
  replayInningsFromEvents,
  calculateTournamentNRR,
  oversToDecimal,
} from '../lib/scoringEngine';
import {
  DEMO_TEAMS,
  DEMO_PLAYERS,
  DEMO_TOURNAMENTS,
  DEMO_STANDINGS,
  DEMO_LIVE_MATCH,
  DEMO_LIVE_INNINGS_1,
  DEMO_COMPLETED_MATCH,
  DEMO_COMPLETED_INNINGS_1,
  DEMO_COMPLETED_INNINGS_2,
} from '../data/demoData';

// In-memory store for demo mode state mutations during testing
let demoLiveMatchState: Match = JSON.parse(JSON.stringify(DEMO_LIVE_MATCH));
let demoLiveInningsState: InningsData = JSON.parse(JSON.stringify(DEMO_LIVE_INNINGS_1));
let demoBallEvents: BallEvent[] = [];

// ==========================================
// TEAMS
// ==========================================

export async function createTeam(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>, isDemo = false): Promise<Team> {
  const teamId = `team_${Date.now()}`;
  const now = new Date().toISOString();
  const newTeam: Team = {
    ...team,
    id: teamId,
    createdAt: now,
    updatedAt: now,
  };

  if (isDemo) {
    DEMO_TEAMS.unshift(newTeam);
    return newTeam;
  }

  try {
    await setDoc(doc(db, 'teams', teamId), sanitizeFirestoreData(newTeam));
    return newTeam;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `teams/${teamId}`);
  }
}

export async function getTeams(isDemo = false): Promise<Team[]> {
  if (isDemo) {
    return DEMO_TEAMS;
  }
  try {
    const q = query(collection(db, 'teams'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Team);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'teams');
  }
}

export async function getTeam(teamId: string, isDemo = false): Promise<Team | null> {
  if (isDemo) {
    return DEMO_TEAMS.find((t) => t.id === teamId) || null;
  }
  try {
    const snap = await getDoc(doc(db, 'teams', teamId));
    return snap.exists() ? (snap.data() as Team) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `teams/${teamId}`);
  }
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<Team, 'name' | 'shortCode' | 'city' | 'description' | 'primaryColor' | 'homeVenue' | 'captainId' | 'viceCaptainId'>>,
  isDemo = false
): Promise<void> {
  const now = new Date().toISOString();
  if (isDemo) {
    const idx = DEMO_TEAMS.findIndex((t) => t.id === teamId);
    if (idx !== -1) {
      DEMO_TEAMS[idx] = { ...DEMO_TEAMS[idx], ...updates, updatedAt: now };
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'teams', teamId), sanitizeFirestoreData({
      ...updates,
      updatedAt: now,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `teams/${teamId}`);
  }
}

export async function deleteTeam(teamId: string, isDemo = false): Promise<void> {
  if (isDemo) {
    const idx = DEMO_TEAMS.findIndex((t) => t.id === teamId);
    if (idx !== -1) DEMO_TEAMS.splice(idx, 1);
    return;
  }
  try {
    await deleteDoc(doc(db, 'teams', teamId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teams/${teamId}`);
  }
}

// ==========================================
// PLAYERS
// ==========================================

export async function createPlayer(
  player: Omit<Player, 'id' | 'matches' | 'runs' | 'wickets' | 'fours' | 'sixes' | 'highestScore' | 'createdAt'>,
  isDemo = false
): Promise<Player> {
  const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newPlayer: Player = {
    ...player,
    id: playerId,
    matches: 0,
    runs: 0,
    highestScore: 0,
    wickets: 0,
    fours: 0,
    sixes: 0,
    createdAt: new Date().toISOString(),
  };

  if (isDemo) {
    DEMO_PLAYERS.push(newPlayer);
    return newPlayer;
  }

  try {
    await setDoc(doc(db, 'players', playerId), sanitizeFirestoreData(newPlayer));
    return newPlayer;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `players/${playerId}`);
  }
}

export async function getPlayersByTeam(teamId: string, isDemo = false): Promise<Player[]> {
  if (isDemo) {
    return DEMO_PLAYERS.filter((p) => p.teamId === teamId);
  }
  try {
    const q = query(collection(db, 'players'), where('teamId', '==', teamId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Player);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'players');
  }
}

export async function updatePlayer(
  playerId: string,
  updates: Partial<Pick<Player, 'name' | 'jerseyNumber' | 'role' | 'battingStyle' | 'bowlingStyle'>>,
  isDemo = false
): Promise<void> {
  if (isDemo) {
    const idx = DEMO_PLAYERS.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      DEMO_PLAYERS[idx] = { ...DEMO_PLAYERS[idx], ...updates };
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'players', playerId), sanitizeFirestoreData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `players/${playerId}`);
  }
}

export async function deletePlayer(playerId: string, isDemo = false): Promise<void> {
  if (isDemo) {
    const idx = DEMO_PLAYERS.findIndex((p) => p.id === playerId);
    if (idx !== -1) DEMO_PLAYERS.splice(idx, 1);
    return;
  }
  try {
    await deleteDoc(doc(db, 'players', playerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `players/${playerId}`);
  }
}

export async function updateMatchVenueAndTeams(
  matchId: string,
  updates: { venue?: string; title?: string; teamAName?: string; teamBName?: string },
  isDemo = false
): Promise<void> {
  const now = new Date().toISOString();
  if (isDemo) {
    if (demoLiveMatchState.id === matchId) {
      if (updates.venue) demoLiveMatchState.venue = updates.venue;
      if (updates.title) demoLiveMatchState.title = updates.title;
      if (updates.teamAName) demoLiveMatchState.teamA.name = updates.teamAName;
      if (updates.teamBName) demoLiveMatchState.teamB.name = updates.teamBName;
      demoLiveMatchState.updatedAt = now;
    }
    return;
  }
  try {
    const payload: Record<string, any> = { updatedAt: now };
    if (updates.venue) payload.venue = updates.venue;
    if (updates.title) payload.title = updates.title;
    if (updates.teamAName) payload['teamA.name'] = updates.teamAName;
    if (updates.teamBName) payload['teamB.name'] = updates.teamBName;
    await updateDoc(doc(db, 'matches', matchId), sanitizeFirestoreData(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
  }
}

// ==========================================
// MATCHES & INNINGS
// ==========================================

export async function createMatch(
  matchData: Omit<Match, 'id' | 'currentInnings' | 'createdAt' | 'updatedAt'>,
  initialStrikerId: string,
  initialNonStrikerId: string,
  initialBowlerId: string,
  isDemo = false
): Promise<{ match: Match; innings: InningsData }> {
  const matchId = `match_${Date.now()}`;
  const innings1Id = `inn_${Date.now()}_1`;
  const now = new Date().toISOString();

  // Determine batting team from toss
  const tossWinner = matchData.toss?.winnerTeamId || matchData.teamA.id;
  const decision = matchData.toss?.decision || 'bat';
  const battingTeamId = decision === 'bat' ? tossWinner : tossWinner === matchData.teamA.id ? matchData.teamB.id : matchData.teamA.id;
  const bowlingTeamId = battingTeamId === matchData.teamA.id ? matchData.teamB.id : matchData.teamA.id;

  const newInnings1: InningsData = {
    id: innings1Id,
    matchId,
    inningsNumber: 1,
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    oversLimit: matchData.rules.overs,
    oversCompleted: '0.0',
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
    currentStrikerId: initialStrikerId,
    currentNonStrikerId: initialNonStrikerId,
    currentBowlerId: initialBowlerId,
    battingScorecard: {},
    bowlingScorecard: {},
    fallOfWickets: [],
    isCompleted: false,
    updatedAt: now,
  };

  const effectiveOwnerId = auth.currentUser?.uid || matchData.ownerId || 'guest_organizer';

  const newMatch: Match = {
    ...matchData,
    id: matchId,
    teamAId: matchData.teamA.id,
    teamBId: matchData.teamB.id,
    overs: matchData.rules.overs,
    playersPerTeam: matchData.rules.playersPerTeam,
    currentInnings: 1,
    innings1Id,
    status: 'live',
    ownerId: effectiveOwnerId,
    createdAt: now,
    updatedAt: now,
  };

  if (isDemo || !auth.currentUser) {
    demoLiveMatchState = newMatch;
    demoLiveInningsState = newInnings1;
    demoBallEvents = [];
    return { match: newMatch, innings: newInnings1 };
  }

  try {
    await setDoc(doc(db, 'matches', matchId), sanitizeFirestoreData(newMatch));
    await setDoc(doc(db, 'innings', innings1Id), sanitizeFirestoreData(newInnings1));
    return { match: newMatch, innings: newInnings1 };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
  }
}

export async function getMatch(matchId: string, isDemo = false): Promise<Match | null> {
  if (isDemo) {
    if (matchId === 'match_live_demo') return demoLiveMatchState;
    if (matchId === 'match_completed_demo') return DEMO_COMPLETED_MATCH;
    if (matchId === demoLiveMatchState.id) return demoLiveMatchState;
    return null;
  }
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    return snap.exists() ? (snap.data() as Match) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `matches/${matchId}`);
  }
}

export async function getInnings(inningsId: string, isDemo = false): Promise<InningsData | null> {
  if (isDemo) {
    if (inningsId === 'inn_demo_1') return demoLiveInningsState;
    if (inningsId === 'inn_comp_1') return DEMO_COMPLETED_INNINGS_1;
    if (inningsId === 'inn_comp_2') return DEMO_COMPLETED_INNINGS_2;
    if (inningsId === demoLiveInningsState.id) return demoLiveInningsState;
    return null;
  }
  try {
    const snap = await getDoc(doc(db, 'innings', inningsId));
    return snap.exists() ? (snap.data() as InningsData) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `innings/${inningsId}`);
  }
}

export async function getAllMatches(isDemo = false): Promise<Match[]> {
  if (isDemo) {
    return [demoLiveMatchState, DEMO_COMPLETED_MATCH];
  }
  try {
    const q = query(collection(db, 'matches'), limit(50));
    const snap = await getDocs(q);
    const matchesList = snap.docs.map((d) => d.data() as Match);
    return matchesList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'matches');
  }
}

export async function startSecondInnings(
  match: Match,
  innings1: InningsData,
  initialStrikerId: string,
  initialNonStrikerId: string,
  initialBowlerId: string,
  isDemo = false
): Promise<{ match: Match; innings2: InningsData }> {
  const innings2Id = `inn_${Date.now()}_2`;
  const target = innings1.totalRuns + 1;
  const now = new Date().toISOString();

  const newInnings2: InningsData = {
    id: innings2Id,
    matchId: match.id,
    inningsNumber: 2,
    battingTeamId: innings1.bowlingTeamId,
    bowlingTeamId: innings1.battingTeamId,
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    oversLimit: match.rules.overs,
    oversCompleted: '0.0',
    target,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
    currentStrikerId: initialStrikerId,
    currentNonStrikerId: initialNonStrikerId,
    currentBowlerId: initialBowlerId,
    battingScorecard: {},
    bowlingScorecard: {},
    fallOfWickets: [],
    isCompleted: false,
    updatedAt: now,
  };

  const updatedMatch: Match = {
    ...match,
    currentInnings: 2,
    innings2Id,
    innings1Summary: {
      totalRuns: innings1.totalRuns,
      totalWickets: innings1.totalWickets,
      oversCompleted: innings1.oversCompleted,
    },
    updatedAt: now,
  };

  if (isDemo) {
    demoLiveMatchState = updatedMatch;
    demoLiveInningsState = newInnings2;
    return { match: updatedMatch, innings2: newInnings2 };
  }

  try {
    await setDoc(doc(db, 'innings', innings2Id), sanitizeFirestoreData(newInnings2));
    await updateDoc(doc(db, 'matches', match.id), sanitizeFirestoreData({
      currentInnings: 2,
      innings2Id,
      innings1Summary: updatedMatch.innings1Summary,
      updatedAt: now,
    }));
    return { match: updatedMatch, innings2: newInnings2 };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `matches/${match.id}`);
  }
}

export async function recordBall(
  match: Match,
  currentInnings: InningsData,
  input: RecordBallInput,
  playersMap: Record<string, string>,
  isDemo = false
): Promise<RecordBallResult> {
  const result = applyBallToInnings(currentInnings, match, input, playersMap);

  if (isDemo) {
    demoLiveInningsState = result.updatedInnings;
    demoBallEvents.push(result.newBallEvent);

    if (result.matchResult) {
      demoLiveMatchState.status = 'completed';
      demoLiveMatchState.result = result.matchResult;
    }
    return result;
  }

  try {
    // 1. Save ball event (sanitized)
    await setDoc(doc(db, 'ballEvents', result.newBallEvent.id), sanitizeFirestoreData(result.newBallEvent));

    // 2. Update innings document (sanitized)
    await setDoc(doc(db, 'innings', result.updatedInnings.id), sanitizeFirestoreData(result.updatedInnings));

    // 3. Update match summaries and status if match is concluded
    const matchUpdates: Partial<Match> = {
      updatedAt: new Date().toISOString(),
    };

    if (currentInnings.inningsNumber === 1) {
      matchUpdates.innings1Summary = {
        totalRuns: result.updatedInnings.totalRuns,
        totalWickets: result.updatedInnings.totalWickets,
        oversCompleted: result.updatedInnings.oversCompleted,
      };
    } else {
      matchUpdates.innings2Summary = {
        totalRuns: result.updatedInnings.totalRuns,
        totalWickets: result.updatedInnings.totalWickets,
        oversCompleted: result.updatedInnings.oversCompleted,
        target: currentInnings.target,
      };
    }

    if (result.matchResult) {
      matchUpdates.status = 'completed';
      matchUpdates.result = result.matchResult;
    }

    await updateDoc(doc(db, 'matches', match.id), sanitizeFirestoreData(matchUpdates));

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `innings/${currentInnings.id}`);
  }
}

export async function undoLastBall(
  match: Match,
  currentInnings: InningsData,
  playersMap: Record<string, string>,
  userId: string,
  isDemo = false
): Promise<InningsData> {
  if (isDemo) {
    if (demoBallEvents.length === 0) return currentInnings;
    const lastEvent = demoBallEvents.pop()!;
    lastEvent.isUndone = true;
    const replayed = replayInningsFromEvents(currentInnings, match, demoBallEvents, playersMap);
    demoLiveInningsState = replayed;
    return replayed;
  }

  try {
    // Fetch last event for this innings
    const q = query(
      collection(db, 'ballEvents'),
      where('inningsId', '==', currentInnings.id),
      orderBy('sequenceNumber', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return currentInnings;

    const lastEventDoc = snap.docs[0];
    const lastEvent = lastEventDoc.data() as BallEvent;

    // Mark as undone
    await updateDoc(doc(db, 'ballEvents', lastEvent.id), { isUndone: true });

    // Fetch all active events to deterministically rebuild innings
    const allEventsQ = query(
      collection(db, 'ballEvents'),
      where('inningsId', '==', currentInnings.id),
      where('isUndone', '!=', true),
      orderBy('isUndone'),
      orderBy('sequenceNumber', 'asc')
    );
    const allSnap = await getDocs(allEventsQ);
    const events = allSnap.docs.map((d) => d.data() as BallEvent);

    const replayed = replayInningsFromEvents(currentInnings, match, events, playersMap);
    await setDoc(doc(db, 'innings', currentInnings.id), sanitizeFirestoreData(replayed));

    // Create Audit Log
    const logId = `audit_${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), sanitizeFirestoreData({
      id: logId,
      entityId: match.id,
      action: 'ball_undone',
      userId,
      details: `Scorer undid sequence ${lastEvent.sequenceNumber} (Runs: ${lastEvent.runsBat}, Over: ${lastEvent.overNumber}.${lastEvent.ballInOver})`,
      timestamp: new Date().toISOString(),
    } as AuditLog));

    return replayed;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `innings/${currentInnings.id}`);
  }
}

// ==========================================
// TOURNAMENTS & STANDINGS
// ==========================================

export async function createTournament(
  tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>,
  isDemo = false
): Promise<Tournament> {
  const tournamentId = `tourn_${Date.now()}`;
  const now = new Date().toISOString();
  const newTourn: Tournament = {
    ...tournament,
    id: tournamentId,
    createdAt: now,
    updatedAt: now,
  };

  if (isDemo) {
    DEMO_TOURNAMENTS.unshift(newTourn);
    return newTourn;
  }

  try {
    await setDoc(doc(db, 'tournaments', tournamentId), sanitizeFirestoreData(newTourn));
    return newTourn;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tournaments/${tournamentId}`);
  }
}

export async function getTournaments(isDemo = false): Promise<Tournament[]> {
  if (isDemo) {
    return DEMO_TOURNAMENTS;
  }
  try {
    const q = query(collection(db, 'tournaments'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Tournament);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tournaments');
  }
}

export async function getTournament(tournamentId: string, isDemo = false): Promise<Tournament | null> {
  if (isDemo) {
    return DEMO_TOURNAMENTS.find((t) => t.id === tournamentId) || null;
  }
  try {
    const snap = await getDoc(doc(db, 'tournaments', tournamentId));
    return snap.exists() ? (snap.data() as Tournament) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}`);
  }
}

export async function getStandings(tournamentId: string, isDemo = false): Promise<TournamentStanding[]> {
  if (isDemo) {
    return DEMO_STANDINGS.filter((s) => s.tournamentId === tournamentId);
  }
  try {
    const q = query(collection(db, 'standings'), where('tournamentId', '==', tournamentId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TournamentStanding);
    // Sort by points desc, then NRR desc
    return list.sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'standings');
  }
}

// ==========================================
// PLAYER, OPENER & BOWLER CUSTOMIZATION
// ==========================================

export async function updateInningsActivePlayers(
  inningsId: string,
  updates: {
    currentStrikerId?: string;
    currentNonStrikerId?: string;
    currentBowlerId?: string;
    battingScorecard?: Record<string, any>;
    bowlingScorecard?: Record<string, any>;
  },
  isDemo = false
): Promise<void> {
  const now = new Date().toISOString();
  if (isDemo) {
    if (demoLiveInningsState && demoLiveInningsState.id === inningsId) {
      if (updates.currentStrikerId) demoLiveInningsState.currentStrikerId = updates.currentStrikerId;
      if (updates.currentNonStrikerId) demoLiveInningsState.currentNonStrikerId = updates.currentNonStrikerId;
      if (updates.currentBowlerId) demoLiveInningsState.currentBowlerId = updates.currentBowlerId;
      if (updates.battingScorecard) {
        demoLiveInningsState.battingScorecard = {
          ...demoLiveInningsState.battingScorecard,
          ...updates.battingScorecard,
        };
      }
      if (updates.bowlingScorecard) {
        demoLiveInningsState.bowlingScorecard = {
          ...demoLiveInningsState.bowlingScorecard,
          ...updates.bowlingScorecard,
        };
      }
      demoLiveInningsState.updatedAt = now;
    }
    return;
  }
  try {
    const payload = sanitizeFirestoreData({
      ...updates,
      updatedAt: now,
    });
    await updateDoc(doc(db, 'innings', inningsId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `innings/${inningsId}`);
  }
}

export async function renameOrCustomizePlayer(
  playerId: string,
  newName: string,
  inningsId?: string,
  isDemo = false
): Promise<void> {
  const trimmedName = newName.trim();
  if (!trimmedName) return;

  if (isDemo) {
    const p = DEMO_PLAYERS.find((pl) => pl.id === playerId);
    if (p) p.name = trimmedName;

    if (demoLiveInningsState) {
      if (demoLiveInningsState.battingScorecard[playerId]) {
        demoLiveInningsState.battingScorecard[playerId].name = trimmedName;
      }
      if (demoLiveInningsState.bowlingScorecard[playerId]) {
        demoLiveInningsState.bowlingScorecard[playerId].name = trimmedName;
      }
    }
    return;
  }

  try {
    // 1. Update player doc if it exists
    try {
      await updateDoc(doc(db, 'players', playerId), sanitizeFirestoreData({ name: trimmedName }));
    } catch {
      // player might be transient or unlisted
    }

    // 2. Update innings scorecard if active
    if (inningsId) {
      const innSnap = await getDoc(doc(db, 'innings', inningsId));
      if (innSnap.exists()) {
        const innData = innSnap.data() as InningsData;
        let modified = false;
        if (innData.battingScorecard && innData.battingScorecard[playerId]) {
          innData.battingScorecard[playerId].name = trimmedName;
          modified = true;
        }
        if (innData.bowlingScorecard && innData.bowlingScorecard[playerId]) {
          innData.bowlingScorecard[playerId].name = trimmedName;
          modified = true;
        }
        if (modified) {
          await setDoc(doc(db, 'innings', inningsId), sanitizeFirestoreData(innData));
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `players/${playerId}`);
  }
}

export async function quickAddPlayerToTeam(
  teamId: string,
  playerName: string,
  role: PlayerRole = 'allRounder',
  isDemo = false,
  ownerId?: string
): Promise<Player> {
  const effectiveOwnerId = ownerId || auth.currentUser?.uid || 'guest_organizer';
  const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const cleanRole: PlayerRole = (role as any) === 'batsman' ? 'batter' : role;
  const newPlayer: Player = {
    id: playerId,
    name: playerName.trim().slice(0, 60),
    teamId,
    jerseyNumber: Math.floor(Math.random() * 99) + 1,
    role: cleanRole,
    battingStyle: 'right',
    bowlingStyle: cleanRole === 'bowler' ? 'pace' : 'none',
    ownerId: effectiveOwnerId,
    matches: 0,
    runs: 0,
    highestScore: 0,
    wickets: 0,
    fours: 0,
    sixes: 0,
    createdAt: new Date().toISOString(),
  };

  if (isDemo || !auth.currentUser) {
    DEMO_PLAYERS.push(newPlayer);
    return newPlayer;
  }

  try {
    await setDoc(doc(db, 'players', playerId), sanitizeFirestoreData(newPlayer));
    return newPlayer;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `players/${playerId}`);
  }
}
