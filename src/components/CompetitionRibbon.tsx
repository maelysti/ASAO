import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Trophy, Sparkles, Layers } from "lucide-react";
import { SportyEntryPoint } from "../types";

interface CompetitionRibbonProps {
  entryPoints: SportyEntryPoint[];
  selectedCategoryId: number; // must be a valid competition ID
  onSelectCategory: (id: number) => void;
}

export const CompetitionRibbon: React.FC<CompetitionRibbonProps> = ({
  entryPoints,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  return (
    <div className="relative bg-slate-900/90 border-b border-slate-800/80 py-2.5 px-2 sm:px-4 shadow-inner">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        {/* Label & Icon */}
        <div className="hidden md:flex items-center gap-2 pr-3 border-r border-slate-800 text-slate-400 shrink-0 text-xs font-semibold uppercase tracking-wider">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span>Compétitions</span>
        </div>

        {/* Left Scroll Button */}
        <button
          onClick={scrollLeft}
          className="shrink-0 p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-md transition-all active:scale-90"
          title="Défiler vers la gauche"
          aria-label="Défiler à gauche"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Ribbon Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth py-1 px-1 flex-1 no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Filtered Valid EntryPoints */}
          {entryPoints.map((ep) => {
            const isSelected = selectedCategoryId === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => onSelectCategory(ep.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25 scale-[1.02]"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60 hover:border-slate-600"
                }`}
              >
                {ep.iconUrl ? (
                  <img
                    src={ep.iconUrl}
                    alt={ep.name}
                    className="w-4 h-4 object-contain filter drop-shadow"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{ep.name}</span>
                {ep.eventsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isSelected
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-slate-700/80 text-emerald-400"
                    }`}
                  >
                    {ep.eventsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={scrollRight}
          className="shrink-0 p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-md transition-all active:scale-90"
          title="Défiler vers la droite"
          aria-label="Défiler à droite"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
