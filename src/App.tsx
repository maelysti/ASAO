import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

import { BulletView } from "./components/BulletView";
import { ExtractionView } from "./components/ExtractionView";
import { GlobalAnalysisView } from "./components/GlobalAnalysisView";
import { ToolStrategyView } from "./components/ToolStrategyView";
import { SafeParlayBanner } from "./components/SafeParlayBanner";
import { RuleStatsRibbon } from "./components/RuleStatsRibbon";

import { RuleItem, AIRecapPrediction, ExtractedMatchRecord } from "./types";
import { DEFAULT_RULES, processAllRules, runAIModeAnalysis } from "./utils/ruleEngine";
import { getH2HAnalysisForMatch } from "./utils/globalAnalysisEngine";

import { AlertTriangle, Key, RefreshCw, Trophy, Layers, Activity, Database, Download, ListOrdered, Sliders, Zap, BarChart3, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight, Wrench, Clock, Flame } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string>(getStoredToken());
  const [entryPoints, setEntryPoints] = useState<SportyEntryPoint[]>([]);
  const [events, setEvents] = useState<SportyEvent[]>([]);
  const [instantMatches, setInstantMatches] = useState<CombinedMatchData[]>([]);
  const [rawInstantResponses, setRawInstantResponses] = useState<Record<number, any>>({});
  const [rankingTeams, setRankingTeams] = useState<RankingTeam[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("virtual_show_sidebar_collapsed") === "true";
  });

  // Live real-time clock with seconds
  const [clockTime, setClockTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("virtual_show_sidebar_collapsed", isSidebarCollapsed ? "true" : "false");
  }, [isSidebarCollapsed]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(8035);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [fetchedRoundMatches, setFetchedRoundMatches] = useState<Record<string, any[]>>({});
  const [isRoundLoading, setIsRoundLoading] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<MatchTimeFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeRuleFilter, setActiveRuleFilter] = useState<string | null>(null);
  const [activeBetFilter, setActiveBetFilter] = useState<string | null>(null);
  const [activeMainView, setActiveMainView] = useState<"current" | "ranking" | "results" | "bullet" | "rules" | "extraction" | "database" | "global_analysis" | "tool">("current");

  // Rules & AI State
  const [rules, setRules] = useState<RuleItem[]>(() => {
    try {
      const saved = localStorage.getItem("bullet_sporty_rules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_RULES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("bullet_sporty_rules", JSON.stringify(rules));
    } catch {
      // ignore
    }
  }, [rules]);
  const [rulesMode, setRulesMode] = useState<"Manuel" | "IA">("Manuel");
  const [aiRecaps, setAiRecaps] = useState<AIRecapPrediction[]>([]);
  const [isScanningAI, setIsScanningAI] = useState<boolean>(false);

  // Extraction & Database State
  const [extractedDatabase, setExtractedDatabase] = useState<ExtractedMatchRecord[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [autoExtractInterval, setAutoExtractInterval] = useState<number>(2);

  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(10);

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

  // Auto Refresh countdown timer (10s)
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadData(token);
          return 10;
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
    setCountdown(10);
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
  const [silentUpdates, setSilentUpdates] = useState<boolean>(true);
  const prevCategoryRef = useRef<number>(activeCategoryId);
  const autoAdvancedRoundsRef = useRef<Set<string>>(new Set());
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

  // Redirect handler to jump straight to the closest active or upcoming round (journée)
  const handleGoToClosestMatch = useCallback(() => {
    const now = Date.now();
    let bestRoundNumber: number | null = null;
    let minDiff = Infinity;

    // 1. Check all available rounds for the one with expectedStart closest to current time
    if (availableRoundsList.length > 0) {
      for (const r of availableRoundsList) {
        if (r.expectedStart) {
          const startMs = new Date(r.expectedStart).getTime();
          if (!isNaN(startMs)) {
            const diff = Math.abs(startMs - now);
            if (diff < minDiff) {
              minDiff = diff;
              bestRoundNumber = Number(r.roundNumber);
            }
          }
        }
      }
    }

    // 2. Fall back to activeRawData.rounds[0] if no timestamp matched or if minDiff is large
    if ((bestRoundNumber === null || minDiff > 12 * 3600 * 1000) && activeRawData?.rounds?.[0]?.roundNumber) {
      const rawNum = Number(activeRawData.rounds[0].roundNumber);
      if (!isNaN(rawNum) && rawNum > 0) {
        bestRoundNumber = rawNum;
      }
    }

    // 3. Fall back to first round in availableRoundsList
    if (bestRoundNumber === null && availableRoundsList.length > 0) {
      bestRoundNumber = Number(availableRoundsList[0].roundNumber);
    }

    if (bestRoundNumber !== null) {
      setSelectedRoundNumber(bestRoundNumber);
      setCurrentTab("all");
    }

    setTimeout(() => {
      const gridEl = document.getElementById("match-grid-container");
      if (gridEl) {
        gridEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }, [availableRoundsList, activeRawData]);

  // Auto-sync selected round to first available round in raw response when competition changes, or if silentUpdates is false
  useEffect(() => {
    const isCategoryChanged = prevCategoryRef.current !== activeCategoryId;
    if (isCategoryChanged) {
      prevCategoryRef.current = activeCategoryId;
    }

    if (isCategoryChanged || !silentUpdates) {
      handleGoToClosestMatch();
    }
  }, [activeCategoryId, silentUpdates, handleGoToClosestMatch]);

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
  const matchedResultRound = (competitionResults[activeCategoryId] || []).find(
    (r: any) => Number(r.roundNumber) === Number(selectedRoundNumber)
  );

  const cachedMatchesArray = Array.isArray(cachedRoundData)
    ? cachedRoundData
    : cachedRoundData?.matches;

  const rawMatchesForActiveRound =
    activeRawRoundObj?.matches && activeRawRoundObj.matches.length > 0
      ? activeRawRoundObj.matches
      : cachedMatchesArray && cachedMatchesArray.length > 0
      ? cachedMatchesArray
      : matchedResultRound?.matches && matchedResultRound.matches.length > 0
      ? matchedResultRound.matches
      : [];

  const roundStartTime =
    activeRawRoundObj?.expectedStart ||
    (!Array.isArray(cachedRoundData) ? cachedRoundData?.expectedStart : undefined) ||
    matchedResultRound?.expectedStart;

  // Auto-switch to NEXT round when current round start time has elapsed by 1 min 15 sec (+75000 ms) AND auto-redirection (Cloche) is ACTIVE (!silentUpdates)
  useEffect(() => {
    if (silentUpdates || !roundStartTime) return;

    const interval = setInterval(() => {
      try {
        const startMs = new Date(roundStartTime).getTime();
        if (isNaN(startMs)) return;

        const now = Date.now();
        // 1 minute 15 seconds = 75,000 milliseconds
        if (now >= startMs + 75000) {
          const advanceKey = `${activeCategoryId}_${selectedRoundNumber}_${roundStartTime}`;
          if (!autoAdvancedRoundsRef.current.has(advanceKey)) {
            autoAdvancedRoundsRef.current.add(advanceKey);
            const curIdx = availableRoundsList.findIndex(
              (r) => Number(r.roundNumber) === Number(selectedRoundNumber)
            );
            if (curIdx >= 0 && curIdx < availableRoundsList.length - 1) {
              const nextRound = availableRoundsList[curIdx + 1];
              if (nextRound && Number(nextRound.roundNumber) !== Number(selectedRoundNumber)) {
                setSelectedRoundNumber(Number(nextRound.roundNumber));
              }
            }
          }
        }
      } catch (err) {
        console.error("Auto round switch error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [silentUpdates, roundStartTime, activeCategoryId, selectedRoundNumber, availableRoundsList]);

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

    // Rule Filter
    if (activeRuleFilter) {
      const h2h = getH2HAnalysisForMatch(match, extractedDatabase);
      if (h2h.applicableRule?.ruleId !== activeRuleFilter) return false;
    }

    // Bet Type Filter
    if (activeBetFilter) {
      const h2h = getH2HAnalysisForMatch(match, extractedDatabase);
      const actionBet = h2h.applicableRule?.actionBet || "";
      const pred = h2h.prediction || "";
      if (!actionBet.includes(activeBetFilter) && pred !== activeBetFilter) return false;
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
      <aside
        className={`w-full ${
          isSidebarCollapsed ? "lg:w-20 p-2.5" : "lg:w-64 p-4"
        } bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800/90 shrink-0 flex flex-col justify-between lg:h-screen lg:sticky lg:top-0 z-40 backdrop-blur-md shadow-2xl overflow-y-auto scrollbar-none transition-all duration-300`}
      >
        <div className="space-y-6">
          {/* Brand Logo & Title with Toggle Button */}
          <div className="flex items-center justify-between gap-2">
            {!isSidebarCollapsed ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-slate-900 border border-emerald-500/40 rounded-xl shadow-inner flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-300 truncate">
                    VIRTUAL SHOW
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/90 border border-emerald-400/40 rounded-lg text-emerald-300 font-mono text-xs font-black shadow-sm shrink-0">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                  <span>{clockTime || "--:--:--"}</span>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center p-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-slate-900 border border-emerald-500/40 rounded-xl shadow-inner mx-auto cursor-pointer"
                title={`VIRTUAL SHOW - ${clockTime}`}
                onClick={() => setIsSidebarCollapsed(false)}
              >
                <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-mono text-[10px] text-emerald-300 font-bold mt-1">{clockTime}</span>
              </div>
            )}

            {/* Collapse / Expand Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer hidden lg:flex items-center justify-center shrink-0"
              title={isSidebarCollapsed ? "Agrandir le ruban de navigation" : "Réduire le ruban de navigation"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Ruban Gauche */}
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 block">
                Navigation Pages
              </span>
            )}
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveMainView("current")}
                title="Matchs Actuels"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "current"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Matchs Actuels</span>}
              </button>

              <button
                onClick={() => setActiveMainView("ranking")}
                title="Classement"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "ranking"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Classement</span>}
              </button>

              <button
                onClick={() => setActiveMainView("results")}
                title="Match | Résultat"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "results"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Match | Résultat</span>}
              </button>

              <div className="h-[1px] bg-slate-800 my-1" />

              {/* BULLET RUBBON ITEM */}
              <button
                onClick={() => setActiveMainView("bullet")}
                title="BULLET INTEL"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "bullet"
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50"
                    : "text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
                  {!isSidebarCollapsed && <span className="font-extrabold uppercase">BULLET</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    BDD +
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveMainView("rules")}
                title="RULES"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "rules"
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50"
                    : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span>RULES</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/40 font-mono">
                    {rules.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveMainView("extraction")}
                title="EXTRACTION"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "extraction"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/50"
                    : "text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60"
                }`}
              >
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">EXTRACTION</span>}
              </button>

              <button
                onClick={() => setActiveMainView("database")}
                title="DATABASE"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "database"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/50"
                    : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  {!isSidebarCollapsed && <span>DATABASE</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/40 font-mono">
                    {extractedDatabase.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveMainView("global_analysis")}
                title="ANALYSE & TOOL INTEL"
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-2.5"
                } rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeMainView === "global_analysis" || activeMainView === "tool"
                    ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-300/50"
                    : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">ANALYSE & TOOL INTEL</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/60 text-emerald-950 font-black border border-slate-950/20">
                    ALGO +
                  </span>
                )}
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
              className={`flex-1 flex items-center justify-center gap-1.5 ${
                isSidebarCollapsed ? "p-2" : "px-3 py-2"
              } rounded-xl text-xs font-extrabold border transition-all active:scale-95 cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title="Activer/Désactiver l'actualisation automatique de 10s"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${
                  autoRefresh && apiState.status === "loading" ? "animate-spin text-emerald-400" : ""
                }`}
              />
              {!isSidebarCollapsed && <span>Live {autoRefresh ? `(${countdown}s)` : "Off"}</span>}
            </button>

            {/* Refresh Manual */}
            <button
              onClick={() => {
                setCountdown(10);
                loadData(token);
              }}
              disabled={apiState.status === "loading"}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              title="Actualiser les données immédiatement"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  apiState.status === "loading" ? "animate-spin text-emerald-400" : ""
                }`}
              />
            </button>
          </div>

          <div className={`grid ${isSidebarCollapsed ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Modifier le Jeton Bearer"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {!isSidebarCollapsed && <span>Token</span>}
            </button>

            <button
              onClick={() => setIsInspectorOpen(true)}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all cursor-pointer"
              title="Inspecter Raw JSON"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {!isSidebarCollapsed && <span>JSON</span>}
            </button>
          </div>

          <button
            onClick={handleExportData}
            disabled={activeRoundMatches.length === 0}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Exporter JSON"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            {!isSidebarCollapsed && <span>Exporter JSON</span>}
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
              onGoToClosestMatch={handleGoToClosestMatch}
              categoryName={currentEntryPoint?.name}
              silentUpdates={silentUpdates}
              onToggleSilentUpdates={() => setSilentUpdates((prev) => !prev)}
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

              {/* Statistic Ribbon Recap for all Applied Rules */}
              {activeRoundMatches.length > 0 && (
                <RuleStatsRibbon
                  matches={activeRoundMatches}
                  database={extractedDatabase}
                  activeRuleFilter={activeRuleFilter}
                  onSelectRuleFilter={(ruleId) => setActiveRuleFilter(ruleId)}
                  activeBetFilter={activeBetFilter}
                  onSelectBetFilter={(bet) => setActiveBetFilter(bet)}
                />
              )}

              {/* Safe Parlay Generator Banner */}
              {activeRoundMatches.length > 0 && (
                <SafeParlayBanner
                  matches={activeRoundMatches}
                  database={extractedDatabase}
                  onSelectMatch={(e) => setSelectedEvent(e)}
                />
              )}

              {/* Match Cards Grid */}
              {filteredMatches.length > 0 ? (
                <div id="match-grid-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMatches.map((ev, idx) => (
                    <MatchCard
                      key={ev.id || idx}
                      event={ev}
                      matchIndex={idx + 1}
                      database={extractedDatabase}
                      activeRules={evaluatedRules}
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
            onAutoSaveResultsToDatabase={handleAddExtractedRecords}
          />
        </main>
      ) : activeMainView === "bullet" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <BulletView
            database={extractedDatabase}
            entryPoints={validEntryPoints}
            allMatchesByComp={allMatchesByComp}
            onCreateRule={handleCreateRule}
            activeRules={evaluatedRules}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
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
      ) : activeMainView === "tool" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          <ToolStrategyView
            database={extractedDatabase}
            entryPoints={validEntryPoints}
            onCreateRuleFromDb={handleCreateRule}
            onNavigateToView={(view) => setActiveMainView(view)}
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
        activeRules={evaluatedRules}
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
