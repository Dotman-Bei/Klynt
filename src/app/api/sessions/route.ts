import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { body, fail, json, limited, walletOf } from '@/server/http';
import { recentSessionCount, startSession } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PER_HOUR = 60;

export async function POST(req: NextRequest) {
  const wallet = walletOf(req);
  if (!wallet) return fail(401, 'Sign in with your wallet to start a ranked run.');
  if (limited(`session:${wallet}`, 10, 60_000) || recentSessionCount(db(), wallet, 3600_000) >= PER_HOUR) {
    return fail(429, 'Too many runs started from this wallet. Wait a few minutes.');
  }
  const b = await body<{ gameId?: unknown }>(req);
  if (!b || typeof b.gameId !== 'string') return fail(400, 'Say which game this run is for.');
  const r = startSession(db(), wallet, b.gameId);
  if (!r.ok) return fail(r.status, r.error);
  return json({ sessionId: r.sessionId, seasonId: r.seasonId, rulesVersion: r.rulesVersion, startedAt: r.startedAt }, 201);
}
