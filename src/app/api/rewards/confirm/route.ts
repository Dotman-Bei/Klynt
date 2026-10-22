import type { NextRequest } from 'next/server';
import type { Address, Hex } from 'viem';
import { db } from '@/server/db';
import { body, fail, json, limited, walletOf } from '@/server/http';
import { rewardContext } from '@/server/rewardContext';
import { confirmClaim } from '@/server/rewards';
import { currentSeason } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Marks a claim paid only after its transaction is found on-chain (PRD 15: never claim success early). */
export async function POST(req: NextRequest) {
  const wallet = walletOf(req) as Address | null;
  if (!wallet) return fail(401, 'Sign in with your wallet.');
  if (limited(`confirm:${wallet}`, 20, 60_000)) return fail(429, 'Too many requests. Wait a minute.');
  const b = await body<{ nonce?: unknown; txHash?: unknown }>(req);
  if (!b || typeof b.nonce !== 'string' || typeof b.txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(b.txHash)) {
    return fail(400, 'Send the claim nonce and its transaction hash.');
  }
  const d = await db();
  const row = (await d.query(`select wallet, status from claims where nonce = $1`, [b.nonce])).rows[0];
  if (!row || String(row.wallet) !== wallet.toLowerCase()) return fail(404, 'No such claim for this wallet.');
  if (row.status === 'confirmed') return json({ status: 'confirmed' });

  const season = await currentSeason(d);
  const ctx = season ? await rewardContext(season.id) : null;
  if (!ctx?.ok) return fail(409, ctx ? ctx.reason : 'No season is open.');
  const ok = await ctx.client.claimTxMatches(b.txHash as Hex, b.nonce as Hex, wallet);
  if (!ok) return fail(409, 'That transaction is not a confirmed claim for this nonce and wallet yet.');
  await confirmClaim(d, b.nonce, b.txHash);
  return json({ status: 'confirmed', txHash: b.txHash });
}
