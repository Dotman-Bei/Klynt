import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { body, fail, json, limited, walletOf } from '@/server/http';
import { recordForRun, scoreboardClient, scoreboardConfig } from '@/server/scoreboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Signs a record of one accepted run for the wallet that played it to send to the scoreboard. */
export async function POST(req: NextRequest) {
  const wallet = walletOf(req);
  if (!wallet) return fail(401, 'Sign in with your wallet to record a run.');
  if (limited(`record:${wallet}`, 10, 60_000)) return fail(429, 'Too many requests. Wait a minute.');
  const cfg = scoreboardConfig();
  if (!cfg) return fail(409, 'On-chain records are not switched on yet.');
  const b = await body<{ sessionId?: unknown }>(req);
  if (!b || typeof b.sessionId !== 'string') return fail(400, 'Send the run’s session ID.');
  const r = await recordForRun(await db(), b.sessionId, wallet);
  if (!r.ok) return fail(r.status, r.error);
  const signature = await scoreboardClient(cfg).signRecord(r.record);
  const rec = r.record;
  return json({
    record: { ...rec, seasonId: rec.seasonId.toString(), score: rec.score.toString(), expiry: rec.expiry.toString() },
    signature,
    scoreboard: cfg.board,
  });
}
