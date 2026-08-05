import React, { useState, useMemo } from "react";
import {
  Sliders,
  Cpu,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  Filter,
  Trash2,
  Play,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Zap,
  Info,
  BookOpen,
} from "lucide-react";
import { RuleItem, SportyEntryPoint, AIRecapPrediction } from "../types";

interface RulesViewProps {
  rules: RuleItem[];
  entryPoints: SportyEntryPoint[];
  activeMode: "Manuel" | "IA";
  onModeChange: (mode: "Manuel" | "IA") => void;
  onCreateRule: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  aiRecaps: AIRecapPrediction[];
  onRunAIScan: () => void;
  isScanningAI: boolean;
}

export interface ConditionRow {
  id: string;
  connector: "IF" | "AND" | "OR";
  param: string;
  operator: "<" | ">" | "<=" | ">=" | "=" | "!=" | "BETWEEN";
  valueType: "PARAM" | "VALUE";
  valueParam?: string;
  valueNumber?: number;
  minVal?: number;
  maxVal?: number;
}

export const RulesView: React.FC<RulesViewProps> = ({
  rules,
  entryPoints,
  activeMode,
  onModeChange,
  onCreateRule,
  onDeleteRule,
  onToggleRule,
  aiRecaps,
  onRunAIScan,
  isScanningAI,
}) => {
  // New Rule Form State
  const [ruleTitle, setRuleTitle] = useState<string>("Anomalie de Classement");
  const [betType, setBetType] = useState<string>("1X2");
  const [assignedLeagueId, setAssignedLeagueId] = useState<number | "ALL">(
    "ALL"
  );
  const [thenOutcome, setThenOutcome] = useState<string>("1");

  // Multi-condition rows state
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>([
    {
      id: "cond-1",
      connector: "IF",
      param: "Rank1",
      operator: "<=",
      valueType: "VALUE",
      valueNumber: 5,
    },
    {
      id: "cond-2",
      connector: "AND",
      param: "Odds1",
      operator: "BETWEEN",
      valueType: "VALUE",
      minVal: 1.4,
      maxVal: 1.9,
    },
  ]);

  const [expandedRuleId, setExpandedRuleId] = useState<string | null>("#R1");

  // Construct readable condition string dynamically from rows
  const constructedCondition = useMemo(() => {
    if (conditionRows.length === 0) return `IF True THEN ${thenOutcome}`;

    const parts = conditionRows.map((row) => {
      let str = `${row.connector} ${row.param} ${row.operator}`;
      if (row.operator === "BETWEEN") {
        str += ` ${row.minVal ?? 1.0} AND ${row.maxVal ?? 2.0}`;
      } else if (row.valueType === "PARAM") {
        str += ` ${row.valueParam || "Rank2"}`;
      } else {
        str += ` ${row.valueNumber ?? 1}`;
      }
      return str;
    });

    return `${parts.join(" ")} THEN ${thenOutcome}`;
  }, [conditionRows, thenOutcome]);

  // Presets loader
  const handleLoadPreset = (presetType: string) => {
    if (presetType === "surcote") {
      setRuleTitle("Surcote Favori à Domicile");
      setBetType("1X2");
      setThenOutcome("1");
      setConditionRows([
        { id: "c1", connector: "IF", param: "Rank1", operator: "<=", valueType: "VALUE", valueNumber: 5 },
        { id: "c2", connector: "AND", param: "Odds1", operator: "BETWEEN", valueType: "VALUE", minVal: 1.4, maxVal: 1.9 },
      ]);
    } else if (presetType === "over25") {
      setRuleTitle("Journée à Buts Over 2.5");
      setBetType("Plus/Moins 2.5");
      setThenOutcome("Over 2.5");
      setConditionRows([
        { id: "c1", connector: "IF", param: "RoundNumber", operator: "BETWEEN", valueType: "VALUE", minVal: 5, maxVal: 20 },
        { id: "c2", connector: "AND", param: "RankDiff", operator: "<=", valueType: "VALUE", valueNumber: 5 },
      ]);
    } else if (presetType === "doublechance") {
      setRuleTitle("Sécurité Domicile Indomptable 1X");
      setBetType("Double Chance");
      setThenOutcome("1X");
      setConditionRows([
        { id: "c1", connector: "IF", param: "Rank1", operator: "<=", valueType: "VALUE", valueNumber: 10 },
        { id: "c2", connector: "AND", param: "Rank2", operator: ">", valueType: "VALUE", valueNumber: 6 },
      ]);
    } else if (presetType === "draw") {
      setRuleTitle("Piège du Nul (Cotes Serrées)");
      setBetType("1X2");
      setThenOutcome("X");
      setConditionRows([
        { id: "c1", connector: "IF", param: "OddsDiff", operator: "<", valueType: "VALUE", valueNumber: 0.3 },
        { id: "c2", connector: "AND", param: "RankDiff", operator: "<=", valueType: "VALUE", valueNumber: 3 },
      ]);
    }
  };

  const handleAddConditionRow = () => {
    setConditionRows((prev) => [
      ...prev,
      {
        id: `cond-${Date.now()}`,
        connector: prev.length === 0 ? "IF" : "AND",
        param: "Rank1",
        operator: "<",
        valueType: "VALUE",
        valueNumber: 5,
      },
    ]);
  };

  const handleRemoveConditionRow = (id: string) => {
    setConditionRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      if (filtered.length > 0 && filtered[0].connector !== "IF") {
        filtered[0].connector = "IF";
      }
      return filtered;
    });
  };

  const handleUpdateRow = (id: string, updates: Partial<ConditionRow>) => {
    setConditionRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `#R${rules.length + 1}`;
    const selectedEp = entryPoints.find((ep) => ep.id === assignedLeagueId);
    const leagueName =
      assignedLeagueId === "ALL"
        ? "Toutes les ligues"
        : selectedEp?.name || `Ligue #${assignedLeagueId}`;

    const now = new Date();
    const dateStr = `${now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

    onCreateRule({
      id: newId,
      betType,
      generatedDate: `Généré le ${dateStr}`,
      title: ruleTitle,
      conditionText: constructedCondition,
      assignedLeagueId,
      assignedLeagueName: leagueName,
      mode: "Manuel",
      isActive: true,
    });

    setRuleTitle("Nouvelle Règle Stratégique");
  };

  const totalValidated = rules.reduce(
    (acc, r) => acc + r.stats.validatedCount,
    0
  );
  const totalFailed = rules.reduce((acc, r) => acc + r.stats.failedCount, 0);
  const totalEvaluated = totalValidated + totalFailed;
  const globalSuccessRate =
    totalEvaluated > 0
      ? ((totalValidated / totalEvaluated) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Control Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                ÉDITEUR AVANCÉ DE RÈGLES & ALGOS
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Constructeur visuel de conditions complexes (AND/OR, cotes, rangs, cotes entre tranches, journées) avec évaluation en temps réel.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800/90 shadow-inner shrink-0">
            <button
              onClick={() => onModeChange("Manuel")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === "Manuel"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>
                Constructeur Manuel ({rules.filter((r) => r.mode === "Manuel").length})
              </span>
            </button>

            <button
              onClick={() => onModeChange("IA")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === "IA"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span>Mode IA Scanner</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Règles Actives
            </span>
            <span className="text-xl font-extrabold text-white mt-1 block">
              {rules.filter((r) => r.isActive).length} / {rules.length}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Taux Global de Réussite
            </span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block font-mono">
              {globalSuccessRate}%
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wider block">
              Matchs Validés
            </span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block font-mono">
              {totalValidated}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-rose-400/90 uppercase tracking-wider block">
              Matchs en Erreur
            </span>
            <span className="text-xl font-extrabold text-rose-400 mt-1 block font-mono">
              {totalFailed}
            </span>
          </div>
        </div>
      </div>

      {/* MODE IA SCANNER */}
      {activeMode === "IA" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Cpu
                    className="w-6 h-6 animate-spin"
                    style={{ animationDuration: "6s" }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Analyse IA Globale & Plus Hautes Probabilités
                  </h3>
                  <p className="text-xs text-slate-400">
                    Scanne en temps réel les classements, formes et cotes de toutes les compétitions disponibles.
                  </p>
                </div>
              </div>

              <button
                onClick={onRunAIScan}
                disabled={isScanningAI}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap
                  className={`w-4 h-4 ${isScanningAI ? "animate-bounce" : ""}`}
                />
                <span>
                  {isScanningAI ? "Analyse en cours..." : "Lancer un nouveau Scan IA"}
                </span>
              </button>
            </div>

            {/* Recap Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiRecaps.map((recap, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                        {recap.competitionName}
                      </span>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        Proba: {recap.probability}%
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white">
                      {recap.matchName}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      {recap.rationale}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Pari IA:{" "}
                      <strong className="text-emerald-400 font-black">
                        {recap.prediction}
                      </strong>
                    </span>
                    <button
                      onClick={() => {
                        onCreateRule({
                          id: `#R_AI_${Date.now().toString().slice(-4)}`,
                          betType: recap.prediction,
                          generatedDate: new Date().toLocaleString("fr-FR"),
                          title: `Règle IA: ${recap.matchName}`,
                          conditionText:
                            recap.proposedRuleCondition ||
                            `IF Rank1 <= 5 AND Odds1 < 2.0 THEN ${recap.prediction}`,
                          assignedLeagueId: recap.competitionId || "ALL",
                          assignedLeagueName: recap.competitionName,
                          mode: "IA",
                          aiConfidence: recap.probability,
                          isActive: true,
                        });
                      }}
                      className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Ajouter aux Règles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE MANUEL: ADVANCED MULTI-CONDITION RULE CONSTRUCTOR */}
      {activeMode === "Manuel" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Créer une Règle Algorithmique Multi-Conditions</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 font-extrabold text-emerald-400 max-w-full truncate">
              Expression : {constructedCondition}
            </span>
          </div>

          {/* Quick Presets Bar */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/90 space-y-2">
            <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modèles de Stratégie Prédéfinis (1-Clic) :</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadPreset("surcote")}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-extrabold transition-all cursor-pointer"
              >
                🏆 Surcote Favori Dom (Top 5)
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset("over25")}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-extrabold transition-all cursor-pointer"
              >
                ⚽ Journée à Buts Over 2.5
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset("doublechance")}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-xs font-extrabold transition-all cursor-pointer"
              >
                🛡️ Sécurité Double Chance 1X
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset("draw")}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-extrabold transition-all cursor-pointer"
              >
                🎯 Piège du Nul (Cotes Équilibrées)
              </button>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Rule metadata fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Titre de la Règle
                </label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="Ex: Anomalie Surcote Favori"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Type de Pari
                </label>
                <select
                  value={betType}
                  onChange={(e) => setBetType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="1X2">1X2 (Victoire / Nul)</option>
                  <option value="Double Chance">Double Chance (1X, X2, 12)</option>
                  <option value="Plus/Moins 2.5">Plus/Moins 2.5 Buts</option>
                  <option value="G/NG">Les deux équipes marquent (G/NG)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assignation aux Ligues
                </label>
                <select
                  value={
                    assignedLeagueId === "ALL" ? "ALL" : assignedLeagueId.toString()
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignedLeagueId(val === "ALL" ? "ALL" : parseInt(val, 10));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">🌐 Toutes les ligues (Assigner globalement)</option>
                  {entryPoints.map((ep) => (
                    <option key={ep.id} value={ep.id.toString()}>
                      🏆 Ligue spécifique : {ep.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition Rows List Builder */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
                  Conditions de Déclenchement (IF ... AND ... OR)
                </span>
                <button
                  type="button"
                  onClick={handleAddConditionRow}
                  className="flex items-center gap-1 text-xs font-extrabold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une condition</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {conditionRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                  >
                    {/* Connector */}
                    {idx === 0 ? (
                      <span className="font-mono font-black text-slate-400 px-2 py-1 bg-slate-950 rounded border border-slate-800">
                        IF
                      </span>
                    ) : (
                      <select
                        value={row.connector}
                        onChange={(e) =>
                          handleUpdateRow(row.id, {
                            connector: e.target.value as "AND" | "OR",
                          })
                        }
                        className="font-mono font-black text-indigo-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded cursor-pointer"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    {/* Param */}
                    <select
                      value={row.param}
                      onChange={(e) =>
                        handleUpdateRow(row.id, { param: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg font-mono font-bold text-amber-300 cursor-pointer"
                    >
                      <option value="Rank1">Rank1 (Rang Domicile)</option>
                      <option value="Rank2">Rank2 (Rang Visiteur)</option>
                      <option value="RankDiff">RankDiff (|Rank1 - Rank2|)</option>
                      <option value="Odds1">Odds1 (Cote Domicile)</option>
                      <option value="OddsX">OddsX (Cote Nul)</option>
                      <option value="Odds2">Odds2 (Cote Visiteur)</option>
                      <option value="OddsDiff">OddsDiff (|Odds1 - Odds2|)</option>
                      <option value="RoundNumber">RoundNumber (Journée)</option>
                      <option value="HomePoints">Points Domicile</option>
                      <option value="AwayPoints">Points Visiteur</option>
                    </select>

                    {/* Operator */}
                    <select
                      value={row.operator}
                      onChange={(e) =>
                        handleUpdateRow(row.id, {
                          operator: e.target.value as any,
                        })
                      }
                      className="bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg font-mono font-bold text-emerald-400 cursor-pointer"
                    >
                      <option value="<">&lt; (inférieur à)</option>
                      <option value=">">&gt; (supérieur à)</option>
                      <option value="<=">&lt;= (inférieur ou égal)</option>
                      <option value=">=">&gt;= (supérieur ou égal)</option>
                      <option value="=">= (égal à)</option>
                      <option value="!=">!= (différent de)</option>
                      <option value="BETWEEN">BETWEEN (entre tranches)</option>
                    </select>

                    {/* Value inputs based on operator */}
                    {row.operator === "BETWEEN" ? (
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="number"
                          step="0.05"
                          value={row.minVal ?? 1.4}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              minVal: parseFloat(e.target.value) || 1.0,
                            })
                          }
                          className="w-16 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-cyan-300 font-bold"
                        />
                        <span className="text-slate-500 font-bold">ET</span>
                        <input
                          type="number"
                          step="0.05"
                          value={row.maxVal ?? 2.0}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              maxVal: parseFloat(e.target.value) || 2.0,
                            })
                          }
                          className="w-16 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-cyan-300 font-bold"
                        />
                      </div>
                    ) : (
                      <>
                        <select
                          value={row.valueType}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              valueType: e.target.value as "PARAM" | "VALUE",
                            })
                          }
                          className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-400 cursor-pointer"
                        >
                          <option value="VALUE">Valeur fixe</option>
                          <option value="PARAM">Autre Variable</option>
                        </select>

                        {row.valueType === "PARAM" ? (
                          <select
                            value={row.valueParam || "Rank2"}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                valueParam: e.target.value,
                              })
                            }
                            className="bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg font-mono font-bold text-amber-300 cursor-pointer"
                          >
                            <option value="Rank2">Rank2</option>
                            <option value="Rank1">Rank1</option>
                            <option value="Odds2">Odds2</option>
                            <option value="Odds1">Odds1</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            value={row.valueNumber ?? 5}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                valueNumber: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded font-mono font-bold text-amber-300"
                          />
                        )}
                      </>
                    )}

                    {/* Delete row button */}
                    {conditionRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveConditionRow(row.id)}
                        className="p-1 rounded-lg bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* THEN Outcome Selection */}
              <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                <span className="font-black text-emerald-400 font-mono text-sm">
                  THEN Pronostic :
                </span>
                <select
                  value={thenOutcome}
                  onChange={(e) => setThenOutcome(e.target.value)}
                  className="bg-emerald-500 text-slate-950 font-black px-4 py-2 rounded-xl font-mono text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <option value="1">1 (Victoire Domicile)</option>
                  <option value="X">X (Match Nul)</option>
                  <option value="2">2 (Victoire Visiteur)</option>
                  <option value="1X">1X (Double Chance Domicile)</option>
                  <option value="X2">X2 (Double Chance Visiteur)</option>
                  <option value="12">12 (Victoire d'une des 2)</option>
                  <option value="Over 2.5">Over 2.5 (Plus de 2.5 Buts)</option>
                  <option value="Under 2.5">Under 2.5 (Moins de 2.5 Buts)</option>
                  <option value="G/NG">Les 2 Équipes Marquent</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
            >
              Enregistrer & Activer cette Règle
            </button>
          </form>
        </div>
      )}

      {/* DISPLAY RULES LIST formatted matching user example */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Liste des Règles Définies ({rules.length})</span>
          </div>
          <span className="text-xs text-slate-400">
            Cliquez sur une règle pour déplier les matchs évalués.
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rules.map((rule) => {
            const isExpanded = expandedRuleId === rule.id;
            return (
              <div
                key={rule.id}
                className={`bg-slate-900 border rounded-3xl p-5 shadow-xl transition-all duration-200 relative flex flex-col justify-between ${
                  rule.isActive
                    ? "border-slate-800 hover:border-emerald-500/50"
                    : "border-slate-800/50 opacity-60"
                }`}
              >
                {/* User Card Format Layout */}
                <div className="space-y-3">
                  {/* Row 1: #R1 and BetType */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-amber-400 font-mono tracking-tight">
                        {rule.id}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-800 text-emerald-400 border border-slate-700">
                        {rule.betType}
                      </span>
                      {rule.mode === "IA" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          <span>IA Mode</span>
                        </span>
                      )}
                    </div>

                    {/* League Badge */}
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      {rule.assignedLeagueName}
                    </span>
                  </div>

                  {/* Row 2: Generated Date */}
                  <div className="text-[11px] font-medium text-slate-400 font-mono">
                    {rule.generatedDate}
                  </div>

                  {/* Row 3: Success Rate % (X/Y) */}
                  <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80">
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {rule.stats.successRate.toFixed(1)}% Réussite (
                      {rule.stats.validatedCount}/
                      {rule.stats.validatedCount + rule.stats.failedCount})
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {rule.stats.pendingCount} en attente
                    </span>
                  </div>

                  {/* Row 4: Rule Title */}
                  <h4 className="text-sm font-black text-white">{rule.title}</h4>

                  {/* Row 5: IF Condition Text */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/90 font-mono text-xs font-extrabold text-amber-300 tracking-tight break-all">
                    {rule.conditionText}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setExpandedRuleId(isExpanded ? null : rule.id)
                    }
                    className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {isExpanded
                        ? "Masquer les détails"
                        : `Voir les matchs (${rule.evaluations?.length || 0})`}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                        rule.isActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {rule.isActive ? "Actif" : "Inactif"}
                    </button>

                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                      title="Supprimer la règle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Evaluations Sub-List */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 max-h-60 overflow-y-auto scrollbar-none">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                      Évaluations en Direct ({rule.evaluations?.length || 0}{" "}
                      matchs)
                    </span>

                    {rule.evaluations && rule.evaluations.length > 0 ? (
                      rule.evaluations.map((ev, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div>
                            <div className="font-extrabold text-white">
                              {ev.matchName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {ev.categoryName} • Round {ev.roundNumber}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-amber-400">
                              Pred: {ev.prediction}
                            </span>
                            {ev.status === "VALIDÉ" && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>VALIDÉ</span>
                              </span>
                            )}
                            {ev.status === "ERREUR" && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                <XCircle className="w-3 h-3" />
                                <span>ERREUR</span>
                              </span>
                            )}
                            {ev.status === "EN ATTENTE" && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                <Clock className="w-3 h-3" />
                                <span>EN ATTENTE</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-xs">
                        Aucun match ne correspond aux critères de cette règle actuellement.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
