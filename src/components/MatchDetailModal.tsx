import React, { useState } from "react";
import { X, Shield, Clock, Trophy, Code, Copy, Check, Activity, Sparkles, Layers, Hash, Database, BarChart2 } from "lucide-react";
import { SportyEvent, ExtractedMatchRecord } from "../types";
import { classifyMatchStatus, CombinedMatchData, getTeamLogoUrl } from "../services/sportyApi";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";
import { MatchRuleAnalysisBlock } from "./MatchRuleAnalysisBlock";
import { TeamFormTrajectory } from "./TeamFormTrajectory";

interface MatchDetailModalProps {
  event: SportyEvent | CombinedMatchData | null;
  database?: ExtractedMatchRecord[];
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ event, database = [], onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!event) return null;

  const h2h = getH2HAnalysisForMatch(event, database);

  const isCombined = "categoryName" in event;
  const status = classifyMatchStatus(event as any);

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
  const homeStats = isCombined ? (event as CombinedMatchData).homeStats : undefined;
  const awayStats = isCombined ? (event as CombinedMatchData).awayStats : undefined;

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
              <MatchRuleAnalysisBlock event={event} database={database} />

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
