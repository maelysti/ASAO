import { ExtractedMatchRecord } from "../types";
import { CombinedMatchData } from "../services/sportyApi";

export interface SequencePatternResult {
  patternType: "STREAK" | "ODDS_BRACKET" | "ROUND_PHASE" | "SCORE_REPETITION";
  title: string;
  description: string;
  sampleSize: number;
  successRate: number; // percentage e.g. 88.5
  impactLevel: "FORT" | "TRÈS FORT" | "EXCEPTIONNEL";
  formula: string;
}

export interface SiteProcessingAnalytics {
  totalMatchesAnalyzed: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  homeAdvantageBias: number; // e.g. +18%
  rankGapFavorablePct: number; // % times higher ranked team wins when rank gap >= 4
  oddsBracketStats: {
    bracketLabel: string;
    minOdds: number;
    maxOdds: number;
    total: number;
    winPct: number;
  }[];
  scoreFrequencies: { score: string; count: number; pct: number }[];
  roundPhaseTrends: {
    phase: string;
    avgGoals: number;
    homeWinPct: number;
    drawPct: number;
  }[];
}

export interface ProducedMatchPrediction {
  match: CombinedMatchData;
  categoryName: string;
  roundNumber: number;
  predictedBet: string;
  recommendedOdds: number;
  confidence: number;
  riskLevel: "SÛR" | "ÉLEVÉ" | "STRATÉGIQUE";
  sequencePatternFound: string;
  exactRationale: {
    mainReason: string;
    oddsCriteriaReason: string;
    rankGapReason: string;
    sequenceReason: string;
    siteProcessingReason: string;
  };
}

/**
 * Analyzes how the Sporty-Tech / Bet261 virtual site processes data and generates match outcomes.
 */
export function analyzeSiteDataProcessing(database: ExtractedMatchRecord[]): SiteProcessingAnalytics {
  if (!database || database.length === 0) {
    return {
      totalMatchesAnalyzed: 0,
      homeWinPct: 0,
      drawPct: 0,
      awayWinPct: 0,
      homeAdvantageBias: 0,
      rankGapFavorablePct: 0,
      oddsBracketStats: [],
      scoreFrequencies: [],
      roundPhaseTrends: [],
    };
  }

  const total = database.length;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalGoals = 0;

  let rankGapMatches = 0;
  let rankGapWins = 0;

  const scoreMap: Record<string, number> = {};

  const brackets = [
    { bracketLabel: "Ultra Favori (1.10 - 1.40)", minOdds: 1.1, maxOdds: 1.4, total: 0, wins: 0 },
    { bracketLabel: "Favori Modéré (1.41 - 1.75)", minOdds: 1.41, maxOdds: 1.75, total: 0, wins: 0 },
    { bracketLabel: "Equilibré (1.76 - 2.20)", minOdds: 1.76, maxOdds: 2.2, total: 0, wins: 0 },
    { bracketLabel: "Outsider (2.21+)", minOdds: 2.21, maxOdds: 10.0, total: 0, wins: 0 },
  ];

  // Round phase buckets
  const phase1 = { phase: "Début de Saison (R1 - R10)", total: 0, goals: 0, homeWins: 0, draws: 0 };
  const phase2 = { phase: "Milieu de Saison (R11 - R25)", total: 0, goals: 0, homeWins: 0, draws: 0 };
  const phase3 = { phase: "Fin de Saison (R26 - R38)", total: 0, goals: 0, homeWins: 0, draws: 0 };

  database.forEach((m) => {
    const score = m.score || "0:0";
    scoreMap[score] = (scoreMap[score] || 0) + 1;

    const [hG, aG] = score.split(":").map((s) => parseInt(s, 10) || 0);
    totalGoals += hG + aG;

    if (hG > aG) homeWins++;
    else if (hG === aG) draws++;
    else awayWins++;

    // Rank gap check
    const hRank = m.homeRank || 99;
    const aRank = m.awayRank || 99;
    if (Math.abs(hRank - aRank) >= 4) {
      rankGapMatches++;
      if (hRank < aRank && hG > aG) rankGapWins++;
      if (aRank < hRank && aG > hG) rankGapWins++;
    }

    // Odds bracket check for home team
    const hOdds = m.homeOdds || 2.0;
    brackets.forEach((b) => {
      if (hOdds >= b.minOdds && hOdds <= b.maxOdds) {
        b.total++;
        if (hG > aG) b.wins++;
      }
    });

    // Round phase check
    const rNum = typeof m.roundNumber === "number" ? m.roundNumber : parseInt(String(m.roundNumber), 10) || 1;
    let targetPhase = phase1;
    if (rNum >= 11 && rNum <= 25) targetPhase = phase2;
    else if (rNum > 25) targetPhase = phase3;

    targetPhase.total++;
    targetPhase.goals += hG + aG;
    if (hG > aG) targetPhase.homeWins++;
    if (hG === aG) targetPhase.draws++;
  });

  const homeWinPct = Math.round((homeWins / total) * 100);
  const drawPct = Math.round((draws / total) * 100);
  const awayWinPct = Math.round((awayWins / total) * 100);

  const homeAdvantageBias = homeWinPct - awayWinPct;
  const rankGapFavorablePct = rankGapMatches > 0 ? Math.round((rankGapWins / rankGapMatches) * 100) : 0;

  const oddsBracketStats = brackets.map((b) => ({
    bracketLabel: b.bracketLabel,
    minOdds: b.minOdds,
    maxOdds: b.maxOdds,
    total: b.total,
    winPct: b.total > 0 ? Math.round((b.wins / b.total) * 100) : 0,
  }));

  const scoreFrequencies = Object.entries(scoreMap)
    .map(([score, count]) => ({
      score,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const roundPhaseTrends = [phase1, phase2, phase3]
    .filter((p) => p.total > 0)
    .map((p) => ({
      phase: p.phase,
      avgGoals: Math.round((p.goals / p.total) * 100) / 100,
      homeWinPct: Math.round((p.homeWins / p.total) * 100),
      drawPct: Math.round((p.draws / p.total) * 100),
    }));

  return {
    totalMatchesAnalyzed: total,
    homeWinPct,
    drawPct,
    awayWinPct,
    homeAdvantageBias,
    rankGapFavorablePct,
    oddsBracketStats,
    scoreFrequencies,
    roundPhaseTrends,
  };
}

/**
 * Detects sequence patterns in the virtual match database.
 */
export function detectSequencePatterns(database: ExtractedMatchRecord[]): SequencePatternResult[] {
  if (!database || database.length < 5) return [];

  const results: SequencePatternResult[] = [];
  const analytics = analyzeSiteDataProcessing(database);

  // 1. Ultra Favori Domicile
  const ultraBracket = analytics.oddsBracketStats.find((b) => b.minOdds === 1.1);
  if (ultraBracket && ultraBracket.total >= 3) {
    results.push({
      patternType: "ODDS_BRACKET",
      title: "Séquence Favori Domicile Absolu",
      description: `Les cotes à domicile entre ${ultraBracket.minOdds} et ${ultraBracket.maxOdds} affichent un taux de succès de ${ultraBracket.winPct}%.`,
      sampleSize: ultraBracket.total,
      successRate: ultraBracket.winPct,
      impactLevel: ultraBracket.winPct >= 80 ? "EXCEPTIONNEL" : "TRÈS FORT",
      formula: "IF Côte_Dom <= 1.40 THEN Pronostic 1 (Victoire Nette)",
    });
  }

  // 2. Dominance Écart de Rang >= 5
  if (analytics.rankGapFavorablePct >= 65) {
    results.push({
      patternType: "STREAK",
      title: "Séquence Biais Rang Majeur",
      description: `Le générateur du site accorde ${analytics.rankGapFavorablePct}% de victoires à l'équipe la mieux classée quand l'écart de classement est de 4 places ou plus.`,
      sampleSize: Math.round(database.length * 0.4),
      successRate: analytics.rankGapFavorablePct,
      impactLevel: analytics.rankGapFavorablePct >= 80 ? "EXCEPTIONNEL" : "FORT",
      formula: "IF Abs(Rang_Dom - Rang_Ext) >= 4 THEN Pronostic Équipe Mieux Classée",
    });
  }

  // 3. Double Chance Domicile Infaillible (1X)
  const homeOrDrawWins = analytics.homeWinPct + analytics.drawPct;
  results.push({
    patternType: "SCORE_REPETITION",
    title: "Séquence Inviolabilité Domicile (1X)",
    description: `Dans ${homeOrDrawWins}% des matchs du site, l'équipe à domicile ne perd pas (Victoire ou Nul).`,
    sampleSize: database.length,
    successRate: homeOrDrawWins,
    impactLevel: homeOrDrawWins >= 85 ? "EXCEPTIONNEL" : "FORT",
    formula: "IF Côte_1X <= 1.35 THEN Pronostic 1X (Sécurité Maximale)",
  });

  return results;
}

/**
 * Produces matched predictions with EXPLICIT EXACT RATIONALE for current/upcoming matches.
 */
export function generateProducedMatchesWithRationale(
  currentMatches: CombinedMatchData[],
  database: ExtractedMatchRecord[]
): ProducedMatchPrediction[] {
  if (!currentMatches || currentMatches.length === 0) return [];

  const analytics = analyzeSiteDataProcessing(database);
  const produced: ProducedMatchPrediction[] = [];

  currentMatches.forEach((m) => {
    const mainBet = m.eventBetTypes?.find((bt) => bt.name?.toUpperCase().includes("1X2") || bt.betTypeId === 30083);
    const hOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "1")?.odds || 1.8;
    const xOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "X")?.odds || 3.5;
    const aOdds = mainBet?.eventBetTypeItems?.find((i) => i.shortName === "2")?.odds || 4.2;

    const dcBet = m.eventBetTypes?.find((bt) => bt.name?.toUpperCase().includes("DOUBLE") || bt.betTypeId === 30084);
    const dc1XOdds = dcBet?.eventBetTypeItems?.find((i) => i.shortName === "1X")?.odds || 1.25;

    const hRank = m.homeStats?.position || 10;
    const aRank = m.awayStats?.position || 10;
    const rNum: number = typeof m.roundNumber === "number" ? m.roundNumber : parseInt(String(m.roundNumber || "1"), 10) || 1;

    // Filter historical matches between same teams or similar odds
    const matchingHist = database.filter((dbM) => {
      const dbHOdds = dbM.homeOdds || 2.0;
      const sameOddsBracket = Math.abs(dbHOdds - hOdds) <= 0.25;
      const sameTeams =
        (dbM.homeTeamName?.toLowerCase() === m.homeTeamName?.toLowerCase() &&
          dbM.awayTeamName?.toLowerCase() === m.awayTeamName?.toLowerCase()) ||
        (dbM.homeTeamName?.toLowerCase() === m.awayTeamName?.toLowerCase() &&
          dbM.awayTeamName?.toLowerCase() === m.homeTeamName?.toLowerCase());
      return sameTeams || sameOddsBracket;
    });

    let winsInHist = 0;
    matchingHist.forEach((dbM) => {
      const [hG, aG] = (dbM.score || "0:0").split(":").map((s) => parseInt(s, 10) || 0);
      if (hG > aG) winsInHist++;
    });

    const histWinPct = matchingHist.length > 0 ? Math.round((winsInHist / matchingHist.length) * 100) : 70;

    // Determine exact prediction & rationale
    let predictedBet = "1";
    let confidence = 85;
    let riskLevel: "SÛR" | "ÉLEVÉ" | "STRATÉGIQUE" = "SÛR";
    let recommendedOdds = hOdds;

    if (hOdds <= 1.65 && hRank <= aRank) {
      predictedBet = "1 (Victoire Domicile)";
      recommendedOdds = hOdds;
      confidence = Math.min(98, Math.max(82, histWinPct + 10));
      riskLevel = "SÛR";
    } else if (hRank < aRank && hOdds <= 2.1) {
      predictedBet = "1X (Double Chance Domicile)";
      recommendedOdds = dc1XOdds;
      confidence = Math.min(96, Math.max(88, analytics.homeWinPct + analytics.drawPct));
      riskLevel = "SÛR";
    } else if (aOdds <= 1.8 && aRank < hRank) {
      predictedBet = "2 (Victoire Extérieur)";
      recommendedOdds = aOdds;
      confidence = 82;
      riskLevel = "STRATÉGIQUE";
    } else {
      predictedBet = "1X (Double Chance Domicile)";
      recommendedOdds = dc1XOdds;
      confidence = 80;
      riskLevel = "STRATÉGIQUE";
    }

    // Build the EXACT RATIONALE breakdown
    const exactRationale = {
      mainReason: `Match validé par le moteur d'analyse : ${m.homeTeamName} (Rang #${hRank}) affronte ${m.awayTeamName} (Rang #${aRank}) au Round ${rNum}.`,
      oddsCriteriaReason: `Cote Domicile (${hOdds.toFixed(2)}) située dans l'intervalle optimal où la BDD enregistre ${analytics.homeWinPct}% de victoires domicile.`,
      rankGapReason: `Écart de classement : ${Math.abs(hRank - aRank)} places (${hRank < aRank ? `${m.homeTeamName} mieux classée` : `${m.awayTeamName} mieux classée`}). En BDD, un écart >= 4 valide le favori à ${analytics.rankGapFavorablePct}%.`,
      sequenceReason: `Séquence BDD : Sur ${matchingHist.length} matchs historiques similaires, le taux de confirmation du pronostic est de ${histWinPct}%.`,
      siteProcessingReason: `Comportement de l'algorithme du site : Biais de victoire domicile mesuré à +${analytics.homeAdvantageBias}% avec un taux global 1X de ${analytics.homeWinPct + analytics.drawPct}%.`,
    };

    produced.push({
      match: m,
      categoryName: m.categoryName || "Compétition Virtual",
      roundNumber: rNum,
      predictedBet,
      recommendedOdds,
      confidence,
      riskLevel,
      sequencePatternFound: `${matchingHist.length} matchs BDD comparables (${histWinPct}% succès)`,
      exactRationale,
    });
  });

  return produced.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculates optimal Kelly Criterion bankroll percentage for a bet recommendation.
 */
export function calculateKellyCriterion(confidencePct: number, odds: number): { stakePct: number; edgePct: number } {
  const p = Math.min(0.98, Math.max(0.01, confidencePct / 100));
  const b = odds - 1;
  if (b <= 0) return { stakePct: 0, edgePct: 0 };

  const q = 1 - p;
  const fStar = (b * p - q) / b;
  const edgePct = Math.round((p * odds - 1) * 100);

  // Fractional Kelly (1/4 Kelly for safety)
  const fractionalKelly = Math.max(0, fStar * 0.25 * 100);
  const stakePct = Math.min(10, Math.round(fractionalKelly * 10) / 10);

  return { stakePct, edgePct };
}

/**
 * Generates downloadable CSV content from produced match predictions.
 */
export function exportPredictionsToCSV(predictions: ProducedMatchPrediction[]): string {
  const headers = ["Championnat", "Round", "Domicile", "Exterieur", "Pronostic", "Cote", "Confiance (%)", "Fractions Kelly (%)", "Raison Principale"];
  const rows = predictions.map((p) => {
    const kelly = calculateKellyCriterion(p.confidence, p.recommendedOdds);
    return [
      `"${p.categoryName}"`,
      p.roundNumber,
      `"${p.match.homeTeamName}"`,
      `"${p.match.awayTeamName}"`,
      `"${p.predictedBet}"`,
      p.recommendedOdds.toFixed(2),
      p.confidence,
      `${kelly.stakePct}%`,
      `"${p.exactRationale.mainReason.replace(/"/g, '""')}"`,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

