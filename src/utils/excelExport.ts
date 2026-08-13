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
  * Universal helper to resolve valid Event Category ID without season ID contamination
  */
export function getValidEventCategoryId(m: MatchExportRecord, activeCatId?: string | number): string | number {
  const candidateCatIds = [
    m.eventCategoryId,
    (m as any).rawMatch?.eventCategoryId,
    (m as any).categoryId,
    (m as any).rawMatch?.categoryId,
  ];

  for (const c of candidateCatIds) {
    if (c !== undefined && c !== null && c !== 0 && String(c).trim() !== "") {
      // If c matches seasonId (e.g. season number 31254), ignore it if activeCatId exists
      if (m.seasonId && String(c) === String(m.seasonId) && activeCatId) {
        continue;
      }
      return c;
    }
  }

  if (activeCatId !== undefined && activeCatId !== null && activeCatId !== 0 && String(activeCatId).trim() !== "") {
    return activeCatId;
  }

  return m.competitionId || 0;
}

/**
 * Helper to add Sheet 2: "Pivot TCD Matchs" (Native Excel Table Object + Slicer Bar)
 */
function addPivotTableSheet(workbook: ExcelJS.Workbook, matches: MatchExportRecord[], activeCatId?: string | number) {
  const pivotSheet = workbook.addWorksheet("Pivot TCD Matchs", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 5 }]
  });

  // 1. TOP CRITERIA & SLICER SECTION (Rows 1 to 3)
  pivotSheet.getCell("A1").value = "Compétition";
  pivotSheet.getCell("A1").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  pivotSheet.getCell("B1").value = "(All)";
  pivotSheet.getCell("B1").font = { name: "Segoe UI", size: 10, color: { argb: "FF2563EB" }, bold: true };
  pivotSheet.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  pivotSheet.getCell("B1").alignment = { vertical: "middle", horizontal: "center" };
  pivotSheet.getCell("B1").border = {
    top: { style: "thin", color: { argb: "FF93C5FD" } },
    bottom: { style: "thin", color: { argb: "FF93C5FD" } },
    left: { style: "thin", color: { argb: "FF93C5FD" } },
    right: { style: "thin", color: { argb: "FF93C5FD" } }
  };

  const displayCatId = matches.length > 0 ? getValidEventCategoryId(matches[0], activeCatId) : (activeCatId || "(All)");
  pivotSheet.getCell("A2").value = "ID Event Category";
  pivotSheet.getCell("A2").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  pivotSheet.getCell("B2").value = `#${displayCatId}`;
  pivotSheet.getCell("B2").font = { name: "Segoe UI", size: 10, color: { argb: "FF2563EB" }, bold: true };
  pivotSheet.getCell("B2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  pivotSheet.getCell("B2").alignment = { vertical: "middle", horizontal: "center" };
  pivotSheet.getCell("B2").border = {
    top: { style: "thin", color: { argb: "FF93C5FD" } },
    bottom: { style: "thin", color: { argb: "FF93C5FD" } },
    left: { style: "thin", color: { argb: "FF93C5FD" } },
    right: { style: "thin", color: { argb: "FF93C5FD" } }
  };

  pivotSheet.getCell("A3").value = "ID Match";
  pivotSheet.getCell("A3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  pivotSheet.getCell("B3").value = "(All)";
  pivotSheet.getCell("B3").font = { name: "Segoe UI", size: 10, color: { argb: "FF2563EB" }, bold: true };
  pivotSheet.getCell("B3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  pivotSheet.getCell("B3").alignment = { vertical: "middle", horizontal: "center" };
  pivotSheet.getCell("B3").border = {
    top: { style: "thin", color: { argb: "FF93C5FD" } },
    bottom: { style: "thin", color: { argb: "FF93C5FD" } },
    left: { style: "thin", color: { argb: "FF93C5FD" } },
    right: { style: "thin", color: { argb: "FF93C5FD" } }
  };

  // Journée Slicer Box (C1:M1 + C2:M2)
  pivotSheet.mergeCells("C1:M1");
  const sliceHead = pivotSheet.getCell("C1");
  sliceHead.value = "Journée (Slicer / Segment d'Analyse)";
  sliceHead.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  sliceHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  sliceHead.alignment = { vertical: "middle", horizontal: "center" };

  const rounds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  rounds.forEach((r, i) => {
    const colLetter = String.fromCharCode(67 + i);
    const cell = pivotSheet.getCell(`${colLetter}2`);
    cell.value = r;
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E3A8A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF3B82F6" } },
      bottom: { style: "thin", color: { argb: "FF3B82F6" } },
      left: { style: "thin", color: { argb: "FF3B82F6" } },
      right: { style: "thin", color: { argb: "FF3B82F6" } }
    };
  });

  pivotSheet.getRow(4).height = 10;

  // Build rows array for native Excel Table Object
  const tableRows: any[][] = matches.map((m) => {
    const scoreParts = (m.score || "0-0").split(/[:\-]/).map((s) => parseInt(s.trim(), 10) || 0);
    const hScore = scoreParts[0] || 0;
    const aScore = scoreParts[1] || 0;
    const totalGoals = hScore + aScore;
    const outcome = hScore > aScore ? "1" : aScore > hScore ? "2" : "X";

    return [
      m.roundNumber || 1,
      m.homeRankAtRound ?? m.homeRank ?? "-",
      m.awayRankAtRound ?? m.awayRank ?? "-",
      m.homePoints ?? 0,
      m.awayPoints ?? 0,
      m.homeOdds || null,
      m.drawOdds || null,
      m.awayOdds || null,
      m.score || "0-0",
      m.halfTimeScore || "0-0",
      m.goalMinutes || "",
      outcome,
      totalGoals
    ];
  });

  // Create official native Excel Table object (ListObject)
  pivotSheet.addTable({
    name: 'TablePivotMatchs',
    ref: 'A5',
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium2', // Royal Blue theme matching user screenshot!
      showRowStripes: true,
    },
    columns: [
      { name: 'Journée', filterButton: true },
      { name: 'Rang D. (Au Round)', filterButton: true },
      { name: 'Rang E. (Au Round)', filterButton: true },
      { name: 'Points Dom', filterButton: true, totalsRowFunction: 'sum' },
      { name: 'Points Ext', filterButton: true, totalsRowFunction: 'sum' },
      { name: 'Cote 1 (Dom)', filterButton: true, totalsRowFunction: 'average' },
      { name: 'Cote X (Nul)', filterButton: true, totalsRowFunction: 'average' },
      { name: 'Cote 2 (Ext)', filterButton: true, totalsRowFunction: 'average' },
      { name: 'Score FT', filterButton: true },
      { name: 'Score MT', filterButton: true },
      { name: 'Minutages des Buts', filterButton: true },
      { name: 'Issue (1X2)', filterButton: true },
      { name: 'Sum of Total Buts', filterButton: true, totalsRowFunction: 'sum' },
    ],
    rows: tableRows.length > 0 ? tableRows : [
      [1, "-", "-", 0, 0, null, null, null, "0-0", "0-0", "", "-", 0]
    ],
  });

  // Formatting refinements
  const totalRowsCount = Math.max(matches.length, 1);
  for (let rIdx = 0; rIdx < totalRowsCount; rIdx++) {
    const rowIdx = rIdx + 6;
    const row = pivotSheet.getRow(rowIdx);
    row.height = 21;
    row.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      if (colIdx === 6 || colIdx === 7 || colIdx === 8) {
        if (typeof cell.value === "number") cell.numFmt = "0.00";
      }
      if (colIdx === 11) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  }

  // Adjust Column Widths
  pivotSheet.columns.forEach((column) => {
    column.width = 16;
  });
}

/**
 * Helper to add Sheet 3: "Recherche Rapide (=FILTER)" with OpenXML _xlfn. namespace formula
 */
function addDynamicFilterSheet(workbook: ExcelJS.Workbook, matchesCount: number) {
  const searchSheet = workbook.addWorksheet("Recherche Rapide (=FILTER)", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 6 }]
  });

  // Title Banner
  searchSheet.mergeCells("A1:M1");
  const titleCell = searchSheet.getCell("A1");
  titleCell.value = "🔍 RECHERCHE RAPIDE DYNAMIQUE EXCEL (=FILTER)";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // Criteria Instructions
  searchSheet.mergeCells("A2:M2");
  const subTitle = searchSheet.getCell("A2");
  subTitle.value = "Saisissez vos critères ci-dessous (B3 = Journée, E3 = Issue 1X2, H3 = Nom d'Équipe). Le tableau ci-dessous s'actualise en temps réel !";
  subTitle.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FFCBD5E1" } };
  subTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  subTitle.alignment = { vertical: "middle", horizontal: "center" };

  // Search Criteria Input Fields (Row 3)
  searchSheet.getCell("A3").value = "Filtre Journée (J) :";
  searchSheet.getCell("A3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  searchSheet.getCell("B3").value = "";
  searchSheet.getCell("B3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };
  searchSheet.getCell("B3").border = {
    top: { style: "medium", color: { argb: "FFEAB308" } },
    bottom: { style: "medium", color: { argb: "FFEAB308" } },
    left: { style: "medium", color: { argb: "FFEAB308" } },
    right: { style: "medium", color: { argb: "FFEAB308" } }
  };

  searchSheet.getCell("D3").value = "Filtre Issue (1/X/2) :";
  searchSheet.getCell("D3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  searchSheet.getCell("E3").value = "";
  searchSheet.getCell("E3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };
  searchSheet.getCell("E3").border = {
    top: { style: "medium", color: { argb: "FFEAB308" } },
    bottom: { style: "medium", color: { argb: "FFEAB308" } },
    left: { style: "medium", color: { argb: "FFEAB308" } },
    right: { style: "medium", color: { argb: "FFEAB308" } }
  };

  searchSheet.getCell("G3").value = "Filtre Équipe :";
  searchSheet.getCell("G3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
  searchSheet.getCell("H3").value = "";
  searchSheet.getCell("H3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };
  searchSheet.getCell("H3").border = {
    top: { style: "medium", color: { argb: "FFEAB308" } },
    bottom: { style: "medium", color: { argb: "FFEAB308" } },
    left: { style: "medium", color: { argb: "FFEAB308" } },
    right: { style: "medium", color: { argb: "FFEAB308" } }
  };

  searchSheet.getRow(4).height = 8;
  searchSheet.getRow(5).height = 8;

  // Table Headers
  const headers = [
    "Journée",
    "Rang D. (Au Round)",
    "Rang E. (Au Round)",
    "Points Dom",
    "Points Ext",
    "Cote 1 (Dom)",
    "Cote X (Nul)",
    "Cote 2 (Ext)",
    "Score FT",
    "Score MT",
    "Minutages des Buts",
    "Issue (1X2)",
    "Sum of Total Buts"
  ];

  const headerRow = searchSheet.getRow(6);
  headerRow.height = 26;

  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF064E3B" } },
      bottom: { style: "medium", color: { argb: "FF064E3B" } },
      left: { style: "thin", color: { argb: "FF34D399" } },
      right: { style: "thin", color: { argb: "FF34D399" } }
    };
  });

  const maxDataRow = Math.max(matchesCount + 6, 500);

  // Dynamic _xlfn.FILTER formula in OpenXML namespace syntax
  const xlfnFormula = `_xlfn.IFERROR(_xlfn.FILTER('Pivot TCD Matchs'!A6:M${maxDataRow}, (_xlfn.ISBLANK(B3) + ('Pivot TCD Matchs'!A6:A${maxDataRow}=B3) > 0) * (_xlfn.ISBLANK(E3) + ('Pivot TCD Matchs'!L6:L${maxDataRow}=E3) > 0)), "Aucun résultat ne correspond à votre recherche")`;

  const dynamicCell = searchSheet.getCell("A7");
  dynamicCell.value = {
    formula: xlfnFormula,
    result: undefined
  };

  searchSheet.columns.forEach((column) => {
    column.width = 16;
  });
}

/**
 * EXPORT 1: Clean Data XLSX Export with AutoFilter, Frozen Header, Pivot TCD & Dynamic FILTER
 */
export async function exportXlsxData(matches: MatchExportRecord[], activeCatId?: string | number) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sporty Extractor App";
  workbook.created = new Date();

  // Sheet 1: BDD Matchs Sporty
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
      bottom: { style: "medium", color: { argb: "FFF59E0B" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } }
    };
  });

  // Data Rows
  matches.forEach((m, idx) => {
    const itemCatId = getValidEventCategoryId(m, activeCatId);
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

      if (colNumber === 3 || colNumber === 5 || colNumber === 14) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      if (colNumber === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0369A1" } };
      }

      if (colNumber === 7) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
      }

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

      if (colNumber >= 17 && colNumber <= 26 && typeof cell.value === "number") {
        cell.numFmt = "0.00";
        if (colNumber === 17) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        if (colNumber === 18) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
        if (colNumber === 19) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
      }
    });
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: matches.length + 1, column: headers.length }
  };

  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 3, 11), 40);
  });

  // Sheet 2: Pivot TCD Matchs
  addPivotTableSheet(workbook, matches, activeCatId);

  // Sheet 3: Recherche Rapide
  addDynamicFilterSheet(workbook, matches.length);

  // Generate Buffer and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `Export_BDD_Matchs_Sporty_${timestamp}.xlsx`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * EXPORT 2: Executive Styled Excel Report with Dashboard Header, KPI Cards, Pivot TCD & Dynamic FILTER
 */
export async function exportStyledExcelReport(matches: MatchExportRecord[], activeCatId?: string | number) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sporty AI Analytics";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Rapport Sporty Global", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 9 }]
  });

  // 1. BANNER HEADER (Row 1-2)
  worksheet.mergeCells("A1:AE2");
  const banner = worksheet.getCell("A1");
  banner.value = "📊 SPORTY BET261 - RAPPORT D'EXTRACTION DE BASE DE DONNÉES MATCHS & ANAMNÈSE";
  banner.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  banner.alignment = { vertical: "middle", horizontal: "center" };

  // 2. KPI SUMMARY CARDS (Rows 4-6)
  const totalMatches = matches.length;
  let homeWins = 0, draws = 0, awayWins = 0;
  let over25Count = 0, bttsCount = 0;
  let totalGoalsSum = 0;

  matches.forEach((m) => {
    const scoreParts = (m.score || "0-0").split(/[:\-]/).map((s) => parseInt(s.trim(), 10) || 0);
    const h = scoreParts[0] || 0;
    const a = scoreParts[1] || 0;
    const tot = h + a;
    totalGoalsSum += tot;

    if (h > a) homeWins++;
    else if (a > h) awayWins++;
    else draws++;

    if (tot > 2.5) over25Count++;
    if (h > 0 && a > 0) bttsCount++;
  });

  const avgGoals = totalMatches > 0 ? (totalGoalsSum / totalMatches).toFixed(2) : "0.00";
  const homeWinPct = totalMatches > 0 ? ((homeWins / totalMatches) * 100).toFixed(1) : "0";
  const drawPct = totalMatches > 0 ? ((draws / totalMatches) * 100).toFixed(1) : "0";
  const awayWinPct = totalMatches > 0 ? ((awayWins / totalMatches) * 100).toFixed(1) : "0";
  const over25Pct = totalMatches > 0 ? ((over25Count / totalMatches) * 100).toFixed(1) : "0";
  const bttsPct = totalMatches > 0 ? ((bttsCount / totalMatches) * 100).toFixed(1) : "0";

  // KPI 1: Total Matchs
  worksheet.mergeCells("A4:C4");
  worksheet.getCell("A4").value = "TOTAL MATCHS BDD";
  worksheet.getCell("A4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF64748B" } };
  worksheet.getCell("A4").alignment = { horizontal: "center" };

  worksheet.mergeCells("A5:C6");
  const kpi1 = worksheet.getCell("A5");
  kpi1.value = totalMatches;
  kpi1.font = { name: "Segoe UI", size: 20, bold: true, color: { argb: "FF1E293B" } };
  kpi1.alignment = { horizontal: "center", vertical: "middle" };
  kpi1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  // KPI 2: Victoires Domicile (1)
  worksheet.mergeCells("E4:G4");
  worksheet.getCell("E4").value = "VICTOIRES DOMICILE (1)";
  worksheet.getCell("E4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF047857" } };
  worksheet.getCell("E4").alignment = { horizontal: "center" };

  worksheet.mergeCells("E5:G6");
  const kpi2 = worksheet.getCell("E5");
  kpi2.value = `${homeWins} (${homeWinPct}%)`;
  kpi2.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF047857" } };
  kpi2.alignment = { horizontal: "center", vertical: "middle" };
  kpi2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };

  // KPI 3: Matchs Nuls (X)
  worksheet.mergeCells("I4:K4");
  worksheet.getCell("I4").value = "MATCHS NULS (X)";
  worksheet.getCell("I4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFB45309" } };
  worksheet.getCell("I4").alignment = { horizontal: "center" };

  worksheet.mergeCells("I5:K6");
  const kpi3 = worksheet.getCell("I5");
  kpi3.value = `${draws} (${drawPct}%)`;
  kpi3.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FFB45309" } };
  kpi3.alignment = { horizontal: "center", vertical: "middle" };
  kpi3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };

  // KPI 4: Over 2.5 Buts
  worksheet.mergeCells("M4:O4");
  worksheet.getCell("M4").value = "OVER 2.5 BUTS (>2.5)";
  worksheet.getCell("M4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF2563EB" } };
  worksheet.getCell("M4").alignment = { horizontal: "center" };

  worksheet.mergeCells("M5:O6");
  const kpi4 = worksheet.getCell("M5");
  kpi4.value = `${over25Count} (${over25Pct}%)`;
  kpi4.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF2563EB" } };
  kpi4.alignment = { horizontal: "center", vertical: "middle" };
  kpi4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };

  // KPI 5: BTTS / GG (Les Deux Marquent)
  worksheet.mergeCells("Q4:S4");
  worksheet.getCell("Q4").value = "BTTS / GG (OUI)";
  worksheet.getCell("Q4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF7C3AED" } };
  worksheet.getCell("Q4").alignment = { horizontal: "center" };

  worksheet.mergeCells("Q5:S6");
  const kpi5 = worksheet.getCell("Q5");
  kpi5.value = `${bttsCount} (${bttsPct}%)`;
  kpi5.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF7C3AED" } };
  kpi5.alignment = { horizontal: "center", vertical: "middle" };
  kpi5.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };

  // KPI 6: Moyenne Buts par Match
  worksheet.mergeCells("U4:W4");
  worksheet.getCell("U4").value = "MOYENNE BUTS/MATCH";
  worksheet.getCell("U4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
  worksheet.getCell("U4").alignment = { horizontal: "center" };

  worksheet.mergeCells("U5:W6");
  const kpi6 = worksheet.getCell("U5");
  kpi6.value = `${avgGoals} buts`;
  kpi6.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
  kpi6.alignment = { horizontal: "center", vertical: "middle" };
  kpi6.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

  // 3. TABLE HEADERS (Row 9)
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

  const headerRow = worksheet.getRow(9);
  headerRow.height = 28;

  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } }
    };
  });

  // Data Rows starting row 10
  matches.forEach((m, idx) => {
    const itemCatId = getValidEventCategoryId(m, activeCatId);
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

    const row = worksheet.getRow(10 + idx);
    row.height = 22;

    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.font = { name: "Segoe UI", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFEDF2F7" } }
      };

      if (colIdx === 2 || colIdx === 4 || colIdx === 13) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      if (colIdx === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0369A1" } };
      }

      if (colIdx === 6) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
      }

      if (colIdx === 8) {
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

      if (colIdx >= 16 && colIdx <= 25 && typeof val === "number") {
        cell.numFmt = "0.00";
      }
    });
  });

  worksheet.autoFilter = {
    from: { row: 9, column: 1 },
    to: { row: matches.length + 9, column: headers.length }
  };

  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 3, 11), 40);
  });

  // Sheet 2: Pivot TCD Matchs
  addPivotTableSheet(workbook, matches, activeCatId);

  // Sheet 3: Recherche Rapide
  addDynamicFilterSheet(workbook, matches.length);

  // Buffer and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `Rapport_Styled_Sporty_${timestamp}.xlsx`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
