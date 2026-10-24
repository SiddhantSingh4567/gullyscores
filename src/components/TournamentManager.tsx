import React, { useState } from 'react';
import {
  Tournament,
  TournamentStanding,
  Team,
  TournamentFormat,
} from '../types/cricket';
import { createTournament } from '../services/cricketService';
import {
  Trophy,
  Plus,
  Medal,
  Calendar,
  MapPin,
  TrendingUp,
  Layers,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';

interface TournamentManagerProps {
  tournaments: Tournament[];
  standings: Record<string, TournamentStanding[]>;
  teams: Team[];
  userId: string;
  isDemo?: boolean;
  onRefresh: () => void;
  onOpenMatch: (matchId: string) => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({
  tournaments,
  standings,
  teams,
  userId,
  isDemo = false,
  onRefresh,
  onOpenMatch,
}) => {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    tournaments[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'standings' | 'brackets' | 'rules'>('standings');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New Tournament Form
  const [name, setName] = useState<string>('');
  const [city, setCity] = useState<string>('Mumbai');
  const [venue, setVenue] = useState<string>('Shivaji Park Ground');
  const [format, setFormat] = useState<TournamentFormat>('league_knockout');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(teams.map((t) => t.id));
  const [loading, setLoading] = useState<boolean>(false);

  const activeTournament =
    tournaments.find((t) => t.id === selectedTournamentId) || tournaments[0];
  const activeStandings = activeTournament ? standings[activeTournament.id] || [] : [];

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter tournament name.');
      return;
    }
    if (selectedTeamIds.length < 2) {
      alert('Please select at least 2 teams for the tournament.');
      return;
    }

    setLoading(true);
    try {
      const created = await createTournament(
        {
          name: name.trim(),
          city: city.trim(),
          venue: venue.trim(),
          format,
          teamCapacity: selectedTeamIds.length,
          pointsRules: { win: 2, tie: 1, noResult: 1, loss: 0 },
          teamIds: selectedTeamIds,
          ownerId: userId,
          isPublished: true,
          status: 'ongoing',
          startDate: new Date().toISOString().split('T')[0],
          description: `${format.replace('_', ' ').toUpperCase()} Street Cricket Tournament`,
        },
        isDemo
      );

      setShowCreateModal(false);
      setName('');
      setSelectedTournamentId(created.id);
      onRefresh();
    } catch (err) {
      console.error('Error creating tournament:', err);
      alert('Could not create tournament.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamSelection = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-400" />
            Tournaments & Points Tables
          </h1>
          <p className="text-xs text-slate-400">
            League standings, knockout brackets, net run rate (NRR), and championship awards.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Tournament
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tournament Selector Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Tournaments ({tournaments.length})
          </span>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {tournaments.map((tourn) => {
              const isSelected = activeTournament?.id === tourn.id;
              return (
                <div
                  key={tourn.id}
                  onClick={() => setSelectedTournamentId(tourn.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 capitalize">
                      {tourn.format.replace('_', ' + ')}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{tourn.status}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-1 leading-snug">{tourn.name}</h4>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {tourn.city}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tournament Detail & Standings */}
        <div className="lg:col-span-3 space-y-5">
          {activeTournament ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              {/* Tournament Profile Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {activeTournament.format.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {activeTournament.venue} • {activeTournament.city}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {activeTournament.name}
                  </h2>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveTab('standings')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'standings'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Points Table
                  </button>
                  <button
                    onClick={() => setActiveTab('brackets')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'brackets'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Knockout Bracket
                  </button>
                </div>
              </div>

              {/* TAB 1: POINTS TABLE */}
              {activeTab === 'standings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Official Standings & Net Run Rate (NRR)
                    </h3>
                    <span className="text-xs text-slate-400">
                      Top 2 advance to Grand Final
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 font-bold">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Team</th>
                          <th className="py-2.5 px-3 text-center">P</th>
                          <th className="py-2.5 px-3 text-center">W</th>
                          <th className="py-2.5 px-3 text-center">L</th>
                          <th className="py-2.5 px-3 text-center">T/NR</th>
                          <th className="py-2.5 px-3 text-right">NRR</th>
                          <th className="py-2.5 px-3 text-right font-black text-emerald-400">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {activeStandings.map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`hover:bg-slate-800/30 transition ${
                              idx < 2 ? 'bg-emerald-950/10' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-extrabold text-white flex items-center gap-2">
                              {row.teamName}
                              {idx === 0 && (
                                <Medal className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-300">
                              {row.played}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">
                              {row.won}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-rose-400">
                              {row.lost}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {row.tied + row.noResult}
                            </td>
                            <td
                              className={`py-3 px-3 text-right font-mono font-bold ${
                                row.netRunRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {row.netRunRate > 0 ? `+${row.netRunRate.toFixed(3)}` : row.netRunRate.toFixed(3)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-base">
                              {row.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      Points Rules: Win = 2 pts • Tie/No Result = 1 pt • Loss = 0 pts
                    </span>
                    <span>
                      NRR = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: KNOCKOUT BRACKET VISUALIZER */}
              {activeTab === 'brackets' && (
                <div className="space-y-6 py-2">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                      Road to Championship
                    </span>
                    <h3 className="text-lg font-black text-white">Knockout Finals Tree</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Semi Final 1 */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        Semi-Final 1 (1st vs 4th)
                      </span>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-sm font-bold text-white">
                          <span>{activeStandings[0]?.teamName || 'Rank 1'}</span>
                          <span className="text-emerald-400 font-mono">QUALIFIED</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-400 border-t border-slate-800/80 pt-2">
                          <span>{activeStandings[3]?.teamName || 'Rank 4'}</span>
                          <span className="text-slate-500 text-xs">Awaiting</span>
                        </div>
                      </div>

                      {/* Semi Final 2 */}
                      <span className="text-xs font-bold text-slate-400 uppercase pt-2 block">
                        Semi-Final 2 (2nd vs 3rd)
                      </span>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-sm font-bold text-white">
                          <span>{activeStandings[1]?.teamName || 'Rank 2'}</span>
                          <span className="text-emerald-400 font-mono">QUALIFIED</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-400 border-t border-slate-800/80 pt-2">
                          <span>{activeStandings[2]?.teamName || 'Rank 3'}</span>
                          <span className="text-slate-500 text-xs">Awaiting</span>
                        </div>
                      </div>
                    </div>

                    {/* Grand Final & Trophy */}
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/30 text-center space-y-3 shadow-2xl">
                      <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
                      <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest block">
                        Grand Finale Match
                      </span>
                      <h4 className="text-lg font-black text-white">
                        {activeStandings[0]?.teamName || 'Finalist 1'} vs {activeStandings[1]?.teamName || 'Finalist 2'}
                      </h4>
                      <p className="text-xs text-slate-300">
                        Winner claims the prestigious GullyScore Cup 2026!
                      </p>
                      <button
                        onClick={() => onOpenMatch('match_live_demo')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer"
                      >
                        View Championship Match
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <p className="text-slate-400">No tournaments available. Create your first tournament.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TOURNAMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateTournament}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">Create Cricket Tournament</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                Tournament Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bandra Street Premier League"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                  City
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="league_knockout">League + Knockout</option>
                  <option value="league">Round-Robin League</option>
                  <option value="knockout">Pure Knockout</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                Primary Venue
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shivaji Park Pitch 3"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                Participating Teams (Select at least 2)
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto p-1">
                {teams.map((team) => {
                  const isChecked = selectedTeamIds.includes(team.id);
                  return (
                    <label
                      key={team.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{team.name} ({team.city})</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTeamSelection(team.id)}
                        className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 bg-slate-900 border-slate-700"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              {loading ? 'Generating...' : 'Create Tournament & Fixtures'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
