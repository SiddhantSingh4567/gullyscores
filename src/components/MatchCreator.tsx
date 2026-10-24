import React, { useState, useEffect } from 'react';
import { Team, Player, Match, MatchRules, TossDecision } from '../types/cricket';
import { createMatch, quickAddPlayerToTeam } from '../services/cricketService';
import { auth } from '../lib/firebase';
import {
  PlayCircle,
  Shield,
  Award,
  Calendar,
  MapPin,
  Settings2,
  Users,
  Edit3,
  Sparkles,
} from 'lucide-react';

interface MatchCreatorProps {
  teams: Team[];
  playersByTeam: Record<string, Player[]>;
  userId: string;
  isDemo?: boolean;
  onMatchCreated: (match: Match) => void;
  onCancel: () => void;
}

const POPULAR_VENUES = [
  'Shivaji Park Corner Box',
  'Bandra Reclamation Turf',
  'Cross Maidan Pitch 3',
  'Azad Maidan Concrete Net',
  'Dadar Portuguese Church Gully',
  'Juhu Beach Sandy Pitch',
  'Koramangala 8th Block Turf',
  'Chandni Chowk Ground',
];

export const MatchCreator: React.FC<MatchCreatorProps> = ({
  teams,
  playersByTeam,
  userId,
  isDemo = false,
  onMatchCreated,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [venue, setVenue] = useState<string>('Shivaji Park Corner Box');
  const [pitchType, setPitchType] = useState<string>('Concrete');
  const [teamAId, setTeamAId] = useState<string>(teams[0]?.id || '');
  const [teamBId, setTeamBId] = useState<string>(teams[1]?.id || '');

  // Customizable Team Names for this match
  const [customTeamAName, setCustomTeamAName] = useState<string>('');
  const [customTeamBName, setCustomTeamBName] = useState<string>('');

  const [overs, setOvers] = useState<number>(6);
  const [playersPerTeam, setPlayersPerTeam] = useState<number>(6);
  const [wideRuns, setWideRuns] = useState<number>(1);
  const [noBallRuns, setNoBallRuns] = useState<number>(1);
  const [freeHit, setFreeHit] = useState<boolean>(true);
  const [lbwAllowed, setLbwAllowed] = useState<boolean>(false);

  // Step 2: Toss
  const [tossWinnerId, setTossWinnerId] = useState<string>(teamAId);
  const [tossDecision, setTossDecision] = useState<TossDecision>('bat');

  // Step 3: Openers & Bowlers
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');
  const [customStrikerName, setCustomStrikerName] = useState<string>('');
  const [customNonStrikerName, setCustomNonStrikerName] = useState<string>('');
  const [customBowlerName, setCustomBowlerName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);

  // Sync custom names with selected teams if not edited
  useEffect(() => {
    if (teamA) {
      setCustomTeamAName(teamA.name);
      if (teamA.homeVenue && !venue) {
        setVenue(teamA.homeVenue);
      }
    }
  }, [teamAId]);

  useEffect(() => {
    if (teamB) {
      setCustomTeamBName(teamB.name);
    }
  }, [teamBId]);

  const teamAPlayers = playersByTeam[teamAId] || [];
  const teamBPlayers = playersByTeam[teamBId] || [];

  // Effective Team Names
  const effectiveTeamAName = customTeamAName.trim() || teamA?.name || 'Team A';
  const effectiveTeamBName = customTeamBName.trim() || teamB?.name || 'Team B';

  // Determine who bats first based on toss
  const battingTeamId =
    tossDecision === 'bat'
      ? tossWinnerId === teamAId
        ? teamAId
        : teamBId
      : tossWinnerId === teamAId
      ? teamBId
      : teamAId;

  const battingTeamName = battingTeamId === teamAId ? effectiveTeamAName : effectiveTeamBName;
  const bowlingTeamName = battingTeamId === teamAId ? effectiveTeamBName : effectiveTeamAName;

  const battingSquad = battingTeamId === teamAId ? teamAPlayers : teamBPlayers;
  const bowlingSquad = battingTeamId === teamAId ? teamBPlayers : teamAPlayers;

  // Validation
  const handleProceedToToss = () => {
    if (!teamAId || !teamBId) {
      alert('Please select two distinct teams.');
      return;
    }
    if (teamAId === teamBId) {
      alert('Team A and Team B must be different teams!');
      return;
    }
    if (!venue.trim()) {
      alert('Please specify a match venue or ground.');
      return;
    }
    if (!title.trim()) {
      setTitle(`${effectiveTeamAName} vs ${effectiveTeamBName}`);
    }
    setTossWinnerId(teamAId);
    setStep(2);
  };

  const handleProceedToOpeners = () => {
    if (battingSquad.length >= 2) {
      setStrikerId(battingSquad[0].id);
      setNonStrikerId(battingSquad[1].id);
    }
    if (bowlingSquad.length >= 1) {
      setBowlerId(bowlingSquad[0].id);
    }
    setStep(3);
  };

  const handleStartMatch = async () => {
    if (loading) return;

    if (!teamA || !teamB) {
      alert('Selected teams could not be found. Please return to Step 1 and select valid teams.');
      return;
    }
    if (teamA.id === teamB.id) {
      alert('Team A and Team B must be different teams.');
      return;
    }
    if (!venue.trim()) {
      alert('Please enter a match venue.');
      return;
    }

    setLoading(true);
    try {
      const effectiveUserId = auth.currentUser?.uid || userId || 'guest_organizer';

      let finalStrikerId = strikerId;
      let finalNonStrikerId = nonStrikerId;
      let finalBowlerId = bowlerId;

      const selectedStrikerPlayer = battingSquad.find((p) => p.id === strikerId);
      const isNewCustomStriker =
        customStrikerName.trim().length > 0 &&
        (!strikerId || customStrikerName.trim() !== selectedStrikerPlayer?.name);

      if (isNewCustomStriker) {
        if (customStrikerName.trim().length < 2) {
          alert('Custom striker name must be at least 2 characters.');
          setLoading(false);
          return;
        }
        const p = await quickAddPlayerToTeam(battingTeamId, customStrikerName.trim(), 'batter', isDemo, effectiveUserId);
        finalStrikerId = p.id;
      }

      const selectedNonStrikerPlayer = battingSquad.find((p) => p.id === nonStrikerId);
      const isNewCustomNonStriker =
        customNonStrikerName.trim().length > 0 &&
        (!nonStrikerId || customNonStrikerName.trim() !== selectedNonStrikerPlayer?.name);

      if (isNewCustomNonStriker) {
        if (customNonStrikerName.trim().length < 2) {
          alert('Custom non-striker name must be at least 2 characters.');
          setLoading(false);
          return;
        }
        const p = await quickAddPlayerToTeam(battingTeamId, customNonStrikerName.trim(), 'batter', isDemo, effectiveUserId);
        finalNonStrikerId = p.id;
      }

      const bowlingTeamId = battingTeamId === teamA.id ? teamB.id : teamA.id;
      const selectedBowlerPlayer = bowlingSquad.find((p) => p.id === bowlerId);
      const isNewCustomBowler =
        customBowlerName.trim().length > 0 &&
        (!bowlerId || customBowlerName.trim() !== selectedBowlerPlayer?.name);

      if (isNewCustomBowler) {
        if (customBowlerName.trim().length < 2) {
          alert('Custom opening bowler name must be at least 2 characters.');
          setLoading(false);
          return;
        }
        const p = await quickAddPlayerToTeam(bowlingTeamId, customBowlerName.trim(), 'bowler', isDemo, effectiveUserId);
        finalBowlerId = p.id;
      }

      if (!finalStrikerId || !finalNonStrikerId || !finalBowlerId) {
        alert('Please select or enter Striker, Non-Striker, and Opening Bowler.');
        setLoading(false);
        return;
      }
      if (finalStrikerId === finalNonStrikerId) {
        alert('Striker and Non-Striker must be two different players.');
        setLoading(false);
        return;
      }

      // Ensure venue and title do not exceed schema/rule bounds (100 chars)
      const rawVenue = venue.trim();
      const fullVenueString = (pitchType ? `${rawVenue} (${pitchType} Pitch)` : rawVenue).slice(0, 100);
      const rawTitle = title.trim() || `${effectiveTeamAName} vs ${effectiveTeamBName}`;
      const clampedTitle = rawTitle.slice(0, 100);

      const rules: MatchRules = {
        overs,
        playersPerTeam,
        wideRuns,
        noBallRuns,
        freeHitOnNoBall: freeHit,
        lbwAllowed,
        maxOversPerBowler: Math.max(1, Math.ceil(overs / 5)),
      };

      // Assemble Playing XI, ensuring openers and bowlers are incorporated
      const basePlayingA = teamAPlayers.slice(0, playersPerTeam).map((p) => p.id);
      const extraA = battingTeamId === teamA.id ? [finalStrikerId, finalNonStrikerId] : [finalBowlerId];
      const playingXI_A = Array.from(new Set([...basePlayingA, ...extraA])).filter(Boolean);

      const basePlayingB = teamBPlayers.slice(0, playersPerTeam).map((p) => p.id);
      const extraB = battingTeamId === teamB.id ? [finalStrikerId, finalNonStrikerId] : [finalBowlerId];
      const playingXI_B = Array.from(new Set([...basePlayingB, ...extraB])).filter(Boolean);

      const matchData = {
        title: clampedTitle,
        venue: fullVenueString,
        scheduledDate: new Date().toISOString(),
        rules,
        status: 'live' as const,
        teamAId: teamA.id,
        teamBId: teamB.id,
        overs,
        playersPerTeam,
        teamA: {
          id: teamA.id,
          name: effectiveTeamAName.slice(0, 60),
          shortCode: teamA.shortCode,
          playingXI: playingXI_A,
        },
        teamB: {
          id: teamB.id,
          name: effectiveTeamBName.slice(0, 60),
          shortCode: teamB.shortCode,
          playingXI: playingXI_B,
        },
        toss: {
          winnerTeamId: tossWinnerId,
          decision: tossDecision,
        },
        ownerId: effectiveUserId,
        assignedScorerIds: [effectiveUserId],
        isPublic: true,
      };

      const { match } = await createMatch(
        matchData,
        finalStrikerId,
        finalNonStrikerId,
        finalBowlerId,
        isDemo
      );

      onMatchCreated(match);
    } catch (err: any) {
      const errCode = err?.code || err?.name || 'UNKNOWN';
      const errMsg = err?.message || String(err);
      console.error('Failed to create match:', { code: errCode, message: errMsg, error: err });

      let userMsg = errMsg;
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed.error) {
          if (parsed.error.includes('Missing or insufficient permissions')) {
            userMsg = 'Permission denied: Please ensure you are signed in with Google to create matches.';
          } else {
            userMsg = parsed.error;
          }
        }
      } catch {
        if (errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions')) {
          userMsg = 'Permission denied: Please ensure you are signed in with Google to create matches.';
        }
      }
      alert(`Error creating match: ${userMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Wizard Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                step >= 1 ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </span>
            <span className="text-xs font-bold text-slate-300">Teams & Venue</span>
            <span className="text-slate-600">→</span>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                step >= 2 ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </span>
            <span className="text-xs font-bold text-slate-300">Toss</span>
            <span className="text-slate-600">→</span>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                step >= 3 ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </span>
            <span className="text-xs font-bold text-slate-300">Openers</span>
          </div>
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        {/* STEP 1: TEAMS & VENUE CUSTOMIZATION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white">Match Setup & Venue</h2>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Customizable
              </span>
            </div>

            {/* Optional Title */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                Match Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Sunday Gully Derby / Box Cricket QF"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* TEAM CUSTOMIZATION SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              {/* Team A Selection & Custom Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Team A (Home Squad)
                </label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                    Customize Team A Name for this match:
                  </label>
                  <input
                    type="text"
                    value={customTeamAName}
                    onChange={(e) => setCustomTeamAName(e.target.value)}
                    placeholder="e.g. Dharavi Daredevils XI"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Team B Selection & Custom Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Team B (Away Squad)
                </label>
                <select
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                    Customize Team B Name for this match:
                  </label>
                  <input
                    type="text"
                    value={customTeamBName}
                    onChange={(e) => setCustomTeamBName(e.target.value)}
                    placeholder="e.g. Bandra Blasters XI"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* VENUE & PITCH CUSTOMIZATION */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Match Venue & Ground
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Type or pick preset</span>
              </label>

              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Shivaji Park Corner Box / Bandra Reclamation Turf"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />

              {/* Quick Venue Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_VENUES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVenue(v)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      venue === v
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Pitch Surface Selector */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Playing Surface / Pitch Type:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {['Concrete', 'Box Turf', 'Matting / Mud', 'Street Asphalt'].map((surface) => (
                    <button
                      key={surface}
                      type="button"
                      onClick={() => setPitchType(surface)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                        pitchType === surface
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {surface}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Overs & Players Per Team */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                  Overs Per Innings
                </label>
                <div className="flex gap-1.5">
                  {[5, 6, 8, 10, 15, 20].map((ov) => (
                    <button
                      key={ov}
                      type="button"
                      onClick={() => setOvers(ov)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition font-mono ${
                        overs === ov
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {ov}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                  Players Per Side
                </label>
                <div className="flex gap-1.5">
                  {[6, 7, 8, 9, 11].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlayersPerTeam(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition font-mono ${
                        playersPerTeam === p
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gully Cricket Custom Rules */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                Street / Box Cricket Rules
              </span>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeHit}
                    onChange={(e) => setFreeHit(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span>Free Hit on No-Ball</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lbwAllowed}
                    onChange={(e) => setLbwAllowed(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span>LBW Allowed (Gully off)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleProceedToToss}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              Continue to Toss →
            </button>
          </div>
        )}

        {/* STEP 2: TOSS */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-white">Toss Result</h2>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                Who won the Toss?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTossWinnerId(teamAId)}
                  className={`p-3.5 rounded-2xl border text-sm font-extrabold transition text-left ${
                    tossWinnerId === teamAId
                      ? 'bg-emerald-950/50 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-400 mb-1" />
                  {effectiveTeamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setTossWinnerId(teamBId)}
                  className={`p-3.5 rounded-2xl border text-sm font-extrabold transition text-left ${
                    tossWinnerId === teamBId
                      ? 'bg-emerald-950/50 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-400 mb-1" />
                  {effectiveTeamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                Decision
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  className={`p-3 rounded-xl border text-sm font-bold transition ${
                    tossDecision === 'bat'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Elected to BAT first
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  className={`p-3 rounded-xl border text-sm font-bold transition ${
                    tossDecision === 'bowl'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Elected to BOWL first
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              Batting First: <strong className="text-emerald-400 text-sm">{battingTeamName}</strong>
              <br />
              Bowling First: <strong className="text-white text-sm">{bowlingTeamName}</strong>
              <br />
              Venue: <strong className="text-slate-300">{venue}</strong> ({pitchType})
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
              >
                ← Back
              </button>
              <button
                onClick={handleProceedToOpeners}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40"
              >
                Select Opening Batters & Bowler →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OPENERS SELECTION */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-white">Opening Configuration</h2>

            {/* Striker */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-emerald-400 uppercase">
                Opening Striker ({battingTeamName})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={strikerId}
                  onChange={(e) => {
                    setStrikerId(e.target.value);
                    if (e.target.value) setCustomStrikerName('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select from Squad --</option>
                  {battingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.name} ({p.role})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type custom striker name..."
                  value={customStrikerName}
                  onChange={(e) => {
                    setCustomStrikerName(e.target.value);
                    if (e.target.value.trim()) setStrikerId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Non-Striker */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Opening Non-Striker ({battingTeamName})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={nonStrikerId}
                  onChange={(e) => {
                    setNonStrikerId(e.target.value);
                    if (e.target.value) setCustomNonStrikerName('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select from Squad --</option>
                  {battingSquad
                    .filter((p) => p.id !== strikerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber} {p.name} ({p.role})
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type custom non-striker name..."
                  value={customNonStrikerName}
                  onChange={(e) => {
                    setCustomNonStrikerName(e.target.value);
                    if (e.target.value.trim()) setNonStrikerId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Opening Bowler */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-rose-400 uppercase">
                Opening Bowler ({bowlingTeamName})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={bowlerId}
                  onChange={(e) => {
                    setBowlerId(e.target.value);
                    if (e.target.value) setCustomBowlerName('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select from Squad --</option>
                  {bowlingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.name} ({p.bowlingStyle} {p.role})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type custom bowler name..."
                  value={customBowlerName}
                  onChange={(e) => {
                    setCustomBowlerName(e.target.value);
                    if (e.target.value.trim()) setBowlerId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
              >
                ← Back
              </button>
              <button
                onClick={handleStartMatch}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                {loading ? 'Starting Match...' : 'Start Match & Begin Scoring'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
