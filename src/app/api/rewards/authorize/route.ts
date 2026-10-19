import type { NextRequest } from 'next/server';
import type { Address } from 'viem';
import { db } from '@/server/db';
import { fail, json, limited, walletOf } from '@/server/http';
import { rewardContext } from '@/server/rewardContext';
import { prepareClaim, releaseExpired, saveClaim } from '@/server/rewards';
import { currentSeason } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Signs one claim for this wallet's unclaimed earnings, capped by what the vault can still pay it. */
export async function POST(req: NextRequest) {
  const wallet = walletOf(req) as Address | null;
  if (!wallet) return fail(401, 'Sign in with your wallet to claim.');
  if (limited(`authorize:${wallet}`, 5, 60_000)) return fail(429, 'Too many claim requests. Wait a minute.');
  const season = currentSeason(db());
  if (!season) return fail(409, 'No season is open.');
  const ctx = await rewardContext(season.id);
  if (!ctx.ok) return fail(409, ctx.reason);
  if (ctx.globalPaused || ctx.season.paused) return fail(409, 'Claims are paused.');
  const nowS = Math.floor(Date.now() / 1000);
  if (nowS < Number(ctx.season.startsAt) || nowS > Number(ctx.season.claimsUntil)) return fail(409, 'This season is not open for claims right now.');

  await releaseExpired(db(), (n) => ctx.client.nonceUsed(n as `0x${string}`));
  const [already, pendingRow] = [
    await ctx.client.claimedBy(season.id, wallet),
    db().prepare(`select count(*) as n from claims where wallet = ? and status = 'signed'`).get(wallet.toLowerCase()) as { n: number },
  ];
  if (Number(pendingRow.n) > 0) return fail(409, 'You already have a claim waiting. Finish it or let it expire first.');

  const walletRoom = ctx.season.perWalletCap > already ? ctx.season.perWalletCap - already : 0n;
  const poolRoom = ctx.season.funded - ctx.season.claimed;
  const ttl = Math.min(ctx.policy.authTtlS, Number(ctx.season.claimsUntil) - nowS);
  const prepared = prepareClaim(db(), { wallet, seasonId: season.id, token: ctx.season.token, walletRoom, poolRoom, ttlS: ttl });
  if (!prepared) {
    return fail(409, walletRoom === 0n ? 'You have reached this season’s cap.' : poolRoom === 0n ? 'The reward pool has run out.' : 'Nothing to claim yet.');
  }
  const signature = await ctx.client.signClaim(prepared.claim);
  try {
    saveClaim(db(), prepared, signature);
  } catch {
    return fail(409, 'Your earnings changed while preparing the claim. Try again.');
  }
  const c = prepared.claim;
  return json({
    claim: { ...c, seasonId: c.seasonId.toString(), amount: c.amount.toString(), expiry: c.expiry.toString() },
    signature,
    vault: process.env.NEXT_PUBLIC_REWARD_VAULT,
  });
}
