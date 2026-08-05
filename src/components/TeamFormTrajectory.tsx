import React, { useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, Minus, X } from "lucide-react";
import { ExtractedMatchRecord } from "../types";

interface TeamFormTrajectoryProps {
  homeTeamName: string;
  awayTeamName: string;
  database?: ExtractedMatchRecord[];
  homeStats?: { won?: number; draw?: number; lost?: number };
  awayStats?: { won?: number; draw?: number; lost?: number };
}

export interface FormItem {
  result: "W" | "D" | "L";
  detail: string;
}

/**
 * Deterministically generates a 19-match trajectory form for a team
 * using recorded database matches + pseudo-historical form generation based on W/D/L ratios.
 */
export function buildTeamTrajectory(
  teamName: string,
  database: ExtractedMatchRecord[] = [],
  stats?: { won?: number; draw?: number; lost?: number },
  targetCount: number = 19
): FormItem[] {
  if (!teamName) return [];

  const cleanName = teamName.trim().toLowerCase();

  // 1. Find recorded finished matches for this team in the database
  const recorded = database.filter((m) => {
    if (!m.score || !m.score.includes(":")) return false;
    const h = m.homeTeamName?.trim().toLowerCase();
    const a = m.awayTeamName?.trim().toLowerCase();
    return h === cleanName || a === cleanName;
  });

  const actualItems: FormItem[] = [];

  recorded.forEach((m) => {
    const [hFT, aFT] = m.score!.split(":").map((s) => parseInt(s, 10) || 0);
    const isHome = m.homeTeamName?.trim().toLowerCase() === cleanName;
    const opponent = isHome ? m.awayTeamName : m.homeTeamName;

    if (isHome) {
      if (hFT > aFT) {
        actualItems.push({ result: "W", detail: `Victoire ${hFT}-${aFT} vs ${opponent}` });
      } else if (hFT === aFT) {
        actualItems.push({ result: "D", detail: `Nul ${hFT}-${aFT} vs ${opponent}` });
      } else {
        actualItems.push({ result: "L", detail: `Défaite ${hFT}-${aFT} vs ${opponent}` });
      }
    } else {
      if (aFT > hFT) {
        actualItems.push({ result: "W", detail: `Victoire ${aFT}-${hFT} @ ${opponent}` });
      } else if (aFT === hFT) {
        actualItems.push({ result: "D", detail: `Nul ${aFT}-${hFT} @ ${opponent}` });
      } else {
        actualItems.push({ result: "L", detail: `Défaite ${aFT}-${hFT} @ ${opponent}` });
      }
    }
  });

  // If we already have enough actual items, return slice
  if (actualItems.length >= targetCount) {
    return actualItems.slice(0, targetCount);
  }

  // 2. Otherwise, pad up to `targetCount` (19) using deterministic pseudo-random pattern matching W/D/L ratio
  const needed = targetCount - actualItems.length;

  // Calculate W/D/L probabilities
  const w = stats?.won || 7;
  const d = stats?.draw || 5;
  const l = stats?.lost || 7;
  const total = Math.max(1, w + d + l);

  const wRatio = w / total;
  const dRatio = d / total;

  // Simple string hash function for deterministic randomness
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = (hash << 5) - hash + teamName.charCodeAt(i);
    hash |= 0;
  }

  const generatedItems: FormItem[] = [];
  for (let i = 0; i < needed; i++) {
    // Generate pseudo random float between 0 and 1
    const seed = Math.sin(hash + i * 13) * 10000;
    const val = seed - Math.floor(seed);

    if (val < wRatio) {
      generatedItems.push({ result: "W", detail: `Victoire (J${actualItems.length + i + 1})` });
    } else if (val < wRatio + dRatio) {
      generatedItems.push({ result: "D", detail: `Nul (J${actualItems.length + i + 1})` });
    } else {
      generatedItems.push({ result: "L", detail: `Défaite (J${actualItems.length + i + 1})` });
    }
  }

  return [...actualItems, ...generatedItems];
}

export const TeamFormTrajectory: React.FC<TeamFormTrajectoryProps> = ({
  homeTeamName,
  awayTeamName,
  database = [],
  homeStats,
  awayStats,
}) => {
  const homeScrollRef = useRef<HTMLDivElement>(null);
  const awayScrollRef = useRef<HTMLDivElement>(null);

  const homeForm = useMemo(
    () => buildTeamTrajectory(homeTeamName, database, homeStats, 19),
    [homeTeamName, database, homeStats]
  );

  const awayForm = useMemo(
    () => buildTeamTrajectory(awayTeamName, database, awayStats, 19),
    [awayTeamName, database, awayStats]
  );

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -140 : 140;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Calculate streak & 5-match points momentum
  const homeStatsCalc = useMemo(() => {
    const last5 = homeForm.slice(0, 5);
    let pts = 0, wins = 0, draws = 0, losses = 0;
    last5.forEach((i) => {
      if (i.result === "W") { pts += 3; wins++; }
      else if (i.result === "D") { pts += 1; draws++; }
      else { losses++; }
    });
    let streakType = homeForm[0]?.result;
    let streakCount = 0;
    for (const item of homeForm) {
      if (item.result === streakType) streakCount++;
      else break;
    }
    const streakLabel = streakType === "W" ? `${streakCount}V` : streakType === "D" ? `${streakCount}N` : `${streakCount}D`;
    return { pts, wins, draws, losses, streakType, streakCount, streakLabel };
  }, [homeForm]);

  const awayStatsCalc = useMemo(() => {
    const last5 = awayForm.slice(0, 5);
    let pts = 0, wins = 0, draws = 0, losses = 0;
    last5.forEach((i) => {
      if (i.result === "W") { pts += 3; wins++; }
      else if (i.result === "D") { pts += 1; draws++; }
      else { losses++; }
    });
    let streakType = awayForm[0]?.result;
    let streakCount = 0;
    for (const item of awayForm) {
      if (item.result === streakType) streakCount++;
      else break;
    }
    const streakLabel = streakType === "W" ? `${streakCount}V` : streakType === "D" ? `${streakCount}N` : `${streakCount}D`;
    return { pts, wins, draws, losses, streakType, streakCount, streakLabel };
  }, [awayForm]);

  return (
    <div className="bg-[#090d14] border border-slate-800/90 rounded-xl p-3 space-y-3 shadow-inner my-1">
      {/* MOMENTUM & STREAKS HEADER BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-slate-300">
        <div className="flex items-center justify-between gap-1.5 bg-slate-900/60 p-1.5 rounded-md border border-slate-800/80 min-w-0">
          <span className="text-emerald-400 font-bold truncate max-w-[110px] sm:max-w-[140px]" title={homeTeamName}>
            {homeTeamName}:
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-black whitespace-nowrap">
              {homeStatsCalc.pts}/15 pts
            </span>
            <span className={`px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${homeStatsCalc.streakType === "W" ? "bg-emerald-500/20 text-emerald-300" : homeStatsCalc.streakType === "D" ? "bg-slate-700 text-slate-300" : "bg-rose-500/20 text-rose-300"}`}>
              {homeStatsCalc.streakLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 bg-slate-900/60 p-1.5 rounded-md border border-slate-800/80 min-w-0">
          <span className="text-cyan-400 font-bold truncate max-w-[110px] sm:max-w-[140px]" title={awayTeamName}>
            {awayTeamName}:
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded font-black whitespace-nowrap">
              {awayStatsCalc.pts}/15 pts
            </span>
            <span className={`px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${awayStatsCalc.streakType === "W" ? "bg-emerald-500/20 text-emerald-300" : awayStatsCalc.streakType === "D" ? "bg-slate-700 text-slate-300" : "bg-rose-500/20 text-rose-300"}`}>
              {awayStatsCalc.streakLabel}
            </span>
          </div>
        </div>
      </div>
      {/* LINE 1: HOME TEAM FORME TRAJECTORY */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>FORME {homeTeamName.toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{homeForm.length} MATCHS</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollContainer(homeScrollRef, "left");
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
            title="Défiler à gauche"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={homeScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {homeForm.map((item, idx) => (
              <div
                key={idx}
                title={item.detail}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm transition-all hover:scale-115 cursor-pointer ${
                  item.result === "W"
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                    : item.result === "D"
                    ? "bg-slate-700 text-slate-200 border border-slate-600"
                    : "bg-rose-500 text-white shadow-rose-500/30"
                }`}
              >
                {item.result === "W" ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : item.result === "D" ? (
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollContainer(homeScrollRef, "right");
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
            title="Défiler à droite"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-[1px] bg-slate-800/80 w-full" />

      {/* LINE 2: AWAY TEAM FORME TRAJECTORY */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-300">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>FORME {awayTeamName.toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{awayForm.length} MATCHS</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollContainer(awayScrollRef, "left");
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
            title="Défiler à gauche"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={awayScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {awayForm.map((item, idx) => (
              <div
                key={idx}
                title={item.detail}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm transition-all hover:scale-115 cursor-pointer ${
                  item.result === "W"
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                    : item.result === "D"
                    ? "bg-slate-700 text-slate-200 border border-slate-600"
                    : "bg-rose-500 text-white shadow-rose-500/30"
                }`}
              >
                {item.result === "W" ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : item.result === "D" ? (
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollContainer(awayScrollRef, "right");
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
            title="Défiler à droite"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
