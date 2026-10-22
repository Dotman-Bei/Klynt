import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { body, fail, json, limited, walletOf } from '@/server/http';
import { rewardContext } from '@/server/rewardContext';
import { recordEarning } from '@/server/rewards';
import { submitScore } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const wallet = walletOf(req);
  if (!wallet) return fail(401, 'Sign in with your wallet to submit a ranked run.');
  if (limited(`submit:${wallet}`, 20, 60_000)) return fail(429, 'Too many submissions. Wait a minute.');
  const { id } = await params;
  const b = await body<{ score?: unknown }>(req);
  if (!b) return fail(400, 'Send the score.');
  const d = await db();
  const r = await submitScore(d, id, wallet, b.score);
  if (!r.ok) return fail(r.status, r.error);
  if (r.status !== 'accepted') return json(r);

  // Earnings only when rewards are on and the vault is reachable and configured.
  const session = (await d.query(`select game_id, season_id from sessions where id = $1`, [id])).rows[0];
  const seasonId = Number(session.season_id);
  const ctx = await rewardContext(seasonId);
  const earned = ctx.ok
    ? await recordEarning(d, ctx.policy, { sessionId: id, wallet, seasonId, gameId: String(session.game_id), score: r.score })
    : 0n;
  return json({ ...r, earned: earned.toString(), symbol: ctx.ok ? ctx.symbol : null });
}
