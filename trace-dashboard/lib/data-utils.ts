// data-utils.ts — Data transformation helpers for the dashboard

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
