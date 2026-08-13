import ExcelJS from "exceljs";

export interface MatchExportRecord {
  id: string | number;
  eventCategoryId?: string | number;
  competitionName?: string;
  roundNumber?: number;
  homeTeamName: string;
  awayTeamName: string;
  homeRankAtRound?: number | string;
  awayRankAtRound?: number | string;
  homeRank?: number | string;
  awayRank?: number | string;
  homePoints?: number;
  awayPoints?: number;
  score?: string;
  halfTimeScore?: string;
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
  doubleChanceOdds?: {
    dc1X?: number | null;
    dc12?: number | null;
    dcX2?: number | null;
  };
  overUnderOdds?: {
    over25?: number | null;
    under25?: number | null;
  };
  bothTeamsScoreOdds?: {
    yes?: number | null;
    no?: number | null;
  };
  goalMinutes?: string;
  status?: string;
  expectedStart?: string;
  extractedAt?: string;
  source?: string;
  [key: string]: any;
}

/**
 * EXPORT 1: Clean Data XLSX Export with AutoFilter, Frozen Header, Custom Widths & Formatting
 */
export async function exportXlsxData(matches: MatchExportRecord[], activeCatId?: string | number) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sporty Extractor App";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("BDD Matchs Sporty", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }]
  });

  const headers = [
    "ID Match",
    "ID Event Category",
    "Compétition",
    "Journée",
    "Équipe Domicile",
    "Rang D. (Au Round)",
    "Score FT",
    "Score MT",
    "Issue (1X2)",
    "Total Buts",
    "Marché > 2.5 Buts",
    "Marché BTTS / GG",
    "Rang E. (Au Round)",
    "Équipe Extérieur",
    "Points Dom",
    "Points Ext",
    "Cote 1 (Dom)",
    "Cote X (Nul)",
    "Cote 2 (Ext)",
    "Cote 1X (DC)",
    "Cote 12 (DC)",
    "Cote X2 (DC)",
    "Cote Over 2.5",
    "Cote Under 2.5",
    "Cote GG (Oui)",
    "Cote NG (Non)",
    "Minutages des Buts",
    "Statut Match",
    "Date / Heure Match",
    "Date Extraite",
    "Source Data"
  ];

  // Header Row
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" } // Dark Navy
    };
    cell.font = {
      name: "Segoe UI",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FFF59E0B" } }, // Gold bottom accent border
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } }
    };
  });

  // Data Rows
  matches.forEach((m, idx) => {
    const itemCatId = m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeCatId || m.competitionId || 0;
    const scoreParts = (m.score || "0-0").split(/[:\-]/).map((s) => parseInt(s.trim(), 10) || 0);
    const hScore = scoreParts[0] || 0;
    const aScore = scoreParts[1] || 0;
    const totalGoals = hScore + aScore;
    const outcome = hScore > aScore ? "1" : aScore > hScore ? "2" : "X";
    const over25Market = totalGoals > 2.5 ? "Over 2.5 (>2.5)" : "Under 2.5 (<2.5)";
    const bttsMarket = hScore > 0 && aScore > 0 ? "GG (Oui)" : "NG (Non)";

    const rowValues = [
      String(m.id || ""),
      `#${itemCatId}`,
      m.competitionName || "Ligue Virtuelle",
      m.roundNumber || 1,
      m.homeTeamName || "",
      m.homeRankAtRound ?? m.homeRank ?? "-",
      m.score || "0-0",
      m.halfTimeScore || "0-0",
      outcome,
      totalGoals,
      over25Market,
      bttsMarket,
      m.awayRankAtRound ?? m.awayRank ?? "-",
      m.awayTeamName || "",
      m.homePoints ?? 0,
      m.awayPoints ?? 0,
      m.homeOdds || null,
      m.drawOdds || null,
      m.awayOdds || null,
      m.doubleChanceOdds?.dc1X || null,
      m.doubleChanceOdds?.dc12 || null,
      m.doubleChanceOdds?.dcX2 || null,
      m.overUnderOdds?.over25 || null,
      m.overUnderOdds?.under25 || null,
      m.bothTeamsScoreOdds?.yes || null,
      m.bothTeamsScoreOdds?.no || null,
      m.goalMinutes || "",
      m.status === "Ended" || m.status === "Undisputed" || m.status === "Terminé" ? "Finished" : (m.status || "Finished"),
      m.expectedStart || "",
      m.extractedAt || new Date().toISOString().replace("T", " ").slice(0, 19),
      m.source || "Live Extraction"
    ];

    const row = worksheet.addRow(rowValues);
    row.height = 22;

    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg }
      };
      cell.font = {
        name: "Segoe UI",
        size: 10
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center"
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFEDF2F7" } }
      };

      // Left align text for team names & competition
      if (colNumber === 3 || colNumber === 5 || colNumber === 14) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Col 2: Cat ID Badge
      if (colNumber === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0369A1" } };
      }

      // Col 7: Score FT (Dark Slate Pill)
      if (colNumber === 7) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
      }

      // Col 9: Outcome Badge (1, X, 2)
      if (colNumber === 9) {
        if (outcome === "1") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF047857" } };
        } else if (outcome === "X") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFB45309" } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFBE123C" } };
        }
      }

      // Odds columns formatting (Decimal 0.00 & soft tint)
      if (colNumber >= 17 && colNumber <= 26 && typeof cell.value === "number") {
        cell.numFmt = "0.00";
        if (colNumber === 17) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        if (colNumber === 18) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
        if (colNumber === 19) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
      }
    });
  });

  // Enable AutoFilter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: matches.length + 1, column: headers.length }
  };

  // Adjust Column Widths
  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 44);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const fileName = `bdd_sporty_matches_eventCat_${activeCatId || "export"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadBlob(blob, fileName);
}

/**
 * EXPORT 2: Styled Excel Report with Banner, Colors, Averages Summary & Frozen Header
 */
export async function exportStyledExcelReport(matches: MatchExportRecord[], activeCatId?: string | number) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sporty Extractor App";
  workbook.created = new Date();

  // Freeze top 4 rows so Header row (Row 4) stays fixed when scrolling
  const worksheet = workbook.addWorksheet("Rapport BDD Sporty", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 4 }]
  });

  const catId = activeCatId || "global";
  const totalCount = matches.length;
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Row 1: Title Banner
  worksheet.mergeCells("A1:AE1");
  const bannerRow = worksheet.getRow(1);
  bannerRow.height = 36;
  const bannerCell = worksheet.getCell("A1");
  bannerCell.value = "RAPPORT D'EXTRACTION BASE DE DONNÉES SPORTY VIRTUAL";
  bannerCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFF59E0B" } }; // Amber / Gold
  bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Dark Navy
  bannerCell.alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Subtitle Banner
  worksheet.mergeCells("A2:AE2");
  const subRow = worksheet.getRow(2);
  subRow.height = 22;
  const subCell = worksheet.getCell("A2");
  subCell.value = `ID Event Category : #${catId}  |  Total Matchs Extraits : ${totalCount}  |  Date Export : ${dateStr}  |  Statut : Normalisé (Finished)`;
  subCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFCBD5E1" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: Blank Spacer
  worksheet.getRow(3).height = 10;

  // Row 4: Column Headers
  const headers = [
    "ID Match",
    "ID Event Category",
    "Compétition",
    "Journée",
    "Équipe Domicile",
    "Rang D.",
    "Score FT",
    "Score MT",
    "Issue 1X2",
    "Total Buts",
    "Marché > 2.5",
    "Marché BTTS / GG",
    "Rang E.",
    "Équipe Extérieur",
    "Points Dom",
    "Points Ext",
    "Cote 1",
    "Cote X",
    "Cote 2",
    "Cote 1X",
    "Cote 12",
    "Cote X2",
    "Cote > 2.5",
    "Cote < 2.5",
    "Cote GG",
    "Cote NG",
    "Minutes Buts",
    "Statut Match",
    "Date / Heure Match",
    "Date Extraite",
    "Source Data"
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate 800
    cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FFF59E0B" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } }
    };
  });

  // Calculate Averages
  let sum1 = 0, sumX = 0, sum2 = 0, sumOv = 0, countOdds = 0, countOv = 0;

  matches.forEach((m, idx) => {
    const itemCatId = m.eventCategoryId || (m as any).rawMatch?.eventCategoryId || activeCatId || m.competitionId || 0;
    const scoreParts = (m.score || "0-0").split(/[:\-]/).map((s) => parseInt(s.trim(), 10) || 0);
    const hScore = scoreParts[0] || 0;
    const aScore = scoreParts[1] || 0;
    const totalGoals = hScore + aScore;
    const outcome = hScore > aScore ? "1" : aScore > hScore ? "2" : "X";
    const over25Market = totalGoals > 2.5 ? "Over 2.5" : "Under 2.5";
    const bttsMarket = hScore > 0 && aScore > 0 ? "GG (Oui)" : "NG (Non)";

    if (m.homeOdds && m.drawOdds && m.awayOdds) {
      sum1 += m.homeOdds;
      sumX += m.drawOdds;
      sum2 += m.awayOdds;
      countOdds++;
    }
    if (m.overUnderOdds?.over25) {
      sumOv += m.overUnderOdds.over25;
      countOv++;
    }

    const rowValues = [
      String(m.id || ""),
      `#${itemCatId}`,
      m.competitionName || "Ligue Virtuelle",
      m.roundNumber || 1,
      m.homeTeamName || "",
      m.homeRankAtRound ? `#${m.homeRankAtRound}` : "-",
      m.score || "0-0",
      m.halfTimeScore || "0-0",
      outcome,
      totalGoals,
      over25Market,
      bttsMarket,
      m.awayRankAtRound ? `#${m.awayRankAtRound}` : "-",
      m.awayTeamName || "",
      m.homePoints ?? 0,
      m.awayPoints ?? 0,
      m.homeOdds || null,
      m.drawOdds || null,
      m.awayOdds || null,
      m.doubleChanceOdds?.dc1X || null,
      m.doubleChanceOdds?.dc12 || null,
      m.doubleChanceOdds?.dcX2 || null,
      m.overUnderOdds?.over25 || null,
      m.overUnderOdds?.under25 || null,
      m.bothTeamsScoreOdds?.yes || null,
      m.bothTeamsScoreOdds?.no || null,
      m.goalMinutes || "",
      "Finished",
      m.expectedStart || "",
      m.extractedAt || new Date().toISOString().replace("T", " ").slice(0, 19),
      m.source || "Live Extraction"
    ];

    const row = worksheet.addRow(rowValues);
    row.height = 22;

    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    row.eachCell((cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.font = { name: "Segoe UI", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFEDF2F7" } }
      };

      if (colNumber === 3 || colNumber === 5 || colNumber === 14) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Cat ID
      if (colNumber === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0284C7" } };
      }

      // Score FT
      if (colNumber === 7) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      }

      // Issue 1X2 Badge
      if (colNumber === 9) {
        if (outcome === "1") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF047857" } };
        } else if (outcome === "X") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD97706" } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFB91C1C" } };
        }
      }

      // Odds formatting
      if (colNumber >= 17 && colNumber <= 26 && typeof cell.value === "number") {
        cell.numFmt = "0.00";
        if (colNumber === 17) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        if (colNumber === 18) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
        if (colNumber === 19) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
      }
    });
  });

  // Enable AutoFilter on row 4
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: matches.length + 4, column: headers.length }
  };

  // Row Footer Summary
  const avg1 = countOdds > 0 ? (sum1 / countOdds) : null;
  const avgX = countOdds > 0 ? (sumX / countOdds) : null;
  const avg2 = countOdds > 0 ? (sum2 / countOdds) : null;
  const avgOv = countOv > 0 ? (sumOv / countOv) : null;

  const summaryRowValues = [
    "MOYENNES & BDD TOTAL",
    `#${catId}`,
    `Total : ${totalCount} Matchs`,
    "", "", "", "", "", "", "", "", "", "", "", "", "",
    avg1, avgX, avg2,
    "", "", "",
    avgOv,
    "", "", "", "", "", "", "", ""
  ];

  const summaryRow = worksheet.addRow(summaryRowValues);
  summaryRow.height = 26;

  summaryRow.eachCell((cell, colNumber) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFF59E0B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "double", color: { argb: "FFF59E0B" } },
      bottom: { style: "double", color: { argb: "FFF59E0B" } }
    };

    if (colNumber >= 17 && colNumber <= 23 && typeof cell.value === "number") {
      cell.numFmt = "0.00";
      if (colNumber === 17) cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF34D399" } };
      if (colNumber === 18) cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFBBF24" } };
      if (colNumber === 19) cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFF87171" } };
      if (colNumber === 23) cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF38BDF8" } };
    }
  });

  // Adjust Column Widths
  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 44);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const fileName = `bdd_sporty_stylee_eventCat_${catId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadBlob(blob, fileName);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
