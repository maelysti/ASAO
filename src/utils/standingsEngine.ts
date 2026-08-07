import { ExtractedMatchRecord } from "../types";

export interface TeamStandingsState {
  teamName: string;
  points: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface RoundRankingsCalculator {
  getEnteringRank: (roundNumber: number, teamName: string) => number | undefined;
  getEnteringStandings: (roundNumber: number) => TeamStandingsState[];
}

/**
 * Computes round-by-round entering ranks for a list of completed round objects from API
 */
export function computeSeasonRoundRankings(resultsRounds: any[]): RoundRankingsCalculator {
  if (!resultsRounds || resultsRounds.length === 0) {
    return {
      getEnteringRank: () => undefined,
      getEnteringStandings: () => [],
    };
  }

  // Collect all unique team names
  const teamSet = new Set<string>();
  resultsRounds.forEach((r) => {
    (r.matches || []).forEach((m: any) => {
      const home = m.homeTeam?.name || m.name?.split(" vs ")[0]?.trim();
      const away = m.awayTeam?.name || m.name?.split(" vs ")[1]?.trim();
      if (home) teamSet.add(home);
      if (away) teamSet.add(away);
    });
  });
  const teams = Array.from(teamSet);

  // Extract all round numbers sorted ascending
  const roundNumbers = Array.from(
    new Set(
      resultsRounds
        .map((r) => Number(r.roundNumber))
        .filter((rn) => !isNaN(rn) && rn > 0)
    )
  ).sort((a, b) => a - b);

  const enteringRankMap: Record<number, Record<string, number>> = {};
  const enteringStandingsMap: Record<number, TeamStandingsState[]> = {};

  const teamStatsMap: Record<string, TeamStandingsState> = {};
  teams.forEach((t) => {
    teamStatsMap[t] = {
      teamName: t,
      points: 0,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    };
  });

  const getSortedStandings = () => {
    return Object.values(teamStatsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });
  };

  roundNumbers.forEach((rNum) => {
    const standings = getSortedStandings();
    enteringStandingsMap[rNum] = standings.map((s) => ({ ...s }));
    const rankObj: Record<string, number> = {};
    standings.forEach((s, rankIdx) => {
      rankObj[s.teamName] = rankIdx + 1;
    });
    enteringRankMap[rNum] = rankObj;

    // Now process match results of round rNum to prepare standings for round rNum + 1
    const roundObj = resultsRounds.find((r) => Number(r.roundNumber) === rNum);

    if (roundObj && roundObj.matches) {
      roundObj.matches.forEach((m: any) => {
        const home = m.homeTeam?.name || m.name?.split(" vs ")[0]?.trim();
        const away = m.awayTeam?.name || m.name?.split(" vs ")[1]?.trim();
        const scoreStr = m.score;

        if (home && away && scoreStr && (scoreStr.includes(":") || scoreStr.includes("-"))) {
          const delimiter = scoreStr.includes(":") ? ":" : "-";
          const parts = scoreStr.split(delimiter).map((s: string) => parseInt(s.trim(), 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [hScore, aScore] = parts;
            const hTeam = teamStatsMap[home];
            const aTeam = teamStatsMap[away];

            if (hTeam && aTeam) {
              hTeam.played += 1;
              aTeam.played += 1;
              hTeam.goalsFor += hScore;
              hTeam.goalsAgainst += aScore;
              hTeam.goalDifference = hTeam.goalsFor - hTeam.goalsAgainst;

              aTeam.goalsFor += aScore;
              aTeam.goalsAgainst += hScore;
              aTeam.goalDifference = aTeam.goalsFor - aTeam.goalsAgainst;

              if (hScore > aScore) {
                hTeam.won += 1;
                hTeam.points += 3;
                aTeam.lost += 1;
              } else if (aScore > hScore) {
                aTeam.won += 1;
                aTeam.points += 3;
                hTeam.lost += 1;
              } else {
                hTeam.draw += 1;
                hTeam.points += 1;
                aTeam.draw += 1;
                aTeam.points += 1;
              }
            }
          }
        }
      });
    }
  });

  return {
    getEnteringRank: (rNum: number, teamName: string) => {
      let rObj = enteringRankMap[rNum];
      if (!rObj) {
        const availableRounds = Object.keys(enteringRankMap).map(Number).sort((a, b) => b - a);
        if (availableRounds.length > 0) {
          rObj = enteringRankMap[availableRounds[0]];
        }
      }
      if (!rObj) return undefined;
      return rObj[teamName];
    },
    getEnteringStandings: (rNum: number) => {
      const standings = enteringStandingsMap[rNum];
      if (standings) return standings;
      const availableRounds = Object.keys(enteringStandingsMap).map(Number).sort((a, b) => b - a);
      if (availableRounds.length > 0) {
        return enteringStandingsMap[availableRounds[0]] || [];
      }
      return [];
    },
  };
}

/**
 * Recalculates round-by-round rankings for extracted match records.
 */
export function enrichRecordsWithRoundRanks(
  records: ExtractedMatchRecord[]
): ExtractedMatchRecord[] {
  if (!records || records.length === 0) return [];

  // Group records by competition and season
  const groups: Record<string, ExtractedMatchRecord[]> = {};

  records.forEach((rec) => {
    const compKey = `${rec.competitionId || rec.competitionName || "comp"}_S${
      rec.seasonNumber || 1
    }`;
    if (!groups[compKey]) groups[compKey] = [];
    groups[compKey].push({ ...rec });
  });

  const resultRecords: ExtractedMatchRecord[] = [];

  Object.values(groups).forEach((groupRecords) => {
    const teamSet = new Set<string>();
    groupRecords.forEach((r) => {
      if (r.homeTeamName) teamSet.add(r.homeTeamName.trim());
      if (r.awayTeamName) teamSet.add(r.awayTeamName.trim());
    });
    const teams = Array.from(teamSet);

    const roundNumbers = Array.from(
      new Set(
        groupRecords
          .map((r) => Number(r.roundNumber))
          .filter((rn) => !isNaN(rn) && rn > 0)
      )
    ).sort((a, b) => a - b);

    if (roundNumbers.length === 0) {
      resultRecords.push(...groupRecords);
      return;
    }

    const teamStatsMap: Record<string, TeamStandingsState> = {};
    teams.forEach((tName) => {
      teamStatsMap[tName] = {
        teamName: tName,
        points: 0,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      };
    });

    const computeRankMap = () => {
      const sorted = Object.values(teamStatsMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference)
          return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.teamName.localeCompare(b.teamName);
      });

      const rankMap: Record<string, number> = {};
      sorted.forEach((t, idx) => {
        rankMap[t.teamName] = idx + 1;
      });
      return rankMap;
    };

    roundNumbers.forEach((rNum) => {
      const roundMatches = groupRecords.filter(
        (rec) => Number(rec.roundNumber) === rNum
      );

      const enteringRanks = computeRankMap();

      roundMatches.forEach((match) => {
        const homeName = match.homeTeamName.trim();
        const awayName = match.awayTeamName.trim();

        const hRank = enteringRanks[homeName];
        const aRank = enteringRanks[awayName];

        match.homeRankAtRound = hRank !== undefined ? hRank : match.homeRank;
        match.awayRankAtRound = aRank !== undefined ? aRank : match.awayRank;
        if (match.homeRankAtRound) match.homeRank = match.homeRankAtRound;
        if (match.awayRankAtRound) match.awayRank = match.awayRankAtRound;
      });

      roundMatches.forEach((match) => {
        if (match.score && (match.score.includes(":") || match.score.includes("-"))) {
          const delimiter = match.score.includes(":") ? ":" : "-";
          const parts = match.score.split(delimiter).map((s) => parseInt(s.trim(), 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [hScore, aScore] = parts;
            const homeName = match.homeTeamName.trim();
            const awayName = match.awayTeamName.trim();

            if (teamStatsMap[homeName] && teamStatsMap[awayName]) {
              const hTeam = teamStatsMap[homeName];
              const aTeam = teamStatsMap[awayName];

              hTeam.played += 1;
              aTeam.played += 1;
              hTeam.goalsFor += hScore;
              hTeam.goalsAgainst += aScore;
              hTeam.goalDifference = hTeam.goalsFor - hTeam.goalsAgainst;

              aTeam.goalsFor += aScore;
              aTeam.goalsAgainst += hScore;
              aTeam.goalDifference = aTeam.goalsFor - aTeam.goalsAgainst;

              if (hScore > aScore) {
                hTeam.won += 1;
                hTeam.points += 3;
                aTeam.lost += 1;
              } else if (aScore > hScore) {
                aTeam.won += 1;
                aTeam.points += 3;
                hTeam.lost += 1;
              } else {
                hTeam.draw += 1;
                hTeam.points += 1;
                aTeam.draw += 1;
                aTeam.points += 1;
              }
            }
          }
        }
      });
    });

    resultRecords.push(...groupRecords);
  });

  return resultRecords;
}
