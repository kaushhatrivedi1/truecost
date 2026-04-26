import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const rows = await prisma.session.findMany({
    where: { userId },
    orderBy: { timestamp: 'asc' },
  });

  const sessions = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    platform_id: r.platformId,
    model_id: r.modelId,
    tokens: r.tokens,
    carbon_mg: r.carbonMg,
    water_ml: r.waterMl,
    score: r.score,
    grade: r.grade,
    intent: r.intent,
    prompt_preview: r.promptPreview,
    suggestion: r.suggestion,
  }));

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { session, userId, userName } = body as {
    session: {
      id: string;
      timestamp: string;
      platform_id: string;
      model_id: string;
      tokens: number;
      carbon_mg: number;
      water_ml: number;
      score: number;
      grade: string;
      intent: string;
      prompt_preview: string;
      suggestion?: string;
    };
    userId: string;
    userName?: string;
  };

  if (!session || !userId) {
    return NextResponse.json({ error: 'session and userId required' }, { status: 400 });
  }

  await prisma.session.upsert({
    where: { id: session.id },
    create: {
      id: session.id,
      userId,
      userName: userName ?? 'You',
      timestamp: new Date(session.timestamp),
      platformId: session.platform_id,
      modelId: session.model_id,
      tokens: session.tokens,
      carbonMg: session.carbon_mg,
      waterMl: session.water_ml,
      score: session.score,
      grade: session.grade,
      intent: session.intent,
      promptPreview: session.prompt_preview,
      suggestion: session.suggestion ?? '',
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
