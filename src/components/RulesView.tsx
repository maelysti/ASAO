import React, { useState } from "react";
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
  const [betType, setBetType] = useState<string>("1X2");
  const [ruleTitle, setRuleTitle] = useState<string>("Anomalie de Classement");
  const [assignedLeagueId, setAssignedLeagueId] = useState<number | "ALL">("ALL");
  const [param1, setParam1] = useState<string>("Rank1");
  const [operator1, setOperator1] = useState<string>("<");
  const [param2, setParam2] = useState<string>("Rank2");
  const [hasSecondCond, setHasSecondCond] = useState<boolean>(true);
  const [logicalOp, setLogicalOp] = useState<string>("AND");
  const [param3, setParam3] = useState<string>("Odds1");
  const [operator2, setOperator2] = useState<string>(">");
  const [param4, setParam4] = useState<string>("Odds2");
  const [thenOutcome, setThenOutcome] = useState<string>("2");

  const [expandedRuleId, setExpandedRuleId] = useState<string | null>("#R1");

  // Construct condition string from form state
  const constructedCondition = React.useMemo(() => {
    let cond = `IF${param1} ${operator1} ${param2}`;
    if (hasSecondCond) {
      cond += ` ${logicalOp} ${param3} ${operator2} ${param4}`;
    }
    cond += `THEN${thenOutcome}`;
    return cond;
  }, [param1, operator1, param2, hasSecondCond, logicalOp, param3, operator2, param4, thenOutcome]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `#R${rules.length + 1}`;
    const selectedEp = entryPoints.find((ep) => ep.id === assignedLeagueId);
    const leagueName = assignedLeagueId === "ALL" ? "Toutes les ligues" : selectedEp?.name || `Ligue #${assignedLeagueId}`;

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

    // Reset Title
    setRuleTitle("Nouvelle Règle Stratégique");
  };

  const totalValidated = rules.reduce((acc, r) => acc + r.stats.validatedCount, 0);
  const totalFailed = rules.reduce((acc, r) => acc + r.stats.failedCount, 0);
  const totalEvaluated = totalValidated + totalFailed;
  const globalSuccessRate = totalEvaluated > 0 ? ((totalValidated / totalEvaluated) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Control Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Gestionnaire de Règles & Intelligence Artificielle (IA)
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Définissez des critères algorithmiques ou utilisez le mode IA pour scanner l'intégralité des compétitions.
              Les règles sont directement évaluées sur chaque match terminé (
              <span className="text-emerald-400 font-bold">VALIDÉ</span> /{" "}
              <span className="text-rose-400 font-bold">ERREUR</span>).
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
              <span>Option Manuel ({rules.filter((r) => r.mode === "Manuel").length})</span>
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

      {/* MODE IA: RECAP DE PLUS HAUTE PROBABILITE */}
      {activeMode === "IA" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-6 h-6 animate-spin" style={{ animationDuration: "6s" }} />
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Zap className={`w-4 h-4 ${isScanningAI ? "animate-bounce" : ""}`} />
                <span>{isScanningAI ? "Analyse en cours..." : "Lancer un nouveau Scan IA"}</span>
              </button>
            </div>

            {/* Recap Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiRecaps.map((recap, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3"
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

                    <h4 className="font-extrabold text-sm text-white">{recap.matchName}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      {recap.rationale}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs font-mono font-bold text-slate-300">
                      Prédiction: <span className="text-emerald-400 font-extrabold text-sm">{recap.prediction}</span>
                    </div>

                    <button
                      onClick={() => {
                        const newId = `#R${rules.length + 1}`;
                        onCreateRule({
                          id: newId,
                          betType: "1X2",
                          generatedDate: `Généré le ${new Date().toLocaleDateString("fr-FR")} (IA)`,
                          title: `Règle IA: ${recap.matchName}`,
                          conditionText: recap.proposedRuleCondition || "IFRank1 < Rank2 AND Odds1 > Odds2THEN2",
                          assignedLeagueId: recap.competitionId,
                          assignedLeagueName: recap.competitionName,
                          mode: "IA",
                          aiConfidence: recap.probability,
                          isActive: true,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-extrabold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Activer cette Règle IA</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE MANUEL: CRÉATION ET CRITÈRES */}
      {activeMode === "Manuel" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Créer une Nouvelle Règle Personnalisée</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              Aperçu: {constructedCondition}
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rule Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Titre de la Règle
                </label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="Ex: Anomalie de Classement"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Bet Type */}
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

              {/* Assign League */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assignation aux Ligues
                </label>
                <select
                  value={assignedLeagueId === "ALL" ? "ALL" : assignedLeagueId.toString()}
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

            {/* Condition Constructor Controls */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
                Condition Algorithmique (Expression IF ... THEN)
              </span>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-black text-slate-400 font-mono">IF</span>

                {/* Param 1 */}
                <select
                  value={param1}
                  onChange={(e) => setParam1(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg font-mono font-bold text-amber-300"
                >
                  <option value="Rank1">Rank1 (Classement Domicile)</option>
                  <option value="Rank2">Rank2 (Classement Visiteur)</option>
                  <option value="Odds1">Odds1 (Cote Domicile)</option>
                  <option value="Odds2">Odds2 (Cote Visiteur)</option>
                </select>

                {/* Operator 1 */}
                <select
                  value={operator1}
                  onChange={(e) => setOperator1(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg font-mono font-bold text-emerald-400"
                >
                  <option value="<">&lt; (inférieur à)</option>
                  <option value=">">&gt; (supérieur à)</option>
                  <option value="<=">&lt;= (inférieur ou égal)</option>
                  <option value=">=">&gt;= (supérieur ou égal)</option>
                  <option value="=">= (égal à)</option>
                </select>

                {/* Param 2 */}
                <select
                  value={param2}
                  onChange={(e) => setParam2(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg font-mono font-bold text-amber-300"
                >
                  <option value="Rank2">Rank2 (Classement Visiteur)</option>
                  <option value="Rank1">Rank1 (Classement Domicile)</option>
                  <option value="Odds2">Odds2 (Cote Visiteur)</option>
                  <option value="Odds1">Odds1 (Cote Domicile)</option>
                  <option value="5">5 (Top 5)</option>
                  <option value="3">3 (Top 3)</option>
                  <option value="1.80">1.80 (Cote 1.80)</option>
                </select>

                {/* Second condition toggle */}
                <span className="font-black text-indigo-400 font-mono ml-2">AND</span>

                <select
                  value={param3}
                  onChange={(e) => setParam3(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg font-mono font-bold text-cyan-300"
                >
                  <option value="Odds1">Odds1 (Cote Domicile)</option>
                  <option value="Odds2">Odds2 (Cote Visiteur)</option>
                  <option value="Rank1">Rank1</option>
                  <option value="Rank2">Rank2</option>
                </select>

                <select
                  value={operator2}
                  onChange={(e) => setOperator2(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg font-mono font-bold text-emerald-400"
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                  <option value=">=">&gt;=</option>
                </select>

                <select
                  value={param4}
                  onChange={(e) => setParam4(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg font-mono font-bold text-cyan-300"
                >
                  <option value="Odds2">Odds2 (Cote Visiteur)</option>
                  <option value="Odds1">Odds1 (Cote Domicile)</option>
                  <option value="2.10">2.10</option>
                  <option value="1.50">1.50</option>
                </select>

                {/* THEN outcome */}
                <span className="font-black text-emerald-400 font-mono ml-2">THEN</span>

                <select
                  value={thenOutcome}
                  onChange={(e) => setThenOutcome(e.target.value)}
                  className="bg-emerald-500 text-slate-950 font-black px-3 py-1.5 rounded-lg font-mono"
                >
                  <option value="1">1 (Victoire Domicile)</option>
                  <option value="X">X (Match Nul)</option>
                  <option value="2">2 (Victoire Visiteur)</option>
                  <option value="1X">1X (Double Chance Domicile)</option>
                  <option value="X2">X2 (Double Chance Visiteur)</option>
                  <option value="Over2.5">Plus de 2.5 Buts</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
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
                      {rule.stats.successRate.toFixed(1)}% Réussite ({rule.stats.validatedCount}/
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
                    onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
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
                      Évaluations en Direct ({rule.evaluations?.length || 0} matchs)
                    </span>

                    {rule.evaluations && rule.evaluations.length > 0 ? (
                      rule.evaluations.map((ev, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div>
                            <div className="font-extrabold text-white">{ev.matchName}</div>
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
