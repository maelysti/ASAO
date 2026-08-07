import { RuleItem, RuleMatchEvaluation, AIRecapPrediction, InstantLeagueMatch, SportyEntryPoint } from "../types";

// Initial default rules including the user's explicit sample
export const DEFAULT_RULES: RuleItem[] = [
  {
    id: "#R1",
    betType: "1X2",
    generatedDate: "02/08/2026 à 21:09",
    title: "Anomalie de Classement",
    conditionText: "IFRank1 < Rank2 AND Odds1 > Odds2THEN2",
    assignedLeagueId: "ALL",
    assignedLeagueName: "Toutes les ligues",
    mode: "Manuel",
    stats: {
      successRate: 0,
      validatedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      totalCount: 0,
    },
    isActive: true,
  },
  {
    id: "#R2",
    betType: "Double Chance",
    generatedDate: "03/08/2026 à 14:15",
    title: "Invisibilité Domicile Top 5",
    conditionText: "IFRank1 <= 5 AND Odds1 < 2.10THEN1X",
    assignedLeagueId: "ALL",
    assignedLeagueName: "Toutes les ligues",
    mode: "Manuel",
    stats: {
      successRate: 0,
      validatedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      totalCount: 0,
    },
    isActive: true,
  },
  {
    id: "#R3",
    betType: "1X2",
    generatedDate: "04/08/2026 à 19:40",
    title: "Dominance Visiteur Elite (IA)",
    conditionText: "IFRank2 <= 3 AND Odds2 <= 1.85THEN2",
    assignedLeagueId: "ALL",
    assignedLeagueName: "Toutes les ligues",
    mode: "IA",
    aiConfidence: 89,
    stats: {
      successRate: 0,
      validatedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      totalCount: 0,
    },
    isActive: true,
  },
];

// Helper to extract 1X2 odds from a match object
export function getOddsFromMatch(match: InstantLeagueMatch) {
  let homeOdds = 0;
  let drawOdds = 0;
  let awayOdds = 0;

  if (match.eventBetTypes) {
    const bet1X2 = match.eventBetTypes.find(
      (b) => b.name === "1X2" || b.betTypeId === 1 || b.betTypeId === 30001
    );
    if (bet1X2 && bet1X2.eventBetTypeItems) {
      bet1X2.eventBetTypeItems.forEach((item) => {
        const name = (item.shortName || "").trim();
        if (name === "1") homeOdds = item.odds;
        else if (name === "X" || name === "x") drawOdds = item.odds;
        else if (name === "2") awayOdds = item.odds;
      });
    }
  }

  return { homeOdds, drawOdds, awayOdds };
}

// Evaluate a rule on a single match
export function evaluateRuleOnMatch(
  rule: RuleItem,
  match: InstantLeagueMatch,
  categoryName: string
): RuleMatchEvaluation | null {
  // Check league assignment restriction
  if (
    rule.assignedLeagueId !== "ALL" &&
    rule.assignedLeagueId !== match.entryPointId
  ) {
    return null;
  }

  const homeRank = match.homeTeam?.position || 99;
  const awayRank = match.awayTeam?.position || 99;
  const homePts = match.homeTeam?.points || 0;
  const awayPts = match.awayTeam?.points || 0;
  const { homeOdds, drawOdds, awayOdds } = getOddsFromMatch(match);

  let isTriggered = false;
  let predictedOutcome = "";

  const cond = rule.conditionText.replace(/\s+/g, "");

  // Extract THEN part
  let thenPart = "1";
  if (cond.includes("THEN")) {
    thenPart = cond.split("THEN")[1] || "1";
  }

  // Check Rank & Points conditions (e.g. Bullet Rules)
  if (cond.includes("Rank1") || cond.includes("Rank2") || cond.includes("Points1") || cond.includes("Points2") || cond.includes("Pts")) {
    let rank1Ok = true;
    let rank2Ok = true;
    let ptsDiffOk = true;

    const r1Match = cond.match(/Rank1<=?(\d+)/i);
    if (r1Match && homeRank > parseInt(r1Match[1], 10)) rank1Ok = false;

    const r2Match = cond.match(/Rank2>=?(\d+)/i);
    if (r2Match && awayRank < parseInt(r2Match[1], 10)) rank2Ok = false;

    const ptsDiffMatch = cond.match(/(?:Points1-Points2|PtsDiff)>=?(-?\d+)/i);
    if (ptsDiffMatch && (homePts - awayPts) < parseInt(ptsDiffMatch[1], 10)) ptsDiffOk = false;

    if (rank1Ok && rank2Ok && ptsDiffOk) {
      isTriggered = true;
      predictedOutcome = thenPart;
    }
  }

  // Fallbacks for standard condition rules
  if (!isTriggered) {
    if (cond.includes("Rank1<Rank2") && cond.includes("Odds1>Odds2")) {
      if (homeRank < awayRank && homeOdds > awayOdds && homeOdds > 0) {
        isTriggered = true;
        predictedOutcome = thenPart || "2";
      }
    } else if (cond.includes("Rank1<=5") && cond.includes("Odds1<")) {
      if (homeRank <= 5 && homeOdds > 0 && homeOdds <= 2.1) {
        isTriggered = true;
        predictedOutcome = "1X";
      }
    } else if (cond.includes("Rank2<=3") && cond.includes("Odds2<")) {
      if (awayRank <= 3 && awayOdds > 0 && awayOdds <= 2.0) {
        isTriggered = true;
        predictedOutcome = "2";
      }
    } else if (cond.includes("Rank1<Rank2")) {
      if (homeRank < awayRank) {
        isTriggered = true;
        predictedOutcome = thenPart || "1";
      }
    } else if (cond.includes("Rank2<Rank1")) {
      if (awayRank < homeRank) {
        isTriggered = true;
        predictedOutcome = thenPart || "2";
      }
    } else if (cond.includes("Odds1<Odds2")) {
      if (homeOdds > 0 && awayOdds > 0 && homeOdds < awayOdds) {
        isTriggered = true;
        predictedOutcome = thenPart || "1";
      }
    } else if (cond.includes("Odds2<Odds1")) {
      if (homeOdds > 0 && awayOdds > 0 && awayOdds < homeOdds) {
        isTriggered = true;
        predictedOutcome = thenPart || "2";
      }
    }
  }

  if (!isTriggered) return null;

  // Check if match score is available (finished/ended match)
  const scoreStr = match.score || "";
  const parts = scoreStr.split("-").map((s) => parseInt(s.trim(), 10));

  let status: "VALIDÉ" | "ERREUR" | "EN ATTENTE" = "EN ATTENTE";
  let details = `Prédiction: ${predictedOutcome}`;

  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const homeGoals = parts[0];
    const awayGoals = parts[1];

    let actualResult = "";
    if (homeGoals > awayGoals) actualResult = "1";
    else if (awayGoals > homeGoals) actualResult = "2";
    else actualResult = "X";

    let isValid = false;
    if (predictedOutcome === "1" && actualResult === "1") isValid = true;
    else if (predictedOutcome === "2" && actualResult === "2") isValid = true;
    else if (predictedOutcome === "X" && actualResult === "X") isValid = true;
    else if (predictedOutcome === "1X" && (actualResult === "1" || actualResult === "X")) isValid = true;
    else if (predictedOutcome === "X2" && (actualResult === "2" || actualResult === "X")) isValid = true;
    else if (predictedOutcome === "12" && (actualResult === "1" || actualResult === "2")) isValid = true;
    else if (predictedOutcome === "Over2.5" && homeGoals + awayGoals > 2) isValid = true;

    status = isValid ? "VALIDÉ" : "ERREUR";
    details = `Score: ${scoreStr} | Pronostic: ${predictedOutcome} (${isValid ? "Validé / Gagnant 🟢" : "Échoué / Perdant 🔴"})`;
  }

  return {
    matchId: match.id,
    matchName: match.name,
    categoryName: categoryName || "Compétition",
    roundNumber: match.round,
    prediction: predictedOutcome,
    actualScore: scoreStr,
    status,
    details,
  };
}

// Evaluate all active rules against a collection of matches across competitions
export function processAllRules(
  rules: RuleItem[],
  allMatchesByComp: Record<number, { matches: InstantLeagueMatch[]; categoryName: string }>
): RuleItem[] {
  return rules.map((rule) => {
    if (!rule.isActive) return rule;

    const evaluations: RuleMatchEvaluation[] = [];

    Object.entries(allMatchesByComp).forEach(([catIdStr, compData]) => {
      const catId = Number(catIdStr);
      if (rule.assignedLeagueId !== "ALL" && rule.assignedLeagueId !== catId) {
        return;
      }

      compData.matches.forEach((match) => {
        const evalRes = evaluateRuleOnMatch(rule, match, compData.categoryName);
        if (evalRes) {
          evaluations.push(evalRes);
        }
      });
    });

    const validatedCount = evaluations.filter((e) => e.status === "VALIDÉ").length;
    const failedCount = evaluations.filter((e) => e.status === "ERREUR").length;
    const pendingCount = evaluations.filter((e) => e.status === "EN ATTENTE").length;
    const totalEvaluated = validatedCount + failedCount;

    const successRate = totalEvaluated > 0 ? parseFloat(((validatedCount / totalEvaluated) * 100).toFixed(1)) : 0;

    return {
      ...rule,
      stats: {
        successRate,
        validatedCount,
        failedCount,
        pendingCount,
        totalCount: evaluations.length,
      },
      evaluations,
    };
  });
}

// Generate AI Mode high-probability match analysis across all competitions
export function runAIModeAnalysis(
  allMatchesByComp: Record<number, { matches: InstantLeagueMatch[]; categoryName: string }>,
  entryPoints: SportyEntryPoint[]
): AIRecapPrediction[] {
  const recaps: AIRecapPrediction[] = [];

  Object.entries(allMatchesByComp).forEach(([catIdStr, compData]) => {
    const compId = Number(catIdStr);
    const entryPoint = entryPoints.find((ep) => ep.id === compId);
    const compName = entryPoint?.name || compData.categoryName || `Compétition #${compId}`;

    compData.matches.forEach((m) => {
      const hRank = m.homeTeam?.position || 10;
      const aRank = m.awayTeam?.position || 10;
      const { homeOdds, drawOdds, awayOdds } = getOddsFromMatch(m);

      // AI Rule Heuristics
      // 1. High ranking difference + favorable home odds
      if (hRank <= 4 && aRank >= 12 && homeOdds > 1.15 && homeOdds < 1.75) {
        const prob = Math.min(96, Math.floor(88 + (aRank - hRank) * 0.8));
        recaps.push({
          matchId: m.id,
          matchName: m.name,
          competitionName: compName,
          competitionId: compId,
          roundNumber: m.round,
          prediction: "1",
          probability: prob,
          rationale: `L'équipe à domicile (${m.homeTeam?.name || "Dom"}) occupe le rang #${hRank} face au rang #${aRank}. Cote très favorable à ${homeOdds.toFixed(2)}.`,
          homeOdds,
          awayOdds,
          drawOdds,
          homeRank: hRank,
          awayRank: aRank,
          proposedRuleCondition: `IFRank1 <= 4 AND Rank2 >= 12 AND Odds1 < 1.75THEN1`,
        });
      }

      // 2. Strong away team with high odds anomaly
      else if (aRank <= 3 && hRank >= 10 && awayOdds > 1.40 && awayOdds < 2.20) {
        const prob = Math.min(94, Math.floor(84 + (hRank - aRank) * 0.7));
        recaps.push({
          matchId: m.id,
          matchName: m.name,
          competitionName: compName,
          competitionId: compId,
          roundNumber: m.round,
          prediction: "2",
          probability: prob,
          rationale: `Opportunité de valeur : ${m.awayTeam?.name || "Ext"} (#${aRank}) est favori à l'extérieur avec une cote avantageuse de ${awayOdds.toFixed(2)}.`,
          homeOdds,
          awayOdds,
          drawOdds,
          homeRank: hRank,
          awayRank: aRank,
          proposedRuleCondition: `IFRank2 <= 3 AND Rank1 >= 10 AND Odds2 < 2.20THEN2`,
        });
      }

      // 3. Ranking anomaly (Home team is higher rank but has higher odds than away team)
      else if (hRank < aRank && homeOdds > awayOdds && homeOdds > 1.80) {
        recaps.push({
          matchId: m.id,
          matchName: m.name,
          competitionName: compName,
          competitionId: compId,
          roundNumber: m.round,
          prediction: "2",
          probability: 87,
          rationale: `Anomalie détectée : ${m.homeTeam?.name} (#${hRank}) a une cote plus élevée (${homeOdds.toFixed(2)}) que ${m.awayTeam?.name} (#${aRank}, ${awayOdds.toFixed(2)}).`,
          homeOdds,
          awayOdds,
          drawOdds,
          homeRank: hRank,
          awayRank: aRank,
          proposedRuleCondition: `IFRank1 < Rank2 AND Odds1 > Odds2THEN2`,
        });
      }

      // 4. Double chance safety for top 6 teams
      else if (hRank <= 6 && homeOdds > 1.30 && homeOdds < 2.30) {
        recaps.push({
          matchId: m.id,
          matchName: m.name,
          competitionName: compName,
          competitionId: compId,
          roundNumber: m.round,
          prediction: "1X",
          probability: 89,
          rationale: `Double Chance 1X à haute probabilité : ${m.homeTeam?.name} (#${hRank}) à domicile.`,
          homeOdds,
          awayOdds,
          drawOdds,
          homeRank: hRank,
          awayRank: aRank,
          proposedRuleCondition: `IFRank1 <= 6 AND Odds1 < 2.30THEN1X`,
        });
      }
    });
  });

  // Sort recaps by highest probability first
  recaps.sort((a, b) => b.probability - a.probability);

  return recaps.slice(0, 12); // top 12 highest probability insights
}
