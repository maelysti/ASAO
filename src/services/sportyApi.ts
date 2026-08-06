import {
  SportyEntryPoint,
  SportyEvent,
  SportyBetType,
  InstantLeagueMatchesResponse,
} from "../types";

export const DEFAULT_BEARER_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy91cG4iOiIxNDg5Mjk2IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiIrMjYxMzg2MTc5MzIwIiwiaHR0cHM6Ly9ob25vcmVnYW1pbmcubmV0L2N1c3RvbWVyLXN0YXRlIjoiTG9naW5WYWxpZGF0ZWQiLCJodHRwczovL2hvbm9yZWdhbWluZy5uZXQvYXV0aGVudGljYXRpb24tc2NvcGUiOiJDdXN0b21lciIsImp0aSI6IjczOGM2N2I3LTRiYzItNGRhMy05MjMxLTRkZmFiNmVlMDFiZSIsImh0dHBzOi8vaG9ub3JlZ2FtaW5nLm5ldC9jdXN0b21lci1tdXN0LWNoYW5nZS1wYXNzd29yZCI6IkZhbHNlIiwiZXhwIjoxNzg1OTE2NTYxLCJpc3MiOiJodHRwczovL2hvbm9yZS1nYW1pbmcubmV0IiwiYXVkIjoiaG9ub3JlLWdhbWluZy5uZXQifQ.Fyz2vOgAXjeRL4lUYn-VyvJqX27564-XK4ogZ4hvqOEABckya7-U_TtyeL17jKlnpyhC-a-fKpbLCJnns3c4PQRVNTITbvmq35n7a8VNpmmrXXOC9fN-Hj6CLqTPR2TAmh8yibUjfeuhR80wPJeaK_w5igi42i6xiokx8bvktGyNIN2O-Xj6LEJKJgOfbZN1y_QLM5DHVwe2zT1kvita2ZXj_KVNQTi-FMM_oMHGqYz9jC4xv1Cp6fyL1CCk-RNclC52EHX5Wwkolga3k-WjnqK0AI5TCZw_R9qsaasLqJXpk1jWPK36oDkuxlUBkcfvZu930go9YipouPum6klC0Q";

const STORAGE_KEY_TOKEN = "sporty_bearer_token";

export function getStoredToken(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }
  return DEFAULT_BEARER_TOKEN;
}

export function saveStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_TOKEN, token.trim());
  }
}

export const ALLOWED_COMPETITIONS = [
  { key: "english league", label: "English League", alt: "english fast league" },
  { key: "coupe du monde", label: "Coupe du monde", alt: "world cup" },
  { key: "champions league", label: "Champions League", alt: "champio league" },
  { key: "coupe d'afrique", label: "Coupe d'Afrique", alt: "can" },
  { key: "italian league", label: "Italian League", alt: "italian fast league" },
  { key: "spanish league", label: "Spanish League", alt: "spanish fast league" },
  { key: "french league", label: "French League", alt: "ligue 1" },
  { key: "german league", label: "German League", alt: "bundesliga" },
  { key: "portuguese league", label: "Portuguese League", alt: "portuguaise league" },
];

export function isAllowedCompetition(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return ALLOWED_COMPETITIONS.some(
    (comp) =>
      lower.includes(comp.key) ||
      lower.includes(comp.alt) ||
      comp.key.includes(lower)
  );
}

export async function fetchEntryPoints(token?: string): Promise<{ data: SportyEntryPoint[]; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = "https://hg-event-api-prod.sporty-tech.net/api/eventcategories/entrypoints?fr";

  try {
    const res = await fetch(`/api/sporty/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(activeToken)}`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: [], status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw: SportyEntryPoint[] = await res.json();
    
    // Filter strictly for allowed competitions
    const filtered = raw.filter((item) => isAllowedCompetition(item.name));

    return { data: filtered, status: 200 };
  } catch (err: any) {
    return { data: [], status: 500, error: err.message || "Network Error" };
  }
}

export async function fetchEventsForCategory(
  entryPointId: number,
  token?: string
): Promise<{ data: SportyEvent[]; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/events?eventCategoryIds=${entryPointId}`;

  try {
    const res = await fetch(`/api/sporty/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(activeToken)}`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: [], status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw: SportyEvent[] = await res.json();
    return { data: raw, status: 200 };
  } catch (err: any) {
    return { data: [], status: 500, error: err.message || "Network Error" };
  }
}

export async function fetchAllAllowedEvents(
  entryPoints: SportyEntryPoint[],
  token?: string
): Promise<{ events: SportyEvent[]; status: number; error?: string }> {
  if (!entryPoints || entryPoints.length === 0) {
    return { events: [], status: 200 };
  }

  const allEvents: SportyEvent[] = [];
  let lastStatus = 200;
  let lastError: string | undefined;

  // Fetch events in parallel for each filtered entrypoint
  const results = await Promise.all(
    entryPoints.map((ep) => fetchEventsForCategory(ep.id, token))
  );

  for (const res of results) {
    if (res.status !== 200) {
      lastStatus = res.status;
      lastError = res.error;
    }
    if (res.data && Array.isArray(res.data)) {
      allEvents.push(...res.data);
    }
  }

  // Deduplicate by ID
  const uniqueMap = new Map<number, SportyEvent>();
  allEvents.forEach((ev) => uniqueMap.set(ev.id, ev));

  return { events: Array.from(uniqueMap.values()), status: lastStatus, error: lastError };
}

export async function fetchInstantLeagueMatches(
  entryPointId: number,
  token?: string
): Promise<{ data: InstantLeagueMatchesResponse | null; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${entryPointId}/matches`;

  try {
    const res = await fetch(
      `/api/sporty/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(activeToken)}`,
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: null, status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw: InstantLeagueMatchesResponse = await res.json();
    return { data: raw, status: 200 };
  } catch (err: any) {
    return { data: null, status: 500, error: err.message || "Network Error" };
  }
}

export function getTeamLogoUrl(teamName: string): string {
  if (!teamName) return "";
  return `https://storage-prod.sporty-tech.net/virtual/teams/${encodeURIComponent(teamName.trim())}.png`;
}

export interface GoalEvent {
  minute: number;
  homeScore: number;
  awayScore: number;
  team: "Home" | "Away" | string;
}

export interface MatchResultData {
  id?: number;
  entryPointId?: number;
  name: string;
  homeTeam: { name: string; points?: number; position?: number; won?: number; lost?: number; draw?: number };
  awayTeam: { name: string; points?: number; position?: number; won?: number; lost?: number; draw?: number };
  score: string; // e.g. "3:0"
  halfTimeScore?: string; // e.g. "0:0"
  goals?: GoalEvent[];
  expectedStart?: string;
  seasonNumber?: number | string;
  seasonName?: string;
  seasonId?: number | string;
}

export interface InstantLeagueRoundResult {
  roundNumber: number;
  seasonNumber?: number | string;
  seasonName?: string;
  seasonId?: number | string;
  expectedStart?: string;
  matches: MatchResultData[];
}

export async function fetchInstantLeagueResults(
  entryPointId: number,
  skip = 0,
  take = 10,
  token?: string
): Promise<{ data: InstantLeagueRoundResult[] | null; hasMore?: boolean; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${entryPointId}/results?skip=${skip}&take=${take}`;

  try {
    const res = await fetch(
      `/api/sporty/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(activeToken)}`,
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: null, status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw = await res.json();
    return {
      data: raw.rounds || [],
      hasMore: raw.hasMore ?? false,
      status: 200,
    };
  } catch (err: any) {
    return { data: null, status: 500, error: err.message || "Network Error" };
  }
}

export interface RankingTeam {
  name: string;
  points: number;
  position: number;
  history: string[]; // e.g. ["Won", "Lost", "Draw", "Won", "Won"]
  won: number;
  lost: number;
  draw: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
}

export async function fetchInstantLeagueRanking(
  entryPointId: number,
  token?: string
): Promise<{ data: RankingTeam[] | null; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${entryPointId}/ranking`;

  try {
    const res = await fetch(
      `/api/sporty/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(activeToken)}`,
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: null, status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw = await res.json();
    return {
      data: raw.teams || [],
      status: 200,
    };
  } catch (err: any) {
    return { data: null, status: 500, error: err.message || "Network Error" };
  }
}

export async function fetchInstantLeagueRound(
  roundNumber: number,
  eventCategoryId: number,
  token?: string
): Promise<{ data: any | null; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/instantleagues/round/${roundNumber}?eventCategoryId=${eventCategoryId}&getNext=false`;

  try {
    const res = await fetch(
      `/api/sporty/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(activeToken)}`,
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: null, status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw = await res.json();
    if (raw && raw.round) {
      return { data: raw.round, status: 200 };
    }
    return { data: null, status: 200 };
  } catch (err: any) {
    return { data: null, status: 500, error: err.message || "Network Error" };
  }
}

export interface CombinedMatchData {
  id: number;
  entryPointId: number;
  eventCategoryId?: number;
  categoryName: string;
  roundNumber?: number | string;
  seasonNumber?: number | string;
  seasonName?: string;
  seasonId?: number | string;
  homeTeamName: string;
  awayTeamName: string;
  homeStats?: {
    points: number;
    position: number;
    won: number;
    lost: number;
    draw: number;
  };
  awayStats?: {
    points: number;
    position: number;
    won: number;
    lost: number;
    draw: number;
  };
  expectedStart: string;
  expectedEnd?: string;
  state: string;
  preEventOrLive: string;
  eventBetTypes: SportyBetType[];
  rawMatch?: any;
  score?: string;
  halfTimeScore?: string;
  goals?: any[];
  scores?: any[];
}

export async function fetchAllDataForCompetitions(
  entryPoints: SportyEntryPoint[],
  token?: string
): Promise<{
  events: SportyEvent[];
  instantLeagueMatches: CombinedMatchData[];
  rawInstantLeagueResponses: Record<number, InstantLeagueMatchesResponse>;
  status: number;
  error?: string;
}> {
  if (!entryPoints || entryPoints.length === 0) {
    return {
      events: [],
      instantLeagueMatches: [],
      rawInstantLeagueResponses: {},
      status: 200,
    };
  }

  // 1. Fetch standard events
  const { events, status: eventsStatus, error: eventsErr } = await fetchAllAllowedEvents(
    entryPoints,
    token
  );

  // 2. Fetch instant leagues matches for each entry point in parallel
  const rawResponses: Record<number, InstantLeagueMatchesResponse> = {};
  const combinedList: CombinedMatchData[] = [];
  let lastStatus = eventsStatus;
  let lastError = eventsErr;

  const instantResults = await Promise.all(
    entryPoints.map(async (ep) => {
      const res = await fetchInstantLeagueMatches(ep.id, token);
      return { entryPoint: ep, res };
    })
  );

  for (const item of instantResults) {
    const { entryPoint, res } = item;
    if (res.status !== 200) {
      lastStatus = res.status;
      lastError = res.error;
    }

    if (res.data && res.data.rounds) {
      rawResponses[entryPoint.id] = res.data;

      res.data.rounds.forEach((round) => {
        if (round.matches && Array.isArray(round.matches)) {
          round.matches.forEach((m) => {
            const matchStart =
              m.expectedStart && m.expectedStart !== "0001-01-01T00:00:00Z"
                ? m.expectedStart
                : round.expectedStart;

            const sNum =
              (round as any).seasonNumber ||
              (round as any).season ||
              (m as any).seasonNumber ||
              (m as any).season ||
              (round as any).seasonId ||
              1;
            const sName =
              (round as any).seasonName ||
              (m as any).seasonName ||
              `Saison ${sNum}`;
            const sId = (round as any).seasonId || (m as any).seasonId || sNum;

            combinedList.push({
              id: m.id,
              entryPointId: entryPoint.id,
              eventCategoryId: round.eventCategoryId,
              categoryName: entryPoint.name,
              roundNumber: round.roundNumber || m.round,
              seasonNumber: sNum,
              seasonName: sName,
              seasonId: sId,
              homeTeamName: m.homeTeam?.name || m.name.split(" vs ")[0] || "Équipe 1",
              awayTeamName: m.awayTeam?.name || m.name.split(" vs ")[1] || "Équipe 2",
              homeStats: m.homeTeam
                ? {
                    points: m.homeTeam.points,
                    position: m.homeTeam.position,
                    won: m.homeTeam.won,
                    lost: m.homeTeam.lost,
                    draw: m.homeTeam.draw,
                  }
                : undefined,
              awayStats: m.awayTeam
                ? {
                    points: m.awayTeam.points,
                    position: m.awayTeam.position,
                    won: m.awayTeam.won,
                    lost: m.awayTeam.lost,
                    draw: m.awayTeam.draw,
                  }
                : undefined,
              expectedStart: matchStart,
              expectedEnd: round.expectedEnd,
              state: m.state || (m.score ? "Ended" : "PreEvent"),
              preEventOrLive: m.preEventOrLive || (m.score ? "Finished" : "PreEvent"),
              eventBetTypes: m.eventBetTypes || [],
              score: m.score,
              halfTimeScore: m.halfTimeScore,
              goals: m.goals,
              scores: m.scores,
              rawMatch: m,
            });
          });
        }
      });
    }
  }

  return {
    events,
    instantLeagueMatches: combinedList,
    rawInstantLeagueResponses: rawResponses,
    status: lastStatus,
    error: lastError,
  };
}

export function classifyMatchStatus(event: {
  state?: string;
  preEventOrLive?: string;
  expectedStart?: string;
  expectedEnd?: string;
  willBeOfferedLive?: boolean;
}): "live" | "upcoming" | "finished" {
  const state = (event.state || "").toLowerCase();
  const preOrLive = (event.preEventOrLive || "").toLowerCase();

  if (preOrLive === "live" || state === "inplay" || state === "live" || event.willBeOfferedLive) {
    return "live";
  }

  if (state === "ended" || state === "finished" || preOrLive === "ended" || preOrLive === "finished") {
    return "finished";
  }

  if (!event.expectedStart || event.expectedStart === "0001-01-01T00:00:00Z") {
    return "upcoming";
  }

  const now = new Date().getTime();
  const start = new Date(event.expectedStart).getTime();
  const end = event.expectedEnd && event.expectedEnd !== "0001-01-01T00:00:00Z"
    ? new Date(event.expectedEnd).getTime()
    : start + 90 * 60 * 1000;

  if (now >= start && now <= end) {
    return "live";
  } else if (now > end) {
    return "finished";
  }

  return "upcoming";
}

