import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  SportyEntryPoint,
  SportyEvent,
  MatchTimeFilter,
  ApiConnectionState,
} from "./types";
import {
  getStoredToken,
  saveStoredToken,
  fetchEntryPoints,
  fetchAllDataForCompetitions,
  fetchInstantLeagueRound,
  fetchInstantLeagueResults,
  fetchInstantLeagueRanking,
  RankingTeam,
  classifyMatchStatus,
  CombinedMatchData,
} from "./services/sportyApi";

import { CompetitionRibbon } from "./components/CompetitionRibbon";
import { StatsBanner } from "./components/StatsBanner";
import { MatchTabs } from "./components/MatchTabs";
import { MatchCard } from "./components/MatchCard";
import { TokenSettingsModal } from "./components/TokenSettingsModal";
import { MatchDetailModal } from "./components/MatchDetailModal";
import { DataInspector } from "./components/DataInspector";
import { MatchResultsView } from "./components/MatchResultsView";
import { RankingView } from "./components/RankingView";
import { RulesView } from "./components/RulesView";

import { ExtractionView } from "./components/ExtractionView";
import { GlobalAnalysisView } from "./components/GlobalAnalysisView";

import { RuleItem, AIRecapPrediction, ExtractedMatchRecord } from "./types";
import { DEFAULT_RULES, processAllRules, runAIModeAnalysis } from "./utils/ruleEngine";

import { AlertTriangle, Key, RefreshCw, Trophy, Layers, Activity, Database, Download, ListOrdered, Sliders, Zap, BarChart3 } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string>(getStoredToken());
  const [entryPoints, setEntryPoints] = useState<SportyEntryPoint[]>([]);
  const [events, setEvents] = useState<SportyEvent[]>([]);
  const [instantMatches, setInstantMatches] = useState<CombinedMatchData[]>([]);
  const [rawInstantResponses, setRawInstantResponses] = useState<Record<number, any>>({});
  const [rankingTeams, setRankingTeams] = useState<RankingTeam[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(8035);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [fetchedRoundMatches, setFetchedRoundMatches] = useState<Record<string, any[]>>({});
  const [isRoundLoading, setIsRoundLoading] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<MatchTimeFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeMainView, setActiveMainView] = useState<"current" | "ranking" | "results" | "rules" | "extraction" | "database" | "global_analysis">("current");

  // Rules & AI State
  const [rules, setRules] = useState<RuleItem[]>(DEFAULT_RULES);
  const [rulesMode, setRulesMode] = useState<"Manuel" | "IA">("Manuel");
  const [aiRecaps, setAiRecaps] = useState<AIRecapPrediction[]>([]);
  const [isScanningAI, setIsScanningAI] = useState<boolean>(false);

  // Extraction & Database State
  const [extractedDatabase, setExtractedDatabase] = useState<ExtractedMatchRecord[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [autoExtractInterval, setAutoExtractInterval] = useState<number>(2);

  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(20);

  const [apiState, setApiState] = useState<ApiConnectionState>({
    status: "loading",
    message: "Initialisation de la collecte...",
  });

  // Modal controls
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<SportyEvent | CombinedMatchData | null>(null);

  // Core Data Collector Function
  const loadData = useCallback(async (currentToken: string) => {
    setApiState((prev) => ({ ...prev, status: "loading" }));

    // 1. Fetch entry points
    const epRes = await fetchEntryPoints(currentToken);

    if (epRes.status !== 200 || !epRes.data) {
      setApiState({
        status: "error",
        statusCode: epRes.status,
        message:
          epRes.status === 401
            ? "Jeton Authorization Bearer expiré ou non valide."
            : `Erreur API Sporty-Tech (Code HTTP ${epRes.status})`,
      });
      return;
    }

    setEntryPoints(epRes.data);

    // 2. Fetch both standard events and instant league matches
    const allData = await fetchAllDataForCompetitions(epRes.data, currentToken);

    setEvents(allData.events);
    setInstantMatches(allData.instantLeagueMatches);
    setRawInstantResponses(allData.rawInstantLeagueResponses);

    setApiState({
      status: "success",
      lastUpdated: new Date(),
    });
  }, []);

  // Initial load on mount or when token changes
  useEffect(() => {
    loadData(token);
  }, [token, loadData]);

  // Auto Refresh countdown timer
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadData(token);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, token, loadData]);

  // Handle Token Updates
  const handleSaveToken = (newToken: string) => {
    saveStoredToken(newToken);
    setToken(newToken);
    setCountdown(20);
    loadData(newToken);
  };

  // Filter entryPoints strictly to those with active virtual leagues or events
  const validEntryPoints = entryPoints.filter((ep) => {
    const raw = rawInstantResponses[ep.id];
    const hasRounds = raw && raw.rounds && Array.isArray(raw.rounds) && raw.rounds.length > 0;
    const hasEvents = events.some((ev) => ev.eventCategoryId === ep.id || ev.id === ep.id);
    return hasRounds || hasEvents;
  });

  // Active competition category ID (default to English League 8035 or first valid)
  const activeCategoryId =
    selectedCategoryId && validEntryPoints.some((ep) => ep.id === selectedCategoryId)
      ? selectedCategoryId
      : validEntryPoints[0]?.id || 8035;

  const currentEntryPoint = validEntryPoints.find((ep) => ep.id === activeCategoryId);

  // Extract rounds for active competition directly from API response
  const activeRawData = rawInstantResponses[activeCategoryId];

  // Gather all matches across all competitions for rule evaluation
  const allMatchesByComp = useMemo(() => {
    const map: Record<number, { matches: any[]; categoryName: string }> = {};

    entryPoints.forEach((ep) => {
      const raw = rawInstantResponses[ep.id];
      const matchSet = new Map<number, any>();

      if (raw && raw.rounds && Array.isArray(raw.rounds)) {
        raw.rounds.forEach((r: any) => {
          if (r.matches && Array.isArray(r.matches)) {
            r.matches.forEach((m: any) => {
              matchSet.set(m.id, { ...m, entryPointId: ep.id });
            });
          }
        });
      }

      // Also check fetchedRoundMatches
      Object.entries(fetchedRoundMatches).forEach(([key, val]) => {
        if (key.startsWith(`${ep.id}_`)) {
          const mList = Array.isArray(val) ? val : (val as any)?.matches || [];
          mList.forEach((m: any) => {
            matchSet.set(m.id, { ...m, entryPointId: ep.id });
          });
        }
      });

      map[ep.id] = {
        matches: Array.from(matchSet.values()),
        categoryName: ep.name,
      };
    });

    return map;
  }, [entryPoints, rawInstantResponses, fetchedRoundMatches]);

  // Process rules dynamically on matches data
  const evaluatedRules = useMemo(() => {
    return processAllRules(rules, allMatchesByComp);
  }, [rules, allMatchesByComp]);

  // Run AI Mode Scan across all competitions
  const handleRunAIScan = useCallback(() => {
    setIsScanningAI(true);
    setTimeout(() => {
      const recaps = runAIModeAnalysis(allMatchesByComp, entryPoints);
      setAiRecaps(recaps);
      setIsScanningAI(false);
    }, 600);
  }, [allMatchesByComp, entryPoints]);

  // Initial AI scan trigger
  useEffect(() => {
    if (Object.keys(allMatchesByComp).length > 0 && aiRecaps.length === 0) {
      const recaps = runAIModeAnalysis(allMatchesByComp, entryPoints);
      setAiRecaps(recaps);
    }
  }, [allMatchesByComp, entryPoints, aiRecaps.length]);

  const handleCreateRule = (newRule: Omit<RuleItem, "stats" | "evaluations">) => {
    setRules((prev) => [
      {
        ...newRule,
        stats: {
          successRate: 0,
          validatedCount: 0,
          failedCount: 0,
          pendingCount: 0,
          totalCount: 0,
        },
      },
      ...prev,
    ]);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const handleAddExtractedRecords = useCallback((newRecords: ExtractedMatchRecord[]) => {
    setExtractedDatabase((prev) => {
      const map = new Map<number, ExtractedMatchRecord>();
      // Preserve existing
      prev.forEach((rec) => map.set(rec.id, rec));
      // Update/insert new
      newRecords.forEach((rec) => map.set(rec.id, rec));
      return Array.from(map.values());
    });
  }, []);

  const handleClearDatabase = useCallback(() => {
    if (confirm("Voulez-vous vraiment vider toute la base de données extraite ?")) {
      setExtractedDatabase([]);
    }
  }, []);

  const handleDeleteRecord = useCallback((id: number) => {
    setExtractedDatabase((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(1);
  const [competitionResults, setCompetitionResults] = useState<Record<number, any[]>>({});

  // Construct full list of rounds for active competition dynamically
  const availableRoundsList = useMemo(() => {
    const rawRounds = activeRawData?.rounds || [];
    const resultsRounds = competitionResults[activeCategoryId] || [];

    const roundSet = new Set<number>();
    rawRounds.forEach((r: any) => {
      const num = Number(r.roundNumber);
      if (!isNaN(num) && num > 0) roundSet.add(num);
    });
    resultsRounds.forEach((r: any) => {
      const num = Number(r.roundNumber);
      if (!isNaN(num) && num > 0) roundSet.add(num);
    });

    let sortedNums = Array.from(roundSet).sort((a, b) => a - b);
    if (sortedNums.length === 0) {
      sortedNums = Array.from({ length: 38 }, (_, i) => i + 1);
    }

    return sortedNums.map((rNum) => {
      const rawMatch = rawRounds.find(
        (r: any) => Number(r.roundNumber) === rNum
      );
      const cachedData = fetchedRoundMatches[`${activeCategoryId}_${rNum}`];
      const cachedTime = Array.isArray(cachedData) ? undefined : cachedData?.expectedStart;

      return {
        roundNumber: rNum,
        expectedStart: rawMatch?.expectedStart || cachedTime,
      };
    });
  }, [activeRawData, competitionResults, activeCategoryId, fetchedRoundMatches]);

  // Auto-sync selected round to first available round in raw response when competition changes
  useEffect(() => {
    if (activeRawData?.rounds?.[0]?.roundNumber) {
      const firstNum = Number(activeRawData.rounds[0].roundNumber);
      if (firstNum && firstNum > 0) {
        setSelectedRoundNumber(firstNum);
        return;
      }
    }
    if (availableRoundsList.length > 0) {
      const firstRound = availableRoundsList[0]?.roundNumber;
      if (firstRound) setSelectedRoundNumber(firstRound);
    }
  }, [activeCategoryId, activeRawData]);

  // Fetch results & live ranking for the active competition to get finished scores and live standings
  useEffect(() => {
    if (!activeCategoryId) return;
    let isMounted = true;

    Promise.all([
      fetchInstantLeagueResults(activeCategoryId, 0, 100, token),
      fetchInstantLeagueRanking(activeCategoryId, token),
    ]).then(([resResults, resRanking]) => {
      if (!isMounted) return;

      if (resResults.data) {
        const roundsList = Array.isArray(resResults.data)
          ? resResults.data
          : (resResults.data as any).rounds || [];
        setCompetitionResults((prev) => ({
          ...prev,
          [activeCategoryId]: roundsList,
        }));
      }

      // Goal Stats Computation from Results
      const teamGoalMap: Record<string, { bp: number; bc: number }> = {};
      const resultsRounds = Array.isArray(resResults.data)
        ? resResults.data
        : (resResults.data as any)?.rounds || [];
      resultsRounds.forEach((r: any) => {
        (r.matches || []).forEach((m: any) => {
          const home = m.homeTeam?.name || m.name?.split(" vs ")[0];
          const away = m.awayTeam?.name || m.name?.split(" vs ")[1];
          if (m.score && home && away) {
            const parts = m.score.split(":").map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              if (!teamGoalMap[home]) teamGoalMap[home] = { bp: 0, bc: 0 };
              if (!teamGoalMap[away]) teamGoalMap[away] = { bp: 0, bc: 0 };
              teamGoalMap[home].bp += parts[0];
              teamGoalMap[home].bc += parts[1];
              teamGoalMap[away].bp += parts[1];
              teamGoalMap[away].bc += parts[0];
            }
          }
        });
      });

      if (resRanking.data && Array.isArray(resRanking.data)) {
        const enriched = resRanking.data.map((t: RankingTeam) => {
          const stats = teamGoalMap[t.name] || { bp: 0, bc: 0 };
          return {
            ...t,
            goalsFor: t.goalsFor ?? stats.bp,
            goalsAgainst: t.goalsAgainst ?? stats.bc,
            goalDifference: t.goalDifference ?? (stats.bp - stats.bc),
          };
        });
        setRankingTeams(enriched);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeCategoryId, token, apiState.lastUpdated]);

  // Auto-fetch missing or updated matches for selected round
  useEffect(() => {
    if (!selectedRoundNumber || !activeCategoryId) return;

    const eventCategoryId =
      activeRawData?.rounds?.[0]?.eventCategoryId || activeCategoryId;
    const cacheKey = `${activeCategoryId}_${selectedRoundNumber}`;

    let isMounted = true;
    if (!fetchedRoundMatches[cacheKey]) {
      setIsRoundLoading(true);
    }

    fetchInstantLeagueRound(selectedRoundNumber, Number(eventCategoryId), token).then((res) => {
      if (isMounted) {
        setIsRoundLoading(false);
        if (res.data && res.data.matches && Array.isArray(res.data.matches)) {
          setFetchedRoundMatches((prev) => ({
            ...prev,
            [cacheKey]: {
              matches: res.data.matches,
              expectedStart: res.data.expectedStart,
            },
          }));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedRoundNumber, activeCategoryId, token, apiState.lastUpdated]);

  // Determine matches source for the active round
  const activeCacheKey = `${activeCategoryId}_${selectedRoundNumber}`;
  const activeRawRoundObj = activeRawData?.rounds?.find(
    (r: any) => Number(r.roundNumber) === Number(selectedRoundNumber)
  );
  const cachedRoundData = fetchedRoundMatches[activeCacheKey];

  const rawMatchesForActiveRound =
    activeRawRoundObj?.matches && activeRawRoundObj.matches.length > 0
      ? activeRawRoundObj.matches
      : Array.isArray(cachedRoundData)
      ? cachedRoundData
      : cachedRoundData?.matches || [];

  const roundStartTime =
    activeRawRoundObj?.expectedStart ||
    (!Array.isArray(cachedRoundData) ? cachedRoundData?.expectedStart : undefined);

  // Map matches of the active round directly from real API data
  const activeRoundMatches: CombinedMatchData[] = rawMatchesForActiveRound.map((m: any) => {
    const matchStart =
      m.expectedStart && m.expectedStart !== "0001-01-01T00:00:00Z"
        ? m.expectedStart
        : roundStartTime;

    const homeName = m.homeTeam?.name || m.name?.split(" vs ")[0] || "Équipe 1";
    const awayName = m.awayTeam?.name || m.name?.split(" vs ")[1] || "Équipe 2";

    // Cross-reference with results for this round & teams if available
    const activeResultsRounds = competitionResults[activeCategoryId] || [];
    const matchedResultRound = activeResultsRounds.find(
      (r: any) => Number(r.roundNumber) === Number(selectedRoundNumber)
    );
    const resultMatch = matchedResultRound?.matches?.find(
      (rm: any) =>
        (rm.homeTeam?.name === homeName && rm.awayTeam?.name === awayName) ||
        rm.name === `${homeName} vs ${awayName}` ||
        rm.name === m.name
    );

    const matchScore = m.score || resultMatch?.score;
    const matchHtScore = m.halfTimeScore || resultMatch?.halfTimeScore;
    const matchGoals = m.goals || resultMatch?.goals;
    const matchScoresArr = m.scores || resultMatch?.scores;

    const isFinished = Boolean(matchScore || resultMatch);

    const homeRankObj = rankingTeams.find((t) => t.name === homeName);
    const awayRankObj = rankingTeams.find((t) => t.name === awayName);

    return {
      id: m.id || resultMatch?.id,
      entryPointId: activeCategoryId,
      eventCategoryId: activeRawRoundObj?.eventCategoryId || activeCategoryId,
      categoryName: currentEntryPoint?.name || "Compétition",
      roundNumber: selectedRoundNumber,
      homeTeamName: homeName,
      awayTeamName: awayName,
      homeStats: {
        points: homeRankObj?.points ?? m.homeTeam?.points ?? 0,
        position: homeRankObj?.position ?? m.homeTeam?.position ?? 0,
        won: homeRankObj?.won ?? m.homeTeam?.won ?? 0,
        lost: homeRankObj?.lost ?? m.homeTeam?.lost ?? 0,
        draw: homeRankObj?.draw ?? m.homeTeam?.draw ?? 0,
      },
      awayStats: {
        points: awayRankObj?.points ?? m.awayTeam?.points ?? 0,
        position: awayRankObj?.position ?? m.awayTeam?.position ?? 0,
        won: awayRankObj?.won ?? m.awayTeam?.won ?? 0,
        lost: awayRankObj?.lost ?? m.awayTeam?.lost ?? 0,
        draw: awayRankObj?.draw ?? m.awayTeam?.draw ?? 0,
      },
      expectedStart: matchStart || resultMatch?.expectedStart,
      expectedEnd: activeRawRoundObj?.expectedEnd,
      state: m.state || (isFinished ? "Ended" : "PreEvent"),
      preEventOrLive: m.preEventOrLive || (isFinished ? "Finished" : "PreEvent"),
      eventBetTypes: m.eventBetTypes || [],
      score: matchScore,
      halfTimeScore: matchHtScore,
      goals: matchGoals,
      scores: matchScoresArr,
      rawMatch: m,
    };
  });

  // Filter active round matches by status and search query
  const filteredMatches = activeRoundMatches.filter((match) => {
    // Status filter
    const status = classifyMatchStatus(match);
    if (currentTab === "live" && status !== "live") return false;
    if (currentTab === "upcoming" && status !== "upcoming") return false;
    if (currentTab === "finished" && status !== "finished") return false;

    // Search query filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const home = (match.homeTeamName || "").toLowerCase();
      const away = (match.awayTeamName || "").toLowerCase();
      if (!home.includes(q) && !away.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Sequential Round navigation handlers based on available rounds list
  const currentRoundIndex = availableRoundsList.findIndex((r) => r.roundNumber === selectedRoundNumber);

  const handlePrevRound = () => {
    if (availableRoundsList.length === 0) return;
    const nextIdx = currentRoundIndex > 0 ? currentRoundIndex - 1 : availableRoundsList.length - 1;
    setSelectedRoundNumber(availableRoundsList[nextIdx].roundNumber);
  };

  const handleNextRound = () => {
    if (availableRoundsList.length === 0) return;
    const nextIdx = currentRoundIndex < availableRoundsList.length - 1 ? currentRoundIndex + 1 : 0;
    setSelectedRoundNumber(availableRoundsList[nextIdx].roundNumber);
  };

  const handleSelectCategory = (catId: number) => {
    setSelectedCategoryId(catId);
  };

  // Count metrics for active round
  const liveCount = activeRoundMatches.filter((e) => classifyMatchStatus(e) === "live").length;
  const upcomingCount = activeRoundMatches.filter((e) => classifyMatchStatus(e) === "upcoming").length;
  const finishedCount = activeRoundMatches.filter((e) => classifyMatchStatus(e) === "finished").length;

  // Export JSON
  const handleExportData = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredMatches, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sporty_matches_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* LEFT NAVIGATION SIDEBAR / RUBAN DE NAVIGATION GAUCHE */}
      <aside className="w-full lg:w-64 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800/90 p-4 shrink-0 flex flex-col justify-between lg:h-screen lg:sticky lg:top-0 z-40 backdrop-blur-md shadow-2xl overflow-y-auto scrollbar-none">
        <div className="space-y-6">
          {/* Brand Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-slate-900 border border-emerald-500/40 rounded-xl shadow-inner">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <span className="font-black text-sm uppercase tracking-widest text-emerald-300">
                VIRTUAL SHOW
              </span>
            </div>
            {apiState.status === "error" && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" title="Erreur API" />
            )}
          </div>

          {/* Navigation Ruban Gauche */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 block">
              Navigation Pages
            </span>
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveMainView("current")}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "current"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Matchs Actuels</span>
              </button>

              <button
                onClick={() => setActiveMainView("ranking")}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "ranking"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Classement</span>
              </button>

              <button
                onClick={() => setActiveMainView("results")}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "results"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Match | Résultat</span>
              </button>

              <div className="h-[1px] bg-slate-800 my-1" />

              <button
                onClick={() => setActiveMainView("rules")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "rules"
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50"
                    : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4" />
                  <span>RULES</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/40 font-mono">
                  {rules.length}
                </span>
              </button>

              <button
                onClick={() => setActiveMainView("extraction")}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "extraction"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/50"
                    : "text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60"
                }`}
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>EXTRACTION</span>
              </button>

              <button
                onClick={() => setActiveMainView("database")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "database"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>DATABASE</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/40 font-mono">
                  {extractedDatabase.length}
                </span>
              </button>

              <button
                onClick={() => setActiveMainView("global_analysis")}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "global_analysis"
                    ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-300/50"
                    : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/60"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>ANALYSER GLOBALE</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Quick Controls & Status in Left Sidebar */}
        <div className="space-y-3 pt-4 border-t border-slate-800/90 mt-4">
          <div className="flex items-center justify-between gap-2">
            {/* Live Auto-Refresh */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all active:scale-95 cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title="Activer/Désactiver l'actualisation automatique de 20s"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  autoRefresh && apiState.status === "loading" ? "animate-spin text-emerald-400" : ""
                }`}
              />
              <span>Live {autoRefresh ? `(${countdown}s)` : "Off"}</span>
            </button>

            {/* Refresh Manual */}
            <button
              onClick={() => {
                setCountdown(20);
                loadData(token);
              }}
              disabled={apiState.status === "loading"}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Actualiser les données immédiatement"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  apiState.status === "loading" ? "animate-spin text-emerald-400" : ""
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Modifier le Jeton Bearer"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Token</span>
            </button>

            <button
              onClick={() => setIsInspectorOpen(true)}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all cursor-pointer"
              title="Inspecter Raw JSON"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>JSON</span>
            </button>
          </div>

          <button
            onClick={handleExportData}
            disabled={activeRoundMatches.length === 0}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter JSON</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Frozen Competition Ribbon */}
        {validEntryPoints.length > 0 && (
          <CompetitionRibbon
            entryPoints={validEntryPoints}
            selectedCategoryId={activeCategoryId}
            onSelectCategory={handleSelectCategory}
          />
        )}

        {activeMainView === "current" ? (
          <div>
            {/* Match Time Status Tabs & Round Page Navigation & Search */}
            <MatchTabs
              currentRoundNumber={selectedRoundNumber}
              roundStartTime={roundStartTime}
              roundIndex={currentRoundIndex >= 0 ? currentRoundIndex : 0}
              totalRounds={availableRoundsList.length}
              availableRoundsList={availableRoundsList}
              onSelectRoundIndex={(idx) => {
                const r = availableRoundsList[idx];
                if (r) setSelectedRoundNumber(Number(r.roundNumber));
              }}
              onPrevRound={handlePrevRound}
              onNextRound={handleNextRound}
              currentTab={currentTab}
              onTabChange={(tab) => setCurrentTab(tab)}
              counts={{
                all: activeRoundMatches.length,
                live: liveCount,
                upcoming: upcomingCount,
                finished: finishedCount,
              }}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
              {/* Token Error Banner */}
              {apiState.status === "error" && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-rose-200">
                        Jeton Bearer Expiré ou Non Autorisé
                      </h3>
                      <p className="text-xs text-rose-300/80">
                        L&apos;API Sporty-Tech a retourné un code d&apos;erreur. Cliquez ci-contre pour mettre à jour votre jeton Bearer.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTokenModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all shrink-0 flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>Modifier le Jeton Bearer</span>
                  </button>
                </div>
              )}

              {/* Loading State */}
              {(apiState.status === "loading" || isRoundLoading) && activeRoundMatches.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-block p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  </div>
                  <h3 className="text-base font-bold text-slate-200">
                    Collecte des données du Round depuis Sporty-Tech...
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Récupération des matchs, cotes et classements du Round sélectionné.
                  </p>
                </div>
              )}

              {/* Match Cards Grid */}
              {filteredMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMatches.map((ev, idx) => (
                    <MatchCard
                      key={ev.id || idx}
                      event={ev}
                      matchIndex={idx + 1}
                      database={extractedDatabase}
                      onSelectEvent={(e) => setSelectedEvent(e)}
                    />
                  ))}
                </div>
              ) : (
                !isRoundLoading && apiState.status !== "loading" && (
                  <div className="py-16 text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-300">Aucun match trouvé</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Aucun match ne correspond aux filtres sélectionnés (compétition, plage horaire ou recherche).
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setCurrentTab("all");
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 transition-colors"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                )
              )}
            </main>
          </div>
        ) : activeMainView === "ranking" ? (
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
            <RankingView
              teams={rankingTeams}
              categoryName={currentEntryPoint?.name || "Ligue Virtuelle"}
              isLoading={apiState.status === "loading"}
              onRefresh={() => loadData(token)}
              lastUpdated={apiState.lastUpdated}
              resultsRounds={competitionResults[activeCategoryId] || []}
              rawRoundsData={activeRawData?.rounds || []}
            />
          </main>
      ) : activeMainView === "results" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <MatchResultsView
            entryPoints={validEntryPoints}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
            token={token}
            database={extractedDatabase}
          />
        </main>
      ) : activeMainView === "rules" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <RulesView
            rules={evaluatedRules}
            entryPoints={validEntryPoints}
            activeMode={rulesMode}
            onModeChange={(m) => setRulesMode(m)}
            onCreateRule={handleCreateRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
            aiRecaps={aiRecaps}
            onRunAIScan={handleRunAIScan}
            isScanningAI={isScanningAI}
          />
        </main>
      ) : activeMainView === "global_analysis" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <GlobalAnalysisView
            database={extractedDatabase}
            entryPoints={validEntryPoints}
            allMatchesByComp={allMatchesByComp}
            onCreateRuleFromDb={handleCreateRule}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <ExtractionView
            entryPoints={validEntryPoints}
            activeCategoryId={activeCategoryId}
            extractedDatabase={extractedDatabase}
            onAddExtractedRecords={handleAddExtractedRecords}
            onClearDatabase={handleClearDatabase}
            onDeleteRecord={handleDeleteRecord}
            isExtracting={isExtracting}
            setIsExtracting={setIsExtracting}
            autoExtractInterval={autoExtractInterval}
            setAutoExtractInterval={setAutoExtractInterval}
            allMatchesByComp={allMatchesByComp}
            onCreateRuleFromDb={handleCreateRule}
          />
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/90 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sporty Live Collector &bull; Données en direct de Bet261 / Sporty-Tech API (InstantLeagues)
          </span>
          <span className="text-slate-600">
            Dernière mise à jour: {apiState.lastUpdated ? apiState.lastUpdated.toLocaleTimeString() : "-"}
          </span>
        </div>
      </footer>
      </div>

      {/* Modals & Drawers */}
      <TokenSettingsModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentToken={token}
        onSaveToken={handleSaveToken}
      />

      <MatchDetailModal
        event={selectedEvent}
        database={extractedDatabase}
        onClose={() => setSelectedEvent(null)}
      />

      <DataInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        entryPoints={entryPoints}
        events={events}
        bearerToken={token}
      />
    </div>
  );
}
