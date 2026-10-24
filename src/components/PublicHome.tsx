import React, { useState, useMemo } from 'react';
import { Match, Tournament, Team, Player } from '../types/cricket';
import {
  Flame,
  Trophy,
  Users,
  Search,
  Plus,
  PlayCircle,
  ChevronRight,
  MapPin,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react';

interface PublicHomeProps {
  matches: Match[];
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  onSelectMatch: (matchId: string) => void;
  onCreateMatch: () => void;
  onCreateTeam: () => void;
  onCreateTournament: () => void;
  onSelectTournamentsTab: () => void;
  onSelectTeamsTab: () => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  matches,
  tournaments,
  teams,
  players,
  onSelectMatch,
  onCreateMatch,
  onCreateTeam,
  onCreateTournament,
  onSelectTournamentsTab,
  onSelectTeamsTab,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('all');

  const liveMatches = matches.filter((m) => m.status === 'live');
  const recentMatches = matches.filter((m) => m.status === 'completed');

  // Distinct cities
  const cities = useMemo(() => {
    const set = new Set<string>();
    tournaments.forEach((t) => set.add(t.city));
    teams.forEach((t) => set.add(t.city));
    return Array.from(set);
  }, [tournaments, teams]);

  // Filtered tournaments
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = filterCity === 'all' || t.city.toLowerCase() === filterCity.toLowerCase();
    return matchesSearch && matchesCity;
  });

  // Top Batters & Bowlers
  const topBatters = useMemo(() => {
    return [...players].sort((a, b) => b.runs - a.runs).slice(0, 3);
  }, [players]);

  const topBowlers = useMemo(() => {
    return [...players].sort((a, b) => b.wickets - a.wickets).slice(0, 3);
  }, [players]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c192c] via-[#091322] to-[#050b14] border border-slate-800/80 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-lime-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Street & Tournament Cricket Scoring Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
            Every Run Counts.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-300">
              Live Ball-by-Ball.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            From the narrow alleys of Mumbai to box cricket turfs across India — manage squads, track live run rates, schedule knockout brackets, and generate verified scorecards.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onCreateMatch}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/50 transition cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" />
              Start New Match
            </button>
            <button
              onClick={onCreateTournament}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm border border-slate-700 transition cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Create Tournament
            </button>
            <button
              onClick={onCreateTeam}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm border border-slate-700 transition cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              Add Team Squad
            </button>
          </div>
        </div>
      </div>

      {/* FEATURED LIVE MATCHES SECTION */}
      {liveMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                Live Matches ({liveMatches.length})
              </h2>
            </div>
            <span className="text-xs text-lime-400 font-bold uppercase tracking-wider">
              Real-time scoring
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <div
                key={m.id}
                onClick={() => onSelectMatch(m.id)}
                className="group p-5 rounded-3xl bg-slate-900 border border-emerald-500/30 hover:border-emerald-400 transition-all shadow-xl hover:shadow-emerald-950/30 cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {m.venue} • {m.rules.overs} ov
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-lime-500/20 text-lime-400 border border-lime-500/30">
                    LIVE
                  </span>
                </div>

                <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition">
                  {m.title}
                </h3>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">{m.teamA.name}</span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {m.innings1Summary ? `${m.innings1Summary.totalRuns}/${m.innings1Summary.totalWickets}` : '0/0'}
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        ({m.innings1Summary?.oversCompleted || '0.0'})
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-300 block">{m.teamB.name}</span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {m.innings2Summary ? `${m.innings2Summary.totalRuns}/${m.innings2Summary.totalWickets}` : 'Yet to bat'}
                      {m.innings2Summary && (
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          ({m.innings2Summary.oversCompleted})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold pt-1">
                  <span>Open Interactive Scoreboard</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tournaments, teams or cities (e.g. Mumbai, Dadar)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {cities.length > 0 && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setFilterCity('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterCity === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setFilterCity(city)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterCity === city
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TOURNAMENTS & RESULTS TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tournaments Directory (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Active & Upcoming Tournaments
            </h2>
            <button
              onClick={onSelectTournamentsTab}
              className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
            >
              View All Brackets <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTournaments.map((tourn) => (
              <div
                key={tourn.id}
                onClick={onSelectTournamentsTab}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-lg cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 uppercase">
                    {tourn.format.replace('_', ' + ')}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{tourn.status}</span>
                </div>

                <h3 className="text-base font-extrabold text-white leading-snug">{tourn.name}</h3>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {tourn.description || 'Gully cricket tournament'}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {tourn.city}
                  </span>
                  <span>{tourn.teamCapacity} Teams</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Completed Results */}
          <div className="pt-4 space-y-4">
            <h3 className="text-lg font-black text-white">Recent Match Results</h3>
            <div className="space-y-3">
              {recentMatches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {m.venue} • Final
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5">{m.title}</h4>
                    <span className="text-xs font-bold text-emerald-400 mt-1 block">
                      {m.result?.summary || 'Match Completed'}
                    </span>
                  </div>
                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {m.teamA.shortCode}: {m.innings1Summary?.totalRuns}/{m.innings1Summary?.totalWickets}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {m.teamB.shortCode}: {m.innings2Summary?.totalRuns}/{m.innings2Summary?.totalWickets}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Tournament Leaderboards (Orange / Purple Cap) */}
        <div className="space-y-5">
          {/* Top Run Scorers */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Orange Cap • Top Runs
              </h3>
            </div>

            <div className="space-y-2.5">
              {topBatters.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-mono font-bold text-xs text-amber-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-extrabold text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {p.matches} matches • {p.fours}x4 {p.sixes}x6
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-amber-400">{p.runs}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      HS: {p.highestScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Wicket Takers */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                Purple Cap • Top Wickets
              </h3>
            </div>

            <div className="space-y-2.5">
              {topBowlers.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-mono font-bold text-xs text-purple-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-extrabold text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {p.bowlingStyle} bowler
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-purple-400">
                      {p.wickets}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {p.matches} matches
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
