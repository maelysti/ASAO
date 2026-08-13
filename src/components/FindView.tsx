import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Filter,
  Database,
  Trophy,
  Zap,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Flame,
  ArrowRight,
  Download,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Hash,
  Activity,
  Plus,
  FileSpreadsheet,
  Table,
  RotateCcw,
  ArrowUpDown,
  LayoutGrid,
} from "lucide-react";
import { ExtractedMatchRecord, SportyEntryPoint, RuleItem } from "../types";
import { getH2HAnalysisForMatch, getRealMatchId } from "../utils/globalAnalysisEngine";

export type SearchScope =
  | "ALL"
  | "TEAMS"
  | "ODDS"
  | "RANKS"
  | "SCORES"
  | "ROUNDS"
  | "GOALS";

export const SCOPE_OPTIONS: {
  id: SearchScope;
  label: string;
  shortLabel: string;
  icon: string;
  desc: string;
}[] = [
  { id: "ALL", label: "Tous les Champs", shortLabel: "Tout", icon: "🌐", desc: "Recherche globale multi-critères" },
  { id: "TEAMS", label: "Équipes & Matchs", shortLabel: "Équipes", icon: "🏟️", desc: "Noms des équipes (Domicile / Extérieur)" },
  { id: "ODDS", label: "Cotes (1X2, DC, O/U, GG)", shortLabel: "Cotes", icon: "🎲", desc: "Recherche ciblée sur les cotes de marchés" },
  { id: "RANKS", label: "Rang & Classement", shortLabel: "Rangs", icon: "📊", desc: "Positions d'équipe (1er, 5ème, 12ème...)" },
  { id: "SCORES", label: "Scores Exacts (FT/MT)", shortLabel: "Scores", icon: "⚽", desc: "Scores finaux ou mi-temps (ex: 2-1, 0-0)" },
  { id: "ROUNDS", label: "Journées & ID Event Cat.", shortLabel: "Journées/ID", icon: "📅", desc: "Numéros de journée (J1, J5) ou ID Event Category (#101)" },
  { id: "GOALS", label: "Minutage des Buts", shortLabel: "Minutes", icon: "⏱️", desc: "Minutages des buts marqués (ex: 12', 88')" },
];

export type OddsMarketSubFilter =
  | "ALL"
  | "1X2"
  | "DC"
  | "DC_1X"
  | "DC_12"
  | "DC_X2"
  | "OU"
  | "OVER_25"
  | "UNDER_25"
  | "BTTS"
  | "BTTS_YES"
  | "BTTS_NO";

export const ODDS_MARKET_OPTIONS: { id: OddsMarketSubFilter; label: string; short: string }[] = [
  { id: "ALL", label: "Toutes les Cotes", short: "Toutes Cotes" },
  { id: "1X2", label: "Marché 1X2 (1, X, 2)", short: "1X2" },
  { id: "DC", label: "Toutes Double Chance (1X, 12, X2)", short: "Toutes DC" },
  { id: "DC_1X", label: "Cote 1X (Dom / Nul)", short: "Cote 1X" },
  { id: "DC_12", label: "Cote 12 (Dom / Ext)", short: "Cote 12" },
  { id: "DC_X2", label: "Cote X2 (Nul / Ext)", short: "Cote X2" },
  { id: "OU", label: "Cotes Over / Under 2.5", short: "Over/Under" },
  { id: "OVER_25", label: "Cote Over 2.5", short: "Cote > 2.5" },
  { id: "UNDER_25", label: "Cote Under 2.5", short: "Cote < 2.5" },
  { id: "BTTS", label: "Cotes BTTS (GG / NG)", short: "BTTS / GG" },
  { id: "BTTS_YES", label: "Cote GG (Oui)", short: "Cote GG" },
  { id: "BTTS_NO", label: "Cote NG (Non)", short: "Cote NG" },
];

interface FindViewProps {
  database: ExtractedMatchRecord[];
  entryPoints: SportyEntryPoint[];
  onCreateRuleFromDb?: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
  onNavigateToView?: (view: any) => void;
}

export const FindView: React.FC<FindViewProps> = ({
  database,
  entryPoints,
  onCreateRuleFromDb,
}) => {
  // Free text search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Targeted Search Scope ("ALL", "TEAMS", "ODDS", "RANKS", "SCORES", "ROUNDS", "GOALS")
  const [searchScope, setSearchScope] = useState<SearchScope>("ALL");

  // Targeted Odds Market Sub-Filter
  const [selectedOddsMarket, setSelectedOddsMarket] = useState<OddsMarketSubFilter>("ALL");

  // Min / Max Odds Range Filter
  const [minOdds, setMinOdds] = useState<string>("");
  const [maxOdds, setMaxOdds] = useState<string>("");

  // Structured Filter Controls
  const [selectedComp, setSelectedComp] = useState<string | number>("ALL");
  const [selectedEventCatId, setSelectedEventCatId] = useState<string | number>("ALL");
  const [selectedOutcome, setSelectedOutcome] = useState<"ALL" | "1" | "X" | "2">("ALL");
  const [selectedGoalMarket, setSelectedGoalMarket] = useState<
    "ALL" | "OVER_25" | "UNDER_25" | "BTTS_YES" | "BTTS_NO"
  >("ALL");

  // Expanded card H2H state (map of matchId -> boolean)
  const [expandedH2H, setExpandedH2H] = useState<Record<string, boolean>>({});

  // Copy notification state
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // View Mode: "TABLE" (Excel spreadsheet grid) or "CARDS"
  const [displayMode, setDisplayMode] = useState<"TABLE" | "CARDS">("TABLE");

  // Table sorting controls
  const [sortField, setSortField] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Available ID Event Categories in database
  const availableEventCategories = useMemo(() => {
    const map = new Map<string | number, { id: string | number; name: string; count: number }>();
    database.forEach((m) => {
      const catId = m.eventCategoryId || m.competitionId;
      if (catId !== undefined && catId !== null && catId !== 0) {
        const existing = map.get(catId);
        if (existing) {
          existing.count++;
        } else {
          map.set(catId, {
            id: catId,
            name: m.competitionName || `ID Event Cat #${catId}`,
            count: 1,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id));
  }, [database]);

  // Available Competitions list in database
  const availableCompetitions = useMemo(() => {
    const compMap = new Map<string | number, string>();
    database.forEach((m) => {
      const id = m.competitionId || m.eventCategoryId || 0;
      const name = m.competitionName || `Ligue ${id}`;
      compMap.set(id, name);
    });
    return Array.from(compMap.entries()).map(([id, name]) => ({ id, name }));
  }, [database]);

  // Preset Quick Filter Tag Chips
  const quickTags = [
    { label: "0 - 0", query: "0-0", category: "score" },
    { label: "2 - 1", query: "2-1", category: "score" },
    { label: "1 - 0", query: "1-0", category: "score" },
    { label: "1 - 1", query: "1-1", category: "score" },
    { label: "2 - 2", query: "2-2", category: "score" },
    { label: "Victoire Dom (1)", query: "1", outcome: "1" },
    { label: "Match Nul (X)", query: "X", outcome: "X" },
    { label: "Victoire Ext (2)", query: "2", outcome: "2" },
    { label: "Cotes 1X2", oddsMarket: "1X2" },
    { label: "Cote 1X", oddsMarket: "DC_1X" },
    { label: "Cote X2", oddsMarket: "DC_X2" },
    { label: "Over 2.5", query: ">2.5", goalMarket: "OVER_25" },
    { label: "GG (BTTS)", query: "GG", goalMarket: "BTTS_YES" },
    { label: "Journée 1 (J1)", query: "J1" },
    { label: "Journée 5 (J5)", query: "J5" },
  ];

  // Helper to normalize string for comparison
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");

  // Helper function to extract relevant odds numbers for market matching
  const getOddsForSubMarket = (m: ExtractedMatchRecord, market: OddsMarketSubFilter): number[] => {
    const list: number[] = [];
    const h = m.homeOdds;
    const d = m.drawOdds;
    const a = m.awayOdds;
    const dc1X = m.doubleChanceOdds?.dc1X;
    const dc12 = m.doubleChanceOdds?.dc12;
    const dcX2 = m.doubleChanceOdds?.dcX2;
    const ov = m.overUnderOdds?.over25;
    const un = m.overUnderOdds?.under25;
    const bYes = m.bothTeamsScoreOdds?.yes;
    const bNo = m.bothTeamsScoreOdds?.no;

    if (market === "1X2" || market === "ALL") {
      if (h) list.push(h);
      if (d) list.push(d);
      if (a) list.push(a);
    }
    if (market === "DC" || market === "DC_1X" || market === "ALL") {
      if (dc1X) list.push(dc1X);
    }
    if (market === "DC" || market === "DC_12" || market === "ALL") {
      if (dc12) list.push(dc12);
    }
    if (market === "DC" || market === "DC_X2" || market === "ALL") {
      if (dcX2) list.push(dcX2);
    }
    if (market === "OU" || market === "OVER_25" || market === "ALL") {
      if (ov) list.push(ov);
    }
    if (market === "OU" || market === "UNDER_25" || market === "ALL") {
      if (un) list.push(un);
    }
    if (market === "BTTS" || market === "BTTS_YES" || market === "ALL") {
      if (bYes) list.push(bYes);
    }
    if (market === "BTTS" || market === "BTTS_NO" || market === "ALL") {
      if (bNo) list.push(bNo);
    }

    return list;
  };

  // Multi-field Free Search & Filter Engine
  const filteredMatches = useMemo(() => {
    if (!database || database.length === 0) return [];

    const rawQ = searchQuery.trim().toLowerCase();
    const cleanQ = norm(searchQuery);

    const parsedMinOdds = minOdds !== "" ? parseFloat(minOdds) : null;
    const parsedMaxOdds = maxOdds !== "" ? parseFloat(maxOdds) : null;

    return database.filter((m) => {
      // 1. Competition Filter
      if (selectedComp !== "ALL") {
        const mCompId = String(m.competitionId || m.eventCategoryId || 0);
        if (mCompId !== String(selectedComp)) return false;
      }

      // 2. ID Event Category Filter (Remplaces Season Filter)
      if (selectedEventCatId !== "ALL") {
        const mCatId = String(m.eventCategoryId || m.competitionId || 0);
        if (mCatId !== String(selectedEventCatId)) return false;
      }

      // Parse Score
      const ftScore = (m.score || "").replace(":", "-").trim();
      const htScore = (m.halfTimeScore || "").replace(":", "-").trim();
      const [hFT, aFT] = ftScore.split("-").map((s) => parseInt(s.trim(), 10));
      const hasValidFT = !isNaN(hFT) && !isNaN(aFT);

      // 3. Outcome Filter
      if (selectedOutcome !== "ALL" && hasValidFT) {
        if (selectedOutcome === "1" && !(hFT > aFT)) return false;
        if (selectedOutcome === "X" && !(hFT === aFT)) return false;
        if (selectedOutcome === "2" && !(aFT > hFT)) return false;
      }

      // 4. Goal Market Filter
      if (selectedGoalMarket !== "ALL" && hasValidFT) {
        const totalGoals = hFT + aFT;
        if (selectedGoalMarket === "OVER_25" && !(totalGoals > 2.5)) return false;
        if (selectedGoalMarket === "UNDER_25" && !(totalGoals < 2.5)) return false;
        if (selectedGoalMarket === "BTTS_YES" && !(hFT > 0 && aFT > 0)) return false;
        if (selectedGoalMarket === "BTTS_NO" && !(hFT === 0 || aFT === 0)) return false;
      }

      // 5. Min / Max Odds Range Filter
      if (parsedMinOdds !== null || parsedMaxOdds !== null) {
        const relevantOdds = getOddsForSubMarket(m, selectedOddsMarket);
        if (relevantOdds.length === 0) return false;
        const matchesOddsRange = relevantOdds.some((o) => {
          if (parsedMinOdds !== null && o < parsedMinOdds) return false;
          if (parsedMaxOdds !== null && o > parsedMaxOdds) return false;
          return true;
        });
        if (!matchesOddsRange) return false;
      }

      // 6. Free Text Multi-Term Matching
      if (!rawQ) return true;

      // Prepare target fields for matching
      const homeTeam = (m.homeTeamName || "").toLowerCase();
      const awayTeam = (m.awayTeamName || "").toLowerCase();
      const matchName = (m.matchName || `${homeTeam} vs ${awayTeam}`).toLowerCase();
      const compName = (m.competitionName || "").toLowerCase();
      const catIdStr = String(m.eventCategoryId || m.competitionId || "");
      const roundStr = `j${m.roundNumber || 1} round ${m.roundNumber || 1} journée ${m.roundNumber || 1}`.toLowerCase();
      const goalMins = (m.goalMinutes || "").toLowerCase();
      const matchIdStr = String(m.id || "");
      const sourceStr = (m.source || "").toLowerCase();
      const oddsSummary = (m.allOddsSummary || "").toLowerCase();

      // Check odds values according to selectedOddsMarket
      const targetOddsValues = getOddsForSubMarket(m, selectedOddsMarket).map((o) => String(o));

      // Match check
      const terms = rawQ.split(/\s+/).filter((t) => t.length > 0);

      return terms.every((term) => {
        const cleanTerm = norm(term);

        // Targeted Scope: TEAMS
        if (searchScope === "TEAMS") {
          return (
            homeTeam.includes(term) ||
            awayTeam.includes(term) ||
            matchName.includes(term) ||
            norm(homeTeam).includes(cleanTerm) ||
            norm(awayTeam).includes(cleanTerm)
          );
        }

        // Targeted Scope: ODDS (with selectedOddsMarket precision)
        if (searchScope === "ODDS") {
          return targetOddsValues.some((ovStr) => ovStr.includes(term)) || oddsSummary.includes(term);
        }

        // Targeted Scope: RANKS
        if (searchScope === "RANKS") {
          const numOnly = term.replace(/[^0-9]/g, "");
          const hR = String(m.homeRank || "");
          const aR = String(m.awayRank || "");
          if (numOnly) {
            return hR === numOnly || aR === numOnly;
          }
          return hR.includes(term) || aR.includes(term);
        }

        // Targeted Scope: SCORES
        if (searchScope === "SCORES") {
          const normTermScore = term.replace(":", "-");
          return (
            ftScore.includes(normTermScore) ||
            htScore.includes(normTermScore) ||
            ftScore.includes(term) ||
            htScore.includes(term)
          );
        }

        // Targeted Scope: ROUNDS & ID EVENT CATEGORY
        if (searchScope === "ROUNDS") {
          const numOnly = term.replace(/^j|^cat|^#?/i, "").trim();
          const rNum = String(m.roundNumber || "");
          return (
            rNum === numOnly ||
            catIdStr === numOnly ||
            roundStr.includes(term) ||
            catIdStr.includes(term)
          );
        }

        // Targeted Scope: GOALS
        if (searchScope === "GOALS") {
          return goalMins.includes(term);
        }

        // Targeted Scope: ALL (Default Multi-field)
        if (term.includes("-") || term.includes(":")) {
          const normTermScore = term.replace(":", "-");
          if (ftScore.includes(normTermScore) || htScore.includes(normTermScore)) {
            return true;
          }
        }

        if (/^j\d+$/.test(term)) {
          const num = term.replace("j", "");
          return String(m.roundNumber) === num;
        }

        if (/^#?\d+$/.test(term)) {
          const num = term.replace("#", "");
          if (catIdStr === num) return true;
        }

        return (
          homeTeam.includes(term) ||
          awayTeam.includes(term) ||
          matchName.includes(term) ||
          compName.includes(term) ||
          catIdStr.includes(term) ||
          roundStr.includes(term) ||
          ftScore.includes(term) ||
          htScore.includes(term) ||
          goalMins.includes(term) ||
          matchIdStr.includes(term) ||
          sourceStr.includes(term) ||
          oddsSummary.includes(term) ||
          targetOddsValues.some((ovStr) => ovStr.includes(term)) ||
          norm(homeTeam).includes(cleanTerm) ||
          norm(awayTeam).includes(cleanTerm) ||
          norm(compName).includes(cleanTerm)
        );
      });
    });
  }, [
    database,
    searchQuery,
    searchScope,
    selectedOddsMarket,
    minOdds,
    maxOdds,
    selectedComp,
    selectedEventCatId,
    selectedOutcome,
    selectedGoalMarket,
  ]);

  // Sort handler for Excel Table columns
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sorted list of matches for Table View
  const sortedMatches = useMemo(() => {
    const list = [...filteredMatches];
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof ExtractedMatchRecord];
      let valB: any = b[sortField as keyof ExtractedMatchRecord];

      if (sortField === "eventCategoryId") {
        valA = a.eventCategoryId || a.competitionId || 0;
        valB = b.eventCategoryId || b.competitionId || 0;
      } else if (sortField === "roundNumber") {
        valA = a.roundNumber || 1;
        valB = b.roundNumber || 1;
      } else if (sortField === "score") {
        const partsA = (a.score || "0-0").split(/[:\-]/).map((n) => parseInt(n, 10) || 0);
        const partsB = (b.score || "0-0").split(/[:\-]/).map((n) => parseInt(n, 10) || 0);
        valA = (partsA[0] || 0) + (partsA[1] || 0);
        valB = (partsB[0] || 0) + (partsB[1] || 0);
      } else if (sortField === "outcome") {
        const partsA = (a.score || "0-0").split(/[:\-]/).map((n) => parseInt(n, 10) || 0);
        const partsB = (b.score || "0-0").split(/[:\-]/).map((n) => parseInt(n, 10) || 0);
        valA = partsA[0] > partsA[1] ? "1" : partsA[1] > partsA[0] ? "2" : "X";
        valB = partsB[0] > partsB[1] ? "1" : partsB[1] > partsB[0] ? "2" : "X";
      }

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredMatches, sortField, sortDirection]);

  // Number of active filter parameters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== "") count++;
    if (searchScope !== "ALL") count++;
    if (selectedOddsMarket !== "ALL") count++;
    if (minOdds !== "" || maxOdds !== "") count++;
    if (selectedComp !== "ALL") count++;
    if (selectedEventCatId !== "ALL") count++;
    if (selectedOutcome !== "ALL") count++;
    if (selectedGoalMarket !== "ALL") count++;
    return count;
  }, [
    searchQuery,
    searchScope,
    selectedOddsMarket,
    minOdds,
    maxOdds,
    selectedComp,
    selectedEventCatId,
    selectedOutcome,
    selectedGoalMarket,
  ]);

  // Statistics calculation for filtered search results
  const searchStats = useMemo(() => {
    const total = filteredMatches.length;
    if (total === 0) {
      return {
        total: 0,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        homeWinPct: 0,
        drawPct: 0,
        awayWinPct: 0,
        over25Pct: 0,
        bttsPct: 0,
        avgGoals: "0.00",
        topExactScore: "N/A",
        topScoreCount: 0,
      };
    }

    let hWins = 0;
    let drs = 0;
    let aWins = 0;
    let over25Count = 0;
    let bttsCount = 0;
    let sumGoals = 0;
    const scoreCounts: Record<string, number> = {};

    filteredMatches.forEach((m) => {
      const ftScore = (m.score || "").replace(":", "-").trim();
      const [hFT, aFT] = ftScore.split("-").map((s) => parseInt(s.trim(), 10));

      if (!isNaN(hFT) && !isNaN(aFT)) {
        const tot = hFT + aFT;
        sumGoals += tot;

        if (hFT > aFT) hWins++;
        else if (hFT === aFT) drs++;
        else aWins++;

        if (tot > 2.5) over25Count++;
        if (hFT > 0 && aFT > 0) bttsCount++;

        scoreCounts[ftScore] = (scoreCounts[ftScore] || 0) + 1;
      }
    });

    let topScore = "0 - 0";
    let topCount = 0;
    Object.entries(scoreCounts).forEach(([sc, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topScore = sc;
      }
    });

    return {
      total,
      homeWins: hWins,
      draws: drs,
      awayWins: aWins,
      homeWinPct: Math.round((hWins / total) * 100),
      drawPct: Math.round((drs / total) * 100),
      awayWinPct: Math.round((aWins / total) * 100),
      over25Pct: Math.round((over25Count / total) * 100),
      bttsPct: Math.round((bttsCount / total) * 100),
      avgGoals: (sumGoals / total).toFixed(2),
      topExactScore: topScore,
      topScoreCount: topCount,
    };
  }, [filteredMatches]);

  // Toggle H2H dropdown
  const toggleH2H = (id: string | number) => {
    const strId = String(id);
    setExpandedH2H((prev) => ({ ...prev, [strId]: !prev[strId] }));
  };

  // Copy match summary to clipboard
  const handleCopyMatch = (m: ExtractedMatchRecord) => {
    const text = `MATCH: ${m.homeTeamName} ${m.score} ${m.awayTeamName} | MT: (${m.halfTimeScore || "0-0"}) | J${m.roundNumber} - ${m.competitionName} | Cotes 1X2: ${m.homeOdds || 0}/${m.drawOdds || 0}/${m.awayOdds || 0} | Buts: ${m.goalMinutes || "Aucun"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export filtered matches to Styled Excel (.xls)
  const handleExportStyledExcel = () => {
    if (filteredMatches.length === 0) return;

    const title = "RAPPORT DE RECHERCHE - BASE DE DONNÉES VIRTUAL FOOTBALL";
    const dateStr = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const activeScopeObj = SCOPE_OPTIONS.find((s) => s.id === searchScope);
    const scopeLabel = activeScopeObj ? `${activeScopeObj.icon} ${activeScopeObj.label}` : "Tous les champs";

    const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Recherche BDD</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #0f172a; margin: 20px; }
        .title-banner { background-color: #0f172a; color: #f59e0b; padding: 14px 18px; font-size: 16px; font-weight: bold; border-radius: 8px; margin-bottom: 8px; border: 1px solid #334155; }
        .meta-line { font-size: 11px; color: #475569; margin-bottom: 16px; font-style: italic; }
        .kpi-table { border-collapse: collapse; margin-bottom: 20px; width: 100%; }
        .kpi-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-size: 12px; }
        .kpi-label { background-color: #f1f5f9; font-weight: bold; color: #334155; }
        .kpi-val { background-color: #ffffff; font-weight: bold; color: #0369a1; font-size: 13px; }
        table.data-table { border-collapse: collapse; width: 100%; font-size: 12px; }
        table.data-table th { background-color: #0f172a; color: #f59e0b; font-weight: bold; border: 1px solid #334155; padding: 10px 8px; text-transform: uppercase; font-size: 11px; text-align: center; }
        table.data-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; vertical-align: middle; }
        table.data-table tr:nth-child(even) { background-color: #f8fafc; }
        .team-cell { font-weight: bold; color: #0f172a; text-align: left; background-color: #ffffff; }
        .score-badge { font-weight: bold; font-family: 'Courier New', monospace; font-size: 13px; background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b; padding: 4px 8px; }
        .ht-badge { font-family: 'Courier New', monospace; color: #64748b; font-size: 11px; }
        .odds-val { font-family: 'Courier New', monospace; font-weight: bold; color: #0284c7; }
        .goals-cell { color: #047857; font-family: 'Courier New', monospace; font-size: 11px; text-align: left; }
        .comp-tag { font-weight: bold; color: #1e293b; background-color: #e2e8f0; }
        .cat-tag { font-weight: bold; color: #047857; font-family: 'Courier New', monospace; }
      </style>
    </head>
    <body>
      <div class="title-banner">📊 ${title}</div>
      <div class="meta-line">
        Généré le : ${dateStr} | Total enregistrements : <b>${filteredMatches.length}</b> | Filtre Texte : <b>"${searchQuery || "Tous"}"</b> | Champ Cible : <b>${scopeLabel}</b>
      </div>

      <table class="kpi-table">
        <tr>
          <td class="kpi-label">Matchs Filtrés</td>
          <td class="kpi-label">Victoires Dom (1)</td>
          <td class="kpi-label">Nuls (X)</td>
          <td class="kpi-label">Victoires Ext (2)</td>
          <td class="kpi-label">% Over 2.5</td>
          <td class="kpi-label">% GG (BTTS)</td>
          <td class="kpi-label">Moyenne Buts</td>
        </tr>
        <tr>
          <td class="kpi-val">${searchStats.total}</td>
          <td class="kpi-val">${searchStats.homeWins} (${searchStats.homeWinPct}%)</td>
          <td class="kpi-val">${searchStats.draws} (${searchStats.drawPct}%)</td>
          <td class="kpi-val">${searchStats.awayWins} (${searchStats.awayWinPct}%)</td>
          <td class="kpi-val">${searchStats.over25Pct}%</td>
          <td class="kpi-val">${searchStats.bttsPct}%</td>
          <td class="kpi-val">${searchStats.avgGoals}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID Match</th>
            <th>Compétition</th>
            <th>ID Event Category</th>
            <th>Journée</th>
            <th>Équipe Domicile</th>
            <th>Rang D.</th>
            <th>Score FT</th>
            <th>Score MT</th>
            <th>Équipe Extérieur</th>
            <th>Rang E.</th>
            <th>Cote 1</th>
            <th>Cote X</th>
            <th>Cote 2</th>
            <th>Cote 1X</th>
            <th>Cote 12</th>
            <th>Cote X2</th>
            <th>Over 2.5</th>
            <th>Under 2.5</th>
            <th>BTTS Oui</th>
            <th>BTTS Non</th>
            <th>Minutes des Buts</th>
          </tr>
        </thead>
        <tbody>
          ${filteredMatches.map((m) => {
            const ft = (m.score || "0-0").replace(":", "-");
            const ht = (m.halfTimeScore || "0-0").replace(":", "-");
            const catId = m.eventCategoryId || m.competitionId || 0;
            return `
              <tr>
                <td style="font-family:'Courier New', monospace; color:#64748b;">#${m.id}</td>
                <td class="comp-tag">${m.competitionName || "Ligue"}</td>
                <td class="cat-tag">#${catId}</td>
                <td style="font-weight:bold;">Journée ${m.roundNumber || 1}</td>
                <td class="team-cell">${m.homeTeamName}</td>
                <td>${m.homeRank > 0 ? `#${m.homeRank}` : "-"}</td>
                <td><span class="score-badge">${ft}</span></td>
                <td class="ht-badge">${ht}</td>
                <td class="team-cell">${m.awayTeamName}</td>
                <td>${m.awayRank > 0 ? `#${m.awayRank}` : "-"}</td>
                <td class="odds-val">${m.homeOdds || "-"}</td>
                <td class="odds-val">${m.drawOdds || "-"}</td>
                <td class="odds-val">${m.awayOdds || "-"}</td>
                <td>${m.doubleChanceOdds?.dc1X || "-"}</td>
                <td>${m.doubleChanceOdds?.dc12 || "-"}</td>
                <td>${m.doubleChanceOdds?.dcX2 || "-"}</td>
                <td>${m.overUnderOdds?.over25 || "-"}</td>
                <td>${m.overUnderOdds?.under25 || "-"}</td>
                <td>${m.bothTeamsScoreOdds?.yes || "-"}</td>
                <td>${m.bothTeamsScoreOdds?.no || "-"}</td>
                <td class="goals-cell">${m.goalMinutes || "Aucun"}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </body>
    </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_recherche_bdd_style_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export filtered matches to CSV
  const handleExportCSV = () => {
    if (filteredMatches.length === 0) return;
    const headers = [
      "ID",
      "Competition",
      "ID_Event_Category",
      "Journee",
      "Equipe Domicile",
      "Equipe Exterieur",
      "Score FT",
      "Score HT",
      "Minutes Buts",
      "Cote 1",
      "Cote X",
      "Cote 2",
      "Cote 1X",
      "Cote 12",
      "Cote X2",
      "Cote Over 2.5",
      "Cote Under 2.5",
      "Cote GG",
      "Cote NG",
      "Date Extraction",
    ];

    const rows = filteredMatches.map((m) => [
      m.id,
      `"${m.competitionName}"`,
      m.eventCategoryId || m.competitionId || 0,
      m.roundNumber || 1,
      `"${m.homeTeamName}"`,
      `"${m.awayTeamName}"`,
      `"${m.score || "0-0"}"`,
      `"${m.halfTimeScore || "0-0"}"`,
      `"${m.goalMinutes || ""}"`,
      m.homeOdds || 0,
      m.drawOdds || 0,
      m.awayOdds || 0,
      m.doubleChanceOdds?.dc1X || 0,
      m.doubleChanceOdds?.dc12 || 0,
      m.doubleChanceOdds?.dcX2 || 0,
      m.overUnderOdds?.over25 || 0,
      m.overUnderOdds?.under25 || 0,
      m.bothTeamsScoreOdds?.yes || 0,
      m.bothTeamsScoreOdds?.no || 0,
      `"${m.extractedAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_recherche_bdd_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset all search criteria
  const handleResetFilters = () => {
    setSearchQuery("");
    setSearchScope("ALL");
    setSelectedOddsMarket("ALL");
    setMinOdds("");
    setMaxOdds("");
    setSelectedComp("ALL");
    setSelectedEventCatId("ALL");
    setSelectedOutcome("ALL");
    setSelectedGoalMarket("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/40 uppercase tracking-wider">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Moteur de Recherche Multi-Filtres Précis BDD</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              MOTEUR DE RECHERCHE FIND
              <span className="text-amber-400 font-mono text-sm px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                {database.length} MATCHS EN BDD
              </span>
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl font-medium">
              Combinez plusieurs filtres simultanément (Marchés de cotes 1X2 / DC / Over / GG, Fourchettes de cotes, ID Event Category, Issue, Buts) ou effectuez une recherche libre.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportStyledExcel}
              disabled={filteredMatches.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-slate-950 text-xs font-black rounded-xl border border-amber-400/50 flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
              title="Exporter rapport Excel enrichi avec mise en forme, bordures, couleurs et statistiques"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>Excel Stylé (.xls)</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredMatches.length === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
              title="Exporter fichier texte CSV UTF-8"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>CSV ({filteredMatches.length})</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* Scope Selector Pills (Où chercher ?) */}
        <div className="mt-6 relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Où souhaitez-vous chercher ? (Préciser le Domaine) :
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Cible active : <strong className="text-amber-300">{SCOPE_OPTIONS.find(s => s.id === searchScope)?.label}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SCOPE_OPTIONS.map((opt) => {
              const isActive = searchScope === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSearchScope(opt.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40 scale-105"
                      : "bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800"
                  }`}
                  title={opt.desc}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Search Input Field with Scope Selector */}
        <div className="mt-4 relative z-10">
          <div className="flex flex-col md:flex-row items-stretch gap-2.5">
            {/* Embedded Scope Dropdown for Mobile / Quick Access */}
            <div className="md:w-60 shrink-0 relative">
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                className="w-full h-full bg-slate-950/90 border-2 border-amber-500/40 text-amber-300 font-extrabold text-xs rounded-2xl px-3.5 py-3.5 cursor-pointer outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-slate-950 text-white font-bold py-2">
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Input Field */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-amber-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchScope === "TEAMS"
                    ? "Ex: Arsenal, Real Madrid, Bayern..."
                    : searchScope === "ODDS"
                    ? "Ex: 1.85, 3.20, 2.10, 1.45..."
                    : searchScope === "RANKS"
                    ? "Ex: 1, 3, 5, 12..."
                    : searchScope === "SCORES"
                    ? "Ex: 2-1, 0-0, 1-1, 3-2..."
                    : searchScope === "ROUNDS"
                    ? "Ex: J1, J5, #101, #102..."
                    : searchScope === "GOALS"
                    ? "Ex: 12', 45', 88'..."
                    : "Ex: Arsenal, 2-1, J5, 1.85, #101, Over..."
                }
                className="w-full pl-12 pr-28 py-3.5 bg-slate-950/90 border-2 border-amber-500/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 text-white font-bold text-sm lg:text-base rounded-2xl placeholder:text-slate-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-16 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Effacer la recherche"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute right-3.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 font-mono text-xs font-black">
                {filteredMatches.length} match{filteredMatches.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Scope Indicator Helper Banner */}
          <div className="mt-2 text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>{SCOPE_OPTIONS.find((s) => s.id === searchScope)?.icon} Mode {SCOPE_OPTIONS.find((s) => s.id === searchScope)?.label} :</strong>{" "}
                {SCOPE_OPTIONS.find((s) => s.id === searchScope)?.desc}
              </span>
            </div>
            {searchQuery && (
              <span className="font-mono text-[10px] text-amber-400/90 hidden sm:inline">
                Filtre : "{searchQuery}"
              </span>
            )}
          </div>
        </div>

        {/* Preset Quick Search Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 relative z-10">
          <span className="text-[11px] font-black text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Tag className="w-3.5 h-3.5" />
            Raccourcis Rapides :
          </span>
          {quickTags.map((tag, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (tag.outcome) setSelectedOutcome(tag.outcome as any);
                else if (tag.goalMarket) setSelectedGoalMarket(tag.goalMarket as any);
                else if (tag.oddsMarket) {
                  setSearchScope("ODDS");
                  setSelectedOddsMarket(tag.oddsMarket as any);
                } else {
                  if (tag.category === "score") setSearchScope("SCORES");
                  setSearchQuery(tag.query || "");
                }
              }}
              className="px-2.5 py-1 bg-slate-900/80 hover:bg-amber-500/20 hover:border-amber-500/50 text-slate-300 hover:text-amber-200 text-xs font-bold rounded-lg border border-slate-800 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
            >
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Criteria Combined Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-400" />
            Combinaison Multi-Filtres (Cumulables)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Filtres actifs appliqués simultanément
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Competition Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Compétition / Ligue :
            </label>
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer outline-none"
            >
              <option value="ALL">Toutes les compétitions</option>
              {availableCompetitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* ID Event Category Filter (Replacing Season Filter) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              ID Event Category :
            </label>
            <select
              value={selectedEventCatId}
              onChange={(e) => setSelectedEventCatId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer outline-none"
            >
              <option value="ALL">Tous les ID Event Category</option>
              {availableEventCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  ID #{cat.id} ({cat.name}) [{cat.count} m.]
                </option>
              ))}
            </select>
          </div>

          {/* Specific Odds Market Sub-Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Marché de Cotes Cible :
            </label>
            <select
              value={selectedOddsMarket}
              onChange={(e) => setSelectedOddsMarket(e.target.value as OddsMarketSubFilter)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer outline-none"
            >
              {ODDS_MARKET_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Odds Range Filter (Min & Max) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Fourchette de Cote (Min - Max) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.05"
                placeholder="Min (ex: 1.50)"
                value={minOdds}
                onChange={(e) => setMinOdds(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs font-mono font-bold rounded-xl px-2.5 py-1.5 outline-none placeholder:text-slate-600"
              />
              <span className="text-slate-500 text-xs font-bold">-</span>
              <input
                type="number"
                step="0.05"
                placeholder="Max (ex: 2.20)"
                value={maxOdds}
                onChange={(e) => setMaxOdds(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs font-mono font-bold rounded-xl px-2.5 py-1.5 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Secondary Row: Outcome & Goals Market */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* Outcome Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Issue (1X2) :</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["ALL", "1", "X", "2"] as const).map((out) => (
                <button
                  key={out}
                  onClick={() => setSelectedOutcome(out)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedOutcome === out
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {out === "ALL" ? "Tout" : out === "1" ? "Dom (1)" : out === "X" ? "Nul (X)" : "Ext (2)"}
                </button>
              ))}
            </div>
          </div>

          {/* Goals Market Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Marché Buts :</span>
            <select
              value={selectedGoalMarket}
              onChange={(e) => setSelectedGoalMarket(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 focus:border-cyan-500 text-white text-xs font-bold rounded-xl px-3 py-1.5 cursor-pointer outline-none"
            >
              <option value="ALL">Tous les résultats buts</option>
              <option value="OVER_25">Plus de 2.5 Buts (&gt; 2.5)</option>
              <option value="UNDER_25">Moins de 2.5 Buts (&lt; 2.5)</option>
              <option value="BTTS_YES">Les 2 Équipes Marquent (GG)</option>
              <option value="BTTS_NO">Au moins une équipe sans but (NG)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Statistics Ribbon for Current Query */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-amber-400" /> Matchs Trouvés
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white">{searchStats.total}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              / {database.length} Total
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-emerald-400">Victoires Dom (1)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-300">{searchStats.homeWinPct}%</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.homeWins} m.</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-amber-400">Matchs Nuls (X)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-300">{searchStats.drawPct}%</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.draws} m.</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-blue-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-blue-400">Victoires Ext (2)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-300">{searchStats.awayWinPct}%</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.awayWins} m.</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-cyan-400">Over 2.5 Buts</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-cyan-300">{searchStats.over25Pct}%</span>
            <span className="text-xs font-mono text-slate-400">G: {searchStats.avgGoals}/m</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-black uppercase text-purple-400">Score le plus fréquent</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-300">{searchStats.topExactScore}</span>
            <span className="text-xs font-mono text-slate-400">{searchStats.topScoreCount}x</span>
          </div>
        </div>
      </div>

      {/* Matching Results Section Header & Controls */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>BDD Matchs</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/40">
                {filteredMatches.length} / {database.length} matchs
              </span>
            </h2>

            {/* Filter Status Badge */}
            {activeFiltersCount > 0 && (
              <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-lg flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-cyan-400" />
                <span>{activeFiltersCount} filtre(s) actif(s)</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Restore / Reset Button */}
            {(activeFiltersCount > 0 || filteredMatches.length < database.length) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                title="Restaurer la base de données entière et réinitialiser tous les filtres"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurer Tous les Filtres</span>
              </button>
            )}

            {/* View Mode Switcher: Excel Table Grid vs Cards */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setDisplayMode("TABLE")}
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  displayMode === "TABLE"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Afficher les matchs sous forme de Tableau Excel structuré avec en-têtes"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tableau Excel</span>
              </button>
              <button
                onClick={() => setDisplayMode("CARDS")}
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  displayMode === "CARDS"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Afficher les matchs sous forme de cartes d'analyse"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cartes</span>
              </button>
            </div>
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <Search className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">
              Aucun match ne correspond à votre recherche
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Essayez de modifier vos critères de recherche ou réinitialisez les filtres pour afficher l'ensemble de la base de données.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
            >
              Afficher Tous les Matchs BDD
            </button>
          </div>
        ) : displayMode === "TABLE" ? (
          /* EXCEL DATA TABLE VIEW */
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur-md">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-900/90 text-[10px] font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 divide-x divide-slate-800/80 sticky top-0 z-10 select-none">
                  <th onClick={() => handleSort("id")} className="p-2.5 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>ID Match</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("eventCategoryId")} className="p-2.5 text-emerald-400 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Cat. ID</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("competitionName")} className="p-2.5 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Compétition</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("roundNumber")} className="p-2.5 text-center cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <span>J.</span>
                  </th>
                  <th onClick={() => handleSort("homeTeamName")} className="p-2.5 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <span>Équipe Domicile</span>
                  </th>
                  <th className="p-2.5 text-center text-slate-400">Rang D.</th>
                  <th onClick={() => handleSort("score")} className="p-2.5 text-center cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <span>Score FT</span>
                  </th>
                  <th className="p-2.5 text-center text-slate-400">Score HT</th>
                  <th onClick={() => handleSort("outcome")} className="p-2.5 text-center cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <span>Issue</span>
                  </th>
                  <th className="p-2.5 text-center text-slate-400">Buts</th>
                  <th className="p-2.5 text-center text-slate-400">Rang E.</th>
                  <th onClick={() => handleSort("awayTeamName")} className="p-2.5 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <span>Équipe Extérieur</span>
                  </th>
                  <th onClick={() => handleSort("homeOdds")} className="p-2.5 text-center text-emerald-400 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    Cote 1
                  </th>
                  <th onClick={() => handleSort("drawOdds")} className="p-2.5 text-center text-amber-400 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    Cote X
                  </th>
                  <th onClick={() => handleSort("awayOdds")} className="p-2.5 text-center text-blue-400 cursor-pointer hover:bg-slate-800/80 transition-colors">
                    Cote 2
                  </th>
                  <th className="p-2.5 text-center text-slate-300">1X</th>
                  <th className="p-2.5 text-center text-slate-300">12</th>
                  <th className="p-2.5 text-center text-slate-300">X2</th>
                  <th className="p-2.5 text-center text-cyan-400">&gt;2.5</th>
                  <th className="p-2.5 text-center text-slate-400">&lt;2.5</th>
                  <th className="p-2.5 text-center text-emerald-400">GG</th>
                  <th className="p-2.5 text-center text-slate-400">NG</th>
                  <th className="p-2.5 text-slate-300">Min. Buts</th>
                  <th className="p-2.5 text-center text-amber-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {sortedMatches.map((m, idx) => {
                  const strId = String(m.id);
                  const isH2HExpanded = expandedH2H[strId] || false;
                  const catId = m.eventCategoryId || m.competitionId || 0;
                  const ftScore = (m.score || "0-0").replace(":", "-").trim();
                  const htScore = (m.halfTimeScore || "0-0").replace(":", "-").trim();

                  const scoreParts = ftScore.split(/[:\-]/).map((s) => parseInt(s.trim(), 10) || 0);
                  const hScore = scoreParts[0] || 0;
                  const aScore = scoreParts[1] || 0;
                  const totalG = hScore + aScore;
                  const outcome = hScore > aScore ? "1" : aScore > hScore ? "2" : "X";

                  const outcomeBadge =
                    outcome === "1"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : outcome === "2"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40";

                  const bgRow = idx % 2 === 0 ? "bg-slate-900/60" : "bg-slate-950/80";

                  const is1X2Highlight = selectedOddsMarket === "1X2";
                  const isDCHighlight = selectedOddsMarket.startsWith("DC");
                  const isOUHighlight = selectedOddsMarket.startsWith("OU") || selectedOddsMarket.startsWith("OVER") || selectedOddsMarket.startsWith("UNDER");
                  const isBTTSHighlight = selectedOddsMarket.startsWith("BTTS");

                  const h2h = getH2HAnalysisForMatch(
                    { homeTeamName: m.homeTeamName, awayTeamName: m.awayTeamName } as any,
                    database
                  );

                  return (
                    <React.Fragment key={strId}>
                      <tr className={`${bgRow} hover:bg-amber-500/10 transition-colors divide-x divide-slate-800/40`}>
                        {/* ID Match */}
                        <td className="p-2.5 text-slate-400 font-bold text-[11px]">#{m.id}</td>

                        {/* Event Category ID */}
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-[11px]">
                            #{catId}
                          </span>
                        </td>

                        {/* Compétition */}
                        <td className="p-2.5 text-white font-sans font-bold text-xs max-w-[140px] truncate" title={m.competitionName}>
                          {m.competitionName}
                        </td>

                        {/* Journée */}
                        <td className="p-2.5 text-center text-slate-300 font-bold">J{m.roundNumber || 1}</td>

                        {/* Équipe Domicile */}
                        <td className="p-2.5 text-white font-sans font-black text-xs max-w-[150px] truncate" title={m.homeTeamName}>
                          {m.homeTeamName}
                        </td>

                        {/* Rang Domicile */}
                        <td className="p-2.5 text-center text-slate-400 text-[11px]">
                          {m.homeRank > 0 ? `#${m.homeRank}` : "-"}
                        </td>

                        {/* Score FT */}
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-400 font-black text-xs">
                            {ftScore}
                          </span>
                        </td>

                        {/* Score HT */}
                        <td className="p-2.5 text-center text-slate-400 text-[11px]">({htScore})</td>

                        {/* Issue 1X2 */}
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded border font-black text-xs ${outcomeBadge}`}>
                            {outcome}
                          </span>
                        </td>

                        {/* Total Buts */}
                        <td className="p-2.5 text-center text-slate-200 font-bold">{totalG}</td>

                        {/* Rang Extérieur */}
                        <td className="p-2.5 text-center text-slate-400 text-[11px]">
                          {m.awayRank > 0 ? `#${m.awayRank}` : "-"}
                        </td>

                        {/* Équipe Extérieur */}
                        <td className="p-2.5 text-white font-sans font-black text-xs max-w-[150px] truncate" title={m.awayTeamName}>
                          {m.awayTeamName}
                        </td>

                        {/* Cote 1 */}
                        <td className={`p-2.5 text-center text-emerald-400 font-bold ${is1X2Highlight ? "bg-amber-500/15" : ""}`}>
                          {m.homeOdds || "-"}
                        </td>

                        {/* Cote X */}
                        <td className={`p-2.5 text-center text-amber-400 font-bold ${is1X2Highlight ? "bg-amber-500/15" : ""}`}>
                          {m.drawOdds || "-"}
                        </td>

                        {/* Cote 2 */}
                        <td className={`p-2.5 text-center text-blue-400 font-bold ${is1X2Highlight ? "bg-amber-500/15" : ""}`}>
                          {m.awayOdds || "-"}
                        </td>

                        {/* Cote 1X */}
                        <td className={`p-2.5 text-center text-slate-300 ${isDCHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.doubleChanceOdds?.dc1X || "-"}
                        </td>

                        {/* Cote 12 */}
                        <td className={`p-2.5 text-center text-slate-300 ${isDCHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.doubleChanceOdds?.dc12 || "-"}
                        </td>

                        {/* Cote X2 */}
                        <td className={`p-2.5 text-center text-slate-300 ${isDCHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.doubleChanceOdds?.dcX2 || "-"}
                        </td>

                        {/* Cote >2.5 */}
                        <td className={`p-2.5 text-center text-cyan-400 font-bold ${isOUHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.overUnderOdds?.over25 || "-"}
                        </td>

                        {/* Cote <2.5 */}
                        <td className={`p-2.5 text-center text-slate-400 ${isOUHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.overUnderOdds?.under25 || "-"}
                        </td>

                        {/* Cote GG */}
                        <td className={`p-2.5 text-center text-emerald-400 font-bold ${isBTTSHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.bothTeamsScoreOdds?.yes || "-"}
                        </td>

                        {/* Cote NG */}
                        <td className={`p-2.5 text-center text-slate-400 ${isBTTSHighlight ? "bg-amber-500/15" : ""}`}>
                          {m.bothTeamsScoreOdds?.no || "-"}
                        </td>

                        {/* Minutages Buts */}
                        <td className="p-2.5 text-emerald-400 font-mono text-[11px] max-w-[120px] truncate" title={m.goalMinutes || ""}>
                          {m.goalMinutes || "-"}
                        </td>

                        {/* Actions */}
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleCopyMatch(m)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Copier la fiche match"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => toggleH2H(m.id)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                isH2HExpanded ? "bg-amber-500 text-slate-950" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                              }`}
                              title="Afficher l'historique H2H direct"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable H2H Row in Table */}
                      {isH2HExpanded && (
                        <tr className="bg-slate-950/95 border-b border-amber-500/30">
                          <td colSpan={24} className="p-4 space-y-3 font-sans">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4 text-amber-400" />
                                <span>Confrontations Directes H2H ({(h2h.directMatches || []).length}) : {m.homeTeamName} vs {m.awayTeamName}</span>
                              </h4>
                              {onCreateRuleFromDb && (
                                <button
                                  onClick={() =>
                                    onCreateRuleFromDb({
                                      id: `#RULE-${Date.now().toString().slice(-4)}`,
                                      betType: "1X2",
                                      generatedDate: new Date().toLocaleDateString("fr-FR"),
                                      title: `Règle de match ${m.homeTeamName} vs ${m.awayTeamName}`,
                                      conditionText: `IF Côte_Dom == ${m.homeOdds || 1.8} AND Journée == ${m.roundNumber || 1} THEN 1`,
                                      assignedLeagueId: m.competitionId || "ALL",
                                      assignedLeagueName: m.competitionName || "Toutes les ligues",
                                      mode: "Manuel",
                                      isActive: true,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 shadow cursor-pointer active:scale-95"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Créer Règle depuis ce Match</span>
                                </button>
                              )}
                            </div>

                            {(h2h.directMatches || []).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                Aucune autre confrontation directe enregistrée dans la BDD pour ces deux équipes.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
                                {(h2h.directMatches || []).map((dm) => (
                                  <div
                                    key={dm.id}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2 text-slate-200 font-bold">
                                      <span>{dm.homeTeamName}</span>
                                      <span className="font-mono text-amber-400 font-black px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                                        {dm.score}
                                      </span>
                                      <span>{dm.awayTeamName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                      <span>J{dm.roundNumber} (Cat. #{dm.eventCategoryId || dm.competitionId})</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedMatches.map((m) => {
              const strId = String(m.id);
              const isH2HExpanded = expandedH2H[strId] || false;
              const h2h = getH2HAnalysisForMatch(
                { homeTeamName: m.homeTeamName, awayTeamName: m.awayTeamName } as any,
                database
              );

              const ftScore = (m.score || "0-0").replace(":", "-").trim();
              const htScore = (m.halfTimeScore || "0-0").replace(":", "-").trim();
              const catId = m.eventCategoryId || m.competitionId || 0;

              return (
                <div
                  key={strId}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl transition-all relative overflow-hidden backdrop-blur-md space-y-4"
                >
                  {/* Top Bar: Comp / ID Event Category / Round / ID */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        {m.competitionName}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        ID Event Cat: #{catId}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-extrabold">
                        Journée {m.roundNumber || 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-[11px]">
                        Match ID: #{m.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Source: {m.source || "BDD"} ({m.extractedAt || ""})
                      </span>
                      <button
                        onClick={() => handleCopyMatch(m)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Copier la fiche match"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Main Match Info & Score */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Home Team */}
                    <div className="md:col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-sm shrink-0">
                        {m.homeTeamName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-base font-black text-white truncate">
                          {m.homeTeamName}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {m.homeRank > 0 && <span>Rang #{m.homeRank}</span>}
                          {m.homePoints !== undefined && m.homePoints > 0 && <span>• {m.homePoints} pts</span>}
                        </div>
                      </div>
                    </div>

                    {/* Score Box */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-inner">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl lg:text-3xl font-black text-amber-400 tracking-wider font-mono">
                          {ftScore}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 mt-1">
                        Score Mi-Temps : <span className="text-slate-200">{htScore}</span>
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-3">
                      <div className="space-y-0.5 text-left md:text-right min-w-0">
                        <h3 className="text-base font-black text-white truncate">
                          {m.awayTeamName}
                        </h3>
                        <div className="flex items-center justify-start md:justify-end gap-2 text-[11px] text-slate-400">
                          {m.awayRank > 0 && <span>Rang #{m.awayRank}</span>}
                          {m.awayPoints !== undefined && m.awayPoints > 0 && <span>• {m.awayPoints} pts</span>}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-black text-sm shrink-0">
                        {m.awayTeamName?.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Goal Minutes Timeline */}
                  {m.goalMinutes && (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-xs font-extrabold text-amber-400 shrink-0">
                        ⚽ Minutes Buts :
                      </span>
                      <span className="text-xs font-mono text-slate-200 truncate">
                        {m.goalMinutes}
                      </span>
                    </div>
                  )}

                  {/* Full Odds Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* 1X2 */}
                    <div className={`border rounded-xl p-2.5 text-center space-y-1 transition-all ${
                      selectedOddsMarket === "1X2" ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" : "bg-slate-950/80 border-slate-800"
                    }`}>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">1X2</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-emerald-400">1: {m.homeOdds || "-"}</span>
                        <span className="text-amber-400">X: {m.drawOdds || "-"}</span>
                        <span className="text-blue-400">2: {m.awayOdds || "-"}</span>
                      </div>
                    </div>

                    {/* Double Chance */}
                    <div className={`border rounded-xl p-2.5 text-center space-y-1 transition-all ${
                      selectedOddsMarket.startsWith("DC") ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" : "bg-slate-950/80 border-slate-800"
                    }`}>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Double Chance</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-slate-200">1X: {m.doubleChanceOdds?.dc1X || "-"}</span>
                        <span className="text-slate-200">12: {m.doubleChanceOdds?.dc12 || "-"}</span>
                        <span className="text-slate-200">X2: {m.doubleChanceOdds?.dcX2 || "-"}</span>
                      </div>
                    </div>

                    {/* Over / Under */}
                    <div className={`border rounded-xl p-2.5 text-center space-y-1 transition-all ${
                      selectedOddsMarket.startsWith("OU") || selectedOddsMarket.startsWith("OVER") || selectedOddsMarket.startsWith("UNDER") ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" : "bg-slate-950/80 border-slate-800"
                    }`}>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Over / Under 2.5</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-cyan-400">&gt;2.5: {m.overUnderOdds?.over25 || "-"}</span>
                        <span className="text-slate-400">&lt;2.5: {m.overUnderOdds?.under25 || "-"}</span>
                      </div>
                    </div>

                    {/* GG / NG */}
                    <div className={`border rounded-xl p-2.5 text-center space-y-1 transition-all ${
                      selectedOddsMarket.startsWith("BTTS") ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" : "bg-slate-950/80 border-slate-800"
                    }`}>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">BTTS (GG / NG)</span>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                        <span className="text-emerald-400">GG: {m.bothTeamsScoreOdds?.yes || "-"}</span>
                        <span className="text-slate-400">NG: {m.bothTeamsScoreOdds?.no || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & H2H Toggle Bar */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleH2H(m.id)}
                      className="text-xs font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {isH2HExpanded ? "Masquer Confrontations Directes" : `Voir Confrontations Directes H2H (${h2h.directMatches.length})`}
                      </span>
                      {isH2HExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {onCreateRuleFromDb && (
                      <button
                        onClick={() =>
                          onCreateRuleFromDb({
                            id: `#RULE-${Date.now().toString().slice(-4)}`,
                            betType: "1X2",
                            generatedDate: new Date().toLocaleDateString("fr-FR"),
                            title: `Règle de match ${m.homeTeamName} vs ${m.awayTeamName}`,
                            conditionText: `IF Côte_Dom == ${m.homeOdds || 1.8} AND Journée == ${m.roundNumber || 1} THEN 1`,
                            assignedLeagueId: m.competitionId || "ALL",
                            assignedLeagueName: m.competitionName || "Toutes les ligues",
                            mode: "Manuel",
                            isActive: true,
                          })
                        }
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer Règle depuis ce Match</span>
                      </button>
                    )}
                  </div>

                  {/* Collapsible H2H Section */}
                  {isH2HExpanded && (
                    <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 mt-2 animate-fadeIn">
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Historique des Confrontations Directes en BDD ({(h2h.directMatches || []).length})</span>
                      </h4>

                      {(h2h.directMatches || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Aucune autre confrontation directe trouvée pour ces deux équipes dans la BDD.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(h2h.directMatches || []).map((dm) => (
                            <div
                              key={dm.id}
                              className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 text-slate-300 font-bold">
                                <span>{dm.homeTeamName}</span>
                                <span className="font-mono text-amber-400 font-black px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                                  {dm.score}
                                </span>
                                <span>{dm.awayTeamName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                <span>J{dm.roundNumber} (Cat. #{dm.eventCategoryId || dm.competitionId})</span>
                                <span>MT: ({dm.halfTimeScore || "0-0"})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
