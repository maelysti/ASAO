import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { RankingTeam, getTeamLogoUrl } from "../services/sportyApi";
import { computeSeasonRoundRankings } from "../utils/standingsEngine";
import { parseMatchScoreDetails } from "../utils/scoreUtils";
import {
  Trophy,
  Search,
  TrendingUp,
  ShieldAlert,
  Award,
  RefreshCw,
  Check,
  X,
  Minus,
  ListOrdered,
  Grid,
  Info,
  Calendar,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";

export interface RankingViewProps {
  teams: RankingTeam[];
  categoryName?: string;
  categoryId?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  resultsRounds?: any[];
  rawRoundsData?: any[];
}

export interface RoundTrajectoryItem {
  roundNumber: number;
  result: "Won" | "Lost" | "Draw" | "Upcoming";
  opponent: string;
  score?: string;
  halfTimeScore?: string;
  isHome: boolean;
  teamScore?: number;
  oppScore?: number;
  status: string;
  goals?: any[];
}

export const RankingView: React.FC<RankingViewProps> = ({
  teams,
  categoryName = "Championnat Virtuel",
  categoryId,
  isLoading = false,
  onRefresh,
  lastUpdated,
  resultsRounds = [],
  rawRoundsData = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"standard" | "all">("standard");
  const [selectedTeamForModal, setSelectedTeamForModal] = useState<string | null>(null);
  const [selectedRoundModal, setSelectedRoundModal] = useState<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    teamName: string;
    roundNum: number;
    data: RoundTrajectoryItem;
  } | null>(null);

  // Compute round-by-round entering rankings for the competition
  const seasonRankings = useMemo(() => {
    return computeSeasonRoundRankings(resultsRounds || []);
  }, [resultsRounds]);

  // Helper to retrieve all confrontations for a specific round with entering ranks
  const getRoundMatchesForModal = (rn: number) => {
    const resRound = (resultsRounds || []).find((r: any) => Number(r.roundNumber) === rn);
    const rawRound = (rawRoundsData || []).find((r: any) => Number(r.roundNumber) === rn);

    const matchesMap = new Map<string, any>();

    const processMatch = (m: any) => {
      const home = m.homeTeam?.name || m.name?.split(" vs ")[0]?.trim();
      const away = m.awayTeam?.name || m.name?.split(" vs ")[1]?.trim();
      if (!home || !away) return;
      const key = `${home}_vs_${away}`;

      const hRank = seasonRankings.getEnteringRank(rn, home);
      const aRank = seasonRankings.getEnteringRank(rn, away);

      if (!matchesMap.has(key)) {
        matchesMap.set(key, {
          homeTeam: home,
          awayTeam: away,
          score: m.score,
          halfTimeScore: m.halfTimeScore,
          homeRankAtRound: hRank,
          awayRankAtRound: aRank,
          status: m.score ? "Finished" : (m.state || "Scheduled"),
        });
      } else if (m.score) {
        const existing = matchesMap.get(key)!;
        existing.score = m.score;
        existing.halfTimeScore = m.halfTimeScore;
        existing.status = "Finished";
      }
    };

    (resRound?.matches || []).forEach(processMatch);
    (rawRound?.matches || []).forEach(processMatch);

    return Array.from(matchesMap.values());
  };

  // Filter teams by search term
  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(term));
  }, [teams, searchTerm]);

  // Build trajectory map: teamName -> roundNumber -> RoundTrajectoryItem
  const trajectoryMap = useMemo(() => {
    const map: Record<string, Record<number, RoundTrajectoryItem>> = {};

    // 1. Process completed results rounds
    (resultsRounds || []).forEach((r: any) => {
      const roundNum = Number(r.roundNumber);
      if (!roundNum) return;

      (r.matches || []).forEach((m: any) => {
        const home = m.homeTeam?.name || m.name?.split(" vs ")[0]?.trim();
        const away = m.awayTeam?.name || m.name?.split(" vs ")[1]?.trim();
        if (!home || !away) return;

        if (!map[home]) map[home] = {};
        if (!map[away]) map[away] = {};

        const scoreDetails = parseMatchScoreDetails(m);
        if (scoreDetails.hasScore && scoreDetails.hG !== null && scoreDetails.aG !== null) {
          const hScore = scoreDetails.hG;
          const aScore = scoreDetails.aG;
          let homeRes: "Won" | "Lost" | "Draw" = "Draw";
          let awayRes: "Won" | "Lost" | "Draw" = "Draw";

          if (hScore > aScore) {
            homeRes = "Won";
            awayRes = "Lost";
          } else if (aScore > hScore) {
            homeRes = "Lost";
            awayRes = "Won";
          }

          map[home][roundNum] = {
            roundNumber: roundNum,
            result: homeRes,
            opponent: away,
            score: scoreDetails.scoreStr,
            halfTimeScore: scoreDetails.htStr !== "-" ? scoreDetails.htStr : m.halfTimeScore,
            isHome: true,
            teamScore: hScore,
            oppScore: aScore,
            status: "Finished",
            goals: m.goals,
          };

          map[away][roundNum] = {
            roundNumber: roundNum,
            result: awayRes,
            opponent: home,
            score: scoreDetails.scoreStr,
            halfTimeScore: scoreDetails.htStr !== "-" ? scoreDetails.htStr : m.halfTimeScore,
            isHome: false,
            teamScore: aScore,
            oppScore: hScore,
            status: "Finished",
            goals: m.goals,
          };
        }
      });
    });

    // 2. Process upcoming raw matches
    (rawRoundsData || []).forEach((r: any) => {
      const roundNum = Number(r.roundNumber);
      if (!roundNum) return;

      (r.matches || []).forEach((m: any) => {
        const home = m.homeTeam?.name || m.name?.split(" vs ")[0]?.trim();
        const away = m.awayTeam?.name || m.name?.split(" vs ")[1]?.trim();
        if (!home || !away) return;

        if (!map[home]) map[home] = {};
        if (!map[away]) map[away] = {};

        if (!map[home][roundNum]) {
          map[home][roundNum] = {
            roundNumber: roundNum,
            result: "Upcoming",
            opponent: away,
            score: m.score || "-:-",
            isHome: true,
            status: m.state || "Scheduled",
          };
        }

        if (!map[away][roundNum]) {
          map[away][roundNum] = {
            roundNumber: roundNum,
            result: "Upcoming",
            opponent: home,
            score: m.score || "-:-",
            isHome: false,
            status: m.state || "Scheduled",
          };
        }
      });
    });

    return map;
  }, [resultsRounds, rawRoundsData]);

  // Determine array of rounds present in trajectoryMap
  const roundsArray = useMemo(() => {
    const rSet = new Set<number>();
    Object.values(trajectoryMap).forEach((roundsObj) => {
      Object.keys(roundsObj).forEach((rn) => {
        const num = Number(rn);
        if (!isNaN(num) && num > 0) rSet.add(num);
      });
    });
    const sorted = Array.from(rSet).sort((a, b) => a - b);
    if (sorted.length === 0) {
      return Array.from({ length: 38 }, (_, i) => i + 1);
    }
    return sorted;
  }, [trajectoryMap]);

  const maxRounds = useMemo(() => {
    return roundsArray.length > 0 ? roundsArray[roundsArray.length - 1] : 38;
  }, [roundsArray]);

  // Top stats
  const topTeam = teams && teams.length > 0 ? teams[0] : null;

  const bestAttackTeam = useMemo(() => {
    if (!teams || teams.length === 0) return null;
    return [...teams].sort((a, b) => (b.goalsFor ?? 0) - (a.goalsFor ?? 0))[0];
  }, [teams]);

  const bestDefenseTeam = useMemo(() => {
    if (!teams || teams.length === 0) return null;
    return [...teams].sort((a, b) => (a.goalsAgainst ?? 999) - (b.goalsAgainst ?? 999))[0];
  }, [teams]);

  const formatFormBadge = (status: string, idx: number) => {
    const s = String(status).toLowerCase();
    if (s === "won" || s === "w" || s === "victoire") {
      return (
        <span
          key={idx}
          className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-sm border border-emerald-400/50"
          title="Victoire (W)"
        >
          <Check className="w-3 h-3 stroke-[3]" />
        </span>
      );
    }
    if (s === "lost" || s === "l" || s === "défaite") {
      return (
        <span
          key={idx}
          className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm border border-rose-400/50"
          title="Défaite (L)"
        >
          <X className="w-3 h-3 stroke-[3]" />
        </span>
      );
    }
    return (
      <span
        key={idx}
        className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shadow-sm border border-slate-600/60"
        title="Nul (D)"
      >
        <Minus className="w-3 h-3 stroke-[3]" />
      </span>
    );
  };

  const selectedTeamDetails = useMemo(() => {
    if (!selectedTeamForModal) return null;
    const teamObj = teams.find((t) => t.name === selectedTeamForModal);
    const roundsMap = trajectoryMap[selectedTeamForModal] || {};
    const items: RoundTrajectoryItem[] = roundsArray
      .map((rn) => roundsMap[rn])
      .filter(Boolean);

    return {
      teamObj,
      items,
    };
  }, [selectedTeamForModal, teams, trajectoryMap, roundsArray]);

  // Export Ranking table & full matrix trajectory with styled HTML/CSS Excel format (.xls)
  const exportRankingToExcel = () => {
    if (!filteredTeams || filteredTeams.length === 0) return;

    const eventCatId = categoryId || "export";
    const exportDate = new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR");

    // Build HTML spreadsheet representation with full site styling (dark slate background, emerald green, amber accents, colored result pills)
    let html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; }
  .title-banner { background-color: #0f172a; color: #f59e0b; font-size: 18px; font-weight: 900; text-transform: uppercase; padding: 12px; text-align: left; border: 2px solid #334155; }
  .meta-card { border-collapse: collapse; margin-bottom: 20px; width: 100%; }
  .meta-card td { padding: 8px 12px; border: 1px solid #334155; font-size: 12px; }
  .meta-label { background-color: #1e293b; color: #94a3b8; font-weight: bold; width: 220px; }
  .meta-val { background-color: #0f172a; color: #10b981; font-weight: bold; }
  .meta-val-badge { background-color: #0f172a; color: #ef4444; font-weight: bold; }
  
  .section-header { background-color: #1e293b; color: #38bdf8; font-size: 14px; font-weight: 800; padding: 10px; text-align: left; border: 1px solid #334155; text-transform: uppercase; margin-top: 20px; }
  
  .data-table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 12px; }
  .data-table th { background-color: #1e293b; color: #38bdf8; font-weight: bold; padding: 10px 8px; border: 1px solid #334155; text-align: center; }
  .data-table th.th-round { background-color: #0f172a; color: #f59e0b; }
  .data-table td { padding: 8px 6px; border: 1px solid #1e293b; text-align: center; }
  .data-table td.team-name { text-align: left; font-weight: bold; color: #ffffff; background-color: #0f172a; }
  .data-table td.pts-col { background-color: #1e293b; color: #10b981; font-weight: 900; font-size: 13px; }
  .data-table td.rank-col { background-color: #0f172a; color: #f59e0b; font-weight: bold; }
  
  .res-v { background-color: #064e3b; color: #34d399; font-weight: bold; }
  .res-n { background-color: #78350f; color: #fbbf24; font-weight: bold; }
  .res-d { background-color: #7f1d1d; color: #f87171; font-weight: bold; }
  .res-dash { background-color: #1e293b; color: #64748b; }
  
  .matches-table { border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 10px; }
  .matches-table th { background-color: #1e293b; color: #a7f3d0; font-weight: bold; padding: 8px; border: 1px solid #334155; text-align: center; }
  .matches-table td { padding: 6px 10px; border: 1px solid #1e293b; text-align: center; color: #cbd5e1; mso-number-format:'\@'; }
  .matches-table tr:nth-child(even) td { background-color: #0f172a; }
  .matches-table tr:nth-child(odd) td { background-color: #1e293b; }
  .text-format { mso-number-format:'\@'; }
</style>
</head>
<body>

<table class="meta-card">
  <tr>
    <td colspan="${10 + roundsArray.length}" class="title-banner">
      🏆 BET261 - MATRICE CLASSEMENT & TRAJECTOIRE COMPLÈTE DES MATCHS
    </td>
  </tr>
  <tr>
    <td class="meta-label">Compétition / Ligue :</td>
    <td colspan="${9 + roundsArray.length}" class="meta-val">${categoryName}</td>
  </tr>
  <tr>
    <td class="meta-label">ID Event Category (Carte d'identité) :</td>
    <td colspan="${9 + roundsArray.length}" class="meta-val">${eventCatId}</td>
  </tr>
  <tr>
    <td class="meta-label">Bannière / Saison :</td>
    <td colspan="${9 + roundsArray.length}" class="meta-val-badge">
      SAISON : ${(categoryName || "CHAMPIONNAT").toUpperCase()} - SAISON (${eventCatId}) - ${exportDate.split(" ")[0]}
    </td>
  </tr>
  <tr>
    <td class="meta-label">Saison ID :</td>
    <td colspan="${9 + roundsArray.length}" class="meta-val">${activeSeasonId}</td>
  </tr>
  <tr>
    <td class="meta-label">Nombre de Journées :</td>
    <td colspan="${9 + roundsArray.length}" class="meta-val">J1 à J${maxRounds} (${roundsArray.length} journées enregistrées)</td>
  </tr>
  <tr>
    <td class="meta-label">Date & Heure d'Exportation :</td>
    <td colspan="${9 + roundsArray.length}" class="meta-val">${exportDate}</td>
  </tr>
</table>

<div class="section-header">1. CLASSEMENT GÉNÉRAL & MATRICE DE TRAJECTOIRE (J1 → J${maxRounds})</div>

<table class="data-table">
  <thead>
    <tr>
      <th>RANG</th>
      <th>ÉQUIPE</th>
      <th>PTS</th>
      <th>MJ</th>
      <th>V</th>
      <th>N</th>
      <th>D</th>
      <th>BP</th>
      <th>BC</th>
      <th>DIFF</th>
      ${roundsArray.map((rn) => `<th class="th-round">J${rn}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
`;

    filteredTeams.forEach((t, idx) => {
      const pos = `#${t.position || idx + 1}`;
      const name = t.name || "";
      const played = t.played ?? (t.won + t.draw + t.lost);
      const won = t.won ?? 0;
      const drawn = t.draw ?? t.drawn ?? 0;
      const lost = t.lost ?? 0;
      const gf = t.goalsFor ?? 0;
      const ga = t.goalsAgainst ?? 0;
      const diff = t.goalDifference ?? (gf - ga);
      const pts = t.points ?? 0;

      html += `
    <tr>
      <td class="rank-col">${pos}</td>
      <td class="team-name">${name}</td>
      <td class="pts-col">${pts}</td>
      <td>${played}</td>
      <td>${won}</td>
      <td>${drawn}</td>
      <td>${lost}</td>
      <td>${gf}</td>
      <td>${ga}</td>
      <td style="font-weight:bold; color: ${diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#94a3b8'}">${diff > 0 ? `+${diff}` : diff}</td>
      `;

      const teamRounds = trajectoryMap[name] || {};
      roundsArray.forEach((rn) => {
        const item = teamRounds[rn];
        if (!item || item.result === "Upcoming") {
          html += `<td class="res-dash">-</td>`;
        } else if (item.result === "Won") {
          html += `<td class="res-v">V</td>`;
        } else if (item.result === "Drawn") {
          html += `<td class="res-n">N</td>`;
        } else if (item.result === "Lost") {
          html += `<td class="res-d">D</td>`;
        } else {
          html += `<td class="res-dash">-</td>`;
        }
      });

      html += `\n    </tr>`;
    });

    html += `
  </tbody>
</table>

<div class="section-header">2. DÉTAILS COMPLETS DE TOUS LES MATCHS PAR JOURNÉE</div>

<table class="matches-table">
  <thead>
    <tr>
      <th>JOURNÉE</th>
      <th>ID EVENT CATEGORY</th>
      <th>MATCH (DOMICILE vs EXTÉRIEUR)</th>
      <th>SCORE FIN</th>
      <th>MI-TEMPS</th>
      <th>RÉSULTAT (1X2)</th>
      <th>TOTAL BUTS</th>
      <th>PLUS 2.5 BUTS</th>
    </tr>
  </thead>
  <tbody>
`;

    // Flatten all matches across all rounds using roundsArray and getRoundMatchesForModal
    let matchCount = 0;

    roundsArray.forEach((rn) => {
      const roundMatches = getRoundMatchesForModal(rn);

      roundMatches.forEach((m: any) => {
        matchCount++;
        const homeName = m.homeTeam?.name || m.homeTeamName || (typeof m.homeTeam === "string" ? m.homeTeam : "") || m.name?.split(" vs ")[0]?.trim() || "Équipe 1";
        const awayName = m.awayTeam?.name || m.awayTeamName || (typeof m.awayTeam === "string" ? m.awayTeam : "") || m.name?.split(" vs ")[1]?.trim() || "Équipe 2";

        const scoreDetails = parseMatchScoreDetails(m);

        const scoreStr = scoreDetails.scoreStr;
        const htStr = scoreDetails.htStr;
        const outcome = scoreDetails.outcome1X2;
        const totalGoals = scoreDetails.totalGoalsStr;
        const over25 = scoreDetails.over25Str;

        html += `
    <tr>
      <td style="font-weight:bold; color:#f59e0b; mso-number-format:'\@';">J${rn}</td>
      <td style="font-mono; font-weight:bold; color:#38bdf8; mso-number-format:'\@';">${eventCatId}</td>
      <td style="font-weight:bold; color:#ffffff; text-align:left; mso-number-format:'\@';">${homeName} <span style="color:#64748b;">vs</span> ${awayName}</td>
      <td style="font-weight:bold; color:#10b981; mso-number-format:'\@';" x:str="${scoreStr}">${scoreStr}</td>
      <td style="color:#94a3b8; mso-number-format:'\@';" x:str="${htStr}">${htStr}</td>
      <td style="font-weight:bold; color:${outcome.startsWith("1") ? "#34d399" : outcome.startsWith("2") ? "#38bdf8" : outcome.startsWith("X") ? "#fbbf24" : "#64748b"}; mso-number-format:'\@';">${outcome}</td>
      <td style="font-weight:bold; mso-number-format:'\@';">${totalGoals}</td>
      <td style="font-weight:bold; color:${over25 === "OUI" ? "#34d399" : over25 === "NON" ? "#f87171" : "#64748b"}; mso-number-format:'\@';">${over25}</td>
    </tr>
`;
      });
    });

    if (matchCount === 0) {
      html += `
    <tr>
      <td colspan="8" style="padding:15px; color:#94a3b8;">Aucun détail de match individuel chargé. Chargez les résultats dans l'onglet Match|Résultat pour exporter les scores.</td>
    </tr>
`;
    }

    html += `
  </tbody>
</table>

</body>
</html>
`;

    // Download formatted HTML file as .xls spreadsheet
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const catClean = (categoryName || "Championnat").replace(/[^a-zA-Z0-9]/g, "_");
    link.href = url;
    link.download = `Bet261_Classement_${catClean}_EventCategory_${eventCatId}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeSeasonId = useMemo(() => {
    if (resultsRounds && resultsRounds.length > 0) {
      for (const r of resultsRounds) {
        const s = r.seasonNumber || r.seasonId || (r as any).season || r.matches?.[0]?.seasonNumber || r.matches?.[0]?.seasonId;
        if (s) return s;
        const ref = r.matches?.[0]?.sourceRef || (r.matches?.[0] as any)?.rawMatch?.sourceRef;
        if (ref) {
          const parts = String(ref).split("-");
          const last = parts[parts.length - 1];
          if (last && /^\d+$/.test(last)) return last;
        }
      }
    }
    if (rawRoundsData && rawRoundsData.length > 0) {
      for (const r of rawRoundsData) {
        const s = r.seasonNumber || r.seasonId || (r as any).season || r.matches?.[0]?.seasonNumber || r.matches?.[0]?.seasonId;
        if (s) return s;
        const ref = r.matches?.[0]?.sourceRef || (r.matches?.[0] as any)?.rawMatch?.sourceRef;
        if (ref) {
          const parts = String(ref).split("-");
          const last = parts[parts.length - 1];
          if (last && /^\d+$/.test(last)) return last;
        }
      }
    }
    return categoryName ? categoryName.toUpperCase() : "1";
  }, [resultsRounds, rawRoundsData, categoryName]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                <span>CLASSEMENT</span>
                <span className="text-amber-400 text-xs px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 font-bold">
                  FILAHARANA
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {categoryName} • Direct & Historique Complet (J1 → J{maxRounds})
              </p>
              <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-red-500/40 text-red-400 text-xs font-black tracking-wider uppercase shadow-inner">
                <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>
                  SAISON : {(categoryName || "CHAMPIONNAT").toUpperCase()} - SAISON ({categoryId || activeSeasonId}) - {new Date().toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* View Toggle Mode Buttons: Standard vs AFFICHER ALL */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("standard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "standard"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Tableau</span>
            </button>

            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "all"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>AFFICHER ALL (Parcours J1-J{maxRounds})</span>
            </button>
          </div>

          {/* Search Bar with Event Category ID Badge */}
          <div className="flex items-center gap-2 flex-1 md:w-auto">
            {categoryId && (
              <span className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black font-mono shrink-0 shadow-sm" title="Event Category ID">
                ID: {categoryId}
              </span>
            )}
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une équipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={exportRankingToExcel}
            disabled={!filteredTeams || filteredTeams.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
            title="Exporter le classement et parcours complet sous format Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Excel</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0"
              title="Actualiser le classement"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Leader Card */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider">
              1er du Classement
            </div>
            <div className="text-base font-black text-white truncate">
              {topTeam ? topTeam.name : "-"}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {topTeam ? `${topTeam.points} PTS • ${topTeam.won} Victoires` : "-"}
            </div>
          </div>
        </div>

        {/* Best Offense Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-wider">
              Meilleure Attaque
            </div>
            <div className="text-base font-black text-white truncate">
              {bestAttackTeam ? bestAttackTeam.name : "-"}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {bestAttackTeam ? `${bestAttackTeam.goalsFor ?? 0} Buts Marqués` : "-"}
            </div>
          </div>
        </div>

        {/* Best Defense Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-sky-400/90 uppercase tracking-wider">
              Meilleure Défense
            </div>
            <div className="text-base font-black text-white truncate">
              {bestDefenseTeam ? bestDefenseTeam.name : "-"}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {bestDefenseTeam ? `${bestDefenseTeam.goalsAgainst ?? 0} Buts Encaissés` : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Standard Table */}
      {viewMode === "standard" ? (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">POS</th>
                  <th className="py-3.5 px-4">ÉQUIPE</th>
                  <th className="py-3.5 px-3 text-center">MJ</th>
                  <th className="py-3.5 px-3 text-center text-emerald-400">V</th>
                  <th className="py-3.5 px-3 text-center text-sky-400">N</th>
                  <th className="py-3.5 px-3 text-center text-rose-400">D</th>
                  <th className="py-3.5 px-3 text-center">BP</th>
                  <th className="py-3.5 px-3 text-center">BC</th>
                  <th className="py-3.5 px-3 text-center">DIFF</th>
                  <th className="py-3.5 px-5 text-center text-amber-300 bg-slate-950/90 border-x border-slate-800">
                    PTS
                  </th>
                  <th className="py-3.5 px-4 text-center">FORME</th>
                  <th className="py-3.5 px-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
                {filteredTeams.map((t, index) => {
                  const pos = t.position || index + 1;
                  const played = t.won + t.draw + t.lost;
                  const goalsFor = t.goalsFor ?? 0;
                  const goalsAgainst = t.goalsAgainst ?? 0;
                  const diff = t.goalDifference ?? goalsFor - goalsAgainst;

                  let posBadgeClass = "bg-slate-800 text-slate-300 border border-slate-700";
                  if (pos === 1) {
                    posBadgeClass =
                      "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20";
                  } else if (pos === 2) {
                    posBadgeClass =
                      "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black shadow-sm";
                  } else if (pos === 3) {
                    posBadgeClass =
                      "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black shadow-sm";
                  } else if (pos <= 4) {
                    posBadgeClass = "bg-sky-950 text-sky-300 border border-sky-800/80 font-bold";
                  }

                  return (
                    <tr
                      key={t.name}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTeamForModal(t.name)}
                    >
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${posBadgeClass}`}
                          >
                            {pos}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getTeamLogoUrl(t.name)}
                            alt={t.name}
                            className="w-7 h-7 object-contain drop-shadow"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <span className="font-black text-sm text-slate-100 group-hover:text-amber-400 transition-colors uppercase tracking-wide">
                            {t.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center text-slate-300 font-mono font-semibold">
                        {played}
                      </td>

                      <td className="py-3 px-3 text-center text-emerald-400 font-mono font-bold">
                        {t.won}
                      </td>

                      <td className="py-3 px-3 text-center text-sky-400 font-mono font-bold">
                        {t.draw}
                      </td>

                      <td className="py-3 px-3 text-center text-rose-400 font-mono font-bold">
                        {t.lost}
                      </td>

                      <td className="py-3 px-3 text-center text-slate-300 font-mono">
                        {goalsFor}
                      </td>

                      <td className="py-3 px-3 text-center text-slate-300 font-mono">
                        {goalsAgainst}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {diff > 0 ? (
                          <span className="text-emerald-400">+{diff}</span>
                        ) : diff < 0 ? (
                          <span className="text-rose-400">{diff}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-3 px-5 text-center bg-slate-950/60 border-x border-slate-800/80">
                        <span className="font-black text-sm text-white font-mono px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/60 shadow-inner">
                          {t.points}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {t.history && t.history.length > 0
                            ? t.history.map((h, idx) => formatFormBadge(h, idx))
                            : Array.from({ length: 5 }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className="w-5 h-5 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center text-[10px]"
                                >
                                  -
                                </span>
                              ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeamForModal(t.name);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Parcours</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredTeams.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                      Aucune équipe trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: "AFFICHER ALL" Matrix (Journée 1 -> Journée 38) */
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>MATRICE COMPLÈTE TOUTES JOURNÉES (J1 → J{maxRounds})</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Victoire
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span> Nul
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Défaite
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700 inline-block"></span> À venir
              </span>
              <button
                onClick={exportRankingToExcel}
                disabled={!filteredTeams || filteredTeams.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow transition-all cursor-pointer disabled:opacity-50 ml-auto"
                title="Exporter cette Matrice Complète au format Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter Matrice (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Ribbon Bar: Quick round selector (Click or Double Click) */}
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0 px-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Cliquer / Double-cliquer une Journée :</span>
            </span>
            {roundsArray.map((rn) => (
              <button
                key={rn}
                onClick={() => setSelectedRoundModal(rn)}
                onDoubleClick={() => setSelectedRoundModal(rn)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 font-mono text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
                title={`Double-cliquez pour ouvrir toutes les confrontations et rangs de la Journée ${rn}`}
              >
                J{rn}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 max-h-[70vh]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-slate-950 z-20 shadow-md">
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-3 px-3 text-center sticky left-0 bg-slate-950 z-30 w-12 border-r border-slate-800">
                    RANG
                  </th>
                  <th className="py-3 px-4 sticky left-12 bg-slate-950 z-30 min-w-[160px] border-r border-slate-800">
                    ÉQUIPE
                  </th>
                  <th className="py-3 px-3 text-center bg-slate-950 border-r border-slate-800 text-amber-400">
                    PTS
                  </th>
                  {roundsArray.map((rn) => (
                    <th
                      key={rn}
                      onClick={() => setSelectedRoundModal(rn)}
                      onDoubleClick={() => setSelectedRoundModal(rn)}
                      className="py-3 px-1 text-center min-w-[36px] font-mono border-r border-slate-800/40 cursor-pointer hover:bg-amber-500/20 hover:text-amber-300 transition-colors group"
                      title={`Double-cliquez ou cliquez pour afficher les confrontations et les rangs de la Journée ${rn}`}
                    >
                      <span className="group-hover:underline">J{rn}</span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                {filteredTeams.map((t, index) => {
                  const pos = t.position || index + 1;
                  const teamRounds = trajectoryMap[t.name] || {};

                  return (
                    <tr key={t.name} className="hover:bg-slate-800/30 transition-colors">
                      {/* POS */}
                      <td className="py-2.5 px-3 text-center sticky left-0 bg-slate-900 z-10 font-black font-mono text-amber-400 border-r border-slate-800">
                        #{pos}
                      </td>

                      {/* TEAM */}
                      <td
                        className="py-2.5 px-4 sticky left-12 bg-slate-900 z-10 border-r border-slate-800 cursor-pointer hover:text-amber-300"
                        onClick={() => setSelectedTeamForModal(t.name)}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getTeamLogoUrl(t.name)}
                            alt={t.name}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <span className="font-bold text-white uppercase truncate text-[11px]">
                            {t.name}
                          </span>
                        </div>
                      </td>

                      {/* PTS */}
                      <td className="py-2.5 px-3 text-center font-black font-mono bg-slate-950/80 border-r border-slate-800 text-amber-300">
                        {t.points}
                      </td>

                      {/* JOURNÉES (J1 -> J38) */}
                      {roundsArray.map((rn) => {
                        const item = teamRounds[rn];
                        let badgeColor = "bg-slate-800/60 text-slate-500 border border-slate-700/40";
                        let label = "-";

                        if (item) {
                          if (item.result === "Won") {
                            badgeColor = "bg-emerald-500 text-slate-950 font-black border border-emerald-400 shadow-sm";
                            label = "V";
                          } else if (item.result === "Draw") {
                            badgeColor = "bg-sky-500 text-slate-950 font-black border border-sky-400 shadow-sm";
                            label = "N";
                          } else if (item.result === "Lost") {
                            badgeColor = "bg-rose-500 text-white font-black border border-rose-400 shadow-sm";
                            label = "D";
                          }
                        }

                        return (
                          <td key={rn} className="py-2 px-1 text-center border-r border-slate-800/30">
                            <button
                              onClick={() => {
                                if (item) {
                                  setActiveTooltip({
                                    teamName: t.name,
                                    roundNum: rn,
                                    data: item,
                                  });
                                }
                              }}
                              className={`w-6 h-6 rounded-md text-[10px] flex items-center justify-center mx-auto transition-transform active:scale-90 hover:scale-110 ${badgeColor}`}
                              title={
                                item
                                  ? `J${rn}: ${t.name} vs ${item.opponent} (${item.score || "À venir"})`
                                  : `J${rn}: Non programmé`
                              }
                            >
                              {label}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOOLTIP / POPOVER MODAL FOR ROUND BADGE CLICK */}
      {activeTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4">
            <button
              onClick={() => setActiveTooltip(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>DÉTAIL JOURNÉE {activeTooltip.roundNum}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center space-y-2">
              <div className="text-xs text-slate-400 font-medium uppercase">
                {activeTooltip.data.isHome ? "Match à Domicile" : "Match à l'Extérieur"}
              </div>

              <div className="text-base font-black text-white flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <img
                    src={getTeamLogoUrl(activeTooltip.teamName)}
                    className="w-6 h-6 object-contain"
                    alt=""
                  />
                  <span>{activeTooltip.teamName}</span>
                </div>
                <span className="text-amber-400 font-mono text-lg font-extrabold px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                  {activeTooltip.data.score || "-:-"}
                </span>
                <div className="flex items-center gap-1.5">
                  <img
                    src={getTeamLogoUrl(activeTooltip.data.opponent)}
                    className="w-6 h-6 object-contain"
                    alt=""
                  />
                  <span>{activeTooltip.data.opponent}</span>
                </div>
              </div>

              {activeTooltip.data.halfTimeScore && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Score Mi-temps: ({activeTooltip.data.halfTimeScore})
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs px-2 font-semibold">
              <span className="text-slate-400">Résultat:</span>
              {activeTooltip.data.result === "Won" ? (
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Victoire (+3 PTS)
                </span>
              ) : activeTooltip.data.result === "Draw" ? (
                <span className="text-sky-400 font-bold bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20">
                  Match Nul (+1 PT)
                </span>
              ) : activeTooltip.data.result === "Lost" ? (
                <span className="text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                  Défaite (+0 PT)
                </span>
              ) : (
                <span className="text-slate-400 font-bold">Match à Venir</span>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  const tName = activeTooltip.teamName;
                  setActiveTooltip(null);
                  setSelectedTeamForModal(tName);
                }}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Voir Tout le Parcours de {activeTooltip.teamName}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL TEAM TRAJECTORY MODAL */}
      {selectedTeamDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getTeamLogoUrl(selectedTeamForModal!)}
                  alt=""
                  className="w-10 h-10 object-contain drop-shadow"
                />
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <span>{selectedTeamForModal}</span>
                    {selectedTeamDetails.teamObj?.position && (
                      <span className="text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono">
                        #{selectedTeamDetails.teamObj.position}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Parcours complet Saison • {selectedTeamDetails.teamObj?.points ?? 0} PTS
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeamForModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Chronological list of all rounds */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {selectedTeamDetails.items.map((item) => {
                let badgeClass = "bg-slate-800 text-slate-400 border-slate-700";
                let resultLabel = "À venir";

                if (item.result === "Won") {
                  badgeClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold";
                  resultLabel = "Victoire (+3)";
                } else if (item.result === "Draw") {
                  badgeClass = "bg-sky-500/15 text-sky-400 border-sky-500/30 font-bold";
                  resultLabel = "Match Nul (+1)";
                } else if (item.result === "Lost") {
                  badgeClass = "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold";
                  resultLabel = "Défaite (0)";
                }

                return (
                  <div
                    key={item.roundNumber}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 py-1 rounded bg-slate-800 text-slate-300 font-mono font-bold text-center text-[11px] shrink-0">
                        J{item.roundNumber}
                      </span>

                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                        {item.isHome ? "DOM" : "EXT"}
                      </span>

                      <div className="flex items-center gap-2 font-semibold text-slate-200">
                        <span>vs</span>
                        <img
                          src={getTeamLogoUrl(item.opponent)}
                          className="w-5 h-5 object-contain"
                          alt=""
                        />
                        <span className="font-bold">{item.opponent}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-black text-amber-300 text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {item.score || "-:-"}
                      </span>

                      <span className={`px-2.5 py-1 rounded-lg border text-[11px] ${badgeClass}`}>
                        {resultLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTeamForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFRONTATIONS DE LA JOURNÉE (J1 -> J38) */}
      {selectedRoundModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black font-mono text-sm">
                  J{selectedRoundModal}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <span>CONFRONTATIONS JOURNÉE {selectedRoundModal}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Rangs d'entrée de chaque équipe avant le coup d'envoi de la Journée {selectedRoundModal}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRoundModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of all matches in Journée selectedRoundModal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {getRoundMatchesForModal(selectedRoundModal).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-mono">
                  Aucun match trouvé pour la Journée {selectedRoundModal}
                </div>
              ) : (
                getRoundMatchesForModal(selectedRoundModal).map((match, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-3 sm:p-4 rounded-xl flex items-center justify-between gap-2 sm:gap-4 transition-colors"
                  >
                    {/* Home Team */}
                    <div className="flex-1 flex items-center justify-end gap-2 text-right min-w-0">
                      <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                        {match.homeTeam}
                      </span>
                      <div className="relative w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                        <img
                          src={getTeamLogoUrl(match.homeTeam)}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                        {match.homeRankAtRound !== undefined && match.homeRankAtRound !== null && (
                          <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[8px] font-black px-1 rounded-tl shadow">
                            R{match.homeRankAtRound}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score / Status Badge */}
                    <div className="flex flex-col items-center justify-center px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl min-w-[85px] sm:min-w-[100px] shrink-0 font-mono">
                      <span className="text-sm sm:text-base font-black text-amber-400">
                        {match.score || "-:-"}
                      </span>
                      {match.halfTimeScore && (
                        <span className="text-[10px] text-slate-400">
                          MT: {match.halfTimeScore}
                        </span>
                      )}
                      {!match.score && (
                        <span className="text-[9px] text-slate-500 font-sans font-bold">
                          À Venir
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex items-center justify-start gap-2 text-left min-w-0">
                      <div className="relative w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                        <img
                          src={getTeamLogoUrl(match.awayTeam)}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                        {match.awayRankAtRound !== undefined && match.awayRankAtRound !== null && (
                          <span className="absolute bottom-0 right-0 bg-purple-600 text-white text-[8px] font-black px-1 rounded-tl shadow">
                            R{match.awayRankAtRound}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                        {match.awayTeam}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {getRoundMatchesForModal(selectedRoundModal).length} Confrontations
              </span>
              <button
                onClick={() => setSelectedRoundModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
