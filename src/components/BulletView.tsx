import React, { useState, useMemo } from "react";
import {
  Flame,
  Target,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  Filter,
  BarChart3,
  Sliders,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  ExtractedMatchRecord,
  SportyEntryPoint,
  RuleItem,
  RuleMatchEvaluation,
} from "../types";
import { evaluateRuleOnMatch } from "../utils/ruleEngine";

interface BulletViewProps {
  database: ExtractedMatchRecord[];
  entryPoints: SportyEntryPoint[];
  allMatchesByComp: Record<
    number,
    { matches: any[]; categoryName: string }
  >;
  onCreateRule: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
  activeRules: RuleItem[];
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

export const BulletView: React.FC<BulletViewProps> = ({
  database,
  entryPoints,
  allMatchesByComp,
  onCreateRule,
  activeRules,
  onToggleRule,
  onDeleteRule,
}) => {
  // Filter / Analysis State
  const [selectedPreset, setSelectedPreset] = useState<string>("p1");

  // Custom filters state
  const [minRank1, setMinRank1] = useState<number>(1);
  const [maxRank1, setMaxRank1] = useState<number>(6);
  const [minRank2, setMinRank2] = useState<number>(8);
  const [maxRank2, setMaxRank2] = useState<number>(20);
  const [minPtsDiff, setMinPtsDiff] = useState<number>(8); // P1 - P2 >= 8
  const [targetBet, setTargetBet] = useState<string>("1X");
  const [customTitle, setCustomTitle] = useState<string>("Règle Bullet Domicile Fort");

  const [notification, setNotification] = useState<string | null>(null);

  // Quick Preset Selector Handler
  const handleSelectPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey === "p1") {
      // Top Home vs Bottom Away
      setMinRank1(1);
      setMaxRank1(5);
      setMinRank2(10);
      setMaxRank2(20);
      setMinPtsDiff(10);
      setTargetBet("1X");
      setCustomTitle("Bullet: Top 5 Domicile vs Bas de Tableau");
    } else if (presetKey === "p2") {
      // Dominant Away
      setMinRank1(9);
      setMaxRank1(20);
      setMinRank2(1);
      setMaxRank2(4);
      setMinPtsDiff(-10); // P1 - P2 <= -10 => P2 - P1 >= 10
      setTargetBet("X2");
      setCustomTitle("Bullet: Dominance Visiteur Pts & Rang");
    } else if (presetKey === "p3") {
      // Titan Clash
      setMinRank1(1);
      setMaxRank1(4);
      setMinRank2(1);
      setMaxRank2(4);
      setMinPtsDiff(0);
      setTargetBet("12");
      setCustomTitle("Bullet: Choc du Top 4");
    } else if (presetKey === "p4") {
      // Points Differential >= 15
      setMinRank1(1);
      setMaxRank1(20);
      setMinRank2(1);
      setMaxRank2(20);
      setMinPtsDiff(15);
      setTargetBet("1");
      setCustomTitle("Bullet: Écart Majeur de Points (>= 15 Pts)");
    }
  };

  // Combine DB matches and active matches for complete dataset analysis
  const combinedMatches = useMemo(() => {
    const list: Array<{
      id: number;
      homeTeamName: string;
      awayTeamName: string;
      homeRank: number;
      awayRank: number;
      homePts: number;
      awayPts: number;
      score?: string;
      categoryName: string;
      source: string;
      expectedStart?: string;
    }> = [];

    const seenIds = new Set<number>();

    // Add extracted database matches
    database.forEach((rec) => {
      seenIds.add(rec.id);
      list.push({
        id: rec.id,
        homeTeamName: rec.homeTeamName || "Dom",
        awayTeamName: rec.awayTeamName || "Ext",
        homeRank: rec.homeRank || 10,
        awayRank: rec.awayRank || 10,
        homePts: rec.homePoints || 0,
        awayPts: rec.awayPoints || 0,
        score: rec.score,
        categoryName: rec.competitionName || "Ligue",
        source: rec.source || "BDD Extraite",
        expectedStart: rec.expectedStart,
      });
    });

    // Add current matches from API
    (Object.values(allMatchesByComp) as Array<{ matches: any[]; categoryName: string }>).forEach((comp) => {
      if (comp && Array.isArray(comp.matches)) {
        comp.matches.forEach((m) => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            list.push({
              id: m.id,
              homeTeamName: m.homeTeam?.name || "Dom",
              awayTeamName: m.awayTeam?.name || "Ext",
              homeRank: m.homeTeam?.position || 10,
              awayRank: m.awayTeam?.position || 10,
              homePts: m.homeTeam?.points || 0,
              awayPts: m.awayTeam?.points || 0,
              score: m.score,
              categoryName: comp.categoryName,
              source: "Sporty API",
              expectedStart: m.expectedStart,
            });
          }
        });
      }
    });

    return list;
  }, [database, allMatchesByComp]);

  // Execute Filter on BDD Dataset
  const analysisResult = useMemo(() => {
    const filtered = combinedMatches.filter((m) => {
      const r1Pass = m.homeRank >= minRank1 && m.homeRank <= maxRank1;
      const r2Pass = m.awayRank >= minRank2 && m.awayRank <= maxRank2;
      const ptsDiff = m.homePts - m.awayPts;
      const ptsPass = ptsDiff >= minPtsDiff;
      return r1Pass && r2Pass && ptsPass;
    });

    let count1 = 0;
    let countX = 0;
    let count2 = 0;
    let count1X = 0;
    let countX2 = 0;
    let count12 = 0;
    let totalFinished = 0;

    filtered.forEach((m) => {
      if (m.score && m.score.includes("-")) {
        const parts = m.score.split("-").map((s) => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          totalFinished++;
          const hG = parts[0];
          const aG = parts[1];

          if (hG > aG) {
            count1++;
            count1X++;
            count12++;
          } else if (aG > hG) {
            count2++;
            countX2++;
            count12++;
          } else {
            countX++;
            count1X++;
            countX2++;
          }
        }
      }
    });

    const rate1 = totalFinished > 0 ? (count1 / totalFinished) * 100 : 0;
    const rateX = totalFinished > 0 ? (countX / totalFinished) * 100 : 0;
    const rate2 = totalFinished > 0 ? (count2 / totalFinished) * 100 : 0;
    const rate1X = totalFinished > 0 ? (count1X / totalFinished) * 100 : 0;
    const rateX2 = totalFinished > 0 ? (countX2 / totalFinished) * 100 : 0;
    const rate12 = totalFinished > 0 ? (count12 / totalFinished) * 100 : 0;

    // Pick best outcome automatically
    let best = "1X";
    let bestRate = rate1X;

    if (rate1 > bestRate) {
      best = "1";
      bestRate = rate1;
    }
    if (rate2 > bestRate) {
      best = "2";
      bestRate = rate2;
    }
    if (rate12 > bestRate && rate12 > 80) {
      best = "12";
      bestRate = rate12;
    }
    if (rateX2 > bestRate) {
      best = "X2";
      bestRate = rateX2;
    }

    return {
      totalFound: filtered.length,
      totalFinished,
      count1,
      countX,
      count2,
      count1X,
      countX2,
      count12,
      rate1: Math.round(rate1),
      rateX: Math.round(rateX),
      rate2: Math.round(rate2),
      rate1X: Math.round(rate1X),
      rateX2: Math.round(rateX2),
      rate12: Math.round(rate12),
      recommendedBet: best,
      recommendedSuccessRate: Math.round(bestRate),
      sampleMatches: filtered,
    };
  }, [combinedMatches, minRank1, maxRank1, minRank2, maxRank2, minPtsDiff]);

  // Handle adding custom/preset rule into Rules Engine
  const handleAddRuleToEngine = () => {
    const conditionText = `IF Rank1 <= ${maxRank1} AND Rank2 >= ${minRank2} AND Points1 - Points2 >= ${minPtsDiff} THEN ${targetBet}`;
    const newRule: Omit<RuleItem, "stats" | "evaluations"> = {
      id: `#BULLET-${Date.now().toString().slice(-4)}`,
      betType:
        targetBet === "1" || targetBet === "2" || targetBet === "X"
          ? "1X2"
          : "Double Chance",
      generatedDate: new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) + " à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      title: customTitle || "Règle Analyse Bullet",
      conditionText,
      assignedLeagueId: "ALL",
      assignedLeagueName: "Toutes les ligues",
      mode: "IA",
      aiConfidence: analysisResult.recommendedSuccessRate || 88,
      isActive: true,
    };

    onCreateRule(newRule);
    setNotification(
      `Règle "${newRule.title}" (${targetBet}) ajoutée avec succès aux Règles actives !`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter Bullet Rules from Active Rules
  const bulletRules = useMemo(() => {
    return activeRules.filter((r) => r.id.startsWith("#BULLET") || r.mode === "IA" || r.title.toLowerCase().includes("bullet") || r.conditionText.includes("Points"));
  }, [activeRules]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 shrink-0">
              <Flame className="w-8 h-8 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-black tracking-wider uppercase">
                  Nouveau Module BDD
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {combinedMatches.length} Matchs BDD Traités
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mt-1">
                RUBAN BULLET &amp; ANALYSE DE RANG / POINTS
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5">
                Analysez automatiquement la BDD par comparaison de Classement (Rank) &amp; Points, générez des règles prédictives et appliquez-les directement sur les matchs actuels avec récapitulatif Gagnant/Perdant.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Règles Bullet</div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {bulletRules.length}
              </div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Matchs BDD</div>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {database.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-between gap-2 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* PRESETS & ANALYZER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: PRESET SELECTOR & CUSTOM BUILDER (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Filtre &amp; Modèles Bullet
              </h2>
            </div>
            <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              BDD Rang vs Points
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Modèles d&apos;Analyse Rapide (Presets)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectPreset("p1")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPreset === "p1"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold shadow-md"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="text-xs font-black truncate">🔥 Top vs Bas</div>
                <div className="text-[10px] text-slate-400 mt-0.5">R1 ≤ 5 vs R2 ≥ 10 | Pts +10</div>
              </button>

              <button
                onClick={() => handleSelectPreset("p2")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPreset === "p2"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold shadow-md"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="text-xs font-black truncate">🚀 Visiteur Dominant</div>
                <div className="text-[10px] text-slate-400 mt-0.5">R2 ≤ 4 vs R1 ≥ 9 | P2 Pts +10</div>
              </button>

              <button
                onClick={() => handleSelectPreset("p3")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPreset === "p3"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold shadow-md"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="text-xs font-black truncate">⚔️ Choc Top 4</div>
                <div className="text-[10px] text-slate-400 mt-0.5">R1 ≤ 4 vs R2 ≤ 4</div>
              </button>

              <button
                onClick={() => handleSelectPreset("p4")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPreset === "p4"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold shadow-md"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="text-xs font-black truncate">⚡ Écart Pts &ge; 15</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Points1 - Points2 &ge; 15</div>
              </button>
            </div>
          </div>

          {/* Custom Controls */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Configuration Personnalisée Rang &amp; Points</span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Rang Domicile (R1) Max
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxRank1}
                  onChange={(e) => {
                    setSelectedPreset("custom");
                    setMaxRank1(parseInt(e.target.value) || 20);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-300 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Rang Extérieur (R2) Min
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={minRank2}
                  onChange={(e) => {
                    setSelectedPreset("custom");
                    setMinRank2(parseInt(e.target.value) || 1);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-300 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Différence de Points Min (Pts Domicile - Pts Extérieur)
              </label>
              <input
                type="number"
                value={minPtsDiff}
                onChange={(e) => {
                  setSelectedPreset("custom");
                  setMinPtsDiff(parseInt(e.target.value) || 0);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 focus:border-emerald-400 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Titre de la Règle
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Pronostic Cible à Appliquer
              </label>
              <select
                value={targetBet}
                onChange={(e) => setTargetBet(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:border-amber-400 outline-none cursor-pointer"
              >
                <option value="1">1 (Victoire Domicile)</option>
                <option value="1X">1X (Victoire Domicile ou Nul)</option>
                <option value="X">X (Match Nul)</option>
                <option value="12">12 (Victoire Domicile ou Extérieur)</option>
                <option value="X2">X2 (Nul ou Victoire Extérieur)</option>
                <option value="2">2 (Victoire Extérieur)</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: BDD STATISTICAL ANALYSIS & ACTIONABLE RULE CREATION (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Résultats &amp; Probabilités BDD
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                {analysisResult.totalFinished} / {analysisResult.totalFound} Matchs Analysés
              </span>
            </div>

            {/* Analysis Summary Card */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Analyse Rangs &amp; Points Détectée
                  </div>
                  <div className="text-xs font-black text-amber-300 font-mono mt-0.5">
                    R1 ≤ {maxRank1} vs R2 ≥ {minRank2} | Pts Diff ≥ {minPtsDiff >= 0 ? `+${minPtsDiff}` : minPtsDiff}
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Pronostic Conseillé : {analysisResult.recommendedBet} ({analysisResult.recommendedSuccessRate}%)</span>
                </div>
              </div>

              {/* Progress Bars for Outcomes */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400">Victoire 1</div>
                    <div className="text-sm font-black text-emerald-400 font-mono">{analysisResult.rate1}%</div>
                    <div className="text-[9px] text-slate-500">{analysisResult.count1} m.</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400">Match Nul (X)</div>
                    <div className="text-sm font-black text-amber-400 font-mono">{analysisResult.rateX}%</div>
                    <div className="text-[9px] text-slate-500">{analysisResult.countX} m.</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400">Victoire 2</div>
                    <div className="text-sm font-black text-rose-400 font-mono">{analysisResult.rate2}%</div>
                    <div className="text-[9px] text-slate-500">{analysisResult.count2} m.</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-emerald-400">1X (Dom/Nul)</div>
                    <div className="text-sm font-black text-emerald-300 font-mono">{analysisResult.rate1X}%</div>
                    <div className="text-[9px] text-slate-500">{analysisResult.count1X} m.</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-cyan-400">12 (Non Nul)</div>
                    <div className="text-sm font-black text-cyan-300 font-mono">{analysisResult.rate12}%</div>
                    <div className="text-[9px] text-slate-500">{analysisResult.count12} m.</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-amber-400">X2 (Nul/Ext)</div>
                    <div className="text-sm font-black text-amber-300 font-mono">{analysisResult.rateX2}%</div>
                    <div className="text-[9px] text-slate-500">{analysisResult.countX2} m.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Matches Matching this Bullet Filter */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Échantillon de Matchs Correspondants BDD ({analysisResult.sampleMatches.length})</span>
                <span className="text-[10px] text-slate-500 font-mono">Dernières données</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {analysisResult.sampleMatches.slice(0, 8).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-200 truncate">
                        {m.homeTeamName} <span className="text-amber-400 font-mono">(#{m.homeRank}, {m.homePts}pts)</span> vs {m.awayTeamName} <span className="text-amber-400 font-mono">(#{m.awayRank}, {m.awayPts}pts)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {m.categoryName} &bull; {m.source}
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-mono">
                      {m.score ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                          {m.score}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                          À venir
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {analysisResult.sampleMatches.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    Aucun match dans la BDD ne correspond aux critères de rang/points sélectionnés.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ADD TO RULES BUTTON (AJOUTER DANS RULES) */}
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={handleAddRuleToEngine}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer transform hover:scale-[1.01]"
            >
              <Plus className="w-5 h-5 shrink-0 stroke-[3]" />
              <span>AJOUTER CETTE ANALYSE DANS RULES</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE BULLET RULES & MATCHES EVALUATION RECAP */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Règles Bullet Actives ({bulletRules.length})
              </h2>
              <p className="text-xs text-slate-400">
                Suivi en temps réel des règles créées et récapitulatif des résultats Gagnant / Perdant sur tous les matchs.
              </p>
            </div>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="space-y-4">
          {bulletRules.map((rule) => {
            const evals = rule.evaluations || [];
            const validated = evals.filter((e) => e.status === "VALIDÉ");
            const failed = evals.filter((e) => e.status === "ERREUR");
            const pending = evals.filter((e) => e.status === "EN ATTENTE");

            return (
              <div
                key={rule.id}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/40">
                      {rule.id}
                    </span>
                    <span className="font-extrabold text-sm text-white">{rule.title}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {rule.betType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      {rule.stats.successRate}% Gagnant ({validated.length}/{validated.length + failed.length})
                    </span>

                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        rule.isActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </button>

                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                      title="Supprimer la règle"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300/90 font-bold">
                  {rule.conditionText}
                </div>

                {/* Match Evaluations Recap (Gagnant / Perdant) */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Récapitulatif des Matchs Associés ({evals.length})
                  </div>

                  {evals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {evals.map((e, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border flex items-center justify-between text-xs font-mono ${
                            e.status === "VALIDÉ"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : e.status === "ERREUR"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-bold">{e.matchName}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {e.categoryName} {e.roundNumber ? `&bull; Journée ${e.roundNumber}` : ""}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {e.status === "VALIDÉ" ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                GAGNANT ({e.actualScore})
                              </span>
                            ) : e.status === "ERREUR" ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-black flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-400" />
                                PERDANT ({e.actualScore})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                EN ATTENTE
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-2">
                      Aucun match en cours ou terminé n&apos;a encore correspondu à cette règle Bullet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {bulletRules.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
              <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-400">Aucune règle Bullet n&apos;a encore été enregistrée.</p>
              <p className="max-w-md mx-auto text-slate-500">
                Utilisez le panneau ci-dessus pour configurer une règle basée sur le rang/points et cliquez sur &quot;AJOUTER CETTE ANALYSE DANS RULES&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
