import React from "react";
import { Key, RefreshCw, Database, Activity, Download, CheckCircle2, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { ApiConnectionState } from "../types";

interface NavbarProps {
  apiState: ApiConnectionState;
  onOpenTokenModal: () => void;
  onToggleInspector: () => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  countdown: number;
  onExportData: () => void;
  totalMatches: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  apiState,
  onOpenTokenModal,
  onToggleInspector,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
  countdown,
  onExportData,
  totalMatches,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 lg:px-8 py-3 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Sporty Live Collector
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Direct API
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Collecte & Affichage en Direct (Bet261 / Sporty-Tech)
              </p>
            </div>
          </div>

          {/* Mobile status badge */}
          <div className="md:hidden">
            <button
              onClick={onOpenTokenModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                apiState.status === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : apiState.status === "loading"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {apiState.status === "error" ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Bearer Token</span>
            </button>
          </div>
        </div>

        {/* Controls and Token Settings */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          {/* API Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                apiState.status === "error"
                  ? "bg-rose-500 animate-pulse"
                  : apiState.status === "loading"
                  ? "bg-amber-400 animate-ping"
                  : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              }`}
            />
            <span className="text-slate-300 font-medium">
              {apiState.status === "error"
                ? "Token Invalide / Expiré (401)"
                : apiState.status === "loading"
                ? "Collecte en cours..."
                : `Connecté (${totalMatches} matchs)`}
            </span>
          </div>

          {/* Bearer Token Button */}
          <button
            onClick={onOpenTokenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Modifier le Jeton d'Autorisation Bearer"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jeton Bearer</span>
            {apiState.status === "error" && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              autoRefresh
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title="Activer/Désactiver le rafraîchissement automatique"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                autoRefresh && apiState.status === "loading" ? "animate-spin text-emerald-400" : ""
              }`}
            />
            <span>Live {autoRefresh ? `(${countdown}s)` : "Off"}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            disabled={apiState.status === "loading"}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
            title="Actualiser les données maintenant"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                apiState.status === "loading" ? "animate-spin text-emerald-400" : ""
              }`}
            />
          </button>

          {/* Raw Data Collector Inspector */}
          <button
            onClick={onToggleInspector}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all active:scale-95"
            title="Inspecter le JSON brut des requêtes API"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Collecteur Raw</span>
          </button>

          {/* Export CSV/JSON */}
          <button
            onClick={onExportData}
            disabled={totalMatches === 0}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
            title="Exporter la liste des matchs (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
