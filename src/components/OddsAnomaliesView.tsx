import React, { useState, useMemo } from "react";
import { ExtractedMatchRecord, RuleItem } from "../types";
import { CombinedMatchData } from "../services/sportyApi";
import { AlertTriangle, TrendingUp, Zap, Plus, ShieldCheck, Sparkles, Filter, CheckCircle2, Search } from "lucide-react";

interface OddsAnomaliesViewProps {
  database: ExtractedMatchRecord[];
  activeMatches: { match: CombinedMatchData; categoryName: string }[];
  onCreateRuleFromDb: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
  selectedSeason: string | number;
}

export interface OddsAnomalyItem {
  id: string | number;
  matchName: string;
  categoryName: string;
  seasonNumber?: number | string;
  roundNumber?: number | string;
  homeTeam: string;
  awayTeam: string;
  bookmakerOdds: number;
  impliedProb: number; // e.g. 1/odds = 50%
  historicalProb: number; // e.g. 78% based on BDD
  edgePct: number; // historicalProb - impliedProb
  anomalyType: "VALUE_BET" | "TRAP_ODDS" | "FAIR_ODDS";
  recommendedBet: "1" | "1X" | "Over 2.5" | "2" | "X2";
  confidence: number;
  explanation: string;
  homeRank: number;
  awayRank: number;
}

export const OddsAnomaliesView: React.FC<OddsAnomaliesViewProps> = ({
  database,
  activeMatches,
  onCreateRuleFromDb,
  selectedSeason,
}) => {
  const [filterType, setFilterType] = useState<"ALL" | "VALUE_BET" | "TRAP_ODDS">("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [minEdge, setMinEdge] = useState<number>(5);

  // Filter BDD by season
  const filteredDb = useMemo(() => {
    if (selectedSeason === "ALL") return database;
    return database.filter((m) => String(m.seasonNumber || 1) === String(selectedSeason));
  }, [database, selectedSeason]);

  // Compute anomalies for current active matches comparing against filtered BDD
  const anomaliesList = useMemo(() => {
    const list: OddsAnomalyItem[] = [];

    activeMatches.forEach(({ match, categoryName }) => {
      const mainBet = match.eventBetTypes?.find(
        (bt) => bt.name?.toUpperCase().includes("1X2") || bt.betTypeId === 30083
      );

      const hOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "1")?.odds || 1.85;
      const hRank = match.homeStats?.position || 4;
      const aRank = match.awayStats?.position || 10;
      const rankDiff = aRank - hRank; // positive = Home better rank

      // Bookmaker implied probability (approx with 12% margin)
      const bookmakerImplied = Math.round((1 / hOdds) * 0.88 * 100);

      // Historical win rate from BDD for similar rank difference and odds range
      const similarInDb = filteredDb.filter((m) => {
        const mHOdds = m.homeOdds || 1.85;
        const mRankDiff = (m.awayRank || 10) - (m.homeRank || 4);
        return Math.abs(mHOdds - hOdds) <= 0.35 && Math.abs(mRankDiff - rankDiff) <= 3;
      });

      let historicalProb = 0;
      if (similarInDb.length >= 3) {
        let wins = 0;
        similarInDb.forEach((m) => {
          let hS = 0;
          let aS = 0;
          if (m.score && m.score.includes(":")) {
            const p = m.score.split(":");
            hS = parseInt(p[0], 10) || 0;
            aS = parseInt(p[1], 10) || 0;
          }
          if (hS > aS) wins++;
        });
        historicalProb = Math.round((wins / similarInDb.length) * 100);
      } else {
        // Statistical profile calculation if sample is small
        historicalProb = Math.min(92, Math.max(35, Math.round(52 + rankDiff * 4 + (2.0 - hOdds) * 20)));
      }

      const edge = historicalProb - bookmakerImplied;

      let anomalyType: "VALUE_BET" | "TRAP_ODDS" | "FAIR_ODDS" = "FAIR_ODDS";
      let recommendedBet: "1" | "1X" | "Over 2.5" | "2" | "X2" = "1";
      let explanation = "";

      if (edge >= minEdge) {
        anomalyType = "VALUE_BET";
        recommendedBet = hOdds < 1.65 ? "1" : "1X";
        explanation = `Value Bet détecté ! Le bookmaker offre une cote de ${hOdds.toFixed(2)} (probabilité implicite ${bookmakerImplied}%), mais la base de données enregistre ${historicalProb}% de réussite historique pour ce profil. Écart de +${edge}% en votre faveur.`;
      } else if (edge <= -10 && hOdds <= 1.55) {
        anomalyType = "TRAP_ODDS";
        recommendedBet = "X2";
        explanation = `Attention Piège ! La cote Domicile est artificiellement basse (${hOdds.toFixed(2)}), mais la base de données ne valide ce favori qu'à ${historicalProb}% dans la Saison ${match.seasonNumber || 1}. Sécurité recommandée sur X2.`;
      }

      if (anomalyType !== "FAIR_ODDS" || edge >= 3) {
        list.push({
          id: match.id,
          matchName: `${match.homeTeamName} vs ${match.awayTeamName}`,
          categoryName,
          seasonNumber: match.seasonNumber || 1,
          roundNumber: match.roundNumber || 1,
          homeTeam: match.homeTeamName,
          awayTeam: match.awayTeamName,
          bookmakerOdds: hOdds,
          impliedProb: bookmakerImplied,
          historicalProb,
          edgePct: edge,
          anomalyType,
          recommendedBet,
          confidence: Math.min(95, Math.max(65, 75 + Math.abs(edge))),
          explanation,
          homeRank: hRank,
          awayRank: aRank,
        });
      }
    });

    return list.sort((a, b) => Math.abs(b.edgePct) - Math.abs(a.edgePct));
  }, [activeMatches, filteredDb, minEdge]);

  // Filtered by search & filter type
  const displayedAnomalies = useMemo(() => {
    return anomaliesList.filter((a) => {
      if (filterType !== "ALL" && a.anomalyType !== filterType) return false;
      if (searchTerm.trim().length > 0) {
        const q = searchTerm.toLowerCase();
        return (
          a.matchName.toLowerCase().includes(q) ||
          a.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [anomaliesList, filterType, searchTerm]);

  const valueCount = anomaliesList.filter((a) => a.anomalyType === "VALUE_BET").length;
  const trapCount = anomaliesList.filter((a) => a.anomalyType === "TRAP_ODDS").length;

  const handleCreateRuleFromAnomaly = (item: OddsAnomalyItem) => {
    onCreateRuleFromDb({
      id: `#R_VAL_${Date.now().toString().slice(-4)}`,
      title: `Règle Value Bet: ${item.matchName}`,
      betType: "1X2",
      generatedDate: new Date().toLocaleString("fr-FR"),
      conditionText: `IF Odds1 <= ${item.bookmakerOdds.toFixed(2)} AND HistoricalWin >= ${item.historicalProb}% THEN ${item.recommendedBet}`,
      assignedLeagueId: "ALL",
      assignedLeagueName: item.categoryName,
      mode: "IA",
      aiConfidence: item.confidence,
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Détecteur d'Anomalies de Cotes (Market Value & Pièges Bookmaker)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Compare en temps réel la cote offerte par le bookmaker avec la probabilité statistique réelle enregistrée dans la BDD pour la {selectedSeason === "ALL" ? "totalité des saisons" : `Saison ${selectedSeason}`}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2 text-center">
              <span className="text-[10px] text-slate-400 font-extrabold block">VALUE BETS</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{valueCount}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2 text-center">
              <span className="text-[10px] text-slate-400 font-extrabold block">PIÈGES DETECTÉS</span>
              <span className="text-lg font-black text-rose-400 font-mono">{trapCount}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "ALL"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Tous ({anomaliesList.length})
            </button>
            <button
              onClick={() => setFilterType("VALUE_BET")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "VALUE_BET"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              Value Bets (+{valueCount})
            </button>
            <button
              onClick={() => setFilterType("TRAP_ODDS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === "TRAP_ODDS"
                  ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20"
                  : "bg-slate-950 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              Pièges Bookmaker ({trapCount})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher une équipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 font-bold">Seuil Edge Min:</span>
              <input
                type="number"
                min="1"
                max="30"
                value={minEdge}
                onChange={(e) => setMinEdge(Number(e.target.value))}
                className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-emerald-400 font-mono font-bold focus:outline-none"
              />
              <span className="text-emerald-400 font-bold">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards List */}
      {displayedAnomalies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-base font-extrabold text-white">Aucune anomalie majeure détectée</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Les cotes actuelles proposées par le bookmaker correspondent aux probabilités historiques de la base de données. Essayez de réduire le seuil d'Edge minimum.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedAnomalies.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border ${
                item.anomalyType === "VALUE_BET"
                  ? "border-emerald-500/50 hover:border-emerald-400"
                  : "border-rose-500/50 hover:border-rose-400"
              } rounded-2xl p-5 shadow-xl transition-all space-y-4 relative overflow-hidden`}
            >
              {/* Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-bold">
                      {item.categoryName} • Saison {item.seasonNumber} (J{item.roundNumber})
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        item.anomalyType === "VALUE_BET"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {item.anomalyType === "VALUE_BET" ? "🔥 VALUE BET" : "⚠️ PIÈGE BOOKMAKER"}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-base text-white">{item.matchName}</h4>
                  <span className="text-xs text-slate-400">
                    Rangs: #{item.homeRank} vs #{item.awayRank}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-2xl font-black font-mono ${
                      item.edgePct > 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.edgePct > 0 ? `+${item.edgePct}%` : `${item.edgePct}%`}
                  </span>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Ecart / Edge</span>
                </div>
              </div>

              {/* Comparison Stats Box */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 block">Cote Bookmaker</span>
                  <span className="font-black text-amber-400 font-mono text-base">
                    {item.bookmakerOdds.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (Implique {item.impliedProb}%)
                  </span>
                </div>
                <div className="text-center border-l border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Probabilité Réelle BDD</span>
                  <span className="font-black text-emerald-400 font-mono text-base">
                    {item.historicalProb}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">(Historique Réel)</span>
                </div>
              </div>

              {/* Explanation */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {item.explanation}
              </p>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Pronostic Recommandé :</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-black text-xs">
                    {item.recommendedBet}
                  </span>
                </div>

                <button
                  onClick={() => handleCreateRuleFromAnomaly(item)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Créer la Règle</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
