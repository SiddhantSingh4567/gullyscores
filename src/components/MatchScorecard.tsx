import React, { useState } from 'react';
import { Match, InningsData } from '../types/cricket';
import { Trophy, Share2, Copy, Check, Printer, ArrowLeft } from 'lucide-react';

interface MatchScorecardProps {
  match: Match;
  innings1: InningsData | null;
  innings2: InningsData | null;
  onBack?: () => void;
  onResumeScoring?: () => void;
}

export const MatchScorecard: React.FC<MatchScorecardProps> = ({
  match,
  innings1,
  innings2,
  onBack,
  onResumeScoring,
}) => {
  const [activeInningsTab, setActiveInningsTab] = useState<1 | 2>(match.currentInnings);
  const [copied, setCopied] = useState<boolean>(false);

  const selectedInnings = activeInningsTab === 1 ? innings1 : innings2;
  const isMatchLive = match.status === 'live';

  const battingTeam = selectedInnings?.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingTeam = selectedInnings?.bowlingTeamId === match.teamA.id ? match.teamA : match.teamB;

  // Copy score text summary
  const handleCopySummary = () => {
    let text = `🏏 GullyScore: ${match.title}\n📍 ${match.venue}\n`;
    if (innings1) {
      const team1 = innings1.battingTeamId === match.teamA.id ? match.teamA.name : match.teamB.name;
      text += `▶ ${team1}: ${innings1.totalRuns}/${innings1.totalWickets} (${innings1.oversCompleted} ov)\n`;
    }
    if (innings2) {
      const team2 = innings2.battingTeamId === match.teamA.id ? match.teamA.name : match.teamB.name;
      text += `▶ ${team2}: ${innings2.totalRuns}/${innings2.totalWickets} (${innings2.oversCompleted} ov)\n`;
    }
    if (match.result) {
      text += `🏆 Result: ${match.result.summary}\n`;
    }
    text += `Scored live on GullyScore - Every Run Counts!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `GullyScore: ${match.title}`,
          text: match.result?.summary || `${match.teamA.name} vs ${match.teamB.name}`,
          url: window.location.href,
        });
      } catch {
        handleCopySummary();
      }
    } else {
      handleCopySummary();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-5 print:p-0">
      {/* Top navigation actions */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Match
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {isMatchLive && onResumeScoring && (
            <button
              onClick={onResumeScoring}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40"
            >
              Resume Live Scoring
            </button>
          )}
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* MATCH RESULT OR LIVE BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {match.venue} • {match.rules.overs} Overs
              </span>
              {isMatchLive ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-lime-500/20 text-lime-400 border border-lime-500/40 animate-pulse">
                  ● LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  COMPLETED
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">{match.title}</h1>
          </div>
          {match.toss && (
            <span className="text-xs text-slate-400 font-medium">
              Toss: <strong className="text-slate-200">{match.toss.winnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name}</strong> chose to {match.toss.decision}
            </span>
          )}
        </div>

        {/* Big Teams Summary Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="font-extrabold text-white text-base">{match.teamA.name}</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              {match.innings1Summary ? (
                `${match.innings1Summary.totalRuns}/${match.innings1Summary.totalWickets} (${match.innings1Summary.oversCompleted})`
              ) : (
                'Yet to bat'
              )}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="font-extrabold text-white text-base">{match.teamB.name}</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              {match.innings2Summary ? (
                `${match.innings2Summary.totalRuns}/${match.innings2Summary.totalWickets} (${match.innings2Summary.oversCompleted})`
              ) : (
                'Yet to bat'
              )}
            </span>
          </div>
        </div>

        {/* Result Callout */}
        {match.result && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-emerald-950/50 border border-emerald-500/30 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
                Match Result
              </span>
              <p className="text-base font-extrabold text-white">{match.result.summary}</p>
            </div>
          </div>
        )}
      </div>

      {/* INNINGS TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveInningsTab(1)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeInningsTab === 1
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          1st Innings ({match.teamA.name})
        </button>
        {innings2 && (
          <button
            onClick={() => setActiveInningsTab(2)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeInningsTab === 2
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            2nd Innings ({match.teamB.name})
          </button>
        )}
      </div>

      {/* SCORECARD TABLES */}
      {selectedInnings ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-6">
          {/* Batting Scorecard Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Batting Scorecard • {battingTeam.name}
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {selectedInnings.totalRuns}/{selectedInnings.totalWickets} ({selectedInnings.oversCompleted} ov)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 font-bold">
                    <th className="py-2.5 px-3">Batter</th>
                    <th className="py-2.5 px-3">Dismissal</th>
                    <th className="py-2.5 px-3 text-right">R</th>
                    <th className="py-2.5 px-3 text-right">B</th>
                    <th className="py-2.5 px-3 text-right">4s</th>
                    <th className="py-2.5 px-3 text-right">6s</th>
                    <th className="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {Object.values(selectedInnings.battingScorecard).map((batter) => (
                    <tr key={batter.playerId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {batter.name}
                        {!batter.isOut && <span className="text-emerald-400 ml-1 font-mono">*</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">
                        {batter.isOut ? (
                          batter.dismissalText || 'out'
                        ) : (
                          <span className="text-emerald-400 font-medium">not out</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-white">
                        {batter.runs}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {batter.balls}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {batter.fours}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {batter.sixes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                        {batter.strikeRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Extras breakdown row */}
            <div className="flex items-center justify-between p-3 mt-2 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
              <span className="text-slate-400">
                Extras:{' '}
                <strong className="text-white font-mono">{selectedInnings.extras.total}</strong> (w {selectedInnings.extras.wides}, nb {selectedInnings.extras.noBalls}, b {selectedInnings.extras.byes}, lb {selectedInnings.extras.legByes})
              </span>
              <span className="text-slate-300 font-bold font-mono">
                Total: <strong className="text-emerald-400 text-sm">{selectedInnings.totalRuns}/{selectedInnings.totalWickets}</strong> ({selectedInnings.oversCompleted} Ov, RR {((selectedInnings.totalRuns / (Math.max(1, selectedInnings.legalBalls) / 6))).toFixed(2)})
              </span>
            </div>
          </div>

          {/* Fall of Wickets */}
          {selectedInnings.fallOfWickets.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Fall of Wickets
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedInnings.fallOfWickets.map((fow) => (
                  <span
                    key={fow.wicketNumber}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                  >
                    <strong className="text-rose-400">{fow.score}-{fow.wicketNumber}</strong>{' '}
                    <span className="text-slate-400">({fow.playerName}, {fow.overs} ov)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bowling Scorecard Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Bowling Figures • {bowlingTeam.name}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 font-bold">
                    <th className="py-2.5 px-3">Bowler</th>
                    <th className="py-2.5 px-3 text-right">O</th>
                    <th className="py-2.5 px-3 text-right">M</th>
                    <th className="py-2.5 px-3 text-right">R</th>
                    <th className="py-2.5 px-3 text-right">W</th>
                    <th className="py-2.5 px-3 text-right">Econ</th>
                    <th className="py-2.5 px-3 text-right">Wd</th>
                    <th className="py-2.5 px-3 text-right">Nb</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {Object.values(selectedInnings.bowlingScorecard).map((bowler) => (
                    <tr key={bowler.playerId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {bowler.name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {bowler.overs}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {bowler.maidens}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-white">
                        {bowler.runsConceded}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-rose-400 text-base">
                        {bowler.wickets}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {bowler.economy}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {bowler.wides}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {bowler.noBalls}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          Innings data not available yet.
        </div>
      )}
    </div>
  );
};
