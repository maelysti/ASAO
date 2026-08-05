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
  ChevronLeft,
  ChevronRight,
  Zap,
  Filter,
  CheckCircle2,
  BarChart2,
  ListFilter,
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
  database?: any[];
}

export const MatchResultsView: React.FC<MatchResultsViewProps> = ({
  entryPoints,
  selectedCategoryId,
  onSelectCategory,
  token,
  database = [],
}) => {
  const [rounds, setRounds] = useState<InstantLeagueRoundResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "home" | "draw" | "away" | "over25">("all");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const activeCategoryId =
    selectedCategoryId && entryPoints.some((ep) => ep.id === selectedCategoryId)
      ? selectedCategoryId
      : entryPoints[0]?.id || 8035;

  const currentEntryPoint = entryPoints.find((ep) => ep.id === activeCategoryId);

  // Fetch initial results (20 rounds)
  const loadResults = async () => {
    setLoading(true);
    setError(null);
    setSelectedRoundFilter("all");

    // Fetch initial 20 rounds
    const res = await fetchInstantLeagueResults(activeCategoryId, 0, 20, token);
    setLoading(false);

    if (res.data) {
      setRounds(res.data);
      setHasMore(res.hasMore ?? res.data.length >= 20);
    } else {
      setError(res.error || "Impossible de charger les résultats.");
    }
  };

  // Load more rounds (pagination)
  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const skip = rounds.length;
    const res = await fetchInstantLeagueResults(activeCategoryId, skip, 20, token);
    setLoadingMore(false);

    if (res.data && res.data.length > 0) {
      setRounds((prev) => {
        // Deduplicate rounds by roundNumber
        const existingNumbers = new Set(prev.map((r) => r.roundNumber));
        const newRounds = res.data!.filter((r) => !existingNumbers.has(r.roundNumber));
        return [...prev, ...newRounds];
      });
      setHasMore(res.hasMore ?? res.data.length >= 20);
    } else {
      setHasMore(false);
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

  // Extract list of all round numbers available in fetched data
  const availableRoundNumbers = Array.from(
    new Set(rounds.map((r) => r.roundNumber).filter(Boolean))
  ).sort((a, b) => b - a); // Descending order (newest first)

  // Filter rounds based on selected round filter
  const displayedRounds = rounds.filter((r) => {
    if (selectedRoundFilter === "all") return true;
    return r.roundNumber === selectedRoundFilter;
  });

  // Calculate statistics for displayed matches
  const allDisplayedMatches = displayedRounds.flatMap((r) => r.matches || []);
  const totalMatchesCount = allDisplayedMatches.length;

  let totalGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let over25Count = 0;

  allDisplayedMatches.forEach((m) => {
    const scoreStr = m.score || "0:0";
    const [h, a] = scoreStr.split(":").map((s) => parseInt(s, 10) || 0);
    totalGoals += h + a;
    if (h > a) homeWins++;
    else if (h < a) awayWins++;
    else draws++;
    if (h + a > 2.5) over25Count++;
  });

  const avgGoals = totalMatchesCount > 0 ? (totalGoals / totalMatchesCount).toFixed(2) : "0.00";
  const homeWinPct = totalMatchesCount > 0 ? Math.round((homeWins / totalMatchesCount) * 100) : 0;
  const drawPct = totalMatchesCount > 0 ? Math.round((draws / totalMatchesCount) * 100) : 0;
  const awayWinPct = totalMatchesCount > 0 ? Math.round((awayWins / totalMatchesCount) * 100) : 0;
  const over25Pct = totalMatchesCount > 0 ? Math.round((over25Count / totalMatchesCount) * 100) : 0;

  // Round Navigation helpers
  const handlePrevRound = () => {
    if (selectedRoundFilter === "all") {
      if (availableRoundNumbers.length > 0) setSelectedRoundFilter(availableRoundNumbers[0]);
      return;
    }
    const currentIdx = availableRoundNumbers.indexOf(selectedRoundFilter);
    if (currentIdx > 0) {
      setSelectedRoundFilter(availableRoundNumbers[currentIdx - 1]);
    }
  };

  const handleNextRound = () => {
    if (selectedRoundFilter === "all") return;
    const currentIdx = availableRoundNumbers.indexOf(selectedRoundFilter);
    if (currentIdx >= 0 && currentIdx < availableRoundNumbers.length - 1) {
      setSelectedRoundFilter(availableRoundNumbers[currentIdx + 1]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP COMPETITION SELECTOR RIBBON */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">
                Résultats par Compétition
              </h2>
              <p className="text-[11px] text-slate-400">
                Sélectionnez une ligue pour voir l&apos;historique complet des résultats
              </p>
            </div>
          </div>

          <button
            onClick={loadResults}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Recharger les Données</span>
          </button>
        </div>

        {/* Categories Horizontal Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {entryPoints.map((ep) => {
            const isSelected = ep.id === activeCategoryId;
            return (
              <button
                key={ep.id}
                onClick={() => onSelectCategory(ep.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40 scale-102"
                    : "bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Award className={`w-4 h-4 ${isSelected ? "text-slate-950" : "text-emerald-400"}`} />
                <span>{ep.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CALENDRIER DES JOURNÉES (ROUND TIMELINE RIBBON) */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-extrabold uppercase text-slate-200 tracking-wider">
              Calendrier des Journées (Journée {selectedRoundFilter === "all" ? "Toutes" : selectedRoundFilter})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevRound}
              disabled={selectedRoundFilter === "all" || availableRoundNumbers.indexOf(selectedRoundFilter) <= 0}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              title="Journée plus récente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              {selectedRoundFilter === "all" ? "Toutes les Journées" : `Journée ${selectedRoundFilter}`}
            </span>
            <button
              onClick={handleNextRound}
              disabled={
                selectedRoundFilter === "all" ||
                availableRoundNumbers.indexOf(selectedRoundFilter) >= availableRoundNumbers.length - 1
              }
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              title="Journée plus ancienne"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Journées Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedRoundFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border cursor-pointer ${
              selectedRoundFilter === "all"
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Toutes ({rounds.length} J)
          </button>

          {availableRoundNumbers.map((rNum) => {
            const isSelected = selectedRoundFilter === rNum;
            const roundObj = rounds.find((r) => r.roundNumber === rNum);
            const mCount = roundObj?.matches?.length || 0;

            return (
              <button
                key={rNum}
                onClick={() => setSelectedRoundFilter(rNum)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/20"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>J{rNum}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected ? "bg-slate-950/30 text-slate-950" : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {mCount}m
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. JOURNÉE SYNTHESIS & STATS BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Matchs Analysés
          </span>
          <span className="text-xl font-black text-white font-mono">{totalMatchesCount}</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Moy. Buts / Match
          </span>
          <span className="text-xl font-black text-amber-400 font-mono">{avgGoals}</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Domicile (1)
          </span>
          <span className="text-xl font-black text-emerald-400 font-mono">{homeWinPct}%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Nuls (X)
          </span>
          <span className="text-xl font-black text-slate-300 font-mono">{drawPct}%</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Extérieur (2)
          </span>
          <span className="text-xl font-black text-cyan-400 font-mono">{awayWinPct}%</span>
        </div>
      </div>

      {/* 4. SEARCH & OUTCOME FILTERS BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-lg">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une équipe..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>

        {/* Outcome Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1 hidden sm:inline">
            Filtrer :
          </span>
          <button
            onClick={() => setOutcomeFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              outcomeFilter === "all"
                ? "bg-slate-800 text-white border border-slate-700"
                : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-white"
            }`}
          >
            Tous
          </button>

          <button
            onClick={() => setOutcomeFilter("home")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              outcomeFilter === "home"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-emerald-300"
            }`}
          >
            1 (Dom)
          </button>

          <button
            onClick={() => setOutcomeFilter("draw")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              outcomeFilter === "draw"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-amber-300"
            }`}
          >
            X (Nul)
          </button>

          <button
            onClick={() => setOutcomeFilter("away")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              outcomeFilter === "away"
                ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-cyan-300"
            }`}
          >
            2 (Ext)
          </button>

          <button
            onClick={() => setOutcomeFilter("over25")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              outcomeFilter === "over25"
                ? "bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-indigo-300"
            }`}
          >
            Over 2.5
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && rounds.length === 0 && (
        <div className="py-20 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-3xl">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-300">
            Récupération des résultats de la compétition...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-8 px-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center text-rose-400 text-xs font-medium space-y-2">
          <p>{error}</p>
          <button
            onClick={loadResults}
            className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl font-bold border border-rose-500/40 cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 5. MATCHES LIST BY ROUND */}
      <div className="space-y-6">
        {displayedRounds.map((roundObj, roundIdx) => {
          const roundMatches = (roundObj.matches || []).filter((m) => {
            // Search Query
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const home = m.homeTeam?.name?.toLowerCase() || "";
              const away = m.awayTeam?.name?.toLowerCase() || "";
              if (!home.includes(q) && !away.includes(q) && !m.name?.toLowerCase().includes(q)) {
                return false;
              }
            }

            // Outcome Filter
            if (outcomeFilter !== "all") {
              const [h, a] = (m.score || "0:0").split(":").map((s) => parseInt(s, 10) || 0);
              if (outcomeFilter === "home" && h <= a) return false;
              if (outcomeFilter === "draw" && h !== a) return false;
              if (outcomeFilter === "away" && h >= a) return false;
              if (outcomeFilter === "over25" && h + a <= 2.5) return false;
            }

            return true;
          });

          if (roundMatches.length === 0) return null;

          return (
            <div
              key={roundObj.roundNumber || roundIdx}
              className="bg-slate-900/90 border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl space-y-0"
            >
              {/* Round Header Bar */}
              <div className="bg-slate-950/90 px-5 py-3.5 border-b border-slate-800/90 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-xs shadow-inner">
                    J{roundObj.roundNumber || roundIdx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Journée {roundObj.roundNumber || roundIdx + 1}</span>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                        {currentEntryPoint?.name || "Virtual League"}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatMatchDate(roundObj.expectedStart)} {formatMatchTime(roundObj.expectedStart)}
                  </span>
                  <span className="text-slate-500 font-bold">
                    {roundMatches.length} Matchs
                  </span>
                </div>
              </div>

              {/* Match Cards List */}
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

                  // Determine winner styling
                  const hNum = parseInt(homeFT, 10) || 0;
                  const aNum = parseInt(awayFT, 10) || 0;

                  return (
                    <div
                      key={matchKey}
                      className="p-4 hover:bg-slate-800/30 transition-colors duration-200"
                    >
                      {/* Match Row Display */}
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        {/* Home Team */}
                        <div className="flex-1 flex items-center justify-end gap-2.5 text-right">
                          <span
                            className={`font-black text-xs sm:text-sm truncate ${
                              hNum > aNum ? "text-emerald-300" : "text-slate-200"
                            }`}
                          >
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

                        {/* Score Card Badge */}
                        <div className="flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-2xl min-w-[100px] sm:min-w-[120px] shrink-0 shadow-inner">
                          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono tracking-wider">
                            {homeFT} - {awayFT}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md mt-0.5">
                            MT: {homeHT} - {awayHT}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex items-center justify-start gap-2.5 text-left">
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
                          <span
                            className={`font-black text-xs sm:text-sm truncate ${
                              aNum > hNum ? "text-emerald-300" : "text-slate-200"
                            }`}
                          >
                            {awayName}
                          </span>
                        </div>

                        {/* Toggle Expand Details */}
                        <button
                          onClick={() => toggleExpand(matchKey)}
                          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors shrink-0 cursor-pointer"
                          title="Détails du match et déroulement des buts"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Goals & Timeline */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/70 rounded-2xl p-4 space-y-4 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Summary Box */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                              <h4 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Synthèse de la Rencontre</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                                  <span className="text-[10px] text-slate-500 block">Mi-Temps (HT)</span>
                                  <span className="font-black text-amber-400">{htScore}</span>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                                  <span className="text-[10px] text-slate-500 block">Fin de Match (FT)</span>
                                  <span className="font-black text-emerald-400">{ftScore}</span>
                                </div>
                              </div>
                            </div>

                            {/* Goal Events Timeline */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                              <h4 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                <span>Déroulement des Buts ({goals.length})</span>
                              </h4>

                              {goals.length === 0 ? (
                                <div className="text-center py-2 text-xs text-slate-500 italic">
                                  Aucun but marqué dans cette rencontre
                                </div>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                  {goals.map((g, gIdx) => {
                                    const isHomeGoal = g.team === "Home";
                                    const scorerName = isHomeGoal ? homeName : awayName;
                                    return (
                                      <div
                                        key={gIdx}
                                        className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80 text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] rounded-md border border-amber-500/30">
                                            {g.minute}&apos;
                                          </span>
                                          <span className="text-slate-200 font-bold">
                                            ⚽ {scorerName}
                                          </span>
                                        </div>
                                        <span className="font-mono font-black text-emerald-400 text-xs">
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

      {/* 6. CHARGER PLUS DE JOURNÉES (PAGINATION / LOAD ALL) */}
      {hasMore && !loading && (
        <div className="text-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 hover:text-emerald-300 font-black text-xs shadow-xl transition-all cursor-pointer flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMore ? "animate-spin" : ""}`} />
            <span>
              {loadingMore
                ? "Chargement des journées suivantes..."
                : `Charger Plus de Journées (Historique ${rounds.length}+)`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
