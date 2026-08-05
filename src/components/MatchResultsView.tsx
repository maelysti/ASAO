import React, { useState, useEffect } from "react";
import {
  Trophy,
  Calendar,
  Clock,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Award,
  Hash,
  Activity,
  Flame,
  Search,
} from "lucide-react";
import {
  fetchInstantLeagueResults,
  InstantLeagueRoundResult,
  MatchResultData,
  getTeamLogoUrl,
} from "../services/sportyApi";
import { SportyEntryPoint } from "../types";

interface MatchResultsViewProps {
  entryPoints: SportyEntryPoint[];
  selectedCategoryId: number | null;
  onSelectCategory: (catId: number) => void;
  token?: string;
}

export const MatchResultsView: React.FC<MatchResultsViewProps> = ({
  entryPoints,
  selectedCategoryId,
  onSelectCategory,
  token,
}) => {
  const [rounds, setRounds] = useState<InstantLeagueRoundResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeCategoryId =
    selectedCategoryId && entryPoints.some((ep) => ep.id === selectedCategoryId)
      ? selectedCategoryId
      : entryPoints[0]?.id || 8035;

  const currentEntryPoint = entryPoints.find((ep) => ep.id === activeCategoryId);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchInstantLeagueResults(activeCategoryId, 0, 15, token);
    setLoading(false);

    if (res.data) {
      setRounds(res.data);
    } else {
      setError(res.error || "Impossible de charger les résultats.");
    }
  };

  useEffect(() => {
    loadResults();
  }, [activeCategoryId, token]);

  const toggleExpand = (id: string) => {
    setExpandedMatchId((prev) => (prev === id ? null : id));
  };

  const formatMatchTime = (isoString?: string) => {
    if (!isoString || isoString === "0001-01-01T00:00:00Z") return "--:--";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const formatMatchDate = (isoString?: string) => {
    if (!isoString || isoString === "0001-01-01T00:00:00Z") return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Competition Selector Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Résultats des Compétitions Virtual
            </h2>
          </div>
          <button
            onClick={loadResults}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Categories scroll bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {entryPoints.map((ep) => {
            const isSelected = ep.id === activeCategoryId;
            return (
              <button
                key={ep.id}
                onClick={() => onSelectCategory(ep.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                    : "bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Award className={`w-3.5 h-3.5 ${isSelected ? "text-slate-950" : "text-emerald-400"}`} />
                <span>{ep.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une équipe dans les résultats..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium px-2 shrink-0">
          <span className="text-emerald-400 font-bold">{rounds.length}</span> Journées chargées
        </div>
      </div>

      {/* Loading state */}
      {loading && rounds.length === 0 && (
        <div className="py-16 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-300">Chargement des derniers résultats...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-8 px-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center text-rose-400 text-xs font-medium space-y-2">
          <p>{error}</p>
          <button
            onClick={loadResults}
            className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl font-bold border border-rose-500/40"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Rounds & Matches List */}
      <div className="space-y-6">
        {rounds.map((roundObj, roundIdx) => {
          const roundMatches = (roundObj.matches || []).filter((m) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              m.homeTeam?.name?.toLowerCase().includes(q) ||
              m.awayTeam?.name?.toLowerCase().includes(q) ||
              m.name?.toLowerCase().includes(q)
            );
          });

          if (roundMatches.length === 0) return null;

          return (
            <div
              key={roundIdx}
              className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Round Header */}
              <div className="bg-slate-950/80 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs">
                    J
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Journée {roundObj.roundNumber || roundIdx + 1}</span>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        {currentEntryPoint?.name || "Virtual League"}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {formatMatchDate(roundObj.expectedStart)}{" "}
                    {formatMatchTime(roundObj.expectedStart)}
                  </span>
                </div>
              </div>

              {/* Match Cards in this Round */}
              <div className="divide-y divide-slate-800/60">
                {roundMatches.map((m, matchIdx) => {
                  const matchKey = `${roundObj.roundNumber}_${matchIdx}_${m.id || m.name}`;
                  const isExpanded = expandedMatchId === matchKey;

                  const homeName = m.homeTeam?.name || m.name?.split(" vs ")[0] || "Home";
                  const awayName = m.awayTeam?.name || m.name?.split(" vs ")[1] || "Away";

                  const ftScore = m.score || "0:0";
                  const htScore = m.halfTimeScore || "0:0";

                  const [homeFT, awayFT] = ftScore.split(":").map((s) => s.trim());
                  const [homeHT, awayHT] = htScore.split(":").map((s) => s.trim());

                  const goals = m.goals || [];
                  const htGoals = goals.filter((g) => g.minute <= 45);
                  const ftGoals = goals.filter((g) => g.minute > 45);

                  return (
                    <div
                      key={matchKey}
                      className="p-4 hover:bg-slate-800/40 transition-colors duration-200"
                    >
                      {/* Main Match Result Display */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Home Team */}
                        <div className="flex-1 flex items-center justify-end gap-3 text-right">
                          <span className="font-bold text-sm text-slate-100 hover:text-emerald-300 transition-colors truncate">
                            {homeName}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow">
                            <img
                              src={getTeamLogoUrl(homeName)}
                              alt={homeName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                                if ((e.target as HTMLElement).nextElementSibling) {
                                  ((e.target as HTMLElement).nextElementSibling as HTMLElement).classList.remove("hidden");
                                }
                              }}
                            />
                            <Shield className="w-4 h-4 text-emerald-400 hidden" />
                          </div>
                        </div>

                        {/* Score Badge (FT & HT) */}
                        <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl min-w-[110px] shrink-0 shadow-inner">
                          <div className="text-lg font-black text-emerald-400 font-mono tracking-wider">
                            {homeFT} - {awayFT}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md mt-0.5">
                            MT: {homeHT} - {awayHT}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex items-center justify-start gap-3 text-left">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow">
                            <img
                              src={getTeamLogoUrl(awayName)}
                              alt={awayName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                                if ((e.target as HTMLElement).nextElementSibling) {
                                  ((e.target as HTMLElement).nextElementSibling as HTMLElement).classList.remove("hidden");
                                }
                              }}
                            />
                            <Shield className="w-4 h-4 text-teal-400 hidden" />
                          </div>
                          <span className="font-bold text-sm text-slate-100 hover:text-emerald-300 transition-colors truncate">
                            {awayName}
                          </span>
                        </div>

                        {/* Toggle Expand Details Button */}
                        <button
                          onClick={() => toggleExpand(matchKey)}
                          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors shrink-0"
                          title="Voir le détail des buts et de la rencontre"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Match Details (Goal Timeline & HT/FT breakdown) */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-4 space-y-4 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* HT/FT Summary Card */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                              <h4 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Synthèse HT / FT</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center">
                                  <span className="text-[10px] text-slate-500 block">Mi-Temps (HT)</span>
                                  <span className="font-black text-amber-400 font-mono">{htScore}</span>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center">
                                  <span className="text-[10px] text-slate-500 block">Fin de Match (FT)</span>
                                  <span className="font-black text-emerald-400 font-mono">{ftScore}</span>
                                </div>
                              </div>
                            </div>

                            {/* Goals Timeline */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                              <h4 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                <span>Déroulement des Buts ({goals.length})</span>
                              </h4>

                              {goals.length === 0 ? (
                                <div className="text-center py-2 text-xs text-slate-500 italic">
                                  Aucun but marqué (0 - 0)
                                </div>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {goals.map((g, gIdx) => {
                                    const isHomeGoal = g.team === "Home";
                                    const scorerName = isHomeGoal ? homeName : awayName;
                                    return (
                                      <div
                                        key={gIdx}
                                        className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 font-mono font-bold text-[10px] rounded">
                                            {g.minute}&apos;
                                          </span>
                                          <span className="text-slate-200 font-bold">
                                            ⚽ {scorerName}
                                          </span>
                                        </div>
                                        <span className="font-mono font-extrabold text-emerald-400 text-[11px]">
                                          ({g.homeScore} - {g.awayScore})
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
