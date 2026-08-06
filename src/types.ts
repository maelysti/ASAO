export interface SportyBetTypeItem {
  id: number;
  eventBetTypeId: number;
  shortName: string; // e.g. "1", "X", "2", "Over 2.5", etc.
  odds: number;
  active: boolean;
  bettingAllowed: boolean;
  betTypeItemId: number;
  canBeSimulated?: boolean;
}

export interface SportyBetType {
  id: number;
  eventId: number;
  name: string; // e.g. "1X2", "Double Chance"
  eventBetTypeItems: SportyBetTypeItem[];
  betTypeId: number;
  isAsian?: boolean;
  baseAmount?: number;
  active: boolean;
  bettingAllowed: boolean;
  displayPriority?: number;
}

export interface SportyEventScore {
  type?: string;
  homeScore?: number;
  awayScore?: number;
  period?: string;
}

export interface SportyEvent {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  expectedStart: string;
  expectedEnd?: string;
  categories: string[];
  categoryPath?: string;
  categoryId?: number;
  entryPointId: number;
  eventType: string; // e.g. "Match"
  state: string; // e.g. "Undisputed", "Ended", "InPlay"
  preEventOrLive: "PreEvent" | "Live" | "Finished" | "Ended" | string;
  willBeOfferedLive?: boolean;
  isVirtual?: boolean;
  eventBetTypes?: SportyBetType[];
  goals?: any[];
  scores?: SportyEventScore[] | any[];
  cards?: any[];
  data?: Record<string, any>;
  liveEventBetTypeCount?: number;
  preEventEventBetTypeCount?: number;
}

export interface SportyEntryPoint {
  id: number;
  parentEventCategoryId: number;
  name: string;
  eventsCount: number;
  priority: number;
  iconUrl?: string;
  betTypesNumberToDisplay?: number;
}

export interface InstantLeagueTeamStats {
  name: string;
  points: number;
  position: number;
  won: number;
  lost: number;
  draw: number;
}

export interface InstantLeagueMatch {
  id: number;
  entryPointId: number;
  round: string | number;
  name: string;
  homeTeam: InstantLeagueTeamStats;
  awayTeam: InstantLeagueTeamStats;
  expectedStart?: string;
  expectedEnd?: string;
  eventBetTypes?: SportyBetType[];
  categoryName?: string;
  state?: string;
  preEventOrLive?: string;
  score?: string;
  halfTimeScore?: string;
  goals?: any[];
  scores?: any[];
  seasonNumber?: number | string;
  seasonName?: string;
  seasonId?: number | string;
}

export interface InstantLeagueRound {
  id?: number | string;
  roundNumber: number;
  seasonNumber?: number | string;
  seasonName?: string;
  seasonId?: number | string;
  expectedStart: string;
  expectedEnd: string;
  eventCategoryId?: number;
  matches: InstantLeagueMatch[];
}

export interface InstantLeagueMatchesResponse {
  rounds: InstantLeagueRound[];
  betTypes?: any[];
}

export type MatchTimeFilter = "all" | "live" | "upcoming" | "finished";

export interface ApiConnectionState {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  statusCode?: number;
  lastUpdated?: Date;
}

export interface RuleMatchEvaluation {
  matchId: number;
  matchName: string;
  categoryName: string;
  roundNumber?: number | string;
  prediction: string; // e.g. "1", "X", "2", "1X", "X2", "Over2.5"
  actualScore?: string;
  status: "VALIDÉ" | "ERREUR" | "EN ATTENTE"; // WIN, LOSS, PENDING
  evaluatedAt?: string;
  details?: string;
}

export interface RuleItem {
  id: string; // e.g. "#R1"
  betType: string; // e.g. "1X2", "Double Chance", "Over/Under"
  generatedDate: string; // e.g. "02/08/2026 à 21:09"
  title: string; // e.g. "Anomalie de Classement"
  conditionText: string; // e.g. "IFRank1 < Rank2 AND Odds1 > Odds2THEN2"
  assignedLeagueId: number | "ALL"; // Specific league ID or "ALL" for all leagues
  assignedLeagueName: string; // e.g. "Toutes les ligues" or "Ligue Anglaise"
  mode: "Manuel" | "IA";
  aiConfidence?: number; // e.g. 88
  stats: {
    successRate: number; // percentage, e.g. 85.7
    validatedCount: number;
    failedCount: number;
    pendingCount: number;
    totalCount: number;
  };
  evaluations?: RuleMatchEvaluation[];
  isActive: boolean;
}

export interface AIRecapPrediction {
  matchId: number;
  matchName: string;
  competitionName: string;
  competitionId: number;
  roundNumber: number | string;
  prediction: string; // "1" | "X" | "2" | "Over 2.5"
  probability: number; // percentage e.g. 92
  rationale: string;
  homeOdds?: number;
  awayOdds?: number;
  drawOdds?: number;
  homeRank?: number;
  awayRank?: number;
  proposedRuleCondition?: string;
}

export interface GoalDetails {
  minute?: number | string;
  team?: "home" | "away" | string;
  scorer?: string;
  scoreAfterGoal?: string;
}

export interface ExtractedMatchRecord {
  id: number;
  matchName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeRank: number;
  awayRank: number;
  homePoints?: number;
  awayPoints?: number;
  competitionId: number;
  competitionName: string;
  roundNumber: number | string;
  seasonNumber?: number | string;
  seasonName?: string;
  seasonId?: number | string;
  status: string; // Live, PreEvent, Ended, Finished
  expectedStart?: string;
  score?: string;
  halfTimeScore?: string;
  goalsCount?: number;
  goalMinutes?: string; // e.g. "12', 45'+2, 78'"
  goalsDetail?: GoalDetails[];
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  doubleChanceOdds?: { dc1X?: number; dc12?: number; dcX2?: number };
  overUnderOdds?: { over25?: number; under25?: number };
  bothTeamsScoreOdds?: { yes?: number; no?: number };
  allOddsSummary?: string;
  headToHeadHistory?: string[];
  extractedAt: string; // ISO string or formatted timestamp
  source: "Live Extraction" | "Imported JSON" | "Automated Results Collector" | string;
}

export interface AIDatabaseRuleInsight {
  ruleTitle: string;
  conditionText: string;
  betType: string;
  occurrencesInDb: number;
  winRateInDb: number;
  confidenceScore: number;
  sampleMatches: string[];
}
