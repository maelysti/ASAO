import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Filter,
  Database,
  Trophy,
  Zap,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Flame,
  ArrowRight,
  Download,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Hash,
  Activity,
  Plus,
} from "lucide-react";
import { ExtractedMatchRecord, SportyEntryPoint, RuleItem } from "../types";
import { getH2HAnalysisForMatch, getRealMatchId } from "../utils/globalAnalysisEngine";

interface FindViewProps {
  database: ExtractedMatchRecord[];
  entryPoints: SportyEntryPoint[];
  onCreateRuleFromDb?: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
  onNavigateToView?: (view: any) => void;
}

export const FindView: React.FC<FindViewProps> = ({
  database,
  entryPoints,
  onCreateRuleFromDb,
}) => {
  // Free text search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Structured Filter Controls
  const [selectedComp, setSelectedComp] = useState<string | number>("ALL");
  const [selectedSeason, setSelectedSeason] = useState<string | number>("ALL");
  const [selectedOutcome, setSelectedOutcome] = useState<"ALL" | "1" | "X" | "2">("ALL");
  const [selectedGoalMarket, setSelectedGoalMarket] = useState<
    "ALL" | "OVER_25" | "UNDER_25" | "BTTS_YES" | "BTTS_NO"
  >("ALL");

  // Expanded card H2H state (map of matchId -> boolean)
  const [expandedH2H, setExpandedH2H] = useState<Record<string, boolean>>({});

  // Copy notification state
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Available Seasons list in database
  const availableSeasons = useMemo(() => {
    const set = new Set<string | number>();
    database.forEach((m) => {
      if (m.seasonNumber !== undefined && m.seasonNumber !== null) {
        set.add(m.seasonNumber);
      }
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [database]);

  // Available Competitions list in database
  const availableCompetitions = useMemo(() => {
    const compMap = new Map<string | number, string>();
    database.forEach((m) => {
      const id = m.competitionId || m.eventCategoryId || 0;
      const name = m.competitionName || `Ligue ${id}`;
      compMap.set(id, name);
    });
    return Array.from(compMap.entries()).map(([id, name]) => ({ id, name }));
  }, [database]);

  // Preset Quick Filter Tag Chips
  const quickTags = [
    { label: "0 - 0", query: "0-0", category: "score" },
    { label: "2 - 1", query: "2-1", category: "score" },
    { label: "1 - 0", query: "1-0", category: "score" },
    { label: "1 - 1", query: "1-1", category: "score" },
    { label: "2 - 2", query: "2-2", category: "score" },
    { label: "3 - 0", query: "3-0", category: "score" },
    { label: "1 - 2", query: "1-2", category: "score" },
    { label: "Victoire Domicile (1)", query: "1", outcome: "1" },
    { label: "Match Nul (X)", query: "X", outcome: "X" },
    { label: "Victoire Extérieur (2)", query: "2", outcome: "2" },
    { label: "Over 2.5 Buts", query: ">2.5", goalMarket: "OVER_25" },
    { label: "Les 2 Équipes Marquent (GG)", query: "GG", goalMarket: "BTTS_YES" },
    { label: "Journée 1 (J1)", query: "J1" },
    { label: "Journée 2 (J2)", query: "J2" },
    { label: "Journée 3 (J3)", query: "J3" },
    { label: "Journée 4 (J4)", query: "J4" },
    { label: "Journée 5 (J5)", query: "J5" },
  ];

  // Helper to normalize string for comparison
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");

  // Multi-field Free Search & Filter Engine
  const filteredMatches = useMemo(() => {
    if (!database || database.length === 0) return [];

    const rawQ = searchQuery.trim().toLowerCase();
    const cleanQ = norm(searchQuery);

    return database.filter((m) => {
      // 1. Competition Filter
      if (selectedComp !== "ALL") {
        const mCompId = String(m.competitionId || m.eventCategoryId || 0);
        if (mCompId !== String(selectedComp)) return false;
      }

      // 2. Season Filter
      if (selectedSeason !== "ALL") {
        if (String(m.seasonNumber || 1) !== String(selectedSeason)) return false;
      }

      // Parse Score
      const ftScore = (m.score || "").replace(":", "-").trim();
      const htScore = (m.halfTimeScore || "").replace(":", "-").trim();
      const [hFT, aFT] = ftScore.split("-").map((s) => parseInt(s.trim(), 10));
      const hasValidFT = !isNaN(hFT) && !isNaN(aFT);

      // 3. Outcome Filter
      if (selectedOutcome !== "ALL" && hasValidFT) {
        if (selectedOutcome === "1" && !(hFT > aFT)) return false;
        if (selectedOutcome === "X" && !(hFT === aFT)) return false;
        if (selectedOutcome === "2" && !(aFT > hFT)) return false;
      }

      // 4. Goal Market Filter
      if (selectedGoalMarket !== "ALL" && hasValidFT) {
        const totalGoals = hFT + aFT;
        if (selectedGoalMarket === "OVER_25" && !(totalGoals > 2.5)) return false;
        if (selectedGoalMarket === "UNDER_25" && !(totalGoals < 2.5)) return false;
        if (selectedGoalMarket === "BTTS_YES" && !(hFT > 0 && aFT > 0)) return false;
        if (selectedGoalMarket === "BTTS_NO" && !(hFT === 0 || aFT === 0)) return false;
      }

      // 5. Free Text Multi-Term Matching
      if (!rawQ) return true;

      // Prepare target fields for matching
      const homeTeam = (m.homeTeamName || "").toLowerCase();
      const awayTeam = (m.awayTeamName || "").toLowerCase();
      const matchName = (m.matchName || `${homeTeam} vs ${awayTeam}`).toLowerCase();
      const compName = (m.competitionName || "").toLowerCase();
      const seasonName = (m.seasonName || `saison ${m.seasonNumber || 1}`).toLowerCase();
      const roundStr = `j${m.roundNumber || 1} round ${m.roundNumber || 1} journée ${m.roundNumber || 1}`.toLowerCase();
      const goalMins = (m.goalMinutes || "").toLowerCase();
      const matchIdStr = String(m.id || "");
      const sourceStr = (m.source || "").toLowerCase();
      const oddsSummary = (m.allOddsSummary || "").toLowerCase();

      // Check odds values directly
      const hOddsStr = String(m.homeOdds || "");
      const dOddsStr = String(m.drawOdds || "");
      const aOddsStr = String(m.awayOdds || "");

      // Match check
      const terms = rawQ.split(/\s+/).filter((t) => t.length > 0);

      return terms.every((term) => {
        const cleanTerm = norm(term);

        // Check exact or partial score matches like "2-1", "0-0", "1:0"
        if (term.includes("-") || term.includes(":")) {
          const normTermScore = term.replace(":", "-");
          if (ftScore.includes(normTermScore) || htScore.includes(normTermScore)) {
            return true;
          }
        }

        // Check Journée shorthand e.g. "j5", "j12"
        if (/^j\d+$/.test(term)) {
          const num = term.replace("j", "");
          return String(m.roundNumber) === num;
        }

        // Check Saison shorthand e.g. "s1", "s2"
        if (/^s\d+$/.test(term)) {
          const num = term.replace("s", "");
          return String(m.seasonNumber || 1) === num;
        }

        // General term search against all string fields
        return (
          homeTeam.includes(term) ||
          awayTeam.includes(term) ||
          matchName.includes(term) ||
          compName.includes(term) ||
          seasonName.includes(term) ||
          roundStr.includes(term) ||
          ftScore.includes(term) ||
          htScore.includes(term) ||
          goalMins.includes(term) ||
          matchIdStr.includes(term) ||
          sourceStr.includes(term) ||
          oddsSummary.includes(term) ||
          hOddsStr.includes(term) ||
          dOddsStr.includes(term) ||
          aOddsStr.includes(term) ||
          norm(homeTeam).includes(cleanTerm) ||
          norm(awayTeam).includes(cleanTerm) ||
          norm(compName).includes(cleanTerm)
        );
      });
    });
  }, [database, searchQuery, selectedComp, selectedSeason, selectedOutcome, selectedGoalMarket]);

  // Statistics calculation for filtered search results
  const searchStats = useMemo(() => {
    const total = filteredMatches.length;
    if (total === 0) {
      return {
        total: 0,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        homeWinPct: 0,
        drawPct: 0,
        awayWinPct: 0,
        over25Pct: 0,
        bttsPct: 0,
        avgGoals: "0.00",
        topExactScore: "N/A",
        topScoreCount: 0,
      };
    }

    let hWins = 0;
    let drs = 0;
    let aWins = 0;
    let over25Count = 0;
    let bttsCount = 0;
    let sumGoals = 0;
    const scoreCounts: Record<string, number> = {};

    filteredMatches.forEach((m) => {
      const ftScore = (m.score || "").replace(":", "-").trim();
      const [hFT, aFT] = ftScore.split("-").map((s) => parseInt(s.trim(), 10));

      if (!isNaN(hFT) && !isNaN(aFT)) {
        const tot = hFT + aFT;
        sumGoals += tot;

        if (hFT > aFT) hWins++;
        else if (hFT === aFT) drs++;
        else aWins++;

        if (tot > 2.5) over25Count++;
        if (hFT > 0 && aFT > 0) bttsCount++;

        scoreCounts[ftScore] = (scoreCounts[ftScore] || 0) + 1;
      }
    });

    let topScore = "0 - 0";
    let topCount = 0;
    Object.entries(scoreCounts).forEach(([sc, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topScore = sc;
      }
    });

    return {
      total,
      homeWins: hWins,
      draws: drs,
      awayWins: aWins,
      homeWinPct: Math.round((hWins / total) * 100),
      drawPct: Math.round((drs / total) * 100),
      awayWinPct: Math.round((aWins / total) * 100),
      over25Pct: Math.round((over25Count / total) * 100),
      bttsPct: Math.round((bttsCount / total) * 100),
      avgGoals: (sumGoals / total).toFixed(2),
      topExactScore: topScore,
      topScoreCount: topCount,
    };
  }, [filteredMatches]);

  // Toggle H2H dropdown
  const toggleH2H = (id: string | number) => {
    const strId = String(id);
    setExpandedH2H((prev) => ({ ...prev, [strId]: !prev[strId] }));
  };

  // Copy match summary to clipboard
  const handleCopyMatch = (m: ExtractedMatchRecord) => {
    const text = `MATCH: ${m.homeTeamName} ${m.score} ${m.awayTeamName} | MT: (${m.halfTimeScore || "0-0"}) | J${m.roundNumber} - ${m.competitionName} | Cotes 1X2: ${m.homeOdds || 0}/${m.drawOdds || 0}/${m.awayOdds || 0} | Buts: ${m.goalMinutes || "Aucun"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export filtered matches to CSV
  const handleExportCSV = () => {
    if (filteredMatches.length === 0) return;
    const headers = [
      "ID",
      "Competition",
      "Saison",
      "Journee",
      "Equipe Domicile",
      "Equipe Exterieur",
      "Score FT",
      "Score HT",
      "Minutes Buts",
      "Cote 1",
      "Cote X",
      "Cote 2",
      "Cote 1X",
      "Cote 12",
      "Cote X2",
      "Cote Over 2.5",
      "Cote Under 2.5",
      "Cote GG",
      "Cote NG",
      "Date Extraction",
    ];

    const rows = filteredMatches.map((m) => [
      m.id,
      `"${m.competitionName}"`,
      m.seasonNumber || 1,
      m.roundNumber || 1,
      `"${m.homeTeamName}"`,
      `"${m.awayTeamName}"`,
      `"${m.score || "0-0"}"`,
      `"${m.halfTimeScore || "0-0"}"`,
      `"${m.goalMinutes || ""}"`,
      m.homeOdds || 0,
      m.drawOdds || 0,
      m.awayOdds || 0,
      m.doubleChanceOdds?.dc1X || 0,
      m.doubleChanceOdds?.dc12 || 0,
      m.doubleChanceOdds?.dcX2 || 0,
      m.overUnderOdds?.over25 || 0,
      m.overUnderOdds?.under25 || 0,
      m.bothTeamsScoreOdds?.yes || 0,
      m.bothTeamsScoreOdds?.no || 0,
      `"${m.extractedAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_recherche_bdd_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset all search criteria
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedComp("ALL");
    setSelectedSeason("ALL");
    setSelectedOutcome("ALL");
    setSelectedGoalMarket("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/40 uppercase tracking-wider">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Moteur de Recherche Libre BDD</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              MOTEUR DE RECHERCHE FIND
              <span className="text-amber-400 font-mono text-sm px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                {database.length} MATCHS EN BDD
              </span>
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl font-medium">
              Saisissez n'importe quel élément dans la barre (nom d'équipe, score exact, journée, saison, cote, minutage des buts) pour inspecter instantanément les résultats réels et les confrontations directes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={filteredMatches.length === 0}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 text-xs font-black rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Exporter CSV ({filteredMatches.length})</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* Big Search Input Field */}
        <div className="mt-6 relative z-10">
          <div className="relative flex items-center">
            <Search className="w-6 h-6 text-amber-400 absolute left-4.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tapez ce que vous voulez... Ex: Arsenal, 2-1, 0-0, J5, Saison 1, 1.85, Over..."
              className="w-full pl-13 pr-28 py-4 bg-slate-950/90 border-2 border-amber-500/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 text-white font-bold text-sm lg:text-base rounded-2xl placeholder:text-slate-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-16 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute right-4 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 font-mono text-xs font-black">
              {filteredMatches.length}
            </div>
          </div>
        </div>

        {/* Preset Quick Search Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 relative z-10">
          <span className="text-[11px] font-black text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Tag className="w-3.5 h-3.5" />
            Raccourcis Rapides :
          </span>
          {quickTags.map((tag, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (tag.outcome) setSelectedOutcome(tag.outcome as any);
                else if (tag.goalMarket) setSelectedGoalMarket(tag.goalMarket as any);
                else setSearchQuery(tag.query);
              }}
              className="px-2.5 py-1 bg-slate-900/80 hover:bg-amber-500/20 hover:border-amber-500/50 text-slate-300 hover:text-amber-200 text-xs font-bold rounded-lg border border-slate-800 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
            >
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Criteria Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Competition Filter */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer outline-none"
            >
              <option value="ALL">Toutes les ligues / compétitions</option>
              {availableCompetitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Season Filter */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer outline-none"
            >
              <option value="ALL">Toutes les saisons</option>
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  Saison {s}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Issue :</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["ALL", "1", "X", "2"] as const).map((out) => (
                <button
                  key={out}
                  onClick={() => setSelectedOutcome(out)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedOutcome === out
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {out === "ALL" ? "Tout" : out}
                </button>
              ))}
            </div>
          </div>

          {/* Goals Market Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Marché Buts :</span>
            <select
              value={selectedGoalMarket}
              onChange={(e) => setSelectedGoalMarket(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 focus:border-cyan-500 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer outline-none"
            >
              <option value="ALL">Tous les marchés</option>
              <option value="OVER_25">Plus de 2.5 Buts (&gt; 2.5)</option>
              <option value="UNDER_25">Moins de 2.5 Buts (&lt; 2.5)</option>
              <option value="BTTS_YES">Les 2 Équipes Marquent (GG)</option>
              <option value="BTTS_NO">Au moins une équipe sans but (NG)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Statistics Ribbon for Current Query */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-amber-400" /> Matchs Trouvés
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white">{searchStats.total}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              / {database.length} Total
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-emerald-400">Victoires Dom (1)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-300">{searchStats.homeWinPct}%</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.homeWins} m.</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-amber-400">Matchs Nuls (X)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-300">{searchStats.drawPct}%</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.draws} m.</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-blue-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-blue-400">Victoires Ext (2)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-300">{searchStats.awayWinPct}%</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.awayWins} m.</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-cyan-400">Over 2.5 Buts</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-cyan-300">{searchStats.over25Pct}%</span>
            <span className="text-xs font-mono text-slate-400">G: {searchStats.avgGoals}/m</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-purple-400">Score le plus fréquent</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-300">{searchStats.topExactScore}</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.topScoreCount}x</span>
          </div>
        </div>
      </div>

      {/* Matching Results List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Résultats de Recherche ({filteredMatches.length} matchs)</span>
          </h2>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <Search className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">
              Aucun match ne correspond à votre recherche
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Essayez de modifier votre mot-clé ou réinitialisez les filtres pour afficher l'ensemble de la base de données.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
            >
              Afficher Tous les Matchs BDD
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMatches.map((m) => {
              const strId = String(m.id);
              const isH2HExpanded = expandedH2H[strId] || false;
              const h2h = getH2HAnalysisForMatch(
                { homeTeamName: m.homeTeamName, awayTeamName: m.awayTeamName } as any,
                database
              );

              const ftScore = (m.score || "0-0").replace(":", "-").trim();
              const htScore = (m.halfTimeScore || "0-0").replace(":", "-").trim();

              return (
                <div
                  key={strId}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl transition-all relative overflow-hidden backdrop-blur-md space-y-4"
                >
                  {/* Top Bar: Comp / Season / Round / ID */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        {m.competitionName}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-extrabold">
                        Journée {m.roundNumber || 1}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 text-xs font-medium">
                        Saison {m.seasonNumber || 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-[11px]">
                        ID: #{m.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Source: {m.source || "BDD"} ({m.extractedAt || ""})
                      </span>
                      <button
                        onClick={() => handleCopyMatch(m)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Copier la fiche match"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Main Match Info & Score */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Home Team */}
                    <div className="md:col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-sm shrink-0">
                        {m.homeTeamName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-base font-black text-white truncate">
                          {m.homeTeamName}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {m.homeRank > 0 && <span>Rang #{m.homeRank}</span>}
                          {m.homePoints !== undefined && m.homePoints > 0 && <span>• {m.homePoints} pts</span>}
                        </div>
                      </div>
                    </div>

                    {/* Score Box */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-inner">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl lg:text-3xl font-black text-amber-400 tracking-wider font-mono">
                          {ftScore}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 mt-1">
                        Score Mi-Temps : <span className="text-slate-200">{htScore}</span>
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-3">
                      <div className="space-y-0.5 text-left md:text-right min-w-0">
                        <h3 className="text-base font-black text-white truncate">
                          {m.awayTeamName}
                        </h3>
                        <div className="flex items-center justify-start md:justify-end gap-2 text-[11px] text-slate-400">
                          {m.awayRank > 0 && <span>Rang #{m.awayRank}</span>}
                          {m.awayPoints !== undefined && m.awayPoints > 0 && <span>• {m.awayPoints} pts</span>}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-black text-sm shrink-0">
                        {m.awayTeamName?.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Goal Minutes Timeline */}
                  {m.goalMinutes && (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-xs font-extrabold text-amber-400 shrink-0">
                        ⚽ Minutes Buts :
                      </span>
                      <span className="text-xs font-mono text-slate-200 truncate">
                        {m.goalMinutes}
                      </span>
                    </div>
                  )}

                  {/* Full Odds Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* 1X2 */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">1X2</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-emerald-400">1: {m.homeOdds || "-"}</span>
                        <span className="text-amber-400">X: {m.drawOdds || "-"}</span>
                        <span className="text-blue-400">2: {m.awayOdds || "-"}</span>
                      </div>
                    </div>

                    {/* Double Chance */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Double Chance</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-slate-200">1X: {m.doubleChanceOdds?.dc1X || "-"}</span>
                        <span className="text-slate-200">12: {m.doubleChanceOdds?.dc12 || "-"}</span>
                        <span className="text-slate-200">X2: {m.doubleChanceOdds?.dcX2 || "-"}</span>
                      </div>
                    </div>

                    {/* Over / Under */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Over / Under 2.5</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-cyan-400">&gt;2.5: {m.overUnderOdds?.over25 || "-"}</span>
                        <span className="text-slate-400">&lt;2.5: {m.overUnderOdds?.under25 || "-"}</span>
                      </div>
                    </div>

                    {/* GG / NG */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">BTTS (GG / NG)</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-emerald-400">GG: {m.bothTeamsScoreOdds?.yes || "-"}</span>
                        <span className="text-slate-400">NG: {m.bothTeamsScoreOdds?.no || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & H2H Toggle Bar */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleH2H(m.id)}
                      className="text-xs font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {isH2HExpanded ? "Masquer Confrontations Directes" : `Voir Confrontations Directes H2H (${h2h.directMatches.length})`}
                      </span>
                      {isH2HExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {onCreateRuleFromDb && (
                      <button
                        onClick={() =>
                          onCreateRuleFromDb({
                            id: `#RULE-${Date.now().toString().slice(-4)}`,
                            betType: "1X2",
                            generatedDate: new Date().toLocaleDateString("fr-FR"),
                            title: `Règle de match ${m.homeTeamName} vs ${m.awayTeamName}`,
                            conditionText: `IF Côte_Dom == ${m.homeOdds || 1.8} AND Journée == ${m.roundNumber || 1} THEN 1`,
                            assignedLeagueId: m.competitionId || "ALL",
                            assignedLeagueName: m.competitionName || "Toutes les ligues",
                            mode: "Manuel",
                            isActive: true,
                          })
                        }
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer Règle depuis ce Match</span>
                      </button>
                    )}
                  </div>

                  {/* Collapsible H2H Section */}
                  {isH2HExpanded && (
                    <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 mt-2 animate-fadeIn">
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Historique des Confrontations Directes en BDD ({(h2h.directMatches || []).length})</span>
                      </h4>

                      {(h2h.directMatches || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Aucune autre confrontation directe trouvée pour ces deux équipes dans la BDD.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(h2h.directMatches || []).map((dm) => (
                            <div
                              key={dm.id}
                              className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 text-slate-300 font-bold">
                                <span>{dm.homeTeamName}</span>
                                <span className="font-mono text-amber-400 font-black px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                                  {dm.score}
                                </span>
                                <span>{dm.awayTeamName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                <span>J{dm.roundNumber} (S{dm.seasonNumber || 1})</span>
                                <span>MT: ({dm.halfTimeScore || "0-0"})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
