import React, { useState, useMemo } from "react";
import { ShieldCheck, Target, CheckCircle2, XCircle, Clock, Info, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Database, Sparkles, BarChart2, Flame } from "lucide-react";
import { SportyEvent, ExtractedMatchRecord, RuleItem } from "../types";
import { CombinedMatchData } from "../services/sportyApi";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";
import { evaluateRuleOnMatch, DEFAULT_RULES } from "../utils/ruleEngine";

interface MatchRuleAnalysisBlockProps {
  event: SportyEvent | CombinedMatchData;
  database?: ExtractedMatchRecord[];
  activeRules?: RuleItem[];
  compact?: boolean;
}

export const MatchRuleAnalysisBlock: React.FC<MatchRuleAnalysisBlockProps> = ({
  event,
  database = [],
  activeRules,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState<boolean>(!compact);
  const h2h = getH2HAnalysisForMatch(event, database);
  const rule = h2h.applicableRule;
  const probs = h2h.detailedProbabilities;

  const conf = rule?.confidence || h2h.confidence || 85;
  const risk = rule?.riskLevel || "FAIBLE";

  // Resolve rules list from props or localStorage/DEFAULT_RULES
  const effectiveRules = useMemo(() => {
    if (activeRules && activeRules.length > 0) return activeRules;
    try {
      const saved = localStorage.getItem("bullet_sporty_rules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_RULES;
  }, [activeRules]);

  // Evaluate all active rules on this match
  const triggeredRules = useMemo(() => {
    return effectiveRules
      .filter((r) => r.isActive !== false)
      .map((r) => {
        const catName = (event as any).categoryName || "Ligue";
        const evaluation = evaluateRuleOnMatch(r, event as any, catName);
        return {
          rule: r,
          evaluation,
        };
      })
      .filter((item): item is { rule: RuleItem; evaluation: NonNullable<ReturnType<typeof evaluateRuleOnMatch>> } => item.evaluation !== null && item.evaluation.isTriggered);
  }, [effectiveRules, event]);

  const getRiskColor = (r: string) => {
    switch (r) {
      case "TRÈS FAIBLE":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "FAIBLE":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "MODÉRÉ":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    }
  };

  return (
    <div className="bg-[#0b1019] border border-slate-800/90 rounded-xl p-3 space-y-2.5 shadow-md my-1.5 transition-all">
      {/* HEADER: RÈGLE & INDICE DE CONFIANCE */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[220px] sm:max-w-none">
              {rule?.ruleId || "RÉG-01"}: {rule?.ruleName || "Règle Maîtresse"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Risk Level Badge */}
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border whitespace-nowrap ${getRiskColor(risk)}`}>
            {risk} RISQUE
          </span>

          {/* Confidence Badge */}
          <span className="flex items-center gap-1 text-[11px] font-mono font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400/20 shrink-0" />
            <span>{conf}% CONFIANCE</span>
          </span>
        </div>
      </div>

      {/* PRONOSTIC À APPLIQUER (ACTIONABLE BET) */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-2.5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              PRONOSTIC À APPLIQUER (RÈGLE EXACTE)
            </div>
            <div className="text-sm font-black text-white font-mono flex items-center gap-2 flex-wrap">
              <span className="text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 whitespace-nowrap">
                {rule?.actionBet || h2h.prediction}
              </span>
              <span className="text-[11px] font-normal text-slate-300 truncate hidden md:inline max-w-[280px]">
                ({rule?.conditionSummary || "Analyse multicritère"})
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-all shrink-0 cursor-pointer whitespace-nowrap"
        >
          <span>{expanded ? "Masquer" : "Détails Stats"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* TRIGGERED ACTIVE RULES & RECAP STATUS (BULLET / CUSTOM RULES) */}
      {triggeredRules.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="text-[11px] font-extrabold uppercase text-amber-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>Règles Appliquées à ce Match ({triggeredRules.length})</span>
          </div>

          <div className="space-y-1.5">
            {triggeredRules.map(({ rule: r, evaluation: ev }, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/40">
                      {r.id}
                    </span>
                    <span className="font-extrabold text-white truncate">{r.title}</span>
                    <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                      Prono: {ev.predictedOutcome}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    {r.conditionText}
                  </div>
                </div>

                <div className="shrink-0">
                  {ev.status === "VALIDÉ" ? (
                    <span className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px] flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      GAGNANT ({ev.actualScore})
                    </span>
                  ) : ev.status === "ERREUR" ? (
                    <span className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black text-[10px] flex items-center gap-1 shadow-sm">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      PERDANT ({ev.actualScore})
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[10px] flex items-center gap-1 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      EN ATTENTE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPANDABLE SECTION: HIGH PRECISION PROBABILITIES & DATABASE EVIDENCE */}
      {expanded && (
        <div className="space-y-3 pt-1 border-t border-slate-800/80 animate-fadeIn">
          {/* High Precision Probability Distribution */}
          {probs && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <span className="flex items-center gap-1">
                  <BarChart2 className="w-3 h-3 text-emerald-400" />
                  <span>PROBABILITÉS CALCULÉES (DISTRIBUTION 1X2)</span>
                </span>
                <span className="font-mono text-slate-400">100% TOTAL</span>
              </div>

              {/* Visual 3-Segment Bar */}
              <div className="h-3.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
                <div
                  style={{ width: `${probs.homeWinPct}%` }}
                  className="bg-emerald-500 h-full rounded-l-full transition-all"
                  title={`Domicile: ${probs.homeWinPct}%`}
                />
                <div
                  style={{ width: `${probs.drawPct}%` }}
                  className="bg-slate-400 h-full transition-all"
                  title={`Nul: ${probs.drawPct}%`}
                />
                <div
                  style={{ width: `${probs.awayWinPct}%` }}
                  className="bg-cyan-500 h-full rounded-r-full transition-all"
                  title={`Visiteur: ${probs.awayWinPct}%`}
                />
              </div>

              {/* Labels & Goals Probabilities */}
              <div className="grid grid-cols-3 text-center text-[11px] font-mono font-bold pt-0.5">
                <div className="text-emerald-400">
                  Dom: {probs.homeWinPct}%
                </div>
                <div className="text-slate-300">
                  Nul: {probs.drawPct}%
                </div>
                <div className="text-cyan-400">
                  Ext: {probs.awayWinPct}%
                </div>
              </div>

              {/* Goal Markets Chips */}
              <div className="flex items-center gap-1.5 justify-between pt-1 text-[10px] font-mono flex-wrap">
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-300">
                  Over 1.5: <strong>{probs.over15Pct}%</strong>
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-400">
                  Over 2.5: <strong>{probs.over25Pct}%</strong>
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-indigo-300">
                  Les 2 Marquent: <strong>{probs.bttsPct}%</strong>
                </span>
              </div>
            </div>
          )}

          {/* WHY THIS RULE? (RATIONALE & EVIDENCE) */}
          <div className="bg-[#080d14] border border-slate-800/90 rounded-lg p-2.5 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>JUSTIFICATION DES DONNÉES HISTORIQUES</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 font-normal">
              {rule?.whyText || h2h.rationale}
            </p>

            {/* Database Evidence List */}
            {h2h.databaseEvidence && h2h.databaseEvidence.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800/60 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Database className="w-3 h-3 text-cyan-400" />
                  <span>PREUVES EXTRAITES DE LA DATABASE ({h2h.source})</span>
                </div>
                <ul className="space-y-1 text-[10px] text-slate-300">
                  {h2h.databaseEvidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
