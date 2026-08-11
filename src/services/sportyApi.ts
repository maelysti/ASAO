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

export const TARGET_COMPETITION_IDS = [8035, 8065, 8056, 8060, 8036, 8037, 8042, 8043, 8044];

export const ALLOWED_COMPETITIONS = [
  { key: "english", label: "English League", alt: "premier", id: 8035 },
  { key: "coupe du monde", label: "Coupe du monde", alt: "world cup", id: 8065 },
  { key: "champions", label: "Champions League", alt: "champio", id: 8056 },
  { key: "coupe d'afrique", label: "Coupe d'Afrique", alt: "can", id: 8060 },
  { key: "italian", label: "Italian League", alt: "serie a", id: 8036 },
  { key: "spanish", label: "Spanish League", alt: "la liga", id: 8037 },
  { key: "french", label: "French League", alt: "ligue 1", id: 8042 },
  { key: "german", label: "German League", alt: "bundesliga", id: 8043 },
  { key: "portuguese", label: "Portuguese League", alt: "portugal", id: 8044 },
];

export const DEFAULT_ENTRY_POINTS: SportyEntryPoint[] = [
  { id: 8035, parentEventCategoryId: 5, name: "English League", eventsCount: 470, priority: 1 },
  { id: 8065, parentEventCategoryId: 5, name: "Coupe du monde", eventsCount: 4056, priority: 2 },
  { id: 8056, parentEventCategoryId: 5, name: "Champions League", eventsCount: 2178, priority: 3 },
  { id: 8060, parentEventCategoryId: 5, name: "Coupe d'Afrique", eventsCount: 840, priority: 4 },
  { id: 8036, parentEventCategoryId: 5, name: "Italian League", eventsCount: 470, priority: 5 },
  { id: 8037, parentEventCategoryId: 5, name: "Spanish League", eventsCount: 470, priority: 6 },
  { id: 8042, parentEventCategoryId: 5, name: "French League", eventsCount: 423, priority: 7 },
  { id: 8043, parentEventCategoryId: 5, name: "German League", eventsCount: 423, priority: 8 },
  { id: 8044, parentEventCategoryId: 5, name: "Portuguese League", eventsCount: 414, priority: 9 },
];

export function isAllowedCompetition(name: string, id?: number): boolean {
  if (id && TARGET_COMPETITION_IDS.includes(id)) return true;
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
      return { data: DEFAULT_ENTRY_POINTS, status: res.status, error: errText || `HTTP ${res.status}` };
    }

    const raw: SportyEntryPoint[] = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) {
      return { data: DEFAULT_ENTRY_POINTS, status: 200 };
    }
    
    // Strictly filter by target IDs or allowed competition rules
    const filtered = raw.filter((item) => TARGET_COMPETITION_IDS.includes(item.id) || isAllowedCompetition(item.name, item.id));
    
    // Sort according to target ID priority order
    filtered.sort((a, b) => {
      const idxA = TARGET_COMPETITION_IDS.indexOf(a.id);
      const idxB = TARGET_COMPETITION_IDS.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.priority || 99) - (b.priority || 99);
    });

    const result = filtered.length > 0 ? filtered : DEFAULT_ENTRY_POINTS;

    return { data: result, status: 200 };
  } catch (err: any) {
    return { data: DEFAULT_ENTRY_POINTS, status: 500, error: err.message || "Network Error" };
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

export async function fetchCategoryDetails(
  parentEventCategoryId: number,
  token?: string
): Promise<{ data: any | null; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/eventcategories/${parentEventCategoryId}/details`;

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
    return { data: raw, status: 200 };
  } catch (err: any) {
    return { data: null, status: 500, error: err.message || "Network Error" };
  }
}

export async function fetchInstantLeaguePlayout(
  roundNumber: number,
  eventCategoryId: number,
  parentEventCategoryId: number,
  token?: string
): Promise<{ data: any[] | null; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const url = `https://hg-event-api-prod.sporty-tech.net/api/instantleagues/round/${roundNumber}/playout?eventCategoryId=${eventCategoryId}&parentEventCategoryId=${parentEventCategoryId}`;

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
    return { data: raw?.matches || [], status: 200 };
  } catch (err: any) {
    return { data: null, status: 500, error: err.message || "Network Error" };
  }
}

export async function fetchInstantLeagueRound(
  roundNumber: number,
  eventCategoryId: number,
  token?: string,
  parentEventCategoryId?: number
): Promise<{ data: any | null; status: number; error?: string }> {
  const activeToken = token || getStoredToken();
  const roundUrl = `https://hg-event-api-prod.sporty-tech.net/api/instantleagues/round/${roundNumber}?eventCategoryId=${eventCategoryId}&getNext=false`;

  try {
    const [roundRes, playoutRes] = await Promise.all([
      fetch(
        `/api/sporty/proxy?url=${encodeURIComponent(roundUrl)}&token=${encodeURIComponent(activeToken)}`,
        { headers: { Authorization: `Bearer ${activeToken}` } }
      ),
      parentEventCategoryId
        ? fetchInstantLeaguePlayout(roundNumber, eventCategoryId, parentEventCategoryId, activeToken)
        : Promise.resolve({ data: null, status: 200 }),
    ]);

    if (!roundRes.ok) {
      const errText = await roundRes.text().catch(() => "");
      return { data: null, status: roundRes.status, error: errText || `HTTP ${roundRes.status}` };
    }

    const raw = await roundRes.json();
    const roundObj = raw?.round;

    if (roundObj && roundObj.matches && Array.isArray(roundObj.matches)) {
      const playoutMatches = playoutRes.data || [];
      const playoutMap = new Map<number, any>();
      playoutMatches.forEach((pm: any) => {
        if (pm.id) playoutMap.set(Number(pm.id), pm);
      });

      roundObj.matches = roundObj.matches.map((m: any, idx: number) => {
        const realId = m.id || m.eventId;
        const playoutItem = realId ? playoutMap.get(Number(realId)) : playoutMatches[idx];

        let goals = m.goals || playoutItem?.goals || [];
        let score = m.score;
        let halfTimeScore = m.halfTimeScore;

        if (playoutItem && playoutItem.goals && Array.isArray(playoutItem.goals) && playoutItem.goals.length > 0) {
          goals = playoutItem.goals;
          const lastG = goals[goals.length - 1];
          score = `${Math.round(lastG.homeScore ?? 0)}:${Math.round(lastG.awayScore ?? 0)}`;

          const htGoals = goals.filter((g: any) => (g.minute ?? 0) <= 45);
          if (htGoals.length > 0) {
            const lastHt = htGoals[htGoals.length - 1];
            halfTimeScore = `${Math.round(lastHt.homeScore ?? 0)}:${Math.round(lastHt.awayScore ?? 0)}`;
          } else {
            halfTimeScore = "0:0";
          }
        }

        return {
          ...m,
          id: realId || playoutItem?.id || m.id,
          eventCategoryId: roundObj.eventCategoryId || eventCategoryId,
          goals,
          score,
          halfTimeScore,
          state: score ? "Ended" : (m.state || "PreEvent"),
          preEventOrLive: score ? "Finished" : (m.preEventOrLive || "PreEvent"),
        };
      });

      return { data: roundObj, status: 200 };
    }

    return { data: roundObj || null, status: 200 };
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
  homeRankAtRound?: number;
  awayRankAtRound?: number;
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
      const [res, detailsRes] = await Promise.all([
        fetchInstantLeagueMatches(ep.id, token),
        fetchCategoryDetails(ep.id, token),
      ]);
      return { entryPoint: ep, res, details: detailsRes.data };
    })
  );

  for (const item of instantResults) {
    const { entryPoint, res, details } = item;
    if (res.status !== 200) {
      lastStatus = res.status;
      lastError = res.error;
    }

    let roundsToProcess: any[] = [];
    const activeSubCatId = details?.subCategories?.[0]?.id;

    if (res.data && res.data.rounds && res.data.rounds.length > 0) {
      roundsToProcess = res.data.rounds;
    } else {
      // Fallback: group standard events for this entryPoint into synthetic rounds by expectedStart
      const compEvents = events.filter(
        (ev) =>
          ev.entryPointId === entryPoint.id ||
          ev.categoryId === entryPoint.id ||
          (ev.categoryPath && ev.categoryPath.includes(`/${entryPoint.id}/`))
      );

      if (compEvents.length > 0) {
        // Group events by expectedStart timestamp
        const timeGroups = new Map<string, SportyEvent[]>();
        compEvents.forEach((ev) => {
          const key = ev.expectedStart || "upcoming";
          if (!timeGroups.has(key)) timeGroups.set(key, []);
          timeGroups.get(key)!.push(ev);
        });

        // Sort start times chronologically
        const sortedTimes = Array.from(timeGroups.keys()).sort((a, b) => {
          if (a === "upcoming") return 1;
          if (b === "upcoming") return -1;
          return new Date(a).getTime() - new Date(b).getTime();
        });

        let rNum = 1;
        sortedTimes.forEach((timeKey) => {
          const evList = timeGroups.get(timeKey)!;
          roundsToProcess.push({
            roundNumber: rNum++,
            eventCategoryId: entryPoint.id,
            expectedStart: timeKey !== "upcoming" ? timeKey : undefined,
            matches: evList.map((ev) => ({
              id: ev.id,
              name: `${ev.homeTeamName} vs ${ev.awayTeamName}`,
              homeTeam: { name: ev.homeTeamName },
              awayTeam: { name: ev.awayTeamName },
              expectedStart: ev.expectedStart,
              expectedEnd: ev.expectedEnd,
              state: ev.state || "PreEvent",
              preEventOrLive: ev.preEventOrLive || "PreEvent",
              eventBetTypes: ev.eventBetTypes || [],
              score: (ev as any).score,
              halfTimeScore: (ev as any).halfTimeScore,
              goals: (ev as any).goals,
              scores: (ev as any).scores,
              rawMatch: ev,
            })),
          });
        });
      }
    }

    if (roundsToProcess.length > 0 || details) {
      rawResponses[entryPoint.id] = {
        ...(res.data || {}),
        categoryDetails: details,
        subCategories: details?.subCategories || [],
        eventCategoryId: activeSubCatId || (res.data as any)?.eventCategoryId,
        rounds: roundsToProcess,
      };

      roundsToProcess.forEach((round) => {
        if (round.matches && Array.isArray(round.matches)) {
          round.matches.forEach((m: any) => {
            const matchStart =
              m.expectedStart && m.expectedStart !== "0001-01-01T00:00:00Z"
                ? m.expectedStart
                : round.expectedStart;

            const extractedSourceRef = m.sourceRef || (m.rawMatch && m.rawMatch.sourceRef);
            let sourceRefSeason: string | number | null = null;
            if (extractedSourceRef) {
              const parts = String(extractedSourceRef).split("-");
              if (parts.length > 0) {
                const last = parts[parts.length - 1];
                if (last && /^\d+$/.test(last)) {
                  sourceRefSeason = last;
                }
              }
            }

            const sNum =
              (round as any).seasonNumber ||
              (round as any).season ||
              (m as any).seasonNumber ||
              (m as any).season ||
              (round as any).seasonId ||
              (m as any).seasonId ||
              sourceRefSeason ||
              entryPoint.id;

            const sId = (round as any).seasonId || (m as any).seasonId || sourceRefSeason || sNum;

            const sName =
              (round as any).seasonName ||
              (m as any).seasonName ||
              `Saison ${sNum}`;

            const realMatchId =
              m.id ??
              m.eventId ??
              m.matchId ??
              m.gameId ??
              m.code ??
              m.eventCode ??
              m.eventIdStr ??
              (m.rawMatch && (m.rawMatch.id ?? m.rawMatch.eventId ?? m.rawMatch.matchId));

            const catIdVal =
              activeSubCatId ||
              round.eventCategoryId ||
              m.eventCategoryId ||
              round.seasonId ||
              m.seasonId ||
              (sourceRefSeason ? Number(sourceRefSeason) : undefined) ||
              entryPoint.id;

            combinedList.push({
              id: realMatchId,
              entryPointId: entryPoint.id,
              eventCategoryId: catIdVal,
              categoryName: entryPoint.name,
              roundNumber: round.roundNumber || m.round || 1,
              seasonNumber: sNum,
              seasonName: sName,
              seasonId: sId,
              homeTeamName: m.homeTeam?.name || m.name?.split(" vs ")[0] || "Équipe 1",
              awayTeamName: m.awayTeam?.name || m.name?.split(" vs ")[1] || "Équipe 2",
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

  if (combinedList.length > 0) {
    lastStatus = 200;
    lastError = undefined;
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

