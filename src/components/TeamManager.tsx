import React, { useState } from 'react';
import { Team, Player, PlayerRole, BattingStyle, BowlingStyle } from '../types/cricket';
import {
  createTeam,
  updateTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
  deleteTeam,
} from '../services/cricketService';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Award,
  Shield,
  UserCheck,
  MapPin,
  Sparkles,
  Check,
} from 'lucide-react';

interface TeamManagerProps {
  teams: Team[];
  playersByTeam: Record<string, Player[]>;
  userId: string;
  isDemo?: boolean;
  onRefresh: () => void;
}

const COMMON_GULLY_VENUES = [
  'Shivaji Park Corner Box',
  'Bandra Reclamation Turf',
  'Cross Maidan Pitch 3',
  'Azad Maidan Concrete Net',
  'Dadar Portuguese Church Gully',
  'Juhu Beach Sandy Pitch',
  'Koramangala 8th Block Turf',
  'Chandni Chowk Red Fort Ground',
  'Marine Drive Corner Street',
];

export const TeamManager: React.FC<TeamManagerProps> = ({
  teams,
  playersByTeam,
  userId,
  isDemo = false,
  onRefresh,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState<boolean>(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // New / Edit Team Form State
  const [teamName, setTeamName] = useState<string>('');
  const [shortCode, setShortCode] = useState<string>('');
  const [city, setCity] = useState<string>('Mumbai');
  const [homeVenue, setHomeVenue] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#10b981');
  const [description, setDescription] = useState<string>('');
  const [captainId, setCaptainId] = useState<string>('');
  const [viceCaptainId, setViceCaptainId] = useState<string>('');

  // Player Form State
  const [playerName, setPlayerName] = useState<string>('');
  const [jerseyNumber, setJerseyNumber] = useState<number>(10);
  const [role, setRole] = useState<PlayerRole>('allRounder');
  const [battingStyle, setBattingStyle] = useState<BattingStyle>('right');
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>('pace');

  const [loading, setLoading] = useState<boolean>(false);

  const activeTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const squad = activeTeam ? playersByTeam[activeTeam.id] || [] : [];

  // Open Edit Team Modal
  const openEditTeam = () => {
    if (!activeTeam) return;
    setTeamName(activeTeam.name);
    setShortCode(activeTeam.shortCode);
    setCity(activeTeam.city);
    setHomeVenue(activeTeam.homeVenue || '');
    setPrimaryColor(activeTeam.primaryColor || '#10b981');
    setDescription(activeTeam.description || '');
    setCaptainId(activeTeam.captainId || '');
    setViceCaptainId(activeTeam.viceCaptainId || '');
    setShowEditTeamModal(true);
  };

  // Open Edit Player Modal
  const openEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setPlayerName(p.name);
    setJerseyNumber(p.jerseyNumber);
    setRole(p.role);
    setBattingStyle(p.battingStyle);
    setBowlingStyle(p.bowlingStyle);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !shortCode.trim()) {
      alert('Please provide team name and a 2-4 letter short code.');
      return;
    }

    setLoading(true);
    try {
      const created = await createTeam(
        {
          name: teamName.trim(),
          shortCode: shortCode.trim().toUpperCase(),
          city: city.trim(),
          homeVenue: homeVenue.trim() || undefined,
          primaryColor,
          description: description.trim(),
          ownerId: userId,
          isPublic: true,
        },
        isDemo
      );

      setShowAddTeamModal(false);
      setTeamName('');
      setShortCode('');
      setHomeVenue('');
      setDescription('');
      setSelectedTeamId(created.id);
      onRefresh();
    } catch (err) {
      console.error('Error creating team:', err);
      alert('Could not create team.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    if (!teamName.trim() || !shortCode.trim()) {
      alert('Please provide team name and short code.');
      return;
    }

    setLoading(true);
    try {
      await updateTeam(
        activeTeam.id,
        {
          name: teamName.trim(),
          shortCode: shortCode.trim().toUpperCase(),
          city: city.trim(),
          homeVenue: homeVenue.trim() || undefined,
          primaryColor,
          description: description.trim(),
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
        },
        isDemo
      );

      setShowEditTeamModal(false);
      onRefresh();
    } catch (err) {
      console.error('Error updating team:', err);
      alert('Could not update team.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('Please provide player name.');
      return;
    }
    // Prevent duplicate player names in same team
    if (squad.some((p) => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      alert('A player with this name already exists in the squad.');
      return;
    }

    setLoading(true);
    try {
      await createPlayer(
        {
          teamId: activeTeam.id,
          name: playerName.trim(),
          jerseyNumber: Number(jerseyNumber) || 1,
          role,
          battingStyle,
          bowlingStyle,
          ownerId: userId,
        },
        isDemo
      );

      setShowAddPlayerModal(false);
      setPlayerName('');
      setJerseyNumber(Math.floor(Math.random() * 99) + 1);
      onRefresh();
    } catch (err) {
      console.error('Error adding player:', err);
      alert('Could not add player.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!playerName.trim()) {
      alert('Please provide player name.');
      return;
    }

    setLoading(true);
    try {
      await updatePlayer(
        editingPlayer.id,
        {
          name: playerName.trim(),
          jerseyNumber: Number(jerseyNumber) || 1,
          role,
          battingStyle,
          bowlingStyle,
        },
        isDemo
      );

      setEditingPlayer(null);
      onRefresh();
    } catch (err) {
      console.error('Error updating player:', err);
      alert('Could not update player.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (playerId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from ${activeTeam.name}?`)) {
      return;
    }
    try {
      await deletePlayer(playerId, isDemo);
      onRefresh();
    } catch (err) {
      console.error('Error deleting player:', err);
    }
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam) return;
    if (!confirm(`Are you sure you want to delete the team "${activeTeam.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteTeam(activeTeam.id, isDemo);
      const remaining = teams.filter((t) => t.id !== activeTeam.id);
      setSelectedTeamId(remaining[0]?.id || '');
      onRefresh();
    } catch (err) {
      console.error('Error deleting team:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header with Add Team Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Team Squads & Player Rosters
          </h1>
          <p className="text-xs text-slate-400">
            Customize team names, short codes, home venues, and customize player profiles.
          </p>
        </div>
        <button
          onClick={() => {
            setTeamName('');
            setShortCode('');
            setCity('Mumbai');
            setHomeVenue('');
            setDescription('');
            setShowAddTeamModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Team
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Teams List Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Registered Teams ({teams.length})
          </span>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {teams.map((t) => {
              const isSelected = activeTeam?.id === t.id;
              const teamPlayerCount = playersByTeam[t.id]?.length || 0;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-inner flex-shrink-0"
                      style={{ backgroundColor: t.primaryColor || '#10b981' }}
                    >
                      {t.shortCode}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white leading-tight">{t.name}</h4>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {t.city} • {teamPlayerCount} players
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Team Active Detail & Squad */}
        <div className="lg:col-span-3 space-y-5">
          {activeTeam ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              {/* Team Profile Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: activeTeam.primaryColor || '#10b981' }}
                  >
                    {activeTeam.shortCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white">{activeTeam.name}</h2>
                      <button
                        onClick={openEditTeam}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Customize Team Name, Venue & Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeTeam.city}
                      {activeTeam.homeVenue && ` • Home Venue: ${activeTeam.homeVenue}`}
                      {activeTeam.description && ` • ${activeTeam.description}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openEditTeam}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                    Customize Team
                  </button>
                  <button
                    onClick={() => setShowAddPlayerModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Player
                  </button>
                  <button
                    onClick={handleDeleteTeam}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Squad Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Current Squad ({squad.length} Players)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Click edit to customize player name, jersey or playing style
                  </span>
                </div>

                {squad.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 font-bold">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Player Name</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Batting</th>
                          <th className="py-2.5 px-3">Bowling</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {squad.map((player) => (
                          <tr key={player.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              #{player.jerseyNumber}
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-white">
                              {player.name}
                              {activeTeam.captainId === player.id && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                  CAPTAIN
                                </span>
                              )}
                              {activeTeam.viceCaptainId === player.id && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                                  VC
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-300 capitalize">
                              {player.role}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-400 capitalize">
                              {player.battingStyle} Hand
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-400 capitalize">
                              {player.bowlingStyle}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1">
                              <button
                                onClick={() => openEditPlayer(player)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-400 transition"
                                title="Customize Player"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(player.id, player.name)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                                title="Remove Player"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-400">No players registered for this team yet.</p>
                    <button
                      onClick={() => setShowAddPlayerModal(true)}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      Add First Player
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <p className="text-slate-400">Please select or create a team to view squad details.</p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* CUSTOMIZE / EDIT TEAM MODAL */}
      {/* ======================================================== */}
      {(showAddTeamModal || showEditTeamModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={showEditTeamModal ? handleUpdateTeam : handleCreateTeam}
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                {showEditTeamModal ? `Customize ${activeTeam.name}` : 'Create New Team'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddTeamModal(false);
                  setShowEditTeamModal(false);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Team Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bandra Blasters"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Short Code (2-4 letters)
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="e.g. BB"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  City / Locality
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai, Dadar"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Custom Home Venue */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase flex items-center justify-between">
                <span>Default / Home Venue</span>
                <span className="text-[10px] text-slate-500 font-normal">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bandra Reclamation Box Turf"
                value={homeVenue}
                onChange={(e) => setHomeVenue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />

              {/* Venue Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_GULLY_VENUES.slice(0, 4).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setHomeVenue(v)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition"
                  >
                    + {v.split(' ')[0]} {v.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Captain & Vice-Captain Selection (Edit mode) */}
            {showEditTeamModal && squad.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                    Team Captain (C)
                  </label>
                  <select
                    value={captainId}
                    onChange={(e) => setCaptainId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- None --</option>
                    {squad.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                    Vice-Captain (VC)
                  </label>
                  <select
                    value={viceCaptainId}
                    onChange={(e) => setViceCaptainId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- None --</option>
                    {squad
                      .filter((p) => p.id !== captainId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.jerseyNumber} {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Team Jersey Color
              </label>
              <div className="flex gap-2">
                {['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4'].map(
                  (col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setPrimaryColor(col)}
                      className={`w-7 h-7 rounded-lg transition ${
                        primaryColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                About / Description
              </label>
              <textarea
                placeholder="Street cricket team description or battle cry..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              {loading ? 'Saving...' : showEditTeamModal ? 'Save Team Customization' : 'Create Team'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT PLAYER MODAL */}
      {/* ======================================================== */}
      {(showAddPlayerModal || editingPlayer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={editingPlayer ? handleUpdatePlayer : handleCreatePlayer}
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {editingPlayer ? `Customize ${editingPlayer.name}` : `Add Player to ${activeTeam.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setEditingPlayer(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Player Full Name / Nickname
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sameer 'Bullet' Shaikh"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Jersey Number
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Primary Playing Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PlayerRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="batter">Batter</option>
                  <option value="bowler">Bowler</option>
                  <option value="allRounder">All-Rounder</option>
                  <option value="wicketKeeper">Wicket-Keeper</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Batting Style
                </label>
                <select
                  value={battingStyle}
                  onChange={(e) => setBattingStyle(e.target.value as BattingStyle)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="right">Right Hand</option>
                  <option value="left">Left Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                  Bowling Style
                </label>
                <select
                  value={bowlingStyle}
                  onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="pace">Fast / Medium Pace</option>
                  <option value="spin">Spin</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              {loading ? 'Saving...' : editingPlayer ? 'Save Player Customization' : 'Add Player to Squad'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
