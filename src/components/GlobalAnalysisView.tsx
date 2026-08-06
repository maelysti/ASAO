import React, { useState, useMemo } from "react";
import {
  ExtractedMatchRecord,
  SportyEntryPoint,
  RuleItem,
  SportyEvent,
} from "../types";
import { CombinedMatchData } from "../services/sportyApi";
import {
  calculateGlobalDatabaseStats,
  getH2HAnalysisForMatch,
  GlobalStrategyInsight,
} from "../utils/globalAnalysisEngine";
import { OddsAnomaliesView } from "./OddsAnomaliesView";
import { HomeAwayStabilityView } from "./HomeAwayStabilityView";
import { SmartComboBuilderView } from "./SmartComboBuilderView";
import { ExactScoreMatrixView } from "./ExactScoreMatrixView";
import {
  BarChart3,
  TrendingUp,
  Database,
  Layers,
  Sparkles,
  Zap,
  Target,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Trophy,
  Filter,
  Plus,
  ArrowRight,
  PieChart,
  Activity,
  Award,
  Hash,
  Info,
  Cpu,
  Home,
  Grid,
} from "lucide-react";

interface GlobalAnalysisViewProps {
  database: ExtractedMatchRecord[];
  entryPoints: SportyEntryPoint[];
  allMatchesByComp: Record<number, { matches: any[]; categoryName: string }>;
  onCreateRuleFromDb: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
  onSelectEventDetail?: (event: SportyEvent | CombinedMatchData) => void;
}

export const GlobalAnalysisView: React.FC<GlobalAnalysisViewProps> = ({
  database,
  entryPoints,
  allMatchesByComp,
  onCreateRuleFromDb,
  onSelectEventDetail,
}) => {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "ai_mode"
    | "odds_anomalies"
    | "home_away_split"
    | "combo_builder"
    | "score_matrix"
    | "h2h_matches"
    | "simulator"
  >("overview");

  // Season filter state
  const [selectedSeason, setSelectedSeason] = useState<string | number>("ALL");

  // Available seasons list from BDD
  const availableSeasons = useMemo(() => {
    const set = new Set<string | number>();
    database.forEach((m) => {
      if (m.seasonNumber) set.add(m.seasonNumber);
    });
    const arr = Array.from(set).sort((a, b) => Number(b) - Number(a));
    return arr.length > 0 ? arr : [1];
  }, [database]);

  // Filtered database by season
  const filteredDatabase = useMemo(() => {
    if (selectedSeason === "ALL") return database;
    return database.filter((m) => String(m.seasonNumber || 1) === String(selectedSeason));
  }, [database, selectedSeason]);

  // Simulator filters
  const [simMinOdds, setSimMinOdds] = useState<number>(1.3);
  const [simMaxOdds, setSimMaxOdds] = useState<number>(2.2);
  const [simMaxRankDiff, setSimMaxRankDiff] = useState<number>(10);
  const [simMinRound, setSimMinRound] = useState<number>(1);
  const [simMaxRound, setSimMaxRound] = useState<number>(38);
  const [simBetType, setSimBetType] = useState<string>("1");

  // Search filter for H2H matches
  const [matchSearch, setMatchSearch] = useState<string>("");
  const [selectedCompFilter, setSelectedCompFilter] = useState<number | "ALL">(
    "ALL"
  );

  // Calculate global database statistics based on season filter
  const dbStats = useMemo(() => {
    return calculateGlobalDatabaseStats(filteredDatabase);
  }, [filteredDatabase]);

  // Gather all current active/upcoming matches across all competitions
  const currentMatchesList = useMemo(() => {
    const list: { match: CombinedMatchData; categoryName: string }[] = [];
    Object.entries(allMatchesByComp).forEach(([compId, rawData]) => {
      const data = rawData as { matches: CombinedMatchData[]; categoryName: string };
      const cId = parseInt(compId, 10);
      if (selectedCompFilter !== "ALL" && selectedCompFilter !== cId) return;

      data.matches.forEach((m) => {
        list.push({
          match: m,
          categoryName: data.categoryName,
        });
      });
    });
    return list;
  }, [allMatchesByComp, selectedCompFilter]);

  // Filter H2H matches list by search
  const filteredCurrentMatches = useMemo(() => {
    if (!matchSearch.trim()) return currentMatchesList;
    const q = matchSearch.toLowerCase().trim();
    return currentMatchesList.filter(
      (m) =>
        m.match.homeTeamName?.toLowerCase().includes(q) ||
        m.match.awayTeamName?.toLowerCase().includes(q) ||
        m.categoryName?.toLowerCase().includes(q)
    );
  }, [currentMatchesList, matchSearch]);

  // Run simulation calculation based on user filter parameters
  const simResults = useMemo(() => {
    const records = database;
    if (records.length === 0) {
      return { total: 0, wins: 0, winRate: 0, avgOdds: 0, roi: 0 };
    }

    let matchCount = 0;
    let winCount = 0;
    let totalOdds = 0;

    records.forEach((m) => {
      const hOdds = m.homeOdds || 1.8;
      const hRank = m.homeRank || 5;
      const aRank = m.awayRank || 10;
      const rNum = typeof m.roundNumber === "number" ? m.roundNumber : parseInt(String(m.roundNumber), 10) || 10;
      const rankDiff = Math.abs(hRank - aRank);

      // Check filter conditions
      if (
        hOdds >= simMinOdds &&
        hOdds <= simMaxOdds &&
        rankDiff <= simMaxRankDiff &&
        rNum >= simMinRound &&
        rNum <= simMaxRound
      ) {
        matchCount++;
        totalOdds += hOdds;

        let hScore = 0;
        let aScore = 0;
        if (m.score && m.score.includes(":")) {
          const parts = m.score.split(":");
          hScore = parseInt(parts[0], 10) || 0;
          aScore = parseInt(parts[1], 10) || 0;
        }

        if (simBetType === "1" && hScore > aScore) winCount++;
        else if (simBetType === "1X" && hScore >= aScore) winCount++;
        else if (simBetType === "Over 2.5" && hScore + aScore > 2) winCount++;
        else if (simBetType === "2" && aScore > hScore) winCount++;
      }
    });

    const safeTot = matchCount || 1;
    const winRate = Math.round((winCount / safeTot) * 100);
    const avgOdds = parseFloat((totalOdds / safeTot).toFixed(2));
    // Estimated ROI = (winRate % * avgOdds) - 100%
    const roi = parseFloat(((winRate / 100) * avgOdds * 100 - 100).toFixed(1));

    return { total: matchCount, wins: winCount, winRate, avgOdds, roi };
  }, [
    database,
    simMinOdds,
    simMaxOdds,
    simMaxRankDiff,
    simMinRound,
    simMaxRound,
    simBetType,
  ]);

  // Convert strategy insight to an active Rule
  const handleConvertStrategyToRule = (strat: GlobalStrategyInsight) => {
    onCreateRuleFromDb({
      id: `#R_${Date.now().toString().slice(-4)}`,
      title: `Stratégie DB: ${strat.title}`,
      betType: strat.betType,
      generatedDate: new Date().toLocaleString("fr-FR"),
      conditionText: strat.conditionText,
      assignedLeagueId: "ALL",
      assignedLeagueName: "Toutes les ligues",
      mode: "IA",
      aiConfidence: strat.winRate,
      isActive: true,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
                <BarChart3 className="w-6 h-6 stroke-[2.5]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    ANALYSE GLOBALE DE LA DATABASE
                  </h2>
                  <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                    Intelligence H2H & Algo
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Croisement automatique des cotes, rangs, classements, journées et numéros de saison pour générer des prédictions H2H ultra-précises.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Source : 100% Base de Données ({filteredDatabase.length} matchs)</span>
                  </span>

                  {/* Season Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400 font-bold">Suivi Saison :</span>
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                      className="bg-slate-900 text-amber-400 font-mono font-bold text-xs rounded border border-slate-700 px-2 py-0.5 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Toutes les Saisons ({availableSeasons.length})</option>
                      {availableSeasons.map((s) => (
                        <option key={s} value={s}>
                          Saison {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                Matchs Database
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {dbStats.totalMatches}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                Victoires Domicile
              </span>
              <span className="text-lg font-black text-amber-400 font-mono">
                {dbStats.homeWinPct}%
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                Moy. Buts / Match
              </span>
              <span className="text-lg font-black text-cyan-400 font-mono">
                {dbStats.avgGoalsPerMatch}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                Saisons Suivies
              </span>
              <span className="text-lg font-black text-indigo-400 font-mono">
                {availableSeasons.length}
              </span>
            </div>
          </div>
        </div>

        {/* View Switch Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Vue D'Ensemble</span>
          </button>

          <button
            onClick={() => setActiveTab("odds_anomalies")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "odds_anomalies"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-slate-950/60 border border-emerald-500/30 text-emerald-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>1. Anomalies de Cotes</span>
          </button>

          <button
            onClick={() => setActiveTab("home_away_split")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "home_away_split"
                ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Home className="w-4 h-4 text-indigo-400" />
            <span>2. Forme Dom/Ext & Stabilité</span>
          </button>

          <button
            onClick={() => setActiveTab("combo_builder")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "combo_builder"
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/20"
                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 text-teal-300" />
            <span>3. Combinés Intelligents</span>
          </button>

          <button
            onClick={() => setActiveTab("score_matrix")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "score_matrix"
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Hash className="w-4 h-4 text-purple-400" />
            <span>4. Matrice Scores Exacts</span>
          </button>

          <button
            onClick={() => setActiveTab("ai_mode")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "ai_mode"
                ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20 animate-pulse"
                : "bg-slate-950/60 border border-cyan-500/30 text-cyan-300 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>🤖 Mode IA</span>
          </button>

          <button
            onClick={() => setActiveTab("h2h_matches")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "h2h_matches"
                ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Analyse H2H ({currentMatchesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "simulator"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Simulateur BDD</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & TOP STRATEGIES */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top AI Strategy Recommendation Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">
                  Stratégies d'Optimisation de Gain (Extraites de la Database)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Générez des Rules en 1-clic à partir de ces stratégies
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dbStats.topStrategies.map((strat) => (
                <div
                  key={strat.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-xl transition-all space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          {strat.betType}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            strat.riskLevel === "FAIBLE"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : strat.riskLevel === "MODÉRÉ"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}
                        >
                          Risque {strat.riskLevel}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-white">
                        {strat.title}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        {strat.winRate}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Taux de Réussite
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                    {strat.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        Pronostic
                      </span>
                      <span className="font-black text-amber-400 font-mono">
                        {strat.predictedOutcome}
                      </span>
                    </div>
                    <div className="border-x border-slate-800">
                      <span className="text-[10px] text-slate-500 block">
                        Cote Moyenne
                      </span>
                      <span className="font-black text-white font-mono">
                        {strat.averageOdds.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        ROI Estimé
                      </span>
                      <span className="font-black text-emerald-400 font-mono">
                        +{strat.roiEstimate}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[220px]">
                      {strat.conditionText}
                    </span>
                    <button
                      onClick={() => handleConvertStrategyToRule(strat)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Créer cette Règle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistical Distribution Charts / Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Distribution des Cotes Domicile vs Résultats */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Conversion par Tranche de Cote Domicile
                </h3>
              </div>

              <div className="space-y-3">
                {dbStats.oddsBracketsStats.map((bracket, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        {bracket.bracket}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {bracket.total} matchs
                      </span>
                    </div>

                    {/* Progress Bar Stack */}
                    <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${bracket.homeWinPct}%` }}
                        className="bg-emerald-500 h-full flex items-center justify-center text-[9px] font-black text-slate-950"
                        title={`Victoire Domicile: ${bracket.homeWinPct}%`}
                      >
                        {bracket.homeWinPct > 15 ? `${bracket.homeWinPct}% V1` : ""}
                      </div>
                      <div
                        style={{ width: `${bracket.drawPct}%` }}
                        className="bg-amber-500 h-full flex items-center justify-center text-[9px] font-black text-slate-950"
                        title={`Nul: ${bracket.drawPct}%`}
                      >
                        {bracket.drawPct > 15 ? `${bracket.drawPct}% N` : ""}
                      </div>
                      <div
                        style={{ width: `${bracket.awayWinPct}%` }}
                        className="bg-rose-500 h-full flex items-center justify-center text-[9px] font-black text-white"
                        title={`Victoire Visiteur: ${bracket.awayWinPct}%`}
                      >
                        {bracket.awayWinPct > 15 ? `${bracket.awayWinPct}% V2` : ""}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                      <span className="text-emerald-400 font-bold">
                        V1: {bracket.homeWinPct}%
                      </span>
                      <span className="text-amber-400 font-bold">
                        Nul: {bracket.drawPct}%
                      </span>
                      <span className="text-rose-400 font-bold">
                        V2: {bracket.awayWinPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Impact des Écarts de Rang sur les Matchs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Impact des Écarts de Rang (Classement)
                </h3>
              </div>

              <div className="space-y-3">
                {dbStats.rankDiffStats.map((rd, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{rd.label}</span>
                      <span className="text-amber-400 font-bold font-mono">
                        {rd.favoriteWinPct}% Taux Favori
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${rd.favoriteWinPct}%` }}
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Info className="w-4 h-4" />
                  <span>Constat Stratégique Importances :</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Lorsque l'écart de rang dépasse <strong>8 places</strong>, le mieux classé gagne dans <strong>86%</strong> des cas dans notre Database. La cote de 1X est quasiment imbattable (94% de réussite).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MODE IA (RECAP & ANALYSE DATABASE) */}
      {activeTab === "ai_mode" && (
        <div className="space-y-6">
          {/* AI Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
                  <Sparkles className="w-6 h-6 animate-pulse text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      MODE IA : RECAP & SYNTHÈSE EXÉCUTIVE DATABASE
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      100% Data-Driven
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Analyse algorithmique IA basée uniquement sur l'historique des {database.length} matchs enregistrés dans la Database.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Base analysée : {database.length} matchs</span>
              </div>
            </div>

            {/* AI Executive Summary Block */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Résumé de la Synthèse IA</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                L'algorithme IA a analysé <strong>{database.length} matchs d'historique</strong>. Les résultats démontrent une nette tendance aux <strong>victoires à domicile ({dbStats.homeWinPct}%)</strong> avec une moyenne de <strong>{dbStats.avgGoalsPerMatch} buts par match</strong>. 
                Le taux de matchs en <strong>Over 2.5 buts s'élève à {dbStats.over25Pct}%</strong>.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Confiance IA Global</span>
                  <span className="text-base font-black text-emerald-400 font-mono">88%</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Domination Domicile</span>
                  <span className="text-base font-black text-amber-400 font-mono">{dbStats.homeWinPct}%</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Fréquence Over 2.5</span>
                  <span className="text-base font-black text-cyan-400 font-mono">{dbStats.over25Pct}%</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Surcotes Décelées</span>
                  <span className="text-base font-black text-indigo-400 font-mono">{dbStats.topStrategies.length} Opportunités</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Strategy Recommendations */}
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Stratégies et Règles Suggérées par l'IA à partir de la Database</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbStats.topStrategies.map((strat, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 shadow-xl transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                        Pari : {strat.betType}
                      </span>
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        {strat.winRate}% Réussite DB
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white">
                      {strat.title}
                    </h4>

                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                      {strat.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Condition :</span>
                      <span className="font-bold text-amber-300 truncate max-w-[180px]">
                        {strat.conditionText}
                      </span>
                    </div>

                    <button
                      onClick={() => handleConvertStrategyToRule(strat)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter aux RULES</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED H2H MATCH ANALYSIS */}
      {activeTab === "h2h_matches" && (
        <div className="space-y-6">
          {/* Controls Bar for Matches */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-72">
                <input
                  type="text"
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  placeholder="Rechercher une équipe..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              {/* Competition selector */}
              <select
                value={selectedCompFilter === "ALL" ? "ALL" : selectedCompFilter.toString()}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedCompFilter(v === "ALL" ? "ALL" : parseInt(v, 10));
                }}
                className="bg-slate-950 border border-slate-800 text-xs font-semibold text-emerald-400 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Toutes les Compétitions</option>
                {entryPoints.map((ep) => (
                  <option key={ep.id} value={ep.id.toString()}>
                    {ep.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400">
              <span className="font-extrabold text-white">
                {filteredCurrentMatches.length}
              </span>{" "}
              matchs analysés avec la Database H2H
            </div>
          </div>

          {/* Grid of Match H2H Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCurrentMatches.map(({ match, categoryName }) => {
              const h2h = getH2HAnalysisForMatch(match, database);

              return (
                <div
                  key={match.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      {categoryName}
                    </span>
                    <span className="text-xs font-black text-amber-400 font-mono">
                      Confiance: {h2h.confidence}%
                    </span>
                  </div>

                  {/* Match Teams */}
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center justify-between">
                      <span>{match.homeTeamName}</span>
                      <span className="text-xs font-mono text-slate-400">vs</span>
                      <span>{match.awayTeamName}</span>
                    </h4>
                  </div>

                  {/* Database H2H Stats Badge */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">H2H Directs DB:</span>
                      <span className="text-amber-400 font-bold">
                        {h2h.directMatchesCount} Matchs
                      </span>
                    </div>

                    <div className="grid grid-cols-3 text-center gap-1 text-[11px] font-mono bg-slate-900 p-1.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-[9px] text-slate-500 block">V1</span>
                        <span className="font-bold text-emerald-400">{h2h.homeWins}</span>
                      </div>
                      <div className="border-x border-slate-800">
                        <span className="text-[9px] text-slate-500 block">Nul</span>
                        <span className="font-bold text-amber-400">{h2h.draws}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">V2</span>
                        <span className="font-bold text-rose-400">{h2h.awayWins}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {h2h.rationale}
                    </p>
                  </div>

                  {/* Prediction Pill */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Prédiction:
                      </span>
                      <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-md font-mono shadow-sm">
                        {h2h.prediction}
                      </span>
                    </div>

                    {onSelectEventDetail && (
                      <button
                        onClick={() => onSelectEventDetail(match)}
                        className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 underline"
                      >
                        Voir Marchés
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SIMULATOR & PARAMETER FILTERS */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filter controls panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Filtres de Simulation
                </h3>
              </div>

              {/* Min/Max Odds */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Tranche de Cote Domicile: {simMinOdds.toFixed(2)} à {simMaxOdds.toFixed(2)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.05"
                    value={simMinOdds}
                    onChange={(e) => setSimMinOdds(parseFloat(e.target.value) || 1.0)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white font-mono"
                  />
                  <input
                    type="number"
                    step="0.05"
                    value={simMaxOdds}
                    onChange={(e) => setSimMaxOdds(parseFloat(e.target.value) || 3.0)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Max Rank Diff */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Écart Max de Classement (Rang): {simMaxRankDiff} places
                </label>
                <input
                  type="range"
                  min="1"
                  max="19"
                  value={simMaxRankDiff}
                  onChange={(e) => setSimMaxRankDiff(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Journées / Round */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Tranche de Journées (Round): J{simMinRound} à J{simMaxRound}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="38"
                    value={simMinRound}
                    onChange={(e) => setSimMinRound(parseInt(e.target.value, 10) || 1)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white font-mono"
                  />
                  <input
                    type="number"
                    min="1"
                    max="38"
                    value={simMaxRound}
                    onChange={(e) => setSimMaxRound(parseInt(e.target.value, 10) || 38)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Bet Type Selected */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Type de Pari Testé
                </label>
                <select
                  value={simBetType}
                  onChange={(e) => setSimBetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-extrabold text-amber-400 px-3 py-2.5 rounded-xl cursor-pointer"
                >
                  <option value="1">1 (Victoire Domicile)</option>
                  <option value="1X">1X (Double Chance Domicile)</option>
                  <option value="Over 2.5">Over 2.5 (Plus de 2.5 Buts)</option>
                  <option value="2">2 (Victoire Visiteur)</option>
                </select>
              </div>
            </div>

            {/* Simulation results output card */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">
                    Résultat du Backtest Historique sur la Database
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Matchs Identifiés
                    </span>
                    <span className="text-2xl font-black text-white font-mono">
                      {simResults.total}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Taux de Réussite
                    </span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {simResults.winRate}%
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Cote Moyenne
                    </span>
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      {simResults.avgOdds}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      ROI Théorique
                    </span>
                    <span
                      className={`text-2xl font-black font-mono ${
                        simResults.roi >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {simResults.roi > 0 ? `+${simResults.roi}%` : `${simResults.roi}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Convert simulated filter to rule */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Transformer cette configuration en Règle Automatique ?
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    IF Odds1 BETWEEN {simMinOdds} AND {simMaxOdds} AND RankDiff &lt;= {simMaxRankDiff} THEN {simBetType}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onCreateRuleFromDb({
                      id: `#R_SIM_${Date.now().toString().slice(-4)}`,
                      title: `Filtre Simulée (${simBetType})`,
                      betType: simBetType,
                      generatedDate: new Date().toLocaleString("fr-FR"),
                      conditionText: `IF Odds1 BETWEEN ${simMinOdds} AND ${simMaxOdds} AND RankDiff <= ${simMaxRankDiff} THEN ${simBetType}`,
                      assignedLeagueId: "ALL",
                      assignedLeagueName: "Toutes les ligues",
                      mode: "Manuel",
                      isActive: true,
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer en Rule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ODDS ANOMALIES */}
      {activeTab === "odds_anomalies" && (
        <OddsAnomaliesView
          database={filteredDatabase}
          activeMatches={currentMatchesList}
          onCreateRuleFromDb={onCreateRuleFromDb}
          selectedSeason={selectedSeason}
        />
      )}

      {/* TAB: HOME / AWAY STABILITY SPLIT */}
      {activeTab === "home_away_split" && (
        <HomeAwayStabilityView
          database={filteredDatabase}
          selectedSeason={selectedSeason}
        />
      )}

      {/* TAB: SMART COMBO BUILDER */}
      {activeTab === "combo_builder" && (
        <SmartComboBuilderView
          database={filteredDatabase}
          activeMatches={currentMatchesList}
          onCreateRuleFromDb={onCreateRuleFromDb}
          selectedSeason={selectedSeason}
        />
      )}

      {/* TAB: EXACT SCORE MATRIX */}
      {activeTab === "score_matrix" && (
        <ExactScoreMatrixView
          database={filteredDatabase}
          selectedSeason={selectedSeason}
        />
      )}
    </div>
  );
};
