import React, { useState, useMemo } from "react";
import { Clock, Shield, Activity, Layers, Database, Lightbulb, AlertCircle, Sparkles, Zap, Trophy, X } from "lucide-react";
import { SportyEvent, ExtractedMatchRecord, RuleItem } from "../types";
import { classifyMatchStatus, CombinedMatchData, getTeamLogoUrl } from "../services/sportyApi";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";
import { TeamFormTrajectory } from "./TeamFormTrajectory";
import { MatchRuleAnalysisBlock } from "./MatchRuleAnalysisBlock";
import { InteractiveMatchAnalyzerModal } from "./InteractiveMatchAnalyzerModal";

interface MatchCardProps {
  event: SportyEvent | CombinedMatchData;
  matchIndex?: number;
  database?: ExtractedMatchRecord[];
  activeRules?: RuleItem[];
  onSelectEvent: (event: any) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ event, matchIndex, database = [], activeRules, onSelectEvent }) => {
  const [showAnalyzerModal, setShowAnalyzerModal] = useState<boolean>(false);
  const [showStatsDetails, setShowStatsDetails] = useState<boolean>(false);
  const [showFifaRecapModal, setShowFifaRecapModal] = useState<boolean>(false);
  const isCombined = "categoryName" in event;
  const statusCategory = classifyMatchStatus(event as any);

  const h2h = getH2HAnalysisForMatch(event, database);

  // Format date cleanly in 24h format (e.g. 07:54 or 14:30)
  const formatMatchTime = (isoString?: string) => {
    if (!isoString || isoString === "0001-01-01T00:00:00Z") {
      return "";
    }
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "";
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
  const rawSeason =
    (event as any).seasonNumber ||
    (event as any).season ||
    (event as any).seasonId ||
    (event as any).rawMatch?.seasonNumber ||
    (event as any).rawMatch?.seasonId ||
    ((event as any).sourceRef ? String((event as any).sourceRef).split("-").pop() : null) ||
    1;
  const seasonNum = typeof rawSeason === "number" ? rawSeason : (rawSeason && /^\d+$/.test(String(rawSeason)) ? rawSeason : (parseInt(String(rawSeason).replace(/\D/g, ""), 10) || rawSeason));
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

  const homeRank = (event as any).homeRankAtRound ?? (event as any).homeRank;
  const awayRank = (event as any).awayRankAtRound ?? (event as any).awayRank;

  // Extract score data if available
  const rawScore = event.score || (event as any).rawMatch?.score;
  const rawHtScore = event.halfTimeScore || (event as any).rawMatch?.halfTimeScore;
  const goalsList: any[] =
    event.goals ||
    (event as any).rawMatch?.goals ||
    (event as any).goalsDetail ||
    (event as any).rawMatch?.goalsDetail ||
    [];
  const scoresArr: any[] = event.scores || (event as any).rawMatch?.scores || [];

  // Separate goal minutes per team (Home vs Away)
  const homeGoals: number[] = [];
  const awayGoals: number[] = [];

  if (Array.isArray(goalsList) && goalsList.length > 0) {
    let prevHome = 0;
    let prevAway = 0;
    goalsList.forEach((g: any) => {
      const min = g.minute ?? g.min ?? g.time;
      const rawTeam = String(g.team ?? g.side ?? g.teamType ?? "").toLowerCase();
      if (rawTeam === "home" || rawTeam === "1" || g.homeTeam === true || g.isHome === true) {
        if (min !== undefined && min !== null) homeGoals.push(min);
      } else if (rawTeam === "away" || rawTeam === "2" || g.homeTeam === false || g.isHome === false) {
        if (min !== undefined && min !== null) awayGoals.push(min);
      } else {
        const curHome = g.homeScore !== undefined ? Number(g.homeScore) : prevHome;
        const curAway = g.awayScore !== undefined ? Number(g.awayScore) : prevAway;
        if (curHome > prevHome && min !== undefined && min !== null) {
          homeGoals.push(min);
        } else if (curAway > prevAway && min !== undefined && min !== null) {
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

  // Helper to normalize any score string into "X - Y"
  const normalizeScoreStr = (s: string | undefined | null) => {
    if (!s) return "";
    const clean = s.trim().replace(":", "-");
    const parts = clean.split("-").map((p) => p.trim());
    if (parts.length === 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
      return `${parseInt(parts[0], 10)} - ${parseInt(parts[1], 10)}`;
    }
    return s;
  };

  if (formattedFtScore) {
    formattedFtScore = normalizeScoreStr(formattedFtScore);
  }

  // Format half time score (HT)
  let formattedHtScore = "";
  if (rawHtScore) {
    formattedHtScore = normalizeScoreStr(rawHtScore);
  } else if (scoresArr && scoresArr.length > 0) {
    const htObj = scoresArr.find((s: any) => s.type === "HT" || s.period === "HT" || s.period === "1stHalf");
    if (htObj && (htObj.homeScore !== undefined || htObj.home !== undefined)) {
      formattedHtScore = `${htObj.homeScore ?? htObj.home} - ${htObj.awayScore ?? htObj.away}`;
    }
  }

  if (!formattedHtScore && Array.isArray(goalsList) && goalsList.length > 0) {
    let htHome = 0;
    let htAway = 0;
    let hasHtGoal = false;
    goalsList.forEach((g: any) => {
      const min = g.minute ?? g.min;
      if (min !== undefined && min <= 45) {
        hasHtGoal = true;
        const t = String(g.team || "").toLowerCase();
        if (t === "home" || t === "1") htHome++;
        else if (t === "away" || t === "2") htAway++;
      }
    });
    if (hasHtGoal) {
      formattedHtScore = `${htHome} - ${htAway}`;
    }
  }

  // Format 2nd half score (2ND HT)
  let formatted2ndHtScore = "";
  if (scoresArr && scoresArr.length > 0) {
    const secondHalfObj = scoresArr.find(
      (s: any) =>
        s.type === "2ndHalf" ||
        s.type === "2HT" ||
        s.period === "2ndHalf" ||
        s.period === "2HT" ||
        s.period === "2nd"
    );
    if (secondHalfObj && (secondHalfObj.homeScore !== undefined || secondHalfObj.home !== undefined)) {
      formatted2ndHtScore = `${secondHalfObj.homeScore ?? secondHalfObj.home} - ${secondHalfObj.awayScore ?? secondHalfObj.away}`;
    }
  }

  // If not explicitly provided in API, derive 2ND HT from FT minus HT
  if (!formatted2ndHtScore) {
    const ftToUse = formattedFtScore || (isEndedOrFinished ? "0 - 0" : "");
    const htToUse = formattedHtScore || (isEndedOrFinished ? "0 - 0" : "");

    if (ftToUse && htToUse) {
      const ftParts = ftToUse.replace(":", "-").split("-").map((s) => parseInt(s.trim(), 10));
      const htParts = htToUse.replace(":", "-").split("-").map((s) => parseInt(s.trim(), 10));

      if (
        ftParts.length === 2 &&
        htParts.length === 2 &&
        !isNaN(ftParts[0]) &&
        !isNaN(ftParts[1]) &&
        !isNaN(htParts[0]) &&
        !isNaN(htParts[1])
      ) {
        const h2nd = Math.max(0, ftParts[0] - htParts[0]);
        const a2nd = Math.max(0, ftParts[1] - htParts[1]);
        formatted2ndHtScore = `${h2nd} - ${a2nd}`;
      }
    }
  }

  const formattedGoalsList = useMemo(() => {
    if (Array.isArray(goalsList) && goalsList.length > 0) {
      return goalsList.map((g: any) => ({
        min: g.minute ?? g.min ?? 0,
        player: g.player || g.playerName || g.scorer || g.scorerName || (g.type === "Penalty" ? "Pénalty" : "But"),
        team: String(g.team || "").toLowerCase(),
        type: g.type,
      }));
    }
    const list: Array<{ min: number; player: string; team: string; type?: string }> = [];
    homeGoals.forEach((m) => {
      list.push({ min: m, player: "But", team: "home" });
    });
    awayGoals.forEach((m) => {
      list.push({ min: m, player: "But", team: "away" });
    });
    return list.sort((a, b) => a.min - b.min);
  }, [goalsList, homeGoals, awayGoals]);

  const homeGoalsFormatted = formattedGoalsList.filter(
    (g) => g.team === "home" || g.team === "1"
  );
  const awayGoalsFormatted = formattedGoalsList.filter(
    (g) => g.team === "away" || g.team === "2"
  );

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
      {/* Top Header: SEASON & ROUND Badge & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-black text-[11px] rounded-lg shadow-sm" title="ID Event Category (Carte d'Identité)">
            ID Cat: {(event as any).eventCategoryId || (event as any).rawMatch?.eventCategoryId || (event as any).seasonId || "N/A"}
          </span>
          <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px] rounded-lg shadow-sm">
            SAISON {seasonNum}
          </span>
          <span className="px-2 py-0.5 bg-[#1a202c] border border-slate-700/60 text-white font-black text-[11px] uppercase tracking-wider rounded-lg shadow-sm">
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
              {homeRank !== undefined && homeRank !== null && homeRank > 0 && (
                <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[8px] sm:text-[9px] font-black px-1 rounded-tl shadow">
                  R{homeRank}
                </span>
              )}
            </div>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono font-bold mt-1 text-slate-400 flex items-center gap-1 flex-wrap">
            {homeRank !== undefined && homeRank !== null && homeRank > 0 && (
              <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] whitespace-nowrap">
                #{homeRank} {homeStats?.points !== undefined ? `(${homeStats.points} pts)` : ""}
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
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowFifaRecapModal(true);
            }}
            className="flex flex-col items-center shrink-0 px-1 py-0.5 min-w-[110px] sm:min-w-[125px] cursor-pointer group/score hover:scale-105 transition-all"
            title="Cliquer pour afficher le temps des buts et le récapitulatif"
          >
            {/* Match Game Time (Heure de jeu) displayed above the score */}
            {event.expectedStart && formatMatchTime(event.expectedStart) ? (
              <div className="text-[10px] sm:text-[11px] font-mono font-extrabold text-amber-300 bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded-md mb-1 flex items-center gap-1 shadow-sm whitespace-nowrap">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{formatMatchTime(event.expectedStart)}</span>
              </div>
            ) : null}

            {/* Main Score Badge */}
            <div className="w-full px-2 py-1.5 bg-emerald-500/15 group-hover/score:bg-emerald-500/25 border border-emerald-500/40 group-hover/score:border-emerald-400 text-emerald-400 font-black font-mono rounded-xl shadow-md flex items-center justify-center tracking-wider whitespace-nowrap transition-colors">
              <span className="text-sm sm:text-base text-emerald-400 font-extrabold">
                {formattedFtScore || "0 - 0"}
              </span>
            </div>

            {/* Breakdown: HT & 2ND HT */}
            <div className="w-full mt-1 flex flex-col gap-0.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-[9px] sm:text-[10px] font-mono">
              <div className="flex items-center justify-between px-1">
                <span className="text-slate-400 font-bold">HT :</span>
                <span className="text-slate-200 font-extrabold">
                  {formattedHtScore || (isEndedOrFinished ? "0 - 0" : "-")}
                </span>
              </div>
              <div className="flex items-center justify-between px-1 border-t border-slate-800/60 pt-0.5">
                <span className="text-slate-400 font-bold">2ND HT :</span>
                <span className="text-amber-300 font-extrabold">
                  {formatted2ndHtScore || (isEndedOrFinished ? "0 - 0" : "-")}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center shrink-0 px-1.5">
            <div className="px-2.5 py-1 bg-[#1a202c] text-slate-300 font-black text-xs rounded-xl border border-slate-700/80 shadow-inner whitespace-nowrap">
              VS
            </div>
            {event.expectedStart && formatMatchTime(event.expectedStart) ? (
              <span className="text-[10px] font-mono font-bold text-amber-300 mt-1 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                {formatMatchTime(event.expectedStart)}
              </span>
            ) : null}
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
              {awayRank !== undefined && awayRank !== null && awayRank > 0 && (
                <span className="absolute bottom-0 right-0 bg-purple-600 text-white text-[8px] sm:text-[9px] font-black px-1 rounded-tl shadow">
                  R{awayRank}
                </span>
              )}
            </div>
            <span
              className="font-extrabold text-sm sm:text-base text-white truncate group-hover:text-emerald-300 transition-colors"
              title={event.awayTeamName}
            >
              {event.awayTeamName}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono font-bold mt-1 text-slate-400 flex items-center gap-1 flex-wrap justify-end">
            {awayRank !== undefined && awayRank !== null && awayRank > 0 && (
              <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] whitespace-nowrap">
                #{awayRank} {awayStats?.points !== undefined ? `(${awayStats.points} pts)` : ""}
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

      {/* Auto-Hide Stats Details Toggle Bar */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowStatsDetails(!showStatsDetails);
          }}
          className="w-full py-1.5 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-[10px] font-extrabold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between cursor-pointer group/btn"
        >
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Détails & Trajectoire Forme</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800 group-hover/btn:bg-slate-700 text-emerald-400 font-mono font-black text-[9px]">
            {showStatsDetails ? "Masquer ▲" : "Afficher ▼"}
          </span>
        </button>
      </div>

      {/* Collapsible Heavy Stats Details Block */}
      {showStatsDetails && (
        <div className="space-y-3 pt-1 animate-fadeIn">
          {/* Team Form Trajectory Section (Parcours des deux équipes) */}
          <TeamFormTrajectory
            homeTeamName={event.homeTeamName}
            awayTeamName={event.awayTeamName}
            database={database}
            homeStats={homeStats}
            awayStats={awayStats}
          />

          {/* Rule & High Precision Analysis Block */}
          <MatchRuleAnalysisBlock event={event} database={database} activeRules={activeRules} />
        </div>
      )}

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

      {/* FIFA Match Recap Modal (Goal Timeline & Match Summary) */}
      {showFifaRecapModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowFifaRecapModal(false);
          }}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header FIFA Broadcast Style */}
            <div className="p-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <span>RÉCAPITULATIF DU MATCH</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Journée {roundNum} • Temps des buts & Détaillé
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFifaRecapModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Score Board */}
            <div className="p-5 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
              {/* Home Team */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800 border-2 border-slate-700 p-1 mb-2 shadow-lg flex items-center justify-center">
                  <img src={getTeamLogoUrl(event.homeTeam?.name)} alt="" className="w-full h-full object-contain" />
                  {homeRank && (
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full shadow">
                      R{homeRank}
                    </span>
                  )}
                </div>
                <span className="font-black text-sm sm:text-base text-white line-clamp-1">
                  {event.homeTeam?.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                  Gagné {homeStats?.won ?? 0} • Nul {homeStats?.draw ?? 0} • Perdu {homeStats?.lost ?? 0}
                </span>
              </div>

              {/* Score Badge Center */}
              <div className="flex flex-col items-center px-3 py-2 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl shadow-xl min-w-[100px] sm:min-w-[120px]">
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-wider">
                  {formattedFtScore || "0 - 0"}
                </span>
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                  Match Terminé
                </span>
              </div>

              {/* Away Team */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800 border-2 border-slate-700 p-1 mb-2 shadow-lg flex items-center justify-center">
                  <img src={getTeamLogoUrl(event.awayTeam?.name)} alt="" className="w-full h-full object-contain" />
                  {awayRank && (
                    <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full shadow">
                      R{awayRank}
                    </span>
                  )}
                </div>
                <span className="font-black text-sm sm:text-base text-white line-clamp-1">
                  {event.awayTeam?.name}
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold mt-0.5">
                  Gagné {awayStats?.won ?? 0} • Nul {awayStats?.draw ?? 0} • Perdu {awayStats?.lost ?? 0}
                </span>
              </div>
            </div>

            {/* Goal Timeline / Temps des buts (FIFA style) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span>⚽ TEMPS DES BUTS & MARQUEURS</span>
                </div>

                <div className="grid grid-cols-2 gap-3 divide-x divide-slate-800/80">
                  {/* Home Goals */}
                  <div className="pr-2 space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-300 block mb-1">
                      {event.homeTeam?.name}
                    </span>
                    {homeGoalsFormatted.length === 0 ? (
                      <p className="text-[11px] text-slate-500 font-mono italic">Aucun but marqué</p>
                    ) : (
                      homeGoalsFormatted.map((g, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                          <span>⚽</span>
                          <span className="font-black text-amber-400">{g.min}'</span>
                          <span className="text-slate-200 truncate">{g.player}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Away Goals */}
                  <div className="pl-3 space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-300 block mb-1">
                      {event.awayTeam?.name}
                    </span>
                    {awayGoalsFormatted.length === 0 ? (
                      <p className="text-[11px] text-slate-500 font-mono italic">Aucun but marqué</p>
                    ) : (
                      awayGoalsFormatted.map((g, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                          <span>⚽</span>
                          <span className="font-black text-amber-400">{g.min}'</span>
                          <span className="text-slate-200 truncate">{g.player}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Breakdown HT / 2ND HT */}
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-around font-mono text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">1ère Mi-Temps (HT)</span>
                  <span className="text-sm font-black text-white">{formattedHtScore || "0 - 0"}</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">2ème Mi-Temps (2ND HT)</span>
                  <span className="text-sm font-black text-amber-400">{formatted2ndHtScore || "0 - 0"}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFifaRecapModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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

