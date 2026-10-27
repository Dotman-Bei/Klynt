import type { NextRequest } from 'next/server';
import type { Address, Hex } from 'viem';
import { db } from '@/server/db';
import { body, fail, json, limited, walletOf } from '@/server/http';
import { markRecorded, runKey, scoreboardClient, scoreboardConfig } from '@/server/scoreboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Marks a run recorded only after its transaction is found on-chain. */
export async function POST(req: NextRequest) {
  const wallet = walletOf(req) as Address | null;
  if (!wallet) return fail(401, 'Sign in with your wallet.');
  if (limited(`record-confirm:${wallet}`, 20, 60_000)) return fail(429, 'Too many requests. Wait a minute.');
  const cfg = scoreboardConfig();
  if (!cfg) return fail(409, 'On-chain records are not switched on yet.');
  const b = await body<{ sessionId?: unknown; txHash?: unknown }>(req);
  if (!b || typeof b.sessionId !== 'string' || typeof b.txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(b.txHash)) {
    return fail(400, 'Send the run’s session ID and its transaction hash.');
  }
  const d = await db();
  const row = (await d.query(`select wallet, chain_tx from sessions where id = $1`, [b.sessionId])).rows[0];
  if (!row || String(row.wallet) !== wallet.toLowerCase()) return fail(404, 'No such run for this wallet.');
  if (row.chain_tx) return json({ status: 'recorded', txHash: row.chain_tx });
  const ok = await scoreboardClient(cfg).recordTxMatches(b.txHash as Hex, runKey(b.sessionId), wallet);
  if (!ok) return fail(409, 'That transaction is not a confirmed record of this run yet.');
  await markRecorded(d, b.sessionId, b.txHash);
  return json({ status: 'recorded', txHash: b.txHash });
}
