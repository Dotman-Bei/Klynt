import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { fail, json } from '@/server/http';
import { rules } from '@/server/rules';
import { currentSeason, leaderboard } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const game = p.get('game') ?? '';
  if (!rules[game]) return fail(400, 'That game has no leaderboard.');
  const d = await db();
  const season = await currentSeason(d);
  if (!season) return json({ season: null, total: 0, rows: [] });
  const offset = Math.max(0, Number(p.get('offset')) || 0);
  const limit = Math.min(100, Math.max(1, Number(p.get('limit')) || 25));
  return json({ season, ...(await leaderboard(d, game, season.id, offset, limit)) });
}
