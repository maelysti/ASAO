import React, { useMemo } from "react";
import { ShieldCheck, BarChart3, Filter, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { CombinedMatchData } from "../services/sportyApi";
import { ExtractedMatchRecord, SportyEvent } from "../types";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";

interface RuleStatsRibbonProps {
  matches: (SportyEvent | CombinedMatchData)[];
  database?: ExtractedMatchRecord[];
  activeRuleFilter: string | null;
  onSelectRuleFilter: (ruleId: string | null) => void;
  activeBetFilter: string | null;
  onSelectBetFilter: (bet: string | null) => void;
}

export const RuleStatsRibbon: React.FC<RuleStatsRibbonProps> = ({
  matches = [],
  database = [],
  activeRuleFilter,
  onSelectRuleFilter,
  activeBetFilter,
  onSelectBetFilter,
}) => {
  // Compute aggregated statistics across all matches in current view
  const stats = useMemo(() => {
    if (!matches || matches.length === 0) {
      return {
        total: 0,
        avgConfidence: 0,
        lowRiskPct: 0,
        ruleCounts: {} as Record<string, { count: number; name: string; color: string }>,
        betCounts: {} as Record<string, number>,
      };
    }

    let totalConf = 0;
    let lowRiskCount = 0;

    const ruleCounts: Record<string, { count: number; name: string; color: string }> = {
      "RÉG-01": { count: 0, name: "Dominance Domicile", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
      "RÉG-02": { count: 0, name: "Forteresse H2H", color: "bg-teal-500/15 border-teal-500/30 text-teal-300" },
      "RÉG-03": { count: 0, name: "Suprématie Visiteur", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" },
      "RÉG-04": { count: 0, name: "Machine à Buts", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
      "RÉG-05": { count: 0, name: "Sécurité 1X", color: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" },
      "RÉG-06": { count: 0, name: "Arbitrage & Sécurité", color: "bg-purple-500/15 border-purple-500/30 text-purple-300" },
    };

    const betCounts: Record<string, number> = {
      "1": 0,
      "1X": 0,
      "X2": 0,
      "2": 0,
      "Over 2.5": 0,
    };

    matches.forEach((m) => {
      const h2h = getH2HAnalysisForMatch(m, database);
      const rule = h2h.applicableRule;
      const conf = rule?.confidence || h2h.confidence || 80;
      totalConf += conf;

      if (rule?.riskLevel === "TRÈS FAIBLE" || rule?.riskLevel === "FAIBLE") {
        lowRiskCount++;
      }

      const rId = rule?.ruleId || "RÉG-01";
      if (ruleCounts[rId]) {
        ruleCounts[rId].count++;
      } else {
        ruleCounts[rId] = { count: 1, name: rule?.ruleName || rId, color: "bg-slate-800 text-slate-300" };
      }

      const pred = h2h.prediction || "1X";
      if (betCounts[pred] !== undefined) {
        betCounts[pred]++;
      } else {
        betCounts[pred] = 1;
      }
    });

    const total = matches.length;
    const avgConfidence = Math.round(totalConf / total);
    const lowRiskPct = Math.round((lowRiskCount / total) * 100);

    return {
      total,
      avgConfidence,
      lowRiskPct,
      ruleCounts,
      betCounts,
    };
  }, [matches, database]);

  if (stats.total === 0) return null;

  return (
    <div className="bg-[#0b121e] border-y border-slate-800/90 py-3 px-4 lg:px-8 shadow-lg my-2 transition-all">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* TOP ROW: SUMMARY BADGES */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Left Title */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                <span>RECAPITULATIF DES RÈGLES APPLIQUÉES ({stats.total} MATCHS)</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Synthèse statistique et distribution des algorithmes maillons de décision.
              </p>
            </div>
          </div>

          {/* Key Metrics Pill Badges */}
          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 text-[10px]">CONFIANCE MOY.:</span>
              <span className="font-extrabold text-amber-300">{stats.avgConfidence}%</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-400 text-[10px]">SÉCURITÉ RISQUE FAIBLE:</span>
              <span className="font-extrabold text-emerald-300">{stats.lowRiskPct}%</span>
            </div>

            {(activeRuleFilter || activeBetFilter) && (
              <button
                onClick={() => {
                  onSelectRuleFilter(null);
                  onSelectBetFilter(null);
                }}
                className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span>Réinitialiser filtre</span>
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: INTERACTIVE RULE PILLS & BET TYPE PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-400" />
            Règles:
          </span>

          {(Object.entries(stats.ruleCounts) as [string, { count: number; name: string; color: string }][]).map(([ruleId, info]) => {
            if (info.count === 0) return null;
            const isSelected = activeRuleFilter === ruleId;
            return (
              <button
                key={ruleId}
                onClick={() => onSelectRuleFilter(isSelected ? null : ruleId)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.03]"
                    : `${info.color} hover:border-slate-600`
                }`}
              >
                <span className="font-mono font-extrabold whitespace-nowrap">{ruleId}</span>
                <span className="hidden sm:inline text-[11px] font-normal opacity-90 whitespace-nowrap">{info.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono whitespace-nowrap ${isSelected ? "bg-slate-950/20 text-slate-950" : "bg-slate-900 border border-slate-700/60"}`}>
                  {info.count}
                </span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-slate-800 shrink-0 mx-1" />

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Pronostics:
          </span>

          {Object.entries(stats.betCounts).map(([bet, count]) => {
            if (count === 0) return null;
            const isSelected = activeBetFilter === bet;
            return (
              <button
                key={bet}
                onClick={() => onSelectBetFilter(isSelected ? null : bet)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-black transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-[1.03]"
                    : "bg-slate-900 hover:bg-slate-850 text-amber-300 border-slate-800 hover:border-amber-500/40"
                }`}
              >
                <span>{bet}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
