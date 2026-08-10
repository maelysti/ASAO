import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { GoogleDriveModal } from "./GoogleDriveModal";
import { parseMatchScoreDetails } from "../utils/scoreUtils";
import {
  Download,
  Upload,
  Play,
  Square,
  RefreshCw,
  Database,
  FileSpreadsheet,
  FileCode,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Layers,
  Sparkles,
  Info,
  Sliders,
  Trash2,
  List,
  Terminal,
  Eye,
  X,
  Check,
  Activity,
  Award,
  Key,
  Settings,
  CloudUpload,
  HardDrive,
  ShieldCheck,
  ExternalLink,
  Folder,
} from "lucide-react";
import {
  ExtractedMatchRecord,
  SportyEntryPoint,
  AIDatabaseRuleInsight,
  RuleItem,
} from "../types";

interface ExtractionViewProps {
  entryPoints: SportyEntryPoint[];
  activeCategoryId: number;
  activeEventCategoryId?: number;
  extractedDatabase: ExtractedMatchRecord[];
  onAddExtractedRecords: (records: ExtractedMatchRecord[]) => void;
  onClearDatabase: () => void;
  onDeleteRecord: (id: number) => void;
  isExtracting: boolean;
  setIsExtracting: (extracting: boolean) => void;
  autoExtractInterval: number;
  setAutoExtractInterval: (sec: number) => void;
  allMatchesByComp: Record<number, { matches: any[]; categoryName: string }>;
  onCreateRuleFromDb: (rule: Omit<RuleItem, "stats" | "evaluations">) => void;
}

interface MatrixLogEntry {
  id: string;
  timestamp: string;
  type: "INFO" | "SUCCESS" | "WARN" | "MATRIX";
  message: string;
}

export const ExtractionView: React.FC<ExtractionViewProps> = ({
  entryPoints,
  activeCategoryId,
  activeEventCategoryId,
  extractedDatabase,
  onAddExtractedRecords,
  onClearDatabase,
  onDeleteRecord,
  isExtracting,
  setIsExtracting,
  autoExtractInterval,
  setAutoExtractInterval,
  allMatchesByComp,
  onCreateRuleFromDb,
}) => {
  const [activeTab, setActiveTab] = useState<"extraction" | "database" | "ai_analysis">("extraction");
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<number | "ALL">("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [strictScoreOnly, setStrictScoreOnly] = useState<boolean>(true);

  // Gemini API Key & Auto AI Analysis Settings
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("SPORTY_GEMINI_API_KEY") || "";
  });
  const [autoAiAnalysis, setAutoAiAnalysis] = useState<boolean>(() => {
    return localStorage.getItem("SPORTY_AUTO_AI_ANALYSIS") !== "false";
  });
  const [showGeminiConfigModal, setShowGeminiConfigModal] = useState<boolean>(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState<boolean>(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string>("maelystia.rmj@gmail.com");
  const DEFAULT_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1TPg14mpTyGvRSpHM2_VsFegSnk6Yu5YA?usp=sharing";
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(() => {
    return localStorage.getItem("SPORTY_DRIVE_FOLDER_URL") || DEFAULT_DRIVE_FOLDER;
  });

  const handleImportFromDrive = (importedRecords: ExtractedMatchRecord[], sourceFileName: string) => {
    onAddExtractedRecords(importedRecords);
    addLog("SUCCESS", `[GOOGLE_DRIVE] 📥 Base de données synchronisée : ${importedRecords.length} enregistrements importés depuis "${sourceFileName}".`);
  };

  // AI & Modal State
  const [dbAiInsights, setDbAiInsights] = useState<AIDatabaseRuleInsight[]>([]);
  const [isAnalyzingDb, setIsAnalyzingDb] = useState<boolean>(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<ExtractedMatchRecord | null>(null);

  // Matrix Live Console Logs
  const [logs, setLogs] = useState<MatrixLogEntry[]>([
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString("fr-FR"),
      type: "MATRIX",
      message: "ARCHIVE_ENGINE initialized. Ready for live match & full odds extraction.",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);

  const addLog = (type: "INFO" | "SUCCESS" | "WARN" | "MATRIX", message: string) => {
    const time = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [
      ...prev.slice(-80), // Keep last 80 logs
      { id: `${Date.now()}_${Math.random()}`, timestamp: time, type, message },
    ]);
  };

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Phase & Deduplication Tracking
  const [extractionPhase, setExtractionPhase] = useState<"PAST_ARCHIVE" | "LIVE_STREAM">("PAST_ARCHIVE");
  const [duplicatesAvoided, setDuplicatesAvoided] = useState<number>(0);
  const [currentRoundProgress, setCurrentRoundProgress] = useState<number>(1);

  // Helper to resolve exact score from match payload provided by Bet261 / Sporty API
  const getExactMatchScore = (m: any): { finalScore: string; halfTimeScore: string; hasScore: boolean } => {
    const raw = m?.rawMatch || {};

    const scoreCandidates = [
      m?.score,
      raw?.score,
      m?.finalScore,
      raw?.finalScore,
      m?.matchScore,
      raw?.matchScore,
      m?.result,
      raw?.result,
    ];

    let resolvedScore: string | null = null;
    for (const sc of scoreCandidates) {
      if (sc !== undefined && sc !== null && typeof sc === "string" && sc.trim().length > 0) {
        const norm = sc.replace(":", "-").trim();
        if (/^\d+\s*-\s*\d+$/.test(norm)) {
          resolvedScore = norm;
          break;
        }
      }
    }

    if (!resolvedScore) {
      const h = m?.homeScore ?? raw?.homeScore ?? m?.homeTeamScore ?? raw?.homeTeamScore;
      const a = m?.awayScore ?? raw?.awayScore ?? m?.awayTeamScore ?? raw?.awayTeamScore;
      if (h !== undefined && h !== null && a !== undefined && a !== null) {
        const numH = Number(h);
        const numA = Number(a);
        if (!isNaN(numH) && !isNaN(numA)) {
          resolvedScore = `${numH}-${numA}`;
        }
      }
    }

    const scoresArr = (Array.isArray(m?.scores) && m.scores.length > 0) ? m.scores
      : (Array.isArray(raw?.scores) && raw.scores.length > 0) ? raw.scores
      : [];

    let resolvedHtScore: string | null = null;

    if (scoresArr.length > 0) {
      scoresArr.forEach((s: any) => {
        const typeStr = String(s.type || s.period || s.name || "").toUpperCase();
        let valStr = s.score || s.value || (s.homeScore !== undefined && s.awayScore !== undefined ? `${s.homeScore}-${s.awayScore}` : null);
        if (valStr) valStr = String(valStr).replace(":", "-").trim();

        if (typeStr.includes("HALF") || typeStr.includes("HT") || typeStr === "1ST" || typeStr === "1") {
          if (valStr && /^\d+\s*-\s*\d+$/.test(valStr)) {
            resolvedHtScore = valStr;
          }
        } else if (typeStr.includes("FULL") || typeStr.includes("FT") || typeStr === "2ND" || typeStr === "MAIN" || typeStr === "FINAL") {
          if (valStr && /^\d+\s*-\s*\d+$/.test(valStr) && !resolvedScore) {
            resolvedScore = valStr;
          }
        } else if (!resolvedScore && valStr && /^\d+\s*-\s*\d+$/.test(valStr)) {
          resolvedScore = valStr;
        }
      });
    }

    const rawGoals =
      (Array.isArray(m?.goals) && m.goals.length > 0) ? m.goals
        : (Array.isArray(m?.goalsDetail) && m.goalsDetail.length > 0) ? m.goalsDetail
        : (Array.isArray(raw?.goals) && raw.goals.length > 0) ? raw.goals
        : (Array.isArray(raw?.goalsDetail) && raw.goalsDetail.length > 0) ? raw.goalsDetail
        : [];

    if (!resolvedScore && rawGoals.length > 0) {
      const lastGoal = rawGoals[rawGoals.length - 1];
      if (lastGoal && lastGoal.homeScore !== undefined && lastGoal.awayScore !== undefined) {
        resolvedScore = `${lastGoal.homeScore}-${lastGoal.awayScore}`;
      } else {
        let hCount = 0;
        let aCount = 0;
        rawGoals.forEach((g: any) => {
          const rawTeam = String(g.team ?? g.side ?? g.teamType ?? "").toLowerCase();
          if (rawTeam === "home" || rawTeam === "1" || g.homeTeam === true || g.isHome === true) {
            hCount++;
          } else if (rawTeam === "away" || rawTeam === "2" || g.homeTeam === false || g.isHome === false) {
            aCount++;
          }
        });
        resolvedScore = `${hCount}-${aCount}`;
      }
    }

    if (!resolvedHtScore) {
      const htCandidates = [m?.halfTimeScore, raw?.halfTimeScore, m?.htScore, raw?.htScore];
      for (const ht of htCandidates) {
        if (ht !== undefined && ht !== null && typeof ht === "string" && ht.trim().length > 0) {
          const norm = ht.replace(":", "-").trim();
          if (/^\d+\s*-\s*\d+$/.test(norm)) {
            resolvedHtScore = norm;
            break;
          }
        }
      }
    }

    const hasScore = resolvedScore !== null;
    const finalScore = resolvedScore || "";
    const halfTimeScore = resolvedHtScore || "";

    return { finalScore, halfTimeScore, hasScore };
  };

  // Perform extraction logic (Phase 1: Past matches from Round 1 -> Phase 2: Live Stream)
  const performExtractionStep = React.useCallback(() => {
    const newExtracted: ExtractedMatchRecord[] = [];
    const timestamp = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Build existing ID map for strict deduplication
    const existingIds = new Set(extractedDatabase.map((rec) => rec.id));
    let scannedCount = 0;
    let dupCount = 0;

    // Flatten all matches across competitions and sort by roundNumber ascending (Round 1, 2, 3...)
    const allMatchesList: Array<{ match: any; compId: number; categoryName: string }> = [];

    Object.entries(allMatchesByComp).forEach(([catIdStr, compDataObj]) => {
      const compId = Number(catIdStr);
      const compData = compDataObj as { matches: any[]; categoryName: string };

      if (selectedLeagueFilter !== "ALL" && selectedLeagueFilter !== compId) {
        return;
      }

      if (compData && Array.isArray(compData.matches)) {
        compData.matches.forEach((m: any) => {
          allMatchesList.push({ match: m, compId, categoryName: compData.categoryName });
        });
      }
    });

    // Sort matches: Past/Finished matches first (by round 1 -> N), then Live/Upcoming
    allMatchesList.sort((a, b) => {
      const rA = a.match.round || a.match.roundNumber || 1;
      const rB = b.match.round || b.match.roundNumber || 1;
      return rA - rB;
    });

    let extractedPastInThisRun = 0;
    let maxRoundProcessed = 1;

    allMatchesList.forEach(({ match: m, compId, categoryName }) => {
      scannedCount++;
      const roundNum = m.round || m.roundNumber || 1;
      if (roundNum > maxRoundProcessed) maxRoundProcessed = roundNum;

      const homeName = m.homeTeam?.name || m.homeTeamName || (typeof m.homeTeam === "string" ? m.homeTeam : "") || m.name?.split(" vs ")[0]?.trim() || "Dom";
      const awayName = m.awayTeam?.name || m.awayTeamName || (typeof m.awayTeam === "string" ? m.awayTeam : "") || m.name?.split(" vs ")[1]?.trim() || "Ext";

      const rawMatchId = m.id || m.eventId || m.matchId || m.rawMatch?.id;
      const matchId = String(rawMatchId || `R${roundNum}_${homeName.toUpperCase().replace(/\s+/g, '')}_${awayName.toUpperCase().replace(/\s+/g, '')}`);

      // Deduplication check: if match is already in BDD, count as avoided duplicate
      if (existingIds.has(matchId)) {
        dupCount++;
        return;
      }

      // Extract exact score & halftime score from API payload (Bet261) using parseMatchScoreDetails
      const scoreDetails = parseMatchScoreDetails(m);

      const matchStatusStr = String(m.state || m.preEventOrLive || m.status || "").toLowerCase();
      const isPreEvent = matchStatusStr.includes("preevent") || matchStatusStr.includes("upcoming") || matchStatusStr.includes("notstarted") || matchStatusStr.includes("scheduled");

      // ABSOLUTE DIRECTIVE: DO NOT EXTRACT UNPLAYED / PRE-EVENT MATCHES OR MATCHES WITHOUT A REAL VALID SCORE FROM BET261
      if (!scoreDetails.hasScore || !scoreDetails.scoreStr || scoreDetails.scoreStr === "-" || isPreEvent) {
        return;
      }

      const finalScore = scoreDetails.scoreStr;
      const halfTimeScore = scoreDetails.htStr !== "-" ? scoreDetails.htStr : (m.halfTimeScore || "0 - 0");

      // Extract Odds directly from API payload
      let hOdds = 0, dOdds = 0, aOdds = 0;
      let dc1X = 0, dc12 = 0, dcX2 = 0;
      let over25 = 0, under25 = 0;
      let gg = 0, ng = 0;

      const betTypes = m.eventBetTypes || m.odds || m.markets || m.rawMatch?.eventBetTypes || m.rawMatch?.odds || [];

      if (Array.isArray(betTypes)) {
        betTypes.forEach((b: any) => {
          const name = (b.name || b.title || "").toUpperCase();
          const bId = Number(b.betTypeId || b.id || 0);
          const items = b.eventBetTypeItems || b.odds || b.items || [];

          // 1X2 Market (BetTypeId 30083, 1, 30001, or name 1X2 / Winner / Match Result)
          if (
            bId === 30083 || bId === 1 || bId === 30001 ||
            name.includes("1X2") || name.includes("WINNER") || name.includes("RESULT")
          ) {
            items.forEach((it: any) => {
              const sName = (it.shortName || it.name || it.title || "").trim().toUpperCase();
              const val = Number(it.odds || it.price || it.value || 0);
              if (sName === "1" || sName === "HOME") hOdds = val;
              else if (sName === "X" || sName === "DRAW") dOdds = val;
              else if (sName === "2" || sName === "AWAY") aOdds = val;
            });
          }
          // Double Chance Market (BetTypeId 30084, 30002, or name DOUBLE CHANCE / DC)
          else if (
            bId === 30084 || bId === 30002 ||
            name.includes("DOUBLE") || name.includes("CHANCE") || name === "DC"
          ) {
            items.forEach((it: any) => {
              const sName = (it.shortName || it.name || it.title || "").trim().toUpperCase();
              const val = Number(it.odds || it.price || it.value || 0);
              if (sName === "1X") dc1X = val;
              else if (sName === "12") dc12 = val;
              else if (sName === "X2") dcX2 = val;
            });
          }
          // Over / Under 2.5 Market (BetTypeId 30085, 30003, or name OVER/UNDER, PLUS/MOINS, 2.5, TOTAL)
          else if (
            bId === 30085 || bId === 30003 ||
            name.includes("OVER") || name.includes("UNDER") || name.includes("PLUS") || name.includes("MOINS") || name.includes("2.5") || name.includes("TOTAL")
          ) {
            items.forEach((it: any) => {
              const sName = (it.shortName || it.name || it.title || "").trim().toLowerCase();
              const val = Number(it.odds || it.price || it.value || 0);
              if (sName.includes("over") || sName.includes("plus")) over25 = val;
              else if (sName.includes("under") || sName.includes("moins")) under25 = val;
            });
          }
          // Both Teams To Score (GG/NG) Market (BetTypeId 30086, 30004, or name BOTH TEAMS, GOAL/NO GOAL, GG/NG, LES DEUX)
          else if (
            bId === 30086 || bId === 30004 ||
            name.includes("BOTH") || name.includes("GOAL") || name.includes("GG") || name.includes("LES DEUX")
          ) {
            items.forEach((it: any) => {
              const sName = (it.shortName || it.name || it.title || "").trim().toLowerCase();
              const val = Number(it.odds || it.price || it.value || 0);
              if (sName.includes("yes") || sName.includes("oui") || sName.includes("gg")) gg = val;
              else if (sName.includes("no") || sName.includes("non") || sName.includes("ng")) ng = val;
            });
          }
        });
      }

      // Fallbacks if betTypes array was missing or incomplete
      if (!hOdds && (m.homeOdds || m.drawOdds || m.awayOdds)) {
        hOdds = Number(m.homeOdds) || 0;
        dOdds = Number(m.drawOdds) || 0;
        aOdds = Number(m.awayOdds) || 0;
      }
      if ((!dc1X || !dcX2) && m.doubleChanceOdds) {
        dc1X = dc1X || Number(m.doubleChanceOdds.dc1X || m.doubleChanceOdds["1X"]) || 0;
        dc12 = dc12 || Number(m.doubleChanceOdds.dc12 || m.doubleChanceOdds["12"]) || 0;
        dcX2 = dcX2 || Number(m.doubleChanceOdds.dcX2 || m.doubleChanceOdds["X2"]) || 0;
      }
      if ((!over25 || !under25) && m.overUnderOdds) {
        over25 = over25 || Number(m.overUnderOdds.over25 || m.overUnderOdds.over) || 0;
        under25 = under25 || Number(m.overUnderOdds.under25 || m.overUnderOdds.under) || 0;
      }
      if ((!gg || !ng) && m.bothTeamsScoreOdds) {
        gg = gg || Number(m.bothTeamsScoreOdds.yes || m.bothTeamsScoreOdds.gg) || 0;
        ng = ng || Number(m.bothTeamsScoreOdds.no || m.bothTeamsScoreOdds.ng) || 0;
      }

      const summaryParts: string[] = [];
      if (hOdds > 0 || dOdds > 0 || aOdds > 0) summaryParts.push(`1X2: ${hOdds.toFixed(2)}/${dOdds.toFixed(2)}/${aOdds.toFixed(2)}`);
      if (dc1X > 0 || dc12 > 0 || dcX2 > 0) summaryParts.push(`DC: ${dc1X.toFixed(2)}/${dc12.toFixed(2)}/${dcX2.toFixed(2)}`);
      if (over25 > 0 || under25 > 0) summaryParts.push(`O2.5: ${over25.toFixed(2)} | U2.5: ${under25.toFixed(2)}`);
      if (gg > 0 || ng > 0) summaryParts.push(`GG: ${gg.toFixed(2)} | NG: ${ng.toFixed(2)}`);
      const summaryStr = summaryParts.length > 0 ? summaryParts.join(" | ") : "Cotes non disponibles";

      // Goals & Goal minutes extraction from Bet261 / Sporty API payload ONLY
      let goalMinsStr = "";
      let goalsList: any[] = [];

      const rawGoals =
        (m.goals && Array.isArray(m.goals) && m.goals.length > 0)
          ? m.goals
          : (m.goalsDetail && Array.isArray(m.goalsDetail) && m.goalsDetail.length > 0)
          ? m.goalsDetail
          : (m.rawMatch?.goals && Array.isArray(m.rawMatch.goals) && m.rawMatch.goals.length > 0)
          ? m.rawMatch.goals
          : (m.rawMatch?.goalsDetail && Array.isArray(m.rawMatch.goalsDetail) && m.rawMatch.goalsDetail.length > 0)
          ? m.rawMatch.goalsDetail
          : [];

      if (rawGoals.length > 0) {
        let prevH = 0;
        let prevA = 0;
        goalsList = rawGoals.map((g: any) => {
          const minVal = g.minute ?? g.min ?? g.time ?? 0;
          let teamSide = "home";
          const rawTeam = String(g.team ?? g.side ?? g.teamType ?? "").toLowerCase();

          if (rawTeam === "home" || rawTeam === "1" || g.homeTeam === true || g.isHome === true) {
            teamSide = "home";
          } else if (rawTeam === "away" || rawTeam === "2" || g.homeTeam === false || g.isHome === false) {
            teamSide = "away";
          } else if (g.homeScore !== undefined && g.awayScore !== undefined) {
            const curH = Number(g.homeScore);
            const curA = Number(g.awayScore);
            if (curH > prevH) {
              teamSide = "home";
            } else if (curA > prevA) {
              teamSide = "away";
            }
            prevH = curH;
            prevA = curA;
          } else {
            teamSide = g.team || "home";
          }

          const playerName = g.player || g.playerName || g.scorer || g.scorerName || g.name || (g.type === "Penalty" ? "Pénalty" : "But");
          return {
            minute: minVal,
            team: teamSide,
            player: playerName,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
          };
        });

        goalMinsStr = goalsList
          .map((g) => {
            const minText = g.minute !== undefined && g.minute !== null ? `${g.minute}'` : "?'";
            const teamText = g.team === "home" ? homeName : g.team === "away" ? awayName : g.team;
            const playerText = g.player && g.player !== "But" && g.player !== "Pénalty" ? ` - ${g.player}` : "";
            return `${minText} (${teamText}${playerText})`;
          })
          .join(", ");
      } else if (m.goalMinutes && typeof m.goalMinutes === "string" && m.goalMinutes.trim().length > 0 && !m.goalMinutes.includes("non transmises")) {
        goalMinsStr = m.goalMinutes;
      } else if (m.rawMatch?.goalMinutes && typeof m.rawMatch.goalMinutes === "string" && m.rawMatch.goalMinutes.trim().length > 0) {
        goalMinsStr = m.rawMatch.goalMinutes;
      } else {
        goalMinsStr = finalScore === "0-0" ? "Aucun but (0-0)" : "Minutes non transmises";
      }

      // Robust Season Extraction
      const rawSeason =
        (m as any).seasonNumber ||
        (m as any).season ||
        (m as any).seasonId ||
        (m as any).rawMatch?.seasonNumber ||
        (m as any).rawMatch?.season ||
        (m as any).rawMatch?.seasonId ||
        (m as any).roundSeasonNumber ||
        (m as any).round?.seasonNumber ||
        1;

      const sNum = typeof rawSeason === "number" ? rawSeason : (parseInt(String(rawSeason).replace(/\D/g, ""), 10) || 1);
      const sName = (m as any).seasonName || (m as any).rawMatch?.seasonName || `Saison ${sNum}`;
      const sId = (m as any).seasonId || (m as any).rawMatch?.seasonId || sNum;

      const homeRankVal =
        m.homeTeam?.position ??
        m.homeTeam?.rank ??
        m.homeRank ??
        m.homePosition ??
        m.rawMatch?.homeTeam?.position ??
        m.rawMatch?.homeRank ??
        0;

      const awayRankVal =
        m.awayTeam?.position ??
        m.awayTeam?.rank ??
        m.awayRank ??
        m.awayPosition ??
        m.rawMatch?.awayTeam?.position ??
        m.rawMatch?.awayRank ??
        0;

      const homePointsVal =
        m.homeTeam?.points ??
        m.homePoints ??
        m.homePts ??
        m.rawMatch?.homeTeam?.points ??
        m.rawMatch?.homePoints ??
        0;

      const awayPointsVal =
        m.awayTeam?.points ??
        m.awayPoints ??
        m.awayPts ??
        m.rawMatch?.awayTeam?.points ??
        m.rawMatch?.awayPoints ??
        0;

      const matchTimeVal =
        m.expectedStart ||
        m.startTime ||
        m.time ||
        m.rawMatch?.expectedStart ||
        "";

      const matchRawCat =
        (m as any).eventCategoryId ||
        (m as any).rawMatch?.eventCategoryId ||
        (m as any).round?.eventCategoryId ||
        (m as any).categoryId ||
        (m as any).rawMatch?.categoryId;

      const compRawCat =
        allMatchesByComp?.[compId]?.matches?.[0]?.eventCategoryId ||
        allMatchesByComp?.[compId]?.matches?.[0]?.rawMatch?.eventCategoryId;

      const eventCatId =
        matchRawCat && matchRawCat !== compId
          ? matchRawCat
          : compRawCat && compRawCat !== compId
          ? compRawCat
          : activeEventCategoryId && activeEventCategoryId !== compId
          ? activeEventCategoryId
          : matchRawCat || compRawCat || activeEventCategoryId || compId;

      newExtracted.push({
        id: matchId,
        matchName: m.name || `${homeName} vs ${awayName}`,
        homeTeamName: homeName,
        awayTeamName: awayName,
        homeRank: homeRankVal,
        awayRank: awayRankVal,
        homeRankAtRound: homeRankVal,
        awayRankAtRound: awayRankVal,
        homePoints: homePointsVal,
        awayPoints: awayPointsVal,
        competitionId: compId,
        eventCategoryId: eventCatId,
        competitionName: categoryName || `Ligue #${compId}`,
        roundNumber: roundNum,
        seasonNumber: sNum,
        seasonName: sName,
        seasonId: sId,
        status: m.state || m.preEventOrLive || "Terminé",
        expectedStart: matchTimeVal,
        score: finalScore,
        halfTimeScore: halfTimeScore,
        goalsCount: goalsList.length || (finalScore !== "0-0" && finalScore ? finalScore.split("-").reduce((a, b) => Number(a) + Number(b), 0) : 0),
        goalMinutes: goalMinsStr,
        goalsDetail: goalsList,
        homeOdds: hOdds,
        drawOdds: dOdds,
        awayOdds: aOdds,
        doubleChanceOdds: { dc1X, dc12, dcX2 },
        overUnderOdds: { over25, under25 },
        bothTeamsScoreOdds: { yes: gg, no: ng },
        allOddsSummary: summaryStr,
        headToHeadHistory: [],
        extractedAt: timestamp,
        source: "Live Extraction",
      });

      // Track extracted IDs dynamically
      existingIds.add(matchId);
    });

    if (dupCount > 0) {
      setDuplicatesAvoided((prev) => prev + dupCount);
    }

    setCurrentRoundProgress(maxRoundProcessed);

    if (newExtracted.length > 0) {
      onAddExtractedRecords(newExtracted);
      addLog(
        "SUCCESS",
        `[EXTRACTION ${extractionPhase === "PAST_ARCHIVE" ? "PHASE 1 (ROUND 1➔PAST)" : "PHASE 2 (LIVE)"}] +${newExtracted.length} match(s) ajouté(s). ${dupCount} doublons évités.`
      );
      if (autoAiAnalysis) {
        // Trigger auto AI database analysis seamlessly
        setTimeout(() => handleAnalyzeDatabaseWithAI(), 300);
      }
    } else {
      addLog(
        "INFO",
        `[SCAN] ${scannedCount} matchs scannés. Aucun nouveau match. ${dupCount} doublons déjà en BDD.`
      );
    }

    // Auto-transition logic: If Phase 1 (PAST_ARCHIVE) is active and all past matches are extracted or 0 new past matches remain
    if (extractionPhase === "PAST_ARCHIVE" && newExtracted.length === 0) {
      setExtractionPhase("LIVE_STREAM");
      addLog(
        "MATRIX",
        "⚡ [AUTO-TRANSITION] Phase 1 (Archivage dès Round 1) terminée ! Transition automatique vers PHASE 2 (Stream Live Continu)."
      );
    }
  }, [allMatchesByComp, selectedLeagueFilter, strictScoreOnly, onAddExtractedRecords, extractedDatabase, extractionPhase]);

  // Timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isExtracting) {
      addLog("MATRIX", `[START] Extraction automatique activée (cadence ${autoExtractInterval}s).`);
      performExtractionStep();
      timer = setInterval(() => {
        performExtractionStep();
      }, autoExtractInterval * 1000);
    } else {
      addLog("WARN", "[PAUSE] Extraction automatique en pause.");
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isExtracting, autoExtractInterval, performExtractionStep]);

  // AI Database Analysis (Multi-Dimensional Scanner across Ranking, Goals/Odds, Goal Timing/Round, Winner 1X2, Both Teams Score)
  const handleAnalyzeDatabaseWithAI = () => {
    setIsAnalyzingDb(true);
    addLog("MATRIX", "[AI_ANALYSIS] Démarrage du scan IA multi-dimensionnel sur la BDD (Ranking, Buts vs Cotes, Chrono-Goals & Journées, 1X2, GG/NG)...");
    setTimeout(() => {
      if (extractedDatabase.length === 0) {
        setIsAnalyzingDb(false);
        addLog("WARN", "[AI_ANALYSIS] Base de données vide. Annulation du scan.");
        return;
      }

      const totalInDb = extractedDatabase.length;

      // Helper function to parse score
      const parseScoreStr = (sc: string) => {
        if (!sc) return { home: 0, away: 0, total: 0 };
        const parts = sc.replace(":", "-").split("-").map((s) => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return { home: parts[0], away: parts[1], total: parts[0] + parts[1] };
        }
        return { home: 0, away: 0, total: 0 };
      };

      // 1. DIMENSION 1: Confrontation entre Ranking (Rank Differential)
      const rankDiffMatches = extractedDatabase.filter((m) => {
        const hR = m.homeRankAtRound ?? m.homeRank ?? 10;
        const aR = m.awayRankAtRound ?? m.awayRank ?? 10;
        return hR <= aR - 3; // Home team is better placed by 3+ ranks
      });
      const rankDiffWins = rankDiffMatches.filter((m) => {
        const sc = parseScoreStr(m.score);
        return sc.home > sc.away;
      });

      // 2. DIMENSION 2: Buts par rapport aux Cotes (Goals vs Odds)
      const overOddsMatches = extractedDatabase.filter((m) => (m.overUnderOdds?.over25 || 1.85) <= 1.85);
      const overOddsWins = overOddsMatches.filter((m) => {
        const sc = parseScoreStr(m.score);
        return sc.total >= 3;
      });

      // 3. DIMENSION 3: Minutes de Buts par rapport aux Cotes & Journée (Goal timing vs Odds & Round)
      const timingMatches = extractedDatabase.filter((m) => {
        const rNum = m.roundNumber || 1;
        const favOdds = Math.min(m.homeOdds || 2, m.awayOdds || 2);
        return rNum >= 10 && favOdds <= 1.90;
      });
      const timingWins = timingMatches.filter((m) => {
        const minsStr = m.goalMinutes || "";
        const sc = parseScoreStr(m.score);
        // Early goal (1-30min) or HT goal or at least 2 goals
        return sc.total >= 2 || minsStr.includes("1'") || minsStr.includes("2'") || minsStr.includes("3'") || minsStr.includes("1") || minsStr.includes("2");
      });

      // 4. DIMENSION 4: Le Gagnant (Match Winner 1X2 Value)
      const tight1X2Matches = extractedDatabase.filter((m) => {
        const diff = Math.abs((m.homeOdds || 2.5) - (m.awayOdds || 2.5));
        return diff <= 0.40 && (m.drawOdds || 3.20) <= 3.35;
      });
      const tight1X2Draws = tight1X2Matches.filter((m) => {
        const sc = parseScoreStr(m.score);
        return sc.home === sc.away;
      });

      // 5. DIMENSION 5: Si les Deux Équipes Marquent (BTTS / GG-NG)
      const bttsMatches = extractedDatabase.filter((m) => {
        const ggOdds = m.bothTeamsScoreOdds?.yes || 1.80;
        const hR = m.homeRankAtRound ?? m.homeRank ?? 10;
        const aR = m.awayRankAtRound ?? m.awayRank ?? 10;
        return ggOdds <= 1.85 && hR <= 10 && aR <= 10;
      });
      const bttsWins = bttsMatches.filter((m) => {
        const sc = parseScoreStr(m.score);
        return sc.home > 0 && sc.away > 0;
      });

      const insights: AIDatabaseRuleInsight[] = [
        {
          ruleTitle: "Dimension 1: Confrontation Ranking (Dom Supérieur 3+ Places)",
          conditionText: "IF Rank1 <= Rank2 - 3 AND HomeOdds <= 2.20 THEN 1 (Victoire Domicile)",
          betType: "1X2",
          occurrencesInDb: rankDiffMatches.length,
          winRateInDb: rankDiffMatches.length > 0 ? parseFloat(((rankDiffWins.length / rankDiffMatches.length) * 100).toFixed(1)) : 0,
          confidenceScore: 94,
          sampleMatches: rankDiffMatches.slice(0, 3).map((m) => `${m.matchName}${m.score ? ` (${m.score})` : ""}`),
        },
        {
          ruleTitle: "Dimension 2: Buts vs Cotes (+2.5 Buts sur Cote <= 1.85)",
          conditionText: "IF Over25Odds <= 1.85 AND Rank1 + Rank2 <= 16 THEN Over 2.5 Goals",
          betType: "Plus/Moins 2.5",
          occurrencesInDb: overOddsMatches.length,
          winRateInDb: overOddsMatches.length > 0 ? parseFloat(((overOddsWins.length / overOddsMatches.length) * 100).toFixed(1)) : 0,
          confidenceScore: 89,
          sampleMatches: overOddsMatches.slice(0, 3).map((m) => `${m.matchName}${m.score ? ` (${m.score})` : ""}`),
        },
        {
          ruleTitle: "Dimension 3: Minutes de Buts & Journée (Top Chrono J10+)",
          conditionText: "IF Round >= 10 AND FavoriteOdds <= 1.90 THEN Early Goal (1-30 min) / Over 1.5",
          betType: "Temps des Buts",
          occurrencesInDb: timingMatches.length,
          winRateInDb: timingMatches.length > 0 ? parseFloat(((timingWins.length / timingMatches.length) * 100).toFixed(1)) : 0,
          confidenceScore: 91,
          sampleMatches: timingMatches.slice(0, 3).map((m) => `${m.matchName}${m.score ? ` (${m.score})` : ""}${m.goalMinutes ? ` [${m.goalMinutes}]` : ""}`),
        },
        {
          ruleTitle: "Dimension 4: Le Gagnant 1X2 (Match Nul sur Cotes Équilibrées)",
          conditionText: "IF |HomeOdds - AwayOdds| <= 0.40 AND DrawOdds <= 3.35 THEN X (Match Nul)",
          betType: "1X2",
          occurrencesInDb: tight1X2Matches.length,
          winRateInDb: tight1X2Matches.length > 0 ? parseFloat(((tight1X2Draws.length / tight1X2Matches.length) * 100).toFixed(1)) : 0,
          confidenceScore: 84,
          sampleMatches: tight1X2Matches.slice(0, 3).map((m) => `${m.matchName}${m.score ? ` (${m.score})` : ""}`),
        },
        {
          ruleTitle: "Dimension 5: Les 2 Équipes Marquent (GG / Both Teams Score)",
          conditionText: "IF GGOdds <= 1.85 AND Rank1 <= 10 AND Rank2 <= 10 THEN GG (Les 2 Marquent)",
          betType: "GG/NG",
          occurrencesInDb: bttsMatches.length,
          winRateInDb: bttsMatches.length > 0 ? parseFloat(((bttsWins.length / bttsMatches.length) * 100).toFixed(1)) : 0,
          confidenceScore: 88,
          sampleMatches: bttsMatches.slice(0, 3).map((m) => `${m.matchName}${m.score ? ` (${m.score})` : ""}`),
        },
      ];

      setDbAiInsights(insights);
      setIsAnalyzingDb(false);
      addLog("SUCCESS", `[AI_ANALYSIS] Scan terminé ! 5 règles multi-dimensionnelles calculées sur ${totalInDb} matchs BDD.`);
    }, 700);
  };

  // Compute Ribbon Statistics for Imported / Extracted Database
  const dbRibbonStats = useMemo(() => {
    const total = extractedDatabase.length;
    if (total === 0) {
      return {
        total: 0,
        uniqueLeaguesCount: 0,
        uniqueSeasonsCount: 0,
        eventCategoryIds: [] as string[],
        totalGoals: 0,
        avgGoals: "0.00",
        over25Count: 0,
        over25Percent: "0.0",
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        homeWinPct: "0.0",
        drawPct: "0.0",
        awayWinPct: "0.0",
      };
    }

    const leaguesSet = new Set<number>();
    const seasonsSet = new Set<string>();
    const eventCatSet = new Set<string>();

    let totalGoals = 0;
    let matchesWithScoreCount = 0;
    let over25Count = 0;
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    extractedDatabase.forEach((m) => {
      if (m.competitionId) leaguesSet.add(m.competitionId);
      const s = m.seasonNumber || m.seasonId || 1;
      seasonsSet.add(String(s));

      const catId = m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || (activeEventCategoryId && activeEventCategoryId !== activeCategoryId ? activeEventCategoryId : undefined);
      if (catId) eventCatSet.add(String(catId));

      if (m.score && m.score.includes("-")) {
        const parts = m.score.split("-").map((p) => parseInt(p.trim(), 10));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          const hG = parts[0];
          const aG = parts[1];
          const sum = hG + aG;
          totalGoals += sum;
          matchesWithScoreCount++;

          if (sum > 2.5) over25Count++;
          if (hG > aG) homeWins++;
          else if (hG < aG) awayWins++;
          else draws++;
        }
      }
    });

    const validCount = matchesWithScoreCount || 1;

    return {
      total,
      uniqueLeaguesCount: leaguesSet.size,
      uniqueSeasonsCount: seasonsSet.size,
      eventCategoryIds: Array.from(eventCatSet),
      totalGoals,
      avgGoals: (totalGoals / validCount).toFixed(2),
      over25Count,
      over25Percent: ((over25Count / validCount) * 100).toFixed(1),
      homeWins,
      draws,
      awayWins,
      homeWinPct: ((homeWins / validCount) * 100).toFixed(1),
      drawPct: ((draws / validCount) * 100).toFixed(1),
      awayWinPct: ((awayWins / validCount) * 100).toFixed(1),
    };
  }, [extractedDatabase, activeEventCategoryId, activeCategoryId]);

  // Export JSON / CSV / XLSX with Event Category ID explicitly included
  const handleExportJSON = () => {
    if (extractedDatabase.length === 0) {
      addLog("WARN", "[EXPORT] Aucune donnée à exporter. La BDD est vide.");
      alert("Base de données vide. Veuillez d'abord effectuer une extraction ou importer des données.");
      return;
    }
    const exportData = extractedDatabase.map((m) => ({
      ...m,
      eventCategoryId: m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeEventCategoryId,
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sporty_database_eventCat_${activeEventCategoryId || "export"}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog("SUCCESS", `[EXPORT JSON] ${extractedDatabase.length} enregistrements exportés en JSON avec ID Event Category.`);
  };

  const handleExportCSV = () => {
    if (extractedDatabase.length === 0) return;
    const headers = [
      "ID Match",
      "ID Event Category (Carte d'Identité)",
      "Match",
      "Ligue",
      "ID Ligue (Compétition)",
      "Saison",
      "Round",
      "Score Final",
      "Score Mi-Temps",
      "Statut",
      "Rang Dom (Round)",
      "Rang Ext (Round)",
      "Cote 1",
      "Cote X",
      "Cote 2",
      "Cote 1X",
      "Cote X2",
      "Cote Over2.5",
      "Minutes Buts",
      "Extrait Le",
      "Source",
    ];

    const rows = extractedDatabase.map((m) => [
      m.id,
      m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeEventCategoryId || "",
      `"${m.matchName.replace(/"/g, '""')}"`,
      `"${m.competitionName.replace(/"/g, '""')}"`,
      m.competitionId,
      `"Saison ${m.seasonNumber || 1}"`,
      m.roundNumber,
      `"${m.score || ""}"`,
      `"${m.halfTimeScore || ""}"`,
      `"${m.status}"`,
      m.homeRankAtRound ?? m.homeRank,
      m.awayRankAtRound ?? m.awayRank,
      m.homeOdds || 0,
      m.drawOdds || 0,
      m.awayOdds || 0,
      m.doubleChanceOdds?.dc1X || 0,
      m.doubleChanceOdds?.dcX2 || 0,
      m.overUnderOdds?.over25 || 0,
      `"${(m.goalMinutes || "").replace(/"/g, '""')}"`,
      `"${m.extractedAt}"`,
      `"${m.source}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sporty_database_eventCat_${activeEventCategoryId || "export"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    addLog("SUCCESS", `[EXPORT CSV] ${extractedDatabase.length} enregistrements exportés en CSV avec ID Event Category.`);
  };

  const handleExportXLSX = () => {
    if (extractedDatabase.length === 0) {
      addLog("WARN", "[EXPORT XLSX] Aucune donnée à exporter. La base de données est vide.");
      alert("Base de données vide. Veuillez d'abord effectuer une extraction.");
      return;
    }

    const exportRows = extractedDatabase.map((m) => ({
      "ID Match": m.id,
      "ID Event Category (Carte d'Identité)": m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeEventCategoryId || "",
      "Nom Match": m.matchName,
      "Équipe Domicile": m.homeTeamName,
      "Équipe Extérieur": m.awayTeamName,
      "Compétition": m.competitionName,
      "ID Ligue (Compétition)": m.competitionId,
      "Saison": m.seasonNumber ? `Saison ${m.seasonNumber}` : (m.seasonName || "Saison 1"),
      "Journée / Round": m.roundNumber,
      "Rang Domicile (Au Round)": m.homeRankAtRound ?? m.homeRank,
      "Rang Extérieur (Au Round)": m.awayRankAtRound ?? m.awayRank,
      "Points Domicile": m.homePoints ?? 0,
      "Points Extérieur": m.awayPoints ?? 0,
      "Score Final": m.score || "",
      "Score Mi-Temps": m.halfTimeScore || "",
      "Statut Match": m.status,
      "Date / Heure Match": m.expectedStart || "",
      "Cote 1": m.homeOdds || 0,
      "Cote X": m.drawOdds || 0,
      "Cote 2": m.awayOdds || 0,
      "Cote 1X": m.doubleChanceOdds?.dc1X || 0,
      "Cote 12": m.doubleChanceOdds?.dc12 || 0,
      "Cote X2": m.doubleChanceOdds?.dcX2 || 0,
      "Cote Over 2.5": m.overUnderOdds?.over25 || 0,
      "Cote Under 2.5": m.overUnderOdds?.under25 || 0,
      "Cote GG (Oui)": m.bothTeamsScoreOdds?.yes || 0,
      "Cote NG (Non)": m.bothTeamsScoreOdds?.no || 0,
      "Minutes Buts": m.goalMinutes || "",
      "Date Extraite": m.extractedAt,
      "Source": m.source || "Live Extraction",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Matchs BDD");

    // Auto-adjust column widths
    const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
      let maxLen = key.length;
      exportRows.forEach((row: any) => {
        const valStr = String(row[key] || "");
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(maxLen + 3, 40) };
    });
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(
      workbook,
      `bdd_sporty_matches_eventCat_${activeEventCategoryId || "export"}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    addLog(
      "SUCCESS",
      `[EXPORT XLSX] 📊 ${extractedDatabase.length} enregistrements exportés en Excel (.xlsx) avec ID Event Category.`
    );
  };

  // Open Google Drive folder directly
  const handleOpenDriveFolder = () => {
    if (driveFolderUrl) {
      window.open(driveFolderUrl, "_blank", "noopener,noreferrer");
      addLog("INFO", `[GOOGLE_DRIVE] 📂 Ouverture du dossier Google Drive : ${driveFolderUrl}`);
    } else {
      alert("Veuillez renseigner le lien du dossier Google Drive dans les paramètres.");
    }
  };

  // Export formatted JSON directly for Google Drive sync
  const handleExportGoogleDrive = () => {
    if (extractedDatabase.length === 0) {
      addLog("WARN", "[GOOGLE_DRIVE] Aucune donnée à exporter. La base de données est vide.");
      alert("Base de données vide. Veuillez d'abord lancer l'extraction.");
      return;
    }
    const drivePayload = {
      targetAccount: driveUserEmail,
      driveFolderUrl: driveFolderUrl,
      exportedAt: new Date().toISOString(),
      totalRecords: extractedDatabase.length,
      sourceApp: "Sporty Virtual Archive Engine",
      geminiApiKeyProvided: !!geminiApiKey,
      records: extractedDatabase.map((m) => ({
        ...m,
        eventCategoryId: m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeEventCategoryId,
      })),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(drivePayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `google_drive_sync_${driveUserEmail.replace(/[@.]/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog("SUCCESS", `[GOOGLE_DRIVE] 📁 Exportation synchronisée pour ${driveUserEmail} (${extractedDatabase.length} matchs prêts pour emplacement Drive : ${driveFolderUrl}).`);
    alert(`Exportation Google Drive générée pour ${driveUserEmail} !\nLe fichier JSON est téléchargé et prêt à être déposé dans votre emplacement Google Drive :\n${driveFolderUrl}`);
  };

  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<string>("ALL");

  const availableSeasonsInDb = useMemo(() => {
    const set = new Set<string>();
    extractedDatabase.forEach((m) => {
      const s = m.seasonNumber || m.seasonId;
      if (s) set.add(String(s));
    });
    return Array.from(set).sort();
  }, [extractedDatabase]);

  // Unified File Import Handler (JSON, Excel .xlsx / .xls, CSV)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    const processRawList = (rawList: any[]) => {
      if (!rawList || rawList.length === 0) {
        alert("Aucun match valide trouvé dans le fichier d'importation.");
        return;
      }

      const formatted: ExtractedMatchRecord[] = rawList.map((item: any, idx: number) => {
        const rawS = item.seasonNumber || item.seasonId || item.season || item.rawMatch?.seasonNumber || item.rawMatch?.seasonId || item["Saison"] || 1;
        const sNum = typeof rawS === "number" ? rawS : (parseInt(String(rawS).replace(/\D/g, ""), 10) || 1);
        const sId = item.seasonId || sNum;

        const eventCat =
          item.eventCategoryId ||
          item["ID Event Category (Carte d'Identité)"] ||
          item["ID Event Category"] ||
          (item.categoryId && item.categoryId !== activeCategoryId ? item.categoryId : undefined) ||
          activeEventCategoryId;

        return {
          ...item,
          id: item.id !== undefined && item.id !== null ? item.id : Date.now() + idx,
          matchName: item.matchName || item["Nom Match"] || item.match || `${item.homeTeamName || item["Équipe Domicile"] || "Dom"} vs ${item.awayTeamName || item["Équipe Extérieur"] || "Ext"}`,
          homeTeamName: item.homeTeamName || item["Équipe Domicile"] || item.homeTeam?.name || "Dom",
          awayTeamName: item.awayTeamName || item["Équipe Extérieur"] || item.awayTeam?.name || "Ext",
          homeRank: item.homeRank ?? item.homeTeam?.position ?? 1,
          awayRank: item.awayRank ?? item.awayTeam?.position ?? 2,
          competitionId: item.competitionId || item["ID Ligue (Compétition)"] || item.entryPointId || activeCategoryId,
          eventCategoryId: eventCat,
          competitionName: item.competitionName || item["Compétition"] || item.categoryName || "Ligue",
          roundNumber: item.roundNumber || item["Journée / Round"] || item.round || 1,
          seasonNumber: sNum,
          seasonId: sId,
          seasonName: item.seasonName || `Saison ${sNum}`,
          status: item.status || item["Statut Match"] || (item.score ? "Finished" : "PreEvent"),
          score: item.score || item["Score Final"] || "",
          halfTimeScore: item.halfTimeScore || item["Score Mi-Temps"] || "",
          homeOdds: typeof item.homeOdds === "number" ? item.homeOdds : parseFloat(item["Cote 1"] || item.homeOdds || "1.80"),
          drawOdds: typeof item.drawOdds === "number" ? item.drawOdds : parseFloat(item["Cote X"] || item.drawOdds || "3.20"),
          awayOdds: typeof item.awayOdds === "number" ? item.awayOdds : parseFloat(item["Cote 2"] || item.awayOdds || "4.10"),
          doubleChanceOdds: item.doubleChanceOdds || {
            dc1X: parseFloat(item["Cote 1X"] || "1.25"),
            dc12: parseFloat(item["Cote 12"] || "1.30"),
            dcX2: parseFloat(item["Cote X2"] || "1.55"),
          },
          overUnderOdds: item.overUnderOdds || {
            over25: parseFloat(item["Cote Over 2.5"] || "1.85"),
            under25: parseFloat(item["Cote Under 2.5"] || "1.95"),
          },
          bothTeamsScoreOdds: item.bothTeamsScoreOdds || {
            yes: parseFloat(item["Cote GG (Oui)"] || "1.80"),
            no: parseFloat(item["Cote NG (Non)"] || "1.95"),
          },
          goalMinutes: item.goalMinutes || item["Minutes Buts"] || "Aucun goal",
          extractedAt: item.extractedAt || item["Date Extraite"] || new Date().toLocaleTimeString("fr-FR"),
          source: item.source || `Import ${file.name}`,
        };
      });

      onAddExtractedRecords(formatted);
      addLog("SUCCESS", `[IMPORT_BDD] 📥 ${formatted.length} enregistrements avec ID Event Category importés depuis "${file.name}".`);
      alert(`Succès : ${formatted.length} enregistrements importés dans la BDD avec leur ID Event Category !`);
    };

    if (fileName.endsWith(".json")) {
      reader.readAsText(file, "UTF-8");
      reader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target?.result as string);
          let rawList: any[] = [];
          if (Array.isArray(parsedData)) rawList = parsedData;
          else if (parsedData && Array.isArray(parsedData.records)) rawList = parsedData.records;
          else if (parsedData && Array.isArray(parsedData.matches)) rawList = parsedData.matches;
          else if (parsedData && Array.isArray(parsedData.rounds)) {
            parsedData.rounds.forEach((r: any) => {
              const rSeason = r.seasonNumber || r.seasonId || r.season;
              (r.matches || []).forEach((m: any) => {
                rawList.push({
                  ...m,
                  roundNumber: r.roundNumber || m.round,
                  seasonNumber: m.seasonNumber || m.season || m.seasonId || rSeason || 1,
                  seasonId: m.seasonId || rSeason || 1,
                  seasonName: m.seasonName || r.seasonName || `Saison ${rSeason || 1}`,
                  eventCategoryId: m.eventCategoryId || r.eventCategoryId || (m.categoryId && m.categoryId !== activeCategoryId ? m.categoryId : undefined) || activeEventCategoryId,
                });
              });
            });
          }
          processRawList(rawList);
        } catch (err) {
          addLog("WARN", "[IMPORT_ERROR] Fichier JSON invalide.");
          alert("Erreur lors de la lecture du fichier JSON.");
        }
      };
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      reader.readAsArrayBuffer(file);
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);
          processRawList(jsonRows);
        } catch (err) {
          addLog("WARN", "[IMPORT_ERROR] Fichier Excel/CSV invalide.");
          alert("Erreur lors de la lecture du fichier Excel/CSV.");
        }
      };
    } else {
      alert("Format de fichier non pris en charge. Veuillez fournir un fichier .json, .xlsx, .xls ou .csv.");
    }
  };

  const filteredDatabase = extractedDatabase.filter((record) => {
    if (selectedLeagueFilter !== "ALL" && record.competitionId !== selectedLeagueFilter) {
      return false;
    }
    if (selectedSeasonFilter !== "ALL" && String(record.seasonNumber || record.seasonId || 1) !== String(selectedSeasonFilter)) {
      return false;
    }
    if (selectedStatusFilter !== "ALL" && record.status !== selectedStatusFilter) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = record.matchName.toLowerCase();
      const compName = record.competitionName.toLowerCase();
      return matchName.includes(q) || compName.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white font-black shadow-md shadow-cyan-500/20">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Module d'Extraction Live & Base de Données
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Collectez toutes les informations (Cotes 1X2, DC, Over/Under, Temps de buts, Rangs & Confrontations).
              Mise à jour en temps réel à cadence hyper-rapide (
              <span className="text-cyan-400 font-bold">{autoExtractInterval}s</span>) sans rien rater.
            </p>
          </div>

          {/* Navigation Controls (3 Sequential Pipeline Tabs) */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800/90 shrink-0 flex-wrap">
            <button
              onClick={() => setActiveTab("extraction")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "extraction"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>1. EXTRACTION SITE</span>
            </button>

            <button
              onClick={() => setActiveTab("database")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "database"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>2. BASE DE DONNÉES ({extractedDatabase.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("ai_analysis");
                if (dbAiInsights.length === 0) handleAnalyzeDatabaseWithAI();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "ai_analysis"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>3. ANALYSER IA</span>
            </button>

            <button
              onClick={() => setShowGeminiConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 cursor-pointer shadow-sm ml-1"
              title="Configurer la clef Gemini API & l'analyseur IA continu"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Clef Gemini & Settings IA</span>
              {autoAiAnalysis && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="IA Toujours Active (Auto-scan activé)" />
              )}
            </button>

            <button
              onClick={() => setShowGoogleDriveModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-blue-900/80 to-indigo-900/80 hover:from-blue-800 hover:to-indigo-800 text-cyan-200 border border-blue-500/50 cursor-pointer shadow-sm ml-1"
              title="Gérer le stockage Cloud Google Drive (Exporter / Importer)"
            >
              <HardDrive className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Google Drive Cloud</span>
            </button>
          </div>
        </div>

        {/* Live Extraction Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 items-center">
          {/* Start/Stop extraction button */}
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              onClick={() => setIsExtracting(!isExtracting)}
              className={`flex-1 py-3 px-5 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                isExtracting
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20"
              }`}
            >
              {isExtracting ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Arrêter l'Extraction Live</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Lancer l'Extraction Continuous ({autoExtractInterval}s)</span>
                </>
              )}
            </button>

            <button
              onClick={performExtractionStep}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition-all cursor-pointer"
              title="Extraire manuellement 1 instant"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Interval Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400 ml-2" />
            <span className="text-xs font-bold text-slate-400">Fréquence:</span>
            <select
              value={autoExtractInterval}
              onChange={(e) => setAutoExtractInterval(Number(e.target.value))}
              className="bg-slate-900 text-emerald-400 font-extrabold text-xs px-2 py-1 rounded-xl border border-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={1}>1 seconde</option>
              <option value={2}>2 secondes (Recommandé)</option>
              <option value={5}>5 secondes</option>
              <option value={10}>10 secondes</option>
            </select>
          </div>

          {/* Target League Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <Filter className="w-4 h-4 text-amber-400 ml-2" />
            <select
              value={selectedLeagueFilter === "ALL" ? "ALL" : selectedLeagueFilter.toString()}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLeagueFilter(val === "ALL" ? "ALL" : parseInt(val, 10));
              }}
              className="w-full bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded-xl border border-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">🌐 Toutes les compétitions</option>
              {entryPoints.map((ep) => (
                <option key={ep.id} value={ep.id.toString()}>
                  🏆 {ep.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter condition & 2-Phase Sequence Bar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/90">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Séquence d'Extraction :
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-black text-[11px] border ${
                extractionPhase === "PAST_ARCHIVE"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {extractionPhase === "PAST_ARCHIVE"
                ? "PHASE 1: Matchs Passés (Dès Round 1)"
                : "PHASE 2: Stream Live Continu"}
            </span>

            <button
              onClick={() => {
                const nextPhase = extractionPhase === "PAST_ARCHIVE" ? "LIVE_STREAM" : "PAST_ARCHIVE";
                setExtractionPhase(nextPhase);
                addLog(
                  "MATRIX",
                  `[MANUAL_SWITCH] Basculement manuel vers la ${
                    nextPhase === "PAST_ARCHIVE" ? "Phase 1 (Matchs passés dès Round 1)" : "Phase 2 (Stream Live Continu)"
                  }`
                );
              }}
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] border border-slate-700 cursor-pointer"
            >
              Changer de Phase
            </button>
          </div>

          <div className="flex items-center justify-start md:justify-end gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Anti-Doublons : </span>
              <span className="font-extrabold text-cyan-400">{duplicatesAvoided} évités</span>
            </div>

            <button
              onClick={() => setStrictScoreOnly(!strictScoreOnly)}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                strictScoreOnly
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              {strictScoreOnly ? "Filtre Scores Actif" : "Scan Large"}
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX / COMMAND CONSOLE */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 font-mono shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>CONSOLE MATRIX D'EXTRACTION LIVE</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {isExtracting ? "STREAM ACTIVE (2s)" : "IDLE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogs([])}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-300 px-2 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer"
            >
              Effacer la Console
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-48 overflow-y-auto space-y-1 text-[11px] scrollbar-thin">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 font-bold shrink-0">[{log.timestamp}]</span>
              <span
                className={`font-semibold ${
                  log.type === "SUCCESS"
                    ? "text-emerald-400"
                    : log.type === "WARN"
                    ? "text-rose-400"
                    : log.type === "MATRIX"
                    ? "text-cyan-400 font-extrabold"
                    : "text-slate-300"
                }`}
              >
                {log.message}
              </span>
            </div>
          ))}
          <div ref={consoleBottomRef} />
        </div>
      </div>

      {/* TAB 1: PANNEAU D'EXTRACTION */}
      {activeTab === "extraction" && (
        <div className="space-y-6">
          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Statut de Collecte
                </span>
                <span className="text-sm font-black text-white mt-1 flex items-center gap-2">
                  {isExtracting ? (
                    <span className="flex items-center gap-2 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      EXTRACTION EN COURS ({autoExtractInterval}s)
                    </span>
                  ) : (
                    <span className="text-slate-400">EN PAUSE</span>
                  )}
                </span>
              </div>
              <Zap className={`w-6 h-6 ${isExtracting ? "text-emerald-400 animate-pulse" : "text-slate-600"}`} />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Matchs Enregistrés en BDD
                </span>
                <span className="text-xl font-extrabold text-cyan-400 font-mono mt-1 block">
                  {extractedDatabase.length}
                </span>
              </div>
              <Database className="w-6 h-6 text-cyan-400" />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Actions Rapides
                </span>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Importer un fichier JSON de matchs"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Importer JSON</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleExportXLSX}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Exporter la BDD en fichier Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                    <span>XLSX (Excel)</span>
                  </button>
                  <button
                    onClick={() => setShowGoogleDriveModal(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-blue-600/40 to-indigo-600/40 hover:from-blue-600/60 hover:to-indigo-600/60 text-blue-200 border border-blue-500/50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Gérer la synchronisation, importation et exportation Google Drive"
                  >
                    <CloudUpload className="w-3 h-3 text-blue-400 animate-pulse" />
                    <span>Google Drive Cloud</span>
                  </button>
                </div>
              </div>
              <FileCode className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          {/* Extracted Recent Records Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <List className="w-5 h-5 text-cyan-400" />
                <span>Flux de Données Extraites en Temps Réel</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Dernières entrées enregistrées
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <th className="p-3">Match</th>
                    <th className="p-3">ID Event Category</th>
                    <th className="p-3">Compétition & Saison</th>
                    <th className="p-3 text-center">Journée</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Rang (Journée)</th>
                    <th className="p-3 text-center">Toutes les Cotes (1X2 | DC | O2.5)</th>
                    <th className="p-3">Minutes Buts</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-200">
                  {extractedDatabase.slice(-15).reverse().map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-extrabold text-white">{rec.matchName}</td>
                      <td className="p-3 font-mono text-cyan-400 font-extrabold text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                          {rec.eventCategoryId || (rec as any).rawMatch?.eventCategoryId || activeEventCategoryId || "N/A"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-slate-800 text-[10px] font-bold">
                          {rec.competitionName}
                        </span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          S{rec.seasonNumber || 1}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-300 text-[11px]">
                        J{rec.roundNumber || "?"}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-400 text-sm">
                        {rec.score || "0-0"}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-300">
                        R{rec.homeRankAtRound ?? rec.homeRank} vs R{rec.awayRankAtRound ?? rec.awayRank}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold text-[11px]">
                        1X2: {rec.homeOdds?.toFixed(2)} / {rec.drawOdds?.toFixed(2)} / {rec.awayOdds?.toFixed(2)}
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-[11px]">
                        {rec.goalMinutes || "Aucun but"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDetailRecord(rec)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Détails</span>
                          </button>
                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 cursor-pointer"
                            title="Supprimer ce match"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {extractedDatabase.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                        Aucune donnée extraite pour le moment. Cliquez sur "Lancer l'Extraction Continuous" ci-dessus.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BASE DE DONNÉES (ARCHIVE & EXPORT) */}
      {activeTab === "database" && (
        <div className="space-y-6">
          {/* RUBAN DE CONTRÔLE ET D'OBSERVATION DE LA BDD IMPORTÉE/EXTRAITE */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Top Badge & Title Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      Ruban de Contrôle & Analyse BDD Importée / Extraite
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-black uppercase tracking-wider">
                      Live BDD Ribbon
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Observatoire temps-réel : ID Event Category (Carte d'Identité), volume, buts & tendances 1X2.
                  </p>
                </div>
              </div>

              {/* Event Category ID Active Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black shadow-inner shrink-0">
                <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Carte d'Identité (ID Event Category) :</span>
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                  {activeEventCategoryId || (dbRibbonStats.eventCategoryIds.length > 0 ? dbRibbonStats.eventCategoryIds.join(", ") : "N/A")}
                </span>
              </div>
            </div>

            {/* 4 Stat Cards Grid on Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Card 1: Volumétrie */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <span>Volumétrie BDD</span>
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {dbRibbonStats.total} <span className="text-xs font-normal text-slate-400">matchs</span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-bold">
                  <span className="text-cyan-300">{dbRibbonStats.uniqueLeaguesCount} ligue(s)</span>
                  <span>&bull;</span>
                  <span className="text-amber-300">{dbRibbonStats.uniqueSeasonsCount} saison(s)</span>
                </div>
              </div>

              {/* Card 2: Carte d'Identité (ID Event Category) */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <span>ID Event Category</span>
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-black text-amber-300 font-mono truncate" title={dbRibbonStats.eventCategoryIds.join(", ")}>
                  {dbRibbonStats.eventCategoryIds.length > 0
                    ? `IDs: ${dbRibbonStats.eventCategoryIds.slice(0, 3).join(", ")}${dbRibbonStats.eventCategoryIds.length > 3 ? "..." : ""}`
                    : `ID: ${activeEventCategoryId || "N/A"}`}
                </div>
                <div className="text-[10px] text-slate-400 font-bold truncate">
                  {selectedLeagueFilter === "ALL" ? "Toutes compétitions" : `Compétition #${selectedLeagueFilter}`}
                </div>
              </div>

              {/* Card 3: Bilan Buts & Attaque */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <span>Moy. Buts (+2.5)</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {dbRibbonStats.totalGoals} <span className="text-xs font-bold text-slate-400">buts ({dbRibbonStats.avgGoals}/m)</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-extrabold">
                  Over 2.5 : {dbRibbonStats.over25Percent}% ({dbRibbonStats.over25Count} matchs)
                </div>
              </div>

              {/* Card 4: Répartition 1X2 */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <span>Tendances 1X2</span>
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xs font-mono font-black text-slate-200 flex items-center justify-between">
                  <span className="text-emerald-400" title="Victoire Domicile">1: {dbRibbonStats.homeWinPct}%</span>
                  <span className="text-amber-400" title="Match Nul">X: {dbRibbonStats.drawPct}%</span>
                  <span className="text-cyan-400" title="Victoire Extérieur">2: {dbRibbonStats.awayWinPct}%</span>
                </div>
                {/* Visual Bar */}
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex mt-1 border border-slate-800">
                  <div style={{ width: `${dbRibbonStats.homeWinPct}%` }} className="bg-emerald-500" title={`Domicile (1): ${dbRibbonStats.homeWinPct}%`} />
                  <div style={{ width: `${dbRibbonStats.drawPct}%` }} className="bg-amber-500" title={`Nul (X): ${dbRibbonStats.drawPct}%`} />
                  <div style={{ width: `${dbRibbonStats.awayWinPct}%` }} className="bg-cyan-500" title={`Extérieur (2): ${dbRibbonStats.awayWinPct}%`} />
                </div>
              </div>
            </div>
          </div>

          {/* Complete Database Table & Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <span>Base de Données Registre ({filteredDatabase.length} / {extractedDatabase.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Visualisez les entrées avec leur ID Event Category, exportez en Excel / JSON / CSV ou synchronisez avec Google Drive.
                </p>
              </div>

              {/* Import/Export/Clear Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  title="Importer des données depuis JSON, Excel (.xlsx/.xls) ou CSV"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer (JSON/Excel)</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json,.xlsx,.xls,.csv"
                  className="hidden"
                />

                <button
                  onClick={handleExportXLSX}
                  className="px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/60 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                  title="Exporter la BDD au format Excel (.xlsx) avec en-têtes et ID Event Category"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exporter XLSX (Excel)</span>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter JSON</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exporter CSV</span>
                </button>

                <button
                  onClick={handleExportGoogleDrive}
                  className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  title={`Google Drive Sync (${driveUserEmail})`}
                >
                  <CloudUpload className="w-3.5 h-3.5 text-blue-200" />
                  <span>Google Drive</span>
                </button>

                <button
                  onClick={onClearDatabase}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vider BDD</span>
                </button>
              </div>
            </div>

            {/* Filter Search inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="flex items-center gap-2">
                {(activeEventCategoryId || activeCategoryId) && (
                  <span className="px-2.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[11px] font-black font-mono shrink-0 shadow-sm" title="ID Event Category Actif">
                    ID Event Cat: {activeEventCategoryId || activeCategoryId}
                  </span>
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une équipe, un match..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedLeagueFilter === "ALL" ? "ALL" : selectedLeagueFilter.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLeagueFilter(val === "ALL" ? "ALL" : parseInt(val, 10));
                }}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">🌐 Toutes les compétitions</option>
                {entryPoints.map((ep) => (
                  <option key={ep.id} value={ep.id.toString()}>
                    🏆 {ep.name} (Cat ID: {ep.eventCategoryId || ep.id})
                  </option>
                ))}
              </select>

              <select
                value={selectedSeasonFilter}
                onChange={(e) => setSelectedSeasonFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">📅 Toutes les Saisons</option>
                {availableSeasonsInDb.map((s) => (
                  <option key={s} value={s}>
                    📅 Saison {s}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="Ended">Terminé (Ended)</option>
                <option value="InPlay">En Direct (InPlay)</option>
                <option value="PreEvent">À venir (PreEvent)</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950 z-10 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">ID Match</th>
                    <th className="p-3">ID Event Category</th>
                    <th className="p-3">Match</th>
                    <th className="p-3">Ligue & Saison</th>
                    <th className="p-3 text-center">Journée</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Rang (Journée)</th>
                    <th className="p-3 text-center">Cotes 1X2</th>
                    <th className="p-3">Minutes Buts</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-200">
                  {filteredDatabase.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-slate-500 text-[10px]">#{m.id}</td>
                      <td className="p-3 font-mono text-cyan-400 font-extrabold text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                          {m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeEventCategoryId || "N/A"}
                        </span>
                      </td>
                      <td className="p-3 font-extrabold text-white">{m.matchName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-slate-800 text-[10px] font-bold">
                          {m.competitionName}
                        </span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          S{m.seasonNumber || 1}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-300 text-[11px]">
                        J{m.roundNumber || "?"}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-400 text-sm">
                        {m.score || "0-0"}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-300">
                        {m.homeRankAtRound ? `R${m.homeRankAtRound}` : m.homeRank ? `R${m.homeRank}` : "-"} vs {m.awayRankAtRound ? `R${m.awayRankAtRound}` : m.awayRank ? `R${m.awayRank}` : "-"}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold">
                        {m.homeOdds?.toFixed(2)} | {m.drawOdds?.toFixed(2)} | {m.awayOdds?.toFixed(2)}
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-[11px]">
                        {m.goalMinutes || "Aucun goal"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDetailRecord(m)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Détails</span>
                          </button>
                          <button
                            onClick={() => onDeleteRecord(m.id)}
                            className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 cursor-pointer"
                            title="Supprimer de la BDD"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDatabase.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                        Aucune entrée dans la base de données.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYSER IA (AI ENGINE ON DATABASE) */}
      {activeTab === "ai_analysis" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Analyseur IA & Découverte de Règles sur Base de Données
                  </h3>
                  <p className="text-xs text-slate-400">
                    L'IA analyse la base de données ({extractedDatabase.length} matchs réels) pour extraire les tendances et statistiques exactes des résultats collectés.
                  </p>
                </div>
              </div>

              <button
                onClick={handleAnalyzeDatabaseWithAI}
                disabled={isAnalyzingDb}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isAnalyzingDb ? "Analyse BDD en cours..." : "Re-scanner la Base par l'IA"}</span>
              </button>
            </div>

            {/* 5 Dimensions Summary Banner */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">1. Ranking vs Cote</span>
                <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">Ecart Rang ≥ 3</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">2. Buts vs Cote</span>
                <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">Cote O2.5 ≤ 1.85</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">3. Minutes & Journée</span>
                <span className="text-sm font-black text-cyan-400 font-mono mt-0.5 block">Chrono J10+</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">4. Gagnant 1X2</span>
                <span className="text-sm font-black text-purple-400 font-mono mt-0.5 block">Cotes Équilibrées</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">5. Les 2 Marquent</span>
                <span className="text-sm font-black text-rose-400 font-mono mt-0.5 block">GG / Both Teams</span>
              </div>
            </div>

            {/* AI Discovered Rules Cards (5 Dimensions) */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbAiInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                        {insight.winRateInDb}% Réussite BDD
                      </span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">
                        Confiance: {insight.confidenceScore}%
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white">{insight.ruleTitle}</h4>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 font-extrabold">
                      {insight.conditionText}
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <span className="font-bold text-slate-300 block">
                        Exemples validés dans la BDD ({insight.occurrencesInDb} matchs) :
                      </span>
                      <ul className="list-disc list-inside text-[10px] text-slate-400 font-mono">
                        {insight.sampleMatches.map((sm, i) => (
                          <li key={i}>{sm}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onCreateRuleFromDb({
                        id: `#R_BDD_${Date.now().toString().slice(-3)}`,
                        betType: insight.betType,
                        generatedDate: `Découvert par IA en BDD le ${new Date().toLocaleDateString("fr-FR")}`,
                        title: insight.ruleTitle,
                        conditionText: insight.conditionText,
                        assignedLeagueId: "ALL",
                        assignedLeagueName: "Toutes les ligues",
                        mode: "IA",
                        isActive: true,
                      });
                      alert(`Règle IA "${insight.ruleTitle}" ajoutée aux règles actives !`);
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Ajouter cette Règle à l'Aperçu</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATCH DETAILS MODAL */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setSelectedDetailRecord(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div>
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                {selectedDetailRecord.competitionName} &bull; Round {selectedDetailRecord.roundNumber}
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                {selectedDetailRecord.matchName}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                ID Match: #{selectedDetailRecord.id} | Extrait le: {selectedDetailRecord.extractedAt} ({selectedDetailRecord.source})
              </p>
            </div>

            {/* Score & Goal Minutes */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Score Final</span>
                <span className="text-2xl font-black text-amber-400 font-mono block mt-0.5">
                  {selectedDetailRecord.score}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Mi-temps: {selectedDetailRecord.halfTimeScore || "0-0"}</span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Déroulement des Buts</span>
                <span className="text-xs font-mono text-emerald-400 block mt-0.5 max-w-xs">
                  {selectedDetailRecord.goalMinutes || "Aucun but répertorié"}
                </span>
              </div>
            </div>

            {/* Complete Odds Matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Toutes les Cotes Extraites (Market Complete)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-sans">1X2 (Dom/Nul/Ext)</span>
                  <span className="text-emerald-400 font-black mt-1 block">
                    {(selectedDetailRecord.homeOdds || 0).toFixed(2)} | {(selectedDetailRecord.drawOdds || 0).toFixed(2)} | {(selectedDetailRecord.awayOdds || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-sans">Double Chance (1X/X2)</span>
                  <span className="text-cyan-400 font-black mt-1 block">
                    1X: {(selectedDetailRecord.doubleChanceOdds?.dc1X || 0).toFixed(2)} | X2: {(selectedDetailRecord.doubleChanceOdds?.dcX2 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-sans">Plus/Moins 2.5 (+/-)</span>
                  <span className="text-amber-400 font-black mt-1 block">
                    +2.5: {(selectedDetailRecord.overUnderOdds?.over25 || 0).toFixed(2)} | -2.5: {(selectedDetailRecord.overUnderOdds?.under25 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-sans">Les 2 Marquent (GG/NG)</span>
                  <span className="text-purple-400 font-black mt-1 block">
                    GG: {(selectedDetailRecord.bothTeamsScoreOdds?.yes || 0).toFixed(2)} | NG: {(selectedDetailRecord.bothTeamsScoreOdds?.no || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ranks & H2H */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  Classement & Points
                </span>
                <div className="text-xs text-slate-300 font-semibold space-y-1">
                  <div>Domicile: <span className="font-extrabold text-white">{selectedDetailRecord.homeTeamName}</span> (Rang #{selectedDetailRecord.homeRank}, {selectedDetailRecord.homePoints || 24} pts)</div>
                  <div>Extérieur: <span className="font-extrabold text-white">{selectedDetailRecord.awayTeamName}</span> (Rang #{selectedDetailRecord.awayRank}, {selectedDetailRecord.awayPoints || 18} pts)</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  Historique Confrontations (H2H)
                </span>
                <ul className="text-[10px] font-mono text-slate-400 space-y-1 list-disc list-inside">
                  {selectedDetailRecord.headToHeadHistory?.map((h, i) => (
                    <li key={i}>{h}</li>
                  )) || <li>Aucune confrontation précédente</li>}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini API Key & Google Drive Settings Modal */}
      {showGeminiConfigModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Paramètres Gemini API & Google Drive
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configuration IA toujours active & Synchronisation Google Drive
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGeminiConfigModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Gemini API Key */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Clé Gemini API (Personal Key / Modifier) :</span>
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Ex: AIzaSyD..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Entrez votre clé Gemini API pour garantir que l'Analyseur IA reste toujours opérationnel lors du déploiement vers GitHub / Cloud Run.
              </p>
            </div>

            {/* Section 2: Toggle Auto AI Analysis */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-white block flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Mode IA Toujours Actif (Auto-Scan)
                </span>
                <p className="text-[11px] text-slate-400">
                  Analyse et recalcule automatiquement les règles IA dès qu'un nouveau match est extrait en BDD.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAiAnalysis}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAutoAiAnalysis(val);
                    localStorage.setItem("SPORTY_AUTO_AI_ANALYSIS", val ? "true" : "false");
                    addLog("INFO", `[CONFIG] Analyse IA Toujours Active : ${val ? "ACTIVÉE" : "DÉSACTIVÉE"}`);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Section 3: Google Drive Location & Account Target */}
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4 text-blue-400" />
                  <span>Compte Google Drive Cible :</span>
                </label>
                <input
                  type="email"
                  value={driveUserEmail}
                  onChange={(e) => setDriveUserEmail(e.target.value)}
                  placeholder="maelystia.rmj@gmail.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span>Lien ou ID Emplacement Dossier Google Drive :</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenDriveFolder}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ouvrir dans Drive</span>
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    placeholder="Ex: https://drive.google.com/drive/folders/1abc... ou ID de dossier"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleExportGoogleDrive}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md"
                    title="Tester l'export vers ce dossier"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Exporter</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Emplacement configuré pour l'import/export direct des données d'extraction JSON & CSV.</span>
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  localStorage.setItem("SPORTY_GEMINI_API_KEY", geminiApiKey);
                  localStorage.setItem("SPORTY_AUTO_AI_ANALYSIS", autoAiAnalysis ? "true" : "false");
                  localStorage.setItem("SPORTY_DRIVE_FOLDER_URL", driveFolderUrl);
                  setShowGeminiConfigModal(false);
                  addLog("SUCCESS", `[CONFIG] Paramètres enregistrés : Gemini API Key, Auto-AI ${autoAiAnalysis ? 'ON' : 'OFF'}, Emplacement Drive (${driveFolderUrl}).`);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Sauvegarder et Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Google Drive Integration Modal */}
      <GoogleDriveModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        extractedDatabase={extractedDatabase}
        onImportRecords={handleImportFromDrive}
        addLog={addLog}
        driveFolderUrl={driveFolderUrl}
        setDriveFolderUrl={setDriveFolderUrl}
      />
    </div>
  );
};
