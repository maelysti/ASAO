import React, { useState, useMemo } from "react";
import { ExtractedMatchRecord } from "../types";
import { Shield, Home, Navigation, Search, Activity, Award, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface HomeAwayStabilityViewProps {
  database: ExtractedMatchRecord[];
  selectedSeason: string | number;
}

export interface TeamSplitStats {
  teamName: string;
  totalMatches: number;
  // Home
  homeMatches: number;
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  homeWinPct: number;
  homeAvgGoalsFor: number;
  homeAvgGoalsAgainst: number;
  // Away
  awayMatches: number;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  awayWinPct: number;
  awayAvgGoalsFor: number;
  awayAvgGoalsAgainst: number;
  // Summary Indices
  discrepancyPct: number; // HomeWin% - AwayWin%
  stabilityScore: number; // 0 to 100
  badge: "FORTERESSE_DOMICILE" | "SOLIDE_EXTERIEUR" | "REGULIER" | "INCONSTANT";
}

export const HomeAwayStabilityView: React.FC<HomeAwayStabilityViewProps> = ({
  database,
  selectedSeason,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterBadge, setFilterBadge] = useState<string>("ALL");

  // Filter BDD by season
  const filteredDb = useMemo(() => {
    if (selectedSeason === "ALL") return database;
    return database.filter((m) => String(m.seasonNumber || 1) === String(selectedSeason));
  }, [database, selectedSeason]);

  // Calculate team home/away splits
  const teamsStatsList = useMemo(() => {
    const map = new Map<
      string,
      {
        teamName: string;
        homeMatches: number;
        homeWins: number;
        homeDraws: number;
        homeLosses: number;
        homeGF: number;
        homeGA: number;
        awayMatches: number;
        awayWins: number;
        awayDraws: number;
        awayLosses: number;
        awayGF: number;
        awayGA: number;
      }
    >();

    const getOrCreate = (name: string) => {
      const clean = name.trim();
      if (!map.has(clean)) {
        map.set(clean, {
          teamName: clean,
          homeMatches: 0,
          homeWins: 0,
          homeDraws: 0,
          homeLosses: 0,
          homeGF: 0,
          homeGA: 0,
          awayMatches: 0,
          awayWins: 0,
          awayDraws: 0,
          awayLosses: 0,
          awayGF: 0,
          awayGA: 0,
        });
      }
      return map.get(clean)!;
    };

    filteredDb.forEach((m) => {
      if (!m.score || !m.score.includes(":")) return;
      const [hS, aS] = m.score.split(":").map((s) => parseInt(s, 10) || 0);

      const hObj = getOrCreate(m.homeTeamName || "Home");
      hObj.homeMatches++;
      hObj.homeGF += hS;
      hObj.homeGA += aS;
      if (hS > aS) hObj.homeWins++;
      else if (hS === aS) hObj.homeDraws++;
      else hObj.homeLosses++;

      const aObj = getOrCreate(m.awayTeamName || "Away");
      aObj.awayMatches++;
      aObj.awayGF += aS;
      aObj.awayGA += hS;
      if (aS > hS) aObj.awayWins++;
      else if (aS === hS) aObj.awayDraws++;
      else aObj.awayLosses++;
    });

    const results: TeamSplitStats[] = [];

    map.forEach((t) => {
      const totalMatches = t.homeMatches + t.awayMatches;
      if (totalMatches < 2) return;

      const safeH = t.homeMatches || 1;
      const safeA = t.awayMatches || 1;

      const homeWinPct = Math.round((t.homeWins / safeH) * 100);
      const awayWinPct = Math.round((t.awayWins / safeA) * 100);

      const discrepancyPct = homeWinPct - awayWinPct;

      // Stability score = 100 - (|discrepancy| * 0.6 + volatility_penalty)
      const diffGoalVar = Math.abs(t.homeGF / safeH - t.awayGF / safeA);
      const penalty = Math.abs(discrepancyPct) * 0.6 + diffGoalVar * 10;
      const stabilityScore = Math.max(15, Math.min(98, Math.round(100 - penalty)));

      let badge: "FORTERESSE_DOMICILE" | "SOLIDE_EXTERIEUR" | "REGULIER" | "INCONSTANT" = "REGULIER";
      if (discrepancyPct >= 30 && homeWinPct >= 65) {
        badge = "FORTERESSE_DOMICILE";
      } else if (discrepancyPct <= -15 || awayWinPct >= 60) {
        badge = "SOLIDE_EXTERIEUR";
      } else if (stabilityScore < 50) {
        badge = "INCONSTANT";
      } else {
        badge = "REGULIER";
      }

      results.push({
        teamName: t.teamName,
        totalMatches,
        homeMatches: t.homeMatches,
        homeWins: t.homeWins,
        homeDraws: t.homeDraws,
        homeLosses: t.homeLosses,
        homeGoalsFor: t.homeGF,
        homeGoalsAgainst: t.homeGA,
        homeWinPct,
        homeAvgGoalsFor: parseFloat((t.homeGF / safeH).toFixed(2)),
        homeAvgGoalsAgainst: parseFloat((t.homeGA / safeH).toFixed(2)),
        awayMatches: t.awayMatches,
        awayWins: t.awayWins,
        awayDraws: t.awayDraws,
        awayLosses: t.awayLosses,
        awayGoalsFor: t.awayGF,
        awayGoalsAgainst: t.awayGA,
        awayWinPct,
        awayAvgGoalsFor: parseFloat((t.awayGF / safeA).toFixed(2)),
        awayAvgGoalsAgainst: parseFloat((t.awayGA / safeA).toFixed(2)),
        discrepancyPct,
        stabilityScore,
        badge,
      });
    });

    return results.sort((a, b) => b.stabilityScore - a.stabilityScore);
  }, [filteredDb]);

  const filteredTeams = useMemo(() => {
    return teamsStatsList.filter((t) => {
      if (filterBadge !== "ALL" && t.badge !== filterBadge) return false;
      if (searchTerm.trim().length > 0) {
        return t.teamName.toLowerCase().includes(searchTerm.toLowerCase().trim());
      }
      return true;
    });
  }, [teamsStatsList, filterBadge, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 font-bold">
                <Home className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Indice de Stabilité & Forme Domicile / Extérieur
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Analyse les performances séparées Domicile vs Extérieur et calcule le score d'indice de régularité (0-100%) pour détecter les forteresses et éviter les équipes inconstantes ({selectedSeason === "ALL" ? "Toutes saisons" : `Saison ${selectedSeason}`}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
              {teamsStatsList.length} Équipes Analysées
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterBadge("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterBadge === "ALL"
                  ? "bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Toutes Équipes
            </button>
            <button
              onClick={() => setFilterBadge("FORTERESSE_DOMICILE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterBadge === "FORTERESSE_DOMICILE"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              🏰 Forteresses Domicile
            </button>
            <button
              onClick={() => setFilterBadge("SOLIDE_EXTERIEUR")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterBadge === "SOLIDE_EXTERIEUR"
                  ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "bg-slate-950 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              }`}
            >
              ✈️ Solide à l'Extérieur
            </button>
            <button
              onClick={() => setFilterBadge("INCONSTANT")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterBadge === "INCONSTANT"
                  ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20"
                  : "bg-slate-950 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              ⚠️ Équipes Inconstantes
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Chercher une équipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Team Cards */}
      {filteredTeams.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
          <Activity className="w-10 h-10 text-indigo-400 mx-auto" />
          <h4 className="text-base font-extrabold text-white">Aucune donnée trouvée pour cette sélection</h4>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <div
              key={team.teamName}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 shadow-xl transition-all space-y-4"
            >
              {/* Header info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-base text-white">{team.teamName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {team.totalMatches} matchs joués dans la BDD
                  </span>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-xl font-black text-indigo-400 font-mono">
                      {team.stabilityScore}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    Score Régularité
                  </span>
                </div>
              </div>

              {/* Badge */}
              <div className="flex items-center gap-2">
                {team.badge === "FORTERESSE_DOMICILE" && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-1">
                    <span>🏰 Forteresse Domicile</span>
                  </span>
                )}
                {team.badge === "SOLIDE_EXTERIEUR" && (
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 text-xs font-black flex items-center gap-1">
                    <span>✈️ Solide à l'Extérieur</span>
                  </span>
                )}
                {team.badge === "INCONSTANT" && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-black flex items-center gap-1">
                    <span>⚠️ Équipe Inconstante</span>
                  </span>
                )}
                {team.badge === "REGULIER" && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs font-black flex items-center gap-1">
                    <span>⚖️ Équipe Équilibrée</span>
                  </span>
                )}
              </div>

              {/* Home vs Away Comparison Box */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                {/* Home */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-slate-300 font-extrabold">
                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Domicile ({team.homeMatches}m)</span>
                  </div>
                  <div className="text-emerald-400 font-black font-mono text-base">
                    {team.homeWinPct}% <span className="text-[10px] text-slate-400 font-normal">Victoires</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {team.homeWins}V - {team.homeDraws}N - {team.homeLosses}D
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    Moy. Buts: {team.homeAvgGoalsFor} / {team.homeAvgGoalsAgainst}
                  </div>
                </div>

                {/* Away */}
                <div className="space-y-1.5 border-l border-slate-800 pl-2">
                  <div className="flex items-center gap-1 text-slate-300 font-extrabold">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Extérieur ({team.awayMatches}m)</span>
                  </div>
                  <div className="text-cyan-400 font-black font-mono text-base">
                    {team.awayWinPct}% <span className="text-[10px] text-slate-400 font-normal">Victoires</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {team.awayWins}V - {team.awayDraws}N - {team.awayLosses}D
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    Moy. Buts: {team.awayAvgGoalsFor} / {team.awayAvgGoalsAgainst}
                  </div>
                </div>
              </div>

              {/* Visual Split Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Écart Dom/Ext : {team.discrepancyPct > 0 ? `+${team.discrepancyPct}%` : `${team.discrepancyPct}%`}</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.max(5, team.homeWinPct)}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Domicile ${team.homeWinPct}%`}
                  />
                  <div
                    style={{ width: `${Math.max(5, team.awayWinPct)}%` }}
                    className="bg-cyan-500 h-full"
                    title={`Extérieur ${team.awayWinPct}%`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
