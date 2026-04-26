import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

function scoreToGrade(avg: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (avg >= 90) return 'A';
  if (avg >= 75) return 'B';
  if (avg >= 60) return 'C';
  if (avg >= 45) return 'D';
  return 'F';
}

export async function GET() {
  const rows = await prisma.session.findMany({
    orderBy: { timestamp: 'asc' },
  });

  // Aggregate by userId
  const map: Record<string, {
    userName: string;
    tokens: number;
    prompts: number;
    scores: number[];
    intents: Record<string, number>;
  }> = {};

  for (const r of rows) {
    if (!map[r.userId]) {
      map[r.userId] = { userName: r.userName, tokens: 0, prompts: 0, scores: [], intents: {} };
    }
    const u = map[r.userId];
    u.tokens += r.tokens;
    u.prompts += 1;
    u.scores.push(r.score);
    u.intents[r.intent] = (u.intents[r.intent] ?? 0) + 1;
  }

  const members = Object.entries(map).map(([, data]) => {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const sortedIntents = Object.entries(data.intents).sort(([, a], [, b]) => b - a);
    const topIntent = sortedIntents[0]?.[0] ?? 'general';
    const topCount = sortedIntents[0]?.[1] ?? 0;
    return {
      name: data.userName,
      prompts: data.prompts,
      avgGrade: scoreToGrade(avgScore),
      tokens: data.tokens,
      topIntent,
      intentPct: Math.round((topCount / data.prompts) * 100),
    };
  }).sort((a, b) => b.tokens - a.tokens);

  return NextResponse.json({ members });
}
