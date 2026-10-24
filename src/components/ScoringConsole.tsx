import React, { useState, useMemo, useEffect } from 'react';
import {
  Match,
  InningsData,
  Player,
  PlayerRole,
  ExtraType,
  DismissalType,
  BallDismissal,
  BallEvent,
} from '../types/cricket';
import {
  calculateRunRate,
  calculateRequiredRunRate,
  calculateWinProbability,
  RecordBallInput,
} from '../lib/scoringEngine';
import {
  recordBall,
  undoLastBall,
  startSecondInnings,
  updateMatchVenueAndTeams,
  updateInningsActivePlayers,
  renameOrCustomizePlayer,
  quickAddPlayerToTeam,
} from '../services/cricketService';
import {
  ArrowLeftRight,
  RotateCcw,
  AlertCircle,
  Trophy,
  CheckCircle2,
  ChevronRight,
  User,
  Share2,
  FileText,
  Volume2,
  Edit3,
  MapPin,
  TrendingUp,
  Users,
  Plus,
  Check,
  X,
  Pencil,
} from 'lucide-react';

interface ScoringConsoleProps {
  match: Match;
  innings: InningsData;
  playersA: Player[];
  playersB: Player[];
  userId: string;
  isDemo?: boolean;
  onUpdate: (updatedMatch: Match, updatedInnings: InningsData) => void;
  onViewScorecard: () => void;
}

export const ScoringConsole: React.FC<ScoringConsoleProps> = ({
  match,
  innings,
  playersA,
  playersB,
  userId,
  isDemo = false,
  onUpdate,
  onViewScorecard,
}) => {
  // Local Squad state to reflect additions & renames instantly
  const [localPlayersA, setLocalPlayersA] = useState<Player[]>(playersA);
  const [localPlayersB, setLocalPlayersB] = useState<Player[]>(playersB);

  useEffect(() => {
    setLocalPlayersA(playersA);
  }, [playersA]);

  useEffect(() => {
    setLocalPlayersB(playersB);
  }, [playersB]);

  // Mapping for player names (combines squad records + live innings scorecard names)
  const allPlayers = useMemo(() => [...localPlayersA, ...localPlayersB], [localPlayersA, localPlayersB]);
  const playersMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPlayers.forEach((p) => {
      map[p.id] = p.name;
    });
    if (innings.battingScorecard) {
      Object.values(innings.battingScorecard).forEach((b) => {
        if (b.name) map[b.playerId] = b.name;
      });
    }
    if (innings.bowlingScorecard) {
      Object.values(innings.bowlingScorecard).forEach((b) => {
        if (b.name) map[b.playerId] = b.name;
      });
    }
    return map;
  }, [allPlayers, innings.battingScorecard, innings.bowlingScorecard]);

  const battingTeam = match.teamA.id === innings.battingTeamId ? match.teamA : match.teamB;
  const bowlingTeam = match.teamA.id === innings.bowlingTeamId ? match.teamA : match.teamB;
  const battingSquad = battingTeam.id === match.teamA.id ? localPlayersA : localPlayersB;
  const bowlingSquad = bowlingTeam.id === match.teamA.id ? localPlayersA : localPlayersB;

  // Keypad & Modals state
  const [selectedExtra, setSelectedExtra] = useState<ExtraType | null>(null);
  const [extraRunsInput, setExtraRunsInput] = useState<number>(0);
  const [showWicketModal, setShowWicketModal] = useState<boolean>(false);
  const [wicketType, setWicketType] = useState<DismissalType>('bowled');
  const [dismissedBatterId, setDismissedBatterId] = useState<string>(innings.currentStrikerId || '');
  const [assistFielderName, setAssistFielderName] = useState<string>('');
  const [incomingBatterId, setIncomingBatterId] = useState<string>('');
  const [isCustomIncomingBatter, setIsCustomIncomingBatter] = useState<boolean>(false);
  const [customIncomingBatterName, setCustomIncomingBatterName] = useState<string>('');
  const [showBowlerModal, setShowBowlerModal] = useState<boolean>(false);
  const [nextBowlerId, setNextBowlerId] = useState<string>('');
  const [isCustomNextBowler, setIsCustomNextBowler] = useState<boolean>(false);
  const [customNextBowlerName, setCustomNextBowlerName] = useState<string>('');
  const [showEndInningsModal, setShowEndInningsModal] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Match Customization State (Venue & Team Names)
  const [showEditMatchModal, setShowEditMatchModal] = useState<boolean>(false);
  const [editVenue, setEditVenue] = useState<string>(match.venue);
  const [editTitle, setEditTitle] = useState<string>(match.title);
  const [editTeamAName, setEditTeamAName] = useState<string>(match.teamA.name);
  const [editTeamBName, setEditTeamBName] = useState<string>(match.teamB.name);

  // Player & Opener Customization State
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [playerModalTab, setPlayerModalTab] = useState<'openers' | 'batters' | 'bowlers'>('openers');
  const [customStrikerName, setCustomStrikerName] = useState<string>('');
  const [customNonStrikerName, setCustomNonStrikerName] = useState<string>('');
  const [customBowlerName, setCustomBowlerName] = useState<string>('');
  const [selectedStrikerId, setSelectedStrikerId] = useState<string>(innings.currentStrikerId || '');
  const [selectedNonStrikerId, setSelectedNonStrikerId] = useState<string>(innings.currentNonStrikerId || '');
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>(innings.currentBowlerId || '');

  // Inline rename item
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState<string>('');

  // Quick add player to squad inputs
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('batter');

  // Available new batters (those not currently batting and not out)
  const availableBatters = useMemo(() => {
    return battingSquad.filter((p) => {
      const isCurrentlyBatting = p.id === innings.currentStrikerId || p.id === innings.currentNonStrikerId;
      const isAlreadyOut = innings.battingScorecard[p.id]?.isOut;
      return !isCurrentlyBatting && !isAlreadyOut;
    });
  }, [battingSquad, innings]);

  // Available bowlers (excluding the one who just bowled)
  const availableBowlers = useMemo(() => {
    return bowlingSquad.filter((p) => p.id !== innings.currentBowlerId);
  }, [bowlingSquad, innings.currentBowlerId]);

  // Current striker and non-striker scores
  const striker = innings.currentStrikerId
    ? innings.battingScorecard[innings.currentStrikerId] || {
        playerId: innings.currentStrikerId,
        name: playersMap[innings.currentStrikerId] || 'Striker',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      }
    : null;

  const nonStriker = innings.currentNonStrikerId
    ? innings.battingScorecard[innings.currentNonStrikerId] || {
        playerId: innings.currentNonStrikerId,
        name: playersMap[innings.currentNonStrikerId] || 'Non-Striker',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      }
    : null;

  const bowler = innings.currentBowlerId
    ? innings.bowlingScorecard[innings.currentBowlerId] || {
        playerId: innings.currentBowlerId,
        name: playersMap[innings.currentBowlerId] || 'Bowler',
        overs: '0.0',
        legalBalls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
      }
    : null;

  // Chase context
  const isChasing = innings.inningsNumber === 2 && typeof innings.target === 'number';
  const runsNeeded = isChasing ? Math.max(0, innings.target! - innings.totalRuns) : 0;
  const totalAllocatedBalls = match.rules.overs * 6;
  const ballsRemaining = Math.max(0, totalAllocatedBalls - innings.legalBalls);
  const currentRunRate = calculateRunRate(innings.totalRuns, innings.legalBalls);
  const requiredRunRate = isChasing ? calculateRequiredRunRate(runsNeeded, ballsRemaining) : null;

  // Dynamic Win Probability (updates with CRR, RRR, wickets in hand, and balls remaining)
  const winProb = useMemo(() => {
    return calculateWinProbability(match, innings);
  }, [match, innings]);

  // Trigger audio commentary chime or visual pop
  const showFeedback = (msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(null), 3000);
  };

  // Submit ball
  const handleScoreBall = async (runsBat: number) => {
    if (!innings.currentStrikerId || !innings.currentNonStrikerId || !innings.currentBowlerId) {
      alert('Please ensure striker, non-striker, and bowler are selected.');
      return;
    }
    if (innings.isCompleted || match.status === 'completed') {
      alert('This innings or match is completed.');
      return;
    }

    setLoadingAction(true);
    try {
      const input: RecordBallInput = {
        matchId: match.id,
        inningsId: innings.id,
        sequenceNumber: innings.legalBalls + innings.extras.wides + innings.extras.noBalls + 1,
        bowlerId: innings.currentBowlerId,
        bowlerName: playersMap[innings.currentBowlerId] || 'Bowler',
        strikerId: innings.currentStrikerId,
        strikerName: playersMap[innings.currentStrikerId] || 'Striker',
        nonStrikerId: innings.currentNonStrikerId,
        nonStrikerName: playersMap[innings.currentNonStrikerId] || 'Non-Striker',
        runsBat,
        extraType: selectedExtra || undefined,
        extraRuns: extraRunsInput > 0 ? extraRunsInput : undefined,
        scorerId: userId,
      };

      const result = await recordBall(match, innings, input, playersMap, isDemo);

      // Reset modifiers
      setSelectedExtra(null);
      setExtraRunsInput(0);

      // Check commentary feedback
      if (runsBat === 4) showFeedback('💥 FOUR! Smashed to the boundary!');
      else if (runsBat === 6) showFeedback('🚀 SIX! Huge hit out of the park!');
      else if (selectedExtra === 'wide') showFeedback('Wd: Wide delivery (+1)');
      else if (selectedExtra === 'noBall') showFeedback('Nb: No Ball! Free hit next ball');

      onUpdate(match, result.updatedInnings);

      // Handle over completion or innings end
      if (result.needsNewBowler) {
        setShowBowlerModal(true);
      }
      if (result.isInningsComplete) {
        setShowEndInningsModal(true);
      }
    } catch (err) {
      console.error('Failed to record ball:', err);
      alert('Error recording ball. Check network connection.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Submit wicket (supports selecting from squad or typing custom incoming batter)
  const handleConfirmWicket = async () => {
    let nextBatterId = incomingBatterId;
    let nextBatterName = incomingBatterId ? playersMap[incomingBatterId] : undefined;

    if (isCustomIncomingBatter && customIncomingBatterName.trim()) {
      const customName = customIncomingBatterName.trim();
      try {
        const newP = await quickAddPlayerToTeam(battingTeam.id, customName, 'batter', isDemo);
        if (battingTeam.id === match.teamA.id) {
          setLocalPlayersA((prev) => [...prev, newP]);
        } else {
          setLocalPlayersB((prev) => [...prev, newP]);
        }
        nextBatterId = newP.id;
        nextBatterName = newP.name;
      } catch (e) {
        console.error('Failed to create custom incoming batter:', e);
      }
    } else if (!incomingBatterId && availableBatters.length > 0) {
      alert('Please select or enter the incoming batter.');
      return;
    }

    setLoadingAction(true);
    try {
      const dismissal: BallDismissal = {
        type: wicketType,
        playerOutId: dismissedBatterId,
        assistPlayerName: assistFielderName.trim() || undefined,
      };

      const input: RecordBallInput = {
        matchId: match.id,
        inningsId: innings.id,
        sequenceNumber: innings.legalBalls + innings.extras.wides + innings.extras.noBalls + 1,
        bowlerId: innings.currentBowlerId!,
        bowlerName: playersMap[innings.currentBowlerId!] || 'Bowler',
        strikerId: innings.currentStrikerId!,
        strikerName: playersMap[innings.currentStrikerId!] || 'Striker',
        nonStrikerId: innings.currentNonStrikerId!,
        nonStrikerName: playersMap[innings.currentNonStrikerId!] || 'Non-Striker',
        runsBat: 0,
        extraType: selectedExtra || undefined,
        extraRuns: extraRunsInput > 0 ? extraRunsInput : undefined,
        dismissal,
        incomingBatterId: nextBatterId || undefined,
        incomingBatterName: nextBatterName,
        scorerId: userId,
      };

      const result = await recordBall(match, innings, input, playersMap, isDemo);

      setShowWicketModal(false);
      setSelectedExtra(null);
      setExtraRunsInput(0);
      setAssistFielderName('');
      setIncomingBatterId('');
      setIsCustomIncomingBatter(false);
      setCustomIncomingBatterName('');
      showFeedback(`⚡ WICKET! ${wicketType.toUpperCase()} - Out!`);

      onUpdate(match, result.updatedInnings);

      if (result.needsNewBowler) {
        setShowBowlerModal(true);
      }
      if (result.isInningsComplete) {
        setShowEndInningsModal(true);
      }
    } catch (err) {
      console.error('Failed to record wicket:', err);
      alert('Error recording wicket.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Manual strike rotation
  const handleManualSwapStrike = async () => {
    const updated: InningsData = {
      ...innings,
      currentStrikerId: innings.currentNonStrikerId,
      currentNonStrikerId: innings.currentStrikerId,
    };
    onUpdate(match, updated);
    showFeedback('Strike rotated manually');
    try {
      await updateInningsActivePlayers(
        innings.id,
        {
          currentStrikerId: updated.currentStrikerId,
          currentNonStrikerId: updated.currentNonStrikerId,
        },
        isDemo
      );
    } catch (e) {
      console.error('Failed to persist strike swap:', e);
    }
  };

  // Select next bowler (with optional on-the-fly custom name)
  const handleSelectNextBowler = async (bowlerId: string, customName?: string) => {
    let finalBowlerId = bowlerId;
    let finalBowlerName = playersMap[bowlerId] || 'Bowler';

    if (customName && customName.trim()) {
      try {
        const newP = await quickAddPlayerToTeam(bowlingTeam.id, customName.trim(), 'bowler', isDemo);
        if (bowlingTeam.id === match.teamA.id) {
          setLocalPlayersA((prev) => [...prev, newP]);
        } else {
          setLocalPlayersB((prev) => [...prev, newP]);
        }
        finalBowlerId = newP.id;
        finalBowlerName = newP.name;
      } catch (err) {
        console.error('Error creating custom bowler:', err);
      }
    }

    const updatedBowling = { ...innings.bowlingScorecard };
    if (!updatedBowling[finalBowlerId]) {
      updatedBowling[finalBowlerId] = {
        playerId: finalBowlerId,
        name: finalBowlerName,
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

    const updated: InningsData = {
      ...innings,
      currentBowlerId: finalBowlerId,
      bowlingScorecard: updatedBowling,
    };
    onUpdate(match, updated);
    setShowBowlerModal(false);
    setIsCustomNextBowler(false);
    setCustomNextBowlerName('');
    showFeedback(`New bowler: ${finalBowlerName}`);

    try {
      await updateInningsActivePlayers(
        innings.id,
        {
          currentBowlerId: finalBowlerId,
          bowlingScorecard: updatedBowling,
        },
        isDemo
      );
    } catch (e) {
      console.error('Failed to persist bowler change:', e);
    }
  };

  // Save changes to Openers, Striker, Non-Striker & Bowler
  const handleSaveOpenerChanges = async () => {
    setLoadingAction(true);
    try {
      let finalStrikerId = selectedStrikerId;
      let finalNonStrikerId = selectedNonStrikerId;
      let finalBowlerId = selectedBowlerId;

      const updatedScorecard = { ...innings.battingScorecard };
      const updatedBowling = { ...innings.bowlingScorecard };

      // 1. Custom striker name
      if (customStrikerName.trim()) {
        const trimmed = customStrikerName.trim();
        if (finalStrikerId) {
          await renameOrCustomizePlayer(finalStrikerId, trimmed, innings.id, isDemo);
          if (updatedScorecard[finalStrikerId]) {
            updatedScorecard[finalStrikerId] = { ...updatedScorecard[finalStrikerId], name: trimmed };
          }
        } else {
          const newP = await quickAddPlayerToTeam(battingTeam.id, trimmed, 'batter', isDemo);
          finalStrikerId = newP.id;
          if (battingTeam.id === match.teamA.id) {
            setLocalPlayersA((prev) => [...prev, newP]);
          } else {
            setLocalPlayersB((prev) => [...prev, newP]);
          }
        }
      }

      // 2. Custom non-striker name
      if (customNonStrikerName.trim()) {
        const trimmed = customNonStrikerName.trim();
        if (finalNonStrikerId) {
          await renameOrCustomizePlayer(finalNonStrikerId, trimmed, innings.id, isDemo);
          if (updatedScorecard[finalNonStrikerId]) {
            updatedScorecard[finalNonStrikerId] = { ...updatedScorecard[finalNonStrikerId], name: trimmed };
          }
        } else {
          const newP = await quickAddPlayerToTeam(battingTeam.id, trimmed, 'batter', isDemo);
          finalNonStrikerId = newP.id;
          if (battingTeam.id === match.teamA.id) {
            setLocalPlayersA((prev) => [...prev, newP]);
          } else {
            setLocalPlayersB((prev) => [...prev, newP]);
          }
        }
      }

      // 3. Custom bowler name
      if (customBowlerName.trim()) {
        const trimmed = customBowlerName.trim();
        if (finalBowlerId) {
          await renameOrCustomizePlayer(finalBowlerId, trimmed, innings.id, isDemo);
          if (updatedBowling[finalBowlerId]) {
            updatedBowling[finalBowlerId] = { ...updatedBowling[finalBowlerId], name: trimmed };
          }
        } else {
          const newP = await quickAddPlayerToTeam(bowlingTeam.id, trimmed, 'bowler', isDemo);
          finalBowlerId = newP.id;
          if (bowlingTeam.id === match.teamA.id) {
            setLocalPlayersA((prev) => [...prev, newP]);
          } else {
            setLocalPlayersB((prev) => [...prev, newP]);
          }
        }
      }

      if (finalStrikerId && finalNonStrikerId && finalStrikerId === finalNonStrikerId) {
        alert('Striker and Non-Striker must be two different players.');
        setLoadingAction(false);
        return;
      }

      // Ensure entries on scorecard
      if (finalStrikerId && !updatedScorecard[finalStrikerId]) {
        updatedScorecard[finalStrikerId] = {
          playerId: finalStrikerId,
          name: customStrikerName.trim() || playersMap[finalStrikerId] || 'Striker',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        };
      }
      if (finalNonStrikerId && !updatedScorecard[finalNonStrikerId]) {
        updatedScorecard[finalNonStrikerId] = {
          playerId: finalNonStrikerId,
          name: customNonStrikerName.trim() || playersMap[finalNonStrikerId] || 'Non-Striker',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        };
      }
      if (finalBowlerId && !updatedBowling[finalBowlerId]) {
        updatedBowling[finalBowlerId] = {
          playerId: finalBowlerId,
          name: customBowlerName.trim() || playersMap[finalBowlerId] || 'Bowler',
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

      const updatedInningsData: InningsData = {
        ...innings,
        currentStrikerId: finalStrikerId,
        currentNonStrikerId: finalNonStrikerId,
        currentBowlerId: finalBowlerId,
        battingScorecard: updatedScorecard,
        bowlingScorecard: updatedBowling,
      };

      await updateInningsActivePlayers(
        innings.id,
        {
          currentStrikerId: finalStrikerId,
          currentNonStrikerId: finalNonStrikerId,
          currentBowlerId: finalBowlerId,
          battingScorecard: updatedScorecard,
          bowlingScorecard: updatedBowling,
        },
        isDemo
      );

      onUpdate(match, updatedInningsData);
      setShowPlayerModal(false);
      showFeedback('Lineup & Openers updated successfully!');
    } catch (err) {
      console.error('Failed to update players:', err);
      alert('Failed to update players.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Rename single player anywhere in squad or scorecards
  const handleRenameSinglePlayer = async (playerId: string, newName: string) => {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    setLoadingAction(true);
    try {
      await renameOrCustomizePlayer(playerId, trimmed, innings.id, isDemo);

      setLocalPlayersA((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p))
      );
      setLocalPlayersB((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p))
      );

      const updatedInnings: InningsData = { ...innings };
      if (updatedInnings.battingScorecard[playerId]) {
        updatedInnings.battingScorecard[playerId] = {
          ...updatedInnings.battingScorecard[playerId],
          name: trimmed,
        };
      }
      if (updatedInnings.bowlingScorecard[playerId]) {
        updatedInnings.bowlingScorecard[playerId] = {
          ...updatedInnings.bowlingScorecard[playerId],
          name: trimmed,
        };
      }
      onUpdate(match, updatedInnings);
      setEditingPlayerId(null);
      setEditingPlayerName('');
      showFeedback(`Renamed to "${trimmed}"`);
    } catch (err) {
      console.error('Failed to rename player:', err);
      alert('Failed to rename player.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Add new player to squad on the fly
  const handleAddSquadPlayer = async (teamId: string) => {
    if (!newPlayerName.trim()) {
      alert('Please enter a player name.');
      return;
    }
    setLoadingAction(true);
    try {
      const p = await quickAddPlayerToTeam(teamId, newPlayerName.trim(), newPlayerRole, isDemo);
      if (teamId === match.teamA.id) {
        setLocalPlayersA((prev) => [...prev, p]);
      } else {
        setLocalPlayersB((prev) => [...prev, p]);
      }
      setNewPlayerName('');
      showFeedback(`Added ${p.name} to ${teamId === battingTeam.id ? 'Batting' : 'Bowling'} squad`);
    } catch (err) {
      console.error('Failed to add player:', err);
      alert('Error adding player.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Undo last ball
  const handleUndo = async () => {
    if (innings.legalBalls === 0 && innings.extras.total === 0) {
      alert('No balls to undo in this innings.');
      return;
    }
    if (!confirm('Undo the last recorded delivery? All figures and strike will be restored.')) {
      return;
    }

    setLoadingAction(true);
    try {
      const restoredInnings = await undoLastBall(match, innings, playersMap, userId, isDemo);
      onUpdate(match, restoredInnings);
      showFeedback('↩ Last delivery undone');
    } catch (err) {
      console.error('Failed to undo ball:', err);
      alert('Error undoing delivery.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Start Innings 2 handler
  const handleStartInnings2 = async (strikerId: string, nonStrikerId: string, bowlerId: string) => {
    setLoadingAction(true);
    try {
      const res = await startSecondInnings(
        match,
        innings,
        strikerId,
        nonStrikerId,
        bowlerId,
        isDemo
      );
      setShowEndInningsModal(false);
      onUpdate(res.match, res.innings2);
      showFeedback(`Innings 2 started! Target: ${res.innings2.target}`);
    } catch (err) {
      console.error('Failed to start innings 2:', err);
      alert('Error starting 2nd innings.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Save venue & team customization
  const handleSaveMatchCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVenue.trim() || !editTeamAName.trim() || !editTeamBName.trim()) {
      alert('Please provide venue and team names.');
      return;
    }
    setLoadingAction(true);
    try {
      await updateMatchVenueAndTeams(
        match.id,
        {
          venue: editVenue.trim(),
          title: editTitle.trim() || `${editTeamAName.trim()} vs ${editTeamBName.trim()}`,
          teamAName: editTeamAName.trim(),
          teamBName: editTeamBName.trim(),
        },
        isDemo
      );
      const updatedMatch: Match = {
        ...match,
        venue: editVenue.trim(),
        title: editTitle.trim() || `${editTeamAName.trim()} vs ${editTeamBName.trim()}`,
        teamA: { ...match.teamA, name: editTeamAName.trim() },
        teamB: { ...match.teamB, name: editTeamBName.trim() },
      };
      onUpdate(updatedMatch, innings);
      setShowEditMatchModal(false);
      showFeedback('Match venue & team names customized!');
    } catch (err) {
      console.error('Failed to update match customization:', err);
      alert('Error updating match details.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Toast Announcement banner */}
      {announcement && (
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-4 py-2 rounded-xl text-center font-bold text-sm shadow-lg shadow-emerald-950/40 animate-bounce">
          {announcement}
        </div>
      )}

      {/* MATCH HEADER & TOURNAMENT INFO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {match.rules.overs} Overs Match • {match.venue}
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              {match.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedStrikerId(innings.currentStrikerId || '');
                setSelectedNonStrikerId(innings.currentNonStrikerId || '');
                setSelectedBowlerId(innings.currentBowlerId || '');
                setCustomStrikerName(striker?.name || '');
                setCustomNonStrikerName(nonStriker?.name || '');
                setCustomBowlerName(bowler?.name || '');
                setPlayerModalTab('openers');
                setShowPlayerModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-700/60 transition cursor-pointer shadow-sm"
              title="Customize Openers, Bowler & Batting/Bowling Squads"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Players & Openers
            </button>
            <button
              onClick={() => {
                setEditVenue(match.venue);
                setEditTitle(match.title);
                setEditTeamAName(match.teamA.name);
                setEditTeamBName(match.teamB.name);
                setShowEditMatchModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
              title="Customize Venue & Team Names"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              Venue & Teams
            </button>
            <button
              onClick={onViewScorecard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Full Scorecard
            </button>
            <button
              onClick={handleUndo}
              disabled={loadingAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold border border-rose-800/40 transition cursor-pointer"
              title="Undo last recorded delivery"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo Ball
            </button>
          </div>
        </div>

        {/* MAIN BROADCAST SCOREBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-[#070b14]/80 p-4 rounded-xl border border-slate-800/80">
          {/* Batting Team Total */}
          <div className="md:col-span-2 flex items-baseline justify-between sm:justify-start gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white uppercase font-extrabold text-sm sm:text-base">
                  {battingTeam.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                  Innings {innings.inningsNumber}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl sm:text-6xl font-black text-white tracking-tight font-mono">
                  {innings.totalRuns}
                  <span className="text-slate-500 font-light text-3xl sm:text-4xl">/</span>
                  <span className="text-emerald-400 text-3xl sm:text-4xl">{innings.totalWickets}</span>
                </span>
                <span className="text-slate-300 text-lg sm:text-xl font-bold font-mono">
                  ({innings.oversCompleted} <span className="text-xs text-slate-400 font-sans">/ {innings.oversLimit} ov</span>)
                </span>
              </div>
            </div>
          </div>

          {/* Rate & Chase Metrics */}
          <div className="flex md:flex-col justify-between items-end border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4 space-y-1">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400">Current Run Rate (CRR)</span>
              <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                {currentRunRate}
              </p>
            </div>
            {isChasing && (
              <div className="text-right">
                <span className="text-[11px] font-bold text-amber-400">
                  Target: {innings.target} (Need {runsNeeded} off {ballsRemaining}b)
                </span>
                <p className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                  RRR: {requiredRunRate || '0.00'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DYNAMIC WIN PROBABILITY PREDICTOR */}
        <div className="mt-3.5 p-3 rounded-xl bg-[#060a16] border border-slate-800/90 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-200 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Live Win Probability
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-medium border border-slate-700/60">
                {winProb.momentumText}
              </span>
            </div>
            {winProb.projectedScore && (
              <span className="text-[11px] font-mono font-semibold text-amber-300">
                Projected Total: <strong className="text-white font-bold">{winProb.projectedScore}</strong>{' '}
                <span className="text-[10px] text-slate-400 font-sans">(Par: {Math.round(match.rules.overs * 9.5)})</span>
              </span>
            )}
          </div>

          {/* Animated Dual-Color Ratio Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${winProb.battingTeamWinProb}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-700 ease-out"
                title={`${battingTeam.name}: ${winProb.battingTeamWinProb}%`}
              />
              <div
                style={{ width: `${winProb.bowlingTeamWinProb}%` }}
                className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-700 ease-out"
                title={`${bowlingTeam.name}: ${winProb.bowlingTeamWinProb}%`}
              />
            </div>

            {/* Labels under the bar */}
            <div className="flex items-center justify-between text-xs font-black font-mono">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span>{battingTeam.name}</span>
                <span className="text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60 text-[11px] font-extrabold shadow-sm">
                  {winProb.battingTeamWinProb}%
                </span>
              </span>

              <span className="text-rose-400 flex items-center gap-1.5">
                <span className="text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-800/60 text-[11px] font-extrabold shadow-sm">
                  {winProb.bowlingTeamWinProb}%
                </span>
                <span>{bowlingTeam.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* RECENT BALLS IN OVER */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-slate-400 font-semibold mr-1">This Over:</span>
            {/* Show legal ball outcomes */}
            <div className="flex items-center gap-1.5 font-mono font-bold">
              {innings.legalBalls % 6 === 0 && innings.legalBalls > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[11px] border border-emerald-800">
                  Over Completed ({innings.oversCompleted})
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-xs">
                  Ball {innings.legalBalls % 6} of 6
                </span>
              )}
            </div>
          </div>
          <div className="text-slate-400 text-xs">
            Extras: <strong className="text-slate-200">{innings.extras.total}</strong> (w {innings.extras.wides}, nb {innings.extras.noBalls}, b {innings.extras.byes}, lb {innings.extras.legByes})
          </div>
        </div>
      </div>

      {/* BATTERS & CURRENT BOWLER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Batters Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Batting Pair
            </span>
            <button
              onClick={handleManualSwapStrike}
              className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              title="Manually switch striker"
            >
              <ArrowLeftRight className="w-3 h-3" />
              Swap Strike
            </button>
          </div>

          {/* Striker */}
          {striker && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-white">{striker.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStrikerId(innings.currentStrikerId || '');
                        setSelectedNonStrikerId(innings.currentNonStrikerId || '');
                        setSelectedBowlerId(innings.currentBowlerId || '');
                        setCustomStrikerName(striker?.name || '');
                        setCustomNonStrikerName(nonStriker?.name || '');
                        setCustomBowlerName(bowler?.name || '');
                        setPlayerModalTab('openers');
                        setShowPlayerModal(true);
                      }}
                      className="text-slate-400 hover:text-emerald-300 p-0.5 rounded transition cursor-pointer"
                      title="Edit Striker / Change Opener"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500 text-black font-black uppercase">
                      STRIKE
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">SR: {striker.strikeRate}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-300 font-mono">
                  {striker.runs}{' '}
                  <span className="text-xs font-normal text-slate-400">({striker.balls}b)</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  {striker.fours}x4 • {striker.sixes}x6
                </p>
              </div>
            </div>
          )}

          {/* Non-Striker */}
          {nonStriker && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-200">{nonStriker.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStrikerId(innings.currentStrikerId || '');
                      setSelectedNonStrikerId(innings.currentNonStrikerId || '');
                      setSelectedBowlerId(innings.currentBowlerId || '');
                      setCustomStrikerName(striker?.name || '');
                      setCustomNonStrikerName(nonStriker?.name || '');
                      setCustomBowlerName(bowler?.name || '');
                      setPlayerModalTab('openers');
                      setShowPlayerModal(true);
                    }}
                    className="text-slate-400 hover:text-emerald-300 p-0.5 rounded transition cursor-pointer"
                    title="Edit Non-Striker / Change Opener"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">SR: {nonStriker.strikeRate}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-200 font-mono">
                  {nonStriker.runs}{' '}
                  <span className="text-xs font-normal text-slate-400">({nonStriker.balls}b)</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  {nonStriker.fours}x4 • {nonStriker.sixes}x6
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Bowler Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Current Bowler
            </span>
            <button
              onClick={() => setShowBowlerModal(true)}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition cursor-pointer"
            >
              Change Bowler
            </button>
          </div>

          {bowler ? (
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-white">{bowler.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStrikerId(innings.currentStrikerId || '');
                      setSelectedNonStrikerId(innings.currentNonStrikerId || '');
                      setSelectedBowlerId(innings.currentBowlerId || '');
                      setCustomStrikerName(striker?.name || '');
                      setCustomNonStrikerName(nonStriker?.name || '');
                      setCustomBowlerName(bowler?.name || '');
                      setPlayerModalTab('openers');
                      setShowPlayerModal(true);
                    }}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                    title="Edit Bowler Name"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-base font-black text-rose-400 font-mono">
                  {bowler.wickets} <span className="text-xs text-slate-400 font-light">for</span>{' '}
                  {bowler.runsConceded}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-1.5">
                <span>Overs: <strong className="text-slate-200 font-mono">{bowler.overs}</strong></span>
                <span>Maidens: <strong className="text-slate-200 font-mono">{bowler.maidens}</strong></span>
                <span>Econ: <strong className="text-slate-200 font-mono">{bowler.economy}</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <button
                onClick={() => setShowBowlerModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
              >
                Select Bowler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DELIVERY MODIFIERS (WIDE, NO BALL, BYE, LEG BYE) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ball Modifiers
          </span>
          {selectedExtra && (
            <button
              onClick={() => {
                setSelectedExtra(null);
                setExtraRunsInput(0);
              }}
              className="text-xs font-semibold text-rose-400 hover:underline"
            >
              Clear Modifier
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedExtra(selectedExtra === 'wide' ? null : 'wide')}
            className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition ${
              selectedExtra === 'wide'
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-slate-800/80 text-amber-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Wide (+1)
          </button>
          <button
            onClick={() => setSelectedExtra(selectedExtra === 'noBall' ? null : 'noBall')}
            className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition ${
              selectedExtra === 'noBall'
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-slate-800/80 text-amber-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            No Ball (+1)
          </button>
          <button
            onClick={() => setSelectedExtra(selectedExtra === 'bye' ? null : 'bye')}
            className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition ${
              selectedExtra === 'bye'
                ? 'bg-sky-500 text-black border-sky-400 shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-sky-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Bye
          </button>
          <button
            onClick={() => setSelectedExtra(selectedExtra === 'legBye' ? null : 'legBye')}
            className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition ${
              selectedExtra === 'legBye'
                ? 'bg-sky-500 text-black border-sky-400 shadow-md shadow-sky-950/40'
                : 'bg-slate-800/80 text-sky-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Leg Bye
          </button>
        </div>

        {/* If wide or noball with additional runs */}
        {(selectedExtra === 'wide' || selectedExtra === 'noBall') && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <span>Additional runs on this delivery (e.g. overthrows or byes):</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 4].map((add) => (
                <button
                  key={add}
                  onClick={() => setExtraRunsInput(add)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition ${
                    extraRunsInput === add ? 'bg-amber-400 text-black' : 'bg-slate-800 text-amber-200'
                  }`}
                >
                  +{add}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PRIMARY RUN SCORING KEYPAD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="grid grid-cols-3 gap-3">
          {/* 0 DOT BALL */}
          <button
            onClick={() => handleScoreBall(0)}
            disabled={loadingAction}
            className="h-16 sm:h-20 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl border border-slate-700 shadow-lg flex flex-col items-center justify-center transition cursor-pointer"
          >
            <span>0</span>
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-widest font-semibold">
              Dot Ball
            </span>
          </button>

          {/* 1 SINGLE */}
          <button
            onClick={() => handleScoreBall(1)}
            disabled={loadingAction}
            className="h-16 sm:h-20 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl border border-slate-700 shadow-lg flex flex-col items-center justify-center transition cursor-pointer"
          >
            <span>1</span>
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-widest font-semibold">
              Single
            </span>
          </button>

          {/* 2 RUNS */}
          <button
            onClick={() => handleScoreBall(2)}
            disabled={loadingAction}
            className="h-16 sm:h-20 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl border border-slate-700 shadow-lg flex flex-col items-center justify-center transition cursor-pointer"
          >
            <span>2</span>
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-widest font-semibold">
              Double
            </span>
          </button>

          {/* 3 RUNS */}
          <button
            onClick={() => handleScoreBall(3)}
            disabled={loadingAction}
            className="h-16 sm:h-20 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl border border-slate-700 shadow-lg flex flex-col items-center justify-center transition cursor-pointer"
          >
            <span>3</span>
            <span className="text-[10px] font-sans text-slate-400 uppercase tracking-widest font-semibold">
              Three
            </span>
          </button>

          {/* 4 BOUNDARY */}
          <button
            onClick={() => handleScoreBall(4)}
            disabled={loadingAction}
            className="h-16 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl border border-emerald-400/40 shadow-lg shadow-emerald-950/50 flex flex-col items-center justify-center transition cursor-pointer"
          >
            <span>4</span>
            <span className="text-[10px] font-sans text-emerald-200 uppercase tracking-widest font-extrabold">
              Four!
            </span>
          </button>

          {/* 6 MAXIMUM */}
          <button
            onClick={() => handleScoreBall(6)}
            disabled={loadingAction}
            className="h-16 sm:h-20 rounded-2xl bg-gradient-to-br from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 active:scale-95 text-slate-950 font-mono font-black text-2xl sm:text-3xl border border-lime-300 shadow-lg shadow-lime-950/50 flex flex-col items-center justify-center transition cursor-pointer"
          >
            <span>6</span>
            <span className="text-[10px] font-sans text-slate-950 uppercase tracking-widest font-black">
              Sixer!
            </span>
          </button>
        </div>

        {/* WICKET ACTION BUTTON */}
        <div className="mt-3">
          <button
            onClick={() => {
              setDismissedBatterId(innings.currentStrikerId || '');
              setShowWicketModal(true);
            }}
            disabled={loadingAction}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:scale-[0.98] text-white font-black text-lg tracking-wider border border-rose-400/30 shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition cursor-pointer uppercase"
          >
            <AlertCircle className="w-5 h-5 text-white" />
            Wicket!
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* WICKET MODAL */}
      {/* ======================================================== */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-rose-400 uppercase flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Dismissal Details
              </h3>
              <button
                onClick={() => setShowWicketModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>

            {/* Who is Out */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Batter Dismissed
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDismissedBatterId(innings.currentStrikerId || '')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                    dismissedBatterId === innings.currentStrikerId
                      ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  Striker ({striker?.name})
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedBatterId(innings.currentNonStrikerId || '')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                    dismissedBatterId === innings.currentNonStrikerId
                      ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  Non-Striker ({nonStriker?.name})
                </button>
              </div>
            </div>

            {/* Dismissal Type */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Method of Dismissal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bowled', label: 'Bowled' },
                  { id: 'caught', label: 'Caught' },
                  { id: 'runOut', label: 'Run Out' },
                  { id: 'lbw', label: 'LBW' },
                  { id: 'stumped', label: 'Stumped' },
                  { id: 'hitWicket', label: 'Hit Wkt' },
                  { id: 'retiredHurt', label: 'Ret. Hurt' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setWicketType(type.id as DismissalType)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                      wicketType === type.id
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fielder assist (for caught, run-out, stumped) */}
            {(wicketType === 'caught' || wicketType === 'runOut' || wicketType === 'stumped') && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Fielder / Wicketkeeper Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kabir Khan"
                  value={assistFielderName}
                  onChange={(e) => setAssistFielderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Next Incoming Batter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Next Incoming Batter
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomIncomingBatter(!isCustomIncomingBatter)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  {isCustomIncomingBatter ? 'Pick from squad list' : 'Custom / New Batter'}
                </button>
              </div>

              {isCustomIncomingBatter ? (
                <div>
                  <input
                    type="text"
                    placeholder="Enter custom batter name (e.g. Bunty, Rohit)..."
                    value={customIncomingBatterName}
                    onChange={(e) => setCustomIncomingBatterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/70 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Will be added to {battingTeam.name} and sent in to bat.
                  </p>
                </div>
              ) : (
                <select
                  value={incomingBatterId}
                  onChange={(e) => setIncomingBatterId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Next Batter --</option>
                  {availableBatters.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.jerseyNumber} {b.name} ({b.role})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleConfirmWicket}
              disabled={loadingAction}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm uppercase shadow-lg shadow-rose-950/50 transition cursor-pointer"
            >
              Confirm Wicket
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* OVER COMPLETE / CHANGE BOWLER MODAL */}
      {/* ======================================================== */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Select Bowler for Over
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowBowlerModal(false);
                  setIsCustomNextBowler(false);
                }}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              The previous bowler ({bowler?.name}) cannot bowl consecutive overs under cricket rules.
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {availableBowlers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectNextBowler(b.id)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:border-emerald-500/50 border border-slate-700 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div>
                    <span className="text-sm font-bold text-white">#{b.jerseyNumber} {b.name}</span>
                    <p className="text-[11px] text-slate-400 capitalize">{b.bowlingStyle} {b.role}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              ))}
            </div>

            {/* Custom Bowler Option */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => setIsCustomNextBowler(!isCustomNextBowler)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCustomNextBowler ? 'Select from available bowlers' : 'Type custom bowler name'}
              </button>

              {isCustomNextBowler && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Sonu, Irfan, etc."
                    value={customNextBowlerName}
                    onChange={(e) => setCustomNextBowlerName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectNextBowler('', customNextBowlerName)}
                    disabled={!customNextBowlerName.trim()}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INNINGS END / START 2ND INNINGS MODAL */}
      {/* ======================================================== */}
      {showEndInningsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <Trophy className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-black text-white">
                Innings {innings.inningsNumber} Complete!
              </h3>
              <p className="text-sm text-slate-300 font-mono">
                {battingTeam.name} scored <strong className="text-emerald-400">{innings.totalRuns}/{innings.totalWickets}</strong> in {innings.oversCompleted} overs.
              </p>
            </div>

            {innings.inningsNumber === 1 ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center">
                  <span className="text-xs text-slate-300 font-semibold uppercase">Target for {bowlingTeam.name}</span>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    {innings.totalRuns + 1} Runs
                  </p>
                  <span className="text-xs text-slate-400">
                    Required Run Rate: {((innings.totalRuns + 1) / match.rules.overs).toFixed(2)} rpo
                  </span>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  Select opening batters and opening bowler to kick off the chase.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const squad = bowlingSquad;
                      const s1 = squad[0]?.id || '';
                      const s2 = squad[1]?.id || '';
                      const b1 = battingSquad[0]?.id || '';
                      handleStartInnings2(s1, s2, b1);
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition"
                  >
                    Start 2nd Innings (The Chase)
                  </button>
                  <button
                    onClick={onViewScorecard}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                  >
                    View Innings 1 Scorecard
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2 text-center">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase">Match Result</span>
                  <h4 className="text-lg font-black text-emerald-400 mt-1">
                    {match.result?.summary || 'Match Concluded'}
                  </h4>
                </div>
                <button
                  onClick={onViewScorecard}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition"
                >
                  View Final Scorecard & Match Summary
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CUSTOMIZE VENUE & TEAM NAMES MODAL */}
      {/* ======================================================== */}
      {showEditMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveMatchCustomization}
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                Customize Match Venue & Teams
              </h3>
              <button
                type="button"
                onClick={() => setShowEditMatchModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Match Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. MGPL Derby Match"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase flex items-center justify-between">
                <span>Match Venue / Ground</span>
                <span className="text-[10px] text-slate-500">Live Ground</span>
              </label>
              <input
                type="text"
                required
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                placeholder="e.g. Shivaji Park Corner Box"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {['Shivaji Park', 'Bandra Box Turf', 'Cross Maidan', 'Azad Maidan', 'Custom Ground'].map(
                  (v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditVenue(v)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition"
                    >
                      {v}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Team A Name
                </label>
                <input
                  type="text"
                  required
                  value={editTeamAName}
                  onChange={(e) => setEditTeamAName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Team B Name
                </label>
                <input
                  type="text"
                  required
                  value={editTeamBName}
                  onChange={(e) => setEditTeamBName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingAction}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              {loadingAction ? 'Saving...' : 'Save Venue & Team Customization'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* CUSTOMIZE PLAYERS, OPENERS & LINEUP MODAL */}
      {/* ======================================================== */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Customize Players & Openers
                </h3>
                <p className="text-xs text-slate-400">
                  Manage active openers, bowlers, and customize player names
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPlayerModal(false);
                  setEditingPlayerId(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPlayerModalTab('openers')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  playerModalTab === 'openers'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Openers & Bowler
              </button>
              <button
                type="button"
                onClick={() => setPlayerModalTab('batters')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  playerModalTab === 'batters'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Batters ({battingSquad.length})
              </button>
              <button
                type="button"
                onClick={() => setPlayerModalTab('bowlers')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  playerModalTab === 'bowlers'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bowlers ({bowlingSquad.length})
              </button>
            </div>

            {/* TAB 1: OPENERS & ACTIVE BOWLER */}
            {playerModalTab === 'openers' && (
              <div className="space-y-4 pt-1">
                {/* Opener 1: Striker */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Opening Striker ({battingTeam.name})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Current: {striker?.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Select from Squad
                      </label>
                      <select
                        value={selectedStrikerId}
                        onChange={(e) => {
                          setSelectedStrikerId(e.target.value);
                          setCustomStrikerName(playersMap[e.target.value] || '');
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose Striker --</option>
                        {battingSquad.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.jerseyNumber} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Or Type / Rename Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rohit, Bunny, etc."
                        value={customStrikerName}
                        onChange={(e) => setCustomStrikerName(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Opener 2: Non-Striker */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Opening Non-Striker ({battingTeam.name})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Current: {nonStriker?.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Select from Squad
                      </label>
                      <select
                        value={selectedNonStrikerId}
                        onChange={(e) => {
                          setSelectedNonStrikerId(e.target.value);
                          setCustomNonStrikerName(playersMap[e.target.value] || '');
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose Non-Striker --</option>
                        {battingSquad.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.jerseyNumber} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Or Type / Rename Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul, Sonu, etc."
                        value={customNonStrikerName}
                        onChange={(e) => setCustomNonStrikerName(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Bowler */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Current Bowler ({bowlingTeam.name})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Current: {bowler?.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Select from Squad
                      </label>
                      <select
                        value={selectedBowlerId}
                        onChange={(e) => {
                          setSelectedBowlerId(e.target.value);
                          setCustomBowlerName(playersMap[e.target.value] || '');
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose Bowler --</option>
                        {bowlingSquad.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.jerseyNumber} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Or Type / Rename Bowler
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bumrah, Shami, etc."
                        value={customBowlerName}
                        onChange={(e) => setCustomBowlerName(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleManualSwapStrike}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                    Swap Ends
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOpenerChanges}
                    disabled={loadingAction}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                  >
                    {loadingAction ? 'Updating...' : 'Save & Apply Lineup Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: BATTERS ROSTER */}
            {playerModalTab === 'batters' && (
              <div className="space-y-3 pt-1">
                {/* Quick Add Batter */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add New Batter to {battingTeam.name}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Player Name (e.g. Suresh, Vicky)..."
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSquadPlayer(battingTeam.id)}
                      disabled={!newPlayerName.trim() || loadingAction}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* List of Batters with Rename functionality */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {battingSquad.map((p) => {
                    const isEditing = editingPlayerId === p.id;
                    const isStriker = p.id === innings.currentStrikerId;
                    const isNonStriker = p.id === innings.currentNonStrikerId;
                    const batterStats = innings.battingScorecard[p.id];

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isStriker
                            ? 'bg-emerald-950/40 border-emerald-500/50'
                            : isNonStriker
                            ? 'bg-slate-800/80 border-slate-700'
                            : 'bg-slate-950 border-slate-800/80'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingPlayerName}
                              onChange={(e) => setEditingPlayerName(e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500 text-white text-xs font-bold focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameSinglePlayer(p.id, editingPlayerName)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                              title="Save Name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlayerId(null)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                                #{p.jerseyNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{p.name}</span>
                                  {isStriker && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-black font-black">
                                      STRIKE
                                    </span>
                                  )}
                                  {isNonStriker && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-bold">
                                      NON-STRIKE
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {batterStats
                                    ? `${batterStats.runs} runs (${batterStats.balls}b) • ${batterStats.isOut ? 'Out' : 'Not out'}`
                                    : p.role}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlayerId(p.id);
                                setEditingPlayerName(p.name);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                              title="Rename Player"
                            >
                              <Pencil className="w-3 h-3 text-emerald-400" />
                              Rename
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: BOWLERS ROSTER */}
            {playerModalTab === 'bowlers' && (
              <div className="space-y-3 pt-1">
                {/* Quick Add Bowler */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add New Bowler to {bowlingTeam.name}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Player Name (e.g. Jasprit, Sameer)..."
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSquadPlayer(bowlingTeam.id)}
                      disabled={!newPlayerName.trim() || loadingAction}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* List of Bowlers with Rename functionality */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {bowlingSquad.map((p) => {
                    const isEditing = editingPlayerId === p.id;
                    const isCurrentBowler = p.id === innings.currentBowlerId;
                    const bowlerStats = innings.bowlingScorecard[p.id];

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isCurrentBowler
                            ? 'bg-rose-950/40 border-rose-500/50'
                            : 'bg-slate-950 border-slate-800/80'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingPlayerName}
                              onChange={(e) => setEditingPlayerName(e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-rose-500 text-white text-xs font-bold focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameSinglePlayer(p.id, editingPlayerName)}
                              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition"
                              title="Save Name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlayerId(null)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                                #{p.jerseyNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{p.name}</span>
                                  {isCurrentBowler && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-black">
                                      BOWLING
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {bowlerStats
                                    ? `${bowlerStats.wickets}/${bowlerStats.runsConceded} (${bowlerStats.overs} ov)`
                                    : `${p.bowlingStyle} ${p.role}`}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlayerId(p.id);
                                setEditingPlayerName(p.name);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                              title="Rename Bowler"
                            >
                              <Pencil className="w-3 h-3 text-rose-400" />
                              Rename
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
