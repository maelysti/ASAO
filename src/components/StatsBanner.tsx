import React from "react";
import { Activity, Trophy, Clock, CheckCircle2 } from "lucide-react";

interface StatsBannerProps {
  totalMatches: number;
  liveMatches: number;
  upcomingMatches: number;
  finishedMatches: number;
  competitionsCount: number;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  totalMatches,
  liveMatches,
  upcomingMatches,
  finishedMatches,
  competitionsCount,
}) => {
  return (
    <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Competitions */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Compétitions</div>
            <div className="text-base font-extrabold text-white">{competitionsCount} autorisées</div>
          </div>
        </div>

        {/* Live Matches */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">En Direct</div>
            <div className="text-base font-extrabold text-rose-400">{liveMatches} matchs</div>
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">À Venir (Futurs)</div>
            <div className="text-base font-extrabold text-emerald-400">{upcomingMatches} matchs</div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Matchs</div>
            <div className="text-base font-extrabold text-white">{totalMatches} collectés</div>
          </div>
        </div>
      </div>
    </div>
  );
};
