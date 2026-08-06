import React, { useState, useMemo } from "react";
import { ExtractedMatchRecord } from "../types";
import { Hash, PieChart, Sparkles, Trophy, Filter, Activity, BarChart3 } from "lucide-react";

interface ExactScoreMatrixViewProps {
  database: ExtractedMatchRecord[];
  selectedSeason: string | number;
}

export interface ScoreFrequencyItem {
  score: string;
  count: number;
  percentage: number;
  homeWin: boolean;
  draw: boolean;
  awayWin: boolean;
  intensity: "HIGH" | "MEDIUM" | "LOW" | "RARE";
}

export const ExactScoreMatrixView: React.FC<ExactScoreMatrixViewProps> = ({
  database,
  selectedSeason,
}) => {
  const [filterScenario, setFilterScenario] = useState<"ALL" | "FAV_HOME" | "BALANCED" | "HIGH_GOALS">("ALL");

  // Filter BDD by season
  const filteredDb = useMemo(() => {
    if (selectedSeason === "ALL") return database;
    return database.filter((m) => String(m.seasonNumber || 1) === String(selectedSeason));
  }, [database, selectedSeason]);

  // Compute exact score frequency
  const scoreStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalValidMatches = 0;

    filteredDb.forEach((m) => {
      if (!m.score || !m.score.includes(":")) return;

      const [hS, aS] = m.score.split(":").map((s) => parseInt(s, 10) || 0);
      const hRank = m.homeRank || 5;
      const aRank = m.awayRank || 10;
      const totalG = hS + aS;

      // Filter by scenario if active
      if (filterScenario === "FAV_HOME" && !(hRank <= 4 && aRank > 6)) return;
      if (filterScenario === "BALANCED" && Math.abs(hRank - aRank) > 3) return;
      if (filterScenario === "HIGH_GOALS" && totalG < 3) return;

      const formattedScore = `${hS}-${aS}`;
      counts[formattedScore] = (counts[formattedScore] || 0) + 1;
      totalValidMatches++;
    });

    const safeTot = totalValidMatches || 1;
    const items: ScoreFrequencyItem[] = [];

    Object.entries(counts).forEach(([sc, cnt]) => {
      const pct = parseFloat(((cnt / safeTot) * 100).toFixed(1));
      const [h, a] = sc.split("-").map((s) => parseInt(s, 10) || 0);

      let intensity: "HIGH" | "MEDIUM" | "LOW" | "RARE" = "RARE";
      if (pct >= 12) intensity = "HIGH";
      else if (pct >= 7) intensity = "MEDIUM";
      else if (pct >= 3) intensity = "LOW";

      items.push({
        score: sc,
        count: cnt,
        percentage: pct,
        homeWin: h > a,
        draw: h === a,
        awayWin: a > h,
        intensity,
      });
    });

    return {
      totalValidMatches,
      list: items.sort((a, b) => b.count - a.count),
    };
  }, [filteredDb, filterScenario]);

  // Top 5 Most Frequent Scores
  const topScores = scoreStats.list.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold">
                <Hash className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Matrice des Tendances de Scores Exacts & Fréquence Réelle
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Distribution des scores exacts calculée sur {scoreStats.totalValidMatches} matchs enregistrés dans la BDD pour la {selectedSeason === "ALL" ? "totalité des saisons" : `Saison ${selectedSeason}`}.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2">
            <span className="text-xs text-slate-400 font-bold">Total Matchs Évalués :</span>
            <span className="text-lg font-black text-purple-400 font-mono">
              {scoreStats.totalValidMatches}
            </span>
          </div>
        </div>

        {/* Scenario Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setFilterScenario("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterScenario === "ALL"
                ? "bg-purple-500 text-white font-black shadow-md shadow-purple-500/20"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Tous Scénarios
          </button>
          <button
            onClick={() => setFilterScenario("FAV_HOME")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterScenario === "FAV_HOME"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            Favori à Domicile (Top 4)
          </button>
          <button
            onClick={() => setFilterScenario("BALANCED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterScenario === "BALANCED"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "bg-slate-950 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            Matchs Équilibrés (Écart Rang ≤ 3)
          </button>
          <button
            onClick={() => setFilterScenario("HIGH_GOALS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterScenario === "HIGH_GOALS"
                ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                : "bg-slate-950 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            }`}
          >
            Tendance Buts (Over 2.5)
          </button>
        </div>
      </div>

      {/* Top 5 Highlight Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Top 5 des Scores Exacts les plus Fréquents
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {topScores.map((item, idx) => (
            <div
              key={item.score}
              className="bg-slate-950 border border-purple-500/30 rounded-2xl p-3.5 text-center space-y-1 relative overflow-hidden"
            >
              <span className="text-[10px] font-black font-mono text-purple-400 uppercase block">
                #{idx + 1}
              </span>
              <span className="text-2xl font-black text-white font-mono block">
                {item.score}
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono block">
                {item.percentage}% ({item.count}m)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Matrix Grid Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
          Matrice d'Intensité de tous les Scores Exacts
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {scoreStats.list.map((item) => (
            <div
              key={item.score}
              className={`p-4 rounded-2xl border transition-all text-center space-y-1 ${
                item.intensity === "HIGH"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10"
                  : item.intensity === "MEDIUM"
                  ? "bg-purple-500/20 border-purple-500/50 text-white"
                  : item.intensity === "LOW"
                  ? "bg-slate-950 border-slate-800 text-slate-300"
                  : "bg-slate-950/60 border-slate-900 text-slate-500"
              }`}
            >
              <span className="text-xl font-black font-mono block">{item.score}</span>
              <span className="text-xs font-mono font-bold block">
                {item.percentage}%
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {item.count} occurrence(s)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
