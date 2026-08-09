// Utility functions for parsing match scores across Sporty-Tech / Bet261 API payloads

export interface ParsedScoreDetails {
  hasScore: boolean;
  hG: number | null;
  aG: number | null;
  scoreStr: string;
  htHG: number | null;
  htAG: number | null;
  htStr: string;
  totalGoalsStr: string;
  over25Str: string;
  outcome1X2: string;
}

export function parseMatchScoreDetails(m: any): ParsedScoreDetails {
  if (!m) {
    return {
      hasScore: false,
      hG: null,
      aG: null,
      scoreStr: "-",
      htHG: null,
      htAG: null,
      htStr: "-",
      totalGoalsStr: "-",
      over25Str: "-",
      outcome1X2: "-",
    };
  }

  const raw = m?.rawMatch || {};

  // Score string candidates
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

  let hG: number | null = null;
  let aG: number | null = null;

  for (const sc of scoreCandidates) {
    if (sc !== undefined && sc !== null && typeof sc === "string" && sc.trim().length > 0) {
      const norm = sc.replace(":", "-").trim();
      if (/^\d+\s*-\s*\d+$/.test(norm)) {
        const parts = norm.split("-").map((p) => parseInt(p.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          hG = parts[0];
          aG = parts[1];
          break;
        }
      }
    }
  }

  if (hG === null || aG === null) {
    const h = m?.homeScore ?? raw?.homeScore ?? m?.homeTeamScore ?? raw?.homeTeamScore;
    const a = m?.awayScore ?? raw?.awayScore ?? m?.awayTeamScore ?? raw?.awayTeamScore;
    if (h !== undefined && h !== null && a !== undefined && a !== null) {
      const numH = Number(h);
      const numA = Number(a);
      if (!isNaN(numH) && !isNaN(numA)) {
        hG = numH;
        aG = numA;
      }
    }
  }

  // Halftime score candidates
  let htHG: number | null = null;
  let htAG: number | null = null;

  const scoresArr = Array.isArray(m?.scores) && m.scores.length > 0 ? m.scores
    : Array.isArray(raw?.scores) && raw.scores.length > 0 ? raw.scores
    : [];

  if (scoresArr.length > 0) {
    scoresArr.forEach((s: any) => {
      const typeStr = String(s.type || s.period || s.name || "").toUpperCase();
      let valStr = s.score || s.value || (s.homeScore !== undefined && s.awayScore !== undefined ? `${s.homeScore}-${s.awayScore}` : null);
      if (valStr) {
        valStr = String(valStr).replace(":", "-").trim();
        if (/^\d+\s*-\s*\d+$/.test(valStr)) {
          const parts = valStr.split("-").map((p) => parseInt(p.trim(), 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (typeStr.includes("HALF") || typeStr.includes("HT") || typeStr === "1ST" || typeStr === "1") {
              htHG = parts[0];
              htAG = parts[1];
            } else if ((typeStr.includes("FULL") || typeStr.includes("FT") || typeStr === "2ND" || typeStr === "FINAL") && hG === null) {
              hG = parts[0];
              aG = parts[1];
            }
          }
        }
      }
    });
  }

  if (htHG === null || htAG === null) {
    const htCandidates = [
      m?.halfTimeScore,
      raw?.halfTimeScore,
      m?.htScore,
      raw?.htScore,
    ];
    for (const ht of htCandidates) {
      if (ht !== undefined && ht !== null && typeof ht === "string" && ht.trim().length > 0) {
        const norm = ht.replace(":", "-").trim();
        if (/^\d+\s*-\s*\d+$/.test(norm)) {
          const parts = norm.split("-").map((p) => parseInt(p.trim(), 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            htHG = parts[0];
            htAG = parts[1];
            break;
          }
        }
      }
    }
  }

  if (htHG === null || htAG === null) {
    const h = m?.homeHalfTimeScore ?? raw?.homeHalfTimeScore;
    const a = m?.awayHalfTimeScore ?? raw?.awayHalfTimeScore;
    if (h !== undefined && h !== null && a !== undefined && a !== null) {
      const numH = Number(h);
      const numA = Number(a);
      if (!isNaN(numH) && !isNaN(numA)) {
        htHG = numH;
        htAG = numA;
      }
    }
  }

  const hasScore = hG !== null && aG !== null;
  const scoreStr = hasScore ? `${hG} - ${aG}` : "-";
  const htStr = (htHG !== null && htAG !== null) ? `${htHG} - ${htAG}` : "-";

  let totalGoalsStr = "-";
  let over25Str = "-";
  let outcome1X2 = "-";

  if (hasScore && hG !== null && aG !== null) {
    const total = hG + aG;
    totalGoalsStr = String(total);
    over25Str = total > 2.5 ? "OUI" : "NON";
    if (hG > aG) {
      outcome1X2 = "1 (Dom)";
    } else if (aG > hG) {
      outcome1X2 = "2 (Ext)";
    } else {
      outcome1X2 = "X (Nul)";
    }
  }

  return {
    hasScore,
    hG,
    aG,
    scoreStr,
    htHG,
    htAG,
    htStr,
    totalGoalsStr,
    over25Str,
    outcome1X2,
  };
}
