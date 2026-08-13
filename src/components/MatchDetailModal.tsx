import React, { useState, useMemo, useEffect } from "react";
import { X, Shield, Clock, Trophy, Code, Copy, Check, Activity, Sparkles, Layers, Hash, Database, BarChart2, Swords, Calendar, TrendingUp, CheckCircle2 } from "lucide-react";
import { SportyEvent, ExtractedMatchRecord, RuleItem } from "../types";
import { classifyMatchStatus, CombinedMatchData, getTeamLogoUrl } from "../services/sportyApi";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";
import { MatchRuleAnalysisBlock } from "./MatchRuleAnalysisBlock";
import { TeamFormTrajectory } from "./TeamFormTrajectory";

interface MatchDetailModalProps {
  event: SportyEvent | CombinedMatchData | null;
  database?: ExtractedMatchRecord[];
  activeRules?: RuleItem[];
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ event, database = [], activeRules, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeH2hTab, setActiveH2hTab] = useState<"direct" | "rank_odds" | "home" | "away">("direct");

  const homeName = (event?.homeTeamName || "").trim().toLowerCase();
  const awayName = (event?.awayTeamName || "").trim().toLowerCase();

  // Filter direct head-to-head matches from database
  const directH2HRecords = useMemo(() => {
    if (!database || database.length === 0 || !homeName || !awayName) return [];
    return database.filter((m) => {
      const dbHome = (m.homeTeamName || "").trim().toLowerCase();
      const dbAway = (m.awayTeamName || "").trim().toLowerCase();
      return (
        ((dbHome.includes(homeName) || homeName.includes(dbHome)) &&
         (dbAway.includes(awayName) || awayName.includes(dbAway))) ||
        ((dbHome.includes(awayName) || awayName.includes(dbHome)) &&
         (dbAway.includes(homeName) || homeName.includes(dbAway)))
      );
    });
  }, [database, homeName, awayName]);

  const isCombined = event ? "categoryName" in event : false;
  const homeStats = isCombined ? (event as CombinedMatchData).homeStats : undefined;
  const awayStats = isCombined ? (event as CombinedMatchData).awayStats : undefined;

  // Filter matches with matching Rank profile & Odds profile from database (regardless of team names or odd positions)
  const sameRankOddsRecords = useMemo(() => {
    if (!database || database.length === 0 || !event) return [];

    const hRank = homeStats?.position || (event as any)?.homeRankAtRound || (event as any)?.homeRank || 0;
    const aRank = awayStats?.position || (event as any)?.awayRankAtRound || (event as any)?.awayRank || 0;

    let hOdds = 0, dOdds = 0, aOdds = 0;
    if ("eventBetTypes" in event && event.eventBetTypes) {
      const mainBt = event.eventBetTypes.find((bt: any) => bt.name?.toUpperCase().includes("1X2") || bt.betTypeId === 30083);
      hOdds = mainBt?.eventBetTypeItems?.find((i: any) => i.shortName === "1")?.odds || 0;
      dOdds = mainBt?.eventBetTypeItems?.find((i: any) => i.shortName === "X")?.odds || 0;
      aOdds = mainBt?.eventBetTypeItems?.find((i: any) => i.shortName === "2")?.odds || 0;
    }
    if (!hOdds) {
      hOdds = (event as any).homeOdds || 0;
      dOdds = (event as any).drawOdds || 0;
      aOdds = (event as any).awayOdds || 0;
    }

    const currentOddsSorted = [hOdds, dOdds, aOdds].filter((o) => o > 1).sort((a, b) => a - b);

    const matches = database.filter((m) => {
      const dbHRank = m.homeRankAtRound || m.homeRank || 0;
      const dbARank = m.awayRankAtRound || m.awayRank || 0;

      let rankMatch = false;
      if (hRank > 0 && aRank > 0 && dbHRank > 0 && dbARank > 0) {
        const exactMatch = (dbHRank === hRank && dbARank === aRank) || (dbHRank === aRank && dbARank === hRank);
        const closeRanks = Math.abs(dbHRank - hRank) <= 1 && Math.abs(dbARank - aRank) <= 1;
        const rankDiffMatch = Math.abs(dbHRank - dbARank) === Math.abs(hRank - aRank);
        rankMatch = exactMatch || closeRanks || rankDiffMatch;
      }

      let oddsMatch = false;
      const mHOdds = m.homeOdds || 0;
      const mDOdds = m.drawOdds || 0;
      const mAOdds = m.awayOdds || 0;
      const dbOddsSorted = [mHOdds, mDOdds, mAOdds].filter((o) => o > 1).sort((a, b) => a - b);

      if (currentOddsSorted.length === 3 && dbOddsSorted.length === 3) {
        const diff0 = Math.abs(currentOddsSorted[0] - dbOddsSorted[0]);
        const diff1 = Math.abs(currentOddsSorted[1] - dbOddsSorted[1]);
        const diff2 = Math.abs(currentOddsSorted[2] - dbOddsSorted[2]);
        if (diff0 <= 0.25 && diff1 <= 0.35 && diff2 <= 0.45) {
          oddsMatch = true;
        }
      } else if (hOdds > 1 && mHOdds > 1) {
        if (
          Math.abs(mHOdds - hOdds) <= 0.30 ||
          Math.abs(mHOdds - aOdds) <= 0.30 ||
          Math.abs(mAOdds - hOdds) <= 0.30 ||
          Math.abs(mAOdds - aOdds) <= 0.30
        ) {
          oddsMatch = true;
        }
      }

      return rankMatch || oddsMatch;
    });

    return matches.sort((a, b) => {
      const dbHRa = a.homeRankAtRound || a.homeRank || 0;
      const dbARa = a.awayRankAtRound || a.awayRank || 0;
      const scoreA = (dbHRa === hRank && dbARa === aRank ? 3 : 0) + (a.homeOdds && Math.abs((a.homeOdds || 0) - hOdds) < 0.2 ? 2 : 0);

      const dbHRb = b.homeRankAtRound || b.homeRank || 0;
      const dbARb = b.awayRankAtRound || b.awayRank || 0;
      const scoreB = (dbHRb === hRank && dbARb === aRank ? 3 : 0) + (b.homeOdds && Math.abs((b.homeOdds || 0) - hOdds) < 0.2 ? 2 : 0);

      return scoreB - scoreA;
    });
  }, [database, event, homeStats, awayStats]);

  // Statistics for Same Rank & Odds BDD Matches
  const sameRankOddsStats = useMemo(() => {
    if (sameRankOddsRecords.length === 0) return null;
    let homeW = 0, drawW = 0, awayW = 0, totalGoals = 0, over25 = 0, btts = 0;

    sameRankOddsRecords.forEach((m) => {
      let hS = 0, aS = 0;
      if (m.score && m.score.includes(":")) {
        const parts = m.score.split(":");
        hS = parseInt(parts[0], 10) || 0;
        aS = parseInt(parts[1], 10) || 0;
      } else if (m.score && m.score.includes("-")) {
        const parts = m.score.split("-");
        hS = parseInt(parts[0], 10) || 0;
        aS = parseInt(parts[1], 10) || 0;
      }
      const sum = hS + aS;
      totalGoals += sum;
      if (sum > 2) over25++;
      if (hS > 0 && aS > 0) btts++;
      if (hS > aS) homeW++;
      else if (hS === aS) drawW++;
      else awayW++;
    });

    const count = sameRankOddsRecords.length;
    return {
      count,
      homeW,
      drawW,
      awayW,
      homeWPct: Math.round((homeW / count) * 100),
      drawWPct: Math.round((drawW / count) * 100),
      awayWPct: Math.round((awayW / count) * 100),
      avgGoals: parseFloat((totalGoals / count).toFixed(2)),
      over25Pct: Math.round((over25 / count) * 100),
      bttsPct: Math.round((btts / count) * 100),
    };
  }, [sameRankOddsRecords]);

  // Auto-select 'rank_odds' if direct H2H is empty
  useEffect(() => {
    if (directH2HRecords.length === 0 && sameRankOddsRecords.length > 0) {
      setActiveH2hTab("rank_odds");
    }
  }, [directH2HRecords.length, sameRankOddsRecords.length]);

  // Filter home team past matches from database
  const homeTeamPastRecords = useMemo(() => {
    if (!database || database.length === 0 || !homeName) return [];
    return database.filter((m) => {
      const dbHome = (m.homeTeamName || "").trim().toLowerCase();
      const dbAway = (m.awayTeamName || "").trim().toLowerCase();
      return dbHome.includes(homeName) || dbAway.includes(homeName);
    });
  }, [database, homeName]);

  // Filter away team past matches from database
  const awayTeamPastRecords = useMemo(() => {
    if (!database || database.length === 0 || !awayName) return [];
    return database.filter((m) => {
      const dbHome = (m.homeTeamName || "").trim().toLowerCase();
      const dbAway = (m.awayTeamName || "").trim().toLowerCase();
      return dbHome.includes(awayName) || dbAway.includes(awayName);
    });
  }, [database, awayName]);

  // Detailed stats for direct H2H records
  const directStats = useMemo(() => {
    if (directH2HRecords.length === 0) return null;
    let homeW = 0;
    let drawW = 0;
    let awayW = 0;
    let totalGoals = 0;
    let over25 = 0;
    let btts = 0;

    directH2HRecords.forEach((m) => {
      let hS = 0;
      let aS = 0;
      if (m.score && m.score.includes(":")) {
        const parts = m.score.split(":");
        hS = parseInt(parts[0], 10) || 0;
        aS = parseInt(parts[1], 10) || 0;
      } else if (m.score && m.score.includes("-")) {
        const parts = m.score.split("-");
        hS = parseInt(parts[0], 10) || 0;
        aS = parseInt(parts[1], 10) || 0;
      }

      const sum = hS + aS;
      totalGoals += sum;
      if (sum > 2) over25++;
      if (hS > 0 && aS > 0) btts++;

      const dbHome = (m.homeTeamName || "").trim().toLowerCase();
      if (hS > aS) {
        if (dbHome.includes(homeName)) homeW++;
        else awayW++;
      } else if (hS === aS) {
        drawW++;
      } else {
        if (dbHome.includes(homeName)) awayW++;
        else homeW++;
      }
    });

    const count = directH2HRecords.length;
    return {
      count,
      homeW,
      drawW,
      awayW,
      homeWPct: Math.round((homeW / count) * 100),
      drawWPct: Math.round((drawW / count) * 100),
      awayWPct: Math.round((awayW / count) * 100),
      avgGoals: parseFloat((totalGoals / count).toFixed(2)),
      over25Pct: Math.round((over25 / count) * 100),
      bttsPct: Math.round((btts / count) * 100),
    };
  }, [directH2HRecords, homeName]);

  if (!event) return null;

  const h2h = getH2HAnalysisForMatch(event, database);
  const status = classifyMatchStatus(event as any);

  const activeRecordsToDisplay =
    activeH2hTab === "direct"
      ? directH2HRecords
      : activeH2hTab === "rank_odds"
      ? sameRankOddsRecords
      : activeH2hTab === "home"
      ? homeTeamPastRecords
      : awayTeamPastRecords;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString || isoString === "0001-01-01T00:00:00Z") {
      return "Horaire non précisé";
    }
    try {
      const d = new Date(isoString);
      return d.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const leagueName = isCombined
    ? (event as CombinedMatchData).categoryName
    : (event as SportyEvent).categories?.[0] || "Football";

  const roundNum = isCombined ? (event as CombinedMatchData).roundNumber : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Trophy className="w-3.5 h-3.5" />
              <span>{leagueName}</span>
            </div>
            {roundNum && (
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <Hash className="w-3 h-3" />
                <span>Journée {roundNum}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                showRawJson
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showRawJson ? "Vue Standard" : "Code JSON"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {showRawJson ? (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">Payload JSON Officiel (Sporty API)</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copié !" : "Copier le JSON"}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[450px]">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* Scoreboard / Banner */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-center relative overflow-hidden">
                <div className="absolute top-2 right-3 text-[10px] text-slate-500 font-mono">
                  ID Match: #{event.id}
                </div>

                <div className="text-xs text-slate-400 font-medium mb-4 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formatDate(event.expectedStart)}</span>
                </div>

                <div className="grid grid-cols-3 items-center gap-4">
                  {/* Home */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2 shadow-lg overflow-hidden p-1">
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
                      <Shield className="w-6 h-6 text-emerald-400 hidden" />
                    </div>
                    <span className="font-extrabold text-base text-white">{event.homeTeamName}</span>
                    {homeStats && (
                      <div className="mt-2 flex flex-col items-center gap-0.5 text-[11px] text-slate-400">
                        <span className="font-bold text-emerald-400">{homeStats.points} Points</span>
                        <span className="text-[10px] text-slate-500">
                          {homeStats.won}V - {homeStats.draw}N - {homeStats.lost}D
                        </span>
                      </div>
                    )}
                  </div>

                  {/* VS or Score */}
                  <div className="flex flex-col items-center justify-center">
                    {status === "live" ? (
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-extrabold animate-pulse">
                          EN DIRECT
                        </span>
                        <div className="text-3xl font-black text-rose-400 font-mono">
                          {(event as SportyEvent).scores?.[0]?.homeScore ?? 0} - {(event as SportyEvent).scores?.[0]?.awayScore ?? 0}
                        </div>
                      </div>
                    ) : (event as any).score || (event as any).rawMatch?.score ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black font-mono text-xl sm:text-2xl rounded-xl shadow-lg">
                          {((event as any).score || (event as any).rawMatch?.score).replace(":", " - ")}
                        </div>
                        {((event as any).halfTimeScore || (event as any).rawMatch?.halfTimeScore) && (
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            HT: {((event as any).halfTimeScore || (event as any).rawMatch?.halfTimeScore).replace(":", " - ")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-400">
                        VS
                      </div>
                    )}
                  </div>

                  {/* Away */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2 shadow-lg overflow-hidden p-1">
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
                      <Shield className="w-6 h-6 text-teal-400 hidden" />
                    </div>
                    <span className="font-extrabold text-base text-white">{event.awayTeamName}</span>
                    {awayStats && (
                      <div className="mt-2 flex flex-col items-center gap-0.5 text-[11px] text-slate-400">
                        <span className="font-bold text-teal-400">{awayStats.points} Points</span>
                        <span className="text-[10px] text-slate-500">
                          {awayStats.won}V - {awayStats.draw}N - {awayStats.lost}D
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goal Timeline / Déroulement des Buts */}
                {((event as any).goalMinutes || ((event as any).goalsDetail && (event as any).goalsDetail.length > 0) || ((event as any).goals && (event as any).goals.length > 0)) && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-amber-400 uppercase tracking-wider mb-2">
                      <span>⚽ DÉROULEMENT ET MINUTES DES BUTS</span>
                    </div>
                    <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 font-bold text-center leading-relaxed">
                      {(event as any).goalMinutes ||
                        ((event as any).goalsDetail || (event as any).goals || [])
                          .map((g: any) => `${g.minute || g.time || "?"}' (${g.player ? `${g.player} - ` : ""}${g.team === "home" ? event.homeTeamName : g.team === "away" ? event.awayTeamName : g.team})`)
                          .join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Team Form Trajectory (Parcours des deux équipes) */}
              <TeamFormTrajectory
                homeTeamName={event.homeTeamName}
                awayTeamName={event.awayTeamName}
                database={database}
                homeStats={homeStats}
                awayStats={awayStats}
              />

              {/* Master Rule Analysis & Probabilities Block */}
              <MatchRuleAnalysisBlock event={event} database={database} activeRules={activeRules} />

              {/* Analyse H2H & Algo Database Injected */}
              <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Analyse H2H & Algo Database ({h2h.source})
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Confiance {h2h.confidence}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">H2H Directs</span>
                    <span className="font-extrabold text-white">{h2h.directMatchesCount} Matchs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Bilan H2H</span>
                    <span className="font-extrabold text-emerald-400">{h2h.homeWins}V - {h2h.draws}N - {h2h.awayWins}V</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Moy. Buts</span>
                    <span className="font-extrabold text-cyan-400">{h2h.avgGoals}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pronostic Algo</span>
                    <span className="font-black text-slate-950 bg-emerald-400 px-2 py-0.5 rounded uppercase">{h2h.prediction}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                  💡 <strong className="text-emerald-400">Raisonnement :</strong> {h2h.rationale}
                </p>
              </div>

              {/* Historique des Confrontations Directes (H2H - Database Extraite) */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-amber-400" />
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>HISTORIQUE DES CONFRONTATIONS DIRECTES (H2H)</span>
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                          {directH2HRecords.length} Matchs Directs
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Basé sur les données historiques extraites dans la base de données
                      </p>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold overflow-x-auto">
                    <button
                      onClick={() => setActiveH2hTab("direct")}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        activeH2hTab === "direct"
                          ? "bg-amber-500 text-slate-950 font-black"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      H2H Directs ({directH2HRecords.length})
                    </button>
                    <button
                      onClick={() => setActiveH2hTab("rank_odds")}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        activeH2hTab === "rank_odds"
                          ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                          : "text-slate-300 hover:text-white bg-emerald-950/40 border border-emerald-500/30"
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${activeH2hTab === "rank_odds" ? "text-slate-950" : "text-emerald-400"}`} />
                      <span>Même Rang & Cotes BDD ({sameRankOddsRecords.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveH2hTab("home")}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        activeH2hTab === "home"
                          ? "bg-indigo-600 text-white font-black"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {event.homeTeamName} ({homeTeamPastRecords.length})
                    </button>
                    <button
                      onClick={() => setActiveH2hTab("away")}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        activeH2hTab === "away"
                          ? "bg-purple-600 text-white font-black"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {event.awayTeamName} ({awayTeamPastRecords.length})
                    </button>
                  </div>
                </div>

                {/* Direct Stats Bar */}
                {activeH2hTab === "direct" && directStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-center text-xs font-mono">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Victoires {event.homeTeamName}</span>
                      <span className="font-extrabold text-emerald-400 text-sm">{directStats.homeW} ({directStats.homeWPct}%)</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Matchs Nuls</span>
                      <span className="font-extrabold text-amber-400 text-sm">{directStats.drawW} ({directStats.drawWPct}%)</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Victoires {event.awayTeamName}</span>
                      <span className="font-extrabold text-teal-400 text-sm">{directStats.awayW} ({directStats.awayWPct}%)</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Moy. Buts / Over 2.5</span>
                      <span className="font-extrabold text-cyan-300 text-sm">{directStats.avgGoals} ({directStats.over25Pct}%)</span>
                    </div>
                  </div>
                )}

                {/* Rank & Odds BDD Stats Bar */}
                {activeH2hTab === "rank_odds" && sameRankOddsStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/50 border border-emerald-500/40 p-3 rounded-xl text-center text-xs font-mono shadow-md">
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Victoires 1 (Dom)</span>
                      <span className="font-black text-emerald-400 text-sm">{sameRankOddsStats.homeW} ({sameRankOddsStats.homeWPct}%)</span>
                    </div>
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Matchs Nuls X</span>
                      <span className="font-black text-amber-400 text-sm">{sameRankOddsStats.drawW} ({sameRankOddsStats.drawWPct}%)</span>
                    </div>
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Victoires 2 (Ext)</span>
                      <span className="font-black text-teal-300 text-sm">{sameRankOddsStats.awayW} ({sameRankOddsStats.awayWPct}%)</span>
                    </div>
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Moy. Buts / Over 2.5</span>
                      <span className="font-black text-cyan-300 text-sm">{sameRankOddsStats.avgGoals} ({sameRankOddsStats.over25Pct}%)</span>
                    </div>
                  </div>
                )}

                {/* List of Match Records */}
                {activeRecordsToDisplay.length > 0 ? (
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {activeRecordsToDisplay.map((rec) => {
                      const dbHome = rec.homeTeamName || "Dom.";
                      const dbAway = rec.awayTeamName || "Ext.";
                      const isHomeEq = dbHome.toLowerCase().includes(homeName);
                      const isAwayEq = dbAway.toLowerCase().includes(awayName);

                      let hS = 0;
                      let aS = 0;
                      if (rec.score && rec.score.includes(":")) {
                        const parts = rec.score.split(":");
                        hS = parseInt(parts[0], 10) || 0;
                        aS = parseInt(parts[1], 10) || 0;
                      } else if (rec.score && rec.score.includes("-")) {
                        const parts = rec.score.split("-");
                        hS = parseInt(parts[0], 10) || 0;
                        aS = parseInt(parts[1], 10) || 0;
                      }

                      let winnerText = "Match Nul";
                      let winnerBadgeClass = "bg-slate-800 text-slate-300 border-slate-700";
                      if (hS > aS) {
                        winnerText = `Victoire ${dbHome}`;
                        winnerBadgeClass = isHomeEq
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
                      } else if (aS > hS) {
                        winnerText = `Victoire ${dbAway}`;
                        winnerBadgeClass = isAwayEq
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40";
                      }

                      return (
                        <div
                          key={rec.id || `${rec.homeTeamName}-${rec.awayTeamName}-${rec.roundNumber}`}
                          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 p-3 rounded-xl space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1.5 font-bold text-slate-300">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>{rec.competitionName || "Ligue"}</span>
                              {rec.seasonNumber && <span>• Saison {rec.seasonNumber}</span>}
                              {rec.roundNumber && (
                                <span className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                                  Journée {rec.roundNumber}
                                </span>
                              )}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${winnerBadgeClass}`}>
                              {winnerText}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 items-center gap-2">
                            {/* Home Team */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-800 p-0.5 border border-slate-700 shrink-0 flex items-center justify-center">
                                <img src={getTeamLogoUrl(dbHome)} alt="" className="w-full h-full object-contain" />
                              </div>
                              <span className={`text-xs font-bold truncate ${isHomeEq ? "text-emerald-300 font-black" : "text-slate-200"}`}>
                                {dbHome}
                              </span>
                              {rec.homeRankAtRound ? (
                                <span className="text-[9px] font-mono text-slate-500">R{rec.homeRankAtRound}</span>
                              ) : null}
                            </div>

                            {/* Score */}
                            <div className="flex flex-col items-center justify-center">
                              <div className="px-2.5 py-0.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-black font-mono text-emerald-400">
                                {rec.score || "0 - 0"}
                              </div>
                              {rec.halfTimeScore && (
                                <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                                  HT: {rec.halfTimeScore}
                                </span>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-end gap-2 min-w-0">
                              {rec.awayRankAtRound ? (
                                <span className="text-[9px] font-mono text-slate-500">R{rec.awayRankAtRound}</span>
                              ) : null}
                              <span className={`text-xs font-bold truncate text-right ${isAwayEq ? "text-amber-300 font-black" : "text-slate-200"}`}>
                                {dbAway}
                              </span>
                              <div className="w-6 h-6 rounded-full bg-slate-800 p-0.5 border border-slate-700 shrink-0 flex items-center justify-center">
                                <img src={getTeamLogoUrl(dbAway)} alt="" className="w-full h-full object-contain" />
                              </div>
                            </div>
                          </div>

                          {/* Rank & Odds BDD Proof Tag */}
                          {(rec.homeRankAtRound || rec.homeOdds) && (
                            <div className="pt-1 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-1 text-[9.5px] font-mono text-slate-400">
                              <span className="text-slate-400 font-bold">
                                Rang BDD: <strong className="text-indigo-300">R{rec.homeRankAtRound || "?"}</strong> vs <strong className="text-purple-300">R{rec.awayRankAtRound || "?"}</strong>
                              </span>
                              {rec.homeOdds ? (
                                <span className="text-emerald-400 font-bold">
                                  Cotes BDD: 1 ({rec.homeOdds.toFixed(2)}) • X ({rec.drawOdds?.toFixed(2) || "-"}) • 2 ({rec.awayOdds?.toFixed(2) || "-"})
                                </span>
                              ) : null}
                            </div>
                          )}

                          {/* Goal detail list if available */}
                          {rec.goalsDetail && rec.goalsDetail.length > 0 ? (
                            <div className="pt-1 border-t border-slate-800/60 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                              <span className="text-amber-400 font-bold">⚽ Buts:</span>
                              {rec.goalsDetail.map((g, idx) => (
                                <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                                  {g.minute}' {g.player || g.scorer || (g.team === "home" ? dbHome : dbAway)}
                                </span>
                              ))}
                            </div>
                          ) : rec.goalMinutes ? (
                            <div className="pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                              <span className="text-amber-400 font-bold">⚽ Minutes des buts:</span> {rec.goalMinutes}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <Database className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">
                      {activeH2hTab === "direct"
                        ? `Aucun affrontement direct enregistré dans la base de données extraite entre ${event.homeTeamName} et ${event.awayTeamName}.`
                        : `Aucun match enregistré dans la base de données extraite pour cette équipe.`}
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      Les confrontations s'enrichissent automatiquement au fil des extractions.
                    </p>
                  </div>
                )}
              </div>

              {/* Markets & Odds Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Cotes & Marchés Disponibles ({event.eventBetTypes?.length || 0})</span>
                </h3>

                {event.eventBetTypes && event.eventBetTypes.length > 0 ? (
                  <div className="space-y-3">
                    {event.eventBetTypes.map((betType) => (
                      <div
                        key={betType.id || betType.name}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5"
                      >
                        <div className="text-xs font-bold text-slate-200 mb-2.5 flex items-center justify-between">
                          <span>{betType.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Market ID: #{betType.betTypeId}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {betType.eventBetTypeItems?.map((item) => (
                            <div
                              key={item.id || item.shortName}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-medium text-slate-400 truncate">
                                {item.shortName}
                              </span>
                              <span className="text-xs font-extrabold text-emerald-400 font-mono">
                                {item.odds?.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-500 italic">
                    Aucun marché de pari détaillé retourné pour ce match.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
