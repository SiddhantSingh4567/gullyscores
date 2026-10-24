/**
 * GullyScore: Production-Oriented Gully Cricket Scoring & Tournament Management Platform
 * Tagline: Every Run Counts.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { testConnection } from './lib/firebase';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { Navbar } from './components/Navbar';
import { PublicHome } from './components/PublicHome';
import { ScoringConsole } from './components/ScoringConsole';
import { MatchScorecard } from './components/MatchScorecard';
import { MatchCreator } from './components/MatchCreator';
import { TeamManager } from './components/TeamManager';
import { TournamentManager } from './components/TournamentManager';
import {
  Match,
  InningsData,
  Team,
  Player,
  Tournament,
  TournamentStanding,
} from './types/cricket';
import {
  getTeams,
  getPlayersByTeam,
  getAllMatches,
  getMatch,
  getInnings,
  getTournaments,
  getStandings,
} from './services/cricketService';
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
} from './data/demoData';
import { WifiOff, AlertTriangle } from 'lucide-react';

function GullyScoreApp() {
  const { user, userProfile, demoMode } = useAuth();
  const isOnline = useOnlineStatus();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'matches' | 'tournaments' | 'teams' | 'scoring'>(() => {
    const saved = localStorage.getItem('gullyscore_active_tab');
    if (saved && ['home', 'live', 'matches', 'tournaments', 'teams', 'scoring'].includes(saved)) {
      return saved as any;
    }
    return 'home';
  });
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(() => {
    return localStorage.getItem('gullyscore_active_match_id') || null;
  });
  const [isCreatingMatch, setIsCreatingMatch] = useState<boolean>(false);
  const [isViewingScorecard, setIsViewingScorecard] = useState<boolean>(false);

  useEffect(() => {
    if (selectedMatchId) {
      localStorage.setItem('gullyscore_active_match_id', selectedMatchId);
    } else {
      localStorage.removeItem('gullyscore_active_match_id');
    }
  }, [selectedMatchId]);

  useEffect(() => {
    localStorage.setItem('gullyscore_active_tab', activeTab);
  }, [activeTab]);

  // Data Store
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playersByTeam, setPlayersByTeam] = useState<Record<string, Player[]>>({});
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [standingsByTourn, setStandingsByTourn] = useState<Record<string, TournamentStanding[]>>({});
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Active match & innings in focus
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeInnings, setActiveInnings] = useState<InningsData | null>(null);
  const [innings1, setInnings1] = useState<InningsData | null>(null);
  const [innings2, setInnings2] = useState<InningsData | null>(null);

  // Test Firestore Connection on boot as required by Firebase skill
  useEffect(() => {
    testConnection().then((connected) => {
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });
  }, []);

  // Fetch or reload all data
  const loadAppData = async () => {
    setLoadingData(true);
    try {
      if (demoMode) {
        setMatches([DEMO_LIVE_MATCH, DEMO_COMPLETED_MATCH]);
        setTeams(DEMO_TEAMS);
        const map: Record<string, Player[]> = {};
        DEMO_TEAMS.forEach((t) => {
          map[t.id] = DEMO_PLAYERS.filter((p) => p.teamId === t.id);
        });
        setPlayersByTeam(map);
        setTournaments(DEMO_TOURNAMENTS);
        setStandingsByTourn({
          tourn_mumbai_2026: DEMO_STANDINGS,
        });
      } else {
        const [fetchedTeams, fetchedMatches, fetchedTournaments] = await Promise.all([
          getTeams(false).catch(() => []),
          getAllMatches(false).catch(() => []),
          getTournaments(false).catch(() => []),
        ]);

        // If newly provisioned Firestore has no user records yet, fall back gracefully to starter data
        if (fetchedTeams.length === 0) {
          setTeams(DEMO_TEAMS);
          const map: Record<string, Player[]> = {};
          DEMO_TEAMS.forEach((t) => {
            map[t.id] = DEMO_PLAYERS.filter((p) => p.teamId === t.id);
          });
          setPlayersByTeam(map);
          setMatches([DEMO_LIVE_MATCH, DEMO_COMPLETED_MATCH]);
          setTournaments(DEMO_TOURNAMENTS);
          setStandingsByTourn({ tourn_mumbai_2026: DEMO_STANDINGS });
        } else {
          setTeams(fetchedTeams);
          setMatches(fetchedMatches);
          setTournaments(fetchedTournaments);

          // Fetch players for all teams
          const map: Record<string, Player[]> = {};
          await Promise.all(
            fetchedTeams.map(async (t) => {
              const p = await getPlayersByTeam(t.id, false).catch(() => []);
              map[t.id] = p;
            })
          );
          setPlayersByTeam(map);

          // Fetch standings
          const stdMap: Record<string, TournamentStanding[]> = {};
          await Promise.all(
            fetchedTournaments.map(async (tourn) => {
              const s = await getStandings(tourn.id, false).catch(() => []);
              stdMap[tourn.id] = s;
            })
          );
          setStandingsByTourn(stdMap);
        }
      }
    } catch (err) {
      console.warn('Fallback to demo state due to fetch warning:', err);
      setTeams(DEMO_TEAMS);
      setMatches([DEMO_LIVE_MATCH, DEMO_COMPLETED_MATCH]);
      setTournaments(DEMO_TOURNAMENTS);
      setStandingsByTourn({ tourn_mumbai_2026: DEMO_STANDINGS });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, [demoMode]);

  // Load specific match details when selected
  useEffect(() => {
    if (!selectedMatchId) {
      setActiveMatch(null);
      setActiveInnings(null);
      setInnings1(null);
      setInnings2(null);
      return;
    }

    const fetchMatchDetails = async () => {
      const match = await getMatch(selectedMatchId, demoMode);
      if (!match) return;
      setActiveMatch(match);

      let inn1: InningsData | null = null;
      let inn2: InningsData | null = null;

      if (match.innings1Id) {
        inn1 = await getInnings(match.innings1Id, demoMode);
        setInnings1(inn1);
      }
      if (match.innings2Id) {
        inn2 = await getInnings(match.innings2Id, demoMode);
        setInnings2(inn2);
      }

      // Default active innings
      const current = match.currentInnings === 2 && inn2 ? inn2 : inn1;
      setActiveInnings(current);

      // If match is completed, open scorecard by default
      if (match.status === 'completed') {
        setIsViewingScorecard(true);
      }
    };

    fetchMatchDetails();
  }, [selectedMatchId, demoMode]);

  const liveMatches = useMemo(() => matches.filter((m) => m.status === 'live'), [matches]);

  const allPlayersList = useMemo(() => {
    return Object.values(playersByTeam).flat();
  }, [playersByTeam]);

  // Handlers
  const handleOpenMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setIsCreatingMatch(false);
    setIsViewingScorecard(false);
    setActiveTab('scoring');
  };

  const handleMatchCreated = (newMatch: Match) => {
    setMatches((prev) => [newMatch, ...prev]);
    setIsCreatingMatch(false);
    handleOpenMatch(newMatch.id);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans">
      {/* Offline Status Warning */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-black shadow-2xl animate-bounce">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode — Cached data is in use.</span>
        </div>
      )}

      {/* Main App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'scoring') {
            setSelectedMatchId(null);
            setIsCreatingMatch(false);
            setIsViewingScorecard(false);
          }
        }}
        liveMatchCount={liveMatches.length}
      />

      {/* Main Body Routing */}
      <main className="flex-1 pb-16">
        {/* MATCH CREATOR MODAL / VIEW */}
        {isCreatingMatch ? (
          <MatchCreator
            teams={teams}
            playersByTeam={playersByTeam}
            userId={user?.uid || 'guest_organizer'}
            isDemo={demoMode}
            onMatchCreated={handleMatchCreated}
            onCancel={() => setIsCreatingMatch(false)}
          />
        ) : selectedMatchId && activeMatch ? (
          /* ACTIVE MATCH WORKSPACE */
          isViewingScorecard ? (
            <MatchScorecard
              match={activeMatch}
              innings1={innings1}
              innings2={innings2}
              onBack={() => {
                if (activeMatch.status === 'live') {
                  setIsViewingScorecard(false);
                } else {
                  setSelectedMatchId(null);
                  setActiveTab('home');
                }
              }}
              onResumeScoring={() => setIsViewingScorecard(false)}
            />
          ) : activeInnings ? (
            <ScoringConsole
              match={activeMatch}
              innings={activeInnings}
              playersA={playersByTeam[activeMatch.teamA.id] || []}
              playersB={playersByTeam[activeMatch.teamB.id] || []}
              userId={user?.uid || 'guest_scorer'}
              isDemo={demoMode}
              onUpdate={(updatedMatch, updatedInnings) => {
                setActiveMatch(updatedMatch);
                setActiveInnings(updatedInnings);
                if (updatedInnings.inningsNumber === 1) setInnings1(updatedInnings);
                else setInnings2(updatedInnings);
                // Also update matching match in state
                setMatches((prev) =>
                  prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
                );
              }}
              onViewScorecard={() => setIsViewingScorecard(true)}
            />
          ) : (
            <div className="p-12 text-center text-slate-400">Loading scoring console...</div>
          )
        ) : activeTab === 'home' || activeTab === 'live' ? (
          <PublicHome
            matches={matches}
            tournaments={tournaments}
            teams={teams}
            players={allPlayersList}
            onSelectMatch={handleOpenMatch}
            onCreateMatch={() => setIsCreatingMatch(true)}
            onCreateTeam={() => setActiveTab('teams')}
            onCreateTournament={() => setActiveTab('tournaments')}
            onSelectTournamentsTab={() => setActiveTab('tournaments')}
            onSelectTeamsTab={() => setActiveTab('teams')}
          />
        ) : activeTab === 'teams' ? (
          <TeamManager
            teams={teams}
            playersByTeam={playersByTeam}
            userId={user?.uid || 'guest_organizer'}
            isDemo={demoMode}
            onRefresh={loadAppData}
          />
        ) : activeTab === 'tournaments' ? (
          <TournamentManager
            tournaments={tournaments}
            standings={standingsByTourn}
            teams={teams}
            userId={user?.uid || 'guest_organizer'}
            isDemo={demoMode}
            onRefresh={loadAppData}
            onOpenMatch={handleOpenMatch}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#070b14] py-6 px-4 text-center text-xs text-slate-400 space-y-1">
        <p className="font-extrabold text-slate-300">
          Gully<span className="text-emerald-400">Score</span> • Every Run Counts
        </p>
        <p className="text-[11px] text-slate-400">
          Built for local cricket teams, street organizers & box cricket championships.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GullyScoreApp />
    </AuthProvider>
  );
}
