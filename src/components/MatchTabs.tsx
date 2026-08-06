import React from "react";
import { ChevronLeft, ChevronRight, Hash, Search, Clock, Zap, BellOff, Bell } from "lucide-react";
import { MatchTimeFilter } from "../types";

interface MatchTabsProps {
  currentRoundNumber: number | string;
  roundStartTime?: string;
  roundIndex: number;
  totalRounds: number;
  availableRoundsList: Array<{ roundNumber: number | string; expectedStart?: string }>;
  onSelectRoundIndex: (index: number) => void;
  onPrevRound: () => void;
  onNextRound: () => void;
  currentTab: MatchTimeFilter;
  onTabChange: (tab: MatchTimeFilter) => void;
  counts: {
    all: number;
    live: number;
    upcoming: number;
    finished: number;
  };
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onGoToClosestMatch?: () => void;
  categoryName?: string;
  silentUpdates?: boolean;
  onToggleSilentUpdates?: () => void;
}

export const MatchTabs: React.FC<MatchTabsProps> = ({
  currentRoundNumber,
  roundStartTime,
  roundIndex,
  totalRounds,
  availableRoundsList,
  onSelectRoundIndex,
  onPrevRound,
  onNextRound,
  currentTab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
  onGoToClosestMatch,
  categoryName: _categoryName,
  silentUpdates = true,
  onToggleSilentUpdates,
}) => {
  const formatTimeOnly = (isoString?: string) => {
    if (!isoString || isoString === "0001-01-01T00:00:00Z") return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formattedStartTime = roundStartTime ? formatTimeOnly(roundStartTime) : "";

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Round Page Controls & Redirection Button */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/90 border border-slate-800 p-1.5 rounded-2xl w-full lg:w-auto justify-between lg:justify-start shadow-md">
            {/* Redirection Button: Journée la plus proche */}
            {onGoToClosestMatch && (
              <button
                onClick={onGoToClosestMatch}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/50 shrink-0"
                title="Accéder directement à la journée de matchs la plus proche"
              >
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950 animate-bounce" />
                <span className="uppercase tracking-wider">Journée la plus proche</span>
              </button>
            )}

            {/* Silent Updates Toggle Button (Cloche) */}
            {onToggleSilentUpdates && (
              <button
                onClick={onToggleSilentUpdates}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  silentUpdates
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60"
                    : "bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900/60"
                }`}
                title={
                  silentUpdates
                    ? "Mode Silencieux ACTIVÉ : Les mises à jour de données se font sans changer votre journée."
                    : "Auto-Redirection ACTIVÉE : Le site bascule automatiquement vers la journée en direct à H+1m15s."
                }
              >
                {silentUpdates ? (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">Maj Silencieuse : <strong className="text-emerald-300">ON</strong></span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Redirection Direct : <strong className="text-amber-300">ON</strong></span>
                  </>
                )}
              </button>
            )}

            {/* Button: Précédent */}
            <button
              onClick={onPrevRound}
              disabled={totalRounds === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-emerald-500/50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Journée précédente"
            >
              <ChevronLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            {/* Center Display: Round Page Title */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                <span className="flex items-center gap-1 text-xs font-black text-amber-400 uppercase tracking-wider">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Round {currentRoundNumber || "-"}</span>
                </span>
                {formattedStartTime && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>{formattedStartTime}</span>
                  </span>
                )}
              </div>

              {/* Quick Round Select Dropdown */}
              {availableRoundsList.length > 0 && (
                <select
                  value={roundIndex}
                  onChange={(e) => onSelectRoundIndex(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/80 cursor-pointer"
                >
                  {availableRoundsList.map((r, idx) => {
                    const t = r.expectedStart ? formatTimeOnly(r.expectedStart) : "";
                    return (
                      <option key={idx} value={idx}>
                        Round {r.roundNumber} {t ? `(${t})` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Button: Suivant (Next) */}
            <button
              onClick={onNextRound}
              disabled={totalRounds === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Journée suivante"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Status Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => onTabChange("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "all"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tous ({counts.all})
              </button>
              <button
                onClick={() => onTabChange("live")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "live"
                    ? "bg-rose-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                En Direct ({counts.live})
              </button>
              <button
                onClick={() => onTabChange("upcoming")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "upcoming"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                À Venir ({counts.upcoming})
              </button>
              <button
                onClick={() => onTabChange("finished")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "finished"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Terminés ({counts.finished})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher une équipe..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950/90 border border-slate-800 focus:border-emerald-500/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


