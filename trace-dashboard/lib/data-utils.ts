// data-utils.ts — Data transformation helpers for the dashboard

export interface TeamMember {
  name: string;
  prompts: number;
  avgGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  tokens: number;
  topIntent: string;
  intentPct: number;
}

export interface Session {
  id: string;
  timestamp: string;
  platform_id: string;
  model_id: string;
  tokens: number;
  carbon_mg: number;
  water_ml: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  intent: 'coding' | 'writing' | 'research' | 'exploratory' | 'general';
  prompt_preview: string;
}

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  F: number;
}

export interface BreakdownEntry {
  name: string;
  value: number;
}

export interface CarbonSeriesPoint {
  index: number;
  carbon_mg: number;
}

export interface PlatformTotals {
  [platform: string]: {
    tokens: number;
    carbon_mg: number;
    water_ml: number;
    session_count: number;
  };
}

/** Count sessions per grade letter. */
export function gradeDistribution(sessions: Session[]): GradeDistribution {
  const dist: GradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const s of sessions) {
    if (s.grade in dist) {
      dist[s.grade]++;
    }
  }
  return dist;
}

/** Count sessions per intent category. */
export function intentBreakdown(sessions: Session[]): BreakdownEntry[] {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    counts[s.intent] = (counts[s.intent] ?? 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/** Count sessions per platform. */
export function platformBreakdown(sessions: Session[]): BreakdownEntry[] {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    counts[s.platform_id] = (counts[s.platform_id] ?? 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/** Return carbon_mg series for the last 30 sessions (ordered by array position). */
export function last30SessionsCarbonSeries(sessions: Session[]): CarbonSeriesPoint[] {
  const slice = sessions.slice(-30);
  return slice.map((s, i) => ({ index: i + 1, carbon_mg: s.carbon_mg }));
}

/** Derive a grade letter from a numeric score (0–100). */
function scoreToGrade(avg: number): TeamMember['avgGrade'] {
  if (avg >= 90) return 'A';
  if (avg >= 75) return 'B';
  if (avg >= 60) return 'C';
  if (avg >= 45) return 'D';
  return 'F';
}

/** Convert a flat sessions array into per-platform TeamMember rows for the team dashboard. */
export function sessionsToTeamMembers(sessions: Session[]): TeamMember[] {
  const map: Record<string, { tokens: number; prompts: number; scores: number[]; intents: Record<string, number> }> = {};

  for (const s of sessions) {
    if (!map[s.platform_id]) {
      map[s.platform_id] = { tokens: 0, prompts: 0, scores: [], intents: {} };
    }
    const p = map[s.platform_id];
    p.tokens += s.tokens;
    p.prompts += 1;
    p.scores.push(s.score);
    p.intents[s.intent] = (p.intents[s.intent] ?? 0) + 1;
  }

  return Object.entries(map)
    .map(([platform_id, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const [[topIntent, topCount]] = Object.entries(data.intents).sort(([, a], [, b]) => b - a);
      return {
        name: platform_id,
        prompts: data.prompts,
        avgGrade: scoreToGrade(avgScore),
        tokens: data.tokens,
        topIntent,
        intentPct: Math.round((topCount / data.prompts) * 100),
      };
    })
    .sort((a, b) => b.tokens - a.tokens);
}

/** Aggregate all sessions for one user into a single TeamMember row. */
export function sessionsToCurrentUser(sessions: Session[], name = 'You'): TeamMember {
  const tokens = sessions.reduce((sum, s) => sum + s.tokens, 0);
  const prompts = sessions.length;
  const avgScore = prompts > 0 ? sessions.reduce((sum, s) => sum + s.score, 0) / prompts : 0;

  const intentCounts: Record<string, number> = {};
  for (const s of sessions) {
    intentCounts[s.intent] = (intentCounts[s.intent] ?? 0) + 1;
  }
  const sortedIntents = Object.entries(intentCounts).sort(([, a], [, b]) => b - a);
  const topIntent = sortedIntents[0]?.[0] ?? 'general';
  const topCount = sortedIntents[0]?.[1] ?? 0;

  return {
    name,
    prompts,
    avgGrade: scoreToGrade(avgScore),
    tokens,
    topIntent,
    intentPct: prompts > 0 ? Math.round((topCount / prompts) * 100) : 0,
  };
}

/** Aggregate per-platform totals (tokens, carbon, water, session count). */
export function perPlatformTotals(sessions: Session[]): PlatformTotals {
  const totals: PlatformTotals = {};
  for (const s of sessions) {
    if (!totals[s.platform_id]) {
      totals[s.platform_id] = { tokens: 0, carbon_mg: 0, water_ml: 0, session_count: 0 };
    }
    const p = totals[s.platform_id];
    p.tokens += s.tokens;
    p.carbon_mg += s.carbon_mg;
    p.water_ml += s.water_ml;
    p.session_count += 1;
  }
  return totals;
}
