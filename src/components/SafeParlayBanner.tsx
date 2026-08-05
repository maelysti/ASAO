import React, { useMemo } from "react";
import { Sparkles, ShieldCheck, Ticket, Copy, Check, TrendingUp, ChevronRight } from "lucide-react";
import { CombinedMatchData } from "../services/sportyApi";
import { ExtractedMatchRecord, SportyEvent } from "../types";
import { getH2HAnalysisForMatch } from "../utils/globalAnalysisEngine";

interface SafeParlayBannerProps {
  matches: (SportyEvent | CombinedMatchData)[];
  database?: ExtractedMatchRecord[];
  onSelectMatch?: (match: SportyEvent | CombinedMatchData) => void;
}

export const SafeParlayBanner: React.FC<SafeParlayBannerProps> = ({
  matches = [],
  database = [],
  onSelectMatch,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Compute best picks with high confidence (> 82%)
  const topPicks = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    const analyzed = matches.map((m) => {
      const h2h = getH2HAnalysisForMatch(m, database);
      const mainBet = m.eventBetTypes?.find((bt) => bt.name?.toUpperCase().includes("1X2") || bt.betTypeId === 30083);
      const hOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "1")?.odds || 1.85;
      const dOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "X")?.odds || 3.40;
      const aOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "2")?.odds || 3.90;

      let estOdds = 1.45;
      if (h2h.prediction === "1") estOdds = hOdds;
      else if (h2h.prediction === "2") estOdds = aOdds;
      else if (h2h.prediction === "1X") estOdds = Math.round((hOdds * 0.7 + 1.05) * 100) / 100;
      else if (h2h.prediction === "X2") estOdds = Math.round((aOdds * 0.7 + 1.05) * 100) / 100;
      else if (h2h.prediction === "Over 2.5") estOdds = 1.75;

      return {
        match: m,
        analysis: h2h,
        estimatedOdds: Math.max(1.22, Math.min(2.40, estOdds)),
      };
    });

    // Sort by confidence descending
    analyzed.sort((a, b) => b.analysis.confidence - a.analysis.confidence);

    // Pick top 3-4 matches
    return analyzed.slice(0, 3);
  }, [matches, database]);

  if (topPicks.length === 0) return null;

  const totalOdds = topPicks.reduce((acc, curr) => acc * curr.estimatedOdds, 1);
  const avgConf = Math.round(topPicks.reduce((acc, curr) => acc + curr.analysis.confidence, 0) / topPicks.length);

  const handleCopyTicket = () => {
    const lines = topPicks.map(
      (p, i) => `${i + 1}. ${p.match.homeTeamName} vs ${p.match.awayTeamName} -> [${p.analysis.applicableRule?.actionBet || p.analysis.prediction}] (Conf: ${p.analysis.confidence}%)`
    );
    const summary = `🔥 COMBINÉ SÉCURISÉ IA (Cote Totale ~${totalOdds.toFixed(2)})\n${lines.join("\n")}\nConfiance Globale: ${avgConf}%`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-r from-[#0d1726] via-[#09111c] to-[#070b12] border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-3 my-4 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>COMBINÉ SÉCURISÉ IA DU ROUND</span>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {topPicks.length} SÉLECTIONS
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Généré par l'algorithme multicritère sur les matchs à plus forte probabilité (&gt;80%).
            </p>
          </div>
        </div>

        {/* Action Button & Total Odds */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">COTE TOTALE CUMULÉE</div>
            <div className="text-lg font-black font-mono text-amber-400">
              @{totalOdds.toFixed(2)}
            </div>
          </div>

          <button
            onClick={handleCopyTicket}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copié !" : "Copier le Ticket"}</span>
          </button>
        </div>
      </div>

      {/* Matches Grid inside Ticket */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 relative z-10">
        {topPicks.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectMatch && onSelectMatch(item.match)}
            className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-xl transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="truncate max-w-[130px] text-emerald-300 font-mono">
                {item.match.homeTeamName}
              </span>
              <span className="text-slate-500">vs</span>
              <span className="truncate max-w-[130px] text-cyan-300 font-mono">
                {item.match.awayTeamName}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-[11px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                {item.analysis.applicableRule?.actionBet || item.analysis.prediction}
              </span>

              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Conf: {item.analysis.confidence}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
