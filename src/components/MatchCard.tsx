import React, { useState } from "react";
import { Clock, Shield, Activity, Layers, Database, Lightbulb, AlertCircle, Sparkles, Zap } from "lucide-react";
import { SportyEvent, ExtractedMatchRecord } from "../types";
import { classifyMatchStatus, CombinedMatchData, getTeamLogoUrl } from "../services/sportyApi";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";
import { TeamFormTrajectory } from "./TeamFormTrajectory";
import { MatchRuleAnalysisBlock } from "./MatchRuleAnalysisBlock";
import { InteractiveMatchAnalyzerModal } from "./InteractiveMatchAnalyzerModal";

interface MatchCardProps {
  event: SportyEvent | CombinedMatchData;
  matchIndex?: number;
  database?: ExtractedMatchRecord[];
  onSelectEvent: (event: any) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ event, matchIndex, database = [], onSelectEvent }) => {
  const [showAnalyzerModal, setShowAnalyzerModal] = useState<boolean>(false);
  const isCombined = "categoryName" in event;
  const statusCategory = classifyMatchStatus(event as any);

  const h2h = getH2HAnalysisForMatch(event, database);

  // Format date cleanly in 12h AM/PM format matching screenshot (e.g. 07:54 AM)
  const formatMatchTime = (isoString?: string) => {
    if (!isoString || isoString === "0001-01-01T00:00:00Z") {
      return "07:54 AM";
    }
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "07:54 AM";
    }
  };

  // Extract 1X2 odds if present
  const mainBetType = event.eventBetTypes?.find(
    (bt) => bt.name?.toUpperCase().includes("1X2") || bt.betTypeId === 30083
  );

  const homeOdds = mainBetType?.eventBetTypeItems?.find((i) => i.shortName === "1")?.odds;
  const drawOdds = mainBetType?.eventBetTypeItems?.find((i) => i.shortName === "X")?.odds;
  const awayOdds = mainBetType?.eventBetTypeItems?.find((i) => i.shortName === "2")?.odds;

  const roundNum = isCombined ? (event as CombinedMatchData).roundNumber : matchIndex || 1;
  const homeStats = isCombined ? (event as CombinedMatchData).homeStats : undefined;
  const awayStats = isCombined ? (event as CombinedMatchData).awayStats : undefined;

  // Helper to calculate win/draw/loss percentages
  const calculateWinPct = (stats?: { won?: number; draw?: number; lost?: number }) => {
    if (!stats) return { win: 0, draw: 0, loss: 0 };
    const w = stats.won || 0;
    const d = stats.draw || 0;
    const l = stats.lost || 0;
    const total = w + d + l;
    if (total === 0) return { win: 0, draw: 0, loss: 0 };
    return {
      win: Math.round((w / total) * 100),
      draw: Math.round((d / total) * 100),
      loss: Math.round((l / total) * 100),
    };
  };

  const homePct = calculateWinPct(homeStats);
  const awayPct = calculateWinPct(awayStats);

  const homeRank = homeStats?.position || 1;
  const awayRank = awayStats?.position || 2;

  // Extract score data if available
  const rawScore = event.score || (event as any).rawMatch?.score;
  const rawHtScore = event.halfTimeScore || (event as any).rawMatch?.halfTimeScore;
  const goalsList: any[] = event.goals || (event as any).rawMatch?.goals || [];
  const scoresArr: any[] = event.scores || (event as any).rawMatch?.scores || [];

  // Separate goal minutes per team (Home vs Away)
  const homeGoals: number[] = [];
  const awayGoals: number[] = [];

  if (Array.isArray(goalsList) && goalsList.length > 0) {
    let prevHome = 0;
    let prevAway = 0;
    goalsList.forEach((g: any) => {
      const min = g.minute ?? g.min;
      if (g.team) {
        const t = String(g.team).toLowerCase();
        if (t === "home" || t === "1") {
          if (min !== undefined) homeGoals.push(min);
        } else if (t === "away" || t === "2") {
          if (min !== undefined) awayGoals.push(min);
        }
      } else {
        const curHome = g.homeScore ?? prevHome;
        const curAway = g.awayScore ?? prevAway;
        if (curHome > prevHome && min !== undefined) {
          homeGoals.push(min);
        } else if (curAway > prevAway && min !== undefined) {
          awayGoals.push(min);
        }
        prevHome = curHome;
        prevAway = curAway;
      }
    });
  }

  const isEndedOrFinished =
    statusCategory === "finished" ||
    event.state === "Ended" ||
    event.state === "Finished" ||
    event.preEventOrLive === "Finished" ||
    event.preEventOrLive === "Ended" ||
    Boolean(rawScore);

  // Format full time score (FT)
  let formattedFtScore = "";
  if (rawScore) {
    formattedFtScore = rawScore.replace(":", " - ");
  } else if (scoresArr && scoresArr.length > 0) {
    const ftObj = scoresArr.find((s: any) => s.type === "FT" || s.period === "FT") || scoresArr[0];
    if (ftObj && (ftObj.homeScore !== undefined || ftObj.home !== undefined)) {
      formattedFtScore = `${ftObj.homeScore ?? ftObj.home} - ${ftObj.awayScore ?? ftObj.away}`;
    }
  }

  if (isEndedOrFinished && !formattedFtScore) {
    if (goalsList.length > 0) {
      const lastGoal = goalsList[goalsList.length - 1];
      formattedFtScore = `${lastGoal.homeScore ?? 0} - ${lastGoal.awayScore ?? 0}`;
    } else {
      formattedFtScore = "0 - 0";
    }
  }

  // Format half time score (HT)
  let formattedHtScore = "";
  if (rawHtScore) {
    formattedHtScore = rawHtScore.replace(":", " - ");
  } else if (scoresArr && scoresArr.length > 1) {
    const htObj = scoresArr.find((s: any) => s.type === "HT" || s.period === "HT" || s.period === "1stHalf");
    if (htObj && (htObj.homeScore !== undefined || htObj.home !== undefined)) {
      formattedHtScore = `${htObj.homeScore ?? htObj.home} - ${htObj.awayScore ?? htObj.away}`;
    }
  }

  const statusLabel =
    statusCategory === "live"
      ? "EN DIRECT"
      : statusCategory === "finished" || isEndedOrFinished
      ? "TERMINÉ"
      : "EN ATTENTE";

  return (
    <div
      onClick={() => onSelectEvent(event)}
      className="group relative bg-[#0d1117] hover:bg-[#121722] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between space-y-3.5"
    >
      {/* Top Header: ROUND Badge & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-[#1a202c] border border-slate-700/60 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            ROUND {roundNum}
          </span>
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">
            {statusLabel}
          </span>
        </div>

        {statusCategory === "live" && (
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
        )}
      </div>

      {/* Teams Matchup Header (Home vs Away) */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Home Team Side */}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
            <span
              className="font-extrabold text-sm sm:text-base text-white truncate group-hover:text-emerald-300 transition-colors"
              title={event.homeTeamName}
            >
              {event.homeTeamName}
            </span>
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-md">
              <img
                src={getTeamLogoUrl(event.homeTeamName)}
                alt={event.homeTeamName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  if ((e.target as HTMLElement).nextElementSibling) {
                    ((e.target as HTMLElement).nextElementSibling as HTMLElement).classList.remove("hidden");
                  }
                }}
              />
              <Shield className="w-4 h-4 text-emerald-400 hidden" />
              <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[8px] sm:text-[9px] font-black px-1 rounded-tl shadow">
                R{homeRank}
              </span>
            </div>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono font-bold mt-1 text-slate-400 flex items-center gap-1 flex-wrap">
            {homeStats?.points !== undefined && (
              <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] whitespace-nowrap">
                #{homeRank} ({homeStats.points} pts)
              </span>
            )}
            <span className="text-emerald-400 whitespace-nowrap">{homePct.win}% V</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 whitespace-nowrap">{homePct.draw}% N</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 whitespace-nowrap">{homePct.loss}% D</span>
          </div>

          {/* Home Team Goal Badges */}
          {homeGoals.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              {homeGoals.map((m, idx) => (
                <span
                  key={idx}
                  className="text-[9px] font-mono font-extrabold text-amber-300 bg-amber-950/90 border border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm whitespace-nowrap"
                  title={`But à la ${m} minute pour ${event.homeTeamName}`}
                >
                  <span className="text-[10px]">⚽</span>
                  <span>{m}'</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Center Badge: Score or VS */}
        {isEndedOrFinished || formattedFtScore ? (
          <div className="flex flex-col items-center shrink-0 px-1 py-0.5 min-w-[85px] sm:min-w-[95px]">
            {/* Main Score Badge */}
            <div className="px-2.5 sm:px-3.5 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black font-mono text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center tracking-wider whitespace-nowrap">
              {formattedFtScore || "0 - 0"}
            </div>

            {/* HT Score */}
            {formattedHtScore ? (
              <div className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-300 bg-slate-800/90 border border-slate-700/70 px-2 py-0.5 rounded-md mt-1 whitespace-nowrap">
                HT: {formattedHtScore}
              </div>
            ) : (
              <div className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 border border-slate-700/50 px-2 py-0.5 rounded-md mt-1 whitespace-nowrap">
                FT
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center shrink-0 px-1.5">
            <div className="px-2.5 py-1 bg-[#1a202c] text-slate-300 font-black text-xs rounded-xl border border-slate-700/80 shadow-inner whitespace-nowrap">
              VS
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 mt-1 whitespace-nowrap">
              {formatMatchTime(event.expectedStart)}
            </span>
          </div>
        )}

        {/* Away Team Side */}
        <div className="flex flex-col items-end flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 max-w-full justify-end">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-md">
              <img
                src={getTeamLogoUrl(event.awayTeamName)}
                alt={event.awayTeamName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  if ((e.target as HTMLElement).nextElementSibling) {
                    ((e.target as HTMLElement).nextElementSibling as HTMLElement).classList.remove("hidden");
                  }
                }}
              />
              <Shield className="w-4 h-4 text-teal-400 hidden" />
              <span className="absolute bottom-0 right-0 bg-purple-600 text-white text-[8px] sm:text-[9px] font-black px-1 rounded-tl shadow">
                R{awayRank}
              </span>
            </div>
            <span
              className="font-extrabold text-sm sm:text-base text-white truncate group-hover:text-emerald-300 transition-colors"
              title={event.awayTeamName}
            >
              {event.awayTeamName}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono font-bold mt-1 text-slate-400 flex items-center gap-1 flex-wrap justify-end">
            {awayStats?.points !== undefined && (
              <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] whitespace-nowrap">
                #{awayRank} ({awayStats.points} pts)
              </span>
            )}
            <span className="text-emerald-400 whitespace-nowrap">{awayPct.win}% V</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 whitespace-nowrap">{awayPct.draw}% N</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 whitespace-nowrap">{awayPct.loss}% D</span>
          </div>

          {/* Away Team Goal Badges */}
          {awayGoals.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-end mt-1.5">
              {awayGoals.map((m, idx) => (
                <span
                  key={idx}
                  className="text-[9px] font-mono font-extrabold text-amber-300 bg-amber-950/90 border border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm whitespace-nowrap"
                  title={`But à la ${m} minute pour ${event.awayTeamName}`}
                >
                  <span className="text-[10px]">⚽</span>
                  <span>{m}'</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Form Trajectory Section (Parcours des deux équipes) */}
      <TeamFormTrajectory
        homeTeamName={event.homeTeamName}
        awayTeamName={event.awayTeamName}
        database={database}
        homeStats={homeStats}
        awayStats={awayStats}
      />

      {/* 1X2 Odds Section */}
      <div className="grid grid-cols-3 bg-[#161c26] border border-slate-800/90 rounded-xl p-2.5 text-center shadow-inner gap-1">
        <div>
          <div className="text-[11px] text-slate-400 font-bold mb-0.5">1</div>
          <div className="text-sm font-black text-white font-mono">
            {homeOdds ? homeOdds.toFixed(2) : "1.40"}
          </div>
        </div>
        <div className="border-x border-slate-800">
          <div className="text-[11px] text-slate-400 font-bold mb-0.5">N</div>
          <div className="text-sm font-black text-white font-mono">
            {drawOdds ? drawOdds.toFixed(2) : "4.84"}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-bold mb-0.5">2</div>
          <div className="text-sm font-black text-white font-mono">
            {awayOdds ? awayOdds.toFixed(2) : "7.25"}
          </div>
        </div>
      </div>

      {/* Rule & High Precision Analysis Block */}
      <MatchRuleAnalysisBlock event={event} database={database} />

      {/* Action Buttons: STATS H2H, ANALYSER, MARCHÉS */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectEvent(event);
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#161c26] hover:bg-[#1f2837] border border-slate-800 rounded-xl text-[11px] font-black text-slate-200 uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">STATS</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAnalyzerModal(true);
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-emerald-300/40"
        >
          <Zap className="w-3.5 h-3.5 fill-slate-950 shrink-0 animate-pulse" />
          <span className="truncate">ANALYSER</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectEvent(event);
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#161c26] hover:bg-[#1f2837] border border-slate-800 rounded-xl text-[11px] font-black text-slate-200 uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">MARCHÉS</span>
        </button>
      </div>

      {/* Interactive Match Analyzer Modal */}
      {showAnalyzerModal && (
        <InteractiveMatchAnalyzerModal
          event={event}
          database={database}
          onClose={() => setShowAnalyzerModal(false)}
        />
      )}

      {/* Dynamic Bottom H2H Database Banner */}
      <div className="bg-slate-900/95 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap shadow-inner">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-200 min-w-0">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">H2H Algo Database:</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono shrink-0">
          <span className="text-[10px] text-slate-400">Pronostic</span>
          <span className="bg-emerald-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded uppercase whitespace-nowrap">
            {h2h.prediction}
          </span>
          <span className="text-[10px] font-bold text-amber-400 whitespace-nowrap">
            ({h2h.confidence}%)
          </span>
        </div>
      </div>
    </div>
  );
};

